import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

def send_booking_email(
    to_email: str,
    tour_title: str,
    full_name: str,
    departure_date: str,
    guests_count: int,
    booking_id: int,
    secure_token: str = ""
):
    if not settings.MAIL_SERVER or not settings.MAIL_USERNAME or not settings.MAIL_PASSWORD:
        logger.warning("SMTP Mail configuration is incomplete. Skipping mail delivery.")
        return False
        
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = f"[TravelSite] Xác nhận yêu cầu đặt tour: {tour_title}"
        msg["From"] = settings.MAIL_FROM or settings.MAIL_USERNAME
        msg["To"] = to_email

        token_suffix = f"&token={secure_token}" if secure_token else ""
        success_url = f"{settings.FRONTEND_URL}/checkout/success?bookingId={booking_id}{token_suffix}"

        html = f"""
        <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                    <h2 style="color: #319795; text-align: center; margin-bottom: 20px;">Cảm ơn bạn đã đặt tour tại TravelSite!</h2>
                    <p>Chào <strong>{full_name}</strong>,</p>
                    <p>Chúng tôi đã nhận được yêu cầu đặt tour của bạn. Dưới đây là thông tin chi tiết hành trình:</p>
                    <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                        <tr>
                            <td style="padding: 10px; border-bottom: 1px solid #edf2f7; font-weight: bold; width: 40%;">Tên chuyến đi:</td>
                            <td style="padding: 10px; border-bottom: 1px solid #edf2f7;">{tour_title}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px; border-bottom: 1px solid #edf2f7; font-weight: bold;">Ngày khởi hành mong muốn:</td>
                            <td style="padding: 10px; border-bottom: 1px solid #edf2f7;">{departure_date}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px; border-bottom: 1px solid #edf2f7; font-weight: bold;">Số lượng khách:</td>
                            <td style="padding: 10px; border-bottom: 1px solid #edf2f7;">{guests_count} người</td>
                        </tr>
                    </table>
                    
                    <div style="text-align: center; margin: 25px 0;">
                        <a href="{success_url}" style="background-color: #319795; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
                            Xem chi tiết yêu cầu đặt tour
                        </a>
                    </div>
                    <p style="font-size: 0.9rem; color: #666; text-align: center;">
                        Nếu nút trên không hoạt động, bạn có thể truy cập liên kết sau: <br/>
                        <a href="{success_url}">{success_url}</a>
                    </p>

                    <p>Đội ngũ chuyên viên tư vấn của TravelSite sẽ nhanh chóng liên hệ trực tiếp với bạn qua điện thoại để xác nhận chỗ và hướng dẫn các bước tiếp theo.</p>
                    <hr style="border: 0; border-top: 1px solid #edf2f7; margin: 30px 0;" />
                    <div style="text-align: center; font-size: 12px; color: #a0aec0;">
                        <p>Đây là thư thông báo tự động. Vui lòng không trả lời thư này.</p>
                        <p>© 2026 TravelSite. Bảo lưu mọi quyền.</p>
                    </div>
                </div>
            </body>
        </html>
        """
        msg.attach(MIMEText(html, "html", "utf-8"))

        # Connect and send
        server = smtplib.SMTP(settings.MAIL_SERVER, settings.MAIL_PORT)
        if settings.MAIL_STARTTLS:
            server.starttls()
        server.login(settings.MAIL_USERNAME, settings.MAIL_PASSWORD)
        server.sendmail(msg["From"], [to_email], msg.as_string())
        server.quit()
        logger.info(f"Booking confirmation email sent to {to_email}")
        return True
    except Exception as e:
        logger.error(f"Failed to send booking email to {to_email}: {e}")
        return False

