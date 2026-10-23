"use client";

import { ToursManager } from "@/features/tour";

/**
 * Trang quản lý Tour của Đối tác Điểm đến (PROVIDER).
 *
 * Phạm vi quyền theo backend:
 *  - GET    /api/v1/tours/my        : danh sách tour của chính mình
 *  - POST   /api/v1/tours           : tạo tour mới (DRAFT)
 *  - PUT    /api/v1/tours/{tourId}  : sửa tour của mình (reset về DRAFT)
 *  - PATCH  /api/v1/tours/{tourId}/submit : gửi duyệt
 *
 * PROVIDER không có quyền duyệt / từ chối / xoá (dành cho MODERATOR, ADMIN).
 */
export default function ProviderToursPage() {
  return (
    <ToursManager
      theme="emerald"
      variant="cards"
      heading="Tour Du Lịch Của Tôi"
      description="Khai báo hành trình, định giá tour và gửi duyệt lên Hội đồng Thẩm định. Tour mới luôn ở trạng thái bản nháp cho tới khi được phát hành."
      canCreate
      canModerate={false}
      canDelete={false}
    />
  );
}
