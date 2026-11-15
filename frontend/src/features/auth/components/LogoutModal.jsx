"use client";

import React from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Check } from "lucide-react";

/**
 * Hộp thông báo đăng xuất: chỉ dấu tích + một dòng "Đăng xuất thành công"
 * ("Đang đăng xuất…" khi đang gọi API) + thanh tiến trình trong lúc chuyển trang.
 * Dùng chung cho trang du khách và khu quản trị / kiểm duyệt / đối tác.
 */
export function LogoutModal({ isOpen, status = "success" }) {
  if (!isOpen || typeof document === "undefined") return null;

  const isLoading = status === "loading";

  // Gắn thẳng vào <body>: header có backdrop-blur khiến position:fixed bên trong bị định vị theo header.
  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md bg-slate-950/50 select-none font-sans antialiased"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 18 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -12 }}
          transition={{ type: "spring", damping: 28, stiffness: 360 }}
          className="max-w-[380px] w-full bg-white rounded-[28px] p-6 sm:p-7 shadow-[0_25px_70px_-15px_rgba(0,159,227,0.25),0_15px_30px_-10px_rgba(15,23,42,0.1)] border border-sky-100/90 text-center relative overflow-hidden"
        >
          {/* Vầng sáng ambient nhẹ nhàng */}
          <div className="absolute -top-16 -right-16 w-36 h-36 bg-sky-200/40 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-16 -left-16 w-36 h-36 bg-blue-100/40 rounded-full blur-3xl pointer-events-none" />

          {/* Huy hiệu trung tâm */}
          <div className="relative mx-auto mb-4 w-20 h-20 flex items-center justify-center">
            {/* Vòng viền xoay nhẹ khi loading hoặc cố định khi thành công */}
            <motion.div
              initial={{ rotate: 0 }}
              animate={{ rotate: isLoading ? 360 : 0 }}
              transition={
                isLoading
                  ? { duration: 2.5, repeat: Infinity, ease: "linear" }
                  : { duration: 0.4 }
              }
              className="absolute inset-0 rounded-full border border-dashed border-[#009fe3]/40"
            />

            <motion.div
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#009fe3] to-sky-400 p-0.5 shadow-lg shadow-[#009fe3]/30 flex items-center justify-center"
            >
              <div className="w-full h-full bg-white rounded-[14px] flex items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 bg-sky-50/60" />
                {isLoading ? (
                  <Loader2 className="w-7 h-7 text-[#009fe3] animate-spin relative z-10" />
                ) : (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{
                      type: "spring",
                      stiffness: 400,
                      damping: 18,
                    }}
                    className="relative z-10 w-9 h-9 rounded-full bg-gradient-to-tr from-[#009fe3] to-teal-500 flex items-center justify-center text-white shadow-sm"
                  >
                    <Check className="w-5 h-5 stroke-[2.5]" />
                  </motion.div>
                )}
              </div>
            </motion.div>
          </div>

          {/* Chỉ một dòng thông báo */}
          <h3 role="status" className="relative z-10 text-xl font-extrabold text-slate-900 tracking-tight leading-tight">
            {isLoading ? "Đang đăng xuất…" : "Đăng xuất thành công"}
          </h3>

          {/* Thanh tiến trình trong lúc chuyển trang */}
          <div className="mt-5 relative z-10 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: "0%" }}
              animate={{ width: "100%" }}
              transition={{ duration: 1.0, ease: "easeInOut" }}
              className="h-full bg-gradient-to-r from-[#009fe3] to-teal-400 rounded-full"
            />
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  , document.body);
}

export default LogoutModal;
