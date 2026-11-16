"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, AlertTriangle, CheckCircle2, Ticket, LogIn } from "lucide-react";
import { ROUTES } from "@/constants/routes";
import TouristShell from "./TouristShell";
import { touristService } from "../services/touristService";
import { useTouristSession } from "../hooks/useTouristSession";
import { loginHref } from "../utils";

/**
 * Trang /invitations/[token] — xác nhận lời mời tham gia tour (deep link từ email).
 *
 * ⚠️ Email hiện trỏ về app di động (`journeygo://booking/invitations/accept?token=…`).
 * Trang này là bản web tương ứng — nếu người dùng mở link web, ta vẫn xác nhận được.
 *
 * ⚠️ Chưa đăng nhập ⇒ hiện nút đăng nhập (giữ token trong URL để quay lại sau khi
 * đăng nhập) thay vì báo lỗi.
 */
export default function InvitationAcceptScreen({ token }) {
  return (
    <TouristShell>
      <InvitationAcceptContent token={token} />
    </TouristShell>
  );
}

function InvitationAcceptContent({ token }) {
  const router = useRouter();
  const { ready, isTourist } = useTouristSession();
  const [state, setState] = useState({ loading: true, invitation: null, error: "" });
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!ready) return undefined;
    // Chưa đăng nhập ⇒ không gọi API (endpoint yêu cầu token).
    if (!isTourist) return undefined;
    let alive = true;
    touristService.invitationByToken(token)
      .then((inv) => alive && setState({ loading: false, invitation: inv, error: "" }))
      .catch((err) => alive && setState({
        loading: false, invitation: null,
        error: err?.message || "Lời mời không hợp lệ hoặc đã hết hạn.",
      }));
    return () => { alive = false; };
  }, [token, ready, isTourist]);

  const accept = async () => {
    setBusy(true); setActionError("");
    try {
      await touristService.acceptInvitation(token);
      setDone(true);
    } catch (err) {
      setActionError(err?.message || "Không xác nhận được lời mời.");
    } finally {
      setBusy(false);
    }
  };

  if (!ready || state.loading) {
    return (
      <p className="flex justify-center gap-2 py-24 text-sm text-slate-500">
        <Loader2 size={18} className="animate-spin" />Đang tải…
      </p>
    );
  }

  // Chưa đăng nhập ⇒ mời đăng nhập, giữ nguyên URL để quay lại.
  if (!isTourist) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-teal-50 text-teal-700">
          <LogIn size={24} />
        </span>
        <h1 className="mt-4 text-xl font-extrabold text-slate-900">Bạn cần đăng nhập</h1>
        <p className="mt-2 text-sm text-slate-600">
          Lời mời này dành cho tài khoản có email đã được mời. Đăng nhập để xác nhận tham gia tour.
        </p>
        <Link
          href={`${loginHref(ROUTES.INVITATION(token))}?next=${encodeURIComponent(ROUTES.INVITATION(token))}`}
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-teal-700 px-5 py-2.5 text-sm font-bold text-white hover:bg-teal-800"
        >
          <LogIn size={16} />Đăng nhập để xác nhận
        </Link>
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-rose-50 text-rose-600">
          <AlertTriangle size={24} />
        </span>
        <h1 className="mt-4 text-xl font-extrabold text-slate-900">Không thể mở lời mời</h1>
        <p className="mt-2 text-sm text-slate-600">{state.error}</p>
        <Link
          href={ROUTES.TRIPS}
          className="mt-5 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-700 hover:border-teal-300"
        >
          <Ticket size={16} />Xem chuyến đi của tôi
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-50 text-emerald-600">
          <CheckCircle2 size={26} />
        </span>
        <h1 className="mt-4 text-xl font-extrabold text-slate-900">Đã xác nhận tham gia tour</h1>
        <p className="mt-2 text-sm text-slate-600">
          Bạn đã được thêm vào đơn. Ngày đi tour, hãy mở app JourneyGo bằng cùng tài khoản để check-in.
        </p>
        <button
          type="button"
          onClick={() => router.push(ROUTES.TRIPS)}
          className="mt-5 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-teal-700 px-5 py-2.5 text-sm font-bold text-white hover:bg-teal-800"
        >
          <Ticket size={16} />Xem chuyến đi của tôi
        </button>
      </div>
    );
  }

  const inv = state.invitation;

  return (
    <div className="mx-auto max-w-md px-4 py-20">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 text-center">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-teal-50 text-teal-700">
          <Ticket size={24} />
        </span>
        <h1 className="mt-4 text-xl font-extrabold text-slate-900">Lời mời tham gia tour</h1>
        <p className="mt-2 text-sm text-slate-600">
          Bạn được mời tham gia tour dưới tên <b className="text-slate-900">{inv?.passengerName || "hành khách"}</b>.
        </p>

        {inv?.usable ? (
          <>
            {actionError && (
              <p role="alert" className="mt-4 flex items-start gap-1.5 rounded-xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">
                <AlertTriangle size={15} className="mt-0.5 shrink-0" />{actionError}
              </p>
            )}
            <button
              type="button"
              onClick={accept}
              disabled={busy}
              className="mt-5 inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-teal-700 px-5 py-3 text-sm font-bold text-white hover:bg-teal-800 disabled:opacity-60"
            >
              {busy ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
              Xác nhận tham gia tour
            </button>
          </>
        ) : (
          <p className="mt-4 rounded-xl bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-600">
            Lời mời này đã hết hạn hoặc không còn hiệu lực.
          </p>
        )}
      </div>
    </div>
  );
}
