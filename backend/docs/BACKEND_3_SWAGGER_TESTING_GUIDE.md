# Hướng Dẫn Kiểm Thử Swagger & Tích Hợp API Backend 3
## Phân Hệ: Hành Trình (Journey), Gamification & Cộng Đồng (Community)

> **Dành cho:**
> - **Frontend Developers (Web & Mobile App):** Hướng dẫn flow chạy thử trên Swagger UI, cấu trúc request/response, kịch bản tương tác thực tế từ A - Z.
> - **Backend 1 (Tour Team):** Đặc tả hợp đồng dữ liệu Tour/Destination/Task, cách tích hợp `TourInfoProvider` thật.
> - **Backend 2 (Booking & Payment Team):** Quy trình chuyển giao từ Booking sang Journey, quy tắc Voucher từ Gamification.

---

## 1. Thông Tin Môi Trường & Chuẩn Bị Tài Khoản

- **Base URL Backend:** `http://localhost:8088`
- **Swagger UI URL:** [http://localhost:8088/swagger-ui/index.html](http://localhost:8088/swagger-ui/index.html) (hoặc `http://localhost:8088/swagger-ui.html`)
- **OpenAPI JSON Spec:** `http://localhost:8088/v3/api-docs`

### 1.1. Danh Sách Tài Khoản Mẫu Để Test (Đã Tạo Sẵn Trong Seed Data)
Tất cả các tài khoản dưới đây đều có mật khẩu mặc định là: `Password123@`

| Vai trò (Role) | Email | Mật khẩu | Mục đích sử dụng |
| :--- | :--- | :--- | :--- |
| **USER (Du khách)** | `tourist@journeygo.com` | `Password123@` | Bắt đầu hành trình, Check-in GPS, Trả lời Quiz/Puzzle, Đổi voucher, Đăng bài viết cộng đồng |
| **MODERATOR (Kiểm duyệt)** | `moderator@journeygo.com` | `Password123@` | Duyệt bài viết du khách (`APPROVE`/`REJECT`), Xử lý báo cáo vi phạm nội dung |
| **ADMIN (Quản trị viên)** | `admin@journeygo.com` | `Password123@` | Toàn quyền quản trị hệ thống, quản lý điểm đến, master data |

### 1.2. Cách Đăng Nhập & Gán Token Trên Swagger UI
1. Trên Swagger UI, tìm nhóm **Authentication** -> chọn `POST /api/v1/auth/login`.
2. Nhấn **Try it out**, điền thông tin đăng nhập:
   ```json
   {
     "email": "tourist@journeygo.com",
     "password": "Password123@"
   }
   ```
3. Nhấn **Execute**. Trong response trả về, copy chuỗi `accessToken` (trong `data.accessToken`).
4. Cuộn lên đầu trang Swagger, nhấn vào nút **Authorize** (ổ khóa màu xanh lá).
5. Dán token vào ô `Bearer Authentication (http, Bearer)` và nhấn **Authorize** -> **Close**.
> 💡 *Mẹo:* Khi cần test duyệt bài viết của Moderator, bạn chỉ cần lặp lại bước trên với email `moderator@journeygo.com` để đổi token.

---

## 2. Tổng Hợp Các Nhóm API Mới Của Backend 3

### 2.1. Phân Hệ Hành Trình (Journey Execution) - Tag: `Journey Execution`
| Phương thức | Endpoint | Yêu cầu Auth | Mô tả chức năng |
| :--- | :--- | :---: | :--- |
| `POST` | `/api/v1/journeys` | User | Bắt đầu hành trình từ `bookingId` và `tourId` |
| `GET` | `/api/v1/journeys/my` | User | Danh sách tất cả hành trình của du khách hiện tại |
| `GET` | `/api/v1/journeys/{id}` | User | Chi tiết tiến độ hành trình (danh sách điểm đến & nhiệm vụ) |
| `POST` | `/api/v1/journeys/{id}/destinations/{destinationId}/check-in` | User | Check-in GPS tại điểm đến (nhận Huy hiệu nếu có) |
| `GET` | `/api/v1/journeys/{id}/tasks/{taskId}/puzzle-clue` | User | Lấy manh mối câu đố GPS Puzzle thực tế |
| `GET` | `/api/v1/journeys/{id}/tasks/{taskId}/questions` | User | Xem câu hỏi của nhiệm vụ (nhiệm vụ cần vị trí chỉ mở khi tới trạm hoặc quét QR) |
| `POST` | `/api/v1/journeys/{id}/tasks/{taskId}/submit` | User | Nộp bài cả nhiệm vụ: đúng hết thì nhận trọn điểm nhiệm vụ |
| `PATCH` | `/api/v1/journeys/{id}/destinations/{destinationId}/skip` | User | Bỏ qua điểm đến nếu bị trễ giờ |

### 2.2. Phân Hệ Gamification (Điểm Thưởng, Huy Hiệu, Voucher) - Tag: `Gamification`
| Phương thức | Endpoint | Yêu cầu Auth | Mô tả chức năng |
| :--- | :--- | :---: | :--- |
| `GET` | `/api/v1/gamification/badges` | **Public** | Danh mục toàn bộ huy hiệu trên nền tảng |
| `GET` | `/api/v1/gamification/badges/my` | User | Danh sách huy hiệu du khách đã thu thập được |
| `GET` | `/api/v1/gamification/points/my` | User | Số dư điểm hiện tại & lịch sử biến động điểm (`PointTransaction`) |
| `GET` | `/api/v1/gamification/vouchers` | **Public** | Danh mục voucher ưu đãi có thể quy đổi bằng điểm |
| `GET` | `/api/v1/gamification/vouchers/my` | User | Ví voucher cá nhân của du khách (kèm mã code, HSD) |
| `POST` | `/api/v1/gamification/vouchers/{id}/redeem` | User | Dùng điểm tích lũy để đổi voucher |

### 2.3. Phân Hệ Cộng Đồng (Community & Social Sharing) - Tag: `Community & Feed`
| Phương thức | Endpoint | Yêu cầu Auth | Mô tả chức năng |
| :--- | :--- | :---: | :--- |
| `GET` | `/api/v1/community/posts` | **Public** | Bảng tin Newfeed (hỗ trợ lọc theo `destinationId`, `tourId`) |
| `GET` | `/api/v1/community/posts/{id}` | **Public** | Xem chi tiết bài viết (trả về cả reaction của user nếu đã login) |
| `GET` | `/api/v1/community/posts/my` | User | Danh sách bài viết do chính du khách đăng tải (kèm trạng thái) |
| `POST` | `/api/v1/community/posts` | User | Đăng bài viết chia sẻ (lưu nháp `DRAFT` hoặc gửi duyệt `PENDING_REVIEW`) |
| `PUT` | `/api/v1/community/posts/{id}` | User | Chỉnh sửa bài viết (*Lưu ý: bài đã duyệt khi sửa sẽ tự động quay về chờ duyệt*) |
| `GET` | `/api/v1/community/posts/{id}/comments` | **Public** | Danh sách bình luận công khai của bài viết |
| `POST` | `/api/v1/community/posts/{id}/comments` | User | Thêm bình luận mới vào bài viết |
| `POST` | `/api/v1/community/posts/{id}/reactions` | User | Thả tim / Cảm xúc (`LIKE`, `LOVE`, `HELPFUL`, `WOW`). Bấm lại sẽ hủy |
| `POST` | `/api/v1/community/posts/{id}/reports` | User | Báo cáo bài viết vi phạm tiêu chuẩn cộng đồng |
| `GET` | `/api/v1/community/moderation/pending` | Moderator/Admin | Danh sách bài viết đang chờ duyệt |
| `PUT` | `/api/v1/community/moderation/posts/{id}` | Moderator/Admin | Duyệt bài viết (`APPROVE`, `REJECT`, `REQUEST_REVISION`) |
| `GET` | `/api/v1/community/moderation/reports` | Moderator/Admin | Danh sách báo cáo vi phạm nội dung |
| `PUT` | `/api/v1/community/moderation/reports/{id}/resolve` | Moderator/Admin | Xử lý báo cáo (kèm cờ `hidePost = true/false`) |

---

## 3. Kịch Bản Kiểm Thử Toàn Trình (End-to-End Walkthrough Dành Cho Frontend)

Bạn có thể chạy thử một kịch bản hoàn chỉnh từ khi du khách bắt đầu tour, check-in nhận huy hiệu, giải đố nhận điểm, đổi voucher và đăng bài review lên cộng đồng:

```
[Khởi động Journey] -> [Check-in GPS & Nhận Badge] -> [Nộp Quiz & GPS Puzzle] 
        -> [Nhận Điểm Thưởng] -> [Đổi Voucher] -> [Đăng Bài Cộng Đồng] -> [Moderator Duyệt]
```

### Bước 1: Bắt đầu hành trình (`POST /api/v1/journeys`)
- **Mục đích:** Khi khách đặt tour xong và đến giờ khởi hành, ứng dụng gọi API này để mở tour.
- **Request Body mẫu:**
  ```json
  {
    "bookingId": 1001,
    "tourId": 1
  }
  ```
- **Response:** Trả về đối tượng `JourneyResponse` chứa danh sách các điểm đến (`destinations`) và nhiệm vụ (`tasks`). Điểm đầu tiên có `status: "IN_PROGRESS"`.
- *Lưu ý:* Hãy ghi nhớ giá trị `id` của Journey (ví dụ: `1`) và `destinationId` điểm đầu tiên.

---

### Bước 2: Check-in GPS tại điểm đến (`POST /api/v1/journeys/{id}/destinations/{destinationId}/check-in`)
- **Mục đích:** Du khách có mặt tại điểm đến và bấm "Check-in".
- **URL mẫu:** `/api/v1/journeys/1/destinations/1/check-in`
- **Request Body mẫu (Tọa độ mẫu Văn Miếu - Quốc Tử Giám):**
  ```json
  {
    "latitude": 21.0277,
    "longitude": 105.8351,
    "qrCode": "QR_1_TOKEN"
  }
  ```
- **Response Data:**
  ```json
  {
    "success": true,
    "message": "Check-in thành công tại Văn Miếu – Quốc Tử Giám",
    "destinationId": 1,
    "badgeEarned": {
      "code": "BADGE_VAN_MIEU",
      "name": "Dấu chân Văn Miếu – Quốc Tử Giám",
      "bonusPoints": 10
    }
  }
  ```
> 🎖️ *Thành quả:* Du khách tự động nhận được Huy hiệu di tích kèm 10 điểm thưởng!

---

### Bước 3: Làm nhiệm vụ (câu hỏi thật của Provider)
Điểm thưởng thuộc về **nhiệm vụ** (`pointsReward`). Một nhiệm vụ có một hoặc nhiều câu hỏi; du khách nộp bài của **cả nhiệm vụ** trong một lần.
- Đúng **hết** câu hỏi: nhận trọn điểm nhiệm vụ (cộng một lần), trạng thái `COMPLETED`.
- Chưa đúng hết: **không có điểm**, phải làm lại cả nhiệm vụ. Mỗi lần nộp tính một lượt (`maxAttempts` của nhiệm vụ). Hết lượt thì trạng thái `FAILED`.
- Câu bỏ trống tính là sai. Backend không bao giờ trả đáp án đúng cho du khách.

1. **Xem câu hỏi:** `GET /api/v1/journeys/1/tasks/11/questions`
   - Nhiệm vụ thường: trả `unlocked: true` cùng danh sách câu hỏi (trắc nghiệm có `options`, tự luận thì `options` rỗng).
   - Nhiệm vụ **tương tác ngoài thực tế** (`requiresLocation: true`): **mỗi câu hỏi gắn với một địa điểm**. Du khách đi lần lượt từng địa điểm theo thứ tự câu hỏi. API chỉ trả **câu hiện tại**, và chỉ khi gửi thêm `?latitude=..&longitude=..` (trong bán kính của địa điểm câu đó) **hoặc** `?qrValue=<mã QR của địa điểm>`. Chưa tới nơi thì `unlocked: false`, `questions: null`, kèm `station` (tên, tọa độ, bán kính của địa điểm kế tiếp) để dẫn đường.
2. **Nộp bài:** `POST /api/v1/journeys/1/tasks/11/submit`
   ```json
   {
     "answers": [
       { "questionId": 101, "answerId": 502 },
       { "questionId": 102, "text": "Thiên Mụ" }
     ],
     "latitude": 16.4526,
     "longitude": 107.5458,
     "qrValue": null
   }
   ```
   - Nhiệm vụ thường: gửi `answers` của mọi câu hỏi trong một lần.
   - Nhiệm vụ tương tác ngoài thực tế: mỗi lần gửi **một** câu (`answers` chỉ có câu hiện tại) kèm `latitude/longitude` hoặc `qrValue` của địa điểm đó. Đúng thì sang địa điểm kế tiếp (`lastAnswerCorrect: true`, `questionIndex` tăng); đúng hết thì `COMPLETED` và nhận trọn điểm. **Sai một câu** thì lần làm đó thất bại, trừ một lượt, quay lại câu đầu (`questionIndex: 0`).
   - Trắc nghiệm gửi `answerId`, tự luận gửi `text` (không phân biệt hoa thường, bỏ khoảng trắng thừa).
   - **Response:** `isCorrect`, `pointsEarned`, `attempts`, `attemptsRemaining`, `totalQuestions`, `correctCount`, `status`.
   - Nhiệm vụ tương tác ngoài thực tế: bắt buộc có `latitude/longitude` trong bán kính trạm hoặc `qrValue` đúng, nếu không báo `GPS-REQUIRED`, `GPS-OUT-OF-PUZZLE-ZONE` hoặc `QR-INVALID`.

---

### Bước 4: Gợi ý nhiệm vụ tương tác ngoài thực tế
- `GET /api/v1/journeys/1/tasks/12/puzzle-clue` trả `clue` (mô tả nhiệm vụ), tọa độ và bán kính của trạm.

---

### Bước 5: Kiểm tra số dư điểm & Đổi Voucher
1. **Xem ví điểm:** `GET /api/v1/gamification/points/my`
   - Hiển thị tổng điểm hiện tại (ví dụ: `140` điểm) kèm nhật ký từng lần cộng điểm do check-in và hoàn thành nhiệm vụ.
2. **Xem danh mục voucher:** `GET /api/v1/gamification/vouchers`
   - Voucher `id: 1` (`JG-VOUCHER-50K`, yêu cầu `50` điểm).
3. **Đổi voucher:** `POST /api/v1/gamification/vouchers/1/redeem`
   - Hệ thống trừ 50 điểm của khách và sinh ra mã voucher cá nhân (ví dụ: `JG-50K-A8B9C1D2`).
4. **Kiểm tra ví voucher:** `GET /api/v1/gamification/vouchers/my` -> Xuất hiện voucher mới có trạng thái `ACTIVE`.

---

### Bước 6: Đăng bài viết chia sẻ lên Cộng đồng
1. **Đăng bài viết mới:** `POST /api/v1/community/posts`
   ```json
   {
     "title": "Trải nghiệm giải đố tại Văn Miếu siêu thú vị!",
     "content": "Chuyến đi hôm nay rất tuyệt vời, mình vừa giải được mật mã cổ và nhận được voucher 50k...",
     "destinationId": 1,
     "tourId": 1,
     "journeyId": 1,
     "mediaUrls": [
       "https://images.unsplash.com/photo-1599707367072-cd6ada2bc375?auto=format&fit=crop&w=800&q=80"
     ],
     "saveAsDraft": false
   }
   ```
   - Bài viết được tạo với trạng thái `PENDING_REVIEW` (chờ kiểm duyệt).

---

### Bước 7: Kiểm duyệt bài viết (Đăng nhập Moderator)
1. Đăng nhập với tài khoản `moderator@journeygo.com` / `Password123@` và authorize token.
2. **Xem bài chờ duyệt:** `GET /api/v1/community/moderation/pending`
3. **Duyệt bài viết:** `PUT /api/v1/community/moderation/posts/{id}`
   ```json
   {
     "action": "APPROVE",
     "note": "Nội dung rất ý nghĩa, hình ảnh chuẩn mực."
   }
   ```
4. **Kiểm tra Newfeed công khai:** `GET /api/v1/community/posts` -> Bài viết đã chính thức xuất hiện trên bảng tin cộng đồng!

---

## 4. Dành Cho Backend 1 (Tour & Destination Team)

Backend 3 đã thiết kế giao diện lỏng (Decoupled Interface) thông qua Spring Bean `TourInfoProvider` để không bị phụ thuộc vào tiến độ của Backend 1:

### 4.1. Contract Giữa Tour và Journey
Interface nằm tại: `com.journeygo.modules.journey.provider.TourInfoProvider`

```java
public interface TourInfoProvider {
    TourInfo getTourInfo(Long tourId);
}
```
Đối tượng `TourInfo` bao gồm:
- `tourId`, `tourTitle`
- `destinations`: Danh sách các điểm dừng chân theo thứ tự `orderIndex`, tọa độ GPS (`latitude`, `longitude`), bán kính cho phép check-in `radiusMeters` (mặc định 80-100m), và danh sách `tasks`.
- `tasks`: Mỗi task có `taskType` (`QUIZ` hoặc `REAL_WORLD_INTERACTIVE`), điểm thưởng `points`, đáp án đúng `correctAnswer`, tọa độ giải đố `targetLatitude`/`targetLongitude` và bán kính `targetRadiusMeters`.

### 4.2. Nguồn Dữ Liệu Hành Trình
Hành trình đọc dữ liệu thật qua `RealTourInfoProvider`: Tour (đã `PUBLISHED`) → các điểm đến theo thứ tự → trải nghiệm `PUBLISHED` của điểm đến → nhiệm vụ `PUBLISHED` → câu hỏi và đáp án. Điểm đến không có trải nghiệm hoặc nhiệm vụ sẽ hoàn thành ngay khi check-in. Điểm đến hiện check-in bằng GPS (chưa có mã QR riêng).

---

## 5. Dành Cho Backend 2 (Booking & Payment Team)

### 5.1. Kích Hoạt Hành Trình Sau Khi Thanh Toán Thành Công
- Khi du khách thanh toán thành công booking (thông qua VNPAY / Momo / Thẻ tín dụng):
  - Backend 2 cập nhật Booking sang trạng thái `CONFIRMED` hoặc `PAID`.
  - Frontend hoặc Backend 2 có thể điều hướng người dùng bắt đầu chuyến đi bằng API:
    `POST /api/v1/journeys` với payload `{ "bookingId": <id>, "tourId": <id> }`.
- Backend 3 đã tích hợp cơ chế **Idempotent (Chống trùng lặp)**: Nếu gọi `POST /api/v1/journeys` nhiều lần cho cùng một du khách và cùng tour đang diễn ra, hệ thống sẽ trả về chính hành trình đang chạy chứ không tạo ra hành trình trùng lặp.

### 5.2. Áp Dụng Voucher Giảm Giá Từ Gamification Khi Thanh Toán
- Khi du khách dùng điểm đổi voucher từ Gamification, hệ thống sinh ra một bản ghi `UserVoucher` với mã `voucherCode` độc nhất.
- Khi du khách tiến hành Checkout đơn hàng tour tại Backend 2:
  - Frontend gửi kèm `voucherCode`.
  - Backend 2 có thể kiểm tra trực tiếp trong bảng `user_vouchers` hoặc gọi kiểm tra:
    - Trạng thái `status == 'ACTIVE'`
    - Hạn sử dụng `expiresAt > Instant.now()`
    - Đơn hàng đạt giá trị tối thiểu `minOrderAmount`
  - Sau khi thanh toán thành công, cập nhật `user_vouchers.status = 'USED'`.

---

## 6. Bảng Mã Lỗi (Business Exception Codes) Thường Gặp

Khi gọi API không thành công, hệ thống trả về mã lỗi chuẩn trong trường `code` của response:

| Mã lỗi (Code) | HTTP Status | Nguyên nhân | Hướng xử lý cho Frontend |
| :--- | :---: | :--- | :--- |
| `CHECKIN-DISTANCE-TOO-FAR` | 400 | Du khách đứng ngoài bán kính cho phép check-in | Hiển thị thông báo "Bạn đang ở cách điểm đến X mét, vui lòng di chuyển lại gần" |
| `CHECKIN-WRONG-ORDER` | 400 | Du khách cố tình check-in điểm số 2 trong khi chưa xong điểm số 1 | Thông báo du khách đi theo đúng lộ trình tour |
| `ALREADY-CHECKED-IN` | 400 | Điểm đến này đã được check-in trước đó | Cập nhật UI sang trạng thái Đã check-in |
| `INSUFFICIENT-POINTS` | 400 | Số dư điểm không đủ để đổi voucher | Nhắc người dùng tích lũy thêm điểm |
| `VOUCHER-OUT-OF-STOCK` | 400 | Voucher đã hết số lượng phát hành | Báo hết voucher |
| `FORBIDDEN-POST` | 403 | Sửa hoặc xóa bài viết của người khác | Chặn quyền chỉnh sửa trên UI |
| `COMMENT-NOT-ALLOWED` | 400 | Bình luận vào bài viết chưa duyệt hoặc bị ẩn | Ẩn khung chat/bình luận trên bài chưa duyệt |
| `ALREADY-REPORTED` | 400 | Mỗi du khách chỉ được báo cáo 1 bài viết một lần | Báo "Bạn đã gửi báo cáo bài viết này rồi" |

---
*Tài liệu được cập nhật tự động theo phiên bản Backend 3 mới nhất.*
