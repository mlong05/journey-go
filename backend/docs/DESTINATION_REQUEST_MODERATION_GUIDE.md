# Quy Trình Kiểm Duyệt Đề Xuất Điểm Đến (Destination Request Moderation Guide)

Tài liệu hướng dẫn chi tiết về API, cấu trúc JSON kiểm thử và kịch bản test luồng vòng đời đề xuất điểm đến (từ lúc Đối tác/Partner gửi request $\rightarrow$ Moderator thẩm định $\rightarrow$ Phân công Content Provider $\rightarrow$ CP tạo điểm đến & nộp duyệt $\rightarrow$ Moderator duyệt xuất bản).

---

## 👥 Danh Sách Tài Khoản Mẫu Để Test (Test Accounts)

Tất cả tài khoản đều có mật khẩu mặc định: `Password123@`

| Vai trò (Role) | Email đăng nhập | Mô tả & Nhiệm vụ |
| :--- | :--- | :--- |
| **PARTNER** | `partner1@journeygo.com` | Đối tác gửi đề xuất điểm đến mới, quản lý request của mình |
| **MODERATOR** | `moderator@journeygo.com` | Kiểm duyệt viên thẩm định lần 1 (tính hợp lệ) và duyệt lần 2 (nội dung) |
| **ADMIN** | `admin@journeygo.com` | Quản trị viên hệ thống, phân công Content Provider |
| **PROVIDER (CP)** | `provider@journeygo.com` (ID = 4) | Content Provider tiếp nhận việc, thiết kế Destination & nộp duyệt nội dung |

*Lưu ý*: Lấy Token bằng cách gọi `POST /api/v1/auth/login` với email và password tương ứng, sau đó dán vào nút **Authorize** (`Bearer <token>`) trên Swagger UI: `http://localhost:8088/swagger-ui/index.html`.

---

## 📌 Bảng Tổng Hợp Endpoints (`/api/v1/destination-requests`)

| Bước | Phương thức | Endpoint | Quyền (Role) | Công dụng |
| :--- | :--- | :--- | :--- | :--- |
| **1** | `POST` | `/api/v1/destination-requests` | `PARTNER`, `ADMIN` | Gửi đề xuất bằng JSON (kèm URL ảnh Cloudinary đã có) |
| **1b** | `POST` | `/api/v1/destination-requests/with-images` | `PARTNER`, `ADMIN` | Gửi đề xuất kèm file ảnh upload trực tiếp lên Cloudinary (`multipart/form-data`) |
| **1c** | `POST` | `/api/v1/destination-requests/{id}/images` | `PARTNER`, `ADMIN` | Tải bổ sung file ảnh lên Cloudinary cho đề xuất đã tạo |
| **1d** | `POST` | `/api/v1/destination-requests/{id}/cancel` | `PARTNER`, `ADMIN` | Đối tác tự rút / hủy đề xuất khi chưa triển khai |
| **2** | `GET` | `/api/v1/destination-requests/queue/initial` | `MODERATOR`, `ADMIN` | Lấy hàng chờ duyệt sơ bộ lần 1 (`SUBMITTED`, `UNDER_REVIEW`) |
| **2a** | `POST` | `/api/v1/destination-requests/{id}/start-review`| `MODERATOR`, `ADMIN` | Moderator đánh dấu bắt đầu xem xét (`UNDER_REVIEW`) |
| **2b** | `POST` | `/api/v1/destination-requests/{id}/initial-approve`| `MODERATOR`, `ADMIN`| Duyệt lần 1: Điểm đến hợp lệ $\rightarrow$ Chờ phân công (`APPROVED`)|
| **2c** | `POST` | `/api/v1/destination-requests/{id}/initial-reject` | `MODERATOR`, `ADMIN`| Từ chối lần 1 kèm lý do cho Partner (`REJECTED`) |
| **3** | `GET` | `/api/v1/destination-requests/queue/assignment` | `ADMIN`, `MODERATOR`| Hàng chờ phân công Content Provider (`APPROVED`) |
| **3a** | `POST` | `/api/v1/destination-requests/{id}/assign` | `ADMIN`, `MODERATOR`| Phân công request cho Content Provider (`ASSIGNED`) |
| **4** | `GET` | `/api/v1/destination-requests/assigned-to-me` | `PROVIDER`, `ADMIN` | CP xem danh sách công việc được phân công |
| **4a** | `POST` | `/api/v1/destination-requests/{id}/start-progress`| `PROVIDER`, `ADMIN` | CP tiếp nhận và bắt đầu thực hiện (`IN_PROGRESS`) |
| **4b** | `POST` | `/api/v1/destinations` | `PROVIDER`, `ADMIN` | CP tạo bản ghi Destination chi tiết trên hệ thống |
| **4c** | `POST` | `/api/v1/destination-requests/{id}/submit-content` | `PROVIDER`, `ADMIN` | CP nộp nội dung để duyệt lần 2 (`PENDING_CONTENT_REVIEW`)|
| **5** | `GET` | `/api/v1/destination-requests/queue/content` | `MODERATOR`, `ADMIN` | Hàng chờ duyệt nội dung hoàn chỉnh lần 2 |
| **5a** | `POST` | `/api/v1/destination-requests/{id}/content-approve`| `MODERATOR`, `ADMIN`| Duyệt lần 2: Xuất bản điểm đến (`PUBLISHED`, request `COMPLETED`)|
| **5b** | `POST` | `/api/v1/destination-requests/{id}/content-reject` | `MODERATOR`, `ADMIN`| Từ chối lần 2: Trả về `IN_PROGRESS` kèm feedback cho CP sửa |
| **Tra cứu**| `GET` | `/api/v1/destination-requests/{id}` | Authenticated | Xem chi tiết đề xuất, người phụ trách và toàn bộ lịch sử xử lý |
| **Tra cứu**| `GET` | `/api/v1/destination-requests` | Authenticated | Danh sách tổng quát (hỗ trợ lọc `status`, tìm kiếm `search`, phân trang)|

