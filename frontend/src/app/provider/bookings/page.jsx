"use client";

/**
 * ProviderBookingsPage — đối tác xem toàn bộ khách hàng đã đặt tour của mình.
 *
 * Luồng backend (/api/v1/provider/bookings):
 *  - GET /provider/bookings?tourId=&page=&size=  : danh sách booking của tour tôi tạo
 *  - GET /provider/bookings/{bookingId}         : chi tiết + danh sách hành khách
 *
 * Trong màn này đối tác có thể:
 *  • Xem danh sách hành khách đầy đủ của từng đơn (quyền "xem toàn bộ khách hàng").
 *  • Duyệt / từ chối yêu cầu thay đổi hành khách do người đặt gửi.
 *  • Nhắn tin qua khung chat hỗ trợ của booking.
 */
import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Ticket,
  Users,
  XCircle,
} from "lucide-react";
import { formatLocalDate, formatVND } from "@/lib/money";
import { useRealtimeMessages } from "@/hooks/useRealtimeMessages";
import {
  approvePassengerChange,
  getBookingMessages,
  getPassengerChanges,
  getProviderBookings,
  rejectPassengerChange,
  sendBookingMessage,
} from "@/features/booking/services/passengerService";
import Pager from "@/features/booking/components/Pager";

const GUEST_LABELS = {
  ADULT: "Người lớn",
  CHILD: "Trẻ em",
  TODDLER: "Trẻ nhỏ",
  INFANT: "Em bé",
};

