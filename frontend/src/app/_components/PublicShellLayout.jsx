import { Navbar, Footer } from "@/components/layout";

/**
 * Layout dùng chung cho các trang public cần Navbar/Footer.
 * Áp dụng cho: /tours, /tours/[id], /checkout/[bookingId], /payment/return.
 */
export default function PublicShellLayout({ children }) {
  return (
    <div className="flex min-h-screen flex-col bg-gray-50 dark:bg-gray-950">
      <Navbar />
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </main>
      <Footer />
    </div>
  );
}
