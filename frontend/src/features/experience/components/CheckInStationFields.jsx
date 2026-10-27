"use client";

import React, { useEffect, useState } from "react";
import { MapPin, Navigation, QrCode, RefreshCw, ScanLine, Crosshair } from "lucide-react";
import { checkInPointService } from "../services/checkInPointService";
import LeafletMapPickerModal from "./LeafletMapPickerModal";
import { getDevicePosition, describeGeoError } from "@/lib/geolocation";

/**
 * Trạm check-in gắn thẳng vào nhiệm vụ loại "Câu hỏi tương tác ngoài thực tế".
 * Du khách chỉ cần một trong hai cách để mở câu hỏi:
 *  - Đi tới đúng tọa độ (trong bán kính cho phép): câu hỏi tự hiện.
 *  - Quét mã QR đặt tại điểm đó.
 *
 * Backend vẫn lưu trạm dưới dạng CheckInPoint; nhiệm vụ tham chiếu qua checkInPointId.
 * Các hàm tiện ích dưới đây giúp form nhiệm vụ tạo / cập nhật trạm cùng lúc với nhiệm vụ.
 */

export const EMPTY_STATION = {
  name: "",
  latitude: "",
  longitude: "",
  radiusMeters: 50,
  qrToken: "",
};

export function generateQrToken(seed = "") {
  const prefix = String(seed || "TASK")
    .toUpperCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/Đ/g, "D")
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 8);
  const rand = Math.floor(100000 + Math.random() * 900000);
  return `QR_${prefix || "TASK"}_${rand}`;
}

export function stationFromPoint(point) {
  if (!point) return { ...EMPTY_STATION };
  return {
    name: point.name ?? "",
    latitude: point.latitude ?? "",
    longitude: point.longitude ?? "",
    radiusMeters: point.radiusMeters ?? 50,
    qrToken: point.qrToken ?? "",
  };
}

export function validateStation(st) {
  const e = {};
  if (!String(st.name || "").trim()) e.name = "Vui lòng nhập tên địa điểm.";
  const lat = Number(st.latitude);
  const lng = Number(st.longitude);
  if (st.latitude === "" || st.latitude == null || Number.isNaN(lat) || lat < -90 || lat > 90) {
    e.latitude = "Vĩ độ phải nằm trong khoảng -90 đến 90.";
  }
  if (st.longitude === "" || st.longitude == null || Number.isNaN(lng) || lng < -180 || lng > 180) {
    e.longitude = "Kinh độ phải nằm trong khoảng -180 đến 180.";
  }
  const radius = Number(st.radiusMeters);
  if (!Number.isFinite(radius) || radius < 1) e.radiusMeters = "Bán kính phải từ 1 mét trở lên.";
  const token = String(st.qrToken || "").trim();
  if (!token) e.qrToken = "Vui lòng tạo mã QR.";
  else if (token.length > 100) e.qrToken = "Mã QR tối đa 100 ký tự.";
  return e;
}

/** Tạo mới hoặc cập nhật trạm; trả về CheckInPoint đã lưu. */
export async function persistStation({ experienceId, existingId, station, sequenceOrder }) {
  const payload = {
    name: station.name,
    latitude: station.latitude,
    longitude: station.longitude,
    radiusMeters: station.radiusMeters,
    qrToken: station.qrToken,
    sequenceOrder: sequenceOrder ?? 0,
  };
  if (existingId) return checkInPointService.update(existingId, payload);
  return checkInPointService.create(experienceId, payload);
}

