# Hướng dẫn API Moderation

## Chuẩn bị Swagger

- Swagger UI: http://localhost:8088/swagger-ui/index.html
- Đăng nhập qua POST /api/v1/auth/login, lấy data.accessToken rồi nhấn Authorize.
- Các API quyết định kiểm duyệt và hàng chờ yêu cầu ADMIN hoặc MODERATOR.
- Provider chỉ gửi content/destination của chính mình và xem lịch sử gửi duyệt.
- Response được bọc trong ApiResponse.

## 1. Kiểm duyệt Cultural Content

| Method | Endpoint | Quyền | Chức năng |
| --- | --- | --- | --- |
| POST | /api/v1/moderation/contents/{contentId}/submit | PROVIDER, ADMIN, MODERATOR | Gửi mới hoặc gửi lại content đã bị từ chối |
| GET | /api/v1/moderation/contents/queue | ADMIN, MODERATOR | Hàng chờ content PENDING |
| GET | /api/v1/moderation/contents/rejection-reasons | ADMIN, MODERATOR | Mã và nhãn cho checkbox lý do |
| PATCH | /api/v1/moderation/contents/{contentId}/approve | ADMIN, MODERATOR | Duyệt content; reason và otherReason được đặt null |
| PATCH | /api/v1/moderation/contents/{contentId}/reject | ADMIN, MODERATOR | Từ chối content với lý do |
| GET | /api/v1/moderation/contents/{contentId}/history | PROVIDER, ADMIN, MODERATOR | Trạng thái hiện tại và toàn bộ lịch sử |

Hàng chờ hỗ trợ page, size, sort. Ví dụ:

~~~text
GET /api/v1/moderation/contents/queue?page=0&size=10&sort=submittedAt,desc
~~~

Provider chỉ đọc history của content thuộc điểm đến mình sở hữu.

### Lý do từ chối dạng tickbox

Lấy danh sách mã và nhãn từ GET /api/v1/moderation/contents/rejection-reasons:

| Code | Nhãn |
| --- | --- |
| IMAGE_NOT_RELEVANT | Ảnh không phù hợp với nội dung |
| INACCURATE_INFORMATION | Thông tin chưa chính xác |
| INAPPROPRIATE_CONTENT | Nội dung không phù hợp |
| COPYRIGHT_VIOLATION | Vi phạm bản quyền |
| INCOMPLETE_CONTENT | Nội dung chưa đầy đủ |
| DUPLICATE_CONTENT | Nội dung bị trùng lặp |
| OTHER | Lý do khác |

Body từ chối dùng reason là chuỗi mã phân cách bằng dấu phẩy. Nếu chọn OTHER, otherReason bắt buộc:

~~~json
{
  "note": "Vui lòng thay ảnh rõ hơn.",
  "reason": "OTHER,IMAGE_NOT_RELEVANT",
  "otherReason": "Ảnh bị mờ, không thể nhận diện địa điểm."
}
~~~

Body duyệt có thể bỏ trống hoặc gửi ghi chú:

~~~json
{
  "note": "Nội dung và ảnh phù hợp."
}
~~~

### Gửi lại và xem lịch sử

Mỗi lần gửi, duyệt hoặc từ chối được lưu thành một sự kiện trong history. Content đang REJECTED có thể gửi lại bằng POST .../{contentId}/submit. Content đang PENDING không thể gửi lặp. Sau khi gửi lại, lý do hiện tại được xóa nhưng các quyết định trước vẫn còn trong history.

Luồng:

~~~text
Provider tạo content hoặc gửi lại content REJECTED
  -> content vào trạng thái PENDING
  -> Moderator/Admin xem queue
  -> approve hoặc reject
  -> Provider xem GET /api/v1/moderation/contents/{contentId}/history
~~~

## 2. Kiểm duyệt Destination

