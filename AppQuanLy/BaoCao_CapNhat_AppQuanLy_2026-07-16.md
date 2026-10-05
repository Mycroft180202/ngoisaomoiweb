# Báo cáo cập nhật AppQuanLy CRM - 16/07/2026

## Phạm vi đã xử lý

Đã triển khai các chỉnh sửa theo nhóm yêu cầu mới về tài liệu nội bộ, HSNS, thông báo, VP Lương Tài - Bắc Ninh, đăng ký họp và quản lý chấm công.

## 1. Tài liệu / HSNS

- Sửa cách mở file upload trên server:
  - File đã upload không còn bị frontend tải toàn bộ thành blob trước khi mở.
  - Link mở file chuyển sang endpoint download/preview có xác thực token, giúp PDF HSNS lớn mở ổn định hơn.
  - Backend trả `Content-Disposition` chuẩn UTF-8 để tên file tiếng Việt ít bị lỗi hơn.
- Đổi nhóm thư mục:
  - `Quy trình nội bộ` được map sang `Văn bản nội bộ`.
  - `Tài liệu chung` cũng được map sang `Văn bản nội bộ`.
  - Thêm thư mục mặc định `Quy trình các Phòng/Ban`.
- Tối ưu UX cây thư mục:
  - Sidebar chỉ hiển thị thư mục cha để tránh rối.
  - Khi bấm thư mục cha, khu vực nội dung hiển thị các thư mục con hoặc file phù hợp.
  - Dữ liệu folder cũ vẫn được giữ, không reset tài liệu.
- Thêm notification cho tài liệu nội bộ:
  - Khi tài liệu thuộc `Văn bản nội bộ`, `Thông báo công ty`, `Quy trình các Phòng/Ban` được duyệt/chia sẻ, hệ thống tạo thông báo cho người thuộc phạm vi được xem.

## 2. Chấm công

- Thêm trường `attendanceRequired` cho user.
- User cũ mặc định vẫn cần chấm công.
- Admin/IT/HR có thể bật/tắt "Bắt buộc chấm công" trong form nhân sự.
- User không cần chấm công:
  - Không bị tạo bản ghi vắng giả trong báo cáo ngày.
  - Không thể check-in/check-out nhầm.
  - Màn hình chấm công hiển thị trạng thái rõ ràng.
- Thêm banner `Văn bản nội bộ mới` trên trang chấm công để nhân sự thấy tài liệu/thông báo mới khi vào chấm công.

## 3. Bảng tin / VP Lương Tài, Bắc Ninh

- Thêm đơn vị `VP Lương Tài, Bắc Ninh` với key `vp_luong_tai`.
- Upsert dữ liệu vào MongoDB production, không reset database.
- Bỏ enum cứng trong model `Announcement` để bảng tin hỗ trợ các đơn vị mới.
- Form Bảng Tin chuyển sang lấy phòng ban/đơn vị động từ API thay vì hard-code.
- Frontend bổ sung tên hiển thị và màu fallback cho `VP Lương Tài, Bắc Ninh`.

## 4. Đăng ký họp

- Thêm model/backend route `MeetingRequest`.
- Thêm API:
  - `GET /api/meetings`
  - `POST /api/meetings`
  - `PATCH /api/meetings/:id/review`
- Validation đã thêm:
  - Bắt buộc tiêu đề.
  - Bắt buộc mục đích.
  - Bắt buộc phòng/ban liên quan.
  - Thời gian kết thúc phải sau thời gian bắt đầu.
  - Một lượt đăng ký không quá 8 giờ.
  - Chặn trùng phòng họp trong cùng khung giờ với lịch pending/approved.
- UI Lịch Vận Hành:
  - Thêm nút `Đăng ký họp`.
  - Form mặc định dùng `Phòng họp T5`.
  - Có lựa chọn `Họp với TGĐ`.
  - Chọn một hoặc nhiều phòng/ban liên quan.
  - Hiển thị danh sách đăng ký họp trong tháng.
  - Manager/director/IT có thể duyệt/từ chối/hủy theo quyền.
- Lịch họp đã duyệt được đưa vào calendar event loại `meeting`.

## 5. Validation / Exception UI

- Các thao tác mới dùng toast/confirm UI thay vì alert/confirm mặc định.
- Bảng Tin đã chuyển xóa thông báo sang Confirm UI.
- Đăng ký họp hiển thị lỗi validation/trùng phòng bằng toast.
- Tài liệu thiếu file/link sẽ báo lỗi UI rõ ràng khi mở.

## 6. Deploy

- Đã build frontend bằng `npm run build`.
- Đã build Docker images:
  - `appquanly-backend:latest`
  - `appquanly-frontend:latest`
- Đã restart:
  - `travelops_backend`
  - `travelops_frontend`
- Không restart/reset MongoDB.

## 7. Kiểm tra sau deploy

