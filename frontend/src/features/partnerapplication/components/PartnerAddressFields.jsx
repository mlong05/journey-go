"use client";

/**
 * Bộ chọn địa chỉ hành chính 3 cấp cho hồ sơ đăng ký đối tác:
 *   Tỉnh/Thành → Quận/Huyện → Phường/Xã
 *
 * Dùng API public tinhthanhpho.com (xem partnerAddressService).
 *
 * ── Vì sao component giữ MÃ nội bộ ──
 *  API tra cứu theo MÃ (`/provinces/{code}/districts`), còn hồ sơ đăng ký lưu TÊN
 *  ("Thành phố Hà Nội") cho người duyệt đọc. Nên component giữ cả mã và tên:
 *  dùng mã để gọi API, trả tên ra ngoài qua onChange.
 *
 * ── Mỗi cấp chỉ bật khi cấp trước đã chọn ──
 *  Tránh gửi tỉnh/quận lạc nhau.
 */
import React, { useEffect, useMemo, useState } from "react";
import { ChevronDown, Loader2, MapPin, TriangleAlert } from "lucide-react";
import partnerAddressService from "../services/partnerAddressService";

// <select>/<input> mặc định của trình duyệt không kế thừa font nên dễ vỡ dấu tiếng Việt.
const FONT = "font-sans [font-family:inherit]";

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

