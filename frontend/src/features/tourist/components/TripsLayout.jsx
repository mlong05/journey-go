"use client";

import TouristShell from "./TouristShell";
import RequireTourist from "./RequireTourist";

/**
 * Khung khu "Chuyến đi của tôi" (/trips, /trips/[id]) — tách riêng khỏi khu tài khoản:
 * rộng hết khung, không có cột trái tài khoản. Tự kiểm tra đăng nhập du khách.
 *  • top: phần trên tiêu đề (vd. breadcrumbs)   • title / actions: hàng tiêu đề (tùy chọn)
 */
export default function TripsLayout({ top, title, actions, children }) {
  return (
    <TouristShell>
      <RequireTourist>
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
          {top && <div className="mb-4">{top}</div>}
          {title && (
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <h1 className="text-[26px] font-extrabold tracking-tight text-slate-900 sm:text-[30px]">{title}</h1>
              {actions}
            </div>
          )}
          {children}
        </div>
      </RequireTourist>
    </TouristShell>
  );
}
