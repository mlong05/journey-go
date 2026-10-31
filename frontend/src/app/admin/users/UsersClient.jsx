"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useSearchParams } from "next/navigation";
import {
  Users,
  Search,
  X,
  RefreshCw,
  Download,
  Building2,
  ShieldCheck,
  Compass,
  Eye,
  Phone,
  KeyRound,
  Globe,
  CheckCircle2,
  AlertCircle,
  Inbox,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Mail,
  Calendar,
  RotateCcw,
  Sparkles,
  Save,
  Pencil,
  ShieldAlert,
  UserPlus,
  EyeOff,
  Upload,
  Camera,
  Image as ImageIcon,
} from "lucide-react";
import { apiClient } from "@/services/apiClient";
import RoleManagerModal from "./RoleManagerModal";

// URL chỉ dùng để hiển thị trong banner cảnh báo khi fallback.
// Việc gọi API thực sự dùng apiClient (đã cấu hình base URL đúng ở services/apiClient.js).
const API_BASE_URL_DISPLAY =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8088/api/v1";

/* =========================================================================
   CÁC HẰNG SỐ PHÂN HỆ (ROLE / STATUS / AUTH PROVIDER)
   ========================================================================= */

const ROLES = {
  ADMIN: "ADMIN",
  MODERATOR: "MODERATOR",
  PROVIDER: "PROVIDER",
  TOURIST: "TOURIST",
};

const ROLE_LABELS = {
  [ROLES.ADMIN]: "Quản trị viên",
  [ROLES.MODERATOR]: "Kiểm duyệt viên",
  [ROLES.PROVIDER]: "Đối tác Điểm đến",
  [ROLES.TOURIST]: "Khách du lịch",
};

const ROLE_BADGE_CLASS = {
  [ROLES.ADMIN]:
    "bg-rose-50 text-rose-700 border-rose-200",
  [ROLES.MODERATOR]:
    "bg-indigo-50 text-indigo-700 border-indigo-200",
  [ROLES.PROVIDER]:
    "bg-emerald-50 text-emerald-700 border-emerald-200",
  [ROLES.TOURIST]: "bg-sky-50 text-sky-700 border-sky-200",
};

const ROLE_AVATAR_BG = {
  [ROLES.ADMIN]: "bg-rose-100 text-rose-700",
  [ROLES.MODERATOR]: "bg-indigo-100 text-indigo-700",
  [ROLES.PROVIDER]: "bg-emerald-100 text-emerald-700",
  [ROLES.TOURIST]: "bg-sky-100 text-sky-700",
};

const SORT_OPTIONS = [
  { value: "id,ASC", label: "ID: Tăng dần" },
  { value: "id,DESC", label: "ID: Giảm dần" },
  { value: "createdAt,DESC", label: "Mới tham gia" },
  { value: "fullName,ASC", label: "Tên A-Z" },
];

const SIZE_OPTIONS = [10, 20, 50];

/* =========================================================================
   HELPER FUNCTIONS
   ========================================================================= */

function formatDateTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  const hh = String(date.getHours()).padStart(2, "0");
  const mi = String(date.getMinutes()).padStart(2, "0");
  return `${dd}/${mm}/${yyyy} ${hh}:${mi}`;
}

