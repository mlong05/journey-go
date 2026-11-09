"use client";

import React, { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Download, QrCode } from "lucide-react";

/** Mã QR mới cho trải nghiệm (cùng định dạng backend TourStopExperience.newQrToken): JGE- + 16 ký tự hex in hoa. */
export const newExperienceQrToken = () => {
  const hex = (globalThis.crypto?.randomUUID?.() || `${Date.now()}${Math.random()}`).replace(/[^0-9a-f]/gi, "");
  return `JGE-${hex.padEnd(16, "0").slice(0, 16).toUpperCase()}`;
};

const fileName = (label) => `QR-${(label || "trai-nghiem").normalize("NFD").replace(/[̀-ͯ]/g, "")
  .replace(/đ/g, "d").replace(/Đ/g, "D").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-+|-+$/g, "").toLowerCase() || "trai-nghiem"}.png`;

/**
 * Mã QR xác nhận hoàn thành trải nghiệm: đối tác in và dán tại điểm. Trên app, hết giờ đếm ngược khách quét mã
 * này rồi mới hiện câu hỏi sau trải nghiệm.
 * compact: ảnh nhỏ + mã + nút tải (dùng trong màn xem lại / duyệt và khi tour đã bán, nội dung chỉ xem).
 */
export default function ExperienceQr({ token, label, compact = false }) {
  const [src, setSrc] = useState("");

  useEffect(() => {
    let alive = true;
    if (!token) return undefined;
    QRCode.toDataURL(token, { width: 512, margin: 2, errorCorrectionLevel: "M" })
      .then((url) => { if (alive) setSrc(url); })
      .catch(() => { if (alive) setSrc(""); });
    return () => { alive = false; };
  }, [token]);

  if (!token) {
    return <p className="text-[11px] text-slate-400 italic">Mã QR sẽ được tạo khi lưu điểm đến.</p>;
  }

  if (compact) {
    return (
      <span className="inline-flex items-center gap-2.5">
        {src
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={src} alt={`Mã QR ${token}`} className="w-16 h-16 rounded border border-slate-200 bg-white" />
          : <span className="w-16 h-16 rounded border border-slate-200 bg-slate-50" />}
        <span className="text-[11px] text-slate-500">
          <span className="block font-bold text-slate-700">Mã QR xác nhận hoàn thành</span>
          <span className="block font-mono">{token}</span>
          {src && (
            <a href={src} download={fileName(label)}
              className="mt-1 inline-flex items-center gap-1 font-bold text-emerald-700 hover:underline">
              <Download size={11} /> Tải ảnh QR
            </a>
          )}
        </span>
      </span>
    );
  }

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-xl border border-slate-200 bg-white">
      {src
        // eslint-disable-next-line @next/next/no-img-element
        ? <img src={src} alt={`Mã QR ${token}`} className="w-28 h-28 rounded-lg border border-slate-200 shrink-0" />
        : <span className="w-28 h-28 rounded-lg border border-slate-200 bg-slate-50 shrink-0 inline-flex items-center justify-center text-slate-300"><QrCode size={32} /></span>}
      <div className="min-w-0 space-y-1.5">
        <p className="text-xs font-bold text-slate-800">Mã QR xác nhận hoàn thành</p>
        <p className="text-[11px] text-slate-500 leading-relaxed">
          In và dán mã này tại điểm trải nghiệm. Hết giờ đếm ngược, khách quét mã để xác nhận đã trải nghiệm xong
          rồi mới hiện câu hỏi. Mã được giữ nguyên khi bạn sửa trải nghiệm.
        </p>
        <p className="font-mono text-xs font-bold text-slate-700">{token}</p>
        {src && (
          <a href={src} download={fileName(label)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-800 text-xs font-bold hover:bg-emerald-100">
            <Download size={13} /> Tải ảnh QR để in
          </a>
        )}
      </div>
    </div>
  );
}
