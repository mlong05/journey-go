# Test flow Cultural Content

Mở Swagger tại `http://localhost:8088/swagger-ui/index.html`, đăng nhập Provider và nhấn **Authorize** với `Bearer <accessToken>`. Cần cấu hình Cloudinary để test upload ảnh.

## Happy case: tạo content và upload ảnh cùng lúc

1. Chọn destination Provider sở hữu và lấy `destinationId`.
2. Gọi `POST /api/v1/destinations/{destinationId}/contents/with-image` với `multipart/form-data`:
   - `content`: JSON object, không gửi `mediaUrl` hoặc `mediaPublicId`.
   - `image`: chọn file ảnh.

JSON cho phần `content`:

~~~json
{
  "title": "Truyền thuyết Hồ Hoàn Kiếm",
  "contentType": "STORY",
  "sequenceOrder": 1,
  "description": "Câu chuyện trao gươm báu của vua Lê Lợi",
  "contentText": "Vua Lê Lợi trả gươm báu cho Rùa Vàng tại Hồ Hoàn Kiếm.",
  "duration": null
}
~~~

Kỳ vọng: HTTP 201, response có `data.id` và `mediaUrl`; content tự vào hàng chờ `PENDING`.
3. Content Moderator/Admin xử lý tại Moderation flow. Sau khi duyệt, xác nhận content xuất hiện ở `GET /api/v1/destinations/{destinationId}/contents` hoặc `GET /api/v1/cultural-contents/approved`.

## Happy case: thay/gỡ ảnh và gửi duyệt lại

- Thay ảnh: `PUT /api/v1/cultural-contents/{id}/with-image`, multipart gồm JSON `content` và file `image` mới. Kỳ vọng content tự gửi lại moderation.
- Gỡ ảnh: `DELETE /api/v1/cultural-contents/{id}/image`. Kỳ vọng `mediaUrl` được gỡ và content được gửi duyệt lại.
- Tạo khi ảnh đã có Cloudinary URL: `POST /api/v1/destinations/{destinationId}/contents/with-image-url` với JSON tương tự nhưng có `mediaUrl` và `mediaPublicId` do Cloudinary cấp.

## Unhappy cases

- Thiếu file `image`, tải file không phải ảnh, hoặc Cloudinary chưa cấu hình: kỳ vọng upload thất bại và content không được tạo.
- JSON content lỗi, thiếu `title`/`contentType`, hoặc `sequenceOrder` âm: kỳ vọng HTTP 400.
- Provider tạo/sửa/xóa content thuộc destination của người khác: kỳ vọng lỗi quyền.
- Sửa hoặc thay/gỡ ảnh khi content đang `PENDING`: kỳ vọng lỗi trạng thái và transaction rollback.
- Gửi `mediaPublicId`/URL không hợp lệ hoặc không thuộc tài khoản Cloudinary hiện tại: kỳ vọng lỗi asset Cloudinary.
- Đọc content chưa duyệt qua API công khai: không được trả về nội dung đó.
