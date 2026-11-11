"use client";

/**
 * PassengerListPanel — hiển thị danh sách hành khách trong một Booking kèm các thao tác:
 *  • Gửi lời mời cho hành khách chưa có tài khoản (người đặt tour).
 *  • Gửi yêu cầu thay đổi hành khách (người đặt tour) — đối tác duyệt/từ chối.
 *  • Hiển thị lịch sử yêu cầu thay đổi (có dữ liệu trước/sau và chênh lệch giá).
 *
 * ── Quy tắc hiển thị ──
 *  • Hành khách đã liên kết tài khoản ⇒ badge "Đã liên kết".
 *  • Hành khách ACTIVE nhưng chưa có tài khoản ⇒ nút "Gửi lời mời".
 *  • Hành khách bị REPLACED ⇒ hiển thị mờ, ghi "(đã thay thế)".
 *  • Yêu cầu thay đổi đang chờ ⇒ badge "Chờ đối tác duyệt".
 */
import { useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Loader2,
  Mail,
  RefreshCw,
  UserPlus,
  UserX,
  XCircle,
} from "lucide-react";
import { formatDateTimeVN, formatLocalDate, formatVND } from "@/lib/money";
import {
  getPassengerChanges,
  requestPassengerChange,
  sendPassengerInvitation,
} from "@/features/booking/services/passengerService";

/** Nhãn loại khách tiếng Việt. */
const GUEST_LABELS = {
  ADULT: "Người lớn",
  CHILD: "Trẻ em",
  TODDLER: "Trẻ nhỏ",
  INFANT: "Em bé",
};

