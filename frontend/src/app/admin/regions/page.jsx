"use client";

import { PageHeader } from "@/components/dashboard/DashboardUI";
import RegionCatalogCard from "@/features/catalog/components/RegionCatalogCard";

/**
 * Cấu hình khu vực (ADMIN) — backend /api/v1/regions.
 * Khu vực hiện trong dropdown "Khu vực" ở bước 1 khi đối tác tạo tour.
 */
export default function AdminRegionsPage() {
  return (
    // Khung cố định: tiêu đề đứng yên, chỉ danh sách trong thẻ tự cuộn (admin layout khóa cuộn trang này).
    <div className="h-full min-h-0 flex flex-col gap-4">
      <div className="shrink-0">
        <PageHeader eyebrow="Danh mục" title="Quản Lý Khu Vực"
        description="Thêm, đổi tên hoặc ẩn các khu vực (Miền Bắc, Miền Trung, Miền Đông Nam Bộ, Miền Tây Nam Bộ…) để đối tác chọn khi tạo tour." />
      </div>
      <div className="flex-1 min-h-0">
        <RegionCatalogCard />
      </div>
    </div>
  );
}
