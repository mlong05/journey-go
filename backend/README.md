# JourneyGo Backend

Monolith backend service cho hệ thống **JourneyGo** được phát triển trên nền tảng **JDK 21**, **Spring Boot 3.3.5**, **PostgreSQL** và **Spring Security 6 (JWT)**.

---

## 🚀 Tính năng & Công nghệ chính
- **Java 21 (LTS)**: Kích hoạt **Virtual Threads** (`spring.threads.virtual.enabled: true`) cho hiệu năng xử lý concurrency cao.
- **Spring Boot 3.3.5**: Kiến trúc Monolith module hóa (`common`, `config`, `security`, `modules/user`, `modules/auth`).
- **PostgreSQL**: Spring Data JPA & Hibernate ddl-auto.
- **Spring Security 6 + JJWT**:
  - Xác thực phi trạng thái (Stateless Authentication).
  - Cấp cặp token: **Access Token** (hết hạn sau 15 phút) & **Refresh Token** (lưu DB, hết hạn sau 7 ngày, hỗ trợ thu hồi).
  - Thu hồi Refresh Token khi gọi logout.
  - Phân quyền theo Role: `USER`, `ADMIN`, `MODERATOR`, `PROVIDER`.
- **Swagger / OpenAPI 3**: Tích hợp sẵn Swagger UI tại `/swagger-ui.html` kèm nút **Authorize (Bearer JWT)** để test API trực quan.
- **CORS**: Hỗ trợ gọi API từ Frontend Next.js (`http://localhost:3000`).

---

## 📋 Danh sách API Xác thực (Authentication)
Base URL: `http://localhost:8088`

| Phương thức | Đường dẫn | Mô tả | Yêu cầu xác thực |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/auth/register` | Đăng ký tài khoản mới & tự động cấp cặp token | Không |
| `POST` | `/api/v1/auth/login` | Đăng nhập bằng email/password, trả về Access & Refresh Token | Không |
| `POST` | `/api/v1/auth/refresh` | Cấp mới Access Token bằng Refresh Token | Không |
| `POST` | `/api/v1/auth/logout` | Đăng xuất, hủy phiên và thu hồi Refresh Token | Tùy chọn |
| `GET` | `/api/v1/auth/me` | Lấy thông tin cá nhân của người dùng hiện tại | Có (`Bearer <token>`) |

---

## 🛠 Hướng dẫn cài đặt & Khởi chạy

### 1. Yêu cầu hệ thống
- **JDK 21**
- **Apache Maven 3.9+**
- **PostgreSQL 14+** (đã tạo database `journeygo_db` hoặc cập nhật trong cấu hình)

### 2. Cấu hình Cơ sở dữ liệu
File cấu hình tại `src/main/resources/application.yml`. Bạn có thể truyền qua biến môi trường hoặc để mặc định:
```bash
SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/journeygo_db
SPRING_DATASOURCE_USERNAME=postgres
SPRING_DATASOURCE_PASSWORD=1
```

### 3. Build & Chạy ứng dụng
Tại thư mục `backend`:
```bash
# Biên dịch và tải dependencies
mvn clean compile

# Chạy ứng dụng
mvn spring-boot:run
```

### 4. Tài khoản mặc định (Tự khởi tạo khi chạy lần đầu)
- **Quản trị viên (ADMIN)**:
  - Email: `admin@journeygo.com`
  - Mật khẩu: `Admin@123456`
- **Khách hàng (USER)**:
  - Email: `user@journeygo.com`
  - Mật khẩu: `User@123456`

### 5. Swagger UI
Sau khi khởi động server, truy cập:
👉 **http://localhost:8088/swagger-ui.html**
