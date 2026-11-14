"use client";

import React, { useEffect, useRef, useState } from "react";
import { MapPin, ExternalLink } from "lucide-react";
import { loadGoongJs } from "@/features/destination/components/GoongMapPickerModal";

const MAPTILES_KEY = process.env.NEXT_PUBLIC_GOONG_MAPTILES_KEY || "";
const STYLE_URL = "https://tiles.goong.io/assets/goong_map_web.json";

/** Đa giác xấp xỉ vòng tròn bán kính `meters` quanh (lat, lng). */
function circlePolygon(lat, lng, meters, steps = 64) {
  const coords = [];
  const dLat = meters / 111320;
  const dLng = meters / (111320 * Math.cos((lat * Math.PI) / 180));
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * 2 * Math.PI;
    coords.push([lng + dLng * Math.cos(t), lat + dLat * Math.sin(t)]);
  }
  return { type: "Feature", geometry: { type: "Polygon", coordinates: [coords] } };
}

/**
 * Bản đồ xem trước checkpoint: ghim + vòng tròn bán kính (vùng khách phải đến để mở trải nghiệm).
 * Không có maptiles key thì hiện tọa độ + link Google Maps.
 */
export default function CheckpointMap({ latitude, longitude, radius }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const [failed, setFailed] = useState(!MAPTILES_KEY);
  const lat = Number(latitude);
  const lng = Number(longitude);
  const hasPoint = Number.isFinite(lat) && Number.isFinite(lng) && latitude !== null && latitude !== "" && longitude !== null;

  useEffect(() => {
    if (!hasPoint || failed || !containerRef.current) return undefined;
    let cancelled = false;
    loadGoongJs()
      .then((goongjs) => {
        if (cancelled || !containerRef.current) return;
        goongjs.accessToken = MAPTILES_KEY;
        const radiusM = Number(radius) || 50;
        const draw = (map) => {
          const data = circlePolygon(lat, lng, radiusM);
          if (map.getSource("cp-radius")) {
            map.getSource("cp-radius").setData(data);
          } else {
            map.addSource("cp-radius", { type: "geojson", data });
            map.addLayer({ id: "cp-radius-fill", type: "fill", source: "cp-radius", paint: { "fill-color": "#10b981", "fill-opacity": 0.18 } });
            map.addLayer({ id: "cp-radius-line", type: "line", source: "cp-radius", paint: { "line-color": "#059669", "line-width": 2 } });
          }
          if (!markerRef.current) markerRef.current = new goongjs.Marker({ color: "#059669" });
          markerRef.current.setLngLat([lng, lat]).addTo(map);
          map.easeTo({ center: [lng, lat], zoom: radiusM > 200 ? 15 : 17 });
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
  }, [hasPoint, lat, lng, radius, failed]);

  useEffect(() => () => mapRef.current?.remove(), []);

  if (!hasPoint) {
    return (
      <div className="h-40 rounded-xl border border-dashed border-slate-200 bg-slate-50 flex flex-col items-center justify-center gap-1 text-slate-400 text-xs font-semibold">
        <MapPin size={18} />
        Chưa chọn checkpoint
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
    </div>
  );
}
