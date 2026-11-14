"use client";

import { PageHeader } from "@/components/dashboard/DashboardUI";
import { TaskTypeCatalogCard } from "@/features/experience";
import RewardSettingsCard from "@/features/catalog/components/RewardSettingsCard";

/**
 * Cấu hình trải nghiệm và điểm thưởng (ADMIN).
 *  - Điểm mỗi câu quiz và mỗi trải nghiệm thực tế của tour — backend /api/v1/reward-settings
 *  - Loại nhiệm vụ trải nghiệm thực địa — backend /api/v1/task-types
 */
export default function AdminExperienceRewardsPage() {
  return (
    <div className="space-y-4">
      <PageHeader eyebrow="Danh mục" title="Cấu Hình Trải Nghiệm Và Điểm Thưởng"
        description="Đặt điểm thưởng cho mỗi câu hỏi trắc nghiệm và mỗi trải nghiệm thực tế của tour, và quản lý các loại nhiệm vụ." />
      <RewardSettingsCard />
      <TaskTypeCatalogCard />
    </div>
  );
}
