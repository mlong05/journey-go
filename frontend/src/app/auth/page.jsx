"use client";

import React from "react";
import AuthScreen from "@/features/auth/components/AuthScreen";

/**
 * Trang Xác thực & Phân quyền Hệ thống (Authentication Page) - Journey Go
 *
 * Tính năng chính:
 * 1. Khung nhìn Split-Screen tỉ lệ 5/12 và 7/12 vừa khít 100vh Viewport (Không cuộn thanh trượt).
 * 2. Cột trái (Hero Banner Di Sản):
 *    - Tự động trình chiếu 3 danh thắng di sản (Tràng An, Hội An, Văn Miếu) sau mỗi 6 giây.
 *    - Hiệu ứng chuyển ảnh điện ảnh Cinematic Crossfade + Ken Burns zoom siêu chậm (Framer Motion).
 *    - Tạm dừng đếm thời gian khi rê chuột vào (Pause on hover) để đọc thông tin di sản.
 *    - Nút chip chuyển nhanh 3 địa danh mượt mà.
 * 3. Cột phải (Form Đăng nhập / Đăng ký):
 *    - Phân quyền chuẩn 3 vai trò: Đối tác Điểm đến, Kiểm duyệt viên, Quản trị viên (Không có Tourist).
 *    - Ô chọn vai trò dạng thẻ bo tròn xổ xuống tiện lợi.
 *    - Form đăng nhập & đăng ký tối ưu kích thước, nút "Đăng nhập" tinh gọn.
 *    - Đăng nhập nhanh Google Workspace & SSO Doanh nghiệp.
 */
export default function AuthPage() {
  return <AuthScreen initialTab="login" />;
}
