"use client";

import { useEffect } from "react";
import Button from "@/components/ui/Button";

export default function Error({ error, reset }) {
  useEffect(() => {
    console.error("Global error caught:", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center px-4">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
        Đã có lỗi xảy ra!
      </h2>
      <p className="mt-2 text-sm text-gray-500 max-w-sm">
        {error?.message || "Hệ thống gặp sự cố không mong muốn. Vui lòng thử lại."}
      </p>
      <div className="mt-6">
        <Button onClick={() => reset()}>
          Thử lại
        </Button>
      </div>
    </div>
  );
}
