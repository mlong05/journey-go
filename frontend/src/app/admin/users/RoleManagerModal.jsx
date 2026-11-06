"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  X,
  Shield,
  ShieldCheck,
  Plus,
  Search,
  Lock,
  Sparkles,
  Check,
  Loader2,
  KeyRound,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { roleService } from "@/features/user";

/**
 * Modal Quản Lý Danh Mục Vai Trò Hệ Thống (Role Management Admin)
 * Tích hợp 2 API Backend:
 *  - GET  /api/v1/roles : Lấy danh sách tất cả vai trò (System & Custom)
 *  - POST /api/v1/roles : Tạo mới vai trò tùy chỉnh
 *
 * Chuẩn thiết kế High-End Visual Design & Micro-Interactions:
 *  - Cấu trúc Double-Bezel (Doppelrand) 2 lớp viền sang trọng
 *  - Thẻ xem trước trực quan (Live Badge Preview)
 *  - Bước xác nhận bảo mật trước khi lưu vai trò mới vào hệ thống
 */
export default function RoleManagerModal({ isOpen, onClose, onRoleCreated }) {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all"); // "all" | "system" | "custom"

  // Trạng thái mở form thêm mới
  const [isCreating, setIsCreating] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [formError, setFormError] = useState("");

  // Hộp thoại xác nhận trước khi gửi POST /api/v1/roles
  const [confirmingRole, setConfirmingRole] = useState(null);

  // Thông báo phản hồi Toast
  const [toast, setToast] = useState({ message: "", tone: "success" });

  const showToast = useCallback((message, tone = "success") => {
    setToast({ message, tone });
    setTimeout(() => setToast({ message: "", tone }), 4000);
  }, []);

  // Tải danh sách vai trò từ backend
  const loadRoles = useCallback(async () => {
    setLoading(true);
    try {
      const data = await roleService.getAllRoles();
      setRoles(data || []);
    } catch (err) {
      console.error("[RoleManagerModal] loadRoles error:", err);
      showToast(
        err?.response?.data?.message || err?.message || "Không thể tải danh sách vai trò.",
        "error"
      );
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) {
        loadRoles();
        setIsCreating(false);
        setName("");
        setDescription("");
        setFormError("");
        setConfirmingRole(null);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [isOpen, loadRoles]);

  // Khóa cuộn trang nền khi mở modal
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  // Kiểm tra tính hợp lệ của Tên vai trò
  const handleNameChange = (val) => {
    // Tự động in hoa, chỉ giữ ký tự chữ, số và dấu gạch dưới
    const clean = val.toUpperCase().replace(/[^A-Z0-9_]/g, "");
    setName(clean);
    if (formError) setFormError("");
  };

  // Mở bước xác nhận tạo vai trò
  const handleOpenConfirm = (e) => {
    e.preventDefault();
    const cleanName = name.trim();
    if (!cleanName) {
      setFormError("Tên vai trò không được để trống.");
      return;
    }
    if (cleanName.length < 2 || cleanName.length > 50) {
      setFormError("Tên vai trò phải từ 2 đến 50 ký tự.");
      return;
    }
    const isExisted = roles.some((r) => r.name === cleanName);
    if (isExisted) {
      setFormError(`Vai trò "${cleanName}" đã tồn tại trong hệ thống.`);
      return;
    }

    // Hợp lệ -> Chuyển sang bước xác nhận
    setConfirmingRole({
      name: cleanName,
      description: description.trim(),
    });
  };

  // Thực thi tạo mới vai trò qua POST /api/v1/roles
  const handleExecuteCreate = async () => {
    if (!confirmingRole) return;
    setActionLoading(true);
    try {
      const created = await roleService.createRole(confirmingRole);
      showToast(`Đã tạo thành công vai trò mới: ${created.name}`);
      setConfirmingRole(null);
      setIsCreating(false);
      setName("");
      setDescription("");
      await loadRoles();
      onRoleCreated?.(created);
    } catch (err) {
      console.error("[RoleManagerModal] createRole error:", err);
      const msg =
        err?.response?.data?.message || err?.message || "Không thể tạo vai trò mới. Vui lòng thử lại.";
      showToast(msg, "error");
      setConfirmingRole(null);
    } finally {
      setActionLoading(false);
    }
  };

  // Lọc danh sách vai trò
  const filteredRoles = useMemo(() => {
    let list = roles;
    if (filterType === "system") {
      list = list.filter((r) => r.isSystem);
    } else if (filterType === "custom") {
      list = list.filter((r) => !r.isSystem);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (r) =>
          r.name?.toLowerCase().includes(q) ||
          r.description?.toLowerCase().includes(q) ||
          String(r.id).includes(q)
      );
    }
    return list;
  }, [roles, filterType, searchQuery]);

  // Thống kê nhanh
  const systemCount = roles.filter((r) => r.isSystem).length;
  const customCount = roles.filter((r) => !r.isSystem).length;

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-70 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200"
    >
      {/* Outer Shell: Double-Bezel Architecture (Doppelrand) */}
      <div className="w-full max-w-4xl p-1.5 sm:p-2 bg-slate-900/10 dark:bg-white/10 rounded-[2.25rem] ring-1 ring-slate-900/15 shadow-xl animate-in zoom-in-95 duration-200">
        {/* Inner Core: Main White Card */}
        <div className="bg-white rounded-[2rem] overflow-hidden flex flex-col h-[700px] max-h-[92vh] shadow-[inset_0_1px_1px_rgba(255,255,255,0.8)] border border-slate-200/80">
          {/* ========================================================
              HEADER MODAL (Double Header with Ambient Gradient)
              ======================================================== */}
          <div className="shrink-0 px-6 sm:px-8 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-indigo-500 text-white flex items-center justify-center shadow-md shadow-indigo-500/20 ring-4 ring-indigo-50 shrink-0">
                <ShieldCheck size={22} strokeWidth={2.2} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full px-2.5 py-0.5 text-[11px] tracking-[0.2em] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/80">
                    Phân Quyền Toàn Hệ Thống
                  </span>
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight mt-0.5">
                  Quản Lý Vai Trò Người Dùng
                </h2>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-10 h-10 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>

          {/* ========================================================
              TOAST NOTIFICATION
              ======================================================== */}
          {toast.message && (
            <div
              className={`shrink-0 mx-6 sm:mx-8 mt-3.5 p-3.5 rounded-xl text-xs font-bold shadow-lg flex items-center gap-2.5 animate-in slide-in-from-top-2 ${
                toast.tone === "success"
                  ? "bg-emerald-600 text-white"
                  : "bg-rose-600 text-white"
              }`}
            >
              {toast.tone === "success" ? (
                <CheckCircle2 size={16} className="shrink-0" />
              ) : (
                <AlertCircle size={16} className="shrink-0" />
              )}
              <span>{toast.message}</span>
            </div>
          )}

          {/* ========================================================
              STATISTICS & ACTION BAR (Thống kê vai trò)
              ======================================================== */}
          <div className="shrink-0 px-6 sm:px-8 py-3.5 bg-slate-50/70 border-b border-slate-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Tất cả */}
              <button
                type="button"
                onClick={() => setFilterType("all")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  filterType === "all"
                    ? "bg-slate-900 text-white shadow-sm"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                }`}
              >
                <span>Tất cả</span>
                <span className="px-1.5 py-0.2 rounded-md bg-white/20 text-[11px]">
                  {roles.length}
                </span>
              </button>

              {/* Mặc định hệ thống */}
              <button
                type="button"
                onClick={() => setFilterType("system")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  filterType === "system"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                }`}
              >
                <Lock size={12} />
                <span>Hệ thống (Core)</span>
                <span className="px-1.5 py-0.2 rounded-md bg-indigo-100 text-indigo-800 text-[11px]">
                  {systemCount}
                </span>
              </button>

              {/* Tùy chỉnh mở rộng */}
              <button
                type="button"
                onClick={() => setFilterType("custom")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  filterType === "custom"
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                }`}
              >
                <Sparkles size={12} />
                <span>Tùy chỉnh (Custom)</span>
                <span className="px-1.5 py-0.2 rounded-md bg-emerald-100 text-emerald-800 text-[11px]">
                  {customCount}
                </span>
              </button>
            </div>

            {/* Nút bật Form Thêm Vai Trò Mới */}
            <button
              type="button"
              onClick={() => {
                setIsCreating((prev) => !prev);
                setFormError("");
              }}
              className={`h-9 px-4 rounded-xl text-xs font-bold inline-flex items-center gap-2 cursor-pointer transition-all active:scale-95 shadow-sm ${
                isCreating
                  ? "bg-slate-200 text-slate-700 hover:bg-slate-300"
                  : "bg-rose-600 hover:bg-rose-700 text-white shadow-indigo-600/20"
              }`}
            >
              {isCreating ? (
                <>
                  <X size={14} />
                  <span>Đóng form tạo</span>
                </>
              ) : (
                <>
                  <Plus size={15} strokeWidth={2.4} />
                  <span>Tạo vai trò mới</span>
                </>
              )}
            </button>
          </div>

          {/* ========================================================
              FORM TẠO VAI TRÒ MỚI (Khung Double-Bezel mở rộng)
              ======================================================== */}
          {isCreating && (
            <div className="shrink-0 mx-6 sm:mx-8 mt-4 p-4 sm:p-5 bg-gradient-to-br from-indigo-50/50 via-white to-slate-50 rounded-xl border-2 border-indigo-200/80 shadow-md animate-in fade-in slide-in-from-top-3 duration-200">
              <div className="flex items-center justify-between pb-3 border-b border-indigo-100">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-2xs">
                    +
                  </div>
                  <h4 className="font-bold text-slate-900 text-sm">
                    Định Nghĩa Vai Trò Mới Cho Hệ Thống
                  </h4>
                </div>
                <span className="text-[11px] tabular-nums text-indigo-700 bg-indigo-100/60 px-2 py-0.5 rounded-md font-bold">
                  POST /api/v1/roles
                </span>
              </div>

              <form onSubmit={handleOpenConfirm} className="mt-3.5 space-y-3.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Tên vai trò */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                      <span>
                        Tên vai trò (Định danh hệ thống) <span className="text-rose-500">*</span>
                      </span>
                      <span className="text-[11px] text-slate-400 tabular-nums">
                        {name.length}/50 ký tự
                      </span>
                    </label>
                    <input
                      type="text"
                      maxLength={50}
                      value={name}
                      onChange={(e) => handleNameChange(e.target.value)}
                      placeholder="VD: CONTENT_PROVIDER, CONTENT_MODERATOR..."
                      className={`w-full px-3.5 py-2 text-xs tabular-nums font-bold bg-white border rounded-xl outline-hidden   transition-all ${
                        formError
                          ? "border-rose-300 ring-2 ring-rose-100"
                          : "border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15"
                      }`}
                    />
                    <p className="text-[11px] text-slate-400">
                      Chỉ gồm chữ cái, chữ số và dấu gạch dưới. Tự động chuẩn hóa thành chữ in hoa.
                    </p>
                  </div>

                  {/* Mô tả vai trò */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                      <span>Mô tả quyền hạn &amp; trách nhiệm</span>
                      <span className="text-[11px] text-slate-400 tabular-nums">
                        {description.length}/255 ký tự
                      </span>
                    </label>
                    <input
                      type="text"
                      maxLength={255}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="VD: Hướng dẫn viên phụ trách hỗ trợ du khách thực địa"
                      className="w-full px-3.5 py-2 text-xs font-semibold bg-white border border-slate-200 rounded-xl outline-hidden focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15 transition-all"
                    />
                    <p className="text-[11px] text-slate-400">
                      Giải thích ngắn gọn để quản trị viên dễ dàng phân biệt khi gán quyền cho tài
                      khoản.
                    </p>
                  </div>
                </div>

                {formError && (
                  <p className="text-xs font-bold text-rose-600 bg-rose-50 p-2.5 rounded-xl border border-rose-200 flex items-center gap-2">
                    <AlertCircle size={14} className="shrink-0" />
                    <span>{formError}</span>
                  </p>
                )}

                {/* Live Badge Preview */}
                {name && (
                  <div className="p-3 bg-white rounded-xl border border-indigo-100 flex items-center justify-between gap-3 shadow-2xs">
                    <div className="flex items-center gap-2 text-xs text-slate-600">
                      <span className="font-bold text-slate-700">Xem trước hiển thị:</span>
                      <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 tabular-nums">
                        {name}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {description ? `— ${description}` : ""}
                      </span>
                    </div>

                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                      Vai trò tùy chỉnh
                    </span>
                  </div>
                )}

                {/* Nút hành động form */}
                <div className="flex items-center justify-end gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreating(false);
                      setFormError("");
                    }}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-rose-600 hover:bg-rose-700 active:bg-indigo-800 text-white rounded-xl text-xs font-bold inline-flex items-center gap-2 shadow-md shadow-indigo-600/20 transition-all cursor-pointer active:scale-95"
                  >
                    <Check size={14} />
                    <span>Xác nhận giao diện tạo vai trò</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ========================================================
              SEARCH BAR
              ======================================================== */}
          <div className="shrink-0 px-6 sm:px-8 py-3 border-b border-slate-100 bg-white">
            <div className="relative">
              <Search
                size={15}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm kiếm vai trò theo tên mã hoặc mô tả..."
                className="w-full pl-9 pr-8 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl outline-hidden focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15 transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* ========================================================
              DANH SÁCH CÁC VAI TRÒ (Scrollable Body)
              ======================================================== */}
          <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-3.5 bg-slate-50/40">
            {loading ? (
              <div className="h-64 flex flex-col items-center justify-center gap-3 text-slate-400">
                <Loader2 size={32} className="animate-spin text-indigo-600" />
                <p className="text-xs font-bold">Đang tải danh sách vai trò hệ thống...</p>
              </div>
            ) : filteredRoles.length === 0 ? (
              <div className="py-16 text-center max-w-sm mx-auto space-y-3">
                <div className="w-14 h-14 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center mx-auto text-slate-400">
                  <Shield size={26} />
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">
                    Không tìm thấy vai trò phù hợp
                  </h4>
                  <p className="text-xs text-slate-600 mt-1">
                    Thử tìm kiếm với từ khóa khác hoặc bấm nút Tạo vai trò mới để mở rộng hệ thống.
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {filteredRoles.map((role) => (
                  <div
                    key={role.id}
                    className="group bg-white hover:bg-gradient-to-br hover:from-white hover:to-indigo-50/20 border border-slate-200 hover:border-indigo-300 rounded-xl p-4 sm:p-5 transition-all shadow-2xs hover:shadow-md flex flex-col gap-2.5 relative overflow-hidden"
                  >
                    {/* Top row: Name & Badge */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="w-7 h-7 rounded-lg bg-slate-100 group-hover:bg-indigo-100 text-slate-700 group-hover:text-indigo-700 tabular-nums font-bold text-xs flex items-center justify-center shrink-0 border border-slate-200/80 transition-colors">
                          #{role.id}
                        </span>
                        <h4 className="text-base font-bold text-slate-900 tracking-tight tabular-nums">
                          {role.name}
                        </h4>
                      </div>

                      {role.isSystem ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded-full shrink-0">
                          <Lock size={10} className="text-slate-600" />
                          <span>Mặc định hệ thống</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full shrink-0">
                          <Sparkles size={10} className="text-emerald-600" />
                          <span>Tùy chỉnh mở rộng</span>
                        </span>
                      )}
                    </div>

                    {/* Description */}
                    <p className="text-xs text-slate-600 leading-relaxed font-semibold">
                      {role.description || (
                        <span className="italic text-slate-400">
                          Chưa có thông tin mô tả chi tiết cho vai trò này.
                        </span>
                      )}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ========================================================
              FOOTER MODAL (Button Đóng)
              ======================================================== */}
          <div className="shrink-0 px-6 sm:px-8 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <KeyRound size={14} className="text-indigo-600 shrink-0" />
              <span>
                Tổng cộng <strong>{roles.length} vai trò</strong> đã được đăng ký trong hệ thống.
              </span>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold rounded-xl transition-colors cursor-pointer shadow-2xs"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================
          HỘP THOẠI XÁC NHẬN TẠO VAI TRÒ MỚI (Confirmation Dialog)
          ======================================================== */}
      {confirmingRole && (
        <div className="fixed inset-0 z-80 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl border border-slate-200 animate-in zoom-in-95 duration-150 space-y-4">
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center shrink-0">
                <ShieldCheck size={22} />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">
                  Xác nhận khởi tạo vai trò mới?
                </h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Vai trò mới sẽ được ghi vào cơ sở dữ liệu hệ thống JourneyGo và có thể gán ngay cho
                  người dùng.
                </p>
              </div>
            </div>

            {/* Chi tiết vai trò sắp tạo */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-600">Tên mã vai trò:</span>
                <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-indigo-100 text-indigo-800 tabular-nums">
                  {confirmingRole.name}
                </span>
              </div>
              <div className="text-xs text-slate-700">
                <span className="font-bold text-slate-600 block mb-0.5">Mô tả vai trò:</span>
                <p className="font-semibold bg-white p-2.5 rounded-xl border border-slate-200 text-slate-800">
                  {confirmingRole.description || "(Không có mô tả)"}
                </p>
              </div>
            </div>

            {/* Nút xác nhận */}
            <div className="flex items-center justify-end gap-2.5 pt-1">
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => setConfirmingRole(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleExecuteCreate}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 active:bg-indigo-800 text-white font-bold text-xs inline-flex items-center gap-1.5 shadow-md shadow-indigo-600/25 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
              >
                {actionLoading ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Đang lưu vai trò...</span>
                  </>
                ) : (
                  <>
                    <Check size={15} />
                    <span>Xác nhận &amp; Lưu vai trò</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
