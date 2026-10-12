"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Loader2, Sparkles } from "lucide-react";


export function LogoutModal({ isOpen, status = "success", message }) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-md"
      >
        <motion.div
          initial={{ scale: 0.9, y: 15, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.95, y: -10, opacity: 0 }}
          transition={{ type: "spring", stiffness: 350, damping: 25 }}
          className="bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 max-w-sm w-full text-center relative overflow-hidden select-none"
        >
          {/* Vầng sáng ambient mờ ảo */}
          <div className="absolute -top-12 -right-12 w-32 h-32 bg-emerald-100/50 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-rose-100/30 rounded-full blur-2xl pointer-events-none" />

          {/* Icon chuyển động */}
          <div className="flex justify-center mb-4 relative z-10">
            <motion.div
              initial={{ scale: 0, rotate: -30 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg border ${status === "loading"
                  ? "bg-slate-50 text-slate-700 border-slate-200"
                  : "bg-emerald-50 text-emerald-600 border-emerald-100 shadow-emerald-500/10"
                }`}
            >
              {status === "loading" ? (
                <Loader2 className="w-8 h-8 animate-spin text-slate-600" />
              ) : (
                <CheckCircle2 className="w-8 h-8 text-emerald-600" />
              )}
            </motion.div>
          </div>

          {/* Nội dung thông báo */}
          <div className="space-y-1 relative z-10">
            <h3 className="text-base font-black text-slate-800">
              {status === "loading" ? "Đang xử lý đăng xuất..." : "Đăng xuất thành công!"}
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed pt-0.5">
              {message || "Đang đăng xuất"}
            </p>
          </div>

          {/* Thanh tiến trình thời gian thực 0% -> 100% trong 1.0s */}
          <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden mt-4">
            <motion.div
              initial={{ width: "0%" }}
              animate={{ width: "100%" }}
              transition={{ duration: 1.0, ease: "easeInOut" }}
              className="h-full bg-gradient-to-r from-emerald-500 to-sky-500 rounded-full"
            />
          </div>

          {/* Trạng thái tiến trình */}
          <div className="flex items-center justify-center text-[10px] text-slate-400 mt-2 font-medium">
            <span></span>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default LogoutModal;
