"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

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
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <LoadingFallback message="Đang tải cổng đăng nhập…" />;
  }

  return <AuthScreen initialTab="login" />;
}
