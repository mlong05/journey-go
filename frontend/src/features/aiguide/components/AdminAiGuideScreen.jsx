"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Bot,
  Database,
  RefreshCw,
  MessageSquare,
  Cpu,
  Trash2,
  Eye,
  X,
  Send,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { PageHeader, StatCard, Panel, EmptyBlock } from "@/components/dashboard/DashboardUI";
import { aiGuideService } from "../services/aiGuideService";

const CONTENT_TYPE_OPTIONS = [
  { value: "", label: "Tất cả phân loại" },
  { value: "CULTURAL_STORY", label: "Câu chuyện văn hóa (CULTURAL_STORY)" },
  { value: "TOUR_INFO", label: "Thông tin địa điểm / Tour (TOUR_INFO)" },
  { value: "TASK_HINT", label: "Gợi ý nhiệm vụ (TASK_HINT)" },
  { value: "HISTORY", label: "Lịch sử (HISTORY)" },
  { value: "AUDIO", label: "Audio thuyết minh (AUDIO)" },
];

function formatDateTime(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

/**
 * Màn hình Quản trị & Đồng bộ Vector Database cho AI Virtual Guide (/admin/ai-guide).
 */
export default function AdminAiGuideScreen() {
  const [stats, setStats] = useState(null);
  const [destinations, setDestinations] = useState([]);
  const [syncDestId, setSyncDestId] = useState("");
  const [syncingAll, setSyncingAll] = useState(false);
  const [syncingDest, setSyncingDest] = useState(false);
  const [syncResult, setSyncResult] = useState(null);

  const [filterDestId, setFilterDestId] = useState("");
  const [filterType, setFilterType] = useState("");
  const [page, setPage] = useState(0);
  const [chunkPage, setChunkPage] = useState({ content: [], totalElements: 0, totalPages: 0 });
  const [loadingChunks, setLoadingChunks] = useState(true);
  const [inspectChunk, setInspectChunk] = useState(null);
  const [deletingSource, setDeletingSource] = useState("");
  const [error, setError] = useState("");

  // Hộp thử nghiệm RAG Sandbox
  const [sandboxDestId, setSandboxDestId] = useState("");
  const [sandboxTaskMode, setSandboxTaskMode] = useState(false);
  const [sandboxQuestion, setSandboxQuestion] = useState("");
  const [sandboxReply, setSandboxReply] = useState(null);
  const [sandboxLoading, setSandboxLoading] = useState(false);

  const loadStatsAndDestinations = useCallback(async () => {
    try {
      const [statsRes, destList] = await Promise.all([
        aiGuideService.getAdminStats(),
        aiGuideService.getDestinations(),
      ]);
      setStats(statsRes);
      setDestinations(destList);
    } catch (err) {
      setError(err?.message || "Không thể tải thống kê Vector Store.");
    }
  }, []);

  const loadChunks = useCallback(
    async (targetPage = page, dest = filterDestId, type = filterType) => {
      setLoadingChunks(true);
      try {
        const res = await aiGuideService.getAdminChunks({
          destinationId: dest || null,
          contentType: type,
          page: targetPage,
          size: 15,
        });
        setChunkPage({
          content: Array.isArray(res?.content) ? res.content : [],
          totalElements: res?.totalElements ?? 0,
          totalPages: res?.totalPages ?? 0,
        });
      } catch (err) {
        setError(err?.message || "Không thể tải danh sách vector chunks.");
      } finally {
        setLoadingChunks(false);
      }
    },
    [page, filterDestId, filterType],
  );

  useEffect(() => {
    let active = true;
    Promise.all([
      aiGuideService.getAdminStats(),
      aiGuideService.getDestinations(),
    ])
      .then(([statsRes, destList]) => {
        if (!active) return;
        setStats(statsRes);
        setDestinations(destList);
      })
      .catch((err) => {
        if (active) setError(err?.message || "Không thể tải thống kê Vector Store.");
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    aiGuideService
      .getAdminChunks({
        destinationId: filterDestId || null,
        contentType: filterType,
        page,
        size: 15,
      })
      .then((res) => {
        if (!active) return;
        setChunkPage({
          content: Array.isArray(res?.content) ? res.content : [],
          totalElements: res?.totalElements ?? 0,
          totalPages: res?.totalPages ?? 0,
        });
      })
      .catch((err) => {
        if (active) setError(err?.message || "Không thể tải danh sách vector chunks.");
      })
      .finally(() => {
        if (active) setLoadingChunks(false);
      });
    return () => {
      active = false;
    };
  }, [page, filterDestId, filterType]);

  const handleSyncAll = async () => {
    setError("");
    setSyncResult(null);
    setSyncingAll(true);
    try {
      const res = await aiGuideService.syncAll();
      setSyncResult(res);
      await loadStatsAndDestinations();
      await loadChunks(0, filterDestId, filterType);
      setPage(0);
    } catch (err) {
      setError(err?.message || "Đồng bộ toàn bộ thất bại.");
    } finally {
      setSyncingAll(false);
    }
  };

  const handleSyncDestination = async () => {
    if (!syncDestId) return;
    setError("");
    setSyncResult(null);
    setSyncingDest(true);
    try {
      const res = await aiGuideService.syncDestination(syncDestId);
      setSyncResult(res);
      await loadStatsAndDestinations();
      await loadChunks(0, filterDestId, filterType);
      setPage(0);
    } catch (err) {
      setError(err?.message || "Đồng bộ địa điểm thất bại.");
    } finally {
      setSyncingDest(false);
    }
  };

  const handleDeleteSource = async (sourceId) => {
    if (!sourceId || deletingSource) return;
    setError("");
    setDeletingSource(sourceId);
    try {
      await aiGuideService.deleteSource(sourceId);
      await loadStatsAndDestinations();
      await loadChunks(page, filterDestId, filterType);
    } catch (err) {
      setError(err?.message || `Không thể xóa nguồn ${sourceId}.`);
    } finally {
      setDeletingSource("");
    }
  };

  const handleSandboxTest = async (e) => {
    e.preventDefault();
    if (!sandboxQuestion.trim() || sandboxLoading) return;
    setError("");
    setSandboxLoading(true);
    try {
      const res = await aiGuideService.chat({
        destinationId: sandboxDestId ? Number(sandboxDestId) : null,
        taskId: sandboxTaskMode ? 1 : null,
        question: sandboxQuestion.trim(),
      });
      setSandboxReply(res);
      await loadStatsAndDestinations();
    } catch (err) {
      setError(err?.message || "Thử nghiệm hỏi đáp AI thất bại.");
    } finally {
      setSandboxLoading(false);
    }
  };

  const destMap = new Map(destinations.map((d) => [Number(d.id), d.name]));
  const typeBreakdown = stats?.chunksByContentType
    ? Object.entries(stats.chunksByContentType)
    : [];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Trí tuệ nhân tạo & Tri thức"
        title="Quản Trị AI Hướng Dẫn Viên (RAG)"
        description="Đồng bộ dữ liệu văn hóa, địa điểm, trạm tour vào Vector Store và kiểm thử mô hình Gemini RAG."
      >
        <button
          type="button"
          onClick={handleSyncAll}
          disabled={syncingAll}
          className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-rose-700 disabled:opacity-60 cursor-pointer"
        >
          {syncingAll ? (
            <Loader2 size={15} className="animate-spin" />
          ) : (
            <RefreshCw size={15} />
          )}
          {syncingAll ? "Đang đồng bộ..." : "Đồng bộ toàn bộ dữ liệu"}
        </button>
      </PageHeader>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
          <AlertTriangle size={16} className="shrink-0" />
          <span className="flex-1">{error}</span>
          <button
            type="button"
            onClick={() => setError("")}
            className="rounded p-1 hover:bg-rose-100 cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {syncResult && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-800">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="shrink-0 text-emerald-600" />
            <span>
              Đồng bộ hoàn tất: đã tạo <b>{syncResult.totalChunksCreated ?? 0}</b> vector chunks
              {syncResult.processedContents != null && ` · Nội dung: ${syncResult.processedContents}`}
              {syncResult.processedDestinations != null && ` · Điểm đến: ${syncResult.processedDestinations}`}
              {syncResult.processedTourStops != null && ` · Trạm tour: ${syncResult.processedTourStops}`}
              {syncResult.processedTasks != null && ` · Nhiệm vụ: ${syncResult.processedTasks}`}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setSyncResult(null)}
            className="rounded p-1 hover:bg-emerald-100 cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Thẻ KPI & Trạng thái Engine */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Tổng đoạn tri thức (Chunks)"
          value={(stats?.totalKnowledgeChunks ?? 0).toLocaleString("vi-VN")}
          unit="chunks"
          icon={Database}
          tone="indigo"
          hint={
            typeBreakdown.length > 0
              ? typeBreakdown.map(([k, v]) => `${k}: ${v}`).join(" · ")
              : "Chưa có dữ liệu vector"
          }
        />
        <StatCard
          title="Phiên hội thoại Du khách"
          value={(stats?.totalSessions ?? 0).toLocaleString("vi-VN")}
          unit="phiên"
          icon={Bot}
          tone="emerald"
          hint={`Tổng ${(stats?.totalMessages ?? 0).toLocaleString("vi-VN")} lượt trao đổi`}
        />
        <StatCard
          title="Chế độ Vector Store"
          value={stats?.pgvectorEnabled ? "pgvector HNSW" : "TEXT Cosine"}
          icon={Cpu}
          tone={stats?.pgvectorEnabled ? "emerald" : "amber"}
          badge={{
            text: stats?.pgvectorEnabled ? "Native Vector" : "Local Fallback",
            positive: stats?.pgvectorEnabled ? true : undefined,
          }}
          hint={
            stats?.pgvectorEnabled
              ? "Tối ưu truy vấn Cosine <=> trên Postgres"
              : "Tính Cosine chính xác trong Java"
          }
        />
        <StatCard
          title="Cấu hình Gemini API"
          value={stats?.apiKeyConfigured ? "Đã cấu hình" : "Chưa có Key"}
          icon={Sparkles}
          tone={stats?.apiKeyConfigured ? "sky" : "rose"}
          badge={{
            text: stats?.chatModel || "gemini-3.5-flash-lite",
            positive: Boolean(stats?.apiKeyConfigured),
          }}
          hint={`Embedding: ${stats?.embeddingModel || "gemini-embedding-001"}`}
        />
      </div>

      {/* Đồng bộ theo điểm đến & Hộp thử nghiệm RAG */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Panel
          title="Đồng bộ Vector theo Điểm đến"
          description="Làm mới tức thời tri thức của một điểm đến cụ thể sau khi cập nhật nội dung."
          icon={RefreshCw}
          tone="rose"
        >
          <div className="space-y-4 p-5">
            <div>
              <label htmlFor="sync-dest-select" className="mb-1.5 block text-xs font-semibold text-slate-600">
                Chọn điểm đến cần đồng bộ lại
              </label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <select
                  id="sync-dest-select"
                  value={syncDestId}
                  onChange={(e) => setSyncDestId(e.target.value)}
                  className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-rose-500"
                >
                  <option value="">-- Chọn điểm đến --</option>
                  {destinations.map((d) => (
                    <option key={d.id} value={String(d.id)}>
                      #{d.id} · {d.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={!syncDestId || syncingDest}
                  onClick={handleSyncDestination}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white transition hover:bg-slate-800 disabled:opacity-50 cursor-pointer"
                >
                  {syncingDest ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                  Đồng bộ điểm đến
                </button>
              </div>
            </div>

            {typeBreakdown.length > 0 && (
              <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5">
                <p className="mb-2 text-xs font-bold text-slate-700">Phân bố tri thức hiện tại</p>
                <div className="flex flex-wrap gap-2">
                  {typeBreakdown.map(([type, count]) => (
                    <span
                      key={type}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700"
                    >
                      <span className="font-mono text-[11px] text-indigo-600">{type}</span>
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-bold">{count}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Panel>

        <Panel
          title="Hộp thử nghiệm AI (Test RAG Sandbox)"
          description="Kiểm tra nhanh khả năng truy xuất ngữ cảnh và Guardrails chống lộ đáp án."
          icon={MessageSquare}
          tone="indigo"
        >
          <form onSubmit={handleSandboxTest} className="space-y-3 p-5">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
              <select
                value={sandboxDestId}
                onChange={(e) => setSandboxDestId(e.target.value)}
                aria-label="Ngữ cảnh điểm đến thử nghiệm"
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-indigo-500"
              >
                <option value="">Tất cả điểm đến (Global)</option>
                {destinations.map((d) => (
                  <option key={d.id} value={String(d.id)}>
                    #{d.id} · {d.name}
                  </option>
                ))}
              </select>

              <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={sandboxTaskMode}
                  onChange={(e) => setSandboxTaskMode(e.target.checked)}
                  className="rounded text-indigo-600"
                />
                Task Hint Mode
              </label>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={sandboxQuestion}
                onChange={(e) => setSandboxQuestion(e.target.value)}
                placeholder="Nhập câu hỏi kiểm thử AI..."
                className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:border-indigo-500"
              />
              <button
                type="submit"
                disabled={sandboxLoading || !sandboxQuestion.trim()}
                className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-indigo-700 disabled:opacity-50 cursor-pointer"
              >
                {sandboxLoading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                Chạy thử
              </button>
            </div>

            {sandboxReply && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10.5px] font-bold text-indigo-700">
                    Mode: {sandboxReply.mode}
                  </span>
                  {Array.isArray(sandboxReply.citations) && sandboxReply.citations.length > 0 && (
                    <span className="truncate text-[11px] font-semibold text-slate-500">
                      Trích dẫn: {sandboxReply.citations.join(", ")}
                    </span>
                  )}
                </div>
                <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-slate-800">
                  {sandboxReply.answer}
                </p>
              </div>
            )}
          </form>
        </Panel>
      </div>

      {/* Bảng danh sách Chunks trong Vector Store */}
      <Panel
        title="Kho tri thức Vector Chunks"
        description={`Tổng cộng ${chunkPage.totalElements} đoạn tri thức đang lưu trong cơ sở dữ liệu.`}
        icon={Database}
        tone="slate"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={filterDestId}
              onChange={(e) => {
                setFilterDestId(e.target.value);
                setPage(0);
              }}
              aria-label="Lọc theo điểm đến"
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 outline-none"
            >
              <option value="">Tất cả điểm đến</option>
              {destinations.map((d) => (
                <option key={d.id} value={String(d.id)}>
                  #{d.id} · {d.name}
                </option>
              ))}
            </select>

            <select
              value={filterType}
              onChange={(e) => {
                setFilterType(e.target.value);
                setPage(0);
              }}
              aria-label="Lọc theo phân loại"
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 outline-none"
            >
              {CONTENT_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        }
      >
        {loadingChunks ? (
          <div className="flex items-center justify-center gap-2 py-12 text-xs font-semibold text-slate-500">
            <Loader2 size={16} className="animate-spin text-indigo-600" />
            <span>Đang tải kho tri thức...</span>
          </div>
        ) : chunkPage.content.length === 0 ? (
          <EmptyBlock
            icon={Database}
            title="Chưa có đoạn tri thức phù hợp"
            description="Hãy nhấn 'Đồng bộ toàn bộ dữ liệu' ở góc trên để nạp tri thức từ nội dung đã duyệt."
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Nguồn (Source ID)</th>
                    <th className="px-4 py-3">Điểm đến</th>
                    <th className="px-4 py-3">Phân loại</th>
                    <th className="px-4 py-3">Nội dung đoạn tri thức</th>
                    <th className="px-4 py-3">Cập nhật</th>
                    <th className="px-4 py-3 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {chunkPage.content.map((c) => {
                    const destName =
                      c.metadata?.destination_name ||
                      destMap.get(Number(c.destinationId)) ||
                      `#${c.destinationId}`;
                    return (
                      <tr key={c.id} className="hover:bg-slate-50/70">
                        <td className="px-4 py-3 font-mono text-[11px] font-semibold text-slate-700 whitespace-nowrap">
                          {c.sourceId}
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-700 whitespace-nowrap">
                          {destName}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="rounded-md bg-indigo-50 px-2 py-0.5 font-mono text-[10.5px] font-bold text-indigo-700">
                            {c.contentType}
                          </span>
                        </td>
                        <td className="max-w-md px-4 py-3 text-slate-600">
                          <p className="line-clamp-2">{c.chunkText}</p>
                        </td>
                        <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                          {formatDateTime(c.updatedAt)}
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => setInspectChunk(c)}
                              title="Xem chi tiết chunk"
                              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
                            >
                              <Eye size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteSource(c.sourceId)}
                              disabled={deletingSource === c.sourceId}
                              title={`Xóa toàn bộ chunks của ${c.sourceId}`}
                              className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50 cursor-pointer"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {chunkPage.totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-xs text-slate-600">
                <span>
                  Trang <b>{page + 1}</b> / {chunkPage.totalPages}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={page === 0}
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 font-semibold hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
                  >
                    <ChevronLeft size={14} /> Trước
                  </button>
                  <button
                    type="button"
                    disabled={page + 1 >= chunkPage.totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 font-semibold hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
                  >
                    Sau <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </Panel>

      {/* Modal xem chi tiết Chunk */}
      {inspectChunk && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs"
          onClick={() => setInspectChunk(null)}
        >
          <div
            className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <p className="font-mono text-xs font-bold text-indigo-600">{inspectChunk.sourceId}</p>
                <h3 className="text-base font-bold text-slate-900">Chi tiết đoạn tri thức</h3>
              </div>
              <button
                type="button"
                onClick={() => setInspectChunk(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm whitespace-pre-wrap leading-relaxed text-slate-800">
              {inspectChunk.chunkText}
            </div>
            <div>
              <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-slate-500">Metadata JSON</p>
              <pre className="overflow-x-auto rounded-xl bg-slate-900 p-3 text-xs text-slate-100">
                {JSON.stringify(inspectChunk.metadata || {}, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