function getInitials(fullName = "") {
  if (!fullName) return "??";
  const parts = String(fullName).trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "??";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
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
   COMPONENT CHÍNH: TRANG QUẢN LÝ NGƯỜI DÙNG & PHÂN QUYỀN
   ========================================================================= */

export default function AdminUsersClient() {
  /* ----------------------------- STATE ----------------------------- */
  const [pageData, setPageData] = useState({
    content: [],
    totalElements: 0,
    totalPages: 0,
    size: 20,
    number: 0,
    first: true,
    last: true,
    empty: true,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isFallback, setIsFallback] = useState(false);
  const [fetchError, setFetchError] = useState("");
  const [errorType, setErrorType] = useState("");

  // Filter states
  const [roleFilter, setRoleFilter] = useState("all");
  const [activeFilter, setActiveFilter] = useState("all");
  const [sortValue, setSortValue] = useState("id,ASC");
  const [pageSize, setPageSize] = useState(20);
  const [pageNumber, setPageNumber] = useState(0);
  const [keywordInput, setKeywordInput] = useState("");
  const [keywordApplied, setKeywordApplied] = useState("");

  // Từ khoá gõ ở ô tìm kiếm đầu trang được chuyển tới đây qua ?search= (áp dụng qua bộ trễ 400ms bên dưới)
  const urlSearch = useSearchParams().get("search") ?? "";
  const [appliedUrlSearch, setAppliedUrlSearch] = useState(null);
  if (urlSearch !== appliedUrlSearch) {
    setAppliedUrlSearch(urlSearch);
    if (urlSearch) setKeywordInput(urlSearch);
  }

  // Detail modal
  const [detailUser, setDetailUser] = useState(null);

  // Edit modal (chỉnh sửa thông tin + role + active)
  const [editUser, setEditUser] = useState(null);

  // Create modal (thêm người dùng mới)
  const [createOpen, setCreateOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Role Manager modal (quản lý & định nghĩa vai trò hệ thống)
  const [roleManagerOpen, setRoleManagerOpen] = useState(false);

  // Row đang được mutate (id của user) — disable nút để tránh double-click
  const [mutatingId, setMutatingId] = useState(null);
  // Map id → action đang chạy: "role" | "status" | "save"
  const [mutatingAction, setMutatingAction] = useState({});

  // Toast
  const [toast, setToast] = useState({ visible: false, message: "", tone: "success" });

  /* --------------------------- REFS & DEBOUNCE -------------------- */
  const debounceRef = useRef(null);

  /* --------------------------- DERIVED ----------------------------- */
  const showToast = useCallback((message, tone = "success") => {
    setToast({ visible: true, message, tone });
    setTimeout(() => {
      setToast((prev) => ({ ...prev, visible: false }));
    }, 3500);
  }, []);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (roleFilter !== "all") count += 1;
    if (activeFilter !== "all") count += 1;
    if (keywordApplied) count += 1;
    return count;
  }, [roleFilter, activeFilter, keywordApplied]);

  const roleStats = useMemo(() => {
    const content = Array.isArray(pageData.content) ? pageData.content : [];
    return {
      total: pageData.totalElements || 0,
      providers: content.filter((u) => u.role === ROLES.PROVIDER).length,
      moderators: content.filter((u) => u.role === ROLES.MODERATOR).length,
      users: content.filter((u) => u.role === ROLES.TOURIST).length,
    };
  }, [pageData]);

  /* --------------------------- API CALL --------------------------- */
  const fetchUsers = useCallback(
    async (override = {}) => {
      const params = {
        page: override.page ?? pageNumber,
        size: override.size ?? pageSize,
        sort: override.sort ?? sortValue,
        keyword: override.keyword ?? keywordApplied,
        role: override.role ?? roleFilter,
        active: override.active ?? activeFilter,
      };

      setIsLoading(true);
      setFetchError("");
      setErrorType("");

      // apiClient đã tự gắn base URL (`http://localhost:8088/api/v1`) + Authorization header.
      // Chỉ truyền path tương đối `/users?...` để tránh lặp `/api/v1/api/v1/...`.
      const query = new URLSearchParams();

      if (params.keyword) query.append("keyword", params.keyword);
      if (params.role && params.role !== "all") query.append("role", params.role);
      if (params.active === true || params.active === false) {
        query.append("active", String(params.active));
      }
      query.append("page", String(params.page));
      query.append("size", String(params.size));
      if (params.sort) query.append("sort", params.sort);

      const endpoint = `/users?${query.toString()}`;

      try {
        // apiClient.request trả về body đã parse; ApiResponse<T> có dạng { code, message, data, timestamp }
        const json = await apiClient.get(endpoint);
        const payload = json?.data !== undefined ? json.data : json;

        if (!payload) {
          throw new Error(json?.message || "Response rỗng từ máy chủ");
        }

        // Trường hợp 1: trả về Page object đầy đủ
        if (Array.isArray(payload.content)) {
          setPageData(payload);
          setIsFallback(false);
        }
        // Trường hợp 2: trả về mảng thuần (không phân trang)
        else if (Array.isArray(payload)) {
          const size = params.size || 20;
          setPageData({
            content: payload,
            totalElements: payload.length,
            totalPages: 1,
            size,
            number: 0,
            first: true,
            last: true,
            empty: payload.length === 0,
          });
          setIsFallback(false);
        }
        // Trường hợp 3: response không đúng schema → fallback mock
        else {
          throw new Error("Schema response không hợp lệ.");
        }
      } catch (err) {
        // Phân loại lỗi chi tiết để hiển thị banner phù hợp.
        // Lưu ý: lỗi SQL 5xx (như "function lower(bytea) does not exist")
        // thường có message chứa "JDBC" hoặc "SQL" hoặc "ERROR:" → phân loại là "server".
        const rawMsg = String(err?.message || "");
        let detectedType = "unknown";
        if (/Failed to fetch|NetworkError|TypeError/i.test(rawMsg)) {
          detectedType = "network";
        } else if (/401|Unauthorized|hết hạn|phiên/i.test(rawMsg)) {
          detectedType = "auth";
        } else if (/403|Forbidden/i.test(rawMsg)) {
          detectedType = "forbidden";
        } else if (
          /404|Not Found|static resource|api\/v1\/api/i.test(rawMsg)
        ) {
          detectedType = "notfound";
        } else if (
          /500|Internal Server|JDBC|SQL|ERROR:|function .* does not exist|bytea|cast/i.test(
            rawMsg
          )
        ) {
          detectedType = "server";
        }

        console.error(
          `[Admin Users] Lỗi khi gọi API [${detectedType}]:`,
          rawMsg
        );
        // KHÔNG dùng mock data: set content rỗng để chỉ hiện banner lỗi
        setPageData({
          content: [],
          totalElements: 0,
          totalPages: 0,
          size: params.size,
          number: 0,
          first: true,
          last: true,
          empty: true,
        });
        setIsFallback(true);
        setErrorType(detectedType);
        setFetchError(rawMsg || "Không thể kết nối tới máy chủ.");
      } finally {
        setIsLoading(false);
      }
    },
    [pageNumber, pageSize, sortValue, keywordApplied, roleFilter, activeFilter]
  );

  /* --------------------------- EFFECTS ----------------------------- */
  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) {
        fetchUsers();
      }
    });
    return () => {
      cancelled = true;
    };
  }, [fetchUsers]);

  // Debounce keyword input -> áp dụng sau 400ms
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPageNumber(0);
      setKeywordApplied(keywordInput.trim());
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [keywordInput]);

  /* ----------------------------------------------------------------
     LAYOUT FULL-SCREEN: Ép <main> của layout cha thành
     flex-col + overflow-hidden + padding p-0 để trang này
     có thể tự quản lý chiều cao 100% mà không bị cuộn toàn trang.
     Cleanup khi unmount để không ảnh hưởng các trang admin khác.
     ---------------------------------------------------------------- */
  useEffect(() => {
    const main = document.querySelector("main");
    const wrapper = main?.firstElementChild;
    if (!main) return undefined;

    const prevMainClass = main.className;
    const prevWrapperClass = wrapper ? wrapper.className : "";
    const prevMainStyle = main.getAttribute("style") || "";

    main.className =
      "flex-1 w-full h-full overflow-hidden bg-slate-50";
    if (wrapper) {
      wrapper.className = "h-full w-full flex flex-col p-4 overflow-hidden";
    }

    return () => {
      main.className = prevMainClass;
      if (wrapper) wrapper.className = prevWrapperClass;
      if (prevMainStyle) main.setAttribute("style", prevMainStyle);
      else main.removeAttribute("style");
    };
  }, []);

  /* --------------------------- HANDLERS --------------------------- */
  const handleRefresh = () => {
    fetchUsers();
    showToast("Đang làm mới danh sách người dùng…", "info");
  };

  const handleRoleFilterChange = (role) => {
    setRoleFilter(role);
    setPageNumber(0);
  };

  const handleActiveFilterChange = (value) => {
    setActiveFilter(value);
    setPageNumber(0);
  };

  const handleSortChange = (value) => {
    setSortValue(value);
    setPageNumber(0);
  };

  const handleSizeChange = (value) => {
    setPageSize(Number(value));
    setPageNumber(0);
  };

  const handleResetFilters = () => {
    setRoleFilter("all");
    setActiveFilter("all");
    setSortValue("id,ASC");
    setKeywordInput("");
    setKeywordApplied("");
    setPageNumber(0);
    showToast("Đã đặt lại toàn bộ bộ lọc.", "info");
  };

  const handleClearKeyword = () => {
    setKeywordInput("");
    setKeywordApplied("");
    setPageNumber(0);
  };

  const handlePageChange = (nextPage) => {
    if (nextPage < 0 || nextPage >= pageData.totalPages) return;
    setPageNumber(nextPage);
  };

  const handleExportCSV = () => {
    const rows = Array.isArray(pageData.content) ? pageData.content : [];
    if (rows.length === 0) {
      showToast("Không có dữ liệu để xuất Excel.", "error");
      return;
    }

    const headers = [
      "ID",
      "Email",
      "Họ và tên",
      "Số điện thoại",
      "Vai trò",
      "Trạng thái",
      "Ngày tạo",
      "Ngày cập nhật",
    ];

    const escape = (val) => {
      const str = val === null || val === undefined ? "" : String(val);
      if (/[",\n]/.test(str)) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const csvLines = [
      headers.join(","),
      ...rows.map((u) =>
        [
          u.id,
          u.email,
          u.fullName,
          u.phone,
          ROLE_LABELS[u.role] || u.role,
          u.active ? "Đang hoạt động" : "Đã khóa",
          formatDateTime(u.createdAt),
          formatDateTime(u.updatedAt),
        ]
          .map(escape)
          .join(",")
      ),
    ];

    const blob = new Blob(["\uFEFF" + csvLines.join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const stamp = new Date()
      .toISOString()
      .replace(/[:.]/g, "-")
      .slice(0, 19);
    link.download = `journeygo-users-${stamp}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast(`Đã xuất ${rows.length} tài khoản ra Excel.`, "success");
  };

  /* ----------------------------------------------------------------
     MUTATION: cập nhật role của 1 user
     PATCH /api/v1/users/{id}/role  body: { role }
     ---------------------------------------------------------------- */
  const handleChangeRole = useCallback(
    async (user, nextRole) => {
      if (!user || !nextRole || user.role === nextRole) return;
      setMutatingId(user.id);
      setMutatingAction((prev) => ({ ...prev, [user.id]: "role" }));
      try {
        const json = await apiClient.patch(
          `/users/${user.id}/role`,
          { role: nextRole }
        );
        const updated = json?.data || json;
        // Cập nhật row trong state ngay để UX mượt, không cần refetch
        setPageData((prev) => {
          const list = Array.isArray(prev.content) ? prev.content : [];
          return {
            ...prev,
            content: list.map((u) =>
              u.id === user.id ? { ...u, ...updated } : u
            ),
          };
        });
        // Đồng bộ lại modal chi tiết / modal edit nếu đang mở
        if (detailUser?.id === user.id) {
          setDetailUser((prev) => ({ ...prev, ...updated }));
        }
        if (editUser?.id === user.id) {
          setEditUser((prev) => ({ ...prev, ...updated }));
        }
        showToast(
          `Đã chuyển ${user.fullName || user.email} sang vai trò ${
            ROLE_LABELS[nextRole] || nextRole
          }.`,
          "success"
        );
      } catch (err) {
        console.error("[Admin Users] Lỗi đổi role:", err);
        showToast(
          `Không thể đổi vai trò: ${
            err?.message || "Lỗi không xác định"
          }`,
          "error"
        );
      } finally {
        setMutatingId(null);
        setMutatingAction((prev) => {
          const next = { ...prev };
          delete next[user.id];
          return next;
        });
      }
    },
    [detailUser, editUser, showToast]
  );

  /* ----------------------------------------------------------------
     MUTATION: cập nhật trạng thái active của 1 user
     POST /api/v1/users/{id}/activate     (kích hoạt)
     POST /api/v1/users/{id}/deactivate   (khóa)
     ---------------------------------------------------------------- */
  const handleToggleActive = useCallback(
    async (user, nextActive) => {
      if (!user || typeof nextActive !== "boolean") return;
      if (user.active === nextActive) return;
      setMutatingId(user.id);
      setMutatingAction((prev) => ({ ...prev, [user.id]: "status" }));
      try {
        const endpoint = nextActive
          ? `/users/${user.id}/activate`
          : `/users/${user.id}/deactivate`;
        const json = await apiClient.post(endpoint, {});
        const updated = json?.data || json;
        setPageData((prev) => {
          const list = Array.isArray(prev.content) ? prev.content : [];
          // Hợp nhất: nếu response trả về thiếu `active` thì tự set theo nextActive
          return {
            ...prev,
            content: list.map((u) =>
              u.id === user.id
                ? { ...u, ...updated, active: nextActive }
                : u
            ),
          };
        });
        if (detailUser?.id === user.id) {
          setDetailUser((prev) => ({
            ...prev,
            ...updated,
            active: nextActive,
          }));
        }
        if (editUser?.id === user.id) {
          setEditUser((prev) => ({
            ...prev,
            ...updated,
            active: nextActive,
          }));
        }
        showToast(
          nextActive
            ? `Đã mở khóa tài khoản ${user.fullName || user.email}.`
            : `Đã khóa tài khoản ${user.fullName || user.email}.`,
          nextActive ? "success" : "info"
        );
      } catch (err) {
        console.error("[Admin Users] Lỗi đổi trạng thái:", err);
        showToast(
          `Không thể đổi trạng thái: ${
            err?.message || "Lỗi không xác định"
          }`,
          "error"
        );
      } finally {
        setMutatingId(null);
        setMutatingAction((prev) => {
          const next = { ...prev };
          delete next[user.id];
          return next;
        });
      }
    },
    [detailUser, editUser, showToast]
  );

  /* ----------------------------------------------------------------
     MUTATION: cập nhật thông tin user (fullName, phone, role)
     PUT /api/v1/users/{id}                 (chỉ thông tin cá nhân + role)
     POST /api/v1/users/{id}/activate       (nếu active: true)
     POST /api/v1/users/{id}/deactivate     (nếu active: false)
     ---------------------------------------------------------------- */
  const handleSaveUser = useCallback(
    async (user, payload) => {
      if (!user || !payload) return false;
      setMutatingId(user.id);
      setMutatingAction((prev) => ({ ...prev, [user.id]: "save" }));
      try {
        // 1) Tách field `active` — không gửi cùng PUT thông tin
        const { active: nextActive, ...profilePayload } = payload;
        const activeChanged =
          typeof nextActive === "boolean" &&
          Boolean(nextActive) !== Boolean(user.active);

        // 2) PUT thông tin (nếu có gì đó để update)
        const hasProfileChange =
          profilePayload.fullName !== undefined ||
          profilePayload.phone !== undefined ||
          profilePayload.role !== undefined ||
          profilePayload.avatarUrl !== undefined ||
          profilePayload.avatar !== undefined;
        let updated = user;
        if (hasProfileChange) {
          const json = await apiClient.put(
            `/users/${user.id}`,
            profilePayload
          );
          updated = json?.data || json || updated;
        }

        // 3) Nếu trạng thái đổi, gọi đúng endpoint activate / deactivate
        if (activeChanged) {
          const endpoint = nextActive
            ? `/users/${user.id}/activate`
            : `/users/${user.id}/deactivate`;
          const json = await apiClient.post(endpoint, {});
          const statusRes = json?.data || json;
          updated = { ...updated, ...statusRes, active: Boolean(nextActive) };
        }

        // 4) Đồng bộ state UI
        setPageData((prev) => {
          const list = Array.isArray(prev.content) ? prev.content : [];
          return {
            ...prev,
            content: list.map((u) =>
              u.id === user.id ? { ...u, ...updated } : u
            ),
          };
        });
        if (detailUser?.id === user.id) {
          setDetailUser((prev) => ({ ...prev, ...updated }));
        }
        setEditUser((prev) => ({ ...prev, ...updated }));
        showToast(
          `Đã lưu thay đổi cho ${updated.fullName || user.email}.`,
          "success"
        );
        return true;
      } catch (err) {
        console.error("[Admin Users] Lỗi cập nhật user:", err);
        showToast(
          `Không thể lưu thay đổi: ${
            err?.message || "Lỗi không xác định"
          }`,
          "error"
        );
        return false;
      } finally {
        setMutatingId(null);
        setMutatingAction((prev) => {
          const next = { ...prev };
          delete next[user.id];
          return next;
        });
      }
    },
    [detailUser, showToast]
  );

  /* ----------------------------------------------------------------
     MUTATION: tạo người dùng mới
     POST /api/v1/users  body: { email, password, fullName, phone, role, active }
     ---------------------------------------------------------------- */
  const handleCreateUser = useCallback(
    async (payload) => {
      setIsCreating(true);
      try {
        const json = await apiClient.post("/users", payload);
        const created = json?.data || json;
        showToast(
          `Đã tạo thành công người dùng ${
            created?.fullName || payload.fullName
          } (${payload.email}).`,
          "success"
        );
        setCreateOpen(false);
        setPageNumber(0);
        fetchUsers({ page: 0 });
        return true;
      } catch (err) {
        console.error("[Admin Users] Lỗi tạo user:", err);
        showToast(
          `Không thể tạo người dùng: ${err?.message || "Lỗi không xác định"}`,
          "error"
        );
        return false;
      } finally {
        setIsCreating(false);
      }
    },
    [fetchUsers, showToast]
  );

  /* =========================================================================
     RENDER
     ========================================================================= */

  const toastPalette = {
    success: "bg-emerald-900 border-emerald-600 text-white",
    error: "bg-rose-900 border-rose-600 text-white",
    info: "bg-slate-900 border-slate-700 text-white",
  };

  const content = Array.isArray(pageData.content) ? pageData.content : [];
  const isEmpty = pageData.empty === true || content.length === 0;

  return (
    <div className="h-full w-full flex flex-col overflow-hidden">
      {/* ============================================================
          TOAST
          ============================================================ */}
      {toast.visible && (
        <div
          className={`fixed top-5 right-5 z-50 ${toastPalette[toast.tone]} px-4 py-3 rounded-xl shadow-xl border text-xs font-bold flex items-center gap-2.5 animate-in slide-in-from-top-3 max-w-md`}
        >
          {toast.tone === "success" ? (
            <CheckCircle2 size={16} className="text-emerald-300 shrink-0" />
          ) : toast.tone === "error" ? (
            <AlertCircle size={16} className="text-rose-300 shrink-0" />
          ) : (
            <Sparkles size={16} className="text-sky-300 shrink-0" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* ============================================================
          TẦNG 1: HEADER + NÚT TIỆN ÍCH (shrink-0, không cuộn)
          ============================================================ */}
      <div className="shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Quản lý Người dùng &amp; Phân quyền
          </h1>
          {isFallback && (
            <p className="text-xs text-rose-700 font-bold mt-1">
              Chưa kết nối được backend. Vui lòng kiểm tra server / đăng nhập /
              quyền truy cập rồi bấm Thử lại.
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isLoading}
            className="h-9 px-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-60"
          >
            <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
            <span className="hidden sm:inline">Làm mới</span>
          </button>
          <button
            type="button"
            onClick={() => setRoleManagerOpen(true)}
            className="h-9 px-3.5 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-bold rounded-xl flex items-center gap-1.5 shadow-sm shadow-indigo-900/20 text-xs transition-all cursor-pointer"
            title="Xem danh mục vai trò hệ thống và tạo vai trò mới (Dành cho ADMIN)"
          >
            <ShieldCheck size={14} strokeWidth={2.4} />
            <span>Quản lý Vai trò</span>
          </button>
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="h-9 px-3.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold rounded-xl flex items-center gap-1.5 shadow-sm shadow-emerald-900/20 text-xs transition-all cursor-pointer"
          >
            <UserPlus size={14} strokeWidth={2.4} />
            <span>Thêm người dùng mới</span>
          </button>
          <button
            type="button"
            onClick={handleExportCSV}
            className="h-9 px-3.5 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-bold rounded-xl flex items-center gap-1.5 shadow-sm shadow-rose-600/20 text-xs transition-all cursor-pointer"
          >
            <Download size={14} strokeWidth={2.4} />
            <span>Xuất file Excel</span>
          </button>
        </div>
      </div>

      {/* ============================================================
          THÔNG BÁO FALLBACK (PHÂN LOẠI LỖI CHI TIẾT)
          ============================================================ */}
      {isFallback && fetchError && (
        <div className="shrink-0 mt-4">
          <FallbackBanner
            errorType={errorType}
            message={fetchError}
            apiBaseUrl={API_BASE_URL_DISPLAY}
            onRetry={handleRefresh}
          />
        </div>
      )}

      {/* ============================================================
          TẦNG 2: 4 THẺ KPI TƯƠNG TÁC NHANH (shrink-0, không cuộn)
          ============================================================ */}
      <section className="shrink-0 grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 mt-4">
        <KpiCard
          title="Tổng tài khoản hệ thống"
          count={pageData.totalElements}
          unit="tài khoản"
          icon={Users}
          iconClass="text-slate-700 bg-slate-100"
          interactive={false}
        />
        <KpiCard
          title="Đối tác Điểm đến"
          count={roleStats.providers}
          unit="đối tác"
          icon={Building2}
          iconClass="text-emerald-600 bg-emerald-50"
          interactive={false}
        />
        <KpiCard
          title="Kiểm duyệt viên"
          count={roleStats.moderators}
          unit="kiểm duyệt viên"
          icon={ShieldCheck}
          iconClass="text-indigo-600 bg-indigo-50"
          interactive={false}
        />
        <KpiCard
          title="Du khách"
          count={roleStats.users}
          unit="khách du lịch"
          icon={Compass}
          iconClass="text-sky-600 bg-sky-50"
          interactive={false}
        />
      </section>

      {/* ============================================================
          TẦNG 3: KHUNG LÀM VIỆC HỢP NHẤT
          - flex-1 min-h-0: chiếm phần còn lại
          - flex flex-col: xếp dọc 3 vùng (filter / table / pagination)
          - overflow-hidden: không cuộn ở khung ngoài
          ============================================================ */}
      <div className="flex-1 min-h-0 mt-4 flex flex-col bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden">
        {/* ---- THANH CÔNG CỤ LỌC (shrink-0, không cuộn) ---- */}
        <div className="shrink-0 p-4 border-b border-slate-100 bg-slate-50/50 space-y-3">
          {/* Hàng 1: Segmented Tabs lọc nhanh theo role */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => handleRoleFilterChange("all")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                roleFilter === "all"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200/80"
              }`}
            >
              Tất cả vai trò
            </button>
            <button
              type="button"
              onClick={() => handleRoleFilterChange(ROLES.TOURIST)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                roleFilter === ROLES.TOURIST
                  ? "bg-sky-600 text-white shadow-xs"
                  : "bg-sky-50 text-sky-800 hover:bg-sky-100 border border-sky-200"
              }`}
            >
              <Compass size={13} />
              <span>Du khách</span>
            </button>
            <button
              type="button"
              onClick={() => handleRoleFilterChange(ROLES.PROVIDER)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                roleFilter === ROLES.PROVIDER
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200"
              }`}
            >
              <Building2 size={13} />
              <span>Đối tác</span>
            </button>
            <button
              type="button"
              onClick={() => handleRoleFilterChange(ROLES.MODERATOR)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                roleFilter === ROLES.MODERATOR
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "bg-indigo-50 text-indigo-800 hover:bg-indigo-100 border border-indigo-200"
              }`}
            >
              <ShieldCheck size={13} />
              <span>Kiểm duyệt</span>
            </button>
            <button
              type="button"
              onClick={() => handleRoleFilterChange(ROLES.ADMIN)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                roleFilter === ROLES.ADMIN
                  ? "bg-rose-600 text-white shadow-xs"
                  : "bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-200"
              }`}
            >
              <Users size={13} />
              <span>Quản trị</span>
            </button>
          </div>

          {/* Hàng 2: Search + Filter + Sort + Reset */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5">
            {/* Keyword */}
            <div className="md:col-span-5 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Search size={14} />
              </div>
              <input
                type="text"
                value={keywordInput}
                onChange={(e) => setKeywordInput(e.target.value)}
                placeholder="Tìm theo họ tên, email, số điện thoại..."
                className="w-full pl-9 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-500/20 focus:border-slate-700 transition-all"
              />
              {keywordInput && (
                <button
                  type="button"
                  onClick={handleClearKeyword}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                  title="Xóa từ khóa"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Active filter */}
            <div className="md:col-span-3">
              <select
                value={activeFilter}
                onChange={(e) => handleActiveFilterChange(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-500/20"
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="true">● Đang hoạt động</option>
                <option value="false">● Đã khóa / Ngưng</option>
              </select>
            </div>

            {/* Sort */}
            <div className="md:col-span-3">
              <select
                value={sortValue}
                onChange={(e) => handleSortChange(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-500/20"
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Reset */}
            <div className="md:col-span-1">
              <button
                type="button"
                onClick={handleResetFilters}
                disabled={activeFiltersCount === 0}
                className="w-full px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1"
                title="Đặt lại bộ lọc"
              >
                <RotateCcw size={13} />
                <span className="hidden lg:inline">Đặt lại</span>
              </button>
            </div>
          </div>
        </div>

        {/* ---- VÙNG CHỨA BẢNG (cuộn độc lập, thead sticky) ---- */}
        <div className="flex-1 min-h-0 w-full overflow-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 z-10">
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600">
                <th className="py-3.5 px-4 whitespace-nowrap">Định danh &amp; Thành viên</th>
                <th className="py-3.5 px-3 whitespace-nowrap">Liên hệ</th>
                <th className="py-3.5 px-3 whitespace-nowrap">Vai trò</th>
                <th className="py-3.5 px-3 whitespace-nowrap">Trạng thái</th>
                <th className="py-3.5 px-3 whitespace-nowrap">Ngày tạo / Cập nhật</th>
                <th className="py-3.5 px-4 text-left whitespace-nowrap">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <SkeletonRows />
              ) : isEmpty ? (
                <EmptyState
                  hasFilter={activeFiltersCount > 0}
                  onReset={handleResetFilters}
                  isFallback={isFallback}
                />
              ) : (
                content.map((u) => (
                  <UserRow
                    key={u.id}
                    user={u}
                    isMutating={mutatingId === u.id}
                    mutatingAction={mutatingAction[u.id]}
                    onView={() => setDetailUser(u)}
                    onEdit={() => setEditUser({ ...u })}
                    onChangeRole={(nextRole) => handleChangeRole(u, nextRole)}
                    onToggleActive={(nextActive) =>
                      handleToggleActive(u, nextActive)
                    }
                  />
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ---- THANH PHÂN TRANG (shrink-0, cố định ở đáy) ---- */}
        <div className="shrink-0 border-t border-slate-100 bg-white">
          <PaginationBar
            pageData={pageData}
            pageNumber={pageNumber}
            pageSize={pageSize}
            onPageChange={handlePageChange}
            onSizeChange={handleSizeChange}
          />
        </div>
      </div>

      {/* ============================================================
          MODAL CHI TIẾT NGƯỜI DÙNG
          ============================================================ */}
      {detailUser && (
        <DetailModal
          user={detailUser}
          onClose={() => setDetailUser(null)}
          onEdit={() => {
            setEditUser({ ...detailUser });
            setDetailUser(null);
          }}
          isMutating={mutatingId === detailUser.id}
          mutatingAction={mutatingAction[detailUser.id]}
          onChangeRole={(nextRole) => handleChangeRole(detailUser, nextRole)}
          onToggleActive={(nextActive) =>
            handleToggleActive(detailUser, nextActive)
          }
        />
      )}

      {editUser && (
        <EditModal
          user={editUser}
          isMutating={mutatingId === editUser.id}
          onClose={() => setEditUser(null)}
          onSave={async (payload) => {
            const ok = await handleSaveUser(editUser, payload);
            if (ok) {
              // Đóng modal sau 600ms để user kịp đọc toast
              setTimeout(() => setEditUser(null), 600);
            }
            return ok;
          }}
        />
      )}

      {createOpen && (
        <CreateModal
          isSubmitting={isCreating}
          onClose={() => !isCreating && setCreateOpen(false)}
          onCreate={handleCreateUser}
        />
      )}

      {/* Role Management Modal (Dành riêng cho ADMIN) */}
      <RoleManagerModal
        isOpen={roleManagerOpen}
        onClose={() => setRoleManagerOpen(false)}
        onRoleCreated={(newRole) => {
          showToast(`Đã tạo thành công vai trò "${newRole.name}"!`, "success");
        }}
      />
    </div>
  );
}

/* =========================================================================
   SUB-COMPONENT: KpiCard
   ========================================================================= */

function KpiCard({
  title,
  count,
  unit,
  subtitle,
  icon: Icon,
  iconClass,
  borderClass,
  active,
  onClick,
  interactive = true,
}) {
  const interactiveClass = interactive
    ? "text-left cursor-pointer hover:shadow-sm transition-all"
    : "text-left cursor-default";

  return (
    <div
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      onClick={interactive ? onClick : undefined}
      onKeyDown={
        interactive
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick?.();
              }
            }
          : undefined
      }
      className={`bg-white rounded-xl p-3 border border-slate-200 shadow-xs ${interactiveClass} ${
        interactive && active ? "ring-2 ring-slate-300/80" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-bold text-slate-600 mb-1 truncate">
            {title}
          </p>
          <div className="flex items-baseline gap-1">
            <span className="text-lg font-bold text-slate-900 tabular-nums">
              {(count ?? 0).toLocaleString("vi-VN")}
            </span>
            <span className="text-[11px] font-bold text-slate-600">{unit}</span>
          </div>
          {subtitle && (
            <p className="text-[11px] text-slate-400 mt-0.5 truncate">
              {subtitle}
            </p>
          )}
        </div>
        <div
          className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${iconClass}`}
        >
          <Icon size={14} strokeWidth={2.2} />
        </div>
      </div>
    </div>
  );
}

/* =========================================================================
   SUB-COMPONENT: UserRow
   ========================================================================= */

function UserRow({
  user,
  onView,
  onEdit,
  onChangeRole,
  onToggleActive,
  isMutating = false,
  mutatingAction = null,
}) {
  const [avatarError, setAvatarError] = useState(false);
  const avatarSrc = user.avatarUrl || user.avatar;
  const showAvatar =
    Boolean(avatarSrc) &&
    (avatarSrc.startsWith("data:") ||
      avatarSrc.startsWith("/") ||
      /^https?:\/\//i.test(avatarSrc)) &&
    !avatarError;

  const rowDisabled = isMutating;

  return (
    <tr
      className={`hover:bg-slate-50/70 transition-colors ${
        rowDisabled ? "opacity-60" : ""
      }`}
    >
      {/* Cột 1 - Định danh & Thành viên */}
      <td className="py-3.5 px-4 whitespace-nowrap">
        <div className="flex items-center gap-3">
          <div className="relative w-10 h-10 rounded-xl overflow-hidden shrink-0">
            {showAvatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarSrc}
                alt={user.fullName}
                onError={() => setAvatarError(true)}
                className="w-full h-full object-cover"
              />
            ) : (
              <div
                className={`w-full h-full flex items-center justify-center font-bold text-xs ${
                  ROLE_AVATAR_BG[user.role] ||
                  "bg-slate-100 text-slate-700"
                }`}
              >
                {getInitials(user.fullName)}
              </div>
            )}
          </div>
          <div className="min-w-0">
            <p className="font-bold text-sm text-slate-900 truncate max-w-[220px]">
              {user.fullName}
            </p>
            <p className="text-[11px] text-slate-600 tabular-nums mt-0.5 truncate max-w-[220px]">
              {user.email}
            </p>
          </div>
        </div>
      </td>

      {/* Cột 2 - Liên hệ */}
      <td className="py-3.5 px-3 whitespace-nowrap">
        {user.phone ? (
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700">
            <Phone size={11} className="text-slate-400" />
            {user.phone}
          </span>
        ) : (
          <span className="text-[11px] italic text-slate-400">
            Chưa cập nhật
          </span>
        )}
      </td>

      {/* Cột 3 - Vai trò (chỉ hiển thị, chỉnh sửa qua nút Sửa) */}
      <td className="py-3.5 px-3 whitespace-nowrap">
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
            ROLE_BADGE_CLASS[user.role] ||
            "bg-slate-100 text-slate-700 border-slate-200"
          }`}
        >
          {ROLE_LABELS[user.role] || user.role}
        </span>
      </td>

      {/* Cột 4 - Trạng thái (chỉ hiển thị, chỉnh sửa qua nút Sửa) */}
      <td className="py-3.5 px-3 whitespace-nowrap">
        {user.active ? (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Đang hoạt động
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            Đã khóa
          </span>
        )}
      </td>

      {/* Cột 5 - Ngày tạo / Cập nhật */}
      <td className="py-3.5 px-3 whitespace-nowrap">
        <div className="flex flex-col gap-0.5 text-[11px]">
          <span className="text-slate-700 tabular-nums inline-flex items-center gap-1">
            <Calendar size={10} className="text-slate-400" />
            {formatDateTime(user.createdAt)}
          </span>
          <span className="text-slate-400 tabular-nums text-[11px]">
            ↻ {formatDateTime(user.updatedAt)}
          </span>
        </div>
      </td>

      {/* Cột 6 - Thao tác */}
      <td className="py-3.5 px-4 text-left whitespace-nowrap">
        <div className="inline-flex items-center gap-1">
          <button
            type="button"
            onClick={onEdit}
            disabled={rowDisabled}
            className="px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-bold text-[11px] transition-colors cursor-pointer inline-flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Chỉnh sửa thông tin, vai trò và trạng thái"
          >
            <Pencil size={12} />
            Sửa
          </button>
          <button
            type="button"
            onClick={onView}
            disabled={rowDisabled}
            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] transition-colors cursor-pointer inline-flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Xem chi tiết"
          >
            <Eye size={12} />
            Chi tiết
          </button>
        </div>
      </td>
    </tr>
  );
}

/* =========================================================================
   SUB-COMPONENT: SkeletonRows (Trạng thái Loading)
   ========================================================================= */

function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 6 }).map((_, idx) => (
        <tr key={`skeleton-${idx}`} className="border-b border-slate-100">
          <td className="py-3.5 px-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-100 animate-pulse" />
              <div className="space-y-1.5">
                <div className="h-3 w-32 bg-slate-100 rounded animate-pulse" />
                <div className="h-2.5 w-40 bg-slate-100 rounded animate-pulse" />
              </div>
            </div>
          </td>
          <td className="py-3.5 px-3">
            <div className="h-3 w-24 bg-slate-100 rounded animate-pulse" />
          </td>
          <td className="py-3.5 px-3">
            <div className="h-5 w-20 bg-slate-100 rounded-full animate-pulse" />
          </td>
          <td className="py-3.5 px-3">
            <div className="h-5 w-16 bg-slate-100 rounded-full animate-pulse" />
          </td>
          <td className="py-3.5 px-3">
            <div className="h-3 w-28 bg-slate-100 rounded animate-pulse" />
            <div className="h-2.5 w-24 bg-slate-100 rounded animate-pulse mt-1" />
          </td>
          <td className="py-3.5 px-4 text-right">
            <div className="h-7 w-16 bg-slate-100 rounded-lg animate-pulse ml-auto" />
          </td>
        </tr>
      ))}
    </>
  );
}

/* =========================================================================
   SUB-COMPONENT: EmptyState (Trạng thái Trống)
   ========================================================================= */

function EmptyState({ hasFilter, onReset, isFallback }) {
  if (isFallback) {
    return (
      <tr>
        <td colSpan={6} className="py-20 text-center">
          <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-full mx-auto flex items-center justify-center">
            <AlertCircle size={32} />
          </div>
          <h3 className="text-base font-bold text-slate-800 mt-3">
            Không thể tải danh sách người dùng
          </h3>
          <p className="text-xs text-slate-600 mt-1.5 max-w-lg mx-auto">
            Hệ thống <strong className="text-rose-700">chưa kết nối được backend</strong>.
            Vui lòng kiểm tra lại máy chủ Spring Boot, quyền truy cập và
            đăng nhập bằng tài khoản <code className="tabular-nums bg-slate-100 px-1.5 py-0.5 rounded">ADMIN</code>{" "}
            — xem hướng dẫn chi tiết ở banner bên trên.
          </p>
        </td>
      </tr>
    );
  }
  return (
    <tr>
      <td colSpan={6} className="py-16 text-center">
        <div className="w-14 h-14 bg-slate-100 text-slate-400 rounded-full mx-auto flex items-center justify-center">
          <Inbox size={28} />
        </div>
        <h3 className="text-base font-bold text-slate-800 mt-3">
          Không có tài khoản nào phù hợp
        </h3>
        <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
          {hasFilter
            ? "Không tìm thấy kết quả với bộ lọc hiện tại. Hãy thử đặt lại bộ lọc để xem toàn bộ danh sách."
            : "Hệ thống chưa có tài khoản nào. Dữ liệu sẽ xuất hiện khi có người dùng đăng ký."}
        </p>
        {hasFilter && (
          <button
            type="button"
            onClick={onReset}
            className="mt-4 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw size={13} />
            Xóa bộ lọc tìm kiếm
          </button>
        )}
      </td>
    </tr>
  );
}

/* =========================================================================
   SUB-COMPONENT: PaginationBar
   ========================================================================= */

function PaginationBar({
  pageData,
  pageNumber,
  pageSize,
  onPageChange,
  onSizeChange,
}) {
  const totalPages = Math.max(pageData.totalPages || 0, 1);
  const currentPage = (pageData.number ?? pageNumber) + 1;
  const totalElements = pageData.totalElements || 0;

  // Tính danh sách số trang hiển thị (tối đa 5 nút quanh trang hiện tại)
  const visiblePageNumbers = useMemo(() => {
    const total = totalPages;
    const curr = currentPage;
    if (total <= 5) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }
    const start = Math.max(1, curr - 2);
    const end = Math.min(total, curr + 2);
    const pages = [];
    for (let p = start; p <= end; p += 1) pages.push(p);
    if (start > 1) {
      pages.unshift(1);
      if (start > 2) pages.splice(1, 0, "...");
    }
    if (end < total) {
      if (end < total - 1) pages.push("...");
      pages.push(total);
    }
    return pages;
  }, [totalPages, currentPage]);

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 sm:px-5 py-3.5 bg-slate-50/60 border-t border-slate-100">
      {/* Bên trái: Thông tin + chọn size */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
        <span className="text-xs text-slate-600 font-bold">
          Đang xem trang{" "}
          <strong className="text-slate-900">{currentPage}</strong> /{" "}
          <strong className="text-slate-900">{totalPages}</strong>{" "}
          <span className="text-slate-400">
            (Tổng{" "}
            <strong className="text-slate-700">
              {totalElements.toLocaleString("vi-VN")}
            </strong>{" "}
            tài khoản)
          </span>
        </span>
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-slate-600 font-bold">
            Số dòng/trang:
          </span>
          <select
            value={pageSize}
            onChange={(e) => onSizeChange(e.target.value)}
            className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-[11px] font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-500/20"
          >
            {SIZE_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Bên phải: Nút điều hướng */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPageChange(0)}
          disabled={pageData.first}
          className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          title="Trang đầu"
        >
          <ChevronsLeft size={14} />
        </button>
        <button
          type="button"
          onClick={() => onPageChange(pageNumber - 1)}
          disabled={pageData.first}
          className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          title="Trang trước"
        >
          <ChevronLeft size={14} />
        </button>
        {visiblePageNumbers.map((p, idx) =>
          p === "..." ? (
            <span
              key={`dots-${idx}`}
              className="px-2 text-xs text-slate-400 font-bold select-none"
            >
              …
            </span>
          ) : (
            <button
              key={`page-${p}`}
              type="button"
              onClick={() => onPageChange(Number(p) - 1)}
              className={`min-w-[32px] h-7 px-2 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                p === currentPage
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
              }`}
            >
              {p}
            </button>
          )
        )}
        <button
          type="button"
          onClick={() => onPageChange(pageNumber + 1)}
          disabled={pageData.last}
          className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          title="Trang sau"
        >
          <ChevronRight size={14} />
        </button>
        <button
          type="button"
          onClick={() => onPageChange(totalPages - 1)}
          disabled={pageData.last}
          className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          title="Trang cuối"
        >
          <ChevronsRight size={14} />
        </button>
      </div>
    </div>
  );
}

/* =========================================================================
   SUB-COMPONENT: DetailModal
   ========================================================================= */

function DetailModal({
  user,
  onClose,
  onEdit,
  onChangeRole,
  onToggleActive,
  isMutating = false,
  mutatingAction = null,
}) {
  const roleBusy = isMutating && mutatingAction === "role";
  const detailAvatarSrc = user.avatarUrl || user.avatar;
  const showDetailAvatar =
    Boolean(detailAvatarSrc) &&
    (detailAvatarSrc.startsWith("data:") ||
      detailAvatarSrc.startsWith("/") ||
      /^https?:\/\//i.test(detailAvatarSrc));

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/60 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="relative w-14 h-14 rounded-xl overflow-hidden shrink-0">
              {showDetailAvatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={detailAvatarSrc}
                  alt={user.fullName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div
                  className={`w-full h-full flex items-center justify-center font-bold text-base ${
                    ROLE_AVATAR_BG[user.role] ||
                    "bg-slate-100 text-slate-700"
                  }`}
                >
                  {getInitials(user.fullName)}
                </div>
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="tabular-nums text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                  #{user.id}
                </span>
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                    ROLE_BADGE_CLASS[user.role] ||
                    "bg-slate-100 text-slate-700 border-slate-200"
                  }`}
                >
                  {ROLE_LABELS[user.role] || user.role}
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 truncate">
                {user.fullName}
              </h3>
              <p className="text-xs text-slate-600 mt-0.5 inline-flex items-center gap-1">
                <Mail size={11} className="text-slate-400" />
                {user.email}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white hover:bg-slate-100 text-slate-600 flex items-center justify-center transition-colors cursor-pointer border border-slate-200 shrink-0"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <DetailRow label="Mã định danh" value={`#${user.id}`} mono />
          <DetailRow
            label="Số điện thoại"
            value={user.phone || "Chưa cập nhật"}
            icon={Phone}
            muted={!user.phone}
          />

          {/* Vai trò — đổi nhanh (style đồng nhất, không tô màu) */}
          <div
            className={`p-3 rounded-xl border bg-white border-slate-200 ${
              roleBusy ? "opacity-60" : ""
            }`}
          >
            <p className="text-[11px] font-bold text-slate-600 mb-1.5 inline-flex items-center gap-1">
              <ShieldAlert size={10} className="text-slate-400" />
              Vai trò
            </p>
            <div className="flex items-center gap-2">
              <select
                value={user.role}
                disabled={isMutating}
                onChange={(e) => onChangeRole?.(e.target.value)}
                className="flex-1 appearance-none px-2.5 py-1.5 rounded-lg text-xs font-bold border border-slate-200 bg-white text-slate-800 cursor-pointer focus:outline-none focus:ring-2 focus:ring-slate-500/30 focus:border-slate-700 disabled:cursor-not-allowed"
              >
                {Object.values(ROLES).map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABELS[r] || r}
                  </option>
                ))}
              </select>
              {roleBusy && (
                <Loader2 size={14} className="animate-spin text-slate-600" />
              )}
            </div>
          </div>

          {/* Trạng thái — chỉ hiển thị, chỉnh sửa qua nút "Chỉnh sửa" */}
          <DetailRow
            label="Trạng thái"
            value={
              user.active ? (
                <span className="inline-flex items-center gap-1.5 text-emerald-700 font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Đang hoạt động
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-rose-700 font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                  Đã khóa
                </span>
              )
            }
          />

          <DetailRow
            label="Ngày tạo tài khoản"
            value={formatDateTime(user.createdAt)}
            icon={Calendar}
          />
          <DetailRow
            label="Cập nhật lần cuối"
            value={formatDateTime(user.updatedAt)}
            icon={Calendar}
          />
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/60 flex items-center justify-between gap-2.5">
          <p className="text-[11px] text-slate-600">
            Mọi thay đổi sẽ được ghi nhật ký phía máy chủ.
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onEdit}
              disabled={isMutating}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs transition-colors cursor-pointer inline-flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Pencil size={12} />
              Chỉnh sửa
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs border border-slate-200 transition-colors cursor-pointer"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function EditModal({ user, onClose, onSave, isMutating = false }) {
  // Form state — khởi tạo từ user được truyền vào
  const [fullName, setFullName] = useState(user?.fullName || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [role, setRole] = useState(user?.role || ROLES.TOURIST);
  const [active, setActive] = useState(Boolean(user?.active));
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || user?.avatar || "");
  const [touched, setTouched] = useState(false);
  const editFileInputRef = useRef(null);
  const [avatarError, setAvatarError] = useState("");

  const handleAvatarFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setAvatarError("Vui lòng chọn tệp hình ảnh (JPG, PNG, WebP…).");
      return;
    }
    setAvatarError("");
    const reader = new FileReader();
    reader.onload = (evt) => {
      if (typeof evt.target?.result === "string") {
        setAvatarUrl(evt.target.result);
      }
    };
    reader.readAsDataURL(file);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "journeygo/avatars");
      const res = await apiClient.upload("/upload/image", formData);
      const cloudUrl = res?.data?.url || res?.data?.avatarUrl || res?.url;
      if (cloudUrl) {
        setAvatarUrl(cloudUrl);
      }
    } catch (err) {
      console.warn("[Cloudinary Upload] Chưa upload được qua API, tiếp tục dùng preview:", err?.message);
    } finally {
      e.target.value = "";
    }
  };

  // Reset khi user thay đổi (mở modal khác) — dùng derived state pattern.
  // Lưu id của user đang edit vào ref để so sánh; chỉ reset khi id thực sự đổi.
  const lastUserIdRef = useRef(user?.id);
  if (lastUserIdRef.current !== user?.id) {
    lastUserIdRef.current = user?.id;
    setFullName(user?.fullName || "");
    setPhone(user?.phone || "");
    setRole(user?.role || ROLES.TOURIST);
    setActive(Boolean(user?.active));
    setAvatarUrl(user?.avatarUrl || user?.avatar || "");
    setTouched(false);
  }

  const fullNameError =
    touched && !String(fullName).trim()
      ? "Họ tên không được để trống"
      : "";
  const phoneError =
    touched && phone && !/^[0-9+\-\s()]{6,20}$/.test(phone)
      ? "Số điện thoại không hợp lệ"
      : "";

  const dirty =
    String(fullName).trim() !== String(user?.fullName || "") ||
    String(phone || "") !== String(user?.phone || "") ||
    role !== user?.role ||
    Boolean(active) !== Boolean(user?.active) ||
    String(avatarUrl || "") !== String(user?.avatarUrl || user?.avatar || "");

  const canSubmit =
    !isMutating &&
    !fullNameError &&
    !phoneError &&
    String(fullName).trim().length > 0 &&
    dirty;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched(true);
    if (fullNameError || phoneError) return;
    const payload = {
      fullName: String(fullName).trim(),
      phone: String(phone || "").trim() || null,
      role,
      active: Boolean(active),
      avatarUrl: String(avatarUrl || "").trim() || null,
      avatar: String(avatarUrl || "").trim() || null,
    };
    await onSave?.(payload);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-xl bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/60 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
              <Pencil size={18} />
            </div>
            <div className="min-w-0">
              <h3 className="text-base sm:text-lg font-bold text-slate-900 truncate">
                Chỉnh sửa người dùng
              </h3>
              <p className="text-xs text-slate-600 mt-0.5">
                #{user?.id} · {user?.email}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isMutating}
            className="w-8 h-8 rounded-full bg-white hover:bg-slate-100 text-slate-600 flex items-center justify-center transition-colors cursor-pointer border border-slate-200 shrink-0 disabled:opacity-50"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {/* Họ tên */}
          <div>
            <label className="text-[11px] font-bold text-slate-600 mb-1.5 block">
              Họ và tên <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              onBlur={() => setTouched(true)}
              disabled={isMutating}
              placeholder="Nhập họ và tên đầy đủ"
              className={`w-full px-3 py-2 bg-white border rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 transition-all ${
                fullNameError
                  ? "border-rose-300 focus:ring-rose-500/20 focus:border-rose-500"
                  : "border-slate-200 focus:ring-slate-500/20 focus:border-slate-700"
              }`}
            />
            {fullNameError && (
              <p className="text-[11px] text-rose-600 font-bold mt-1">
                {fullNameError}
              </p>
            )}
          </div>

          {/* Số điện thoại */}
          <div>
            <label className="text-[11px] font-bold text-slate-600 mb-1.5 block">
              Số điện thoại
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              onBlur={() => setTouched(true)}
              disabled={isMutating}
              placeholder="VD: 0987654321"
              className={`w-full px-3 py-2 bg-white border rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 transition-all ${
                phoneError
                  ? "border-rose-300 focus:ring-rose-500/20 focus:border-rose-500"
                  : "border-slate-200 focus:ring-slate-500/20 focus:border-slate-700"
              }`}
            />
            {phoneError && (
              <p className="text-[11px] text-rose-600 font-bold mt-1">
                {phoneError}
              </p>
            )}
          </div>

          {/* Ảnh đại diện (Avatar) */}
          <div>
            <label className="text-[11px] font-bold text-slate-600 mb-1.5 block">
              Ảnh đại diện (Avatar)
            </label>
            <div className="flex items-center gap-3 mb-2">
              <div className="relative w-12 h-12 rounded-xl overflow-hidden shrink-0 border border-slate-200 bg-slate-100 flex items-center justify-center">
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={avatarUrl}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-xs font-bold text-slate-400">Trống</span>
                )}
              </div>
              <div className="flex-1 flex gap-2">
                <button
                  type="button"
                  onClick={() => editFileInputRef.current?.click()}
                  className="px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs inline-flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                >
                  <Upload size={13} />
                  <span>Tải ảnh file</span>
                </button>
                {avatarUrl && (
                  <button
                    type="button"
                    onClick={() => setAvatarUrl("")}
                    className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 border border-slate-200 text-xs font-bold transition-all cursor-pointer"
                  >
                    Xóa ảnh
                  </button>
                )}
              </div>
              <input
                ref={editFileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarFile}
                className="hidden"
              />
              {avatarError && <p className="mt-1.5 text-xs text-rose-600">{avatarError}</p>}
            </div>
          </div>

          {/* Vai trò + Trạng thái */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] font-bold text-slate-600 mb-1.5 block">
                Vai trò
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                disabled={isMutating}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-500/20 focus:border-slate-700"
              >
                {Object.values(ROLES).map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABELS[r] || r}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-600 mb-1.5 block">
                Trạng thái
              </label>
              <button
                type="button"
                disabled={isMutating}
                onClick={() => setActive((v) => !v)}
                className={`w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold border transition-colors cursor-pointer disabled:cursor-not-allowed ${
                  active
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                    : "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100"
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    active ? "bg-emerald-500" : "bg-rose-500"
                  }`}
                />
                {active ? "Đang hoạt động" : "Đã khóa"}
              </button>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 leading-relaxed">
            <strong className="text-slate-700">Lưu ý:</strong> Email và mã
            định danh là bất biến. Mọi thay đổi sẽ được ghi nhật ký phía máy
            chủ.
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/60 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isMutating}
            className="px-4 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs border border-slate-200 transition-colors cursor-pointer disabled:opacity-50"
          >
            Hủy
          </button>
          <button
            type="submit"
            disabled={!canSubmit}
            className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-bold text-xs shadow-sm shadow-rose-600/20 transition-all cursor-pointer inline-flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isMutating ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <Save size={12} />
            )}
            {isMutating ? "Đang lưu…" : "Lưu thay đổi"}
          </button>
        </div>
      </form>
    </div>
  );
}