export default function CheckInStationFields({
  value,
  onChange,
  errors = {},
  disabled = false,
  placeHint = "",
  inputClass = "",
}) {
  const [mapOpen, setMapOpen] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState("");

  const set = (patch) => onChange({ ...value, ...patch });

  // Người dùng vừa cấp quyền vị trí trong trình duyệt: bỏ thông báo lỗi cũ để bấm thử lại
  useEffect(() => {
    let status;
    const onChangeState = () => {
      if (status?.state === "granted") setGpsError("");
    };
    navigator.permissions
      ?.query({ name: "geolocation" })
      .then((s) => {
        status = s;
        s.addEventListener("change", onChangeState);
      })
      .catch(() => {});
    return () => status?.removeEventListener("change", onChangeState);
  }, []);
  const base =
    inputClass ||
    "w-full px-3.5 py-2.5 bg-white border rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 disabled:opacity-60 transition-colors";
  const border = (k) => (errors[k] ? "border-rose-300" : "border-slate-200");

  const useDeviceGps = async () => {
    setGpsLoading(true);
    setGpsError("");
    try {
      const pos = await getDevicePosition();
      set({
        latitude: pos.latitude.toFixed(7),
        longitude: pos.longitude.toFixed(7),
      });
    } catch (err) {
      setGpsError(describeGeoError(err));
    } finally {
      setGpsLoading(false);
    }
  };

  const qrImage = value.qrToken
    ? `https://api.qrserver.com/v1/create-qr-code/?size=160x160&margin=2&data=${encodeURIComponent(
        value.qrToken
      )}`
    : "";
  const qrDownload = value.qrToken
    ? `https://api.qrserver.com/v1/create-qr-code/?size=600x600&margin=10&data=${encodeURIComponent(
        value.qrToken
      )}`
    : "";

  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4 space-y-4">
      <div className="flex items-start gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
          <MapPin size={16} />
        </div>
        <div>
          <h4 className="text-sm font-bold text-slate-900">Địa điểm xuất hiện câu hỏi</h4>
          <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
            Du khách đến đúng tọa độ này thì câu hỏi tự động hiện ra, hoặc có thể quét mã QR đặt tại
            điểm đó để mở câu hỏi.
          </p>
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-bold text-slate-700">
          Tên địa điểm <span className="text-rose-500">*</span>
        </label>
        <input
          type="text"
          maxLength={255}
          value={value.name}
          disabled={disabled}
          onChange={(e) => set({ name: e.target.value })}
          placeholder={placeHint || "Ví dụ: Cổng Tam Quan, Đền Trình, Hang Tối..."}
          className={`${base} ${border("name")}`}
        />
        {errors.name && <p className="text-[11px] text-rose-600 font-semibold">{errors.name}</p>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700">
            Vĩ độ <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            inputMode="decimal"
            value={value.latitude}
            disabled={disabled}
            onChange={(e) => set({ latitude: e.target.value })}
            placeholder="20.2506000"
            className={`${base} ${border("latitude")}`}
          />
          {errors.latitude && (
            <p className="text-[11px] text-rose-600 font-semibold">{errors.latitude}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700">
            Kinh độ <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            inputMode="decimal"
            value={value.longitude}
            disabled={disabled}
            onChange={(e) => set({ longitude: e.target.value })}
            placeholder="105.9048000"
            className={`${base} ${border("longitude")}`}
          />
          {errors.longitude && (
            <p className="text-[11px] text-rose-600 font-semibold">{errors.longitude}</p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={disabled}
          onClick={() => setMapOpen(true)}
          className="h-8 px-3 rounded-lg bg-white border border-emerald-200 hover:bg-emerald-50 text-emerald-700 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
        >
          <Crosshair size={13} />
          Chọn trên bản đồ
        </button>
        <button
          type="button"
          disabled={disabled || gpsLoading}
          onClick={useDeviceGps}
          className="h-8 px-3 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
        >
          <Navigation size={13} />
          {gpsLoading ? "Đang lấy vị trí..." : "Dùng vị trí máy này"}
        </button>
        {gpsError && <span className="text-[11px] text-rose-600 font-semibold">{gpsError}</span>}
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-bold text-slate-700">
          Bán kính tự động hiện câu hỏi (mét) <span className="text-rose-500">*</span>
        </label>
        <input
          type="number"
          min={1}
          max={1000}
          value={value.radiusMeters}
          disabled={disabled}
          onChange={(e) => set({ radiusMeters: e.target.value })}
          className={`${base} ${border("radiusMeters")} sm:max-w-[200px]`}
        />
        <p className="text-[11px] text-slate-500">
          Du khách đứng trong phạm vi này quanh tọa độ thì câu hỏi sẽ tự hiện.
        </p>
        {errors.radiusMeters && (
          <p className="text-[11px] text-rose-600 font-semibold">{errors.radiusMeters}</p>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <label className="text-xs font-bold text-slate-700 inline-flex items-center gap-1.5">
            <ScanLine size={13} className="text-slate-500" />
            Mã QR tại điểm <span className="text-rose-500">*</span>
          </label>
          <button
            type="button"
            disabled={disabled}
            onClick={() => set({ qrToken: generateQrToken(value.name) })}
            className="text-[11px] font-bold text-slate-600 hover:text-slate-900 inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw size={11} />
            Tạo mã mới
          </button>
        </div>
        <div className="flex items-center gap-3 p-3 rounded-xl bg-white border border-slate-200">
          <div className="w-20 h-20 shrink-0 rounded-lg border border-slate-200 bg-white flex items-center justify-center overflow-hidden">
            {qrImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qrImage} alt="Mã QR của địa điểm" className="w-full h-full object-contain" />
            ) : (
              <QrCode size={28} className="text-slate-300" />
            )}
          </div>
          <div className="min-w-0 flex-1 space-y-1.5">
            <input
              type="text"
              maxLength={100}
              value={value.qrToken}
              disabled={disabled}
              onChange={(e) => set({ qrToken: e.target.value })}
              placeholder="Mã QR duy nhất"
              className={`${base} ${border("qrToken")} !py-2 !text-xs`}
            />
            <div className="flex flex-wrap items-center gap-3">
              {qrDownload && (
                <a
                  href={qrDownload}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] font-bold text-emerald-700 hover:underline"
                >
                  Mở ảnh QR lớn để in
                </a>
              )}
              <span className="text-[11px] text-slate-500">Mã phải khác với mọi trạm khác.</span>
            </div>
          </div>
        </div>
        {errors.qrToken && <p className="text-[11px] text-rose-600 font-semibold">{errors.qrToken}</p>}
      </div>

      <LeafletMapPickerModal
        isOpen={mapOpen}
        onClose={() => setMapOpen(false)}
        initialLatitude={value.latitude}
        initialLongitude={value.longitude}
        radiusMeters={value.radiusMeters}
        placeName={value.name}
        onSelect={({ latitude, longitude }) => set({ latitude, longitude })}
      />
    </div>
  );
}
