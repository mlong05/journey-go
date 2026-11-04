# Test flow Destination

Mở Swagger tại `http://localhost:8088/swagger-ui/index.html`. Đăng nhập và nhấn **Authorize** với token `Bearer <accessToken>`. Dùng Provider để tạo/sửa destination; dùng Admin/Moderator để xử lý moderation.

## Happy case: tạo và duyệt

1. Nếu cần, tạo Region/Theme trước và lấy ID.
2. Provider gọi `POST /api/v1/destinations`:

~~~json
{
  "name": "Vịnh Hạ Long",
  "address": "Quảng Ninh, Việt Nam",
  "latitude": 20.9101,
  "longitude": 107.1839,
  "capacity": 500,
  "regionId": 1,
  "themeIds": [1, 2]
}
~~~

Kỳ vọng: HTTP 201, lấy `data.id`; destination tự vào `PENDING`.
3. Admin/Moderator gọi `GET /api/v1/moderation/destinations/queue?page=0&size=10` để tìm ID.
4. Duyệt bằng `PATCH /api/v1/moderation/destinations/{id}/approve`:

~~~json
{"note":"Thông tin địa điểm đã xác minh."}
~~~

Kỳ vọng: review `APPROVED`, destination `PUBLISHED`, `approved: true`, `reason: null`.
5. Kiểm tra danh sách công khai qua `GET /api/v1/destinations` hoặc `/api/v1/moderation/destinations/approved`.

## Happy case: từ chối và gửi lại

Admin/Moderator gọi `PATCH /api/v1/moderation/destinations/{id}/reject`:

~~~json
{
  "note": "Vui lòng xác nhận lại vị trí.",
  "reason": "INACCURATE_INFORMATION,OTHER",
  "otherReason": "Địa chỉ không khớp với vị trí ghim trên bản đồ."
}
~~~

Provider sửa qua `PUT /api/v1/destinations/{id}` với body tạo destination đã chỉnh. Kỳ vọng destination tự về `PENDING`. Xem quá trình qua `GET /api/v1/moderation/destinations/{id}/history`; lịch sử từ chối cũ vẫn còn.

## Unhappy cases

- Tạo với tên/địa chỉ hoặc tọa độ đã tồn tại: kỳ vọng lỗi duplicate (`DESTINATION_EXISTED` hoặc `DESTINATION_COORDINATE_EXISTED`).
- Thiếu tên/địa chỉ, tọa độ ngoài khoảng hợp lệ hoặc capacity nhỏ hơn 1: kỳ vọng HTTP 400.
- Provider sửa destination không thuộc mình: kỳ vọng lỗi quyền.
- Sửa destination đang `PENDING`: kỳ vọng lỗi trạng thái và không lưu thay đổi.
- Reject thiếu `reason`, gửi mã không nằm trong `GET /api/v1/moderation/destinations/rejection-reasons`, chọn `OTHER` thiếu `otherReason`, hoặc gửi `otherReason` mà không chọn `OTHER`: kỳ vọng lỗi validation; review vẫn PENDING.
- Gửi submit lần nữa khi đang PENDING hoặc approve/reject sau khi đã có quyết định: kỳ vọng lỗi trạng thái.
