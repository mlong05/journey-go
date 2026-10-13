"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Sparkles } from "lucide-react";

/**
 * Modal phản hồi xác thực & chuyển hướng cao cấp
 * Thay thế toàn bộ alert() mặc định, có hiệu ứng nảy icon và Progress Bar 1.2s
 */
export default function AuthFeedbackModal({ feedbackModal }) {
  return (
    <AnimatePresence>
      {feedbackModal?.isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md bg-black/40 select-none"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -10 }}
            transition={{ type: "spring", damping: 25, stiffness: 350 }}
            className="max-w-sm w-full bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 text-center relative overflow-hidden select-none"
          >
            {/* Vòng sáng phản chiếu mềm mại trên nền thẻ */}
            <div className="absolute -top-12 -right-12 w-32 h-32 bg-emerald-100/50 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-sky-100/50 rounded-full blur-2xl pointer-events-none" />

            {/* Icon chuyển động: Vòng tròn xanh ngọc lục bảo nảy nhẹ */}
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: [0.8, 1.05, 1] }}
              transition={{ duration: 0.45, ease: "easeOut" }}
              className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-100 mx-auto flex items-center justify-center text-emerald-600 mb-3.5 shadow-sm"
            >
              <CheckCircle2 className="w-8 h-8 text-emerald-600 drop-shadow-xs" />
            </motion.div>

            {/* Nội dung thông báo theo từng ngữ cảnh */}
            <div className="space-y-1 relative z-10">
              <h3 className="text-base font-black text-slate-800">
                {feedbackModal.title}
              </h3>

              {/* Huy hiệu vai trò cho Đăng nhập thành công */}
              {feedbackModal.type === "login" && feedbackModal.roleBadge && (
                <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200/80 my-1">
                  <Sparkles className="w-3 h-3 text-emerald-600" />
                  <span>{feedbackModal.roleBadge}</span>
                </div>
              )}

              {/* Tag quà tặng cho Đăng ký thành công */}
              {feedbackModal.type === "register" && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  className="bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-bold py-1.5 px-3 rounded-xl my-2.5 inline-block shadow-2xs"
                >
                  🎉 Đã cộng +100 điểm thưởng khám phá vào ví di sản của bạn!
                </motion.div>
              )}

              <p className="text-xs text-slate-500 leading-relaxed pt-0.5">
                {feedbackModal.subtitle}
              </p>
            </div>

            {/* Thanh tiến trình thời gian thực (Progress Bar): 0% -> 100% trong 1.2s */}
            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden mt-4">
              <motion.div
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ duration: 1.2, ease: "easeInOut" }}
                className="h-full bg-gradient-to-r from-emerald-500 to-sky-500 rounded-full"
              />
            </div>

            {/* Trạng thái tiến trình */}
            <div className="flex items-center justify-center text-[10px] text-slate-400 mt-2 font-medium">
              <span>Đang điều hướng, vui lòng chờ giây lát...</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
