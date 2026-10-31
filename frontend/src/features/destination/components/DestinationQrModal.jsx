"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Copy, Download, Printer, QrCode, RefreshCw, X } from "lucide-react";
import { destinationService } from "../services/destinationService";
import { useConfirm } from "@/components/ui/ConfirmDialog";

const POSTER_WIDTH = 1240; // ~A5 dọc ở 150 dpi, đủ nét để in
const POSTER_HEIGHT = 1754;

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/** Ngắt dòng tiêu đề dài cho canvas. */
function wrapLines(ctx, text, maxWidth) {
  const words = text.split(" ");
  const lines = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines.slice(0, 3);
}

/**
 * Dựng tấm QR để in dán tại cổng điểm đến: tên điểm đến, mã QR, mã nhập tay và hướng dẫn.
 * Ảnh QR sinh ngay trên trình duyệt; mã check-in không bị gửi sang dịch vụ bên ngoài.
 */
async function buildPoster(name, token) {
  const qrUrl = await QRCode.toDataURL(token, { width: 820, margin: 1, errorCorrectionLevel: "M" });
  const qr = await loadImage(qrUrl);

  const canvas = document.createElement("canvas");
  canvas.width = POSTER_WIDTH;
  canvas.height = POSTER_HEIGHT;
  const ctx = canvas.getContext("2d");
  const font = '"Segoe UI", "Helvetica Neue", Arial, sans-serif';
  const cx = POSTER_WIDTH / 2;

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, POSTER_WIDTH, POSTER_HEIGHT);

  // Dải đầu màu ngọc di sản
  const grad = ctx.createLinearGradient(0, 0, POSTER_WIDTH, 0);
  grad.addColorStop(0, "#00A86B");
  grad.addColorStop(1, "#0288D1");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, POSTER_WIDTH, 300);

  ctx.textAlign = "center";
  ctx.fillStyle = "#ffffff";
  ctx.font = `700 46px ${font}`;
  ctx.fillText("JOURNEYGO · CHECK-IN DI SẢN", cx, 120);
  ctx.font = `500 34px ${font}`;
  ctx.fillText("Quét mã để check-in và mở khóa câu chuyện văn hóa", cx, 200);

  ctx.fillStyle = "#0F172A";
  ctx.font = `800 64px ${font}`;
  const lines = wrapLines(ctx, name, POSTER_WIDTH - 160);
  lines.forEach((l, i) => ctx.fillText(l, cx, 410 + i * 80));

  const qrTop = 410 + lines.length * 80 + 30;
  ctx.drawImage(qr, cx - 410, qrTop, 820, 820);

  ctx.fillStyle = "#64748B";
  ctx.font = `500 32px ${font}`;
  ctx.fillText("Không quét được? Nhập mã:", cx, qrTop + 900);
  ctx.fillStyle = "#0F172A";
  ctx.font = `700 52px "Consolas", "Courier New", monospace`;
  ctx.fillText(token, cx, qrTop + 970);

  ctx.fillStyle = "#64748B";
  ctx.font = `400 30px ${font}`;
  ctx.fillText("Ứng dụng JourneyGo → Hành trình → Quét mã QR", cx, POSTER_HEIGHT - 70);

  return canvas.toDataURL("image/png");
}

function fileName(name) {
  const slug = name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
  return `qr-checkin-${slug || "diem-den"}.png`;
}

