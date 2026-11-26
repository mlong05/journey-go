# 🌱 SEED — Dữ liệu DEMO của JourneyGo

Thư mục này chứa **toàn bộ dữ liệu demo** của hệ thống. Dữ liệu demo **KHÔNG tự chạy**
khi Backend khởi động — phải chạy thủ công khi cần.

> **Phân biệt rõ 3 thành phần:**
>
> | Thành phần | Vị trí | Vai trò |
> |---|---|---|
> | Dữ liệu nền tảng cố định | `backend/src/main/java/com/journeygo/config/DataInitializer.java` | Tự chạy khi Backend khởi động — Role, TaskType, PointRule, Region, Theme, chính sách hoa hồng. Cần tồn tại trên **mọi** môi trường. |
> | **File SQL Seed** | `backend/src/main/resources/seed/` (thư mục này) | Dữ liệu demo: tài khoản, tour, booking, thanh toán, hoàn tiền, doanh thu. **Chỉ chạy thủ công.** |
> | **Java Seed Runner** | `backend/src/main/java/com/journeygo/config/seeder/` | Đọc & thực thi các file SQL trong thư mục `seed/` theo thứ tự tên file. |
> | **Docker service** | `docker-compose.yml` → service `backend-seed` | Khởi chạy Java Seed Runner trong container. Không làm gì khác. |

---

## 📋 Danh sách script (thứ tự chạy theo tiền tố số)

| # | File | Nội dung |
|---|---|---|
| 01 | `01_demo_accounts.sql` | Tài khoản Admin / Moderator / Tourist demo + **5 đối tác** (user + hồ sơ + ví) + voucher nền tảng & voucher từng đối tác + huy hiệu + 5 điểm di tích mẫu |
| 02 | `02_demo_tours.sql` | 20 tour đã xuất bản (luồng 5 bước, có giá / điểm đến / quiz / trải nghiệm / slot / lịch sử duyệt) |
| 03 | `03_demo_real_tours.sql` | 5 tour thật (dữ liệu tham quan có thật, ảnh Wikimedia Commons) |
| 04 | `04_demo_transactions.sql` | 9 giao dịch mẫu `JGSAMPLE*` để test booking / thanh toán / hoàn tiền |
| 05 | `05_demo_settlement_2026.sql` | **5 đối tác × 10 tháng (2026-01 → 2026-10)**, mỗi tháng 5–10 giao dịch thành công, có voucher (PLATFORM & PARTNER) + refund đã hoàn thành. **KHÔNG tạo đợt tất toán.** |
| 10 | `10_demo_history_common.sql` | Nen tang du lieu demo lich su 2024-2026: 60 tai khoan tourist demo (`demo.tourist01..60@demo.journeygo.local`), diem den, trai nghiem, helper functions `demo_season_factor` / `demo_year_factor` / `demo_revenue_period` |
| 11 | `11_demo_history_catalog.sql` | Catalog tour + slot lich su cho 7 doi tac (2024-01 -> 2026-12), gia 3 nhom ADULT/CHILD/TODDLER, lich khoi hanh |
| 12 | `12_demo_history_bookings_2024.sql` | Booking lich su 2024 cho `provider@journeygo.com` + payment VNPAY SUCCESS + provider_revenue ELIGIBLE |
| 13 | `13_demo_history_bookings_2025.sql` | Booking lich su 2025 cho `provider@journeygo.com` |
| 14 | `14_demo_history_bookings_2026.sql` | Booking lich su 2026 cho `provider@journeygo.com` |
| 15 | `15_demo_history_refunds.sql` | Refund requests cho cac booking lich su (PENDING_REVIEW / REFUNDED / REJECTED) theo `PersonalRefundPolicy` 3 bac |
| 16 | `16_demo_history_bookings_all_providers.sql` | Booking lich su cho **6 doi tac con lai** (profile 2-7), 1.500 booking moi doi tac, rai deu 2024-01 -> 2026-11. **KHONG tao dot tat toan** |
| 25 | `25_demo_backfill_gap_months.sql` | Backfill cac thang bi TRONG cua profile 2 va 3 (do bug phan bo quota cua script 16). 1 booking / slot => mat do khop voi cac thang da co du lieu |
| 26 | `26_demo_repair_encoding_and_images.sql` | Sua mojibake `???` (do pipe PowerShell lam mat byte UTF-8) + tro lai anh cua 2 host chet |
| 27 | `27_demo_repoint_images_to_unsplash.sql` | Tro toan bo anh demo sang 37 URL Unsplash da verify HTTP 200 (Wikimedia chan hotlink) |
| 28 | `28_demo_fill_missing_images.sql` | Dien anh con trong cho destinations / users avatar+cover / tour draft |
| 29 | `29_demo_repair_remaining_text.sql` | Sua nhot text con lai (bank_account_name, notifications title/body, checkpoint note) |

> **Luu y:** cac script 10-16 va 25 chi tao `provider_revenues` o trang thai `ELIGIBLE`.
> **Dot tat toan (settlement) PHAI duoc tao qua API chinh thuc cua Admin**
> (`POST /api/v1/settlements` + `POST /api/v1/settlements/{id}/approve`).

> 📁 Script dọn dữ liệu nằm ở `seed/manual/90_cleanup_demo_data.sql` — **KHÔNG tự chạy**
> (Java Seed Runner chỉ quét `classpath*:seed/*.sql`, không quét thư mục con).
> Phải chạy thủ công bằng `psql` khi cần revert.

