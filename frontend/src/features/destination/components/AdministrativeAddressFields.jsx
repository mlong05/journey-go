"use client";

import React, { useEffect, useRef, useState } from "react";
import { MapPin, Loader2, ChevronDown, Home } from "lucide-react";
import provinceService, {
  normalizeForSearch,
} from "../services/provinceService";

/** "Thành phố" + "Hà Nội" → "Thành phố Hà Nội" (tránh lặp tiền tố). */
function buildLabel(unit) {
  if (!unit) return "";
  const name = String(unit.name || "").trim();
  const type = String(unit.type || "").trim();
  if (!type) return name;
  if (normalizeForSearch(name).startsWith(normalizeForSearch(type) + " ")) {
    return name;
  }
  return `${type} ${name}`;
}

function matchesLabel(unit, text) {
  const t = normalizeForSearch(text);
  return (
    t === normalizeForSearch(buildLabel(unit)) ||
    t === normalizeForSearch(unit.name)
  );
}

// Font được ép kế thừa từ Geist (hỗ trợ tiếng Việt) — <select>/<input> mặc
// định của trình duyệt không kế thừa font nên dễ vỡ dấu.
const FONT = "font-sans [font-family:inherit]";

/**
 * Chọn địa chỉ hành chính theo mô hình 2 cấp (từ 1/7/2025):
 *   1. Tỉnh/Thành phố  →  2. Xã/Phường/Đặc khu  →  3. Địa chỉ cụ thể.
 *
 * Props:
 *  - initialAddress: chuỗi "Số nhà, Xã/Phường, Tỉnh/TP" để tự điền (màn sửa)
 *  - resetKey: đổi giá trị để áp dụng lại initialAddress
 *  - onChange({ address, provinceCode, wardCode, street })
 *      address chỉ khác rỗng khi đã chọn đủ 3 phần.
 *  - error: string | undefined
 *  - palette: { ring, ringBorder, icon }
 */
