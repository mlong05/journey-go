"use client";
/* eslint-disable @next/next/no-img-element -- ảnh tour đến từ nhiều nguồn (Cloudinary, Wikimedia) do đối tác nhập */
import { useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { isPlainClick, transitionNavigate } from "../navigation";
import { Clock, MapPin, CalendarDays, ImageOff } from "lucide-react";
import { durationLabel, shortDate, vnd } from "../utils";
import { useI18n } from "@/i18n";

/** Tên chuyển trang của ảnh bìa: trùng với ảnh lớn ở trang chi tiết ⇒ ảnh "phóng" sang trang mới. */
export const tourCoverTransition = (tourId) => `tour-cover-${tourId}`;

const CHIP = "inline-flex min-w-0 items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5";

/**
 * Hai nhãn khu vực + chủ đề trên ĐÚNG MỘT HÀNG (không có "+N"): khu vực tối đa 55% bề rộng,
 * chủ đề lấy phần còn lại; nhãn nào dài thì cắt "…" (rê chuột xem đủ).
 */
function ChipRow({ region, theme }) {
  if (!region && !theme) return <div className="h-[22px]" aria-hidden="true" />;
  return (
    <div className="flex h-[22px] min-w-0 gap-1.5 overflow-hidden text-xs font-semibold text-slate-500">
      {region && (
        <span title={region} className={`${CHIP} max-w-[55%] shrink-0`}>
          <MapPin size={11} className="shrink-0" /><span className="truncate">{region}</span>
        </span>
      )}
      {theme && <span title={theme} className={`${CHIP} shrink`}><span className="truncate">{theme}</span></span>}
    </div>
  );
}

/**
 * Thẻ tour dùng ở trang chủ và trang danh sách. `badge` hiện góc phải ảnh (vd. "Đã đặt").
 * Mọi thẻ trong một hàng cao bằng nhau: tên cố định 2 dòng, nhãn 1 hàng, giá dính đáy thẻ.
 * Điện thoại (< sm): dạng hàng ngang gọn — ảnh nhỏ bên trái, thông tin bên phải.
 * Từ sm trở lên: dạng thẻ dọc, ảnh 16:10 phía trên.
 * Hiệu ứng: rê chuột nổi lên + ảnh phóng chậm; bấm lún nhẹ; chuyển trang trượt tới + ảnh phóng thành ảnh lớn.
 */
export default function TourCard({ tour, badge }) {
  const { t, locale } = useI18n();
  const href = `/tours/${tour.tourId}`;
  const cover = tour.coverImageUrl || tour.tourCoverImageUrl;
  const router = useRouter();
  const imgRef = useRef(null);
  const open = (e) => {
    if (!isPlainClick(e)) return;
    e.preventDefault();
    transitionNavigate(router, href, { type: "forward", morphEl: imgRef.current, morphName: tourCoverTransition(tour.tourId) });
  };
  // Ô trên ảnh: thời lượng + số điểm dừng (vd. "5 giờ · 3 điểm dừng").
  const durationLine = tour.stopCount > 0 ? `${durationLabel(t, tour)} · ${t("tourCard.stops", { count: tour.stopCount })}` : durationLabel(t, tour);

  return (
    <article className="group grid h-full min-w-0 grid-cols-[112px_minmax(0,1fr)] overflow-hidden rounded-2xl border border-slate-200 bg-white transition duration-300 ease-out hover:-translate-y-1 hover:border-slate-300 hover:shadow-[0_14px_34px_rgba(16,32,29,0.12)] active:translate-y-0 active:scale-[0.99] motion-reduce:transition-none motion-reduce:hover:translate-y-0 sm:flex sm:flex-col">
      <Link href={href} onClick={open} className="relative block h-full min-h-[128px] overflow-hidden bg-slate-100 sm:aspect-[16/10] sm:h-auto sm:min-h-0 sm:shrink-0" tabIndex={-1} aria-hidden="true">
        {cover ? (
          <img ref={imgRef} src={cover} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover transition duration-700 ease-out group-hover:scale-[1.06] motion-reduce:transition-none" />
        ) : (
          <span className="absolute inset-0 grid place-items-center text-slate-300"><ImageOff size={28} /></span>
        )}
        <span className="absolute left-3 top-3 hidden max-w-[calc(100%-1.5rem)] items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-[11.5px] font-bold text-slate-800 sm:inline-flex" title={durationLine}>
          <Clock size={12} className="shrink-0" /><span className="truncate">{durationLine}</span>
        </span>
        {badge && <span className="absolute right-2 top-2 max-w-[45%] truncate rounded-full bg-orange-600 px-2 py-0.5 text-[11px] font-bold text-white sm:right-3 sm:top-3 sm:px-2.5 sm:py-1 sm:text-[11.5px]">{badge}</span>}
      </Link>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5 p-3 sm:gap-2.5 sm:p-4">
        {/* Tên cố định 2 dòng (tên ngắn vẫn giữ chỗ 2 dòng) — dài thì "…", rê chuột xem đủ */}
        <h3 className="line-clamp-2 break-words text-[14.5px] font-bold leading-snug text-slate-900 sm:min-h-[2.75em] sm:text-[15.5px]" title={tour.title}>
          <Link href={href} onClick={open} className="transition-colors hover:text-teal-800 focus-visible:outline-none focus-visible:underline">{tour.title}</Link>
        </h3>
        {/* Điện thoại: một dòng tóm tắt thay cho các nhãn */}
        <p className="flex min-w-0 items-center gap-1 text-xs text-slate-500 sm:hidden">
          <Clock size={11} className="shrink-0" /><span className="shrink-0">{durationLabel(t, tour)}</span>
          {tour.regionName && <><span aria-hidden="true">·</span><span className="truncate">{tour.regionName}</span></>}
        </p>
        <div className="hidden sm:block"><ChipRow region={tour.regionName} theme={tour.themeName} /></div>
        <div className="mt-auto flex items-end justify-between gap-2 sm:border-t sm:border-dashed sm:border-slate-200 sm:pt-3">
          <div className="min-w-0">
            <span className="hidden text-[11.5px] font-semibold text-slate-500 sm:block">{t("tourCard.adultFrom")}</span>
            <span className="block truncate whitespace-nowrap text-[15px] font-extrabold tabular-nums text-slate-900 sm:text-[17px]">{vnd(tour.price)}</span>
          </div>
          {tour.nextDepartureDate && (
            <div className="shrink-0 text-right text-xs text-slate-500">
              <span className="flex items-center justify-end gap-1 whitespace-nowrap text-[12.5px] font-bold text-teal-800 sm:text-[13px]"><CalendarDays size={13} />{shortDate(tour.nextDepartureDate, locale)}</span>
              <span className="hidden whitespace-nowrap sm:inline">{t("tourCard.nextDeparture")}</span>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

/** Khung chờ — cùng bố cục và chiều cao với thẻ thật (không giật khi tải xong). */
export function TourCardSkeleton() {
  return (
    <div className="grid h-full grid-cols-[112px_minmax(0,1fr)] overflow-hidden rounded-2xl border border-slate-200 bg-white sm:flex sm:flex-col" aria-hidden="true">
      <div className="jg-shimmer min-h-[128px] sm:aspect-[16/10] sm:min-h-0" />
      <div className="flex flex-1 flex-col gap-1.5 p-3 sm:gap-2.5 sm:p-4">
        <div className="space-y-1.5 sm:min-h-[2.75em]">
          <div className="jg-shimmer h-4 w-11/12 rounded" />
          <div className="jg-shimmer h-4 w-3/5 rounded" />
        </div>
        <div className="jg-shimmer h-[22px] w-2/3 rounded" />
        <div className="mt-auto flex items-end justify-between border-dashed border-slate-200 sm:border-t sm:pt-3">
          <div className="jg-shimmer h-8 w-24 rounded" />
          <div className="jg-shimmer h-8 w-20 rounded" />
        </div>
      </div>
    </div>
  );
}
