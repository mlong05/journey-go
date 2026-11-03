"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Download, MapPin, Printer, QrCode, RefreshCw, X } from "lucide-react";
import { checkInPointService } from "../services/checkInPointService";
import { useConfirm } from "@/components/ui/ConfirmDialog";

function slug(text) {
  return String(text || "tram")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

function escapeHtml(text) {
  return String(text ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

/** Gắn ảnh QR (sinh trên trình duyệt) vào từng trạm; mã trạm không gửi ra dịch vụ bên ngoài. */
async function withImages(points) {
  return Promise.all(
    points.map(async (p) => ({
      ...p,
      image: p.qrToken
        ? await QRCode.toDataURL(p.qrToken, { width: 900, margin: 3, errorCorrectionLevel: "M" })
        : "",
    })),
  );
}

/**
 * QR các trạm check-in của một trải nghiệm: xem, tải từng ảnh, in tất cả, đổi mã (vô hiệu mã cũ).
 * Đổi mã được cả khi trải nghiệm đã xuất bản (POST /check-in-points/{id}/qr/regenerate).
 */
export default function StationQrSheetModal({ experience, onClose }) {
  const [stations, setStations] = useState(null);
  const { confirm, confirmDialog } = useConfirm();
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    let active = true;
    checkInPointService
      .listByExperience(experience.id)
      .then((list) => withImages([...list].sort((a, b) => (a.sequenceOrder ?? 0) - (b.sequenceOrder ?? 0))))
      .then((list) => active && setStations(list))
      .catch((err) => active && setError(err?.message || "Không tải được danh sách trạm."));
    return () => {
      active = false;
    };
  }, [experience.id]);

  async function regenerate(station) {
    const ok = await confirm({
      tone: "warning",
      icon: "restore",
      title: "Đổi mã QR của trạm?",
      subject: station.name,
      description: "Mã cũ hết hiệu lực ngay, bạn cần in lại QR tại trạm.",
      confirmLabel: "Đổi mã",
    });
    if (!ok) return;
    setBusyId(station.id);
    setError("");
    try {
      const updated = await checkInPointService.regenerateQr(station.id);
      const [withImage] = await withImages([updated]);
      setStations((prev) => prev.map((s) => (s.id === station.id ? withImage : s)));
    } catch (err) {
      setError(err?.message || "Không đổi được mã.");
    } finally {
      setBusyId(null);
    }
  }

  function printAll() {
    const win = window.open("", "_blank");
    if (!win) {
      setError("Trình duyệt đã chặn cửa sổ in. Hãy cho phép popup rồi thử lại.");
      return;
    }
    const pages = stations
      .filter((s) => s.image)
      .map(
        (s, i) => `<section>
          <p class="tag">JOURNEYGO · TRẠM ${i + 1}</p>
          <h1>${escapeHtml(s.name)}</h1>
          <p class="sub">${escapeHtml(experience.title)}</p>
          <img src="${s.image}" alt="">
          <p class="hint">Không quét được? Nhập mã:</p>
          <p class="code">${escapeHtml(s.qrToken)}</p>
        </section>`,
      )
      .join("");
    win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>QR các trạm</title><style>
      @page{size:A5;margin:12mm}
      body{margin:0;font-family:"Segoe UI",Arial,sans-serif;color:#0f172a;text-align:center}
      section{page-break-after:always;padding-top:4mm}
      .tag{color:#00a86b;font-weight:700;letter-spacing:.12em;font-size:12px;margin:0}
      h1{font-size:26px;margin:6px 0 2px}
      .sub{color:#64748b;margin:0 0 10px}
      img{width:95mm;height:95mm}
      .hint{color:#64748b;margin:8px 0 2px;font-size:13px}
      .code{font:700 20px Consolas,monospace;margin:0}
    </style></head><body>${pages}<script>window.onload=function(){window.focus();window.print()}</script></body></html>`);
    win.document.close();
  }

  const printable = (stations ?? []).filter((s) => s.image).length;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-6 py-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-50 text-sky-700">
              <QrCode size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">QR các trạm check-in</h2>
              <p className="text-xs text-slate-500">{experience.title}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={printAll}
              disabled={!printable}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              <Printer size={14} /> In tất cả ({printable})
            </button>
            <button
              onClick={onClose}
              aria-label="Đóng"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <p className="mb-4 rounded-xl bg-amber-50 p-3 text-xs leading-relaxed text-amber-900">
            Mỗi trạm có một mã riêng để du khách quét mở câu hỏi. Nếu mã bị lộ (chụp và chia sẻ lên mạng),
            hãy <b>Đổi mã</b> rồi in và dán lại tại trạm: mã cũ hết hiệu lực ngay.
          </p>
          {error && <p className="mb-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}

          {stations === null && !error && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-72 animate-pulse rounded-2xl bg-slate-100" />
              ))}
            </div>
          )}

          {stations?.length === 0 && (
            <p className="py-10 text-center text-sm text-slate-500">
              Trải nghiệm này chưa có trạm check-in nào. Trạm được tạo khi soạn nhiệm vụ có yêu cầu vị trí.
            </p>
          )}

          {stations?.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {stations.map((s, i) => (
                <div key={s.id} className="flex flex-col rounded-2xl border border-slate-200 p-4">
                  <p className="text-xs font-bold text-emerald-700">Trạm {i + 1}</p>
                  <p className="font-bold text-slate-900">{s.name}</p>
                  <p className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-500">
                    <MapPin size={11} /> {s.latitude}, {s.longitude} · {s.radiusMeters ?? 50} m
                  </p>
                  {s.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={s.image} alt={`QR ${s.name}`} className="mx-auto my-3 h-40 w-40" />
                  ) : (
                    <p className="my-3 rounded-lg bg-slate-50 p-3 text-center text-xs text-slate-500">
                      Bạn không có quyền xem mã của trạm này.
                    </p>
                  )}
                  <code className="rounded-lg bg-slate-100 px-2 py-1 text-center font-mono text-xs font-bold">
                    {s.qrToken ?? "—"}
                  </code>
                  <div className="mt-3 flex gap-2">
                    {s.image && (
                      <a
                        href={s.image}
                        download={`qr-tram-${i + 1}-${slug(s.name)}.png`}
                        className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-slate-200 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
                      >
                        <Download size={13} /> Tải ảnh
                      </a>
                    )}
                    <button
                      onClick={() => regenerate(s)}
                      disabled={busyId === s.id || !s.qrToken}
                      className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-rose-200 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                    >
                      <RefreshCw size={13} className={busyId === s.id ? "animate-spin" : ""} /> Đổi mã
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      {confirmDialog}
    </div>
  );
}
