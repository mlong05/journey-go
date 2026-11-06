# Hướng dẫn API Destination

Tài liệu này bao gồm điểm đến, khu vực và chủ đề du lịch.

## Chuẩn bị Swagger

- Swagger UI: http://localhost:8088/swagger-ui/index.html
- OpenAPI JSON: http://localhost:8088/v3/api-docs
- Đăng nhập qua POST /api/v1/auth/login, lấy data.accessToken rồi nhấn Authorize để gán Bearer token.
- Các API đánh dấu ADMIN / CONTENT_MODERATOR / CONTENT_PROVIDER cần token đúng vai trò.
- Response được bọc trong ApiResponse gồm code, message, data và timestamp.

## 1. API điểm đến

| Method | Endpoint | Quyền | Chức năng |
| --- | --- | --- | --- |
| GET | /api/v1/destinations | Công khai | Danh sách điểm đến đã duyệt, phân trang/sắp xếp |
| GET | /api/v1/moderation/destinations/approved | Công khai | Điểm đến đã xuất bản |
| GET | /api/v1/destinations/{id} | Công khai | Chi tiết điểm đến |
| GET | /api/v1/destinations/region/{slug} | Công khai | Điểm đến theo khu vực |
| GET | /api/v1/destinations/theme/{slug} | Công khai | Điểm đến theo chủ đề |
| POST | /api/v1/destinations | ADMIN, CONTENT_MODERATOR, CONTENT_PROVIDER | Tạo điểm đến và tự gửi moderation |
| PUT | /api/v1/destinations/{id} | ADMIN, CONTENT_MODERATOR, CONTENT_PROVIDER | Cập nhật và gửi duyệt lại; Provider chỉ sửa điểm đến của mình |
| GET | /api/v1/destinations/deleted | ADMIN, CONTENT_MODERATOR | Danh sách đã xóa mềm |
| DELETE | /api/v1/destinations/{id} | ADMIN, CONTENT_MODERATOR | Xóa mềm điểm đến và content liên quan |
| PATCH | /api/v1/destinations/{id}/restore | ADMIN, CONTENT_MODERATOR | Khôi phục điểm đến về DRAFT |
| POST | /api/v1/moderation/destinations/{id}/submit | CONTENT_PROVIDER, ADMIN, CONTENT_MODERATOR | Gửi lại điểm đến bị từ chối |
| GET | /api/v1/moderation/destinations/queue | ADMIN, CONTENT_MODERATOR | Hàng chờ kiểm duyệt |
| GET | /api/v1/moderation/destinations/{id}/history | CONTENT_PROVIDER, ADMIN, CONTENT_MODERATOR | Trạng thái, lý do và lịch sử quyết định |
| PATCH | /api/v1/moderation/destinations/{id}/approve | ADMIN, CONTENT_MODERATOR | Duyệt điểm đến |
| PATCH | /api/v1/moderation/destinations/{id}/reject | ADMIN, CONTENT_MODERATOR | Từ chối kèm lý do |

Danh sách hỗ trợ page, size, sort. Ví dụ:

~~~text
GET /api/v1/destinations?page=0&size=10&sort=createdAt,desc
~~~

### Tạo điểm đến

POST /api/v1/destinations

~~~json
{
  "name": "Văn Miếu - Quốc Tử Giám",
  "address": "58 Quốc Tử Giám, Đống Đa, Hà Nội",
  "latitude": 21.0277,
  "longitude": 105.8351,
  "capacity": 500,
  "regionId": 1,
  "themeIds": [1, 2]
}
~~~

Tạo mới sẽ tự gửi vào hàng chờ moderation và có trạng thái PENDING. Lấy data.id từ response để theo dõi lịch sử hoặc xử lý tại moderation.

## 2. Khu vực và chủ đề

