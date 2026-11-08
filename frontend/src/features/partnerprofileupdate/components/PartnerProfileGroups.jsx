"use client";

/**
 * Hiển thị thông tin đối tác theo 3 nhóm nghiệp vụ:
 *   1. Thông tin người đại diện
 *   2. Thông tin doanh nghiệp
 *   3. Thông tin thanh toán
 *
 * <p>Dùng chung cho:
 *  • Dashboard đối tác: tab "Thông tin đối tác" (read-only)
 *  • Dashboard Admin: modal so sánh thông tin cũ / mới
 *
 * <p>Ở chế độ so sánh ({@link tone} = "changed"), các trường nằm trong {@link changed}
 * được tô xanh lá để Admin dễ nhận biết đối tác vừa sửa chỗ nào.
 */
import { Building2, CreditCard, UserCog } from "lucide-react";
import PartnerProfileFieldTable from "./PartnerProfileFieldTable";

const GROUP_ICONS = {
  representative: UserCog,
  business: Building2,
  payment: CreditCard,
};

/** Màu nhấn của từng nhóm — dùng cho tiêu đề nhóm. */
const GROUP_ACCENTS = {
  representative: "bg-slate-100 text-slate-600",
  business: "bg-indigo-50 text-indigo-600",
  payment: "bg-amber-50 text-amber-600",
};

export default function PartnerProfileGroups({
  profile = {},
  labels = {},
  groups = [],
  changed = null,
  tone = "plain",
}) {
  const changedSet = changed instanceof Set ? changed : null;

  return (
    <div className="space-y-3">
      {groups.map((group) => {
        const Icon = GROUP_ICONS[group.id] ?? UserCog;
        const accent = GROUP_ACCENTS[group.id] ?? GROUP_ACCENTS.representative;

        // Ưu tiên các trường bị thay đổi đưa lên đầu nhóm để Admin thấy ngay.
        const fields = [...group.fields].sort((a, b) => {
          if (!changedSet) return 0;
          const ca = changedSet.has(a) ? 0 : 1;
          const cb = changedSet.has(b) ? 0 : 1;
          return ca - cb;
        });

        // Nhóm không có gì để hiển thị → bỏ qua cho gọn.
        const hasValue = fields.some((f) => {
          const v = profile?.[f];
          return v !== null && v !== undefined && v !== "";
        });
        if (!hasValue) return null;

        const changedCount = changedSet
          ? fields.filter((f) => changedSet.has(f)).length
          : 0;

        return (
          <section
            key={group.id}
            className="rounded-2xl border border-slate-200 bg-white p-4"
          >
            <header className="mb-3 flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-2.5">
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${accent}`}
                >
                  <Icon size={14} />
                </span>
                <div className="min-w-0">
                  <h4 className="text-sm font-bold text-slate-900">{group.label}</h4>
                  {group.description && (
                    <p className="mt-0.5 text-xs text-slate-500">{group.description}</p>
                  )}
                </div>
              </div>
              {changedCount > 0 && (
                <span className="shrink-0 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
                  {changedCount} trường thay đổi
                </span>
              )}
            </header>

            <PartnerProfileFieldTable
              profile={profile}
              labels={labels}
              order={fields}
              changed={changedSet}
              tone={tone}
              columns="sm:grid-cols-2 lg:grid-cols-3"
            />
          </section>
        );
      })}
    </div>
  );
}
