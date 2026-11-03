/** Điều khiển phân trang đơn giản cho danh sách trả về dạng Page của Spring (page bắt đầu từ 0). */
export default function Pager({ page, totalPages, onChange, disabled = false }) {
  if (totalPages <= 1) return null;
  const btn =
    "rounded-lg border border-gray-300 px-3 py-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-40";
  return (
    <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
      <button className={btn} disabled={disabled || page <= 0} onClick={() => onChange(page - 1)}>
        Trang trước
      </button>
      <span>
        Trang {page + 1} / {totalPages}
      </span>
      <button
        className={btn}
        disabled={disabled || page >= totalPages - 1}
        onClick={() => onChange(page + 1)}
      >
        Trang sau
      </button>
    </div>
  );
}
