"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, AlertTriangle, UserPlus, UserCog, Send, X, CheckCircle2 } from "lucide-react";
import { touristService } from "../services/touristService";
import { dateTime, vnd } from "../utils";

const GENDER = { MALE: "Nam", FEMALE: "Nữ", OTHER: "Khác" };

/** Trạng thái lời mời tham gia nhóm (enum `InvitationStatus` ở backend). */
const INVITATION_STATUS = {
  PENDING: { label: "Đã gửi lời mời — chờ xác nhận", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  ACCEPTED: { label: "Đã xác nhận tham gia", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  EXPIRED: { label: "Lời mời đã hết hạn", cls: "bg-slate-100 text-slate-600 border-slate-200" },
  REVOKED: { label: "Lời mời đã thu hồi", cls: "bg-rose-50 text-rose-700 border-rose-200" },
};

/** Trạng thái yêu cầu đổi hành khách (enum `PassengerChangeStatus` ở backend). */
const CHANGE_STATUS = {
  PENDING: { label: "Chờ nhà tour duyệt", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  APPROVED: { label: "Đã được duyệt", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  REJECTED: { label: "Bị từ chối", cls: "bg-rose-50 text-rose-700 border-rose-200" },
};

const input = "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20";

/**
 * Khối quản lý nhóm hành khách trong chi tiết đơn:
 *  • Mời hành khách người lớn tham gia (người đặt là người mời)
 *  • Gửi yêu cầu thay đổi thông tin hành khách (đối tác duyệt)
 *
 * ⚠️ Backend chỉ cho NGƯỜI ĐẶT gửi lời mời / yêu cầu đổi ⇒ các nút chỉ hiện khi
 * `isOwner` (đơn do chính người xem đặt).
 */
export default function PassengerGroupPanel({ booking, isOwner }) {
  const [passengers, setPassengers] = useState(booking?.passengers || []);
  const [changes, setChanges] = useState([]);
  const [invitingId, setInvitingId] = useState(null);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [changingId, setChangingId] = useState(null);
  const [changeForm, setChangeForm] = useState({ fullName: "", birthDate: "", gender: "MALE", email: "", reason: "" });

  const active = useCallback(() => (passengers || []).filter((p) => p.status !== "REVOKED" && p.status !== "REPLACED"), [passengers]);

  useEffect(() => {
    if (!booking?.id) return;
    let alive = true;
    touristService.bookingPassengers(booking.id)
      .then((list) => alive && setPassengers(list || []))
      .catch(() => {});
    touristService.bookingChangeRequests(booking.id)
      .then((list) => alive && setChanges(list || []))
      .catch(() => {});
    return () => { alive = false; };
  }, [booking?.id]);

  const invite = async (passenger) => {
    setBusy(`invite-${passenger.id}`); setError("");
    try {
      await touristService.invitePassenger(booking.id, passenger.id, email.trim() || null);
      setInvitingId(null); setEmail("");
      setNotice(`Đã gửi lời mời tới ${passenger.fullName}. Lời mời hết hạn sau 24 giờ.`);
      const list = await touristService.bookingPassengers(booking.id);
      setPassengers(list || []);
    } catch (err) {
      setError(err?.message || "Không gửi được lời mời.");
    } finally {
      setBusy("");
    }
  };

  const submitChange = async (e, passenger) => {
    e.preventDefault();
    const f = changeForm;
    if (!f.fullName.trim()) { setError("Vui lòng nhập họ tên hành khách mới."); return; }
    if (!f.birthDate) { setError("Vui lòng nhập ngày sinh hành khách mới."); return; }
    setBusy(`change-${passenger.id}`); setError("");
    try {
      await touristService.requestPassengerChange(booking.id, passenger.id, {
        fullName: f.fullName.trim(),
        birthDate: f.birthDate,
        gender: f.gender,
        email: f.email.trim() || "",
        reason: f.reason.trim() || null,
      });
      setChangingId(null);
      setChangeForm({ fullName: "", birthDate: "", gender: "MALE", email: "", reason: "" });
      setNotice("Đã gửi yêu cầu thay đổi hành khách. Nhà tour sẽ duyệt hoặc từ chối.");
      const list = await touristService.bookingChangeRequests(booking.id);
      setChanges(list || []);
    } catch (err) {
      setError(err?.message || "Không gửi được yêu cầu.");
    } finally {
      setBusy("");
    }
  };

  const rows = active();
  /** Hành khách có thể mời: không phải người đặt, chưa có lời mời đang hiệu lực. */
  const canInvite = (p) => isOwner && !p.bookingCustomer && p.invitationStatus !== "PENDING" && p.invitationStatus !== "ACCEPTED";
  /** Hành khách có thể gửi yêu cầu thay đổi: không phải người đặt. */
  const canChange = (p) => isOwner && !p.bookingCustomer;

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5" aria-labelledby="group-title">
      <h2 id="group-title" className="flex items-center gap-2 font-extrabold text-slate-900">
        <UserPlus size={17} className="text-teal-700" />Nhóm hành khách ({rows.length})
      </h2>
      <p className="mt-1 text-sm text-slate-500">
        {isOwner
          ? "Mời người lớn khác cùng đi tour, hoặc gửi yêu cầu thay đổi thông tin hành khách khi cần."
          : "Danh sách người cùng đi tour. Bạn được mời tham gia nên không thể tự thêm hoặc đổi thông tin hành khách."}
      </p>

      {notice && (
        <p role="status" className="mt-3 flex items-start gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
          <CheckCircle2 size={15} className="mt-0.5 shrink-0" />{notice}
        </p>
      )}
      {error && (
        <p role="alert" className="mt-3 flex items-start gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">
          <AlertTriangle size={15} className="mt-0.5 shrink-0" />{error}
        </p>
      )}

      <ul className="mt-4 divide-y divide-slate-100">
        {rows.map((p) => {
          const inv = INVITATION_STATUS[p.invitationStatus];
          return (
            <li key={p.id} className="py-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-bold text-slate-900">
                    {p.fullName}
                    {p.bookingCustomer && (
                      <span className="ml-1 rounded-full bg-orange-50 px-2 py-0.5 text-[11px] font-bold text-orange-700">Người đặt</span>
                    )}
                  </p>
                  <p className="text-xs text-slate-500">
                    {p.guestTypeLabel} · {GENDER[p.gender] || p.gender}
                    {p.ageAtExperience != null ? ` · ${p.ageAtExperience} tuổi` : ""}
                    {p.email ? ` · ${p.email}` : ""}
                  </p>
                  {inv && (
                    <span className={`mt-1.5 inline-block rounded-md border px-2 py-0.5 text-[11px] font-bold ${inv.cls}`}>{inv.label}</span>
                  )}
                </div>
                <span className="shrink-0 tabular-nums text-slate-700">{vnd(p.price)}</span>
              </div>

              {isOwner && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {canInvite(p) && (
                    <button
                      type="button"
                      onClick={() => { setInvitingId(invitingId === p.id ? null : p.id); setError(""); }}
                      className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 hover:border-teal-300 hover:text-teal-700"
                    >
                      <Send size={13} />Mời tham gia
                    </button>
                  )}
                  {canChange(p) && (
                    <button
                      type="button"
                      onClick={() => { setChangingId(changingId === p.id ? null : p.id); setError(""); }}
                      className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 hover:border-amber-300 hover:text-amber-700"
                    >
                      <UserCog size={13} />Yêu cầu thay đổi
                    </button>
                  )}
                </div>
              )}

              {invitingId === p.id && (
                <div className="mt-2.5 rounded-xl border border-teal-200 bg-teal-50/50 p-3">
                  <label htmlFor={`invite-email-${p.id}`} className="mb-1 block text-xs font-bold text-slate-700">
                    Email nhận lời mời (để trống nếu dùng email đã khai báo)
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <input
                      id={`invite-email-${p.id}`}
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="email@example.com"
                      className={`${input} flex-1 min-w-[180px]`}
                    />
                    <button
                      type="button"
                      onClick={() => invite(p)}
                      disabled={busy === `invite-${p.id}`}
                      className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-teal-700 px-4 py-2 text-xs font-bold text-white hover:bg-teal-800 disabled:opacity-60"
                    >
                      {busy === `invite-${p.id}` && <Loader2 size={13} className="animate-spin" />}
                      Gửi lời mời
                    </button>
                    <button
                      type="button"
                      onClick={() => setInvitingId(null)}
                      aria-label="Huỷ"
                      className="grid h-8 w-8 cursor-pointer place-items-center rounded-xl border border-slate-200 text-slate-500"
                    >
                      <X size={14} />
                    </button>
                  </div>
                  <p className="mt-1.5 text-[11px] text-slate-500">
                    Lời mời hết hạn sau 24 giờ, chỉ dùng một lần. Người được mời phải đăng nhập bằng đúng email này.
                  </p>
                </div>
              )}

              {changingId === p.id && (
                <form onSubmit={(e) => submitChange(e, p)} className="mt-2.5 space-y-2 rounded-xl border border-amber-200 bg-amber-50/50 p-3">
                  <p className="text-xs font-bold text-slate-700">Thông tin hành khách thay thế</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <input
                      aria-label="Họ tên hành khách mới"
                      placeholder="Họ và tên"
                      maxLength={120}
                      value={changeForm.fullName}
                      onChange={(e) => setChangeForm((f) => ({ ...f, fullName: e.target.value }))}
                      className={input}
                    />
                    <input
                      aria-label="Ngày sinh hành khách mới"
                      type="date"
                      value={changeForm.birthDate}
                      onChange={(e) => setChangeForm((f) => ({ ...f, birthDate: e.target.value }))}
                      className={input}
                    />
                    <select
                      aria-label="Giới tính"
                      value={changeForm.gender}
                      onChange={(e) => setChangeForm((f) => ({ ...f, gender: e.target.value }))}
                      className={input}
                    >
                      {Object.entries(GENDER).map(([k, label]) => (
                        <option key={k} value={k}>{label}</option>
                      ))}
                    </select>
                    <input
                      aria-label="Email hành khách mới"
                      type="email"
                      placeholder="Email (bắt buộc nếu là người lớn)"
                      value={changeForm.email}
                      onChange={(e) => setChangeForm((f) => ({ ...f, email: e.target.value }))}
                      className={input}
                    />
                  </div>
                  <textarea
                    aria-label="Lý do thay đổi"
                    rows={2}
                    maxLength={1000}
                    placeholder="Lý do thay đổi (không bắt buộc)"
                    value={changeForm.reason}
                    onChange={(e) => setChangeForm((f) => ({ ...f, reason: e.target.value }))}
                    className={`${input} resize-none`}
                  />
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="submit"
                      disabled={busy === `change-${p.id}`}
                      className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-amber-600 px-4 py-2 text-xs font-bold text-white hover:bg-amber-700 disabled:opacity-60"
                    >
                      {busy === `change-${p.id}` && <Loader2 size={13} className="animate-spin" />}
                      Gửi yêu cầu
                    </button>
                    <button
                      type="button"
                      onClick={() => setChangingId(null)}
                      className="cursor-pointer rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600"
                    >
                      Huỷ
                    </button>
                  </div>
                </form>
              )}
            </li>
          );
        })}
      </ul>

      {changes.length > 0 && (
        <div className="mt-4 border-t border-slate-100 pt-3">
          <h3 className="text-sm font-extrabold text-slate-900">Lịch sử yêu cầu thay đổi</h3>
          <ul className="mt-2 space-y-2">
            {changes.map((c) => {
              const st = CHANGE_STATUS[c.status] || CHANGE_STATUS.PENDING;
              return (
                <li key={c.id} className="rounded-xl border border-slate-200 p-3 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold text-slate-800">{c.passengerName || "Hành khách"}</p>
                    <span className={`rounded-md border px-2 py-0.5 text-[11px] font-bold ${st.cls}`}>{st.label}</span>
                  </div>
                  {c.reason && <p className="mt-1 text-xs text-slate-600">Lý do: {c.reason}</p>}
                  {c.priceDelta != null && Number(c.priceDelta) !== 0 && (
                    <p className="mt-1 text-xs text-slate-600">
                      Chênh lệch giá: <b className="tabular-nums">{vnd(c.priceDelta)}</b>
                    </p>
                  )}
                  <p className="mt-1 text-xs text-slate-400">Gửi lúc {dateTime(c.createdAt)}</p>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}
