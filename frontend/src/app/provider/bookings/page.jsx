"use client";

/**
 * ProviderBookingsPage — đối tác xem toàn bộ khách hàng đã đặt tour của mình.
 *
 * Luồng backend (/api/v1/provider/bookings):
 *  - GET /provider/bookings/departures?tourId=&scope=&includeEmpty= : lịch khởi hành (tour × ngày)
 *    kèm số khách đã đăng ký — tab mặc định "Theo lịch khởi hành".
 *  - GET /provider/bookings?tourId=&date=&status=&page=&size=      : danh sách đơn (tab "Theo đơn",
 *    và danh sách đơn của một lịch khởi hành khi mở rộng).
 *  - GET /provider/bookings/{bookingId}                            : chi tiết + danh sách hành khách
 *
 * ⚠️ DANH SÁCH NÀY là danh sách khách THAM GIA chuyến đi — mục đích để đối tác biết
 * ngày đó có bao nhiêu người đi để quản lý. Vì vậy chỉ gồm đơn ĐÃ THANH TOÁN
 * (CONFIRMED / COMPLETED). Đơn chưa thanh toán (PENDING_PAYMENT), đơn quá hạn (EXPIRED),
 * đơn đã hủy (CANCELLED) và đơn đã được Admin duyệt hoàn tiền đều KHÔNG xuất hiện.
 *
 * Trong màn này đối tác có thể:
 *  • Xem mỗi tour, mỗi ngày có bao nhiêu khách / còn bao nhiêu chỗ.
 *  • Xem danh sách hành khách đầy đủ của từng đơn (quyền "xem toàn bộ khách hàng").
 *  • Duyệt / từ chối yêu cầu thay đổi hành khách do người đặt gửi.
 *  • Nhắn tin qua khung chat hỗ trợ của booking.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Loader2,
  RefreshCw,
  Ticket,
  Users,
  XCircle,
} from "lucide-react";
import { BOOKING_STATUS_LABELS, formatLocalDate, formatVND } from "@/lib/money";
import { useRealtimeMessages } from "@/hooks/useRealtimeMessages";
import { useChatHistory, CHAT_PAGE_SIZE } from "@/hooks/useChatHistory";
import { useAuthSession } from "@/hooks/useAuthSession";
import {
  approvePassengerChange,
  getBookingMessagesPage,
  getPassengerChanges,
  getProviderBookings,
  getProviderDepartures,
  rejectPassengerChange,
  sendBookingMessage,
} from "@/features/booking/services/passengerService";
import { providerTourService } from "@/features/tourwizard/services/providerTourService";
import PaginationBar from "@/components/ui/PaginationBar";
import ChatBubble from "@/components/ui/ChatBubble";
import SearchSelect from "@/components/ui/SearchSelect";
import { PAGE_SIZE } from "@/lib/pagination";
const GUEST_LABELS = {
  ADULT: "Người lớn",
  CHILD: "Trẻ em",
  TODDLER: "Trẻ nhỏ",
  INFANT: "Em bé",
};

const SCOPE_OPTIONS = [
  { value: "UPCOMING", label: "Sắp tới" },
  { value: "PAST", label: "Đã qua" },
  { value: "ALL", label: "Tất cả" },
];

/**
 * Bộ lọc trạng thái — danh sách này CHỈ gồm đơn đã thanh toán (khách thực sự tham gia).
 * Đơn chưa thanh toán / quá hạn / đã hủy / đã hoàn tiền không xuất hiện trong danh sách.
 */
const STATUS_FILTERS = [
  { value: "", label: "Mọi trạng thái" },
  { value: "CONFIRMED", label: BOOKING_STATUS_LABELS.CONFIRMED },
  { value: "COMPLETED", label: BOOKING_STATUS_LABELS.COMPLETED },
];

const STATUS_BADGE = {
  CONFIRMED: "bg-emerald-100 text-emerald-700",
  COMPLETED: "bg-blue-100 text-blue-700",
};

const GUEST_ORDER = ["ADULT", "CHILD", "TODDLER", "INFANT"];
const WEEKDAYS = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

const pageContent = (data) => (Array.isArray(data) ? data : (data?.content ?? []));