def send_payment_confirmation_email(
    to_email: str,
    full_name: str,
    tour_title: str,
    amount: float,
    transaction_ref: str,
    payment_url: str = None
) -> bool:
    if not settings.MAIL_SERVER or not settings.MAIL_USERNAME or not settings.MAIL_PASSWORD:
        logger.warning("SMTP Mail configuration is incomplete. Skipping payment email.")
        return False

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = f"[TravelSite] Thông tin thanh toán tour: {tour_title}"
        msg["From"] = settings.MAIL_FROM or settings.MAIL_USERNAME
        msg["To"] = to_email

        formatted_amount = f"{amount:,.0f} VNĐ"

        html = f"""
        <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                    <h2 style="color: #319795; text-align: center; margin-bottom: 20px;">Thông tin thanh toán tour du lịch</h2>
                    <p>Chào <strong>{full_name}</strong>,</p>
                    <p>Booking tour của bạn đã được xác nhận! Vui lòng thực hiện thanh toán để hoàn tất đặt chỗ:</p>

                    <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <h3 style="color: #2d3748; margin-top: 0;">Thông tin booking:</h3>
                        <table style="width: 100%; border-collapse: collapse;">
                            <tr>
                                <td style="padding: 8px 0; font-weight: bold; width: 40%;">Tour:</td>
                                <td style="padding: 8px 0;">{tour_title}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; font-weight: bold;">Số tiền cần thanh toán:</td>
                                <td style="padding: 8px 0; font-size: 18px; color: #e53e3e; font-weight: bold;">{formatted_amount}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; font-weight: bold;">Mã giao dịch:</td>
                                <td style="padding: 8px 0; font-family: monospace; background: #edf2f7; padding: 4px 8px; border-radius: 4px;">{transaction_ref}</td>
                            </tr>
                        </table>
                    </div>

                    {f'<div style="text-align: center; margin: 20px 0;"><a href="{payment_url}" style="background: #319795; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Thanh toán ngay</a></div>' if payment_url else ''}

                    <p><strong>Hướng dẫn thanh toán:</strong></p>
                    <ol>
                        <li>Quét mã QR hoặc chuyển khoản theo thông tin tài khoản</li>
                        <li><strong>Nhập chính xác mã giao dịch: {transaction_ref}</strong> vào nội dung chuyển khoản</li>
                        <li>Hệ thống sẽ tự động xác nhận thanh toán trong vài phút</li>
                    </ol>

                    <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 6px; margin: 20px 0;">
                        <p style="margin: 0;"><strong>⚠️ Lưu ý quan trọng:</strong> Vui lòng nhập đúng mã giao dịch <code>{transaction_ref}</code> để hệ thống tự động xác nhận thanh toán của bạn.</p>
                    </div>

                    <hr style="border: 0; border-top: 1px solid #edf2f7; margin: 30px 0;" />
                    <div style="text-align: center; font-size: 12px; color: #a0aec0;">
                        <p>Đây là thư thông báo tự động. Vui lòng không trả lời thư này.</p>
                        <p>© 2026 TravelSite. Bảo lưu mọi quyền.</p>
                    </div>
                </div>
            </body>
        </html>
        """
        msg.attach(MIMEText(html, "html", "utf-8"))

        server = smtplib.SMTP(settings.MAIL_SERVER, settings.MAIL_PORT)
        if settings.MAIL_STARTTLS:
            server.starttls()
        server.login(settings.MAIL_USERNAME, settings.MAIL_PASSWORD)
        server.sendmail(msg["From"], [to_email], msg.as_string())
        server.quit()
        logger.info(f"Payment confirmation email sent to {to_email}")
        return True
    except Exception as e:
        logger.error(f"Failed to send payment email to {to_email}: {e}")
        return False

