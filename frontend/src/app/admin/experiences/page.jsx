"use client";

import { ExperiencesManager } from "@/features/experience";

export default function AdminExperiencesPage() {
  return (
    <ExperiencesManager
      theme="slate"
      heading="Quản Lý Trải Nghiệm Toàn Sàn"
      description="Quản trị viên tạo và gắn trải nghiệm vào điểm đến. Mỗi điểm đến chỉ có 1 trải nghiệm, mặc định ở trạng thái bản nháp."
    />
  );
}
