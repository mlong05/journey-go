# Hướng Dẫn Kỹ Thuật: Tích Hợp Redis Auth & Google OAuth2 Cho Mobile
## Nhánh: `feat/auth-redis-integration`

Tài liệu này tóm tắt toàn bộ bối cảnh (context), các tính năng mới, kiến trúc hoạt động và những lưu ý quan trọng khi chạy hoặc phát triển tiếp trên nhánh này.

---

## 1. Trả Lời Về Biến `SPRING_DATA_REDIS_PASSWORD`

> ❓ **Câu hỏi:** *Biến `SPRING_DATA_REDIS_PASSWORD=` để trống có gây lỗi không?*

* **Câu trả lời:** **HOÀN TOÀN KHÔNG BỊ LỖI, ĐỂ TRỐNG LÀ HOÀN TOÀN CHÍNH XÁC.**
* **Lý do kỹ thuật:**
  - Lệnh Docker bạn vừa chạy (`docker run -d --name journeygo-redis -p 6379:6379 redis:alpine`) khởi tạo Redis ở chế độ mặc định **không cài mật khẩu** (passwordless).
  - Spring Boot (Lettuce driver) khi thấy biến `SPRING_DATA_REDIS_PASSWORD` rỗng sẽ tự động kết nối trực tiếp không gửi lệnh `AUTH`.
  - *(Lưu ý: Nếu bạn cố tình điền mật khẩu vào khi Redis không cài pass, Redis sẽ báo lỗi: `ERR Client sent AUTH, but no password is set`)*.
  - Khi nào lên môi trường Production hoặc dùng Redis Cloud có mật khẩu thì bạn mới cần điền giá trị vào biến này.

---

## 2. Tổng Hợp Các Tính Năng Mới Trên Nhánh Này

Nhánh `feat/auth-redis-integration` bao gồm **2 phân hệ tính năng lớn**:

```
feat/auth-redis-integration
 ├── 1. Google OAuth2 Cho Mobile (Deep Link & In-App Browser)
 └── 2. Tối Ưu Hóa & Bảo Mật Auth Bằng Redis (Blacklist, Refresh Token, Rate Limit)
```

---

### Phân Hệ 1: Google OAuth2 Cho Mobile (In-App Browser & Deep Link)

* **Vấn đề giải quyết:** App Flutter Mobile trước đây không dùng được Google Sign-In do thiếu cấu hình Android Client ID và mã SHA-1 trên Google Cloud Console.
* **Giải pháp triển khai:**
  - Du khách trên app Mobile bấm "Đăng nhập Google" $\rightarrow$ App mở Chrome Custom Tabs truy cập:
    `http://<HOST>:8088/oauth2/authorization/google?redirect_uri=journeygo://oauth2/redirect&role=TOURIST`
  - Backend xác thực với Google $\rightarrow$ Tự động tạo user với role `TOURIST` $\rightarrow$ Chuyển hướng về Deep Link:
    `journeygo://oauth2/redirect?token=<accessToken>&refreshToken=<refreshToken>`
  - App Mobile bắt Deep Link và đăng nhập thành công.
