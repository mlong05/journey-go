# Hướng dẫn API Tour

## Chuẩn bị Swagger

- Swagger UI: http://localhost:8088/swagger-ui/index.html
- Đăng nhập qua POST /api/v1/auth/login, lấy data.accessToken rồi nhấn Authorize.
- Các API đánh dấu ADMIN / CONTENT_MODERATOR / CONTENT_PROVIDER yêu cầu token đúng vai trò.
- Provider chỉ xem và sửa tour do mình tạo.
- Response được bọc trong ApiResponse.

## Danh sách API

| Method | Endpoint | Quyền | Chức năng |
| --- | --- | --- | --- |
| GET | /api/v1/tours/published | Công khai | Tour đã xuất bản, phân trang |
| GET | /api/v1/tours/{tourId} | Công khai | Chi tiết tour |
| GET | /api/v1/tours | ADMIN, CONTENT_MODERATOR | Tất cả tour, phân trang |
| GET | /api/v1/tours/deleted | ADMIN, CONTENT_MODERATOR | Tour đã xóa mềm |
| GET | /api/v1/tours/my | CONTENT_PROVIDER, ADMIN, CONTENT_MODERATOR | Tour do tài khoản hiện tại tạo |
| POST | /api/v1/tours | ADMIN, CONTENT_PROVIDER | Tạo tour và tự gửi moderation |
| PUT | /api/v1/tours/{tourId} | ADMIN, CONTENT_MODERATOR, CONTENT_PROVIDER | Cập nhật và tự gửi duyệt lại |
| DELETE | /api/v1/tours/{tourId} | ADMIN, CONTENT_MODERATOR | Xóa mềm |
| PATCH | /api/v1/tours/{tourId}/restore | ADMIN, CONTENT_MODERATOR | Khôi phục tour đã xóa |
| GET | /api/v1/moderation/tours/queue | ADMIN, CONTENT_MODERATOR | Hàng chờ kiểm duyệt |
| GET | /api/v1/moderation/tours/status/{status} | ADMIN, CONTENT_MODERATOR | Lọc DRAFT, PENDING, APPROVED, REJECTED |
| GET | /api/v1/moderation/tours/{tourId}/history | CONTENT_PROVIDER, ADMIN, CONTENT_MODERATOR | Lịch sử gửi và quyết định |
| GET | /api/v1/moderation/tours/rejection-reasons | ADMIN, CONTENT_MODERATOR | Mã và nhãn checkbox lý do |
| POST | /api/v1/moderation/tours/{tourId}/submit | CONTENT_PROVIDER, ADMIN, CONTENT_MODERATOR | Gửi lại tour bị từ chối |
| PATCH | /api/v1/moderation/tours/{tourId}/approve | ADMIN, CONTENT_MODERATOR | Duyệt tour |
| PATCH | /api/v1/moderation/tours/{tourId}/reject | ADMIN, CONTENT_MODERATOR | Từ chối với reason, otherReason |

Danh sách hỗ trợ page, size, sort. Ví dụ:

~~~text
GET /api/v1/tours/published?page=0&size=10&sort=createdAt,desc
~~~

## Tạo tour

POST /api/v1/tours. Gửi giá tour (VND), ngày bắt đầu và ngày kết thúc trong request. Ngày kết thúc phải bằng hoặc sau ngày bắt đầu. Tạo mới tự gửi tour vào hàng chờ moderation.

~~~json
{
  "title": "Khám phá di sản Hà Nội",
  "tourType": "CULTURAL",
  "durationDays": 2,
  "price": 1500000,
  "startDate": "2026-12-01",
  "endDate": "2026-12-02",
  "destinations": [
    {
      "destinationId": 1,
      "sequenceOrder": 1
    },
    {
      "destinationId": 2,
      "sequenceOrder": 2
    }
  ]
}
~~~

Mỗi tour cần ít nhất một destination; sequenceOrder bắt đầu từ 1. Ghi lại tourId từ response.

## Cập nhật tour

PUT /api/v1/tours/{tourId} nhận cùng cấu trúc body như lúc tạo. Cập nhật tự gửi tour duyệt lại; tour đang PENDING không thể sửa.

## Gửi duyệt và xử lý

1. Tạo/sửa tour để tự gửi vào hàng chờ; tour bị từ chối có thể gửi lại qua POST /api/v1/moderation/tours/{tourId}/submit.
2. Content Moderator/Admin xem hàng chờ tại GET /api/v1/moderation/tours/queue.
3. Duyệt bằng PATCH /api/v1/moderation/tours/{tourId}/approve.
4. Từ chối bằng PATCH /api/v1/moderation/tours/{tourId}/reject.
5. Provider theo dõi các quyết định và lần gửi tại GET /api/v1/moderation/tours/{tourId}/history.

