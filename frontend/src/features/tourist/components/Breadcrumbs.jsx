"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { getPreviousPage, isPlainClick, transitionNavigate } from "../navigation";
import { useT } from "@/i18n";

/**
 * Nút "Quay lại" + dòng đường dẫn (breadcrumb), vd.  ←  Khám phá › Văn Miếu…
 *  • items: [{ label, href }] — mục cuối là trang hiện tại (không cần href).
 *  • fallback: nơi quay về khi người dùng mở thẳng trang (không có trang trước trong web).
 * Nút quay lại về đúng trang vừa đi (giữ vị trí cuộn, bộ lọc) nhờ router.back().
 */
export default function Breadcrumbs({ items, fallback = "/" }) {
  const router = useRouter();
  const t = useT();
  const back = () => {
    const prev = getPreviousPage();
    if (prev) transitionNavigate(router, prev, { type: "back", historyBack: true });
    else transitionNavigate(router, fallback, { type: "back" });
  };
  return (
    <nav aria-label={t("common.breadcrumb")} className="flex min-w-0 items-center gap-2 text-sm">
      <button type="button" onClick={back} aria-label={t("common.backPrevious")}
        className="group/back grid h-8 w-8 shrink-0 place-items-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:border-teal-300 hover:text-teal-800 active:scale-95 motion-reduce:transition-none cursor-pointer">
        <ArrowLeft size={15} className="transition-transform duration-200 group-hover/back:-translate-x-0.5 motion-reduce:transition-none" />
      </button>
      <ol className="flex min-w-0 items-center gap-1 text-slate-500">
        {items.map((it, i) => {
          const last = i === items.length - 1;
          return (
            <li key={`${it.label}-${i}`} className={`flex items-center gap-1 ${last ? "min-w-0" : "shrink-0"} ${!last && i < items.length - 2 ? "hidden sm:flex" : ""}`}>
              {last ? (
                <span aria-current="page" className="truncate font-semibold text-slate-800">{it.label}</span>
              ) : (
                <>
                  <Link href={it.href} className="whitespace-nowrap font-semibold hover:text-teal-800"
                    onClick={(e) => { if (!isPlainClick(e)) return; e.preventDefault(); transitionNavigate(router, it.href, { type: "back" }); }}>
                    {it.label}
                  </Link>
                  <ChevronRight size={14} className="shrink-0 text-slate-300" aria-hidden="true" />
                </>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
