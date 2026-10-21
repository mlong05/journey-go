# ĐỢT 1 — TÀI LIỆU THIẾT KẾ ERD & API CONTRACT CHO BACKEND 3
*(Phân hệ: Journey & Gamification)*

---

## 1. SƠ ĐỒ THỰC THỂ LIÊN KẾT (ERD)

```mermaid
erDiagram
    JOURNEYS ||--o{ JOURNEY_DESTINATION_PROGRESS : "gồm nhiều điểm đến"
    JOURNEY_DESTINATION_PROGRESS ||--o{ JOURNEY_TASK_PROGRESS : "gồm nhiều task"
    
    BADGES ||--o{ USER_BADGES : "cấp cho"
    USER_POINTS ||--o{ POINT_TRANSACTIONS : "ghi sổ cái"
    VOUCHERS ||--o{ USER_VOUCHERS : "quy đổi thành"

    JOURNEYS {
        bigint id PK
        bigint user_id "Tourist"
        bigint booking_id "Khóa liên kết Booking"
        bigint tour_id "Khóa liên kết Tour"
        varchar tour_name
        varchar status "NOT_STARTED, IN_PROGRESS, COMPLETED, CANCELLED"
        int current_destination_order
        int total_destinations
        timestamp started_at
        timestamp completed_at
    }

    JOURNEY_DESTINATION_PROGRESS {
        bigint id PK
        bigint journey_id FK
        bigint destination_id "Điểm đến di sản"
        varchar destination_name
        int order_index "Thứ tự ghé thăm"
        bigint experience_id
        varchar status "NOT_STARTED, IN_PROGRESS, COMPLETED, NO_SHOW, SKIPPED"
        boolean checked_in
        timestamp checked_in_at
        boolean badge_awarded
        bigint badge_id
        int tasks_completed
        int total_tasks
    }

    JOURNEY_TASK_PROGRESS {
        bigint id PK
        bigint journey_id FK
        bigint destination_progress_id FK
        bigint task_id
        varchar task_name
        varchar task_type "QUIZ | REAL_WORLD_INTERACTIVE"
        int order_index
        varchar status "NOT_STARTED, IN_PROGRESS, COMPLETED, SKIPPED"
        int points_earned
        int attempts
        text user_answer
        boolean is_correct
    }

    BADGES {
        bigint id PK
        varchar code UK "Mã định danh duy nhất"
        varchar name
        varchar description
        varchar icon_url
        bigint destination_id
        varchar badge_type "DESTINATION_CHECKIN, TOUR_COMPLETION..."
        int bonus_points
        boolean is_active
    }

    USER_BADGES {
        bigint id PK
        bigint user_id
        bigint badge_id FK
        bigint journey_id
        bigint destination_id
        timestamp earned_at
    }

    USER_POINTS {
        bigint id PK
        bigint user_id UK "Mỗi user có 1 ví điểm"
        int current_balance
        int lifetime_earned
        int lifetime_spent
        timestamp updated_at
    }

    POINT_TRANSACTIONS {
        bigint id PK
        bigint user_id
        int amount "+10, +50, -100..."
        varchar transaction_type "EARNED_CHECKIN, EARNED_TASK, REDEEM_VOUCHER..."
        varchar reference_id "Idempotent Key"
        varchar description
        int balance_after
        timestamp created_at
    }

    VOUCHERS {
        bigint id PK
        varchar code UK
        varchar title
        varchar discount_type "PERCENTAGE | FIXED_AMOUNT"
        decimal discount_value
        int points_required "Điểm cần đổi"
        int total_quantity
        int remaining_quantity
        int valid_days
        boolean is_active
    }

    USER_VOUCHERS {
        bigint id PK
        bigint user_id
        bigint voucher_id FK
        varchar user_voucher_code UK
        int points_spent
        varchar status "AVAILABLE | USED | EXPIRED"
        timestamp redeemed_at
        timestamp expiry_date
        timestamp used_at
    }
```