| Method | Endpoint | Quyền | Chức năng |
| --- | --- | --- | --- |
| GET | /api/v1/regions | Công khai | Danh sách khu vực |
| GET | /api/v1/regions/{id} | Công khai | Khu vực theo ID |
| GET | /api/v1/regions/slug/{slug} | Công khai | Khu vực theo slug |
| POST, PUT | /api/v1/regions và /api/v1/regions/{id} | ADMIN, CONTENT_MODERATOR | Tạo/cập nhật khu vực |
| GET | /api/v1/regions/deleted | ADMIN, CONTENT_MODERATOR | Khu vực đã xóa |
| DELETE | /api/v1/regions/{id} | ADMIN, CONTENT_MODERATOR | Xóa mềm khu vực |
| PATCH | /api/v1/regions/{id}/restore | ADMIN, CONTENT_MODERATOR | Khôi phục khu vực |
| GET | /api/v1/themes | Công khai | Danh sách chủ đề |
| GET | /api/v1/themes/{id} | Công khai | Chủ đề theo ID |
| GET | /api/v1/themes/slug/{slug} | Công khai | Chủ đề theo slug |
| POST, PUT | /api/v1/themes và /api/v1/themes/{id} | ADMIN, CONTENT_MODERATOR | Tạo/cập nhật chủ đề |
| GET | /api/v1/themes/deleted | ADMIN, CONTENT_MODERATOR | Chủ đề đã xóa |
| DELETE | /api/v1/themes/{id} | ADMIN, CONTENT_MODERATOR | Xóa mềm chủ đề |
| PATCH | /api/v1/themes/{id}/restore | ADMIN, CONTENT_MODERATOR | Khôi phục chủ đề |

Body tạo/cập nhật Region hoặc Theme:

~~~json
{
  "name": "Di sản văn hóa",
  "slug": "di-san-van-hoa"
}
~~~

## Luồng sử dụng

Tạo Region/Theme trước nếu cần → tạo Destination (tự gửi moderation) → Moderator duyệt hoặc từ chối. Cập nhật tự gửi duyệt lại; điểm đến PENDING không thể chỉnh sửa.



## JSON mẫu để kiểm tra từng API

GET và DELETE không nhận JSON request body. Với các API này, hãy chạy URL/path/query trong Swagger; JSON dưới đây là response mẫu. Thay ID/slug bằng dữ liệu có trong database.

### Destination

| API | JSON dùng để test |
| --- | --- |
| GET /api/v1/destinations?page=0&size=10 | Response: {"code":200,"message":"Lấy danh sách điểm đến thành công","data":{"page":0,"size":10,"totalElements":1,"totalPages":1,"first":true,"last":true,"content":[{"id":1,"name":"Văn Miếu - Quốc Tử Giám","address":"Hà Nội","latitude":21.0277,"longitude":105.8351,"capacity":500,"booked":0,"approved":true,"status":"PUBLISHED","deleted":false,"regionId":1,"region":null,"themes":[],"contentCount":1,"experienceCount":0,"createdBy":"Provider","createdAt":"2026-10-01T08:00:00Z","updatedAt":"2026-10-01T08:00:00Z"}]},"timestamp":"2026-10-01T08:00:00Z"} |
| GET /api/v1/moderation/destinations/approved?page=0&size=10 | Dùng JSON response phân trang ở dòng trên; content gồm các destination đã duyệt. |
| GET /api/v1/destinations/1 | Response: {"code":200,"message":"Lấy thông tin điểm đến thành công","data":{"id":1,"name":"Văn Miếu - Quốc Tử Giám","address":"Hà Nội","latitude":21.0277,"longitude":105.8351,"capacity":500,"booked":0,"approved":true,"status":"PUBLISHED","deleted":false,"regionId":1,"region":null,"themes":[],"contentCount":1,"experienceCount":0,"createdBy":"Provider","createdAt":"2026-10-01T08:00:00Z","updatedAt":"2026-10-01T08:00:00Z"},"timestamp":"2026-10-01T08:00:00Z"} |
| GET /api/v1/destinations/region/ha-noi?page=0&size=10 | Dùng JSON response phân trang ở trên; thay slug bằng slug khu vực tồn tại. |
| GET /api/v1/destinations/theme/di-san-van-hoa?page=0&size=10 | Dùng JSON response phân trang ở trên; thay slug bằng slug chủ đề tồn tại. |
| POST /api/v1/destinations | Request: {"name":"Văn Miếu - Quốc Tử Giám","address":"58 Quốc Tử Giám, Đống Đa, Hà Nội","latitude":21.0277,"longitude":105.8351,"capacity":500,"regionId":1,"themeIds":[1,2]} |
| PUT /api/v1/destinations/1 | Gửi cùng JSON request tạo destination; thay ID ở URL. Cập nhật tự gửi lại vào moderation. |
| GET /api/v1/destinations/deleted?page=0&size=10 | Response có cấu trúc phân trang như GET danh sách; content là destination có deleted=true. |
| DELETE /api/v1/destinations/1 | Response: {"code":200,"message":"Xóa điểm đến thành công","timestamp":"2026-10-01T08:00:00Z"} |
| PATCH /api/v1/destinations/1/restore | Body: không cần. Response data là một DestinationResponse với status DRAFT. |

