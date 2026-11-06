# Tài liệu Triển khai — Booking · Payment · Refund · Provider Revenue · Wallet & Settlement

> **Nguồn yêu cầu:** `Booking - Payment - Refund - Wallet & Settlement.pdf`
> **Backend:** `backend/` — Java 21 · Spring Boot 3.3.5 · PostgreSQL · Flyway · Spring Security (JWT + Method Security)
> **Trạng thái:** `mvn compile` → **BUILD SUCCESS** ✅

---

## Mục lục

1. [Tổng quan kiến trúc](#1-tổng-quan-kiến-trúc)
2. [Booking](#2-booking)
3. [Payment (VNPay)](#3-payment-vnpay)
4. [Refund](#4-refund)
5. [Provider Revenue](#5-provider-revenue)
6. [Wallet](#6-wallet)
7. [Settlement](#7-settlement)
8. [Financial Adjustment](#8-financial-adjustment)
9. [Cấu hình & Biến môi trường](#9-cấu-hình--biến-môi-trường)
10. [Database Schema (Flyway)](#10-database-schema-flyway)
11. [Danh sách API](#11-danh-sách-api)
12. [Quy tắc nghiệp vụ & Edge cases](#12-quy-tắc-nghiệp-vu--edge-cases)
13. [Phương thức thanh toán VNPay](#13-phương-thức-thanh-toán-vnpay)

---

## 1. Tổng quan kiến trúc

### 1.1. Các module mới

| Module | Package | Vai trò |
|---|---|---|
| Booking | `com.journeygo.modules.booking` | Đặt chỗ, giữ slot, timeout, hủy, hoàn thành |
| Payment | `com.journeygo.modules.payment` | Thanh toán VNPay (init/retry/IPN/return/QueryDR) |
| Refund | `com.journeygo.modules.refund` | Yêu cầu hoàn tiền, duyệt, gọi VNPay Refund, audit log |
| ProviderProfile | `com.journeygo.modules.providerprofile` | Quản lý đối tác (1-1 với Wallet) |
| Provider Revenue | `com.journeygo.modules.providerrevenue` | Ghi nhận doanh thu, hoa hồng, 9 điều kiện eligible |
| Wallet | `com.journeygo.modules.wallet` | Ví của đối tác + giao dịch ví |
| Settlement | `com.journeygo.modules.settlement` | Đợt tất toán, duyệt nguyên tử, điều chỉnh tài chính |
| Finance | `com.journeygo.modules.finance.config` | Cấu hình nghiệp vụ tài chính (`app.finance.*`) |

### 1.2. Luồng tổng thể

```
Tour đã publish (PUBLIC)
   │
   ├─► POST /api/v1/bookings                    → Booking PENDING_PAYMENT + giữ slot (10 phút)
   │        │
   │        ├─► POST /api/v1/payments/bookings/{id}/init   → Payment PENDING + URL VNPay
   │        │        │
   │        │        ├─► IPN (server-to-server)   → xác minh HMACSHA512 → CONFIRMED
   │        │        └─► Return URL (redirect)     → xác minh → QueryDR nếu chưa rõ
   │        │
   │        └─► Hết 10 phút → Scheduler → EXPIRED + giải phóng slot
   │
   ├─► Journey hoàn thành → Booking COMPLETED → ProviderRevenue (ELIGIBLE)
   │
   ├─► Refund (trong 24h từ paidAt) → PENDING_REVIEW → Admin duyệt
   │        └─► REFUND_PROCESSING → REFUNDED (qua VNPay API hoặc Manual Transfer)
   │
   ├─► Settlement (kỳ tháng, đã đóng) → DRAFT → Admin duyệt
   │        └─► Wallet credit (SETTLEMENT_CREDIT) + Revenue → SETTLED
   │
   └─► Refund phát sinh SAU tất toán → Financial Adjustment → REFUND_ADJUSTMENT
```

### 1.3. Cơ chế đồng bộ & nguyên tử

| Vấn đề | Cơ chế |
|---|---|
| 2 request giữ cùng slot cuối cùng | `@Modifying UPDATE experience_slot SET booked_tour_count = booked_tour_count + 1 WHERE booked_tour_count < max_tour_per_day` → `updated == 0` nghĩa là hết chỗ, rollback toàn transaction |
| 2 IPN cùng giao dịch | `@Lock(PESSIMISTIC_WRITE)` trên `Payment` + `ipnCount` tăng, trạng thái SUCCESS không xác nhận lại |
| 2 Admin duyệt cùng 1 Settlement | `@Lock(PESSIMISTIC_WRITE)` trên `Settlement` + unique constraint `uk_wallet_txn_settlement_credit (wallet_id, source_type, source_id)` |
| Ghi doanh thu 2 lần | Unique `(booking_id, provider_profile_id)` và `(payment_id, provider_profile_id)` |
| Tạo ProviderProfile + Wallet | 1 transaction duy nhất, rollback trọn vẹn nếu lỗi |
| Giải phóng slot 2 lần | `booking_slot_hold.released` flag — chỉ giải phóng lần đầu |

---

## 2. Booking

### 2.1. Entity & Enum

**`Booking`** — `bookingCode`, `tourist`, `tour`, `experienceDate`, `totalAmount` (chốt lúc đặt), `currency`, `status`, `paymentDeadline`, `paidAt`, `confirmedAt`, `completedAt`, `cancelledAt`, `cancelReason`.

> **Quy tắc:** `paymentDeadline` = `createdAt + 10 phút`, **cố định** — không gia hạn khi khách thử lại thanh toán.

**`BookingStatus`:** `PENDING_PAYMENT` → `CONFIRMED` | `EXPIRED` | `CANCELLED` → `COMPLETED`

**`BookingSlotHold`** — liên kết Booking ↔ ExperienceSlot ↔ slotDate, cờ `released` để giải phóng đúng một lần.

**`BookingSlotType`:** `EXPERIENCE` — slot định nghĩa theo `(experienceId, slotDate)`.

### 2.2. Luồng đặt chỗ

`BookingService.createBooking()`:

1. Validate tour tồn tại + bookable (đã publish)
2. Validate `experienceDate` nằm trong tour
3. `TourBookingCatalogService.quoteExperiences(tour, date)` → danh sách experience + slot + giá
4. **Duyệt trước** để xác định slot thiếu chỗ → ném `BOOKING_SLOT_FULL`
5. **Giữ slot nguyên tử** cho từng slot (`atomicReserveSlot`)
6. Tính `totalAmount` = tổng giá các experience
7. Tạo Booking (`paymentDeadline = now + 10 phút`)
8. Tạo `BookingSlotHold` cho từng slot

> Bất kỳ slot nào reserve thất bại → exception → **rollback toàn bộ transaction** (bao gồm các slot đã reserve trước đó).

### 2.3. Timeout 10 phút (UC-01)

`BookingExpiryScheduler` (chạy mỗi `app.finance.booking-expiry-scan-interval-seconds`, mặc định 60s):

- Quét booking `PENDING_PAYMENT` có `paymentDeadline < now`
- Chuyển → `EXPIRED`
- **Giải phóng slot** (giảm `bookedTourCount`, đánh dấu `released`)

Ngoài ra, khi khách gọi `/init` sau khi hết hạn → `expireIfNeededInCurrentTransaction()` → EXPIRED + giải phóng slot ngay, rồi trả lỗi `BOOKING_ALREADY_EXPIRED`.

### 2.4. Hủy booking

`cancelBooking()` — chỉ khi `PENDING_PAYMENT`. Giải phóng slot + chuyển `CANCELLED`.

### 2.5. Hoàn thành booking

`completeBooking(bookingId, completedAt)` — chuyển `CONFIRMED` → `COMPLETED`, phát `BookingCompletedEvent`.

Được gọi từ `JourneyService` khi hành trình kết thúc (bỏ qua hết điểm đến / hoàn thành hết). Lỗi ở đây **không làm hỏng luồng Journey** — chỉ log cảnh báo.

> **Đây là mốc thời gian quan trọng:** doanh thu đối tác chỉ được xét tất toán **sau khi trải nghiệm hoàn thành** (điều kiện eligible #2).

---

## 3. Payment (VNPay)

### 3.1. `VnPayProperties` (`vnpay.*`)

| Biến | Mặc định | Ý nghĩa |
|---|---|---|
| `vnpay.enabled` | `false` | Bật/tắt tích hợp |
| `vnpay.tmn-code` | — | `vnp_TmnCode` (Sandbox: `DEMOV210`) |
| `vnpay.hash-secret` | — | `vnp_HashSecret` |
| `vnpay.version` | `2.1.0` | Phiên bản API |
| `vnpay.payment-url` | `https://sandbox.vnpayment.vn/paymentv2/vpcpay.html` | Trang thanh toán |
| `vnpay.merchant-api-url` | `https://sandbox.vnpayment.vn/merchant_webapi/api/transaction` | QueryDR / Refund |
| `vnpay.bank-list-url` | `https://sandbox.vnpayment.vn/qrpayauth/api/merchant/get_bank_list` | Danh sách ngân hàng |
| `vnpay.ipn-url` | — | Webhook (bắt buộc HTTPS) |
| `vnpay.return-url` | — | Redirect sau thanh toán |
| `vnpay.ip-addr` | `127.0.0.1` | `vnp_IpAddr` |
| `vnpay.expiry-minutes` | `10` | Phải khớp Booking |
| `vnpay.verify-signature` | `true` | **KHÔNG tắt ở production** |
| `vnpay.bank-code` | *(rỗng)* | `vnp_BankCode` — rỗng = khách tự chọn |
| `vnpay.qr-bank-type` | `1` | Mapping `bank_type` → nhóm QR |
| `vnpay.domestic-card-bank-type` | `2` | Mapping → nhóm thẻ nội địa |
| `vnpay.international-card-bank-type` | `3` | Mapping → nhóm thẻ quốc tế |

### 3.2. `VnPayClient` — thuật toán checksum

**Tạo URL thanh toán (`vnp_Command=pay`)** theo spec 2.1.0:

- Sắp xếp key tăng dần, bỏ giá trị rỗng
- Chuỗi hash = `key=urlencode(value)` nối bằng `&`
  - **Tên tham số KHÔNG encode**, chỉ **giá trị** encode UTF-8
- Query string thì encode **cả tên và giá trị**
- Checksum = `HMACSHA512(hashData, secretKey)` hex lowercase
- **Không** gửi `vnp_SecureHashType`
- `vnp_Amount` = VND × 100

**Kiểm tra chữ ký IPN / Return:**

- Loại `vnp_SecureHash` và `vnp_SecureHashType` khỏi tập tham số
- Sắp xếp key, dựng lại hashData theo đúng quy tắc 2.1.0
- So sánh **constant-time**

**QueryDR (`vnp_Command=querydr`)** — `POST` JSON tới `/merchant_webapi/api/transaction`:
```
RequestId|Version|Command|TmnCode|TxnRef|TransactionDate|CreateDate|IpAddr|OrderInfo
```

**Refund (`vnp_Command=refund`)** — `POST` JSON, `vnp_TransactionType` = `02` (toàn phần) / `03` (một phần):
```
RequestId|Version|Command|TmnCode|TransactionType|TxnRef|Amount|TransactionNo|
TransactionDate|CreateBy|CreateDate|IpAddr|OrderInfo
```

> ⚠️ **`vnp_TransactionDate` của QueryDR phải là thời điểm tạo giao dịch GỐC** (giống `vnp_CreateDate` của lệnh `pay`), nếu sai VNPay trả `vnp_ResponseCode=91`.

> ⚠️ **Phản hồi `vnp_ResponseCode=00` cho lệnh refund chỉ có nghĩa "đã tiếp nhận yêu cầu"** — KHÔNG có nghĩa tiền đã về tài khoản. Xử lý ở `RefundService`.

### 3.3. `PaymentService`

**Khởi tạo thanh toán (`initiatePayment`)** — kiểm tra theo thứ tự:

1. Booking phải `PENDING_PAYMENT` (không phải `CONFIRMED`/`COMPLETED`)
2. **UC-01**: quá hạn 10 phút → EXPIRED + giải phóng slot → lỗi
3. **UC-04**: đã có Payment `SUCCESS` → lỗi `PAYMENT_ALREADY_SUCCEEDED`
4. **UC-03**: có attempt trước `PENDING`/`PROCESSING` → **QueryDR trước**
   - `SUCCESS`/`DUPLICATE` → chặn
   - `UNKNOWN` → chặn (`PAYMENT_NOT_RETRYABLE`) — tránh thanh toán trùng
   - `FAILED`/`CANCELLED` rõ ràng → cho tạo attempt mới
5. Tạo `txnRef` mới (mỗi attempt một mã riêng), `expiresAt` = `paymentDeadline` cố định

**`processIpn`** — nguồn xác minh đáng tin cậy:
- Kiểm tra chữ ký → sai trả `{"RspCode":"97","Message":"Invalid signature"}`
- `txnRef` không tồn tại → `{"RspCode":"99",...}`
- Tăng `ipnCount`
- Áp dụng kết quả
- **Luôn trả `{"RspCode":"00","Message":"Confirm Success"}`** kể cả callback trùng (VNPay cần biết đã nhận)

**Giao thức IPN (theo tài liệu VNPay 2.1.0):**
- Tài liệu ghi *"Cài đặt Code IPN URL — Phương thức: GET"*, URL VNPay gọi về dạng
  `https://{domain}/IPN?vnp_Amount=...&vnp_ResponseCode=00&...` (query string).
  → Endpoint `@RequestMapping(method = {GET, POST})` để tương thích mọi biến thể sandbox.
- Phản hồi phải dùng **`RspCode`** + **`Message`** (đúng chữ hoa) — VNPay đọc 2 field này
  để quyết định kết thúc hay retry. `00`/`02` = đã xử lý (không retry), `01`/`04`/`97`/`99` = lỗi (retry).
- Controller luôn trả **HTTP 200** cho IPN — trả 4xx/5xx khiến VNPay coi như timeout và retry vô ích.
- `VNPAY_IPN_URL` phải là **HTTPS** và public (dùng ngrok khi dev local), khai báo tại
  `https://sandbox.vnpayment.vn/vnpaygw-sit-testing/ipn` hoặc
  `https://sandbox.vnpayment.vn/merchantv2/Account/TerminalEdit.htm`.

**`processReturn`** — nguồn KHÔNG đáng tin cậy:
- Bắt buộc kiểm tra chữ ký
- Nếu kết quả chưa rõ → **QueryDR** trước khi kết luận

**`applyVnPayResult`** — xử lý trung tâm:

| `vnp_TransactionStatus` | Hành vi |
|---|---|
| `00` (thành công) | `markSuccess` → xác nhận Booking (có xử lý duplicate + late) |
| `02`, `07`, `09` | `markFailed` → rõ ràng thất bại, **cho phép retry** |
| `01`, `05`, `06` | `markProcessing` → **chưa rõ**, giữ `PROCESSING` |
| `vnp_ResponseCode != 00` | `markProcessing` → chưa xác minh được |

**UC-04 (callback trùng):**
- Payment đã `SUCCESS` → `DUPLICATE`, không xác nhận lại Booking, không ghi doanh thu lần 2
- Booking đã `CONFIRMED`/`COMPLETED` bởi giao dịch khác → đánh dấu `duplicatePayment=true`, giữ tiền để chuyển quy trình hoàn tiền

**UC-05 (thanh toán muộn):**
- `paidAt <= paymentDeadline` → xác nhận bình thường (dù callback đến muộn)
- `paidAt > paymentDeadline` → `handleLatePayment()`:
  - Kiểm tra `canReacquireCapacity()` — slot đã giải phóng còn chỗ không
  - Còn chỗ → tái xác nhận Booking
  - Hết chỗ → chuyển quy trình hoàn tiền / đối soát

### 3.4. Entity & Enum

**`Payment`** — `txnRef` (unique), `method`, `status`, `amount`, `currency`, `paymentUrl`, `expiresAt`, `paidAt`, `resolvedAt`, `vnpTransactionNo`, `vnpBankTranNo`, `bankCode`, `cardType`, `vnpResponseCode`, `vnpTransactionStatus`, `vnpMessage`, `ipnCount`, `duplicatePayment`, `note`.

**`PaymentStatus`:** `PENDING` · `PROCESSING` · `SUCCESS` · `FAILED` · `EXPIRED` · `CANCELLED`

**`PaymentOutcome`** (nội bộ): `SUCCESS` · `FAILED` · `DUPLICATE` · `UNKNOWN`

---

## 4. Refund

### 4.1. Quy tắc nghiệp vụ

| Quy tắc | Chi tiết |
|---|---|
| **Cửa sổ 24 giờ** | Chỉ gửi yêu cầu trong vòng **24h kể từ `paidAt`** (thời điểm thanh toán thành công đã xác minh). Cấu hình: `app.finance.refund-window-hours` |
| **Tourist không tự nhập số tiền** | Hệ thống tự tính theo nguyên nhân. Tourist gửi `reason` (`TOURIST_FAULT` / `PLATFORM_FAULT`), không có trường amount |
| **Tỷ lệ hoàn** | `TOURIST_FAULT` → **50%**, `PLATFORM_FAULT` → **100%**. Cấu hình: `app.finance.tourist-fault-refund-rate` / `platform-fault-refund-rate` |
| **Chống refund trùng** | 1 Payment chỉ có 1 yêu cầu refund ở trạng thái chưa kết thúc |
| **Chống hoàn vượt** | Tổng số tiền đã hoàn + đang xử lý **không được vượt** số tiền thanh toán (`REFUND_EXCEEDS_PAYMENT_AMOUNT`) |
| **Admin không đổi tỷ lệ** | Nếu Admin gửi `amount` khác số tiền hệ thống tính → `REFUND_AMOUNT_MISMATCH` |
| **Số tiền tự tính** | `calculateRefundAmount(amount, reason)` |

### 4.2. Vòng đời Refund

```
PENDING_REVIEW  (Tourist gửi, trong 24h)
      │
      ├─► Admin TỪ CHỐI ─────────────────────► REJECTED
      │
      └─► Admin DUYỆT ──► APPROVED
              │
              └─► Gửi VNPay Refund API ────────► REFUND_PROCESSING
                      │                              │
                      └──────────────────────────────┴─► REFUNDED (tiền đã về)
                                                    └─► FAILED
```

**Phương thức hoàn:**
- `VNPAY_API` — chính (khuyến nghị)
- `MANUAL_BANK_TRANSFER` — dự phòng khi VNPay không khả dụng

### 4.3. `REFUND_PROCESSING` — chờ kết quả thật

> `vnp_ResponseCode=00` ≠ tiền đã về.

- Gọi VNPay Refund API → `vnp_TransactionStatus`:
  - `00` → `REFUNDED`
  - `05` (đang xử lý) / `06` (đã gửi ngân hàng) → giữ `REFUND_PROCESSING`
  - `09` (bị từ chối) → `FAILED`

`RefundStatusScheduler` poll định kỳ (`app.finance.refund-status-check-interval-seconds`, mặc định 300s) các refund đang `REFUND_PROCESSING` để cập nhật trạng thái.

### 4.4. Manual Bank Transfer — an toàn

`POST /api/v1/refunds/{id}/manual-transfer` chỉ chuyển `REFUNDED` khi có **đủ bằng chứng**:
- `transferReference` — mã tham chiếu giao dịch (bắt buộc)
- `transferEvidence` — bằng chứng (URL ảnh hoặc mã)
- `transferExecutedAt` — thời điểm thực hiện

**Bị chặn nếu** refund đã gửi qua VNPay API nhưng chưa xác minh kết quả → phải chờ xác minh trước.

### 4.5. Audit log bất biến

`RefundAuditLog` — append-only, ghi **mọi** thao tác:
- Action: `CREATED` · `APPROVED` · `REJECTED` · `VNPAY_REQUESTED` · `VNPAY_CONFIRMED` · `MANUAL_TRANSFER_CONFIRMED` · `FAILED` · `CANCELLED`
- Lưu: `fromStatus`, `toStatus`, `actorId`, `amount`, `note`, `createdAt`

Không có endpoint sửa/xóa audit log.

### 4.6. Enum

**`RefundStatus`:** `PENDING_REVIEW` · `APPROVED` · `REFUND_PROCESSING` · `REFUNDED` · `REJECTED` · `FAILED` · `CANCELLED`
**`RefundReason`:** `TOURIST_FAULT` · `PLATFORM_FAULT`
**`RefundMethod`:** `VNPAY_API` · `MANUAL_BANK_TRANSFER`

---

## 5. Provider Revenue

### 5.1. Ghi nhận doanh thu — đúng 1 lần

`ProviderRevenueService.recordRevenueForBooking(booking, payment)` được gọi từ:
- `PaymentService` khi payment được xác minh thành công (hook)
- Listener `BookingCompletedEvent` khi booking hoàn thành

**Cơ chế chống trùng:** unique constraint
- `(booking_id, provider_profile_id)`
- `(payment_id, provider_profile_id)`

### 5.2. Phân bổ cho nhiều đối tác trong 1 Booking

Một tour có thể gồm nhiều Experience của các đối tác khác nhau. Ánh xạ:

```
Booking → Tour → TourDestination → Destination → Experience → người tạo (đối tác)
```

`resolveGrossPerProviderProfile(booking)` → `Map<providerProfileId, grossAmount>`

> `grossAmount` của mỗi đối tác = **tổng giá các Experience do đối tác đó tạo**.

### 5.3. Công thức tài chính

```
NetCollected     = GrossAmount − RefundAmount
Commission       = NetCollected × CommissionRate
ProviderNetAmount = NetCollected − Commission + AdjustmentAmount
```

**Phân bổ refund khi booking nhiều đối tác:**
```
share = RefundedTotal × (GrossAmount_củaĐốiTác / GrossAmount_tổng_củaBooking)
```

### 5.4. Kỳ doanh thu

`revenuePeriod` = **tháng hoàn thành trải nghiệm** (`yyyy-MM`), tính theo thời điểm `completedAt` của booking — **không** theo thời điểm thanh toán.

### 5.5. 9 điều kiện đủ tư cách tất toán (eligible)

Đánh giá **trực tiếp tại thời điểm gọi** (không cache), trả về chi tiết từng check:

| # | Mã check | Điều kiện | Lý do giữ lại |
|---|---|---|---|
| 1 | `1_PAYMENT_VERIFIED` | Payment `SUCCESS`, không phải duplicate, có `paidAt` | `PAYMENT_NOT_VERIFIED` |
| 2 | `2_BOOKING_COMPLETED` | Booking `COMPLETED` | `BOOKING_NOT_COMPLETED` |
| 3 | `3_NO_PENDING_REFUND` | Không refund nào ở `PENDING_REVIEW`/`APPROVED`/`REFUND_PROCESSING` | `REFUND_PENDING` |
| 4 | `4_REFUND_APPLIED` | `refundAmount <= tổng đã REFUNDED` | — |
| 5 | `5_NO_RECONCILIATION_ISSUE` | Không có Financial Adjustment `PENDING` liên quan | `FINANCIAL_REVIEW_REQUIRED` |
| 6 | `6_NOT_SETTLED` | Chưa `IN_SETTLEMENT` / `SETTLED` | `FINANCIAL_REVIEW_REQUIRED` |
| 7 | `7_CALCULATED` | Đã có commission + net + rate | `FINANCIAL_REVIEW_REQUIRED` |
| 8 | `8_POSITIVE_NET` | `providerNetAmount > 0` | `FINANCIAL_REVIEW_REQUIRED` |
| 9 | `9_PERIOD_CLOSED` | Kỳ doanh thu (`yyyy-MM`) đã kết thúc | `PERIOD_NOT_CLOSED` |

> **Điểm mấu chốt:** khoản đã `SETTLED` **không bao giờ hồi sinh** — Refund phát sinh sau tất toán được xử lý bằng Financial Adjustment riêng.
>
> **Điều kiện 6 phụ thuộc ngữ cảnh** (`EvaluationMode`):
> - `CANDIDATE` (xem ứng viên / tạo bản nháp): khoản doanh thu phải **chưa thuộc đợt nào** (`status != IN_SETTLEMENT && status != SETTLED && settlementId == null`).
> - `APPROVAL` (duyệt đợt tất toán): khoản doanh thu **phải thuộc đúng đợt đang duyệt** và chưa bị `SETTLED`. Nếu chấm theo nghĩa "chưa thuộc đợt nào" thì mọi đợt tất toán sẽ luôn fail ở bước duyệt.
>
> **Điều kiện 9** chặn việc doanh thu kỳ **tương lai** bị kéo vào đợt tất toán của kỳ đã đóng qua cơ chế "doanh thu chuyển tiếp". Kỳ hiện tại chỉ đóng khi bật `app.finance.allow-open-period-settlement=true`; kỳ tương lai **luôn** chưa đóng.

**`ProviderRevenueStatus`:** `PENDING` · `ELIGIBLE` · `IN_SETTLEMENT` · `SETTLED`
**`DeferredReason`:** `PAYMENT_NOT_VERIFIED` · `BOOKING_NOT_COMPLETED` · `REFUND_PENDING` · `PERIOD_NOT_CLOSED` · `FINANCIAL_REVIEW_REQUIRED`

---

## 6. Wallet

### 6.1. Mô hình

- **Wallet 1-to-1 với ProviderProfile** — tạo **nguyên tử cùng ProviderProfile** trong 1 transaction (`ProviderProfileService.createProviderProfile`)
- `Wallet`: `providerProfile`, `balance`, `currency`, `status`
- `WalletTransaction`: `wallet`, `type`, `direction`, `amount`, `balanceAfter`, `status`, `sourceType`, `sourceId`, `note`

### 6.2. Loại giao dịch

**`WalletTransactionType`:** `SETTLEMENT_CREDIT` · `REFUND_ADJUSTMENT` · `MANUAL_ADJUSTMENT`
**`WalletTransactionDirection`:** `CREDIT` · `DEBIT`
**`WalletTransactionStatus`:** `SUCCESS` · `FAILED`

### 6.3. Chống cộng tiền 2 lần

Unique constraint:
```sql
uk_wallet_txn_settlement_credit (wallet_id, source_type, source_id)
```

→ Mỗi settlement chỉ credit ví **đúng 1 lần**.

### 6.4. `WalletService`

- `creditFromSettlement(wallet, settlement, amount)` — cộng tiền từ settlement đã duyệt
- `applyAdjustment(wallet, adjustment, amount)` — nếu **không đủ số dư** → ghi nhận khoản phải thu `PENDING` thay vì âm số dư

### 6.5. Cô lập dữ liệu tài chính giữa các Content Provider

> ⚠️ **Bắt buộc:** một Content Provider **KHÔNG** được xem số dư ví / giao dịch / doanh thu /
> đợt tất toán của đối tác khác.

| Role | Phạm vi xem dữ liệu tài chính |
|---|---|
| `ADMIN` | Toàn bộ mọi ProviderProfile |
| `CONTENT_PROVIDER` | **Chỉ** ProviderProfile gắn với chính mình (`provider_profiles.user_id == principal.id`) |
| `CONTENT_MODERATOR` | Không có quyền tài chính |
| `TOURIST` | Không có quyền tài chính |

Cơ chế thực thi: `AuthorizationGuard.requireFinanceOwnerOrAdmin(ownerUserId)` — ném
`BusinessException` với mã `FORBIDDEN-FINANCE-OWNER` (HTTP 403) nếu caller là
`CONTENT_PROVIDER` nhưng không sở hữu hồ sơ. Được áp dụng tại:

- `WalletService.getByProviderProfile` · `getById` · `getTransactions` · `getTransactionsByWallet`
- `ProviderRevenueService.getById` · `getByProviderProfile` · `evaluateEligibility` · `evaluateForApproval` · `findByBooking` (lọc theo chủ sở hữu)
- `ProviderProfileService.getById` · `getByUserId` (hồ sơ chứa `commissionRate`, `hasWallet`)
- `SettlementService.getCandidates` · `getById` · `getDetails` · `getByProviderProfile`

> **Lưu ý:** `@PreAuthorize("hasAnyRole('ADMIN', 'CONTENT_PROVIDER')")` **chỉ** chặn được
> TOURIST/MODERATOR — nó KHÔNG chặn được việc một Content Provider đọc dữ liệu của đối tác
> khác bằng cách đổi `providerProfileId` trong URL. Vì vậy phải có thêm lớp kiểm tra sở hữu ở
> tầng service.

---

## 7. Settlement

### 7.1. Kỳ tất toán

- **Theo tháng dương lịch** (`yyyy-MM`)
- **Chỉ cho tạo cho kỳ đã kết thúc** — trừ khi `app.finance.allow-open-period-settlement=true`
- Hỗ trợ **grace period**: `app.finance.settlement-grace-minutes`

### 7.2. Luồng

```
Đánh giá candidates (9 điều kiện, live)
      │
      ├─► eligible  → tạo Settlement DRAFT (kèm SettlementDetail)
      └─► held     → giữ kèm lý do (DeferredReason)
      │
      ▼
Admin DUYỆT (nguyên tử, 1 transaction)
      ├─► Settlement.Status = APPROVED
      ├─► ProviderRevenue.Status = SETTLED
      ├─► Wallet.balance += amount
      ├─► WalletTransaction(SETTLEMENT_CREDIT)
      └─► SettlementDetail → SETTLED
      │
Admin TỪ CHỐI ──────────────────────────────► REJECTED (giải phóng doanh thu, KHÔNG ghi tiền)
```

### 7.3. Duyệt nguyên tử

`@Lock(PESSIMISTIC_WRITE)` trên `Settlement` + unique constraint `uk_wallet_txn_settlement_credit` → **rollback toàn bộ** nếu bất kỳ bước nào lỗi. Không có trường hợp "settlement đã duyệt nhưng ví chưa cộng tiền".

### 7.4. Enum

**`SettlementStatus`:** `DRAFT` · `APPROVED` · `REJECTED` · `CANCELLED`

---

## 8. Financial Adjustment

Dùng cho **trường hợp phát sinh sau khi đã tất toán** (refund đến sau khi settlement đã APPROVED).

- `FinancialAdjustment`: `providerProfile`, `amount` (dương = cộng, âm = trừ), `reason`, `refundRequest`, `settlement`, `status`
- **Không sửa lịch sử đã duyệt** — tạo khoản điều chỉnh riêng
- `PENDING` → Admin duyệt → `APPROVED` (áp dụng vào Wallet, tạo `WalletTransaction` type `REFUND_ADJUSTMENT`) hoặc `REJECTED`

**`FinancialAdjustmentStatus`:** `PENDING` · `APPROVED` · `REJECTED`

---

## 9. Cấu hình & Biến môi trường

### 9.1. `app.finance.*` (`FinanceProperties`)

| Biến | Mặc định | Ý nghĩa |
|---|---|---|
| `refund-window-hours` | `24` | Cửa sổ gửi yêu cầu refund từ `paidAt` |
| `default-commission-rate` | `0.2000` | Tỷ lệ hoa hồng mặc định (20%) |
| `tourist-fault-refund-rate` | `0.50` | Hoàn 50% khi lỗi tourist |
| `platform-fault-refund-rate` | `1.00` | Hoàn 100% khi lỗi hệ thống |
| `settlement-grace-minutes` | `0` | Số phút chờ sau khi kỳ kết thúc |
| `allow-open-period-settlement` | `false` | Cho tạo settlement cho kỳ chưa kết thúc |
| `booking-expiry-scan-interval-seconds` | `60` | Chu kỳ quét booking quá hạn |
| `refund-status-check-interval-seconds` | `300` | Chu kỳ poll trạng thái refund |
| `refund-resubmit-window-hours` | `0` | Cho phép gửi lại refund sau khi bị từ chối (0 = không) |

> **Không có magic number** — tất cả giá trị đọc từ biến môi trường, không hardcode.

### 9.2. Biến môi trường VNPay

Xem `backend/.env.example` — nhóm `# ===== VNPay =====` và `# ===== Finance =====`.

---

## 10. Database Schema (Flyway)

**File:** `backend/src/main/resources/db/migration/V1__init_booking_payment_refund_wallet_settlement.sql`

Đặc điểm:
- **Idempotent** — dùng `CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`
- Đủ **unique constraint** chống trùng
- **Foreign key** đầy đủ
- Insert role `CONTENT_PROVIDER`

### 10.1. Bảng chính

| Bảng | Mục đích | Unique quan trọng |
|---|---|---|
| `bookings` | Đơn đặt tour | `booking_code` |
| `booking_slot_holds` | Giữ slot | `(booking_id, experience_slot_id)` |
| `payments` | Giao dịch thanh toán | `txn_ref` |
| `refund_requests` | Yêu cầu hoàn tiền | `refund_code` |
| `refund_audit_logs` | Audit bất biến | — |
| `provider_profiles` | Đối tác | `user_id` (1-1) |
| `provider_revenues` | Doanh thu | `(booking_id, provider_profile_id)`, `(payment_id, provider_profile_id)` |
| `wallets` | Ví của đối tác | `provider_profile_id` (1-1) |
| `wallet_transactions` | Giao dịch ví | `(wallet_id, source_type, source_id)` |
| `settlements` | Đợt tất toán | — |
| `settlement_details` | Chi tiết settlement | `(settlement_id, provider_revenue_id)` |
| `financial_adjustments` | Điều chỉnh tài chính | — |

### 10.2. Index

| Index | Bảng | Cột |
|---|---|---|
| `idx_bookings_status` | `bookings` | `status` |
| `idx_bookings_tourist` | `bookings` | `tourist_id` |
| `idx_bookings_deadline` | `bookings` | `payment_deadline` |
| `idx_payments_booking` | `payments` | `booking_id` |
| `idx_payments_status` | `payments` | `status` |
| `idx_refund_requests_payment` | `refund_requests` | `payment_id` |
| `idx_refund_requests_status` | `refund_requests` | `status` |
| `idx_provider_revenues_period` | `provider_revenues` | `revenue_period` |
| `idx_provider_revenues_provider` | `provider_revenues` | `provider_profile_id` |
| `idx_wallet_txn_wallet` | `wallet_transactions` | `wallet_id` |
| `idx_wallet_txn_source` | `wallet_transactions` | `source_type, source_id` |
| `idx_wallet_txn_created` | `wallet_transactions` | `created_at` |
| `idx_settlements_period` | `settlements` | `revenue_period` |
| `idx_settlements_status` | `settlements` | `status` |

---

## 11. Danh sách API

### 11.1. Auth

| Method | Path | Quyền | Mô tả |
|---|---|---|---|
| POST | `/api/v1/auth/register` | PUBLIC | Đăng ký (tự đăng nhập) |
| POST | `/api/v1/auth/login` | PUBLIC | Đăng nhập |
| POST | `/api/v1/auth/refresh` | PUBLIC | Làm mới token |
| GET | `/api/v1/auth/me` | Auth | Thông tin user hiện tại |

### 11.2. Tour (bước khởi đầu của kịch bản test)

| Method | Path | Quyền | Mô tả |
|---|---|---|---|
| GET | `/api/v1/tours/published?page=0&size=20` | PUBLIC | Tour đã xuất bản |
| GET | `/api/v1/tours/{tourId}` | PUBLIC | Chi tiết tour |

### 11.3. Booking

| Method | Path | Quyền | Mô tả |
|---|---|---|---|
| POST | `/api/v1/bookings` | TOURIST/USER/ADMIN | Đặt tour (giữ slot, 10 phút) |
| GET | `/api/v1/bookings/my` | TOURIST/USER/ADMIN | Booking của tôi |
| GET | `/api/v1/bookings/{bookingId}` | Owner/ADMIN | Chi tiết booking |
| POST | `/api/v1/bookings/{bookingId}/cancel` | Owner/ADMIN | Hủy booking |
| GET | `/api/v1/bookings?status=...` | ADMIN | Tất cả booking |

### 11.4. Payment

| Method | Path | Quyền | Mô tả |
|---|---|---|---|
| POST | `/api/v1/payments/bookings/{bookingId}/init?bankCode=` | TOURIST/USER/ADMIN | Khởi tạo/thử lại thanh toán |
| GET | `/api/v1/payments/methods` | TOURIST/USER/ADMIN | 3 nhóm phương thức + ngân hàng |
| POST/GET | `/api/v1/payments/ipn` | **PUBLIC** | Webhook VNPay (server-to-server, nhận cả GET và POST) |
| GET | `/api/v1/payments/return` | **PUBLIC** | Redirect sau thanh toán |
| GET | `/api/v1/payments/{paymentId}` | Owner/ADMIN | Chi tiết payment |
| GET | `/api/v1/payments/my` | TOURIST/USER/ADMIN | Payment của tôi |
| GET | `/api/v1/payments/bookings/{bookingId}` | Owner/ADMIN | Payment theo booking |
| POST | `/api/v1/payments/{paymentId}/query` | ADMIN/TOURIST/USER | QueryDR thủ công |
| GET | `/api/v1/payments?status=...` | ADMIN | Tất cả payment |

### 11.5. Refund

| Method | Path | Quyền | Mô tả |
|---|---|---|---|
| POST | `/api/v1/refunds` | TOURIST/USER/ADMIN | Gửi yêu cầu hoàn tiền (trong 24h) |
| GET | `/api/v1/refunds/my` | TOURIST/USER/ADMIN | Refund của tôi |
| GET | `/api/v1/refunds/payments/{paymentId}` | Owner/ADMIN | Refund theo payment |
| GET | `/api/v1/refunds/{refundId}` | Owner/ADMIN | Chi tiết refund |
| GET | `/api/v1/refunds/code/{refundCode}` | Owner/ADMIN | Tra theo mã |
| GET | `/api/v1/refunds?status=...` | ADMIN | Tất cả refund |
| POST | `/api/v1/refunds/{refundId}/review` | ADMIN | Duyệt / từ chối |
| POST | `/api/v1/refunds/{refundId}/manual-transfer` | ADMIN | Xác nhận chuyển khoản ngân hàng |
| POST | `/api/v1/refunds/{refundId}/refresh-status` | ADMIN | Poll trạng thái VNPay |

### 11.6. ProviderProfile

| Method | Path | Quyền | Mô tả |
|---|---|---|---|
| POST | `/api/v1/provider-profiles` | ADMIN | Tạo ProviderProfile (+ Wallet nguyên tử) |
| GET | `/api/v1/provider-profiles` | ADMIN | Danh sách đối tác |
| GET | `/api/v1/provider-profiles/active` | ADMIN/CONTENT_PROVIDER | Đối tác đang hoạt động |
| GET | `/api/v1/provider-profiles/{providerProfileId}` | ADMIN/CONTENT_PROVIDER (chủ sở hữu) | Chi tiết đối tác |
| GET | `/api/v1/provider-profiles/by-user/{userId}` | ADMIN/CONTENT_PROVIDER (chủ sở hữu) | Đối tác theo user |
| PUT | `/api/v1/provider-profiles/{providerProfileId}` | ADMIN | Cập nhật đối tác |

### 11.7. Provider Revenue

| Method | Path | Quyền | Mô tả |
|---|---|---|---|
| GET | `/api/v1/provider-revenues/provider-profile/{providerProfileId}` | ADMIN/CONTENT_PROVIDER (chủ sở hữu) | Doanh thu của đối tác |
| GET | `/api/v1/provider-revenues` | ADMIN | Tất cả doanh thu |
| GET | `/api/v1/provider-revenues/bookings/{bookingId}` | ADMIN/CONTENT_PROVIDER (lọc theo chủ sở hữu) | Doanh thu theo booking |
| GET | `/api/v1/provider-revenues/{revenueId}` | ADMIN/CONTENT_PROVIDER (chủ sở hữu) | Chi tiết |
| GET | `/api/v1/provider-revenues/{revenueId}/eligibility` | ADMIN/CONTENT_PROVIDER (chủ sở hữu) | **9 điều kiện eligible** |

### 11.8. Wallet

| Method | Path | Quyền | Mô tả |
|---|---|---|---|
| GET | `/api/v1/wallets/provider-profile/{providerProfileId}` | ADMIN/CONTENT_PROVIDER (chủ sở hữu) | Ví theo đối tác |
| GET | `/api/v1/wallets/{walletId}` | ADMIN/CONTENT_PROVIDER (chủ sở hữu) | Chi tiết ví |
| GET | `/api/v1/wallets/provider-profile/{providerProfileId}/transactions` | ADMIN/CONTENT_PROVIDER (chủ sở hữu) | Giao dịch ví theo đối tác |
| GET | `/api/v1/wallets/{walletId}/transactions` | ADMIN/CONTENT_PROVIDER (chủ sở hữu) | Giao dịch của ví |

### 11.9. Settlement

| Method | Path | Quyền | Mô tả |
|---|---|---|---|
| GET | `/api/v1/settlements/candidates?providerProfileId=&revenuePeriod=` | ADMIN/CONTENT_PROVIDER (chủ sở hữu) | **Đánh giá 9 điều kiện** |
| POST | `/api/v1/settlements` | ADMIN | Tạo đợt tất toán (draft) |
| POST | `/api/v1/settlements/{settlementId}/approve` | ADMIN | **Duyệt nguyên tử** |
| POST | `/api/v1/settlements/{settlementId}/reject` | ADMIN | Từ chối / hủy |
| GET | `/api/v1/settlements/{settlementId}` | ADMIN/CONTENT_PROVIDER (chủ sở hữu) | Chi tiết |
| GET | `/api/v1/settlements/{settlementId}/details` | ADMIN/CONTENT_PROVIDER (chủ sở hữu) | Chi tiết từng khoản |
| GET | `/api/v1/settlements?status=...` | ADMIN | Tất cả settlement |
| GET | `/api/v1/settlements/provider-profile/{providerProfileId}` | ADMIN/CONTENT_PROVIDER (chủ sở hữu) | Settlement của đối tác |

### 11.10. Financial Adjustment

| Method | Path | Quyền | Mô tả |
|---|---|---|---|
| POST | `/api/v1/financial-adjustments` | ADMIN | Tạo khoản điều chỉnh |
| POST | `/api/v1/financial-adjustments/{id}/approve` | ADMIN | Duyệt → áp dụng vào ví |
| POST | `/api/v1/financial-adjustments/{id}/reject` | ADMIN | Từ chối |
| GET | `/api/v1/financial-adjustments/{id}` | ADMIN/CONTENT_PROVIDER | Chi tiết |
| GET | `/api/v1/financial-adjustments` | ADMIN | Tất cả |
| GET | `/api/v1/financial-adjustments/provider-profile/{providerProfileId}` | ADMIN/CONTENT_PROVIDER | Theo đối tác |

### 11.11. Journey (để hoàn thành booking)

| Method | Path | Quyền | Mô tả |
|---|---|---|---|
| POST | `/api/v1/journeys` | TOURIST | Bắt đầu hành trình |
| GET | `/api/v1/journeys/my` | TOURIST | Danh sách hành trình |
| GET | `/api/v1/journeys/{id}` | TOURIST | Chi tiết |
| POST | `/api/v1/journeys/{id}/destinations/{destinationId}/check-in` | TOURIST | Check-in GPS |
| POST | `/api/v1/journeys/{id}/destinations/{destinationId}/skip` | TOURIST | Bỏ qua điểm đến |

---

## 12. Quy tắc nghiệp vụ & Edge cases

### 12.1. UC-01 — Timeout booking

```
T+0    POST /bookings                    → PENDING_PAYMENT, paymentDeadline = T+10
T+9    POST /payments/.../init           → OK
T+11   POST /payments/.../init           → EXPIRED + giải phóng slot → lỗi
T+11   Scheduler quét                    → EXPIRED (idempotent)
```

### 12.2. UC-02 — Vượt sức chứa

```
Slot maxTourPerDay = 5, bookedTourCount = 5
POST /bookings  → BOOKING_SLOT_FULL (không tạo booking, không giữ slot dở)
```

### 12.3. UC-03 — Retry thanh toán

| Tình huống | Hành vi |
|---|---|
| Attempt trước `FAILED`/`CANCELLED` | Cho tạo attempt mới (txnRef mới) |
| Attempt trước `PENDING`/`PROCESSING` | QueryDR → rõ ràng thất bại thì cho retry |
| Attempt trước chưa rõ (timeout mạng) | **Chặn** → `PAYMENT_NOT_RETRYABLE` |
| Đã có `SUCCESS` | Chặn → `PAYMENT_ALREADY_SUCCEEDED` |

> `paymentDeadline` **không** gia hạn khi retry.

### 12.4. UC-04 — Callback trùng

| Tình huống | Hành vi |
|---|---|
| IPN lặp lại cùng txnRef | `ipnCount++`, trả `RspCode=00`, **không** xác nhận lại Booking, **không** ghi doanh thu lần 2 |
| 2 giao dịch khác txnRef cùng thành công cho 1 booking | 1 giao dịch xác nhận; giao dịch còn lại `duplicatePayment=true` → giữ tiền → quy trình hoàn tiền |

### 12.5. UC-05 — Thanh toán muộn

| Tình huống | Hành vi |
|---|---|
| `paidAt <= deadline`, callback đến muộn | Xác nhận bình thường |
| `paidAt > deadline`, slot còn chỗ | `canReacquireCapacity()` → tái xác nhận |
| `paidAt > deadline`, slot hết chỗ | Chuyển quy trình hoàn tiền / đối soát |

### 12.6. UC-04 → UC-06 — Refund

| Kiểm tra | Error code |
|---|---|
| Quá 24h từ `paidAt` | `REFUND_WINDOW_EXPIRED` |
| Đã có refund chưa kết thúc | `REFUND_ALREADY_EXISTS` |
| Tổng hoàn vượt số tiền thanh toán | `REFUND_EXCEEDS_PAYMENT_AMOUNT` |
| Admin duyệt amount ≠ số tiền hệ thống tính | `REFUND_AMOUNT_MISMATCH` |

### 12.7. Bất biến tài chính

| Bất biến | Bảo đảm bởi |
|---|---|
| Mỗi settlement credit ví đúng 1 lần | `uk_wallet_txn_settlement_credit` |
| Mỗi booking ghi doanh thu đúng 1 lần / đối tác | `uk_provider_revenue_booking_provider` |
| Mỗi payment ghi doanh thu đúng 1 lần / đối tác | `uk_provider_revenue_payment_provider` |
| Slot giải phóng đúng 1 lần | `booking_slot_holds.released` |
| Không hồi sinh doanh thu đã `SETTLED` | `applyEligibility()` guard |
| Số dư ví không âm | `WalletService.applyAdjustment` → ghi `PENDING` |
| Không sửa lịch sử settlement đã duyệt | Dùng `FinancialAdjustment` |

---

## 13. Phương thức thanh toán VNPay

### 13.1. Nguyên lý

Theo tài liệu chính thức VNPay (`vnp_Command=pay`):

> `vnp_BankCode` là **tùy chọn**. *Nếu loại bỏ tham số không gửi sang, khách hàng sẽ **chọn phương thức thanh toán**, ngân hàng thanh toán tại VNPAY.*

→ **Để trống `VNPAY_BANK_CODE` = khách thấy đúng 3 lựa chọn như Sandbox.**

### 13.2. Ba nhóm phương thức

| Nhóm trên Sandbox | `vnp_BankCode` | `vnp_CardType` |
|---|---|---|
| Ứng dụng Ngân hàng và Ví điện tử | `VNPAYQR` | `QRCODE` |
| Thẻ nội địa và tài khoản ngân hàng | `VNBANK` | `ATM` |
| Thẻ thanh toán quốc tế | `INTCARD` | *(không có mã riêng)* |

> **Lưu ý:** tài liệu chính thức chỉ liệt kê `vnp_CardType` = `ATM`, `QRCODE` — **không có `CREDIT`**. Nhóm thẻ quốc tế được xác định qua `vnp_BankCode=INTCARD`.

### 13.3. Đã triển khai

| Thành phần | Nội dung |
|---|---|
| `VnPayPaymentMethod` | Enum 3 nhóm: `bankCode`, `label`, `description`, `cardType`, `displayOrder` + `fromBankCode()` / `fromCardType()` |
| `VnPayClient.buildPaymentUrl(..., bankCode)` | Overload nhận bankCode; **không gửi** `vnp_BankCode` nếu null/rỗng |
| `VnPayClient.fetchBankList()` | Gọi API chính thức `POST /qrpayauth/api/merchant/get_bank_list` (body `tmn_code=...`) |
| `PaymentMethodService` | Gom ngân hàng theo 3 nhóm, mapping `bank_type` **configurable** |
| `PaymentMethodResponse` | Response `{ methods[], bankGroups[], bankCodeSent }` |
| `GET /api/v1/payments/methods` | Danh sách phương thức |
| `POST /api/v1/payments/bookings/{id}/init?bankCode=` | Chỉ định trước phương thức (optional) |
| `Payment.cardType` | Lưu `vnp_CardType` từ IPN/Return để đối soát |

### 13.4. Mapping `bank_type` — lưu ý

Tài liệu chính thức "Danh sách ứng dụng, ngân hàng liên kết" chia thành 4 mục (QR, deep-link, ATM nội địa, thẻ quốc tế) nhưng **không nêu rõ mã số** `bank_type` trong response. Vì vậy mapping được cấu hình qua env:

```
VNPAY_QR_BANK_TYPE=1
VNPAY_DOMESTIC_CARD_BANK_TYPE=2
VNPAY_INTERNATIONAL_CARD_BANK_TYPE=3
```

→ chỉnh lại được nếu Sandbox trả về khác, **không cần sửa code**.

---

## Phụ lục A — Cấu trúc file đã tạo/sửa

### A.1. Files MỚI (94)

<details>
<summary>Xem đầy đủ</summary>

```
modules/booking/
  controller/BookingController.java
  dto/request/CancelBookingRequest.java
  dto/request/CreateBookingRequest.java
  dto/response/BookingResponse.java
  dto/response/SlotHoldResponse.java
  entity/Booking.java
  entity/BookingSlotHold.java
  entity/enums/BookingSlotType.java
  entity/enums/BookingStatus.java
  event/BookingCompletedEvent.java
  repository/BookingRepository.java
  repository/BookingSlotHoldRepository.java
  scheduler/BookingExpiryScheduler.java
  service/BookingService.java
  service/TourBookingCatalogService.java

modules/payment/
  config/VnPayProperties.java
  controller/PaymentController.java
  dto/response/PaymentInitResponse.java
  dto/response/PaymentMethodResponse.java
  dto/response/PaymentResponse.java
  dto/response/PaymentVerificationResponse.java
  dto/response/VnPayBank.java
  entity/Payment.java
  entity/enums/PaymentMethod.java
  entity/enums/PaymentOutcome.java
  entity/enums/PaymentStatus.java
  entity/enums/VnPayPaymentMethod.java
  repository/PaymentRepository.java
  service/PaymentMethodService.java
  service/PaymentService.java
  service/VnPayClient.java

modules/refund/
  controller/RefundController.java
  dto/request/CreateRefundRequest.java
  dto/request/ManualTransferRequest.java
  dto/request/ReviewRefundRequest.java
  dto/response/RefundResponse.java
  entity/RefundAuditLog.java
  entity/RefundRequest.java
  entity/enums/RefundMethod.java
  entity/enums/RefundReason.java
  entity/enums/RefundStatus.java
  event/RefundCompletedEvent.java
  repository/RefundAuditLogRepository.java
  repository/RefundRequestRepository.java
  scheduler/RefundStatusScheduler.java
  service/RefundService.java

modules/providerprofile/
  controller/ProviderProfileController.java
  dto/request/CreateProviderProfileRequest.java
  dto/request/UpdateProviderProfileRequest.java
  dto/response/ProviderProfileResponse.java
  entity/ProviderProfile.java
  repository/ProviderProfileRepository.java
  service/ProviderProfileService.java

modules/providerrevenue/
  controller/ProviderRevenueController.java
  dto/response/EligibilityEvaluationResponse.java
  dto/response/ProviderRevenueResponse.java
  entity/ProviderRevenue.java
  entity/enums/DeferredReason.java
  entity/enums/ProviderRevenueStatus.java
  repository/ProviderRevenueRepository.java
  service/ProviderRevenueService.java

modules/wallet/
  controller/WalletController.java
  dto/response/WalletResponse.java
  dto/response/WalletTransactionResponse.java
  entity/Wallet.java
  entity/WalletTransaction.java
  entity/enums/WalletTransactionDirection.java
  entity/enums/WalletTransactionStatus.java
  entity/enums/WalletTransactionType.java
  repository/WalletRepository.java
  repository/WalletTransactionRepository.java
  service/WalletService.java

modules/settlement/
  controller/FinancialAdjustmentController.java
  controller/SettlementController.java
  dto/request/CreateFinancialAdjustmentRequest.java
  dto/request/CreateSettlementRequest.java
  dto/request/RejectSettlementRequest.java
  dto/response/FinancialAdjustmentResponse.java
  dto/response/SettlementCandidatesResponse.java
  dto/response/SettlementDetailResponse.java
  dto/response/SettlementResponse.java
  entity/FinancialAdjustment.java
  entity/Settlement.java
  entity/SettlementDetail.java
  entity/enums/FinancialAdjustmentStatus.java
  entity/enums/SettlementStatus.java
  repository/FinancialAdjustmentRepository.java
  repository/SettlementDetailRepository.java
  repository/SettlementRepository.java
  service/FinancialAdjustmentService.java
  service/SettlementService.java

modules/finance/
  config/FinanceProperties.java

config/SchedulingConfig.java
resources/db/migration/V1__init_booking_payment_refund_wallet_settlement.sql
```

</details>

### A.2. Files SỬA (9)

| File | Thay đổi |
|---|---|
| `pom.xml` | Thêm `flyway-core`, `flyway-database-postgresql` |
| `application.yml` | Flyway, Finance, VNPay (kể cả bank-code & bank-type mapping) |
| `.env.example` | Biến VNPay + Finance |
| `ErrorCode.java` | Thêm các error code mới (`REFUND_AMOUNT_MISMATCH`, ...) |
| `SecurityConfig.java` | Whitelist `/api/v1/payments/ipn` + `/api/v1/payments/return` |
| `Role.java` | Thêm `CONTENT_PROVIDER` + `isContentProvider()` |
| `BookingService.java` | `completeBooking` + phát `BookingCompletedEvent` |
| `JourneyService.java` | Gọi `bookingService.completeBooking()` khi journey kết thúc |
| `ProviderRevenue.java` | Unique constraint hỗ trợ nhiều đối tác / booking |
| `ProviderRevenueRepository.java` | Thêm query theo booking |
| `ExperienceRepository.java` / `ExperienceSlotRepository.java` | Query phục vụ slot hold |
| `PaymentService.java` | Hook ghi doanh thu + hỗ trợ `bankCode` |

---

## Phụ lục B — Trạng thái công việc

### ✅ Đã hoàn thành

- Toàn bộ entity, repository, service, controller, DTO cho 7 module
- Thuật toán VNPay 2.1.0 (payment URL, IPN/Return verify, QueryDR, Refund)
- Đủ 9 điều kiện eligibility
- Cơ chế concurrency (pessimistic lock + atomic update + unique constraint)
- Flyway migration idempotent
- Cấu hình qua env, không hardcode
- `mvn compile` → BUILD SUCCESS

### ⚠️ Chưa làm

- **Unit test & Integration test** (xem `TEST_SCENARIOS.md` cho kịch bản chi tiết)
- Tài liệu hướng dẫn cấu hình VNPay Sandbox độc lập (hiện đã tích hợp trong `application.yml` + `.env.example` + Mục 3 & 13)
- Seed role `CONTENT_PROVIDER` trong `DataInitializer` (migration SQL đã insert role)
