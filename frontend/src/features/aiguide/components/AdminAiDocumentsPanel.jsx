"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  FileText,
  Upload,
  Plus,
  RefreshCw,
  Trash2,
  Eye,
  X,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ExternalLink,
  ShieldCheck,
  Power,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Panel, EmptyBlock } from "@/components/dashboard/DashboardUI";
import { aiGuideService } from "../services/aiGuideService";

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MAX_RULE_CHARS = 4000;

const DOC_TYPE_OPTIONS = [
  {
    value: "PLATFORM_POLICY",
    label: "Chính sách nền tảng (RAG)",
    badgeClass: "bg-sky-50 text-sky-700 border-sky-200",
    shortLabel: "Chính sách nền tảng",
  },
  {
    value: "CULTURAL_SUPPLEMENT",
    label: "Bổ sung văn hóa điểm đến (RAG)",
    badgeClass: "bg-amber-50 text-amber-700 border-amber-200",
    shortLabel: "Bổ sung văn hóa",
  },
  {
    value: "FAQ",
    label: "Câu hỏi thường gặp / FAQ (RAG)",
    badgeClass: "bg-indigo-50 text-indigo-700 border-indigo-200",
    shortLabel: "FAQ",
  },
  {
    value: "AI_RULE",
    label: "Quy tắc hành vi AI (System Prompt)",
    badgeClass: "bg-rose-50 text-rose-700 border-rose-200",
    shortLabel: "Quy tắc AI",
  },
];

const DOC_TYPE_META = Object.fromEntries(DOC_TYPE_OPTIONS.map((o) => [o.value, o]));

