"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ROLE_HOME, resolvePostLoginPath } from "@/services/authRedirect";
import { useT } from "@/i18n";

const AuthScreen = dynamic(
  () => import("@/features/auth").then((m) => m.AuthScreen),
  {
    ssr: false,
    loading: () => null,
  }
);

function LoadingFallback({ message }) {
  return (
    <div
      suppressHydrationWarning
      className="h-screen w-screen flex items-center justify-center bg-white"
      aria-hidden="true"
    >
      <div className="animate-pulse text-emerald-800 text-sm font-semibold tracking-wide">
        {message}
      </div>
    </div>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const t = useT();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    try {
      const authRaw = localStorage.getItem("journey_go_auth");
      if (authRaw) {
        const auth = JSON.parse(authRaw);
        const role = String(auth?.user?.role || auth?.role || "").toUpperCase();
        // Đã đăng nhập (admin / moderator / đối tác) ⇒ vào thẳng trang callbackUrl nếu thuộc khu của mình.
        if (ROLE_HOME[role] && (auth?.token || auth?.accessToken)) {
          router.replace(resolvePostLoginPath(role));
          return;
        }
      }
    } catch {
      // Bỏ qua lỗi parse
    }
    queueMicrotask(() => setMounted(true));
  }, [router]);

  if (!mounted) {
    return <LoadingFallback message={t("misc.login.loading")} />;
  }

  return <AuthScreen initialTab="login" />;
}
