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
 *
 * ── Ô gõ + gợi ý (AddressCombobox) ──
 *  Vừa gõ vừa lọc, danh sách xổ ngay dưới ô. Lọc theo chữ không dấu nên gõ "phu my" vẫn ra
 *  "Phường Phú Mỹ", nhưng chỉ hiển thị tên có dấu. Chỉ nhận tên có trong danh sách (so khớp không phân biệt hoa thường / dấu);
 *  gõ tên lạ thì báo lỗi khi rời ô và không gửi tên đó ra ngoài.
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Loader2, MapPin, TriangleAlert } from "lucide-react";
import partnerAddressService from "../services/partnerAddressService";
import { ACCENTS, TextInput, labelCls } from "./PartnerFormKit";
import { translate } from "@/i18n";

const norm = (s) => partnerAddressService.normalizeForSearch(s).replace(/\s+/g, " ");

/** Tìm đơn vị khớp chính xác với chữ đã gõ — theo nhãn đầy đủ ("Phường Ba Đình") hoặc tên ("Ba Đình"). */
function findUnit(list, text) {
  const k = norm(text);
  if (!k) return null;
  return list.find((u) => norm(buildLabel(u)) === k) || list.find((u) => norm(u.name) === k) || null;
}

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

/**
 * Ô gõ + danh sách gợi ý xổ ngay bên dưới ô.
 * Không dùng <datalist> vì trình duyệt tự quyết vị trí popup (có thể bật sang ngang)
 * và hiện kèm nhãn phụ. Lọc theo chữ không dấu nhưng chỉ hiển thị tên có dấu.
 */
