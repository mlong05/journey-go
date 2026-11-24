"use client";

import Link from "next/link";
import { ROUTES } from "@/constants/routes";
import { useT } from "@/i18n";

export default function NotFound() {
  const t = useT();
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center text-center px-4">
      <h1 className="text-6xl font-extrabold text-blue-600">404</h1>
      <h2 className="mt-4 text-2xl font-bold text-gray-900 dark:text-white">
        {t("home.notFound.title")}
      </h2>
      <p className="mt-2 text-sm text-gray-500 max-w-sm">
        {t("home.notFound.desc")}
      </p>
      <Link
        href={ROUTES.HOME}
        className="mt-6 inline-flex items-center rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
      >
        {t("home.notFound.backHome")}
      </Link>
    </div>
  );
}
