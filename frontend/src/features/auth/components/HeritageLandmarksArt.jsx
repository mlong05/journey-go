/**
 * Hình bóng di sản Việt Nam ở chân form đăng nhập (trang trí, mờ nhẹ):
 * - Bên trái: Khuê Văn Các (Văn Miếu, Hà Nội) và Chùa Một Cột
 * - Bên phải: Chùa Cầu (Hội An) và con đò nón lá trên sông
 * Các khoảng "khoét" dùng fill trắng trùng nền form; cả khối giảm opacity để chữ phía trên luôn rõ.
 */
const ROOF = (cx, y, half, rise, flick = 6) =>
  // Mái cong đầu đao: hai đầu vểnh lên kiểu kiến trúc Việt
  `M${cx - half - flick},${y - flick} Q${cx - half + 2},${y} ${cx - half + 8},${y} L${cx + half - 8},${y} Q${cx + half - 2},${y} ${cx + half + flick},${y - flick} L${cx + half - 6},${y - rise * 0.55} Q${cx + half * 0.45},${y - rise} ${cx},${y - rise} Q${cx - half * 0.45},${y - rise} ${cx - half + 6},${y - rise * 0.55} Z`;

export default function HeritageLandmarksArt() {
  return (
    <div
      aria-hidden="true"
      className="absolute bottom-0 inset-x-0 pointer-events-none select-none z-0 flex items-end justify-between overflow-hidden h-24 sm:h-28 md:h-32 px-2 opacity-[0.16]"
    >
      {/* Khuê Văn Các & Chùa Một Cột */}
      <svg className="h-20 sm:h-24 md:h-28 w-auto text-emerald-900 shrink-0" viewBox="0 0 200 120" fill="currentColor">
        <rect x="0" y="116" width="200" height="4" />

        {/* Khuê Văn Các: 4 trụ gạch, gác có cửa sổ tròn, mái chồng hai tầng */}
        <rect x="28" y="80" width="9" height="36" />
        <rect x="46" y="80" width="9" height="36" />
        <rect x="69" y="80" width="9" height="36" />
        <rect x="87" y="80" width="9" height="36" />
        <rect x="24" y="74" width="76" height="6" />
        <rect x="34" y="70" width="56" height="4" />
        <rect x="38" y="52" width="48" height="18" />
        <circle cx="62" cy="61" r="7" fill="#fff" />
        <circle cx="62" cy="61" r="3" />
        <path d={ROOF(62, 54, 36, 14)} />
        <rect x="48" y="34" width="28" height="7" />
        <path d={ROOF(62, 36, 24, 12, 5)} />
        <circle cx="62" cy="22" r="2.5" />

        {/* Chùa Một Cột: một trụ đá giữa hồ */}
        <ellipse cx="155" cy="115" rx="34" ry="3" />
        <rect x="151" y="86" width="8" height="30" />
        <rect x="134" y="80" width="42" height="6" />
        <rect x="140" y="64" width="30" height="16" />
        <rect x="151" y="68" width="8" height="12" fill="#fff" />
        <path d={ROOF(155, 64, 26, 16)} />
        <circle cx="155" cy="46" r="2.5" />
      </svg>

      {/* Chùa Cầu Hội An & con đò */}
      <svg className="h-20 sm:h-24 md:h-28 w-auto text-emerald-900 shrink-0" viewBox="0 0 200 120" fill="currentColor">
        {/* Mặt sông gợn sóng */}
        <path d="M0,116 Q12,112 24,116 T48,116 T72,116 T96,116 T120,116 T144,116 T168,116 T192,116 L200,116 L200,120 L0,120 Z" />

        {/* Chùa Cầu: cầu vồng có mái, gác giữa nhô cao */}
        <rect x="26" y="98" width="6" height="18" />
        <rect x="134" y="98" width="6" height="18" />
        <path d="M18,100 Q83,84 148,100 L148,106 Q83,90 18,106 Z" />
        <rect x="36" y="76" width="94" height="18" />
        <rect x="46" y="80" width="10" height="11" rx="5" fill="#fff" />
        <rect x="64" y="80" width="10" height="11" rx="5" fill="#fff" />
        <rect x="92" y="80" width="10" height="11" rx="5" fill="#fff" />
        <rect x="110" y="80" width="10" height="11" rx="5" fill="#fff" />
        <path d={ROOF(83, 77, 52, 14)} />
        <rect x="71" y="56" width="24" height="10" />
        <path d={ROOF(83, 58, 20, 12, 5)} />
        <circle cx="83" cy="44" r="2.5" />
        {/* Đèn lồng treo dưới hiên */}
        <rect x="30.5" y="73" width="1" height="5" />
        <ellipse cx="31" cy="81" rx="3" ry="3.5" />
        <rect x="135" y="73" width="1" height="5" />
        <ellipse cx="135.5" cy="81" rx="3" ry="3.5" />

        {/* Con đò và người chèo đội nón lá */}
        <path d="M152,108 Q174,116 198,106 L194,111 Q174,118 156,112 Z" />
        <polygon points="174,92 165,99 183,99" />
        <rect x="171" y="99" width="6" height="9" rx="1" />
        <rect x="181" y="90" width="1.6" height="22" transform="rotate(18 182 101)" />
      </svg>
    </div>
  );
}