| Method | Endpoint | Quyền | Chức năng |
| --- | --- | --- | --- |
| POST | /api/v1/moderation/destinations/{destinationId}/submit | PROVIDER, ADMIN, MODERATOR | Gửi điểm đến vào hàng chờ |
| GET | /api/v1/moderation/destinations/approved | Công khai | Danh sách điểm đến đã được duyệt |
| GET | /api/v1/moderation/destinations/queue | ADMIN, MODERATOR | Hàng chờ destination PENDING |
| GET | /api/v1/moderation/destinations/status/{status} | ADMIN, MODERATOR | Lọc DRAFT, PENDING, APPROVED, REJECTED |
| GET | /api/v1/moderation/destinations/{destinationId}/history | PROVIDER, ADMIN, MODERATOR | Trạng thái và toàn bộ lịch sử |
| GET | /api/v1/moderation/destinations/rejection-reasons | ADMIN, MODERATOR | Mã và nhãn checkbox lý do |
| PATCH | /api/v1/moderation/destinations/{destinationId}/approve | ADMIN, MODERATOR | Duyệt, có thể kèm note |
| PATCH | /api/v1/moderation/destinations/{destinationId}/reject | ADMIN, MODERATOR | Từ chối với reason và otherReason |

Hàng chờ destination hỗ trợ page, size, sort:

~~~text
GET /api/v1/moderation/destinations/queue?page=0&size=10
~~~

Tạo mới và cập nhật Destination tự gửi vào hàng chờ. Điểm đến PENDING không thể chỉnh sửa. Khi bị REJECTED, Provider sửa thông tin; hệ thống lưu lần gửi tiếp theo. Có thể gửi lại bằng endpoint submit. Mỗi lần gửi/duyệt/từ chối được lưu trong history.

Lý do từ chối lấy từ GET /api/v1/moderation/destinations/rejection-reasons. Nếu chọn OTHER thì otherReason bắt buộc:

~~~json
{
  "note": "Vui lòng xác nhận lại địa chỉ.",
  "reason": "INACCURATE_INFORMATION,OTHER",
  "otherReason": "Địa chỉ hiện tại không khớp với bản đồ."
}
~~~

## 3. Kiểm duyệt Tour

| Method | Endpoint | Quyền | Chức năng |
| --- | --- | --- | --- |
| POST | /api/v1/moderation/tours/{tourId}/submit | PROVIDER, ADMIN, MODERATOR | Gửi lại tour bị từ chối |
| GET | /api/v1/moderation/tours/queue | ADMIN, MODERATOR | Hàng chờ tour PENDING |
| GET | /api/v1/moderation/tours/status/{status} | ADMIN, MODERATOR | Lọc DRAFT, PENDING, APPROVED, REJECTED |
| GET | /api/v1/moderation/tours/{tourId}/history | PROVIDER, ADMIN, MODERATOR | Trạng thái và toàn bộ lịch sử |
| GET | /api/v1/moderation/tours/rejection-reasons | ADMIN, MODERATOR | Mã và nhãn checkbox lý do |
| PATCH | /api/v1/moderation/tours/{tourId}/approve | ADMIN, MODERATOR | Duyệt tour, có thể kèm note |
| PATCH | /api/v1/moderation/tours/{tourId}/reject | ADMIN, MODERATOR | Từ chối với reason và otherReason |

Tạo mới/cập nhật tour tự gửi vào hàng chờ. Tour PENDING không thể sửa. Tour bị REJECTED có thể sửa rồi gửi lại; mọi quyết định được lưu trong history.

Body từ chối:

~~~json
{
  "note": "Vui lòng bổ sung lịch trình chi tiết.",
  "reason": "INCOMPLETE_INFORMATION,OTHER",
  "otherReason": "Chưa nêu rõ điểm tập trung của đoàn."
}
~~~

## Quyền và giới hạn

- Chỉ ADMIN/MODERATOR xem queue hoặc quyết định duyệt/từ chối.
- Provider chỉ gửi content/destination thuộc quyền sở hữu của mình.
- Notification email cho Provider chưa được tích hợp.



## JSON mẫu để kiểm tra từng API

GET không có JSON request body. Dùng URL/query trong Swagger và xem JSON response mẫu tương ứng.

### Content moderation

