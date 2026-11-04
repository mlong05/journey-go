"use client";

import { useEffect, useRef, useState } from "react";
import { useInView, useReducedMotion, animate } from "framer-motion";
import { Compass, Users, Route, Star } from "lucide-react";

const STATS = [
  { icon: Compass, to: 150, suffix: "+", label: "Trải nghiệm trên toàn quốc", tone: "bg-emerald-50 text-emerald-700" },
  { icon: Users, to: 60, suffix: "+", label: "Host bản địa đã xác thực", tone: "bg-sky-50 text-sky-600" },
  { icon: Route, to: 15000, suffix: "+", label: "Chuyến đi đã kết nối", tone: "bg-amber-50 text-amber-600" },
  { icon: Star, to: 4.9, decimals: 1, suffix: "/5", label: "Điểm đánh giá trung bình", tone: "bg-rose-50 text-rose-600" },
];

const fmt = (n, decimals = 0) =>
  n.toLocaleString("vi-VN", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

function CountUp({ to, decimals = 0, suffix = "" }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const reduce = useReducedMotion();
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const controls = animate(0, to, { duration: reduce ? 0 : 1.8, ease: [0.16, 1, 0.3, 1], onUpdate: setValue });
    return () => controls.stop();
  }, [inView, reduce, to]);

  return (
    <span ref={ref} className="tabular-nums">
      {fmt(value, decimals)}
      {suffix}
    </span>
  );
}

export default function StatsStrip() {
  return (
    <section className="relative z-10 bg-white border-b border-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-0 lg:divide-x lg:divide-slate-200">
          {STATS.map(({ icon: Icon, label, tone, ...num }) => (
            <div key={label} className="flex items-center gap-4 lg:px-8 first:lg:pl-0">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${tone}`}>
                <Icon size={22} />
              </div>
              <div className="min-w-0">
                <p className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900 leading-tight">
                  <CountUp {...num} />
                </p>
                <p className="text-sm text-slate-500 mt-1 leading-normal">{label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
