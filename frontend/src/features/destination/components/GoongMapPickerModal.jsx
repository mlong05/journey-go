"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { X, Search, MapPin, Navigation, Check, Loader2, Layers } from "lucide-react";
import { getDevicePosition, describeGeoError } from "@/lib/geolocation";
import { geoService } from "../services/geoService";

/** Maptiles key (khác REST API key ở máy chủ) — giới hạn theo tên miền trên account.goong.io. */
const MAPTILES_KEY = process.env.NEXT_PUBLIC_GOONG_MAPTILES_KEY || "";

const GOONG_JS_VERSION = "1.0.9";
const GOONG_CDN = `https://cdn.jsdelivr.net/npm/@goongmaps/goong-js@${GOONG_JS_VERSION}/dist`;

const MAP_STYLES = [
  { id: "web", name: "Đường phố", url: "https://tiles.goong.io/assets/goong_map_web.json" },
  { id: "satellite", name: "Vệ tinh", url: "https://tiles.goong.io/assets/goong_satellite.json" },
];

// Mặc định Hà Nội khi chưa có tọa độ
const DEFAULT_POS = { lat: 21.028511, lng: 105.854167 };

function parseCoord(val, fallback) {
  if (val === undefined || val === null || val === "") return fallback;
  const num = Number(val);
  return Number.isFinite(num) && num !== 0 ? num : fallback;
}

/** Nạp goong-js (CSS + JS) từ CDN một lần. Dùng chung cho bản đồ xem trước checkpoint của tour. */
export function loadGoongJs() {
  if (typeof window === "undefined") return Promise.reject(new Error("No window"));
  if (window.goongjs) return Promise.resolve(window.goongjs);

  return new Promise((resolve, reject) => {
    if (!document.getElementById("goong-js-css")) {
      const link = document.createElement("link");
      link.id = "goong-js-css";
      link.rel = "stylesheet";
      link.href = `${GOONG_CDN}/goong-js.css`;
      document.head.appendChild(link);
    }

    const existing = document.getElementById("goong-js");
    if (existing) {
      existing.addEventListener("load", () => resolve(window.goongjs));
      existing.addEventListener("error", reject);
      return;
    }

    const script = document.createElement("script");
    script.id = "goong-js";
    script.src = `${GOONG_CDN}/goong-js.js`;
    script.async = true;
    script.onload = () => resolve(window.goongjs);
    script.onerror = reject;
    document.body.appendChild(script);
  });
}

/**
 * Chọn vị trí điểm đến trên bản đồ Goong.
 * - Bấm lên bản đồ / kéo ghim / tìm địa chỉ / vị trí của tôi → tra địa chỉ Goong (đơn vị hành chính mới)
 * - onSelect({ latitude, longitude, address }) với address = { display, detail, ward, province, lat, lng } | null
 */