* **Các file thay đổi:**
  - [OAuth2AuthenticationSuccessHandler.java](file:///d:/S9/journey-go/backend/src/main/java/com/journeygo/security/oauth2/OAuth2AuthenticationSuccessHandler.java): Thêm kiểm tra custom scheme `journeygo://` và gán role `TOURIST`.
  - [OAuth2AuthenticationFailureHandler.java](file:///d:/S9/journey-go/backend/src/main/java/com/journeygo/security/oauth2/OAuth2AuthenticationFailureHandler.java): Chống Open Redirect.
  - [HttpCookieOAuth2AuthorizationRequestRepository.java](file:///d:/S9/journey-go/backend/src/main/java/com/journeygo/security/oauth2/HttpCookieOAuth2AuthorizationRequestRepository.java): Lưu trữ `role` qua Cookie phiên.
  - [application.yml](file:///d:/S9/journey-go/backend/src/main/resources/application.yml): Whitelist các URI `journeygo://oauth2/redirect`.
  - File hướng dẫn riêng cho mobile: [GOOGLE_OAUTH2_MOBILE_DEEP_LINK_GUIDE.md](file:///d:/S9/journey-go/backend/docs/GOOGLE_OAUTH2_MOBILE_DEEP_LINK_GUIDE.md).

---

### Phân Hệ 2: Tích Hợp Redis Vào Hệ Thống Auth

#### 1. Blacklist Access Token khi Đăng Xuất (Logout)
- **Trước đây:** Mỗi request gửi lên có Bearer token đều phải gọi PostgreSQL `SELECT COUNT(*) FROM invalidated_tokens WHERE id = ?` để kiểm tra token có bị hủy chưa $\rightarrow$ gây nghẽn I/O Database.
- **Hiện tại:** 
  - Token khi logout được lưu vào Redis với key `auth:blacklist:<token>` và TTL tự hủy đúng bằng thời gian sống còn lại của Access Token (15 phút).
  - [JwtAuthenticationFilter](file:///d:/S9/journey-go/backend/src/main/java/com/journeygo/security/JwtAuthenticationFilter.java) kiểm tra trên RAM Redis với độ phức tạp $O(1)$ (< 1ms).
  - Vẫn ghi đệm vào PostgreSQL để làm nhật ký kiểm toán (Cache-aside pattern).

#### 2. Caching & Quản Lý Vòng Đời Refresh Token Trên Redis
- Khi du khách đăng nhập hoặc được cấp token:
  - Lưu `auth:refresh_token:<token>` $\rightarrow$ `userId` (TTL 7 ngày).
  - Thêm token vào Set `auth:user_refresh_tokens:<userId>` để theo dõi toàn bộ phiên của user.
- Khi người dùng đổi mật khẩu hoặc Admin khóa tài khoản:
  - Hàm `revokeAllUserTokens` xóa ngay lập tức tất cả Refresh Token của user đó trên Redis.

#### 3. Chống Tấn Công Dò Mật Khẩu (Login Rate Limiter & Brute-Force Protection)
- Service mới: [LoginRateLimiterService.java](file:///d:/S9/journey-go/backend/src/main/java/com/journeygo/modules/auth/service/LoginRateLimiterService.java).
- **Quy tắc bảo vệ:**
  - Nếu nhập sai mật khẩu: Redis tăng biến đếm `auth:login:attempts:<email>`.
  - Nếu nhập sai liên tiếp **5 lần**: Tự động tạo khóa `auth:login:blocked:<email>` với thời hạn **5 phút**.
  - Trong thời gian 5 phút này, mọi nỗ lực đăng nhập bằng email đó sẽ bị chặn ngay lập tức với mã lỗi `LOGIN_RATE_LIMITED` (HTTP 429) mà không cần tốn chi phí kiểm tra mật khẩu trong Database.
  - Khi đăng nhập thành công: Tự động reset bộ đếm về 0.

---

## 3. Những Lưu Ý Quan Trọng Khi Chạy / Code

### 1. Quản lý Hạ Tầng (Redis & PostgreSQL) bằng Docker Compose
Dự án đã được trang bị sẵn file `docker-compose.yml` ở thư mục gốc và `Dockerfile` trong `backend/`:

* **Kịch bản A: Khi bạn code & debug trên IDE (Khuyên dùng khi dev hàng ngày)**
  Chỉ cần khởi động 2 dịch vụ phụ thuộc (PostgreSQL & Redis), sau đó chạy code Java trực tiếp trên IDE:
  ```powershell
  # Từ thư mục gốc dự án (d:\S9\journey-go)
  docker compose up -d postgres redis
  ```
  *(Lệnh này sẽ tự động bật PostgreSQL ở cổng 5432 và Redis ở cổng 6379 kèm lưu dữ liệu bền vững).*

* **Kịch bản B: Khởi động toàn bộ hệ thống (Bao gồm cả Spring Boot Backend)**
  Khi muốn demo hoặc chạy thử trọn gói toàn bộ Backend qua Docker:
  ```powershell
  docker compose up -d
  ```

* **Dừng các container:**
  ```powershell
  docker compose down
  ```

### 2. Kiểm tra dữ liệu trong Redis (Debug CLI)
Bạn có thể xem các key đang được lưu trong Redis bằng cách gõ lệnh trực tiếp vào container:
```powershell
# Vào Redis CLI
docker exec -it journeygo-redis redis-cli

# Xem tất cả các key hiện có (ví dụ: blacklist token, rate limit counter)
keys *

# Xem giá trị và thời gian sống còn lại (TTL tính bằng giây) của 1 key
ttl auth:login:attempts:<email>
ttl auth:blacklist:<token>

# Thoát Redis CLI
exit
```

### 3. File Môi Trường `.env`
Đảm bảo file `.env` ở thư mục `backend/` có các biến sau khi chạy cục bộ:
```env
SPRING_DATA_REDIS_HOST=localhost
SPRING_DATA_REDIS_PORT=6379
SPRING_DATA_REDIS_PASSWORD=
```
*(Nếu chạy Backend bên trong Docker qua `docker compose up -d`, các biến này đã được `docker-compose.yml` tự động cấu hình trỏ sang hostname nội bộ `redis` và `postgres`).*

---
*Tài liệu được cập nhật theo commit mới nhất của nhánh `feat/auth-redis-integration`.*
