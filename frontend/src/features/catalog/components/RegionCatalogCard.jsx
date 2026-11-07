"use client";

import React from "react";
import { Globe2 } from "lucide-react";
import CatalogCard from "./CatalogCard";
import { regionService } from "@/features/destination";

/** Quản lý Khu vực (region) — đối tác chọn một khu vực khi tạo tour (bước 1). */
export default function RegionCatalogCard() {
  return (
    <CatalogCard
      service={regionService}
      Icon={Globe2}
      accent="teal"
      noun="khu vực"
      title="Quản Lý Khu Vực"
      description="Danh sách khu vực trong dropdown “Khu vực” khi đối tác tạo tour (cũng dùng cho điểm đến)."
      placeholder="Thêm khu vực (VD: Miền Trung)"
      deleteHint="Đối tác sẽ không chọn được khu vực này cho tour mới. Tour đã chọn khu vực này phải chọn lại khi gửi duyệt."
    />
  );
}
