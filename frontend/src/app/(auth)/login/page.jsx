import { AuthScreen } from "@/features/auth";

export const metadata = {
  title: "Đăng nhập & Phân quyền | Journey Go",
  description: "Cổng xác thực phân quyền dành cho Đối tác, Kiểm duyệt viên và Quản trị viên Journey Go.",
};

export default function LoginPage() {
  return <AuthScreen initialTab="login" />;
}
