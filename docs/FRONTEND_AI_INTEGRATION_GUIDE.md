# 🤖 HƯỚNG DẪN TÍCH HỢP CHO AI — Booking → Payment → Refund → Settlement

> **Người đọc:** AI coding agent của team Frontend (Web Next.js + Mobile Flutter).
> **Mục tiêu:** Tích hợp đầy đủ luồng đặt tour → thanh toán VNPay → hoàn tiền → tất toán đối tác,
> chạy được trên **cả Web lẫn Mobile** với cùng một hợp đồng API (contract).
>
> **Nguồn sự thật:** mã nguồn backend trong `backend/src/main/java/com/journeygo/modules/{booking,payment,refund,settlement,wallet,partnerrevenue,partner}`.
> Nếu tài liệu này và code backend lệch nhau → **code backend là chuẩn**.
> Kịch bản test chi tiết kèm JSON copy-paste: `docs/TEST_SCENARIOS.md`.

---

## MỤC LỤC

1. [Nguyên tắc bất di bất dịch](#1-nguyên-tắc-bất-di-bất-dịch)
2. [Thông tin chung (Base URL, Auth, Envelope)](#2-thông-tin-chung)
3. [Mô hình dữ liệu & Enum](#3-mô-hình-dữ-liệu--enum)
4. [Bản đồ API tổng thể](#4-bản-đồ-api-tổng-thể)
5. [Luồng A — Chọn tour → Booking](#5-luồng-a--chọn-tour--booking)
6. [Luồng B — Payment (VNPay 2.1.0)](#6-luồng-b--payment-vnpay-210)
7. [Luồng C — Refund](#7-luồng-c--refund)
8. [Luồng D — Settlement & Wallet (Admin/Partner)](#8-luồng-d--settlement--wallet-adminpartner)
9. [Luồng E — Financial Adjustment](#9-luồng-e--financial-adjustment)
10. [Hướng dẫn riêng cho WEB (Next.js)](#10-hướng-dẫn-riêng-cho-web-nextjs)
11. [Hướng dẫn riêng cho MOBILE (Flutter)](#11-hướng-dẫn-riêng-cho-mobile-flutter)
12. [Ma trận màn hình cần làm](#12-ma-trận-màn-hình-cần-làm)
13. [Xử lý lỗi](#13-xử-lý-lỗi)
14. [Checklist bàn giao](#14-checklist-bàn-giao)

---

## 1. NGUYÊN TẮC BẤT DI BẤT DỊCH

> Agent AI đọc mục này TRƯỚC khi viết bất kỳ dòng code nào.

### 1.1. Envelope response — LUÔN bọc `data`

Mọi endpoint (trừ `/payments/ipn`) trả về:

```json
{ "code": 200, "message": "…", "data": { … }, "timestamp": "2026-10-28T02:00:00Z" }
```

- Lỗi: HTTP status ≠ 2xx **và** body vẫn theo envelope với `code` = HTTP status, `message` = tiếng Việt dễ hiểu.
- **Luôn đọc `message` để hiển thị cho người dùng** — backend đã viết sẵn thông báo tiếng Việt đúng ngữ cảnh.
- `data` có thể `null` (vd các API action không trả dữ liệu).

### 1.2. Phân trang — `data.content`

Các endpoint list trả `data` là object phân trang:

```json
{ "page": 0, "size": 10, "totalElements": 42, "totalPages": 5, "first": true, "last": false, "content": [ … ] }
```

→ Luôn đọc `data.content`, **không** coi `data` là mảng.

### 1.3. Tiền tệ — LUÔN là `BigDecimal` số nguyên VND

- Mọi mã tiền trả về là **số nguyên VND** (không phải 1500.0000, không phải 1.5 triệu).
- **Hiển thị**: chia 1.000 + format `en-US` → `1,500,000` → `1.500.000đ`.
- **KHÔNG** nhân 100 ở frontend (trừ khi hiển thị QR VNPay — xem §6.5).
- Số tiền VNPay nhận là `amount × 100` — backend đã tự nhân trước khi ký. Frontend **không** can thiệp.

### 1.4. Thời gian — luôn là ISO-8601 UTC

- Backend trả `Instant` → `"2026-10-28T02:00:00Z"`.
- Múi giờ nghiệp vụ: `Asia/Ho_Chi_Minh` (giờ VNPay dùng để ký chữ ký).
- **Hiển thị** cho user: chuyển sang `Asia/Ho_Chi_Minh` trước khi format.
- `experienceDate` là `LocalDate` → `"2026-11-20"` (KHÔNG có giờ, KHÔNG timezone).

### 1.5. "Chưa rõ kết quả" ≠ "Thất bại" — quy tắc số 1 của nghiệp vụ

Đây là điểm dễ sai nhất. Backend phân biệt 3 mức:

| Mức | Payment status | Nghĩa là | Frontend phải làm |
|---|---|---|---|
| Đang chạy | `PENDING`, `PROCESSING` | Chưa biết kết quả | **Poll tiếp**, KHÔNG báo "thất bại", KHÔNG cho tạo lần thanh toán mới |
| Thất bại rõ ràng | `FAILED`, `CANCELLED` | Đã xác minh không thành công | Cho phép retry thanh toán |
| Thành công | `SUCCESS` | Đã xác minh (IPN hoặc QueryDR) | Chuyển sang màn hình thành công |

Tương tự cho Refund: `PENDING_REVIEW` / `APPROVED` / `REFUND_PROCESSING` = **chưa xong**, chỉ `REFUNDED` mới là xong.

### 1.6. Idempotency & double-submit

- **Disable nút** trong lúc request đang bay (loading state) — đặc biệt nút "Thanh toán" và "Tạo booking".
- **Không** tạo lại booking khi người dùng bấm lại. Lưu `bookingId` vừa tạo vào state, nếu đã có thì dùng lại.
- Tạo payment lần 2 khi lần 1 chưa rõ kết quả → backend trả `409 PAYMENT_NOT_RETRYABLE`. Xử lý bằng cách **gọi QueryDR** thay vì báo lỗi.

### 1.7. URL thanh toán VNPay

- Backend trả `paymentUrl` (đã ký sẵn chữ ký HMACSHA512).
- **Frontend KHÔNG tự dựng URL**, không thêm/sửa tham số → chữ ký sẽ hỏng.
- Web: `window.location.href = paymentUrl` (redirect).
- Mobile: `url_launcher` mở trình duyệt (không mở in-app webview — VNPay chặn iframe/webview).

---

## 2. THÔNG TIN CHUNG

### 2.1. Base URL

| Môi trường | Base URL |
|---|---|
| Local (Web) | `http://localhost:8088/api/v1` |
| Local (Android emulator) | `http://10.0.2.2:8088/api/v1` |
| Local (iOS simulator) | `http://127.0.0.1:8088/api/v1` |
| Production | `https://<domain>/api/v1` |

Swagger UI: `http://localhost:8088/swagger-ui/index.html`

### 2.2. Auth

| Endpoint | Method | Body | Note |
|---|---|---|---|
| `/auth/login` | POST | `{ "email", "password" }` | Trả `data.accessToken`, `data.refreshToken`, `data.user` |
| `/auth/register` | POST | `{ … }` | Tự đăng nhập, trả token luôn |
| `/auth/google` | POST | `{ "idToken", "role" }` | Google OAuth2 (web/mobile đều dùng chung) |
| `/auth/refresh` | POST | `{ "refreshToken" }` | Trả token mới |
| `/auth/logout` | POST | `{ "refreshToken"? }` | Thu hồi token |
| `/auth/me` | GET | — | Thông tin user hiện tại |

Header: `Authorization: Bearer <accessToken>`

- Access token hết hạn sau **15 phút** (`expiresIn: 900000` ms).
- **Web**: dùng interceptor tự refresh khi gặp 401 (xem `frontend/src/services/apiClient.js` — đã có sẵn pattern này, copy theo).
- **Mobile**: refresh khi nhận 401, sau đó retry request. Lưu token bằng `shared_preferences` (xem `mobile/lib/core/services/token_storage.dart`).

### 2.3. Vai trò (role) và quyền

| Role | Dùng cho |
|---|---|
| `TOURIST` | Đặt tour, thanh toán, xin hoàn tiền, chạy hành trình |
| `PARTNER` | Xem doanh thu, ví, settlement của mình |
| `ADMIN` | Duyệt refund, settlement, financial adjustment, quản lý partner |
| `MODERATOR`, `PROVIDER`, `USER` | Các module khác (không liên quan tài liệu này) |

### 2.4. Tài khoản test (đã seed sẵn khi khởi động backend)

Mật khẩu chung: `Password123@`

| Email | Role |
|---|---|
| `tourist1@journeygo.com` | TOURIST |
| `tourist2@journeygo.com` | TOURIST |
| `partner1@journeygo.com` | PARTNER (hoa hồng 25%) |
| `partner2@journeygo.com` | PARTNER (hoa hồng 20%) |
| `admin@journeygo.com` | ADMIN |

---

## 3. MÔ HÌNH DỮ LIỆU & ENUM

### 3.1. Sơ đồ quan hệ

```
Tour (nhiều Destination)
  └── TourDestination ──> Destination ──> Experience ──> ExperienceSlot (theo ngày)
                                                          ↑
Booking (tourist + tour + experienceDate) ──> BookingSlotHold (giữ chỗ từng slot)
  └── Payment (mỗi lần thử = 1 Payment)
        ├── RefundRequest (tối đa 1 đang mở / payment)
        │     └── RefundAuditLog
        └── PartnerRevenue (mỗi Partner trong tour = 1 bản ghi)
              └── SettlementDetail ──> Settlement ──> WalletTransaction
FinancialAdjustment ──> WalletTransaction
```

### 3.2. BookingStatus

| Status | Nghĩa | Frontend hiển thị |
|---|---|---|
| `PENDING_PAYMENT` | Vừa tạo, đang giữ slot, chờ thanh toán | Badge "Chờ thanh toán" + đếm ngược 10 phút |
| `CONFIRMED` | Đã thanh toán thành công | Badge "Đã xác nhận" + nút "Bắt đầu hành trình" |
| `EXPIRED` | Quá 10 phút, slot đã giải phóng | Badge "Đã hết hạn" + nút "Đặt lại" |
| `CANCELLED` | Bị hủy | Badge "Đã hủy" |
| `COMPLETED` | Đã hoàn thành trải nghiệm | Badge "Đã hoàn thành" |

### 3.3. PaymentStatus

`PENDING` · `PROCESSING` · `SUCCESS` · `FAILED` · `EXPIRED` · `CANCELLED`

### 3.4. RefundStatus

| Status | Nghĩa |
|---|---|
| `PENDING_REVIEW` | Tourist đã gửi, chờ Admin duyệt |
| `APPROVED` | Admin duyệt, đang thực hiện hoàn tiền |
| `REFUND_PROCESSING` | Đã gửi VNPay / đã chuyển khoản, chưa có kết quả cuối |
| `REFUNDED` | ✅ Hoàn tiền thành công (có bằng chứng xác minh) |
| `REJECTED` | Admin từ chối |
| `FAILED` | Thất bại (đã xác minh) |
| `CANCELLED` | Tourist hủy yêu cầu |

### 3.5. RefundReason (quyết định tỷ lệ hoàn)

| Reason | Tỷ lệ hoàn | Ai quyết định |
|---|---|---|
| `TOURIST_FAULT` | **50%** | Tourist khai báo, Admin xác nhận |
| `PLATFORM_FAULT` | **100%** | Tourist khai báo, Admin xác nhận |

> Tourist **KHÔNG tự nhập số tiền**. Backend tự tính `proposedAmount` theo reason.
> Admin có thể điều chỉnh `amount` nhưng backend validate theo chính sách (lệch → `400 REFUND_AMOUNT_MISMATCH`).

### 3.6. RefundMethod

| Method | Ý nghĩa |
|---|---|
| `VNPAY_API` | Phương thức chính — gọi Refund API của VNPay |
| `MANUAL_BANK_TRANSFER` | Dự phòng — Admin chuyển khoản tay rồi upload bằng chứng |

### 3.7. SettlementStatus

`DRAFT` (bản nháp) → `APPROVED` (✅ đã cộng tiền vào ví) / `REJECTED` / `CANCELLED`

### 3.8. PartnerRevenueStatus & DeferredReason

| Status | Nghĩa |
|---|---|
| `PENDING` | Chưa đủ điều kiện tất toán |
| `ELIGIBLE` | ✅ Đủ điều kiện, chờ được chọn vào settlement |
| `IN_SETTLEMENT` | Đang nằm trong 1 đợt tất toán (chưa duyệt) |
| `SETTLED` | ✅ Đã tất toán, tiền đã vào ví |

| DeferredReason | Nghĩa |
|---|---|
| `PAYMENT_NOT_VERIFIED` | Payment chưa xác minh thành công |
| `BOOKING_NOT_COMPLETED` | Chưa hoàn thành trải nghiệm |
| `REFUND_PENDING` | Có refund chưa có kết quả cuối cùng |
| `FINANCIAL_REVIEW_REQUIRED` | Cần đối soát thủ công |

### 3.9. WalletTransaction

| `transactionType` | `direction` | Khi nào |
|---|---|---|
| `SETTLEMENT_CREDIT` | `CREDIT` | Settlement được duyệt → cộng tiền vào ví Partner |
| `REFUND_ADJUSTMENT` | `DEBIT`/`CREDIT` | Refund xảy ra sau khi đã tất toán → khấu trừ hoặc hoàn lại |
| `MANUAL_ADJUSTMENT` | `DEBIT`/`CREDIT` | Khoản điều chỉnh thủ công |

Mỗi giao dịch ví có `balanceBefore` / `balanceAfter` → **dùng để vẽ biểu đồ dòng tiền**.

---

## 4. BẢN ĐỒ API TỔNG THỂ

Base prefix: `/api/v1`

### 4.1. Public (không cần token)

| Method | Path | Mô tả |
|---|---|---|
| GET | `/tours/published` | Danh sách tour đã publish (trang chủ) |
| GET | `/tours/{tourId}` | Chi tiết tour |
| GET | `/experiences/{experienceId}/slots?date=YYYY-MM-DD` | Slot/quota theo ngày |
| GET/POST | `/payments/ipn` | Webhook VNPay (KHÔNG gọi từ frontend) |
| GET | `/payments/return?…` | Xác minh sau khi VNPay redirect về |

### 4.2. Booking (`/bookings`) — TOURIST

| Method | Path | Quyền | Mô tả |
|---|---|---|---|
| POST | `/bookings` | TOURIST/USER/ADMIN | Tạo booking (giữ slot, hạn 10 phút) |
| GET | `/bookings/my` | authenticated | Booking của tôi (phân trang) |
| GET | `/bookings/{bookingId}` | chủ sở hữu / ADMIN | Chi tiết |
| POST | `/bookings/{bookingId}/cancel` | chủ sở hữu / ADMIN | Hủy (chỉ khi chưa thanh toán) |
| GET | `/bookings?status=` | ADMIN | Toàn bộ booking |

### 4.3. Payment (`/payments`)

| Method | Path | Quyền | Mô tả |
|---|---|---|---|
| POST | `/payments/bookings/{bookingId}/init` | TOURIST | Khởi tạo thanh toán, trả `paymentUrl` |
| GET | `/payments/methods` | authenticated | 3 nhóm phương thức + danh sách ngân hàng |
| GET | `/payments/{paymentId}` | chủ sở hữu / ADMIN | Chi tiết giao dịch |
| GET | `/payments/my` | authenticated | Lịch sử thanh toán của tôi |
| GET | `/payments/bookings/{bookingId}` | chủ sở hữu / ADMIN | Các lần thử của 1 booking |
| POST | `/payments/{paymentId}/query` | authenticated | **QueryDR** — xác minh lại với VNPay |
| GET | `/payments?status=` | ADMIN | Toàn bộ giao dịch |
| GET | `/payments/return?…` | public | Xử lý Return URL |

### 4.4. Refund (`/refunds`)

| Method | Path | Quyền | Mô tả |
|---|---|---|---|
| POST | `/refunds` | TOURIST | Gửi yêu cầu hoàn tiền |
| GET | `/refunds/my` | authenticated | Yêu cầu của tôi |
| GET | `/refunds/payments/{paymentId}` | chủ sở hữu / ADMIN | Refund của 1 payment |
| GET | `/refunds/{refundId}` | chủ sở hữu / ADMIN | Chi tiết + audit log |
| GET | `/refunds/code/{refundCode}` | authenticated | Tra cứu theo mã |
| GET | `/refunds?status=` | ADMIN | Toàn bộ yêu cầu |
| POST | `/refunds/{refundId}/review` | ADMIN | Duyệt / từ chối |
| POST | `/refunds/{refundId}/manual-transfer` | ADMIN | Ghi nhận chuyển khoản tay |
| POST | `/refunds/{refundId}/refresh-status` | ADMIN | Poll trạng thái từ VNPay |

### 4.5. Settlement / Wallet / Revenue / Partner

| Method | Path | Quyền | Mô tả |
|---|---|---|---|
| GET | `/settlements/candidates?partnerId=&revenuePeriod=` | ADMIN/PARTNER | Ứng viên tất toán (đánh giá 8 điều kiện) |
| POST | `/settlements` | ADMIN | Tạo bản nháp đợt tất toán |
| POST | `/settlements/{id}/approve` | ADMIN | Duyệt (atomic: cộng tiền ví) |
| POST | `/settlements/{id}/reject` | ADMIN | Từ chối (giải phóng doanh thu) |
| GET | `/settlements/{id}` | ADMIN/PARTNER | Chi tiết |
| GET | `/settlements/{id}/details` | ADMIN/PARTNER | Chi tiết từng khoản doanh thu |
| GET | `/settlements?status=` | ADMIN | Toàn bộ |
| GET | `/settlements/partner/{partnerId}` | ADMIN/PARTNER | Settlement của 1 đối tác |
| GET | `/wallets/partner/{partnerId}` | ADMIN/PARTNER | Số dư ví |
| GET | `/wallets/{walletId}` | ADMIN/PARTNER | Chi tiết ví |
| GET | `/wallets/partner/{partnerId}/transactions` | ADMIN/PARTNER | Lịch sử giao dịch ví |
| GET | `/wallets/{walletId}/transactions` | ADMIN/PARTNER | Lịch sử theo walletId |
| GET | `/partner-revenues/partners/{partnerId}` | ADMIN/PARTNER | Doanh thu của đối tác |
| GET | `/partner-revenues?status=` | ADMIN | Doanh thu theo trạng thái |
| GET | `/partner-revenues/bookings/{bookingId}` | ADMIN/PARTNER | Doanh thu sinh ra từ 1 booking |
| GET | `/partner-revenues/{revenueId}` | ADMIN/PARTNER | Chi tiết khoản doanh thu |
| GET | `/partner-revenues/{revenueId}/eligibility` | ADMIN/PARTNER | **8 điều kiện tất toán** |
| POST | `/financial-adjustments` | ADMIN | Tạo khoản điều chỉnh |
| POST | `/financial-adjustments/{id}/approve` | ADMIN | Duyệt → áp vào ví |
| POST | `/financial-adjustments/{id}/reject?reason=` | ADMIN | Từ chối |
| GET | `/financial-adjustments/{id}` | ADMIN/PARTNER | Chi tiết |
| GET | `/financial-adjustments?status=` | ADMIN | Toàn bộ |
| GET | `/financial-adjustments/partner/{partnerId}` | ADMIN/PARTNER | Của 1 đối tác |
| GET | `/partners/active` | ADMIN/PROVIDER/PARTNER | Danh sách đối tác đang hoạt động |
| GET | `/partners/by-user/{userId}` | ADMIN/PARTNER | Tìm Partner theo user (dùng để lấy partnerId của chính mình) |
| GET | `/partners/{partnerId}` | ADMIN/PARTNER | Chi tiết đối tác |

---

## 5. LUỒNG A — CHỌN TOUR → BOOKING

### 5.1. Tổng quan

```
Trang danh sách tour (public)
   ↓ GET /tours/published
Trang chi tiết tour
   ↓ GET /tours/{tourId} + GET /experiences/{expId}/slots?date=…
Chọn ngày trải nghiệm
   ↓ (nếu không có slot cho ngày đó → chặn, không cho đặt)
Chọn phương thức thanh toán
   ↓ GET /payments/methods
Bấm "Đặt tour & thanh toán"
   ↓ POST /bookings  → bookingId, bookingCode, totalAmount, paymentDeadline
Màn hình thanh toán (đếm ngược 10 phút)
   ↓ POST /payments/bookings/{bookingId}/init → paymentUrl
```

### 5.2. `GET /tours/published`

Query: `page` (0-based), `size`, `sort`.

```json
{
  "code": 200,
  "message": "…",
  "data": {
    "page": 0, "size": 10, "totalElements": 2, "totalPages": 1,
    "first": true, "last": true,
    "content": [
      {
        "tourId": 1,
        "title": "Hành trình Tràng An 2 ngày 1 đêm",
        "tourType": "ECOTOURISM",
        "price": 1500000,
        "durationDays": 2,
        "approved": true,
        "status": "PUBLISHED",
        "rejectionReason": null,
        "deleted": false,
        "deletedAt": null,
        "destinationCount": 3,
        "destinations": [
          { "destinationId": 3, "destinationName": "Bát Tràng", "sequenceOrder": 1 }
        ],
        "createdBy": "Ban Quản lý Tràng An",
        "createdAt": "2026-10-01T02:00:00Z",
        "updatedAt": "2026-10-01T02:00:00Z"
      }
    ]
  }
}
```

> **Giá tour (`price`)**: backend tính động = tổng giá các Experience của các điểm đến trong hành trình.
> Frontend **không tự tính lại** và cũng không gửi `price` khi tạo/update tour.

### 5.3. Kiểm tra slot trước khi cho đặt (QUAN TRỌNG)

`GET /experiences/{experienceId}/slots?date=2026-11-20`

```json
{
  "code": 200,
  "data": [
    {
      "id": 12, "experienceId": 5, "destinationId": 4,
      "slotDate": "2026-11-20",
      "maxTourPerDay": 20, "bookedTourCount": 3, "remaining": 17,
      "status": "AVAILABLE", "createdAt": "…"
    }
  ]
}
```

**Quy tắc UI:**
- Một tour có N điểm đến → cần slot của **N experience** tương ứng.
- Chỉ cho đặt khi **tất cả** slot có `remaining > 0` và `status` cho phép đặt.
- Ngày không có slot → disable date picker, hiển thị "Chưa mở bán trải nghiệm cho ngày này".
- Slot hết chỗ → hiển thị "Đã hết chỗ" (server cũng trả `409 BOOKING_SLOT_FULL`).

### 5.4. `GET /payments/methods` — 3 nhóm phương thức

```json
{
  "code": 200,
  "data": {
    "methods": [
      {
        "bankCode": "VNPAYQR", "code": "QR_APP_WALLET",
        "label": "Ứng dụng Ngân hàng và Ví điện tử",
        "description": "Quét mã QR bằng ứng dụng Mobile Banking hoặc ví điện tử liên kết VNPay-QR (MoMo, ZingPay, VNPay, Viettel Pay, VCB Digibank…)",
        "cardType": "QRCODE", "displayOrder": 1
      },
      {
        "bankCode": "VNBANK", "code": "DOMESTIC_CARD",
        "label": "Thẻ nội địa và tài khoản ngân hàng",
        "description": "Thanh toán bằng thẻ ATM nội địa hoặc tài khoản ngân hàng (Internet Banking, Mobile Banking của các ngân hàng Việt Nam)",
        "cardType": "ATM", "displayOrder": 2
      },
      {
        "bankCode": "INTCARD", "code": "INTERNATIONAL_CARD",
        "label": "Thẻ thanh toán quốc tế",
        "description": "Thanh toán bằng thẻ quốc tế Visa, Mastercard, JCB, UnionPay",
        "cardType": null, "displayOrder": 3
      }
    ],
    "bankGroups": [
      { "methodCode": "QR_APP_WALLET", "label": "Ứng dụng Ngân hàng và Ví điện tử",
        "banks": [ { "bankCode": "MOMO", "bankName": "Ví MoMo", "bankType": 1, "logoUrl": null } ] },
      { "methodCode": "DOMESTIC_CARD", "label": "Thẻ nội địa và tài khoản ngân hàng",
        "banks": [ { "bankCode": "NCB", "bankName": "Ngân hàng NCB", "bankType": 2, "logoUrl": null } ] },
      { "methodCode": "INTERNATIONAL_CARD", "label": "Thẻ thanh toán quốc tế",
        "banks": [] }
    ],
    "bankCodeSent": false
  }
}
```

**Cách dùng:**
- `bankCodeSent: false` ⇒ URL thanh toán **không** chứa `vnp_BankCode` ⇒ khách tự chọn trên trang VNPay.
  → **Đây là hành vi mặc định và khuyến nghị.** UI chỉ cần hiển thị 3 lựa chọn (icon + label + mô tả), KHÔNG cần gửi `bankCode`.
- `bankGroups[].banks` là danh sách ngân hàng chi tiết (lấy động từ API `get_bank_list` của VNPay) — dùng để hiển thị logo/chi tiết nếu muốn. **Có thể rỗng** nếu gọi VNPay lỗi → UI vẫn phải hoạt động với 3 nhóm.
- Nếu muốn **pre-select** phương thức: truyền `?bankCode=VNPAYQR|VNBANK|INTCARD` khi gọi init (mục 6.3).

### 5.5. `POST /bookings` — tạo booking

**Body:**
```json
{ "tourId": 1, "experienceDate": "2026-11-20" }
```

**Response (201):**
```json
{
  "code": 201,
  "message": "Đặt tour thành công",
  "data": {
    "id": 18, "bookingCode": "JG18-5276C0D8",
    "touristId": 2, "touristName": "Nguyễn Văn A",
    "tourId": 1, "tourTitle": "Hành trình Tràng An 2 ngày 1 đêm",
    "experienceDate": "2026-11-20",
    "totalAmount": 1500000, "currency": "VND",
    "status": "PENDING_PAYMENT",
    "createdAt": "2026-10-28T02:00:00Z",
    "paymentDeadline": "2026-10-28T02:10:00Z",
    "paidAt": null, "confirmedAt": null, "completedAt": null,
    "cancellationReason": null,
    "slotHolds": [
      { "id": 30, "experienceSlotId": 12, "experienceId": 5,
        "slotDate": "2026-11-20", "released": false,
        "heldAt": "2026-10-28T02:00:00Z", "releasedAt": null }
    ]
  }
}
```

**Lưu ý:**
- `totalAmount` là giá **đã chốt** tại thời điểm đặt. Dùng đúng số này khi hiển thị & thanh toán — không tự tính lại từ tour (giá có thể đã đổi).
- `paymentDeadline` = `createdAt + 10 phút`. **UI bắt buộc có đếm ngược** theo field này.
- `slotHolds` cho biết slot nào đã giữ.

**Lỗi thường gặp:**

| HTTP | `code` | message | Xử lý UI |
|---|---|---|---|
| 400 | `BOOKING_TOUR_NOT_AVAILABLE` | Tour chưa được xuất bản | Quay lại trang tour |
| 400 | `BOOKING_INVALID_DATE` | Ngày trải nghiệm không hợp lệ | Bắt chọn ngày khác |
| 400 | `BOOKING_SLOT_NOT_FOUND` | Chưa mở bán trải nghiệm cho ngày này | Disable ngày đó |
| 409 | `BOOKING_SLOT_FULL` | Trải nghiệm đã hết chỗ cho ngày này | Báo hết chỗ |
| 400 | `BOOKING_NO_AVAILABLE_EXPERIENCE` | Tour không có trải nghiệm khả dụng | Báo lỗi |

### 5.6. `GET /bookings/my` — danh sách booking của tôi

Query: `page` (0-based), `size`, `sort=createdAt,desc`.

Dùng cho màn hình **"Chuyến đi của tôi"** / **"Đơn của tôi"**.
Phân trang: `data.totalPages`, `data.content`.

### 5.7. `POST /bookings/{bookingId}/cancel`

Body (optional): `{ "reason": "Không còn thời gian" }`

Chỉ hủy được khi `status = PENDING_PAYMENT`. Slot được giải phóng tự động.

| HTTP | message | Ý nghĩa |
|---|---|---|
| 409 | `Booking đã thanh toán — không thể hủy trực tiếp` | Đã thanh toán → phải xin refund |
| 409 | `Trạng thái Booking không cho phép hủy` | Đã EXPIRED/COMPLETED |

---

## 6. LUỒNG B — PAYMENT (VNPAY 2.1.0)

### 6.1. Mô hình chu kỳ thanh toán

```
Tourist                     Backend                     VNPay
   │  POST /payments/bookings/{id}/init                        │
   │ ───────────────────────► │  tạo Payment(PENDING)        │
   │                          │  ký URL (HMACSHA512)          │
   │ ◄─────────────────────── │  {paymentUrl, txnRef, ...}    │
   │                                                        │
   │  mở paymentUrl ────────────────────────────────────────► │
   │                          │                        │  khách thanh toán
   │                          │  ◄──── IPN (webhook) ── │  server-to-server
   │                          │  xác minh chữ ký, cập nhật Payment=SUCCESS, Booking=CONFIRMED
   │  GET /payments/return?… ─────────────────────────► │  redirect
   │                          │  xác minh → QueryDR nếu chưa rõ
   │  poll GET /payments/{paymentId}                       │
```

**Điểm mấu chốt:**
- **IPN là nguồn xác minh chính** (server-to-server, không phụ thuộc client).
- **Return URL KHÔNG đáng tin** — chỉ để UX. Backend tự QueryDR nếu chưa rõ kết quả.
- Client **phải poll** trạng thái cho tới khi có kết quả cuối cùng.

### 6.2. `POST /payments/bookings/{bookingId}/init`

Query: `bankCode` (optional).

**Response (201):**
```json
{
  "code": 201,
  "message": "Khởi tạo thanh toán thành công",
  "data": {
    "paymentId": 12,
    "bookingId": 18,
    "bookingCode": "JG18-5276C0D8",
    "txnRef": "JG18-5276C0D83D484F6184FF",
    "amount": 1500000,
    "currency": "VND",
    "paymentUrl": "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?vnp_Amount=150000000&vnp_Command=pay&vnp_CreatedAt=…&vnp_TxnRef=…&vnp_HashSecret=…",
    "expiresAt": "2026-10-28T02:10:00Z",
    "selectedBankCode": null,
    "availableMethods": [ /* giống /payments/methods */ ],
    "message": "Vui lòng thanh toán trong vòng 10 phút để giữ chỗ"
  }
}
```

**Quy tắc:**
- `txnRef` = mã tham chiếu, dùng để đối soát với Merchant Admin của VNPay.
- Mỗi lần gọi init tạo **một payment attempt mới** với `txnRef` riêng.
- **Không gia hạn** deadline của booking (không có "extend").
- Nếu lần trước chưa rõ kết quả → backend tự QueryDR trước; nếu vẫn chưa rõ → `409 PAYMENT_NOT_RETRYABLE`.
  → **UI xử lý 409 này bằng cách gọi QueryDR**, không phải báo "lỗi".

### 6.3. Pre-select phương thức (tuỳ chọn)

```
POST /api/v1/payments/bookings/18/init?bankCode=VNPAYQR
```

`bankCode` nhận: `VNPAYQR` · `VNBANK` · `INTCARD` — hoặc mã ngân hàng cụ thể (`MB`, `VCB`, `MOMO`…).

→ `selectedBankCode` trong response sẽ echo lại giá trị đó.

### 6.4. Sau khi thanh toán — Return URL

VNPay redirect về `VNPAY_RETURN_URL` (cấu hình ở backend, trỏ tới trang web của bạn) kèm query string `vnp_Amount, vnp_TxnRef, vnp_ResponseCode, vnp_TransactionStatus, vnp_BankCode, vnp_TransactionNo, vnp_SecureHash, vnp_TxnStatus…`

**Cách xử lý (khuyến nghị):**

```
Trang Return của frontend
   ↓ đọc toàn bộ query string, gửi lại backend:
GET /api/v1/payments/return?<giữ nguyên query string>
   ↓ backend xác minh chữ ký + QueryDR nếu chưa rõ
   ↓ trả PaymentVerificationResponse
```

**Response:**
```json
{
  "code": 200,
  "message": "Xử lý kết quả thanh toán",
  "data": {
    "status": "SUCCESS",
    "txnRef": "JG18-5276C0D83D484F6184FF",
    "amount": 1500000,
    "vnpTransactionNo": "15716761",
    "bookingStatus": "CONFIRMED",
    "message": "Thanh toán thành công"
  }
}
```

> Endpoint `/payments/return` là **public** (không cần token) vì redirect từ VNPay không mang header Authorization.
> Nhưng backend vẫn xác minh chữ ký `vnp_SecureHash` → an toàn.

### 6.5. Poll trạng thái — `GET /payments/{paymentId}`

```json
{
  "code": 200,
  "data": {
    "id": 12, "bookingId": 18, "bookingCode": "JG18-5276C0D8",
    "txnRef": "JG18-5276C0D83D484F6184FF",
    "vnpTransactionNo": "15716761",
    "method": "VNPAY",
    "bankCode": "NCB",
    "cardType": "ATM",
    "status": "SUCCESS",
    "amount": 1500000, "currency": "VND",
    "createdAt": "…", "expiresAt": "…", "paidAt": "2026-10-28T02:03:11Z",
    "paymentUrl": "…",
    "duplicatePayment": false,
    "ipnCount": 1,
    "vnpResponseCode": "00",
    "vnpTransactionStatus": "00",
    "vnpMessage": null,
    "note": null
  }
}
```

**Chiến lược poll chuẩn (áp dụng cả Web & Mobile):**

```
Mở màn hình "Đang chờ thanh toán"
   ↓
vòng lặp mỗi 2–3 giây, tối đa ~10 phút (bằng paymentDeadline):
    GET /payments/{paymentId}
    if status == SUCCESS        → màn hình THÀNH CÔNG
    if status == FAILED | CANCELLED → màn hình THẤT BẠI + nút "Thử lại"
    if status == EXPIRED        → màn hình HẾT HẠN
    else                        → tiếp tục poll
   ↓ hết giờ mà vẫn PENDING/PROCESSING:
    POST /payments/{paymentId}/query   (QueryDR)
    → SUCCESS / FAILED / CANCELLED / DUPLICATE / UNKNOWN
    → UNKNOWN thì tiếp tục poll, tuyệt đối KHÔNG kết luận thất bại
```

**Dừng poll khi:** người dùng rời màn hình (Web: `beforeunload`/cleanup effect; Mobile: `dispose`), hoặc đã hết deadline.

### 6.6. `POST /payments/{paymentId}/query` — QueryDR

Gọi trực tiếp API `querydr` của VNPay để xác minh giao dịch.

```json
{
  "code": 200,
  "message": "Truy vấn kết quả giao dịch",
  "data": {
    "outcome": "SUCCESS",
    "message": "Giao dịch đã được xác minh thành công"
  }
}
```

| `outcome` | Nghĩa | UI |
|---|---|---|
| `SUCCESS` | Xác minh thành công | Sang màn hình thành công |
| `FAILED` | Xác minh thất bại | Báo thất bại + cho retry |
| `CANCELLED` | Khách đã hủy trên VNPay | Báo khách hủy |
| `DUPLICATE` | Giao dịch trùng, đã xử lý trước đó | Lấy trạng thái payment hiện tại |
| `UNKNOWN` | Chưa xác minh được | **Tiếp tục poll**, không kết luận thất bại |

### 6.7. Trạng thái `duplicatePayment`

Khi khách thanh toán trùng (đã có payment SUCCESS khác cho booking đó), backend đánh dấu payment mới là `duplicatePayment = true` và **không** xác nhận booking.

→ UI: hiển thị "Giao dịch này trùng với giao dịch đã thanh toán" → hướng dẫn vào đơn đã thanh toán.

### 6.8. Hiển thị QR (nếu muốn)

VNPay không trả QR image riêng. Hai lựa chọn:

1. **Đơn giản & khuyến nghị**: hiển thị nút "Thanh toán" → mở `paymentUrl`. Trên mobile, khách quét QR bằng app ngân hàng.
2. **Render QR từ `paymentUrl`**: dùng thư viện QR client-side (web: `qrcode.react` / `react-qr-code`; mobile: `qr_flutter`). **Chỉ encode URL**, không đụng vào query params.

> Số tiền trên QR = `vnp_Amount` đã ×100 (do backend ký sẵn). Không tự nhân thêm.

---

## 7. LUỒNG C — REFUND

### 7.1. Khi nào cho phép xin hoàn tiền

Điều kiện (backend kiểm tra, frontend nên phản ánh để UX tốt):

1. Payment `status = SUCCESS` **và** có `paidAt`.
2. Còn trong vòng **24 giờ** kể từ `paidAt` (`REFUND_WINDOW_HOURS`, cấu hình được).
3. Payment chưa có refund đang mở (`PENDING_REVIEW`/`APPROVED`/`REFUND_PROCESSING`) hoặc đã hoàn tất.
4. Tổng số tiền hoàn không vượt quá số tiền đã thanh toán.

→ Trên màn hình chi tiết đơn, **ẩn nút "Yêu cầu hoàn tiền"** nếu `paidAt` quá 24h, và hiển thị lý do.

### 7.2. `POST /refunds` — Tourist gửi yêu cầu

**Body:**
```json
{
  "paymentId": 12,
  "reason": "TOURIST_FAULT",
  "reasonDetail": "Khách không thể đi do thời tiết xấu, đề nghị hoàn một phần",
  "evidence": "Ảnh vé máy bay đã hủy (URL)",
  "bankAccountNumber": "0123456789",
  "bankAccountName": "NGUYEN VAN A",
  "bankName": "MB Bank"
}
```

| Field | Bắt buộc | Ghi chú |
|---|---|---|
| `paymentId` | ✅ | Payment đã thanh toán thành công |
| `reason` | ✅ | `TOURIST_FAULT` \| `PLATFORM_FAULT` |
| `reasonDetail` | ✅ | ≤ 2000 ký tự |
| `evidence` | ❌ | ≤ 5000 ký tự — URL ảnh hoặc mô tả |
| `bankAccountNumber` / `bankAccountName` / `bankName` | ❌ | **Bắt buộc** nếu Admin chọn `MANUAL_BANK_TRANSFER` |

> ⚠️ **Số tiền KHÔNG do tourist nhập.** Backend tự tính `proposedAmount` = `amount × 50%` hoặc `× 100%` theo `reason`.

**Response (201):**
```json
{
  "code": 201,
  "message": "Gửi yêu cầu hoàn tiền thành công",
  "data": {
    "id": 3, "refundCode": "RFFD2182BEC02E43A5BA4A",
    "paymentId": 12, "txnRef": "JG18-5276C0D83D484F6184FF", "bookingId": 18, "touristId": 5,
    "status": "PENDING_REVIEW",
    "declaredReason": "TOURIST_FAULT", "approvedReason": null,
    "reasonDetail": "Khách không thể đi do thời tiết xấu, đề nghị hoàn một phần",
    "proposedAmount": 750000, "approvedAmount": null, "refundedAmount": null,
    "currency": "VND", "method": null,
    "reviewedBy": null, "reviewedAt": null, "rejectionReason": null,
    "vnpRequestId": null, "vnpTransactionNo": null,
    "vnpResponseCode": null, "vnpTransactionStatus": null, "vnpMessage": null,
    "vnpRequestedAt": null, "vnpResolvedAt": null,
    "bankAccountNumber": "0123456789", "bankAccountName": "NGUYEN VAN A", "bankName": "MB Bank",
    "transferReference": null, "transferEvidence": null, "transferredAt": null,
    "createdAt": "2026-10-27T18:14:11Z",
    "auditLogs": []
  }
}
```

**Lỗi thường gặp:**

| HTTP | message | UI |
|---|---|---|
| 400 | `Chỉ được hoàn tiền cho giao dịch đã thanh toán thành công` | Ẩn nút |
| 400 | `Đã quá thời hạn 24 giờ…` | Hiển thị hạn chót |
| 409 | `Giao dịch này đã có yêu cầu hoàn tiền đang xử lý hoặc đã hoàn tất` | Link tới refund đó |

### 7.3. Tourist theo dõi — `GET /refunds/my`

Hiển thị dạng timeline/tracking:
- `PENDING_REVIEW` → "Đang chờ quản trị viên xét duyệt"
- `APPROVED` / `REFUND_PROCESSING` → "Đang xử lý hoàn tiền"
- `REFUNDED` → "✅ Đã hoàn tiền {refundedAmount}"
- `REJECTED` → "❌ Đã từ chối: {rejectionReason}"

### 7.4. Admin duyệt — `POST /refunds/{refundId}/review`

**Body (duyệt):**
```json
{
  "approve": true,
  "reason": "TOURIST_FAULT",
  "amount": 750000,
  "method": "VNPAY_API",
  "note": "Xác nhận lý do thời tiết, hoàn 50%"
}
```

**Body (từ chối):**
```json
{ "approve": false, "rejectionReason": "Không đủ bằng chứng, đề nghị bổ sung" }
```

**Hành vi:**
- `amount` = số tiền **Admin duyệt**. Backend validate theo chính sách của `reason`:
  - `TOURIST_FAULT` → tối đa 50%
  - `PLATFORM_FAULT` → tối đa 100%
  - Lệch → `400 REFUND_AMOUNT_MISMATCH`
- `method = VNPAY_API` → gửi yện cầu hoàn ngay tới VNPay, giữ `REFUND_PROCESSING` tới khi xác minh được kết quả cuối.
- `method = MANUAL_BANK_TRANSFER` → chuyển sang `APPROVED`, Admin chuyển khoản tay rồi gọi `/manual-transfer`.

**Response:** `RefundResponse` với `status`, `approvedAmount`, `reviewedBy`, `reviewedAt`, `vnpResponseCode`…

### 7.5. Poll trạng thái refund — `POST /refunds/{refundId}/refresh-status` (ADMIN)

Gọi lại VNPay để xác minh kết quả hoàn tiền.
- Chỉ chuyển `REFUNDED` khi xác minh được thành công.
- Nếu chưa xác minh được → giữ nguyên `REFUND_PROCESSING`.

> **Chỉ ADMIN gọi được.** Tourist dùng `GET /refunds/{refundId}` để poll (endpoint này public-với-token và trả về đầy đủ).

### 7.6. Manual Bank Transfer — `POST /refunds/{refundId}/manual-transfer` (ADMIN)

**Body:**
```json
{
  "transferReference": "FT20261028-00123",
  "transferEvidence": "https://res.cloudinary.com/.../transfer.png",
  "transferredAt": "2026-10-28T03:00:00Z"
}
```

Chỉ chuyển `REFUNDED` khi **có bằng chứng xác minh**. Nếu yêu cầu đã gửi tới VNPay mà chưa xác minh được kết quả → `409 REFUND_METHOD_NOT_ALLOWED` (chống hoàn tiền 2 lần).

Thiếu thông tin tài khoản → `400 REFUND_BANK_INFO_REQUIRED`.

### 7.7. Audit log — `GET /refunds/{refundId}`

```json
"auditLogs": [
  { "id": 1, "action": "CREATED", "fromStatus": null, "toStatus": "PENDING_REVIEW",
    "amount": 750000, "reference": null, "detail": "Tourist gửi yêu cầu", "createdAt": "…" },
  { "id": 2, "action": "APPROVED", "fromStatus": "PENDING_REVIEW", "toStatus": "REFUND_PROCESSING",
    "amount": 750000, "reference": "…", "detail": "Gửi yêu cầu hoàn tiền tới VNPay", "createdAt": "…" }
]
```

→ Hiển thị timeline "Lịch sử xử lý" cho cả Tourist và Admin.

### 7.8. Ảnh hưởng tới doanh thu Partner

Khi refund `REFUNDED`:
- `PartnerRevenue.refundAmount` tăng → `partnerNetAmount` giảm → ảnh hưởng settlement.
- Nếu refund xảy ra **sau khi đã settlement** → hệ thống tự sinh `FinancialAdjustment` (mục 9).

---

## 8. LUỒNG D — SETTLEMENT & WALLET (ADMIN/PARTNER)

> Phần này chủ yếu dành cho **web admin** (`/admin/finance`) và **web/mobile partner**. Tourist không cần.

### 8.1. Bước 1 — Xem ứng viên tất toán

`GET /settlements/candidates?partnerId=2&revenuePeriod=2026-09`

```json
{
  "code": 200,
  "data": {
    "partnerId": 2, "revenuePeriod": "2026-09",
    "eligible": [
      { "id": 15, "partnerId": 2, "partnerName": "Ban Quản lý Tràng An",
        "bookingId": 11, "bookingCode": "JGSAMPLE01", "paymentId": 11,
        "txnRef": "JGSAMPLE01-TXN", "revenuePeriod": "2026-09",
        "completedDate": "2026-09-15",
        "grossAmount": 900000, "refundAmount": 0,
        "commissionRate": 0.2500, "commissionAmount": 225000,
        "adjustmentAmount": 0, "partnerNetAmount": 675000,
        "status": "ELIGIBLE", "deferredReason": null, "settlementId": null,
        "eligibleAt": "2026-10-01T02:00:00Z", "settledAt": null, "createdAt": "…" }
    ],
    "held": [
      { "revenueId": 17, "bookingId": 15, "revenuePeriod": "2026-09",
        "partnerNetAmount": 450000, "deferredReason": "REFUND_PENDING" }
    ],
    "totals": {
      "grossAmount": 900000, "refundAmount": 0, "commissionAmount": 225000,
      "adjustmentAmount": 0, "settlementAmount": 675000
    }
  }
}
```

**UI:**
- Cột "Đủ điều kiện" (eligible) — nút "Tạo đợt tất toán".
- Cột "Đang giữ" (held) — hiển thị `deferredReason` bằng label tiếng Việt:
  - `PAYMENT_NOT_VERIFIED` → "Chờ xác minh thanh toán"
  - `BOOKING_NOT_COMPLETED` → "Chưa hoàn thành trải nghiệm"
  - `REFUND_PENDING` → "Đang chờ xử lý hoàn tiền"
  - `FINANCIAL_REVIEW_REQUIRED` → "Cần đối soát thủ công"

### 8.2. Bước 2 — 8 điều kiện đủ tư cách

`GET /partner-revenues/{revenueId}/eligibility`

```json
{
  "code": 200,
  "data": {
    "eligible": true,
    "deferredReason": null,
    "checks": [
      { "code": "1_PAYMENT_VERIFIED",   "description": "Payment thành công đã được xác minh", "passed": true, "detail": "OK" },
      { "code": "2_BOOKING_COMPLETED",  "description": "Booking đã hoàn thành trải nghiệm",  "passed": true, "detail": "OK" },
      { "code": "3_NO_PENDING_REFUND", "description": "Không có Refund chưa có kết quả cuối cùng", "passed": true, "detail": "OK" },
      { "code": "4_REFUND_APPLIED",    "description": "Số tiền Refund thành công đã được cập nhật", "passed": true, "detail": "refundAmount=0 / đã hoàn thành=0" },
      { "code": "5_NO_RECONCILIATION_ISSUE", "description": "Không có vấn đề đối soát tài chính", "passed": true, "detail": "OK" },
      { "code": "6_NOT_SETTLED",        "description": "Chưa thuộc Settlement đang xử lý hoặc đã duyệt", "passed": true, "detail": "status=ELIGIBLE" },
      { "code": "7_CALCULATED",         "description": "Hoa hồng và doanh thu Partner đã được tính", "passed": true, "detail": "commission=225000, net=675000" },
      { "code": "8_POSITIVE_NET",       "description": "Doanh thu còn lại sau Refund và điều chỉnh lớn hơn 0", "passed": true, "detail": "partnerNet=675000" }
    ]
  }
}
```

→ Render thành checklist 8 dòng (✔ / ✘) cho Admin.

### 8.3. Bước 3 — Tạo bản nháp settlement

`POST /settlements`
```json
{ "partnerId": 2, "revenuePeriod": "2026-09", "note": "Tất toán tháng 9/2026" }
```

- `revenuePeriod` format `yyyy-MM`, **phải là kỳ đã kết thúc** → nếu không: `400 SETTLEMENT_PERIOD_NOT_CLOSED`.
- Các khoản eligible được chọn → chuyển `IN_SETTLEMENT` (không thể bị chọn vào đợt khác).
- Trùng kỳ đã có settlement → `409 SETTLEMENT_ALREADY_EXISTS`.

**Response:** `SettlementResponse` với `grossAmount`, `refundAmount`, `commissionAmount`, `adjustmentAmount`, `settlementAmount`, `status: DRAFT`.

### 8.4. Bước 4 — Chi tiết đợt tất toán

`GET /settlements/{settlementId}/details` → `List<SettlementDetailResponse>`

```json
[
  { "id": 5, "settlementId": 1, "partnerRevenueId": 15,
    "bookingId": 11, "bookingCode": "JGSAMPLE01", "paymentId": 11, "txnRef": "JGSAMPLE01-TXN",
    "revenuePeriod": "2026-09",
    "grossAmount": 900000, "refundAmount": 0,
    "commissionRate": 0.2500, "commissionAmount": 225000,
    "adjustmentAmount": 0, "partnerNetAmount": 675000,
    "status": "IN_SETTLEMENT" }
]
```

→ Bảng đối soát: cột Booking / Gross / Refund / Hoa hồng / Điều chỉnh / Partner nhận.

### 8.5. Bước 5 — Duyệt (ATOMIC)

`POST /settlements/{settlementId}/approve`

- Đánh giá lại 8 điều kiện. Nếu điều kiện đã thay đổi → `409 SETTLEMENT_ELIGIBILITY_CHANGED` → UI bắt Admin tạo lại.
- Trong **cùng 1 transaction**: settlement → `APPROVED`, các `PartnerRevenue` → `SETTLED`, tạo `WalletTransaction` `SETTLEMENT_CREDIT` cộng vào ví Partner.
- Lỗi một bước → rollback toàn bộ.
- Duyệt lần 2 → `409 SETTLEMENT_ALREADY_APPROVED`.

### 8.6. Bước 6 — Từ chối

`POST /settlements/{settlementId}/reject`
```json
{ "reason": "Sai lệch đối soán với báo cáo VNPay" }
```

- Giải phóng các khoản doanh thu về `ELIGIBLE`/`PENDING`. **KHÔNG** ghi tiền vào ví.
- Settlement đã `APPROVED` **không** từ chối được → phải dùng Financial Adjustment.

### 8.7. Ví Partner

`GET /wallets/partner/{partnerId}`
```json
{ "code": 200, "data": { "id": 2, "partnerId": 2, "partnerName": "Ban Quản lý Tràng An",
  "balance": 625000, "currency": "VND", "createdAt": "…", "updatedAt": "…" } }
```

`GET /wallets/partner/{partnerId}/transactions?page=0&size=20`
```json
{ "code": 200, "data": { "page": 0, "size": 20, "totalElements": 2, "totalPages": 1,
  "first": true, "last": true, "content": [
    { "id": 9, "walletId": 2, "transactionType": "SETTLEMENT_CREDIT", "direction": "CREDIT",
      "amount": 675000, "balanceBefore": 0, "balanceAfter": 675000,
      "sourceType": "SETTLEMENT", "sourceId": 1, "status": "COMPLETED",
      "createdBy": 1, "note": "Tất toán kỳ 2026-09", "createdAt": "…" },
    { "id": 10, "walletId": 2, "transactionType": "REFUND_ADJUSTMENT", "direction": "DEBIT",
      "amount": 50000, "balanceBefore": 675000, "balanceAfter": 625000,
      "sourceType": "FINANCIAL_ADJUSTMENT", "sourceId": 1, "status": "COMPLETED",
      "createdBy": 1, "note": "Bồi hoàn chi phí vận hành", "createdAt": "…" }
  ] } }
```

> ⚠️ **Số dư ví ≠ tiền đã về tài khoản ngân hàng.** Ví là quyền lợi tài chính đã được ghi nhận.
> UI cần disclaimer này (backend đã ghi rõ trong `@Operation`).

---

## 9. LUỒNG E — FINANCIAL ADJUSTMENT

Dùng cho: refund phát sinh **sau khi** đã settlement, hoặc bồi hoàn chi phí cho Partner.

### 9.1. `POST /financial-adjustments`
```json
{ "partnerId": 2, "refundRequestId": 3, "sourceSettlementId": 1,
  "amount": -50000, "reason": "Hoàn 50% doanh thu vì refund sau khi tất toán" }
```

- `amount` **dương = cộng, âm = trừ**.
- Mỗi refund chỉ có 1 khoản điều chỉnh đang mở.
- Status: `PENDING` → cần duyệt.

### 9.2. `POST /financial-adjustments/{id}/approve`

Tạo `WalletTransaction` tương ứng (`MANUAL_ADJUSTMENT` hoặc `REFUND_ADJUSTMENT`).
- Nếu số dư **không đủ** để khấu trừ → ghi nhận giao dịch `PENDING` (khoản phải thu) thay vì tạo số dư âm → `409 WALLET_INSUFFICIENT_BALANCE` khi thực sự không thể.
- Số tiền vượt số dư vẫn được ghi nhận, UI hiển thị trạng thái "chờ thu hồi".

### 9.3. `POST /financial-adjustments/{id}/reject?reason=...`

Không ảnh hưởng số dư ví.

---

## 10. HƯỚNG DẪN RIÊNG CHO WEB (NEXT.JS)

### 10.1. Service layer — tạo file mới

**File: `frontend/src/features/booking/services/bookingService.js`**

```javascript
import { apiClient } from "@/services/apiClient";

const ENDPOINTS = {
  ROOT: "/bookings",
  MY: "/bookings/my",
  BY_ID: (id) => `/bookings/${id}`,
  CANCEL: (id) => `/bookings/${id}/cancel`,
};

async function unwrap(res) {
  return res?.data ?? res;
}

/** Bóc mảng từ Page response: data.content */
async function extractList(res) {
  const payload = await unwrap(res);
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.content)) return payload.content;
  return [];
}

export async function createBooking(payload) {
  const res = await apiClient.post(ENDPOINTS.ROOT, {
    tourId: Number(payload.tourId),
    experienceDate: payload.experienceDate, // "YYYY-MM-DD"
  });
  return unwrap(res);
}

export async function getMyBookings(params = {}) {
  const { page = 0, size = 10 } = params;
  const res = await apiClient.get(`${ENDPOINTS.MY}?page=${page}&size=${size}`);
  const payload = await unwrap(res);
  return {
    items: payload?.content ?? [],
    totalElements: payload?.totalElements ?? 0,
    totalPages: payload?.totalPages ?? 0,
    page: payload?.page ?? 0,
  };
}

export async function getBookingById(id) {
  const res = await apiClient.get(ENDPOINTS.BY_ID(id));
  return unwrap(res);
}

export async function cancelBooking(id, reason) {
  const res = await apiClient.post(ENDPOINTS.CANCEL(id), reason ? { reason } : {});
  return unwrap(res);
}

export const bookingService = {
  create: createBooking,
  getMy: getMyBookings,
  getById: getBookingById,
  cancel: cancelBooking,
};
export default bookingService;
```

**File: `frontend/src/features/payment/services/paymentService.js`**

```javascript
import { apiClient } from "@/services/apiClient";

const ENDPOINTS = {
  INIT: (bookingId) => `/payments/bookings/${bookingId}/init`,
  METHODS: "/payments/methods",
  BY_ID: (id) => `/payments/${id}`,
  MY: "/payments/my",
  BY_BOOKING: (bookingId) => `/payments/bookings/${bookingId}`,
  QUERY: (id) => `/payments/${id}/query`,
  RETURN: "/payments/return",
};

const unwrap = (res) => res?.data ?? res;

/** Khởi tạo thanh toán. bankCode: "VNPAYQR" | "VNBANK" | "INTCARD" | null */
export async function initiatePayment(bookingId, bankCode = null) {
  const qs = bankCode ? `?bankCode=${encodeURIComponent(bankCode)}` : "";
  const res = await apiClient.post(`${ENDPOINTS.INIT(bookingId)}${qs}`);
  return unwrap(res);
}

export async function getPaymentMethods() {
  const res = await apiClient.get(ENDPOINTS.METHODS);
  return unwrap(res);
}

export async function getPaymentById(id) {
  const res = await apiClient.get(ENDPOINTS.BY_ID(id));
  return unwrap(res);
}

export async function getPaymentsByBooking(bookingId, params = {}) {
  const { page = 0, size = 10 } = params;
  const res = await apiClient.get(
    `${ENDPOINTS.BY_BOOKING(bookingId)}?page=${page}&size=${size}`
  );
  const payload = await unwrap(res);
  return payload?.content ?? [];
}

/** QueryDR — xác minh lại với VNPay. */
export async function queryPayment(id) {
  const res = await apiClient.post(ENDPOINTS.QUERY(id));
  return unwrap(res);
}

/**
 * Xử lý Return URL: gửi nguyên query string từ VNPay về backend để xác minh.
 * @param {string} search location.search (bắt đầu bằng "?")
 */
export async function processReturnUrl(search) {
  const res = await apiClient.get(`${ENDPOINTS.RETURN}${search}`);
  return unwrap(res);
}

export const paymentService = {
  initiate: initiatePayment,
  getMethods: getPaymentMethods,
  getById: getPaymentById,
  getByBooking: getPaymentsByBooking,
  query: queryPayment,
  processReturn: processReturnUrl,
};
export default paymentService;
```

**File: `frontend/src/features/refund/services/refundService.js`**

```javascript
import { apiClient } from "@/services/apiClient";

const ENDPOINTS = {
  ROOT: "/refunds",
  MY: "/refunds/my",
  BY_PAYMENT: (paymentId) => `/refunds/payments/${paymentId}`,
  BY_ID: (id) => `/refunds/${id}`,
  BY_CODE: (code) => `/refunds/code/${code}`,
};

const unwrap = (res) => res?.data ?? res;

export async function createRefund(payload) {
  const res = await apiClient.post(ENDPOINTS.ROOT, {
    paymentId: Number(payload.paymentId),
    reason: payload.reason,               // TOURIST_FAULT | PLATFORM_FAULT
    reasonDetail: payload.reasonDetail,
    evidence: payload.evidence || null,
    bankAccountNumber: payload.bankAccountNumber || null,
    bankAccountName: payload.bankAccountName || null,
    bankName: payload.bankName || null,
  });
  return unwrap(res);
}

export async function getMyRefunds(params = {}) {
  const { page = 0, size = 10 } = params;
  const res = await apiClient.get(`${ENDPOINTS.MY}?page=${page}&size=${size}`);
  const payload = await unwrap(res);
  return payload?.content ?? [];
}

export async function getRefundById(id) {
  const res = await apiClient.get(ENDPOINTS.BY_ID(id));
  return unwrap(res);
}

export const refundService = {
  create: createRefund,
  getMy: getMyRefunds,
  getById: getRefundById,
};
export default refundService;
```

**File: `frontend/src/features/settlement/services/settlementService.js`** (dùng cho cả admin & partner)

```javascript
import { apiClient } from "@/services/apiClient";

const ENDPOINTS = {
  CANDIDATES: "/settlements/candidates",
  ROOT: "/settlements",
  BY_ID: (id) => `/settlements/${id}`,
  DETAILS: (id) => `/settlements/${id}/details`,
  APPROVE: (id) => `/settlements/${id}/approve`,
  REJECT: (id) => `/settlements/${id}/reject`,
  BY_PARTNER: (pid) => `/settlements/partner/${pid}`,
  WALLET_BY_PARTNER: (pid) => `/wallets/partner/${pid}`,
  WALLET_TXN: (pid) => `/wallets/partner/${pid}/transactions`,
  REVENUE_BY_PARTNER: (pid) => `/partner-revenues/partners/${pid}`,
  ELIGIBILITY: (id) => `/partner-revenues/${id}/eligibility`,
  PARTNER_BY_USER: (uid) => `/partners/by-user/${uid}`,
};

const unwrap = (res) => res?.data ?? res;

export async function getCandidates(partnerId, revenuePeriod) {
  const res = await apiClient.get(
    `${ENDPOINTS.CANDIDATES}?partnerId=${partnerId}&revenuePeriod=${revenuePeriod}`
  );
  return unwrap(res);
}

export async function createSettlement(payload) {
  const res = await apiClient.post(ENDPOINTS.ROOT, {
    partnerId: Number(payload.partnerId),
    revenuePeriod: payload.revenuePeriod, // "yyyy-MM"
    note: payload.note || null,
  });
  return unwrap(res);
}

export async function approveSettlement(id) {
  const res = await apiClient.post(ENDPOINTS.APPROVE(id));
  return unwrap(res);
}

export async function rejectSettlement(id, reason) {
  const res = await apiClient.post(ENDPOINTS.REJECT(id), { reason });
  return unwrap(res);
}

export async function getSettlementDetails(id) {
  const res = await apiClient.get(ENDPOINTS.DETAILS(id));
  return unwrap(res) ?? [];
}

export async function getWallet(partnerId) {
  const res = await apiClient.get(ENDPOINTS.WALLET_BY_PARTNER(partnerId));
  return unwrap(res);
}

export async function getWalletTransactions(partnerId, params = {}) {
  const { page = 0, size = 20 } = params;
  const res = await apiClient.get(
    `${ENDPOINTS.WALLET_TXN(partnerId)}?page=${page}&size=${size}`
  );
  const payload = await unwrap(res);
  return payload?.content ?? [];
}

export async function getRevenues(partnerId, params = {}) {
  const { page = 0, size = 20 } = params;
  const res = await apiClient.get(
    `${ENDPOINTS.REVENUE_BY_PARTNER(partnerId)}?page=${page}&size=${size}`
  );
  const payload = await unwrap(res);
  return payload?.content ?? [];
}

export async function getEligibility(revenueId) {
  const res = await apiClient.get(ENDPOINTS.ELIGIBILITY(revenueId));
  return unwrap(res);
}

export async function getPartnerByUserId(userId) {
  const res = await apiClient.get(ENDPOINTS.PARTNER_BY_USER(userId));
  return unwrap(res);
}

export const settlementService = {
  getCandidates, createSettlement, approveSettlement, rejectSettlement,
  getDetails: getSettlementDetails, getWallet, getWalletTransactions,
  getRevenues, getEligibility, getPartnerByUserId,
};
export default settlementService;
```

### 10.2. Hook dùng chung — poll trạng thái thanh toán

**File: `frontend/src/features/payment/hooks/usePaymentStatus.js`**

```javascript
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { paymentService } from "../services/paymentService";

const POLL_INTERVAL_MS = 2500;
const FINAL = new Set(["SUCCESS", "FAILED", "CANCELLED", "EXPIRED"]);

/**
 * Poll trạng thái thanh toán cho tới khi có kết quả cuối cùng.
 * @param {number|null} paymentId
 * @param {string|null} deadline ISO hạn thanh toán
 */
export function usePaymentStatus(paymentId, deadline) {
  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const timerRef = useRef(null);
  const stoppedRef = useRef(false);

  const stop = useCallback(() => {
    stoppedRef.current = true;
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const check = useCallback(async () => {
    if (!paymentId || stoppedRef.current) return;
    setLoading(true);
    setError(null);
    try {
      const data = await paymentService.getById(paymentId);
      setPayment(data);
      if (FINAL.has(data?.status)) {
        stop();
        return;
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
    // Lên lịch lần sau
    timerRef.current = setTimeout(check, POLL_INTERVAL_MS);
  }, [paymentId, stop]);

  useEffect(() => {
    if (!paymentId) return undefined;
    stoppedRef.current = false;
    check();
    return stop;
  }, [paymentId, check, stop]);

  // Hết deadline mà vẫn chưa rõ → QueryDR
  useEffect(() => {
    if (!deadline || !payment || FINAL.has(payment.status)) return undefined;
    const ms = new Date(deadline).getTime() - Date.now();
    if (ms <= 0) return undefined;
    const t = setTimeout(async () => {
      try {
        await paymentService.query(paymentId);
        await check();
      } catch {
        /* giữ nguyên, vẫn poll */
      }
    }, ms);
    return () => clearTimeout(t);
  }, [deadline, payment, paymentId, check]);

  const isFinal = payment ? FINAL.has(payment.status) : false;
  return { payment, loading, error, isFinal, refresh: check, stop };
}
```

### 10.3. Trang thanh toán (Web)

**File: `frontend/src/app/(dashboard)/checkout/[bookingId]/page.jsx`** (đường dẫn tuỳ chọn)

```jsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import bookingService from "@/features/booking/services/bookingService";
import paymentService from "@/features/payment/services/paymentService";
import { usePaymentStatus } from "@/features/payment/hooks/usePaymentStatus";

export default function CheckoutPage() {
  const { bookingId } = useParams();
  const router = useRouter();

  const [booking, setBooking] = useState(null);
  const [payment, setPayment] = useState(null);
  const [methods, setMethods] = useState([]);
  const [selected, setSelected] = useState(null); // bankCode
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const [b, m] = await Promise.all([
          bookingService.getById(bookingId),
          paymentService.getMethods(),
        ]);
        setBooking(b);
        setMethods(m?.methods ?? []);
      } catch (e) {
        setError(e.message);
      }
    })();
  }, [bookingId]);

  // Bắt đầu thanh toán
  const startPayment = async () => {
    setStarting(true);
    setError(null);
    try {
      const data = await paymentService.initiate(bookingId, selected);
      setPayment(data);
      // Redirect tới trang thanh toán VNPay
      window.location.href = data.paymentUrl;
    } catch (e) {
      setError(e.message);
      setStarting(false);
    }
  };

  if (error) return <div className="p-6 text-rose-600">{error}</div>;
  if (!booking) return <div className="p-6">Đang tải…</div>;

  return (
    <div className="mx-auto max-w-2xl p-6 space-y-6">
      <h1 className="text-xl font-bold">Thanh toán đơn {booking.bookingCode}</h1>

      {/* Đếm ngược 10 phút */}
      <Countdown deadline={booking.paymentDeadline} onExpire={handleExpired} />

      <div className="rounded-xl border p-4 space-y-2">
        <Row label="Tour" value={booking.tourTitle} />
        <Row label="Ngày trải nghiệm" value={booking.experienceDate} />
        <Row label="Tổng tiền" value={formatVnd(booking.totalAmount)} />
      </div>

      {/* 3 phương thức thanh toán */}
      <div className="space-y-3">
        <h2 className="font-semibold">Phương thức thanh toán</h2>
        {methods.map((m) => (
          <label key={m.code} className="flex items-start gap-3 rounded-xl border p-4 cursor-pointer">
            <input
              type="radio"
              name="method"
              checked={selected === m.bankCode}
              onChange={() => setSelected(m.bankCode)}
              className="mt-1"
            />
            <span>
              <span className="block font-medium">{m.label}</span>
              <span className="block text-sm text-slate-500">{m.description}</span>
            </span>
          </label>
        ))}
      </div>

      <button
        onClick={startPayment}
        disabled={starting}
        className="w-full rounded-xl bg-emerald-600 px-4 py-3 font-semibold text-white disabled:opacity-50"
      >
        {starting ? "Đang tạo giao dịch…" : `Thanh toán ${formatVnd(booking.totalAmount)}`}
      </button>
    </div>
  );
}
```

### 10.4. Trang Return (Web) — sau khi VNPay redirect về

**File: `frontend/src/app/payment/return/page.jsx`**

```jsx
"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import paymentService from "@/features/payment/services/paymentService";

function ReturnInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [state, setState] = useState({ status: "PROCESSING", message: "Đang xác minh giao dịch…" });

  useEffect(() => {
    let cancelled = false;

    const verify = async () => {
      // Gửi nguyên query string của VNPay về backend để xác minh chữ ký
      const qs = searchParams.toString();
      try {
        const data = await paymentService.processReturn(qs ? `?${qs}` : "");
        if (cancelled) return;
        if (data?.status === "SUCCESS") {
          setState({ status: "SUCCESS", message: "Thanh toán thành công!" });
          setTimeout(() => router.push("/trips"), 2000);
        } else {
          setState({ status: data?.status ?? "FAILED", message: data?.message ?? "Thanh toán chưa thành công" });
        }
      } catch (e) {
        if (!cancelled) setState({ status: "FAILED", message: e.message });
      }
    };

    verify();
    const interval = setInterval(verify, 3000); // phòng trường hợp IPN chậm
    const timeout = setTimeout(() => clearInterval(interval), 60000);

    return () => {
      cancelled = true;
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [searchParams, router]);

  return (
    <div className="mx-auto max-w-md p-10 text-center space-y-3">
      <h1 className="text-lg font-bold">{state.status === "SUCCESS" ? "🎉 Thanh toán thành công" : "Thanh toán"}</h1>
      <p className="text-slate-600">{state.message}</p>
      {state.status !== "SUCCESS" && (
        <button onClick={() => router.back()} className="rounded-xl border px-4 py-2">
          Quay lại
        </button>
      )}
    </div>
  );
}

export default function PaymentReturnPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center">Đang xử lý…</div>}>
      <ReturnInner />
    </Suspense>
  );
}
```

> ⚠️ `useSearchParams` trong Next.js App Router cần `<Suspense>` wrapper — nếu không sẽ lỗi build static.

### 10.5. Tiện ích format (dùng chung)

**File: `frontend/src/utils/format.js`**

```javascript
export function formatVnd(amount) {
  if (amount == null) return "0 đ";
  return `${new Intl.NumberFormat("vi-VN").format(Number(amount))} đ`;
}

export function formatDateTimeVi(iso) {
  if (!iso) return "";
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

export function formatDateVi(isoDate) {
  if (!isoDate) return "";
  const [y, m, d] = String(isoDate).split("-");
  return `${d}/${m}/${y}`;
}

/** Còn bao nhiêu giây tới deadline */
export function secondsUntil(iso) {
  if (!iso) return 0;
  return Math.max(0, Math.floor((new Date(iso).getTime() - Date.now()) / 1000));
}
```

### 10.6. Admin finance page (web)

Trang `frontend/src/app/admin/finance/page.jsx` **đang là placeholder** (mảng rỗng, số liệu `0 đ`). Nhiệm vụ của agent AI:

1. `GET /payments?status=&page=&size=` → bảng giao dịch (cột: mã đơn, txnRef, phương thức, số tiền, trạng thái, thời điểm).
2. `GET /refunds?status=PENDING_REVIEW` → danh sách chờ duyệt + nút "Duyệt" mở modal:
   - hiển thị `proposedAmount` (hệ thống tính)
   - cho Admin đổi `reason` (→ đổi tỷ lệ 50%/100%) và `amount`
   - chọn `method`: `VNPAY_API` | `MANUAL_BANK_TRANSFER`
   - nếu chọn `MANUAL_BANK_TRANSFER` → hiện form mã tham chiếu + bằng chứng (upload qua `/api/v1/upload` hoặc Cloudinary)
   - nút "Từ chối" → bắt nhập lý do
3. Thẻ KPI: tổng doanh số (sum gross), tổng hoa hồng, tổng đã giải ngân (sum settlement approved), số refund chờ duyệt.
4. Poll `GET /refunds/{id}` mỗi 5s cho các refund `REFUND_PROCESSING` để cập nhật trạng thái real-time.

---

## 11. HƯỚNG DẪN RIÊNG CHO MOBILE (FLUTTER)

### 11.1. Thêm dependency

**File: `mobile/pubspec.yaml`**

```yaml
dependencies:
  url_launcher: ^6.3.0
  webview_flutter: ^4.10.0   # tuỳ chọn — KHÔNG dùng để mở trang VNPay
```

> ⚠️ **KHÔNG** mở `paymentUrl` trong `WebView`/`InAppWebView` — VNPay chặn, trang sẽ trắng.
> Bắt buộc dùng `url_launcher` với `LaunchMode.externalApplication` để mở trình duyệt hệ thống.

### 11.2. Base URL đã có sẵn

`mobile/lib/core/constants/api_constants.dart` đã xử lý đúng:
- Android emulator → `10.0.2.2:8088`
- iOS simulator → `127.0.0.1:8088`
- Web → `localhost:8088`

Người dùng có thể đổi base URL trong app (lưu vào `shared_preferences` qua `TokenStorage.setBaseUrl`).

### 11.3. Model Dart

**File: `mobile/lib/core/models/booking_model.dart`**

```dart
class BookingModel {
  final int id;
  final String bookingCode;
  final String tourTitle;
  final String experienceDate;
  final double totalAmount;
  final String currency;
  final String status;
  final DateTime? paymentDeadline;
  final DateTime? paidAt;

  const BookingModel({
    required this.id,
    required this.bookingCode,
    required this.tourTitle,
    required this.experienceDate,
    required this.totalAmount,
    required this.currency,
    required this.status,
    this.paymentDeadline,
    this.paidAt,
  });

  factory BookingModel.fromJson(Map<String, dynamic> json) {
    return BookingModel(
      id: json['id'] as int? ?? 0,
      bookingCode: json['bookingCode'] as String? ?? '',
      tourTitle: json['tourTitle'] as String? ?? '',
      experienceDate: json['experienceDate'] as String? ?? '',
      totalAmount: (json['totalAmount'] as num?)?.toDouble() ?? 0,
      currency: json['currency'] as String? ?? 'VND',
      status: json['status'] as String? ?? 'UNKNOWN',
      paymentDeadline: json['paymentDeadline'] != null
          ? DateTime.parse(json['paymentDeadline'] as String).toLocal()
          : null,
      paidAt: json['paidAt'] != null
          ? DateTime.parse(json['paidAt'] as String).toLocal()
          : null,
    );
  }

  bool get isPendingPayment => status == 'PENDING_PAYMENT';
  bool get isConfirmed => status == 'CONFIRMED';
  bool get isCompleted => status == 'COMPLETED';
  bool get isCancelled => status == 'CANCELLED' || status == 'EXPIRED';

  /// Còn trong 24h để xin hoàn tiền không
  bool get canRequestRefund {
    if (paidAt == null) return false;
    return DateTime.now().difference(paidAt!) < const Duration(hours: 24);
  }

  String get formattedPrice => totalAmount.toStringAsFixed(0).replaceAllMapped(
        RegExp(r'(\d)(?=(\d{3})+(?!\d))'),
        (m) => '${m[1]},',
      );
}
```

**File: `mobile/lib/core/models/payment_model.dart`**

```dart
class PaymentModel {
  final int id;
  final int bookingId;
  final String txnRef;
  final double amount;
  final String status;
  final String? paymentUrl;
  final String? vnpTransactionNo;
  final String? bankCode;
  final String? cardType;
  final int ipnCount;
  final bool duplicatePayment;

  const PaymentModel({
    required this.id,
    required this.bookingId,
    required this.txnRef,
    required this.amount,
    required this.status,
    this.paymentUrl,
    this.vnpTransactionNo,
    this.bankCode,
    this.cardType,
    this.ipnCount = 0,
    this.duplicatePayment = false,
  });

  factory PaymentModel.fromJson(Map<String, dynamic> json) {
    return PaymentModel(
      id: json['id'] as int? ?? 0,
      bookingId: json['bookingId'] as int? ?? 0,
      txnRef: json['txnRef'] as String? ?? '',
      amount: (json['amount'] as num?)?.toDouble() ?? 0,
      status: json['status'] as String? ?? 'UNKNOWN',
      paymentUrl: json['paymentUrl'] as String?,
      vnpTransactionNo: json['vnpTransactionNo'] as String?,
      bankCode: json['bankCode'] as String?,
      cardType: json['cardType'] as String?,
      ipnCount: json['ipnCount'] as int? ?? 0,
      duplicatePayment: json['duplicatePayment'] as bool? ?? false,
    );
  }

  bool get isSuccess => status == 'SUCCESS';
  bool get isFailed => status == 'FAILED' || status == 'CANCELLED';
  bool get isFinal => isSuccess || isFailed || status == 'EXPIRED';
}
```

### 11.4. Service Dart

**File: `mobile/lib/core/services/booking_service.dart`**

```dart
import 'dart:convert';
import 'package:http/http.dart' as http;
import '../constants/api_constants.dart';
import '../models/booking_model.dart';
import 'token_storage.dart';

class BookingService {
  static final BookingService _instance = BookingService._internal();
  factory BookingService() => _instance;
  BookingService._internal();

  Future<Map<String, String>> _headers() async {
    final token = await TokenStorage.getAccessToken();
    return {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      if (token != null && token.isNotEmpty) 'Authorization': 'Bearer $token',
    };
  }

  /// Tạo booking — trả về BookingModel
  Future<BookingModel> createBooking({
    required int tourId,
    required String experienceDate, // yyyy-MM-dd
  }) async {
    final baseUrl = await TokenStorage.getBaseUrl();
    final res = await http
        .post(
          Uri.parse('$baseUrl/bookings'),
          headers: await _headers(),
          body: jsonEncode({'tourId': tourId, 'experienceDate': experienceDate}),
        )
        .timeout(const Duration(seconds: 15));

    final decoded = jsonDecode(utf8.decode(res.bodyBytes));
    if (res.statusCode >= 200 && res.statusCode < 300) {
      return BookingModel.fromJson(decoded['data'] as Map<String, dynamic>);
    }
    throw Exception(decoded['message'] ?? 'Không tạo được booking');
  }

  Future<BookingModel> getBookingById(int id) async {
    final baseUrl = await TokenStorage.getBaseUrl();
    final res = await http
        .get(Uri.parse('$baseUrl/bookings/$id'), headers: await _headers())
        .timeout(const Duration(seconds: 15));
    final decoded = jsonDecode(utf8.decode(res.bodyBytes));
    if (res.statusCode >= 200 && res.statusCode < 300) {
      return BookingModel.fromJson(decoded['data'] as Map<String, dynamic>);
    }
    throw Exception(decoded['message'] ?? 'Không lấy được booking');
  }

  Future<List<BookingModel>> getMyBookings({int page = 0, int size = 20}) async {
    final baseUrl = await TokenStorage.getBaseUrl();
    final res = await http
        .get(Uri.parse('$baseUrl/bookings/my?page=$page&size=$size'),
            headers: await _headers())
        .timeout(const Duration(seconds: 15));
    final decoded = jsonDecode(utf8.decode(res.bodyBytes));
    final content = (decoded['data']?['content'] as List<dynamic>?) ?? [];
    return content
        .map((e) => BookingModel.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<BookingModel> cancelBooking(int id, {String? reason}) async {
    final baseUrl = await TokenStorage.getBaseUrl();
    final res = await http
        .post(Uri.parse('$baseUrl/bookings/$id/cancel'),
            headers: await _headers(),
            body: jsonEncode(reason == null ? {} : {'reason': reason}))
        .timeout(const Duration(seconds: 15));
    final decoded = jsonDecode(utf8.decode(res.bodyBytes));
    if (res.statusCode >= 200 && res.statusCode < 300) {
      return BookingModel.fromJson(decoded['data'] as Map<String, dynamic>);
    }
    throw Exception(decoded['message'] ?? 'Không hủy được booking');
  }
}
```

**File: `mobile/lib/core/services/payment_service.dart`**

```dart
import 'dart:convert';
import 'package:http/http.dart' as http;
import '../constants/api_constants.dart';
import '../models/payment_model.dart';
import 'token_storage.dart';

class PaymentService {
  static final PaymentService _instance = PaymentService._internal();
  factory PaymentService() => _instance;
  PaymentService._internal();

  Future<Map<String, String>> _headers() async {
    final token = await TokenStorage.getAccessToken();
    return {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      if (token != null && token.isNotEmpty) 'Authorization': 'Bearer $token',
    };
  }

  /// Khởi tạo thanh toán. [bankCode] có thể null (khách tự chọn trên VNPay).
  Future<Map<String, dynamic>> initiate(int bookingId, {String? bankCode}) async {
    final baseUrl = await TokenStorage.getBaseUrl();
    final qs = bankCode != null ? '?bankCode=$bankCode' : '';
    final res = await http
        .post(Uri.parse('$baseUrl/payments/bookings/$bookingId/init$qs'),
            headers: await _headers())
        .timeout(const Duration(seconds: 20));
    final decoded = jsonDecode(utf8.decode(res.bodyBytes));
    if (res.statusCode >= 200 && res.statusCode < 300) {
      return decoded['data'] as Map<String, dynamic>;
    }
    throw Exception(decoded['message'] ?? 'Không khởi tạo được thanh toán');
  }

  /// 3 nhóm phương thức thanh toán + danh sách ngân hàng
  Future<Map<String, dynamic>> getMethods() async {
    final baseUrl = await TokenStorage.getBaseUrl();
    final res = await http
        .get(Uri.parse('$baseUrl/payments/methods'), headers: await _headers())
        .timeout(const Duration(seconds: 15));
    final decoded = jsonDecode(utf8.decode(res.bodyBytes));
    if (res.statusCode >= 200 && res.statusCode < 300) {
      return decoded['data'] as Map<String, dynamic>;
    }
    throw Exception(decoded['message'] ?? 'Không lấy được phương thức thanh toán');
  }

  Future<PaymentModel> getById(int paymentId) async {
    final baseUrl = await TokenStorage.getBaseUrl();
    final res = await http
        .get(Uri.parse('$baseUrl/payments/$paymentId'), headers: await _headers())
        .timeout(const Duration(seconds: 15));
    final decoded = jsonDecode(utf8.decode(res.bodyBytes));
    if (res.statusCode >= 200 && res.statusCode < 300) {
      return PaymentModel.fromJson(decoded['data'] as Map<String, dynamic>);
    }
    throw Exception(decoded['message'] ?? 'Không lấy được giao dịch');
  }

  /// QueryDR — xác minh lại với VNPay.
  /// Trả về 'SUCCESS' | 'FAILED' | 'CANCELLED' | 'DUPLICATE' | 'UNKNOWN'
  Future<String> query(int paymentId) async {
    final baseUrl = await TokenStorage.getBaseUrl();
    final res = await http
        .post(Uri.parse('$baseUrl/payments/$paymentId/query'), headers: await _headers())
        .timeout(const Duration(seconds: 20));
    final decoded = jsonDecode(utf8.decode(res.bodyBytes));
    if (res.statusCode >= 200 && res.statusCode < 300) {
      return (decoded['data']?['outcome'] as String?) ?? 'UNKNOWN';
    }
    throw Exception(decoded['message'] ?? 'Không truy vấn được giao dịch');
  }
}
```

### 11.5. Mở trang thanh toán + poll (Mobile)

**File: `mobile/lib/core/services/payment_launcher.dart`**

```dart
import 'dart:async';
import 'package:url_launcher/url_launcher.dart';
import '../models/payment_model.dart';
import 'payment_service.dart';

class PaymentLauncher {
  /// Mở trang thanh toán VNPay trong trình duyệt hệ thống.
  static Future<bool> openVnpay(String paymentUrl) async {
    final uri = Uri.parse(paymentUrl);
    return launchUrl(
      uri,
      mode: LaunchMode.externalApplication, // BẮT BUỘC — không dùng in-app webview
    );
  }

  /// Poll trạng thái thanh toán cho tới khi có kết quả cuối cùng.
  /// [onUpdate] được gọi mỗi lần có thay đổi.
  static Future<PaymentModel> pollStatus({
    required int paymentId,
    required DateTime? deadline,
    Duration interval = const Duration(seconds: 3),
    void Function(PaymentModel)? onUpdate,
  }) async {
    final service = PaymentService();
    PaymentModel? last;

    while (true) {
      try {
        final payment = await service.getById(paymentId);
        if (payment.status != last?.status) {
          last = payment;
          onUpdate?.call(payment);
        }
        if (payment.isFinal) return payment;

        // Hết hạn mà vẫn chưa rõ → QueryDR một lần
        if (deadline != null && DateTime.now().isAfter(deadline)) {
          await service.query(paymentId);
          continue;
        }
      } catch (_) {
        // Bỏ qua lỗi mạng, tiếp tục thử
      }
      await Future.delayed(interval);
    }
  }
}
```

### 11.6. Màn hình thanh toán (Flutter)

**File: `mobile/lib/screens/booking/payment_screen.dart`**

```dart
import 'dart:async';
import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../core/models/payment_model.dart';
import '../../core/services/payment_launcher.dart';
import '../../core/services/payment_service.dart';

class PaymentScreen extends StatefulWidget {
  final int bookingId;
  final double amount;
  final String bookingCode;
  final DateTime? paymentDeadline;

  const PaymentScreen({
    super.key,
    required this.bookingId,
    required this.amount,
    required this.bookingCode,
    this.paymentDeadline,
  });

  @override
  State<PaymentScreen> createState() => _PaymentScreenState();
}

class _PaymentScreenState extends State<PaymentScreen> {
  final _service = PaymentService();
  List<Map<String, dynamic>> _methods = [];
  String? _selectedBankCode;
  bool _loading = true;
  bool _starting = false;
  String? _error;
  PaymentModel? _payment;

  @override
  void initState() {
    super.initState();
    _loadMethods();
  }

  Future<void> _loadMethods() async {
    try {
      final data = await _service.getMethods();
      if (!mounted) return;
      setState(() {
        _methods = (data['methods'] as List<dynamic>? ?? [])
            .map((e) => e as Map<String, dynamic>)
            .toList();
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.toString();
        _loading = false;
      });
    }
  }

  Future<void> _startPayment() async {
    setState(() {
      _starting = true;
      _error = null;
    });
    try {
      final data = await _service.initiate(
        widget.bookingId,
        bankCode: _selectedBankCode,
      );
      final url = data['paymentUrl'] as String?;
      if (url == null) throw Exception('Không nhận được URL thanh toán');

      setState(() => _starting = false);

      // Mở trình duyệt hệ thống
      final opened = await PaymentLauncher.openVnpay(url);
      if (!opened) {
        setState(() => _error = 'Không mở được trình duyệt thanh toán');
        return;
      }

      // Poll sau khi quay lại app
      await PaymentLauncher.pollStatus(
        paymentId: data['paymentId'] as int,
        deadline: widget.paymentDeadline,
        onUpdate: (p) {
          if (mounted) setState(() => _payment = p);
        },
      );

      if (!mounted) return;
      final p = _payment;
      if (p != null && p.isSuccess) {
        _showResult(true);
      } else if (p != null && p.isFailed) {
        _showResult(false);
      }
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.toString();
        _starting = false;
      });
    }
  }

  void _showResult(bool success) {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => AlertDialog(
        title: Text(success ? 'Thanh toán thành công' : 'Thanh toán chưa thành công'),
        content: Text(success
            ? 'Đơn ${widget.bookingCode} đã được xác nhận.'
            : 'Giao dịch chưa hoàn tất. Bạn có thể thử lại trong đơn của mình.'),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.of(ctx).pop();
              Navigator.of(context).pop(success);
            },
            child: const Text('Đóng'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Thanh toán ${widget.bookingCode}')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                _AmountCard(amount: widget.amount),
                const SizedBox(height: 16),
                const Text('Phương thức thanh toán',
                    style: TextStyle(fontWeight: FontWeight.bold)),
                ..._methods.map(_buildMethodTile),
                const SizedBox(height: 24),
                if (_error != null)
                  Text(_error!,
                      style: const TextStyle(color: Colors.redAccent)),
                if (_payment != null) _StatusBanner(payment: _payment!),
                const SizedBox(height: 16),
                FilledButton(
                  onPressed: _starting ? null : _startPayment,
                  child: Text(_starting ? 'Đang xử lý…' : 'Thanh toán ngay'),
                ),
              ],
            ),
    );
  }

  Widget _buildMethodTile(Map<String, dynamic> m) {
    final code = m['bankCode'] as String?;
    return RadioListTile<String>(
      value: code ?? '',
      // groupValue: _selectedBankCode,
      title: Text(m['label'] as String? ?? ''),
      subtitle: Text(m['description'] as String? ?? ''),
      // onChanged: (v) => setState(() => _selectedBankCode = v),
    );
  }
}
```

> Lưu ý Flutter mới: `RadioListTile.groupValue`/`onChanged` đã bị deprecate ở Flutter 3.32+ → dùng `RadioGroup` hoặc `Radio` widget trực tiếp. Kiểm tra version Flutter trong `mobile/pubspec.yaml` (`sdk: ^3.11.5`) trước khi code.

### 11.7. Màn hình "Đơn của tôi" (Mobile)

- `GET /bookings/my` → list `BookingModel`.
- Mỗi item: tên tour, ngày, giá, badge trạng thái, nút hành động theo trạng thái:
  - `PENDING_PAYMENT` → "Thanh toán" (mở PaymentScreen) + "Hủy"
  - `CONFIRMED` → "Bắt đầu hành trình" (`POST /journeys` với `{bookingId, tourId}`)
  - `COMPLETED` + `canRequestRefund` → "Yêu cầu hoàn tiền"
  - `COMPLETED` → "Xem hành trình"
- Pull-to-refresh để cập nhật trạng thái.

### 11.8. Deep link (khuyến nghị)

VNPay redirect về `VNPAY_RETURN_URL`. Nếu cấu hình URL đó trỏ về trang web, mobile sẽ mở trình duyệt. Để mobile nhận callback:

1. Backend cấu hình `VNPAY_RETURN_URL` trỏ về trang web trung gian (đã có sẵn logic return).
2. Mobile dùng **universal/app link** (`app_links`) để bắt link đó → mở app.
3. Trong `main.dart`, xử lý `uriLinkStream` → đóng màn hình thanh toán & refresh trạng thái.

**Phương án đơn giản & ổn định hơn (khuyến nghị cho MVP):** poll trạng thái — không cần deep link. IPN vẫn cập nhật server, mobile poll sẽ thấy `SUCCESS`.

---

## 12. MA TRẬN MÀN HÌNH CẦN LÀM

### 12.1. Web (Next.js)

| # | Route gợi ý | Vai trò | API chính |
|---|---|---|---|
| W1 | `/tours` | Public | `GET /tours/published` |
| W2 | `/tours/[id]` | Public | `GET /tours/{id}`, `GET /experiences/{id}/slots?date=` |
| W3 | `/checkout/[bookingId]` | TOURIST | `POST /bookings`, `POST /payments/.../init`, `GET /payments/methods` |
| W4 | `/payment/return` | Public | `GET /payments/return` + poll `GET /payments/{id}` |
| W5 | `/trips` | TOURIST | `GET /bookings/my` |
| W6 | `/trips/[bookingId]` | TOURIST | `GET /bookings/{id}`, `GET /payments/bookings/{id}` |
| W7 | `/trips/[bookingId]/refund` | TOURIST | `POST /refunds`, `GET /refunds/my` |
| W8 | `/payment-methods` | Public | `GET /payments/methods` (giới thiệu 3 phương thức) |
| W9 | `/admin/finance` | ADMIN | `GET /payments`, `GET /refunds`, `POST /refunds/{id}/review` |
| W10 | `/admin/settlements` | ADMIN | `GET /settlements/candidates`, `POST /settlements`, `/approve`, `/reject` |
| W11 | `/partner/wallet` | PARTNER | `GET /wallets/partner/{id}`, `/transactions`, `GET /partner-revenues/partners/{id}` |

### 12.2. Mobile (Flutter)

| # | Màn hình | Vai trò | API chính |
|---|---|---|---|
| M1 | Danh sách tour / Trải nghiệm | Public | `GET /tours/published` (hiện `experience_service.dart` gọi `/experiences`) |
| M2 | Chi tiết tour + chọn ngày | Public | `GET /tours/{id}`, `GET /experiences/{id}/slots?date=` |
| M3 | Chọn phương thức thanh toán | TOURIST | `GET /payments/methods` |
| M4 | Thanh toán | TOURIST | `POST /payments/bookings/{id}/init` → `url_launcher` → poll |
| M5 | Đơn của tôi | TOURIST | `GET /bookings/my` |
| M6 | Chi tiết đơn + hủy + xin hoàn tiền | TOURIST | `GET /bookings/{id}`, `POST /bookings/{id}/cancel`, `POST /refunds` |
| M7 | Lịch sử hoàn tiền | TOURIST | `GET /refunds/my` |

> **Lưu ý hiện trạng:** `mobile/lib/screens/modals/payment_modal.dart` đang là **mock** (tạo vé giả, không gọi API).
> Nhiệm vụ của agent AI: **thay thế** bằng luồng thật M3 → M4 dựa trên `bookingService`/`paymentService` ở trên.
> `mobile/lib/core/models/ticket_model.dart` (`TicketModel`) nên được thay bằng `BookingModel`.

---

## 13. XỬ LÝ LỖI

### 13.1. Bảng mã lỗi nghiệp vụ cần xử lý riêng

| `code` | HTTP | message (tiếng Việt từ backend) | Hành động UI |
|---|---|---|---|
| `BOOKING_SLOT_FULL` | 409 | Trải nghiệm đã hết chỗ cho ngày này | Refresh slot + báo hết chỗ |
| `BOOKING_SLOT_NOT_FOUND` | 400 | Chưa mở bán trải nghiệm cho ngày này | Disable ngày |
| `BOOKING_ALREADY_EXPIRED` | 409 | Booking đã hết hạn thanh toán | Về trang đơn, nút "Đặt lại" |
| `BOOKING_CANNOT_CANCEL_PAID` | 409 | Booking đã thanh toán — không thể hủy trực tiếp | Hướng dẫn xin refund |
| `PAYMENT_NOT_RETRYABLE` | 409 | Giao dịch trước chưa rõ kết quả — cần xác minh trước khi thử lại | **Gọi QueryDR** |
| `PAYMENT_ALREADY_SUCCEEDED` | 409 | Booking đã được thanh toán thành công | Về trang chi tiết đơn |
| `PAYMENT_AMOUNT_MISMATCH` | 400 | Số tiền thanh toán không khớp với đơn hàng | Báo lỗi, không retry |
| `REFUND_ALREADY_EXISTS` | 409 | Giao dịch này đã có yêu cầu hoàn tiền đang xử lý hoặc đã hoàn tất | Link tới refund hiện có |
| `REFUND_WINDOW_EXPIRED` | 400 | Đã quá thời hạn 24 giờ… | Ẩn nút, hiển thị hạn chót |
| `REFUND_AMOUNT_MISMATCH` | 400 | Số tiền hoàn không khớp chính sách theo nguyên nhân | Reset amount về `proposedAmount` |
| `REFUND_METHOD_NOT_ALLOWED` | 409 | Chưa xác minh được trạng thái VNPay — không thể chuyển sang phương thức thủ công | Poll trạng thái VNPay |
| `REFUND_BANK_INFO_REQUIRED` | 400 | Thiếu thông tin tài khoản nhận tiền | Bắt nhập thông tin tài khoản |
| `SETTLEMENT_ALREADY_EXISTS` | 409 | Đối tác đã có đợt tất toán cho kỳ doanh thu này | Chọn kỳ khác |
| `SETTLEMENT_ALREADY_APPROVED` | 409 | Đợt tất toán đã được duyệt — không thể thao tác lại | Reload |
| `SETTLEMENT_ELIGIBILITY_CHANGED` | 409 | Điều kiện tất toán đã thay đổi — vui lòng cập nhật lại đợt tất toán | Tạo lại settlement |
| `SETTLEMENT_PERIOD_NOT_CLOSED` | 400 | Chỉ tạo đợt tất toán cho kỳ doanh thu đã kết thúc | Chọn kỳ trước |
| `WALLET_INSUFFICIENT_BALANCE` | 409 | Số dư ví không đủ để thực hiện khoản khấu trừ | Hiển thị số dư |

### 13.2. Pattern xử lý lỗi chung

**Web:**
```javascript
try {
  await doSomething();
} catch (e) {
  // apiClient đã ném Error với message = message của backend
  toast.error(e.message);
}
```

**Mobile:**
```dart
try {
  await doSomething();
} catch (e) {
  // Exception message đã là message tiếng Việt của backend
  ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
}
```

**Nguyên tắc:** luôn hiển thị `message` từ backend — nó đã viết sẵn đúng ngữ cảnh nghiệp vụ, đừng tự viết lại message.

---

## 14. CHECKLIST BÀN GIAO

### 14.1. Chung

- [ ] Tất cả request dùng đúng prefix `/api/v1` và `Authorization: Bearer`.
- [ ] Đọc `data` từ envelope; đọc `data.content` cho list.
- [ ] Format tiền VND đúng (không chia thêm/nhân thêm).
- [ ] Format ngày giờ theo `Asia/Ho_Chi_Minh`.
- [ ] Xử lý 401 → refresh token → retry (Web: có sẵn trong `apiClient.js`; Mobile: implement trong service).
- [ ] Disable nút khi request đang bay (chống double-submit).
- [ ] Hiển thị `message` lỗi từ backend, không tự viết lại.
- [ ] Không bao giờ coi `PENDING`/`PROCESSING` là thất bại.

### 14.2. Web

- [ ] Trang tour hiển thị giá từ `price` (không tự tính).
- [ ] Lịch chọn ngày chỉ cho phép ngày có slot còn chỗ.
- [ ] Màn hình checkout có đếm ngược theo `paymentDeadline`.
- [ ] 3 phương thức thanh toán render từ `GET /payments/methods` (fallback khi `bankGroups` rỗng).
- [ ] Redirect tới `paymentUrl` bằng `window.location.href`, KHÔNG sửa query.
- [ ] Trang `/payment/return` có `<Suspense>` wrapper + gọi `GET /payments/return`.
- [ ] Poll `GET /payments/{id}` mỗi 2–3s, dừng khi có trạng thái cuối hoặc component unmount.
- [ ] Nút "Thử lại thanh toán" chỉ hiện khi `FAILED`/`CANCELLED`; khi gặp `PAYMENT_NOT_RETRYABLE` thì gọi QueryDR.
- [ ] Trang admin finance nối API thật (không còn dữ liệu mock `0 đ`).

### 14.3. Mobile

- [ ] Đã thêm `url_launcher` vào `pubspec.yaml` và chạy `flutter pub get`.
- [ ] Mở `paymentUrl` bằng `LaunchMode.externalApplication`, KHÔNG dùng WebView.
- [ ] Poll trạng thái sau khi mở trình duyệt (app có thể bị kill → `resume` cần poll lại).
- [ ] `mobile/lib/screens/modals/payment_modal.dart` (mock) đã được thay bằng luồng API thật.
- [ ] Xử lý base URL Android emulator = `10.0.2.2`.
- [ ] Token lưu bằng `TokenStorage` (shared_preferences), không hardcode.
- [ ] Xoá `payment_modal.dart` cũ sau khi thay thế, hoặc refactor để dùng lại component.

### 14.4. QA

- [ ] Chạy theo `docs/TEST_SCENARIOS.md` Phần A (booking + payment) trên **cả web và mobile** với cùng một tài khoản `tourist1@journeygo.com`.
- [ ] Xác nhận giao dịch hiển thị ở `https://sandbox.vnpayment.vn/merchantv2` với `vnp_TxnRef` khớp `txnRef` từ API.
- [ ] Kiểm tra `duplicatePayment = true` khi thanh toán trùng.
- [ ] Kiểm tra timeout 10 phút → booking `EXPIRED` + slot được giải phóng (đếm slot trước/sau).

---

## PHỤ LỤC A — Bảng tra nhanh endpoint

```
PUBLIC
GET    /tours/published?page=&size=
GET    /tours/{tourId}
GET    /experiences/{experienceId}/slots?date=YYYY-MM-DD
GET    /payments/return?<vnp params>
GET    /payments/methods                 ← cần token
POST   /payments/ipn                     ← KHÔNG gọi từ frontend

BOOKING (TOURIST)
POST   /bookings                         { tourId, experienceDate }
GET    /bookings/my?page=&size=
GET    /bookings/{bookingId}
POST   /bookings/{bookingId}/cancel      { reason? }
GET    /bookings?status=                 (ADMIN)

PAYMENT (TOURIST)
POST   /payments/bookings/{bookingId}/init[?bankCode=]
GET    /payments/{paymentId}
GET    /payments/my?page=&size=
GET    /payments/bookings/{bookingId}
POST   /payments/{paymentId}/query
GET    /payments?status=                 (ADMIN)

REFUND (TOURIST)
POST   /refunds                          { paymentId, reason, reasonDetail, evidence?, bank*? }
GET    /refunds/my?page=&size=
GET    /refunds/{refundId}
GET    /refunds/payments/{paymentId}

REFUND (ADMIN)
GET    /refunds?status=&page=&size=
POST   /refunds/{refundId}/review         { approve, reason?, amount?, method?, rejectionReason?, note? }
POST   /refunds/{refundId}/manual-transfer { transferReference, transferEvidence?, transferredAt? }
POST   /refunds/{refundId}/refresh-status

SETTLEMENT (ADMIN/PARTNER)
GET    /settlements/candidates?partnerId=&revenuePeriod=
POST   /settlements                       (ADMIN) { partnerId, revenuePeriod, note? }
POST   /settlements/{id}/approve          (ADMIN)
POST   /settlements/{id}/reject           (ADMIN) { reason }
GET    /settlements/{id}
GET    /settlements/{id}/details
GET    /settlements/partner/{partnerId}
GET    /settlements?status=               (ADMIN)

WALLET / REVENUE (ADMIN/PARTNER)
GET    /wallets/partner/{partnerId}
GET    /wallets/{walletId}
GET    /wallets/partner/{partnerId}/transactions
GET    /wallets/{walletId}/transactions
GET    /partner-revenues/partners/{partnerId}
GET    /partner-revenues/bookings/{bookingId}
GET    /partner-revenues/{revenueId}
GET    /partner-revenues/{revenueId}/eligibility

FINANCIAL ADJUSTMENT (ADMIN)
POST   /financial-adjustments              { partnerId, refundRequestId?, sourceSettlementId?, amount, reason }
POST   /financial-adjustments/{id}/approve
POST   /financial-adjustments/{id}/reject?reason=
GET    /financial-adjustments/{id}
GET    /financial-adjustments/partner/{partnerId}
```

## PHỤ LỤC B — Bản ghi mẫu có sẵn trong DB (dùng để test nhanh)

| Mã | Ý nghĩa |
|---|---|
| `JGSAMPLE01` … `JGSAMPLE09` | Booking mẫu (đủ các trạng thái) |
| `JGSAMPLE01-TXN` … | txnRef mẫu |
| `JGSAMPLERF01` | Refund đã `REFUNDED` (50%, chuyển khoản tay) |
| `JGSAMPLERF02` | Refund `PENDING_REVIEW` → chặn tất toán |
| `JGSETTLE001` | Settlement đã `APPROVED` |
| `JGSAMPLEADJ01` | Financial adjustment đã duyệt (−50.000đ) |

Tra cứu: `GET /api/v1/bookings?size=100` (ADMIN) hoặc `GET /api/v1/refunds?size=100` (ADMIN).

---

**Hết tài liệu.** Nếu gặp điểm nào chưa rõ hoặc phát hiện hợp đồng API khác với mô tả → kiểm tra lại code backend và cập nhật tài liệu này.
