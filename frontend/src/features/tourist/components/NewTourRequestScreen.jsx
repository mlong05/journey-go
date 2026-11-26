"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Sparkles,
  Calendar,
  Users,
  Coins,
  MapPin,
  FileText,
  AlertCircle,
  CheckCircle2,
  Send,
  Loader2,
  ShieldCheck,
  Lightbulb,
} from "lucide-react";
import AccountLayout from "./AccountLayout";
import { LimitedField } from "@/components/ui/LimitedField";
import { touristService } from "../services/touristService";
import { ROUTES } from "@/constants/routes";
import { vnd } from "../utils";
import { useT } from "@/i18n";

const MAX_TEXTAREA_ROWS = 6;

const BUDGET_PRESETS = [
  [1_000_000, 3_000_000],
  [3_000_000, 7_000_000],
  [7_000_000, 15_000_000],
];

const formatVndInput = (val) => {
  if (val === "" || val === null || val === undefined) return "";
  const digits = String(val).replace(/\D/g, "");
  if (!digits) return "";
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

function resizeBox(el, maxRows = MAX_TEXTAREA_ROWS) {
  if (!el) return;
  const selfTop = el.scrollTop;
  el.style.height = "auto";
  if (el.scrollHeight <= 0) return;
  const cs = window.getComputedStyle(el);
  const lh = parseFloat(cs.lineHeight) || 20;
  const py = (parseFloat(cs.paddingTop) || 0) + (parseFloat(cs.paddingBottom) || 0);
  const by = el.offsetHeight - el.clientHeight;
  const maxH = Math.ceil(lh * maxRows + py + by);
  const needed = el.scrollHeight + by;
  if (needed > maxH + 1) {
    el.style.height = `${maxH}px`;
    el.style.overflowY = "auto";
    el.scrollTop = selfTop;
  } else {
    el.style.height = `${needed}px`;
    el.style.overflowY = "hidden";
  }
}

function AutoGrowLimitedArea({ rows = 4, value, onChange, className = "", ...props }) {
  const ref = useRef(null);
  useLayoutEffect(() => {
    resizeBox(ref.current, MAX_TEXTAREA_ROWS);
  }, [value]);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return undefined;
    let w = el.clientWidth;
    const ro = new ResizeObserver(() => {
      if (el.clientWidth !== w) {
        w = el.clientWidth;
        resizeBox(el, MAX_TEXTAREA_ROWS);
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <LimitedField
      ref={ref}
      as="textarea"
      rows={rows}
      value={value}
      onChange={onChange}
      onInput={(e) => resizeBox(e.currentTarget, MAX_TEXTAREA_ROWS)}
      className={`${className} resize-none`}
      {...props}
    />
  );
}

export default function NewTourRequestScreen() {
  const t = useT();
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    preferredDestination: "",
    preferredDateFrom: "",
    preferredDateTo: "",
    guestCount: 2,
    budgetMin: "",
    budgetMax: "",
    specialRequirements: "",
    description: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleMoneyChange = (field) => (e) => {
    const digits = e.target.value.replace(/\D/g, "").replace(/^0+(?=\d)/, "").slice(0, 12);
    setFormData((prev) => ({ ...prev, [field]: digits }));
  };

  const applyPreset = (min, max) => {
    setFormData((prev) => ({ ...prev, budgetMin: String(min), budgetMax: String(max) }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!formData.title.trim()) {
      setError({ key: "account.req.new.errTitleRequired" });
      return;
    }
    if (!formData.description.trim()) {
      setError({ key: "account.req.new.errDescRequired" });
      return;
    }
    if (formData.preferredDateFrom && formData.preferredDateTo) {
      if (new Date(formData.preferredDateFrom) > new Date(formData.preferredDateTo)) {
        setError({ key: "account.req.new.errDateOrder" });
        return;
      }
    }
    if (formData.budgetMin && formData.budgetMax) {
      if (Number(formData.budgetMin) > Number(formData.budgetMax)) {
        setError({ key: "account.req.new.errBudgetOrder" });
        return;
      }
    }

    try {
      setLoading(true);
      const payload = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        preferredDestination: formData.preferredDestination.trim() || null,
        preferredDateFrom: formData.preferredDateFrom || null,
        preferredDateTo: formData.preferredDateTo || null,
        guestCount: formData.guestCount ? Number(formData.guestCount) : null,
        budgetMin: formData.budgetMin ? Number(formData.budgetMin) : null,
        budgetMax: formData.budgetMax ? Number(formData.budgetMax) : null,
        specialRequirements: formData.specialRequirements.trim() || null,
      };

      await touristService.createTourRequest(payload);
      setSuccess(true);
      setTimeout(() => {
        router.push(ROUTES.ACCOUNT_TOUR_REQUESTS);
      }, 1400);
    } catch (err) {
      setError({ message: err?.message || "", key: "account.req.new.errSubmit" });
    } finally {
      setLoading(false);
    }
  };

  const inputBase =
    "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-800 placeholder:text-slate-400 transition focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/15";

  return (
    <AccountLayout
      backHref={ROUTES.ACCOUNT_TOUR_REQUESTS}
      title={t("account.req.new.title")}
      description={t("account.req.new.subtitle")}
    >
      <div className="space-y-5">
        {error && (
          <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            <AlertCircle size={18} className="mt-0.5 shrink-0 text-rose-600" />
            <div>
              <p className="font-bold">{t("account.req.new.errorHeading")}</p>
              <p className="mt-0.5">{error.message || t(error.key)}</p>
            </div>
          </div>
        )}

        {success && (
          <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            <CheckCircle2 size={20} className="shrink-0 text-emerald-600" />
            <p className="font-bold">{t("account.req.new.successBanner")}</p>
          </div>
        )}

        <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_290px]">
          <form
            onSubmit={handleSubmit}
            className="space-y-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_8px_28px_-20px_rgba(15,23,42,0.2)] sm:p-6"
          >
            {/* 1. Tổng quan */}
            <div className="space-y-4">
              <h2 className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-teal-800">
                <FileText size={15} /> {t("account.req.new.sec1Title")}
              </h2>

              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-700">
                  {t("account.req.new.fieldTitle")} <span className="text-rose-500">*</span>
                </label>
                <LimitedField
                  as="input"
                  name="title"
                  required
                  limit={200}
                  counter="near"
                  placeholder={t("account.req.new.fieldTitlePlaceholder")}
                  value={formData.title}
                  onChange={handleChange}
                  className={inputBase}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-700">
                  {t("account.req.new.fieldDestination")}
                </label>
                <div className="relative">
                  <MapPin size={16} className="pointer-events-none absolute left-3.5 top-3 text-slate-400" />
                  <LimitedField
                    as="input"
                    name="preferredDestination"
                    limit={500}
                    counter="near"
                    placeholder={t("account.req.new.fieldDestinationPlaceholder")}
                    value={formData.preferredDestination}
                    onChange={handleChange}
                    className={`${inputBase} pl-10`}
                  />
                </div>
              </div>
            </div>

            {/* 2. Thời gian & Số khách */}
            <div className="space-y-4 border-t border-slate-100 pt-5">
              <h2 className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-teal-800">
                <Calendar size={15} /> {t("account.req.new.sec2Title")}
              </h2>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-slate-700">{t("account.req.new.fieldDateFrom")}</label>
                  <input
                    type="date"
                    name="preferredDateFrom"
                    min={today}
                    value={formData.preferredDateFrom}
                    onChange={handleChange}
                    className={inputBase}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-slate-700">{t("account.req.new.fieldDateTo")}</label>
                  <input
                    type="date"
                    name="preferredDateTo"
                    min={formData.preferredDateFrom || today}
                    value={formData.preferredDateTo}
                    onChange={handleChange}
                    className={inputBase}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-slate-700">{t("account.req.new.fieldGuestCount")}</label>
                  <div className="relative">
                    <Users size={16} className="pointer-events-none absolute left-3.5 top-3 text-slate-400" />
                    <input
                      type="number"
                      name="guestCount"
                      min={1}
                      max={500}
                      value={formData.guestCount}
                      onChange={handleChange}
                      className={`${inputBase} pl-10 tabular-nums`}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Ngân sách */}
            <div className="space-y-3.5 border-t border-slate-100 pt-5">
              <div>
                <h2 className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-teal-800">
                  <Coins size={15} /> {t("account.req.new.sec3Title")}
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">{t("account.req.new.sec3Hint")}</p>
              </div>

              <div className="flex flex-wrap gap-2">
                {BUDGET_PRESETS.map(([min, max]) => {
                  const active = Number(formData.budgetMin) === min && Number(formData.budgetMax) === max;
                  return (
                    <button
                      key={`${min}-${max}`}
                      type="button"
                      onClick={() => applyPreset(min, max)}
                      className={`rounded-lg border px-2.5 py-1 text-xs font-bold tabular-nums transition cursor-pointer ${
                        active
                          ? "border-teal-600 bg-teal-50 text-teal-800"
                          : "border-slate-200 bg-slate-50/70 text-slate-600 hover:border-teal-300 hover:bg-white"
                      }`}
                    >
                      {vnd(min)} – {vnd(max)}
                    </button>
                  );
                })}
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-slate-700">{t("account.req.new.fieldBudgetMin")}</label>
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="numeric"
                      autoComplete="off"
                      placeholder="2.000.000"
                      value={formatVndInput(formData.budgetMin)}
                      onChange={handleMoneyChange("budgetMin")}
                      className={`${inputBase} pr-9 tabular-nums`}
                    />
                    <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                      đ
                    </span>
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-slate-700">{t("account.req.new.fieldBudgetMax")}</label>
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="numeric"
                      autoComplete="off"
                      placeholder="5.000.000"
                      value={formatVndInput(formData.budgetMax)}
                      onChange={handleMoneyChange("budgetMax")}
                      className={`${inputBase} pr-9 tabular-nums`}
                    />
                    <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                      đ
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 4. Mô tả chi tiết */}
            <div className="space-y-4 border-t border-slate-100 pt-5">
              <h2 className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-teal-800">
                <Sparkles size={15} /> {t("account.req.new.sec4Title")}
              </h2>

              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-700">
                  {t("account.req.new.fieldDesc")} <span className="text-rose-500">*</span>
                </label>
                <AutoGrowLimitedArea
                  name="description"
                  required
                  rows={4}
                  limit={5000}
                  placeholder={t("account.req.new.fieldDescPlaceholder")}
                  value={formData.description}
                  onChange={handleChange}
                  className={inputBase}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-700">
                  {t("account.req.new.fieldSpecial")}
                </label>
                <AutoGrowLimitedArea
                  name="specialRequirements"
                  rows={2}
                  limit={2000}
                  placeholder={t("account.req.new.fieldSpecialPlaceholder")}
                  value={formData.specialRequirements}
                  onChange={handleChange}
                  className={inputBase}
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
              <Link
                href={ROUTES.ACCOUNT_TOUR_REQUESTS}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
              >
                {t("account.req.new.cancelBtn")}
              </Link>
              <button
                type="submit"
                disabled={loading || success}
                className="inline-flex items-center gap-2 rounded-xl bg-teal-700 px-6 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-teal-800 disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    {t("account.req.new.submittingBtn")}
                  </>
                ) : (
                  <>
                    <Send size={16} />
                    {t("account.req.new.submitBtn")}
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Cột phụ hướng dẫn & bảo mật */}
          <aside className="space-y-4 xl:sticky xl:top-24">
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex items-center gap-2 text-sm font-extrabold text-slate-900">
                <span className="grid h-8 w-8 place-items-center rounded-xl bg-amber-50 text-amber-600">
                  <Lightbulb size={16} />
                </span>
                {t("account.req.new.tipsTitle")}
              </div>
              <ul className="mt-3.5 space-y-2.5 text-xs leading-relaxed text-slate-600">
                {[t("account.req.new.tip1"), t("account.req.new.tip2"), t("account.req.new.tip3")].map((tip, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-600" />
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-teal-200/80 bg-gradient-to-br from-teal-50/90 to-emerald-50/60 p-5">
              <div className="flex items-center gap-2 text-sm font-extrabold text-teal-950">
                <ShieldCheck size={18} className="shrink-0 text-teal-700" />
                {t("account.req.new.privacyTitle")}
              </div>
              <p className="mt-2 text-xs leading-relaxed text-teal-900/80">
                {t("account.req.new.privacyDesc")}
              </p>
            </div>
          </aside>
        </div>
      </div>
    </AccountLayout>
  );
}
