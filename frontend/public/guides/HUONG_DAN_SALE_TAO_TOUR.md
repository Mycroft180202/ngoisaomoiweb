# Hướng dẫn Sale tạo và quản lý Tour trên CMS

> Dành cho tài khoản quyền **Sale** tại trang `/admin`.

## 1. Chuẩn bị trước khi tạo Tour

- Tên Tour, loại Tour trong nước/quốc tế, điểm đi và điểm đến.
- Thời lượng, phương tiện, lịch khởi hành và số chỗ tối đa.
- Giá người lớn, trẻ em, em bé; số khách tối thiểu áp dụng giá.
- Hạng khách sạn/phòng và phụ thu nếu Tour có nhiều lựa chọn lưu trú.
- Lịch trình chi tiết từng ngày.
- Giá bao gồm/không bao gồm, ghi chú, thanh toán và hoàn/hủy.
- Ảnh đại diện, album và file chương trình Tour PDF/Word.

## 2. Quy trình tạo Tour

1. Đăng nhập `/admin`, mở **Quản lý Tour → Tour du lịch** và chọn **Thêm Tour**.
2. Tab **Thông tin chính**: nhập tên, chọn đúng loại Tour, điểm đi/đến, thời lượng, danh mục và hướng dẫn viên.
3. Tab **Giá & Lịch trình**: nhập giá người lớn, trẻ em, em bé, số khách tối thiểu; khai báo giá khách sạn/phòng và các ngày khởi hành.
4. Tab **Album & Lịch trình chi tiết**: chọn ảnh đại diện, thêm album, lịch trình từng ngày và tải tài liệu chương trình.
5. Điền đủ giá bao gồm/không bao gồm, hoàn-hủy, điều kiện thanh toán và lưu ý quan trọng.
6. Kiểm tra lại; để **Kích hoạt = Tắt** nếu chưa được duyệt, rồi chọn **Lưu lại**.

### Lưu ý khi nhập

- Tour trong nước không được chọn điểm đến nước ngoài và ngược lại.
- Giá người lớn là giá cơ sở bắt buộc. Có thể dán `3.500.000`; giao diện sẽ chuẩn hóa và định dạng số.
- Tag dùng để phân loại/nhấn mạnh. Tag **Khuyến mãi** không tự tạo giảm giá.
- Chỉ bật **Khuyến mãi** khi có chính sách hoặc giá ưu đãi thật.
- File PDF nên được xuất với font tiếng Việt được nhúng.

## 3. Checklist trước khi công khai

- Tên, slug và tuyến không trùng hoặc sai chính tả.
- Giá, ngày khởi hành, số chỗ và hạng phòng khớp chương trình.
- Ảnh và PDF mở đúng trên máy tính lẫn điện thoại.
- Điều khoản, liên hệ và lưu ý màu đỏ đã đầy đủ.
- Chỉ bật **Kích hoạt** sau khi nội dung đã được kiểm tra.

## 4. Sau khi khách đặt Tour

1. Mở **Khách hàng đặt Tour** và kiểm tra Tour, ngày đi, số người, liên hệ.
2. Liên hệ khách để xác nhận dịch vụ và số tiền thực tế.
3. Cập nhật trạng thái đơn theo đúng tiến độ.
4. Chỉ đánh dấu **Đã thanh toán** khi kế toán/ngân hàng xác nhận tiền.
5. Hệ thống tự đồng bộ Tour/booking sang CRM; Sale không chạy đồng bộ toàn bộ thủ công.

## 5. Giới hạn quyền Sale

### Được phép

- Xem, tạo, sửa và tạm tắt hiển thị Tour.
- Tải ảnh/tài liệu và quản lý ảnh của Tour đang biên tập.
- Xem dữ liệu nền để chọn khi tạo Tour.
- Xử lý booking, liên hệ khách hàng và xem giao dịch để đối soát.

### Không được phép

- Xóa vĩnh viễn Tour; cần tắt hiển thị và báo Manager.
- Tạo/sửa/xóa quốc gia, tỉnh thành, danh mục, tag, mã giảm giá hoặc hướng dẫn viên.
- Đồng bộ toàn bộ Tour thủ công hoặc đổi cấu hình CRM.
- Quản lý tài khoản, phân quyền, giao diện, quảng cáo, menu, bảo trì và cấu hình hệ thống.
- Thay đổi phương thức thanh toán, ngân hàng, API key hoặc xác nhận tiền khi chưa có chứng từ.

## 6. Xử lý lỗi thường gặp

- **Không chọn được điểm đến:** kiểm tra loại Tour trong nước/quốc tế.
- **Ảnh/PDF không hiện:** kiểm tra định dạng, kích thước và tải lại.
- **Tour chưa hiện ngoài website:** kiểm tra Kích hoạt, lịch khởi hành và dữ liệu bắt buộc.
- **Cần xóa Tour hoặc sửa dữ liệu nền:** liên hệ Manager/Super Admin, không tạo bản ghi trùng.

## 7. An toàn dữ liệu

- Không dùng chung tài khoản Sale.
- Không đưa API key, mật khẩu hoặc thông tin thẻ vào nội dung Tour.
- Không đánh dấu đã thanh toán chỉ dựa vào ảnh chụp khách gửi.
- Nếu phát hiện sai giá/lịch trình đã công khai, tắt Tour trước rồi báo quản lý.