/* =========================================================================
   SUB-COMPONENT: CreateModal (Thêm người dùng mới)
   ========================================================================= */

function CreateModal({ onClose, onCreate, isSubmitting = false }) {
  const [createAvatarError, setCreateAvatarError] = useState("");
  const [form, setForm] = useState({
    email: "",
    password: "",
    fullName: "",
    phone: "",
    role: ROLES.TOURIST,
    active: true,
    avatarUrl: "",
  });
  const [touched, setTouched] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const createFileInputRef = useRef(null);

  const handleCreateAvatarFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setCreateAvatarError("Vui lòng chọn tệp hình ảnh (JPG, PNG, WebP…).");
      return;
    }
    setCreateAvatarError("");
    const reader = new FileReader();
    reader.onload = (evt) => {
      if (typeof evt.target?.result === "string") {
        setField("avatarUrl", evt.target.result);
      }
    };
    reader.readAsDataURL(file);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "journeygo/avatars");
      const res = await apiClient.upload("/upload/image", formData);
      const cloudUrl = res?.data?.url || res?.data?.avatarUrl || res?.url;
      if (cloudUrl) {
        setField("avatarUrl", cloudUrl);
      }
    } catch (err) {
      console.warn("[Cloudinary Upload] Chưa upload được qua API, tiếp tục dùng preview:", err?.message);
    } finally {
      e.target.value = "";
    }
  };

  const setField = (key, value) => setForm((p) => ({ ...p, [key]: value }));
  const touch = (key) => setTouched((p) => ({ ...p, [key]: true }));

  const errors = {
    email: !form.email.trim()
      ? "Email không được để trống"
      : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())
      ? "Email không hợp lệ"
      : "",
    password: !form.password
      ? "Mật khẩu không được để trống"
      : form.password.length < 8
      ? "Mật khẩu tối thiểu 8 ký tự"
      : "",
    fullName: !form.fullName.trim() ? "Họ tên không được để trống" : "",
    phone:
      form.phone && !/^[0-9+\-\s()]{6,20}$/.test(form.phone)
        ? "Số điện thoại không hợp lệ"
        : "",
  };
  const hasError = Object.values(errors).some(Boolean);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched({ email: true, password: true, fullName: true, phone: true });
    if (hasError || isSubmitting) return;
    await onCreate?.({
      email: form.email.trim(),
      password: form.password,
      fullName: form.fullName.trim(),
      phone: form.phone.trim() || null,
      role: form.role,
      active: Boolean(form.active),
      avatarUrl: String(form.avatarUrl || "").trim() || null,
      avatar: String(form.avatarUrl || "").trim() || null,
    });
  };

  const labelCls =
    "text-[11px] font-bold text-slate-600   mb-1.5 block";
  const inputCls = (err) =>
    `w-full px-3 py-2 bg-white border rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 transition-all ${
      err
        ? "border-rose-300 focus:ring-rose-500/20 focus:border-rose-500"
        : "border-slate-200 focus:ring-slate-500/20 focus:border-slate-700"
    }`;
  const errP = (key) =>
    touched[key] && errors[key] ? (
      <p className="text-[11px] text-rose-600 font-bold mt-1">
        {errors[key]}
      </p>
    ) : null;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        noValidate
        className="w-full max-w-xl max-h-[92vh] flex flex-col bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="shrink-0 px-6 py-5 border-b border-slate-100 bg-slate-50/60 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <UserPlus size={18} />
            </div>
            <div className="min-w-0">
              <h3 className="text-base sm:text-lg font-bold text-slate-900 truncate">
                Thêm người dùng mới
              </h3>
              <p className="text-xs text-slate-600 mt-0.5">
                Quản trị viên tạo tài khoản trực tiếp cho hệ thống
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="w-8 h-8 rounded-full bg-white hover:bg-slate-100 text-slate-600 flex items-center justify-center transition-colors cursor-pointer border border-slate-200 shrink-0 disabled:opacity-50"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 overflow-y-auto">
          <div>
            <label className={labelCls}>
              Email <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                value={form.email}
                onChange={(e) => setField("email", e.target.value)}
                onBlur={() => touch("email")}
                disabled={isSubmitting}
                placeholder="john.doe@journeygo.com"
                autoComplete="off"
                className={`${inputCls(touched.email && errors.email)} pl-9`}
              />
            </div>
            {errP("email")}
          </div>

          <div>
            <label className={labelCls}>
              Mật khẩu <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <KeyRound size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={(e) => setField("password", e.target.value)}
                onBlur={() => touch("password")}
                disabled={isSubmitting}
                placeholder="Tối thiểu 8 ký tự"
                autoComplete="new-password"
                className={`${inputCls(touched.password && errors.password)} pl-9 pr-10 tabular-nums`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                title={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
              >
                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
            {errP("password")}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>
                Họ và tên <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={form.fullName}
                onChange={(e) => setField("fullName", e.target.value)}
                onBlur={() => touch("fullName")}
                disabled={isSubmitting}
                placeholder="John Doe"
                className={inputCls(touched.fullName && errors.fullName)}
              />
              {errP("fullName")}
            </div>
            <div>
              <label className={labelCls}>Số điện thoại</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setField("phone", e.target.value)}
                onBlur={() => touch("phone")}
                disabled={isSubmitting}
                placeholder="0987654321"
                className={inputCls(touched.phone && errors.phone)}
              />
              {errP("phone")}
            </div>
          </div>

          {/* Ảnh đại diện (Avatar) */}
          <div>
            <label className={labelCls}>Ảnh đại diện (Avatar)</label>
            <div className="flex items-center gap-3 mb-2">
              <div className="relative w-12 h-12 rounded-xl overflow-hidden shrink-0 border border-slate-200 bg-slate-100 flex items-center justify-center">
                {form.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={form.avatarUrl}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-xs font-bold text-slate-400">Trống</span>
                )}
              </div>
              <div className="flex-1 flex gap-2">
                <button
                  type="button"
                  onClick={() => createFileInputRef.current?.click()}
                  className="px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs inline-flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                >
                  <Upload size={13} />
                  <span>Tải ảnh file</span>
                </button>
                {form.avatarUrl && (
                  <button
                    type="button"
                    onClick={() => setField("avatarUrl", "")}
                    className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 border border-slate-200 text-xs font-bold transition-all cursor-pointer"
                  >
                    Xóa ảnh
                  </button>
                )}
              </div>
              <input
                ref={createFileInputRef}
                type="file"
                accept="image/*"
                onChange={handleCreateAvatarFile}
                className="hidden"
              />
              {createAvatarError && <p className="mt-1.5 text-xs text-rose-600">{createAvatarError}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Vai trò</label>
              <select
                value={form.role}
                onChange={(e) => setField("role", e.target.value)}
                disabled={isSubmitting}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-500/20 focus:border-slate-700"
              >
                {Object.values(ROLES).map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABELS[r] || r}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Trạng thái</label>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setField("active", !form.active)}
                className={`w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold border transition-colors cursor-pointer disabled:cursor-not-allowed ${
                  form.active
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                    : "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100"
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    form.active ? "bg-emerald-500" : "bg-rose-500"
                  }`}
                />
                {form.active ? "Đang hoạt động" : "Đã khóa"}
              </button>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 leading-relaxed">
            <strong className="text-slate-700">Lưu ý:</strong> Email không thể thay
            đổi sau khi tạo. Mọi thao tác sẽ được ghi nhật ký phía máy chủ.
          </div>
        </div>

        {/* Footer */}
        <div className="shrink-0 px-6 py-4 border-t border-slate-100 bg-slate-50/60 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs border border-slate-200 transition-colors cursor-pointer disabled:opacity-50"
          >
            Hủy
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm shadow-emerald-900/20 transition-all cursor-pointer inline-flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <UserPlus size={12} />
            )}
            {isSubmitting ? "Đang tạo…" : "Tạo người dùng"}
          </button>
        </div>
      </form>
    </div>
  );
}

