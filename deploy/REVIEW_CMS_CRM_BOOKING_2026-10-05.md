# Review CMS–CRM và luồng đặt tour — 05/10/2026

## Phạm vi và nguyên tắc

- Review source code trong repository, không truy cập CSDL hoặc thay đổi production.
- Giữ luồng nội dung tour CMS → CRM hiện có. Chưa triển khai sửa nội dung tour hai chiều; cần chốt nguồn dữ liệu chính và quy tắc xử lý xung đột.
- Người dùng xác nhận Điều hành thuộc Sale. API CRM duyệt đơn vẫn yêu cầu Giám đốc hoặc Sale, không mở quyền cho phòng ban khác.
- Khách không cần tài khoản để đặt tour. Mã `NST-YYYYMMDD-xxxxxx` dùng để tra cứu cùng email/số điện thoại; không được dùng riêng mã đơn để truy cập dữ liệu khách hàng.
- CMS xác thực giá/chỗ và trạng thái đơn website; CRM gửi yêu cầu duyệt về CMS trước khi lưu trạng thái mới của đơn website.

## Lỗi phát hiện và sửa trong đợt này

| Phần | Vấn đề trước sửa | Thay đổi |
| --- | --- | --- |
| Ảnh tour | Payload chỉ lấy album, bỏ ảnh legacy và thông tin ảnh đại diện; CRM luôn hiển thị placeholder | Gửi ảnh fallback, thumbnail ưu tiên primary → banner → album, metadata ảnh; chuẩn hóa URL tương đối và Drive; hiển thị thumbnail và album trong CRM |
| Dữ liệu tour | Thiếu cấu hình giá, lịch tùy chỉnh/tuần, điểm khởi hành, danh mục/tag/guide; ghi đè người tạo, phụ thu và trạng thái điều hành | Bổ sung snapshot CMS trong CRM và trường liên quan; giữ người tạo/phụ thu/trạng thái điều hành của tour CRM đã tồn tại |
| Lịch trình | CMS nhận `meals`, `overnight` nhưng CRUD không lưu | Lưu hai trường khi tạo/sửa; CRM giữ thông tin nghỉ đêm |
| Tour cũ | Tour thiếu `tour_code` bị CRM từ chối; booking có thể sync trước tour | Sinh mã ổn định từ ID cho tour cũ; đồng bộ tour chưa liên kết trước booking |
| Liên kết tour | Match bằng OR giữa mã và ID có thể ghi đè tour khác | Phát hiện mã tour và ID CMS liên kết với hai tour CRM khác nhau, trả 409 |
| Booking CRM | Mất thông tin em bé, lịch khởi hành, giảm giá và ID CMS | Lưu infants, metadata booking CMS và liên kết lịch; giữ người tạo booking cũ |
| Duyệt trên CRM | Chỉ đổi MongoDB, CMS không biết trạng thái mới | Thêm API callback có key riêng; CMS kiểm tra liên kết, trạng thái kỳ vọng, quy tắc thanh toán/chỗ; dùng chung luồng thông báo và sync với thao tác duyệt CMS |
| Callback lỗi | Có nguy cơ báo thành công chỉ ở một bên | Nếu CMS từ chối/mất kết nối thì không lưu trạng thái mới trên CRM; retry cùng kết quả không gửi email xác nhận trùng |
| Tra cứu khách | Hardcode localhost và chỉ chấp nhận ID số dù trang thành công hiển thị mã NST | Dùng cấu hình API, nhận mã NST hoặc ID legacy, kiểm tra email/phone, giới hạn lượt tra cứu riêng |
| Duyệt trên CMS | Trang Admin booking gọi localhost | Dùng `NEXT_PUBLIC_API_URL` qua helper API chung |
| Giá/ngày đặt | Giá ngày cụ thể bị giá daily ghi đè; server chưa kiểm tra lịch tuần/tùy chỉnh | Giá ngày cụ thể ưu tiên hơn giá mặc định; kiểm tra ngày được mở bán khi có cấu hình lịch |
| Checkout | Cho chọn ngày tự do khi lịch đã đóng; hiển thị giá mặc định khác giá ngày đang chọn; giảm giá không cập nhật khi đổi khách | Không mở nhập ngày tự do nếu đã có lịch cấu hình; giá người lớn theo ngày; tính lại giảm giá từ tổng hiện tại và chỉ gửi mã đã áp dụng |
| Sửa trạng thái | Thiếu khóa khi trả/khôi phục chỗ; PATCH có thể vượt kiểm tra thanh toán của PUT | Khóa booking và schedule khi cập nhật; kiểm tra paid/confirmed tập trung; chặn hạ trạng thái thanh toán đã paid, khôi phục lịch đóng, sai tổng khách và đổi ngày chưa xử lý chuyển chỗ |
| UI giá | Input tài liệu và nút QR/Tải tràn khỏi card, nhãn làm lệch hàng | Grid co giãn, input không vượt ô, tài liệu chiếm một hàng và nút tự xuống hàng |

