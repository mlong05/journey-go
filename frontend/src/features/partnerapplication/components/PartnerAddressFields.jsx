"use client";

/**
 * Bộ chọn địa chỉ hành chính cho hồ sơ đăng ký đối tác, theo mô hình 2 cấp MỚI:
 *   Tỉnh / Thành phố → Phường / Xã
 *
 * ── Vì sao chỉ còn 2 cấp ──
 *  Từ 01/07/2025 (Nghị quyết 202/2025/QH15) và các đợt sáp nhập tiếp theo, cấp
 *  huyện (quận/huyện) đã bị giải thể và gộp lên cấp tỉnh. Mô hình cũ
 *  "Tỉnh → Quận/Huyện → Phường/Xã" không còn tồn tại trên thực tế, nên mỗi
 *  tỉnh/thành phố hiện có trực tiếp danh sách phường/xã.
 *
 *  Dùng API public tinhthanhpho.com (xem partnerAddressService).
 *
 * ── Vì sao component giữ MÃ nội bộ ──
 *  API tra cứu theo MÃ (`/new-provinces/{code}/wards`), còn hồ sơ đăng ký lưu TÊN
 *  ("Thành phố Hà Nội") cho người duyệt đọc. Nên component giữ cả mã và tên:
 *  dùng mã để gọi API, trả tên ra ngoài qua onChange.
 *
 * ── Cấp phường/xã chỉ bật khi tỉnh đã chọn ──
 *  Tránh gửi tỉnh và phường lạc nhau.
 */
import React, { useEffect, useMemo, useState } from "react";
import { Loader2, MapPin, TriangleAlert } from "lucide-react";
import partnerAddressService from "../services/partnerAddressService";
import { ACCENTS, Select, labelCls } from "./PartnerFormKit";

/**
 * Ghép loại + tên thành nhãn hiển thị, tránh lặp khi tên đã chứa sẵn loại.
 * Ví dụ: "Phường Ba Đình" (loại "Phường", tên "Ba Đình") → "Phường Ba Đình";
 *        "Thành phố Hà Nội" (loại "Thành phố", tên "Hà Nội") → "Thành phố Hà Nội".
 */
function buildLabel(unit) {
  if (!unit) return "";
  const name = String(unit.name || "").trim();
  const type = String(unit.type || "").trim();
  if (!type) return name;
  if (
    partnerAddressService.normalizeForSearch(name).startsWith(
      partnerAddressService.normalizeForSearch(type) + " "
    )
  ) {
    return name;
  }
  return `${type} ${name}`;
}

/**
 * Nhãn phụ của một cấp hành chính, kèm trạng thái đang tải.
 * Đặt ở cấp module để không tạo component mới trong mỗi lần render.
 */
function SubLabel({ children, loading, accent = "teal" }) {
  const tone = ACCENTS[accent] ?? ACCENTS.teal;
  return (
    <span className={`${labelCls} flex items-center gap-1.5`}>
      {children}
      {loading && <Loader2 size={11} className={`animate-spin ${tone.text}`} />}
    </span>
  );
}

/** Thông báo lỗi của một cấp hành chính. */
function AddressFieldError({ children }) {
  if (!children) return null;
  return (
    <p className="mt-1.5 flex items-start gap-1 text-[11px] font-semibold leading-relaxed text-rose-600">
      <TriangleAlert size={12} className="mt-px shrink-0" />
      <span>{children}</span>
    </p>
  );
}