function DetailRow({ label, value, icon: Icon, mono, muted }) {
  return (
    <div
      className={`p-3 rounded-xl border ${
        muted
          ? "bg-slate-50 border-slate-200"
          : "bg-white border-slate-200"
      }`}
    >
      <p className="text-[11px] font-bold text-slate-600 mb-1.5 inline-flex items-center gap-1">
        {Icon && <Icon size={10} className="text-slate-400" />}
        {label}
      </p>
      <p
        className={`text-sm ${
          mono ? "tabular-nums" : "font-bold"
        } ${
          muted ? "italic text-slate-400 font-normal" : "text-slate-800"
        } break-all`}
      >
        {value}
      </p>
    </div>
  );
}

/* =========================================================================
   SUB-COMPONENT: FallbackBanner (Phân loại lỗi + hướng dẫn khắc phục)
   ========================================================================= */

const ERROR_DIAGNOSIS = {
  network: {
    title: "Không kết nối được máy chủ Backend",
    bgClass: "bg-amber-50 border-amber-200",
    iconClass: "text-amber-600",
    titleClass: "text-amber-800",
    bodyClass: "text-amber-700",
    codeClass: "bg-amber-100",
  },
  auth: {
    title: "Phiên đăng nhập đã hết hạn hoặc không hợp lệ",
    bgClass: "bg-rose-50 border-rose-200",
    iconClass: "text-rose-600",
    titleClass: "text-rose-800",
    bodyClass: "text-rose-700",
    codeClass: "bg-rose-100",
  },
  forbidden: {
    title: "Tài khoản không có quyền ADMIN",
    bgClass: "bg-rose-50 border-rose-200",
    iconClass: "text-rose-600",
    titleClass: "text-rose-800",
    bodyClass: "text-rose-700",
    codeClass: "bg-rose-100",
  },
  notfound: {
    title: "API endpoint không tồn tại (404)",
    bgClass: "bg-orange-50 border-orange-200",
    iconClass: "text-orange-600",
    titleClass: "text-orange-800",
    bodyClass: "text-orange-700",
    codeClass: "bg-orange-100",
  },
  server: {
    title: "Máy chủ Backend gặp lỗi nội bộ (5xx)",
    bgClass: "bg-rose-50 border-rose-200",
    iconClass: "text-rose-600",
    titleClass: "text-rose-800",
    bodyClass: "text-rose-700",
    codeClass: "bg-rose-100",
  },
  unknown: {
    title: "Lỗi không xác định",
    bgClass: "bg-slate-50 border-slate-200",
    iconClass: "text-slate-600",
    titleClass: "text-slate-800",
    bodyClass: "text-slate-700",
    codeClass: "bg-slate-100",
  },
};

