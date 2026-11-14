"use client";

import React from "react";
import { Tags } from "lucide-react";
import CatalogCard from "./CatalogCard";
import { themeService } from "../services/catalogAdminService";

/** Quản lý Chủ đề (theme) — đối tác chọn một chủ đề khi tạo tour (bước 1). */
export default function ThemeCatalogCard() {
  return (
    <CatalogCard
      service={themeService}
      Icon={Tags}
      accent="indigo"
      noun="chủ đề"
      title="Quản Lý Chủ Đề Tour"
      description="Danh sách chủ đề trong dropdown “Chủ đề” khi đối tác tạo tour."
      placeholder="Thêm chủ đề (VD: Lễ hội dân gian)"
      deleteHint="Đối tác sẽ không chọn được chủ đề này cho tour mới. Tour đã chọn chủ đề này phải chọn lại khi gửi duyệt."
    />
  );
}