export default function PartnerAddressFields({
  value = { province: "", ward: "" },
  onChange,
  errors = {},
  disabled = false,
  accent = "teal",
}) {
  const [provinces, setProvinces] = useState([]);
  const [wards, setWards] = useState([]);

  const [provLoading, setProvLoading] = useState(true);
  const [wardLoading, setWardLoading] = useState(false);
  const [loadError, setLoadError] = useState("");

  // Mã đang chọn (mã, không phải tên)
  const [provinceCode, setProvinceCode] = useState("");
  const [wardCode, setWardCode] = useState("");

  // ── 1. Tỉnh / Thành phố ───────────────────────────────────────────────────
  useEffect(() => {
    const controller = new AbortController();
    partnerAddressService
      .getProvinces({ signal: controller.signal })
      .then((list) => setProvinces(Array.isArray(list) ? list : []))
      .catch((err) => {
        if (err?.name === "AbortError") return;
        setLoadError("Không thể tải danh sách Tỉnh/Thành. Vui lòng kiểm tra kết nối mạng.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setProvLoading(false);
      });
    return () => controller.abort();
  }, []);

  // Khôi phục mã tỉnh từ tên đã lưu (khi nạp lại hồ sơ nháp) — chỉ khi danh sách tỉnh đã tải xong.
  useEffect(() => {
    if (provinces.length === 0 || provinceCode) return;
    const match = provinces.find((p) => buildLabel(p) === value.province);
    if (match) setProvinceCode(match.code);
  }, [provinces, provinceCode, value.province]);

  // ── 2. Phường / Xã theo tỉnh đã chọn ─────────────────────────────────────
  useEffect(() => {
    if (!provinceCode) {
      setWards([]);
      setWardLoading(false);
      return;
    }
    const controller = new AbortController();
    setWardLoading(true);
    partnerAddressService
      .getWardsByProvince(provinceCode, { signal: controller.signal })
      .then((list) => setWards(Array.isArray(list) ? list : []))
      .catch((err) => {
        if (err?.name === "AbortError") return;
        setWards([]);
        setLoadError("Không thể tải danh sách Phường/Xã. Vui lòng thử lại.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setWardLoading(false);
      });
    return () => controller.abort();
  }, [provinceCode]);

  // Khôi phục mã phường từ tên đã lưu.
  useEffect(() => {
    if (wards.length === 0 || wardCode) return;
    const match = wards.find((w) => buildLabel(w) === value.ward);
    if (match) setWardCode(match.code);
  }, [wards, wardCode, value.ward]);

  const labelOf = (list, code) =>
    list.find((u) => u.code === code) ? buildLabel(list.find((u) => u.code === code)) : "";

  // Báo ra ngoài: luôn trả đủ 2 tên (để form lưu được hồ sơ nháp đầy đủ).
  const emit = useMemo(
    () => (next) => {
      onChange?.({
        province: next.province ?? "",
        ward: next.ward ?? "",
      });
    },
    [onChange]
  );

  const handleProvince = (code) => {
    setProvinceCode(code);
    setWardCode("");
    emit({ province: labelOf(provinces, code), ward: "" });
  };

  const handleWard = (code) => {
    setWardCode(code);
    emit({
      province: labelOf(provinces, provinceCode),
      ward: labelOf(wards, code),
    });
  };

  return (
    <div>
      <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-slate-700">
        <MapPin size={13} className={`${ACCENTS[accent]?.text ?? ACCENTS.teal.text}`} />
        Địa chỉ trụ sở
        <span className="ml-0.5 text-rose-500">*</span>
      </div>

      {loadError && (
        <p className="mb-2 flex items-center gap-1 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-semibold text-amber-700">
          <TriangleAlert size={12} /> {loadError}
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {/* Tỉnh / Thành phố */}
        <div>
          <SubLabel loading={provLoading} accent={accent}>
            Tỉnh / Thành phố
          </SubLabel>
          <Select
            value={provinceCode}
            accent={accent}
            disabled={disabled || provLoading}
            onChange={(e) => handleProvince(e.target.value)}
            error={errors.province}
          >
            <option value="">
              {provLoading ? "Đang tải..." : "-- Chọn Tỉnh/Thành phố --"}
            </option>
            {provinces.map((p) => (
              <option key={p.code} value={p.code}>
                {buildLabel(p)}
              </option>
            ))}
          </Select>
          <AddressFieldError>{errors.province}</AddressFieldError>
        </div>

        {/* Phường / Xã */}
        <div>
          <SubLabel loading={wardLoading} accent={accent}>
            Phường / Xã
          </SubLabel>
          <Select
            value={wardCode}
            accent={accent}
            disabled={disabled || !provinceCode || wardLoading}
            onChange={(e) => handleWard(e.target.value)}
            error={errors.ward}
          >
            <option value="">
              {!provinceCode
                ? "Chọn Tỉnh/Thành phố trước"
                : wardLoading
                ? "Đang tải..."
                : "-- Chọn Phường/Xã --"}
            </option>
            {wards.map((w) => (
              <option key={w.code} value={w.code}>
                {buildLabel(w)}
              </option>
            ))}
          </Select>
          <AddressFieldError>{errors.ward}</AddressFieldError>
        </div>
      </div>
    </div>
  );
}