const ERROR_GUIDE = {
  network: (
    <>
      <strong>Cách khắc phục:</strong> Khởi động backend Spring Boot ở
      terminal <code>backend/</code> bằng lệnh{" "}
      <code className="tabular-nums bg-amber-100 px-1 py-0.5 rounded">
        mvn spring-boot:run
      </code>{" "}
      hoặc{" "}
      <code className="tabular-nums bg-amber-100 px-1 py-0.5 rounded">
        ./mvnw spring-boot:run
      </code>
      . Đảm bảo PostgreSQL đang chạy ở{" "}
      <code className="tabular-nums bg-amber-100 px-1 py-0.5 rounded">
        localhost:5432
      </code>
      .
    </>
  ),
  auth: (
    <>
      <strong>Cách khắc phục:</strong> Vui lòng đăng nhập lại với tài khoản
      ADMIN. Truy cập{" "}
      <a
        href="/auth/login"
        className="underline font-bold"
        target="_self"
      >
        trang đăng nhập
      </a>{" "}
      để cấp lại token.
    </>
  ),
  forbidden: (
    <>
      <strong>Cách khắc phục:</strong> Endpoint{" "}
      <code className="tabular-nums bg-rose-100 px-1 py-0.5 rounded">
        /api/v1/users
      </code>{" "}
      yêu cầu quyền <code>ADMIN</code>. Tài khoản hiện tại có thể là{" "}
      <code>TOURIST</code>/<code>MODERATOR</code>/<code>PROVIDER</code>.
    </>
  ),
  notfound: (
    <>
      <strong>Cách khắc phục:</strong> Kiểm tra URL gốc đã đúng{" "}
      <code className="tabular-nums bg-orange-100 px-1 py-0.5 rounded">
        /api/v1/users
      </code>{" "}
      chưa. Nếu backend đang chạy ở context-path khác, cập nhật biến môi
      trường <code>NEXT_PUBLIC_API_URL</code>.
    </>
  ),
  server: (
    <>
      <strong>Lỗi SQL/JDBC từ backend.</strong> Backend đã được cập nhật để
      dùng <code>JpaSpecificationExecutor</code> +{" "}
      <code className="tabular-nums bg-rose-100 px-1 py-0.5 rounded">
        cb.coalesce(phone, &quot;&quot;)
      </code>{" "}
      nên không còn lỗi{" "}
      <code className="tabular-nums bg-rose-100 px-1 py-0.5 rounded">
        could not determine data type of parameter
      </code>
      . Vui lòng <strong>restart Spring Boot</strong> (
      <code className="tabular-nums bg-rose-100 px-1 py-0.5 rounded">
        Ctrl+C
      </code>{" "}
      rồi{" "}
      <code className="tabular-nums bg-rose-100 px-1 py-0.5 rounded">
        mvn spring-boot:run
      </code>
      ) để áp dụng code mới.
    </>
  ),
  unknown: (
    <>
      <strong>Cách khắc phục:</strong> Mở DevTools (F12) → tab Network để xem
      chi tiết request/response.
    </>
  ),
};

