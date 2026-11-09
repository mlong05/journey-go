"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { MapPin, ExternalLink } from "lucide-react";
import { loadGoongJs } from "@/features/destination/components/GoongMapPickerModal";

const MAPTILES_KEY = process.env.NEXT_PUBLIC_GOONG_MAPTILES_KEY || "";
const STYLE_URL = "https://tiles.goong.io/assets/goong_map_web.json";

const validPoint = (e) =>
  e && e.checkpointLatitude != null && e.checkpointLongitude != null
  && Number.isFinite(Number(e.checkpointLatitude)) && Number.isFinite(Number(e.checkpointLongitude));

/** Vị trí đại diện của điểm đến = checkpoint của trải nghiệm đầu tiên có tọa độ. */
export function stopLocation(stop) {
  const e = (stop?.experiences || []).find(validPoint);
  return e ? { lat: Number(e.checkpointLatitude), lng: Number(e.checkpointLongitude) } : null;
}

export const googleMapsUrl = (lat, lng) => `https://www.google.com/maps?q=${lat},${lng}`;

/**
 * Bản đồ tổng quan các điểm đến của tour: ghim đánh số theo thứ tự, nối bằng đường hành trình.
 * Mỗi checkpoint trải nghiệm là một chấm nhỏ. Không có maptiles key → danh sách + link Google Maps.
 */
export default function StopsOverviewMap({ stops = [] }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const [failed, setFailed] = useState(!MAPTILES_KEY);

  const points = useMemo(
    () => stops
      .map((s, i) => ({ index: i + 1, name: s.name || "Chưa đặt tên", loc: stopLocation(s),
        checkpoints: (s.experiences || []).filter(validPoint).map((e) => ({
          lat: Number(e.checkpointLatitude), lng: Number(e.checkpointLongitude), name: e.activityName,
        })) }))
      .filter((p) => p.loc),
    [stops],
  );
  const key = JSON.stringify(points);

  useEffect(() => {
    if (!points.length || failed || !containerRef.current) return undefined;
    let cancelled = false;
    loadGoongJs()
      .then((goongjs) => {
        if (cancelled || !containerRef.current) return;
        goongjs.accessToken = MAPTILES_KEY;
        const draw = (map) => {
          markersRef.current.forEach((m) => m.remove());
          markersRef.current = [];
          const route = { type: "Feature", geometry: { type: "LineString", coordinates: points.map((p) => [p.loc.lng, p.loc.lat]) } };
          if (map.getSource("route")) map.getSource("route").setData(route);
          else {
            map.addSource("route", { type: "geojson", data: route });
            map.addLayer({ id: "route-line", type: "line", source: "route",
              paint: { "line-color": "#059669", "line-width": 3, "line-dasharray": [2, 1.5], "line-opacity": 0.8 } });
          }
          const bounds = new goongjs.LngLatBounds();
          points.forEach((p) => {
            p.checkpoints.forEach((c) => {
              const dot = document.createElement("div");
              dot.style.cssText = "width:10px;height:10px;border-radius:9999px;background:#fff;border:2px solid #059669;";
              dot.title = c.name || "";
              markersRef.current.push(new goongjs.Marker({ element: dot }).setLngLat([c.lng, c.lat]).addTo(map));
              bounds.extend([c.lng, c.lat]);
            });
            const el = document.createElement("div");
            el.textContent = String(p.index);
            el.title = p.name;
            el.style.cssText = "width:28px;height:28px;border-radius:9999px;background:#059669;color:#fff;font-weight:800;font-size:13px;display:flex;align-items:center;justify-content:center;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.3);cursor:pointer;";
            const popup = new goongjs.Popup({ offset: 18, closeButton: false }).setText(`${p.index}. ${p.name}`);
            markersRef.current.push(new goongjs.Marker({ element: el }).setLngLat([p.loc.lng, p.loc.lat]).setPopup(popup).addTo(map));
            bounds.extend([p.loc.lng, p.loc.lat]);
          });
          if (points.length === 1 && points[0].checkpoints.length <= 1) map.easeTo({ center: [points[0].loc.lng, points[0].loc.lat], zoom: 16 });
          else map.fitBounds(bounds, { padding: 48, maxZoom: 17, duration: 0 });
        };
        if (!mapRef.current) {
          const map = new goongjs.Map({ container: containerRef.current, style: STYLE_URL,
            center: [points[0].loc.lng, points[0].loc.lat], zoom: 14 });
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, failed]);

  useEffect(() => () => mapRef.current?.remove(), []);

  if (!points.length) {
    return (
      <div className="h-24 rounded-xl border border-dashed border-slate-200 bg-slate-50 flex flex-col items-center justify-center gap-1 text-slate-400 text-xs font-semibold">
        <MapPin size={18} />
        Chưa có điểm đến nào có vị trí checkpoint
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {!failed && <div ref={containerRef} className="h-72 rounded-xl overflow-hidden border border-slate-200" />}
      <ol className="flex flex-wrap gap-1.5">
        {points.map((p) => (
          <li key={p.index}>
            <a href={googleMapsUrl(p.loc.lat, p.loc.lng)} target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg border border-slate-200 bg-white text-xs text-slate-700 hover:border-emerald-300 hover:text-emerald-800">
              <span className="w-5 h-5 rounded-full bg-emerald-600 text-white text-[11px] font-bold flex items-center justify-center">{p.index}</span>
              <span className="font-semibold">{p.name}</span>
              <ExternalLink size={11} className="text-slate-400" />
            </a>
          </li>
        ))}
      </ol>
    </div>
  );
}
