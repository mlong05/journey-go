"use client";

import { useEffect } from "react";
import Button from "@/components/ui/Button";
import { useT } from "@/i18n";

export default function Error({ error, reset }) {
  const t = useT();
  useEffect(() => {
    console.error("Global error caught:", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center px-4">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
        {t("home.errorPage.title")}
      </h2>
      <p className="mt-2 text-sm text-gray-500 max-w-sm">
        {error?.message || t("home.errorPage.defaultMessage")}
      </p>
      <div className="mt-6">
        <Button onClick={() => reset()}>
          {t("home.errorPage.retry")}
        </Button>
      </div>
    </div>
  );
}
