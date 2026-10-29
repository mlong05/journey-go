"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

/**
 * Hộp thoại quét mã QR tại điểm đến.
 *
 * Dùng camera + BarcodeDetector khi trình duyệt hỗ trợ (Chrome/Edge, Android); nếu không thì
 * nhập mã in dưới QR bằng tay. `onResult(value)` được gọi một lần với chuỗi quét/nhập được.
 */
export default function QrDialog({ title = "Quét mã QR", hint, onResult, onClose }) {
  const videoRef = useRef(null);
  const [cameraError, setCameraError] = useState("");
  const [manual, setManual] = useState("");
  const supported = typeof window !== "undefined" && "BarcodeDetector" in window;
  // Luôn gọi bản onResult mới nhất mà không khởi động lại camera mỗi lần cha render.
  const onResultRef = useRef(onResult);
  useEffect(() => {
    onResultRef.current = onResult;
  });

  useEffect(() => {
    if (!supported) return undefined;
    let stream;
    let timer;
    let done = false;

    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
        if (done) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        const video = videoRef.current;
        video.srcObject = stream;
        await video.play();
        const detector = new window.BarcodeDetector({ formats: ["qr_code"] });
        timer = setInterval(async () => {
          try {
            const codes = await detector.detect(video);
            const value = codes[0]?.rawValue?.trim();
            if (value && !done) {
              done = true;
              onResultRef.current(value);
            }
          } catch {
            /* khung hình chưa sẵn sàng */
          }
        }, 400);
      } catch {
        setCameraError("Không mở được camera. Bạn có thể nhập mã thủ công bên dưới.");
      }
    })();

    return () => {
      done = true;
      if (timer) clearInterval(timer);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [supported]);

  function submitManual(e) {
    e.preventDefault();
    const value = manual.trim();
    if (value) onResult(value);
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-xl dark:bg-gray-900">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">{title}</h2>
          <button onClick={onClose} aria-label="Đóng" className="rounded-full p-1 hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>
        {hint && <p className="mt-1 text-sm text-gray-500">{hint}</p>}

        {supported && !cameraError && (
          <div className="relative mt-4 aspect-square overflow-hidden rounded-2xl bg-black">
            <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />
            <div className="pointer-events-none absolute inset-6 rounded-2xl border-4 border-emerald-400/90" />
          </div>
        )}
        {cameraError && <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">{cameraError}</p>}
        {!supported && (
          <p className="mt-4 rounded-lg bg-sky-50 p-3 text-sm text-sky-800">
            Trình duyệt này chưa hỗ trợ quét QR bằng camera. Hãy nhập mã in dưới QR, hoặc dùng ứng dụng
            di động để quét.
          </p>
        )}

        <form onSubmit={submitManual} className="mt-4 flex gap-2">
          <input
            value={manual}
            onChange={(e) => setManual(e.target.value)}
            placeholder="Nhập mã thủ công"
            className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={!manual.trim()}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            Xác nhận
          </button>
        </form>
      </div>
    </div>
  );
}