export default function PartnerAddressFields({
  value = { province: "", district: "", ward: "" },
  onChange,
  errors = {},
  disabled = false,
}) {
  const [provinces, setProvinces] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [wards, setWards] = useState([]);

  const [provLoading, setProvLoading] = useState(true);
  const [districtLoading, setDistrictLoading] = useState(false);
  const [wardLoading, setWardLoading] = useState(false);
  const [loadError, setLoadError] = useState("");

  // Mã đang chọn (mã, không phải tên)
  const [provinceCode, setProvinceCode] = useState("");
  const [districtCode, setDistrictCode] = useState("");
  const [wardCode, setWardCode] = useState("");

  // ── 1. Tỉnh/Thành ────────────────────────────────────────────────────────
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

  // Khôi phục mã từ tên đã lưu (khi nạp lại hồ sơ nháp) — chỉ khi danh sách tỉnh đã tải xong.
  useEffect(() => {
    if (provinces.length === 0 || provinceCode) return;
    const match = provinces.find((p) => buildLabel(p) === value.province);
    if (match) setProvinceCode(match.code);
  }, [provinces, provinceCode, value.province]);

  // ── 2. Quận/Huyện theo tỉnh đã chọn ─────────────────────────────────────
  useEffect(() => {
    if (!provinceCode) {
      setDistricts([]);
      setDistrictLoading(false);
      return;
    }
    const controller = new AbortController();
    setDistrictLoading(true);
    partnerAddressService
      .getDistrictsByProvince(provinceCode, { signal: controller.signal })
      .then((list) => setDistricts(Array.isArray(list) ? list : []))
      .catch((err) => {
        if (err?.name === "AbortError") return;
        setDistricts([]);
        setLoadError("Không thể tải danh sách Quận/Huyện. Vui lòng thử lại.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setDistrictLoading(false);
      });
    return () => controller.abort();
  }, [provinceCode]);

  // Khôi phục mã huyện từ tên đã lưu.
  useEffect(() => {
    if (districts.length === 0 || districtCode) return;
    const match = districts.find((d) => buildLabel(d) === value.district);
    if (match) setDistrictCode(match.code);
  }, [districts, districtCode, value.district]);

  // ── 3. Phường/Xã theo quận/huyện đã chọn ─────────────────────────────────
  useEffect(() => {
    if (!districtCode) {
      setWards([]);
      setWardLoading(false);
      return;
    }
    const controller = new AbortController();
    setWardLoading(true);
    partnerAddressService
      .getWardsByDistrict(districtCode, { signal: controller.signal })
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
  }, [districtCode]);

  // Khôi phục mã phường từ tên đã lưu.
  useEffect(() => {
    if (wards.length === 0 || wardCode) return;
    const match = wards.find((w) => buildLabel(w) === value.ward);
    if (match) setWardCode(match.code);
  }, [wards, wardCode, value.ward]);

  const selectCls = (hasError) =>
    `w-full appearance-none pl-3.5 pr-9 py-2.5 bg-white border rounded-xl text-sm text-slate-800 outline-none transition focus:ring-4 disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-slate-50 ${FONT} ${
      hasError
        ? "border-rose-300 focus:border-rose-400 focus:ring-rose-100"
        : "border-slate-200 focus:border-teal-400 focus:ring-teal-100"
    }`;

  const SubLabel = ({ children, loading }) => (
    <span className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold text-slate-500">
      {children}
      {loading && <Loader2 size={11} className="animate-spin text-teal-600" />}
    </span>
  );

  const FieldError = ({ field }) =>
    errors[field] ? (
      <p className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-rose-600">
        <TriangleAlert size={12} /> {errors[field]}
      </p>
    ) : null;

  const labelOf = (list, code) =>
    list.find((u) => u.code === code) ? buildLabel(list.find((u) => u.code === code)) : "";

  // Báo ra ngoài: luôn trả đủ 3 tên (để form lưu được hồ sơ nháp đầy đủ).
  const emit = useMemo(
    () => (next) => {
      onChange?.({
        province: next.province ?? "",
        district: next.district ?? "",
        ward: next.ward ?? "",
      });
    },
    [onChange]
  );

  const handleProvince = (code) => {
    setProvinceCode(code);
    setDistrictCode("");
    setWardCode("");
    emit({ province: labelOf(provinces, code), district: "", ward: "" });
  };

  const handleDistrict = (code) => {
    setDistrictCode(code);
    setWardCode("");
    emit({
      province: labelOf(provinces, provinceCode),
      district: labelOf(districts, code),
      ward: "",
    });
  };

  const handleWard = (code) => {
    setWardCode(code);
    emit({
      province: labelOf(provinces, provinceCode),
      district: labelOf(districts, districtCode),
      ward: labelOf(wards, code),
    });
  };

  return (
    <div>
      <div className="mb-2 flex items-center gap-1.5 text-xs font-bold text-slate-700">
        <MapPin size={13} className="text-teal-600" />
        Địa chỉ trụ sở
        <span className="text-rose-500">*</span>
      </div>

      {loadError && (
        <p className="mb-2 flex items-center gap-1 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-semibold text-amber-700">
          <TriangleAlert size={12} /> {loadError}
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        {/* Tỉnh/Thành */}
        <div>
          <SubLabel loading={provLoading}>Tỉnh / Thành phố</SubLabel>
          <div className="relative">
            <select
              value={provinceCode}
              disabled={disabled || provLoading}
              onChange={(e) => handleProvince(e.target.value)}
              className={selectCls(errors.province)}
            >
              <option value="">
                {provLoading ? "Đang tải..." : "-- Chọn Tỉnh/Thành --"}
              </option>
              {provinces.map((p) => (
                <option key={p.code} value={p.code}>
                  {buildLabel(p)}
                </option>
              ))}
            </select>
            <ChevronDown
              size={15}
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
          </div>
          <FieldError field="province" />
        </div>

        {/* Quận/Huyện */}
        <div>
          <SubLabel loading={districtLoading}>Quận / Huyện</SubLabel>
          <div className="relative">
            <select
              value={districtCode}
              disabled={disabled || !provinceCode || districtLoading}
              onChange={(e) => handleDistrict(e.target.value)}
              className={selectCls(errors.district)}
            >
              <option value="">
                {!provinceCode
                  ? "Chọn Tỉnh/Thành trước"
                  : districtLoading
                  ? "Đang tải..."
                  : "-- Chọn Quận/Huyện --"}
              </option>
              {districts.map((d) => (
                <option key={d.code} value={d.code}>
                  {buildLabel(d)}
                </option>
              ))}
            </select>
            <ChevronDown
              size={15}
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
          </div>
          <FieldError field="district" />
        </div>

        {/* Phường/Xã */}
        <div>
          <SubLabel loading={wardLoading}>Phường / Xã</SubLabel>
          <div className="relative">
            <select
              value={wardCode}
              disabled={disabled || !districtCode || wardLoading}
              onChange={(e) => handleWard(e.target.value)}
              className={selectCls(errors.ward)}
            >
              <option value="">
                {!districtCode
                  ? "Chọn Quận/Huyện trước"
                  : wardLoading
                  ? "Đang tải..."
                  : "-- Chọn Phường/Xã --"}
              </option>
              {wards.map((w) => (
                <option key={w.code} value={w.code}>
                  {buildLabel(w)}
                </option>
              ))}
            </select>
            <ChevronDown
              size={15}
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
          </div>
          <FieldError field="ward" />
        </div>
      </div>
    </div>
  );
}
