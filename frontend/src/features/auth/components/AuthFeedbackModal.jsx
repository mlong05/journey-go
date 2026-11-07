"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Compass, Check, Sparkles } from "lucide-react";

/**
 * Modal Phản hồi Xác thực Thành công mang đậm bản sắc Di sản & Du lịch trải nghiệm JourneyGo
 * Tối giản, thanh lịch, tinh gọn theo yêu cầu:
 * - Giữ lại logo JourneyGo, huy hiệu con dấu di sản, tiêu đề và vai trò
 * - Bỏ dòng lời chào dài và ô không gian đích đến
 */
export default function AuthFeedbackModal({ feedbackModal }) {
  if (!feedbackModal?.isOpen) return null;

  const isRegister = feedbackModal.type === "register";

  return (
    <AnimatePresence>
      {feedbackModal.isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md bg-slate-950/50 select-none font-jakarta font-sans antialiased"
        >
          {/* Card chính phong cách Thẻ Hành Trình (Journey Pass) tinh gọn */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -12 }}
            transition={{ type: "spring", damping: 28, stiffness: 360 }}
            className="max-w-[380px] w-full bg-white rounded-[28px] p-6 sm:p-7 shadow-[0_25px_70px_-15px_rgba(0,159,227,0.25),0_15px_30px_-10px_rgba(15,23,42,0.1)] border border-emerald-100/90 text-center relative overflow-hidden"
          >
            {/* Vầng sáng ambient di sản tỏa nhẹ ở hai góc */}
            <div className="absolute -top-16 -right-16 w-36 h-36 bg-amber-200/40 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-16 -left-16 w-36 h-36 bg-amber-200/35 rounded-full blur-3xl pointer-events-none" />

            {/* Logo Thương hiệu JourneyGo nhỏ gọn tinh tế ở góc trên */}
            <div className="flex items-center justify-center gap-1.5 pb-4 text-[11px] font-bold tracking-wider uppercase text-slate-400">
              <Compass className="w-3.5 h-3.5 text-emerald-800" />
              <span>JourneyGo • Hành Trình Di Sản</span>
            </div>

            {/* Huy hiệu Ấn Chỉ Di Sản (Heritage Seal Badge) */}
            <div className="relative mx-auto mb-4 w-20 h-20 flex items-center justify-center">
              {/* Vòng hào quang xoay nhẹ */}
              <motion.div
                initial={{ rotate: 0 }}
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 rounded-full border border-dashed border-emerald-600/40"
              />

              {/* Vòng nền gradient đôi cao cấp */}
              <motion.div
                initial={{ scale: 0.7, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.45, ease: "easeOut" }}
                className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-600 to-amber-400 p-0.5 shadow-lg shadow-emerald-900/20 flex items-center justify-center"
              >
                <div className="w-full h-full bg-white rounded-[14px] flex items-center justify-center relative overflow-hidden">
                  <div className="absolute inset-0 bg-emerald-50/60" />
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{
                      delay: 0.15,
                      type: "spring",
                      stiffness: 400,
                      damping: 18,
                    }}
                    className="relative z-10 w-9 h-9 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-sm"
                  >
                    <Check className="w-5 h-5 stroke-[2.5]" />
                  </motion.div>
                </div>
              </motion.div>
            </div>

            {/* Tiêu đề & Vai trò định danh */}
            <div className="space-y-1.5 relative z-10">
              <h3 className="text-xl font-extrabold text-slate-900 tracking-tight leading-tight">
                {isRegister
                  ? "Khởi Tạo Tài Khoản Thành Công!"
                  : "Xác Thực Hành Trình Thành Công!"}
              </h3>

              {/* Huy hiệu định danh vai trò chuyên môn */}
              {feedbackModal.roleBadge && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-amber-200/70 shadow-2xs my-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>{feedbackModal.roleBadge}</span>
                </div>
              )}
            </div>

            {/* Thanh dẫn tiến trình chuyển tiếp tinh tế */}
            <div className="mt-5 pt-1 relative z-10">
              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: "0%" }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 1.25, ease: "easeInOut" }}
                  className="h-full bg-gradient-to-r from-emerald-600 to-teal-400 rounded-full"
                />
              </div>

              <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400 mt-2.5 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-700 animate-ping" />
                <span>Đang kết nối phiên làm việc, vui lòng chờ giây lát...</span>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