function AddressCombobox({ units, display, query, onType, onPick, onBlur, disabled, placeholder, emptyText, error, accent }) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const listRef = useRef(null);

  // query === null ⇒ đang hiện tên đã chọn ⇒ cho xem toàn bộ danh sách.
  const filtered = useMemo(() => {
    const k = query == null ? "" : norm(query);
    if (!k) return units;
    return units.filter((u) => norm(buildLabel(u)).includes(k));
  }, [units, query]);

  useEffect(() => {
    if (!open || !listRef.current) return;
    listRef.current.children[active]?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  const pick = (u) => {
    onPick(u.code);
    setOpen(false);
  };

  const onKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) setOpen(true);
      setActive((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && open && filtered[active]) {
      e.preventDefault();
      pick(filtered[active]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div className="relative">
      <TextInput
        value={display}
        accent={accent}
        disabled={disabled}
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        aria-invalid={Boolean(error)}
        placeholder={placeholder}
        className="pr-9"
        onFocus={() => { setOpen(true); setActive(0); }}
        onClick={() => setOpen(true)}
        onChange={(e) => { onType(e.target.value); setOpen(true); setActive(0); }}
        onKeyDown={onKeyDown}
        onBlur={() => { setOpen(false); onBlur?.(); }}
        error={error}
      />
      <ChevronDown
        size={16}
        className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
      />
      {open && !disabled && (
        <ul
          ref={listRef}
          role="listbox"
          className="absolute left-0 right-0 top-full z-30 mt-1 max-h-60 overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg"
        >
          {filtered.length === 0 ? (
            <li className="px-3.5 py-2 text-sm text-slate-400">{emptyText}</li>
          ) : (
            filtered.map((u, i) => {
              const label = buildLabel(u);
              const selected = label === display;
              return (
                <li
                  key={u.code}
                  role="option"
                  aria-selected={selected}
                  onMouseDown={(e) => { e.preventDefault(); pick(u); }}
                  onMouseEnter={() => setActive(i)}
                  className={`cursor-pointer px-3.5 py-2 text-sm ${i === active ? "bg-slate-100" : ""} ${
                    selected ? `font-semibold ${ACCENTS[accent]?.text ?? ACCENTS.teal.text}` : "text-slate-700"
                  }`}
                >
                  {label}
                </li>
              );
            })
          )}
        </ul>
      )}
    </div>
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
  t,
}) {
  const tr = t || ((key) => translate("vi", key));
  const [provinces, setProvinces] = useState([]);
  const [wards, setWards] = useState([]);

  const [provLoading, setProvLoading] = useState(true);
  const [wardLoading, setWardLoading] = useState(false);
  const [loadErrorKey, setLoadErrorKey] = useState("");

  // Mã đang chọn (mã, không phải tên)
  const [provinceCode, setProvinceCode] = useState("");
  const [wardCode, setWardCode] = useState("");
  // Chữ đang gõ (null = hiện tên của mục đã chọn) + lỗi "không có trong danh sách"
  const [provText, setProvText] = useState(null);
  const [wardText, setWardText] = useState(null);
  const [provPickErrKey, setProvPickErrKey] = useState("");
  const [wardPickErrKey, setWardPickErrKey] = useState("");

  // ── 1. Tỉnh / Thành phố ───────────────────────────────────────────────────
  useEffect(() => {
    const controller = new AbortController();
    partnerAddressService
      .getProvinces({ signal: controller.signal })
      .then((list) => setProvinces(Array.isArray(list) ? list : []))
      .catch((err) => {
        if (err?.name === "AbortError") return;
        setLoadErrorKey("home.pr.addr.errLoadProvince");
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
    // Bọc trong IIFE bất đồng bộ ⇒ không `setState` đồng bộ trong effect.
    (async () => {
      if (match) setProvinceCode(match.code);
    })();
  }, [provinces, provinceCode, value.province]);

  // ── 2. Phường / Xã theo tỉnh đã chọn ─────────────────────────────────────
  useEffect(() => {
    if (!provinceCode) {
      // Bọc trong IIFE bất đồng bộ ⇒ không `setState` đồng bộ trong effect.
      (async () => {
        setWards([]);
        setWardLoading(false);
      })();
      return;
    }
    const controller = new AbortController();
    // Bọc trong IIFE bất đồng bộ ⇒ không `setState` đồng bộ trong effect.
    (async () => {
      setWardLoading(true);
    })();
    partnerAddressService
      .getWardsByProvince(provinceCode, { signal: controller.signal })
      .then((list) => setWards(Array.isArray(list) ? list : []))
      .catch((err) => {
        if (err?.name === "AbortError") return;
        setWards([]);
        setLoadErrorKey("home.pr.addr.errLoadWard");
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
    // Bọc trong IIFE bất đồng bộ ⇒ không `setState` đồng bộ trong effect.
    (async () => {
      if (match) setWardCode(match.code);
    })();
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
    setWardText(null);
    setWardPickErrKey("");
    emit({ province: labelOf(provinces, code), ward: "" });
  };

  // Gõ vào ô Tỉnh: khớp đúng một tỉnh thì chọn luôn; chưa khớp thì bỏ lựa chọn cũ.
  const typeProvince = (text) => {
    setProvText(text);
    setProvPickErrKey("");
    const m = findUnit(provinces, text);
    if (m) {
      setProvText(null);
      if (m.code !== provinceCode) handleProvince(m.code);
    } else if (provinceCode || value.province) {
      setProvinceCode("");
      setWardCode("");
      setWardText(null);
      emit({ province: "", ward: "" });
    }
  };

  const typeWard = (text) => {
    setWardText(text);
    setWardPickErrKey("");
    const m = findUnit(wards, text);
    if (m) {
      setWardText(null);
      if (m.code !== wardCode) handleWard(m.code);
    } else if (wardCode || value.ward) {
      setWardCode("");
      emit({ province: labelOf(provinces, provinceCode), ward: "" });
    }
  };

  const provDisplay = provText ?? (labelOf(provinces, provinceCode) || value.province || "");
  const wardDisplay = wardText ?? (labelOf(wards, wardCode) || value.ward || "");
  const provError = (provPickErrKey ? tr(provPickErrKey) : "") || errors.province;
  const wardError = (wardPickErrKey ? tr(wardPickErrKey) : "") || errors.ward;

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
        {tr("home.pr.addr.title")}
        <span className="ml-0.5 text-rose-500">*</span>
      </div>

      {loadErrorKey && (
        <p className="mb-2 flex items-center gap-1 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-semibold text-amber-700">
          <TriangleAlert size={12} /> {tr(loadErrorKey)}
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {/* Tỉnh / Thành phố */}
        <div>
          <SubLabel loading={provLoading} accent={accent}>
            {tr("home.pr.addr.province")}
          </SubLabel>
          <AddressCombobox
            units={provinces}
            display={provDisplay}
            query={provText}
            accent={accent}
            disabled={disabled || provLoading}
            placeholder={provLoading ? tr("home.pr.addr.loading") : tr("home.pr.addr.provincePlaceholder")}
            emptyText={tr("home.pr.addr.noResults")}
            onType={typeProvince}
            onPick={(code) => {
              setProvText(null);
              setProvPickErrKey("");
              if (code !== provinceCode) handleProvince(code);
            }}
            onBlur={() => { if (provText && !findUnit(provinces, provText)) setProvPickErrKey("home.pr.addr.errPickProvince"); }}
            error={provError}
          />
          <AddressFieldError>{provError}</AddressFieldError>
        </div>

        {/* Phường / Xã */}
        <div>
          <SubLabel loading={wardLoading} accent={accent}>
            {tr("home.pr.addr.ward")}
          </SubLabel>
          <AddressCombobox
            units={wards}
            display={wardDisplay}
            query={wardText}
            accent={accent}
            disabled={disabled || !provinceCode || wardLoading}
            placeholder={!provinceCode ? tr("home.pr.addr.wardNeedProvince") : wardLoading ? tr("home.pr.addr.loading") : tr("home.pr.addr.wardPlaceholder")}
            emptyText={tr("home.pr.addr.noResults")}
            onType={typeWard}
            onPick={(code) => {
              setWardText(null);
              setWardPickErrKey("");
              if (code !== wardCode) handleWard(code);
            }}
            onBlur={() => { if (wardText && !findUnit(wards, wardText)) setWardPickErrKey("home.pr.addr.errPickWard"); }}
            error={wardError}
          />
          <AddressFieldError>{wardError}</AddressFieldError>
        </div>
      </div>
    </div>
  );
}
