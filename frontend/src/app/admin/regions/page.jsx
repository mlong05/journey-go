"use client";

import { PageHeader } from "@/components/dashboard/DashboardUI";
import RegionCatalogCard from "@/features/catalog/components/RegionCatalogCard";

/**
 * Cấu hình khu vực (ADMIN) — backend /api/v1/regions.
 * Khu vực hiện trong dropdown "Khu vực" ở bước 1 khi đối tác tạo tour.
 */
export default function AdminRegionsPage() {
  return (
    <div className="space-y-4">
      <PageHeader eyebrow="Danh mục" title="Quản Lý Khu Vực"
        description="Thêm, đổi tên hoặc ẩn các khu vực (Miền Bắc, Miền Trung, Miền Đông Nam Bộ, Miền Tây Nam Bộ…) để đối tác chọn khi tạo tour." />
      <RegionCatalogCard />
    </div>
  );
}