/** Mã QR check-in của một điểm đến: xem, tải ảnh để in, in trực tiếp, tạo mã mới. */
export default function DestinationQrModal({ destination, onClose }) {
  const [qr, setQr] = useState(null);
  const [poster, setPoster] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const { confirm, confirmDialog } = useConfirm();

  useEffect(() => {
    let active = true;
    destinationService
      .getQr(destination.id)
      .then(async (data) => {
        const image = await buildPoster(data.destinationName || destination.name, data.qrToken);
        if (!active) return;
        setQr(data);
        setPoster(image);
      })
      .catch((err) => active && setError(err?.message || "Không tải được mã QR."));
    return () => {
      active = false;
    };
  }, [destination.id, destination.name]);

  async function regenerate() {
    const ok = await confirm({
      tone: "warning",
      icon: "restore",
      title: "Tạo mã QR mới?",
      subject: destination.name,
      description: "Mã cũ sẽ hết hiệu lực ngay, bạn cần in và dán lại QR mới tại điểm đến.",
      confirmLabel: "Tạo mã mới",
    });
    if (!ok) return;
    setBusy(true);
    setError("");
    try {
      const data = await destinationService.regenerateQr(destination.id);
      setPoster(await buildPoster(data.destinationName || destination.name, data.qrToken));
      setQr(data);
    } catch (err) {
      setError(err?.message || "Không tạo được mã mới.");
    } finally {
      setBusy(false);
    }
  }

  function print() {
    const win = window.open("", "_blank");
    if (!win) {
      setError("Trình duyệt đã chặn cửa sổ in. Hãy cho phép popup hoặc dùng nút Tải ảnh.");
      return;
    }
    win.document.write(
      `<!doctype html><html><head><title>${fileName(qr.destinationName || destination.name)}</title>` +
        `<style>@page{margin:10mm}body{margin:0;display:flex;justify-content:center}img{max-width:100%;max-height:100vh}</style>` +
        `</head><body><img src="${poster}" onload="window.focus();window.print()"></body></html>`,
    );
    win.document.close();
  }

  async function copyToken() {
    try {
      await navigator.clipboard.writeText(qr.qrToken);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard bị chặn: người dùng vẫn đọc được mã trên màn hình */
    }
  }

  const ready = qr && poster;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="flex max-h-[94vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-6 py-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
              <QrCode size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Mã QR check-in</h2>
              <p className="text-xs text-slate-500">{destination.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Đóng"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200"
          >
            <X size={16} />
          </button>
        </div>

        <div className="grid flex-1 gap-6 overflow-y-auto p-6 md:grid-cols-[1fr_260px]">
          <div className="flex items-center justify-center rounded-2xl bg-slate-50 p-4">
            {ready ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={poster} alt={`Mã QR check-in ${destination.name}`} className="max-h-[60vh] rounded-lg shadow-md" />
            ) : error ? null : (
              <div className="h-80 w-56 animate-pulse rounded-lg bg-slate-200" />
            )}
            {error && !ready && <p className="text-sm text-rose-700">{error}</p>}
          </div>

          <div className="space-y-4 text-sm">
            <div>
              <p className="text-xs font-bold text-slate-500">Mã nhập tay</p>
              <div className="mt-1 flex items-center gap-2">
                <code className="flex-1 rounded-lg bg-slate-100 px-3 py-2 font-mono text-sm font-bold text-slate-900">
                  {qr?.qrToken ?? "…"}
                </code>
                <button
                  onClick={copyToken}
                  disabled={!ready}
                  title="Sao chép mã"
                  className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                >
                  <Copy size={16} />
                </button>
              </div>
              {copied && <p className="mt-1 text-xs text-emerald-700">Đã sao chép.</p>}
            </div>

            <ul className="list-disc space-y-1.5 pl-4 text-slate-600">
              <li>In và dán tại cổng hoặc nơi dễ thấy của điểm đến.</li>
              <li>Du khách quét bằng ứng dụng JourneyGo để check-in khi GPS yếu (trong nhà, hang động, bảo tàng).</li>
              <li>Không chia sẻ mã lên mạng. Nếu bị lộ, hãy tạo mã mới và in lại.</li>
            </ul>

            <div className="space-y-2">
              <a
                href={ready ? poster : undefined}
                download={fileName(qr?.destinationName || destination.name)}
                aria-disabled={!ready}
                className={`flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-2.5 font-bold text-white hover:bg-emerald-700 ${
                  ready ? "" : "pointer-events-none opacity-50"
                }`}
              >
                <Download size={16} /> Tải ảnh để in
              </a>
              <button
                onClick={print}
                disabled={!ready}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 py-2.5 font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                <Printer size={16} /> In ngay
              </button>
              <button
                onClick={regenerate}
                disabled={!ready || busy}
                className="flex w-full items-center justify-center gap-2 rounded-xl py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50"
              >
                <RefreshCw size={14} className={busy ? "animate-spin" : ""} />
                {busy ? "Đang tạo mã mới..." : "Tạo mã mới (vô hiệu mã cũ)"}
              </button>
            </div>
            {error && ready && <p className="rounded-lg bg-rose-50 p-2 text-xs text-rose-700">{error}</p>}
          </div>
        </div>
      </div>
      {confirmDialog}
    </div>
  );
}
