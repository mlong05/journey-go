"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  CircleSlash,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  ShieldAlert,
  Trash2,
} from "lucide-react";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { ModalShell, Pagination } from "@/components/admin/AdminUI";
import {
  createRefundReasonCode,
  deleteRefundReasonCode,
  listRefundReasonGroupsForAdmin,
  normalizeGroups,
  updateRefundReasonCode,
} from "@/features/refund/services/refundReasonConfigService";

/* =========================================================================
   HẰNG SỐ
   ========================================================================= */

/**
 * Màu badge theo nhóm lý do — giúp Admin nhận diện nhanh.
 *
 * ⚠️ Key ở đây là MÃ KỸ THUẬT của nhóm (nội bộ) — chỉ dùng để tra cứu màu.
 * Người dùng cuối KHÔNG BAO GIỜ thấy mã này (chỉ thấy `group.name`).
 */
const GROUP_STYLES = {
  PERSONAL: {
    badge: "bg-amber-50 text-amber-700 border-amber-200",
    dot: "bg-amber-400",
    tab: "border-amber-200 bg-amber-50 text-amber-800",
    tabActive: "border-amber-400 bg-amber-100 text-amber-900",
  },
  PLATFORM_FAULT: {
    badge: "bg-sky-50 text-sky-700 border-sky-200",
    dot: "bg-sky-500",
    tab: "border-sky-200 bg-sky-50 text-sky-700",
    tabActive: "border-sky-400 bg-sky-100 text-sky-900",
  },
  PROVIDER_FAULT: {
    badge: "bg-violet-50 text-violet-700 border-violet-200",
    dot: "bg-violet-500",
    tab: "border-violet-200 bg-violet-50 text-violet-700",
    tabActive: "border-violet-400 bg-violet-100 text-violet-900",
  },
  FORCE_MAJEURE: {
    badge: "bg-rose-50 text-rose-700 border-rose-200",
    dot: "bg-rose-500",
    tab: "border-rose-200 bg-rose-50 text-rose-700",
    tabActive: "border-rose-400 bg-rose-100 text-rose-900",
  },
};

/** Số lý do chi tiết hiển thị trên mỗi trang (cố định). */
const PAGE_SIZE = 10;

function formatRate(rate) {
  if (rate === null || rate === undefined) return "—";
  const n = Number(rate);
  if (Number.isNaN(n)) return "—";
  return `${(n * 100).toFixed(2).replace(/\.00$/, "")}%`;
}

function getErrorMessage(err, fallback) {
  return (
    err?.message ||
    err?.data?.message ||
    err?.response?.data?.message ||
    fallback
  );
}

/* =========================================================================
   FORM LÝ DO CHI TIẾT (trong modal)
   ========================================================================= */

const EMPTY_CODE_FORM = {
  name: "",
  conditions: "",
};

/* =========================================================================
   GIỚI HẠN SỐ KÝ TỰ
   ─────────────────────────────────────────────────────────────────────────
   Mỗi trường có giới hạn RIÊNG, khớp với ràng buộc ở backend
   (`@Size(max = …)` trong `CreateRefundReasonCodeRequest` /
   `UpdateRefundReasonCodeRequest`) ⇒ frontend chặn trước, backend chặn sau
   ⇒ không bao giờ gửi request lỗi.

   • NAME_MAX       — tên hiển thị  ⇒ backend cho phép 255, nhưng đây là nhãn
     hiển thị trên web/mobile nên giữ ngắn gọn & dễ đọc.
   • CONDITIONS_MAX — mô tả điều kiện ⇒ backend cho phép 2000.
 */
const NAME_MAX = 100;
const CONDITIONS_MAX = 150;

/**
 * Ô nhập có bộ đếm ký tự ở góc phải dưới.
 *
 * @param {number} max   giới hạn ký tự
 * @param {number} value độ dài hiện tại
 */