/**
 * Tải dữ liệu theo `key` (chuỗi mô tả request). Đang tải = kết quả hiện có thuộc key cũ,
 * nên không cần setState đồng bộ trong effect.
 */
function useRemote(key, load, errorText) {
  const [state, setState] = useState({ key: null, data: null, error: "" });
  const loadRef = useRef(load);
  useEffect(() => {
    loadRef.current = load;
  });
  useEffect(() => {
    let cancelled = false;
    loadRef
      .current()
      .then((data) => {
        if (!cancelled) setState({ key, data, error: "" });
      })
      .catch((err) => {
        if (!cancelled) setState({ key, data: null, error: err?.message || errorText });
      });
    return () => {
      cancelled = true;
    };
  }, [key, errorText]);
  const fresh = state.key === key;
  return { loading: !fresh, data: fresh ? state.data : null, error: fresh ? state.error : "" };
}

const toPage = (res) => {
  const items = pageContent(res);
  return { items, totalPages: res?.totalPages ?? 0, totalElements: res?.totalElements ?? items.length };
};

/** "T7, 14/11/2026" từ chuỗi LocalDate "2026-11-14". */
function formatDepartureDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value || ""));
  if (!match) return formatLocalDate(value);
  const [, y, m, d] = match;
  const weekday = WEEKDAYS[new Date(Number(y), Number(m) - 1, Number(d)).getDay()];
  return `${weekday}, ${d}/${m}/${y}`;
}

/** Trạng thái hiển thị của một lịch khởi hành. */
function departureState(d) {
  if (d.past) return { label: "Đã diễn ra", cls: "bg-slate-100 text-slate-600" };
  if (d.slotStatus === "CLOSED") return { label: "Đã đóng bán", cls: "bg-slate-200 text-slate-700" };
  if (!d.capacity) return { label: "Không có slot", cls: "bg-slate-100 text-slate-500" };
  const used = d.reservedSeats ?? d.confirmedSeats + d.pendingSeats;
  if (used >= d.capacity) return { label: "Đã đầy", cls: "bg-red-100 text-red-700" };
  if (used / d.capacity >= 0.8) return { label: "Sắp đầy", cls: "bg-amber-100 text-amber-700" };
  return { label: "Còn chỗ", cls: "bg-emerald-100 text-emerald-700" };
}

