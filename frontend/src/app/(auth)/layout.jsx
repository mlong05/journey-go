export const metadata = {
  title: "Xác thực & Quản trị | Journey Go",
  description: "Cổng đăng nhập và phân quyền dành cho Đối tác, Kiểm duyệt viên và Quản trị viên hệ thống Journey Go.",
};

export default function AuthLayout({ children }) {
  return (
    <div
      suppressHydrationWarning
      className="relative h-screen w-screen max-h-screen overflow-hidden bg-slate-100 flex items-center justify-center p-4 xl:p-6 text-slate-800 selection:bg-teal-500 selection:text-white"
    >
      {/* Background ambient lighting effects */}
      <div
        suppressHydrationWarning
        className="pointer-events-none fixed inset-0 overflow-hidden"
      >
        <div suppressHydrationWarning className="absolute -top-40 -left-40 h-[450px] w-[450px] rounded-full bg-gradient-to-tr from-teal-200/35 to-emerald-200/25 blur-3xl" />
        <div suppressHydrationWarning className="absolute top-1/2 -right-40 h-[400px] w-[400px] rounded-full bg-gradient-to-bl from-amber-200/35 to-orange-200/20 blur-3xl" />
        <div suppressHydrationWarning className="absolute -bottom-40 left-1/3 h-[350px] w-[350px] rounded-full bg-gradient-to-t from-sky-200/25 to-teal-200/15 blur-3xl" />
      </div>

      {/* Main Content Container */}
      <div
        suppressHydrationWarning
        className="relative z-10 w-full h-full flex items-center justify-center overflow-hidden"
      >
        {children}
      </div>
    </div>
  );
}
