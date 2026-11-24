"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, XCircle, Clock3, Loader2 } from "lucide-react";
import { ROUTES } from "@/constants/routes";
import TouristShell from "./TouristShell";
import { notifyPaymentCompleted } from "./PendingBooking";
import { touristService } from "../services/touristService";
import { vnd } from "../utils";

const VIEW = {
  SUCCESS: { Icon: CheckCircle2, tone: "bg-emerald-50 text-emerald-600 ring-emerald-50", title: "Thanh toán thành công", text: "Đơn của bạn đã được xác nhận. Vé và hướng dẫn đi tour đã có trong Chuyến đi của tôi và trong app JourneyGo." },
  FAILED: { Icon: XCircle, tone: "bg-rose-50 text-rose-600 ring-rose-50", title: "Thanh toán không thành công", text: "Giao dịch chưa được trừ tiền. Nếu đơn còn trong thời gian giữ chỗ, bạn có thể thanh toán lại." },
  CANCELLED: { Icon: XCircle, tone: "bg-slate-100 text-slate-500 ring-slate-50", title: "Bạn đã hủy thanh toán", text: "Đơn vẫn giữ chỗ trong thời gian còn lại. Bạn có thể thanh toán lại trong Chuyến đi của tôi." },
  PENDING: { Icon: Clock3, tone: "bg-amber-50 text-amber-600 ring-amber-50", title: "Đang chờ xác nhận từ VNPay", text: "Hệ thống sẽ tự cập nhật khi có kết quả. Bạn kiểm tra lại trạng thái đơn sau ít phút." },
};

/**
 * Trạng thái Payment mà backend trả về ⇒ màn hình tương ứng.
 *
 * ⚠️ `SUPERSEDED` (giao dịch bị thay thế) = đơn ĐÃ được giao dịch khác thanh toán
 * thành công ⇒ vẫn là "đã thanh toán" ⇒ KHÔNG được rơi về PENDING. Trước đây nó
 * rơi về PENDING ⇒ khách đã trả tiền vẫn thấy "đang chờ thanh toán" mãi mãi.
 */
function viewKeyFor(status) {
  if (status === "SUCCESS" || status === "SUPERSEDED") return "SUCCESS";
  if (status === "CANCELLED") return "CANCELLED";
  if (status === "FAILED" || status === "EXPIRED") return "FAILED";
  return "PENDING";
}

/** Trạng thái Booking đã được xác nhận ⇒ đơn KHÔNG còn chờ thanh toán. */
const PAID_BOOKING_STATUSES = ["CONFIRMED", "COMPLETED"];

