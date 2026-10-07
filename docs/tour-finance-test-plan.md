# Kiểm thử cấu hình hoa hồng CMS

Đường dẫn: /admin/tour-reports. Đăng nhập bằng super_admin hoặc manager.
Cấu hình theo từng tour; thay đổi áp dụng cả booking đã có, không chốt lịch sử hoa hồng.

1. Chọn tour, lưu hoa hồng mặc định 10%, bên mình 5%. Chuyển tour rồi chọn lại và tải lại trang: các giá trị đã lưu phải giữ nguyên.
2. Booking đã xác nhận trị giá 10.000.000đ sau giảm giá, có mã đối tác:
   HH đối tác 1.000.000đ, bên mình 500.000đ. Chi phí 6.000.000đ → lợi nhuận 2.500.000đ.
3. Thêm mức riêng cho mã SALE: 300.000đ/booking. Booking có mã SALE:
   HH đối tác 300.000đ, bên mình 500.000đ, lợi nhuận 3.200.000đ.
   Mã khác dùng mặc định; mã đối tác được chuẩn hóa bỏ khoảng trắng đầu/cuối và viết hoa.
4. Booking trực tiếp không có mã: HH đối tác 0; bên mình vẫn 500.000đ.
5. Kiểm tra tiền cố định/khách và/ngày/khách với người lớn, trẻ em, em bé.
   Checkbox nhóm tuổi chỉ áp dụng hai cách này. Phần trăm tính trên tổng booking.
6. Mức riêng bằng 0 phải bỏ HH cho đối tác tương ứng. Xóa mức riêng rồi lưu phải dùng lại mặc định.
7. Không nhận giá trị âm, NaN, mã rỗng/trùng, % >=100 hoặc tổng % đối tác và bên mình >=100.
8. Đơn pending/cancelled không ghi nhận. Chọn ghi nhận đã thanh toán: đơn chưa paid không ghi nhận.
9. Lọc khoảng ngày, xóa lọc, kiểm tra tổng các dòng và tổng hoa hồng bằng đối tác + bên mình.
10. Kiểm tra quyền: chưa đăng nhập hoặc không có vai trò phù hợp không đọc/lưu được cấu hình.
11. Kiểm tra giao diện mobile, lỗi mạng khi tải/lưu và thông báo lỗi dữ liệu.
12. Giá người lớn đề xuất gồm HH mặc định + bên mình, thuế và lợi nhuận mục tiêu;
    chưa phân bổ chi phí cố định/chuyến, HH/booking hoặc mức riêng từng đối tác.

Đã chạy tự động: 7 kiểm thử công thức/validation trong backend/tests/test_tour_finance.py.
Các bước trình duyệt và lưu vào cơ sở dữ liệu thực ở trên cần thực hiện trên môi trường triển khai bản mới.

## Test theo luồng: lịch khởi hành → booking → báo cáo

Các ca dưới đây **chưa chạy thủ công**. Thực hiện sau khi triển khai bản mới, dùng tour và booking riêng cho kiểm thử. Ghi Pass/Fail, mã lịch/booking, kết quả thực tế và ảnh lỗi cho từng ca.

### Chuẩn bị

- Tài khoản quản trị có quyền quản lý lịch và báo cáo.
- Tour test giá người lớn 5.000.000đ, không phụ thu/giảm giá.
- Ngày D trong tương lai, chưa có lịch/booking của tour test.
- Mã đối tác hợp lệ và được phép bán tour (ví dụ SALE nếu đã đăng ký).
- Booking mẫu: 2 người lớn, tổng tiền 10.000.000đ.
- HH mặc định 10%, bên mình 5%, ghi nhận đơn đã xác nhận.
- Chi phí thực tế của lịch D: 6.000.000đ.
- Đối chiếu riêng dòng tour + ngày D; tổng trang có thể gồm tour khác.

### UI-01 — Ô ngày, sức chứa và lịch