def send_verification_email(to_email: str, code: str) -> bool:
    if not settings.MAIL_SERVER or not settings.MAIL_USERNAME or not settings.MAIL_PASSWORD:
        logger.warning("SMTP Mail configuration is incomplete. Skipping verification mail.")
        return False

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = f"[TravelSite] Mã xác thực tài khoản của bạn: {code}"
        msg["From"] = settings.MAIL_FROM or settings.MAIL_USERNAME
        msg["To"] = to_email

        html = f"""
        <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                    <h2 style="color: #319795; text-align: center; margin-bottom: 20px;">Xác thực địa chỉ Email của bạn</h2>
                    <p>Xin chào,</p>
                    <p>Bạn đã yêu cầu xác thực địa chỉ email tại TravelSite. Vui lòng sử dụng mã xác thực dưới đây để hoàn tất quá trình:</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <span style="font-size: 24px; font-weight: bold; color: #2b6cb0; letter-spacing: 5px; border: 2px dashed #cbd5e0; padding: 10px 20px; border-radius: 4px; background-color: #f7fafc;">
                            {code}
                        </span>
                    </div>
                    <p>Mã này có hiệu lực trong vòng 10 phút. Nếu bạn không yêu cầu việc này, vui lòng bỏ qua email này.</p>
                    <hr style="border: 0; border-top: 1px solid #edf2f7; margin: 30px 0;" />
                    <div style="text-align: center; font-size: 12px; color: #a0aec0;">
                        <p>Đây là thư thông báo tự động. Vui lòng không trả lời thư này.</p>
                        <p>© 2026 TravelSite. Bảo lưu mọi quyền.</p>
                    </div>
                </div>
            </body>
        </html>
        """
        msg.attach(MIMEText(html, "html", "utf-8"))

        server = smtplib.SMTP(settings.MAIL_SERVER, settings.MAIL_PORT)
        if settings.MAIL_STARTTLS:
            server.starttls()
        server.login(settings.MAIL_USERNAME, settings.MAIL_PASSWORD)
        server.sendmail(msg["From"], [to_email], msg.as_string())
        server.quit()
        logger.info(f"Verification email sent to {to_email}")
        return True
    except Exception as e:
        logger.error(f"Failed to send verification email to {to_email}: {e}")
        return False

def send_payment_success_email(
    to_email: str,
    full_name: str,
    tour_title: str,
    amount: float,
    transaction_ref: str
) -> bool:
    if not settings.MAIL_SERVER or not settings.MAIL_USERNAME or not settings.MAIL_PASSWORD:
        logger.warning("SMTP Mail configuration is incomplete. Skipping payment success email.")
        return False

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = f"[TravelSite] Xác nhận thanh toán thành công tour: {tour_title}"
        msg["From"] = settings.MAIL_FROM or settings.MAIL_USERNAME
        msg["To"] = to_email

        formatted_amount = f"{amount:,.0f} VNĐ"

        html = f"""
        <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                    <h2 style="color: #2b6cb0; text-align: center; margin-bottom: 20px;">🎉 Xác nhận thanh toán thành công!</h2>
                    <p>Chào <strong>{full_name}</strong>,</p>
                    <p>Chúng tôi vui mừng thông báo rằng giao dịch thanh toán cho đơn đặt tour của bạn đã hoàn tất thành công. Dưới đây là thông tin chi tiết biên nhận:</p>

                    <div style="background: #f7fafc; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e2e8f0;">
                        <h3 style="color: #2d3748; margin-top: 0;">Thông tin biên nhận thanh toán:</h3>
                        <table style="width: 100%; border-collapse: collapse;">
                            <tr>
                                <td style="padding: 8px 0; font-weight: bold; width: 40%;">Tour:</td>
                                <td style="padding: 8px 0;">{tour_title}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; font-weight: bold;">Số tiền đã thanh toán:</td>
                                <td style="padding: 8px 0; font-size: 18px; color: #2b6cb0; font-weight: bold;">{formatted_amount}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; font-weight: bold;">Mã giao dịch:</td>
                                <td style="padding: 8px 0; font-family: monospace; background: #edf2f7; padding: 4px 8px; border-radius: 4px;">{transaction_ref}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; font-weight: bold;">Trạng thái:</td>
                                <td style="padding: 8px 0; color: #48bb78; font-weight: bold;">Đã thanh toán thành công</td>
                            </tr>
                        </table>
                    </div>

                    <p>Đơn đặt tour của bạn hiện đã được xác nhận chính thức trên hệ thống. Chúng tôi sẽ gửi thông tin hướng dẫn chuẩn bị trước chuyến đi và liên hệ HDV cho bạn qua điện thoại hoặc email trước ngày khởi hành.</p>
                    <p>Chúc bạn có một chuyến đi tuyệt vời cùng TravelSite!</p>

                    <hr style="border: 0; border-top: 1px solid #edf2f7; margin: 30px 0;" />
                    <div style="text-align: center; font-size: 12px; color: #a0aec0;">
                        <p>Đây là thư thông báo tự động. Vui lòng không trả lời thư này.</p>
                        <p>© 2026 TravelSite. Bảo lưu mọi quyền.</p>
                    </div>
                </div>
            </body>
        </html>
        """
        msg.attach(MIMEText(html, "html", "utf-8"))

        server = smtplib.SMTP(settings.MAIL_SERVER, settings.MAIL_PORT)
        if settings.MAIL_STARTTLS:
            server.starttls()
        server.login(settings.MAIL_USERNAME, settings.MAIL_PASSWORD)
        server.sendmail(msg["From"], [to_email], msg.as_string())
        server.quit()
        logger.info(f"Payment success email sent to {to_email}")
        return True
    except Exception as e:
        logger.error(f"Failed to send payment success email to {to_email}: {e}")
        return False