> 📁 Các script dọn dữ liệu test API nằm ở `seed/manual/91_cleanup_api_test_data.sql`
> (dọn dữ liệu test API lưu hành) và `seed/manual/92_restore_settlement_sample.sql`
> (khôi phục mẫu tất toán). Cả hai **KHÔNG tự chạy** — chạy tay bằng `psql` khi cần.

---

## 🚀 Cách chạy

### 1. Docker (khuyến nghị)

```bash
# Chạy toàn bộ script seed (service tự thoát sau khi xong)
docker compose run --rm backend-seed

# Hoặc dùng profile "seed"
docker compose --profile seed run --rm backend-seed
```

### 2. Local (Maven)

```bash
cd backend
SEED_ENABLED=true mvn spring-boot:run
```

Muốn Backend thoát luôn sau khi seed (giống Docker):

```bash
SEED_ENABLED=true APP_SEED_EXIT_AFTER_RUN=true mvn spring-boot:run
```

### 3. psql (không cần Backend)

```bash
psql -h localhost -U postgres -d journeygo_db -f backend/src/main/resources/seed/01_demo_accounts.sql
psql -h localhost -U postgres -d journeygo_db -f backend/src/main/resources/seed/02_demo_tours.sql
# …
```
> ⚠️ Cần chạy `01_demo_accounts.sql` **trước** (các script sau phụ thuộc tài khoản + khu vực/chủ đề).
> Backend phải được khởi động **ít nhất 1 lần** trước khi seed, để `DataInitializer` tạo
> Role / Region / Theme.

---

## 🔐 Tài khoản demo

| Email | Vai trò | Mật khẩu |
|---|---|---|
| `admin@journeygo.com` | ADMIN | `Password123@` |
| `moderator@journeygo.com` | CONTENT_MODERATOR | `Password123@` |
| `tourist@journeygo.com` | TOURIST (100 điểm) | `Password123@` |
| `tourist1@journeygo.com` | TOURIST | `Password123@` |
| `tourist2@journeygo.com` | TOURIST | `Password123@` |
| `provider@journeygo.com` | CONTENT_PROVIDER — Ban Quản Lý Tràng An | `Password123@` |
| `provider3@journeygo.com` | CONTENT_PROVIDER — Sapa Trekking Co-op | `Password123@` |
| `provider4@journeygo.com` | CONTENT_PROVIDER — Mekong Delta Tours | `Password123@` |
| `provider5@journeygo.com` | CONTENT_PROVIDER — Hoi An Heritage Journey | `Password123@` |
| `provider6@journeygo.com` | CONTENT_PROVIDER — Phu Quoc Island Resort | `Password123@` |

---

## 💰 Dữ liệu tài chính 2026 (script 05)

| Đối tác | Giá vé ADULT | Hoa hồng |
|---|---|---|
| Ban Quản Lý Tràng An | 800.000 ₫ | 20% |
| Sapa Trekking Co-op | 1.500.000 ₫ | 20% |
| Mekong Delta Tours | 1.100.000 ₫ | 20% |
| Hoi An Heritage Journey | 850.000 ₫ | 20% |
| Phu Quoc Island Resort | 1.300.000 ₫ | 20% |

- Mỗi đối tác × mỗi tháng (2026-01 → 2026-10): **5–10 giao dịch**
- Mỗi giao dịch: `Booking` COMPLETED + `Payment` SUCCESS + `ProviderRevenue` **ELIGIBLE** (`settlement_id = NULL`)
- Voucher: cứ mỗi 3 giao dịch thì 1 giao dịch có voucher (luân phiên **PLATFORM** của sàn ↔ **PARTNER** của đối tác)
- Refund: cứ mỗi 4 giao dịch thì 1 giao dịch có refund **đã hoàn thành** (`REFUNDED`) — 50% giá trị đơn
- ⚠️ **KHÔNG tạo đợt tất toán nào** — dành cho Admin tự tạo & duyệt từ tab *"Ứng viên tất toán"*

---

## 🧹 Dọn dữ liệu

```bash
psql -h localhost -U postgres -d journeygo_db -f backend/src/main/resources/seed/manual/90_cleanup_demo_data.sql
```

Script `90_cleanup_demo_data.sql` có 2 chế độ:
- **Chế độ B (mặc định, luôn chạy)** — giải phóng các khoản doanh thu đang gắn đợt tất toán,
  xoá các đợt tất toán, xoá toàn bộ giao dịch `JGB26%`. Dùng để **test lại** luồng tạo đợt tất toán.
- **Chế độ A (comment sẵn trong file)** — xoá TOÀN BỘ dữ liệu demo (tài khoản, tour, giao dịch).
  Bỏ comment khối `DELETE` tương ứng nếu muốn dùng.

> ⚠️ Luôn BACKUP database trước khi chạy script dọn dữ liệu.

---

## ♻️ Tính idempotent

Mọi script đều idempotent — chạy lại nhiều lần vẫn an toàn:

| Script | Cơ chế kiểm tra |
|---|---|
| 01 | theo `users.email`, `vouchers.code`, `badges.code`, `destinations.name` |
| 02 / 03 | theo `tours.title` |
| 04 | theo `bookings.booking_code` (tiền tố `JGSAMPLE`) |
| 05 | theo `bookings.booking_code` (tiền tố `JGB26`) |
| manual/90 | luôn xoá theo tiền tố `JGB26` + toàn bộ `settlements` (chạy thủ công, không tự chạy) |

Mỗi script chạy trong **1 transaction riêng** (Java Seed Runner) ⇒ một script lỗi sẽ rollback
riêng script đó, không ảnh hưởng các script trước.
