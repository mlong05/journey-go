"use client";

/**
 * Chuyển trang có hiệu ứng bằng View Transitions API của trình duyệt.
 *
 * Vì sao không dùng <ViewTransition> của React? Hiệu ứng của React chỉ chạy khi trang đích render
 * trong cùng lượt commit với điều hướng (trang đã được prefetch). Dev server không prefetch và
 * cacheComponents giữ trang cũ trong <Activity> ⇒ hiệu ứng không bao giờ được kích hoạt.
 * Ở đây ta tự gọi document.startViewTransition và chờ trang mới báo đã gắn xong (sự kiện PAGE_EVENT).
 *
 *  • type "forward" / "back": trang trượt theo hướng (CSS theo html[data-nav]).
 *  • morphEl: phần tử (ảnh bìa trên thẻ) được gắn tạm view-transition-name để "phóng" sang trang mới.
 */
export const PAGE_EVENT = "jg:page-mounted";

/**
 * Trang du khách vừa đi qua (đường dẫn + query) — để nút "Quay lại" về đúng nơi người dùng đến
 * (trang chủ, danh sách tour kèm bộ lọc…). TouristShell gọi rememberPage() mỗi khi một trang gắn.
 */
let currentPage = null;
let previousPage = null;
export function rememberPage(path) {
  if (path === currentPage) return;
  previousPage = currentPage;
  currentPage = path;
}
export const getPreviousPage = () => previousPage;
const WAIT_MAX_MS = 1500;

const canAnimate = () =>
  typeof document !== "undefined" &&
  typeof document.startViewTransition === "function" &&
  !window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/**
 * Chờ trang đích báo đã gắn (hoặc hết thời gian chờ).
 * Lưu ý: trong lúc chờ, trình duyệt tạm dừng vẽ ⇒ requestAnimationFrame KHÔNG chạy;
 * chỉ dùng setTimeout, nếu không View Transition sẽ bị huỷ vì quá thời gian cập nhật DOM.
 */
function waitForPage(pathname) {
  return new Promise((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      window.removeEventListener(PAGE_EVENT, onPage);
      setTimeout(resolve, 30); // cho ảnh trên trang mới kịp gắn src
    };
    const onPage = (e) => { if (!pathname || e.detail === pathname) finish(); };
    window.addEventListener(PAGE_EVENT, onPage);
    setTimeout(finish, WAIT_MAX_MS);
  });
}

export function transitionNavigate(router, href, { type = "forward", morphEl = null, morphName = null, replace = false, historyBack = false } = {}) {
  // historyBack: dùng router.back() để trình duyệt khôi phục đúng vị trí cuộn / bộ lọc của trang trước.
  const go = () => (historyBack ? router.back() : replace ? router.replace(href) : router.push(href));
  if (!canAnimate()) { go(); return; }
  const pathname = new URL(href, window.location.href).pathname;
  const root = document.documentElement;
  root.dataset.nav = type;
  if (morphEl && morphName) {
    morphEl.style.viewTransitionName = morphName;
    morphEl.style.viewTransitionClass = "morph";
  }
  const vt = document.startViewTransition(() => {
    // Ảnh nguồn đã được chụp lại; bỏ tên để không trùng với ảnh đích trên trang mới.
    if (morphEl) { morphEl.style.viewTransitionName = ""; morphEl.style.viewTransitionClass = ""; }
    go();
    return waitForPage(pathname);
  });
  vt.finished.finally(() => { delete root.dataset.nav; });
}

/** Bỏ qua hiệu ứng khi người dùng mở tab mới / tải xuống (Ctrl, Cmd, Shift, chuột giữa). */
export const isPlainClick = (e) => e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey && !e.defaultPrevented;
