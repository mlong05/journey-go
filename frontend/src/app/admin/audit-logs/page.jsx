"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Clock,
  Filter,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
} from "lucide-react";
import {
  Empty,
  ErrorBox,
  Loading,
  Pagination,
  Panel,
} from "@/components/admin/AdminUI";
import { auditLogService } from "@/features/auditlog";
import { formatDateTimeVN } from "@/lib/money";

/** Nhóm thao tác — khớp với `SystemAuditLog.Category` ở backend. */
const CATEGORY_OPTIONS = [
  { value: "", label: "Tất cả nhóm" },
  { value: "AUTH", label: "Đăng nhập / xác thực" },
  { value: "RBAC", label: "Phân quyền" },
  { value: "CONTENT", label: "Nội dung" },
  { value: "FINANCE", label: "Tài chính" },
  { value: "MODERATION", label: "Kiểm duyệt" },
  { value: "REVIEW", label: "Đánh giá" },
  { value: "SYSTEM", label: "Hệ thống" },
];

/** Màu badge theo kết quả thao tác. */
const OUTCOME_STYLES = {
  SUCCESS: "bg-emerald-50 text-emerald-700 border-emerald-200",
  FAILURE: "bg-amber-50 text-amber-700 border-amber-200",
  DENIED: "bg-rose-50 text-rose-700 border-rose-200",
};

const PAGE_SIZE = 20;

/**
 * Trang Nhật ký kiểm toán hệ thống — Admin.
 *
 * Trước đây trang này là UI "stub" (mảng `logs` rỗng, không gọi API) ⇒ không
 * truy vết được gì. Nay đọc từ `GET /api/v1/admin/audit-logs`.
 */
export default function AdminAuditLogsPage() {
  const [page, setPage] = useState(0);
  const [pageData, setPageData] = useState({
    content: [],
    totalElements: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [category, setCategory] = useState("");
  const [action, setAction] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  const [actionOptions, setActionOptions] = useState([]);

  // Debounce từ khoá tìm kiếm.
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(0);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Danh sách hành động cho dropdown.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await auditLogService.getAuditLogActions();
        if (!cancelled) setActionOptions(list || []);
      } catch {
        // Không tải được danh sách hành động ⇒ vẫn dùng được bộ lọc theo nhóm.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await auditLogService.getAuditLogs({
        category,
        action,
        keyword: search,
        page,
        size: PAGE_SIZE,
      });
      setPageData({
        content: result?.content || [],
        totalElements: result?.totalElements || 0,
        totalPages: result?.totalPages || 0,
      });
    } catch (err) {
      console.error("Lỗi tải nhật ký kiểm toán:", err);
      setError(err?.message || "Không tải được nhật ký kiểm toán.");
    } finally {
      setLoading(false);
    }
  }, [category, action, search, page]);

  useEffect(() => {
    queueMicrotask(() => load());
  }, [load]);

  const rows = pageData.content || [];

  const categoryLabel = useMemo(() => {
    const map = Object.fromEntries(CATEGORY_OPTIONS.map((o) => [o.value, o.label]));
    return (value) => map[value] || value || "—";
  }, []);

  return (
    <div className="flex flex-col gap-4">
      {/* ── Header ── */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/90 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-900" />
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-700">
                An Toàn & Truy Vết Hệ Thống
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Nhật Ký Kiểm Toán Toàn Sàn
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Ghi bất biến mọi thay đổi phân quyền, cập nhật nội dung và thao tác tài chính
            </p>
          </div>
          <button
            type="button"
            onClick={() => load()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <RefreshCw size={13} />
            )}
            Làm mới
          </button>
        </div>
      </div>

      {error && <ErrorBox text={error} />}

      {/* ── Bộ lọc ── */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1 min-w-0">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Tìm theo email, hành động, đối tượng hoặc chi tiết..."
            className="w-full pl-8.5 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter size={13} className="text-slate-400 shrink-0" />
          <select
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setPage(0);
            }}
            className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-700 focus:bg-white focus:outline-none"
          >
            {CATEGORY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <select
            value={action}
            onChange={(e) => {
              setAction(e.target.value);
              setPage(0);
            }}
            className="max-w-[220px] rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-700 focus:bg-white focus:outline-none"
          >
            <option value="">Tất cả hành động</option>
            {actionOptions.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Bảng ── */}
      <Panel icon={ShieldCheck} title="Nhật ký" fill>
        {loading && rows.length === 0 ? (
          <Loading />
        ) : rows.length === 0 ? (
          <Empty
            icon={ShieldCheck}
            text={
              search || category || action
                ? "Không có nhật ký nào khớp bộ lọc hiện tại."
                : "Chưa có thao tác nào được ghi nhận."
            }
          />
        ) : (
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 z-10">
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[10.5px] font-bold uppercase text-slate-500 tracking-wider">
                <th className="py-3 px-4">THỜI GIAN</th>
                <th className="py-3 px-3">TÀI KHOẢN THỰC HIỆN</th>
                <th className="py-3 px-3">NHÓM</th>
                <th className="py-3 px-3">HÀNH ĐỘNG</th>
                <th className="py-3 px-3">ĐỐI TƯỢNG</th>
                <th className="py-3 px-3">IP NGUỒN</th>
                <th className="py-3 px-4 text-right">KẾT QUẢ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/70 align-top">
                  <td className="py-3 px-4 font-mono whitespace-nowrap">
                    {log.createdAt ? formatDateTimeVN(log.createdAt) : "—"}
                  </td>
                  <td className="py-3 px-3">
                    <div className="font-semibold text-slate-800">
                      {log.actorEmail || "Hệ thống"}
                    </div>
                    {log.actorRole && (
                      <div className="text-[10.5px] text-slate-400">{log.actorRole}</div>
                    )}
                  </td>
                  <td className="py-3 px-3 text-slate-600">
                    {categoryLabel(log.category)}
                  </td>
                  <td className="py-3 px-3 font-mono text-slate-700">{log.action}</td>
                  <td className="py-3 px-3 text-slate-600">
                    {log.entityType ? (
                      <span className="font-mono">
                        {log.entityType}
                        {log.entityId ? `#${log.entityId}` : ""}
                      </span>
                    ) : (
                      "—"
                    )}
                    {log.detail && (
                      <div className="mt-0.5 max-w-[280px] truncate text-[10.5px] text-slate-400">
                        {log.detail}
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-3 font-mono text-slate-500">{log.ipAddress || "—"}</td>
                  <td className="py-3 px-4 text-right">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10.5px] font-bold ${
                        OUTCOME_STYLES[log.outcome] || OUTCOME_STYLES.SUCCESS
                      }`}
                    >
                      {log.outcome === "SUCCESS" ? (
                        <ShieldCheck size={10} />
                      ) : log.outcome === "DENIED" ? (
                        <AlertTriangle size={10} />
                      ) : (
                        <Clock size={10} />
                      )}
                      {log.outcome}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>

      <Pagination
        page={page}
        totalPages={pageData.totalPages}
        totalElements={pageData.totalElements}
        unit="dòng nhật ký"
        onChange={setPage}
      />
    </div>
  );
}
