# Lưu Ý Quan Trọng Cho Team Khi Pull Code Mới Nhất
> **Phân hệ cập nhật:** Tích hợp Redis Auth, Google OAuth2 Deep Link cho Mobile & Rate Limiter  
> **Áp dụng cho:** Toàn bộ thành viên (Backend 1-2, Frontend, Mobile, QA)

---

## ⚡ Tóm Tắt Nhanh (Gửi Nhóm Chat)

```text
📢 THÔNG BÁO CẬP NHẬT CODE NHÁNH MAIN:
1. BACKEND:
   - Cần bật Redis trước khi chạy app: `docker compose up -d redis`
   - Bổ sung biến Redis vào backend/.env (PASSWORD để trống)
   - Reload Maven trong IDE (để tải spring-boot-starter-data-redis)
2. MOBILE:
   - Đã sẵn sàng luồng Google OAuth2 bằng Deep Link (không cần SHA-1 / Android Client ID).
   - Xem file: backend/docs/GOOGLE_OAUTH2_MOBILE_DEEP_LINK_GUIDE.md
3. FRONTEND:
   - Bổ sung thông báo thân thiện khi gặp HTTP 429 (LOGIN_RATE_LIMITED) do sai pass quá 5 lần (tạm khóa 5 phút).
```

---

## 1. Dành Cho Backend (Backend 1 & Backend 2) ⚠️ *BẮT BUỘC*

### Bước 1: Khởi động Redis
Backend hiện tại đã sử dụng Redis để:
- Lưu Access Token Blacklist khi Logout (tra cứu RAM $O(1) < 1ms$ thay vì SELECT PostgreSQL).
- Quản lý và thu hồi phiên Refresh Token.
- Login Rate Limiting chống dò mật khẩu (Brute-force).

👉 **Cách bật nhanh qua Docker:**
```powershell
# Chạy từ thư mục gốc dự án (d:\S9\journey-go)
docker compose up -d redis
```
*(Nếu chưa bật cả PostgreSQL thì chạy: `docker compose up -d postgres redis`)*

### Bước 2: Cập nhật file `backend/.env`
Mở file `backend/.env` trên máy cá nhân và bổ sung 3 dòng cấu hình Redis:
```env
SPRING_DATA_REDIS_HOST=localhost
SPRING_DATA_REDIS_PORT=6379
SPRING_DATA_REDIS_PASSWORD=
```
> ⚠️ **LƯU Ý:** Biến `SPRING_DATA_REDIS_PASSWORD` **phải để trống** (vì Redis chạy mặc định qua Docker không cài mật khẩu). Nếu bạn điền giá trị bất kỳ vào đây, Redis sẽ từ chối kết nối với lỗi: `ERR Client sent AUTH, but no password is set`.

### Bước 3: Reload Maven trong IDE
Do dự án bổ sung dependency mới `spring-boot-starter-data-redis` trong `pom.xml`:
- **IntelliJ IDEA:** Chuột phải vào `pom.xml` $\rightarrow$ **Maven** $\rightarrow$ **Reload Project**.
- **VS Code:** Nhấn `Ctrl + Shift + P` $\rightarrow$ `Java: Clean Java Language Server Workspace` hoặc mở view Maven chọn Reload.
- **Terminal:**
  ```powershell
  cd backend
  mvn clean test-compile
  ```

### Bước 4: Kiểm tra Unit Tests
Chạy lệnh sau để đảm bảo máy bạn biên dịch chuẩn 100%:
```powershell
mvn test
```
*(Hiện tại 89/89 tests đều đạt `BUILD SUCCESS`)*.

---

## 2. Dành Cho Frontend (Next.js / React)

### 1. Luồng Google OAuth2 Web không thay đổi
- Frontend Web tiếp tục sử dụng luồng đăng nhập Google hiện tại với redirect URI Web (`http://localhost:3000/...`).
- Toàn bộ API xác thực (`/api/v1/auth/login`, `/register`, `/refresh-token`, `/logout`) giữ nguyên định dạng request/response.

### 2. Xử lý mã lỗi Rate Limit mới (HTTP 429)
Backend đã kích hoạt cơ chế khóa tài khoản tạm thời chống tấn công dò mật khẩu:
- **Quy tắc:** Nếu nhập sai mật khẩu **quá 5 lần liên tiếp** cho cùng 1 email, Backend sẽ khóa đăng nhập email đó trong **5 phút**.
- **Response trả về:**
  - **HTTP Status:** `429 Too Many Requests`
  - **Body JSON:**
    ```json
    {
      "code": 429,
      "message": "Tài khoản tạm thời bị khóa 5 phút do đăng nhập sai quá nhiều lần. Vui lòng thử lại sau.",
      "errorCode": "LOGIN_RATE_LIMITED"
    }
    ```
- **Khuyến nghị UI:** Bắt mã `LOGIN_RATE_LIMITED` hoặc status `429` để hiển thị alert thông báo đếm ngược hoặc hướng dẫn người dùng thử lại sau 5 phút.

---

## 3. Dành Cho Mobile (Flutter)

### 1. Đăng nhập Google không cần cấu hình Android Client ID & SHA-1
- Không cần cấu hình phức tạp trên Google Cloud Console cho từng máy dev.
- Ứng dụng Mobile chỉ cần mở Chrome Custom Tabs truy cập:
  ```text
  http://<IP_BACKEND>:8088/oauth2/authorization/google?redirect_uri=journeygo://oauth2/redirect&role=TOURIST
  ```
- Backend tự động cấp tài khoản quyền `TOURIST` và redirect về Deep Link:
  ```text
  journeygo://oauth2/redirect?token=<ACCESS_TOKEN>&refreshToken=<REFRESH_TOKEN>
  ```

### 2. Các bước tích hợp phía Flutter
Xem tài liệu hướng dẫn chi tiết từng dòng code và cấu hình `AndroidManifest.xml` tại:
👉 **[backend/docs/GOOGLE_OAUTH2_MOBILE_DEEP_LINK_GUIDE.md](file:///d:/S9/journey-go/backend/docs/GOOGLE_OAUTH2_MOBILE_DEEP_LINK_GUIDE.md)**

---

## 4. Dành Cho QA & DevOps

### 1. Quản lý toàn bộ Container bằng Docker Compose
Dự án đã có sẵn [docker-compose.yml](file:///d:/S9/journey-go/docker-compose.yml) ở thư mục gốc:
- `docker compose up -d`: Khởi động toàn bộ Postgres, Redis và Spring Boot Backend.
- `docker compose down`: Dừng các container.
- `docker compose logs -f backend`: Xem live log của Backend khi chạy trong container.

### 2. Debug & kiểm tra dữ liệu Redis trực tiếp
```powershell
# Vào Redis CLI trong container
docker exec -it journeygo-redis redis-cli

# Kiểm tra danh sách key đang lưu trên RAM
keys *

# Kiểm tra TTL (thời gian sống còn lại tính bằng giây)
ttl auth:blacklist:<token>
ttl auth:login:attempts:<email>

# Thoát Redis CLI
exit
```

---
*Nếu gặp bất kỳ vướng mắc nào trong quá trình khởi động hoặc chạy code, vui lòng liên hệ team để được hỗ trợ.*
