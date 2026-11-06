# Hướng dẫn API Cultural Content

## Chuẩn bị Swagger

- Swagger UI: http://localhost:8088/swagger-ui/index.html
- Đăng nhập qua POST /api/v1/auth/login, lấy data.accessToken rồi nhấn Authorize.
- Các API ghi ADMIN / CONTENT_MODERATOR / CONTENT_PROVIDER cần token đúng vai trò. Provider chỉ thao tác trên content thuộc điểm đến của mình.
- Response được bọc trong ApiResponse gồm code, message, data và timestamp.

## API content

| Method | Endpoint | Quyền | Chức năng |
| --- | --- | --- | --- |
| GET | /api/v1/cultural-contents/approved | Công khai | Tất cả content đã duyệt |
| GET | /api/v1/destinations/{destinationId}/contents | Công khai | Content đã duyệt theo điểm đến |
| GET | /api/v1/cultural-contents/{id} | Công khai | Chi tiết content đã duyệt |
| GET | /api/v1/cultural-contents/{id}/play | Công khai | Tăng playCount và trả content |
| POST | /api/v1/destinations/{destinationId}/contents | ADMIN, CONTENT_MODERATOR, CONTENT_PROVIDER | Tạo bằng JSON |
| POST | /api/v1/destinations/{destinationId}/contents/with-image | ADMIN, CONTENT_MODERATOR, CONTENT_PROVIDER | Tạo content và upload ảnh cùng request |
| POST | /api/v1/destinations/{destinationId}/contents/with-image-url | ADMIN, CONTENT_MODERATOR, CONTENT_PROVIDER | Tạo bằng JSON với ảnh đã có URL |
| PUT | /api/v1/cultural-contents/{id} | ADMIN, CONTENT_MODERATOR, CONTENT_PROVIDER | Cập nhật content |
| PUT | /api/v1/cultural-contents/{id}/with-image | ADMIN, CONTENT_MODERATOR, CONTENT_PROVIDER | Cập nhật content và thay ảnh |
| DELETE | /api/v1/cultural-contents/{id}/image | ADMIN, CONTENT_MODERATOR, CONTENT_PROVIDER | Gỡ ảnh khỏi content |
| DELETE | /api/v1/cultural-contents/{id} | ADMIN, CONTENT_MODERATOR, CONTENT_PROVIDER | Xóa mềm content |
| PATCH | /api/v1/cultural-contents/{id}/restore | ADMIN, CONTENT_MODERATOR, CONTENT_PROVIDER | Khôi phục content |
| GET | /api/v1/destinations/{destinationId}/contents/deleted | ADMIN, CONTENT_MODERATOR, CONTENT_PROVIDER | Content đã xóa theo điểm đến |

## Tạo content bằng JSON

POST /api/v1/destinations/{destinationId}/contents

~~~json
{
  "title": "Truyền thuyết Hồ Hoàn Kiếm",
  "contentType": "IMAGE",
  "sequenceOrder": 1,
  "description": "Câu chuyện trao gươm báu của vua Lê Lợi",
  "contentText": "Vua Lê Lợi trả gươm báu cho Rùa Vàng tại Hồ Hoàn Kiếm.",
  "duration": null
}
~~~

Content mới tự động được gửi kiểm duyệt. mediaUrl và mediaPublicId bị ẩn khỏi schema Swagger request; JSON endpoint vẫn nhận hai trường này khi cần gắn URL ảnh đã upload.

## Tạo content cùng lúc với ảnh

POST /api/v1/destinations/{destinationId}/contents/with-image dùng multipart/form-data:

1. Trường content: JSON content như ví dụ trên.
2. Trường image: chọn file JPG, PNG, WEBP hoặc AVIF.
3. Backend upload file lên Cloudinary, gắn mediaUrl/mediaPublicId rồi tạo content ở trạng thái chờ kiểm duyệt.

Không gửi mediaUrl/mediaPublicId trong phần content khi đang đính kèm file.

## Dùng ảnh Cloudinary đã upload trước

Với POST /api/v1/destinations/{destinationId}/contents/with-image-url, gửi JSON có mediaUrl và mediaPublicId:

~~~json
{
  "title": "Truyền thuyết Hồ Hoàn Kiếm",
  "contentType": "IMAGE",
  "sequenceOrder": 1,
  "description": "Câu chuyện trao gươm báu của vua Lê Lợi",
  "contentText": "Vua Lê Lợi trả gươm báu cho Rùa Vàng tại Hồ Hoàn Kiếm.",
  "mediaUrl": "https://res.cloudinary.com/<cloud-name>/image/upload/<public-id>.jpg",
  "mediaPublicId": "journey-go/cultural-content/destination-5/user-10/<public-id>",
  "duration": null
}
~~~

