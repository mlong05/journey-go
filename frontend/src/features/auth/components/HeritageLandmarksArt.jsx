"use client";

import React from "react";

/**
 * Đồ họa vector hình bóng các danh thắng / di sản ở chân trang đăng nhập
 * Phục dựng tỉ mỉ theo mẫu thiết kế Hình 2:
 * - Góc trái: Quần thể di sản mái vòm & tháp nhọn (Taj Mahal / đền đài di sản phương Đông)
 * - Góc phải: Tháp nghiêng Pisa nghiêng đặc trưng & Nhà thờ chính tòa hai tháp
 */
export default function HeritageLandmarksArt() {
  return (
    <div
      aria-hidden="true"
      className="absolute bottom-0 inset-x-0 pointer-events-none select-none z-0 flex items-end justify-between overflow-hidden h-24 sm:h-28 md:h-32 px-1 sm:px-2"
    >
      {/* Cụm danh thắng bên trái (Taj Mahal & Di sản Phương Đông) */}
      <svg
        className="h-20 sm:h-24 md:h-28 w-auto text-[#009fe3] shrink-0 opacity-90"
        viewBox="0 0 200 120"
        fill="currentColor"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Nền cong viền chân trang */}
        <path d="M0,120 L200,120 L200,110 Q140,110 80,115 Q30,118 0,120 Z" />

        {/* Tháp nhọn bên trái */}
        <rect x="10" y="45" width="8" height="75" rx="1" />
        <polygon points="14,20 8,45 20,45" />
        <circle cx="14" cy="18" r="2.5" />
        {/* Tầng ban công tháp trái */}
        <rect x="8" y="55" width="12" height="3" fill="#ffffff" />
        <rect x="8" y="75" width="12" height="3" fill="#ffffff" />
        <rect x="8" y="95" width="12" height="3" fill="#ffffff" />

        {/* Tháp nhọn bên phải */}
        <rect x="142" y="45" width="8" height="75" rx="1" />
        <polygon points="146,20 140,45 152,45" />
        <circle cx="146" cy="18" r="2.5" />
        {/* Tầng ban công tháp phải */}
        <rect x="140" y="55" width="12" height="3" fill="#ffffff" />
        <rect x="140" y="75" width="12" height="3" fill="#ffffff" />
        <rect x="140" y="95" width="12" height="3" fill="#ffffff" />

        {/* Khối đế đền chính */}
        <rect x="25" y="65" width="110" height="55" rx="2" />

        {/* Mái vòm trung tâm (Dome) */}
        <path d="M60,65 C60,35 70,12 80,5 C90,12 100,35 100,65 Z" />
        <polygon points="80,0 78,5 82,5" />
        <circle cx="80" cy="0" r="1.5" />

        {/* 2 Mái vòm nhỏ hai bên */}
        <path d="M42,65 C42,48 48,36 54,32 C60,36 66,48 66,65 Z" />
        <path d="M94,65 C94,48 100,36 106,32 C112,36 118,48 118,65 Z" />

        {/* Cổng vòm lớn trung tâm (Arch) */}
        <path
          d="M68,120 L68,85 Q80,72 92,85 L92,120 Z"
          fill="#ffffff"
        />

        {/* Cổng vòm nhỏ 2 bên */}
        <path
          d="M48,120 L48,96 Q54,88 60,96 L60,120 Z"
          fill="#ffffff"
        />
        <path
          d="M100,120 L100,96 Q106,88 112,96 L112,120 Z"
          fill="#ffffff"
        />

        {/* Hàng ô cửa vòm tầng 2 */}
        <path d="M50,88 Q54,82 58,88 Z" fill="#ffffff" />
        <path d="M102,88 Q106,82 110,88 Z" fill="#ffffff" />
        <circle cx="80" cy="45" r="3" fill="#ffffff" />
      </svg>

      {/* Cụm danh thắng bên phải (Tháp Pisa & Nhà thờ chính tòa) */}
      <svg
        className="h-20 sm:h-24 md:h-28 w-auto text-[#009fe3] shrink-0 opacity-90"
        viewBox="0 0 200 120"
        fill="currentColor"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Nền cong viền chân trang */}
        <path d="M0,120 L200,120 L200,118 Q160,110 100,112 Q50,115 0,120 Z" />

        {/* Tháp nghiêng Pisa (nghiêng góc ~6 độ) */}
        <g transform="rotate(6 50 120)">
          {/* Thân tháp trụ */}
          <rect x="35" y="25" width="28" height="95" rx="2" />
          <path d="M37,15 L61,15 L61,25 L37,25 Z" />
          <path d="M42,8 L56,8 L56,15 L42,15 Z" />

          {/* Các tầng lan can và vòm cột trắng của Pisa */}
          <rect x="33" y="32" width="32" height="3" fill="#ffffff" />
          <rect x="33" y="47" width="32" height="3" fill="#ffffff" />
          <rect x="33" y="62" width="32" height="3" fill="#ffffff" />
          <rect x="33" y="77" width="32" height="3" fill="#ffffff" />
          <rect x="33" y="92" width="32" height="3" fill="#ffffff" />

          {/* Hàng vòm cửa Pisa tầng giữa */}
          <rect x="39" y="38" width="4" height="6" rx="2" fill="#ffffff" />
          <rect x="47" y="38" width="4" height="6" rx="2" fill="#ffffff" />
          <rect x="55" y="38" width="4" height="6" rx="2" fill="#ffffff" />

          <rect x="39" y="53" width="4" height="6" rx="2" fill="#ffffff" />
          <rect x="47" y="53" width="4" height="6" rx="2" fill="#ffffff" />
          <rect x="55" y="53" width="4" height="6" rx="2" fill="#ffffff" />

          <rect x="39" y="68" width="4" height="6" rx="2" fill="#ffffff" />
          <rect x="47" y="68" width="4" height="6" rx="2" fill="#ffffff" />
          <rect x="55" y="68" width="4" height="6" rx="2" fill="#ffffff" />

          <rect x="39" y="83" width="4" height="6" rx="2" fill="#ffffff" />
          <rect x="47" y="83" width="4" height="6" rx="2" fill="#ffffff" />
          <rect x="55" y="83" width="4" height="6" rx="2" fill="#ffffff" />
        </g>

        {/* Nhà thờ chính tòa (Notre Dame Cathedral) */}
        <g transform="translate(85, 0)">
          {/* Tháp chuông trái */}
          <rect x="15" y="30" width="24" height="90" rx="1" />
          <rect x="13" y="27" width="28" height="4" />
          {/* Cửa sổ vòm dài tháp trái */}
          <rect x="20" y="40" width="5" height="18" rx="2.5" fill="#ffffff" />
          <rect x="28" y="40" width="5" height="18" rx="2.5" fill="#ffffff" />

          {/* Tháp chuông phải */}
          <rect x="65" y="30" width="24" height="90" rx="1" />
          <rect x="63" y="27" width="28" height="4" />
          {/* Cửa sổ vòm dài tháp phải */}
          <rect x="70" y="40" width="5" height="18" rx="2.5" fill="#ffffff" />
          <rect x="78" y="40" width="5" height="18" rx="2.5" fill="#ffffff" />

          {/* Khối gian giữa nhà thờ */}
          <rect x="38" y="55" width="28" height="65" />
          {/* Cửa sổ hoa hồng (Rose window) */}
          <circle cx="52" cy="70" r="9" fill="#ffffff" />
          <circle cx="52" cy="70" r="6" fill="#009fe3" />
          <circle cx="52" cy="70" r="2.5" fill="#ffffff" />

          {/* 3 Cổng vào chính ở tầng dưới */}
          <path d="M20,120 L20,102 Q27,94 34,102 L34,120 Z" fill="#ffffff" />
          <path d="M44,120 L44,98 Q52,88 60,98 L60,120 Z" fill="#ffffff" />
          <path d="M70,120 L70,102 Q77,94 84,102 L84,120 Z" fill="#ffffff" />

          {/* Hàng lan can ngang trang trí */}
          <rect x="15" y="85" width="74" height="3" fill="#ffffff" />
        </g>
      </svg>
    </div>
  );
}