function CharCount({ max, value }) {
  const len = value?.length ?? 0;
  const nearLimit = len >= max * 0.9;
  return (
    <span
      className={`pointer-events-none text-[11px] tabular-nums ${
        nearLimit ? "font-semibold text-amber-600" : "text-slate-400"
      }`}
    >
      {len}/{max}
    </span>
  );
}

/**
 * Form thêm / sửa một lý do chi tiết thuộc nhóm.
 *
 * ⚠️ KHÔNG có ô "Mã lý do" — mã kỹ thuật do hệ thống tự sinh ở server
 * (`<GROUP_CODE>_<N>`). Admin chỉ nhập:
 *   • Tên hiển thị (tiếng Việt — nội dung khách thấy)
 *   • Điều kiện áp dụng
 *
 * ⚠️ KHÔNG có ô "Số thứ tự" — kể cả khi SỬA. Số thứ tự do hệ thống quản lý
 * (lý do mới luôn được thêm vào cuối danh sách với số kế tiếp).
 *
 * ⚠️ KHÔNG có mục "Bằng chứng" — việc bắt buộc đính kèm bằng chứng đã bỏ
 * khỏi nghiệp vụ (khách mô tả bằng văn bản, Admin tự đánh giá bằng chứng).
 */
function ReasonCodeForm({ initial, onSubmit, onCancel, saving }) {
  const [form, setForm] = useState(
    initial
      ? {
          name: initial.name ?? "",
          conditions: initial.conditions ?? "",
        }
      : EMPTY_CODE_FORM,
  );
  const isEdit = Boolean(initial);

  /**
   * Cắt chuỗi theo giới hạn.
   *
   * <p>`maxLength` của HTML đã chặn phần lớn trường hợp, nhưng vẫn có
   * những đường đi vượt qua được (paste bằng script, IME, một số trình duyệt
   * tự động). Cắt thêm ở đây ⇒ trạng thái React LUÔN đúng giới hạn ⇒ bộ đếm
   * ký tự và request gửi đi luôn nhất quán.
   */
  const clamp = (value, max) => (value.length > max ? value.slice(0, max) : value);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    onSubmit({
      name: form.name.trim(),
      conditions: form.conditions.trim() || null,
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* ── Tên hiển thị ── */}
      <div>
        <div className="mb-1.5 flex items-baseline justify-between gap-3">
          <label
            htmlFor="reason-code-name"
            className="block text-xs font-bold text-slate-700"
          >
            Tên hiển thị{" "}
            <span className="text-rose-500">*</span>
          </label>
          <CharCount max={NAME_MAX} value={form.name} />
        </div>
        <input
          id="reason-code-name"
          autoFocus
          value={form.name}
          maxLength={NAME_MAX}
          onChange={(e) =>
            setForm((f) => ({ ...f, name: clamp(e.target.value, NAME_MAX) }))
          }
          placeholder="VD: Bị bệnh hoặc gặp vấn đề sức khỏe"
          className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/15"
        />
        <p className="mt-1.5 text-[11px] text-slate-500">
          Đây là nội dung khách thấy trên web và mobile.
        </p>
      </div>

      {/* ── Điều kiện áp dụng ── */}
      <div className="mt-5">
        <div className="mb-1.5 flex items-baseline justify-between gap-3">
          <label
            htmlFor="reason-code-conditions"
            className="block text-xs font-bold text-slate-700"
          >
            Điều kiện áp dụng
            <span className="ml-1.5 font-normal text-slate-400">
              (không bắt buộc)
            </span>
          </label>
          <CharCount max={CONDITIONS_MAX} value={form.conditions} />
        </div>
        <textarea
          id="reason-code-conditions"
          value={form.conditions}
          maxLength={CONDITIONS_MAX}
          onChange={(e) =>
            setForm((f) => ({
              ...f,
              conditions: clamp(e.target.value, CONDITIONS_MAX),
            }))
          }
          rows={3}
          placeholder="Mô tả điều kiện để quản trị viên đối chiếu bằng chứng"
          className="w-full resize-y rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm leading-relaxed text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/15"
        />
        <p className="mt-1.5 text-[11px] text-slate-500">
          Mô tả giúp quản trị viên đối chiếu thông tin khách cung cấp khi duyệt
          yêu cầu hoàn tiền.
        </p>
      </div>

      <div className="mt-6 flex justify-end gap-2 border-t border-slate-100 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="cursor-pointer rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50"
        >
          Hủy
        </button>
        <button
          type="submit"
          disabled={saving}
          className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving && <Loader2 size={14} className="animate-spin" />}
          {isEdit ? "Lưu thay đổi" : "Thêm lý do"}
        </button>
      </div>
    </form>
  );
}

