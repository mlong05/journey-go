"use client";

import { ProviderToursList } from "@/features/tourwizard";

/**
 * Trang Quản lý Tour của Đối tác (CONTENT_PROVIDER).
 *
 * Luồng 5 bước — backend /api/v1/provider/tours:
 *  - GET    /provider/tours                : danh sách tour của tôi
 *  - POST   /provider/tours                : tạo bản nháp → mở wizard /provider/tours/{id}/edit
 *  - POST   /provider/tours/{id}/duplicate : nhân bản
 *  - PATCH  /provider/tours/{id}/pause|resume, DELETE /provider/tours/{id}
 */
export default function ProviderToursPage() {
  return <ProviderToursList />;
}