const CHANGE_STATUS_META = {
  PENDING: {
    label: "Chờ đối tác duyệt",
    cls: "bg-amber-50 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  },
  APPROVED: {
    label: "Đã duyệt",
    cls: "bg-emerald-50 text-ememerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  },
  REJECTED: {
    label: "Đã từ chối",
    cls: "bg-red-50 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  },
};

/**
 * @param {object} props
 * @param {object} props.booking  BookingResponse (có `passengers`)
 * @param {boolean} props.canManage  true khi người đặt tour (được gửi lời mời / yêu cầu thay đổi)
 */
export default function PassengerListPanel({ booking, canManage = false, onChanged }) {
  // Danh sách hành khách luôn lấy trực tiếp từ booking (không giữ state riêng)
  // ⇒ không cần effect đồng bộ, tránh render thừa.
  const passengers = booking?.passengers ?? [];
  const [changes, setChanges] = useState([]);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [inviteFor, setInviteFor] = useState(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [changeFor, setChangeFor] = useState(null);

  const bookingId = booking?.id ?? null;
  const [changesLoaded, setChangesLoaded] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  // Chưa có bookingId ⇒ không cần tải lịch sử thay đổi.
  const loadingChanges = Boolean(bookingId) && !changesLoaded;

  useEffect(() => {
    if (!bookingId) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const data = await getPassengerChanges(bookingId);
        if (cancelled) return;
        setChanges(Array.isArray(data) ? data : (data?.content ?? []));
      } catch {
        if (!cancelled) setChanges([]);
      } finally {
        if (!cancelled) setChangesLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [bookingId, reloadKey]);

  const reloadChanges = () => setReloadKey((k) => k + 1);

  const handleInvite = async () => {
    if (!inviteFor) return;
    setBusyId(inviteFor.id);
    setError("");
    setNotice("");
    try {
      await sendPassengerInvitation(booking.id, inviteFor.id, inviteEmail.trim() || undefined);
      setNotice(`Đã gửi lời mời tới ${inviteEmail.trim() || inviteFor.email}. Lời mời hết hạn sau 24 giờ.`);
      setInviteFor(null);
      setInviteEmail("");
      onChanged?.();
    } catch (err) {
      setError(err?.message || "Không gửi được lời mời.");
    } finally {
      setBusyId(null);
    }
  };

  const handleRequestChange = async (payload) => {
    if (!changeFor) return;
    setBusyId(changeFor.id);
    setError("");
    setNotice("");
    try {
      await requestPassengerChange(booking.id, changeFor.id, payload);
      setNotice("Đã gửi yêu cầu thay đổi hành khách. Đối tác sẽ xem xét và phản hồi.");
      setChangeFor(null);
      setReloadKey((k) => k + 1);
      onChanged?.();
    } catch (err) {
      setError(err?.message || "Không gửi được yêu cầu thay đổi hành khách.");
    } finally {
      setBusyId(null);
    }
  };

  if (!passengers || passengers.length === 0) {
    return (
      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <h2 className="text-base font-bold text-gray-900 dark:text-white">Hành khách</h2>
        <p className="mt-3 text-sm text-gray-500">Chưa có thông tin hành khách.</p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-bold text-gray-900 dark:text-white">
          Hành khách trong nhóm
        </h2>
        <span className="rounded-full bg-gray-100 px-3 py-1 text-[11px] font-bold text-gray-700 dark:bg-gray-800 dark:text-gray-300">
          {passengers.length} người · {booking?.slotCount ?? 0} chỗ
        </span>
      </div>

      {error && (
        <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-xs text-red-700">
          {error}
        </div>
      )}
      {notice && (
        <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs text-emerald-700">
          {notice}
        </div>
      )}

      <ul className="mt-4 space-y-2.5">
        {passengers.map((p) => {
          const replaced = p.status === "REPLACED";
          const linked = Boolean(p.hasAccount);
          return (
            <li
              key={p.id}
              className={`rounded-xl border px-4 py-3 ${
                replaced
                  ? "border-gray-200 bg-gray-50 opacity-70 dark:border-gray-800 dark:bg-gray-800/40"
                  : "border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-800/60"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-gray-900 dark:text-white">
                    {p.fullName}
                    {p.bookingCustomer && (
                      <span className="ml-2 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                        Người đặt
                      </span>
                    )}
                    {replaced && (
                      <span className="ml-2 rounded-full bg-gray-200 px-2 py-0.5 text-[10px] font-semibold text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                        Đã thay thế
                      </span>
                    )}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-500">
                    {GUEST_LABELS[p.guestType] ?? p.guestType}
                    {p.ageAtExperience != null ? ` · ${p.ageAtExperience} tuổi tại ngày đi` : ""}
                    {p.email ? ` · ${p.email}` : ""}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <span className="font-mono text-sm font-bold text-gray-900 dark:text-white">
                    {formatVND(p.price)}
                  </span>
                  {linked ? (
                    <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                      <CheckCircle2 size={11} /> Đã liên kết
                    </span>
                  ) : null}
                </div>
              </div>

              {canManage && !replaced && !p.bookingCustomer && (
                <div className="mt-2.5 flex flex-wrap gap-2 border-t border-gray-200/70 pt-2.5 dark:border-gray-700/60">
                  {!linked && (
                    <button
                      type="button"
                      onClick={() => {
                        setInviteFor(p);
                        setInviteEmail(p.email ?? "");
                      }}
                      className="flex items-center gap-1.5 rounded-lg border border-blue-200 px-3 py-1.5 text-[11px] font-bold text-blue-700 hover:bg-blue-50 dark:border-blue-900 dark:text-blue-300 dark:hover:bg-blue-900/40"
                    >
                      <Mail size={12} /> Gửi lời mời
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setChangeFor(p)}
                    className="flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-[11px] font-bold text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
                  >
                    <RefreshCw size={12} /> Thay hành khách này
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {/* ── Lịch sử yêu cầu thay đổi ── */}
      {changes.length > 0 && (
        <div className="mt-5 border-t border-gray-100 pt-4 dark:border-gray-800">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">
            Lịch sử yêu cầu thay đổi hành khách
          </h3>
          <ul className="mt-3 space-y-2.5">
            {changes.map((c) => {
              const meta = CHANGE_STATUS_META[c.status] ?? CHANGE_STATUS_META.PENDING;
              return (
                <li
                  key={c.id}
                  className="rounded-xl bg-gray-50 px-4 py-3 dark:bg-gray-800/60"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-gray-900 dark:text-white">
                      {c.passengerName ?? `Hành khách #${c.passengerId}`}
                    </p>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${meta.cls}`}
                    >
                      {meta.label}
                    </span>
                  </div>
                  {c.reason && (
                    <p className="mt-1 text-[11px] text-gray-600 dark:text-gray-400">
                      Lý do: {c.reason}
                    </p>
                  )}
                  {c.priceDelta != null && Number(c.priceDelta) !== 0 && (
                    <p className="mt-1 text-[11px] font-semibold text-amber-600">
                      Chênh lệch giá: {formatVND(c.priceDelta)}
                    </p>
                  )}
                  <p className="mt-1 text-[10px] text-gray-400">
                    Gửi lúc {formatDateTimeVN(c.createdAt)}
                    {c.processedAt ? ` · Xử lý lúc ${formatDateTimeVN(c.processedAt)}` : ""}
                  </p>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {loadingChanges && (
        <p className="mt-3 flex items-center gap-2 text-xs text-gray-500">
          <Loader2 size={12} className="animate-spin" /> Đang tải lịch sử thay đổi...
        </p>
      )}

      {/* ── Modal gửi lời mời ── */}
      {inviteFor && (
        <Modal title="Gửi lời mời tham gia tour" onClose={() => setInviteFor(null)}>
          <p className="text-xs text-gray-600 dark:text-gray-400">
            Lời mời sẽ được gửi tới <strong>{inviteFor.fullName}</strong>. Người nhận cần đăng nhập
            hoặc đăng ký bằng đúng email này để xác nhận tham gia. Lời mời hết hạn sau 24 giờ.
          </p>
          <label className="mt-3 block text-[11px] font-semibold text-gray-600 dark:text-gray-400">
            Email nhận lời mời
          </label>
          <input
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="email@vidu.vn"
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          />
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={handleInvite}
              disabled={busyId === inviteFor.id}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {busyId === inviteFor.id ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <UserPlus size={13} />
              )}
              Gửi lời mời
            </button>
            <button
              type="button"
              onClick={() => setInviteFor(null)}
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-xs font-bold text-gray-700 dark:border-gray-600 dark:text-gray-200"
            >
              Đóng
            </button>
          </div>
        </Modal>
      )}

      {/* ── Modal yêu cầu thay đổi hành khách ── */}
      {changeFor && (
        <ChangePassengerModal
          passenger={changeFor}
          onClose={() => setChangeFor(null)}
          onSubmit={handleRequestChange}
          loading={busyId === changeFor.id}
        />
      )}
    </section>
  );
}

/**
 * Modal nhập thông tin hành khách thay thế.
 */
function ChangePassengerModal({ passenger, onClose, onSubmit, loading }) {
  const [form, setForm] = useState({
    fullName: "",
    birthDate: "",
    gender: "",
    email: "",
    reason: "",
  });
  const [localError, setLocalError] = useState("");

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = () => {
    setLocalError("");
    if (!form.fullName.trim() || !form.birthDate || !form.gender) {
      setLocalError("Vui lòng điền họ tên, ngày sinh và giới tính của hành khách mới.");
      return;
    }
    onSubmit({
      fullName: form.fullName.trim(),
      birthDate: form.birthDate,
      gender: form.gender,
      email: form.email.trim() || null,
      reason: form.reason.trim() || null,
    });
  };

  return (
    <Modal title={`Thay hành khách: ${passenger.fullName}`} onClose={onClose}>
      {localError && (
        <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-[11px] text-red-700">{localError}</p>
      )}
      <p className="mb-3 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
        <AlertTriangle size={13} className="mt-0.5 shrink-0" />
        Yêu cầu sẽ được gửi tới đối tác. Nếu loại khách thay đổi làm chênh lệch giá, đối tác phải
        xử lý phần chênh lệch trước khi duyệt.
      </p>

      <Field label="Họ và tên hành khách mới" required>
        <input
          type="text"
          value={form.fullName}
          onChange={set("fullName")}
          className={inputCls}
        />
      </Field>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <Field label="Ngày sinh" required>
          <input
            type="date"
            value={form.birthDate}
            onChange={set("birthDate")}
            className={inputCls}
          />
        </Field>
        <Field label="Giới tính" required>
          <select value={form.gender} onChange={set("gender")} className={inputCls}>
            <option value="">-- Chọn --</option>
            <option value="MALE">Nam</option>
            <option value="FEMALE">Nữ</option>
            <option value="OTHER">Khác</option>
          </select>
        </Field>
      </div>
      <div className="mt-3">
        <Field label="Email (nếu là người lớn)">
          <input type="email" value={form.email} onChange={set("email")} className={inputCls} />
        </Field>
      </div>
      <div className="mt-3">
        <Field label="Lý do thay đổi">
          <textarea
            value={form.reason}
            onChange={set("reason")}
            rows={2}
            maxLength={1000}
            placeholder="Nêu rõ lý do thay hành khách..."
            className={inputCls}
          />
        </Field>
      </div>

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={submit}
          disabled={loading}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
          Gửi yêu cầu
        </button>
        <button
          type="button"
          onClick={onClose}
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-xs font-bold text-gray-700 dark:border-gray-600 dark:text-gray-200"
        >
          Đóng
        </button>
      </div>
    </Modal>
  );
}

const inputCls =
  "mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white";

function Field({ label, required, children }) {
  return (
    <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-400">
      {label} {required && <span className="text-red-500">*</span>}
      {children}
    </label>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-base font-bold text-gray-900 dark:text-white">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800"
          >
            <XCircle size={18} />
          </button>
        </div>
        <div className="mt-3">{children}</div>
      </div>
    </div>
  );
}