## Cấu hình bắt buộc trước khi test liên hệ hai hệ thống

CMS backend (`backend/.env`, không commit key thật):

```dotenv
CRM_API_URL=https://<crm-api-host>
CRM_API_KEY=<cùng giá trị WEBSITE_INTEGRATION_KEY của CRM>
CRM_CALLBACK_KEY=<key riêng cho CRM gọi CMS>
BACKEND_URL=https://api.newstartour.vn
FRONTEND_URL=https://newstartour.vn
```

CRM server (`AppQuanLy/server/.env`):

```dotenv
WEBSITE_INTEGRATION_KEY=<cùng giá trị CRM_API_KEY của CMS>
CMS_API_URL=https://api.newstartour.vn
CMS_CALLBACK_KEY=<cùng giá trị CRM_CALLBACK_KEY của CMS>
```

- Dùng secret dài, ngẫu nhiên; hai chiều dùng hai secret khác nhau. Không đặt secret vào frontend hoặc biến `NEXT_PUBLIC_*`.
- `CMS_API_URL` là origin backend CMS, không phải trang Next.js. Endpoint callback: `POST /api/bookings/integrations/crm/status`.
- Đường dẫn outbound mặc định: `/api/integrations/website/tours`, `/api/integrations/website/bookings`.
- Restart/rebuild backend CMS và server CRM sau khi cấu hình. Frontend cần build lại khi thay `NEXT_PUBLIC_API_URL`.
- Đồng bộ lại tour để cập nhật ảnh/snapshot. Đồng bộ lại booking cũ từ CMS để thêm liên kết và trạng thái kỳ vọng; đơn NST cũ thiếu liên kết sẽ bị chặn duyệt trên CRM thay vì duyệt lệch dữ liệu.
- Không tự copy CSDL Postgres sang MongoDB: ID ở hai bên khác nhau; snapshot là dữ liệu đối chiếu CMS, không phải quan hệ MongoDB hay bảng giá CRM có thể chỉnh độc lập.

## Giới hạn và hạng mục cần review tiếp

| Ưu tiên | Hạng mục còn tồn tại | Hướng xử lý |
| --- | --- | --- |
| P0 | Sync vẫn dùng BackgroundTasks, chưa có hàng đợi bền vững, retry tự động hoặc version chống event cũ ghi đè event mới. Callback kiểm tra trạng thái kỳ vọng chưa thay thế được version/outbox | Transactional outbox, worker retry/backoff, version tăng đơn điệu, idempotency theo event; test đảo thứ tự event và restart khi đang sync |
| P0 | CMS commit thành công nhưng CRM ghi MongoDB thất bại vẫn có thể tạm lệch. Hai CSDL không cùng transaction | Đối soát định kỳ, retry idempotent và hiển thị lỗi; không tuyên bố đồng bộ hai chiều đã đảm bảo tuyệt đối |
| P1 | Chưa chốt bên chủ quản nội dung tour. Sửa tour CRM hiện chưa gửi ngược CMS | Chốt CMS-primary hay hai chiều; nếu CMS-primary, khóa trường thuộc CMS trên CRM và giữ trường điều hành riêng |
| P1 | `user_discount_percent`, `group_discount`, `min_group_size`, `accommodation_prices` đã truyền sang CRM nhưng chưa được áp dụng đầy đủ trong checkout/server tính tiền | Chốt quy tắc ưu tiên/cộng dồn, trẻ em/em bé có tính quy mô nhóm không, đăng nhập và chọn hạng phòng; dùng một dịch vụ báo giá server |
| P1 | API cập nhật booking vẫn có trường số khách/tổng tiền. Kiểm tra tổng khách không thay thế báo giá lại khi đổi cơ cấu khách | Luồng sửa đơn riêng có tính lại giá, audit và xác nhận báo giá; không cho sửa tiền tùy ý |
| P1 | Đổi ngày tour chưa có chuyển chỗ/báo giá nguyên tử; đợt này chủ động từ chối đổi ngày qua update thường | Thêm thao tác chuyển lịch có khóa cả hai lịch, kiểm tra chỗ và tính lại tiền |
| P1 | Webhook thanh toán và thao tác nhập chứng từ có luồng cập nhật riêng; chưa đảm bảo mọi thay đổi payment gửi sang CRM | Gom cập nhật qua dịch vụ trạng thái/outbox; test PayOS/Casso, duplicate webhook và hủy đồng thời |
| P1 | Chỉnh TourSchedule trực tiếp chưa tự sync lại tour; booked_seats ở snapshot CRM có thể cũ | Phát event lịch/chỗ từ cùng transaction; đối chiếu CMS thay vì coi snapshot là tồn chỗ thời gian thực |
| P1 | Sync toàn bộ tour chạy tuần tự trong request, dễ vượt timeout proxy khi nhiều tour | Job nền trả job ID, xem tiến độ/lỗi từng tour |
| P1 | Đơn chờ đang giữ chỗ nhưng chưa có TTL tự giải phóng; lịch không có TourSchedule không có giới hạn chỗ tương ứng | Chốt pending có giữ chỗ không và thời hạn; tạo tồn chỗ chuẩn theo lịch |
| P1 | Quyền CMS booking vẫn theo `is_admin`, rộng hơn Sale/Manager; chưa lưu danh tính nhân viên CRM duyệt vào audit CMS | Ma trận quyền, audit actor/source/trước-sau; không tự mở hoặc thu quyền ngoài phạm vi đã xác nhận |
| P1 | Lookup dùng mã + email/phone trả token xem đơn; chưa có OTP, limiter là bộ nhớ theo process | Với dữ liệu nhạy cảm dùng OTP; limiter chia sẻ giữa worker và cấu hình trusted proxy |
| P1 | HTML trong mô tả/lịch trình CMS sang CRM đang hiển thị như text, chưa tối ưu trình bày | Renderer có sanitize, không dùng raw HTML không lọc |
| P2 | CRM lưu snapshot đầy đủ nhưng UI chưa có màn hình xem toàn bộ cấu hình giá/ảnh metadata, không tạo entity guide/category MongoDB | Màn hình đối chiếu trường, mapping riêng nếu nghiệp vụ CRM thực sự dùng entity đó |
| P2 | Trạng thái CRM `completed` chưa có trạng thái tương ứng ở CMS; hoàn tiền cũng chưa có workflow | Định nghĩa state machine chung. Đơn website chưa được chuyển `completed` hoặc hạ `paid` bằng thao tác thường |

