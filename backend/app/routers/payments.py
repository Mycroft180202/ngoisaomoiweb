from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from typing import List, Optional
import json
import time

from app.core.database import get_db
from app.core.config import settings
from app.crud.payment import get_payment, get_all_payments, create_payment, update_payment, delete_payment
from app.crud.payment_transaction import (
    create_payment_transaction,
    get_payment_transaction_by_ref,
    update_payment_transaction,
    get_payment_by_booking_id
)
from app.schemas.payment import PaymentMethodCreate, PaymentMethodResponse, PaymentMethodUpdate
from app.schemas.payment_transaction import PaymentTransactionCreate, PaymentTransactionResponse, VietQRResponse
from app.routers.auth import get_current_user, get_optional_current_user
from app.models.user import User
from app.models.booking import Booking
from app.models.payment_transaction import PaymentTransaction
from app.models.bank import BankAccount
from app.services.vietqr import vietqr_service
from app.services.mail import send_payment_confirmation_email, send_payment_success_email
from app.services.payment_config import online_payments_enabled
from datetime import datetime, timedelta, timezone
from payos import PayOS
from payos.types import CreatePaymentLinkRequest

# Map BIN → tên ngân hàng (các ngân hàng phổ biến tại VN)
BIN_TO_BANK_NAME = {
    "970436": "Vietcombank (VCB)",
    "970418": "BIDV",
    "970415": "VietinBank",
    "970416": "ACB (Ngân hàng TMCP Á Châu)",
    "970422": "MB Bank",
    "970407": "Techcombank",
    "970432": "VPBank",
    "970423": "TPBank",
    "970403": "Sacombank",
    "970405": "Agribank",
    "970426": "MSB",
    "970443": "BaoViet Bank",
    "970454": "Shinhan Bank",
    "970462": "VietBank",
    "970424": "ShinhanBank",
    "970431": "Eximbank",
    "970441": "VIB",
    "970425": "ABBank",
    "970437": "HDBank",
    "970452": "KienLong Bank",
    "970448": "OCB",
    "970458": "VBSP",
    "970433": "VietABank",
    "970449": "LienVietPostBank",
    "970457": "Woori Bank",
    "970414": "OceanBank",
    "970444": "CBBank",
    "970438": "BacABank",
    "970440": "SeABank",
    "970446": "NCB",
    "970430": "PGBank",
    "970419": "NCB",
    "546034": "BIDV",
}

payos_client = PayOS(
    client_id=settings.PAYOS_CLIENT_ID,
    api_key=settings.PAYOS_API_KEY,
    checksum_key=settings.PAYOS_CHECKSUM_KEY
)

router = APIRouter(prefix="/payments", tags=["Payment Methods"])


@router.get("/", response_model=List[PaymentMethodResponse])
def read_payments(db: Session = Depends(get_db)):
    return get_all_payments(db)

