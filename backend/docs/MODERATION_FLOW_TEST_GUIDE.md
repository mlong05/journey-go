# Test flow Moderation

Mở Swagger tại `http://localhost:8088/swagger-ui/index.html`. Dùng token Admin/Moderator để xem queue, approve, reject; Provider chỉ gửi tài nguyên của mình và xem lịch sử của mình.

## Happy case: duyệt

Tạo destination, cultural content hoặc tour trước; các tài nguyên mới tự vào `PENDING`. Moderator/Admin mở queue tương ứng:

- Content: `GET /api/v1/moderation/contents/queue?page=0&size=10`
- Destination: `GET /api/v1/moderation/destinations/queue?page=0&size=10`
- Tour: `GET /api/v1/moderation/tours/queue?page=0&size=10`

Approve theo ID:

- `PATCH /api/v1/moderation/contents/{id}/approve`
- `PATCH /api/v1/moderation/destinations/{id}/approve`
- `PATCH /api/v1/moderation/tours/{id}/approve`

Body có thể bỏ trống hoặc gửi note, ví dụ:

~~~json
{"note":"Thông tin đã được kiểm tra."}
~~~

Kỳ vọng: trạng thái review `APPROVED`, reason và otherReason là `null`; các event được lưu trong history.

## Happy case: từ chối bằng checkbox và gửi lại

Trước khi reject, lấy code hợp lệ từ endpoint theo loại:

- `GET /api/v1/moderation/contents/rejection-reasons`
- `GET /api/v1/moderation/destinations/rejection-reasons`
- `GET /api/v1/moderation/tours/rejection-reasons`

Reject dùng `PATCH /api/v1/moderation/{contents|destinations|tours}/{id}/reject`. Ví dụ body áp dụng cho destination; code phải khớp danh sách endpoint tương ứng:

~~~json
{
  "note": "Vui lòng xác minh lại vị trí.",
  "reason": "INACCURATE_INFORMATION,OTHER",
  "otherReason": "Địa chỉ hiện tại không trùng với bản đồ."
}
~~~

Kỳ vọng: trạng thái `REJECTED`; reason chứa các mã đã chọn và otherReason chứa lý do tự nhập. Provider sửa tài nguyên bằng API cập nhật của module đó; hệ thống tự gửi lại sang `PENDING`. Có thể xem toàn bộ các lần gửi/quyết định tại:

- `GET /api/v1/moderation/contents/{id}/history`
- `GET /api/v1/moderation/destinations/{id}/history`
- `GET /api/v1/moderation/tours/{id}/history`

## Unhappy cases

- Provider gọi queue, danh sách lý do hoặc approve/reject: kỳ vọng HTTP 403.
- Provider xem history tài nguyên không thuộc quyền sở hữu: kỳ vọng bị từ chối quyền.
- Reject thiếu reason, dùng code không hợp lệ, chọn OTHER mà thiếu otherReason, hoặc gửi otherReason không chọn OTHER: kỳ vọng lỗi validation; trạng thái không đổi.
- Submit lần nữa khi tài nguyên còn PENDING hoặc approve/reject tài nguyên đã xử lý: kỳ vọng lỗi trạng thái.
- Gọi history với ID không tồn tại/chưa có review: kỳ vọng lỗi không tìm thấy.

## Test lọc trạng thái

Moderator/Admin có thể lọc queue theo trạng thái:

- `GET /api/v1/moderation/destinations/status/PENDING?page=0&size=10`
- `GET /api/v1/moderation/tours/status/REJECTED?page=0&size=10`

Kỳ vọng response phân trang chỉ gồm review đúng trạng thái. Content hiện dùng endpoint queue cho trạng thái PENDING.
