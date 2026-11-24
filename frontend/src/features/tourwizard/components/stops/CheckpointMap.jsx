"use client";

import React, { useEffect, useRef, useState } from "react";
import { MapPin, ExternalLink } from "lucide-react";
import { loadGoongJs, circlePolygon } from "@/features/destination/components/GoongMapPickerModal";

const MAPTILES_KEY = process.env.NEXT_PUBLIC_GOONG_MAPTILES_KEY || "";
const STYLE_URL = "https://tiles.goong.io/assets/goong_map_web.json";
const REFERENCE_COLOR = "#d97706";

const toPoint = (latitude, longitude) => {
  const lat = Number(latitude);
  const lng = Number(longitude);
  return latitude != null && latitude !== "" && longitude != null && longitude !== ""
    && Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
};

/**
 * Bản đồ xem trước checkpoint: ghim + vòng tròn bán kính (vùng khách phải đến để mở trải nghiệm).
 * reference (không bắt buộc): vùng check-in của điểm đến, vẽ màu cam nét đứt để so vị trí checkpoint.
 * Không có maptiles key thì hiện tọa độ + link Google Maps.
 */
export default function CheckpointMap({ latitude, longitude, radius, emptyLabel = "Chưa chọn checkpoint", reference = null }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const refMarkerRef = useRef(null);
  const [failed, setFailed] = useState(!MAPTILES_KEY);
  const point = toPoint(latitude, longitude);
  const hasPoint = point !== null;
  const lat = point?.lat;
  const lng = point?.lng;
  const ref = toPoint(reference?.latitude, reference?.longitude);
  const refLat = ref?.lat;
  const refLng = ref?.lng;
  const refRadius = Number(reference?.radius) || 0;

  useEffect(() => {
    if (!hasPoint || failed || !containerRef.current) return undefined;
    let cancelled = false;
    loadGoongJs()
      .then((goongjs) => {
        if (cancelled || !containerRef.current) return;
        goongjs.accessToken = MAPTILES_KEY;
        const radiusM = Number(radius) || 50;
        const setCircle = (map, id, data, color, dashed) => {
          if (map.getSource(id)) {
            map.getSource(id).setData(data);
            return;
          }
          map.addSource(id, { type: "geojson", data });
          map.addLayer({ id: `${id}-fill`, type: "fill", source: id, paint: { "fill-color": color, "fill-opacity": dashed ? 0.1 : 0.18 } });
          map.addLayer({ id: `${id}-line`, type: "line", source: id,
            paint: { "line-color": color, "line-width": 2, ...(dashed ? { "line-dasharray": [2, 1.5] } : {}) } });
        };
        const draw = (map) => {
          const hasRef = refLat !== undefined && refLng !== undefined;
          // Vùng điểm đến vẽ trước để vòng checkpoint nằm trên.
          if (hasRef && refRadius > 0) {
            setCircle(map, "ref-radius", circlePolygon(refLat, refLng, refRadius), REFERENCE_COLOR, true);
          } else if (map.getSource("ref-radius")) {
            map.getSource("ref-radius").setData({ type: "FeatureCollection", features: [] });
          }
          setCircle(map, "cp-radius", circlePolygon(lat, lng, radiusM), "#10b981", false);
          if (hasRef) {
            if (!refMarkerRef.current) refMarkerRef.current = new goongjs.Marker({ color: REFERENCE_COLOR, scale: 0.75 });
            refMarkerRef.current.setLngLat([refLng, refLat]).addTo(map);
          } else {
            refMarkerRef.current?.remove();
          }
          if (!markerRef.current) markerRef.current = new goongjs.Marker({ color: "#059669" });
          markerRef.current.setLngLat([lng, lat]).addTo(map);
          if (hasRef && (refLat !== lat || refLng !== lng)) {
            // Thấy cả checkpoint lẫn điểm đến; gần nhau thì vẫn giữ mức zoom đủ chi tiết.
            map.fitBounds([[Math.min(lng, refLng), Math.min(lat, refLat)], [Math.max(lng, refLng), Math.max(lat, refLat)]],
              { padding: 40, maxZoom: radiusM > 200 ? 15 : 17, duration: 0 });
          } else {
            map.easeTo({ center: [lng, lat], zoom: radiusM > 200 ? 15 : 17 });
          }
        };
        if (!mapRef.current) {
          const map = new goongjs.Map({ container: containerRef.current, style: STYLE_URL, center: [lng, lat], zoom: 16, interactive: false });
          mapRef.current = map;
          map.on("load", () => draw(map));
          map.on("error", () => setFailed(true));
        } else if (mapRef.current.isStyleLoaded()) {
          draw(mapRef.current);
        }
      })
      .catch(() => setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [hasPoint, lat, lng, radius, failed, refLat, refLng, refRadius]);

  useEffect(() => () => mapRef.current?.remove(), []);

  if (!hasPoint) {
    return (
      <div className="h-40 rounded-xl border border-dashed border-slate-200 bg-slate-50 flex flex-col items-center justify-center gap-1 text-slate-400 text-xs font-semibold">
        <MapPin size={18} />
        {emptyLabel}
      </div>
    );
  }
  if (failed) {
    return (
      <div className="h-40 rounded-xl border border-slate-200 bg-slate-50 flex flex-col items-center justify-center gap-1.5 text-xs text-slate-600">
        <MapPin size={18} className="text-emerald-600" />
        <span className="font-mono">{lat.toFixed(6)}, {lng.toFixed(6)} · bán kính {radius || 50}m</span>
        <a href={`https://www.google.com/maps?q=${lat},${lng}`} target="_blank" rel="noreferrer"
          className="inline-flex items-center gap-1 font-bold text-emerald-700 hover:underline">
          Xem trên Google Maps <ExternalLink size={11} />
        </a>
      </div>
    );
  }
  return (
    <div className="relative">
      <div ref={containerRef} className="h-44 rounded-xl overflow-hidden border border-slate-200" />
      <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-white/95 text-[11px] font-bold text-emerald-800 shadow-sm">
        Bán kính {radius || 50}m
      </span>
      {ref && (
        <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md bg-white/95 text-[11px] font-bold shadow-sm inline-flex items-center gap-1"
          style={{ color: REFERENCE_COLOR }}>
          <span className="w-2 h-2 rounded-full" style={{ background: REFERENCE_COLOR }} /> Vùng check-in điểm đến
        </span>
      )}
    </div>
  );
}