### Region

| API | JSON dùng để test |
| --- | --- |
| GET /api/v1/regions | Response: {"code":200,"message":"Lấy danh sách khu vực thành công","data":[{"id":1,"name":"Hà Nội","slug":"ha-noi","deleted":false,"createdAt":"2026-10-01T08:00:00Z","updatedAt":"2026-10-01T08:00:00Z"}],"timestamp":"2026-10-01T08:00:00Z"} |
| GET /api/v1/regions/1 và GET /api/v1/regions/slug/ha-noi | Response data: {"id":1,"name":"Hà Nội","slug":"ha-noi","deleted":false,"createdAt":"2026-10-01T08:00:00Z","updatedAt":"2026-10-01T08:00:00Z"} |
| POST /api/v1/regions | Request: {"name":"Hà Nội","slug":"ha-noi"} |
| PUT /api/v1/regions/1 | Gửi cùng JSON request tạo Region; thay ID ở URL. |
| GET /api/v1/regions/deleted | Response: {"code":200,"message":"Lấy danh sách khu vực đã xóa thành công","data":[{"id":2,"name":"Khu vực cũ","slug":"khu-vuc-cu","deleted":true,"createdAt":"2026-10-01T08:00:00Z","updatedAt":"2026-10-01T08:00:00Z"}],"timestamp":"2026-10-01T08:00:00Z"} |
| DELETE /api/v1/regions/1 | Response: {"code":200,"message":"Xóa mềm khu vực thành công","timestamp":"2026-10-01T08:00:00Z"} |
| PATCH /api/v1/regions/1/restore | Body: không cần. Response data có cấu trúc RegionResponse. |

### Theme

| API | JSON dùng để test |
| --- | --- |
| GET /api/v1/themes | Response: {"code":200,"message":"Lấy danh sách chủ đề thành công","data":[{"id":1,"name":"Di sản văn hóa","slug":"di-san-van-hoa","deleted":false,"createdAt":"2026-10-01T08:00:00Z","updatedAt":"2026-10-01T08:00:00Z"}],"timestamp":"2026-10-01T08:00:00Z"} |
| GET /api/v1/themes/1 và GET /api/v1/themes/slug/di-san-van-hoa | Response data: {"id":1,"name":"Di sản văn hóa","slug":"di-san-van-hoa","deleted":false,"createdAt":"2026-10-01T08:00:00Z","updatedAt":"2026-10-01T08:00:00Z"} |
| POST /api/v1/themes | Request: {"name":"Di sản văn hóa","slug":"di-san-van-hoa"} |
| PUT /api/v1/themes/1 | Gửi cùng JSON request tạo Theme; thay ID ở URL. |
| GET /api/v1/themes/deleted | Response là danh sách ThemeResponse có deleted=true. |
| DELETE /api/v1/themes/1 | Response: {"code":200,"message":"Xóa mềm chủ đề thành công","timestamp":"2026-10-01T08:00:00Z"} |
| PATCH /api/v1/themes/1/restore | Body: không cần. Response data có cấu trúc ThemeResponse. |

