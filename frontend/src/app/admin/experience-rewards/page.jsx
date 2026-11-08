"use client";

import { PageHeader } from "@/components/dashboard/DashboardUI";
import { TaskTypeCatalogCard } from "@/features/experience";
import RewardSettingsCard from "@/features/catalog/components/RewardSettingsCard";

/**
 * Cấu hình trải nghiệm và điểm thưởng (ADMIN).
 *  - Điểm mỗi nhiệm vụ của tour — backend /api/v1/reward-settings (TOUR_TASK)
 *  - Loại nhiệm vụ trải nghiệm thực địa — backend /api/v1/task-types
 */
export default function AdminExperienceRewardsPage() {
  return (
    <div className="space-y-4">
      <PageHeader eyebrow="Danh mục" title="Cấu Hình Trải Nghiệm Và Điểm Thưởng"
        description="Đặt số điểm thưởng khách nhận được khi hoàn thành mỗi nhiệm vụ (gồm câu hỏi quiz và trải nghiệm thực tế), và quản lý các loại nhiệm vụ." />
      <RewardSettingsCard />
      <TaskTypeCatalogCard />
    </div>
  );
}
