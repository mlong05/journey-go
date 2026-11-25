"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Sparkles,
  ArrowLeft,
  Calendar,
  Users,
  Coins,
  MapPin,
  FileText,
  AlertCircle,
  CheckCircle2,
  Send,
  Loader2,
} from "lucide-react";
import AccountLayout from "./AccountLayout";
import { touristService } from "../services/touristService";
import { ROUTES } from "@/constants/routes";

export default function NewTourRequestScreen() {
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    preferredDestination: "",
    preferredDateFrom: "",
    preferredDateTo: "",
    guestCount: 2,
    budgetMin: "",
    budgetMax: "",
    specialRequirements: "",
    description: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!formData.title.trim()) {
      setError("Vui lòng nhập tiêu đề yêu cầu tour");
      return;
    }
    if (!formData.description.trim()) {
      setError("Vui lòng nhập mô tả chi tiết mong muốn");
      return;
    }
    if (formData.preferredDateFrom && formData.preferredDateTo) {
      if (new Date(formData.preferredDateFrom) > new Date(formData.preferredDateTo)) {
        setError("Ngày kết thúc phải sau hoặc cùng ngày bắt đầu");
        return;
      }
    }
    if (formData.budgetMin && formData.budgetMax) {
      if (Number(formData.budgetMin) > Number(formData.budgetMax)) {
        setError("Ngân sách tối đa phải lớn hơn hoặc bằng ngân sách tối thiểu");
        return;
      }
    }

    try {
      setLoading(true);
      const payload = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        preferredDestination: formData.preferredDestination.trim() || null,
        preferredDateFrom: formData.preferredDateFrom || null,
        preferredDateTo: formData.preferredDateTo || null,
        guestCount: formData.guestCount ? Number(formData.guestCount) : null,
        budgetMin: formData.budgetMin ? Number(formData.budgetMin) : null,
        budgetMax: formData.budgetMax ? Number(formData.budgetMax) : null,
        specialRequirements: formData.specialRequirements.trim() || null,
      };

      await touristService.createTourRequest(payload);
      setSuccess(true);
      setTimeout(() => {
        router.push(ROUTES.ACCOUNT_TOUR_REQUESTS);
      }, 1500);
    } catch (err) {
      setError(err?.message || "Không thể gửi yêu cầu tạo tour. Vui lòng thử lại sau.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AccountLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Link
            href={ROUTES.ACCOUNT_TOUR_REQUESTS}
            className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-800 transition"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="text-teal-600" size={22} />
              Tạo yêu cầu tour theo nhu cầu
            </h1>
            <p className="text-xs text-slate-500">
              Đăng mong muốn của bạn để các đối tác nhà tour thiết kế lịch trình riêng dành riêng cho bạn
            </p>
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            <AlertCircle size={18} className="shrink-0 mt-0.5 text-rose-600" />
            <div>
              <p className="font-semibold">Đã xảy ra lỗi</p>
              <p>{error}</p>
            </div>
          </div>
        )}

        {success && (
          <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            <CheckCircle2 size={20} className="shrink-0 text-emerald-600" />
            <p className="font-semibold">Đăng yêu cầu thành công! Đang chuyển hướng về danh sách...</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 space-y-6">
          <div className="space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-teal-800 flex items-center gap-2">
              <FileText size={16} /> 1. Thông tin tổng quan
            </h2>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Tiêu đề yêu cầu <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                name="title"
                required
                maxLength={200}
                placeholder="VD: Cần thiết kế tour khám phá Đà Lạt 3 ngày 2 đêm cho gia đình"
                value={formData.title}
                onChange={handleChange}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:border-teal-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Địa điểm / Vùng mong muốn
              </label>
              <div className="relative">
                <MapPin size={16} className="absolute left-3.5 top-3 text-slate-400" />
                <input
                  type="text"
                  name="preferredDestination"
                  maxLength={500}
                  placeholder="VD: Đà Lạt, Nha Trang, Phú Quốc..."
                  value={formData.preferredDestination}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-200 pl-10 pr-3.5 py-2.5 text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:border-teal-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-5 space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-teal-800 flex items-center gap-2">
              <Calendar size={16} /> 2. Thời gian & Số lượng khách
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Ngày bắt đầu dự kiến</label>
                <input
                  type="date"
                  name="preferredDateFrom"
                  min={today}
                  value={formData.preferredDateFrom}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-medium text-slate-800 focus:border-teal-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Ngày kết thúc dự kiến</label>
                <input
                  type="date"
                  name="preferredDateTo"
                  min={formData.preferredDateFrom || today}
                  value={formData.preferredDateTo}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-medium text-slate-800 focus:border-teal-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Số lượng khách</label>
                <div className="relative">
                  <Users size={16} className="absolute left-3.5 top-3 text-slate-400" />
                  <input
                    type="number"
                    name="guestCount"
                    min={1}
                    max={500}
                    value={formData.guestCount}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-slate-200 pl-10 pr-3.5 py-2.5 text-sm font-medium text-slate-800 focus:border-teal-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-5 space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-teal-800 flex items-center gap-2">
              <Coins size={16} /> 3. Ngân sách dự kiến (VND / người hoặc cả nhóm)
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Ngân sách tối thiểu (VND)</label>
                <input
                  type="number"
                  name="budgetMin"
                  min={0}
                  step={50000}
                  placeholder="VD: 2000000"
                  value={formData.budgetMin}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:border-teal-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Ngân sách tối đa (VND)</label>
                <input
                  type="number"
                  name="budgetMax"
                  min={0}
                  step={50000}
                  placeholder="VD: 5000000"
                  value={formData.budgetMax}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:border-teal-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-5 space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-teal-800 flex items-center gap-2">
              <FileText size={16} /> 4. Nội dung & Yêu cầu chi tiết
            </h2>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Mô tả chi tiết mong muốn <span className="text-rose-500">*</span>
              </label>
              <textarea
                name="description"
                required
                rows={4}
                maxLength={5000}
                placeholder="Mô tả cụ thể lịch trình bạn kỳ vọng, các điểm nhấn muốn ghé thăm, trải nghiệm ẩm thực, phương tiện ưa thích..."
                value={formData.description}
                onChange={handleChange}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:border-teal-500 focus:outline-none resize-y"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Yêu cầu đặc biệt (nếu có)
              </label>
              <textarea
                name="specialRequirements"
                rows={2}
                maxLength={2000}
                placeholder="VD: Ăn chay, phòng khách sạn view núi, có xe đưa đón sân bay, người lớn tuổi đi cùng..."
                value={formData.specialRequirements}
                onChange={handleChange}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:border-teal-500 focus:outline-none resize-y"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3">
            <Link
              href={ROUTES.ACCOUNT_TOUR_REQUESTS}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition"
            >
              Hủy
            </Link>
            <button
              type="submit"
              disabled={loading || success}
              className="inline-flex items-center gap-2 rounded-xl bg-teal-700 px-6 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-teal-800 disabled:opacity-50 transition cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Đang gửi...
                </>
              ) : (
                <>
                  <Send size={16} />
                  Đăng yêu cầu
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </AccountLayout>
  );
}
