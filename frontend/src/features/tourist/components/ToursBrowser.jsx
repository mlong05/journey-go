"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, SlidersHorizontal, X, AlertTriangle, ChevronDown, Check } from "lucide-react";
import TouristShell from "./TouristShell";
import TourCard, { TourCardSkeleton } from "./TourCard";
import { touristService } from "../services/touristService";
import { normalize } from "../utils";

const ORDERS = [
  ["DEPARTURE", "Khởi hành sớm nhất"],
  ["PRICE_ASC", "Giá thấp đến cao"],
  ["PRICE_DESC", "Giá cao đến thấp"],
  ["NEWEST", "Mới mở bán"],
];
const FORMATS = [["", "Mọi thời lượng"], ["DAY_TRIP", "Trong ngày"], ["MULTI_DAY", "Nhiều ngày"]];
/** Số nút hiện trực tiếp mỗi hàng (máy tính); phần còn lại nằm trong "Thêm…". */
const MAX_VISIBLE = 6;

const chip = (active) =>
  `inline-flex max-w-[220px] items-center gap-1 rounded-full border px-3.5 py-1.5 text-[13px] font-semibold transition-colors cursor-pointer ${active ? "border-teal-700 bg-teal-700 text-white" : "border-slate-200 bg-white text-slate-600 hover:border-teal-300"}`;
const selectCls = "rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700";

/**
 * Danh mục (vùng / chủ đề) kèm số tour đang bán; ẩn mục 0 tour, nhưng luôn giữ mục đang chọn.
 * Xếp theo số tour giảm dần để mục nhiều tour lên trước.
 */
function withCounts(list, tours, key, selected) {
  return list
    .map((x) => ({ id: String(x.id), name: x.name, count: tours.filter((t) => String(t[key]) === String(x.id)).length }))
    .filter((x) => x.count > 0 || x.id === selected)
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "vi"));
}

