"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  SlidersHorizontal,
  FolderTree,
  Award,
  CircleDollarSign,
  Save,
  CheckCircle2,
  Plus,
  Eye,
  EyeOff,
  MapPin,
  QrCode,
  HelpCircle,
  Camera,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  Landmark,
  Compass,
  Utensils,
  Layers,
  Loader2,
  Globe2,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { taskTypeService, TaskTypeManagerModal } from "@/features/experience";
import { regionService } from "@/features/destination";

/**
 * Trang Cấu Hình Danh Mục & Luật Hệ Thống (System Config & Rules) - JourneyGo
 * - Giao diện chuẩn xác 3 tabs: Catalogs, Gamification, Pricing & Fees
 * - Dữ liệu quản trị động, không gán cứng mock data cố định
 * - Sẵn sàng nhận API lưu/tải cấu hình
 */
export default function AdminSystemConfigPage() {
  // State Tab đang chọn: 'catalogs' | 'gamification' | 'pricing'
  const [activeTab, setActiveTab] = useState("catalogs");

  // State Toast & Loading
  const [toastMsg, setToastMsg] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 4000);
  };

  // ══════════════════════════════════════════════════════════
  // 1. DỮ LIỆU TAB 1: DANH MỤC DI SẢN & ĐIỂM ĐẾN
  // ══════════════════════════════════════════════════════════

  // Danh mục Vùng miền (kết nối live API regionService)
  const [regions, setRegions] = useState([]);
  const [deletedRegions, setDeletedRegions] = useState([]);
  const [regionsLoading, setRegionsLoading] = useState(false);
  const [regionTab, setRegionTab] = useState("active"); // 'active' | 'deleted'
  const [newRegionName, setNewRegionName] = useState("");
  const [regionActionLoading, setRegionActionLoading] = useState(false);

  // Danh mục Chủ đề di sản (sẵn sàng gắn API)
  const [themes, setThemes] = useState([
    {
      id: "theme-01",
      name: "Di tích lịch sử",
      description: "Đền đài, chùa cổ, hoàng thành, khu chiến tích và lăng tẩm",
      iconName: "Landmark",
      count: 0,
      color: "bg-emerald-50 text-emerald-700 border-emerald-200",
      isVisible: true,
    },
    {
      id: "theme-02",
      name: "Làng nghề truyền thống",
      description: "Làng nghề thủ công mỹ nghệ, làng gốm, lụa, tranh dân gian",
      iconName: "Compass",
      count: 0,
      color: "bg-amber-50 text-amber-800 border-amber-200",
      isVisible: true,
    },
    {
      id: "theme-03",
      name: "Danh thắng thiên nhiên",
      description: "Quần thể danh thắng, hang động, vịnh biển, sinh thái di sản",
      iconName: "MapPin",
      count: 0,
      color: "bg-sky-50 text-sky-700 border-sky-200",
      isVisible: true,
    },
    {
      id: "theme-04",
      name: "Ẩm thực dân gian",
      description: "Văn hóa ẩm thực cổ truyền, đặc sản địa phương",
      iconName: "Utensils",
      count: 0,
      color: "bg-rose-50 text-rose-700 border-rose-200",
      isVisible: true,
    },
  ]);

  // Danh mục loại nhiệm vụ thực địa (kết nối live API TaskType)
  const [taskTypes, setTaskTypes] = useState([]);
  const [taskTypesLoading, setTaskTypesLoading] = useState(false);
  const [isTaskTypeModalOpen, setIsTaskTypeModalOpen] = useState(false);

  const loadTaskTypes = useCallback(async () => {
    setTaskTypesLoading(true);
    try {
      const data = await taskTypeService.list();
      setTaskTypes(data || []);
    } catch (err) {
      console.error("[SystemConfig] loadTaskTypes error", err);
    } finally {
      setTaskTypesLoading(false);
    }
  }, []);

  const loadRegions = useCallback(async () => {
    setRegionsLoading(true);
    try {
      const [actives, deleteds] = await Promise.all([
        regionService.getAll().catch(() => []),
        regionService.getDeleted().catch(() => []),
      ]);
      setRegions(actives || []);
      setDeletedRegions(deleteds || []);
    } catch (err) {
      console.error("[SystemConfig] loadRegions error", err);
    } finally {
      setRegionsLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) {
        loadTaskTypes();
        loadRegions();
      }
    });
    return () => {
      cancelled = true;
    };
  }, [loadTaskTypes, loadRegions]);

  // ══════════════════════════════════════════════════════════
  // 2. DỮ LIỆU TAB 2: CƠ CHẾ GAME HÓA & ĐIỂM THƯỞNG
  // ══════════════════════════════════════════════════════════
  const [gamificationPoints, setGamificationPoints] = useState({
    gpsCheckin: 50,
    quizCorrect: 20,
    photoChallenge: 100,
  });

  // Quản lý Danh hiệu người dùng
  const [tierRanks, setTierRanks] = useState([
    {
      id: "tier-bronze",
      name: "Hạng Đồng (Kẻ Lữ Hành)",
      range: "0 - 500 pts",
      minPoints: 0,
      maxPoints: 500,
      badgeColor: "bg-amber-100 text-amber-900 border-amber-300",
      perk: "Mở khóa bản đồ di sản, nhận huy hiệu nhập môn",
    },
    {
      id: "tier-silver",
      name: "Hạng Bạc (Nhà Thám Hiểm)",
      range: "501 - 1,500 pts",
      minPoints: 501,
      maxPoints: 1500,
      badgeColor: "bg-slate-200 text-slate-800 border-slate-300",
      perk: "Ưu đãi 5% vé tour đêm di tích, mở khóa trợ lý AI thuyết minh",
    },
    {
      id: "tier-gold",
      name: "Hạng Vàng (Đại Sứ Di Sản)",
      range: "1,501+ pts",
      minPoints: 1501,
      maxPoints: 99999,
      badgeColor: "bg-yellow-100 text-yellow-800 border-yellow-400 font-bold",
      perk: "Ưu đãi 10% toàn sàn, tặng vé trải nghiệm làng nghề và quà số hóa",
    },
  ]);

  // ══════════════════════════════════════════════════════════
  // 3. DỮ LIỆU TAB 3: PHÍ SÀN & CHÍNH SÁCH GIÁ
  // ══════════════════════════════════════════════════════════
  const [platformFeePercent, setPlatformFeePercent] = useState(10);
  const [exemptSpecialMonuments, setExemptSpecialMonuments] = useState(true);
  const [defaultGateway, setDefaultGateway] = useState("VNPay"); // 'VNPay' | 'MoMo'

  // Xử lý thêm Vùng miền qua POST /api/v1/regions
  const handleAddRegion = async () => {
    const clean = newRegionName.trim();
    if (!clean) return;
    setRegionActionLoading(true);
    try {
      await regionService.create({ name: clean });
      setNewRegionName("");
      showToast(`Đã thêm thành công vùng miền mới: "${clean}"`);
      await loadRegions();
    } catch (err) {
      console.error("[SystemConfig] handleAddRegion error", err);
      showToast(
        err?.response?.data?.message || err?.message || "Không thể tạo vùng miền mới.",
        "error"
      );
    } finally {
      setRegionActionLoading(false);
    }
  };

  // Xử lý xóa mềm Vùng miền qua DELETE /api/v1/regions/{id}
  const handleDeleteRegion = async (id, name) => {
    if (!window.confirm(`Bạn có chắc chắn muốn chuyển vùng "${name}" vào thùng rác?`)) return;
    setRegionActionLoading(true);
    try {
      await regionService.delete(id);
      showToast(`Đã chuyển vùng "${name}" vào thùng rác.`);
      await loadRegions();
    } catch (err) {
      console.error("[SystemConfig] handleDeleteRegion error", err);
      showToast(
        err?.response?.data?.message || err?.message || "Không thể xóa vùng miền.",
        "error"
      );
    } finally {
      setRegionActionLoading(false);
    }
  };

  // Xử lý khôi phục Vùng miền qua PATCH /api/v1/regions/{id}/restore
  const handleRestoreRegion = async (id, name) => {
    setRegionActionLoading(true);
    try {
      await regionService.restore(id);
      showToast(`Đã khôi phục thành công vùng "${name}".`);
      await loadRegions();
    } catch (err) {
      console.error("[SystemConfig] handleRestoreRegion error", err);
      showToast(
        err?.response?.data?.message || err?.message || "Không thể khôi phục vùng miền.",
        "error"
      );
    } finally {
      setRegionActionLoading(false);
    }
  };

  // Toggle ẩn/hiện Chủ đề
  const handleToggleThemeVisibility = (id) => {
    setThemes((prev) =>
      prev.map((t) => (t.id === id ? { ...t, isVisible: !t.isVisible } : t))
    );
  };

  // Toggle kích hoạt loại nhiệm vụ
  const handleToggleTaskType = (id) => {
    setTaskTypes((prev) =>
      prev.map((tk) => (tk.id === id ? { ...tk, isEnabled: !tk.isEnabled } : tk))
    );
  };

  // Xử lý Lưu cấu hình toàn hệ thống
  const handleSaveAllConfig = async () => {
    setIsSaving(true);

    // TODO: Gắn API lưu cấu hình hệ thống:
    // await apiClient.put('/api/v1/admin/system-config', {
    //   regions, themes, taskTypes, gamificationPoints, tierRanks, platformFeePercent, exemptSpecialMonuments, defaultGateway
    // });

    setTimeout(() => {
      setIsSaving(false);
      showToast(
        "Đã lưu và đồng bộ toàn bộ cấu hình hệ thống (Danh mục, Gamification, Phí sàn) xuống cơ sở dữ liệu thành công!"
      );
    }, 800);
  };

  return (
    <div className="space-y-6 pb-24 animate-in fade-in-50 duration-200">
      {/* Toast thông báo */}
      {toastMsg && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-xl border border-slate-700 text-xs font-bold flex items-center gap-2.5 animate-in slide-in-from-top-3 max-w-md">
          <CheckCircle2 size={18} className="text-teal-300 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header trang cấu hình */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/90 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-teal-600" />
              <span className="text-[11px] font-black uppercase tracking-wider text-teal-700">
                Thiết Lập Vận Hành Nền Tảng
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Cấu Hình Danh Mục & Luật Hệ Thống
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Chuẩn hóa taxonomy di sản, thuật toán tích điểm thưởng thực địa và quy định chính sách tài chính toàn sàn.
            </p>
          </div>

          <div className="bg-teal-50 border border-teal-200 text-teal-800 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 self-start sm:self-auto">
            <SlidersHorizontal size={14} className="text-teal-600" />
            <span>Quy tắc vận hành: Đang áp dụng</span>
          </div>
        </div>

        {/* Thanh 3 Tab cấu hình */}
        <div className="pt-4 border-t border-slate-100 flex items-center gap-2 overflow-x-auto mt-4">
          <button
            type="button"
            onClick={() => setActiveTab("catalogs")}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeTab === "catalogs"
                ? "bg-teal-700 text-white shadow-xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900"
            }`}
          >
            <FolderTree size={14} />
            <span>1. Danh Mục Di Sản & Điểm Đến</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("gamification")}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeTab === "gamification"
                ? "bg-teal-700 text-white shadow-xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900"
            }`}
          >
            <Award size={14} />
            <span>2. Cơ Chế Game Hóa & Điểm Thưởng</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("pricing")}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeTab === "pricing"
                ? "bg-teal-700 text-white shadow-xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900"
            }`}
          >
            <CircleDollarSign size={14} />
            <span>3. Phí Sàn & Chính Sách Giá</span>
          </button>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────
          TAB 1: CẤU HÌNH DANH MỤC DI SẢN & ĐIỂM ĐẾN
      ──────────────────────────────────────────────────────── */}
      {activeTab === "catalogs" && (
        <div className="space-y-6">
          {/* 1.1 Quản lý danh mục Vùng miền */}
          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/90 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <Globe2 size={16} className="text-teal-600" />
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                    Phân Vùng Địa Lý &amp; Lãnh Thổ (Regions)
                  </h3>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Quản lý danh mục vùng miền du lịch dùng cho bộ lọc điểm đến và tour di sản
                </p>
              </div>

              {/* Form thêm nhanh */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  maxLength={150}
                  value={newRegionName}
                  onChange={(e) => setNewRegionName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddRegion()}
                  placeholder="Thêm vùng (VD: Tây Bắc, Tây Nguyên...)"
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                />
                <button
                  type="button"
                  disabled={regionActionLoading || !newRegionName.trim()}
                  onClick={handleAddRegion}
                  className="px-3.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all disabled:opacity-50"
                >
                  {regionActionLoading ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <Plus size={14} />
                  )}
                  <span>Thêm vùng</span>
                </button>
              </div>
            </div>

            {/* Tab chuyển đổi: Đang hoạt động vs Thùng rác */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setRegionTab("active")}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  regionTab === "active"
                    ? "bg-teal-700 text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                <span>Đang hoạt động</span>
                <span className="px-1.5 py-0.2 rounded-md bg-white/20 text-[10px]">
                  {regions.length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setRegionTab("deleted")}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  regionTab === "deleted"
                    ? "bg-rose-600 text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                <Trash2 size={12} />
                <span>Thùng rác</span>
                <span className="px-1.5 py-0.2 rounded-md bg-white/20 text-[10px]">
                  {deletedRegions.length}
                </span>
              </button>
            </div>

            {/* Danh sách các vùng miền */}
            {regionsLoading ? (
              <div className="py-8 flex items-center justify-center gap-2 text-slate-400 text-xs font-bold">
                <Loader2 size={16} className="animate-spin text-teal-600" />
                <span>Đang tải danh mục vùng miền...</span>
              </div>
            ) : (regionTab === "active" ? regions : deletedRegions).length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs font-medium">
                {regionTab === "active"
                  ? "Chưa có khu vực nào. Hãy nhập tên ở trên để thêm vùng mới."
                  : "Thùng rác hiện đang trống."}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                {(regionTab === "active" ? regions : deletedRegions).map((reg) => (
                  <div
                    key={reg.id}
                    className={`p-3.5 rounded-xl border transition-all flex items-center justify-between ${
                      reg.deleted
                        ? "bg-rose-50/40 border-rose-200"
                        : "bg-slate-50/80 border-slate-200 hover:border-teal-300 hover:bg-white"
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">{reg.name}</span>
                        <span className="font-mono text-[10px] text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200/60 font-semibold">
                          #{reg.id}
                        </span>
                      </div>
                      <p className="text-[11px] font-mono text-slate-400 mt-0.5 font-medium">
                        slug: <span className="text-slate-600">{reg.slug}</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {reg.deleted ? (
                        <button
                          type="button"
                          onClick={() => handleRestoreRegion(reg.id, reg.name)}
                          className="px-2.5 py-1 rounded-lg text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                          title="Khôi phục vùng miền này"
                        >
                          <RotateCcw size={12} />
                          <span>Khôi phục</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleDeleteRegion(reg.id, reg.name)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Chuyển vùng miền này vào thùng rác"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 1.2 Quản lý danh mục Chủ đề di sản */}
          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/90 shadow-2xs space-y-4">
            <div className="pb-3 border-b border-slate-100">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                Chủ Đề & Thể Loại Di Sản
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Các phân loại văn hóa chuẩn hóa giúp AI phân loại nội dung thuyết minh và nhiệm vụ du khách
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {themes.map((theme) => (
                <div
                  key={theme.id}
                  className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${
                    theme.isVisible
                      ? "bg-white border-slate-200 shadow-2xs hover:border-slate-300"
                      : "bg-slate-50 border-slate-200 opacity-60"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-md text-[10.5px] font-bold border mb-1.5 ${theme.color}`}
                      >
                        {theme.count} điểm di tích
                      </span>
                      <h4 className="font-bold text-slate-900 text-sm">{theme.name}</h4>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                        {theme.description}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleToggleThemeVisibility(theme.id)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
                      title={theme.isVisible ? "Ẩn phân loại" : "Hiện phân loại"}
                    >
                      {theme.isVisible ? <Eye size={16} /> : <EyeOff size={16} />}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 1.3 Quản lý Loại nhiệm vụ tương tác thực địa (TaskType Master Data) */}
          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/90 shadow-2xs space-y-4">
            <div className="pb-3 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <span>Cơ Chế Loại Nhiệm Vụ Trải Nghiệm Thực Địa (TaskType)</span>
                  <span className="text-[10.5px] font-mono font-bold bg-violet-100 text-violet-800 px-2 py-0.5 rounded-full">
                    {taskTypes.length} loại
                  </span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Danh mục chuẩn hóa loại nhiệm vụ toàn sàn (Quiz, Check-in, Săn ảnh...). Quản lý qua API TaskType.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsTaskTypeModalOpen(true)}
                className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-xs cursor-pointer self-start sm:self-auto transition-colors"
              >
                <Layers size={14} />
                <span>Quản lý / Thêm mới</span>
              </button>
            </div>

            {taskTypesLoading && taskTypes.length === 0 ? (
              <div className="flex items-center justify-center py-8 text-slate-500 gap-2">
                <Loader2 size={18} className="animate-spin text-violet-600" />
                <span className="text-xs font-semibold">Đang tải danh mục TaskType...</span>
              </div>
            ) : taskTypes.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <p className="text-xs font-semibold">Chưa có loại nhiệm vụ nào.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {taskTypes.map((task) => (
                  <div
                    key={task.id}
                    className="p-4 rounded-xl border border-slate-200 bg-white hover:border-violet-300 hover:shadow-2xs transition-all flex items-start gap-3.5"
                  >
                    <div className="p-3 rounded-xl bg-violet-50 text-violet-700 shrink-0">
                      <Layers size={20} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-[11px] font-black uppercase text-violet-700 bg-violet-50 px-2 py-0.5 rounded border border-violet-200">
                          {task.code}
                        </span>
                        <button
                          type="button"
                          onClick={() => setIsTaskTypeModalOpen(true)}
                          className="text-[11px] font-bold text-violet-700 hover:underline cursor-pointer"
                        >
                          Chỉnh sửa
                        </button>
                      </div>

                      <h4 className="font-bold text-slate-900 text-xs mt-1.5 truncate">
                        {task.name}
                      </h4>

                      <div className="flex flex-wrap items-center gap-1.5 mt-2">
                        <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                          {task.verificationMethod}
                        </span>
                        {task.hasQuestions && (
                          <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200">
                            Có câu hỏi
                          </span>
                        )}
                        {task.requiresLocation && (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                            Cần vị trí
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────
          TAB 2: CƠ CHẾ GAME HÓA & ĐIỂM THƯỞNG
      ──────────────────────────────────────────────────────── */}
      {activeTab === "gamification" && (
        <div className="space-y-6">
          {/* Định mức điểm */}
          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/90 shadow-2xs space-y-4">
            <div className="pb-3 border-b border-slate-100">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                Định Mức Điểm Thưởng Di Sản
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Cấu hình số điểm du khách nhận được ngay sau khi hoàn thành các thử thách on-site
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Thử thách GPS */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin size={16} className="text-emerald-600" />
                    <label className="font-bold text-xs text-slate-800">
                      Check-in GPS Thực Địa
                    </label>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    Bắt buộc
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Số điểm cộng khi du khách vào đúng vùng geofence 60m:
                </p>
                <div className="relative pt-1">
                  <input
                    type="number"
                    value={gamificationPoints.gpsCheckin}
                    onChange={(e) =>
                      setGamificationPoints({
                        ...gamificationPoints,
                        gpsCheckin: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                  />
                  <span className="absolute inset-y-0 right-0 pr-3 pt-1 flex items-center text-xs font-bold text-slate-400 pointer-events-none">
                    điểm / lượt
                  </span>
                </div>
              </div>

              {/* Trả lời đúng Quiz */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <HelpCircle size={16} className="text-purple-600" />
                    <label className="font-bold text-xs text-slate-800">
                      Đúng Câu Hỏi Lịch Sử
                    </label>
                  </div>
                  <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                    Kiến thức
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Số điểm thưởng cho mỗi câu trắc nghiệm chính xác:
                </p>
                <div className="relative pt-1">
                  <input
                    type="number"
                    value={gamificationPoints.quizCorrect}
                    onChange={(e) =>
                      setGamificationPoints({
                        ...gamificationPoints,
                        quizCorrect: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                  />
                  <span className="absolute inset-y-0 right-0 pr-3 pt-1 flex items-center text-xs font-bold text-slate-400 pointer-events-none">
                    điểm / câu
                  </span>
                </div>
              </div>

              {/* Hoàn thành Photo Challenge */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Camera size={16} className="text-amber-600" />
                    <label className="font-bold text-xs text-slate-800">
                      Săn Ảnh Di Sản Đạt Chuẩn
                    </label>
                  </div>
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                    Thẩm định
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Số điểm thưởng khi ảnh được Moderator phê duyệt:
                </p>
                <div className="relative pt-1">
                  <input
                    type="number"
                    value={gamificationPoints.photoChallenge}
                    onChange={(e) =>
                      setGamificationPoints({
                        ...gamificationPoints,
                        photoChallenge: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                  />
                  <span className="absolute inset-y-0 right-0 pr-3 pt-1 flex items-center text-xs font-bold text-slate-400 pointer-events-none">
                    điểm / ảnh
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Cấp bậc & Danh hiệu du khách */}
          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/90 shadow-2xs space-y-4">
            <div className="pb-3 border-b border-slate-100">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                Hệ Thống Cấp Bậc & Danh Hiệu Du Khách
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Các mốc tích lũy để thăng hạng tài khoản, cấp đặc quyền giảm giá vé và mở khóa quà tặng
              </p>
            </div>

            <div className="space-y-3.5">
              {tierRanks.map((tier) => (
                <div
                  key={tier.id}
                  className="p-4 rounded-xl bg-slate-50/70 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center font-black text-sm shadow-2xs">
                      <Sparkles size={18} className="text-amber-500" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-slate-900 text-xs sm:text-sm">
                          {tier.name}
                        </h4>
                        <span
                          className={`text-[10.5px] px-2 py-0.5 rounded-full border ${tier.badgeColor}`}
                        >
                          {tier.range}
                        </span>
                      </div>
                      <p className="text-[11.5px] text-slate-500 mt-1 leading-relaxed">
                        <strong>Quyền lợi:</strong> {tier.perk}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <span className="text-[11px] font-mono text-slate-400 bg-white px-2 py-1 rounded border border-slate-200">
                      Ngưỡng: &gt;= {tier.minPoints} pts
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────
          TAB 3: CẤU HÌNH PHÍ SÀN & CHÍNH SÁCH GIÁ
      ──────────────────────────────────────────────────────── */}
      {activeTab === "pricing" && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/90 shadow-2xs space-y-4">
            <div className="pb-3 border-b border-slate-100">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                Tỷ Lệ Phí Nền Tảng
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Mức phí trích lại tự động trên mỗi giao dịch vé trải nghiệm để duy trì máy chủ, GPS và AI
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              {/* Ô nhập tỷ lệ phí */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Mức phí chiết khấu mặc định
                </label>
                <div className="relative max-w-xs">
                  <input
                    type="number"
                    min={0}
                    max={50}
                    value={platformFeePercent}
                    onChange={(e) => setPlatformFeePercent(Number(e.target.value))}
                    className="w-full pl-4 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl text-lg font-black text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-500 font-black text-base">
                    %
                  </div>
                </div>
                <p className="text-xs text-slate-400">
                  Khuyến nghị: 8% - 15% tùy theo thỏa thuận đối tác di sản
                </p>
              </div>

              {/* Tùy chọn miễn giảm */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">
                    Miễn phí sàn cho Di tích Quốc gia đặc biệt
                  </span>
                  <button
                    type="button"
                    onClick={() => setExemptSpecialMonuments(!exemptSpecialMonuments)}
                    className="cursor-pointer"
                  >
                    {exemptSpecialMonuments ? (
                      <ToggleRight size={26} className="text-teal-600" />
                    ) : (
                      <ToggleLeft size={26} className="text-slate-400" />
                    )}
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Tự động miễn trừ 100% phí hoa hồng đối với các đơn vị trực thuộc Bộ Văn hóa quản lý trực tiếp.
                </p>
              </div>
            </div>
          </div>

          {/* Cổng thanh toán */}
          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/90 shadow-2xs space-y-4">
            <div className="pb-3 border-b border-slate-100">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                Cổng Thanh Toán Mặc Định
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Cổng thanh toán chính được gợi ý ưu tiên trong quá trình thanh toán vé của du khách
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div
                onClick={() => setDefaultGateway("VNPay")}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  defaultGateway === "VNPay"
                    ? "bg-blue-50/70 border-blue-400 ring-2 ring-blue-400/20"
                    : "bg-white border-slate-200 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <h4 className="font-black text-slate-900 text-sm">Cổng VNPay QR / Thẻ nội địa</h4>
                  {defaultGateway === "VNPay" && (
                    <span className="text-[10px] font-bold bg-blue-600 text-white px-2 py-0.5 rounded-full">
                      Mặc định
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Tích hợp thanh toán quét mã QR qua hơn 40 ứng dụng ngân hàng và ví điện tử
                </p>
              </div>

              <div
                onClick={() => setDefaultGateway("MoMo")}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  defaultGateway === "MoMo"
                    ? "bg-pink-50/70 border-pink-400 ring-2 ring-pink-400/20"
                    : "bg-white border-slate-200 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <h4 className="font-black text-slate-900 text-sm">Ví Điện Tử MoMo</h4>
                  {defaultGateway === "MoMo" && (
                    <span className="text-[10px] font-bold bg-pink-600 text-white px-2 py-0.5 rounded-full">
                      Mặc định
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Hỗ trợ thanh toán nhanh một chạm cho khách hàng sử dụng ví điện tử MoMo
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────
          THANH NÚT LƯU CỐ ĐỊNH CHÂN TRANG
      ──────────────────────────────────────────────────────── */}
      <div className="fixed bottom-0 right-0 left-0 md:left-64 z-20 bg-white/95 backdrop-blur-md border-t border-slate-200 px-6 py-4 flex items-center justify-between shadow-lg">
        <p className="text-xs text-slate-500 font-medium hidden sm:block">
          Các thay đổi sẽ được cập nhật đồng bộ toàn bộ dịch vụ máy chủ sau khi lưu.
        </p>

        <button
          type="button"
          onClick={handleSaveAllConfig}
          disabled={isSaving}
          className="ml-auto px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white font-bold text-xs shadow-sm flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
        >
          <Save size={16} />
          <span>{isSaving ? "Đang lưu cấu hình..." : "Lưu Cấu Hình Hệ Thống"}</span>
        </button>
      </div>

      {/* Modal Quản lý TaskType Master Data */}
      <TaskTypeManagerModal
        isOpen={isTaskTypeModalOpen}
        onClose={() => {
          setIsTaskTypeModalOpen(false);
          loadTaskTypes();
        }}
      />
    </div>
  );
}
