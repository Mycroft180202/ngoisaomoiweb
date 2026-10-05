import qrcode
import base64
from io import BytesIO
from typing import Optional
from urllib.parse import quote

class VietQRService:
    """Service for generating VietQR codes according to Vietnamese QR standard"""

    def __init__(self):
        # VietQR bank codes mapping
        self.BANK_CODES = {
            "Vietcombank": "970436",
            "VietinBank": "970415",
            "BIDV": "970418",
            "Agribank": "970405",
            "ACB": "970416",
            "Techcombank": "970407",
            "MBBank": "970422",
            "VPBank": "970432",
            "SHB": "970443",
            "Sacombank": "970403",
            "TPBank": "970423",
            "Eximbank": "970431"
        }

    def generate_vietqr_string(
        self,
        bank_name: str,
        account_number: str,
        account_name: str,
        amount: float,
        description: str,
        transaction_ref: str
    ) -> str:
        """Generate VietQR string according to EMV QR Code specification"""

        # Get bank code
        bank_code = self.BANK_CODES.get(bank_name, "970436")  # Default to Vietcombank

        # Format amount (remove decimal if .00)
        amount_str = f"{amount:.0f}" if amount == int(amount) else f"{amount:.2f}"

        # Build merchant account info (Tag 38)
        merchant_info = f"0010A000000727{len(bank_code):02d}{bank_code}{len(account_number):02d}{account_number}"

        # Build transaction description with reference
        full_description = f"{description} - Ma GD: {transaction_ref}"

        # VietQR EMV string components
        components = [
            "000201",  # Payload Format Indicator
            "010212",  # Point of Initiation Method (12 = QR reusable)
            f"38{len(merchant_info):02d}{merchant_info}",  # Merchant Account Info
            "52040000",  # Merchant Category Code
            "5303704",  # Transaction Currency (704 = VND)
            f"54{len(amount_str):02d}{amount_str}",  # Transaction Amount
            "5802VN",  # Country Code
            f"59{len(account_name):02d}{account_name}",  # Merchant Name
            f"62{len(full_description)+4:02d}08{len(transaction_ref):02d}{transaction_ref}",  # Additional Data (Transaction Ref)
        ]

        # Join all components
        qr_string = "".join(components)

        # Calculate CRC (simplified - for production use proper CRC16-CCITT)
        crc = self._calculate_crc16(qr_string + "6304")
        qr_string += f"63{crc:04X}"

        return qr_string

    def _calculate_crc16(self, data: str) -> int:
        """Calculate CRC16-CCITT checksum for VietQR"""
        polynomial = 0x1021
        crc = 0xFFFF

        for byte in data.encode('utf-8'):
            crc ^= byte << 8
            for _ in range(8):
                if crc & 0x8000:
                    crc = (crc << 1) ^ polynomial
                else:
                    crc <<= 1
                crc &= 0xFFFF

        return crc

    def generate_qr_code_image(
        self,
        bank_name: str,
        account_number: str,
        account_name: str,
        amount: float,
        description: str,
        transaction_ref: str,
        size: int = 300
    ) -> str:
        """Generate QR code image and return as base64 string"""

        # Generate VietQR string
        qr_string = self.generate_vietqr_string(
            bank_name=bank_name,
            account_number=account_number,
            account_name=account_name,
            amount=amount,
            description=description,
            transaction_ref=transaction_ref
        )

        # Create QR code
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=10,
            border=2,
        )
        qr.add_data(qr_string)
        qr.make(fit=True)

        # Generate image
        img = qr.make_image(fill_color="black", back_color="white")

        # Resize if needed
        if size != 300:
            img = img.resize((size, size))

        # Convert to base64
        buffer = BytesIO()
        img.save(buffer, format='PNG')
        img_base64 = base64.b64encode(buffer.getvalue()).decode()

        return f"data:image/png;base64,{img_base64}"

    def generate_banking_app_url(
        self,
        bank_name: str,
        account_number: str,
        account_name: str,
        amount: float,
        description: str,
        transaction_ref: str
    ) -> Optional[str]:
        """Generate deep link for banking apps"""

        full_description = f"{description} - Ma GD: {transaction_ref}"

        # Banking app deep links
        if bank_name.lower() in ["vietcombank", "vcb"]:
            return f"vcb://transfer?accountNo={account_number}&amount={amount}&description={quote(full_description)}"
        elif bank_name.lower() in ["mbbank", "mb"]:
            return f"mbbank://transfer?beneficiaryAccount={account_number}&amount={amount}&content={quote(full_description)}"
        elif bank_name.lower() in ["techcombank", "tcb"]:
            return f"tcb://transfer?account={account_number}&amount={amount}&note={quote(full_description)}"
        elif bank_name.lower() in ["acb"]:
            return f"acb://transfer?toAccount={account_number}&amount={amount}&message={quote(full_description)}"

        # Generic banking URL (works with most apps)
        return f"banking://transfer?account={account_number}&amount={amount}&note={quote(full_description)}"

# Create global instance
vietqr_service = VietQRService()