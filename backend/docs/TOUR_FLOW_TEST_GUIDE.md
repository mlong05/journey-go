# Test flow Tour

Mở Swagger tại `http://localhost:8088/swagger-ui/index.html`. Dùng Provider/Admin để tạo tour; dùng Content Moderator/Admin cho moderation.

## Happy case: tạo và duyệt tour

1. Chuẩn bị ít nhất một destination ID hợp lệ.
2. Provider gọi `POST /api/v1/tours`:

~~~json
{
  "title": "Khám phá di sản Hà Nội",
  "tourType": "CULTURAL",
  "durationDays": 2,
  "price": 1500000,
  "startDate": "2026-12-01",
  "endDate": "2026-12-02",
  "destinations": [
    {"destinationId": 1, "sequenceOrder": 1},
    {"destinationId": 2, "sequenceOrder": 2}
  ]
}
~~~

Kỳ vọng: HTTP 201; lấy `data.tourId`; tour tự vào `PENDING`.
3. Content Moderator/Admin mở `GET /api/v1/moderation/tours/queue?page=0&size=10`.
4. Duyệt bằng `PATCH /api/v1/moderation/tours/{tourId}/approve`:

~~~json
{"note":"Giá và lịch trình phù hợp."}
~~~

Kỳ vọng review `APPROVED`, tour `PUBLISHED`, `approved: true`; tour xuất hiện trong `GET /api/v1/tours/published`.

## Happy case: từ chối và gửi lại

Content Moderator/Admin từ chối bằng `PATCH /api/v1/moderation/tours/{tourId}/reject`:

~~~json
{
  "note": "Vui lòng bổ sung lịch trình chi tiết.",
  "reason": "INCOMPLETE_INFORMATION,OTHER",
  "otherReason": "Chưa nêu rõ điểm tập trung của đoàn."
}
~~~

Provider sửa với `PUT /api/v1/tours/{tourId}` bằng JSON tạo tour đã chỉnh. Kỳ vọng tour tự chuyển về `PENDING`; các quyết định cũ vẫn được giữ. Kiểm tra qua `GET /api/v1/moderation/tours/{tourId}/history`.

## Unhappy cases

- `endDate` trước `startDate`: kỳ vọng HTTP 400.
- Thiếu title/tourType/price/ngày, giá không dương, durationDays nhỏ hơn 1, hoặc danh sách destinations rỗng: kỳ vọng lỗi validation.
- Dùng destination ID không tồn tại/đã xóa hoặc sequenceOrder nhỏ hơn 1: kỳ vọng lỗi validation/tài nguyên không tồn tại.
- Tạo tour với title trùng: kỳ vọng `TOUR_EXISTED`.
- Provider sửa tour không thuộc mình hoặc tour đang PENDING: kỳ vọng lỗi quyền/trạng thái; dữ liệu không đổi.
- Reject thiếu reason, mã lý do không có trong `GET /api/v1/moderation/tours/rejection-reasons`, chọn OTHER mà thiếu otherReason, hoặc gửi otherReason khi không chọn OTHER: kỳ vọng lỗi; review vẫn PENDING.
- Submit lần nữa khi tour đang PENDING hoặc approve/reject sau khi đã quyết định: kỳ vọng lỗi trạng thái.
- Tour chưa được duyệt không được xuất hiện trong `GET /api/v1/tours/published`; đọc chi tiết công khai với tour chưa duyệt phải bị từ chối.
