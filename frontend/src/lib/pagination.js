/**
 * Quy ước phân trang dùng chung cho TOÀN BỘ web.
 *
 * Mỗi trang luôn hiển thị đúng 10 dòng — không có ô chọn số dòng/trang.
 * Mọi màn hình có phân trang đều import `PAGE_SIZE` từ đây để không lệch nhau.
 */
export const PAGE_SIZE = 10;

/** Quy ước số trang hiển thị tối đa 5 nút quanh trang hiện tại (kèm "…" ở hai đầu). */
export const PAGE_WINDOW = 5;