export default function ProviderBookingsPage() {
  const [view, setView] = useState("departures");
  const [tours, setTours] = useState([]);
  const [tourId, setTourId] = useState("");
  // Tăng để ép tải lại danh sách (nút "Làm mới").
  const [reloadKey, setReloadKey] = useState(0);

  // Danh sách tour của đối tác cho bộ lọc.
  // Lấy NHIỀU TRANG để dropdown có đủ tour (đối tác lớn có hàng trăm tour).
  useEffect(() => {
    let cancelled = false;
    const fetchAll = async () => {
      const collected = [];
      let page = 0;
      let totalPages = 1;
      do {
        const data = await providerTourService.list({ page, size: 100 });
        if (cancelled) return;
        collected.push(...pageContent(data));
        totalPages = data?.totalPages ?? 1;
        page += 1;
      } while (page < totalPages && page < 20);
      if (!cancelled) setTours(collected);
    };
    fetchAll().catch(() => {
      if (!cancelled) setTours([]);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const refresh = () => setReloadKey((k) => k + 1);

  const tabCls = (active) =>
    `rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
      active ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
    }`;

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Khách hàng đã đặt tour</h1>
        </div>
        <button
          type="button"
          onClick={refresh}
          className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:border-blue-400 hover:text-blue-600"
        >
          <RefreshCw size={13} /> Làm mới
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex rounded-xl bg-slate-100 p-1">
          <button type="button" className={tabCls(view === "departures")} onClick={() => setView("departures")}>
            Theo lịch khởi hành
          </button>
          <button type="button" className={tabCls(view === "bookings")} onClick={() => setView("bookings")}>
            Theo đơn
          </button>
        </div>
        <SearchSelect
          value={tourId}
          onChange={setTourId}
          allLabel="Tất cả tour"
          placeholder="Chọn tour"
          maxVisible={7}
          className="w-full max-w-xs"
          options={tours.map((t) => ({
            value: String(t.tourId),
            label: t.title || `Tour #${t.tourId}`,
          }))}
        />
      </div>

      {/* key = tourId ⇒ đổi tour thì về trang đầu. */}
      {view === "departures" ? (
        <DeparturesView key={tourId} tourId={tourId} reloadKey={reloadKey} onChanged={refresh} />
      ) : (
        <BookingsView key={tourId} tourId={tourId} reloadKey={reloadKey} onChanged={refresh} />
      )}
    </div>
  );
}

/**
 * Tab "Theo lịch khởi hành": mỗi dòng là một tour × một ngày, kèm số khách / sức chứa.
 */
function DeparturesView({ tourId, reloadKey, onChanged }) {
  const [scope, setScope] = useState("UPCOMING");
  const [includeEmpty, setIncludeEmpty] = useState(false);
  const [page, setPage] = useState(0);
  const [expandedKey, setExpandedKey] = useState(null);

  const { loading, data: raw, error } = useRemote(
    JSON.stringify(["departures", tourId, scope, includeEmpty, page, reloadKey]),
    () => getProviderDepartures({ tourId, scope, includeEmpty, page, size: PAGE_SIZE }).then(toPage),
    "Không thể tải lịch khởi hành.",
  );
  const data = raw ?? { items: [], totalPages: 0, totalElements: 0 };

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex rounded-lg border border-slate-200 bg-white p-0.5">
          {SCOPE_OPTIONS.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => {
                setScope(o.value);
                setPage(0);
              }}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold ${
                scope === o.value ? "bg-emerald-600 text-white" : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-600">
          <input
            type="checkbox"
            className="h-4 w-4 accent-emerald-600"
            checked={includeEmpty}
            onChange={(e) => {
              setIncludeEmpty(e.target.checked);
              setPage(0);
            }}
          />
          Hiện cả ngày chưa có khách
        </label>
        <span className="ml-auto text-xs text-slate-500">{data.totalElements} lịch khởi hành</span>
      </div>

      {error && <ErrorBox message={error} />}

      <div className="min-h-0 flex-1 overflow-y-auto rounded-xl border border-slate-200 bg-white [scrollbar-width:thin]">
        {loading ? (
          <LoadingRow text="Đang tải lịch khởi hành..." />
        ) : data.items.length === 0 ? (
          <p className="py-16 text-center text-sm text-slate-500">
            {scope === "PAST" ? "Chưa có lịch khởi hành nào đã qua." : "Chưa có lịch khởi hành nào có khách đặt."}
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {data.items.map((d) => {
              const key = `${d.tourId}_${d.date}`;
              const open = expandedKey === key;
              return (
                <li key={key}>
                  <DepartureRow departure={d} open={open} onToggle={() => setExpandedKey(open ? null : key)} />
                  {open && <DepartureBookings departure={d} reloadKey={reloadKey} />}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {data.totalElements > 0 && (
        <div className="mt-4 rounded-xl border border-slate-200 bg-white overflow-hidden">
          <PaginationBar
            page={page}
            totalPages={data.totalPages}
            totalElements={data.totalElements}
            unit="lịch khởi hành"
            onChange={setPage}
          />
        </div>
      )}
    </>
  );
}

function DepartureRow({ departure: d, open, onToggle }) {
  const state = departureState(d);
  const capacity = d.capacity || 0;
  const confirmedPct = capacity ? Math.min(100, (d.confirmedSeats / capacity) * 100) : 0;
  const pendingPct = capacity ? Math.min(100 - confirmedPct, (d.pendingSeats / capacity) * 100) : 0;
  const breakdown = GUEST_ORDER.filter((g) => d.guestBreakdown?.[g] > 0)
    .map((g) => `${d.guestBreakdown[g]} ${(GUEST_LABELS[g] ?? g).toLowerCase()}`)
    .join(" · ");

  return (
    <button
      type="button"
      onClick={onToggle}
      className="grid w-full grid-cols-1 items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-slate-50 md:grid-cols-[minmax(0,1fr)_220px_120px]"
    >
      <div className="flex min-w-0 items-start gap-2">
        {open ? (
          <ChevronDown size={16} className="mt-0.5 shrink-0 text-slate-400" />
        ) : (
          <ChevronRight size={16} className="mt-0.5 shrink-0 text-slate-400" />
        )}
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-slate-900">{d.tourTitle ?? `Tour #${d.tourId}`}</p>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
            <span className="flex items-center gap-1 font-semibold text-slate-700">
              <CalendarDays size={13} /> {formatDepartureDate(d.date)}
            </span>
            <span>{d.confirmedBookings} đơn</span>
            {breakdown && <span>{breakdown}</span>}
          </p>
        </div>
      </div>

      {/* Cột sức chứa — cố định 220px để thanh tiến trình luôn dài bằng nhau. */}
      <div className="w-full pl-6 md:w-[220px] md:pl-0">
        <div className="flex items-baseline justify-between gap-2 text-xs">
          <span className="flex items-center gap-1 text-slate-500">
            <Users size={13} />
            <span className="text-sm font-bold text-slate-900">{d.confirmedGuests}</span> khách
          </span>
          <span className="whitespace-nowrap text-slate-500">
            {capacity ? (
              <>
                <b className="text-slate-800">{d.reservedSeats ?? d.confirmedSeats}</b>/{capacity} chỗ
              </>
            ) : (
              "—"
            )}
          </span>
        </div>
        <div className="mt-1.5 flex h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
          <div className="h-full bg-emerald-500" style={{ width: `${confirmedPct}%` }} />
          <div className="h-full bg-amber-300" style={{ width: `${pendingPct}%` }} />
        </div>
        {d.pendingBookings > 0 && (
          <p className="mt-1 flex items-center gap-1 text-[11px] text-amber-700">
            <Clock size={11} /> {d.pendingGuests} khách đang giữ chỗ ({d.pendingBookings} đơn chờ thanh toán)
          </p>
        )}
      </div>

      {/*
        ⚠️ Cột trạng thái + doanh thu: badge dùng W CỐ ĐỊNH (không min-w) ⇒
        badge "Đã diễn ra" / "Sắp đầy" / "Còn chỗ" (độ dài khác nhau) vẫn chiếm
        đúng một ô ⇒ số tiền luôn nằm thẳng hàng giữa các dòng.
      */}
      <div className="flex items-center justify-between gap-3 pl-6 md:flex-col md:items-end md:pl-0">
        <span
          className={`inline-flex w-[96px] shrink-0 justify-center rounded-full px-2 py-0.5 text-[10px] font-bold ${state.cls}`}
        >
          {state.label}
        </span>
        <span className="w-[120px] shrink-0 whitespace-nowrap text-right font-mono text-xs font-bold text-slate-900">
          {formatVND(d.revenue)}
        </span>
      </div>
    </button>
  );
}

/**
 * Các đơn + danh sách hành khách thực tế của một lịch khởi hành
 * (mở rộng từ dòng tour × ngày).
 *
 * Yêu cầu nghiệp vụ: đối tác cần danh sách NGƯỜI THỰC TẾ đã đăng ký (những người được
 * điền khi đặt tour), không phải tên tài khoản đặt tour. Vì vậy mỗi đơn hiển thị kèm
 * danh sách hành khách ngay bên dưới, không cần bấm thêm vào đơn.
 */
function DepartureBookings({ departure, reloadKey }) {
  const { loading, data, error } = useRemote(
    JSON.stringify(["departure-bookings", departure.tourId, departure.date, reloadKey]),
    () =>
      getProviderBookings({ tourId: departure.tourId, date: departure.date, page: 0, size: 100 }).then(
        pageContent,
      ),
    "Không thể tải danh sách đơn.",
  );
  const bookings = data ?? [];

  const totalPassengers = bookings.reduce(
    (sum, b) => sum + (b.passengers?.length ?? b.passengerCount ?? 0),
    0,
  );

  return (
    <div className="border-t border-slate-100 bg-slate-50/60 px-5 py-4">
      {error && <ErrorBox message={error} />}
      {loading ? (
        <LoadingRow text="Đang tải danh sách khách..." />
      ) : bookings.length === 0 ? (
        <p className="py-4 text-center text-xs text-slate-500">Ngày này chưa có đơn nào.</p>
      ) : (
        <>
          <p className="mb-3 flex items-center gap-1.5 text-xs font-bold text-slate-700">
            <Users size={13} />
            Danh sách khách đã đăng ký ({totalPassengers} người · {bookings.length} đơn)
          </p>
          <div className="space-y-3">
            {bookings.map((b) => (
              <div
                key={b.id}
                className="overflow-hidden rounded-xl border border-slate-200 bg-white"
              >
                {/* Header của nhóm: tài khoản đặt tour + trạng thái đơn */}
                <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50/70 px-4 py-2">
                  <span className="min-w-0 flex-1 truncate text-xs font-bold text-slate-900">
                    Đơn của tài khoản: {b.touristName}
                  </span>
                  {/*
                    ⚠️ Badge dùng `w-[104px]` (KHÔNG `min-w`) ⇒ độ rộng CỐ ĐỊNH ⇒
                    các nhóm có badge dài/ngắn vẫn cùng vị trí. Cùng logic với
                    `BookingRow` ở tab "Theo đơn".
                  */}
                  <span
                    className={`inline-flex w-[104px] shrink-0 justify-center rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      STATUS_BADGE[b.status] ?? "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {BOOKING_STATUS_LABELS[b.status] ?? b.status}
                  </span>
                  <span className="w-[120px] shrink-0 whitespace-nowrap text-right font-mono text-xs font-bold text-slate-900">
                    {formatVND(b.totalAmount)}
                  </span>
                </div>

                {/* Danh sách người thực tế đăng ký tour */}
                <ul className="divide-y divide-slate-100">
                  {(b.passengers ?? []).map((p) => (
                    <li
                      key={p.id}
                      className="flex items-center justify-between gap-3 px-4 py-2.5"
                    >
                      <div className="min-w-0 flex-1">
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
                          {p.guestTypeLabel ?? GUEST_LABELS[p.guestType] ?? p.guestType}
                          {p.ageAtExperience != null ? ` · ${p.ageAtExperience} tuổi` : ""}
                          {p.email ? ` · ${p.email}` : ""}
                          {` · ${p.hasAccount ? "Đã có tài khoản" : "Chưa có tài khoản"}`}
                        </p>
                      </div>
                      <span className="w-[120px] shrink-0 whitespace-nowrap text-right font-mono text-xs font-bold text-slate-900">
                        {formatVND(p.price)}
                      </span>
                    </li>
                  ))}
                  {(b.passengers ?? []).length === 0 && (
                    <li className="px-4 py-3 text-center text-xs text-slate-500">
                      Đơn này chưa có thông tin hành khách.
                    </li>
                  )}
                </ul>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Tab "Theo đơn": danh sách đơn phẳng, lọc theo tour và trạng thái.
 */
function BookingsView({ tourId, reloadKey, onChanged }) {
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(0);

  const { loading, data: raw, error } = useRemote(
    JSON.stringify(["bookings", tourId, status, page, reloadKey]),
    () => getProviderBookings({ tourId, statuses: status ? [status] : [], page, size: PAGE_SIZE }).then(toPage),
    "Không thể tải danh sách khách hàng.",
  );
  const data = raw ?? { items: [], totalPages: 0, totalElements: 0 };

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(0);
          }}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-700 outline-none focus:border-blue-500"
        >
          {STATUS_FILTERS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <span className="ml-auto text-xs text-slate-500">{data.totalElements} đơn</span>
      </div>

      {error && <ErrorBox message={error} />}

      <div className="min-h-0 flex-1 overflow-y-auto rounded-xl border border-slate-200 bg-white [scrollbar-width:thin]">
        {loading ? (
          <LoadingRow text="Đang tải danh sách khách hàng..." />
        ) : data.items.length === 0 ? (
          <p className="py-16 text-center text-sm text-slate-500">Chưa có khách nào đặt tour của bạn.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {data.items.map((b) => (
              <BookingRow key={b.id} booking={b} showTour onChanged={onChanged} />
            ))}
          </ul>
        )}
      </div>

      {data.totalElements > 0 && (
        <div className="mt-4 rounded-xl border border-slate-200 bg-white overflow-hidden">
          <PaginationBar
            page={page}
            totalPages={data.totalPages}
            totalElements={data.totalElements}
            unit="đơn đặt"
            onChange={setPage}
          />
        </div>
      )}
    </>
  );
}

/** Một đơn — bấm để mở chi tiết (hành khách, yêu cầu thay đổi, chat). */
function BookingRow({ booking: b, showTour, onChanged }) {
  const [open, setOpen] = useState(false);
  return (
    <li>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-4 px-5 py-3.5 text-left transition-colors hover:bg-slate-50"
      >
        {/*
          ⚠️ CỐ ĐỊNH bề rộng từng cột (w-[...]) ⇒ các dòng "Đã xác nhận / Ngày /
          Số người / Tiền" luôn THẲNG HÀNG với nhau, độc lập độ dài nội dung
          (tên tour / tên khách / độ dài badge).

          ⚠️ TRƯỚC đây dùng `flex-wrap` + `min-w` ⇒ mỗi dòng tự đóng gói theo độ
          dài nội dung ⇒ cột bị lệch nhau giữa các dòng (đúng lỗi user báo).
        */}
        <div className="min-w-0 flex-1">
          {showTour && (
            <p className="truncate text-sm font-bold text-slate-900">{b.tourTitle ?? `Tour #${b.tourId}`}</p>
          )}
          <p className={`${showTour ? "mt-0.5 text-xs text-slate-500" : "text-sm font-semibold text-slate-800"}`}>
            {showTour ? "Khách: " : ""}
            {b.touristName}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-4 text-xs text-slate-500">
          {/* Badge trạng thái: W CỐ ĐỊNH (không min-w) ⇒ badge dài/ngắn vẫn
              chiếm đúng một ô ⇒ cột sau luôn thẳng hàng. */}
          <span
            className={`inline-flex w-[104px] shrink-0 justify-center rounded-full px-2 py-0.5 text-[10px] font-bold ${
              STATUS_BADGE[b.status] ?? "bg-slate-100 text-slate-600"
            }`}
          >
            {BOOKING_STATUS_LABELS[b.status] ?? b.status}
          </span>
          {showTour && (
            <span className="flex w-[92px] shrink-0 items-center gap-1">
              <CalendarDays size={13} /> {formatLocalDate(b.experienceDate)}
            </span>
          )}
          <span className="flex w-[84px] shrink-0 items-center gap-1">
            <Users size={13} /> {b.passengerCount ?? 0} người
          </span>
          <span className="w-[120px] shrink-0 whitespace-nowrap text-right font-mono font-bold text-slate-900">
            {formatVND(b.totalAmount)}
          </span>
        </div>
      </button>

      {open && <ProviderBookingDetail booking={b} onChanged={onChanged} />}
    </li>
  );
}

function ErrorBox({ message }) {
  return (
    <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      <AlertTriangle size={16} className="mt-0.5 shrink-0" /> {message}
    </div>
  );
}

function LoadingRow({ text }) {
  return (
    <p className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
      <Loader2 size={16} className="animate-spin" /> {text}
    </p>
  );
}

/**
 * Chi tiết một booking từ góc nhìn đối tác: hành khách, yêu cầu thay đổi, chat.
 */
function ProviderBookingDetail({ booking, onChanged }) {
  const [changes, setChanges] = useState([]);
  const [text, setText] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  // ID người đang đăng nhập ⇒ phân biệt tin "của mình" (bên phải) và tin của khách
  // (bên trái) trong khung chat.
  const { user } = useAuthSession();
  const currentUserId = user?.id ?? null;

  const bookingId = booking?.id ?? null;
  const [reloadKey, setReloadKey] = useState(0);

  // ⚠️ PHÂN TRANG KIỂU "CUỘN LÊN ĐỂ LOAD THÊM":
  //  • Mở khung ⇒ chỉ tải 10 tin MỚI NHẤT, tự cuộn xuống cuối (thấy ngay tin mới).
  //  • Cuộn lên gần đầu ⇒ tự nối thêm tin CŨ hơn.
  const fetchMessagePage = useCallback(
    (cursor) => getBookingMessagesPage(bookingId, CHAT_PAGE_SIZE, cursor),
    [bookingId],
  );

  const {
    messages,
    loading: loadingMessages,
    loadingMore,
    hasMore,
    error: messageError,
    containerRef: messageListRef,
    handleScroll: handleMessageScroll,
    appendMessage,
    loadMore: loadMoreMessages,
  } = useChatHistory(fetchMessagePage, {
    enabled: Boolean(bookingId),
    resetKey: String(bookingId),
  });

  // Tin nhắn mới trong booking này ⇒ hiện ngay, không cần tải lại danh sách.
  //
  // ⚠️ Kênh đã gộp: nhận cả scope `BOOKING_CHAT` (cũ) và `PROVIDER_CHAT` (mới).
  useRealtimeMessages(
    useCallback(
      (payload) => {
        const scope = payload?.scope;
        if (scope !== "BOOKING_CHAT" && scope !== "PROVIDER_CHAT") return;
        if (scope === "BOOKING_CHAT" && Number(payload.bookingId) !== Number(bookingId)) return;
        if (scope === "PROVIDER_CHAT" && payload.bookingId != null
          && Number(payload.bookingId) !== Number(bookingId)) return;
        appendMessage(payload.message);
      },
      [bookingId, appendMessage],
    ),
  );

  useEffect(() => {
    if (!bookingId) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const c = await getPassengerChanges(bookingId);
        if (cancelled) return;
        setChanges(Array.isArray(c) ? c : (c?.content ?? []));
      } catch {
        if (!cancelled) setChanges([]);
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
      appendMessage(created);
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
              className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2"
            >
              <div className="min-w-0 flex-1">
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
              <span className="w-[120px] shrink-0 whitespace-nowrap text-right font-mono text-xs font-bold text-slate-900">
                {formatVND(p.price)}
              </span>
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

      {/* ── Chat hỗ trợ ──
          ⚠️ PHÂN BIỆT BÊN PHẢI (của mình) / BÊN TRÁI (của khách) + phân trang
          "cuộn lên để load thêm" (chỉ 10 tin mới nhất mỗi lần tải). */}
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex items-center gap-2">
          <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
            <Ticket size={15} /> Trao đổi với khách
          </h3>
        </div>

        <div
          ref={messageListRef}
          onScroll={handleMessageScroll}
          className="mt-3 max-h-72 space-y-2 overflow-y-auto overscroll-contain rounded-lg bg-slate-50 p-3 [scrollbar-width:thin]"
        >
          {loadingMessages ? (
            <p className="flex items-center justify-center gap-2 py-6 text-xs text-slate-500">
              <Loader2 size={14} className="animate-spin" /> Đang tải tin nhắn…
            </p>
          ) : messages.length === 0 ? (
            <p className="py-4 text-center text-xs text-slate-500">Chưa có tin nhắn.</p>
          ) : (
            <>
              {/* Đầu danh sách: nút load thêm lịch sử cũ / dòng "đã xem hết". */}
              {hasMore ? (
                <div className="flex justify-center pb-1">
                  <button
                    type="button"
                    onClick={loadMoreMessages}
                    disabled={loadingMore}
                    className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-60"
                  >
                    {loadingMore ? (
                      <>
                        <Loader2 size={11} className="animate-spin" /> Đang tải lịch sử…
                      </>
                    ) : (
                      <>
                        <ChevronDown size={11} /> Xem tin nhắn cũ hơn
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <p className="pb-1 text-center text-[11px] text-slate-400">
                  Bạn đã xem hết lịch sử tin nhắn
                </p>
              )}

              <ul className="space-y-2">
                {messages.map((m) => (
                  <ChatBubble
                    key={m.id}
                    mine={currentUserId != null && Number(m.senderId) === Number(currentUserId)}
                    body={m.body}
                    createdAt={m.createdAt}
                    author={m.senderName ?? "Khách hàng"}
                  />
                ))}
              </ul>

              {loadingMore && (
                <p className="flex items-center justify-center gap-2 py-2 text-[11px] text-slate-400">
                  <Loader2 size={11} className="animate-spin" /> Đang tải tin nhắn cũ…
                </p>
              )}
            </>
          )}
        </div>

        {messageError && (
          <p className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-700">
            {messageError}
          </p>
        )}

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
