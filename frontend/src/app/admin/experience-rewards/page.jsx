"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { TaskTypeCatalogCard } from "@/features/experience";
import RewardSettingsCard from "@/features/catalog/components/RewardSettingsCard";

/**
 * Cấu hình trải nghiệm và điểm thưởng (ADMIN).
 *  - Điểm mỗi câu quiz và mỗi trải nghiệm thực tế của tour — backend /api/v1/reward-settings
 *  - Loại nhiệm vụ trải nghiệm thực địa — backend /api/v1/task-types
 *
 * ── Thiết kế 2 tab (giống trang "Quản lý tất toán") ──
 *  TAB 1 — "Trải nghiệm"
 *    Danh mục LOẠI NHIỆM VỤ trải nghiệm thực địa: danh sách, bộ lọc, tìm
 *    kiếm, quản lý (thêm / sửa / xoá). Đây là phần "hạ tầng" dùng chung cho
 *    toàn sàn — mọi loại nhiệm vụ đều trỏ về 1 mã ở đây.
 *
 *  TAB 2 — "Điểm thưởng"
 *    Mức điểm thưởng cho mỗi câu quiz và mỗi trải nghiệm thực tế. Số điểm
 *    được CHỐT vào tour tại thời điểm duyệt.
 *
 * ⚠️ Trang CUỘN TOÀN TRANG (không khóa khung 100vh) — 1 tab chỉ hiện 1 khối
 * cấu hình ⇒ cuộn trang là tự nhiên nhất. Trang cần cuộn RIÊNG bên trong là
 * các trang có BẢNG dài (refunds, commission-policies…).
 */
const TABS = [
  { id: "experience", label: "Trải nghiệm" },
  { id: "rewards", label: "Điểm thưởng" },
];

export default function AdminExperienceRewardsPage() {
  const [tab, setTab] = useState("experience");

  return (
    <div className="space-y-4 pb-8">
      {/* ══════════ HEADER ══════════
          Tiêu đề + mô tả ngắn gọn — chi tiết đã nằm ở từng panel bên dưới.
          Tab đặt CÙNG HÀNG với tiêu đề (giống trang Tất toán) để tiết kiệm
          chiều cao, không phải đẩy nội dung xuống dưới. */}
      <div className="rounded-2xl border border-slate-200/90 bg-white px-5 py-4 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-violet-200 bg-violet-50 text-violet-700">
              <Sparkles size={18} />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-slate-900 sm:text-xl">
                Cấu hình trải nghiệm và điểm thưởng
              </h1>
              <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
                Đặt điểm thưởng cho câu hỏi trắc nghiệm và trải nghiệm thực tế
                của tour, chuẩn hoá các loại nhiệm vụ dùng chung cho toàn sàn.
              </p>
            </div>
          </div>

          {/* ── Chuyển tab ──
              Style giống hệt trang "Quản lý tất toán": nền trắng, viền
              slate, nút active nền đen (slate-900) chữ trắng. */}
          <div
            role="tablist"
            aria-label="Chuyển giữa trải nghiệm và điểm thưởng"
            className="flex w-fit shrink-0 gap-1 rounded-xl border border-slate-200 bg-white p-1"
          >
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={tab === t.id}
                onClick={() => setTab(t.id)}
                className={`cursor-pointer rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                  tab === t.id
                    ? "bg-slate-900 text-white shadow-2xs"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ══════════ NỘI DUNG TAB ══════════
          Chỉ render 1 tab tại 1 thời điểm ⇒ không tải 2 API cùng lúc,
          tiết kiệm 1 vòng request khi mở trang. */}
      {tab === "experience" ? <TaskTypeCatalogCard /> : <RewardSettingsCard />}
    </div>
  );
}