export default function ProviderBookingsPage() {
  const [bookings, setBookings] = useState([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedId, setExpandedId] = useState(null);
  // Tăng để ép tải lại danh sách (nút "Làm mới").
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getProviderBookings({ page, size: 20 });
        if (cancelled) return;
        const content = Array.isArray(data) ? data : (data?.content ?? []);
        setBookings(content);
        setTotalPages(data?.totalPages ?? 0);
        setTotalElements(data?.totalElements ?? content.length);
        setPage(data?.page ?? page);
        setError("");
      } catch (err) {
        if (cancelled) return;
        setError(err?.message || "Không thể tải danh sách khách hàng.");
        setBookings([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [page, reloadKey]);

  const refresh = () => {
    setLoading(true);
    setError("");
    setReloadKey((k) => k + 1);
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Khách hàng đã đặt tour</h1>
          <p className="mt-1 text-sm text-slate-500">
            Danh sách khách và hành khách của các tour bạn tạo ({totalElements} đơn).
          </p>
        </div>
        <button
          type="button"
          onClick={refresh}
          className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:border-blue-400 hover:text-blue-600"
        >
          <RefreshCw size={13} /> Làm mới
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" /> {error}
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto rounded-xl border border-slate-200 bg-white [scrollbar-width:thin]">
        {loading ? (
          <p className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
            <Loader2 size={16} className="animate-spin" /> Đang tải danh sách khách hàng...
          </p>
        ) : bookings.length === 0 ? (
          <p className="py-16 text-center text-sm text-slate-500">
            Chưa có khách nào đặt tour của bạn.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {bookings.map((b) => (
              <li key={b.id}>
                <button
                  type="button"
                  onClick={() => setExpandedId(expandedId === b.id ? null : b.id)}
                  className="flex w-full flex-wrap items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-slate-50"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-slate-900">
                      {b.tourTitle ?? `Tour #${b.tourId}`}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Mã đơn <span className="font-mono">{b.bookingCode}</span> · Khách:{" "}
                      {b.touristName}
                    </p>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <CalendarDays size={13} /> {formatLocalDate(b.experienceDate)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users size={13} /> {b.passengerCount ?? 0} người
                    </span>
                    <span className="font-mono font-bold text-slate-900">
                      {formatVND(b.totalAmount)}
                    </span>
                  </div>
                </button>

                {expandedId === b.id && (
                  <ProviderBookingDetail booking={b} onChanged={refresh} />
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {totalPages > 1 && (
        <Pager page={page} totalPages={totalPages} onChange={setPage} />
      )}
    </div>
  );
}

/**
 * Chi tiết một booking từ góc nhìn đối tác: hành khách, yêu cầu thay đổi, chat.
 */
function ProviderBookingDetail({ booking, onChanged }) {
  const [changes, setChanges] = useState([]);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const bookingId = booking?.id ?? null;
  const [reloadKey, setReloadKey] = useState(0);

  // Tin nhắn mới trong booking này ⇒ hiện ngay, không cần tải lại danh sách.
  useRealtimeMessages(
    useCallback(
      (payload) => {
        if (payload?.scope !== "BOOKING_CHAT") return;
        if (Number(payload.bookingId) !== Number(bookingId)) return;
        setMessages((prev) => {
          if (prev.some((m) => Number(m.id) === Number(payload.message?.id))) return prev;
          return payload.message ? [payload.message, ...prev] : prev;
        });
      },
      [bookingId],
    ),
  );

  useEffect(() => {
    if (!bookingId) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const [c, m] = await Promise.all([
          getPassengerChanges(bookingId),
          getBookingMessages(bookingId),
        ]);
        if (cancelled) return;
        setChanges(Array.isArray(c) ? c : (c?.content ?? []));
        setMessages(Array.isArray(m) ? m : (m?.content ?? []));
      } catch {
        if (cancelled) return;
        setChanges([]);
        setMessages([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [bookingId, reloadKey]);

  const handleApprove = async (change, acceptPriceDifference) => {
    setBusyId(change.id);
    setError("");
    setNotice("");
    try {
      await approvePassengerChange(booking.id, change.id, acceptPriceDifference);
      setNotice("Đã duyệt yêu cầu thay đổi hành khách.");
      setReloadKey((k) => k + 1);
      onChanged?.();
    } catch (err) {
      setError(err?.message || "Không duyệt được yêu cầu.");
    } finally {
      setBusyId(null);
    }
  };

  const handleReject = async (change) => {
    setBusyId(change.id);
    setError("");
    setNotice("");
    try {
      await rejectPassengerChange(booking.id, change.id, "Đối tác từ chối thay đổi hành khách");
      setNotice("Đã từ chối yêu cầu thay đổi hành khách.");
      setReloadKey((k) => k + 1);
    } catch (err) {
      setError(err?.message || "Không từ chối được yêu cầu.");
    } finally {
      setBusyId(null);
    }
  };

  const handleSend = async () => {
    const body = text.trim();
    if (!body) return;
    try {
      const created = await sendBookingMessage(booking.id, body);
      setMessages((prev) => [created, ...prev]);
      setText("");
    } catch (err) {
      setError(err?.message || "Không gửi được tin nhắn.");
    }
  };

  const passengers = booking.passengers ?? [];
  const pendingChanges = changes.filter((c) => c.status === "PENDING");

  return (
    <div className="space-y-4 bg-slate-50 px-5 py-5">
      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </p>
      )}
      {notice && (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
          {notice}
        </p>
      )}

      {/* ── Danh sách hành khách ── */}
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
          <Users size={15} /> Danh sách hành khách ({passengers.length})
        </h3>
        <ul className="mt-3 space-y-2">
          {passengers.map((p) => (
            <li
              key={p.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2"
            >
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900">
                  {p.fullName}
                  {p.bookingCustomer && (
                    <span className="ml-2 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                      Người đặt
                    </span>
                  )}
                  {p.status === "REPLACED" && (
                    <span className="ml-2 rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                      Đã thay thế
                    </span>
                  )}
                </p>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  {GUEST_LABELS[p.guestType] ?? p.guestType}
                  {p.ageAtExperience != null ? ` · ${p.ageAtExperience} tuổi` : ""}
                  {p.email ? ` · ${p.email}` : ""}
                  {p.hasAccount ? " · Đã có tài khoản" : " · Chưa có tài khoản"}
                </p>
              </div>
              <span className="font-mono text-xs font-bold text-slate-900">{formatVND(p.price)}</span>
            </li>
          ))}
          {passengers.length === 0 && (
            <li className="py-3 text-center text-xs text-slate-500">Chưa có hành khách.</li>
          )}
        </ul>
      </div>

      {/* ── Yêu cầu thay đổi hành khách ── */}
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
          <RefreshCw size={15} /> Yêu cầu thay đổi hành khách
          {pendingChanges.length > 0 && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
              {pendingChanges.length} chờ xử lý
            </span>
          )}
        </h3>

        {changes.length === 0 ? (
          <p className="mt-3 text-xs text-slate-500">Chưa có yêu cầu thay đổi nào.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {changes.map((c) => (
              <li key={c.id} className="rounded-lg bg-slate-50 px-3 py-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-bold text-slate-900">{c.passengerName}</p>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      c.status === "APPROVED"
                        ? "bg-emerald-100 text-emerald-700"
                        : c.status === "REJECTED"
                          ? "bg-red-100 text-red-700"
                          : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {c.status === "PENDING"
                      ? "Chờ duyệt"
                      : c.status === "APPROVED"
                        ? "Đã duyệt"
                        : "Đã từ chối"}
                  </span>
                </div>
                {c.reason && (
                  <p className="mt-1 text-[11px] text-slate-600">Lý do: {c.reason}</p>
                )}
                {c.priceDelta != null && Number(c.priceDelta) !== 0 && (
                  <p className="mt-1 text-[11px] font-semibold text-amber-600">
                    Chênh lệch giá: {formatVND(c.priceDelta)}
                    {Number(c.priceDelta) !== 0 && " — cần xử lý chênh lệch trước khi duyệt"}
                  </p>
                )}

                {c.status === "PENDING" && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleApprove(c, false)}
                      disabled={busyId === c.id}
                      className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                      <CheckCircle2 size={12} /> Duyệt
                    </button>
                    {Number(c.priceDelta) !== 0 && (
                      <button
                        type="button"
                        onClick={() => handleApprove(c, true)}
                        disabled={busyId === c.id}
                        className="flex items-center gap-1.5 rounded-lg border border-amber-300 px-3 py-1.5 text-[11px] font-bold text-amber-700 hover:bg-amber-50 disabled:opacity-50"
                      >
                        Duyệt &amp; đã xử lý chênh lệch
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleReject(c)}
                      disabled={busyId === c.id}
                      className="flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-[11px] font-bold text-red-600 hover:bg-red-50 disabled:opacity-50"
                    >
                      <XCircle size={12} /> Từ chối
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ── Chat hỗ trợ ── */}
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
          <Ticket size={15} /> Trao đổi với khách
        </h3>
        <div className="mt-3 max-h-56 space-y-2 overflow-y-auto rounded-lg bg-slate-50 p-3">
          {messages.length === 0 ? (
            <p className="py-4 text-center text-xs text-slate-500">Chưa có tin nhắn.</p>
          ) : (
            messages.map((m) => (
              <div key={m.id} className="rounded-lg bg-white px-3 py-2 text-xs shadow-sm">
                <p className="font-semibold text-slate-700">{m.senderName ?? "Người dùng"}</p>
                <p className="mt-0.5 text-slate-600">{m.body}</p>
              </div>
            ))
          )}
        </div>
        <div className="mt-3 flex gap-2">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Nhập tin nhắn tới khách..."
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-xs outline-none focus:border-blue-500"
          />
          <button
            type="button"
            onClick={handleSend}
            className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700"
          >
            Gửi
          </button>
        </div>
      </div>
    </div>
  );
}
