"use client";

import { ToursManager } from "@/features/tour";

/**
 * Trang thẩm định Tour của Kiểm duyệt viên (MODERATOR).
 *
 * Phạm vi quyền theo backend:
 *  - GET    /api/v1/tours                 : toàn bộ tour
 *  - GET    /api/v1/tours/status/{status} : lọc theo trạng thái
 *  - GET    /api/v1/tours/{tourId}        : chi tiết
 *  - PATCH  /api/v1/tours/{tourId}/publish : duyệt và xuất bản
 *  - PATCH  /api/v1/tours/{tourId}/reject  : từ chối (bắt buộc lý do)
 *
 * LƯU Ý: backend chốt POST /api/v1/tours cho ADMIN + PROVIDER, nên kiểm duyệt
 * viên KHÔNG có quyền tạo tour. Thành phần "Tạo Tour Mới" bị ẩn đi.
 */
export default function ModeratorToursPage() {
  return (
    <ToursManager
      theme="teal"
      heading="Thẩm Định Tour Du Lịch"
      description="Kiểm tra hành trình, mức giá và nội dung của từng tour trước khi phát hành. Tour bị từ chối phải kèm lý do cụ thể để đối tác chỉnh sửa."
      canCreate={false}
      canModerate
      canDelete={false}
    />
  );
}