def send_booking_confirmed_email(
    to_email: str,
    full_name: str,
    tour_title: str,
    departure_date: str,
    guests_count: int,
    total_amount: float,
    booking_id: int,
    online_payment_enabled: bool = False,
    secure_token: str | None = None
) -> bool:
    """Send email when admin confirms a booking."""
    if not settings.MAIL_SERVER or not settings.MAIL_USERNAME or not settings.MAIL_PASSWORD:
        logger.warning("SMTP Mail configuration is incomplete. Skipping mail delivery.")
        return False

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = f"[TravelSite] Đơn đặt tour đã được xác nhận: {tour_title}"
        msg["From"] = settings.MAIL_FROM or settings.MAIL_USERNAME
        msg["To"] = to_email

        token_query = f"?token={secure_token}" if secure_token else ""
        payment_url = f"{settings.FRONTEND_URL}/payment/{booking_id}{token_query}" if online_payment_enabled else None
        formatted_amount = f"{total_amount:,.0f} VNĐ"

        html = f"""
        <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                    <h2 style="color: #2b6cb0; text-align: center; margin-bottom: 20px;">✅ Đơn đặt tour đã được xác nhận!</h2>
                    <p>Chào <strong>{full_name}</strong>,</p>
                    <p>Chúng tôi vui mừng thông báo rằng đơn đặt tour của bạn đã được xác nhận. {"Bạn có thể thanh toán online qua QR để hoàn tất đặt chỗ:" if online_payment_enabled else "Nhân viên New Star Tour sẽ liên hệ và hướng dẫn thanh toán:"}</p>

                    <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <table style="width: 100%; border-collapse: collapse;">
                            <tr>
                                <td style="padding: 8px 0; font-weight: bold; width: 40%;">Tour:</td>
                                <td style="padding: 8px 0;">{tour_title}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; font-weight: bold;">Ngày khởi hành:</td>
                                <td style="padding: 8px 0;">{departure_date}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; font-weight: bold;">Số lượng khách:</td>
                                <td style="padding: 8px 0;">{guests_count} người</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; font-weight: bold;">Tổng thanh toán:</td>
                                <td style="padding: 8px 0; font-size: 18px; color: #e53e3e; font-weight: bold;">{formatted_amount}</td>
                            </tr>
                        </table>
                    </div>

                    {f'''<div style="text-align: center; margin: 25px 0;">
                        <a href="{payment_url}" style="background-color: #319795; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
                            Thanh toán ngay
                        </a>
                    </div>

                    <p style="font-size: 0.9rem; color: #666; text-align: center;">
                        Nếu nút trên không hoạt động, truy cập: <a href="{payment_url}">{payment_url}</a>
                    </p>''' if online_payment_enabled else ''}

                    <hr style="border: 0; border-top: 1px solid #edf2f7; margin: 30px 0;" />
                    <div style="text-align: center; font-size: 12px; color: #a0aec0;">
                        <p>Đây là thư thông báo tự động. Vui lòng không trả lời thư này.</p>
                        <p>© 2026 New Star Tour. Bảo lưu mọi quyền.</p>
                    </div>
                </div>
            </body>
        </html>
        """
        msg.attach(MIMEText(html, "html", "utf-8"))

        server = smtplib.SMTP(settings.MAIL_SERVER, settings.MAIL_PORT)
        if settings.MAIL_STARTTLS:
            server.starttls()
        server.login(settings.MAIL_USERNAME, settings.MAIL_PASSWORD)
        server.sendmail(msg["From"], [to_email], msg.as_string())
        server.quit()
        logger.info(f"Booking confirmed email sent to {to_email}")
        return True
    except Exception as e:
        logger.error(f"Failed to send booking confirmed email to {to_email}: {e}")
        return False