## Cloudinary

Backend nhận cấu hình qua CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY và CLOUDINARY_API_SECRET. Nếu chưa cấu hình, upload trả lỗi CLOUDINARY_NOT_CONFIGURED.

API xin chữ ký upload: POST /api/v1/media/cloudinary/signature?destinationId={destinationId}. Cần token ADMIN, CONTENT_MODERATOR hoặc PROVIDER; Provider chỉ upload cho điểm đến của mình.

GET content trả mediaUrl, không trả mediaPublicId vì đây là dữ liệu nội bộ.

## Cập nhật và kiểm duyệt

- Cập nhật content đã duyệt hoặc bị từ chối sẽ đưa content về chờ kiểm duyệt.
- Không thể chỉnh sửa content khi đang PENDING.
- Xóa ảnh cũng gửi content vào kiểm duyệt lại.
- Dùng endpoint hàng chờ, duyệt/từ chối và lịch sử được hướng dẫn trong [Moderation API Guide](MODERATION_API_GUIDE.md).



## JSON mẫu để kiểm tra từng API

GET và DELETE không nhận JSON request body; kiểm tra chúng bằng URL/path/query trong Swagger. Các JSON dưới đây là response mẫu cho API đọc/xóa.

| API | JSON dùng để test |
| --- | --- |
| GET /api/v1/cultural-contents/approved | Response: {"code":200,"message":"Lấy toàn bộ nội dung văn hóa đã duyệt thành công","data":[{"id":12,"destinationId":5,"destinationName":"Hồ Hoàn Kiếm","title":"Truyền thuyết Hồ Hoàn Kiếm","contentType":"IMAGE","sequenceOrder":1,"description":"Truyền thuyết","contentText":"Câu chuyện trả gươm","mediaUrl":"https://res.cloudinary.com/demo/image/upload/kiem.jpg","duration":null,"playCount":0,"deleted":false,"createdAt":"2026-10-01T08:00:00Z","updatedAt":"2026-10-01T08:00:00Z"}],"timestamp":"2026-10-01T08:00:00Z"} |
| GET /api/v1/destinations/5/contents | Response data là danh sách CulturalContentResponse như JSON ở trên. |
| GET /api/v1/cultural-contents/12 | Response data là một CulturalContentResponse như phần tử trong JSON ở trên. |
| GET /api/v1/cultural-contents/12/play | Response data có cấu trúc trên; playCount tăng sau khi gọi. |
| POST /api/v1/destinations/5/contents | Request: {"title":"Truyền thuyết Hồ Hoàn Kiếm","contentType":"IMAGE","sequenceOrder":1,"description":"Câu chuyện trao gươm báu","contentText":"Vua Lê Lợi trả gươm cho Rùa Vàng.","duration":null} |
| POST /api/v1/destinations/5/contents/with-image | multipart/form-data: trường content nhận JSON ở dòng POST thường; trường image chọn file JPG/PNG/WEBP/AVIF. Không gửi mediaUrl/mediaPublicId. |
| POST /api/v1/destinations/5/contents/with-image-url | Request: {"title":"Truyền thuyết Hồ Hoàn Kiếm","contentType":"IMAGE","sequenceOrder":1,"description":"Câu chuyện trao gươm báu","contentText":"Vua Lê Lợi trả gươm cho Rùa Vàng.","mediaUrl":"https://res.cloudinary.com/<cloud-name>/image/upload/<public-id>.jpg","mediaPublicId":"journey-go/cultural-content/destination-5/user-10/<public-id>","duration":null} |
| PUT /api/v1/cultural-contents/12 | Gửi JSON tương tự POST JSON, thay các trường bằng nội dung mới. |
| PUT /api/v1/cultural-contents/12/with-image | multipart/form-data: trường content nhận JSON cập nhật; trường image chọn file ảnh mới. |
| DELETE /api/v1/cultural-contents/12/image | Response data là content sau khi gỡ ảnh; mediaUrl sẽ null. |
| DELETE /api/v1/cultural-contents/12 | Response: {"code":200,"message":"Xóa mềm nội dung văn hóa thành công","timestamp":"2026-10-01T08:00:00Z"} |
| PATCH /api/v1/cultural-contents/12/restore | Body không cần. Response data là CulturalContentResponse đã khôi phục. |
| GET /api/v1/destinations/5/contents/deleted | Response data là danh sách CulturalContentResponse có deleted=true. |

CulturalContentResponse không trả mediaPublicId. Content mới sẽ tự gửi vào hàng chờ; luồng duyệt và lý do có trong [Moderation API Guide](MODERATION_API_GUIDE.md).

