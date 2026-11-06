# Hướng Dẫn Tích Hợp Đăng Ký / Đăng Nhập Bằng Google OAuth2 Cho Frontend

Tài liệu này hướng dẫn chi tiết cho Developer Frontend cách kết nối với Backend JourneyGo để thực hiện tính năng **Đăng ký và Đăng nhập bằng Google** (Sử dụng Google ID Token / Popup Flow).

---

## 1. Thông Tin API Backend

- **URL:** `POST http://localhost:8088/api/v1/auth/google` (hoặc `${NEXT_PUBLIC_API_URL}/auth/google`)
- **Headers:** `Content-Type: application/json`
- **Cơ chế hoạt động:**
  - Nếu email từ tài khoản Google **chưa tồn tại**: Backend tự động **tạo tài khoản mới** (Role `USER`), kích hoạt `active = true`, lưu avatar và trả về JWT tokens.
  - Nếu email **đã tồn tại**: Backend tự động **đăng nhập**, đồng bộ avatar và trả về JWT tokens.

### Request Body:
```json
{
  "idToken": "<chuỗi_google_id_token_credential_từ_Google_SDK>",
  "role": "TOURIST"
}
```
*(Trường `role` là tùy chọn, mặc định là `"TOURIST"`)*

### Response Thành Công (HTTP 200):
```json
{
  "code": 200,
  "message": "Xác thực tài khoản Google thành công",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1Ni...",
    "refreshToken": "7033cb42-a1b4-4b53-90d5-0761e2e1ec92",
    "tokenType": "Bearer",
    "expiresIn": 900000,
    "user": {
      "id": 12,
      "email": "nguyenvana@gmail.com",
      "fullName": "Nguyễn Văn A",
      "phone": null,
      "role": "TOURIST",
      "authProvider": "GOOGLE",
      "avatarUrl": "https://lh3.googleusercontent.com/a/ACg8oc...",
      "active": true,
      "createdAt": "2026-10-13T07:29:43.123Z"
    }
  }
}
```

---

## 2. Các Bước Cài Đặt & Triển Khai Trên Frontend

### Bước 1: Thêm Google Client ID vào biến môi trường
Tạo hoặc mở file `.env.local` ở thư mục gốc của frontend:
```env
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
```

---

### Bước 2: Cập nhật `frontend/src/features/auth/services/authService.js`
Thêm hàm `loginWithGoogle` vào object `authService`:

```javascript
// frontend/src/features/auth/services/authService.js
import { apiClient } from "@/services/apiClient";

export const authService = {
  // ... các hàm cũ giữ nguyên (login, register, logout...)

  loginWithGoogle: async (idToken, role = "USER") => {
    return apiClient.post("/auth/google", { idToken, role });
  },
};
```

---

### Bước 3: Cập nhật Hook `frontend/src/features/auth/hooks/useAuth.js`
Thêm hàm `loginWithGoogle` vào `useAuth` để tự động lưu token và chuyển hướng trang tương thích 100% với hệ thống phân quyền hiện tại:

```javascript
// Trong frontend/src/features/auth/hooks/useAuth.js

const loginWithGoogle = async (idToken, desiredRole = "USER") => {
  setLoading(true);
  setError(null);
  try {
    const response = await authService.loginWithGoogle(idToken, desiredRole);
    const payload = response?.data || response;
    const user = payload?.user;
    const accessToken = payload?.accessToken || payload?.token;
    const refreshToken = payload?.refreshToken;

    const roleStr = String(user?.role || "USER").toUpperCase();
    let targetPath = ROUTES.HOME;
    let roleTitle = "Người dùng";
    let roleScope = "Khám phá di sản";

    if (roleStr === "ADMIN") {
      targetPath = ROUTES.ADMIN || "/admin";
      roleTitle = "Quản trị viên";
      roleScope = "Quản trị hệ thống & vận hành";
    } else if (roleStr === "CONTENT_MODERATOR") {
      targetPath = ROUTES.MODERATOR || "/moderator";
      roleTitle = "Kiểm duyệt viên";
      roleScope = "Thẩm định hồ sơ & nội dung";
    } else if (roleStr === "CONTENT_PROVIDER") {
      targetPath = ROUTES.PROVIDER || "/provider";
      roleTitle = "Đối tác Điểm đến";
      roleScope = "Quản lý di tích & tour";
    }

    if (typeof window !== "undefined") {
      const authSession = {
        user: {
          id: user?.id,
          email: user?.email,
          name: user?.fullName || user?.email,
          fullName: user?.fullName,
          phone: user?.phone || "",
          role: roleStr.toLowerCase(),
          roleRaw: roleStr,
          roleTitle,
          roleScope,
          active: user?.active,
          avatarUrl: user?.avatarUrl,
        },
        token: accessToken,
        accessToken,
        refreshToken,
        role: roleStr.toLowerCase(),
        rolePath: targetPath,
        loginAt: new Date().toISOString(),
      };

      localStorage.setItem("journey_go_auth", JSON.stringify(authSession));
      if (accessToken) localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
      if (refreshToken) localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
      if (user) localStorage.setItem(STORAGE_KEYS.USER_INFO, JSON.stringify(user));
      window.dispatchEvent(new Event("storage"));
    }

    router.push(targetPath);
    return { success: true, user };
  } catch (err) {
    const msg = err.message || "Đăng nhập Google thất bại";
    setError(msg);
    return { success: false, error: msg };
  } finally {
    setLoading(false);
  }
};

// Nhớ export thêm loginWithGoogle ở return của useAuth():
return {
  loading,
  error,
  login,
  register,
  loginWithGoogle, // <-- thêm dòng này
  // ...
};
```

