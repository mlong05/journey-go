# Kịch bản Test trên Swagger — Booking → Payment → Refund → Settlement

> **Cách chạy:** mở `http://localhost:8088/swagger-ui.html` → chọn tag → **Try it out** → dán JSON → **Execute**.
> **Mọi JSON trong tài liệu này đều copy-paste được.** Thứ tự bước đã tối ưu để chạy liền nhau.
> **Tài liệu liên quan:** [`IMPLEMENTATION.md`](./IMPLEMENTATION.md)

---

## Mục lục

- [Quy ước dùng chung](#quy-uoc-dung-chung)
- [BƯỚC 0 — Chuẩn bị dữ liệu](#bước-0--chuẩn-bị-dữ-liệu)
- [PHẦN A — Chọn tour (public) → Booking → Payment](#phần-a--chọn-tour-public--booking--payment)
- [PHẦN B — Hoàn thành trải nghiệm → Kiểm tra doanh thu](#phần-b--hoàn-thành-trải-nghiệm--kiểm-tra-doanh-thu)
- [PHẦN C — Refund](#phần-c--refund)
- [PHẦN D — Settlement](#phần-d--settlement)
- [PHẦN E — Financial Adjustment](#phần-e--financial-adjustment)
- [PHẦN F — Bộ dữ liệu lớn để thống kê](#phần-f--bộ-dữ-liệu-lớn-để-thống-kê)
- [PHỤ LỤC — Bảng lỗi thường gặp](#phụ-lục--bảng-lỗi-thường-gặp)

---

## Quy ước dùng chung

**Mỗi bước gồm 4 phần:**

| Ký hiệu | Ý nghĩa |
|---|---|
| 🟦 | Swagger **Tag** chứa endpoint |
| ▶ | **Method + Path** — bấm "Try it out" rồi dán vào ô Path |
| 🔑 | **Auth** — `Bearer <token>` hoặc `none` |
| 📋 | **Body (JSON)** — dán vào ô "Request body" |
| ✅ | **Kết quả mong đợi** — response bạn phải thấy |

**Biến thay thế ID** — thay bằng số thật lấy từ response trước đó:

| Ký hiệu | Lấy từ bước | Ví dụ |
|---|---|---|
| `{tourId}` | A.1 | `1` |
| `{bookingId}` | A.4 | `101` |
| `{paymentId}` | A.7 | `501` |
| `{journeyId}` | B.1 | `901` |
| `{destinationId}` | B.2 | `11` |
| `{providerProfileId}` | 0.4 | `1` |
| `{revenueId}` | B.5 | `301` |
| `{refundId}` | C.1 | `701` |
| `{settlementId}` | D.2 | `801` |
| `{adjustmentId}` | E.4 | `903` |

**Token:** bấm nút **Authorize** ở góc phải → dán `Bearer eyJhbGciOi...` → Authorize.
Hoặc gõ thẳng vào ô `Value` của tham số `Authorization` nếu endpoint có khai báo header.

**Định dạng response chung của toàn hệ thống:**

```json
{
  "code": 200,
  "message": "Đăng nhập thành công",
  "data": { },
  "timestamp": "2026-11-20T02:00:00Z"
}
```

> ⚠️ **Response lỗi** KHÔNG có field `data` (trừ lỗi validation 400 — xem phụ lục).

---

# BƯỚC 0 — Chuẩn bị dữ liệu

> ✅ **Dữ liệu mẫu đã được tạo sẵn** khi khởi động ứng dụng (`DataInitializer`).
> Chỉ cần đăng nhập bằng các tài khoản dưới đây là chạy được ngay từ **A.1** mà không
> phải tạo dữ liệu thủ công. Xem bảng tổng quan ở [Mục 0.0](#00--tổng-quan-dữ-liệu-mẫu).

## 0.0. Tổng quan dữ liệu mẫu

### Tài khoản (mật khẩu chung: `Password123@`)

| Email | Vai trò | Dùng cho |
|---|---|---|
| `admin@journeygo.com` | `ADMIN` | Tất cả thao tác duyệt (đối tác, refund, settlement, adjustment) |
| `user@journeygo.com` | `ADMIN` | Tài khoản admin thay thế |
| `tourist1@journeygo.com` | `TOURIST` | Đặt tour, thanh toán, hành trình, gửi refund |
| `tourist2@journeygo.com` | `TOURIST` | Kịch bản thứ 2 (vượt sức chứa, refund 100%) |
| `provider1@journeygo.com` | `CONTENT_PROVIDER` | Đối tác "Ban Quản lý Tràng An" — hoa hồng **25%** |
| `provider2@journeygo.com` | `CONTENT_PROVIDER` | Đối tác "Ban Quản lý Hạ Long" — hoa hồng **20%** |

> 📌 Hai tài khoản `provider1@` / `provider2@` **đã có sẵn ProviderProfile + Wallet** → không cần
> gọi `POST /api/v1/provider-profiles` ở bước 0.4 nữa (bước đó giữ lại để hiểu nghiệp vụ).

### Dữ liệu nghiệp vụ đã tạo

| Nhóm | Chi tiết |
|---|---|
| Destination (5) | Văn Miếu, Hoàng Thành, Bát Tràng, Quần Thể Tràng An, Chùa Trấn Quốc — đều `PUBLISHED` |
| Experience (5) | Giá 500k / 400k / 500k / 600k / 400k — đều `PUBLISHED`, gắn với đối tác tạo |
| Experience Slot | Mở bán từ hôm nay đến +30 ngày, `maxTourPerDay = 20`, có 1 slot hết chỗ (test unhappy path) |
| Tour (2) | ✅ "Hành trình Tràng An 2 ngày 1 đêm" (3 điểm đến, **2 đối tác**, 1.500.000đ) · ✅ "Hành trình kinh thành Thăng Long 1 ngày" (2 điểm đến, **1 đối tác**, 900.000đ) |
| Booking (9) | `COMPLETED` ×6 · `CONFIRMED` ×1 · `PENDING_PAYMENT` ×1 · `CANCELLED` ×1 |
| Payment (8) | `SUCCESS`, `bankCode` MOMO / VNBANK / VNPAYQR / INTCARD |
| Refund (2) | `JGSAMPLERF01` → `REFUNDED` (50%, chuyển khoản thủ công) · `JGSAMPLERF02` → `PENDING_REVIEW` (chặn tất toán) |
| ProviderRevenue (10) | `ELIGIBLE` ×6 · `PENDING` ×3 (`BOOKING_NOT_COMPLETED` ×2, `REFUND_PENDING` ×1) · `SETTLED` ×1 |
| Settlement (1) | `JGSETTLE001` — kỳ **3 tháng trước**, `APPROVED`, gross 900.000đ → **net 675.000đ** |
| Wallet (2) | Đối tác 1 (`id=2`): **625.000đ** (675.000 cộng − 50.000 điều chỉnh) · Đối tác 2 (`id=3`): **0đ** |
| FinancialAdjustment (1) | `JGSAMPLEADJ01` — `APPROVED`, **−50.000đ** (bồi hoàn chi phí vận hành) |

### Bản ghi mẫu dùng để tra cứu nhanh

| Mã / tên | Ý nghĩa |
|---|---|
| `JGSAMPLE01` … `JGSAMPLE09` | Mã booking mẫu (tìm qua `GET /api/v1/bookings?size=100`) |
| `JGSAMPLE01-TXN` … | Mã tham chiếu giao dịch (txnRef) |
| `JGSAMPLERF01` | Refund đã hoàn thành 50% — dùng cho PHẦN C |
| `JGSAMPLERF02` | Refund đang chờ duyệt — dùng cho PHẦN C.7 / D.1 (tiền bị hold) |
| `JGSETTLE001` | Settlement đã duyệt — dùng cho PHẦN D.11 / E |
| `JGSAMPLEADJ01` | Khoản điều chỉnh tài chính đã duyệt — dùng cho PHẦN E |

---

## 0.1. Đăng nhập tài khoản Tourist

🟦 **Xác thực (Authentication)**

▶ **POST** `/api/v1/auth/login`
🔑 `none`

📋 **Body:**
```json
{
  "email": "tourist1@journeygo.com",
  "password": "Password123@"
}
```

✅ **Kết quả:**
```json
{
  "code": 200,
  "message": "Đăng nhập thành công",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "tokenType": "Bearer",
    "expiresIn": 900000,
    "user": {
      "id": 2,
      "email": "tourist1@test.com",
      "fullName": "Nguyễn Văn A",
      "phone": "0912345678",
      "role": "TOURIST",
      "authProvider": "LOCAL",
      "avatarUrl": null,
      "avatar": null,
      "active": true,
      "createdAt": "2026-11-01T02:00:00Z",
      "updatedAt": "2026-11-01T02:00:00Z"
    }
  },
  "timestamp": "2026-11-20T02:00:00Z"
}
```

📌 **Lưu:** `data.accessToken` → gọi là `{{TOURIST_TOKEN}}`; `data.user.id` → `{userId}`.

---

## 0.2. Đăng nhập tài khoản Admin

🟦 **Xác thực (Authentication)**

▶ **POST** `/api/v1/auth/login`
🔑 `none`

📋 **Body:**
```json
{
  "email": "admin@journeygo.com",
  "password": "Password123@"
}
```

📌 **Lưu:** `data.accessToken` → `{{ADMIN_TOKEN}}`.

---

## 0.3. Đăng nhập tài khoản Tourist thứ 2

▶ **POST** `/api/v1/auth/login`
🔑 `none`

📋 **Body:**
```json
{
  "email": "tourist2@journeygo.com",
  "password": "Password123@"
}
```

📌 **Lưu:** `data.accessToken` → `{{TOURIST2_TOKEN}}`.

> **Về vai trò ADMIN:** `POST /api/v1/auth/register` chỉ nhận `TOURIST` / `CONTENT_PROVIDER`. Role `ADMIN` phải cấp trực tiếp trong DB:
> ```sql
> UPDATE users SET role_id = (SELECT id FROM roles WHERE name = 'ADMIN') WHERE email = 'admin@journeygo.com';
> ```

---

## 0.4. Tạo ProviderProfile (BẮT BUỘC — không có đối tác sẽ không sinh doanh thu)

🟦 **ProviderProfile (Đối tác)**

▶ **POST** `/api/v1/provider-profiles`
🔑 `Bearer {{ADMIN_TOKEN}}`

📋 **Body:**
```json
{
  "userId": 12,
  "providerName": "Ban Quản lý Tràng An",
  "commissionRate": 0.2500
}
```

✅ **Kết quả (HTTP 201):**
```json
{
  "code": 200,
  "message": "Tạo đối tác thành công",
  "data": {
    "id": 2,
    "userId": 12,
    "email": "provider1@journeygo.com",
    "fullName": "Tràng An Heritage",
    "providerName": "Ban Quản lý Tràng An",
    "commissionRate": 0.2500,
    "active": true,
    "hasWallet": true,
    "createdAt": "2026-11-20T02:00:00Z"
  },
  "timestamp": "2026-11-20T02:00:00Z"
}
```

📌 **Lưu:** `data.id` → `{providerProfileId}`

> ⚠️ **Điều kiện tiên quyết:** `userId` phải là user **tạo Experience** thuộc các điểm đến trong tour — đó là người sẽ nhận doanh thu. Hệ thống tự gán role `CONTENT_PROVIDER` cho user đó.
> ⚠️ **Wallet được tạo NGUYÊN TỬ cùng ProviderProfile** → `hasWallet: true`. Nếu tạo Wallet lỗi thì cả ProviderProfile cũng rollback.

---

## 0.5. Danh sách ProviderProfile (Admin)

🟦 **ProviderProfile (Đối tác)**

▶ **GET** `/api/v1/provider-profiles`
🔑 `Bearer {{ADMIN_TOKEN}}`
📋 **Query:** `page=0`, `size=20`, `active=true`

✅ **Kết quả:**
```json
{
  "code": 200,
  "message": "Lấy danh sách đối tác thành công",
  "data": {
    "page": 0,
    "size": 20,
    "totalElements": 2,
    "totalPages": 1,
    "first": true,
    "last": true,
    "content": [
      {
        "id": 2,
        "userId": 12,
        "email": "provider1@journeygo.com",
        "fullName": "Tràng An Heritage",
        "providerName": "Ban Quản lý Tràng An",
        "commissionRate": 0.2500,
        "active": true,
        "hasWallet": true,
        "createdAt": "2026-11-20T02:00:00Z"
      },
      {
        "id": 3,
        "userId": 13,
        "email": "provider2@journeygo.com",
        "fullName": "Hạ Long Bay Tours",
        "providerName": "Ban Quản lý Hạ Long",
        "commissionRate": 0.2000,
        "active": true,
        "hasWallet": true,
        "createdAt": "2026-11-20T02:00:00Z"
      }
    ]
  },
  "timestamp": "2026-11-20T02:00:00Z"
}
```

---

## 0.6. Cập nhật tỷ lệ hoa hồng của đối tác

🟦 **ProviderProfile (Đối tác)**

▶ **PUT** `/api/v1/provider-profiles/{providerProfileId}`
🔑 `Bearer {{ADMIN_TOKEN}}`

📋 **Body:**
```json
{
  "providerName": "Ban Quản lý Tràng An",
  "commissionRate": 0.2500,
  "active": true
}
```

✅ **Kết quả:**
```json
{
  "code": 200,
  "message": "Cập nhật đối tác thành công",
  "data": {
    "id": 2,
    "userId": 12,
    "email": "provider1@journeygo.com",
    "fullName": "Tràng An Heritage",
    "providerName": "Ban Quản lý Tràng An",
    "commissionRate": 0.2500,
    "active": true,
    "hasWallet": true,
    "createdAt": "2026-11-20T02:00:00Z"
  },
  "timestamp": "2026-11-20T02:00:00Z"
}
```

---

## 0.7. Kiểm tra Wallet của đối tác (mẫu đã có 625.000đ)

🟦 **Wallet (Ví nội bộ)**

▶ **GET** `/api/v1/wallets/provider-profile/{providerProfileId}`
🔑 `Bearer {{ADMIN_TOKEN}}`

✅ **Kết quả:**
```json
{
  "code": 200,
  "message": "Lấy thông tin ví thành công",
  "data": {
    "id": 2,
    "providerProfileId": 2,
    "providerName": "Ban Quản lý Tràng An",
    "balance": 625000.00,
    "currency": "VND",
    "createdAt": "2026-11-20T02:00:00Z",
    "updatedAt": "2026-11-20T02:00:00Z"
  },
  "timestamp": "2026-11-20T02:00:00Z"
}
```

---

# PHẦN A — Chọn tour (public) → Booking → Payment

## A.1. Xem danh sách tour đã public ⭐ (BẮT ĐẦU TỪ ĐÂY)

🟦 **Tour du lịch (Tours)**

▶ **GET** `/api/v1/tours/published`
🔑 `Bearer {{TOURIST_TOKEN}}`
📋 **Query:** `page=0`, `size=20`, `sort=createdAt`, `direction=desc`

✅ **Kết quả:**
```json
{
  "code": 200,
  "message": "Lấy danh sách tour đã xuất bản thành công",
  "data": {
    "page": 0,
    "size": 20,
    "totalElements": 2,
    "totalPages": 1,
    "first": true,
    "last": true,
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
          { "id": 1, "destinationId": 3, "destinationName": "Làng Gốm Bát Tràng", "destinationAddress": "Bát Tràng, Gia Lâm, Hà Nội" },
          { "id": 2, "destinationId": 4, "destinationName": "Quần Thể Di Sản Tràng An", "destinationAddress": "Tràng An, Hoa Lư, Ninh Bình" },
          { "id": 3, "destinationId": 5, "destinationName": "Chùa Trấn Quốc & Hồ Tây", "destinationAddress": "Đường Thanh Niên, Yên Phụ, Tây Hồ, Hà Nội" }
        ],
        "createdBy": "Hệ Thống Quản Trị",
        "createdAt": "2026-01-01T02:00:00Z",
        "updatedAt": "2026-11-01T02:00:00Z"
      },
      {
        "tourId": 2,
        "title": "Hành trình kinh thành Thăng Long 1 ngày",
        "tourType": "CULTURAL",
        "price": 900000,
        "durationDays": 1,
        "approved": true,
        "status": "PUBLISHED",
        "rejectionReason": null,
        "deleted": false,
        "deletedAt": null,
        "destinationCount": 2,
        "destinations": [
          { "id": 4, "destinationId": 1, "destinationName": "Văn Miếu – Quốc Tử Giám", "destinationAddress": "58 Quốc Tử Giám, Văn Miếu, Đống Đa, Hà Nội" },
          { "id": 5, "destinationId": 2, "destinationName": "Hoàng Thành Thăng Long", "destinationAddress": "19C Hoàng Diệu, Quán Thánh, Ba Đình, Hà Nội" }
        ],
        "createdBy": "Hệ Thống Quản Trị",
        "createdAt": "2026-01-01T02:00:00Z",
        "updatedAt": "2026-11-01T02:00:00Z"
      }
    ]
  },
  "timestamp": "2026-11-20T02:00:00Z"
}
```

📌 **Lưu:** `data.content[0].tourId` → `{tourId}`

> ⚠️ `/api/v1/tours/published` **CHƯA** nằm trong `PUBLIC_GET_ENDPOINTS` của `SecurityConfig` → phải gửi token, nếu không sẽ trả **401**.
> Muốn nó public thật sự thì thêm `"/api/v1/tours/**"` vào `PUBLIC_GET_ENDPOINTS`.
>
> 📌 **`tourType`** chỉ nhận các giá trị: `CULTURAL`, `ADVENTURE`, `BEACH`, `MOUNTAIN`, `CITY`, `ECOTOURISM`, `HISTORICAL`, `GASTRONOMY`, `OTHER`.
> 📌 **`price`** = tổng giá các Experience của các điểm đến trong hành trình ( tính động, không phải giá cố định của tour).

---

## A.2. Chi tiết tour (kiểm tra ngày trải nghiệm hợp lệ)

🟦 **Tour du lịch (Tours)**

▶ **GET** `/api/v1/tours/{tourId}`
🔑 `Bearer {{TOURIST_TOKEN}}`

✅ **Kết quả:**
```json
{
  "code": 200,
  "message": "Lấy thông tin tour thành công",
  "data": {
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
      { "id": 1, "destinationId": 3, "destinationName": "Làng gốm Bát Tràng", "destinationAddress": "Bát Tràng, Hà Nội" },
      { "id": 2, "destinationId": 4, "destinationName": "Quần thể Tràng An", "destinationAddress": "Tràng An, Ninh Bình" },
      { "id": 3, "destinationId": 5, "destinationName": "Chùa Trấn Quốc", "destinationAddress": "Tràng An, Ninh Bình" }
    ],
    "createdBy": "Hệ Thống Quản Trị",
    "createdAt": "2026-01-01T02:00:00Z",
    "updatedAt": "2026-11-01T02:00:00Z"
  },
  "timestamp": "2026-11-20T02:00:00Z"
}
```

---

## A.3. Xem 3 phương thức thanh toán khách có thể chọn ⭐

🟦 **Payment (Thanh toán VNPay)**

▶ **GET** `/api/v1/payments/methods`
🔑 `Bearer {{TOURIST_TOKEN}}`

✅ **Kết quả:**
```json
{
  "code": 200,
  "message": "Lấy danh sách phương thức thanh toán thành công",
  "data": {
    "methods": [
      {
        "bankCode": "VNPAYQR",
        "code": "QR_APP_WALLET",
        "label": "App ngân hàng và Ví điện tử (VNPay QR)",
        "description": "Quét mã QR bằng ứng dụng Mobile Banking hoặc ví điện tử liên kết VNPay-QR (MoMo, ZingPay, VNPay, Viettel Pay, VCB Digibank…)",
        "cardType": "QRCODE",
        "displayOrder": 1
      },
      {
        "bankCode": "VNBANK",
        "code": "DOMESTIC_CARD",
        "label": "Thẻ nội địa và tài khoản ngân hàng",
        "description": "Thanh toán bằng thẻ ATM nội địa hoặc tài khoản ngân hàng (Internet Banking, Mobile Banking của các ngân hàng Việt Nam)",
        "cardType": "ATM",
        "displayOrder": 2
      },
      {
        "bankCode": "VISA",
        "code": "INTERNATIONAL_CARD",
        "label": "Thẻ thanh toán quốc tế",
        "description": "Thanh toán bằng thẻ quốc tế Visa, Mastercard, JCB, UnionPay",
        "cardType": null,
        "displayOrder": 3
      }
    ],
    "bankGroups": [
      {
        "methodCode": "QR_APP_WALLET",
        "label": "App ngân hàng và Ví điện tử (VNPay QR)",
        "banks": [
          { "bankCode": "MOMO", "bankName": "MoMo", "logoLink": "https://sandbox.vnpayment.vn/...", "bankType": 1, "displayOrder": 1 },
          { "bankCode": "ZINGPAY", "bankName": "ZingPay", "logoLink": "https://sandbox.vnpayment.vn/...", "bankType": 1, "displayOrder": 2 }
        ]
      },
      {
        "methodCode": "DOMESTIC_CARD",
        "label": "Thẻ nội địa và tài khoản ngân hàng",
        "banks": [
          { "bankCode": "NCB", "bankName": "Ngân hàng NCB", "logoLink": "https://sandbox.vnpayment.vn/...", "bankType": 2, "displayOrder": 1 },
          { "bankCode": "MB", "bankName": "Ngân hàng MB", "logoLink": "https://sandbox.vnpayment.vn/...", "bankType": 2, "displayOrder": 2 }
        ]
      },
      {
        "methodCode": "INTERNATIONAL_CARD",
        "label": "Thẻ thanh toán quốc tế",
        "banks": [
          { "bankCode": "VISA", "bankName": "Thẻ quốc tế", "logoLink": "https://sandbox.vnpayment.vn/...", "bankType": 3, "displayOrder": 1 }
        ]
      }
    ],
    "bankCodeSent": false
  },
  "timestamp": "2026-11-20T02:00:00Z"
}
```

✅ **Điều kiện đạt:**
- `methods` có **đúng 3** phần tử → đúng 3 lựa chọn như Sandbox
- `bankCodeSent = false` → URL thanh toán **KHÔNG** gửi `vnp_BankCode` → khách tự chọn
- `bankGroups` được gom theo `bank_type`

> 📌 `bankGroups` lấy động từ API chính thức `POST /qrpayauth/api/merchant/get_bank_list`. Nếu mạng lỗi, `banks` sẽ là mảng rỗng nhưng `methods` vẫn đủ 3.

---

## A.4. Đặt tour (Booking) ⭐

🟦 **Booking (Đặt tour)**

▶ **POST** `/api/v1/bookings`
🔑 `Bearer {{TOURIST_TOKEN}}`

📋 **Body:**
```json
{
  "tourId": 1,
  "experienceDate": "2026-11-20"
}
```

✅ **Kết quả (HTTP 201):**
```json
{
  "code": 200,
  "message": "Đặt tour thành công",
  "data": {
    "id": 101,
    "bookingCode": "JG9F3A2B1C4D5E6F708",
    "touristId": 2,
    "touristName": "Nguyễn Văn A",
    "tourId": 1,
    "tourTitle": "Hành trình Tràng An 2 ngày 1 đêm",
    "experienceDate": "2026-11-20",
    "totalAmount": 1500000,
    "currency": "VND",
    "status": "PENDING_PAYMENT",
    "createdAt": "2026-11-20T02:00:00Z",
    "paymentDeadline": "2026-11-20T02:10:00Z",
    "paidAt": null,
    "confirmedAt": null,
    "completedAt": null,
    "cancellationReason": null,
    "slotHolds": [
      {
        "id": 501,
        "experienceSlotId": 701,
        "experienceId": 31,
        "slotDate": "2026-11-20",
        "released": false,
        "heldAt": "2026-11-20T02:00:00Z",
        "releasedAt": null
      },
      {
        "id": 502,
        "experienceSlotId": 702,
        "experienceId": 32,
        "slotDate": "2026-11-20",
        "released": false,
        "heldAt": "2026-11-20T02:00:00Z",
        "releasedAt": null
      }
    ]
  },
  "timestamp": "2026-11-20T02:00:00Z"
}
```

📌 **Lưu:** `data.id` → `{bookingId}`

✅ **Điều kiện đạt:**
| Kiểm tra | Kỳ vọng |
|---|---|
| `status` | `PENDING_PAYMENT` |
| `paymentDeadline` − `createdAt` | **đúng 10 phút** |
| `totalAmount` | = tổng giá Experience của tour (1.500.000) |
| `slotHolds` | 1 entry cho **mỗi Experience** của tour, `released = false` |
| `bookingCode` | format `JG` + 18 ký tự hex uppercase |

> 📌 Slot được giữ **nguyên tử** — nếu 1 trong các slot hết chỗ thì toàn bộ booking fail, không giữ slot dở.

---

## A.5. Kiểm tra lại booking vừa tạo

🟦 **Booking (Đặt tour)**

▶ **GET** `/api/v1/bookings/{bookingId}`
🔑 `Bearer {{TOURIST_TOKEN}}`

✅ **Kết quả:** giống hệt A.4.

---

## A.6. Danh sách booking của tôi

🟦 **Booking (Đặt tour)**

▶ **GET** `/api/v1/bookings/my`
🔑 `Bearer {{TOURIST_TOKEN}}`
📋 **Query:** `page=0`, `size=20`

✅ **Kết quả:**
```json
{
  "code": 200,
  "message": "Lấy danh sách booking thành công",
  "data": {
    "page": 0,
    "size": 20,
    "totalElements": 3,
    "totalPages": 1,
    "first": true,
    "last": true,
    "content": [
      {
        "id": 101,
        "bookingCode": "JG9F3A2B1C4D5E6F708",
        "touristId": 2,
        "touristName": "Nguyễn Văn A",
        "tourId": 1,
        "tourTitle": "Hành trình Tràng An 2 ngày 1 đêm",
        "experienceDate": "2026-11-20",
        "totalAmount": 1500000,
        "currency": "VND",
        "status": "PENDING_PAYMENT",
        "createdAt": "2026-11-20T02:00:00Z",
        "paymentDeadline": "2026-11-20T02:10:00Z",
        "paidAt": null,
        "confirmedAt": null,
        "completedAt": null,
        "cancellationReason": null,
        "slotHolds": []
      }
    ]
  },
  "timestamp": "2026-11-20T02:00:00Z"
}
```

---

## A.7. Khởi tạo thanh toán ⭐

🟦 **Payment (Thanh toán VNPay)**

▶ **POST** `/api/v1/payments/bookings/{bookingId}/init`
🔑 `Bearer {{TOURIST_TOKEN}}`
📋 **Query:** `bankCode` = **để trống** (khách tự chọn trên trang VNPay)

✅ **Kết quả (HTTP 201):**
```json
{
  "code": 200,
  "message": "Khởi tạo thanh toán thành công",
  "data": {
    "paymentId": 501,
    "bookingId": 101,
    "bookingCode": "JG9F3A2B1C4D5E6F708",
    "txnRef": "JG101-8F3A2B1C4D5E6F7089A",
    "amount": 1500000,
    "currency": "VND",
    "paymentUrl": "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?vnp_Amount=150000000&vnp_Command=pay&vnp_CurrCode=VND&vnp_ExpireDate=20261120021000&vnp_IpAddr=127.0.0.1&vnp_Locale=vn&vnp_OrderInfo=Thanh+toan+don+JG9F3A2B1C4D5E6F708&vnp_OrderType=other&vnp_ReturnUrl=https%3A%2F%2Ffavorite-pointing-crunching.ngrok-free.dev%2Fapi%2Fv1%2Fpayments%2Freturn&vnp_TmnCode=G46V3SQ0&vnp_TxnRef=JG101-8F3A2B1C4D5E6F7089A&vnp_Version=2.1.0&vnp_SecureHash=abc123...",
    "expiresAt": "2026-11-20T02:10:00Z",
    "selectedBankCode": null,
    "availableMethods": [
      { "bankCode": "VNPAYQR", "code": "QR_APP_WALLET", "label": "App ngân hàng và Ví điện tử (VNPay QR)", "description": "Quét mã QR...", "cardType": "QRCODE", "displayOrder": 1 },
      { "bankCode": "VNBANK", "code": "DOMESTIC_CARD", "label": "Thẻ nội địa và tài khoản ngân hàng", "description": "Thanh toán bằng thẻ ATM...", "cardType": "ATM", "displayOrder": 2 },
      { "bankCode": "VISA", "code": "INTERNATIONAL_CARD", "label": "Thẻ thanh toán quốc tế", "description": "Thanh toán bằng thẻ quốc tế...", "cardType": null, "displayOrder": 3 }
    ],
    "message": "Chọn phương thức thanh toán (Ứng dụng ngân hàng & ví điện tử / Thẻ nội địa & tài khoản ngân hàng / Thẻ thanh toán quốc tế) trên trang VNPay. Số tiền: 1500000 VND — Mã đơn: JG9F3A2B1C4D5E6F708"
  },
  "timestamp": "2026-11-20T02:00:30Z"
}
```

📌 **Lưu:** `data.paymentId` → `{paymentId}`; `data.txnRef` → dùng cho QueryDR / đối soát.

✅ **Kiểm tra `paymentUrl` bằng mắt:**
- ✅ **KHÔNG** có `vnp_BankCode=` → khách thấy đủ 3 lựa chọn
- ✅ Có `vnp_Amount=150000000` (= 1.500.000 × 100)
- ✅ Có `vnp_ExpireDate` và `vnp_SecureHash` (128 ký tự hex = HMACSHA512)
- ✅ Có `vnp_TmnCode=G46V3SQ0` (merchant Sandbox của bạn)
- ✅ Có `vnp_ReturnUrl=https%3A%2F%2Ffavorite-pointing-crunching.ngrok-free.dev%2Fapi%2Fv1%2Fpayments%2Freturn`
- ✅ `vnp_IpAddr=127.0.0.1` (IPv4 — KHÔNG phải `::1`, VNPay chỉ nhận IPv4)
- ✅ `selectedBankCode = null`

> 📌 `txnRef` có format `JG{bookingId}-{20 ký tự}`.

---

## A.8. (Tuỳ chọn) Khởi tạo thanh toán với phương thức chỉ định trước

🟦 **Payment (Thanh toán VNPay)**

▶ **POST** `/api/v1/payments/bookings/{bookingId}/init`
🔑 `Bearer {{TOURIST_TOKEN}}`
📋 **Query:** `bankCode=VNPAYQR`

✅ **Kết quả:**
```json
{
  "code": 200,
  "message": "Khởi tạo thanh toán thành công",
  "data": {
    "paymentId": 502,
    "bookingId": 101,
    "bookingCode": "JG9F3A2B1C4D5E6F708",
    "txnRef": "JG101-9C4E7D1F2A3B5C6D7E",
    "amount": 1500000,
    "currency": "VND",
    "paymentUrl": "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?vnp_Amount=150000000&vnp_BankCode=VNPAYQR&vnp_Command=pay&...",
    "expiresAt": "2026-11-20T02:10:00Z",
    "selectedBankCode": "VNPAYQR",
    "availableMethods": [ "..." ],
    "message": "..."
  },
  "timestamp": "2026-11-20T02:01:00Z"
}
```

📌 **Ghi chú quan trọng:**
- Mỗi lần gọi `/init` tạo **txnRef mới** → đây là hành vi **retry (UC-03)**.
- `expiresAt` **KHÔNG đổi** (vẫn là `paymentDeadline` cố định của booking).
- Chỉ dùng **payment cuối cùng** để thanh toán. Payment cũ sẽ ở trạng thái `PENDING`.

**Các giá trị `bankCode` hợp lệ:**

| `bankCode` | Mở thẳng màn hình |
|---|---|
| *(trống)* | Trang chọn phương thức (3 lựa chọn) |
| `VNPAYQR` | Quét mã QR |
| `VNBANK` | Thẻ ATM / tài khoản ngân hàng |
| `VISA` | Thẻ quốc tế (Visa/Mastercard/JCB) |
| `MOMO`, `ZINGPAY`, `NCB`, `MB`… | Ngân hàng / ví cụ thể (xem `bankGroups` ở A.3) |

---

## A.9. Thanh toán trên VNPay Sandbox

🟦 **Ngoài Swagger** — mở `data.paymentUrl` từ A.7 trong trình duyệt.

**Chọn 1 trong 3 phương thức (giống hệt VNPay Sandbox):**

| Phương thức | Dữ liệu test Sandbox |
|---|---|
| **Ứng dụng Ngân hàng & Ví điện tử** | Chọn ví (MoMo / ZingPay) trong app giả lập → xác nhận thanh toán |
| **Thẻ nội địa & tài khoản ngân hàng** | **NCB** · Số thẻ `9704198526191432198` · Hạn `07/15` · OTP `123456` |
| **Thẻ thanh toán quốc tế** | Số thẻ `4456530000001005` (VISA) · Hạn `12/26` · CVV `123` · Email `test@gmail.com` · Địa chỉ `22 Lang Ha, Ha Noi` |

> 🧪 **Thẻ test chính thức từ VNPAY (Sandbox):**
>
> | Ngân hàng | Số thẻ | Tên chủ thẻ | Ngày phát hành | Mật khẩu OTP |
> |---|---|---|---|---|
> | NCB | `9704198526191432198` | NGUYEN VAN A | 07/15 | `123456` |
>
> 💳 **Thẻ quốc tế (Sandbox chỉ nhận các số thẻ dưới đây):**
>
> | Loại thẻ | Số thẻ | CVC | Hạn | Ghi chú |
> |---|---|---|---|---|
> | VISA (No 3DS) | `4456530000001005` | `123` | `12/26` | Thành công |
> | VISA (3DS) | `4456530000001096` | `123` | `12/26` | Thành công |
> | MASTERCARD (No 3DS) | `5200000000001005` | `123` | `12/26` | Thành công |
> | MASTERCARD (3DS) | `5200000000001096` | `123` | `12/26` | Thành công |
> | JCB (No 3DS) | `3337000000000008` | `123` | `12/26` | Thành công |
> | JCB (3DS) | `3337000000200004` | `123` | `12/24` | Thành công |
>
> Thẻ quốc tế điền thêm: Tên chủ thẻ `NGUYEN VAN A` · Email `test@gmail.com` ·
> Địa chỉ `22 Lang Ha` · Thành phố `Ha Noi`.
>
> ⚠️ **Lưu ý:** `4111111111111111` (số thẻ Visa test phổ biến) **KHÔNG nằm trong
> allow-list của VNPay Sandbox** → sẽ báo lỗi. Phải dùng đúng số thẻ trong bảng trên.
>
> 📌 `vnp_BankCode=VISA` là mã **đang dùng** cho nhóm "Thẻ thanh toán quốc tế".
> ⚠️ `INTCARD` **KHÔNG được VNPay Sandbox chấp nhận** (đã kiểm chứng: URL bị fallback
> về trang chọn phương thức ⇒ không mở form nhập thẻ ⇒ báo lỗi). Các mã hợp lệ lấy
> từ API `get_bank_list` (bank_type = 3): `VISA` / `MASTERCARD` / `JCB` / `UPI` / `AMEX`.
> Ta dùng `VISA` vì trang đó nhận ĐẦY ĐỦ cả Visa/Mastercard/JCB.
>
> ⚠️ **Return URL PHẢI là URL public (ngrok)** — trình duyệt trên điện thoại mở
> `localhost` là chính điện thoại ⇒ không tới được backend ⇒ mobile không quay lại
> được app. Dùng `/payments/return-page` (trang HTML) + `app_redirect=1` để
> trình duyệt chuyển hướng về app qua deep link `journeygo://payment/return`.
>
> 📌 **Merchant Sandbox đang dùng:**
> - `vnp_TmnCode` = `G46V3SQ0`
> - Merchant Admin (xem giao dịch): https://sandbox.vnpayment.vn/merchantv2/ (user: `luongdvse181578@fpt.edu.vn`)
> - **Trang cấu hình IPN URL:** https://sandbox.vnpayment.vn/vnpaygw-sit-testing/ipn
> - Tài liệu: https://sandbox.vnpayment.vn/apis/docs/thanh-toan-pay/pay.html
>
> ⚠️ **IPN cần URL public HTTPS.** VNPay gọi server-to-server →
> localhost không khả dụng. Dùng ngrok (hoặc Cloudflare Tunnel / localtunnel):
> ```bash
> ngrok http 8088
> ```
>
> Cấu hình hiện tại trong `backend/.env`:
> ```bash
> VNPAY_IPN_URL=https://favorite-pointing-crunching.ngrok-free.dev/api/v1/payments/ipn
> VNPAY_RETURN_URL=https://favorite-pointing-crunching.ngrok-free.dev/api/v1/payments/return-page
> VNPAY_APP_RETURN_URL=journeygo://payment/return   # ← deep link trực tiếp (không cần tunnel)
> VNPAY_APP_REDIRECT_ENABLED=false   # mobile tự gửi `appRedirect=true` theo từng giao dịch
> VNPAY_APP_SCHEME=journeygo
> ```
>
> ### ✅ ĐÃ KIỂM CHỨNG — Deep link trực tiếp (KHÔNG cần tunnel)
>
> **Phát hiện quan trọng:** nếu `vnp_ReturnUrl` là **CUSTOM SCHEME**
> (`journeygo://payment/return`) thì VNPay Sandbox chuyển hướng trình duyệt
> **thẳng về app**, kèm **TOÀN BỘ tham số kết quả ĐÃ KÝ**:
> ```
> journeygo://payment/return?vnp_Amount=…&vnp_ResponseCode=00
>   &vnp_TransactionStatus=00&vnp_TransactionNo=…&vnp_PayDate=…
>   &vnp_SecureHash=…            ← chữ ký HMACSHA512 của VNPay
> ```
> ⇒ App gửi lại các tham số đó cho `POST /api/v1/payments/return-result`
> ⇒ backend kiểm tra chữ ký rồi áp dụng ⇒ **khách thấy "thanh toán thành công" NGAY**.
>
> **Lợi ích:** app **KHÔNG cần** ngrok/tunnel còn sống, và **KHÔNG phụ thuộc** lệnh
> `querydr` (lệnh này đang trả `vnp_ResponseCode=99` "Unexpected error" cho **MỌI**
> giao dịch trên Sandbox — đã kiểm chứng với >20 hình thức request, kể cả giao dịch
> đã thanh toán thành công).
>
> **Bật bằng cách đặt trong `backend/.env`:**
> ```bash
> VNPAY_APP_RETURN_URL=journeygo://payment/return
> ```
> (`VNPAY_IPN_URL` vẫn nên để trỏ ngrok — IPN là nguồn xác minh server-to-server
> đáng tin cậy, giúp backend tự cập nhật trạng thái ngay cả khi app bị kill.)
>
> **Cơ chế chạy song song (không xung đột):**
> 1. **Deep link có chữ ký** → app POST `/payments/return-result` → backend áp dụng → ✅
> 2. **Deep link không có chữ ký / app bị kill** → fallback polling `GET /payments/{id}`
>    + `POST /payments/{id}/query` (QueryDR) qua `PendingPaymentGuard`.
>
> 📌 **Sau khi đổi `VNPAY_IPN_URL` / `VNPAY_RETURN_URL` phải restart app** — cấu hình được
> đọc lúc khởi động, không hot-reload.
>
> 📌 **Khai báo IPN URL:**
> - Sandbox SIT Testing (dùng để test): https://sandbox.vnpayment.vn/vnpaygw-sit-testing/ipn
>   → dán `https://favorite-pointing-crunching.ngrok-free.dev/api/v1/payments/ipn` → *Lưu*
> - Hoặc Merchant Admin → *Thông tin tài khoản* → bấm biểu tượng **Sửa** (edit) trên
>   website/terminal → trường **IPN URL** → dán URL ngrok → *Cập nhật*
>   (URL: `https://sandbox.vnpayment.vn/merchantv2/Account/TerminalEdit.htm`)
>
> ⚠️ **Subdomain ngrok miễn phí ĐỔI MỖI LẦN KHỞI ĐỘNG LẠI.** Nếu ngrok ra subdomain mới
> (vd `xxx.ngrok-free.dev`) thì phải:
> 1. cập nhật `VNPAY_IPN_URL` trong `backend/.env`
> 2. cập nhật IPN URL ở trang cấu hình IPN (bước trên)
> 3. restart backend
>
> 🧪 **Kiểm tra IPN đã tới chưa:**
> ```bash
> # 1) Tunnel còn sống? (endpoint nhận cả GET và POST)
> curl -i -X POST https://<subdomain>.ngrok-free.dev/api/v1/payments/ipn \
>   -d "vnp_TxnRef=probe"
> # → HTTP 200 {"RspCode":"97","Message":"Invalid signature"}  = tunnel OK, app OK
> # → HTTP 404 rỗng                                        = ngrok chưa chạy / sai port
>
> # 2) IPN đã tới app chưa? (xem log backend)
> [Payment][IPN] txnRef=... kết quả=SUCCESS ipnCount=1
> ```
>
> 🧪 **Kiểm tra Return URL:** mở `https://<subdomain>.ngrok-free.dev/api/v1/payments/return`
> → phải trả JSON (không phải trang lỗi ngrok).

Sau khi thanh toán, VNPay redirect về `returnUrl` với các tham số `vnp_*`, đồng thời gọi `/api/v1/payments/ipn` (server-to-server).

> 📌 **Giao thức IPN của VNPay 2.1.0:** tài liệu chính thức ghi *"Cài đặt Code IPN URL — Phương thức: GET"*
> và URL VNPay gọi về có dạng `https://{domain}/IPN?vnp_Amount=...&vnp_ResponseCode=00&...`
> (query string). Backend đã hỗ trợ **cả GET và POST** trên cùng endpoint để tương thích
> với mọi biến thể của sandbox. Phản hồi trả `{"RspCode":"00","Message":"Confirm Success"}` —
> `00`/`02` = đã xử lý xong (VNPay không retry), `01`/`04`/`97`/`99` = lỗi (VNPay retry).

---

## A.10. Kiểm tra kết quả thanh toán

🟦 **Payment (Thanh toán VNPay)**

▶ **GET** `/api/v1/payments/{paymentId}`
🔑 `Bearer {{TOURIST_TOKEN}}`

✅ **Kết quả:**
```json
{
  "code": 200,
  "message": "Lấy thông tin giao dịch thành công",
  "data": {
    "id": 501,
    "bookingId": 101,
    "bookingCode": "JG9F3A2B1C4D5E6F708",
    "txnRef": "JG101-8F3A2B1C4D5E6F7089A",
    "vnpTransactionNo": "14226112",
    "method": "VNPAY",
    "bankCode": "MOMO",
    "cardType": "QRCODE",
    "status": "SUCCESS",
    "amount": 1500000,
    "currency": "VND",
    "createdAt": "2026-11-20T02:00:30Z",
    "expiresAt": "2026-11-20T02:10:00Z",
    "paidAt": "2026-11-20T02:03:00Z",
    "paymentUrl": "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?...",
    "duplicatePayment": false,
    "ipnCount": 1,
    "vnpResponseCode": "00",
    "vnpTransactionStatus": "00",
    "vnpMessage": "Giao dich thanh cong",
    "note": null
  },
  "timestamp": "2026-11-20T02:04:00Z"
}
```

✅ **Điều kiện đạt:**
| Trường | Kỳ vọng |
|---|---|
| `status` | `SUCCESS` |
| `paidAt` | khác null |
| `method` | `VNPAY` |
| `cardType` | `QRCODE` (QR) \| `ATM` (thẻ nội địa) \| `null` (thẻ quốc tế) |
| `ipnCount` | ≥ 1 |
| `duplicatePayment` | `false` |

> 📌 `vnp_CardType` của VNPay chỉ có **2** giá trị: `ATM` và `QRCODE`. Thẻ quốc tế sẽ không khớp 2 giá trị này → `cardType = null`.

---

## A.11. Kiểm tra Booking đã được xác nhận

🟦 **Booking (Đặt tour)**

▶ **GET** `/api/v1/bookings/{bookingId}`
🔑 `Bearer {{TOURIST_TOKEN}}`

✅ **Kết quả:**
```json
{
  "code": 200,
  "message": "Lấy thông tin booking thành công",
  "data": {
    "id": 101,
    "bookingCode": "JG9F3A2B1C4D5E6F708",
    "touristId": 2,
    "touristName": "Nguyễn Văn A",
    "tourId": 1,
    "tourTitle": "Hành trình Tràng An 2 ngày 1 đêm",
    "experienceDate": "2026-11-20",
    "totalAmount": 1500000,
    "currency": "VND",
    "status": "CONFIRMED",
    "createdAt": "2026-11-20T02:00:00Z",
    "paymentDeadline": "2026-11-20T02:10:00Z",
    "paidAt": "2026-11-20T02:03:00Z",
    "confirmedAt": "2026-11-20T02:03:00Z",
    "completedAt": null,
    "cancellationReason": null,
    "slotHolds": [
      { "id": 501, "experienceSlotId": 701, "experienceId": 31, "slotDate": "2026-11-20", "released": false, "heldAt": "2026-11-20T02:00:00Z", "releasedAt": null }
    ]
  },
  "timestamp": "2026-11-20T02:04:00Z"
}
```

✅ **Điều kiện đạt:** `status = CONFIRMED`, `paidAt` khác null, `confirmedAt` khác null.

---

## A.12. Nếu IPN chưa đến — QueryDR thủ công

🟦 **Payment (Thanh toán VNPay)**

▶ **POST** `/api/v1/payments/{paymentId}/query`
🔑 `Bearer {{TOURIST_TOKEN}}`

✅ **Kết quả:**
```json
{
  "code": 200,
  "message": "Truy vấn kết quả giao dịch",
  "data": {
    "outcome": "SUCCESS",
    "message": "Giao dịch đã được xác minh thành công"
  },
  "timestamp": "2026-11-20T02:05:00Z"
}
```

✅ **Các giá trị `outcome` khả dĩ:**

| `outcome` | Ý nghĩa |
|---|---|
| `SUCCESS` | Đã xác minh thành công → booking `CONFIRMED` |
| `FAILED` | Đã xác minh thất bại → **cho phép** tạo lần thanh toán mới |
| `CANCELLED` | Khách hủy trên trang VNPay → **cho phép** thử lại |
| `DUPLICATE` | Giao dịch trùng — booking đã được thanh toán bởi giao dịch khác |
| `UNKNOWN` | Chưa xác minh được → **KHÔNG** cho tạo giao dịch mới |

> ⚠️ `UNKNOWN` là trạng thái nguy hiểm nhất về mặt tài chính — không được tự kết luận là thất bại.

---

## A.13. Danh sách toàn bộ payment (Admin)

🟦 **Payment (Thanh toán VNPay)**

▶ **GET** `/api/v1/payments`
🔑 `Bearer {{ADMIN_TOKEN}}`
📋 **Query:** `status=SUCCESS`, `page=0`, `size=20`

✅ **Kết quả:**
```json
{
  "code": 200,
  "message": "Lấy danh sách giao dịch thành công",
  "data": {
    "page": 0,
    "size": 20,
    "totalElements": 25,
    "totalPages": 2,
    "first": true,
    "last": false,
    "content": [
      { "id": 501, "bookingId": 101, "txnRef": "JG101-8F3A2B1C4D5E6F7089A", "method": "VNPAY", "bankCode": "MOMO", "cardType": "QRCODE", "status": "SUCCESS", "amount": 1500000, "currency": "VND", "createdAt": "2026-11-20T02:00:30Z", "expiresAt": "2026-11-20T02:10:00Z", "paidAt": "2026-11-20T02:03:00Z", "paymentUrl": "https://...", "duplicatePayment": false, "ipnCount": 1, "vnpResponseCode": "00", "vnpTransactionStatus": "00", "vnpMessage": "Giao dich thanh cong", "note": null, "vnpTransactionNo": "14226112", "bookingCode": "JG9F3A2B1C4D5E6F708" }
    ]
  },
  "timestamp": "2026-11-20T02:10:00Z"
}
```

---

## A.14. Unhappy case — Vượt sức chứa (UC-02)

🟦 **Booking (Đặt tour)**

▶ **POST** `/api/v1/bookings`
🔑 `Bearer {{TOURIST2_TOKEN}}`

📋 **Body:**
```json
{
  "tourId": 1,
  "experienceDate": "2026-11-20"
}
```

✅ **Kết quả mong đợi (HTTP 409):**
```json
{
  "code": 409,
  "message": "Trải nghiệm đã hết chỗ cho ngày này",
  "timestamp": "2026-11-20T02:05:00Z"
}
```

> **Chuẩn bị:** đặt `max_tour_per_day = 1` cho experience và `booked_tour_count = 1` trong DB.
> **Kiểm tra rollback:** `booked_tour_count` **không** tăng thêm, **không** có bản ghi `booking_slot_holds` mới.

---

## A.15. Unhappy case — Timeout 10 phút (UC-01)

**Chuẩn bị (SQL):**
```sql
UPDATE bookings SET payment_deadline = NOW() - INTERVAL '1 minute' WHERE id = 101;
```

🟦 **Payment (Thanh toán VNPay)**

▶ **POST** `/api/v1/payments/bookings/{bookingId}/init`
🔑 `Bearer {{TOURIST_TOKEN}}`

✅ **Kết quả mong đợi (HTTP 409):**
```json
{
  "code": 409,
  "message": "Booking đã hết hạn thanh toán (10 phút) — không thể tạo giao dịch mới",
  "timestamp": "2026-11-20T02:15:00Z"
}
```

▶ **GET** `/api/v1/bookings/{bookingId}` → `status = EXPIRED`, slot đã giải phóng (`released = true`).

---

## A.16. Unhappy case — Retry khi chưa rõ kết quả (UC-03)

▶ **POST** `/api/v1/payments/bookings/{bookingId}/init`
🔑 `Bearer {{TOURIST_TOKEN}}`

✅ **Kết quả mong đợi (HTTP 409):**
```json
{
  "code": 409,
  "message": "Chưa xác minh được kết quả giao dịch trước (mã JG101-8F3A2B1C4D5E6F7089A). Vui lòng kiểm tra lại sau — hệ thống không cho phép tạo giao dịch mới để tránh thanh toán trùng.",
  "timestamp": "2026-11-20T02:06:00Z"
}
```

> **Khi nào cho retry:** attempt trước `FAILED` hoặc `CANCELLED` → API trả 201 với **txnRef mới**, `expiresAt` **không đổi**.

---

## A.17. Unhappy case — Hủy booking

🟦 **Booking (Đặt tour)**

▶ **POST** `/api/v1/bookings/{bookingId}/cancel`
🔑 `Bearer {{TOURIST_TOKEN}}`

📋 **Body:**
```json
{
  "reason": "Không thể đi được do thời tiết"
}
```

✅ **Kết quả:**
```json
{
  "code": 200,
  "message": "Hủy booking thành công",
  "data": {
    "id": 103,
    "bookingCode": "JG3B7C9D1E2F4A5B6C8",
    "touristId": 3,
    "touristName": "Nguyễn Văn B",
    "tourId": 1,
    "tourTitle": "Hành trình Tràng An 2 ngày 1 đêm",
    "experienceDate": "2026-11-20",
    "totalAmount": 1500000,
    "currency": "VND",
    "status": "CANCELLED",
    "createdAt": "2026-11-20T02:07:00Z",
    "paymentDeadline": "2026-11-20T02:17:00Z",
    "paidAt": null,
    "confirmedAt": null,
    "completedAt": null,
    "cancellationReason": "Không thể đi được do thời tiết",
    "slotHolds": [
      { "id": 505, "experienceSlotId": 701, "experienceId": 31, "slotDate": "2026-11-20", "released": true, "heldAt": "2026-11-20T02:07:00Z", "releasedAt": "2026-11-20T02:07:00Z" }
    ]
  },
  "timestamp": "2026-11-20T02:07:00Z"
}
```

> **Hủy booking đã thanh toán** → HTTP 409 `"Booking đã thanh toán — không thể hủy trực tiếp"`.

---

# PHẦN B — Hoàn thành trải nghiệm → Kiểm tra doanh thu

> ⚠️ **BẮT BUỘC** — doanh thu đối tác chỉ được xét tất toán **sau khi booking `COMPLETED`**.

## B.1. Bắt đầu hành trình

🟦 **Hành trình trải nghiệm (Tourist Journey)**

▶ **POST** `/api/v1/journeys`
🔑 `Bearer {{TOURIST_TOKEN}}`

📋 **Body:**
```json
{
  "bookingId": 101,
  "tourId": 1
}
```

✅ **Kết quả (HTTP 201):**
```json
{
  "code": 200,
  "message": "Bắt đầu chuyến đi thành công",
  "data": {
    "id": 901,
    "userId": 2,
    "bookingId": 101,
    "tourId": 1,
    "tourName": "Hành trình Tràng An 2 ngày 1 đêm",
    "status": "IN_PROGRESS",
    "currentDestinationOrder": 1,
    "totalDestinations": 3,
    "startedAt": "2026-11-20T03:00:00Z",
    "completedAt": null,
    "createdAt": "2026-11-20T03:00:00Z",
    "destinations": [
      {
        "id": 1001,
        "destinationId": 11,
        "destinationName": "Vân Long",
        "orderIndex": 1,
        "experienceId": 31,
        "status": "NOT_STARTED",
        "checkedIn": false,
        "checkedInAt": null,
        "badgeAwarded": false,
        "badgeId": null,
        "tasksCompleted": 0,
        "totalTasks": 2,
        "startedAt": null,
        "completedAt": null,
        "tasks": []
      }
    ]
  },
  "timestamp": "2026-11-20T03:00:00Z"
}
```

📌 **Lưu:** `data.id` → `{journeyId}`

---

## B.2. Chi tiết hành trình (lấy danh sách điểm đến)

🟦 **Hành trình trải nghiệm (Tourist Journey)**

▶ **GET** `/api/v1/journeys/{journeyId}`
🔑 `Bearer {{TOURIST_TOKEN}}`

✅ **Kết quả:**
```json
{
  "code": 200,
  "message": "Lấy thông tin tiến độ chuyến đi thành công",
  "data": {
    "id": 901,
    "userId": 2,
    "bookingId": 101,
    "tourId": 1,
    "tourName": "Hành trình Tràng An 2 ngày 1 đêm",
    "status": "IN_PROGRESS",
    "currentDestinationOrder": 1,
    "totalDestinations": 3,
    "startedAt": "2026-11-20T03:00:00Z",
    "completedAt": null,
    "createdAt": "2026-11-20T03:00:00Z",
    "destinations": [
      { "id": 1001, "destinationId": 11, "destinationName": "Vân Long", "orderIndex": 1, "experienceId": 31, "status": "NOT_STARTED", "checkedIn": false, "checkedInAt": null, "badgeAwarded": false, "badgeId": null, "tasksCompleted": 0, "totalTasks": 2, "startedAt": null, "completedAt": null, "tasks": [] },
      { "id": 1002, "destinationId": 12, "destinationName": "Tràng An", "orderIndex": 2, "experienceId": 32, "status": "NOT_STARTED", "checkedIn": false, "checkedInAt": null, "badgeAwarded": false, "badgeId": null, "tasksCompleted": 0, "totalTasks": 3, "startedAt": null, "completedAt": null, "tasks": [] },
      { "id": 1003, "destinationId": 13, "destinationName": "Hang Múa", "orderIndex": 3, "experienceId": 33, "status": "NOT_STARTED", "checkedIn": false, "checkedInAt": null, "badgeAwarded": false, "badgeId": null, "tasksCompleted": 0, "totalTasks": 2, "startedAt": null, "completedAt": null, "tasks": [] }
    ]
  },
  "timestamp": "2026-11-20T03:01:00Z"
}
```

📌 **Lưu:** lấy 3 giá trị `destinationId` = `11`, `12`, `13` để dùng ở B.3.

---

## B.3. Hoàn thành từng điểm đến (bỏ qua để test nhanh)

🟦 **Hành trình trải nghiệm (Tourist Journey)**

▶ **PATCH** `/api/v1/journeys/{journeyId}/destinations/{destinationId}/skip`
🔑 `Bearer {{TOURIST_TOKEN}}`
📋 **Body:** *(không cần body)*

Lặp lại cho từng `destinationId`: `11` → `12` → `13`

✅ **Kết quả (lần 1):**
```json
{
  "code": 200,
  "message": "Đã bỏ qua điểm đến này thành công",
  "data": {
    "id": 1001,
    "destinationId": 11,
    "destinationName": "Vân Long",
    "orderIndex": 1,
    "experienceId": 31,
    "status": "SKIPPED",
    "checkedIn": false,
    "checkedInAt": null,
    "badgeAwarded": false,
    "badgeId": null,
    "tasksCompleted": 0,
    "totalTasks": 2,
    "startedAt": "2026-11-20T03:00:00Z",
    "completedAt": "2026-11-20T03:05:00Z",
    "tasks": []
  },
  "timestamp": "2026-11-20T03:05:00Z"
}
```

✅ **Kết quả (lần cuối):**
```json
{
  "code": 200,
  "message": "Đã bỏ qua điểm đến này thành công",
  "data": {
    "id": 1003,
    "destinationId": 13,
    "destinationName": "Hang Múa",
    "orderIndex": 3,
    "experienceId": 33,
    "status": "SKIPPED",
    "checkedIn": false,
    "checkedInAt": null,
    "badgeAwarded": false,
    "badgeId": null,
    "tasksCompleted": 0,
    "totalTasks": 2,
    "startedAt": "2026-11-20T03:10:00Z",
    "completedAt": "2026-11-20T03:15:00Z",
    "tasks": []
  },
  "timestamp": "2026-11-20T03:15:00Z"
}
```

▶ **GET** `/api/v1/journeys/{journeyId}` → `status = COMPLETED`, `completedAt` khác null.

> 💡 **Thay vì bỏ qua**, có thể dùng `POST /api/v1/journeys/{journeyId}/destinations/{destinationId}/check-in` với body:
> ```json
> {
>   "verificationMethod": "GPS",
>   "latitude": 20.4524,
>   "longitude": 105.9750
> }
> ```
> (cần đúng tọa độ trong bán kính cho phép; nếu không sẽ không nhận được badge.)

---

## B.4. Kiểm tra Booking đã COMPLETED

🟦 **Booking (Đặt tour)**

▶ **GET** `/api/v1/bookings/{bookingId}`
🔑 `Bearer {{TOURIST_TOKEN}}`

✅ **Kết quả:**
```json
{
  "code": 200,
  "message": "Lấy thông tin booking thành công",
  "data": {
    "id": 101,
    "bookingCode": "JG9F3A2B1C4D5E6F708",
    "touristId": 2,
    "touristName": "Nguyễn Văn A",
    "tourId": 1,
    "tourTitle": "Hành trình Tràng An 2 ngày 1 đêm",
    "experienceDate": "2026-11-20",
    "totalAmount": 1500000,
    "currency": "VND",
    "status": "COMPLETED",
    "createdAt": "2026-11-20T02:00:00Z",
    "paymentDeadline": "2026-11-20T02:10:00Z",
    "paidAt": "2026-11-20T02:03:00Z",
    "confirmedAt": "2026-11-20T02:03:00Z",
    "completedAt": "2026-11-20T03:15:00Z",
    "cancellationReason": null,
    "slotHolds": [ "..." ]
  },
  "timestamp": "2026-11-20T03:16:00Z"
}
```

✅ **Điều kiện đạt:** `status = COMPLETED`, `completedAt` khác null.

> 📌 Khi booking `COMPLETED`, hệ thống bắn event `BookingCompletedEvent` → `ProviderRevenueService` tính lại doanh thu và đánh giá 9 điều kiện.

---

## B.5. Xem doanh thu của đối tác

🟦 **Provider Revenue (Doanh thu đối tác)**

▶ **GET** `/api/v1/provider-revenues/provider-profile/{providerProfileId}`
🔑 `Bearer {{ADMIN_TOKEN}}`
📋 **Query:** `page=0`, `size=20`

✅ **Kết quả:**
```json
{
  "code": 200,
  "message": "Lấy danh sách doanh thu thành công",
  "data": {
    "page": 0,
    "size": 20,
    "totalElements": 1,
    "totalPages": 1,
    "first": true,
    "last": true,
    "content": [
      {
        "id": 301,
        "providerProfileId": 1,
        "providerName": "Ban Quản lý Tràng An",
        "bookingId": 101,
        "bookingCode": "JG9F3A2B1C4D5E6F708",
        "paymentId": 501,
        "txnRef": "JG101-8F3A2B1C4D5E6F7089A",
        "revenuePeriod": "2026-11",
        "completedDate": "2026-11-20",
        "grossAmount": 1500000,
        "refundAmount": 0,
        "commissionRate": 0.2500,
        "commissionAmount": 375000.00,
        "adjustmentAmount": 0,
        "providerNetAmount": 1125000.00,
        "status": "ELIGIBLE",
        "deferredReason": null,
        "settlementId": null,
        "eligibleAt": "2026-11-20T03:15:00Z",
        "settledAt": null,
        "createdAt": "2026-11-20T02:03:00Z"
      }
    ]
  },
  "timestamp": "2026-11-20T03:17:00Z"
}
```

📌 **Lưu:** `data.content[0].id` → `{revenueId}`

✅ **Kiểm tra công thức** (với `commissionRate = 0.2500` như bước 0.6):
```
GrossAmount     = 1.500.000
RefundAmount    = 0
NetCollected    = 1.500.000 − 0        = 1.500.000
Commission      = 1.500.000 × 0.25     = 375.000
ProviderNet      = 1.500.000 − 375.000  = 1.125.000  ✅
```

> 📌 **Công thức chuẩn:**
> `NetCollected = Gross − Refund` → `Commission = NetCollected × CommissionRate` → `ProviderNet = NetCollected − Commission + Adjustment`
> 📌 **`revenuePeriod`** = tháng **hoàn thành trải nghiệm** (dùng `completedDate`), không phải tháng thanh toán.
> 📌 **`grossAmount`** khi tour có **nhiều đối tác** được chia theo tổng giá Experience của mỗi đối tác.

---

## B.6. Xem 9 điều kiện đủ tư cách tất toán ⭐

🟦 **Provider Revenue (Doanh thu đối tác)**

▶ **GET** `/api/v1/provider-revenues/{revenueId}/eligibility`
🔑 `Bearer {{ADMIN_TOKEN}}`

✅ **Kết quả:**
```json
{
  "code": 200,
  "message": "Đánh giá điều kiện tất toán thành công",
  "data": {
    "eligible": true,
    "deferredReason": null,
    "checks": [
      { "code": "1_PAYMENT_VERIFIED", "description": "Payment thành công đã được xác minh", "passed": true, "detail": "OK" },
      { "code": "2_BOOKING_COMPLETED", "description": "Booking đã hoàn thành trải nghiệm", "passed": true, "detail": "OK" },
      { "code": "3_NO_PENDING_REFUND", "description": "Không có Refund chưa có kết quả cuối cùng", "passed": true, "detail": "OK" },
      { "code": "4_REFUND_APPLIED", "description": "Số tiền Refund thành công đã được cập nhật", "passed": true, "detail": "refundAmount=0" },
      { "code": "5_NO_RECONCILIATION_ISSUE", "description": "Không có vấn đề đối soát tài chính", "passed": true, "detail": "OK" },
      { "code": "6_NOT_SETTLED", "description": "Chưa thuộc Settlement đang xử lý hoặc đã duyệt", "passed": true, "detail": "status=ELIGIBLE" },
      { "code": "7_CALCULATED", "description": "Hoa hồng và doanh thu đối tác đã được tính", "passed": true, "detail": "commission=375000.00, net=1125000.00" },
      { "code": "8_POSITIVE_NET", "description": "Doanh thu còn lại sau Refund và điều chỉnh lớn hơn 0", "passed": true, "detail": "providerNet=1125000.00" }
    ]
  },
  "timestamp": "2026-11-20T03:18:00Z"
}
```

✅ **Điều kiện đạt:** `eligible = true`, cả 8 check `passed = true`, `deferredReason = null`.

**Các `deferredReason` có thể gặp:**

| `deferredReason` | Nguyên nhân |
|---|---|
| `PAYMENT_NOT_VERIFIED` | Payment chưa được xác minh thành công |
| `BOOKING_NOT_COMPLETED` | Booking chưa hoàn thành trải nghiệm |
| `REFUND_PENDING` | Có Refund đang chờ duyệt / đang xử lý / chưa rõ kết quả |
| `FINANCIAL_REVIEW_REQUIRED` | Cần kiểm tra đối soát hoặc sai lệch tài chính |

---

## B.7. Doanh thu theo booking (kiểm tra tour nhiều đối tác)

🟦 **Provider Revenue (Doanh thu đối tác)**

▶ **GET** `/api/v1/provider-revenues/bookings/{bookingId}`
🔑 `Bearer {{ADMIN_TOKEN}}`

✅ **Kết quả (tour có 1 đối tác):**
```json
{
  "code": 200,
  "message": "Lấy doanh thu của booking thành công",
  "data": [
    { "id": 301, "providerProfileId": 1, "providerName": "Ban Quản lý Tràng An", "bookingId": 101, "bookingCode": "JG9F3A2B1C4D5E6F708", "paymentId": 501, "txnRef": "JG101-8F3A2B1C4D5E6F7089A", "revenuePeriod": "2026-11", "completedDate": "2026-11-20", "grossAmount": 1500000, "refundAmount": 0, "commissionRate": 0.2500, "commissionAmount": 375000.00, "adjustmentAmount": 0, "providerNetAmount": 1125000.00, "status": "ELIGIBLE", "deferredReason": null, "settlementId": null, "eligibleAt": "2026-11-20T03:15:00Z", "settledAt": null, "createdAt": "2026-11-20T02:03:00Z" }
  ],
  "timestamp": "2026-11-20T03:19:00Z"
}
```

✅ **Kết quả (tour có 2 đối tác — mỗi đối tác 1 bản ghi):**
```json
{
  "code": 200,
  "data": [
    { "id": 301, "providerProfileId": 1, "providerName": "Ban Quản lý Tràng An", "grossAmount": 900000, "commissionRate": 0.2500, "commissionAmount": 225000.00, "providerNetAmount": 675000.00, "status": "ELIGIBLE" },
    { "id": 302, "providerProfileId": 2, "providerName": "Ban Quản lý Hạ Long", "grossAmount": 600000, "commissionRate": 0.2000, "commissionAmount": 120000.00, "providerNetAmount": 480000.00, "status": "ELIGIBLE" }
  ],
  "timestamp": "2026-11-20T03:19:00Z"
}
```

---

# PHẦN C — Refund

## C.1. Tourist gửi yêu cầu hoàn tiền (lỗi Tourist → hoàn 50%) ⭐

🟦 **Refund (Hoàn tiền)**

▶ **POST** `/api/v1/refunds`
🔑 `Bearer {{TOURIST_TOKEN}}`

📋 **Body:**
```json
{
  "paymentId": 501,
  "reason": "TOURIST_FAULT",
  "reasonDetail": "Khách không thể đi do thời tiết xấu, đề nghị hoàn một phần",
  "evidence": "Ảnh thời tiết ngày 20/11",
  "bankAccountNumber": "0123456789",
  "bankAccountName": "NGUYEN VAN A",
  "bankName": "MB Bank"
}
```

✅ **Kết quả (HTTP 201):**
```json
{
  "code": 200,
  "message": "Gửi yêu cầu hoàn tiền thành công",
  "data": {
    "id": 701,
    "refundCode": "RF1A2B3C4D5E6F7089A0B",
    "paymentId": 501,
    "txnRef": "JG101-8F3A2B1C4D5E6F7089A",
    "bookingId": 101,
    "touristId": 2,
    "status": "PENDING_REVIEW",
    "declaredReason": "TOURIST_FAULT",
    "approvedReason": null,
    "reasonDetail": "Khách không thể đi do thời tiết xấu, đề nghị hoàn một phần",
    "proposedAmount": 750000.00,
    "approvedAmount": null,
    "refundedAmount": null,
    "currency": "VND",
    "method": null,
    "reviewedBy": null,
    "reviewedAt": null,
    "rejectionReason": null,
    "vnpRequestId": null,
    "vnpTransactionNo": null,
    "vnpResponseCode": null,
    "vnpTransactionStatus": null,
    "vnpMessage": null,
    "vnpRequestedAt": null,
    "vnpResolvedAt": null,
    "bankAccountNumber": "0123456789",
    "bankAccountName": "NGUYEN VAN A",
    "bankName": "MB Bank",
    "transferReference": null,
    "transferEvidence": null,
    "transferredAt": null,
    "createdAt": "2026-11-20T04:00:00Z",
    "auditLogs": []
  },
  "timestamp": "2026-11-20T04:00:00Z"
}
```

📌 **Lưu:** `data.id` → `{refundId}`

✅ **Điều kiện đạt:**
| Trường | Kỳ vọng |
|---|---|
| `status` | `PENDING_REVIEW` |
| `proposedAmount` | **750.000** (= 50% × 1.500.000) — hệ thống tự tính |
| `approvedAmount` | `null` (chờ Admin) |
| `refundCode` | format `RF` + 20 ký tự hex uppercase |

> 💡 **Tourist KHÔNG nhập số tiền** — hệ thống tự tính theo `reason`. `reasonDetail` là **bắt buộc** (NotBlank).

---

## C.2. Gửi yêu cầu hoàn 100% (lỗi nền tảng)

🟦 **Refund (Hoàn tiền)**

▶ **POST** `/api/v1/refunds`
🔑 `Bearer {{TOURIST2_TOKEN}}`

📋 **Body:**
```json
{
  "paymentId": 502,
  "reason": "PLATFORM_FAULT",
  "reasonDetail": "Điểm đến bị hủy do lỗi hệ thống JourneyGo, khách không thể đi",
  "evidence": "Thông báo hủy tour từ JourneyGo",
  "bankAccountNumber": "9876543210",
  "bankAccountName": "NGUYEN VAN B",
  "bankName": "Vietcombank"
}
```

✅ **Kết quả:**
```json
{
  "code": 200,
  "message": "Gửi yêu cầu hoàn tiền thành công",
  "data": {
    "id": 702,
    "refundCode": "RF2B3C4D5E6F7089A0B1C",
    "paymentId": 502,
    "txnRef": "JG101-9C4E7D1F2A3B5C6D7E",
    "bookingId": 101,
    "touristId": 3,
    "status": "PENDING_REVIEW",
    "declaredReason": "PLATFORM_FAULT",
    "approvedReason": null,
    "reasonDetail": "Điểm đến bị hủy do lỗi hệ thống JourneyGo, khách không thể đi",
    "proposedAmount": 1500000.00,
    "approvedAmount": null,
    "refundedAmount": null,
    "currency": "VND",
    "method": null,
    "reviewedBy": null,
    "reviewedAt": null,
    "rejectionReason": null,
    "vnpRequestId": null,
    "vnpTransactionNo": null,
    "vnpResponseCode": null,
    "vnpTransactionStatus": null,
    "vnpMessage": null,
    "vnpRequestedAt": null,
    "vnpResolvedAt": null,
    "bankAccountNumber": "9876543210",
    "bankAccountName": "NGUYEN VAN B",
    "bankName": "Vietcombank",
    "transferReference": null,
    "transferEvidence": null,
    "transferredAt": null,
    "createdAt": "2026-11-20T04:05:00Z",
    "auditLogs": []
  },
  "timestamp": "2026-11-20T04:05:00Z"
}
```

✅ **Điều kiện đạt:** `proposedAmount = 1500000.00` (= 100%).

---

## C.3. Unhappy case — Gửi refund 2 lần cho cùng payment

▶ **POST** `/api/v1/refunds`
🔑 `Bearer {{TOURIST_TOKEN}}`

📋 **Body:**
```json
{
  "paymentId": 501,
  "reason": "TOURIST_FAULT",
  "reasonDetail": "Gửi lần 2 — phải bị chặn"
}
```

✅ **Kết quả mong đợi (HTTP 409):**
```json
{
  "code": 409,
  "message": "Giao dịch này đã có yêu cầu hoàn tiền đang xử lý hoặc đã hoàn tất",
  "timestamp": "2026-11-20T04:10:00Z"
}
```

---

## C.4. Unhappy case — Thiếu `reasonDetail`

▶ **POST** `/api/v1/refunds`
🔑 `Bearer {{TOURIST2_TOKEN}}`

📋 **Body:**
```json
{
  "paymentId": 503,
  "reason": "TOURIST_FAULT"
}
```

✅ **Kết quả mong đợi (HTTP 400):**
```json
{
  "code": 400,
  "message": "Dữ liệu đầu vào không hợp lệ",
  "data": {
    "reasonDetail": "Lý do hoàn tiền không được để trống"
  },
  "timestamp": "2026-11-20T04:11:00Z"
}
```

> 📌 Lỗi validation trả `data` là **Map field → message**, không phải object nghiệp vụ.

---

## C.5. Unhappy case — Quá 24 giờ kể từ `paidAt`

**Chuẩn bị (SQL):**
```sql
UPDATE payments SET paid_at = NOW() - INTERVAL '25 hours' WHERE id = 503;
```

▶ **POST** `/api/v1/refunds`
🔑 `Bearer {{TOURIST2_TOKEN}}`

📋 **Body:**
```json
{
  "paymentId": 503,
  "reason": "PLATFORM_FAULT",
  "reasonDetail": "Test quá 24 giờ"
}
```

✅ **Kết quả mong đợi (HTTP 400):**
```json
{
  "code": 400,
  "message": "Đã quá thời hạn 24 giờ để gửi yêu cầu hoàn tiền",
  "timestamp": "2026-11-20T04:12:00Z"
}
```

---

## C.6. Refund của tôi (Tourist)

🟦 **Refund (Hoàn tiền)**

▶ **GET** `/api/v1/refunds/my`
🔑 `Bearer {{TOURIST_TOKEN}}`
📋 **Query:** `page=0`, `size=20`

✅ **Kết quả:**
```json
{
  "code": 200,
  "message": "Lấy danh sách yêu cầu hoàn tiền thành công",
  "data": {
    "page": 0,
    "size": 20,
    "totalElements": 1,
    "totalPages": 1,
    "first": true,
    "last": true,
    "content": [
      {
        "id": 701,
        "refundCode": "RF1A2B3C4D5E6F7089A0B",
        "paymentId": 501,
        "txnRef": "JG101-8F3A2B1C4D5E6F7089A",
        "bookingId": 101,
        "touristId": 2,
        "status": "PENDING_REVIEW",
        "declaredReason": "TOURIST_FAULT",
        "approvedReason": null,
        "reasonDetail": "Khách không thể đi do thời tiết xấu, đề nghị hoàn một phần",
        "proposedAmount": 750000.00,
        "approvedAmount": null,
        "refundedAmount": null,
        "currency": "VND",
        "method": null,
        "reviewedBy": null,
        "reviewedAt": null,
        "rejectionReason": null,
        "bankAccountNumber": "0123456789",
        "bankAccountName": "NGUYEN VAN A",
        "bankName": "MB Bank",
        "createdAt": "2026-11-20T04:00:00Z",
        "auditLogs": []
      }
    ]
  },
  "timestamp": "2026-11-20T04:13:00Z"
}
```

---

## C.7. Danh sách toàn bộ refund (Admin)

🟦 **Refund (Hoàn tiền)**

▶ **GET** `/api/v1/refunds`
🔑 `Bearer {{ADMIN_TOKEN}}`
📋 **Query:** `status=PENDING_REVIEW`, `page=0`, `size=20`

✅ **Kết quả:**
```json
{
  "code": 200,
  "message": "Lấy danh sách yêu cầu hoàn tiền thành công",
  "data": {
    "page": 0,
    "size": 20,
    "totalElements": 2,
    "totalPages": 1,
    "first": true,
    "last": true,
    "content": [
      { "id": 701, "refundCode": "RF1A2B3C4D5E6F7089A0B", "paymentId": 501, "status": "PENDING_REVIEW", "declaredReason": "TOURIST_FAULT", "proposedAmount": 750000.00, "approvedAmount": null, "refundedAmount": null, "method": null },
      { "id": 702, "refundCode": "RF2B3C4D5E6F7089A0B1C", "paymentId": 502, "status": "PENDING_REVIEW", "declaredReason": "PLATFORM_FAULT", "proposedAmount": 1500000.00, "approvedAmount": null, "refundedAmount": null, "method": null }
    ]
  },
  "timestamp": "2026-11-20T04:14:00Z"
}
```

---

## C.8. Admin duyệt refund qua VNPay ⭐

🟦 **Refund (Hoàn tiền)**

▶ **POST** `/api/v1/refunds/{refundId}/review`
🔑 `Bearer {{ADMIN_TOKEN}}`

📋 **Body:**
```json
{
  "approve": true,
  "reason": "TOURIST_FAULT",
  "method": "VNPAY_API",
  "note": "Hợp lý — hoàn 50% do lỗi khách"
}
```

✅ **Kết quả:**
```json
{
  "code": 200,
  "message": "Xử lý yêu cầu hoàn tiền thành công",
  "data": {
    "id": 701,
    "refundCode": "RF1A2B3C4D5E6F7089A0B",
    "paymentId": 501,
    "txnRef": "JG101-8F3A2B1C4D5E6F7089A",
    "bookingId": 101,
    "touristId": 2,
    "status": "REFUND_PROCESSING",
    "declaredReason": "TOURIST_FAULT",
    "approvedReason": "TOURIST_FAULT",
    "reasonDetail": "Khách không thể đi do thời tiết xấu, đề nghị hoàn một phần",
    "proposedAmount": 750000.00,
    "approvedAmount": 750000.00,
    "refundedAmount": null,
    "currency": "VND",
    "method": "VNPAY_API",
    "reviewedBy": 1,
    "reviewedAt": "2026-11-20T05:00:00Z",
    "rejectionReason": null,
    "vnpRequestId": "a1b2c3d4e5f6...",
    "vnpTransactionNo": null,
    "vnpResponseCode": "00",
    "vnpTransactionStatus": "05",
    "vnpMessage": "Yêu cầu hoàn tiền đã được tiếp nhận",
    "vnpRequestedAt": "2026-11-20T05:00:00Z",
    "vnpResolvedAt": null,
    "bankAccountNumber": "0123456789",
    "bankAccountName": "NGUYEN VAN A",
    "bankName": "MB Bank",
    "transferReference": null,
    "transferEvidence": null,
    "transferredAt": null,
    "createdAt": "2026-11-20T04:00:00Z",
    "auditLogs": []
  },
  "timestamp": "2026-11-20T05:00:00Z"
}
```

✅ **Điều kiện đạt:**
- `status = REFUND_PROCESSING` (**không** phải `REFUNDED` ngay)
- `approvedAmount = 750000.00`
- `refundedAmount = null` (chưa xác minh tiền đã về)
- `vnpTransactionStatus = "05"` (đang xử lý)

> ⚠️ **Bản chất:** `vnp_ResponseCode = 00` **KHÔNG** có nghĩa tiền đã về tài khoản. Đó là lý do trạng thái là `REFUND_PROCESSING` chứ không phải `REFUNDED`.
> 📌 **`method`** chỉ nhận `VNPAY_API` hoặc `MANUAL_BANK_TRANSFER`.

---

## C.9. Poll trạng thái refund (chờ tiền về)

🟦 **Refund (Hoàn tiền)**

▶ **POST** `/api/v1/refunds/{refundId}/refresh-status`
🔑 `Bearer {{ADMIN_TOKEN}}`

✅ **Kết quả (khi VNPay đã xác nhận):**
```json
{
  "code": 200,
  "message": "Kiểm tra trạng thái hoàn tiền thành công",
  "data": {
    "id": 701,
    "refundCode": "RF1A2B3C4D5E6F7089A0B",
    "paymentId": 501,
    "status": "REFUNDED",
    "declaredReason": "TOURIST_FAULT",
    "approvedReason": "TOURIST_FAULT",
    "proposedAmount": 750000.00,
    "approvedAmount": 750000.00,
    "refundedAmount": 750000.00,
    "currency": "VND",
    "method": "VNPAY_API",
    "reviewedBy": 1,
    "reviewedAt": "2026-11-20T05:00:00Z",
    "vnpRequestId": "a1b2c3d4e5f6...",
    "vnpTransactionNo": "14226199",
    "vnpResponseCode": "00",
    "vnpTransactionStatus": "00",
    "vnpMessage": "Giao dich hoan tien thanh cong",
    "vnpRequestedAt": "2026-11-20T05:00:00Z",
    "vnpResolvedAt": "2026-11-20T05:05:00Z",
    "createdAt": "2026-11-20T04:00:00Z",
    "auditLogs": []
  },
  "timestamp": "2026-11-20T05:05:00Z"
}
```

> 💡 Scheduler nền cũng tự poll mỗi **300 giây** (`app.finance.refund-status-check-interval-seconds`) → không cần gọi thủ công.
> ⚠️ Nếu VNPay chưa xác nhận → giữ nguyên `REFUND_PROCESSING` và cập nhật `vnpMessage` = `"Không xác minh được trạng thái từ VNPay — giữ REFUND_PROCESSING."`

---

## C.10. Unhappy case — Admin duyệt sai số tiền

🟦 **Refund (Hoàn tiền)**

▶ **POST** `/api/v1/refunds/{refundId}/review`
🔑 `Bearer {{ADMIN_TOKEN}}`

📋 **Body:**
```json
{
  "approve": true,
  "reason": "TOURIST_FAULT",
  "amount": 1200000,
  "note": "Cố duyệt số tiền khác chính sách"
}
```

✅ **Kết quả mong đợi (HTTP 400):**
```json
{
  "code": 400,
  "message": "Số tiền được duyệt (1200000) không khớp chính sách cho nguyên nhân TOURIST_FAULT (750000.00). Hệ thống tự tính số tiền theo nguyên nhân — vui lòng chọn đúng nguyên nhân.",
  "timestamp": "2026-11-20T05:10:00Z"
}
```

> 📌 Cách đúng: **bỏ trường `amount`** khỏi body → hệ thống tự tính theo `reason`.

---

## C.11. Admin từ chối refund

🟦 **Refund (Hoàn tiền)**

▶ **POST** `/api/v1/refunds/{refundId}/review`
🔑 `Bearer {{ADMIN_TOKEN}}`

📋 **Body:**
```json
{
  "approve": false,
  "rejectionReason": "Không đủ bằng chứng theo chính sách hoàn tiền",
  "note": "Ảnh không rõ nội dung"
}
```

✅ **Kết quả:**
```json
{
  "code": 200,
  "message": "Xử lý yêu cầu hoàn tiền thành công",
  "data": {
    "id": 702,
    "refundCode": "RF2B3C4D5E6F7089A0B1C",
    "paymentId": 502,
    "status": "REJECTED",
    "declaredReason": "PLATFORM_FAULT",
    "approvedReason": null,
    "proposedAmount": 1500000.00,
    "approvedAmount": null,
    "refundedAmount": null,
    "method": null,
    "reviewedBy": 1,
    "reviewedAt": "2026-11-20T05:15:00Z",
    "rejectionReason": "Không đủ bằng chứng theo chính sách hoàn tiền",
    "createdAt": "2026-11-20T04:05:00Z",
    "auditLogs": []
  },
  "timestamp": "2026-11-20T05:15:00Z"
}
```

> ⚠️ `rejectionReason` là **bắt buộc** khi `approve = false`, nếu không → HTTP 400 `"Vui lòng nhập lý do từ chối yêu cầu hoàn tiền"`.

---

## C.12. Unhappy case — Manual Transfer khi chưa xác minh VNPay

🟦 **Refund (Hoàn tiền)**

▶ **POST** `/api/v1/refunds/{refundId}/manual-transfer`
🔑 `Bearer {{ADMIN_TOKEN}}`

📋 **Body:**
```json
{
  "transferReference": "FT20261120001",
  "transferEvidence": "https://img.chungminh/chuyen-khoan.png",
  "transferredAt": "2026-11-20T06:00:00Z"
}
```

✅ **Kết quả mong đợi (HTTP 409):**
```json
{
  "code": 409,
  "message": "Yêu cầu hoàn tiền này không dùng phương thức chuyển khoản thủ công",
  "timestamp": "2026-11-20T06:01:00Z"
}
```

> 📌 Lý do: refund 701 đã dùng `VNPAY_API` → không thể đổi sang thủ công.
> Nếu refund **đã** dùng `MANUAL_BANK_TRANSFER` nhưng đã gửi VNPay mà chưa rõ kết quả → 409 với message `"Yêu cầu hoàn tiền đã được gửi tới VNPay nhưng chưa xác minh được kết quả — không thể chuyển sang phương thức thủ công để tránh hoàn tiền hai lần."`

---

## C.13. Manual Bank Transfer (dự phòng) — thành công

**Bước 1 — Duyệt với method thủ công:**

▶ **POST** `/api/v1/refunds/{refundId}/review`
🔑 `Bearer {{ADMIN_TOKEN}}`

📋 **Body:**
```json
{
  "approve": true,
  "reason": "TOURIST_FAULT",
  "method": "MANUAL_BANK_TRANSFER",
  "note": "Chuyển khoản thủ công — VNPay Refund API đang lỗi"
}
```

✅ **Kết quả:** `status = REFUND_PROCESSING`, `method = MANUAL_BANK_TRANSFER`, `vnpRequestId = null`.

**Bước 2 — Ghi nhận đã chuyển khoản:**

▶ **POST** `/api/v1/refunds/{refundId}/manual-transfer`
🔑 `Bearer {{ADMIN_TOKEN}}`

📋 **Body:**
```json
{
  "transferReference": "FT20261120001",
  "transferEvidence": "https://img.chungminh/chuyen-khoan.png",
  "transferredAt": "2026-11-20T06:00:00Z"
}
```

✅ **Kết quả:**
```json
{
  "code": 200,
  "message": "Ghi nhận chuyển khoản thủ công thành công",
  "data": {
    "id": 703,
    "refundCode": "RF3C4D5E6F7089A0B1C2D",
    "paymentId": 503,
    "status": "REFUNDED",
    "declaredReason": "TOURIST_FAULT",
    "approvedReason": "TOURIST_FAULT",
    "proposedAmount": 750000.00,
    "approvedAmount": 750000.00,
    "refundedAmount": 750000.00,
    "currency": "VND",
    "method": "MANUAL_BANK_TRANSFER",
    "reviewedBy": 1,
    "reviewedAt": "2026-11-20T06:00:00Z",
    "bankAccountNumber": "0123456789",
    "bankAccountName": "NGUYEN VAN A",
    "bankName": "MB Bank",
    "transferReference": "FT20261120001",
    "transferEvidence": "https://img.chungminh/chuyen-khoan.png",
    "transferredAt": "2026-11-20T06:00:00Z",
    "vnpResolvedAt": "2026-11-20T06:00:00Z",
    "createdAt": "2026-11-20T05:50:00Z",
    "auditLogs": []
  },
  "timestamp": "2026-11-20T06:00:00Z"
}
```

> ⚠️ **Điều kiện:** refund phải có `bankAccountNumber` + `bankAccountName` + `bankName` (set ở C.1). Thiếu → HTTP 400 `REFUND_BANK_INFO_REQUIRED`.
> ⚠️ **`transferEvidence` bắt buộc** — nếu để trống, refund giữ `REFUND_PROCESSING` (không coi là đã hoàn).

---

## C.14. Chi tiết refund + nhật ký kiểm toán

🟦 **Refund (Hoàn tiền)**

▶ **GET** `/api/v1/refunds/{refundId}`
🔑 `Bearer {{ADMIN_TOKEN}}`

✅ **Kết quả:**
```json
{
  "code": 200,
  "message": "Lấy thông tin yêu cầu hoàn tiền thành công",
  "data": {
    "id": 701,
    "refundCode": "RF1A2B3C4D5E6F7089A0B",
    "paymentId": 501,
    "txnRef": "JG101-8F3A2B1C4D5E6F7089A",
    "bookingId": 101,
    "touristId": 2,
    "status": "REFUNDED",
    "declaredReason": "TOURIST_FAULT",
    "approvedReason": "TOURIST_FAULT",
    "reasonDetail": "Khách không thể đi do thời tiết xấu, đề nghị hoàn một phần",
    "proposedAmount": 750000.00,
    "approvedAmount": 750000.00,
    "refundedAmount": 750000.00,
    "currency": "VND",
    "method": "VNPAY_API",
    "reviewedBy": 1,
    "reviewedAt": "2026-11-20T05:00:00Z",
    "rejectionReason": null,
    "vnpRequestId": "a1b2c3d4e5f6...",
    "vnpTransactionNo": "14226199",
    "vnpResponseCode": "00",
    "vnpTransactionStatus": "00",
    "vnpMessage": "Giao dich hoan tien thanh cong",
    "vnpRequestedAt": "2026-11-20T05:00:00Z",
    "vnpResolvedAt": "2026-11-20T05:05:00Z",
    "bankAccountNumber": "0123456789",
    "bankAccountName": "NGUYEN VAN A",
    "bankName": "MB Bank",
    "transferReference": null,
    "transferEvidence": null,
    "transferredAt": null,
    "createdAt": "2026-11-20T04:00:00Z",
    "auditLogs": [
      {
        "id": 1,
        "action": "CREATED",
        "fromStatus": null,
        "toStatus": "PENDING_REVIEW",
        "amount": 750000.00,
        "reference": "RF1A2B3C4D5E6F7089A0B",
        "detail": "Tourist gửi yêu cầu hoàn tiền. Nguyên nhân: TOURIST_FAULT. Số tiền đề xuất: 750000.00",
        "createdAt": "2026-11-20T04:00:00Z"
      },
      {
        "id": 2,
        "action": "APPROVED",
        "fromStatus": "PENDING_REVIEW",
        "toStatus": "APPROVED",
        "amount": 750000.00,
        "reference": null,
        "detail": "Admin phê duyệt hoàn 750000.00 — nguyên nhân: TOURIST_FAULT, phương thức: VNPAY_API. Ghi chú: Hợp lý — hoàn 50% do lỗi khách",
        "createdAt": "2026-11-20T05:00:00Z"
      },
      {
        "id": 3,
        "action": "VNPAY_STATUS_UPDATED",
        "fromStatus": "REFUND_PROCESSING",
        "toStatus": "REFUNDED",
        "amount": 750000.00,
        "reference": "14226199",
        "detail": "VNPay xác nhận hoàn tiền thành công",
        "createdAt": "2026-11-20T05:05:00Z"
      }
    ]
  },
  "timestamp": "2026-11-20T05:20:00Z"
}
```

**Các `action` có thể gặp trong audit log:**
`CREATED`, `APPROVED`, `REJECTED`, `VNPAY_REQUEST_SENT`, `VNPAY_RESPONSE`, `VNPAY_STATUS_UPDATED`, `MANUAL_TRANSFER_RECORDED`, `MANUAL_TRANSFER_CONFIRMED`, `STATUS_UPDATED`

---

## C.15. Kiểm tra tác động lên doanh thu đối tác

🟦 **Provider Revenue (Doanh thu đối tác)**

▶ **GET** `/api/v1/provider-revenues/provider-profile/{providerProfileId}`
🔑 `Bearer {{ADMIN_TOKEN}}`

✅ **Kết quả sau khi refund 750.000:**
```json
{
  "code": 200,
  "message": "Lấy danh sách doanh thu thành công",
  "data": {
    "page": 0,
    "size": 20,
    "totalElements": 1,
    "totalPages": 1,
    "first": true,
    "last": true,
    "content": [
      {
        "id": 301,
        "providerProfileId": 1,
        "providerName": "Ban Quản lý Tràng An",
        "bookingId": 101,
        "bookingCode": "JG9F3A2B1C4D5E6F708",
        "paymentId": 501,
        "txnRef": "JG101-8F3A2B1C4D5E6F7089A",
        "revenuePeriod": "2026-11",
        "completedDate": "2026-11-20",
        "grossAmount": 1500000,
        "refundAmount": 750000,
        "commissionRate": 0.2500,
        "commissionAmount": 187500.00,
        "adjustmentAmount": 0,
        "providerNetAmount": 562500.00,
        "status": "ELIGIBLE",
        "deferredReason": null,
        "settlementId": null,
        "eligibleAt": "2026-11-20T03:15:00Z",
        "settledAt": null,
        "createdAt": "2026-11-20T02:03:00Z"
      }
    ]
  },
  "timestamp": "2026-11-20T05:21:00Z"
}
```

✅ **Kiểm tra công thức sau refund:**
```
RefundAmount  = 750.000
NetCollected  = 1.500.000 − 750.000      = 750.000
Commission    = 750.000 × 0.25            = 187.500
ProviderNet    = 750.000 − 187.500         = 562.500  ✅
```

▶ **GET** `/api/v1/provider-revenues/{revenueId}/eligibility** → check `4_REFUND_APPLIED` vẫn `passed = true`.

> ⚠️ Nếu refund đang ở `PENDING_REVIEW` hoặc `REFUND_PROCESSING` → check `3_NO_PENDING_REFUND` **fail** → `deferredReason = REFUND_PENDING` → doanh thu bị **giữ lại**, không vào ứng viên tất toán.

---

# PHẦN D — Settlement

## D.0. Chuẩn bị kỳ doanh thu đã kết thúc

> ⚠️ `revenuePeriod` = **tháng hoàn thành trải nghiệm** (`completedDate`) và kỳ đó phải **đã kết thúc**.

**Chuẩn bị (SQL):**
```sql
-- Đưa booking về tháng 09/2026 để tạo settlement cho kỳ "2026-09"
UPDATE bookings SET completed_at = TIMESTAMP '2026-09-20 10:00:00' WHERE id = 101;
UPDATE provider_revenues SET completed_date = DATE '2026-09-20' WHERE id = 301;
```

**Giá trị `revenuePeriod` cần dùng:** tháng trước 2 tháng, định dạng `yyyy-MM`.
Ví dụ nếu hôm nay là `2026-11-20` → `2026-09`.

> 📌 Cấu hình liên quan: `app.finance.settlement-grace-minutes` (mặc định `0`) và `app.finance.allow-open-period-settlement` (mặc định `false`).

---

## D.1. Xem Ứng viên tất toán (đánh giá 9 điều kiện) ⭐

🟦 **Settlement (Tất toán)**

▶ **GET** `/api/v1/settlements/candidates`
🔑 `Bearer {{ADMIN_TOKEN}}`
📋 **Query:** `providerProfileId={providerProfileId}`, `revenuePeriod=2026-09`

✅ **Kết quả:**
```json
{
  "code": 200,
  "message": "Lấy ứng viên tất toán thành công",
  "data": {
    "providerProfileId": 1,
    "revenuePeriod": "2026-09",
    "eligible": [
      {
        "id": 301,
        "providerProfileId": 1,
        "providerName": "Ban Quản lý Tràng An",
        "bookingId": 101,
        "bookingCode": "JG9F3A2B1C4D5E6F708",
        "paymentId": 501,
        "txnRef": "JG101-8F3A2B1C4D5E6F7089A",
        "revenuePeriod": "2026-09",
        "completedDate": "2026-09-20",
        "grossAmount": 1500000,
        "refundAmount": 750000,
        "commissionRate": 0.2500,
        "commissionAmount": 187500.00,
        "adjustmentAmount": 0,
        "providerNetAmount": 562500.00,
        "status": "ELIGIBLE",
        "deferredReason": null,
        "settlementId": null,
        "eligibleAt": "2026-09-20T03:15:00Z",
        "settledAt": null,
        "createdAt": "2026-09-20T02:03:00Z"
      }
    ],
    "held": [
      {
        "revenueId": 302,
        "bookingId": 102,
        "revenuePeriod": "2026-09",
        "providerNetAmount": 300000.00,
        "deferredReason": "BOOKING_NOT_COMPLETED"
      }
    ],
    "totals": {
      "grossAmount": 1500000.00,
      "refundAmount": 750000.00,
      "commissionAmount": 187500.00,
      "adjustmentAmount": 0.00,
      "settlementAmount": 562500.00
    }
  },
  "timestamp": "2026-11-20T07:00:00Z"
}
```

✅ **Điều kiện đạt:**
- `eligible` — các khoản đủ điều kiện (sẽ được đưa vào Settlement)
- `held` — các khoản bị giữ, **kèm lý do cụ thể** (`deferredReason`)
- `totals.settlementAmount` = tổng `providerNetAmount` của `eligible`

---

## D.2. Tạo đợt tất toán (bản nháp) ⭐

🟦 **Settlement (Tất toán)**

▶ **POST** `/api/v1/settlements`
🔑 `Bearer {{ADMIN_TOKEN}}`

📋 **Body:**
```json
{
  "providerProfileId": 1,
  "revenuePeriod": "2026-09",
  "note": "Tất toán tháng 09/2026 cho Ban Quản lý Tràng An"
}
```

✅ **Kết quả (HTTP 201):**
```json
{
  "code": 200,
  "message": "Tạo đợt tất toán thành công",
  "data": {
    "id": 801,
    "settlementCode": "ST9F3A2B1C4D5E6F708",
    "providerProfileId": 1,
    "providerName": "Ban Quản lý Tràng An",
    "revenuePeriod": "2026-09",
    "periodStart": "2026-09-01",
    "periodEnd": "2026-09-30",
    "grossAmount": 1500000.00,
    "refundAmount": 750000.00,
    "commissionAmount": 187500.00,
    "adjustmentAmount": 0.00,
    "settlementAmount": 562500.00,
    "status": "DRAFT",
    "createdBy": 1,
    "approvedBy": null,
    "createdAt": "2026-11-20T07:00:00Z",
    "approvedAt": null,
    "rejectionReason": null,
    "note": "Tất toán tháng 09/2026 cho Ban Quản lý Tràng An",
    "detailCount": 1
  },
  "timestamp": "2026-11-20T07:00:00Z"
}
```

📌 **Lưu:** `data.id` → `{settlementId}`

> 📌 Khi tạo bản nháp, các khoản doanh thu được chuyển sang `IN_SETTLEMENT` → **không** thể chọn vào đợt khác trong lúc chờ xử lý.

---

## D.3. Chi tiết từng khoản doanh thu trong đợt tất toán

🟦 **Settlement (Tất toán)**

▶ **GET** `/api/v1/settlements/{settlementId}/details`
🔑 `Bearer {{ADMIN_TOKEN}}`

✅ **Kết quả:**
```json
{
  "code": 200,
  "message": "Lấy chi tiết đợt tất toán thành công",
  "data": [
    {
      "id": 901,
      "settlementId": 801,
      "providerRevenueId": 301,
      "bookingId": 101,
      "bookingCode": "JG9F3A2B1C4D5E6F708",
      "paymentId": 501,
      "txnRef": "JG101-8F3A2B1C4D5E6F7089A",
      "revenuePeriod": "2026-09",
      "grossAmount": 1500000,
      "refundAmount": 750000,
      "commissionRate": 0.2500,
      "commissionAmount": 187500.00,
      "adjustmentAmount": 0,
      "providerNetAmount": 562500.00,
      "status": "IN_SETTLEMENT"
    }
  ],
  "timestamp": "2026-11-20T07:01:00Z"
}
```

> 📌 Đây là bảng **truy vết nguồn** — mỗi dòng cho biết Booking / Payment / Refund / hoa hồng và công thức tính số tiền.

---

## D.4. Duyệt settlement (nguyên tử) ⭐

🟦 **Settlement (Tất toán)**

▶ **POST** `/api/v1/settlements/{settlementId}/approve`
🔑 `Bearer {{ADMIN_TOKEN}}`
📋 **Body:** *(không cần body)*

✅ **Kết quả:**
```json
{
  "code": 200,
  "message": "Phê duyệt đợt tất toán thành công",
  "data": {
    "id": 801,
    "settlementCode": "ST9F3A2B1C4D5E6F708",
    "providerProfileId": 1,
    "providerName": "Ban Quản lý Tràng An",
    "revenuePeriod": "2026-09",
    "periodStart": "2026-09-01",
    "periodEnd": "2026-09-30",
    "grossAmount": 1500000.00,
    "refundAmount": 750000.00,
    "commissionAmount": 187500.00,
    "adjustmentAmount": 0.00,
    "settlementAmount": 562500.00,
    "status": "APPROVED",
    "createdBy": 1,
    "approvedBy": 1,
    "createdAt": "2026-11-20T07:00:00Z",
    "approvedAt": "2026-11-20T07:05:00Z",
    "rejectionReason": null,
    "note": "Tất toán tháng 09/2026 cho Ban Quản lý Tràng An",
    "detailCount": 1
  },
  "timestamp": "2026-11-20T07:05:00Z"
}
```

✅ **Kiểm tra 4 thứ đổi cùng lúc (cùng 1 transaction):**

▶ **GET** `/api/v1/wallets/provider-profile/{providerProfileId}` → số dư ví
```json
{
  "code": 200,
  "message": "Lấy thông tin ví thành công",
  "data": {
    "id": 1,
    "providerProfileId": 1,
    "providerName": "Ban Quản lý Tràng An",
    "balance": 562500.00,
    "currency": "VND",
    "createdAt": "2026-11-20T02:00:00Z",
    "updatedAt": "2026-11-20T07:05:00Z"
  },
  "timestamp": "2026-11-20T07:05:00Z"
}
```

▶ **GET** `/api/v1/wallets/provider-profile/{providerProfileId}/transactions`
```json
{
  "code": 200,
  "message": "Lấy lịch sử giao dịch ví thành công",
  "data": {
    "page": 0,
    "size": 20,
    "totalElements": 1,
    "totalPages": 1,
    "first": true,
    "last": true,
    "content": [
      {
        "id": 1,
        "walletId": 1,
        "transactionType": "SETTLEMENT_CREDIT",
        "direction": "CREDIT",
        "amount": 562500.00,
        "balanceBefore": 0,
        "balanceAfter": 562500.00,
        "sourceType": "SETTLEMENT",
        "sourceId": 801,
        "status": "SUCCESS",
        "createdBy": 1,
        "note": "Cộng tiền từ Settlement ST9F3A2B1C4D5E6F708 (kỳ doanh thu 2026-09)",
        "createdAt": "2026-11-20T07:05:00Z"
      }
    ]
  },
  "timestamp": "2026-11-20T07:06:00Z"
}
```

▶ **GET** `/api/v1/provider-revenues/provider-profile/{providerProfileId}`
```json
{
  "code": 200,
  "data": {
    "content": [
      {
        "id": 301,
        "bookingId": 101,
        "bookingCode": "JG9F3A2B1C4D5E6F708",
        "revenuePeriod": "2026-09",
        "grossAmount": 1500000,
        "refundAmount": 750000,
        "commissionRate": 0.2500,
        "commissionAmount": 187500.00,
        "adjustmentAmount": 0,
        "providerNetAmount": 562500.00,
        "status": "SETTLED",
        "deferredReason": null,
        "settlementId": 801,
        "settledAt": "2026-11-20T07:05:00Z"
      }
    ]
  },
  "timestamp": "2026-11-20T07:06:00Z"
}
```

✅ **Điều kiện đạt:**
| Kiểm tra | Kỳ vọng |
|---|---|
| Settlement | `status = APPROVED`, `approvedBy` khác null, `approvedAt` khác null |
| Wallet | `balance = 562500.00` |
| WalletTransaction | **đúng 1** dòng, `transactionType = SETTLEMENT_CREDIT`, `direction = CREDIT`, `sourceType = SETTLEMENT`, `sourceId = 801` |
| ProviderRevenue | `status = SETTLED`, `settlementId = 801`, `settledAt` khác null |

> 📌 Ràng buộc `uk_wallet_txn_settlement_credit` trên `(wallet_id, source_type, source_id)` bảo đảm **một Settlement chỉ tạo được một giao dịch cộng tiền**.

---

## D.5. Unhappy case — Duyệt lần 2

▶ **POST** `/api/v1/settlements/{settlementId}/approve`
🔑 `Bearer {{ADMIN_TOKEN}}`

✅ **Kết quả mong đợi (HTTP 409):**
```json
{
  "code": 409,
  "message": "Đợt tất toán đã được duyệt — không thể thao tác lại",
  "timestamp": "2026-11-20T07:10:00Z"
}
```

---

## D.6. Unhappy case — Tạo settlement cho kỳ chưa kết thúc

🟦 **Settlement (Tất toán)**

▶ **POST** `/api/v1/settlements`
🔑 `Bearer {{ADMIN_TOKEN}}`

📋 **Body:**
```json
{
  "providerProfileId": 1,
  "revenuePeriod": "2026-11",
  "note": "Test kỳ chưa kết thúc"
}
```

✅ **Kết quả mong đợi (HTTP 400):**
```json
{
  "code": 400,
  "message": "Chỉ cho phép tạo đợt tất toán cho kỳ doanh thu đã kết thúc. Kỳ 2026-11 chưa kết thúc.",
  "timestamp": "2026-11-20T07:15:00Z"
}
```

---

## D.7. Unhappy case — Tạo settlement trùng kỳ

📋 **Body:**
```json
{
  "providerProfileId": 1,
  "revenuePeriod": "2026-09",
  "note": "Test trùng kỳ"
}
```

✅ **Kết quả mong đợi (HTTP 409):**
```json
{
  "code": 409,
  "message": "Đã có đợt tất toán nháp đang chờ xử lý cho kỳ doanh thu 2026-09",
  "timestamp": "2026-11-20T07:20:00Z"
}
```

> 📌 Nếu đợt trước đã `APPROVED` → message: `"Đối tác đã có đợt tất toán được duyệt cho kỳ doanh thu 2026-09"`.

---

## D.8. Unhappy case — Điều kiện eligible đã thay đổi sau khi tạo

**Chuẩn bị:**
1. Tạo settlement mới cho kỳ khác (hoặc kỳ chưa có) → `DRAFT`
2. Tạo refund mới cho 1 booking trong kỳ đó → check `3_NO_PENDING_REFUND` chuyển sang `failed`

▶ **POST** `/api/v1/settlements/{settlementId}/approve`
🔑 `Bearer {{ADMIN_TOKEN}}`

✅ **Kết quả mong đợi (HTTP 409):**
```json
{
  "code": 409,
  "message": "Khoản doanh thu (booking 102) không còn đủ điều kiện tất toán: REFUND_PENDING. Vui lòng cập nhật lại đợt tất toán trước khi duyệt.",
  "timestamp": "2026-11-20T07:25:00Z"
}
```

> 📌 Nếu **số tiền** thay đổi → message: `"Số tiền đợt tất toán đã thay đổi (bản nháp: ..., tính lại: ...) — vui lòng cập nhật lại đợt tất toán"`.

---

## D.9. Từ chối settlement

🟦 **Settlement (Tất toán)**

▶ **POST** `/api/v1/settlements/{settlementId}/reject`
🔑 `Bearer {{ADMIN_TOKEN}}`

📋 **Body:**
```json
{
  "reason": "Chưa đối soát xong, cần kiểm tra lại doanh thu tháng 09"
}
```

✅ **Kết quả:**
```json
{
  "code": 200,
  "message": "Từ chối đợt tất toán thành công",
  "data": {
    "id": 802,
    "settlementCode": "ST2A4B5C6D7E8F901234",
    "providerProfileId": 1,
    "providerName": "Ban Quản lý Tràng An",
    "revenuePeriod": "2026-09",
    "periodStart": "2026-09-01",
    "periodEnd": "2026-09-30",
    "grossAmount": 1500000.00,
    "refundAmount": 750000.00,
    "commissionAmount": 187500.00,
    "adjustmentAmount": 0.00,
    "settlementAmount": 562500.00,
    "status": "REJECTED",
    "createdBy": 1,
    "approvedBy": null,
    "createdAt": "2026-11-20T07:30:00Z",
    "approvedAt": null,
    "rejectionReason": "Chưa đối soát xong, cần kiểm tra lại doanh thu tháng 09",
    "note": null,
    "detailCount": 1
  },
  "timestamp": "2026-11-20T07:30:00Z"
}
```

✅ **Kiểm tra:**
▶ **GET** `/api/v1/wallets/provider-profile/{providerProfileId}` → `balance` **không đổi** (từ chối không ghi tiền vào ví).
▶ **GET** `/api/v1/provider-revenues/provider-profile/{providerProfileId}` → `status` quay lại `ELIGIBLE` hoặc `PENDING` (không phải `SETTLED`), `settlementId = null`.

> ⚠️ **Đợt đã `APPROVED` không thể từ chối** → HTTP 409. Muốn đảo ngược phải dùng khoản điều chỉnh tài chính (PHẦN E).

---

## D.10. Danh sách toàn bộ settlement (Admin)

🟦 **Settlement (Tất toán)**

▶ **GET** `/api/v1/settlements`
🔑 `Bearer {{ADMIN_TOKEN}}`
📋 **Query:** `status=APPROVED`, `page=0`, `size=20`

✅ **Kết quả:**
```json
{
  "code": 200,
  "message": "Lấy danh sách đợt tất toán thành công",
  "data": {
    "page": 0,
    "size": 20,
    "totalElements": 3,
    "totalPages": 1,
    "first": true,
    "last": true,
    "content": [
      { "id": 801, "settlementCode": "ST9F3A2B1C4D5E6F708", "providerProfileId": 1, "providerName": "Ban Quản lý Tràng An", "revenuePeriod": "2026-09", "grossAmount": 1500000.00, "refundAmount": 750000.00, "commissionAmount": 187500.00, "adjustmentAmount": 0.00, "settlementAmount": 562500.00, "status": "APPROVED", "createdBy": 1, "approvedBy": 1, "createdAt": "2026-11-20T07:00:00Z", "approvedAt": "2026-11-20T07:05:00Z", "rejectionReason": null, "note": "Tất toán tháng 09/2026", "detailCount": 1 }
    ]
  },
  "timestamp": "2026-11-20T07:40:00Z"
}
```

---

## D.11. Settlement của một đối tác

🟦 **Settlement (Tất toán)**

▶ **GET** `/api/v1/settlements/provider-profile/{providerProfileId}`
🔑 `Bearer {{ADMIN_TOKEN}}`
📋 **Query:** `page=0`, `size=20`

✅ **Kết quả:**
```json
{
  "code": 200,
  "message": "Lấy danh sách đợt tất toán thành công",
  "data": {
    "page": 0,
    "size": 20,
    "totalElements": 2,
    "totalPages": 1,
    "first": true,
    "last": true,
    "content": [
      { "id": 801, "settlementCode": "ST9F3A2B1C4D5E6F708", "revenuePeriod": "2026-09", "settlementAmount": 562500.00, "status": "APPROVED" },
      { "id": 803, "settlementCode": "ST3B4C5D6E7F8012345", "revenuePeriod": "2026-08", "settlementAmount": 1200000.00, "status": "APPROVED" }
    ]
  },
  "timestamp": "2026-11-20T07:41:00Z"
}
```

---

# PHẦN E — Financial Adjustment (refund sau khi đã tất toán)

> 📌 Nguyên tắc: khoản doanh thu đã `SETTLED` **không bao giờ bị hồi sinh**. Refund phát sinh sau khi tất toán được xử lý bằng khoản điều chỉnh tài chính riêng.

## E.1. Chuẩn bị — Refund phát sinh sau settlement

**Chuẩn bị (SQL):**
```sql
UPDATE payments SET paid_at = NOW() - INTERVAL '2 hours' WHERE id = 501;
```

🟦 **Refund (Hoàn tiền)**

▶ **POST** `/api/v1/refunds`
🔑 `Bearer {{TOURIST_TOKEN}}`

📋 **Body:**
```json
{
  "paymentId": 501,
  "reason": "PLATFORM_FAULT",
  "reasonDetail": "Điểm đến đóng cửa đột xuất sau khi đã tất toán",
  "bankAccountNumber": "0123456789",
  "bankAccountName": "NGUYEN VAN A",
  "bankName": "MB Bank"
}
```

▶ **POST** `/api/v1/refunds/{refundId}/review` (Admin) → body:
```json
{
  "approve": true,
  "reason": "PLATFORM_FAULT",
  "method": "VNPAY_API",
  "note": "Hoàn tiền phát sinh sau tất toán — cần khoản điều chỉnh"
}
```

▶ **POST** `/api/v1/refunds/{refundId}/refresh-status` (Admin) → chờ `status = REFUNDED`.

> ⚠️ Refund này **tự động** tạo khoản điều chỉnh tài chính `PENDING` (doanh thu đã có settlementId) → dùng bước E.2 để duyệt.

---

## E.2. Kiểm tra doanh thu đã SETTLED không bị sửa

🟦 **Provider Revenue (Doanh thu đối tác)**

▶ **GET** `/api/v1/provider-revenues/{revenueId}`
🔑 `Bearer {{ADMIN_TOKEN}}`

✅ **Kết quả:**
```json
{
  "code": 200,
  "message": "Lấy thông tin doanh thu thành công",
  "data": {
    "id": 301,
    "providerProfileId": 1,
    "providerName": "Ban Quản lý Tràng An",
    "bookingId": 101,
    "bookingCode": "JG9F3A2B1C4D5E6F708",
    "paymentId": 501,
    "txnRef": "JG101-8F3A2B1C4D5E6F7089A",
    "revenuePeriod": "2026-09",
    "completedDate": "2026-09-20",
    "grossAmount": 1500000,
    "refundAmount": 750000,
    "commissionRate": 0.2500,
    "commissionAmount": 187500.00,
    "adjustmentAmount": 0,
    "providerNetAmount": 562500.00,
    "status": "SETTLED",
    "deferredReason": null,
    "settlementId": 801,
    "eligibleAt": "2026-09-20T03:15:00Z",
    "settledAt": "2026-11-20T07:05:00Z",
    "createdAt": "2026-09-20T02:03:00Z"
  },
  "timestamp": "2026-11-20T08:00:00Z"
}
```

✅ **Điều kiện đạt:** `status = SETTLED` — **không** bị hồi sinh, lịch sử đã duyệt được giữ nguyên.

---

## E.3. Danh sách khoản điều chỉnh tài chính (tìm adjustment tự sinh)

🟦 **Financial Adjustment (Điều chỉnh tài chính)**

▶ **GET** `/api/v1/financial-adjustments`
🔑 `Bearer {{ADMIN_TOKEN}}`
📋 **Query:** `status=PENDING`, `page=0`, `size=20`

✅ **Kết quả:**
```json
{
  "code": 200,
  "message": "Lấy danh sách khoản điều chỉnh tài chính thành công",
  "data": {
    "page": 0,
    "size": 20,
    "totalElements": 1,
    "totalPages": 1,
    "first": true,
    "last": true,
    "content": [
      {
        "id": 902,
        "providerProfileId": 1,
        "providerName": "Ban Quản lý Tràng An",
        "refundRequestId": 704,
        "sourceSettlementId": 801,
        "amount": -187500.00,
        "currency": "VND",
        "reason": "Điều chỉnh doanh thu do Refund #RF4D5E6F7089A0B1C2D3E hoàn thành sau khi Settlement đã được duyệt (settlement 801)",
        "status": "PENDING",
        "createdBy": 1,
        "approvedBy": null,
        "approvedAt": null,
        "createdAt": "2026-11-20T07:50:00Z"
      }
    ]
  },
  "timestamp": "2026-11-20T08:01:00Z"
}
```

> 📌 **Công thức adjustment âm:** `refundedAmount × providerNetAmount ÷ paymentAmount` → ở đây `750.000 × 562.500 ÷ 1.500.000 = 281.250`. Giá trị thực tế sẽ khác tuỳ dữ liệu — hãy lấy từ response.

---

## E.4. Tạo khoản điều chỉnh tài chính thủ công

🟦 **Financial Adjustment (Điều chỉnh tài chính)**

▶ **POST** `/api/v1/financial-adjustments`
🔑 `Bearer {{ADMIN_TOKEN}}`

📋 **Body:**
```json
{
  "providerProfileId": 1,
  "amount": -150000.00,
  "reason": "Hoàn tiền phát sinh sau khi đã tất toán kỳ 2026-09",
  "refundRequestId": 704,
  "sourceSettlementId": 801
}
```

✅ **Kết quả (HTTP 201):**
```json
{
  "code": 200,
  "message": "Ghi nhận khoản điều chỉnh tài chính thành công",
  "data": {
    "id": 903,
    "providerProfileId": 1,
    "providerName": "Ban Quản lý Tràng An",
    "refundRequestId": 704,
    "sourceSettlementId": 801,
    "amount": -150000.00,
    "currency": "VND",
    "reason": "Hoàn tiền phát sinh sau khi đã tất toán kỳ 2026-09",
    "status": "PENDING",
    "createdBy": 1,
    "approvedBy": null,
    "approvedAt": null,
    "createdAt": "2026-11-20T08:02:00Z"
  },
  "timestamp": "2026-11-20T08:02:00Z"
}
```

📌 **Lưu:** `data.id` → `{adjustmentId}`

> 📌 `amount` **dương = cộng**, **âm = trừ**. `reason` là bắt buộc (căn cứ tài chính).
> 📌 Có `refundRequestId` → giao dịch ví là `REFUND_ADJUSTMENT`; không có → `MANUAL_ADJUSTMENT`.

---

## E.5. Duyệt khoản điều chỉnh (áp dụng vào ví)

🟦 **Financial Adjustment (Điều chỉnh tài chính)**

▶ **POST** `/api/v1/financial-adjustments/{adjustmentId}/approve`
🔑 `Bearer {{ADMIN_TOKEN}}`

✅ **Kết quả:**
```json
{
  "code": 200,
  "message": "Phê duyệt khoản điều chỉnh tài chính thành công",
  "data": {
    "id": 903,
    "providerProfileId": 1,
    "providerName": "Ban Quản lý Tràng An",
    "refundRequestId": 704,
    "sourceSettlementId": 801,
    "amount": -150000.00,
    "currency": "VND",
    "reason": "Hoàn tiền phát sinh sau khi đã tất toán kỳ 2026-09",
    "status": "APPROVED",
    "createdBy": 1,
    "approvedBy": 1,
    "approvedAt": "2026-11-20T08:05:00Z",
    "createdAt": "2026-11-20T08:02:00Z"
  },
  "timestamp": "2026-11-20T08:05:00Z"
}
```

✅ **Kiểm tra:**

▶ **GET** `/api/v1/wallets/provider-profile/{providerProfileId}` → `balance = 562500.00 − 150000.00 = 412500.00`

▶ **GET** `/api/v1/wallets/provider-profile/{providerProfileId}/transactions`
```json
{
  "code": 200,
  "data": {
    "totalElements": 2,
    "content": [
      {
        "id": 1,
        "walletId": 1,
        "transactionType": "SETTLEMENT_CREDIT",
        "direction": "CREDIT",
        "amount": 562500.00,
        "balanceBefore": 0,
        "balanceAfter": 562500.00,
        "sourceType": "SETTLEMENT",
        "sourceId": 801,
        "status": "SUCCESS",
        "note": "Cộng tiền từ Settlement ST9F3A2B1C4D5E6F708 (kỳ doanh thu 2026-09)"
      },
      {
        "id": 2,
        "walletId": 1,
        "transactionType": "REFUND_ADJUSTMENT",
        "direction": "DEBIT",
        "amount": 150000.00,
        "balanceBefore": 562500.00,
        "balanceAfter": 412500.00,
        "sourceType": "FINANCIAL_ADJUSTMENT",
        "sourceId": 903,
        "status": "SUCCESS",
        "createdBy": 1,
        "note": "Điều chỉnh tài chính #903: Hoàn tiền phát sinh sau khi đã tất toán kỳ 2026-09"
      }
    ]
  },
  "timestamp": "2026-11-20T08:06:00Z"
}
```

> 📌 `amount` của giao dịch ví luôn **dương**; chiều biến động nằm ở `direction` (`CREDIT` / `DEBIT`).
> 📌 `sourceType` của giao dịch điều chỉnh là `FINANCIAL_ADJUSTMENT` (khác với `SETTLEMENT`).

---

## E.6. Unhappy case — Số dư không đủ

🟦 **Financial Adjustment (Điều chỉnh tài chính)**

▶ **POST** `/api/v1/financial-adjustments`
🔑 `Bearer {{ADMIN_TOKEN}}`

📋 **Body:**
```json
{
  "providerProfileId": 1,
  "amount": -999999999.00,
  "reason": "Test vượt số dư ví"
}
```

✅ **Kết quả (HTTP 201 — không phải lỗi!):**
```json
{
  "code": 200,
  "message": "Ghi nhận khoản điều chỉnh tài chính thành công",
  "data": {
    "id": 904,
    "providerProfileId": 1,
    "amount": -999999999.00,
    "status": "PENDING",
    "reason": "Test vượt số dư ví",
    "createdAt": "2026-11-20T08:10:00Z"
  },
  "timestamp": "2026-11-20T08:10:00Z"
}
```

▶ **POST** `/api/v1/financial-adjustments/904/approve`

✅ **Kết quả mong đợi — KHÔNG báo lỗi, ghi nhận giao dịch `PENDING` (khoản phải thu):**
```json
{
  "code": 200,
  "message": "Phê duyệt khoản điều chỉnh tài chính thành công",
  "data": {
    "id": 904,
    "amount": -999999999.00,
    "status": "APPROVED"
  },
  "timestamp": "2026-11-20T08:11:00Z"
}
```

▶ **GET** `/api/v1/wallets/provider-profile/{providerProfileId}` → `balance` **không đổi** (không tạo số dư âm).
▶ **GET** `/api/v1/wallets/provider-profile/{providerProfileId}/transactions` → có 1 dòng `status = PENDING`, `direction = DEBIT`.

> ⚠️ Đây là hành vi **có chủ đích**: hệ thống không tạo số dư âm không kiểm soát, mà ghi nhận khoản phải thu để xử lý riêng.

---

## E.7. Từ chối khoản điều chỉnh

🟦 **Financial Adjustment (Điều chỉnh tài chính)**

▶ **POST** `/api/v1/financial-adjustments/{adjustmentId}/reject`
🔑 `Bearer {{ADMIN_TOKEN}}`
📋 **Query:** `reason=Không đủ căn cứ tài chính để điều chỉnh`

> ⚠️ Endpoint này nhận `reason` là **query parameter**, KHÔNG phải body.

✅ **Kết quả:**
```json
{
  "code": 200,
  "message": "Từ chối khoản điều chỉnh tài chính thành công",
  "data": {
    "id": 904,
    "providerProfileId": 1,
    "providerName": "Ban Quản lý Tràng An",
    "amount": -999999999.00,
    "currency": "VND",
    "reason": "Test vượt số dư ví",
    "status": "REJECTED",
    "createdBy": 1,
    "approvedBy": 1,
    "approvedAt": null,
    "createdAt": "2026-11-20T08:10:00Z"
  },
  "timestamp": "2026-11-20T08:12:00Z"
}
```

✅ **Kiểm tra:** `GET /api/v1/wallets/provider-profile/{providerProfileId}` → `balance` **không đổi**.

---

## E.8. Khoản điều chỉnh của một đối tác

🟦 **Financial Adjustment (Điều chỉnh tài chính)**

▶ **GET** `/api/v1/financial-adjustments/provider-profile/{providerProfileId}`
🔑 `Bearer {{ADMIN_TOKEN}}`
📋 **Query:** `page=0`, `size=20`

✅ **Kết quả:**
```json
{
  "code": 200,
  "message": "Lấy danh sách khoản điều chỉnh tài chính thành công",
  "data": {
    "page": 0,
    "size": 20,
    "totalElements": 2,
    "totalPages": 1,
    "first": true,
    "last": true,
    "content": [
      {
        "id": 902,
        "providerProfileId": 1,
        "providerName": "Ban Quản lý Tràng An",
        "refundRequestId": 704,
        "sourceSettlementId": 801,
        "amount": -187500.00,
        "currency": "VND",
        "reason": "Điều chỉnh doanh thu do Refund #RF4D5E6F7089A0B1C2D3E hoàn thành sau khi Settlement đã được duyệt (settlement 801)",
        "status": "PENDING",
        "createdBy": 1,
        "approvedBy": null,
        "approvedAt": null,
        "createdAt": "2026-11-20T07:50:00Z"
      },
      {
        "id": 903,
        "providerProfileId": 1,
        "providerName": "Ban Quản lý Tràng An",
        "refundRequestId": 704,
        "sourceSettlementId": 801,
        "amount": -150000.00,
        "currency": "VND",
        "reason": "Hoàn tiền phát sinh sau khi đã tất toán kỳ 2026-09",
        "status": "APPROVED",
        "createdBy": 1,
        "approvedBy": 1,
        "approvedAt": "2026-11-20T08:05:00Z",
        "createdAt": "2026-11-20T08:02:00Z"
      }
    ]
  },
  "timestamp": "2026-11-20T08:13:00Z"
}
```

---

# PHẦN F — Bộ dữ liệu lớn để thống kê

## F.1. Bảng kịch bản dữ liệu mẫu

| Nhóm | Số lượng | Cách tạo trong Swagger | Kỳ vọng thống kê |
|---|---|---|---|
| Booking thành công | 20 | Lặp A.4 → A.9 → B.1–B.4 | 20 `COMPLETED` |
| Booking chưa thanh toán | 5 | Lặp A.4 (bỏ qua A.7) | 5 `PENDING_PAYMENT` → tự `EXPIRED` sau 10 phút |
| Booking hủy | 3 | Lặp A.4 → A.17 | 3 `CANCELLED` |
| Refund 50% | 6 | Lặp C.1 → C.8 → C.9 | 6 `REFUNDED` |
| Refund 100% | 3 | Lặp C.2 → C.8 → C.9 | 3 `REFUNDED` |
| Refund chờ duyệt | 2 | Lặp C.1 (bỏ qua C.8) | 2 `PENDING_REVIEW` → giữ doanh thu ở `held` |
| ProviderProfile | 4 | Lặp BƯỚC 0.4 với 4 `userId` khác nhau | 4 đối tác, tỷ lệ 20%/25%/15%/30% |
| Kỳ tất toán | 3 | D.1 → D.2 → D.4 cho 3 kỳ | 3 settlement `APPROVED` |

> 📌 **Mẹo tăng tốc:** dùng `POST /api/v1/journeys` + `PATCH .../skip` cho từng booking thay vì làm thủ công từng nhiệm vụ — `SKIPPED` cũng được tính là hoàn thành.

---

## F.2. Thống kê booking

🟦 **Booking (Đặt tour)**

▶ **GET** `/api/v1/bookings`
🔑 `Bearer {{ADMIN_TOKEN}}`
📋 **Query:** `page=0`, `size=100`, `status=` *(bỏ trống = tất cả)*

✅ **Kết quả:**
```json
{
  "code": 200,
  "message": "Lấy danh sách booking thành công",
  "data": {
    "page": 0,
    "size": 100,
    "totalElements": 28,
    "totalPages": 1,
    "first": true,
    "last": true,
    "content": [
      { "id": 101, "bookingCode": "JG9F3A2B1C4D5E6F708", "status": "COMPLETED", "totalAmount": 1500000, "...": "..." },
      { "id": 121, "bookingCode": "JG1A2B3C4D5E6F7089A0", "status": "PENDING_PAYMENT", "totalAmount": 1500000, "...": "..." },
      { "id": 126, "bookingCode": "JG2B3C4D5E6F7089A0B1", "status": "CANCELLED", "totalAmount": 1500000, "...": "..." }
    ]
  },
  "timestamp": "2026-11-20T09:00:00Z"
}
```

**Tổng hợp theo trạng thái (đếm trong `content`):**

| Trạng thái | Số lượng |
|---|---|
| `COMPLETED` | 20 |
| `PENDING_PAYMENT` | 5 |
| `CANCELLED` | 3 |

---

## F.3. Thống kê payment

🟦 **Payment (Thanh toán VNPay)**

▶ **GET** `/api/v1/payments`
🔑 `Bearer {{ADMIN_TOKEN}}`
📋 **Query:** `page=0`, `size=100`

✅ **Kết quả:**
```json
{
  "code": 200,
  "message": "Lấy danh sách giao dịch thành công",
  "data": {
    "page": 0,
    "size": 100,
    "totalElements": 25,
    "totalPages": 1,
    "first": true,
    "last": true,
    "content": [
      { "id": 501, "bookingId": 101, "txnRef": "JG101-8F3A2B1C4D5E6F7089A", "method": "VNPAY", "bankCode": "MOMO", "cardType": "QRCODE", "status": "SUCCESS", "amount": 1500000, "currency": "VND", "duplicatePayment": false, "ipnCount": 1, "vnpResponseCode": "00", "vnpTransactionStatus": "00" }
    ]
  },
  "timestamp": "2026-11-20T09:01:00Z"
}
```

| Trạng thái | Số lượng |
|---|---|
| `SUCCESS` | 25 |

---

## F.4. Thống kê refund

🟦 **Refund (Hoàn tiền)**

▶ **GET** `/api/v1/refunds`
🔑 `Bearer {{ADMIN_TOKEN}}`
📋 **Query:** `page=0`, `size=100`

✅ **Kết quả:**
```json
{
  "code": 200,
  "message": "Lấy danh sách yêu cầu hoàn tiền thành công",
  "data": {
    "page": 0,
    "size": 100,
    "totalElements": 11,
    "totalPages": 1,
    "first": true,
    "last": true,
    "content": [
      { "id": 701, "refundCode": "RF1A2B3C4D5E6F7089A0B", "paymentId": 501, "status": "REFUNDED", "declaredReason": "TOURIST_FAULT", "approvedReason": "TOURIST_FAULT", "proposedAmount": 750000.00, "approvedAmount": 750000.00, "refundedAmount": 750000.00, "method": "VNPAY_API" },
      { "id": 702, "refundCode": "RF2B3C4D5E6F7089A0B1C", "paymentId": 502, "status": "PENDING_REVIEW", "declaredReason": "PLATFORM_FAULT", "proposedAmount": 1500000.00, "approvedAmount": null, "refundedAmount": null, "method": null }
    ]
  },
  "timestamp": "2026-11-20T09:02:00Z"
}
```

| Trạng thái | Số lượng | Tổng tiền |
|---|---|---|
| `REFUNDED` | 9 | 6×750.000 + 3×1.500.000 = 9.000.000 |
| `PENDING_REVIEW` | 2 | 2×750.000 = 1.500.000 |

---

## F.5. Thống kê doanh thu theo đối tác

🟦 **Provider Revenue (Doanh thu đối tác)**

▶ **GET** `/api/v1/provider-revenues`
🔑 `Bearer {{ADMIN_TOKEN}}`
📋 **Query:** `page=0`, `size=100`

✅ **Kết quả:**
```json
{
  "code": 200,
  "message": "Lấy danh sách doanh thu thành công",
  "data": {
    "page": 0,
    "size": 100,
    "totalElements": 20,
    "totalPages": 1,
    "first": true,
    "last": true,
    "content": [
      {
        "id": 301,
        "providerProfileId": 1,
        "providerName": "Ban Quản lý Tràng An",
        "bookingId": 101,
        "bookingCode": "JG9F3A2B1C4D5E6F708",
        "paymentId": 501,
        "txnRef": "JG101-8F3A2B1C4D5E6F7089A",
        "revenuePeriod": "2026-09",
        "completedDate": "2026-09-20",
        "grossAmount": 1500000,
        "refundAmount": 750000,
        "commissionRate": 0.2500,
        "commissionAmount": 187500.00,
        "adjustmentAmount": 0,
        "providerNetAmount": 562500.00,
        "status": "SETTLED",
        "deferredReason": null,
        "settlementId": 801,
        "eligibleAt": "2026-09-20T03:15:00Z",
        "settledAt": "2026-11-20T07:05:00Z",
        "createdAt": "2026-09-20T02:03:00Z"
      },
      {
        "id": 302,
        "providerProfileId": 2,
        "providerName": "Ban Quản lý Hạ Long",
        "bookingId": 102,
        "bookingCode": "JG2A3B4C5D6E7F809A1B",
        "paymentId": 502,
        "txnRef": "JG102-3B4C5D6E7F809A1B2C3D",
        "revenuePeriod": "2026-09",
        "completedDate": "2026-09-18",
        "grossAmount": 1500000,
        "refundAmount": 0,
        "commissionRate": 0.2000,
        "commissionAmount": 300000.00,
        "adjustmentAmount": 0,
        "providerNetAmount": 1200000.00,
        "status": "ELIGIBLE",
        "deferredReason": null,
        "settlementId": null,
        "eligibleAt": "2026-09-18T03:15:00Z",
        "settledAt": null,
        "createdAt": "2026-09-18T02:03:00Z"
      }
    ]
  },
  "timestamp": "2026-11-20T09:03:00Z"
}
```

---

## F.6. Thống kê settlement

🟦 **Settlement (Tất toán)**

▶ **GET** `/api/v1/settlements`
🔑 `Bearer {{ADMIN_TOKEN}}`
📋 **Query:** `page=0`, `size=100`

✅ **Kết quả:**
```json
{
  "code": 200,
  "message": "Lấy danh sách đợt tất toán thành công",
  "data": {
    "page": 0,
    "size": 100,
    "totalElements": 3,
    "totalPages": 1,
    "first": true,
    "last": true,
    "content": [
      { "id": 801, "settlementCode": "ST9F3A2B1C4D5E6F708", "providerProfileId": 1, "providerName": "Ban Quản lý Tràng An", "revenuePeriod": "2026-07", "grossAmount": 9000000.00, "refundAmount": 1500000.00, "commissionAmount": 1875000.00, "adjustmentAmount": 0.00, "settlementAmount": 5625000.00, "status": "APPROVED" },
      { "id": 802, "settlementCode": "ST2A4B5C6D7E8F901234", "providerProfileId": 1, "providerName": "Ban Quản lý Tràng An", "revenuePeriod": "2026-08", "grossAmount": 12000000.00, "refundAmount": 0.00, "commissionAmount": 3000000.00, "adjustmentAmount": 0.00, "settlementAmount": 9000000.00, "status": "APPROVED" },
      { "id": 803, "settlementCode": "ST3B4C5D6E7F8012345", "providerProfileId": 1, "providerName": "Ban Quản lý Tràng An", "revenuePeriod": "2026-09", "grossAmount": 15000000.00, "refundAmount": 7500000.00, "commissionAmount": 1875000.00, "adjustmentAmount": 0.00, "settlementAmount": 5625000.00, "status": "APPROVED" }
    ]
  },
  "timestamp": "2026-11-20T09:04:00Z"
}
```

---

## F.7. Thống kê giao dịch ví

🟦 **Wallet (Ví nội bộ)**

▶ **GET** `/api/v1/wallets/provider-profile/{providerProfileId}/transactions`
🔑 `Bearer {{ADMIN_TOKEN}}`
📋 **Query:** `page=0`, `size=100`

✅ **Kết quả:**
```json
{
  "code": 200,
  "message": "Lấy lịch sử giao dịch ví thành công",
  "data": {
    "page": 0,
    "size": 100,
    "totalElements": 4,
    "totalPages": 1,
    "first": true,
    "last": true,
    "content": [
      { "id": 1, "walletId": 1, "transactionType": "SETTLEMENT_CREDIT", "direction": "CREDIT", "amount": 5625000.00, "balanceBefore": 0, "balanceAfter": 5625000.00, "sourceType": "SETTLEMENT", "sourceId": 801, "status": "SUCCESS" },
      { "id": 2, "walletId": 1, "transactionType": "SETTLEMENT_CREDIT", "direction": "CREDIT", "amount": 9000000.00, "balanceBefore": 5625000.00, "balanceAfter": 14625000.00, "sourceType": "SETTLEMENT", "sourceId": 802, "status": "SUCCESS" },
      { "id": 3, "walletId": 1, "transactionType": "SETTLEMENT_CREDIT", "direction": "CREDIT", "amount": 5625000.00, "balanceBefore": 14625000.00, "balanceAfter": 20250000.00, "sourceType": "SETTLEMENT", "sourceId": 803, "status": "SUCCESS" },
      { "id": 4, "walletId": 1, "transactionType": "REFUND_ADJUSTMENT", "direction": "DEBIT", "amount": 150000.00, "balanceBefore": 20250000.00, "balanceAfter": 20100000.00, "sourceType": "FINANCIAL_ADJUSTMENT", "sourceId": 903, "status": "SUCCESS" }
    ]
  },
  "timestamp": "2026-11-20T09:05:00Z"
}
```

---

## F.8. Bảng tổng hợp đối soát

| Metric | Nguồn | Giá trị kỳ vọng |
|---|---|---|
| Tổng booking | `GET /api/v1/bookings` | 28 |
| Booking `COMPLETED` | đếm `content` | 20 |
| Booking `PENDING_PAYMENT` | đếm `content` | 5 |
| Booking `CANCELLED` | đếm `content` | 3 |
| Tổng payment `SUCCESS` | `GET /api/v1/payments` | 25 |
| Refund `REFUNDED` | `GET /api/v1/refunds` | 9 |
| Refund `PENDING_REVIEW` | `GET /api/v1/refunds` | 2 |
| Settlement `APPROVED` | `GET /api/v1/settlements` | 3 |
| Tổng tiền trong ví | `GET /api/v1/wallets/provider-profile/{providerProfileId}` | 20.100.000 |
| Tổng giao dịch ví | `GET .../transactions` | 4 (3 CREDIT + 1 DEBIT) |

**Bất biến phải đạt:**
```
Tổng settlementAmount (APPROVED) + tổng adjustment (APPROVED) == balance của ví
Tổng CREDIT − tổng DEBIT == balance hiện tại
Mỗi settlement có ĐÚNG 1 giao dịch SETTLEMENT_CREDIT
Tổng gross − tổng refund = tổng net, và commission = net × rate
```

---

# PHỤ LỤC — Bảng lỗi thường gặp

| Triệu chứng | HTTP / ErrorCode | Nguyên nhân | Xử lý |
|---|---|---|---|
| `/tours/published` trả 401 | `UNAUTHENTICATED` | Endpoint chưa whitelist | Gửi token, hoặc thêm `"/api/v1/tours/**"` vào `PUBLIC_GET_ENDPOINTS` |
| IPN trả `{"RspCode":"97"}` | — | Sai `VNPAY_HASH_SECRET` hoặc sai `vnp_TmnCode` | Đối chiếu secret trong trang quản trị VNPay Sandbox |
| IPN 404 rỗng (không có body JSON) | — | **Ngrok agent chưa chạy** hoặc trỏ sai port | `ngrok http 8088` rồi kiểm tra `curl http://127.0.0.1:4040/api/tunnels` |
| IPN 404 (có body JSON của app) | — | IPN URL sai hoặc ngrok đã đổi subdomain | Cập nhật `VNPAY_IPN_URL` + trang cấu hình IPN + restart app |
| IPN không được gọi | — | `VNPAY_IPN_URL` rỗng hoặc chưa khai báo trong trang cấu hình IPN | Đặt URL ngrok tại https://sandbox.vnpayment.vn/vnpaygw-sit-testing/ipn |
| QueryDR trả `vnp_ResponseCode=91` | — | Sai `vnp_TransactionDate` | Phải là thời điểm tạo giao dịch **gốc** |
| Payment kẹt `PROCESSING` | — | IPN chưa đến + QueryDR timeout | `POST /api/v1/payments/{paymentId}/query` → xem `outcome` |
| `Thiết lập VNPay chưa được cấu hình` | 400 | `VNPAY_HASH_SECRET` hoặc `VNPAY_TMN_CODE` bị rỗng | Kiểm tra log khởi động `[VNPay] Cấu hình: tmnCode=...`; đối chiếu với `.env.example` |
| `vnp_IpAddr` bị VNPay từ chối | — | Gửi IPv6 loopback (`::1`) | Code đã tự chuẩn hoá về `127.0.0.1` — nếu vẫn lỗi, kiểm tra `VNPAY_IP_ADDR` |
| Booking tự `EXPIRED` | — | Quá 10 phút không thanh toán | `UPDATE bookings SET payment_deadline = NOW() + INTERVAL '10 minutes'` |
| `Chưa mở bán trải nghiệm cho ngày này` | 400 `BOOKING_SLOT_NOT_FOUND` | Chưa tạo `experience_slot` cho ngày đó | Tạo slot trước khi test |
| `Trải nghiệm đã hết chỗ cho ngày này` | 409 `BOOKING_SLOT_FULL` | `booked_tour_count >= max_tour_per_day` | `UPDATE experience_slot SET booked_tour_count = 0` |
| `Tour chưa được xuất bản — không thể đặt` | 400 `BOOKING_TOUR_NOT_AVAILABLE` | Tour chưa `PUBLISHED` | `PATCH /api/v1/tours/{tourId}/publish` |
| `Đã quá thời hạn 24 giờ để gửi yêu cầu hoàn tiền` | 400 `REFUND_WINDOW_EXPIRED` | `paid_at` > 24h trước | `UPDATE payments SET paid_at = NOW() - INTERVAL '2 hours'` |
| `Giao dịch này đã có yêu cầu hoàn tiền...` | 409 `REFUND_ALREADY_EXISTS` | Đã có refund chưa kết thúc | Dùng payment khác |
| `Số tiền được duyệt (...) không khớp chính sách...` | 400 `REFUND_AMOUNT_MISMATCH` | Admin đổi số tiền khác chính sách | Bỏ `amount` khỏi body, dùng đúng `reason` |
| `Yêu cầu hoàn tiền này không dùng phương thức chuyển khoản thủ công` | 409 `REFUND_METHOD_NOT_ALLOWED` | Refund đang dùng `VNPAY_API` | Không đổi phương thức giữa chừng |
| `Chỉ cho phép tạo đợt tất toán cho kỳ doanh thu đã kết thúc` | 400 `SETTLEMENT_PERIOD_NOT_CLOSED` | Kỳ chưa kết thúc | Dùng kỳ tháng trước |
| `Đã có đợt tất toán nháp đang chờ xử lý cho kỳ...` | 409 `SETTLEMENT_ALREADY_EXISTS` | Đợt nháp cùng kỳ còn tồn tại | Từ chối/hủy đợt cũ trước |
| `Không có khoản doanh thu nào đủ điều kiện để tất toán` | 400 `SETTLEMENT_NO_ELIGIBLE_REVENUE` | Chưa có revenue `ELIGIBLE` | Kiểm tra 8 check ở B.6 |
| `Điều kiện tất toán đã thay đổi...` | 409 `SETTLEMENT_ELIGIBILITY_CHANGED` | Điều kiện đổi sau khi tạo bản nháp | Tạo settlement mới |
| Không thấy doanh thu | — | Người tạo Experience chưa có ProviderProfile | Tạo ProviderProfile cho user đó (BƯỚC 0.4) |
| `Người dùng này đã là đối tác` | 409 `PROVIDER_PROFILE_ALREADY_EXISTS` | User đã là đối tác | Dùng user khác hoặc `PUT /api/v1/provider-profiles/{providerProfileId}` |
| `Người dùng không tồn tại` | 404 `USER_NOT_EXISTED` | `userId` không tồn tại | Lấy `data.user.id` từ BƯỚC 0.1 |
| Adjustment approve trả 201 nhưng ví không đổi | — | Số dư không đủ → giao dịch `PENDING` | Xem `transactions` → `status = PENDING` là khoản phải thu |
