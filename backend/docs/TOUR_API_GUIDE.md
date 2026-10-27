# Hướng dẫn API Tour

## Chuẩn bị Swagger

- Swagger UI: http://localhost:8088/swagger-ui/index.html
- Đăng nhập qua POST /api/v1/auth/login, lấy data.accessToken rồi nhấn Authorize.
- Các API đánh dấu ADMIN / MODERATOR / PROVIDER yêu cầu token đúng vai trò.
- Provider chỉ xem và sửa tour do mình tạo.
- Response được bọc trong ApiResponse.

## Danh sách API

| Method | Endpoint | Quyền | Chức năng |
| --- | --- | --- | --- |
| GET | /api/v1/tours/published | Công khai | Tour đã xuất bản, phân trang |
| GET | /api/v1/tours/{tourId} | Công khai | Chi tiết tour |
| GET | /api/v1/tours | ADMIN, MODERATOR | Tất cả tour, phân trang |
| GET | /api/v1/tours/status/{status} | ADMIN, MODERATOR | Lọc DRAFT, PENDING, PUBLISHED, REJECTED |
| GET | /api/v1/tours/deleted | ADMIN, MODERATOR | Tour đã xóa mềm |
| GET | /api/v1/tours/my | PROVIDER, ADMIN, MODERATOR | Tour do tài khoản hiện tại tạo |
| POST | /api/v1/tours | ADMIN, PROVIDER | Tạo tour ở DRAFT |
| PUT | /api/v1/tours/{tourId} | ADMIN, MODERATOR, PROVIDER | Cập nhật; Provider chỉ sửa tour của mình |
| PATCH | /api/v1/tours/{tourId}/submit | ADMIN, MODERATOR, PROVIDER | Gửi duyệt |
| PATCH | /api/v1/tours/{tourId}/publish | ADMIN, MODERATOR | Duyệt và xuất bản |
| PATCH | /api/v1/tours/{tourId}/reject | ADMIN, MODERATOR | Từ chối kèm lý do |
| DELETE | /api/v1/tours/{tourId} | ADMIN, MODERATOR | Xóa mềm |
| PATCH | /api/v1/tours/{tourId}/restore | ADMIN, MODERATOR | Khôi phục tour đã xóa |

Danh sách hỗ trợ page, size, sort. Ví dụ:

~~~text
GET /api/v1/tours/published?page=0&size=10&sort=createdAt,desc
~~~

## Tạo tour

POST /api/v1/tours. Giá tour được tính tự động từ Experience của các điểm đến, không gửi giá trong request.

~~~json
{
  "title": "Khám phá di sản Hà Nội",
  "tourType": "CULTURAL",
  "durationDays": 2,
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

PUT /api/v1/tours/{tourId} nhận cùng cấu trúc body như lúc tạo. Cập nhật reset status về DRAFT và cần gửi duyệt lại.

## Gửi duyệt và xử lý

1. Gửi duyệt bằng PATCH /api/v1/tours/{tourId}/submit.
2. Moderator/Admin kiểm tra tour ở GET /api/v1/tours/status/PENDING.
3. Duyệt bằng PATCH /api/v1/tours/{tourId}/publish.
4. Hoặc từ chối bằng PATCH /api/v1/tours/{tourId}/reject.

Body từ chối:

~~~json
{
  "reason": "Thiếu thông tin chi tiết về trải nghiệm tại điểm đến."
}
~~~

Lý do bắt buộc, từ 10 đến 500 ký tự.

## Xóa mềm và khôi phục

- DELETE /api/v1/tours/{tourId} xóa mềm tour.
- GET /api/v1/tours/deleted liệt kê các tour đã xóa.
- PATCH /api/v1/tours/{tourId}/restore khôi phục tour.



## JSON mẫu để kiểm tra từng API

API đọc/xóa không nhận JSON request body. Dùng path/query và kiểm tra response mẫu; các API thay đổi dữ liệu có request mẫu bên dưới.

| API | JSON dùng để test |
| --- | --- |
| GET /api/v1/tours/published?page=0&size=10 | Response: {"code":200,"message":"Lấy danh sách tour đã xuất bản thành công","data":{"page":0,"size":10,"totalElements":1,"totalPages":1,"first":true,"last":true,"content":[{"tourId":1,"title":"Khám phá di sản Hà Nội","tourType":"CULTURAL","price":500000,"durationDays":2,"approved":true,"status":"PUBLISHED","rejectionReason":null,"deleted":false,"deletedAt":null,"destinationCount":1,"destinations":[{"id":1,"sequenceOrder":1,"destinationId":5,"destinationName":"Văn Miếu","destinationAddress":"Hà Nội"}],"createdBy":"Provider","createdAt":"2026-10-01T08:00:00Z","updatedAt":"2026-10-01T08:00:00Z"}]},"timestamp":"2026-10-01T08:00:00Z"} |
| GET /api/v1/tours/1 | Response data là một TourResponse như phần tử trong JSON ở trên. |
| GET /api/v1/tours?page=0&size=10 | Response data có cấu trúc phân trang như GET published; gồm cả tour chưa xuất bản. |
| GET /api/v1/tours/status/PENDING?page=0&size=10 | Response data có cấu trúc phân trang và chỉ gồm status PENDING. |
| GET /api/v1/tours/deleted?page=0&size=10 | Response data có cấu trúc phân trang; các tour có deleted=true. |
| GET /api/v1/tours/my?page=0&size=10 | Response data có cấu trúc phân trang, chỉ gồm tour do user hiện tại tạo. |
| POST /api/v1/tours | Request: {"title":"Khám phá di sản Hà Nội","tourType":"CULTURAL","durationDays":2,"destinations":[{"destinationId":5,"sequenceOrder":1}]} |
| PUT /api/v1/tours/1 | Gửi JSON giống POST /api/v1/tours, thay tourId trên URL và dữ liệu cần cập nhật. |
| PATCH /api/v1/tours/1/submit | Không có request body. Response data tour có status PENDING. |
| PATCH /api/v1/tours/1/publish | Không có request body. Response data tour có status PUBLISHED, approved=true. |
| PATCH /api/v1/tours/1/reject | Request: {"reason":"Thiếu thông tin chi tiết về trải nghiệm tại điểm đến."}. Reason phải từ 10 đến 500 ký tự. |
| DELETE /api/v1/tours/1 | Không có request body. Response: {"code":200,"message":"Xóa tour thành công","timestamp":"2026-10-01T08:00:00Z"} |
| PATCH /api/v1/tours/1/restore | Không có request body. Response data tour được khôi phục. |

