"""Chuẩn hóa thông báo lỗi API dành cho người dùng cuối."""

import re
from typing import Any


ERROR_MESSAGES = {
    "Incorrect email or password": "Tên đăng nhập hoặc mật khẩu không chính xác.",
    "Could not validate credentials": "Phiên đăng nhập không hợp lệ hoặc đã hết hạn.",
    "Permission denied": "Bạn không có quyền thực hiện thao tác này.",
    "Unauthorized webhook request": "Yêu cầu webhook không được xác thực.",
    "Email already registered": "Email này đã được đăng ký.",
    "User not found": "Không tìm thấy tài khoản.",
    "Tour not found": "Không tìm thấy tour.",
    "Booking not found": "Không tìm thấy đơn đặt tour.",
    "Payment method not found": "Không tìm thấy phương thức thanh toán.",
    "Payment transaction not found": "Không tìm thấy giao dịch thanh toán.",
    "Transaction already confirmed": "Giao dịch này đã được xác nhận trước đó.",
    "Booking already paid": "Đơn đặt tour này đã được thanh toán.",
    "Cannot cancel completed transaction": "Không thể hủy giao dịch đã hoàn thành.",
    "No active bank account found": "Chưa có tài khoản ngân hàng đang hoạt động.",
    "Country not found": "Không tìm thấy quốc gia.",
    "Country slug already exists": "Đường dẫn quốc gia đã tồn tại.",
    "Province not found": "Không tìm thấy tỉnh/thành phố.",
    "Duration not found": "Không tìm thấy thời lượng tour.",
    "Category not found": "Không tìm thấy danh mục.",
    "Category slug already exists": "Đường dẫn danh mục đã tồn tại.",
    "Tag not found": "Không tìm thấy thẻ.",
    "Tag slug already exists": "Đường dẫn thẻ đã tồn tại.",
    "Guide not found": "Không tìm thấy hướng dẫn viên.",
    "Attraction not found": "Không tìm thấy điểm du lịch.",
    "Review not found": "Không tìm thấy đánh giá.",
    "Discount code not found": "Không tìm thấy mã giảm giá.",
    "Discount code already exists": "Mã giảm giá đã tồn tại.",
    "Quick search keyword not found": "Không tìm thấy từ khóa tìm nhanh.",
    "Menu not found": "Không tìm thấy mục menu.",
    "Slide not found": "Không tìm thấy slide.",
    "Banner not found": "Không tìm thấy banner.",
    "Office not found": "Không tìm thấy văn phòng.",
    "Bank account not found": "Không tìm thấy tài khoản ngân hàng.",
    "Message not found": "Không tìm thấy tin nhắn.",
    "Testimonial not found": "Không tìm thấy phản hồi khách hàng.",
    "Setting not found": "Không tìm thấy cấu hình.",
    "News post not found": "Không tìm thấy bài viết.",
    "News slug already exists": "Đường dẫn bài viết đã tồn tại.",
    "Tour slug already exists": "Đường dẫn tour đã tồn tại.",
    "Tour schedule not found": "Không tìm thấy lịch khởi hành.",
    "Image not found": "Không tìm thấy hình ảnh.",
    "Not Found": "Không tìm thấy đường dẫn yêu cầu.",
    "Method Not Allowed": "Phương thức yêu cầu không được hỗ trợ.",
    "Could not retrieve basic profile from Google": "Không thể lấy thông tin tài khoản cơ bản từ Google.",
}

PREFIX_MESSAGES = {
    "Image upload failed:": "Tải hình ảnh thất bại:",
    "Document upload failed:": "Tải tài liệu thất bại:",
}


def localize_error_detail(detail: Any) -> Any:
    """Giữ cấu trúc lỗi FastAPI nhưng không để lộ thông báo tiếng Anh ra UI."""
    if isinstance(detail, list):
        return [localize_error_detail(item) for item in detail]
    if isinstance(detail, dict):
        result = dict(detail)
        if "msg" in result:
            result["msg"] = localize_error_detail(result["msg"])
        if "detail" in result:
            result["detail"] = localize_error_detail(result["detail"])
        return result
    if not isinstance(detail, str):
        return detail

    message = detail.strip()
    if message in ERROR_MESSAGES:
        return ERROR_MESSAGES[message]
    for prefix, translated_prefix in PREFIX_MESSAGES.items():
        if message.startswith(prefix):
            return message.replace(prefix, translated_prefix, 1)

    validation_messages = {
        "Field required": "Trường này là bắt buộc.",
        "Input should be a valid email address": "Địa chỉ email không hợp lệ.",
        "Input should be a valid integer": "Giá trị phải là số nguyên hợp lệ.",
        "Input should be a valid number": "Giá trị phải là số hợp lệ.",
        "String should have at least": "Nội dung chưa đủ độ dài tối thiểu.",
    }
    for source, translated in validation_messages.items():
        if source.lower() in message.lower():
            return translated

    # Lỗi đã có ký tự tiếng Việt được giữ nguyên. Chuỗi tiếng Anh chưa biết
    # được thay bằng thông báo an toàn và nhất quán, còn lỗi gốc vẫn ở server log.
    if re.search(r"[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]", message, re.I):
        return message
    if re.search(r"\b(the|not|failed|invalid|required|already|cannot|unable|error|found|permission|credentials|request)\b", message, re.I):
        return "Không thể thực hiện yêu cầu. Vui lòng kiểm tra lại thông tin và thử lại."
    return message