## Kiểm chứng trong môi trường hiện tại

- Frontend TypeScript `tsc --noEmit --incremental false`: đạt.
- CSS PostCSS và TSX/JSX parsing: đạt.
- Node `--check` cho service/routes/models đã sửa và Python AST syntax: đạt.
- Smoke checks bằng mock: payload ảnh fallback/primary/Drive/giá tuần; CRUD giá theo ngày, tên lấy từ server, lịch không hợp lệ, hủy/khôi phục chỗ và guards; callback CRM xác nhận/paid/hủy, mất mạng/409/thiếu cấu hình; callback CMS key sai, retry không gửi email trùng, stale status và sai CRM ID.
- Các smoke checks không phải integration test HTTP/Postgres/MongoDB: Python môi trường hiện tại thiếu SQLAlchemy/FastAPI dependencies; CRM chưa có node_modules; chưa có browser test.
- ESLint frontend có lỗi sẵn ở HEAD. So sánh các file sửa theo rule/severity chưa tăng số lỗi; không gọi toàn bộ lint là đạt.

## Checklist test staging trước production

1. Tour legacy chỉ có ảnh `image`; tour có album và primary khác ảnh đầu; ảnh Drive public; ảnh tương đối; verify thứ tự/thumbnail và metadata ở CRM.
2. Sync cùng tour nhiều lần không nhân bản. Đổi mã tour không chiếm tour khác. Tour CRM đang điều hành không mất status, phụ thu, người tạo khi sync lại.
3. Incognito đặt tour → có mã NST và secure link → tra cứu mã NST + email/phone đúng; sai thông tin không trả dữ liệu/token; ID legacy vẫn tra cứu được.
4. So giá custom date, daily, weekly và promo giữa checkout, tiền CMS lưu và tiền CRM. Đổi số khách sau áp mã và sửa mã chưa áp lại không dùng giảm giá cũ.
5. Sale/Điều hành xác nhận trên CRM → CMS confirmed → email khách → tra cứu thấy confirmed. Xác nhận trên CMS → sync CRM confirmed.
6. Hủy từ mỗi bên trả chỗ đúng một lần. Khôi phục hết chỗ/lịch đóng bị chặn. Hai người duyệt trái trạng thái đồng thời phải có 409 và không báo thành công sai.
7. Khóa callback key/mất mạng → CRM giữ trạng thái cũ và báo lỗi. CMS đã cập nhật nhưng CRM save lỗi → retry cùng yêu cầu không gửi email trùng.
8. Paid trước confirmed, hạ paid, hủy paid, completed trên đơn website bị chặn theo giới hạn hiện tại. Test thao tác paid hợp lệ và các webhook riêng trước sử dụng thanh toán thật.
9. Test event cũ đến sau event mới, restart khi đang sync, nhiều booking giành chỗ cuối bằng Postgres/MongoDB thực; đây là tiêu chí chưa đủ để xác nhận production-ready trong đợt này.
10. Kiểm tra UI form giá trên desktop/mobile; tài liệu URL dài với đủ QR/Tải không tràn card.