1. Mở /admin/tours/schedules và /admin/tour-reports.
2. Kiểm tra Ngày khởi hành, Từ ngày, Đến ngày và Sức chứa.
3. Tab qua các trường; nhập rồi xóa sức chứa.
4. Mở lịch, chuyển tháng, chọn ngày; nhập dd/mm/yyyy rồi rời ô.
5. Thử desktop 1440px, tablet 768px, điện thoại 390px; giao diện sáng/tối nếu có.

Kỳ vọng: các ô/nút cao 48px; nhãn phía trên, viền và khoảng cách đồng bộ. Sức chứa có đơn vị khách, xóa được về trống. Focus rõ, form không tràn ngang. Lịch bật ra giữ nguyên bố cục và thao tác; ngày đã chọn hiển thị đúng dd/mm/yyyy. Form xuống hàng trên màn hình nhỏ; bảng rộng được cuộn trong vùng bảng.

### SCH-01 — Tạo và sửa lịch

1. Chọn tour test, ngày D, sức chứa 10, chi phí 6.000.000đ, Đang mở.
2. Tạo lịch, ghi mã lịch và tải lại trang.
3. Kiểm tra ngày D, sức chứa 10, đã đặt 0, còn lại 10.
4. Sửa sức chứa thành 12, lưu rồi tải lại.
5. Sửa thành 15 nhưng bấm Hủy.

Kỳ vọng: bước 4 lưu 12 và còn 12 chỗ; bước 5 không lưu 15, form về chế độ tạo mới.

### BOOK-01 — Đặt chỗ rồi xác nhận

1. Với lịch D sức chứa 12, tạo booking 2 người lớn có mã đối tác hợp lệ qua luồng đặt tour.
2. Kiểm tra tổng tiền 10.000.000đ; lịch D đã đặt 2, còn lại 10.
3. Xem báo cáo khi booking còn chờ xác nhận.
4. Xác nhận booking rồi tải lại báo cáo ngày D.

Kỳ vọng: đơn chờ xác nhận đã giữ chỗ nhưng chưa tạo doanh thu/HH. Sau xác nhận: doanh thu 10.000.000đ, chi phí 6.000.000đ, HH đối tác 1.000.000đ, HH bên mình 500.000đ, tổng HH 1.500.000đ, lợi nhuận 2.500.000đ. Chi phí thực tế vẫn có thể xuất hiện trước khi có doanh thu.

### COM-01 — Mức riêng theo đối tác

Dùng booking BOOK-01, không tạo thêm booking.

1. Thêm mức riêng cho đúng mã đối tác: 300.000đ/booking; lưu.
2. Chọn tour khác rồi chọn lại; tải lại trang và xem báo cáo D.
3. Đổi mức riêng thành 100.000đ/khách rồi lưu.
4. Đổi mức riêng thành 0 rồi lưu.
5. Xóa mức riêng rồi lưu.

Kỳ vọng: cấu hình không mất khi chuyển tour/tải lại. Bước 2 HH đối tác 300.000đ, lợi nhuận 3.200.000đ. Bước 3 HH đối tác 200.000đ, lợi nhuận 3.300.000đ. Bước 4 HH đối tác 0, lợi nhuận 3.500.000đ. Bước 5 trở về mặc định 10%, lợi nhuận 2.500.000đ. HH bên mình luôn 500.000đ.

### COM-02 — Khách trực tiếp, tiền cố định bên mình

1. Tạo lịch D2 riêng: sức chứa 10, chi phí thực tế 6.000.000đ.
2. Đặt và xác nhận booking 2 người lớn, 10.000.000đ, không có mã đối tác.
3. Xem dòng D2 khi HH bên mình là 5%.
4. Đổi HH bên mình thành 200.000đ/booking, lưu và xem lại.
5. Khôi phục HH bên mình 5% để tiếp tục các ca khác.

Kỳ vọng: bước 3 HH đối tác 0, HH bên mình 500.000đ, lợi nhuận 3.500.000đ. Bước 4 HH bên mình 200.000đ, lợi nhuận 3.800.000đ. Thay đổi ảnh hưởng cả dòng D vì cấu hình áp dụng toàn tour, kể cả booking cũ.