---

### Bước 4: Tích Hợp Popup Google Vào Giao Diện (`AuthScreen.jsx`)

Bạn có 2 phương án tùy thuộc bạn muốn cài thêm thư viện npm hay dùng script thuần:

#### Cách A (Khuyên dùng: Dùng thư viện `@react-oauth/google`)
1. Cài đặt thư viện:
   ```bash
   npm install @react-oauth/google
   ```
2. Bọc Provider ở cấp ứng dụng (ví dụ trong `layout.jsx` hoặc ngay tại `AuthScreen.jsx`):
   ```jsx
   import { GoogleOAuthProvider, useGoogleLogin } from "@react-oauth/google";
   ```
3. Trong component `AuthScreen.jsx`, sử dụng hook `useGoogleLogin` để gắn trực tiếp vào nút Google hiện có:
   ```jsx
   const { loginWithGoogle } = useAuth();

   // Kích hoạt Google Login popup và nhận ID Token (credential)
   // Hoặc dùng component <GoogleLogin /> chính thức
   ```
   *Ví dụ gắn vào nút Google có sẵn:*
   ```jsx
   import { GoogleLogin } from "@react-oauth/google";

   // Thay thế nút button Google cũ bằng:
   <GoogleLogin
     onSuccess={async (credentialResponse) => {
       // credentialResponse.credential chính là idToken
       if (credentialResponse.credential) {
         await loginWithGoogle(credentialResponse.credential);
       }
     }}
     onError={() => {
       console.error("Đăng nhập Google thất bại");
     }}
     useOneTap={false}
     shape="pill"
   />
   ```

---

#### Cách B (Không cần cài thêm thư viện - Dùng Google Identity Services SDK chuẩn)
1. Thêm Script Google vào `app/layout.jsx` hoặc trang Login:
   ```jsx
   import Script from "next/script";

   // Thêm thẻ này vào JSX:
   <Script src="https://accounts.google.com/gsi/client" strategy="afterInteractive" />
   ```

2. Trong `AuthScreen.jsx`:
   ```jsx
   const { loginWithGoogle } = useAuth();

   const handleGoogleClick = () => {
     if (!window.google) {
       alert("Google SDK chưa sẵn sàng, vui lòng thử lại sau giây lát");
       return;
     }

     window.google.accounts.id.initialize({
       client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
       callback: async (response) => {
         // response.credential chính là ID Token cần gửi lên backend
         if (response?.credential) {
           await loginWithGoogle(response.credential);
         }
       },
     });

     window.google.accounts.id.prompt(); // Hiện popup chọn tài khoản Google
   };
   ```
3. Gắn hàm vào nút bấm Google hiện tại:
   ```jsx
   <button
     type="button"
     onClick={handleGoogleClick}
     className="h-8.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer transition-colors shadow-2xs"
   >
     {/* SVG Google icon */}
     <span>Google</span>
   </button>
   ```

---

## 3. Cách Kiểm Tra Luồng Hoạt Động Của Người Dùng Thật

1. Bật Backend: `mvn spring-boot:run` tại thư mục `backend/` (cổng 8088).
2. Bật Frontend: `npm run dev` tại thư mục `frontend/` (cổng 3000).
3. Mở trình duyệt vào trang đăng nhập của Frontend (`http://localhost:3000/login` hoặc `/auth`).
4. Bấm vào nút **Google**.
5. Chọn tài khoản Google của bạn trong cửa sổ popup.
6. Sau khi chọn, popup tự đóng, người dùng được đăng nhập ngay lập tức và được chuyển hướng về trang chủ `http://localhost:3000/`.
7. Kiểm tra `localStorage`:
   - `jg_access_token` có giá trị Bearer JWT.
   - `journey_go_auth` lưu đầy đủ thông tin `user` (email, fullName, avatar...).
