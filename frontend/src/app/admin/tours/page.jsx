"use client";

import { ToursManager } from "@/features/tour";

/**
 * Trang quản lý Tour toàn sàn của Quản trị viên (ADMIN).
 *
 * Phạm vi quyền theo backend:
 *  - GET    /api/v1/tours                  : toàn bộ tour
 *  - GET    /api/v1/tours/deleted          : tour đã xoá mềm
 *  - GET    /api/v1/tours/status/{status}  : lọc theo trạng thái
 *  - POST   /api/v1/tours                  : tạo tour mới
 *  - PUT    /api/v1/tours/{tourId}         : sửa tour
 *  - PATCH  /api/v1/tours/{tourId}/submit  : gửi duyệt
 *  - PATCH  /api/v1/tours/{tourId}/publish : duyệt và xuất bản
 *  - PATCH  /api/v1/tours/{tourId}/reject  : từ chối (bắt buộc lý do)
 *  - DELETE /api/v1/tours/{tourId}         : xoá mềm
 *  - PATCH  /api/v1/tours/{tourId}/restore : khôi phục
 */
export default function AdminToursPage() {
  return (
    <ToursManager
      theme="slate"
      variant="table"
      heading="Quản Lý Tour Toàn Sàn"
      description="Toàn quyền vòng đời tour: khởi tạo, duyệt phát hành, từ chối, xoá mềm và khôi phục. Bộ lọc tình trạng giúp theo dõi các tour đã bị gỡ khỏi hệ thống."
      canCreate
      canModerate
      canDelete
      showDeletedFilter
    />
  );
}