"use client";

/**
 * Đơn đang giữ chỗ (chờ thanh toán, còn hạn).
 *
 * Thoát trang thanh toán / quay lại từ VNPay KHÔNG hủy đơn — đơn vẫn giữ chỗ tới hết 10 phút.
 * Backend chặn tạo đơn thứ hai cho cùng tour (409 BOOKING_PENDING_EXISTS), nên mọi nơi đặt tour
 * dùng các phần dưới đây để đưa khách về đúng đơn cũ thay vì báo lỗi.
 */
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Timer } from "lucide-react";
import { ROUTES } from "@/constants/routes";
import { touristService } from "../services/touristService";
import { useTouristSession } from "../hooks/useTouristSession";
import { longDate, vnd } from "../utils";
import { useI18n } from "@/i18n";

const msLeft = (deadline) => Math.max(0, new Date(deadline).getTime() - Date.now());

/** Đồng hồ mm:ss tới hạn thanh toán; gọi onExpire một lần khi hết giờ. */
export function PaymentCountdown({ deadline, onExpire, className = "font-extrabold tabular-nums" }) {
  const [left, setLeft] = useState(() => msLeft(deadline));
  useEffect(() => {
    const t = setInterval(() => {
      const ms = msLeft(deadline);
      setLeft(ms);
      if (ms === 0) {
        clearInterval(t);
        onExpire?.();
      }
    }, 1000);
    return () => clearInterval(t);
  }, [deadline, onExpire]);
  const m = Math.floor(left / 60000);
  const s = Math.floor((left % 60000) / 1000);
  return <span className={className}>{String(m).padStart(2, "0")}:{String(s).padStart(2, "0")}</span>;
}

/**
 * Đơn đang giữ chỗ mới nhất của du khách (tourId: chỉ của tour đó). Tự tải lại khi quay lại tab trình duyệt.
 * Trả { pending, reload, clear } — pending = null khi không có / chưa đăng nhập / lỗi.
 */
export function usePendingBooking(tourId) {
  const { ready, isLoggedIn, isTourist } = useTouristSession();
  const enabled = ready && isLoggedIn && isTourist;
  const [pending, setPending] = useState(null);

  const reload = useCallback(async () => {
    if (!enabled) {
      setPending(null);
      return null;
    }
    try {
      const list = await touristService.myPendingBookings(tourId);
      const first = list.find((b) => msLeft(b.paymentDeadline) > 0) || null;
      setPending(first);
      return first;
    } catch {
      setPending(null);
      return null;
    }
  }, [enabled, tourId]);

  useEffect(() => {
    // Tải sau khi gắn xong (không gọi setState đồng bộ trong effect).
    const t = setTimeout(reload, 0);
    const onFocus = () => { if (document.visibilityState === "visible") reload(); };
    document.addEventListener("visibilitychange", onFocus);
    window.addEventListener("focus", onFocus);
    return () => {
      clearTimeout(t);
      document.removeEventListener("visibilitychange", onFocus);
      window.removeEventListener("focus", onFocus);
    };
  }, [reload]);

  const clear = useCallback(() => setPending(null), []);
  return { pending, reload, clear };
}

/**
 * Thanh nhắc dưới header trên mọi trang du khách: "Bạn có đơn chờ thanh toán · còn mm:ss".
 * Bấm vào tới trang chuyến đi (có nút thanh toán / hủy). Ẩn trên trang thanh toán và trang của chính đơn đó.
 */
export function PendingBookingBar() {
  const pathname = usePathname() || "";
  const { pending, clear } = usePendingBooking();
  const { t, locale } = useI18n();
  if (!pending) return null;
  // /trips đã có khối "Cần xử lý" với nút thanh toán / hủy ⇒ không nhắc trùng.
  if (pathname.startsWith("/checkout/") || pathname === ROUTES.TRIPS || pathname === ROUTES.TRIP_DETAIL(pending.id)) return null;
  return (
    <div className="border-b border-amber-200 bg-amber-50">
      <Link href={ROUTES.TRIP_DETAIL(pending.id)}
        className="mx-auto flex max-w-page items-center gap-3 px-4 py-2.5 text-sm sm:px-6 lg:px-8 hover:bg-amber-100/60 transition-colors">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-amber-100 text-amber-700">
          <Timer size={16} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-bold text-amber-900">
            {t("pending.barTitle")}<PaymentCountdown deadline={pending.paymentDeadline} onExpire={clear} />{t("pending.barSuffix")}
          </span>
          <span className="block truncate text-xs text-amber-800/80">
            {pending.tourTitle} · {longDate(pending.experienceDate, locale)} · {vnd(pending.totalAmount)}
          </span>
        </span>
        <span className="hidden shrink-0 font-bold text-teal-700 sm:inline">{t("pending.continuePayment")}</span>
        <ChevronRight size={18} className="shrink-0 text-teal-700" />
      </Link>
    </div>
  );
}