---

## 🔄 Kịch Bản Kiểm Thử Hoàn Chỉnh (Step-by-step Flow)

### Kịch bản 1: Luồng Thành Công Toàn Phần (Happy Path: Đăng $\rightarrow$ Duyệt $\rightarrow$ Phân công $\rightarrow$ Làm nội dung $\rightarrow$ Xuất bản)

#### Bước 1: Đối tác (Partner) gửi đề xuất điểm đến
* **Tài khoản**: `partner1@journeygo.com`
* **API**: `POST /api/v1/destination-requests` (hoặc `/with-images` nếu đính kèm file ảnh)
* **Request JSON**:
```json
{
  "destinationName": "Chùa Thiên Mụ",
  "location": "Huế, Việt Nam",
  "address": "Đồi Hà Khê, đường Nguyễn Phúc Nguyên, TP. Huế",
  "description": "Ngôi chùa cổ kính hơn 400 năm tuổi bên bờ sông Hương thơ mộng.",
  "images": [
    "https://res.cloudinary.com/demo/image/upload/sample.jpg"
  ],
  "supportingDocuments": "https://thienmu.vn/gioi-thieu-di-tich",
  "contactInfo": "Thời gian tiếp đón làm việc từ 08:00 - 17:00 các ngày trong tuần",
  "note": "Mong muốn hợp tác đưa Chùa Thiên Mụ vào các tour du lịch văn hóa di sản của JourneyGo"
}
```
* **Kết quả**: HTTP 201 Created. Trả về `id` đề xuất (ví dụ: `id = 1`), `status = "SUBMITTED"`. Thông tin liên hệ (`contactName`, `contactPhone`, `contactEmail`) được backend tự động gán từ tài khoản Partner.

---

#### Bước 2: Content Moderator thẩm định tính hợp lệ (Lần 1)
* **Tài khoản**: `moderator@journeygo.com`
* **2.1 Xem hàng chờ duyệt**:
  * **API**: `GET /api/v1/destination-requests/queue/initial?page=0&size=10`
  * Thấy đề xuất `id = 1` đang ở trạng thái `SUBMITTED`.
* **2.2 (Tùy chọn) Bắt đầu xem xét**:
  * **API**: `POST /api/v1/destination-requests/1/start-review`
  * Trạng thái đổi thành `UNDER_REVIEW`.
* **2.3 Phê duyệt sơ bộ (Chuyển sang hàng chờ phân công)**:
  * **API**: `POST /api/v1/destination-requests/1/initial-approve`
  * **Request JSON**:
  ```json
  {
    "note": "Địa điểm di tích lịch sử nổi tiếng, hồ sơ hợp lệ và phù hợp với định hướng phát triển của nền tảng."
  }
  ```
  * **Kết quả**: Trạng thái đổi thành `APPROVED`. Hệ thống gửi thông báo cho Partner và chuyển hồ sơ sang hàng chờ phân công của Admin.

---

#### Bước 3: Admin phân công Content Provider (CP)
* **Tài khoản**: `admin@journeygo.com`
* **3.1 Xem hàng chờ phân công**:
  * **API**: `GET /api/v1/destination-requests/queue/assignment?page=0&size=10`
  * Thấy đề xuất `id = 1` đang ở trạng thái `APPROVED`.
* **3.2 Phân công cho Content Provider (CP)**:
  * **API**: `POST /api/v1/destination-requests/1/assign`
  * **Request JSON**:
  ```json
  {
    "cpUserId": 4,
    "note": "Giao cho Content Provider phụ trách khu vực miền Trung xây dựng nội dung chi tiết trong 5 ngày."
  }
  ```
  * *(Lưu ý: `cpUserId = 4` là tài khoản `provider@journeygo.com`)*.
  * **Kết quả**: Trạng thái đổi thành `ASSIGNED`. Gửi thông báo đến CP được phân công.

---

#### Bước 4: Content Provider nhận việc, tạo Destination & nộp duyệt
* **Tài khoản**: `provider@journeygo.com`
* **4.1 Xem công việc được giao**:
  * **API**: `GET /api/v1/destination-requests/assigned-to-me?page=0&size=10`
  * Thấy nhiệm vụ `id = 1`.