def send_booking_cancelled_email(
    to_email: str,
    full_name: str,
    tour_title: str,
    departure_date: str,
    reason: str = None
) -> bool:
    """Send email when a booking is cancelled."""
    if not settings.MAIL_SERVER or not settings.MAIL_USERNAME or not settings.MAIL_PASSWORD:
        logger.warning("SMTP Mail configuration is incomplete. Skipping mail delivery.")
        return False

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = f"[TravelSite] Đơn đặt tour đã bị hủy: {tour_title}"
        msg["From"] = settings.MAIL_FROM or settings.MAIL_USERNAME
        msg["To"] = to_email

        reason_html = ""
        if reason:
            reason_html = f"""
            <div style="background: #fff5f5; border: 1px solid #fed7d7; padding: 15px; border-radius: 6px; margin: 20px 0;">
                <p style="margin: 0;"><strong>Lý do hủy:</strong> {reason}</p>
            </div>
            """

        html = f"""
        <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                    <h2 style="color: #e53e3e; text-align: center; margin-bottom: 20px;">❌ Đơn đặt tour đã bị hủy</h2>
                    <p>Chào <strong>{full_name}</strong>,</p>
                    <p>Đơn đặt tour của bạn đã bị hủy với thông tin sau:</p>

                    <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <table style="width: 100%; border-collapse: collapse;">
                            <tr>
                                <td style="padding: 8px 0; font-weight: bold; width: 40%;">Tour:</td>
                                <td style="padding: 8px 0;">{tour_title}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; font-weight: bold;">Ngày khởi hành:</td>
                                <td style="padding: 8px 0;">{departure_date}</td>
                            </tr>
                        </table>
                    </div>

                    {reason_html}

                    <p>Nếu bạn muốn đặt lại tour, vui lòng truy cập trang chủ hoặc liên hệ hotline của chúng tôi.</p>

                    <hr style="border: 0; border-top: 1px solid #edf2f7; margin: 30px 0;" />
                    <div style="text-align: center; font-size: 12px; color: #a0aec0;">
                        <p>Đây là thư thông báo tự động. Vui lòng không trả lời thư này.</p>
                        <p>© 2026 New Star Tour. Bảo lưu mọi quyền.</p>
                    </div>
                </div>
            </body>
        </html>
        """
        msg.attach(MIMEText(html, "html", "utf-8"))

        server = smtplib.SMTP(settings.MAIL_SERVER, settings.MAIL_PORT)
        if settings.MAIL_STARTTLS:
            server.starttls()
        server.login(settings.MAIL_USERNAME, settings.MAIL_PASSWORD)
        server.sendmail(msg["From"], [to_email], msg.as_string())
        server.quit()
        logger.info(f"Booking cancelled email sent to {to_email}")
        return True
    except Exception as e:
        logger.error(f"Failed to send booking cancelled email to {to_email}: {e}")
        return False