/** Trang /payment/result — VNPay chuyển trình duyệt về đây kèm tham số vnp_* đã ký. */
export default function PaymentResultScreen() {
  const [state, setState] = useState({ loading: true, result: null, error: "" });

  /**
   * Đồng bộ lại trạng thái đơn từ server.
   *
   * ⚠️ VÌ SAO CẦN bước này?
   * Lần gọi `verifyReturn` đầu tiên có thể chưa phản ánh trạng thái mới nhất:
   *   • IPN từ VNPay có thể tới SAU ⇒ lúc đó Booking vẫn `PENDING_PAYMENT`.
   *   • Backend xử lý `Return` trong lúc Booking đã được giao dịch khác xác nhận.
   * ⇒ Lấy Booking làm nguồn sự thật ⇒ đơn đã trả tiền phải hiện "thành công"
   * và thanh nhắc "Bạn có đơn chờ thanh toán" phải BIẾN MẤT.
   */
  const syncBooking = async (result) => {
    if (!result?.bookingId) return result;
    try {
      const booking = await touristService.booking(result.bookingId);
      if (booking && PAID_BOOKING_STATUSES.includes(booking.status)) {
        return { ...result, status: "SUCCESS", bookingStatus: booking.status };
      }
      // Booking vẫn chờ thanh toán ⇒ giao dịch chưa được ghi nhận ⇒ giữ nguyên.
      return { ...result, bookingStatus: booking.status };
    } catch {
      // Không đọc được Booking ⇒ giữ kết quả giao dịch đã có, không làm hỏng UI.
      return result;
    }
  };

  useEffect(() => {
    const search = window.location.search;
    if (!/vnp_/.test(search)) {
      queueMicrotask(() => setState({ loading: false, result: null, error: "Không có thông tin giao dịch. Hãy mở lại đơn trong Chuyến đi của tôi." }));
      return;
    }
    let cancelled = false;
    touristService.verifyReturn(search)
      .then((result) => syncBooking(result))
      .then((result) => {
        if (cancelled) return;
        setState({ loading: false, result, error: "" });
        // Đơn đã thanh toán ⇒ báo để thanh nhắc "đơn chờ thanh toán" biến mất ngay.
        if (viewKeyFor(result?.status) === "SUCCESS") notifyPaymentCompleted();
      })
      .catch((err) => {
        if (!cancelled) setState({ loading: false, result: null, error: err?.message || "Không xác minh được kết quả thanh toán." });
      });
    return () => { cancelled = true; };
  }, []);

  /**
   * Tự cập nhật khi còn đang chờ.
   *
   * ⚠️ Return URL chỉ chạy MỘT LẦN ⇒ nếu lúc đó backend chưa kịp ghi nhận
   * (IPN tới muộn, giao dịch chờ xử lý) thì trang bị kẹt ở "Đang chờ xác nhận"
   * vĩnh viễn dù tiền ĐÃ trừ. ⇒ Poll lại mỗi vài giây, dừng ngay khi có kết quả.
   */
  useEffect(() => {
    const { loading, result, error } = state;
    if (loading || error || !result) return;
    if (viewKeyFor(result.status) !== "PENDING") return;

    const timer = setInterval(() => {
      touristService.verifyReturn(window.location.search)
        .then(syncBooking)
        .then((next) => {
          setState((prev) => ({ ...prev, result: next }));
          if (viewKeyFor(next.status) !== "PENDING") {
            clearInterval(timer);
            // Vừa xác nhận được thành công ⇒ báo để thanh nhắc đơn chờ biến mất.
            if (viewKeyFor(next.status) === "SUCCESS") notifyPaymentCompleted();
          }
        })
        .catch(() => { /* giữ nguyên, lần poll sau thử lại */ });
    }, 5000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.loading, state.error, state.result?.status, state.result?.bookingId]);

  const { loading, result, error } = state;
  const key = viewKeyFor(result?.status);
  const view = VIEW[key];

  return (
    <TouristShell>
      <div className="mx-auto max-w-lg px-4 py-16">
        <div className="rounded-3xl border border-slate-200 bg-white p-7 text-center shadow-[0_10px_30px_rgba(16,32,29,0.08)]">
          {loading ? (
            <p className="flex items-center justify-center gap-2 py-10 text-sm text-slate-500"><Loader2 size={18} className="animate-spin" />Đang xác minh kết quả với VNPay…</p>
          ) : error ? (
            <>
              <XCircle size={40} className="mx-auto text-rose-500" />
              <h1 className="mt-3 text-lg font-bold text-slate-900">Chưa xác minh được giao dịch</h1>
              <p className="mt-1 text-sm text-slate-600">{error}</p>
            </>
          ) : (
            <>
              <span className={`mx-auto grid h-16 w-16 place-items-center rounded-full ring-8 ${view.tone}`}><view.Icon size={30} /></span>
              <h1 className="mt-4 text-xl font-extrabold text-slate-900">{view.title}</h1>
              <p className="mt-2 text-sm text-slate-600">{view.text}</p>
              <dl className="mt-5 grid grid-cols-2 gap-y-2 rounded-2xl bg-slate-50 p-4 text-left text-sm">
                {result.bookingCode && <><dt className="text-slate-500">Mã đơn</dt><dd className="text-right font-bold text-slate-900">{result.bookingCode}</dd></>}
                {result.amount != null && <><dt className="text-slate-500">Số tiền</dt><dd className="text-right font-bold tabular-nums text-slate-900">{vnd(result.amount)}</dd></>}
                {result.vnpTransactionNo && <><dt className="text-slate-500">Mã giao dịch VNPay</dt><dd className="text-right font-mono text-slate-900">{result.vnpTransactionNo}</dd></>}
              </dl>
            </>
          )}
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {result?.bookingId && <Link href={ROUTES.TRIP_DETAIL(result.bookingId)} className="rounded-xl bg-teal-700 px-5 py-2.5 text-sm font-bold text-white hover:bg-teal-800">Xem đơn</Link>}
            <Link href={ROUTES.TRIPS} className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-700 hover:border-teal-300">Chuyến đi của tôi</Link>
          </div>
        </div>
      </div>
    </TouristShell>
  );
}
