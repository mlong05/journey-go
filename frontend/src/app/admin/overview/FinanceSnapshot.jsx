"use client";

import React from "react";
import Link from "next/link";
import { ChevronRight, CreditCard, Layers } from "lucide-react";
import { CardHeader, MetricTile } from "./KpiCard";
import { CARD } from "@/app/admin/overview.tokens";
import Hint from "./Hint";

const money = (v) => `${(Number(v) || 0).toLocaleString("vi-VN")} đ`;
const pct = (part, whole) => (whole > 0 ? ((part / whole) * 100).toFixed(1) : "0.0");

/**
 * Tình hình tài chính & thanh toán.
 *
 * ⚠️ BA LỚP SỐ LIỆU TÁCH BIỆT — không trộn lẫn:
 *  1. DÒNG TIỀN KHÁCH HÀNG (theo kỳ đang xem): tiền khách trả, voucher, hoàn tiền,
 *     và "thực thu" (= tiền trả − hoàn). Khớp với tab /admin/finance.
 *  2. QUYẾT TOÁN (theo đợt tất toán): tiền đã chia cho đối tác, ghi rõ SỐ ĐỐI TÁC
 *     nhận được (đợt BATCH gom nhiều đối tác) + kỳ doanh thu.
 *  3. DOANH THU GHI NHẬN (từ ProviderRevenue): chỉ gồm tour có đối tác được gán,
 *     nêu rõ số khoản để Admin tự đối chiếu với GMV.
 *
 * Lý do tách: "tiền đã quyết toán 34.142.500 đ" là tiền của CẢ 5 đối tác trong đợt
 * tổng tháng 01 — hiển thị chung với "tiền đối tác được nhận 1.920.000 đ" (chỉ 3
 * booking có khoản doanh thu ghi nhận) khiến hai con số tưởng mâu thuẫn.
 */
