"use client";

import React, { useState } from "react";
import {
  ChevronLeft, ChevronRight, ChevronDown, Signal, Wifi, BatteryFull, Smartphone, MapPin, Clock, Route, BadgeCheck,
  Flag, Star, CheckCircle2, Images, Users, Headset, PlusCircle, MinusCircle, CalendarX, Banknote, CloudLightning,
  UtensilsCrossed, Umbrella, Mountain, Landmark, Church, Hammer, Leaf, PartyPopper, Library, Compass, X, Info,
  HelpCircle, Footprints, PlayCircle, Archive,
} from "lucide-react";

const HIDE_SCROLLBAR = "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden";
const WEEKDAYS = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

/** Icon chủ đề giống hàm themeIcon() trên app. */
function themeIcon(name) {
  const s = String(name || "").toLowerCase();
  const has = (keys) => keys.some((k) => s.includes(k));
  if (has(["am-thuc", "ẩm thực", "food", "gastronomy"])) return UtensilsCrossed;
  if (has(["bien", "biển", "beach", "đảo", "dao"])) return Umbrella;
  if (has(["nui", "núi", "mountain", "trekking"])) return Mountain;
  if (has(["lich-su", "lịch sử", "history", "di tích", "di-tich"])) return Landmark;
  if (has(["tam-linh", "tâm linh", "chùa", "chua", "đền", "den"])) return Church;
  if (has(["lang-nghe", "làng nghề", "thủ công", "thu-cong", "craft"])) return Hammer;
  if (has(["sinh-thai", "sinh thái", "eco", "thiên nhiên", "thien-nhien"])) return Leaf;
  if (has(["le-hoi", "lễ hội", "festival"])) return PartyPopper;
  if (has(["van-hoa", "văn hóa", "văn hoá", "culture"])) return Library;
  return Compass;
}

/** "5 phút", "1 phút 30 giây" như TourActivity.formattedDuration trên app. */
function activityDuration(sec) {
  if (!(sec > 0)) return null;
  const m = Math.floor(sec / 60);
  const r = sec % 60;
  if (!m) return `${r} giây`;
  return r ? `${m} phút ${r} giây` : `${m} phút`;
}

/** Đoạn văn dài: hiện 5 dòng đầu, bấm "Xem thêm" để mở hết (như _ExpandableText trên app). */
function ExpandableText({ text }) {
  const [open, setOpen] = useState(false);
  const long = String(text).length > 260 || String(text).split("\n").length > 5;
  return (
    <div>
      <p className={`text-[11.5px] leading-relaxed text-slate-800 whitespace-pre-line ${open ? "" : "line-clamp-5"}`}>{text}</p>
      {long && (
        <button type="button" onClick={() => setOpen((o) => !o)}
          className="mt-1 text-[11px] font-bold text-emerald-700 cursor-pointer">
          {open ? "Thu gọn" : "Xem thêm"}
        </button>
      )}
    </div>
  );
}

/** Cùng cách ghi thời lượng với app (formatTourDuration): "10 giờ", "4 giờ 30 phút", "3N2Đ". */
function appDuration(tour) {
  const m = tour.durationMinutes;
  if (tour.tourFormat === "DAY_TRIP" && m > 0) {
    const h = Math.floor(m / 60);
    if (!h) return `${m % 60} phút`;
    return m % 60 ? `${h} giờ ${m % 60} phút` : `${h} giờ`;
  }
  const days = tour.durationDays || 0;
  if (tour.tourFormat === "MULTI_DAY" && days > 0) return tour.durationNights > 0 ? `${days}N${tour.durationNights}Đ` : `${days} ngày`;
  if (tour.tourFormat === "DAY_TRIP") return "Trong ngày";
  return days <= 1 ? "1 ngày" : `${days} ngày`;
}

const money = (v) => `${Math.round(Number(v)).toLocaleString("vi-VN")} đ`;
const priceText = (p) => (p.alwaysFree || !(Number(p.price) > 0) ? "Miễn phí" : money(p.price));

/** Ảnh hiển thị trên app: ảnh bìa đứng đầu, sau đó album (giống TourPublicDetailResponse). */
function appImages(tour) {
  const list = [];
  if (tour.coverImageUrl) list.push(tour.coverImageUrl);
  (tour.images || []).forEach((u) => { if (u && !list.includes(u)) list.push(u); });
  return list;
}

