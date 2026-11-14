/* eslint-disable @next/next/no-img-element -- ảnh tour đến từ nhiều nguồn (Cloudinary, Wikimedia) do đối tác nhập */
import Link from "next/link";
import { Clock, MapPin, CalendarDays, ImageOff } from "lucide-react";
import { durationLabel, shortDate, vnd } from "../utils";

/**
 * Thẻ tour dùng ở trang chủ và trang danh sách. `badge` hiện góc phải ảnh (vd. "Đã đặt").
 * Điện thoại (< sm): dạng hàng ngang gọn — ảnh nhỏ bên trái, thông tin bên phải (cao ~130px thay vì ~430px).
 * Từ sm trở lên: dạng thẻ dọc, ảnh 16:10 phía trên.
 */
export default function TourCard({ tour, badge }) {
  const href = `/tours/${tour.tourId}`;
  const cover = tour.coverImageUrl || tour.tourCoverImageUrl;
  return (
    <article className="group grid min-w-0 grid-cols-[112px_minmax(0,1fr)] overflow-hidden rounded-2xl border border-slate-200 bg-white transition hover:-translate-y-0.5 hover:shadow-[0_10px_30px_rgba(16,32,29,0.10)] motion-reduce:transition-none motion-reduce:hover:translate-y-0 sm:flex sm:flex-col">
      <Link href={href} className="relative block h-full min-h-[128px] overflow-hidden bg-slate-100 sm:aspect-[16/10] sm:h-auto sm:min-h-0" tabIndex={-1} aria-hidden="true">
        {cover ? (
          <img src={cover} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.04] motion-reduce:transition-none" />
        ) : (
          <span className="absolute inset-0 grid place-items-center text-slate-300"><ImageOff size={28} /></span>
        )}
        <span className="absolute left-3 top-3 hidden items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-[11.5px] font-bold text-slate-800 sm:inline-flex">
          <Clock size={12} /> {durationLabel(tour)}
        </span>
        {badge && <span className="absolute right-2 top-2 rounded-full bg-orange-600 px-2 py-0.5 text-[11px] font-bold text-white sm:right-3 sm:top-3 sm:px-2.5 sm:py-1 sm:text-[11.5px]">{badge}</span>}
      </Link>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5 p-3 sm:gap-2.5 sm:p-4">
        <h3 className="line-clamp-2 text-[14.5px] font-bold leading-snug text-slate-900 sm:line-clamp-none sm:text-[15.5px]">
          <Link href={href} className="hover:text-teal-800 focus-visible:outline-none focus-visible:underline">{tour.title}</Link>
        </h3>
        {/* Điện thoại: một dòng tóm tắt thay cho các nhãn */}
        <p className="flex min-w-0 items-center gap-1 text-xs text-slate-500 sm:hidden">
          <Clock size={11} className="shrink-0" /><span className="shrink-0">{durationLabel(tour)}</span>
          {tour.regionName && <><span aria-hidden="true">·</span><span className="truncate">{tour.regionName}</span></>}
        </p>
        <div className="hidden flex-wrap gap-1.5 text-xs font-semibold text-slate-500 sm:flex">
          {tour.regionName && <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5"><MapPin size={11} />{tour.regionName}</span>}
          {tour.themeName && <span className="rounded-md bg-slate-100 px-2 py-0.5">{tour.themeName}</span>}
          {tour.stopCount > 0 && <span className="rounded-md bg-teal-50 px-2 py-0.5 text-teal-800">{tour.stopCount} điểm dừng</span>}
        </div>
        <div className="mt-auto flex items-end justify-between gap-2 sm:border-t sm:border-dashed sm:border-slate-200 sm:pt-3">
          <div className="min-w-0">
            <span className="hidden text-[11.5px] font-semibold text-slate-500 sm:block">Người lớn từ</span>
            <span className="text-[15px] font-extrabold tabular-nums text-slate-900 sm:text-[17px]">{vnd(tour.price)}</span>
          </div>
          {tour.nextDepartureDate && (
            <div className="shrink-0 text-right text-xs text-slate-500">
              <span className="flex items-center justify-end gap-1 text-[12.5px] font-bold text-teal-800 sm:text-[13px]"><CalendarDays size={13} />{shortDate(tour.nextDepartureDate)}</span>
              <span className="hidden sm:inline">Khởi hành gần nhất</span>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

export function TourCardSkeleton() {
  return (
    <div className="grid grid-cols-[112px_minmax(0,1fr)] overflow-hidden rounded-2xl border border-slate-200 bg-white sm:block" aria-hidden="true">
      <div className="min-h-[128px] animate-pulse bg-slate-100 sm:aspect-[16/10] sm:min-h-0" />
      <div className="space-y-3 p-3 sm:p-4">
        <div className="h-4 w-4/5 animate-pulse rounded bg-slate-100" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-slate-100" />
        <div className="h-8 w-full animate-pulse rounded bg-slate-100" />
      </div>
    </div>
  );
}