---

## 2. QUY TẮC RÀNG BUỘC TOÀN VẸN & CHỐNG TRÙNG THƯỞNG (IDEMPOTENCY)

1. **Chống nhận Badge trùng**:
   - Bảng `user_badges` có Unique Constraint `uk_user_badge(user_id, badge_id)`.
   - Một du khách dù quét check-in bao nhiêu lần tại 1 điểm thì cũng chỉ nhận huy hiệu của điểm đó một lần duy nhất.
2. **Chống cộng điểm trùng**:
   - Mỗi giao dịch trong `point_transactions` lưu `reference_id` (ví dụ: `TASK_{id}_J_{journeyId}`).
   - Khi cộng điểm, service kiểm tra `existsByUserIdAndReferenceId` trong cùng transaction để đảm bảo an toàn tuyệt đối.
3. **Lưu tiến độ từng bước**:
   - `journey_destination_progress` có Unique Constraint `uk_journey_destination(journey_id, destination_id)`.
   - `journey_task_progress` có Unique Constraint `uk_journey_destination_task(destination_progress_id, task_id)`.
   - Đảm bảo khi du khách làm xong bất kỳ task nào, trạng thái được persist ngay vào DB.

---

## 3. CHI TIẾT API CONTRACT CHO BACKEND 3

### 3.1. Phân hệ Journey (Hành trình)

| Method | Endpoint | Mô tả | Request Body | Response Data |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/journeys` | Bắt đầu hành trình mới từ Booking đã thanh toán | `StartJourneyRequest` | `JourneyResponse` |
| `GET` | `/api/v1/journeys/my` | Lấy danh sách các chuyến đi của du khách hiện tại | Không | `List<JourneyResponse>` |
| `GET` | `/api/v1/journeys/{id}` | Lấy chi tiết tiến độ hành trình (kèm danh sách điểm và task) | Không | `JourneyResponse` |
| `POST` | `/api/v1/journeys/{id}/destinations/{destinationId}/check-in` | Check-in GPS tại điểm đến & nhận Badge | `CheckInJourneyRequest` | `CheckInResultResponse` |
| `POST` | `/api/v1/journeys/{id}/tasks/{taskId}/submit` | Nộp bài Quiz hoặc giải đố GPS Puzzle & cộng Point | `SubmitTaskRequest` | `JourneyTaskProgressResponse` |
| `PATCH`| `/api/v1/journeys/{id}/destinations/{destinationId}/skip` | Bỏ qua điểm đến nếu bị trễ giờ (đánh dấu `SKIPPED`) | Không | `JourneyDestinationProgressResponse` |

### 3.2. Phân hệ Gamification (Huy hiệu, Điểm thưởng, Voucher)

| Method | Endpoint | Mô tả | Request Body | Response Data |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/gamification/badges` | Danh mục toàn bộ huy hiệu trên nền tảng | Không | `List<BadgeResponse>` |
| `GET` | `/api/v1/gamification/badges/my` | Danh sách huy hiệu du khách đã thu thập được | Không | `List<UserBadgeResponse>` |
| `GET` | `/api/v1/gamification/points/my` | Số dư điểm thưởng hiện tại của du khách | Không | `UserPointResponse` |
| `GET` | `/api/v1/gamification/points/history` | Lịch sử biến động điểm thưởng (cộng/tiêu điểm) | Không | `List<PointTransactionResponse>` |
| `GET` | `/api/v1/gamification/vouchers` | Danh sách voucher có thể dùng điểm đổi | Không | `List<VoucherResponse>` |
| `POST` | `/api/v1/gamification/vouchers/{voucherId}/redeem` | Dùng điểm đổi lấy mã Voucher giảm giá | Không (hoặc `voucherId` path) | `UserVoucherResponse` |
| `GET` | `/api/v1/gamification/vouchers/my` | Danh sách mã Voucher của tôi (đang có / đã dùng) | Không | `List<UserVoucherResponse>` |
