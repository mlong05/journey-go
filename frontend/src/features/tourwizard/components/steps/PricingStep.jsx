"use client";

import React, { useState } from "react";
import { Users } from "lucide-react";
import { Field, TextArea, NumberInput, MoneyInput } from "../FormKit";
import { issueFor } from "../../hooks/useTourDraft";
import { GUEST_TYPES } from "../../constants";

/** Tour chưa cấu hình giá: API vẫn trả đủ 4 loại khách với price = null. */
const DEFAULT_COUNTS_SLOT = { ADULT: true, CHILD: true, TODDLER: false, INFANT: false };

const fromTour = (tour) => {
  const configured = (tour.prices || []).some((x) => x.price != null && x.guestType !== "INFANT");
  return {
    prices: GUEST_TYPES.map((g) => {
      const p = (tour.prices || []).find((x) => x.guestType === g.key);
      return {
        guestType: g.key,
        price: g.alwaysFree ? 0 : p?.price ?? null,
        // Lần đầu (chưa nhập giá nào): Người lớn + Trẻ em mặc định tính slot.
        countsTowardSlot: configured ? !!p?.countsTowardSlot : DEFAULT_COUNTS_SLOT[g.key],
      };
    }),
    maxGuestsPerSlot: tour.maxGuestsPerSlot ?? null,
    cancellationPolicy: tour.cancellationPolicy || "",
  };
};

const POLICY_SAMPLE =
  "Hủy trước 24 giờ hoàn 100%. Hủy trong vòng 24 giờ hoàn 50%. Không đến không hoàn. " +
  "Tour bị hủy do thời tiết hoặc di tích đóng cửa hoàn 100%.";

export default function PricingStep({ tour, issues, readOnly, isLive, onSave }) {
  const [form, setForm] = useState(() => fromTour(tour));

  const update = (patch) => {
    const next = { ...form, ...patch };
    setForm(next);
    if (!readOnly) onSave(next);
  };
  const setPrice = (key, patch) =>
    update({ prices: form.prices.map((p) => (p.guestType === key ? { ...p, ...patch } : p)) });

  const err = (field) => issueFor(issues, "PRICING", field);
  const slotCount = form.prices.filter((p) => p.countsTowardSlot).length;

  return (
    <div className="space-y-6">
      {isLive && (
        <div className="p-3 rounded-xl border border-sky-200 bg-sky-50 text-xs text-sky-800">
          Tour đang bán: đổi giá và số chỗ <b>không cần duyệt lại</b> và không ảnh hưởng booking đã đặt
          (giá được chốt vào booking lúc đặt). Slot đã có booking giữ nguyên số chỗ.
        </div>
      )}

      <section className="space-y-3">
        <h3 className="text-sm font-bold text-slate-900">Bảng giá theo đối tượng (VNĐ)</h3>
        <p className="text-[11px] text-slate-500">Loại khách và độ tuổi do nền tảng quy định. Tích &ldquo;Tính slot&rdquo; nếu loại khách đó chiếm 1 chỗ.</p>
        <div className="rounded-xl border border-slate-200 overflow-hidden">
          <div className="grid grid-cols-12 bg-slate-50 px-3 py-2 text-[11px] font-bold text-slate-500 uppercase tracking-wide">
            <span className="col-span-3">Loại khách</span>
            <span className="col-span-3">Độ tuổi</span>
            <span className="col-span-4">Giá tiền</span>
            <span className="col-span-2 text-center">Tính slot</span>
          </div>
          {GUEST_TYPES.map((g) => {
            const p = form.prices.find((x) => x.guestType === g.key);
            const e = err(`prices.${g.key}`);
            return (
              <div key={g.key} className="grid grid-cols-12 items-center px-3 py-2.5 border-t border-slate-100 gap-2">
                <span className="col-span-3 text-sm font-bold text-slate-800">{g.label}</span>
                <span className="col-span-3 text-xs text-slate-500">{g.age}</span>
                <div className="col-span-4">
                  {g.alwaysFree ? (
                    <span className="inline-block px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-bold">Miễn phí (cố định)</span>
                  ) : (
                    <MoneyInput value={p.price} suffix="đ" disabled={readOnly} placeholder="0"
                      error={e} onChange={(v) => setPrice(g.key, { price: v })} />
                  )}
                  {e && <p className="text-[11px] font-bold text-rose-600 mt-1">{e}</p>}
                </div>
                <div className="col-span-2 flex justify-center">
                  <input type="checkbox" className="w-4 h-4 accent-emerald-600 cursor-pointer" disabled={readOnly}
                    checked={!!p.countsTowardSlot} onChange={(ev) => setPrice(g.key, { countsTowardSlot: ev.target.checked })} />
                </div>
              </div>
            );
          })}
        </div>
        {(slotCount === 0 || err("prices.countsTowardSlot")) && (
          <p className="text-[11px] font-bold text-rose-600">Cần ít nhất 1 loại khách tính slot.</p>
        )}
      </section>

      <Field label="Số chỗ tối đa mỗi slot" required error={err("maxGuestsPerSlot")}
        hint="Mỗi ngày khởi hành là một slot. Chỉ loại khách được tích 'Tính slot' mới chiếm chỗ.">
        <div className="max-w-[200px]">
          <NumberInput value={form.maxGuestsPerSlot} min={1} max={10000} suffix="chỗ" disabled={readOnly}
            error={err("maxGuestsPerSlot")} onChange={(v) => update({ maxGuestsPerSlot: v })} />
        </div>
      </Field>

      <Field label="Chính sách hủy" required error={err("cancellationPolicy")}>
        <TextArea rows={4} value={form.cancellationPolicy} disabled={readOnly} placeholder={POLICY_SAMPLE}
          error={err("cancellationPolicy")} onChange={(e) => update({ cancellationPolicy: e.target.value })} />
        {!readOnly && !form.cancellationPolicy && (
          <button type="button" onClick={() => update({ cancellationPolicy: POLICY_SAMPLE })}
            className="text-[11px] font-bold text-emerald-700 hover:underline cursor-pointer inline-flex items-center gap-1">
            <Users size={12} /> Dùng mẫu gợi ý
          </button>
        )}
      </Field>
    </div>
  );
}