- API health:
  - `https://api.newstartour.vn/quanly/api/health` trả `{"status":"OK"}`.
- Container:
  - `travelops_backend` đang chạy.
  - `travelops_frontend` đang chạy.
  - `travelops_mongodb` vẫn đang chạy.
- Frontend:
  - `https://newstartour.vn/quanly/` trả `200 OK`.
  - Bundle mới: `/quanly/assets/index-C03YNZXY.js`.
  - JS trả `Content-Type: application/javascript`.
  - CSS trả `Content-Type: text/css`.
- Backend log sau restart không có lỗi khởi động route/model mới.

## 8. Ghi chú còn cần kiểm thử bằng tài khoản thật

- Login bằng tài khoản director/admin/HR để thử:
  - Tạo/sửa nhân viên và bật/tắt chấm công.
  - Upload/mở file HSNS PDF lớn.
  - Đăng văn bản nội bộ và kiểm tra notification/sidebar/sound.
  - Đăng bảng tin gửi riêng `VP Lương Tài, Bắc Ninh`.
  - Tạo đăng ký họp, duyệt/từ chối, kiểm tra lịch đã duyệt hiển thị trên calendar.

Các mục này cần phiên đăng nhập/tài khoản hợp lệ để kiểm thử browser end-to-end.

## 9. Cập nhật bổ sung sau phản hồi

- Sửa nút xem văn bản/tin tức:
  - Nút `Xem` trong banner Chấm Công mở preview modal ngay trong webapp.
  - Nút `Xem` trong Thư viện tài liệu mở preview modal ngay trong webapp.
  - Không tự tải file khi bấm xem.
  - Nút `Tải xuống` được tách riêng trong modal.
  - PDF/ảnh/text mở trực tiếp bằng viewer nội bộ.
  - Word/Excel được nhúng bằng Office web viewer với URL có token.
- Sửa chuông thông báo:
  - Badge trên icon chuông hiển thị số thông báo chưa đọc hiện có.
  - Số lớn hơn 99 hiển thị `99+`.
- Sửa luồng xét duyệt/xin phép:
  - Đề xuất mới đi đến Trưởng phòng Nhân sự trước.
  - Trưởng phòng Nhân sự có hai lựa chọn:
    - `Tự duyệt`
    - `Cần TGĐ duyệt`
  - Nếu chọn `Cần TGĐ duyệt`, hệ thống thêm bước Tổng giám đốc và gửi notification cho người duyệt tiếp.
  - Nếu chọn `Tự duyệt`, đề xuất được duyệt hoàn tất ở bước HR.

## 10. Kiểm tra bổ sung sau deploy

- `npm run build` frontend pass.
- `node -c server/src/routes/approvals.js` pass.
- Docker build backend/frontend pass.
- Restart `travelops_backend` và `travelops_frontend` thành công.
- API health trả `OK`.
- Bundle production mới:
  - JS: `/quanly/assets/index-p3bBNiBu.js`
  - CSS: `/quanly/assets/index-BfwrsoJO.css`
- JS trả `Content-Type: application/javascript`.
- CSS trả `Content-Type: text/css`.
- Backend log sau restart không có lỗi khởi động.

## 11. Sửa lỗi tính số giờ chấm công khi nhập/sửa thủ công

- Vấn đề:
  - Khi admin/HR sửa lại giờ vào và giờ ra cho nhân viên quên chấm công, UI vẫn hiển thị `0h`.
  - Nguyên nhân là API nhận `workHours: 0` từ form và lưu trực tiếp, không tự tính lại theo `checkIn/checkOut`.
- Đã sửa:
  - `POST /api/attendance/manual` tự tính `workHours/overtimeHours` khi có đủ giờ vào và giờ ra.
  - `PUT /api/attendance/:id` tự tính lại `workHours/overtimeHours` mỗi khi bản ghi có đủ giờ vào và giờ ra.
  - Thêm validation: nếu giờ ra nhỏ hơn hoặc bằng giờ vào, API trả lỗi `Giờ ra phải sau giờ vào`.
- Hiệu chỉnh dữ liệu cũ:
  - Tìm thấy 21 bản ghi đã có giờ vào/giờ ra nhưng `workHours` vẫn bằng `0`.
  - Đã tự động cập nhật 19 bản ghi có khoảng giờ hợp lệ.
  - Bỏ qua 2 bản ghi bất thường vì giờ ra lệch sang ngày khác quá xa, cần quản lý kiểm tra thủ công.
  - Bản ghi ngày `2026-07-20` trong phản hồi người dùng đã được cập nhật từ `0h` thành `8h`.
- Kiểm tra sau deploy:
  - `node -c server/src/routes/attendance.js` pass.
  - Docker build backend pass.
  - Restart `travelops_backend` thành công.
  - API health trả `OK`.
  - Backend log sau restart không có lỗi runtime mới.