function FallbackBanner({ errorType, message, apiBaseUrl, onRetry }) {
  const diag = ERROR_DIAGNOSIS[errorType] || ERROR_DIAGNOSIS.unknown;
  const guide = ERROR_GUIDE[errorType] || ERROR_GUIDE.unknown;

  return (
    <div className={`p-4 rounded-xl border ${diag.bgClass}`}>
      <div className="flex items-start gap-3">
        <AlertCircle
          size={18}
          className={`${diag.iconClass} mt-0.5 shrink-0`}
        />
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-bold ${diag.titleClass}`}>
            {diag.title}
          </p>
          <p className={`text-[11px] ${diag.bodyClass} mt-1`}>
            <strong>Chi tiết:</strong>{" "}
            <code className={`tabular-nums ${diag.codeClass} px-1 py-0.5 rounded`}>
              {message}
            </code>
          </p>
          <p className={`text-[11px] ${diag.bodyClass} mt-2 leading-relaxed`}>
            {guide}
          </p>
          <p className={`text-[11px] ${diag.bodyClass} mt-2`}>
            <strong>API base URL đang dùng:</strong>{" "}
            <code className={`tabular-nums ${diag.codeClass} px-1.5 py-0.5 rounded`}>
              {apiBaseUrl}
            </code>{" "}
            (có thể ghi đè bằng biến môi trường{" "}
            <code className="tabular-nums">NEXT_PUBLIC_API_URL</code>).
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onRetry}
              className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 font-bold text-[11px] inline-flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw size={12} />
              Thử lại
            </button>
            {errorType === "network" && (
              <a
                href={`${apiBaseUrl.replace("/api/v1", "")}/swagger-ui.html`}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 font-bold text-[11px] inline-flex items-center gap-1.5"
              >
                <Globe size={12} />
                Mở Swagger UI
              </a>
            )}
            {errorType === "auth" && (
              <a
                href="/auth/login"
                className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white border border-rose-700 font-bold text-[11px] inline-flex items-center gap-1.5"
              >
                <KeyRound size={12} />
                Đăng nhập lại
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}