"use client";

import { PageHeader } from "@/components/dashboard/DashboardUI";
import ThemeCatalogCard from "@/features/catalog/components/ThemeCatalogCard";

/**
 * Cấu hình chủ đề (ADMIN) — backend /api/v1/themes.
 * Chủ đề hiện trong dropdown "Chủ đề" ở bước 1 khi đối tác tạo tour.
 */
export default function AdminThemesPage() {
  return (
    <div className="space-y-4">
      <PageHeader eyebrow="Danh mục" title="Quản Lý Chủ Đề"
        description="Thêm, đổi tên hoặc ẩn các chủ đề tour (Làng nghề truyền thống, Di sản kiến trúc, Ẩm thực bản địa…) để đối tác chọn khi tạo tour." />
      <ThemeCatalogCard />
    </div>
  );
}
