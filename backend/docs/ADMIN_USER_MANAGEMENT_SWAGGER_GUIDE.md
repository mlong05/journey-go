# Hướng Dẫn Test Swagger Các API Quản Lý Người Dùng (Admin User Management)

Tài liệu này hướng dẫn chi tiết cách kiểm thử các API quản lý người dùng vừa được triển khai dành riêng cho vai trò **ADMIN** trên giao diện Swagger UI.

---

## 1. Truy Cập Swagger UI & Chuẩn Bị Quyền Admin

- **URL Swagger UI**: [http://localhost:8088/swagger-ui/index.html](http://localhost:8088/swagger-ui/index.html) (hoặc `http://localhost:8088/swagger-ui.html`)
- **Lưu ý quan trọng**: Tất cả các API trong nhóm **User Management (Admin)** đều được bảo vệ bởi `@PreAuthorize("hasRole('ADMIN')")`. Do đó, bạn cần đăng nhập với tài khoản có vai trò `ADMIN` để lấy Access Token trước khi gọi API.

### Bước 1: Đăng nhập lấy Token
1. Tìm đến nhóm API **Authentication** -> endpoint `POST /api/v1/auth/login`.
2. Nhấn **Try it out** và nhập thông tin tài khoản Admin của bạn:
   ```json
   {
     "email": "admin@journeygo.com",
     "password": "MậtKhẩuCủaAdmin"
   }
   ```
3. Nhấn **Execute**.
4. Sao chép giá trị `accessToken` từ response (nằm trong `data.accessToken`).

### Bước 2: Thiết lập Token vào Swagger (Authorize)
1. Cuộn lên đầu trang Swagger UI, nhấn vào nút **Authorize** (hình ổ khóa màu xanh lá).
2. Tại trường `Bearer Authentication (http, Bearer)`, dán chuỗi token vừa copy vào.
3. Nhấn **Authorize** -> Nhấn **Close**.
> Kể từ lúc này, mọi request gửi từ Swagger sẽ tự động đính kèm header `Authorization: Bearer <accessToken>`.

---

## 2. Danh Sách Các API Mới (Nhóm: `User Management (Admin)`)

Base URL: `/api/v1/users`

| STT | Phương thức | Endpoint | Chức năng | Body / Query Params chính |
| :---: | :---: | :--- | :--- | :--- |
| 1 | `GET` | `/api/v1/users` | Xem danh sách người dùng (phân trang & lọc) | `keyword`, `role`, `active`, `page`, `size`, `sort` |
| 2 | `GET` | `/api/v1/users/{id}` | Xem chi tiết 1 người dùng theo ID | Path param: `id` |
| 3 | `POST` | `/api/v1/users` | Tạo mới tài khoản người dùng bởi Admin | `AdminCreateUserRequest` (email, password, role...) |
| 4 | `PUT` | `/api/v1/users/{id}` | Cập nhật thông tin chi tiết người dùng | `AdminUpdateUserRequest` (fullName, phone, role...) |
| 5 | `PATCH` | `/api/v1/users/{id}/role` | Cập nhật vai trò (Role) của người dùng | `UpdateRoleRequest` (`role`) |
| 6 | `PATCH` | `/api/v1/users/{id}/status` | Đổi trạng thái kích hoạt / vô hiệu hóa | `UpdateUserStatusRequest` (`active`) |
| 7 | `POST` | `/api/v1/users/{id}/deactivate` | Khóa tài khoản (vô hiệu hóa) nhanh | Path param: `id` |
| 8 | `POST` | `/api/v1/users/{id}/activate` | Mở khóa tài khoản (kích hoạt) nhanh | Path param: `id` |

---

## 3. Hướng Dẫn Kiểm Thử Từng API

### 3.1. Lấy danh sách người dùng (`GET /api/v1/users`)
- **Mục đích**: Xem danh sách phân trang người dùng, hỗ trợ tìm kiếm và lọc.
- **Các tham số kiểm thử (Query Parameters)**:
  - `keyword`: Tìm theo từ khóa (họ tên, email hoặc số điện thoại). Ví dụ: `john` hoặc `098`.
  - `role`: Lọc theo vai trò (`TOURIST`, `MODERATOR`, `PROVIDER`, `ADMIN`).
  - `active`: Lọc theo trạng thái tài khoản (`true` = đang hoạt động, `false` = đã bị khóa).
  - `page`: Chỉ số trang (bắt đầu từ `0`).
  - `size`: Số bản ghi trên 1 trang (mặc định: `20`).
  - `sort`: Tiêu chí sắp xếp (ví dụ: `id,desc` hoặc `createdAt,desc`).
    > 💡 **Lưu ý quan trọng trên Swagger UI**:
    > Swagger thường tự động điền sẵn giá trị placeholder `"string"` vào ô `sort`. 
    > - Bạn nên xóa hẳn dòng `"string"` đó (hoặc bấm vào nút icon thùng rác bên cạnh ô sort).
    > - Hoặc đổi `"string"` thành `id,asc` hay `createdAt,desc`.
    > - *(Backend hiện tại cũng đã được bổ sung cơ chế tự động lọc an toàn: nếu Swagger gửi lên `"string"`, hệ thống sẽ tự động bỏ qua và sắp xếp mặc định theo `id` để không bao giờ bị crash lỗi 500).*
- **Response mẫu (200 OK)**:
  ```json
  {
    "code": 200,
    "message": "Lấy danh sách người dùng thành công",
    "data": {
      "content": [
        {
          "id": 2,
          "email": "user@journeygo.com",
          "fullName": "Nguyễn Văn A",
          "phone": "0987654321",
          "role": "TOURIST",
          "authProvider": "LOCAL",
          "avatarUrl": null,
          "active": true,
          "createdAt": "2026-10-15T08:00:00Z",
          "updatedAt": "2026-10-16T08:30:00Z"
        }
      ],
      "pageable": { "pageNumber": 0, "pageSize": 20 },
      "totalElements": 1,
      "totalPages": 1
    }
  }
  ```

---

### 3.2. Xem chi tiết người dùng theo ID (`GET /api/v1/users/{id}`)
- **Mục đích**: Lấy thông tin đầy đủ của 1 tài khoản cụ thể.
- **Tham số**:
  - `id`: ID của người dùng (ví dụ: `2`).
- **Response mẫu (200 OK)**:
  ```json
  {
    "code": 200,
    "message": "Lấy thông tin người dùng thành công",
    "data": {
      "id": 2,
      "email": "user@journeygo.com",
      "fullName": "Nguyễn Văn A",
      "phone": "0987654321",
      "role": "TOURIST",
      "authProvider": "LOCAL",
      "avatarUrl": null,
      "active": true,
      "createdAt": "2026-10-15T08:00:00Z",
      "updatedAt": "2026-10-16T08:30:00Z"
    }
  }
  ```
- **Trường hợp lỗi**: Nếu `id` không tồn tại sẽ trả về lỗi `404 Not Found` kèm mã lỗi `USER_NOT_EXISTED`.

---

### 3.3. Admin tạo mới người dùng (`POST /api/v1/users`)
- **Mục đích**: Admin chủ động khởi tạo tài khoản nhân sự/người dùng với vai trò bất kỳ.
- **Request Body mẫu**:
  ```json
  {
    "email": "moderator.test@journeygo.com",
    "password": "Password123@",
    "fullName": "Trần Thị Mod",
    "phone": "0912345678",
    "role": "MODERATOR",
    "active": true
  }
  ```
- **Response mẫu (201 Created)**:
  ```json
  {
    "code": 200,
    "message": "Tạo người dùng mới thành công",
    "data": {
      "id": 5,
      "email": "moderator.test@journeygo.com",
      "fullName": "Trần Thị Mod",
      "phone": "0912345678",
      "role": "MODERATOR",
      "authProvider": "LOCAL",
      "avatarUrl": null,
      "active": true,
      "createdAt": "2026-10-16T09:00:00Z",
      "updatedAt": "2026-10-16T09:00:00Z"
    }
  }
  ```
- **Quy tắc kiểm tra**:
  - Nếu email đã tồn tại -> Trả về `409 Conflict` (`USER_EXISTED`).
  - Mật khẩu tối thiểu 6 ký tự.

---

### 3.4. Cập nhật vai trò người dùng (`PATCH /api/v1/users/{id}/role`)
- **Mục đích**: Nâng cấp hoặc thay đổi phân quyền cho tài khoản (ví dụ: chuyển từ `TOURIST` thành `MODERATOR` hoặc `PROVIDER`).
- **Path Param**: `id` của người dùng cần đổi role (ví dụ: `2`).
- **Request Body**:
  ```json
  {
    "role": "MODERATOR"
  }
  ```
- **Response mẫu (200 OK)**:
  ```json
  {
    "code": 200,
    "message": "Cập nhật vai trò người dùng thành công",
    "data": {
      "id": 2,
      "email": "user@journeygo.com",
      "role": "MODERATOR"
    }
  }
  ```
- **Cơ chế bảo mật đặc biệt**:
  - 🛡️ **Tự bảo vệ tài khoản**: Admin **không thể** tự đổi vai trò của chính mình (`id` trùng với tài khoản đang đăng nhập). Nếu thử, hệ thống sẽ chặn và trả về `400 Bad Request` với mã `CANNOT_MODIFY_OWN_ROLE`.
  - 🔄 **Thu hồi phiên đăng nhập**: Khi vai trò của user thay đổi, toàn bộ Refresh Tokens cũ của user đó sẽ bị thu hồi ngay lập tức để buộc user đăng nhập lại với quyền mới.

---

### 3.5. Cập nhật thông tin chi tiết người dùng (`PUT /api/v1/users/{id}`)
- **Mục đích**: Admin chỉnh sửa thông tin tổng thể của người dùng.
- **Request Body**:
  ```json
  {
    "fullName": "Nguyễn Văn A (Updated)",
    "phone": "0988889999",
    "role": "TOURIST",
    "active": true
  }
  ```
- **Response mẫu (200 OK)**: Trả về thông tin user sau khi cập nhật.

---

### 3.6. Kích hoạt hoặc Vô hiệu hóa tài khoản (`PATCH /api/v1/users/{id}/status`)
- **Mục đích**: Khóa tài khoản vi phạm hoặc mở khóa tài khoản.
- **Request Body (Khóa tài khoản)**:
  ```json
  {
    "active": false
  }
  ```
- **Request Body (Mở khóa tài khoản)**:
  ```json
  {
    "active": true
  }
  ```
- **Response mẫu (200 OK)**:
  ```json
  {
    "code": 200,
    "message": "Vô hiệu hóa người dùng thành công",
    "data": {
      "id": 2,
      "active": false
    }
  }
  ```
- **Cơ chế bảo mật đặc biệt**:
  - 🛡️ **Chống tự khóa**: Admin **không thể** tự vô hiệu hóa tài khoản của chính mình. Nếu thử, hệ thống sẽ trả về lỗi `400 Bad Request` với mã `CANNOT_DEACTIVATE_SELF`.
  - ⛔ **Vô hiệu hóa ngay lập tức**: Khi tài khoản bị vô hiệu hóa (`active = false`), toàn bộ Refresh Token của tài khoản đó sẽ bị hủy ngay để ngăn chặn tiếp tục sử dụng hệ thống.

---

### 3.7. Endpoint Khóa / Mở khóa nhanh (Action API)
Dành cho trường hợp giao diện frontend muốn gọi action trực tiếp thay vì gửi body:
1. **Khóa tài khoản nhanh**: `POST /api/v1/users/{id}/deactivate`
   - Không cần Request Body.
   - Kết quả: Đặt `active = false` và thu hồi mọi session.
2. **Mở khóa tài khoản nhanh**: `POST /api/v1/users/{id}/activate`
   - Không cần Request Body.
   - Kết quả: Đặt `active = true`.

---

## 4. Bảng Tổng Hợp Mã Lỗi Thường Gặp Khi Test

| HTTP Status | ErrorCode | Ý nghĩa |
| :---: | :--- | :--- |
| **401 Unauthorized** | `UNAUTHENTICATED` / `INVALID_TOKEN` | Chưa truyền Bearer token hoặc token đã hết hạn |
| **403 Forbidden** | `UNAUTHORIZED` | Token hợp lệ nhưng tài khoản không có quyền `ROLE_ADMIN` |
| **400 Bad Request** | `CANNOT_MODIFY_OWN_ROLE` | Admin đang thử tự đổi vai trò của chính mình |
| **400 Bad Request** | `CANNOT_DEACTIVATE_SELF` | Admin đang thử tự khóa tài khoản của chính mình |
| **404 Not Found** | `USER_NOT_EXISTED` | ID người dùng được yêu cầu không tìm thấy trong hệ thống |
| **409 Conflict** | `USER_EXISTED` | Email đã được sử dụng bởi người dùng khác khi tạo mới |
| **400 Bad Request** | `VALIDATION_ERROR` | Dữ liệu đầu vào không hợp lệ (sai định dạng email, mật khẩu ngắn...) |
