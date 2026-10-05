import urllib.request
import urllib.error
import json
import logging
from app.core.config import settings

logger = logging.getLogger(__name__)

def format_vietnamese_phone(phone: str) -> str:
    """
    Format phone number to Zalo country code format (84xxxxxxxxxx).
    E.g.: 0987654321 -> 84987654321
          +84987654321 -> 84987654321
          84987654321 -> 84987654321
    """
    if not phone:
        return ""
    phone = phone.strip().replace(" ", "").replace("-", "")
    if phone.startswith("+"):
        phone = phone[1:]
    if phone.startswith("0"):
        phone = "84" + phone[1:]
    return phone

def send_zalo_otp(phone: str, code: str) -> bool:
    access_token = settings.ZALO_OA_ACCESS_TOKEN
    template_id = settings.ZALO_TEMPLATE_ID

    if (not access_token or 
        not template_id or 
        access_token.strip() == "" or 
        "your-zalo-oa" in access_token or 
        "your-zalo-template" in template_id):
        logger.warning(
            f"Zalo OA configuration is incomplete (access_token or template_id is missing). "
            f"Simulated sending OTP {code} to {phone}."
        )
        return False

    formatted_phone = format_vietnamese_phone(phone)
    if not formatted_phone:
        logger.error("Phone number is empty, cannot send Zalo OTP.")
        return False

    url = "https://business.openapi.zalo.me/message/template"
    payload = {
        "phone": formatted_phone,
        "template_id": template_id,
        "template_data": {
            "otp": code
        }
    }

    try:
        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "Content-Type": "application/json",
                "access_token": access_token
            },
            method="POST"
        )
        with urllib.request.urlopen(req, timeout=10) as response:
            res_body = json.loads(response.read().decode("utf-8"))
            
            # Zalo API usually returns error code inside response JSON
            # E.g. {"error": 0, "message": "Success"}
            error_code = res_body.get("error", -1)
            message = res_body.get("message", "Unknown message")
            
            if error_code == 0:
                logger.info(f"Zalo OA OTP sent successfully to {formatted_phone}. Zalo response: {message}")
                return True
            else:
                logger.error(f"Zalo OA API returned error: code={error_code}, message={message}")
                return False
    except urllib.error.HTTPError as e:
        logger.error(f"Zalo OA API HTTP error: {e.code} - {e.read().decode('utf-8')}")
        return False
    except Exception as e:
        logger.error(f"Failed to send Zalo OTP due to unexpected error: {str(e)}")
        return False