function SectionTitle({ children }) {
  return (
    <h3 className="px-3.5 pt-5 pb-2 flex items-center gap-1.5 text-[13px] font-bold text-slate-900">
      <span className="w-[3px] h-3.5 rounded-full bg-emerald-600 shrink-0" aria-hidden />{children}
    </h3>
  );
}

const Card = ({ children, className = "p-3" }) => (
  <div className="mx-3.5"><div className={`rounded-2xl border border-slate-200 bg-white ${className}`}>{children}</div></div>
);

function Pill({ Icon, children }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-50 text-emerald-800 text-[10.5px] font-semibold">
      <Icon size={11} />{children}
    </span>
  );
}

/** Mục xổ xuống như ExpansionTile trên app. */
function Expandable({ Icon, title, children, defaultOpen = false, leading }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open}
        className="w-full flex items-center gap-2 px-3 py-2.5 text-left cursor-pointer">
        {leading || <Icon size={14} className="text-slate-500 shrink-0" />}
        <span className="flex-1 min-w-0 text-[11.5px] font-bold text-slate-800">{title}</span>
        <ChevronDown size={14} className={`text-slate-400 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="px-3 pb-2.5 text-[11px] leading-relaxed text-slate-700 whitespace-pre-line">{children}</div>}
    </div>
  );
}

/** Một ngày trong lịch trình: xổ xuống như _ItineraryTile (ExpansionTile) trên app. */
function ItineraryDay({ day, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open}
        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left cursor-pointer">
        <span className="w-7 h-7 rounded-full bg-sky-100 text-sky-800 text-[11px] font-extrabold flex items-center justify-center shrink-0">
          {day.dayNumber}
        </span>
        <span className="flex-1 min-w-0">
          <span className="block text-[11.5px] font-bold text-slate-800">{day.title || `Ngày ${day.dayNumber}`}</span>
          {day.mainActivity && <span className="block text-[10.5px] text-slate-500">{day.mainActivity}</span>}
        </span>
        <ChevronDown size={14} className={`text-slate-400 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && day.content && (
        <div className="px-3 pb-2.5 text-[11.5px] leading-relaxed text-slate-800 whitespace-pre-line">{day.content}</div>
      )}
    </div>
  );
}