@router.post("/", response_model=PaymentMethodResponse)
def add_payment(
    payment_in: PaymentMethodCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Permission denied")
    return create_payment(db, payment=payment_in)

@router.put("/{payment_id}", response_model=PaymentMethodResponse)
def edit_payment(
    payment_id: int,
    payment_in: PaymentMethodUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Permission denied")
    db_payment = get_payment(db, payment_id)
    if not db_payment:
        raise HTTPException(status_code=404, detail="Payment method not found")
    return update_payment(db, db_payment=db_payment, payment_data=payment_in.model_dump(exclude_unset=True))

@router.delete("/{payment_id}")
def remove_payment(
    payment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Permission denied")
    success = delete_payment(db, payment_id)
    if not success:
        raise HTTPException(status_code=404, detail="Payment method not found")
    return {"detail": "Payment method deleted successfully"}

# PAYMENT TRANSACTIONS API
@router.post("/generate-qr/{booking_id}")
def generate_payment_qr(
    booking_id: int,
    token: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    """Generate payOS payment link for a booking. If user is logged in, verifies ownership."""
    if not online_payments_enabled(db):
        raise HTTPException(
            status_code=403,
            detail="Thanh toán trực tuyến chưa được áp dụng. Nhân viên sẽ xác nhận đơn và hướng dẫn thanh toán.",
        )

    # Get booking
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    # Access control
    if current_user:
        if not current_user.is_admin and booking.email != current_user.email:
            raise HTTPException(status_code=403, detail="Permission denied")
    else:
        if not token or token != booking.secure_token:
            raise HTTPException(
                status_code=403,
                detail="Không có quyền thực hiện thanh toán cho đơn hàng này. Vui lòng đăng nhập hoặc cung cấp mã xác thực hợp lệ."
            )

    if booking.payment_status == "paid":
        raise HTTPException(status_code=400, detail="Booking already paid")

    # Check if payment transaction already exists
    existing_payment = get_payment_by_booking_id(db, booking_id)
    if existing_payment and existing_payment.status == "pending":
        # Return existing payment
        return {
            "id": existing_payment.id,
            "transaction_ref": existing_payment.transaction_ref,
            "amount": existing_payment.amount,
            "status": existing_payment.status,
            "qr_code_url": existing_payment.vietqr_code,
            "checkout_url": existing_payment.vietqr_url,
            "created_at": existing_payment.created_at,
            "expires_at": existing_payment.expires_at
        }

    # Get default bank account
    bank_account = db.query(BankAccount).filter(BankAccount.is_active == True).first()
    if not bank_account:
        raise HTTPException(status_code=500, detail="No active bank account found")

    # Calculate total amount (assuming it's in booking)
    total_amount = getattr(booking, 'total_amount', 0) or 1000000  # Default 1M VND

    # Generate a unique order_code that fits in JavaScript safe integer limit
    order_code = int(f"{booking_id}{int(time.time() * 1000) % 1000000000:09d}")
    
    # Create PayOS payment link - include secure token in redirect URLs for continuity
    cancel_url = f"{settings.FRONTEND_URL}/payment/{booking_id}?token={booking.secure_token}"
    return_url = f"{settings.FRONTEND_URL}/payment/{booking_id}?token={booking.secure_token}"
    
    # Description max 25 chars for payOS (must be alphanumeric, no spaces)
    description = f"NST{booking_id}"
    
    payment_link_request = CreatePaymentLinkRequest(
        order_code=order_code,
        amount=int(total_amount),
        description=description,
        cancel_url=cancel_url,
        return_url=return_url
    )
    
    try:
        payment_link = payos_client.payment_requests.create(payment_link_request)
        checkout_url = payment_link.checkout_url
    except Exception as e:
        print(f"PayOS link creation failed: {repr(e)}")
        raise HTTPException(status_code=500, detail=f"Không thể tạo liên kết thanh toán payOS: {str(e)}")

    # Create payment transaction
    payment_data = PaymentTransactionCreate(
        booking_id=booking_id,
        amount=total_amount,
        bank_account_id=bank_account.id
    )
    payment_transaction = create_payment_transaction(db, payment_data, transaction_ref=str(order_code))

    # Update payment with QR info and expiry (30 minutes)
    expires_at = datetime.utcnow() + timedelta(minutes=30)
    payment_transaction.vietqr_url = checkout_url
    payment_transaction.vietqr_code = payment_link.qr_code
    payment_transaction.expires_at = expires_at
    db.commit()
    db.refresh(payment_transaction)

    return {
        "id": payment_transaction.id,
        "transaction_ref": payment_transaction.transaction_ref,
        "amount": payment_transaction.amount,
        "status": payment_transaction.status,
        "qr_code_url": payment_transaction.vietqr_code,
        "checkout_url": payment_transaction.vietqr_url,
        "created_at": payment_transaction.created_at,
        "expires_at": payment_transaction.expires_at,
        # Bank info from PayOS
        "bank_bin": payment_link.bin,
        "bank_name": BIN_TO_BANK_NAME.get(payment_link.bin, f"Ngân hàng ({payment_link.bin})"),
        "account_number": payment_link.account_number,
        "account_name": payment_link.account_name,
        "transfer_content": payment_link.description,
    }

@router.get("/status/{booking_id}")
def get_payment_status(
    booking_id: int,
    token: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    """Get payment status for a booking"""
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    # Access control
    if current_user:
        if not current_user.is_admin and booking.email != current_user.email:
            raise HTTPException(status_code=403, detail="Permission denied")
    else:
        if not token or token != booking.secure_token:
            raise HTTPException(
                status_code=403,
                detail="Không có quyền truy cập trạng thái thanh toán cho đơn hàng này."
            )

    payment_transaction = get_payment_by_booking_id(db, booking_id)
    if not payment_transaction:
        return {
            "booking_id": booking_id,
            "payment_status": booking.payment_status,
            "transaction": None
        }

    return {
        "id": payment_transaction.id,
        "transaction_ref": payment_transaction.transaction_ref,
        "amount": payment_transaction.amount,
        "status": payment_transaction.status,
        "qr_code_url": payment_transaction.vietqr_code,
        "checkout_url": payment_transaction.vietqr_url,
        "created_at": payment_transaction.created_at,
        "expires_at": payment_transaction.expires_at,
        "completed_at": payment_transaction.completed_at
    }


# PAYOS WEBHOOK
@router.post("/payos-webhook")
async def handle_payos_webhook(request: Request, db: Session = Depends(get_db)):
    """Handle PayOS webhook for automatic payment confirmation"""
    try:
        body = await request.body()
        webhook_data = payos_client.webhooks.verify(body)
        
        order_code = webhook_data.order_code
        amount = webhook_data.amount
        
        payment_transaction = get_payment_transaction_by_ref(db, str(order_code))
        if not payment_transaction:
            print(f"PayOS Webhook: Payment transaction with ref {order_code} not found")
            return {"status": "error", "message": "Transaction not found"}
            
        expected_amount = payment_transaction.amount
        if abs(amount - expected_amount) > 1000:
            print(f"PayOS Webhook: Amount mismatch. Expected {expected_amount}, got {amount}")
            return {"status": "error", "message": "Amount mismatch"}

        if payment_transaction.status == "pending":
            # Prevent webhook from resurrecting a cancelled booking
            if payment_transaction.booking and payment_transaction.booking.status == "cancelled":
                print(f"PayOS Webhook: Skipping cancelled booking {payment_transaction.booking.id}")
                return {"status": "skipped", "message": "Booking was cancelled"}

            # Check if payment has expired
            if payment_transaction.expires_at and payment_transaction.expires_at < datetime.utcnow():
                print(f"PayOS Webhook: Skipping expired transaction {payment_transaction.id}")
                return {"status": "skipped", "message": "Payment transaction expired"}

            payment_transaction.status = "completed"
            payment_transaction.completed_at = datetime.utcnow()

            if payment_transaction.booking:
                payment_transaction.booking.payment_status = "paid"
                payment_transaction.booking.status = "confirmed"

                try:
                    send_payment_success_email(
                        to_email=payment_transaction.booking.email,
                        full_name=payment_transaction.booking.full_name,
                        tour_title=payment_transaction.booking.tour_title,
                        amount=payment_transaction.amount,
                        transaction_ref=payment_transaction.transaction_ref
                    )
                except Exception as e:
                    print(f"Failed to send confirmation email: {e}")

            db.commit()

        return {"status": "success", "message": "Payment confirmed"}
    except Exception as e:
        print(f"PayOS Webhook error: {e}")
        raise HTTPException(status_code=400, detail=str(e))


# CASSO WEBHOOK
@router.post("/casso-webhook")
async def handle_casso_webhook(request: Request, db: Session = Depends(get_db)):
    """Handle Casso webhook for automatic payment confirmation"""
    try:
        # Validate Casso webhook secure token
        if settings.CASSO_SECURE_TOKEN:
            auth_header = request.headers.get("Authorization")
            token_valid = False
            if auth_header:
                if auth_header.strip() == settings.CASSO_SECURE_TOKEN:
                    token_valid = True
                elif auth_header.startswith("Secure-Token ") and auth_header.split(" ")[1] == settings.CASSO_SECURE_TOKEN:
                    token_valid = True
                elif auth_header.startswith("Apikey ") and auth_header.split(" ")[1] == settings.CASSO_SECURE_TOKEN:
                    token_valid = True
            
            custom_header = request.headers.get("Secure-Token") or request.headers.get("X-Secure-Token")
            if custom_header and custom_header.strip() == settings.CASSO_SECURE_TOKEN:
                token_valid = True
                
            if not token_valid:
                raise HTTPException(status_code=401, detail="Unauthorized webhook request")

        # Get raw body
        body = await request.body()
        webhook_data = json.loads(body)

        # Validate Casso webhook structure
        if webhook_data.get("error") != 0:
            return {"status": "error", "message": "Casso webhook error"}

        # Process each transaction
        transactions = webhook_data.get("data", [])
        processed_count = 0

        for trans_data in transactions:
            try:
                # Extract transaction info
                description = trans_data.get("description", "")
                amount = trans_data.get("amount", 0)
                bank_trans_id = trans_data.get("tid", "")
                trans_time = trans_data.get("when", "")

                # Find transaction reference in description
                # Format: "Ma GD: NSTXXXXXXXX"
                import re
                ref_match = re.search(r'Ma GD:\s*([A-Z0-9]+)', description, re.IGNORECASE)
                if not ref_match:
                    continue

                transaction_ref = ref_match.group(1)

                # Find payment transaction
                payment_transaction = get_payment_transaction_by_ref(db, transaction_ref)
                if not payment_transaction:
                    continue

                # Verify amount matches (allow small differences for fees)
                expected_amount = payment_transaction.amount
                if abs(amount - expected_amount) > 1000:  # Allow 1k VND difference
                    continue

                # Mark as completed if still pending
                if payment_transaction.status == "pending":
                    # Prevent webhook from resurrecting a cancelled booking
                    if payment_transaction.booking and payment_transaction.booking.status == "cancelled":
                        print(f"Casso Webhook: Skipping cancelled booking {payment_transaction.booking.id}")
                        continue

                    # Check if payment has expired
                    if payment_transaction.expires_at and payment_transaction.expires_at < datetime.utcnow():
                        print(f"Casso Webhook: Skipping expired transaction {payment_transaction.id}")
                        continue

                    payment_transaction.status = "completed"
                    payment_transaction.casso_transaction_id = bank_trans_id
                    payment_transaction.bank_transaction_description = description
                    payment_transaction.completed_at = datetime.utcnow()

                    # Parse and set bank transaction time
                    try:
                        payment_transaction.bank_transaction_time = datetime.fromisoformat(trans_time.replace('Z', '+00:00'))
                    except:
                        pass

                    # Update booking status
                    if payment_transaction.booking:
                        payment_transaction.booking.payment_status = "paid"
                        payment_transaction.booking.status = "confirmed"

                    # Send confirmation email
                    if payment_transaction.booking:
                        try:
                            send_payment_success_email(
                                to_email=payment_transaction.booking.email,
                                full_name=payment_transaction.booking.full_name,
                                tour_title=payment_transaction.booking.tour_title,
                                amount=payment_transaction.amount,
                                transaction_ref=transaction_ref
                            )
                        except Exception as e:
                            print(f"Failed to send confirmation email: {e}")

                    processed_count += 1

            except Exception as e:
                print(f"Error processing transaction: {e}")
                continue

        db.commit()

        return {
            "status": "success",
            "message": f"Processed {processed_count} transactions"
        }

    except Exception as e:
        print(f"Webhook error: {e}")
        return {"status": "error", "message": str(e)}

# ADMIN PAYMENT TRANSACTIONS API
@router.get("/transactions", response_model=List[PaymentTransactionResponse])
def get_all_payment_transactions(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all payment transactions (Admin only)"""
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Permission denied")

    from app.crud.payment_transaction import get_payment_transactions
    return get_payment_transactions(db, skip=skip, limit=limit)

@router.post("/transactions/{transaction_id}/confirm")
def confirm_payment_transaction(
    transaction_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Manually confirm payment transaction (Admin only)"""
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Permission denied")

    # Get transaction
    from app.crud.payment_transaction import get_payment_transaction
    payment_transaction = get_payment_transaction(db, transaction_id)
    if not payment_transaction:
        raise HTTPException(status_code=404, detail="Payment transaction not found")

    if payment_transaction.status == "completed":
        raise HTTPException(status_code=400, detail="Transaction already confirmed")

    # Mark as completed
    payment_transaction.status = "completed"
    payment_transaction.completed_at = datetime.utcnow()

    # Update booking status
    if payment_transaction.booking:
        payment_transaction.booking.payment_status = "paid"
        payment_transaction.booking.status = "confirmed"

    # Send confirmation email
    if payment_transaction.booking:
        try:
            send_payment_success_email(
                to_email=payment_transaction.booking.email,
                full_name=payment_transaction.booking.full_name,
                tour_title=payment_transaction.booking.tour_title,
                amount=payment_transaction.amount,
                transaction_ref=payment_transaction.transaction_ref
            )
        except Exception as e:
            print(f"Failed to send confirmation email: {e}")

    db.commit()
    db.refresh(payment_transaction)

    return {
        "detail": "Payment confirmed successfully",
        "transaction": {
            "id": payment_transaction.id,
            "transaction_ref": payment_transaction.transaction_ref,
            "status": payment_transaction.status,
            "completed_at": payment_transaction.completed_at
        }
    }

@router.post("/transactions/{transaction_id}/cancel")
def cancel_payment_transaction(
    transaction_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Cancel payment transaction (Admin only)"""
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Permission denied")

    # Get transaction
    from app.crud.payment_transaction import get_payment_transaction
    payment_transaction = get_payment_transaction(db, transaction_id)
    if not payment_transaction:
        raise HTTPException(status_code=404, detail="Payment transaction not found")

    if payment_transaction.status == "completed":
        raise HTTPException(status_code=400, detail="Cannot cancel completed transaction")

    # Mark as failed
    payment_transaction.status = "failed"

    db.commit()
    db.refresh(payment_transaction)

    return {
        "detail": "Payment transaction cancelled",
        "transaction": {
            "id": payment_transaction.id,
            "transaction_ref": payment_transaction.transaction_ref,
            "status": payment_transaction.status
        }
    }


@router.post("/simulate-success/{booking_id}")
def simulate_payment_success(
    booking_id: int,
    db: Session = Depends(get_db)
):
    """Dev-only endpoint to simulate payment success for a booking (restricted to local environment)"""
    is_local_dev = "localhost" in settings.FRONTEND_URL or "127.0.0.1" in settings.FRONTEND_URL
    if not is_local_dev:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tác vụ này chỉ được phép thực hiện trên môi trường phát triển."
        )

    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    booking.payment_status = "paid"
    booking.status = "confirmed"
    
    payment_transaction = get_payment_by_booking_id(db, booking_id)
    if payment_transaction:
        payment_transaction.status = "completed"
        payment_transaction.completed_at = datetime.utcnow()
        
    # Trigger payment success email
    try:
        send_payment_success_email(
            to_email=booking.email,
            full_name=booking.full_name,
            tour_title=booking.tour_title,
            amount=booking.total_amount or 1000000.0,
            transaction_ref=payment_transaction.transaction_ref if payment_transaction else f"SIMULATED_{booking.id}"
        )
    except Exception as e:
        print(f"Failed to send confirmation email in simulation: {e}")

    db.commit()
    return {"detail": "Simulation successful"}