/* =========================================================================
   TRANG CẤU HÌNH LÝ DO HOÀN TIỀN (ADMIN)
   ========================================================================= */

export default function AdminRefundReasonConfigPage() {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [saving, setSaving] = useState(false);

  // Lý do đang thêm / sửa — mở trong modal
  const [codeForm, setCodeForm] = useState(null);
  const [codeFormGroup, setCodeFormGroup] = useState(null);

  // ── Tab nhóm lý do ──
  // Chỉ hiển thị lý do của MỘT nhóm tại một thời điểm ⇒ không phải cuộn
  // xuống cuối trang để tìm nhóm "Lỗi bất khả kháng" khi danh sách dài.
  const [activeGroupCode, setActiveGroupCode] = useState(null);
  // Trang hiện tại (0-based) — riêng cho từng nhóm.
  const [pageByGroup, setPageByGroup] = useState({});

  const { confirm, confirmDialog } = useConfirm();

  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 4000);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await listRefundReasonGroupsForAdmin();
      setGroups(normalizeGroups(data));
    } catch (e) {
      setError(
        getErrorMessage(e, "Không thể tải cấu hình lý do hoàn tiền."),
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Gọi trong microtask để tránh setState đồng bộ ngay trong effect
    // (React 19 eslint react-hooks/set-state-in-effect).
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) load();
    });
    return () => {
      cancelled = true;
    };
  }, [load]);

  const totalCodes = useMemo(
    () => groups.reduce((sum, g) => sum + g.reasonCodes.length, 0),
    [groups],
  );

  // Nhóm đang xem — mặc định là nhóm đầu tiên (có nhiều lý do nhất trước).
  const activeGroup = useMemo(() => {
    if (groups.length === 0) return null;
    return (
      groups.find((g) => g.code === activeGroupCode) ?? groups[0]
    );
  }, [groups, activeGroupCode]);

  // ── Phân trang cố định 10 lý do / trang ─────────────────────────────────
  //
  // Số lý do trên mỗi trang là CỐ ĐỊNH (10) — không co giãn theo chiều cao
  // khung. Nếu khung bảng không đủ chỗ cho đủ 10 dòng thì bảng TỰ CUỘN bên
  // trong (thanh cuộn mảnh), giống các bảng khác trong trang quản trị.

  // Trang hiện tại của nhóm đang xem — đã kẹp về phạm vi hợp lệ.
  //
  // Kẹp ngay trong render (thay vì setState trong effect) để:
  //  • không vi phạm quy tắc eslint react-hooks/set-state-in-effect;
  //  • tránh hiển thị trang rỗng khi danh sách vừa ngắn lại (VD: xoá lý do).
  const activePage = useMemo(() => {
    if (!activeGroup) return 0;
    const maxPage = Math.max(
      0,
      Math.ceil(activeGroup.reasonCodes.length / PAGE_SIZE) - 1,
    );
    return Math.min(pageByGroup[activeGroup.code] ?? 0, maxPage);
  }, [activeGroup, pageByGroup]);

  // Tổng số trang của nhóm đang xem.
  const activeTotalPages = useMemo(() => {
    if (!activeGroup) return 1;
    return Math.max(1, Math.ceil(activeGroup.reasonCodes.length / PAGE_SIZE));
  }, [activeGroup]);

  // Danh sách lý do của trang hiện tại.
  const pagedCodes = useMemo(() => {
    if (!activeGroup) return [];
    const start = activePage * PAGE_SIZE;
    return activeGroup.reasonCodes.slice(start, start + PAGE_SIZE);
  }, [activeGroup, activePage]);

  /**
   * Chuyển sang nhóm khác — luôn về trang 1 vì trang của nhóm trước không
   * liên quan tới nhóm mới.
   */
  const handleChangeGroup = useCallback((groupCode) => {
    setActiveGroupCode(groupCode);
    setPageByGroup((prev) => ({ ...prev, [groupCode]: 0 }));
  }, []);

  /** Chuyển trang trong nhóm đang xem. */
  const handleChangePage = useCallback(
    (page) => {
      if (!activeGroup) return;
      setPageByGroup((prev) => ({ ...prev, [activeGroup.code]: page }));
    },
    [activeGroup],
  );

  const handleSaveCode = async (payload) => {
    setSaving(true);
    try {
      if (codeForm?.id) {
        await updateRefundReasonCode(codeForm.id, payload);
        showToast("Đã cập nhật lý do hoàn tiền.");
      } else {
        await createRefundReasonCode({
          ...payload,
          groupCode: codeFormGroup.code,
        });
        showToast("Đã thêm lý do hoàn tiền.");
      }
      setCodeForm(null);
      setCodeFormGroup(null);
      await load();
    } catch (err) {
      showToast(getErrorMessage(err, "Không thể lưu lý do hoàn tiền."));
    } finally {
      setSaving(false);
    }
  };

  const handleToggleCode = async (code) => {
    try {
      // ⚠️ KHÔNG gửi `displayOrder` — số thứ tự do hệ thống quản lý, không nhập tay.
      // Backend giữ nguyên `displayOrder` hiện tại khi trường này vắng mặt.
      await updateRefundReasonCode(code.id, {
        name: code.name,
        conditions: code.conditions ?? "",
        active: !code.active,
      });
      showToast(code.active ? "Đã tắt lý do." : "Đã bật lý do.");
      await load();
    } catch (err) {
      showToast(getErrorMessage(err, "Không thể cập nhật lý do."));
    }
  };

  const handleDeleteCode = async (code) => {
    const ok = await confirm({
      tone: "danger",
      icon: "reject",
      title: "Xóa lý do hoàn tiền?",
      subject: code.name,
      description:
        "Lý do đã từng được dùng trong yêu cầu hoàn tiền sẽ không thể xóa — " +
        "hãy tắt lý do thay vì xóa để giữ lịch sử tài chính.",
      confirmLabel: "Xóa lý do",
      cancelLabel: "Giữ lại",
    });
    if (!ok) return;

    try {
      await deleteRefundReasonCode(code.id);
      showToast("Đã xóa lý do hoàn tiền.");
      await load();
    } catch (err) {
      showToast(getErrorMessage(err, "Không thể xóa lý do hoàn tiền."));
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      {/* Header */}
      <div className="shrink-0 rounded-2xl border border-slate-200/90 bg-white px-5 py-4 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold text-slate-900 sm:text-xl">
              Cấu hình lý do hoàn tiền
            </h1>
            <p className="mt-0.5 text-xs text-slate-500">
              Quản lý nhóm lý do và các lý do chi tiết đi kèm.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600">
              {groups.length} nhóm · {totalCodes} lý do
            </span>
            <button
              type="button"
              onClick={load}
              className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              Làm mới
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white text-sm text-slate-500">
          <Loader2 size={18} className="animate-spin" />
          Đang tải cấu hình lý do hoàn tiền...
        </div>
      ) : error ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-white text-sm text-rose-600">
          <AlertTriangle size={20} />
          {error}
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-3">
          {/* ── Tabs nhóm lý do ──
              Chỉ hiển thị lý do của MỘT nhóm tại một thời điểm. Nhờ vậy Admin
              không phải cuộn xuống cuối trang (qua hàng trăm lý do của 3 nhóm
              đầu) để tới nhóm "Lỗi bất khả kháng" ở cuối. */}
          <div className="shrink-0 overflow-x-auto [scrollbar-width:thin] [scrollbar-color:#cbd5e1_transparent]">
            <div
              role="tablist"
              aria-label="Nhóm lý do hoàn tiền"
              className="flex min-w-max items-center gap-2"
            >
              {groups.map((g) => {
                const style = GROUP_STYLES[g.code] ?? GROUP_STYLES.PERSONAL;
                const isActive = activeGroup?.code === g.code;
                return (
                  <button
                    key={g.code}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => handleChangeGroup(g.code)}
                    className={`inline-flex cursor-pointer items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-bold transition-colors ${
                      isActive
                        ? `${style.tabActive} shadow-2xs`
                        : `${style.tab} opacity-70 hover:opacity-100`
                    }`}
                  >
                    <span className={`h-2 w-2 rounded-full ${style.dot}`} />
                    {g.name}
                    <span
                      className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${
                        isActive
                          ? "bg-white/70 text-slate-700"
                          : "bg-white/60 text-slate-600"
                      }`}
                    >
                      {g.reasonCodes.length}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Nội dung nhóm đang chọn ── */}
          {activeGroup && (
            <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-2xs">
              {/* Header nhóm */}
              <div className="flex shrink-0 flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
                <div className="min-w-0 flex-1">
                  {/*
                    ⚠️ KHÔNG hiển thị lại tên nhóm ở đây — tên nhóm đã nằm trên
                    TAB đang chọn (màu nổi bật hơn). Lặp lại chỉ gây nhiễu.
                    Ở đây chỉ hiển thị thông tin TỶ LỆ HOÀN của nhóm.
                  */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
                      Hoàn {formatRate(activeGroup.refundRate)}
                    </span>
                    {/*
                      Nhóm cá nhân có MỨC HOÀN 0% riêng: hủy quá muộn hoặc
                      không xuất hiện (no-show) ⇒ không hoàn. Hiển thị thêm mức
                      0% để người đọc không bỏ sót nhánh này.
                    */}
                    {activeGroup.noShowWindowHours != null && (
                      <span
                        title={`Hủy trong vòng ${activeGroup.noShowWindowHours} giờ trước ngày trải nghiệm hoặc không xuất hiện ⇒ không hoàn`}
                        className="rounded-lg border border-rose-200 bg-rose-50 px-2 py-0.5 text-[11px] font-bold text-rose-700"
                      >
                        Hoàn {formatRate(activeGroup.noShowRefundRate)} nếu hủy muộn
                      </span>
                    )}
                    {activeGroup.forceMajeure && (
                      <span className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2 py-0.5 text-[11px] font-bold text-rose-700">
                        <ShieldAlert size={11} />
                        Bất khả kháng
                      </span>
                    )}
                    {!activeGroup.active && (
                      <span className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                        <CircleSlash size={11} />
                        Đang tắt
                      </span>
                    )}
                  </div>
                  {activeGroup.description && (
                    <p
                      title={activeGroup.description}
                      className="mt-2 max-w-full truncate text-xs leading-relaxed text-slate-600"
                    >
                      {activeGroup.description}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setCodeForm(null);
                      setCodeFormGroup(activeGroup);
                    }}
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-700"
                  >
                    <Plus size={13} />
                    Thêm lý do
                  </button>
                </div>
              </div>

              {/* Danh sách lý do (10 lý do / trang — tự cuộn nếu khung không đủ chỗ) */}
              <div className="min-h-0 flex-1 overflow-auto overflow-x-auto [scrollbar-width:thin] [scrollbar-color:#cbd5e1_transparent]">
                {activeGroup.reasonCodes.length === 0 ? (
                  <div className="px-5 py-8 text-center text-xs text-slate-500">
                    Chưa có lý do nào trong nhóm này. Bấm{" "}
                    <span className="font-semibold">Thêm lý do</span> để tạo.
                  </div>
                ) : (
                  <table className="w-full min-w-[820px] text-sm">
                    <thead className="sticky top-0 z-10 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="w-14 px-4 py-2.5 text-left font-semibold">
                          STT
                        </th>
                        <th className="px-4 py-2.5 text-left font-semibold">
                          Tên hiển thị
                        </th>
                        <th className="px-4 py-2.5 text-left font-semibold">
                          Điều kiện áp dụng
                        </th>
                        <th className="px-4 py-2.5 text-left font-semibold">
                          Trạng thái
                        </th>
                        <th className="px-4 py-2.5 text-right font-semibold">
                          Thao tác
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {pagedCodes.map((code, index) => (
                        <tr
                          key={code.id}
                          className="transition-colors hover:bg-slate-50/70"
                        >
                          <td className="px-4 py-2.5">
                            <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-lg bg-slate-100 px-2 text-xs font-bold text-slate-600">
                              {/*
                                STT = VỊ TRÍ THỰC TẾ trong nhóm (liên tục 1..N), KHÔNG
                                phải `displayOrder` lưu trong DB.
                                Lý do: `displayOrder` là giá trị lưu tại thời điểm tạo,
                                nên khi xóa mã ở giữa danh sách thì các mã còn lại
                                giữ số cũ ⇒ STT bị lỗi (1 2 3 4 5 6 9 10 11 12).
                                Tính theo index trong danh sách đã sắp xếp ⇒ luôn khớp
                                với vị trí người dùng đang nhìn thấy.
                              */}
                              {activePage * PAGE_SIZE + index + 1}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 font-semibold text-slate-900">
                            {code.name}
                          </td>
                          <td className="max-w-[320px] px-4 py-2.5 text-xs leading-relaxed text-slate-600">
                            <span className="line-clamp-2">
                              {code.conditions || "—"}
                            </span>
                          </td>
                          <td className="px-4 py-2.5">
                            {code.active ? (
                              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
                                <CheckCircle2 size={11} />
                                Đang bật
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600">
                                <CircleSlash size={11} />
                                Đang tắt
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setCodeForm({
                                    id: code.id,
                                    name: code.name,
                                    conditions: code.conditions ?? "",
                                  });
                                  setCodeFormGroup(activeGroup);
                                }}
                                className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50"
                              >
                                <Pencil size={12} />
                                Sửa
                              </button>
                              <button
                                type="button"
                                onClick={() => handleToggleCode(code)}
                                className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50"
                              >
                                {code.active ? "Tắt" : "Bật"}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteCode(code)}
                                className="inline-flex cursor-pointer items-center gap-1 rounded-lg bg-rose-600 px-2.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-rose-700"
                              >
                                <Trash2 size={12} />
                                Xóa
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Thanh phân trang — 10 lý do / trang */}
              <div className="shrink-0">
                <Pagination
                  page={activePage}
                  totalPages={activeTotalPages}
                  totalElements={activeGroup.reasonCodes.length}
                  unit="lý do"
                  onChange={handleChangePage}
                />
              </div>
            </section>
          )}
        </div>
      )}

      {/* ── Modal thêm / sửa lý do ── */}
      {codeFormGroup && (
        <ModalShell
          title={
            codeForm?.id ? "Sửa lý do hoàn tiền" : "Thêm lý do hoàn tiền"
          }
          subtitle={
            codeForm?.id
              ? `Sửa lý do "${codeForm.name}" thuộc nhóm ${codeFormGroup.name}.`
              : `Thêm lý do chi tiết vào nhóm ${codeFormGroup.name}.`
          }
          onClose={() => {
            setCodeForm(null);
            setCodeFormGroup(null);
          }}
        >
          <ReasonCodeForm
            initial={codeForm}
            saving={saving}
            onSubmit={handleSaveCode}
            onCancel={() => {
              setCodeForm(null);
              setCodeFormGroup(null);
            }}
          />
        </ModalShell>
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 z-[400] max-w-sm rounded-xl bg-emerald-600 px-4 py-3 text-sm font-medium text-white shadow-xl">
          {toast}
        </div>
      )}

      {confirmDialog}
    </div>
  );
}