| API | JSON dùng để test |
| --- | --- |
| POST /api/v1/moderation/contents/12/submit | Không có request body. Response là review trạng thái PENDING, history có action SUBMITTED. |
| GET /api/v1/moderation/contents/queue?page=0&size=10 | Response: {"code":200,"message":"Lấy hàng chờ kiểm duyệt thành công","data":{"page":0,"size":10,"totalElements":1,"totalPages":1,"first":true,"last":true,"content":[{"id":3,"contentId":12,"destinationId":5,"destinationName":"Hồ Hoàn Kiếm","title":"Truyền thuyết Hồ Hoàn Kiếm","status":"PENDING","reviewerId":null,"reviewerName":null,"decisionNote":null,"reason":null,"otherReason":null,"submittedAt":"2026-10-01T08:00:00Z","reviewedAt":null,"content":null,"history":[]}]},"timestamp":"2026-10-01T08:00:00Z"} |
| GET /api/v1/moderation/contents/rejection-reasons | Response data: [{"code":"IMAGE_NOT_RELEVANT","label":"Ảnh không phù hợp với nội dung"},{"code":"OTHER","label":"Lý do khác"}]. API trả toàn bộ mã đã liệt kê trong tài liệu. |
| PATCH /api/v1/moderation/contents/12/approve | Request: {"note":"Nội dung và ảnh phù hợp."}. Có thể bỏ body. Response status APPROVED và reason=null. |
| PATCH /api/v1/moderation/contents/12/reject | Request: {"note":"Vui lòng thay ảnh rõ hơn.","reason":"OTHER,IMAGE_NOT_RELEVANT","otherReason":"Ảnh bị mờ, không thể nhận diện địa điểm."}. OTHER yêu cầu otherReason. |
| GET /api/v1/moderation/contents/12/history | Response data là ContentReviewResponse hiện tại, trong history có các sự kiện SUBMITTED, REJECTED/APPROVED và lý do tương ứng. |

### Destination moderation

| API | JSON dùng để test |
| --- | --- |
| POST /api/v1/moderation/destinations/5/submit | Không body; dùng gửi mới hoặc gửi lại khi REJECTED. Tạo/sửa tự gửi duyệt. |
| GET /api/v1/moderation/destinations/queue?page=0&size=10 | Response: {"code":200,"message":"Lấy hàng chờ kiểm duyệt điểm đến thành công","data":{"page":0,"size":10,"totalElements":1,"totalPages":1,"first":true,"last":true,"content":[{"id":5,"name":"Hồ Hoàn Kiếm","address":"Hà Nội","latitude":21.028,"longitude":105.854,"capacity":500,"booked":0,"approved":false,"status":"PENDING","deleted":false,"regionId":1,"region":null,"themes":[],"contentCount":0,"experienceCount":0,"createdBy":"Provider","createdAt":"2026-10-01T08:00:00Z","updatedAt":"2026-10-01T08:00:00Z"}]},"timestamp":"2026-10-01T08:00:00Z"} |
| GET /api/v1/moderation/destinations/status/REJECTED?page=0&size=10 | Response data có cấu trúc phân trang và lịch sử. |
| GET /api/v1/moderation/destinations/5/history | Response gồm status, reason, otherReason và lịch sử SUBMITTED/REJECTED/APPROVED. |
| GET /api/v1/moderation/destinations/rejection-reasons | Response data gồm mã/nhãn checkbox. |
| PATCH /api/v1/moderation/destinations/5/approve | Request: {"note":"Thông tin điểm đến đã xác minh."}. Body có thể bỏ trống. |
| PATCH /api/v1/moderation/destinations/5/reject | Request: {"note":"Vui lòng sửa địa chỉ.","reason":"INACCURATE_INFORMATION,OTHER","otherReason":"Địa chỉ không trùng với bản đồ."}. OTHER yêu cầu otherReason. |

### Tour moderation

| API | JSON dùng để test |
| --- | --- |
| POST /api/v1/moderation/tours/1/submit | Không body; dùng gửi lại tour REJECTED. Tạo/sửa tour tự gửi duyệt. |
| GET /api/v1/moderation/tours/queue?page=0&size=10 | Response data là trang TourReviewResponse, gồm tour, trạng thái và history. |
| GET /api/v1/moderation/tours/rejection-reasons | Response data gồm toàn bộ mã/nhãn checkbox cho lý do từ chối. |
| GET /api/v1/moderation/tours/1/history | Response gồm trạng thái hiện tại, reason, otherReason và lịch sử SUBMITTED/APPROVED/REJECTED. |
| PATCH /api/v1/moderation/tours/1/approve | Request: {"note":"Lịch trình và giá tour phù hợp."}. Có thể bỏ body. |
| PATCH /api/v1/moderation/tours/1/reject | Request: {"note":"Vui lòng bổ sung lịch trình.","reason":"INCOMPLETE_INFORMATION,OTHER","otherReason":"Chưa ghi rõ điểm tập trung."}. OTHER yêu cầu otherReason. |

