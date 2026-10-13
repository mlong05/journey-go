"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Camera,
  MessageSquare,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  User,
  ShieldAlert,
  Award,
  Sparkles,
  MapPin,
  Eye,
  Trash2,
  Check,
  X,
  Flag,
  RotateCcw,
  Inbox,
} from "lucide-react";

/**
 * Trang Kiểm Duyệt Ảnh Thực Địa & Bài Viết Cộng Đồng - JourneyGo
 * Đường dẫn: /moderator/community
 * - Duyệt ảnh nhiệm vụ du khách check-in thực địa để trả điểm thưởng
 * - Xử lý bài viết và bình luận bị báo cáo sai sự thật hoặc vi phạm thuần phong mỹ tục
 * - Dynamic state sẵn sàng kết nối API (không mock data tĩnh)
 * - Đảm bảo ngôn ngữ thuần Việt, không chứa chữ tiếng Anh trong ngoặc đơn
 */
export default function ModeratorCommunityPage() {
  const [activeTab, setActiveTab] = useState("photos"); // 'photos' | 'posts'
  const [toastMsg, setToastMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Dynamic state cho ảnh nhiệm vụ & bài viết cộng đồng - gắn API sau
  const [photos, setPhotos] = useState([]);
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    // [API INTEGRATION] Gắn hàm gọi API lấy danh sách ảnh và bài viết cần duyệt
    // async function fetchCommunityData() {
    //   setIsLoading(true);
    //   try {
    //     const [photosRes, postsRes] = await Promise.all([
    //       api.get("/moderator/community-photos"),
    //       api.get("/moderator/flagged-posts"),
    //     ]);
    //     setPhotos(photosRes.data);
    //     setPosts(postsRes.data);
    //   } catch (err) {
    //     console.error("Lỗi tải dữ liệu cộng đồng:", err);
    //   } finally {
    //     setIsLoading(false);
    //   }
    // }
    // fetchCommunityData();
  }, []);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3500);
  };

  // Thao tác duyệt ảnh nhiệm vụ
  const handleApprovePhoto = (id, points, name) => {
    // [API INTEGRATION] Gọi API duyệt ảnh và cộng điểm
    // api.post(`/moderator/community-photos/${id}/approve`, { rewardPoints: points })
    setPhotos((prev) => prev.filter((item) => item.id !== id));
    showToast(`Đã duyệt ảnh của du khách ${name} và cộng ${points} điểm thưởng thành công.`);
  };

  // Thao tác từ chối ảnh
  const handleRejectPhoto = (id, name) => {
    // [API INTEGRATION] Gọi API từ chối ảnh
    // api.post(`/moderator/community-photos/${id}/reject`)
    setPhotos((prev) => prev.filter((item) => item.id !== id));
    showToast(`Đã từ chối ảnh thử thách của ${name} (Không đạt chuẩn góc chụp).`);
  };

  // Thao tác xử lý bài viết vi phạm: Gỡ bài
  const handleRemovePost = (id) => {
    // [API INTEGRATION] Gọi API gỡ bài viết
    // api.post(`/moderator/flagged-posts/${id}/remove`)
    setPosts((prev) => prev.filter((item) => item.id !== id));
    showToast("Đã gỡ bài viết vi phạm và gửi cảnh cáo tới tài khoản du khách.");
  };

  // Thao tác bỏ qua báo cáo bài viết
  const handleDismissPost = (id) => {
    // [API INTEGRATION] Gọi API bỏ qua báo cáo
    // api.post(`/moderator/flagged-posts/${id}/dismiss`)
    setPosts((prev) => prev.filter((item) => item.id !== id));
    showToast("Đã đóng báo cáo (Bài viết hợp lệ, không vi phạm quy định).");
  };

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-200">
      {/* Toast thông báo */}
      {toastMsg && (
        <div className="fixed top-5 right-5 z-50 bg-teal-800 text-white px-4 py-2.5 rounded-2xl shadow-xl border border-teal-600 text-xs font-bold flex items-center gap-2 animate-in slide-in-from-top-3">
          <CheckCircle2 size={16} className="text-teal-300" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────
          1. HEADER & CHUYỂN TAB DUYỆT
      ──────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/90 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2.5 h-2.5 rounded-full bg-teal-500" />
              <span className="text-[11px] font-black uppercase tracking-wider text-teal-700">
                Ban Kiểm Duyệt Nội Dung Du Khách
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Kiểm Duyệt Ảnh Thực Địa & Bài Viết Cộng Đồng
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Thẩm định chất lượng ảnh nhiệm vụ săn ảnh thực địa nhận điểm thưởng và rà soát bài viết bị báo cáo vi phạm
            </p>
          </div>
        </div>

        {/* Hai Tab chuyển đổi */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={() => setActiveTab("photos")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === "photos"
                ? "bg-teal-600 text-white shadow-xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200/80"
            }`}
          >
            <Camera size={15} />
            <span>Thử thách Săn ảnh Thực địa ({photos.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("posts")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === "posts"
                ? "bg-teal-600 text-white shadow-xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200/80"
            }`}
          >
            <MessageSquare size={15} />
            <span>Bài viết & Nhật ký Báo cáo ({posts.length})</span>
          </button>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────
          2. NỘI DUNG TAB 1: THỬ THÁCH SĂN ẢNH THỰC ĐỊA
      ──────────────────────────────────────────────────────── */}
      {activeTab === "photos" && (
        <div>
          {photos.length === 0 ? (
            <div className="bg-white rounded-2xl p-16 text-center border border-slate-200 shadow-2xs space-y-3">
              <div className="w-14 h-14 bg-slate-100 text-slate-400 rounded-full mx-auto flex items-center justify-center">
                <Inbox size={28} />
              </div>
              <h3 className="text-base font-bold text-slate-800">
                Không có ảnh thử thách nào đang chờ duyệt
              </h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Khi du khách hoàn thành nhiệm vụ check-in tại các điểm di tích thực địa, ảnh gửi về sẽ hiển thị tại đây để bạn thẩm định và trao điểm thưởng.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              {photos.map((item) => (
                <div
                  key={item.id}
                  className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden hover:border-teal-300 transition-all flex flex-col justify-between"
                >
                  <div className="p-3.5 space-y-2.5">
                    {/* Header card: Thông tin du khách */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-teal-100 text-teal-800 font-bold text-xs flex items-center justify-center">
                          {item.touristAvatar || "DK"}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-800 truncate max-w-[130px]">
                            {item.touristName}
                          </p>
                          <p className="text-[10px] text-slate-400">{item.submittedTime}</p>
                        </div>
                      </div>

                      <span className="text-[10px] font-black text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 flex items-center gap-1">
                        <Award size={11} />
                        <span>+{item.rewardPoints || 100} điểm</span>
                      </span>
                    </div>

                    {/* Tiêu đề thử thách & địa điểm */}
                    <div>
                      <h4 className="text-xs font-black text-slate-900 line-clamp-1">
                        {item.challengeTitle}
                      </h4>
                      <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                        <MapPin size={11} className="text-teal-600 shrink-0" />
                        <span className="truncate">{item.destination}</span>
                      </p>
                    </div>

                    {/* Ảnh du khách chụp */}
                    <div className="relative rounded-xl overflow-hidden aspect-[4/3] bg-slate-100 border border-slate-200">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.userPhoto || "/image/vanmieu.png"}
                        alt={item.challengeTitle}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.src = "/image/vanmieu.png";
                        }}
                      />
                    </div>

                    {/* Ghi chú góc chụp nếu có */}
                    {item.note && (
                      <p className="text-[11px] text-slate-500 italic bg-slate-50 p-2 rounded-lg border border-slate-200/70">
                        {item.note}
                      </p>
                    )}
                  </div>

                  {/* 2 nút thao tác duyệt / từ chối */}
                  <div className="p-3 bg-slate-50/70 border-t border-slate-100 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleRejectPhoto(item.id, item.touristName)}
                      className="py-1.5 px-2 rounded-xl bg-white hover:bg-rose-50 text-rose-700 border border-slate-200 hover:border-rose-200 font-bold text-xs flex items-center justify-center gap-1 transition-colors cursor-pointer"
                    >
                      <X size={13} />
                      <span>Từ chối</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleApprovePhoto(item.id, item.rewardPoints || 100, item.touristName)}
                      className="py-1.5 px-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs flex items-center justify-center gap-1 shadow-2xs transition-colors cursor-pointer"
                    >
                      <Check size={13} />
                      <span>Duyệt & Tặng</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ────────────────────────────────────────────────────────
          3. NỘI DUNG TAB 2: BÀI VIẾT CỘNG ĐỒNG BỊ BÁO CÁO
      ──────────────────────────────────────────────────────── */}
      {activeTab === "posts" && (
        <div className="space-y-4">
          {posts.length === 0 ? (
            <div className="bg-white rounded-2xl p-16 text-center border border-slate-200 shadow-2xs space-y-3">
              <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full mx-auto flex items-center justify-center">
                <CheckCircle2 size={32} />
              </div>
              <h3 className="text-base font-bold text-slate-800">
                Không có bài viết nào bị báo cáo vi phạm
              </h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Cộng đồng du khách hoạt động văn minh. Các báo cáo vi phạm về nội dung sai lệch hoặc ngôn từ không phù hợp sẽ được tập hợp tại đây.
              </p>
            </div>
          ) : (
            posts.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs space-y-3.5"
              >
                {/* Header bài viết */}
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center">
                      {item.authorAvatar || "DK"}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">{item.authorName}</p>
                      <p className="text-[10px] text-slate-400">{item.createdAt}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200 flex items-center gap-1">
                      <Flag size={11} />
                      <span>{item.reportReason || "Bị báo cáo"}</span>
                    </span>
                    <span className="text-xs text-slate-400">
                      {item.reportCount || 1} lượt báo cáo
                    </span>
                  </div>
                </div>

                {/* Nội dung bài viết */}
                <p className="text-xs text-slate-800 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200/70">
                  {item.content}
                </p>

                {/* Nút hành động */}
                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => handleDismissPost(item.id)}
                    className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs transition-colors cursor-pointer"
                  >
                    Bỏ qua báo cáo
                  </button>

                  <button
                    type="button"
                    onClick={() => handleRemovePost(item.id)}
                    className="px-4 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Trash2 size={13} />
                    <span>Gỡ bỏ bài viết</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
