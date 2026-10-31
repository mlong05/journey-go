/**
 * Họa tiết mặt trống đồng Đông Sơn (vẽ giản lược bằng SVG) dùng làm nền trang trí mờ.
 * Màu lấy theo `currentColor`; độ mờ do nơi dùng quyết định qua className.
 */
const CENTER = 200;

// Tia sao ở tâm trống: 14 cánh nhọn xen kẽ
function starPoints(spikes = 14, outer = 46, inner = 18) {
  const pts = [];
  for (let i = 0; i < spikes * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = (Math.PI * i) / spikes - Math.PI / 2;
    pts.push(`${(CENTER + r * Math.cos(a)).toFixed(1)},${(CENTER + r * Math.sin(a)).toFixed(1)}`);
  }
  return pts.join(" ");
}

// Vành răng cưa giữa hai bán kính
function zigzagPoints(count, r1, r2) {
  const pts = [];
  for (let i = 0; i <= count * 2; i++) {
    const r = i % 2 === 0 ? r1 : r2;
    const a = (Math.PI * i) / count;
    pts.push(`${(CENTER + r * Math.cos(a)).toFixed(1)},${(CENTER + r * Math.sin(a)).toFixed(1)}`);
  }
  return pts.join(" ");
}

function ringOf(count, radius) {
  return Array.from({ length: count }, (_, i) => {
    const a = (2 * Math.PI * i) / count;
    return { x: CENTER + radius * Math.cos(a), y: CENTER + radius * Math.sin(a), deg: (a * 180) / Math.PI };
  });
}

const STAR = starPoints();
const ZIGZAG_INNER = zigzagPoints(36, 62, 72);
const ZIGZAG_OUTER = zigzagPoints(60, 168, 178);
const DOTS_INNER = ringOf(40, 84);
const DOTS_OUTER = ringOf(72, 186);
const BIRDS = ringOf(12, 140);

export default function BronzeDrumMotif({ className = "" }) {
  return (
    <svg viewBox="0 0 400 400" fill="none" stroke="currentColor" aria-hidden="true" className={className}>
      <circle cx={CENTER} cy={CENTER} r="196" strokeWidth="2" />
      <circle cx={CENTER} cy={CENTER} r="190" strokeWidth="1" />
      {DOTS_OUTER.map((d, i) => (
        <circle key={`do${i}`} cx={d.x} cy={d.y} r="1.6" fill="currentColor" stroke="none" />
      ))}
      <polyline points={ZIGZAG_OUTER} strokeWidth="1" />
      <circle cx={CENTER} cy={CENTER} r="162" strokeWidth="1.2" />

      {/* Vành chim Lạc bay ngược chiều kim đồng hồ */}
      {BIRDS.map((b, i) => (
        <g key={`b${i}`} transform={`translate(${b.x} ${b.y}) rotate(${b.deg + 90})`} strokeWidth="1.4" strokeLinecap="round">
          <path d="M-16 0 Q-6 -6 0 -2 Q6 -9 16 -11" />
          <path d="M0 -2 Q2 4 -2 10" />
          <path d="M-16 0 L-22 3" />
          <circle cx="-14" cy="-1" r="1.2" fill="currentColor" stroke="none" />
        </g>
      ))}

      <circle cx={CENTER} cy={CENTER} r="118" strokeWidth="1.2" />
      <circle cx={CENTER} cy={CENTER} r="112" strokeWidth="0.8" strokeDasharray="2 4" />
      <circle cx={CENTER} cy={CENTER} r="96" strokeWidth="1" />
      {DOTS_INNER.map((d, i) => (
        <circle key={`di${i}`} cx={d.x} cy={d.y} r="1.8" fill="currentColor" stroke="none" />
      ))}
      <circle cx={CENTER} cy={CENTER} r="76" strokeWidth="1" />
      <polyline points={ZIGZAG_INNER} strokeWidth="1" />
      <circle cx={CENTER} cy={CENTER} r="58" strokeWidth="1.2" />
      <polygon points={STAR} fill="currentColor" fillOpacity="0.35" strokeWidth="1" />
      <circle cx={CENTER} cy={CENTER} r="9" fill="currentColor" stroke="none" />
    </svg>
  );
}
