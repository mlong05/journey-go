import { Compass, Users, Route, Star } from "lucide-react";

const STATS = [
  { icon: Compass, value: "150+", label: "Trải nghiệm trên toàn quốc", tone: "bg-emerald-50 text-emerald-700" },
  { icon: Users, value: "60+", label: "Host bản địa đã xác thực", tone: "bg-sky-50 text-sky-600" },
  { icon: Route, value: "15.000+", label: "Chuyến đi đã kết nối", tone: "bg-amber-50 text-amber-600" },
  { icon: Star, value: "4.9/5", label: "Điểm đánh giá trung bình", tone: "bg-rose-50 text-rose-600" },
];

export default function StatsStrip() {
  return (
    <section className="bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-4 pb-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {STATS.map(({ icon: Icon, value, label, tone }) => (
            <div
              key={label}
              className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex items-center gap-4"
            >
              <div className={`w-11 h-11 rounded-lg flex items-center justify-center shrink-0 ${tone}`}>
                <Icon size={20} />
              </div>
              <div className="min-w-0">
                <p className="text-2xl font-semibold tracking-tight text-slate-900 tabular-nums leading-none">
                  {value}
                </p>
                <p className="text-sm text-slate-500 mt-1.5">{label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
