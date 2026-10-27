"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ROUTES } from "@/constants/routes";

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
      className="h-screen w-screen flex items-center justify-center bg-[#eef6fc]"
      aria-hidden="true"
    >
      <div className="animate-pulse text-[#009fe3] text-sm font-semibold tracking-wide">
        {message}
      </div>
    </div>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    try {
      const authRaw = localStorage.getItem("journey_go_auth");
      if (authRaw) {
        const auth = JSON.parse(authRaw);
        const role = String(auth?.user?.role || auth?.role || "").toUpperCase();
        if (role === "ADMIN") {
          router.replace(ROUTES.ADMIN || "/admin");
          return;
        } else if (role === "MODERATOR") {
          router.replace(ROUTES.MODERATOR || "/moderator");
          return;
        } else if (role === "PROVIDER") {
          router.replace(ROUTES.PROVIDER || "/provider");
          return;
        }
      }
    } catch {
      // Bỏ qua lỗi parse
    }
    queueMicrotask(() => setMounted(true));
  }, [router]);

  if (!mounted) {
    return <LoadingFallback message="Đang tải cổng đăng nhập…" />;
  }

  return <AuthScreen initialTab="login" />;
}