export default function GoongMapPickerModal({
  isOpen,
  onClose,
  initialLatitude,
  initialLongitude,
  placeName = "",
  onSelect,
}) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [styleId, setStyleId] = useState("web");
  const [currentPos, setCurrentPos] = useState(DEFAULT_POS);

  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [searchError, setSearchError] = useState("");

  const [pickedAddress, setPickedAddress] = useState(null);
  const [addressLoading, setAddressLoading] = useState(false);
  const [addressError, setAddressError] = useState("");
  // Bỏ qua kết quả của lần tra cũ khi người dùng đã ghim chỗ khác
  const lookupSeqRef = useRef(0);

  const lookupAddress = useCallback(async (lat, lng) => {
    const seq = ++lookupSeqRef.current;
    setAddressLoading(true);
    setAddressError("");
    try {
      const addr = await geoService.reverse(lat, lng);
      if (seq !== lookupSeqRef.current) return;
      setPickedAddress(addr);
      if (!addr) setAddressError("Không xác định được địa chỉ tại điểm này. Bạn có thể tự nhập trong form.");
    } catch (err) {
      if (seq !== lookupSeqRef.current) return;
      setPickedAddress(null);
      setAddressError(
        geoService.isGeoNotConfigured(err)
          ? "Chưa cấu hình Goong trên máy chủ nên không tự lấy được địa chỉ."
          : err?.message || "Không tra được địa chỉ, vui lòng thử lại."
      );
    } finally {
      if (seq === lookupSeqRef.current) setAddressLoading(false);
    }
  }, []);

  // Sự kiện của bản đồ giữ hàm cũ, nên gọi qua ref
  const lookupAddressRef = useRef(lookupAddress);
  useEffect(() => {
    lookupAddressRef.current = lookupAddress;
  }, [lookupAddress]);

  const placeMarker = useCallback((lat, lng) => {
    setCurrentPos({ lat, lng });
    markerRef.current?.setLngLat([lng, lat]);
  }, []);

  const initMap = useCallback(async () => {
    if (!mapContainerRef.current) return;
    if (!MAPTILES_KEY) {
      setLoadError("Chưa cấu hình NEXT_PUBLIC_GOONG_MAPTILES_KEY nên không hiển thị được bản đồ Goong.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError("");

    try {
      const goongjs = await loadGoongJs();
      goongjs.accessToken = MAPTILES_KEY;

      mapRef.current?.remove();

      const lat = parseCoord(initialLatitude, DEFAULT_POS.lat);
      const lng = parseCoord(initialLongitude, DEFAULT_POS.lng);
      const hasInitial = Boolean(initialLatitude && initialLongitude);
      setCurrentPos({ lat, lng });

      const map = new goongjs.Map({
        container: mapContainerRef.current,
        style: MAP_STYLES[0].url,
        center: [lng, lat],
        zoom: hasInitial ? 16 : 13,
      });
      map.addControl(new goongjs.NavigationControl({ showCompass: false }), "bottom-right");

      const marker = new goongjs.Marker({ color: "#059669", draggable: true })
        .setLngLat([lng, lat])
        .addTo(map);

      marker.on("drag", () => {
        const p = marker.getLngLat();
        setCurrentPos({ lat: p.lat, lng: p.lng });
      });
      // Thả ghim xong mới tra địa chỉ (tránh gọi API liên tục khi đang kéo)
      marker.on("dragend", () => {
        const p = marker.getLngLat();
        lookupAddressRef.current(p.lat, p.lng);
      });
      map.on("click", (e) => {
        const { lat: cLat, lng: cLng } = e.lngLat;
        marker.setLngLat([cLng, cLat]);
        setCurrentPos({ lat: cLat, lng: cLng });
        lookupAddressRef.current(cLat, cLng);
      });
      map.on("load", () => {
        map.resize();
        setLoading(false);
      });
      map.on("error", (e) => {
        // Sai key / key bị giới hạn tên miền → không tải được style
        if (e?.error?.status === 401 || e?.error?.status === 403) {
          setLoadError("Goong từ chối Maptiles key (sai key hoặc chưa cho phép tên miền này).");
          setLoading(false);
        }
      });

      mapRef.current = map;
      markerRef.current = marker;
    } catch (err) {
      console.error("[GoongMapPicker] init error", err);
      setLoadError("Không thể tải bản đồ Goong. Vui lòng kiểm tra kết nối mạng.");
      setLoading(false);
    }
  }, [initialLatitude, initialLongitude]);

  // Mở modal: reset trạng thái và dựng bản đồ
  useEffect(() => {
    if (!isOpen) return;
    lookupSeqRef.current += 1;
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setStyleId("web");
      setSearchQuery(placeName || "");
      setSearchResults([]);
      setSearchError("");
      setPickedAddress(null);
      setAddressLoading(false);
      setAddressError("");
    });
    const timer = setTimeout(initMap, 50);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      mapRef.current?.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, [isOpen, initMap, placeName]);

  const switchStyle = (id) => {
    const cfg = MAP_STYLES.find((s) => s.id === id);
    if (!cfg || !mapRef.current) return;
    mapRef.current.setStyle(cfg.url);
    setStyleId(id);
  };

  const flyTo = (lat, lng) => {
    placeMarker(lat, lng);
    mapRef.current?.flyTo({ center: [lng, lat], zoom: 17, speed: 1.4 });
  };

  const handleSearch = async () => {
    const q = searchQuery.trim();
    if (!q) return;
    setSearching(true);
    setSearchError("");
    setSearchResults([]);
    try {
      const items = await geoService.autocomplete(q, currentPos);
      if (items.length === 0) {
        setSearchError("Không tìm thấy địa chỉ phù hợp. Hãy thử thêm tên phường/xã hoặc tỉnh/thành.");
      }
      setSearchResults(items);
    } catch (err) {
      setSearchError(
        geoService.isGeoNotConfigured(err)
          ? "Chưa cấu hình Goong trên máy chủ nên không tìm kiếm được. Hãy bấm trực tiếp lên bản đồ."
          : err?.message || "Không tìm kiếm được, vui lòng thử lại."
      );
    } finally {
      setSearching(false);
    }
  };

  // Gợi ý chưa có tọa độ: lấy chi tiết (tọa độ + địa chỉ) theo refId
  const handleSelectResult = async (item) => {
    setSearchResults([]);
    const seq = ++lookupSeqRef.current;
    setSearching(true);
    setAddressError("");
    try {
      const place = await geoService.getPlace(item.refId);
      if (seq !== lookupSeqRef.current) return;
      if (place?.lat == null || place?.lng == null) throw new Error("Địa điểm không có tọa độ");
      flyTo(Number(place.lat), Number(place.lng));
      setPickedAddress(place);
      setAddressLoading(false);
    } catch (err) {
      setSearchError(err?.message || "Không lấy được vị trí của địa điểm này.");
    } finally {
      setSearching(false);
    }
  };

  const handleMyLocation = async () => {
    setSearchError("");
    try {
      const { latitude, longitude } = await getDevicePosition();
      flyTo(latitude, longitude);
      lookupAddress(latitude, longitude);
    } catch (err) {
      setSearchError(describeGeoError(err));
    }
  };

  const handleConfirm = () => {
    onSelect?.({
      latitude: currentPos.lat.toFixed(7),
      longitude: currentPos.lng.toFixed(7),
      address: pickedAddress,
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-70 bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200"
    >
      <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl border border-slate-200/90 overflow-hidden flex flex-col h-[650px] max-h-[92vh] animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="shrink-0 px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 via-white to-emerald-50/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0">
              <MapPin size={18} className="text-emerald-700" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm sm:text-base">Chọn vị trí trên bản đồ Goong</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Bấm lên bản đồ, kéo ghim hoặc tìm địa chỉ — tỉnh/thành, xã/phường và tọa độ sẽ được điền tự động
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Đóng"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tìm kiếm địa chỉ (Goong Autocomplete) */}
        <div className="shrink-0 px-6 py-3 bg-slate-50 border-b border-slate-200/80 relative z-10">
          {/* Không dùng <form>: hộp thoại này nằm trong form của trang gọi, submit sẽ kích hoạt form ngoài */}
          <div className="relative flex items-center gap-2">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    e.stopPropagation();
                    handleSearch();
                  }
                }}
                placeholder="Tìm di tích, đền chùa, địa chỉ (vd: Chùa Bái Đính, Hồ Hoàn Kiếm...)"
                className="w-full pl-9 pr-24 py-2 text-xs font-semibold bg-white border border-slate-200 rounded-xl outline-hidden focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15 transition-all text-slate-800"
              />
              <button
                type="button"
                onClick={handleSearch}
                disabled={searching}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold transition-colors cursor-pointer disabled:opacity-50"
              >
                {searching ? <Loader2 size={12} className="animate-spin" /> : "Tìm kiếm"}
              </button>
            </div>
            <button
              type="button"
              onClick={handleMyLocation}
              className="px-3 py-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 shadow-2xs"
              title="Đưa ghim về vị trí GPS hiện tại của máy bạn"
            >
              <Navigation size={13} className="text-emerald-600" />
              <span className="hidden sm:inline">Vị trí của tôi</span>
            </button>
          </div>

          {searchResults.length > 0 && (
            <div className="absolute left-6 right-6 top-full mt-1.5 bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden max-h-56 overflow-y-auto divide-y divide-slate-100 z-20 animate-in fade-in">
              {searchResults.map((res, idx) => (
                <button
                  key={res.refId || idx}
                  type="button"
                  onClick={() => handleSelectResult(res)}
                  className="w-full text-left p-3 hover:bg-emerald-50/50 transition-colors flex items-start gap-2.5 cursor-pointer"
                >
                  <MapPin size={15} className="text-emerald-600 shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 truncate">{res.name || res.display || "Địa điểm"}</p>
                    <p className="text-[11px] text-slate-500 truncate">{res.address || ""}</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {searchError && <p className="text-[11px] font-medium text-rose-600 mt-1.5">{searchError}</p>}
        </div>

        {/* Bản đồ Goong */}
        <div className="flex-1 relative bg-slate-100 overflow-hidden">
          {loading && !loadError && (
            <div className="absolute inset-0 bg-white/80 backdrop-blur-2xs flex flex-col items-center justify-center gap-3 z-10 text-slate-500">
              <Loader2 size={30} className="animate-spin text-emerald-600" />
              <p className="text-xs font-bold">Đang nạp bản đồ Goong...</p>
            </div>
          )}

          {loadError && (
            <div className="absolute inset-0 bg-white flex flex-col items-center justify-center p-6 text-center gap-2 z-10 text-rose-600">
              <p className="text-xs font-bold max-w-md">{loadError}</p>
              {MAPTILES_KEY && (
                <button
                  type="button"
                  onClick={initMap}
                  className="mt-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold cursor-pointer"
                >
                  Thử lại
                </button>
              )}
            </div>
          )}

          <div className="absolute top-3 right-3 z-10 bg-white/95 backdrop-blur-xs rounded-xl shadow-md border border-slate-200/90 p-1 flex items-center gap-1">
            <div className="px-2 py-1 text-slate-400 hidden sm:flex items-center gap-1">
              <Layers size={13} />
              <span className="text-xs font-bold">Kiểu:</span>
            </div>
            {MAP_STYLES.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => switchStyle(s.id)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                  styleId === s.id
                    ? "bg-emerald-600 text-white shadow-2xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                {s.name}
              </button>
            ))}
          </div>

          <div ref={mapContainerRef} className="w-full h-full" />
        </div>

        {/* Địa chỉ tại điểm ghim sẽ được điền vào form khi xác nhận */}
        <div className="shrink-0 px-6 py-2.5 bg-white border-t border-slate-200 flex items-start gap-2.5 min-h-[52px]">
          <MapPin size={15} className="text-emerald-600 shrink-0 mt-0.5" />
          <div className="min-w-0 flex-1 text-xs">
            {addressLoading ? (
              <span className="inline-flex items-center gap-1.5 text-slate-500">
                <Loader2 size={12} className="animate-spin" /> Đang tra địa chỉ tại điểm ghim…
              </span>
            ) : pickedAddress ? (
              <>
                <p className="font-medium text-slate-800 truncate" title={pickedAddress.display}>
                  {pickedAddress.display}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Khi xác nhận, tỉnh/thành, xã/phường và địa chỉ cụ thể sẽ được điền vào form để bạn kiểm tra lại.
                </p>
              </>
            ) : addressError ? (
              <span className="text-amber-700">{addressError}</span>
            ) : (
              <span className="text-slate-500">Bấm lên bản đồ, kéo ghim hoặc tìm địa chỉ để tự điền địa chỉ vào form.</span>
            )}
          </div>
        </div>

        {/* Tọa độ & xác nhận */}
        <div className="shrink-0 px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 text-xs text-slate-600 flex-wrap">
            <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-3 py-1.5 rounded-xl font-mono shadow-2xs">
              <span className="text-slate-400 font-bold">Vĩ độ (Lat):</span>
              <span className="font-bold text-slate-900">{currentPos.lat.toFixed(7)}</span>
            </div>
            <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-3 py-1.5 rounded-xl font-mono shadow-2xs">
              <span className="text-slate-400 font-bold">Kinh độ (Lng):</span>
              <span className="font-bold text-slate-900">{currentPos.lng.toFixed(7)}</span>
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200/60 transition-colors cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={addressLoading || Boolean(loadError)}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold shadow-sm inline-flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <Check size={14} />
              <span>Xác nhận vị trí này</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
