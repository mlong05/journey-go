import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";

/**
 * Font chuẩn của JourneyGo: Geist (sans) + Geist Mono (mono).
 *
 * LƯU Ý QUAN TRỌNG về subset "vietnamese":
 * - Ứng dụng là tiếng Việt, nên BẮT BUỘC phải nạp subset "vietnamese".
 * - Nếu chỉ nạp "latin", các ký tự có dấu (ệ, ễ, ữ, ị, ạ, ỗ...) sẽ bị
 *   trình duyệt fallback sang font hệ thống (Arial/Segoe UI), gây vỡ
 *   hiệu ứng "phông chữ lạc" giữa tiêu đề và con số.
 * - Geist_Mono cũng cần subset "vietnamese" vì các bảng quản trị hiển thị
 *   giá tiền và mã định danh bằng font-mono.
 */
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin", "latin-ext", "vietnamese"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin", "latin-ext", "vietnamese"],
  display: "swap",
});

export const metadata = {
  title: "Journey Go - Nền tảng Du lịch & Di sản Việt Nam",
  description: "Cổng thông tin, số hóa điểm đến và quản trị du lịch di sản Việt Nam.",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="vi"
      suppressHydrationWarning
      // data-bisskin="disabled" — vô hiệu hoá Browser Identity Service (BIS) extension
      // BIS chèn thuộc tính bis_skin_checked="1" vào DOM và phá vỡ hydration của React.
      // Đặt attribute này trên <html> giúp BIS bỏ qua toàn bộ trang.
      data-bisskin="disabled"
      className={`${geistSans.variable} ${geistMono.variable} font-sans h-full antialiased`}
    >
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        {children}
        <Script
          src="https://accounts.google.com/gsi/client"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