* **4.2 Bắt đầu thực hiện**:
  * **API**: `POST /api/v1/destination-requests/1/start-progress`
  * **Kết quả**: Trạng thái đổi thành `IN_PROGRESS`.
* **4.3 Tạo điểm đến (Destination) chi tiết trên ứng dụng**:
  * **API**: `POST /api/v1/destinations`
  * **Request JSON**:
  ```json
  {
    "name": "Chùa Thiên Mụ",
    "address": "Đồi Hà Khê, đường Nguyễn Phúc Nguyên, TP. Huế",
    "latitude": 16.4529000,
    "longitude": 107.5451000,
    "capacity": 2000,
    "regionId": 1,
    "themeIds": [1],
    "coverImageUrl": "https://res.cloudinary.com/demo/image/upload/sample.jpg"
  }
  ```
  * **Kết quả**: Trả về Destination mới được tạo (ví dụ: `id = 10`), trạng thái Destination là `DRAFT`, `approved = false`.
* **4.4 Nộp duyệt nội dung Destination hoàn chỉnh**:
  * **API**: `POST /api/v1/destination-requests/1/submit-content`
  * **Request JSON**:
  ```json
  {
    "destinationId": 10,
    "note": "Đã khảo sát và hoàn thành tọa độ GPS chính xác, nội dung thuyết minh lịch sử và hình ảnh chất lượng cao."
  }
  ```
  * **Kết quả**: Trạng thái đề xuất đổi thành `PENDING_CONTENT_REVIEW`, gắn khóa ngoại `destinationId = 10`.

---

#### Bước 5: Content Moderator kiểm duyệt chất lượng nội dung & Xuất bản (Lần 2)
* **Tài khoản**: `moderator@journeygo.com`
* **5.1 Xem hàng chờ kiểm duyệt nội dung**:
  * **API**: `GET /api/v1/destination-requests/queue/content?page=0&size=10`
* **5.2 Phê duyệt xuất bản điểm đến**:
  * **API**: `POST /api/v1/destination-requests/1/content-approve`
  * **Request JSON** (tùy chọn note):
  ```json
  {
    "note": "Nội dung chuẩn xác, văn phong hấp dẫn, hình ảnh đạt chuẩn. Phê duyệt xuất bản ngay."
  }
  ```
  * **Kết quả**:
    1. Đề xuất chuyển thành **`COMPLETED`**.
    2. Điểm đến `Destination (id = 10)` tự động chuyển thành **`status = PUBLISHED`** và **`approved = true`** $\rightarrow$ Du khách trên app có thể thấy và đặt trải nghiệm ngay!
    3. Hệ thống gửi thông báo chúc mừng đến Partner và Content Provider.

---

### Kịch bản 2: Moderator Từ Chối Ở Lần 1 (Hồ Sơ Không Hợp Lệ)
Nếu thông tin đề xuất sơ bộ không đúng hoặc không phù hợp:
* **Tài khoản**: `moderator@journeygo.com`
* **API**: `POST /api/v1/destination-requests/{id}/initial-reject`
* **Request JSON**:
```json
{
  "reason": "THONG_TIN_CHUA_CHINH_XAC",
  "note": "Địa điểm này hiện đang trong quá trình trùng tu đóng cửa dài hạn, chưa phù hợp đưa lên ứng dụng."
}
```
* **Kết quả**: Trạng thái chuyển thành `REJECTED`. Partner nhận thông báo kèm lý do từ chối.

---

### Kịch bản 3: Moderator Yêu Cầu Sửa Đổi Ở Lần 2 (Nội Dung Chưa Đạt Chuẩn)
Nếu CP xây dựng nội dung thiếu sót hoặc sai lệch:
* **Tài khoản**: `moderator@journeygo.com`
* **API**: `POST /api/v1/destination-requests/{id}/content-reject`
* **Request JSON**:
```json
{
  "rejectionReason": "THIEU_ANH_THUC_TE",
  "note": "Ảnh bìa độ phân giải còn thấp và thiếu phần thuyết minh về Tháp Phước Duyên. Vui lòng bổ sung."
}
```
* **Kết quả**: 
  1. Đề xuất quay trở lại trạng thái **`IN_PROGRESS`**.
  2. Gửi thông báo và feedback chi tiết cho Content Provider.
  3. CP chỉnh sửa cập nhật Destination rồi gọi lại `submit-content` để nộp duyệt lại.

---

### Kịch bản 4: Đối Tác Rút / Hủy Đề Xuất (Cancel Request)
Partner có thể hủy đề xuất khi chưa bắt đầu xây dựng nội dung:
* **Tài khoản**: `partner1@journeygo.com`
* **API**: `POST /api/v1/destination-requests/{id}/cancel`
* **Request JSON**:
```json
{
  "reason": "Thay đổi kế hoạch kinh doanh và tiếp thị của đơn vị."
}
```
* **Kết quả**: Trạng thái đổi thành `CANCELLED`.
