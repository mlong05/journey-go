import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
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