### BOOK-02 — Thanh toán, hủy và trả chỗ

1. Với booking D đã xác nhận nhưng chưa thanh toán, đổi ghi nhận doanh thu sang “Đơn đã xác nhận và thanh toán”.
2. Kiểm tra dòng D, sau đó đánh dấu booking đã thanh toán qua luồng quản trị.
3. Xem lại báo cáo; hủy booking D rồi tải lại lịch/báo cáo.

Kỳ vọng: bước 1 chưa ghi nhận doanh thu/HH booking chưa thanh toán. Sau thanh toán có doanh thu/HH đúng cấu hình. Sau hủy không còn doanh thu/HH booking đó và trả lại 2 chỗ. Chi phí lịch vẫn 6.000.000đ; lợi nhuận có thể âm khi không có doanh thu.

### REP-01 — Lọc ngày và tổng báo cáo

1. Nhập Từ ngày = D, Đến ngày = D; bấm Lọc báo cáo.
2. Đổi khoảng bao gồm D và D2; đối chiếu tổng từng cột.
3. Xóa lọc; sau đó thử Từ ngày sau Đến ngày.
4. Chọn khoảng không có dữ liệu.

Kỳ vọng: lọc theo ngày khởi hành, gồm cả ngày biên. Tổng bằng tổng các dòng. Xóa lọc xóa cả hai ô và trả về toàn khoảng. Khoảng ngược báo lỗi; không coi dữ liệu cũ còn hiển thị là kết quả khoảng sai. Khoảng trống có thông báo, không lỗi trang.

### VAL-01 — Dữ liệu sai và giới hạn chỗ

| Thao tác | Kỳ vọng |
| --- | --- |
| Chưa chọn tour/ngày/sức chứa rồi tạo lịch | Không tạo, hướng dẫn nhập |
| Sức chứa 0, -1, 1.5, 5001 | Không gửi được form |
| Tạo trùng tour/ngày D | Báo đã tồn tại, không thêm dòng |
| Còn 1 chỗ nhưng đặt 2 khách | Từ chối, không thay đổi số chỗ |
| Khóa lịch rồi đặt khách mới | Từ chối nhận khách |
| HH âm; % >=100; tổng % hai bên >=100 | Không lưu, báo lỗi |
| Hai mức riêng cùng mã, khác hoa/thường hoặc khoảng trắng đầu/cuối | Không lưu mã trùng |
| Mất mạng khi lưu cấu hình | Báo thất bại; tải lại vẫn là cấu hình đã lưu trước đó |

### GUARD-01 — Các ca bảo vệ cần xác minh thêm

Đây là tiêu chí nghiệp vụ cần kiểm tra, không phải chức năng đã được xác nhận bởi thay đổi giao diện:

- Giảm sức chứa xuống dưới số khách đã đặt: cần chặn hoặc có quy tắc xử lý rõ.
- Sửa lịch thành tour/ngày đã tồn tại: cần tránh trùng lịch.
- Xóa hoặc đổi ngày lịch đã có booking: cần bảo vệ liên kết booking.
- Tài khoản không đủ quyền: không được sửa lịch hoặc đọc/lưu cấu hình tài chính.
- Bấm Tạo lịch/Lưu liên tiếp khi mạng chậm: không tạo bản ghi trùng.

Nếu thất bại, ghi bug riêng kèm mã lịch/booking; không đánh dấu Pass chỉ vì giao diện hiển thị được.

### Mẫu ghi nhận kết quả

| Ca | Trạng thái | Mã lịch/booking | Thực tế / ảnh lỗi |
| --- | --- | --- | --- |
| UI-01 | Chưa chạy | | |
| SCH-01 | Chưa chạy | | |
| BOOK-01 | Chưa chạy | | |
| COM-01 | Chưa chạy | | |
| COM-02 | Chưa chạy | | |
| BOOK-02 | Chưa chạy | | |
| REP-01 | Chưa chạy | | |
| VAL-01 | Chưa chạy | | |
| GUARD-01 | Chưa chạy | | |
