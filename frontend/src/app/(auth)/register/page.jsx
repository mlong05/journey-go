"use client";

import dynamic from "next/dynamic";
import { useSyncExternalStore } from "react";
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
      className="h-screen w-screen flex items-center justify-center bg-slate-100"
      aria-hidden="true"
    >
      <div className="animate-pulse text-slate-400 text-sm font-medium">
        {message}
      </div>
    </div>
  );
}

export default function RegisterPage() {
  const t = useT();
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  if (!mounted) {
    return <LoadingFallback message={t("misc.register.loading")} />;
  }

  return <AuthScreen initialTab="register" />;
}
