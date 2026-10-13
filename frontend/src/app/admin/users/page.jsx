"use client";

import React, { useState } from "react";
import {
  Users,
  Search,
  Filter,
  UserCheck,
  ShieldCheck,
  Building2,
  Lock,
  Unlock,
  Eye,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  X,
  User,
  ShieldAlert,
  Crown,
  FileCheck,
  Mail,
  Phone,
  Calendar,
  Sparkles,
} from "lucide-react";

/**
 * Trang Quản Lý Người Dùng & Phân Quyền (RBAC & User Management) - JourneyGo
 * - Giao diện chuẩn xác theo thiết kế quản trị tài khoản
 * - Dữ liệu quản trị động, sẵn sàng gắn API /api/v1/users
 */
export default function AdminUsersPage() {
  // State Tab phân quyền: 'all' | 'PROVIDER' | 'MODERATOR' | 'USER'
  const [activeTab, setActiveTab] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all"); // 'all' | 'ACTIVE' | 'PENDING' | 'LOCKED'
  const [searchQuery, setSearchQuery] = useState("");

  // State Modal
  const [roleModalUser, setRoleModalUser] = useState(null);
  const [newSelectedRole, setNewSelectedRole] = useState("USER");
  const [viewProfileUser, setViewProfileUser] = useState(null);

  // State Toast
  const [toastMsg, setToastMsg] = useState("");

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3500);
  };

  // Dữ liệu người dùng (sẵn sàng nhận từ API)
  // Cấu trúc: [{ id, fullName, email, phone, role, status, createdAt, ... }]
  const [usersList, setUsersList] = useState([]);

  /**
   * ── [API INTEGRATION] GẮN API TẠI ĐÂY ──────────────────────────────
   * useEffect(() => {
   *   async function fetchUsers() {
   *     try {
   *       // const res = await apiClient.get('/api/v1/users');
   *       // setUsersList(res.data);
   *     } catch (err) {
   *       console.error("Lỗi lấy danh sách người dùng:", err);
   *     }
   *   }
   *   fetchUsers();
   * }, []);
   * ───────────────────────────────────────────────────────────────────
   */

  // Lọc người dùng theo tab, trạng thái và từ khóa
  const filteredUsers = usersList.filter((u) => {
    if (activeTab !== "all" && u.role !== activeTab) return false;
    if (statusFilter !== "all" && u.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = u.fullName?.toLowerCase().includes(q);
      const matchEmail = u.email?.toLowerCase().includes(q);
      const matchPhone = u.phone?.toLowerCase().includes(q);
      return matchName || matchEmail || matchPhone;
    }
    return true;
  });

  // Xử lý đổi trạng thái Khóa / Mở khóa
  const handleToggleLock = (user) => {
    const isLocked = user.status === "LOCKED";
    const nextStatus = isLocked ? "ACTIVE" : "LOCKED";

    // TODO: Gắn API khóa/mở khóa tài khoản:
    // await apiClient.patch(`/api/v1/users/${user.id}/status`, { status: nextStatus });

    setUsersList((prev) =>
      prev.map((u) => (u.id === user.id ? { ...u, status: nextStatus } : u))
    );
    showToast(
      isLocked
        ? `Đã mở khóa tài khoản: ${user.fullName}`
        : `Đã khóa quyền truy cập của: ${user.fullName}`
    );
  };

  // Xác nhận đổi vai trò
  const handleConfirmRoleChange = () => {
    if (!roleModalUser) return;

    // TODO: Gắn API phân quyền:
    // await apiClient.patch(`/api/v1/users/${roleModalUser.id}/role`, { role: newSelectedRole });

    setUsersList((prev) =>
      prev.map((u) =>
        u.id === roleModalUser.id ? { ...u, role: newSelectedRole } : u
      )
    );
    showToast(
      `Đã cập nhật vai trò của ${roleModalUser.fullName} thành: ${newSelectedRole}`
    );
    setRoleModalUser(null);
  };

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-200">
      {/* Toast thông báo */}
      {toastMsg && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-xl border border-slate-700 text-xs font-bold flex items-center gap-2.5 animate-in slide-in-from-top-3 max-w-md">
          <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header trang quản lý người dùng */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/90 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              <span className="text-[11px] font-black uppercase tracking-wider text-rose-700">
                Phân Hệ Quản Trị Cấp Cao
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Quản Lý Người Dùng & Phân Quyền
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Kiểm soát tài khoản, cấp quyền truy cập theo vai trò và xét duyệt đối tác cung cấp dịch vụ
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
              Tổng số: <strong>{usersList.length} tài khoản</strong>
            </span>
          </div>
        </div>

        {/* Thanh Tabs phân quyền */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={() => setActiveTab("all")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "all"
                ? "bg-slate-900 text-white shadow-xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200/80"
            }`}
          >
            Tất cả ({usersList.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("PROVIDER")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "PROVIDER"
                ? "bg-amber-600 text-white shadow-xs"
                : "bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200"
            }`}
          >
            <Building2 size={13} />
            <span>Đối tác</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("MODERATOR")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "MODERATOR"
                ? "bg-teal-600 text-white shadow-xs"
                : "bg-teal-50 text-teal-800 hover:bg-teal-100 border border-teal-200"
            }`}
          >
            <ShieldCheck size={13} />
            <span>Kiểm duyệt viên</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("USER")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "USER"
                ? "bg-sky-600 text-white shadow-xs"
                : "bg-sky-50 text-sky-800 hover:bg-sky-100 border border-sky-200"
            }`}
          >
            <User size={13} />
            <span>Du khách</span>
          </button>
        </div>

        {/* Thanh tìm kiếm & lọc trạng thái */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 pt-1">
          <div className="sm:col-span-8 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search size={14} />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo họ tên, email, số điện thoại..."
              className="w-full pl-8.5 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
            />
          </div>

          <div className="sm:col-span-4">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20"
            >
              <option value="all">Tất cả trạng thái hoạt động</option>
              <option value="ACTIVE">Đang hoạt động</option>
              <option value="PENDING">Chờ kích hoạt</option>
              <option value="LOCKED">Đang bị khóa</option>
            </select>
          </div>
        </div>
      </div>

      {/* Bảng danh sách người dùng */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[10.5px] font-bold uppercase text-slate-500 tracking-wider">
                <th className="py-3.5 px-4">NGƯỜI DÙNG & LIÊN HỆ</th>
                <th className="py-3.5 px-3">VAI TRÒ</th>
                <th className="py-3.5 px-3">TRẠNG THÁI</th>
                <th className="py-3.5 px-3">NGÀY ĐĂNG KÝ</th>
                <th className="py-3.5 px-4 text-right">THAO TÁC</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    <Users size={32} className="mx-auto text-slate-300 mb-2" />
                    <p className="text-xs font-semibold text-slate-700">
                      Không tìm thấy tài khoản phù hợp
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Dữ liệu sẽ hiển thị khi kết nối API người dùng
                    </p>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Cột 1: Thông tin người dùng */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-xs shrink-0">
                          {u.fullName?.slice(0, 2).toUpperCase() || "US"}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 text-xs">{u.fullName}</p>
                          <p className="text-[10.5px] text-slate-500 font-mono mt-0.5">{u.email}</p>
                        </div>
                      </div>
                    </td>

                    {/* Cột 2: Vai trò */}
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                        {u.role}
                      </span>
                    </td>

                    {/* Cột 3: Trạng thái */}
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      {u.status === "ACTIVE" ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 size={11} />
                          <span>Hoạt động</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                          <Lock size={11} />
                          <span>Đã khóa</span>
                        </span>
                      )}
                    </td>

                    {/* Cột 4: Ngày đăng ký */}
                    <td className="py-3.5 px-3 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                      {u.createdAt || "Mới tạo"}
                    </td>

                    {/* Cột 5: Nút thao tác */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setRoleModalUser(u);
                            setNewSelectedRole(u.role);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] transition-colors cursor-pointer"
                        >
                          Phân quyền
                        </button>

                        <button
                          type="button"
                          onClick={() => handleToggleLock(u)}
                          className={`p-1.5 rounded-lg border text-xs font-bold transition-colors cursor-pointer ${
                            u.status === "LOCKED"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                              : "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100"
                          }`}
                          title={u.status === "LOCKED" ? "Mở khóa tài khoản" : "Khóa tài khoản"}
                        >
                          {u.status === "LOCKED" ? <Unlock size={14} /> : <Lock size={14} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Phân lại quyền RBAC */}
      {roleModalUser && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setRoleModalUser(null)}
        >
          <div
            className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-900">
                Phân Quyền Vai Trò Người Dùng
              </h3>
              <button
                type="button"
                onClick={() => setRoleModalUser(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div>
              <p className="text-xs text-slate-600">
                Tài khoản: <strong>{roleModalUser.fullName}</strong> ({roleModalUser.email})
              </p>

              <div className="mt-3 space-y-2">
                {["USER", "PROVIDER", "MODERATOR", "ADMIN"].map((r) => (
                  <label
                    key={r}
                    className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                      newSelectedRole === r
                        ? "bg-rose-50 border-rose-400 font-bold text-rose-900"
                        : "bg-white border-slate-200 text-slate-700"
                    }`}
                  >
                    <span className="text-xs">{r}</span>
                    <input
                      type="radio"
                      name="roleOption"
                      checked={newSelectedRole === r}
                      onChange={() => setNewSelectedRole(r)}
                      className="accent-rose-600"
                    />
                  </label>
                ))}
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setRoleModalUser(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleConfirmRoleChange}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs cursor-pointer shadow-xs"
              >
                Lưu phân quyền
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
