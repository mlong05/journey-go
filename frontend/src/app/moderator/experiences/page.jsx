"use client";

import { ExperiencesManager } from "@/features/experience";

export default function ModeratorExperiencesPage() {
  return (
    <ExperiencesManager
      theme="teal"
      heading="Thẩm Định Trải Nghiệm"
      description="Kiểm duyệt viên theo dõi trải nghiệm của các điểm đến trong hệ thống."
      canCreate={false}
      canManage={false}
    />
  );
}