/** Khung chọn "Thêm…": tìm không dấu + danh sách cuộn dọc. */
function MorePicker({ label, options, selected, onSelect }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    const esc = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", esc); };
  }, [open]);
  const shown = options.filter((o) => !q || normalize(o.name).includes(normalize(q)));
  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-haspopup="listbox" className={chip(false)}>
        + Thêm ({options.length})<ChevronDown size={13} />
      </button>
      {open && (
        <div className="absolute left-0 top-11 z-40 w-72 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
          <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-2.5 focus-within:border-teal-500">
            <Search size={14} className="text-slate-400" />
            <span className="sr-only">Tìm {label}</span>
            <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Tìm ${label.toLowerCase()}…`} className="w-full bg-transparent py-2 text-sm outline-none" />
          </label>
          <ul role="listbox" aria-label={label} className="mt-1.5 max-h-64 overflow-y-auto [scrollbar-width:thin]">
            {shown.length ? shown.map((o) => (
              <li key={o.id}>
                <button type="button" role="option" aria-selected={o.id === selected}
                  onClick={() => { onSelect(o.id === selected ? "" : o.id); setOpen(false); setQ(""); }}
                  className="flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-sm hover:bg-slate-50 cursor-pointer">
                  <span className="min-w-0 truncate font-semibold text-slate-700">{o.name}</span>
                  <span className="flex shrink-0 items-center gap-1.5 text-xs text-slate-400">{o.count}{o.id === selected && <Check size={14} className="text-teal-700" />}</span>
                </button>
              </li>
            )) : <li className="px-2.5 py-3 text-sm text-slate-400">Không có kết quả</li>}
          </ul>
        </div>
      )}
    </div>
  );
}

/** Một hàng lọc (máy tính): tối đa MAX_VISIBLE nút, mục đang chọn luôn nằm trong phần hiện. */
function FilterRow({ label, icon, options, selected, onSelect }) {
  if (!options.length) return null;
  let visible = options.slice(0, MAX_VISIBLE);
  const sel = options.find((o) => o.id === selected);
  if (sel && !visible.includes(sel)) visible = [...visible.slice(0, MAX_VISIBLE - 1), sel];
  const rest = options.filter((o) => !visible.includes(o));
  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label={`Lọc theo ${label.toLowerCase()}`}>
      <span className="mr-1 inline-flex w-16 items-center gap-1 text-xs font-bold uppercase tracking-wide text-slate-500">{icon}{label}</span>
      <button type="button" className={chip(!selected)} aria-pressed={!selected} onClick={() => onSelect("")}>Tất cả</button>
      {visible.map((o) => (
        <button key={o.id} type="button" title={o.name} className={chip(o.id === selected)} aria-pressed={o.id === selected}
          onClick={() => onSelect(o.id === selected ? "" : o.id)}>
          <span className="truncate">{o.name}</span><span className={o.id === selected ? "text-teal-100" : "text-slate-400"}>{o.count}</span>
        </button>
      ))}
      {rest.length > 0 && <MorePicker label={label} options={rest} selected={selected} onSelect={onSelect} />}
    </div>
  );
}

/** Một nhóm nút trong bảng lọc điện thoại. */
function SheetGroup({ title, options, value, k, update }) {
  return (
    <fieldset className="space-y-2">
      <legend className="mb-2 text-sm font-bold text-slate-800">{title}</legend>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={chip(!value)} aria-pressed={!value} onClick={() => update({ [k]: "" })}>Tất cả</button>
        {options.map((o) => (
          <button key={o.id} type="button" title={o.name} className={chip(value === o.id)} aria-pressed={value === o.id}
            onClick={() => update({ [k]: value === o.id ? "" : o.id })}>
            <span className="truncate">{o.name}</span><span className={value === o.id ? "text-teal-100" : "text-slate-400"}>{o.count}</span>
          </button>
        ))}
      </div>
    </fieldset>
  );
}

/** Bảng lọc trượt từ dưới lên (điện thoại): toàn bộ bộ lọc, cuộn dọc bên trong. */
function FilterSheet({ open, onClose, regions, themes, filters, update, onReset, resultCount }) {
  useEffect(() => {
    if (!open) return undefined;
    const esc = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", esc);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", esc); document.body.style.overflow = prev; };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-slate-900/40" role="dialog" aria-modal="true" aria-labelledby="filter-sheet-title" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="flex max-h-[85dvh] w-full flex-col rounded-t-3xl bg-white pb-[env(safe-area-inset-bottom,0px)]">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 id="filter-sheet-title" className="text-lg font-extrabold text-slate-900">Bộ lọc</h2>
          <button type="button" onClick={onClose} aria-label="Đóng bộ lọc" className="grid h-9 w-9 place-items-center rounded-full bg-slate-100 cursor-pointer"><X size={17} /></button>
        </div>
        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-5 py-5">
          <SheetGroup title="Vùng miền" options={regions} value={filters.regionId} k="regionId" update={update} />
          <SheetGroup title="Chủ đề" options={themes} value={filters.themeId} k="themeId" update={update} />
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm font-bold text-slate-800">Thời lượng
              <select value={filters.format} onChange={(e) => update({ format: e.target.value })} className={`${selectCls} mt-1.5 w-full`}>
                {FORMATS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </label>
            <label className="text-sm font-bold text-slate-800">Sắp xếp
              <select value={filters.order} onChange={(e) => update({ order: e.target.value })} className={`${selectCls} mt-1.5 w-full`}>
                {ORDERS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </label>
          </div>
        </div>
        <div className="flex gap-2 border-t border-slate-100 px-5 py-3">
          <button type="button" onClick={onReset} className="flex-1 rounded-xl border border-slate-200 py-3 text-sm font-bold text-slate-700 cursor-pointer">Bỏ lọc</button>
          <button type="button" onClick={onClose} className="flex-[2] rounded-xl bg-orange-600 py-3 text-sm font-bold text-white cursor-pointer">Xem {resultCount} tour</button>
        </div>
      </div>
    </div>
  );
}

/** Trang /tours — bộ lọc lưu trên URL để chia sẻ link (?q=&regionId=&themeId=&format=&order=). */
export default function ToursBrowser() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const filters = {
    q: params.get("q") || "",
    regionId: params.get("regionId") || "",
    themeId: params.get("themeId") || "",
    format: params.get("format") || "",
    order: params.get("order") || "DEPARTURE",
  };
  const key = JSON.stringify(filters);

  const [qInput, setQInput] = useState(filters.q);
  const [catalog, setCatalog] = useState({ regions: [], themes: [], allTours: [] });
  const [state, setState] = useState({ loading: true, items: [], error: "" });
  const [sheetOpen, setSheetOpen] = useState(false);

  // Danh mục + toàn bộ tour đang bán (để đếm số tour mỗi vùng / chủ đề, không phụ thuộc bộ lọc hiện tại).
  useEffect(() => {
    Promise.all([
      touristService.regions().catch(() => []),
      touristService.themes().catch(() => []),
      touristService.publishedTours({ size: 200 }).then((r) => r.items).catch(() => []),
    ]).then(([regions, themes, allTours]) => setCatalog({ regions, themes, allTours }));
  }, []);

  useEffect(() => {
    let alive = true;
    const f = JSON.parse(key);
    queueMicrotask(() => alive && setState((s) => ({ ...s, loading: true, error: "" })));
    touristService.publishedTours({ ...f, size: 60 })
      .then(({ items }) => alive && setState({ loading: false, items, error: "" }))
      .catch((err) => alive && setState({ loading: false, items: [], error: err?.message || "Không tải được danh sách tour." }));
    return () => { alive = false; };
  }, [key]);

  const regionOptions = useMemo(() => withCounts(catalog.regions, catalog.allTours, "regionId", filters.regionId), [catalog, filters.regionId]);
  const themeOptions = useMemo(() => withCounts(catalog.themes, catalog.allTours, "themeId", filters.themeId), [catalog, filters.themeId]);

  const update = (patch) => {
    const next = new URLSearchParams(params.toString());
    Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    if (next.get("order") === "DEPARTURE") next.delete("order");
    router.replace(`${pathname}${next.toString() ? `?${next}` : ""}`, { scroll: false });
  };
  const reset = () => { setQInput(""); update({ q: "", regionId: "", themeId: "", format: "" }); };
  const activeCount = ["regionId", "themeId", "format"].filter((k) => filters[k]).length;
  const regionName = catalog.regions.find((r) => String(r.id) === filters.regionId)?.name;
  const themeName = catalog.themes.find((t) => String(t.id) === filters.themeId)?.name;

  return (
    <TouristShell>
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
          <h1 className="text-[28px] font-extrabold tracking-tight text-slate-900">Tất cả tour</h1>
          <p className="mt-1 text-sm text-slate-500">Tour trải nghiệm đã qua kiểm duyệt, đặt trên web và đi tour bằng app JourneyGo.</p>
          <div className="mt-5 flex max-w-2xl gap-2">
            <form className="flex min-w-0 flex-1 gap-2" role="search" onSubmit={(e) => { e.preventDefault(); update({ q: qInput.trim() }); }}>
              <label className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 focus-within:border-teal-500 focus-within:ring-2 focus-within:ring-teal-500/20">
                <Search size={17} className="shrink-0 text-slate-400" />
                <span className="sr-only">Tìm tour</span>
                <input id="tours-q" value={qInput} onChange={(e) => setQInput(e.target.value)} placeholder="Tên tour, vùng miền, chủ đề"
                  className="w-full min-w-0 bg-transparent py-2.5 text-sm outline-none" />
                {qInput && <button type="button" onClick={() => { setQInput(""); update({ q: "" }); }} aria-label="Xoá từ khoá" className="text-slate-400 hover:text-slate-600 cursor-pointer"><X size={15} /></button>}
              </label>
              <button type="submit" className="rounded-xl bg-orange-600 px-5 text-sm font-bold text-white hover:bg-orange-700 cursor-pointer">Tìm</button>
            </form>
            {/* Điện thoại: gom bộ lọc vào một nút */}
            <button type="button" onClick={() => setSheetOpen(true)} aria-label={`Bộ lọc${activeCount ? `, đang bật ${activeCount}` : ""}`}
              className="relative inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 md:hidden cursor-pointer">
              <SlidersHorizontal size={16} />
              {activeCount > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-teal-700 px-1 text-[11px] text-white">{activeCount}</span>}
            </button>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {/* Máy tính / máy tính bảng: hai hàng nút, tối đa 6 mục mỗi hàng */}
        <div className="hidden space-y-3 md:block">
          <FilterRow label="Vùng" icon={<SlidersHorizontal size={13} />} options={regionOptions} selected={filters.regionId} onSelect={(v) => update({ regionId: v })} />
          <FilterRow label="Chủ đề" options={themeOptions} selected={filters.themeId} onSelect={(v) => update({ themeId: v })} />
        </div>

        <div className="mt-0 flex flex-wrap items-center gap-3 md:mt-3 md:border-t md:border-slate-200 md:pt-3">
          <p className="min-w-0 text-sm text-slate-600" aria-live="polite">
            {state.loading ? "Đang tải…" : <><b className="text-slate-900">{state.items.length}</b> tour</>}
            {regionName && ` · ${regionName}`}{themeName && ` · ${themeName}`}{filters.q && ` · "${filters.q}"`}
          </p>
          {(activeCount > 0 || filters.q) && (
            <button type="button" onClick={reset} className="text-sm font-bold text-teal-700 hover:text-teal-900 cursor-pointer">Bỏ lọc</button>
          )}
          <div className="ml-auto hidden flex-wrap gap-2 md:flex">
            <label className="sr-only" htmlFor="tours-format">Thời lượng</label>
            <select id="tours-format" value={filters.format} onChange={(e) => update({ format: e.target.value })} className={selectCls}>
              {FORMATS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <label className="sr-only" htmlFor="tours-order">Sắp xếp</label>
            <select id="tours-order" value={filters.order} onChange={(e) => update({ order: e.target.value })} className={selectCls}>
              {ORDERS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
        </div>

        <div className="mt-6">
          {state.error ? (
            <p role="alert" className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700"><AlertTriangle size={16} />{state.error}</p>
          ) : state.loading ? (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4">{[0, 1, 2, 3, 4, 5].map((i) => <TourCardSkeleton key={i} />)}</div>
          ) : state.items.length ? (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4">{state.items.map((t) => <TourCard key={t.tourId} tour={t} />)}</div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
              <p className="font-bold text-slate-800">Chưa có tour phù hợp</p>
              <p className="mt-1 text-sm text-slate-500">Thử bỏ bớt bộ lọc hoặc tìm bằng từ khoá khác.</p>
            </div>
          )}
        </div>
      </div>

      <FilterSheet open={sheetOpen} onClose={() => setSheetOpen(false)} regions={regionOptions} themes={themeOptions}
        filters={filters} update={update} onReset={reset} resultCount={state.items.length} />
    </TouristShell>
  );
}
