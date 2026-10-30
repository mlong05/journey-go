"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  X,
  Search,
  MapPin,
  Navigation,
  Check,
  Loader2,
  ZoomIn,
  ZoomOut,
  Layers,
} from "lucide-react";
import { getDevicePosition, describeGeoError } from "@/lib/geolocation";

/**
 * Danh sách các tầng bản đồ mã nguồn mở (100% miễn phí, không cần API Key, máy chủ CDN ổn định tại VN)
 */
const MAP_LAYERS = [
  {
    id: "osmhot",
    name: "Du Lịch (OSM Hot)",
    url: "https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png",
    subdomains: "abc",
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>, Tiles style by <a href="https://www.hotosm.org/">Humanitarian OSM</a>',
    maxZoom: 19,
  },
  {
    id: "osmfr",
    name: "Tiêu Chuẩn (OSM)",
    url: "https://{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png",
    subdomains: "abc",
    attribution:
      '&copy; OpenStreetMap France | &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 20,
  },
  {
    id: "esri",
    name: "Đường Phố (ESRI)",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}",
    subdomains: "",
    attribution: "&copy; Esri, HERE, Garmin, USGS, NGA",
    maxZoom: 19,
  },
  {
    id: "google_hybrid",
    name: "Vệ Tinh (Google Hybrid)",
    url: "https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}",
    subdomains: "0123",
    attribution: "&copy; Google Maps",
    maxZoom: 20,
  },
];

/**
 * Chuyển đổi an toàn giá trị tọa độ sang Number
 */
function parseCoord(val, fallback) {
  if (val === undefined || val === null || val === "") return fallback;
  const num = Number(val);
  return Number.isFinite(num) && num !== 0 ? num : fallback;
}

/**
 * Hàm tải động Leaflet CSS và JS từ CDN (miễn phí, không cần npm package hay API key)
 */
function loadLeaflet() {
  if (typeof window === "undefined") return Promise.reject(new Error("No window"));
  if (window.L) return Promise.resolve(window.L);

  return new Promise((resolve, reject) => {
    // 1. Nạp CSS
    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link");
      link.id = "leaflet-css";
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      link.crossOrigin = "";
      document.head.appendChild(link);
    }

    // 2. Nạp JS
    const existing = document.getElementById("leaflet-js");
    if (existing) {
      if (window.L) return resolve(window.L);
      existing.addEventListener("load", () => resolve(window.L));
      existing.addEventListener("error", reject);
      return;
    }

    const script = document.createElement("script");
    script.id = "leaflet-js";
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.crossOrigin = "";
    script.async = true;
    script.onload = () => resolve(window.L);
    script.onerror = reject;
    document.body.appendChild(script);
  });
}

/**
 * Modal Chọn Tọa Độ Trên Bản Đồ Thực Địa OpenStreetMap (OSM)
 * - Miễn phí 100% vĩnh viễn, không cần thẻ tín dụng, không cần API Key
 * - Đa tầng bản đồ: Du lịch OSM Voyager, OSM Tiêu chuẩn, Ảnh vệ tinh
 * - Tìm kiếm địa danh Việt Nam qua Photon OpenStreetMap (CORS mở, không bị chặn)
 * - Kéo thả hoặc click chuột để chọn tọa độ kinh độ / vĩ độ chuẩn xác
 * - Hiển thị vòng tròn bán kính quét thực tế (radiusMeters)
 */