export default function AdministrativeAddressFields({
  initialAddress = "",
  resetKey = 0,
  disabled = false,
  error = "",
  onChange,
  palette = {},
}) {
  const [provinces, setProvinces] = useState([]);
  const [provLoading, setProvLoading] = useState(true);
  const [provError, setProvError] = useState("");
  const [wards, setWards] = useState([]);
  const [wardLoading, setWardLoading] = useState(false);
  const [wardError, setWardError] = useState("");
  const [provinceCode, setProvinceCode] = useState("");
  const [wardCode, setWardCode] = useState("");
  const [street, setStreet] = useState("");
  const [legacyNote, setLegacyNote] = useState(false);

  const pendingWardLabel = useRef(null);
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  });

  // ── 1. Tải 34 tỉnh/thành ─────────────────────────────────────
  useEffect(() => {
    const controller = new AbortController();
    provinceService
      .getNewProvinces({ signal: controller.signal })
      .then((list) => {
        const arr = Array.isArray(list) ? list : [];
        setProvinces(
          [...arr].sort((a, b) =>
            String(a.name).localeCompare(String(b.name), "vi")
          )
        );
      })
      .catch((err) => {
        if (err?.name === "AbortError") return;
        setProvError("Không thể tải danh sách tỉnh/thành. Vui lòng thử lại.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setProvLoading(false);
      });
    return () => controller.abort();
  }, []);

  // ── 2. Áp dụng địa chỉ ban đầu (màn sửa) ─────────────────────
  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      const addr = String(initialAddress || "").trim();
      pendingWardLabel.current = null;
      setLegacyNote(false);
      if (!addr) {
        setProvinceCode("");
        setWardCode("");
        setStreet("");
        return;
      }
      if (provinces.length === 0) return; // chờ danh sách tỉnh

      const parts = addr.split(",").map((s) => s.trim()).filter(Boolean);
      if (parts.length >= 3) {
        const province = provinces.find((p) =>
          matchesLabel(p, parts[parts.length - 1])
        );
        if (province) {
          pendingWardLabel.current = parts[parts.length - 2];
          setProvinceCode(province.code);
          setWardCode("");
          setStreet(parts.slice(0, -2).join(", "));
          return;
        }
      }
      // Địa chỉ cũ không đúng định dạng mới → giữ nguyên ở ô địa chỉ cụ thể
      setProvinceCode("");
      setWardCode("");
      setStreet(addr);
      setLegacyNote(true);
    });
    return () => {
      cancelled = true;
    };
  }, [initialAddress, resetKey, provinces]);

  // ── 3. Tải xã/phường khi đổi tỉnh ────────────────────────────
  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    queueMicrotask(() => {
      if (cancelled) return;
      if (!provinceCode) {
        setWards([]);
        setWardError("");
        return;
      }
      setWardLoading(true);
      setWardError("");
      setWards([]);
      provinceService
        .getWardsByProvince(provinceCode, { signal: controller.signal })
        .then((list) => {
          setWards(list);
          const pending = pendingWardLabel.current;
          if (pending) {
            pendingWardLabel.current = null;
            const found = list.find((w) => matchesLabel(w, pending));
            if (found) setWardCode(found.code);
            else setLegacyNote(true);
          }
        })
        .catch((err) => {
          if (err?.name === "AbortError") return;
          setWardError("Không thể tải danh sách xã/phường. Vui lòng thử lại.");
        })
        .finally(() => {
          if (!controller.signal.aborted) setWardLoading(false);
        });
    });
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [provinceCode]);

  // ── 4. Báo kết quả lên form cha ──────────────────────────────
  useEffect(() => {
    const province = provinces.find((p) => p.code === provinceCode);
    const ward = wards.find((w) => w.code === wardCode);
    const s = street.trim();
    const address =
      province && ward && s
        ? `${s}, ${buildLabel(ward)}, ${buildLabel(province)}`
        : "";
    onChangeRef.current?.({ address, provinceCode, wardCode, street: s });
  }, [provinces, wards, provinceCode, wardCode, street]);

  const selectCls = (hasError) =>
    `w-full appearance-none pl-3.5 pr-9 py-2.5 bg-slate-50 border rounded-xl text-sm text-slate-800 font-semibold focus:bg-white focus:outline-none focus:ring-2 ${palette.ring || ""} ${palette.ringBorder || ""} disabled:opacity-60 disabled:cursor-not-allowed transition-colors ${FONT} ${
      hasError ? "border-rose-300" : "border-slate-200"
    }`;

  const subLabel =
    "text-[10.5px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1";

  return (
    <div className="space-y-2">
      <label
        className={`flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-wider ${FONT}`}
      >
        <MapPin size={13} className={palette.icon} />
        <span>Địa chỉ hành chính</span>
        <span className="text-rose-500">*</span>
      </label>

      {legacyNote && (
        <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 font-semibold leading-relaxed">
          Địa chỉ hiện tại theo cấu trúc cũ. Vui lòng chọn lại Tỉnh/Thành phố và
          Xã/Phường theo bản đồ hành chính mới.
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Bước 1: Tỉnh / Thành phố */}
        <div className="space-y-1">
          <span className={subLabel}>
            1 · Tỉnh / Thành phố
            {provLoading && <Loader2 size={11} className="animate-spin" />}
          </span>
          <div className="relative">
            <select
              value={provinceCode}
              disabled={disabled || provLoading}
              onChange={(e) => {
                pendingWardLabel.current = null;
                setLegacyNote(false);
                setProvinceCode(e.target.value);
                setWardCode("");
              }}
              className={selectCls(error && !provinceCode)}
            >
              <option value="">
                {provLoading ? "Đang tải..." : "-- Chọn Tỉnh/Thành phố --"}
              </option>
              {provinces.map((p) => (
                <option key={p.code} value={p.code}>
                  {buildLabel(p)}
                </option>
              ))}
            </select>
            <ChevronDown
              size={15}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
          </div>
          {provError && (
            <p className="text-[10.5px] text-rose-600 font-bold">{provError}</p>
          )}
        </div>

        {/* Bước 2: Xã / Phường */}
        <div className="space-y-1">
          <span className={subLabel}>
            2 · Xã / Phường / Đặc khu
            {wardLoading && <Loader2 size={11} className="animate-spin" />}
          </span>
          <div className="relative">
            <select
              value={wardCode}
              disabled={disabled || !provinceCode || wardLoading}
              onChange={(e) => {
                setLegacyNote(false);
                setWardCode(e.target.value);
              }}
              className={selectCls(error && provinceCode && !wardCode)}
            >
              <option value="">
                {!provinceCode
                  ? "Chọn Tỉnh/Thành phố trước"
                  : wardLoading
                  ? "Đang tải..."
                  : "-- Chọn Xã/Phường --"}
              </option>
              {wards.map((w) => (
                <option key={w.code} value={w.code}>
                  {buildLabel(w)}
                </option>
              ))}
            </select>
            <ChevronDown
              size={15}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
          </div>
          {wardError && (
            <p className="text-[10.5px] text-rose-600 font-bold">{wardError}</p>
          )}
        </div>
      </div>

      {/* Bước 3: Địa chỉ cụ thể */}
      <div className="space-y-1">
        <span className={subLabel}>
          <Home size={11} />3 · Địa chỉ cụ thể (số nhà, đường, thôn/xóm...)
        </span>
        <input
          type="text"
          value={street}
          disabled={disabled || !wardCode}
          onChange={(e) => setStreet(e.target.value)}
          placeholder={
            wardCode
              ? "Ví dụ: Số 1 Đường Hùng Vương, Thôn Đông"
              : "Chọn Xã/Phường trước khi nhập địa chỉ cụ thể"
          }
          className={`w-full px-3.5 py-2.5 bg-slate-50 border rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 ${palette.ring || ""} ${palette.ringBorder || ""} font-semibold disabled:opacity-60 disabled:cursor-not-allowed transition-colors ${FONT} ${
            error && wardCode && !street.trim()
              ? "border-rose-300"
              : "border-slate-200"
          }`}
        />
      </div>

      {error && <p className="text-[11px] text-rose-600 font-bold">{error}</p>}
    </div>
  );
}
