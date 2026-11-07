// (auth)/layout.jsx — Server Component (KHÔNG có "use client")
// suppressHydrationWarning ở root để chặn BIS extension (Browser Identity Service)
// chèn bis_skin_checked="1" vào DOM trước khi React hydration chạy.
//
// Màn đăng nhập/đăng ký tự lo bố cục toàn màn hình, nên layout chỉ là khung trống:
// không thêm lề hay nền (lề cũ p-4/p-6 làm trang bị viền xám, cắt chân trang và sinh thanh cuộn).
export default function AuthLayout({ children }) {
  return (
    <div
      suppressHydrationWarning
      className="h-screen w-screen overflow-hidden bg-white text-slate-800 selection:bg-emerald-600 selection:text-white"
    >
      {children}
    </div>
  );
}