Body từ chối:

Lấy danh sách lý do từ GET /api/v1/moderation/tours/rejection-reasons. Body từ chối dùng danh sách mã checkbox, phân cách bằng dấu phẩy. Nếu chọn OTHER, otherReason là bắt buộc:

~~~json
{
  "note": "Vui lòng bổ sung thông tin lịch trình.",
  "reason": "INCOMPLETE_INFORMATION,OTHER",
  "otherReason": "Chưa nêu rõ điểm tập trung của đoàn."
}
~~~

## Xóa mềm và khôi phục

- DELETE /api/v1/tours/{tourId} xóa mềm tour.
- GET /api/v1/tours/deleted liệt kê các tour đã xóa.
- PATCH /api/v1/tours/{tourId}/restore khôi phục tour.



## JSON mẫu để kiểm tra từng API

API đọc/xóa không nhận JSON request body. Dùng path/query và kiểm tra response mẫu; các API thay đổi dữ liệu có request mẫu bên dưới.

| API | JSON dùng để test |
| --- | --- |
| GET /api/v1/tours/published?page=0&size=10 | Response: {"code":200,"message":"Lấy danh sách tour đã xuất bản thành công","data":{"page":0,"size":10,"totalElements":1,"totalPages":1,"first":true,"last":true,"content":[{"tourId":1,"title":"Khám phá di sản Hà Nội","tourType":"CULTURAL","price":1500000,"durationDays":2,"startDate":"2026-12-01","endDate":"2026-12-02","approved":true,"status":"PUBLISHED","rejectionReason":null,"deleted":false,"deletedAt":null,"destinationCount":1,"destinations":[{"id":1,"sequenceOrder":1,"destinationId":5,"destinationName":"Văn Miếu","destinationAddress":"Hà Nội"}],"createdBy":"Provider","createdAt":"2026-10-01T08:00:00Z","updatedAt":"2026-10-01T08:00:00Z"}]},"timestamp":"2026-10-01T08:00:00Z"} |
| GET /api/v1/tours/1 | Response data là một TourResponse như phần tử trong JSON ở trên. |
| GET /api/v1/tours?page=0&size=10 | Response data có cấu trúc phân trang như GET published; gồm cả tour chưa xuất bản. |
| GET /api/v1/tours/deleted?page=0&size=10 | Response data có cấu trúc phân trang; các tour có deleted=true. |
| GET /api/v1/tours/my?page=0&size=10 | Response data có cấu trúc phân trang, chỉ gồm tour do user hiện tại tạo. |
| POST /api/v1/tours | Request: `{"title":"Khám phá di sản Hà Nội","tourType":"CULTURAL","durationDays":2,"price":1500000,"startDate":"2026-12-01","endDate":"2026-12-02","destinations":[{"destinationId":5,"sequenceOrder":1}]}` |
| PUT /api/v1/tours/1 | Gửi JSON giống POST /api/v1/tours, thay tourId trên URL và dữ liệu cần cập nhật. |
| GET /api/v1/moderation/tours/queue?page=0&size=10 | Response data là trang TourReviewResponse, gồm tour và history. |
| GET /api/v1/moderation/tours/status/REJECTED?page=0&size=10 | Lọc tour bị từ chối, response có reason và history. |
| GET /api/v1/moderation/tours/rejection-reasons | Response data gồm toàn bộ mã và nhãn checkbox lý do. |
| GET /api/v1/moderation/tours/1/history | Response gồm trạng thái hiện tại, reason, otherReason và các lần SUBMITTED/APPROVED/REJECTED. |
| POST /api/v1/moderation/tours/1/submit | Không có body; gửi lại tour bị từ chối. Tạo/sửa tour tự gửi vào hàng chờ. |
| PATCH /api/v1/moderation/tours/1/approve | Request: {"note":"Lịch trình và giá tour phù hợp."}. Body có thể bỏ trống. |
| PATCH /api/v1/moderation/tours/1/reject | Request: {"note":"Vui lòng bổ sung lịch trình.","reason":"INCOMPLETE_INFORMATION,OTHER","otherReason":"Chưa ghi rõ điểm tập trung."}. OTHER yêu cầu otherReason. |
| DELETE /api/v1/tours/1 | Không có request body. Response: {"code":200,"message":"Xóa tour thành công","timestamp":"2026-10-01T08:00:00Z"} |
| PATCH /api/v1/tours/1/restore | Không có request body. Response data tour được khôi phục. |

