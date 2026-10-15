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
      className="h-screen w-screen flex items-center justify-center bg-slate-100"
      aria-hidden="true"
    >
      <div className="animate-pulse text-slate-400 text-sm font-medium">
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
