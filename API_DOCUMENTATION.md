# JourneyGo API Documentation

> **Base URL:** `http://localhost:8080/api/v1`
> **Auth:** JWT Bearer Token (`Authorization: Bearer <access_token>`)
> **Response format:** `ApiResponse<T>` → `{ code: number, message: string, result: T }`
> **Soft delete:** các entity bị xóa chuyển trạng thái sang `INACTIVE`, không mất dữ liệu.

---

## Mục lục

1. [Phân quyền (Roles)](#1-phân-quyền-roles)
2. [Auth — Xác thực](#2-auth--xác-thực)
3. [Users — Quản lý người dùng](#3-users--quản-lý-người-dùng)
4. [Destinations — Điểm đến](#4-destinations--điểm-đến)
5. [Experiences — Trải nghiệm du lịch](#5-experiences--trải-nghiệm-du-lịch)
6. [ExperienceSlots — Quota theo ngày](#6-experienceslots--quota-theo-ngày)
7. [CheckInPoints — Điểm check-in vi mô](#7-checkinpoints--điểm-check-in-vi-mô)
8. [Tasks — Nhiệm vụ](#8-tasks--nhiệm-vụ)
9. [TaskTypes — Loại nhiệm vụ (master data)](#9-tasktypes--loại-nhiệm-vụ-master-data)
10. [Questions — Câu hỏi](#10-questions--câu-hỏi)
11. [Answers — Đáp án](#11-answers--đáp-án)
12. [PointRules & UnlockConditions — Điểm thưởng & điều kiện mở khóa](#12-pointrules--unlockconditions--điểm-thưởng--điều-kiện-mở-khóa)
13. [UserCheckInPoints — Lịch sử check-in du khách](#13-usercheckinpoints--lịch-sử-check-in-du-khách)
14. [Quy tắc nghiệp vụ (Business Rules)](#14-quy-tắc-nghiệp-vụ-business-rules)

---

## 1. Phân quyền (Roles)

| Vai trò | Quyền hạn |
|---|---|
| `USER` | Check-in, xem lịch sử cá nhân |
| `PROVIDER` | Tạo/sửa/xóa Experience + nội dung con (Task, Question…) trên tài nguyên **của chính mình** |
| `MODERATOR` | Phê duyệt / xóa mềm / khôi phục Destination |
| `ADMIN` | Toàn quyền User, master data (`TaskType`, `PointRule`), mọi thao tác của MODERATOR + PROVIDER |

**Chú ý:** một số controller dùng `hasRole('TOURIST')` nhưng enum `Role` hiện chỉ có `USER` — cần chuẩn hóa lại thành `USER` hoặc bổ sung `TOURIST` vào enum.

---

## 2. Auth — Xác thực

**Base path:** `/api/v1/auth`

### 2.1 POST `/login` — Đăng nhập

**Auth:** Không cần

**Request body:**
```json
{
  "email": "user@example.com",
  "password": "secret123"
}
```

**Response:**
```json
{
  "code": 200,
  "message": "Đăng nhập thành công",
  "result": {
    "accessToken": "eyJhbG...",
    "refreshToken": "eyJhbG...",
    "tokenType": "Bearer",
    "expiresIn": 86400
  }
}
```

---

### 2.2 POST `/register` — Đăng ký

**Auth:** Không cần

**Request body:**
```json
{
  "email": "user@example.com",
  "password": "secret123",
  "fullName": "Nguyễn Văn A"
}
```

**Response:** giống `/login` — trả token ngay sau khi tạo tài khoản.

---

### 2.3 POST `/google` — Google OAuth2

**Auth:** Không cần

**Request body:**
```json
{
  "googleIdToken": "<ID Token từ Google Sign-In client>"
}
```

**Hành vi:** nếu email chưa có tài khoản → tự tạo mới với role `USER`. Luôn trả token.

---

### 2.4 POST `/refresh` — Làm mới token

**Auth:** Không cần

**Request body:**
```json
{ "refreshToken": "eyJhbG..." }
```

---

### 2.5 POST `/logout` — Đăng xuất

**Auth:** Bearer

**Request body** (optional):
```json
{ "refreshToken": "eyJhbG..." }
```

**Hành vi:** thu hồi access token hiện tại (đưa vào blacklist) và refresh token nếu được gửi.

---

### 2.6 GET `/me` — Thông tin người dùng hiện tại

**Auth:** Bearer

**Response:**
```json
{
  "code": 200,
  "message": "Lấy thông tin thành công",
  "result": {
    "id": 1,
    "email": "user@example.com",
    "fullName": "Nguyễn Văn A",
    "role": "USER",
    "active": true,
    "createdAt": "2025-10-01T00:00:00Z"
  }
}
```

---

### 2.7 PUT `/profile` — Cập nhật thông tin cá nhân

**Auth:** Bearer

**Request body** (tất cả optional):
```json
{
  "fullName": "Nguyễn Văn B",
  "phone": "0901234567",
  "avatarUrl": "https://..."
}
```

---

### 2.8 POST `/forgot-password` — Gửi mã OTP

**Auth:** Không cần

**Request body:**
```json
{ "email": "user@example.com" }
```

**Hành vi:** gửi mã OTP 6 chữ số qua email.

---

### 2.9 POST `/verify-otp` — Kiểm tra OTP

**Auth:** Không cần

**Request body:**
```json
{ "email": "user@example.com", "otp": "123456" }
```

**Response:** `result: true` nếu hợp lệ và chưa hết hạn.

---

### 2.10 POST `/reset-password` — Đặt mật khẩu mới bằng OTP

**Auth:** Không cần

**Request body:**
```json
{
  "email": "user@example.com",
  "otp": "123456",
  "newPassword": "newSecret123"
}
```

---

### 2.11 POST `/change-password` — Đổi mật khẩu

**Auth:** Bearer

**Request body:**
```json
{
  "currentPassword": "oldSecret123",
  "newPassword": "newSecret123"
}
```

---

## 3. Users — Quản lý người dùng

**Base path:** `/api/v1/users`  
**Auth:** Bearer + `hasRole('ADMIN')` (áp dụng toàn bộ controller)

---

### 3.1 GET `/` — Danh sách người dùng (phân trang)

**Query params:**

| Tham số | Kiểu | Mô tả |
|---|---|---|
| `keyword` | string | Tìm theo email, họ tên, số điện thoại |
| `role` | `USER \| MODERATOR \| PROVIDER \| ADMIN` | Lọc theo vai trò |
| `active` | boolean | Lọc theo trạng thái kích hoạt |
| `page`, `size`, `sort` | | Phân trang, ví dụ `sort=createdAt,desc` |

**Ví dụ:** `GET /api/v1/users?role=PROVIDER&active=true&page=0&size=20&sort=id,asc`

---

### 3.2 GET `/{id}` — Chi tiết người dùng

### 3.3 POST `/` — Admin tạo người dùng mới

**Request body:**
```json
{
  "email": "partner@example.com",
  "password": "tempPassword123",
  "fullName": "Đối tác B",
  "role": "PROVIDER",
  "phone": "0909876543"
}
```

---

### 3.4 PUT `/{id}` — Cập nhật thông tin người dùng

**Request body:**
```json
{
  "fullName": "Tên mới",
  "phone": "0901112222",
  "role": "MODERATOR",
  "active": true
}
```

Mọi thay đổi đều ghi nhận `currentUser` (admin đang thao tác) vào audit log.

---

### 3.5 PATCH `/{id}/role` — Đổi vai trò

**Request body:**
```json
{ "role": "PROVIDER" }
```

---

### 3.6 PATCH `/{id}/status` — Kích hoạt / vô hiệu hóa

**Request body:**
```json
{ "active": false }
```

---

### 3.7 POST `/{id}/deactivate` — Khóa nhanh

Shortcut cho `PATCH /{id}/status` với `active=false`.

---

### 3.8 POST `/{id}/activate` — Mở khóa nhanh

Shortcut cho `PATCH /{id}/status` với `active=true`.

---

## 4. Destinations — Điểm đến

**Base path:** `/api/v1/destinations`

---

### Công khai (không cần auth)

| Method | Path | Mô tả |
|---|---|---|
| GET | `/` | Tất cả điểm đến chưa xóa |
| GET | `/approved` | Chỉ điểm đã được phê duyệt |
| GET | `/{id}` | Chi tiết 1 điểm đến |

---

### MODERATOR / ADMIN

| Method | Path | Mô tả |
|---|---|---|
| GET | `/deleted` | Danh sách điểm đã xóa mềm (thùng rác) |
| PATCH | `/{id}/approve?approved=true` | Phê duyệt |
| PATCH | `/{id}/approve?approved=false` | Hủy phê duyệt |
| DELETE | `/{id}` | Xóa mềm |
| PATCH | `/{id}/restore` | Khôi phục từ thùng rác |

---

### PROVIDER / MODERATOR / ADMIN

| Method | Path | Mô tả |
|---|---|---|
| POST | `/` | Tạo điểm đến mới (mặc định chưa duyệt) |
| PUT | `/{id}` | Cập nhật — **PROVIDER chỉ sửa điểm của chính mình** |

**Request body (create/update):**
```json
{
  "name": "Chùa Trấn Quốc",
  "description": "Ngôi chùa cổ nhất Việt Nam...",
  "address": "P. Trấn Quốc, Tây Hồ, Hà Nội",
  "latitude": 21.0486,
  "longitude": 105.8339,
  "category": "DIEP_SANG",
  "imageUrls": ["https://...", "https://..."],
  "culturalStory": "Lịch sử hơn 1500 năm..."
}
```

---

## 5. Experiences — Trải nghiệm du lịch

**Base path:** `/api/v1/experiences`

> Mỗi **Destination** có **1 Experience** (1-1). Status: `DRAFT | PUBLISHED | INACTIVE`.

---

### Công khai

| Method | Path | Mô tả |
|---|---|---|
| GET | `/experiences/{id}` | Chi tiết experience |
| GET | `/destinations/{destinationId}/experience` | Experience theo destination |
| GET | `/experiences` | Danh sách (phân trang) |

**Query params cho `GET /experiences`:**

| Tham số | Mặc định | Mô tả |
|---|---|---|
| `status` | – | `DRAFT \| PUBLISHED \| INACTIVE` |
| `includeInactive` | `false` | `true` để admin thấy cả đã xóa |
| `page`, `size`, `sort` | – | Phân trang |

---

### PROVIDER / ADMIN

| Method | Path | Mô tả |
|---|---|---|
| POST | `/experiences` | Tạo mới (status = DRAFT). **BR-EXP-1: 1 destination chỉ 1 experience** |
| PATCH | `/experiences/{id}` | Sửa — **BR-EXP-2: chỉ sửa khi DRAFT**, chỉ owner |
| DELETE | `/experiences/{id}` | Xóa mềm → INACTIVE, chỉ owner |

**Request body (create):**
```json
{
  "destinationId": 1,
  "title": "Khám phá Chùa Trấn Quốc",
  "description": "Hành trình 90 phút qua các di tích lịch sử",
  "estimatedDuration": 90,
  "maxTourists": 20
}
```

---

## 6. ExperienceSlots — Quota theo ngày

**Base path:** `/api/v1/experiences/{experienceId}/slots`

> Quản lý số lượng khách (quota) theo ngày cho từng tour. Vì Experience 1-1 Destination nên slot cũng ngầm quản quota cho destination.

---

### Công khai

| Method | Path | Mô tả |
|---|---|---|
| GET | `/experiences/{experienceId}/slots` | Danh sách slot |
| GET | `/experiences/{experienceId}/slots?date=2026-10-20` | Lọc theo ngày |
| GET | `/slots/{id}` | Chi tiết slot |

---

### PROVIDER / ADMIN (chỉ owner)

| Method | Path | Mô tả |
|---|---|---|
| POST | `/experiences/{experienceId}/slots` | Tạo/upsert quota theo ngày |
| PATCH | `/slots/{id}` | Cập nhật quota hoặc status |
| DELETE | `/slots/{id}` | Xóa slot |

**Request body (upsert):**
```json
{
  "slotDate": "2026-10-20",
  "maxQuota": 30,
  "status": "AVAILABLE"
}
```

**BR:** Upsert theo `(experienceId, slotDate)` — gọi nhiều lần cùng ngày sẽ cập nhật, không tạo trùng.

---

## 7. CheckInPoints — Điểm check-in vi mô

**Base path:** `/api/v1/experiences/{experienceId}/check-in-points`

> Mỗi Experience có nhiều CheckInPoint (1-N). Mỗi CheckInPoint có 1 QR token duy nhất.

---

### Công khai

| Method | Path | Mô tả |
|---|---|---|
| GET | `/check-in-points/{id}` | Chi tiết |
| GET | `/experiences/{experienceId}/check-in-points` | Danh sách theo experience |

---

### PROVIDER / ADMIN (chỉ owner, chỉ khi Experience DRAFT)

| Method | Path | Mô tả |
|---|---|---|
| POST | `/experiences/{experienceId}/check-in-points` | Tạo mới — **BR-CIP-1: qr_token UNIQUE** |
| PATCH | `/check-in-points/{id}` | Cập nhật |
| DELETE | `/check-in-points/{id}` | Xóa |

**Request body (create):**
```json
{
  "name": "Điểm check-in 1 — Cổng tam quan",
  "qrToken": "CHECKIN_COT_TAM_QUAN_001",
  "verificationMethod": "QR",
  "latitude": 21.0490,
  "longitude": 105.8340,
  "sequenceOrder": 1,
  "description": "Check-in tại cổng tam quan để mở khóa nhiệm vụ 1"
}
```

**verificationMethod:** `GPS | QR | MANUAL`

---

## 8. Tasks — Nhiệm vụ

**Base path:** `/api/v1/experiences/{experienceId}/tasks`

> Nhiệm vụ bên trong Experience. Mỗi Task có `sequenceOrder` (thứ tự), có thể gắn CheckInPoint và UnlockCondition.

---

### Công khai

| Method | Path | Mô tả |
|---|---|---|
| GET | `/tasks/{id}` | Chi tiết |
| GET | `/experiences/{experienceId}/tasks` | Danh sách (sắp theo `sequenceOrder`) |

---

### PROVIDER / ADMIN (chỉ owner, chỉ khi Experience DRAFT)

| Method | Path | Mô tả |
|---|---|---|
| POST | `/experiences/{experienceId}/tasks` | Tạo mới |
| PATCH | `/tasks/{id}` | Cập nhật — **BR-TASK-1: chỉ sửa khi DRAFT** |
| DELETE | `/tasks/{id}` | Xóa mềm |
| POST | `/experiences/{experienceId}/tasks/reorder` | Sắp xếp lại thứ tự |
| PATCH | `/tasks/{id}/points` | Set điểm thưởng |
| PATCH | `/tasks/{id}/location?checkInPointId=...` | Gắn Task vào CheckInPoint |
| PATCH | `/tasks/{id}/unlock-condition` | Set điều kiện mở khóa |

**Request body (create):**
```json
{
  "title": "Chụp ảnh tại Cổng tam quan",
  "description": "Du khách chụp ảnh Cổng tam quan và tải lên",
  "taskTypeId": 1,
  "pointsReward": 10,
  "sequenceOrder": 1
}
```

**Request body (reorder):**
```json
{
  "taskIds": [3, 1, 2]
}
```

**Request body (set points):**
```json
{
  "pointsReward": 15
}
```

---

## 9. TaskTypes — Loại nhiệm vụ (master data)

**Base path:** `/api/v1/task-types`

> Danh mục loại nhiệm vụ (ví dụ: QUIZ, FIELD_CLUE, PHOTO, SURVEY…). **Public đọc** để populate dropdown, **ADMIN sửa**.

---

### Công khai

| Method | Path | Mô tả |
|---|---|---|
| GET | `/task-types` | Danh sách tất cả loại task |
| GET | `/task-types/{id}` | Chi tiết |
| GET | `/task-types/code/{code}` | Tìm theo code, ví dụ `QUIZ`, `FIELD_CLUE` |

---

### ADMIN

| Method | Path | Mô tả |
|---|---|---|
| POST | `/task-types` | Tạo mới |
| PATCH | `/task-types/{id}` | Cập nhật |

**Request body (create):**
```json
{
  "code": "FIELD_CLUE",
  "name": "Gợi ý thực địa",
  "description": "Câu hỏi dạng gợi ý khám phá tại chỗ",
  "icon": "bi bi-compass",
  "defaultPoints": 10
}
```

---

## 10. Questions — Câu hỏi

**Base path:** `/api/v1/tasks/{taskId}/questions`

> Câu hỏi bên trong Task (thường dùng cho QUIZ). Hỗ trợ `MULTIPLE_CHOICE` và `TEXT`.

---

### Công khai (ẩn đáp án)

| Method | Path | Mô tả |
|---|---|---|
| GET | `/questions/{id}` | Chi tiết |
| GET | `/tasks/{taskId}/questions` | Danh sách |
| `?forTourist=true` | | **Ẩn `expectedText` + `isCorrect`** — dùng cho ứng dụng du khách |

---

### PROVIDER / ADMIN (chỉ owner, chỉ khi Task DRAFT)

| Method | Path | Mô tả |
|---|---|---|
| POST | `/tasks/{taskId}/questions` | Tạo mới |
| PATCH | `/questions/{id}/expected-text` | Set / cập nhật expectedText |
| DELETE | `/questions/{id}` | Xóa |

**Request body (create):**
```json
{
  "content": "Chùa Trấn Quốc được xây dựng vào năm nào?",
  "type": "MULTIPLE_CHOICE",
  "sequenceOrder": 1,
  "expectedText": "Năm 541"
}
```

**type:** `MULTIPLE_CHOICE | TEXT`

---

## 11. Answers — Đáp án

**Base path:** `/api/v1/questions/{questionId}/answers`

> Đáp án của câu hỏi. Nhiều Answer → 1 Question.

---

### Công khai

| Method | Path | Mô tả |
|---|---|---|
| GET | `/answers/{id}` | Chi tiết |
| `?forTourist=true` | | Ẩn `isCorrect` và `explanation` |

---

### PROVIDER / ADMIN (chỉ owner, chỉ khi Task DRAFT)

| Method | Path | Mô tả |
|---|---|---|
| POST | `/questions/{questionId}/answers` | Tạo mới |
| PATCH | `/answers/{id}` | Cập nhật |
| DELETE | `/answers/{id}` | Xóa |

**Request body (create):**
```json
{
  "content": "Năm 541",
  "isCorrect": false,
  "explanation": "Chùa Trấn Quốc được vua Lý Nam Đế cho xây dựng năm 541"
}
```

**BR-TASK-6:**
- `MULTIPLE_CHOICE`: chỉ **đúng 1** đáp án có `isCorrect=true`
- `TEXT`: **tất cả** đáp án đều `isCorrect=true`

---

## 12. PointRules & UnlockConditions — Điểm thưởng & điều kiện mở khóa

---

### 12.1 PointRule — Điểm thưởng mặc định theo TaskType

**Base path:** `/api/v1/task-types/{taskTypeId}/point-rule`

| Method | Auth | Mô tả |
|---|---|---|
| GET | Public | Lấy PointRule của TaskType (master data) |
| POST | **ADMIN** | Tạo hoặc cập nhật (upsert) |

**Request body:**
```json
{
  "basePoints": 10,
  "bonusPoints": 5,
  "maxPoints": 50
}
```

**Cách dùng:** Provider tạo Task → dùng `pointRule.basePoints` làm default, override qua `PATCH /tasks/{id}/points`.

---

### 12.2 UnlockCondition — Điều kiện mở khóa Task

**Base path:** `/api/v1/tasks/{taskId}/unlock-condition`

| Method | Auth | Mô tả |
|---|---|---|
| GET | Public | Lấy điều kiện mở khóa của Task |
| PATCH | owner | Set / cập nhật (từ `TaskController`) |

**UnlockConditionType:** `COMPLETE_PREVIOUS_TASK | MIN_POINTS | MANUAL_APPROVAL`

**Request body** (set unlock condition):
```json
{
  "type": "COMPLETE_PREVIOUS_TASK",
  "previousTaskId": 1,
  "requiredPoints": null
}
```

---

## 13. UserCheckInPoints — Lịch sử check-in du khách

**Base path:** `/api/v1/check-in-points/{id}/check-in`

> Ghi nhận khi du khách check-in tại CheckInPoint. Check-in = hoàn thành Task liên quan → cộng điểm.

---

### USER / TOURIST

| Method | Path | Mô tả |
|---|---|---|
| POST | `/check-in-points/{id}/check-in` | Check-in — gửi GPS **hoặc** QR **hoặc** MANUAL |

**Request body (3 loại, gửi 1 trong 3):**
```json
// GPS
{
  "method": "GPS",
  "latitude": 21.0490,
  "longitude": 105.8340
}

// QR
{
  "method": "QR",
  "qrValue": "CHECKIN_COT_TAM_QUAN_001"
}

// MANUAL (admin duyệt)
{
  "method": "MANUAL",
  "note": "Khách đã đến điểm, xác nhận thủ công"
}
```

**Response:**
```json
{
  "code": 201,
  "message": "Check-in thành công",
  "result": {
    "checkInPointId": 1,
    "checkInTime": "2026-10-18T13:20:00Z",
    "pointsEarned": 10,
    "status": "COMPLETED"
  }
}
```

---

### USER / TOURIST (xem lịch sử)

| Method | Path | Mô tả |
|---|---|---|
| GET | `/me/check-in-points` | Toàn bộ lịch sử check-in của tôi |
| GET | `/me/experiences/{experienceId}/check-in-points` | Check-in theo experience cụ thể |

---

## 14. Quy tắc nghiệp vụ (Business Rules)

| Mã | Nội dung |
|---|---|
| **BR-EXP-1** | 1 Destination chỉ gắn với **1 Experience** (quan hệ 1-1) |
| **BR-EXP-2** | Experience chỉ được **sửa** khi status = `DRAFT`. Khi đã `PUBLISHED` → không sửa nội dung, chỉ có thể soft-delete |
| **BR-CIP-1** | `qrToken` của CheckInPoint phải **UNIQUE** trong toàn DB |
| **BR-TASK-1** | Task chỉ được sửa khi status = `DRAFT` |
| **BR-TASK-5** | Khi gọi `GET /questions` hoặc `GET /answers` với `?forTourist=true` → server **ẩn** `expectedText`, `isCorrect`, `explanation` khỏi response |
| **BR-TASK-6** | `MULTIPLE_CHOICE` chỉ có **đúng 1** đáp án `isCorrect=true`; `TEXT` cho phép **tất cả** đáp án `isCorrect=true` |

---

## 15. Sơ đồ mối quan hệ entity

```
Destination (1) ──── (1) Experience
                             │
                             │ (1-N)
                    ExperienceSlot (quota/ngày)
                             │
                             │ (1-N)
                         Task
                         │
            ┌─────────────┼──────────────┐
            │             │              │
            ▼             ▼              ▼
      CheckInPoint   UnlockCondition  Question (1-N) Answer
            │
            │ (N-N, qua UserCheckInPoint)
            ▼
      UserCheckInPoint ← USER/Tourist check-in
```

---

## 16. Lưu ý khi tích hợp Frontend

1. **Mọi API experience con** (Task, Question, Answer, CheckInPoint) đều dùng `isOwnerOf...` SpEL bean — frontend nhận **403 Forbidden** nếu truy cập tài nguyên không thuộc mình.
2. **`forTourist=true`** luôn truyền khi gọi từ ứng dụng du khách để che đáp án.
3. **Check-in flow:** `POST /check-in-points/{id}/check-in` → server tự động hoàn thành Task liên quan + cộng điểm (logic trong `UserCheckInPointService`).
4. **Publish flow:** sau khi Provider tạo đủ Task/Question/Answer → gọi `PATCH /experiences/{id}` với `status=PUBLISHED` để public cho du khách.
5. **Soft delete:** không gọi DELETE mà nên dùng `PATCH /status` để toggle `active` hoặc `DELETE` để soft-delete.
6. **Audit:** UserController ghi `currentUser` vào log khi đổi role/status → hook sẵn cho module kiểm toán.