export default function FinanceSnapshot({ finance, isLoading }) {
  const f = finance || {};

  // Lớp 1 — dòng tiền khách hàng.
  const grossPaid = Number(f.grossPaid) || 0;
  const voucherDiscount = Number(f.voucherDiscount) || 0;
  const refundAmount = Number(f.refundAmount) || 0;
  const netCollected = Number(f.netCollected) || 0;
  const paidCount = Number(f.paidTransactionCount) || 0;

  // Lớp 2 — quyết toán.
  const settledAmount = Number(f.settledAmount) || 0;
  const settledCount = Number(f.settledSettlementCount) || 0;
  const settledPartnerCount = Number(f.settledPartnerCount) || 0;
  const settledPeriod = f.settledPeriod || null;
  const pendingSettleAmount = Number(f.pendingSettleAmount) || 0;
  const eligibleRevenueAmount = Number(f.eligibleRevenueAmount) || 0;
  const eligibleRevenueCount = Number(f.eligibleRevenueCount) || 0;
  const draftCount = Number(f.draftSettlementCount) || 0;
  const draftAmount = Number(f.draftSettlementAmount) || 0;

  // Lớp 3 — doanh thu ghi nhận.
  const accruedCommission = Number(f.accruedCommission) || 0;
  const accruedPartnerNet = Number(f.accruedPartnerNet) || 0;
  const accruedCount = Number(f.accruedRevenueCount) || 0;

  // Thanh phân bổ dòng tiền khách: netCollected + refundAmount = grossPaid (đúng 100%).
  const cashSegments = [
    { key: "net", label: "Thực thu nền tảng", value: netCollected, color: "#4f46e5" },
    { key: "refund", label: "Đã hoàn cho khách", value: refundAmount, color: "#f43f5e" },
  ];
  const cashTotal = grossPaid > 0 ? grossPaid : 1;

  const periodLabel = settledPeriod
    ? `Kỳ doanh thu ${settledPeriod}`
    : "Chưa có đợt đã quyết toán";

  return (
    <section className={CARD.shell + " flex flex-col h-full"}>
      <CardHeader
        icon={CreditCard}
        tone="indigo"
        title="Tình hình tài chính & Thanh toán"
        subtitle="Dòng tiền khách · Quyết toán đối tác · Doanh thu ghi nhận"
      >
        <Link
          href="/admin/finance"
          className="inline-flex items-center gap-0.5 text-[11px] font-bold text-indigo-600 hover:text-indigo-700 transition-colors"
        >
          Chi tiết tài chính
          <ChevronRight size={13} />
        </Link>
      </CardHeader>

      {/* ══ LỚP 1 — DÒNG TIỀN KHÁCH HÀNG (theo kỳ) ══ */}
      <div className="p-4 pb-0">
        <div className="flex items-center gap-2 mb-2.5">
          <Layers size={13} className="text-indigo-500 shrink-0" />
          <p className="text-[11.5px] font-bold text-slate-700">
            <Hint text="Toàn bộ tiền khách thực trả trong kỳ đang xem: gồm tiền trả, voucher đã giảm và tiền đã hoàn. Khớp với tab Tài chính & Thanh toán.">
              1. Dòng tiền khách hàng
            </Hint>
          </p>
          <span className="text-[10.5px] font-medium text-slate-400">
            theo kỳ đang xem
          </span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
          <MetricTile
            label="Tiền khách đã thanh toán"
            value={isLoading ? "…" : money(grossPaid)}
            tone="sky"
            hint={`Tổng tiền khách thực trả trong kỳ qua ${paidCount} giao dịch thành công. Đây là GMV của kỳ (chưa trừ hoàn tiền, chưa chia đối tác).`}
          />
          <MetricTile
            label="Voucher đã giảm"
            value={isLoading ? "…" : money(voucherDiscount)}
            tone="amber"
            hint="Tổng tiền voucher giảm cho khách trong kỳ. Không phải dòng tiền mất — vẫn nằm trong tiền khách trả."
          />
          <MetricTile
            label="Đã hoàn cho khách"
            value={isLoading ? "…" : money(refundAmount)}
            tone="rose"
            hint="Tổng tiền đã hoàn trả cho khách trong kỳ (đã xác minh thành công)."
          />
          <MetricTile
            label="Thực thu nền tảng"
            value={isLoading ? "…" : money(netCollected)}
            tone="indigo"
            hint="Tiền khách trả − tiền đã hoàn. Đây là dòng tiền nền tảng thực sự thu được, KHÔNG trừ phần chia đối tác — khớp với tab Tài chính & Thanh toán."
          />
        </div>

        {/* Thanh phân bổ: netCollected + refundAmount = grossPaid */}
        <div className="mt-2.5 p-3 rounded-xl bg-slate-50/70 border border-slate-100">
          <div className="flex items-center justify-between gap-2 mb-2">
            <p className="text-[11px] font-bold text-slate-700">
              Phân bổ tiền khách đã trả
            </p>
            <span className="text-[10.5px] font-semibold text-slate-400">
              {grossPaid > 0 ? `Tổng ${money(grossPaid)}` : "Chưa có giao dịch"}
            </span>
          </div>
          <div className="h-2.5 w-full rounded-full bg-slate-200/70 overflow-hidden flex">
            {cashSegments.map((segment, index) => {
              const percent = (segment.value / cashTotal) * 100;
              if (percent <= 0) return null;
              return (
                <div
                  key={segment.key}
                  style={{ width: `${percent}%`, background: segment.color }}
                  className={`h-full ${index === 0 ? "rounded-l-full" : ""} ${
                    index === cashSegments.length - 1 ? "rounded-r-full" : ""
                  }`}
                  title={`${segment.label}: ${money(segment.value)} (${percent.toFixed(1)}%)`}
                />
              );
            })}
          </div>
          <ul className="mt-2.5 grid grid-cols-1 sm:grid-cols-2 gap-2">
            {cashSegments.map((segment) => (
              <li key={segment.key} className="flex items-center gap-2 min-w-0">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ background: segment.color }}
                />
                <div className="min-w-0">
                  <p className="text-[11px] text-slate-600 truncate">{segment.label}</p>
                  <p className="text-[12.5px] font-bold text-slate-900 tabular-nums leading-tight">
                    {money(segment.value)}
                    <span className="ml-1.5 text-[10.5px] font-semibold text-slate-400">
                      {pct(segment.value, grossPaid)}%
                    </span>
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* ══ LỚP 2 — QUYẾT TOÁN ĐỐI TÁC (theo đợt) ══ */}
      <div className="p-4 pb-0">
        <div className="flex items-center gap-2 mb-2.5">
          <Layers size={13} className="text-emerald-500 shrink-0" />
          <p className="text-[11.5px] font-bold text-slate-700">
            <Hint text="Tiền đã được chia cho đối tác theo từng đợt tất toán (batch). Khác với dòng tiền khách ở trên về thời điểm ghi nhận.">
              2. Quyết toán doanh thu cho đối tác
            </Hint>
          </p>
          <span className="text-[10.5px] font-medium text-slate-400">theo đợt tất toán</span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5">
          <MetricTile
            label="Tiền đã quyết toán cho đối tác"
            value={isLoading ? "…" : money(settledAmount)}
            tone="emerald"
            hint={
              settledCount > 0
                ? `Tổng tiền đã cộng vào ví đối tác từ ${settledCount} đợt tất toán đã được phê duyệt, tính cho ${settledPartnerCount} đối tác (${periodLabel}).`
                : "Chưa có đợt tất toán nào được phê duyệt."
            }
          />
          <MetricTile
            label="Đối tác đã nhận tiền"
            value={isLoading ? "…" : `${settledPartnerCount} đối tác`}
            tone="sky"
            hint="Số đối tác thực sự nhận được tiền từ các đợt đã quyết toán. Đợt tổng (BATCH) gom nhiều đối tác vào cùng một đợt."
          />
          <MetricTile
            label="Đợt tất toán chờ duyệt"
            value={isLoading ? "…" : money(draftAmount)}
            tone="amber"
            hint={`${draftCount} đợt đang ở trạng thái bản nháp — Admin chưa phê duyệt nên tiền CHƯA về ví đối tác.`}
          />
          <MetricTile
            label="Doanh thu đủ điều kiện, chưa tạo đợt"
            value={isLoading ? "…" : money(eligibleRevenueAmount)}
            tone="indigo"
            hint={`${eligibleRevenueCount} khoản doanh thu đã đủ điều kiện tất toán nhưng chưa được gom vào đợt nào (toàn hệ thống).`}
          />
          <MetricTile
            label="Tiền đối tác chờ quyết toán trong kỳ"
            value={isLoading ? "…" : money(pendingSettleAmount)}
            tone="slate"
            hint="Phần tiền đối tác của các khoản đủ điều kiện phát sinh TRONG kỳ đang xem, chưa vào đợt tất toán."
          />
          <MetricTile
            label="Kỳ doanh thu đã quyết toán"
            value={isLoading ? "…" : settledPeriod || "—"}
            tone="slate"
            hint="Kỳ doanh thu (yyyy-MM) mà các đợt đã phê duyệt tất toán. Khác với kỳ lọc ở thanh trên — tiền quyết toán theo kỳ doanh thu, không theo ngày duyệt."
          />
        </div>
      </div>

      {/* ══ LỚP 3 — DOANH THU GHI NHẬN (từ ProviderRevenue) ══ */}
      <div className="p-4">
        <div className="flex items-center gap-2 mb-2.5">
          <Layers size={13} className="text-slate-400 shrink-0" />
          <p className="text-[11.5px] font-bold text-slate-700">
            <Hint text="Hoa hồng JourneyGo và tiền đối tác ghi nhận từ các tour đã gán đối tác. Chỉ gồm tour có đối tác được gán nên nhỏ hơn GMV — đây là bản chất dữ liệu.">
              3. Doanh thu ghi nhận theo booking
            </Hint>
          </p>
          <span className="text-[10.5px] font-medium text-slate-400">từ khoản doanh thu đối tác</span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5">
          <MetricTile
            label="Hoa hồng nền tảng ghi nhận"
            value={isLoading ? "…" : money(accruedCommission)}
            tone="indigo"
            hint={`Hoa hồng JourneyGo thu được từ ${accruedCount} khoản doanh thu ghi nhận trong kỳ. Chỉ gồm những tour đã gán đối tác — nên nhỏ hơn GMV, đây là bản chất dữ liệu, không phải lỗi.`}
          />
          <MetricTile
            label="Tiền đối tác ghi nhận"
            value={isLoading ? "…" : money(accruedPartnerNet)}
            tone="emerald"
            hint="Tổng tiền đối tác được ghi nhận từ các khoản doanh thu trong kỳ (đã trừ hoàn tiền và hoa hồng)."
          />
          <MetricTile
            label="Số khoản doanh thu ghi nhận"
            value={isLoading ? "…" : `${accruedCount} khoản`}
            tone="slate"
            hint="Số khoản doanh thu đối tác được ghi nhận trong kỳ. Đối chiếu số này với tổng số booking đã thanh toán để biết bao nhiêu tour chưa gán đối tác."
          />
        </div>
      </div>
    </section>
  );
}