function formatBytes(bytes) {
  if (!bytes || bytes <= 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

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
 * Panel quản lý File Context (.txt, .md, .docx, .pdf) và Quy tắc hành vi AI (AI_RULE).
 */
export default function AdminAiDocumentsPanel({ destinations = [], onDocumentsChanged }) {
  const fileInputRef = useRef(null);

  // Form tạo mới
  const [title, setTitle] = useState("");
  const [docType, setDocType] = useState("PLATFORM_POLICY");
  const [scope, setScope] = useState("GLOBAL");
  const [destinationId, setDestinationId] = useState("");
  const [rawText, setRawText] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [activeOnCreate, setActiveOnCreate] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Danh sách & lọc
  const [filterType, setFilterType] = useState("");
  const [filterScope, setFilterScope] = useState("");
  const [filterActive, setFilterActive] = useState("");
  const [page, setPage] = useState(0);
  const [docPage, setDocPage] = useState({ content: [], totalElements: 0, totalPages: 0 });
  const [loadingList, setLoadingList] = useState(true);

  // Thao tác dòng & Modal xem/sửa
  const [busyId, setBusyId] = useState(null);
  const [editDraft, setEditDraft] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [loadingDetailId, setLoadingDetailId] = useState(null);

  const [bannerError, setBannerError] = useState("");
  const [bannerSuccess, setBannerSuccess] = useState("");

  const refreshDocuments = useCallback(
    async (
      targetPage = page,
      nextType = filterType,
      nextScope = filterScope,
      nextActive = filterActive,
    ) => {
      setLoadingList(true);
      try {
        const res = await aiGuideService.getAdminDocuments({
          docType: nextType,
          scope: nextScope,
          active: nextActive === "" ? null : nextActive === "true",
          page: targetPage,
          size: 12,
        });
        setDocPage({
          content: Array.isArray(res?.content) ? res.content : [],
          totalElements: res?.totalElements ?? 0,
          totalPages: res?.totalPages ?? 0,
        });
      } catch (err) {
        setBannerError(err?.message || "Không thể tải danh sách tài liệu AI.");
      } finally {
        setLoadingList(false);
      }
    },
    [page, filterType, filterScope, filterActive],
  );

  useEffect(() => {
    let mounted = true;
    aiGuideService
      .getAdminDocuments({
        docType: filterType,
        scope: filterScope,
        active: filterActive === "" ? null : filterActive === "true",
        page,
        size: 12,
      })
      .then((res) => {
        if (!mounted) return;
        setDocPage({
          content: Array.isArray(res?.content) ? res.content : [],
          totalElements: res?.totalElements ?? 0,
          totalPages: res?.totalPages ?? 0,
        });
      })
      .catch((err) => {
        if (mounted) setBannerError(err?.message || "Không thể tải danh sách tài liệu AI.");
      })
      .finally(() => {
        if (mounted) setLoadingList(false);
      });

    return () => {
      mounted = false;
    };
  }, [page, filterType, filterScope, filterActive]);

  const acceptFile = (file) => {
    if (!file) return;
    setBannerError("");
    const lower = (file.name || "").toLowerCase();
    const okExt = [".txt", ".md", ".markdown", ".docx", ".pdf"].some((ext) => lower.endsWith(ext));
    if (!okExt) {
      setBannerError("Chỉ hỗ trợ tệp định dạng .txt, .md, .docx hoặc .pdf.");
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setBannerError("Dung lượng tệp tối đa cho phép là 10MB.");
      return;
    }
    setSelectedFile(file);
    if (!title.trim()) {
      const baseName = file.name.replace(/\.[^/.]+$/, "");
      setTitle(baseName);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) acceptFile(file);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setBannerError("");
    setBannerSuccess("");

    if (!title.trim()) {
      setBannerError("Vui lòng nhập tiêu đề tài liệu.");
      return;
    }
    if (scope === "DESTINATION" && !destinationId) {
      setBannerError("Vui lòng chọn điểm đến khi phạm vi là Điểm đến cụ thể.");
      return;
    }
    if (!selectedFile && !rawText.trim()) {
      setBannerError("Vui lòng chọn file tải lên hoặc dán nội dung văn bản trực tiếp.");
      return;
    }
    if (docType === "AI_RULE" && rawText.trim().length > MAX_RULE_CHARS) {
      setBannerError(
        `Quy tắc AI (AI_RULE) tối đa ${MAX_RULE_CHARS} ký tự để tránh quá tải System Prompt.`,
      );
      return;
    }

    setSubmitting(true);
    try {
      const created = await aiGuideService.createAdminDocument({
        title: title.trim(),
        docType,
        scope,
        destinationId: scope === "DESTINATION" ? Number(destinationId) : null,
        rawText,
        file: selectedFile,
        active: activeOnCreate,
      });

      setTitle("");
      setRawText("");
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setBannerSuccess(
        docType === "AI_RULE"
          ? `Đã lưu quy tắc "${created.title}" vào System Prompt.`
          : `Đã nạp tài liệu "${created.title}" (${created.chunkCount ?? 0} vector chunks).`,
      );
      setPage(0);
      await refreshDocuments(0, filterType, filterScope, filterActive);
      onDocumentsChanged?.();
    } catch (err) {
      setBannerError(err?.message || "Nạp tài liệu thất bại.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (doc) => {
    if (busyId) return;
    setBannerError("");
    setBannerSuccess("");
    setBusyId(doc.id);
    try {
      const updated = await aiGuideService.toggleAdminDocumentStatus(doc.id, !doc.active);
      setBannerSuccess(
        updated.active
          ? `Đã kích hoạt "${updated.title}".`
          : `Đã tạm tắt "${updated.title}" (đã gỡ khỏi AI).`,
      );
      await refreshDocuments(page);
      onDocumentsChanged?.();
    } catch (err) {
      setBannerError(err?.message || "Không thể thay đổi trạng thái tài liệu.");
    } finally {
      setBusyId(null);
    }
  };

  const handleReindex = async (doc) => {
    if (busyId) return;
    setBannerError("");
    setBannerSuccess("");
    setBusyId(doc.id);
    try {
      const updated = await aiGuideService.reindexAdminDocument(doc.id);
      setBannerSuccess(
        `Đã đồng bộ lại vector cho "${updated.title}" (${updated.chunkCount ?? 0} chunks).`,
      );
      await refreshDocuments(page);
      onDocumentsChanged?.();
    } catch (err) {
      setBannerError(err?.message || "Re-index tài liệu thất bại.");
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (doc) => {
    if (busyId) return;
    setBannerError("");
    setBannerSuccess("");
    setBusyId(doc.id);
    try {
      await aiGuideService.deleteAdminDocument(doc.id);
      setBannerSuccess(`Đã xóa tài liệu "${doc.title}" cùng các vector liên quan.`);
      await refreshDocuments(page);
      onDocumentsChanged?.();
    } catch (err) {
      setBannerError(err?.message || "Xóa tài liệu thất bại.");
    } finally {
      setBusyId(null);
    }
  };

  const handleOpenEdit = async (doc) => {
    setBannerError("");
    setLoadingDetailId(doc.id);
    try {
      const fullDoc = await aiGuideService.getAdminDocument(doc.id);
      setEditDraft({
        id: fullDoc.id,
        title: fullDoc.title || "",
        docType: fullDoc.docType || "PLATFORM_POLICY",
        scope: fullDoc.scope || "GLOBAL",
        destinationId: fullDoc.destinationId ? String(fullDoc.destinationId) : "",
        rawText: fullDoc.rawText || "",
        active: Boolean(fullDoc.active),
        fileName: fullDoc.fileName,
        fileType: fullDoc.fileType,
        fileUrl: fullDoc.fileUrl,
        chunkCount: fullDoc.chunkCount ?? 0,
      });
    } catch (err) {
      setBannerError(err?.message || "Không thể tải chi tiết tài liệu.");
    } finally {
      setLoadingDetailId(null);
    }
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editDraft || savingEdit) return;
    setBannerError("");

    if (!editDraft.title.trim() || !editDraft.rawText.trim()) {
      setBannerError("Tiêu đề và nội dung văn bản không được để trống.");
      return;
    }
    if (editDraft.scope === "DESTINATION" && !editDraft.destinationId) {
      setBannerError("Vui lòng chọn điểm đến khi áp dụng phạm vi Điểm đến cụ thể.");
      return;
    }
    if (editDraft.docType === "AI_RULE" && editDraft.rawText.trim().length > MAX_RULE_CHARS) {
      setBannerError(`Quy tắc AI (AI_RULE) tối đa ${MAX_RULE_CHARS} ký tự.`);
      return;
    }

    setSavingEdit(true);
    try {
      const updated = await aiGuideService.updateAdminDocument(editDraft.id, {
        title: editDraft.title.trim(),
        docType: editDraft.docType,
        scope: editDraft.scope,
        destinationId: editDraft.scope === "DESTINATION" ? Number(editDraft.destinationId) : null,
        rawText: editDraft.rawText.trim(),
        active: editDraft.active,
      });
      setEditDraft(null);
      setBannerSuccess(`Đã cập nhật và đồng bộ tài liệu "${updated.title}".`);
      await refreshDocuments(page);
      onDocumentsChanged?.();
    } catch (err) {
      setBannerError(err?.message || "Cập nhật tài liệu thất bại.");
    } finally {
      setSavingEdit(false);
    }
  };

  const destMap = new Map(destinations.map((d) => [Number(d.id), d.name]));

  return (
    <div className="space-y-6">
      {bannerError && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
          <AlertTriangle size={16} className="shrink-0" />
          <span className="flex-1">{bannerError}</span>
          <button
            type="button"
            onClick={() => setBannerError("")}
            className="rounded p-1 hover:bg-rose-100 cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {bannerSuccess && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
          <CheckCircle2 size={16} className="shrink-0 text-emerald-600" />
          <span className="flex-1">{bannerSuccess}</span>
          <button
            type="button"
            onClick={() => setBannerSuccess("")}
            className="rounded p-1 hover:bg-emerald-100 cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Form nạp file Context / Rule */}
      <Panel
        title="Thêm File Context hoặc Quy tắc AI (Rule)"
        description="Hỗ trợ .txt, .md, .docx, .pdf (tối đa 10MB) hoặc dán nội dung trực tiếp. Policy/FAQ/Văn hóa được nhúng RAG; AI_RULE được tiêm thẳng vào System Prompt."
        icon={Upload}
        tone="indigo"
      >
        <form onSubmit={handleCreate} className="space-y-4 p-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="md:col-span-2">
              <label htmlFor="ai-doc-title" className="mb-1.5 block text-xs font-semibold text-slate-700">
                Tiêu đề tài liệu <span className="text-rose-500">*</span>
              </label>
              <input
                id="ai-doc-title"
                type="text"
                maxLength={200}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="VD: Chính sách hoàn tiền & đổi lịch JourneyGo 2026"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label htmlFor="ai-doc-type" className="mb-1.5 block text-xs font-semibold text-slate-700">
                Phân loại
              </label>
              <select
                id="ai-doc-type"
                value={docType}
                onChange={(e) => setDocType(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-indigo-500"
              >
                {DOC_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="ai-doc-scope" className="mb-1.5 block text-xs font-semibold text-slate-700">
                Phạm vi áp dụng
              </label>
              <select
                id="ai-doc-scope"
                value={scope}
                onChange={(e) => {
                  const next = e.target.value;
                  setScope(next);
                  if (next === "GLOBAL") setDestinationId("");
                }}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-indigo-500"
              >
                <option value="GLOBAL">Toàn nền tảng (Global)</option>
                <option value="DESTINATION">Điểm đến cụ thể</option>
              </select>
            </div>
          </div>

          {scope === "DESTINATION" && (
            <div>
              <label htmlFor="ai-doc-dest" className="mb-1.5 block text-xs font-semibold text-slate-700">
                Chọn điểm đến áp dụng <span className="text-rose-500">*</span>
              </label>
              <select
                id="ai-doc-dest"
                value={destinationId}
                onChange={(e) => setDestinationId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-indigo-500 md:max-w-md"
              >
                <option value="">-- Chọn điểm đến --</option>
                {destinations.map((d) => (
                  <option key={d.id} value={String(d.id)}>
                    #{d.id} · {d.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div>
              <span className="mb-1.5 block text-xs font-semibold text-slate-700">
                Tải lên tệp tài liệu (.txt, .md, .docx, .pdf)
              </span>
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    fileInputRef.current?.click();
                  }
                }}
                className={`flex min-h-[148px] flex-col items-center justify-center rounded-xl border-2 border-dashed p-4 text-center transition cursor-pointer ${
                  isDragging
                    ? "border-indigo-500 bg-indigo-50/70"
                    : "border-slate-200 bg-slate-50/70 hover:border-indigo-300 hover:bg-indigo-50/30"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".txt,.md,.markdown,.docx,.pdf"
                  className="hidden"
                  onChange={(e) => acceptFile(e.target.files?.[0])}
                />
                <FileText size={24} className="mb-2 text-indigo-500" />
                {selectedFile ? (
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-slate-800">{selectedFile.name}</p>
                    <p className="text-xs text-slate-500">{formatBytes(selectedFile.size)}</p>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedFile(null);
                        if (fileInputRef.current) fileInputRef.current.value = "";
                      }}
                      className="mt-1 inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50 cursor-pointer"
                    >
                      <X size={12} /> Bỏ chọn tệp
                    </button>
                  </div>
                ) : (
                  <>
                    <p className="text-xs font-semibold text-slate-700">
                      Kéo thả tệp vào đây hoặc <span className="text-indigo-600 underline">chọn tệp từ máy</span>
                    </p>
                    <p className="mt-1 text-[11px] text-slate-400">
                      PDF dạng text, Word (.docx), Markdown (.md) hoặc Plain Text (.txt) · tối đa 10MB
                    </p>
                  </>
                )}
              </div>
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label htmlFor="ai-doc-rawtext" className="text-xs font-semibold text-slate-700">
                  Nội dung văn bản {selectedFile ? "(tùy chọn ghi đè file)" : "(dán trực tiếp nếu không tải file)"}
                </label>
                {docType === "AI_RULE" && (
                  <span
                    className={`text-[11px] font-semibold ${
                      rawText.length > MAX_RULE_CHARS ? "text-rose-600" : "text-slate-500"
                    }`}
                  >
                    {rawText.length} / {MAX_RULE_CHARS} ký tự
                  </span>
                )}
              </div>
              <textarea
                id="ai-doc-rawtext"
                rows={6}
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder={
                  docType === "AI_RULE"
                    ? "VD: Luôn nhắc du khách bảo vệ cảnh quan di tích, không tự ý chạm vào hiện vật cổ..."
                    : "Dán nội dung chính sách, thông tin lịch sử bổ sung hoặc FAQ tại đây..."
                }
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={activeOnCreate}
                onChange={(e) => setActiveOnCreate(e.target.checked)}
                className="rounded text-indigo-600"
              />
              Kích hoạt ngay sau khi tải lên (tự động nhúng RAG / áp dụng System Prompt)
            </label>

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-indigo-700 disabled:opacity-60 cursor-pointer"
            >
              {submitting ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
              {submitting ? "Đang xử lý & nhúng vector..." : "Lưu & Nạp vào AI"}
            </button>
          </div>
        </form>
      </Panel>

      {/* Bảng quản lý Tài liệu Context & Rule */}
      <Panel
        title="Danh sách Tài liệu Context & Quy tắc AI"
        description={`Đang lưu ${docPage.totalElements} tài liệu cấu hình cho AI Virtual Guide.`}
        icon={ShieldCheck}
        tone="slate"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={filterType}
              onChange={(e) => {
                setLoadingList(true);
                setFilterType(e.target.value);
                setPage(0);
              }}
              aria-label="Lọc theo phân loại tài liệu"
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 outline-none"
            >
              <option value="">Tất cả loại</option>
              {DOC_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.shortLabel}
                </option>
              ))}
            </select>

            <select
              value={filterScope}
              onChange={(e) => {
                setLoadingList(true);
                setFilterScope(e.target.value);
                setPage(0);
              }}
              aria-label="Lọc theo phạm vi"
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 outline-none"
            >
              <option value="">Mọi phạm vi</option>
              <option value="GLOBAL">Toàn nền tảng (Global)</option>
              <option value="DESTINATION">Theo điểm đến</option>
            </select>

            <select
              value={filterActive}
              onChange={(e) => {
                setLoadingList(true);
                setFilterActive(e.target.value);
                setPage(0);
              }}
              aria-label="Lọc theo trạng thái"
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 outline-none"
            >
              <option value="">Tất cả trạng thái</option>
              <option value="true">Đang bật</option>
              <option value="false">Đã tắt</option>
            </select>
          </div>
        }
      >
        {loadingList ? (
          <div className="flex items-center justify-center gap-2 py-12 text-xs font-semibold text-slate-500">
            <Loader2 size={16} className="animate-spin text-indigo-600" />
            <span>Đang tải danh sách tài liệu...</span>
          </div>
        ) : docPage.content.length === 0 ? (
          <EmptyBlock
            icon={FileText}
            title="Chưa có tài liệu Context hoặc Rule nào"
            description="Hãy tải file chính sách, tài liệu văn hóa bổ sung hoặc thêm quy tắc AI ở khung phía trên."
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Tài liệu & Xem trước</th>
                    <th className="px-4 py-3">Loại</th>
                    <th className="px-4 py-3">Phạm vi</th>
                    <th className="px-4 py-3">Cơ chế AI</th>
                    <th className="px-4 py-3">Trạng thái</th>
                    <th className="px-4 py-3">Cập nhật</th>
                    <th className="px-4 py-3 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {docPage.content.map((doc) => {
                    const meta = DOC_TYPE_META[doc.docType] || {
                      shortLabel: doc.docType,
                      badgeClass: "bg-slate-100 text-slate-700 border-slate-200",
                    };
                    const destLabel =
                      doc.scope === "GLOBAL"
                        ? "Toàn nền tảng"
                        : doc.destinationName ||
                          destMap.get(Number(doc.destinationId)) ||
                          `Điểm đến #${doc.destinationId}`;
                    const isRule = doc.docType === "AI_RULE";
                    const isBusy = busyId === doc.id;

                    return (
                      <tr key={doc.id} className="hover:bg-slate-50/70">
                        <td className="max-w-sm px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900">{doc.title}</span>
                            <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-bold text-slate-600">
                              {doc.fileType || "TEXT"}
                            </span>
                            {doc.fileUrl && (
                              <a
                                href={doc.fileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="Mở / tải file gốc trên Cloudinary"
                                className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-indigo-600 hover:underline"
                              >
                                <ExternalLink size={12} /> File
                              </a>
                            )}
                          </div>
                          {doc.fileName && (
                            <p className="mt-0.5 text-[11px] text-slate-400">
                              {doc.fileName} ({formatBytes(doc.fileSize)})
                            </p>
                          )}
                          <p className="mt-1 line-clamp-2 text-[11.5px] text-slate-600">
                            {doc.rawTextPreview}
                          </p>
                        </td>

                        <td className="px-4 py-3 whitespace-nowrap">
                          <span
                            className={`inline-block rounded-lg border px-2 py-0.5 text-[11px] font-bold ${meta.badgeClass}`}
                          >
                            {meta.shortLabel}
                          </span>
                        </td>

                        <td className="px-4 py-3 font-semibold text-slate-700 whitespace-nowrap">
                          {destLabel}
                        </td>

                        <td className="px-4 py-3 whitespace-nowrap">
                          {isRule ? (
                            <span className="rounded-md bg-rose-50 px-2 py-0.5 font-semibold text-rose-700">
                              System Prompt
                            </span>
                          ) : (
                            <span className="rounded-md bg-indigo-50 px-2 py-0.5 font-mono font-bold text-indigo-700">
                              {doc.chunkCount ?? 0} chunks
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-3 whitespace-nowrap">
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => handleToggleActive(doc)}
                            title="Bấm để bật/tắt"
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold transition cursor-pointer disabled:opacity-50 ${
                              doc.active
                                ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                                : "bg-slate-200 text-slate-600 hover:bg-slate-300"
                            }`}
                          >
                            <Power size={11} />
                            {doc.active ? "Đang bật" : "Đã tắt"}
                          </button>
                        </td>

                        <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                          {formatDateTime(doc.updatedAt)}
                        </td>

                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              disabled={loadingDetailId === doc.id}
                              onClick={() => handleOpenEdit(doc)}
                              title="Xem nội dung & chỉnh sửa"
                              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50 cursor-pointer"
                            >
                              {loadingDetailId === doc.id ? (
                                <Loader2 size={14} className="animate-spin" />
                              ) : (
                                <Eye size={14} />
                              )}
                            </button>

                            {!isRule && (
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => handleReindex(doc)}
                                title="Nhúng vector lại (Re-index)"
                                className="rounded-lg p-1.5 text-slate-500 hover:bg-indigo-50 hover:text-indigo-700 disabled:opacity-50 cursor-pointer"
                              >
                                <RefreshCw size={14} className={isBusy ? "animate-spin" : ""} />
                              </button>
                            )}

                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => handleDelete(doc)}
                              title="Xóa vĩnh viễn tài liệu & vector"
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

            {docPage.totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-xs text-slate-600">
                <span>
                  Trang <b>{page + 1}</b> / {docPage.totalPages}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={page === 0}
                    onClick={() => {
                      setLoadingList(true);
                      setPage((p) => Math.max(0, p - 1));
                    }}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 font-semibold hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
                  >
                    <ChevronLeft size={14} /> Trước
                  </button>
                  <button
                    type="button"
                    disabled={page + 1 >= docPage.totalPages}
                    onClick={() => {
                      setLoadingList(true);
                      setPage((p) => p + 1);
                    }}
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

      {/* Modal xem / chỉnh sửa tài liệu */}
      {editDraft && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs"
          onClick={() => setEditDraft(null)}
        >
          <form
            onSubmit={handleSaveEdit}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <p className="font-mono text-xs font-bold text-indigo-600">
                  ADMIN_DOC:{editDraft.id} · {editDraft.fileType || "TEXT"}
                </p>
                <h3 className="text-base font-bold text-slate-900">Chi tiết & Chỉnh sửa tài liệu AI</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditDraft(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {editDraft.fileUrl && (
              <div className="flex items-center justify-between rounded-xl border border-indigo-100 bg-indigo-50/70 px-3.5 py-2.5 text-xs">
                <span className="font-semibold text-indigo-900">
                  File gốc: {editDraft.fileName || "Tệp đính kèm"}
                </span>
                <a
                  href={editDraft.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-bold text-indigo-700 hover:underline"
                >
                  Tải / Xem file gốc <ExternalLink size={13} />
                </a>
              </div>
            )}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-semibold text-slate-700">Tiêu đề</label>
                <input
                  type="text"
                  maxLength={200}
                  value={editDraft.title}
                  onChange={(e) => setEditDraft((prev) => ({ ...prev, title: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">Phân loại</label>
                <select
                  value={editDraft.docType}
                  onChange={(e) => setEditDraft((prev) => ({ ...prev, docType: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none"
                >
                  {DOC_TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">Phạm vi</label>
                <select
                  value={editDraft.scope}
                  onChange={(e) => {
                    const nextScope = e.target.value;
                    setEditDraft((prev) => ({
                      ...prev,
                      scope: nextScope,
                      destinationId: nextScope === "GLOBAL" ? "" : prev.destinationId,
                    }));
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none"
                >
                  <option value="GLOBAL">Toàn nền tảng (Global)</option>
                  <option value="DESTINATION">Điểm đến cụ thể</option>
                </select>
              </div>

              {editDraft.scope === "DESTINATION" && (
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-semibold text-slate-700">Điểm đến</label>
                  <select
                    value={editDraft.destinationId}
                    onChange={(e) => setEditDraft((prev) => ({ ...prev, destinationId: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none"
                  >
                    <option value="">-- Chọn điểm đến --</option>
                    {destinations.map((d) => (
                      <option key={d.id} value={String(d.id)}>
                        #{d.id} · {d.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700">Nội dung văn bản đã trích xuất</label>
                {editDraft.docType === "AI_RULE" && (
                  <span
                    className={`text-[11px] font-semibold ${
                      editDraft.rawText.length > MAX_RULE_CHARS ? "text-rose-600" : "text-slate-500"
                    }`}
                  >
                    {editDraft.rawText.length} / {MAX_RULE_CHARS} ký tự
                  </span>
                )}
              </div>
              <textarea
                rows={10}
                value={editDraft.rawText}
                onChange={(e) => setEditDraft((prev) => ({ ...prev, rawText: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 font-mono text-xs leading-relaxed text-slate-800 outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
              <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editDraft.active}
                  onChange={(e) => setEditDraft((prev) => ({ ...prev, active: e.target.checked }))}
                  className="rounded text-indigo-600"
                />
                Đang kích hoạt cho AI sử dụng
              </label>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditDraft(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-60 cursor-pointer"
                >
                  {savingEdit && <Loader2 size={14} className="animate-spin" />}
                  Lưu & Đồng bộ lại
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
