"use client";

import { PageHeader } from "@/components/dashboard/DashboardUI";
import ThemeCatalogCard from "@/features/catalog/components/ThemeCatalogCard";

/**
 * Cấu hình chủ đề (ADMIN) — backend /api/v1/themes.
 * Chủ đề hiện trong dropdown "Chủ đề" ở bước 1 khi đối tác tạo tour.
 */
export default function AdminThemesPage() {
  return (
    // Khung cố định: tiêu đề đứng yên, chỉ danh sách trong thẻ tự cuộn (admin layout khóa cuộn trang này).
    <div className="h-full min-h-0 flex flex-col gap-4">
      <div className="shrink-0">
        <PageHeader eyebrow="Danh mục" title="Quản Lý Chủ Đề"
        description="Thêm, đổi tên hoặc ẩn các chủ đề tour (Làng nghề truyền thống, Di sản kiến trúc, Ẩm thực bản địa…) để đối tác chọn khi tạo tour." />
      </div>
      <div className="flex-1 min-h-0">
        <ThemeCatalogCard />
      </div>
    </div>
  );
}