/** Bảng xem trước điểm dừng trượt từ dưới lên, giống showStopPreview() trên app. */
function StopSheet({ stop, onClose }) {
  const quizCount = stop.quiz?.length || 0;
  const activities = stop.experiences || [];
  const culturalImages = stop.culturalImages || [];
  const artifacts = stop.artifacts || [];
  return (
    <div className="absolute inset-0 z-30 flex flex-col justify-end bg-slate-900/40" onClick={onClose}>
      <div className={`max-h-[85%] overflow-y-auto overscroll-contain rounded-t-3xl bg-white px-4 pb-6 ${HIDE_SCROLLBAR}`}
        onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-white pt-2 pb-1 flex justify-center">
          <span className="h-1 w-9 rounded-full bg-slate-300" aria-hidden />
          <button type="button" onClick={onClose} aria-label="Đóng" className="absolute right-0 top-1.5 p-1 text-slate-400 cursor-pointer">
            <X size={14} />
          </button>
        </div>
        <p className="text-[10.5px] font-bold text-emerald-700">Điểm dừng {stop.sequenceOrder}</p>
        <h4 className="text-[15px] font-extrabold text-slate-900">{stop.name || "Điểm dừng chưa đặt tên"}</h4>
        {stop.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={stop.imageUrl} alt="" className="mt-2.5 w-full aspect-video rounded-2xl object-cover" />
        )}
        {stop.shortDescription && <p className="mt-2.5 text-[11.5px] leading-relaxed text-slate-800 whitespace-pre-line">{stop.shortDescription}</p>}
        {stop.guestNote && (
          <div className="mt-2.5 p-2.5 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-2">
            <Info size={14} className="text-amber-700 shrink-0 mt-px" />
            <p className="text-[11px] leading-relaxed text-amber-900 whitespace-pre-line">{stop.guestNote}</p>
          </div>
        )}
        {stop.videoUrl && (
          <>
            <p className="mt-3.5 mb-1.5 text-[11.5px] font-bold text-slate-800">Video giới thiệu</p>
            <a href={stop.videoUrl} target="_blank" rel="noreferrer"
              className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-100 text-[11px] font-semibold text-sky-700 break-all">
              <PlayCircle size={16} className="shrink-0" />{stop.videoUrl}
            </a>
          </>
        )}
        {(stop.culturalContent || culturalImages.length > 0) && (
          <>
            <p className="mt-4 mb-1 text-[11.5px] font-bold text-slate-800">Câu chuyện văn hoá</p>
            {stop.culturalContent && <p className="text-[11.5px] leading-relaxed text-slate-800 whitespace-pre-line">{stop.culturalContent}</p>}
            {culturalImages.length > 0 && (
              <div className={`mt-2 flex gap-1.5 overflow-x-auto ${HIDE_SCROLLBAR}`}>
                {culturalImages.map((u) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={u} src={u} alt="" className="shrink-0 w-[104px] h-[76px] rounded-xl object-cover" />
                ))}
              </div>
            )}
          </>
        )}
        {artifacts.length > 0 && (
          <>
            <p className="mt-4 mb-1.5 text-[11.5px] font-bold text-slate-800">Hiện vật</p>
            <div className="space-y-2">
              {artifacts.map((a, i) => (
                <div key={a.id || i} className="flex items-start gap-2">
                  {a.imageUrl
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={a.imageUrl} alt="" className="w-11 h-11 rounded-lg object-cover shrink-0" />
                    : <span className="w-11 h-11 rounded-lg bg-slate-100 text-slate-400 flex items-center justify-center shrink-0"><Archive size={16} /></span>}
                  <span className="min-w-0">
                    <span className="block text-[11.5px] font-bold text-slate-800">{a.name}</span>
                    {a.shortDescription && <span className="block text-[10.5px] leading-snug text-slate-500">{a.shortDescription}</span>}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
        {(quizCount > 0 || activities.length > 0) && (
          <>
            <p className="mt-4 mb-1.5 text-[11.5px] font-bold text-slate-800">Thử thách tại điểm</p>
            <div className="space-y-1.5">
              {quizCount > 0 && (
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-100">
                  <HelpCircle size={16} className="text-sky-600 shrink-0" />
                  <span className="min-w-0">
                    <span className="block text-[11.5px] font-bold text-slate-800">Câu đố văn hoá</span>
                    <span className="block text-[10.5px] text-slate-500">{quizCount} câu trắc nghiệm</span>
                  </span>
                </div>
              )}
              {activities.map((a, i) => (
                <div key={a.id || i} className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-100">
                  <Footprints size={16} className="text-sky-600 shrink-0" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[11.5px] font-bold text-slate-800">{a.activityName || "Hoạt động thực địa"}</span>
                    <span className="block text-[10.5px] text-slate-500">
                      {[activityDuration(a.durationSeconds), "quét QR tại điểm để xác nhận"].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                  {a.points > 0 && <span className="text-[11.5px] font-extrabold text-amber-700">+{a.points}</span>}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/**
 * Xem trước trang tour phía khách, dựng theo đúng thứ tự và cách trình bày màn "Chi tiết tour" trên app mobile
 * (TourWizardDetailBody): album ảnh → tên, nhãn, đơn vị cung cấp, nhiệm vụ → điểm nổi bật → ảnh tour → giới thiệu →
 * lịch trình → điểm dừng → bảng giá → ngày khởi hành → thông tin cần lưu ý → liên hệ, cuối cùng là thanh giá + Đặt tour.
 * Bấm điểm dừng mở bảng chi tiết như app. Khác app: không vẽ bản đồ lộ trình (đã có ở tab Nội dung) và nút Đặt tour
 * chỉ để minh họa.
 */
export default function CustomerPreview({ tour }) {
  const stops = [...(tour.stops || [])].sort((a, b) => (a.sequenceOrder || 0) - (b.sequenceOrder || 0));
  const images = appImages(tour);
  const [shown, setShown] = useState(0);
  const [openStop, setOpenStop] = useState(null);
  const ThemeIcon = themeIcon(tour.theme?.name);
  const taskCount = stops.reduce((n, s) => n + (s.quiz?.length || 0) + (s.experiences?.length || 0), 0);
  const totalPoints = stops.reduce((n, s) => n + (s.maxPoints || 0), 0);
  const prices = (tour.prices || []).filter((p) => p.price != null || p.alwaysFree);
  const adult = prices.find((p) => p.guestType === "ADULT");
  const today = new Date().toISOString().slice(0, 10);
  const dates = (tour.departureDates || []).filter((d) => d >= today).sort();
  const policies = [
    [PlusCircle, "Giá bao gồm", tour.priceIncludes],
    [MinusCircle, "Giá không bao gồm", tour.priceExcludes],
    [CalendarX, "Chính sách hủy", tour.cancellationPolicy],
    [Banknote, "Chính sách hoàn tiền", tour.refundPolicy],
    [CloudLightning, "Trường hợp bất khả kháng", tour.forceMajeure],
  ].filter(([, , text]) => text && String(text).trim());

  return (
    <div className="flex flex-col items-center gap-2 pb-2 xl:h-full">
      <p className="shrink-0 text-[11px] text-slate-500 inline-flex items-center gap-1">
        <Smartphone size={12} /> Mô phỏng màn Chi tiết tour trên ứng dụng của khách
      </p>

      {/* Khung điện thoại: xl cao theo cột, rộng suy ra từ tỉ lệ 9:19.5; nhỏ hơn thì rộng tối đa 340px. */}
      <div className="relative w-full max-w-[340px] xl:w-auto xl:max-w-full xl:flex-1 xl:min-h-0 xl:max-h-[820px] aspect-[9/19.5] overflow-hidden rounded-[2.4rem] bg-slate-900 p-[9px] shadow-[0_20px_50px_-15px_rgba(15,23,42,0.45)] ring-1 ring-slate-700">
        <div className="relative h-full w-full overflow-hidden rounded-[2rem] bg-slate-50 flex flex-col">
          {/* Thanh trạng thái + tai thỏ */}
          <div className="relative shrink-0 h-8 px-5 flex items-center justify-between text-[10px] font-bold text-slate-900 bg-white z-20">
            <span className="tabular-nums">9:41</span>
            <span className="absolute left-1/2 top-1.5 -translate-x-1/2 h-[18px] w-24 rounded-full bg-slate-900" aria-hidden />
            <span className="inline-flex items-center gap-1"><Signal size={11} /><Wifi size={11} /><BatteryFull size={13} /></span>
          </div>

          {/* Thanh tiêu đề như app */}
          <div className="shrink-0 h-10 px-3 flex items-center bg-white border-b border-slate-100">
            <ChevronLeft size={18} className="text-slate-700" />
            <span className="flex-1 text-center text-[13px] font-bold text-slate-900 -ml-[18px]">Chi tiết tour</span>
          </div>

          <div className={`flex-1 min-h-0 overflow-y-auto overscroll-contain ${HIDE_SCROLLBAR}`}>
            {/* Album ảnh: bấm ảnh nhỏ bên dưới để đổi, bộ đếm "1/6" như app */}
            <div className="relative aspect-[16/10] bg-gradient-to-br from-emerald-600 to-teal-700">
              {images.length > 0 && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={images[shown] || images[0]} alt="" className="w-full h-full object-cover" />
              )}
              {images.length > 1 && (
                <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded-full bg-slate-900/70 text-white text-[10px] font-bold inline-flex items-center gap-1">
                  <Images size={10} />{shown + 1}/{images.length}
                </span>
              )}
            </div>

            {/* Tên, nhãn, đơn vị cung cấp, nhiệm vụ */}
            <div className="px-3.5 pt-3 space-y-2">
              <h2 className="text-[16px] font-extrabold leading-snug text-slate-900 break-words">{tour.title || "Tour chưa đặt tên"}</h2>
              <div className="flex flex-wrap gap-1.5">
                {tour.region?.name && <Pill Icon={MapPin}>{tour.region.name}</Pill>}
                {tour.theme?.name && <Pill Icon={ThemeIcon}>{tour.theme.name}</Pill>}
                <Pill Icon={Clock}>{appDuration(tour)}</Pill>
                {stops.length > 0 && <Pill Icon={Route}>{stops.length} điểm dừng</Pill>}
              </div>
              {tour.createdByName && (
                <p className="text-[10.5px] text-slate-500 inline-flex items-center gap-1">
                  <BadgeCheck size={13} className="text-sky-600 shrink-0" />Cung cấp bởi {tour.createdByName} · đã được kiểm duyệt
                </p>
              )}
              {(taskCount > 0 || totalPoints > 0) && (
                <div className="w-fit px-2.5 py-1.5 rounded-xl bg-amber-50 border border-amber-200 flex items-center gap-3 text-[10.5px] font-bold">
                  {taskCount > 0 && <span className="inline-flex items-center gap-1 text-sky-700"><Flag size={11} />{taskCount} nhiệm vụ</span>}
                  {totalPoints > 0 && <span className="inline-flex items-center gap-1 text-amber-700"><Star size={11} />tối đa {totalPoints.toLocaleString("vi-VN")} điểm</span>}
                </div>
              )}
            </div>

            {(tour.highlights || []).length > 0 && (
              <>
                <SectionTitle>Điểm nổi bật</SectionTitle>
                <Card>
                  <ul className="space-y-1.5">
                    {tour.highlights.map((h, i) => (
                      <li key={i} className="flex items-start gap-1.5 text-[11.5px] leading-relaxed text-slate-800">
                        <CheckCircle2 size={14} className="text-emerald-600 shrink-0 mt-px" />{h}
                      </li>
                    ))}
                  </ul>
                </Card>
              </>
            )}

            {images.length > 0 && (
              <>
                <SectionTitle>Ảnh tour ({images.length})</SectionTitle>
                <div className={`px-3.5 flex gap-1.5 overflow-x-auto ${HIDE_SCROLLBAR}`}>
                  {images.map((u, i) => (
                    <button key={u} type="button" onClick={() => setShown(i)} aria-label={`Xem ảnh ${i + 1}`}
                      className={`shrink-0 rounded-xl overflow-hidden cursor-pointer ring-2 ${i === shown ? "ring-emerald-500" : "ring-transparent"}`}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={u} alt="" className="w-16 h-16 object-cover" />
                    </button>
                  ))}
                </div>
              </>
            )}

            {tour.description && (
              <>
                <SectionTitle>Giới thiệu</SectionTitle>
                <Card><ExpandableText text={tour.description} /></Card>
              </>
            )}

            {(tour.itinerary || []).length > 0 && (
              <>
                <SectionTitle>Lịch trình</SectionTitle>
                <Card className="py-0.5">
                  {[...tour.itinerary].sort((a, b) => (a.dayNumber || 0) - (b.dayNumber || 0)).map((day, i) => (
                    <ItineraryDay key={day.dayNumber ?? i} day={day} defaultOpen={tour.itinerary.length === 1} />
                  ))}
                </Card>
              </>
            )}

            {stops.length > 0 && (
              <>
                <SectionTitle>Các điểm dừng ({stops.length})</SectionTitle>
                <div className="px-3.5 space-y-2">
                  {stops.map((s, i) => {
                    const last = i === stops.length - 1;
                    const stats = [
                      s.quiz?.length ? `${s.quiz.length} câu đố` : null,
                      s.experiences?.length ? `${s.experiences.length} hoạt động` : null,
                      s.maxPoints > 0 ? `tối đa ${s.maxPoints} điểm` : null,
                    ].filter(Boolean);
                    return (
                      <button type="button" key={s.id || i} onClick={() => setOpenStop(s)}
                        className="w-full text-left cursor-pointer flex items-start gap-2.5 p-2.5 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50">
                        <div className="relative shrink-0">
                          {s.imageUrl
                            // eslint-disable-next-line @next/next/no-img-element
                            ? <img src={s.imageUrl} alt="" className="w-16 h-16 rounded-xl object-cover" />
                            : <span className="w-16 h-16 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center"><MapPin size={22} /></span>}
                          <span className={`absolute -left-1.5 -top-1.5 w-5 h-5 rounded-full text-white text-[10px] font-extrabold flex items-center justify-center ${last ? "bg-amber-500" : "bg-emerald-600"}`}>
                            {last ? <Flag size={10} /> : s.sequenceOrder || i + 1}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[11.5px] font-bold text-slate-800 line-clamp-2">{s.name || "Điểm dừng chưa đặt tên"}</p>
                          {s.shortDescription && <p className="text-[10.5px] leading-snug text-slate-500 mt-0.5 line-clamp-2">{s.shortDescription}</p>}
                          {stats.length > 0 && <p className="text-[10px] font-semibold text-amber-700 mt-1 inline-flex items-center gap-1"><Star size={10} />{stats.join(" · ")}</p>}
                        </div>
                        <ChevronRight size={14} className="text-slate-300 shrink-0 self-center" />
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {prices.length > 0 && (
              <>
                <SectionTitle>Bảng giá</SectionTitle>
                <Card>
                  <div className="divide-y divide-slate-100">
                    {prices.map((p) => (
                      <div key={p.guestType} className="flex items-center justify-between gap-2 py-1.5 first:pt-0 last:pb-0">
                        <span className="min-w-0">
                          <span className="block text-[11.5px] font-bold text-slate-800">{p.label}</span>
                          {p.ageRange && <span className="block text-[10px] text-slate-500">{p.ageRange}</span>}
                        </span>
                        <span className="text-[12px] font-extrabold text-emerald-800 shrink-0">{priceText(p)}</span>
                      </div>
                    ))}
                  </div>
                  {tour.maxGuestsPerSlot != null && (
                    <p className="mt-2 text-[10.5px] text-slate-500 inline-flex items-center gap-1"><Users size={11} />Tối đa {tour.maxGuestsPerSlot} khách mỗi chuyến</p>
                  )}
                </Card>
              </>
            )}

            {dates.length > 0 && (
              <>
                <SectionTitle>Ngày khởi hành</SectionTitle>
                <div className="px-3.5 flex flex-wrap gap-1.5">
                  {dates.slice(0, 12).map((iso) => {
                    const d = new Date(`${iso}T00:00:00`);
                    return (
                      <span key={iso} className="w-[52px] py-1.5 rounded-xl border border-slate-200 bg-white text-center">
                        <span className="block text-[9.5px] text-slate-500">{WEEKDAYS[d.getDay()]}</span>
                        <span className="block text-[11.5px] font-extrabold text-slate-900">{String(d.getDate()).padStart(2, "0")}/{String(d.getMonth() + 1).padStart(2, "0")}</span>
                      </span>
                    );
                  })}
                  {dates.length > 12 && <span className="px-2 py-1.5 rounded-full bg-slate-100 text-[10.5px] font-semibold text-slate-600 self-center">+{dates.length - 12} ngày</span>}
                </div>
              </>
            )}

            {policies.length > 0 && (
              <>
                <SectionTitle>Thông tin cần lưu ý</SectionTitle>
                <Card className="py-0.5">
                  {policies.map(([Icon, title, text]) => (
                    <Expandable key={title} Icon={Icon} title={title}>{text}</Expandable>
                  ))}
                </Card>
              </>
            )}

            {tour.contactInfo && (
              <>
                <SectionTitle>Liên hệ</SectionTitle>
                <Card>
                  <p className="flex items-start gap-2 text-[11.5px] leading-relaxed text-slate-800 whitespace-pre-line">
                    <Headset size={15} className="text-sky-600 shrink-0" />{tour.contactInfo}
                  </p>
                </Card>
              </>
            )}
            <div className="h-5" />
          </div>

          {/* Thanh đặt tour ở đáy như app (chỉ minh họa) */}
          <div className="shrink-0 px-3.5 pt-2 pb-5 bg-white border-t border-slate-100 flex items-center justify-between gap-3">
            <span className="min-w-0">
              <span className="block text-[10px] text-slate-500">Giá từ (người lớn)</span>
              <span className="block text-[15px] font-extrabold text-emerald-800">{adult ? priceText(adult) : "—"}</span>
            </span>
            <span className="px-5 py-2 rounded-2xl bg-emerald-700 text-white text-[12px] font-bold">Đặt tour</span>
          </div>

          {openStop && <StopSheet stop={openStop} onClose={() => setOpenStop(null)} />}

          {/* Thanh home */}
          <span className="absolute bottom-1.5 left-1/2 -translate-x-1/2 h-1 w-24 rounded-full bg-slate-900/80" aria-hidden />
        </div>
      </div>
    </div>
  );
}
