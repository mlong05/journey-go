import { AuthScreen } from "@/features/auth";

export const metadata = {
  title: "Đăng ký đối tác | Journey Go",
  description: "Đăng ký tài khoản Đối tác cung cấp nội dung du lịch & di sản trên nền tảng Journey Go.",
};

export default function RegisterPage() {
  return <AuthScreen initialTab="register" />;
}
