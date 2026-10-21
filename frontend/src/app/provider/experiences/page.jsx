"use client";

import { ExperiencesManager } from "@/features/experience";

export default function ProviderExperiencesPage() {
  return (
    <ExperiencesManager
      theme="emerald"
      heading="Quản Lý Trải Nghiệm"
      description="Tạo trải nghiệm (quiz, nhiệm vụ, check-in) và gắn vào điểm đến của bạn. Mỗi điểm đến chỉ có 1 trải nghiệm, mặc định ở trạng thái bản nháp."
    />
  );
}