export default function LeafletMapPickerModal({
  isOpen,
  onClose,
  initialLatitude,
  initialLongitude,
  radiusMeters = 50,
  placeName = "",
  // Ẩn vòng tròn bán kính quét khi chỉ cần chọn tọa độ (vd: tọa độ điểm đến)
  showRadius = true,
  onSelect,
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const tileLayerRef = useRef(null);
  const markerRef = useRef(null);
  const circleRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [activeLayerId, setActiveLayerId] = useState("osmhot");

  // Tọa độ đang chọn (Mặc định Hà Nội: 21.028511, 105.854167)
  const [currentPos, setCurrentPos] = useState({
    lat: parseCoord(initialLatitude, 21.028511),
    lng: parseCoord(initialLongitude, 105.854167),
  });

  // Tìm kiếm địa danh
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [searchError, setSearchError] = useState("");

  // Cập nhật tọa độ khi mở modal
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) {
        const lat = parseCoord(initialLatitude, 21.028511);
        const lng = parseCoord(initialLongitude, 105.854167);
        setCurrentPos({ lat, lng });
        setSearchQuery(placeName || "");
        setSearchResults([]);
        setSearchError("");
      }
    });
    return () => {
      cancelled = true;
    };
  }, [isOpen, initialLatitude, initialLongitude, placeName]);

  // Đổi tầng bản đồ
  const switchLayer = useCallback((layerId) => {
    const layerCfg = MAP_LAYERS.find((l) => l.id === layerId);
    if (!layerCfg || !mapInstanceRef.current || !window.L) return;

    if (tileLayerRef.current) {
      mapInstanceRef.current.removeLayer(tileLayerRef.current);
    }

    const newTileLayer = window.L.tileLayer(layerCfg.url, {
      subdomains: layerCfg.subdomains || "abc",
      attribution: layerCfg.attribution,
      maxZoom: layerCfg.maxZoom || 19,
    });
    newTileLayer.addTo(mapInstanceRef.current);
    if (newTileLayer.bringToBack) {
      newTileLayer.bringToBack();
    }
    tileLayerRef.current = newTileLayer;
    setActiveLayerId(layerId);
  }, []);

  // Khởi tạo bản đồ Leaflet
  const initMap = useCallback(async () => {
    if (!mapContainerRef.current) return;
    setLoading(true);
    setLoadError("");

    try {
      const L = await loadLeaflet();

      // Nếu đã có bản đồ trước đó, dọn dẹp
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        tileLayerRef.current = null;
      }

      const defaultLat = parseCoord(initialLatitude, 21.028511);
      const defaultLng = parseCoord(initialLongitude, 105.854167);
      const hasInitial = Boolean(initialLatitude && initialLongitude);
      const zoomLevel = hasInitial ? 16 : 13;

      // Tạo bản đồ Leaflet
      const map = L.map(mapContainerRef.current, {
        center: [defaultLat, defaultLng],
        zoom: zoomLevel,
        zoomControl: false,
      });

      // Tầng bản đồ mặc định: OSM Hot (Du lịch 100% miễn phí, không API Key, không watermark)
      const initialLayerCfg = MAP_LAYERS.find((l) => l.id === activeLayerId) || MAP_LAYERS[0];
      const tileLayer = L.tileLayer(initialLayerCfg.url, {
        subdomains: initialLayerCfg.subdomains || "abc",
        attribution: initialLayerCfg.attribution,
        maxZoom: initialLayerCfg.maxZoom || 19,
      }).addTo(map);

      tileLayerRef.current = tileLayer;

      // Icon con ghim xanh ngọc tùy biến phong cách du lịch
      const customIcon = L.divIcon({
        className: "custom-leaflet-marker",
        html: `
          <div style="
            width: 36px;
            height: 36px;
            background: linear-gradient(135deg, #059669 0%, #047857 100%);
            border: 3px solid #ffffff;
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            box-shadow: 0 4px 12px rgba(0,0,0,0.35);
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: grab;
          ">
            <div style="
              width: 11px;
              height: 11px;
              background: #ffffff;
              border-radius: 50%;
              transform: rotate(45deg);
            "></div>
          </div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 36],
        popupAnchor: [0, -36],
      });

      // Tạo Marker có thể kéo thả
      const marker = L.marker([defaultLat, defaultLng], {
        icon: customIcon,
        draggable: true,
      }).addTo(map);

      // Tạo vòng tròn bán kính quét GPS (radiusMeters)
      const rad = Number(radiusMeters) || 50;
      const circle = L.circle([defaultLat, defaultLng], {
        color: "#059669",
        fillColor: "#10b981",
        fillOpacity: showRadius ? 0.16 : 0,
        opacity: showRadius ? 1 : 0,
        radius: rad,
        weight: 2,
        dashArray: "4, 6",
      }).addTo(map);

      markerRef.current = marker;
      circleRef.current = circle;
      mapInstanceRef.current = map;

      // Cập nhật khi kéo marker
      marker.on("drag", (e) => {
        const pos = e.target.getLatLng();
        circle.setLatLng(pos);
        setCurrentPos({ lat: pos.lat, lng: pos.lng });
      });

      // Cập nhật khi click lên bản đồ
      map.on("click", (e) => {
        const { lat, lng } = e.latlng;
        marker.setLatLng([lat, lng]);
        circle.setLatLng([lat, lng]);
        setCurrentPos({ lat, lng });
      });

      // Khắc phục kích thước render khi Leaflet nằm trong Modal
      map.whenReady(() => {
        setTimeout(() => map.invalidateSize(), 50);
        setTimeout(() => map.invalidateSize(), 200);
        setTimeout(() => map.invalidateSize(), 500);
      });

      setLoading(false);
    } catch (err) {
      console.error("[LeafletMapPicker] init error", err);
      setLoadError("Không thể tải bản đồ OpenStreetMap. Vui lòng kiểm tra kết nối mạng.");
      setLoading(false);
    }
  }, [initialLatitude, initialLongitude, radiusMeters, showRadius, activeLayerId]);

  useEffect(() => {
    if (!isOpen) return;
    let timer = setTimeout(() => {
      initMap();
    }, 100);

    return () => {
      clearTimeout(timer);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        tileLayerRef.current = null;
        markerRef.current = null;
        circleRef.current = null;
      }
    };
  }, [isOpen, initMap]);

  // Tìm kiếm địa điểm bằng Photon OpenStreetMap (Hoàn toàn miễn phí, CORS mở, không bị chặn tại VN)
  const handleSearchLocation = async (e) => {
    if (e?.preventDefault) e.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;

    setSearching(true);
    setSearchError("");
    setSearchResults([]);

    try {
      const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=6&lang=en`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Search server returned " + res.status);
      const data = await res.json();

      if (data && Array.isArray(data.features) && data.features.length > 0) {
        const formatted = data.features.map((feat, idx) => {
          const props = feat.properties || {};
          const [lng, lat] = feat.geometry?.coordinates || [0, 0];
          const parts = [
            props.name,
            props.street,
            props.district,
            props.city || props.state,
            props.country,
          ].filter(Boolean);

          return {
            id: props.osm_id || idx,
            title: props.name || parts[0] || "Địa điểm",
            subtitle: parts.slice(1).join(", ") || props.country || "Việt Nam",
            lat: Number(lat),
            lng: Number(lng),
          };
        });
        setSearchResults(formatted);
      } else {
        setSearchError(
          "Không tìm thấy địa điểm nào với từ khóa này. Hãy thử từ khóa ngắn gọn hơn (vd: Chùa Một Cột, Hồ Gươm, Ba Na Hills...)"
        );
      }
    } catch (err) {
      console.warn("[Photon Search] error", err);
      setSearchError(
        "Không thể kết nối máy chủ tra cứu địa danh. Bạn vẫn có thể click trực tiếp lên bản đồ hoặc dùng nút 'Vị trí của tôi'."
      );
    } finally {
      setSearching(false);
    }
  };

  // Di chuyển bản đồ đến địa điểm tìm được
  const handleSelectSearchResult = (item) => {
    const lat = Number(item.lat);
    const lng = Number(item.lng);
    setCurrentPos({ lat, lng });
    setSearchResults([]);

    if (mapInstanceRef.current && markerRef.current && circleRef.current) {
      mapInstanceRef.current.flyTo([lat, lng], 16, { duration: 1.2 });
      markerRef.current.setLatLng([lat, lng]);
      circleRef.current.setLatLng([lat, lng]);
    }
  };

  // Bay về vị trí GPS hiện tại của máy
  const handleGoToMyLocation = async () => {
    setSearchError("");
    try {
      const { latitude: lat, longitude: lng } = await getDevicePosition();
      setCurrentPos({ lat, lng });

      if (mapInstanceRef.current && markerRef.current && circleRef.current) {
        mapInstanceRef.current.flyTo([lat, lng], 17, { duration: 1 });
        markerRef.current.setLatLng([lat, lng]);
        circleRef.current.setLatLng([lat, lng]);
      }
    } catch (err) {
      setSearchError(describeGeoError(err));
    }
  };

  // Zoom In / Out
  const handleZoom = (delta) => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setZoom(mapInstanceRef.current.getZoom() + delta);
    }
  };

  // Xác nhận vị trí đã chọn
  const handleConfirm = () => {
    if (onSelect) {
      onSelect({
        latitude: currentPos.lat.toFixed(7),
        longitude: currentPos.lng.toFixed(7),
      });
    }
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
        {/* Header Modal */}
        <div className="shrink-0 px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 via-white to-amber-50/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl p-0.5 bg-gradient-to-br from-amber-300 via-amber-500 to-amber-700 shadow-xs flex items-center justify-center shrink-0 overflow-hidden ring-2 ring-amber-400/40">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/image/compass-real.jpg"
                alt="La bàn thực địa"
                className="w-full h-full object-cover rounded-[14px]"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-slate-900 text-sm sm:text-base">
                  Bản Đồ Định Vị Thực Địa OpenStreetMap
                </h3>
                <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">
                  100% Miễn phí
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Bấm chuột lên bản đồ hoặc kéo con ghim xanh để chọn tọa độ điểm check-in
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Thanh tìm kiếm địa danh OSM Photon */}
        <div className="shrink-0 px-6 py-3 bg-slate-50 border-b border-slate-200/80 relative z-10">
          {/* Không dùng <form>: hộp thoại này nằm trong form của trang gọi, submit sẽ kích hoạt form ngoài */}
          <div className="relative flex items-center gap-2">
            <div className="relative flex-1">
              <Search
                size={15}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    e.stopPropagation();
                    handleSearchLocation();
                  }
                }}
                placeholder="Tìm kiếm di tích, đền chùa, phố xá (vd: Chùa Bái Đính, Hồ Hoàn Kiếm, Tràng An...)"
                className="w-full pl-9 pr-24 py-2 text-xs font-semibold bg-white border border-slate-200 rounded-xl outline-hidden focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15 transition-all text-slate-800"
              />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleSearchLocation();
                }}
                disabled={searching}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold transition-colors cursor-pointer disabled:opacity-50"
              >
                {searching ? <Loader2 size={12} className="animate-spin" /> : "Tìm kiếm"}
              </button>
            </div>

            <button
              type="button"
              onClick={handleGoToMyLocation}
              className="px-3 py-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 shadow-2xs"
              title="Đưa con ghim về vị trí GPS hiện tại của máy bạn"
            >
              <Navigation size={13} className="text-emerald-600" />
              <span className="hidden sm:inline">Vị trí của tôi</span>
            </button>
          </div>

          {/* Danh sách kết quả gợi ý địa danh */}
          {searchResults.length > 0 && (
            <div className="absolute left-6 right-6 top-full mt-1.5 bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden max-h-56 overflow-y-auto divide-y divide-slate-100 z-20 animate-in fade-in">
              {searchResults.map((res) => (
                <button
                  key={res.id}
                  type="button"
                  onClick={() => handleSelectSearchResult(res)}
                  className="w-full text-left p-3 hover:bg-emerald-50/50 transition-colors flex items-start gap-2.5 cursor-pointer"
                >
                  <MapPin size={15} className="text-emerald-600 shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 truncate">{res.title}</p>
                    <p className="text-[11px] text-slate-500 truncate">{res.subtitle}</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {searchError && (
            <p className="text-[11px] font-medium text-rose-600 mt-1.5">{searchError}</p>
          )}
        </div>

        {/* Khung bản đồ Leaflet */}
        <div className="flex-1 relative bg-slate-100 overflow-hidden">
          {loading && (
            <div className="absolute inset-0 bg-white/80 backdrop-blur-2xs flex flex-col items-center justify-center gap-3 z-10 text-slate-500">
              <Loader2 size={30} className="animate-spin text-emerald-600" />
              <p className="text-xs font-bold">Đang nạp bản đồ OpenStreetMap...</p>
            </div>
          )}

          {loadError && (
            <div className="absolute inset-0 bg-white flex flex-col items-center justify-center p-6 text-center gap-2 z-10 text-rose-600">
              <p className="text-xs font-bold">{loadError}</p>
              <button
                type="button"
                onClick={initMap}
                className="mt-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold"
              >
                Thử lại
              </button>
            </div>
          )}

          {/* Chọn tầng bản đồ (Voyager, OSM Chuẩn, Vệ Tinh) */}
          <div className="absolute top-3 right-3 z-10 bg-white/95 backdrop-blur-xs rounded-xl shadow-md border border-slate-200/90 p-1 flex items-center gap-1">
            <div className="px-2 py-1 text-slate-400 hidden sm:flex items-center gap-1">
              <Layers size={13} />
              <span className="text-[10px] font-bold uppercase">Kiểu:</span>
            </div>
            {MAP_LAYERS.map((layer) => (
              <button
                key={layer.id}
                type="button"
                onClick={() => switchLayer(layer.id)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                  activeLayerId === layer.id
                    ? "bg-emerald-600 text-white shadow-2xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                {layer.name}
              </button>
            ))}
          </div>

          {/* Container DOM cho Leaflet */}
          <div ref={mapContainerRef} className="w-full h-full z-0" />

          {/* Các nút điều khiển zoom tùy biến */}
          <div className="absolute right-4 bottom-4 flex flex-col gap-1.5 z-10">
            <button
              type="button"
              onClick={() => handleZoom(1)}
              className="w-8 h-8 rounded-xl bg-white/95 hover:bg-white text-slate-700 shadow-md border border-slate-200/80 flex items-center justify-center transition-colors cursor-pointer"
              title="Phóng to"
            >
              <ZoomIn size={16} />
            </button>
            <button
              type="button"
              onClick={() => handleZoom(-1)}
              className="w-8 h-8 rounded-xl bg-white/95 hover:bg-white text-slate-700 shadow-md border border-slate-200/80 flex items-center justify-center transition-colors cursor-pointer"
              title="Thu nhỏ"
            >
              <ZoomOut size={16} />
            </button>
          </div>
        </div>

        {/* Footer hiển thị tọa độ đã chọn & Nút xác nhận */}
        <div className="shrink-0 px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 text-xs text-slate-600 flex-wrap">
            <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-3 py-1.5 rounded-xl font-mono shadow-2xs">
              <span className="text-slate-400 font-bold">Vĩ độ (Lat):</span>
              <span className="font-black text-slate-900">{currentPos.lat.toFixed(7)}</span>
            </div>
            <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-3 py-1.5 rounded-xl font-mono shadow-2xs">
              <span className="text-slate-400 font-bold">Kinh độ (Lng):</span>
              <span className="font-black text-slate-900">{currentPos.lng.toFixed(7)}</span>
            </div>
            {showRadius && (
              <span className="text-[11px] text-slate-400 font-medium hidden md:inline">
                Vòng tròn xanh: Bán kính quét GPS {radiusMeters}m
              </span>
            )}
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
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold shadow-sm inline-flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
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
