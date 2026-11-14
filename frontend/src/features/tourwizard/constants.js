/**
 * Hằng số luồng tạo tour theo bước — khớp enum backend
 * (TourStatus, GuestType, TourFormat, VideoSource, TourReviewStep).
 */

export const WIZARD_STEPS = [
  { key: "BASIC_INFO", label: "Thông tin cơ bản", short: "Cơ bản" },
  { key: "PRICING", label: "Giá vé", short: "Giá vé" },
  { key: "STOPS", label: "Điểm đến", short: "Điểm đến" },
  { key: "ITINERARY", label: "Lịch trình", short: "Lịch trình" },
  { key: "SCHEDULE", label: "Lịch khởi hành", short: "Khởi hành" },
  { key: "REVIEW", label: "Xem lại và gửi duyệt", short: "Gửi duyệt" },
];

/** Trạng thái tour + nhãn + màu badge. */
export const TOUR_STATUS = {
  DRAFT: { label: "Bản nháp", cls: "bg-slate-100 text-slate-700 border-slate-200" },
  PENDING_REVIEW: { label: "Chờ duyệt", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  CHANGES_REQUESTED: { label: "Cần chỉnh sửa", cls: "bg-orange-50 text-orange-700 border-orange-200" },
  REJECTED: { label: "Bị từ chối", cls: "bg-rose-50 text-rose-700 border-rose-200" },
  PUBLISHED: { label: "Đang bán", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
};

export const TOUR_STATUS_ORDER = ["DRAFT", "PENDING_REVIEW", "CHANGES_REQUESTED", "PUBLISHED", "REJECTED"];

/** Đối tác được sửa nội dung (bước 1, 3) ở các trạng thái này. */
export const CONTENT_EDITABLE = ["DRAFT", "CHANGES_REQUESTED"];
/** Đối tác được sửa giá / lịch (bước 2, 4) ở các trạng thái này (BR-05). */
export const PRICING_EDITABLE = ["DRAFT", "CHANGES_REQUESTED", "PUBLISHED"];

export const GUEST_TYPES = [
  { key: "ADULT", label: "Người lớn", age: "12 tuổi trở lên" },
  { key: "CHILD", label: "Trẻ em", age: "5 – 11 tuổi" },
  { key: "TODDLER", label: "Trẻ nhỏ", age: "2 – 4 tuổi" },
  { key: "INFANT", label: "Em bé", age: "Dưới 2 tuổi", alwaysFree: true },
];

export const VIDEO_SOURCES = [
  { key: "YOUTUBE", label: "Link YouTube" },
  { key: "MP4_LINK", label: "Link MP4" },
  { key: "UPLOAD", label: "Tải video lên" },
];

/** Giới hạn — khớp TourSubmissionValidator ở backend. */
export const LIMITS = {
  TITLE_MAX: 80,
  HIGHLIGHTS_MIN: 3,
  HIGHLIGHTS_MAX: 5,
  IMAGES_MIN: 5,
  IMAGES_MAX: 30,
  QUIZ_MIN: 1,
  QUIZ_MAX: 4,
  EXPERIENCES_MIN: 1,
  EXPERIENCES_MAX: 5,
  RADIUS_MIN: 10,
  RADIUS_MAX: 500,
  RADIUS_DEFAULT: 50,
  IMAGE_MAX_BYTES: 10 * 1024 * 1024,
  VIDEO_MAX_BYTES: 100 * 1024 * 1024,
};

export const BANNED_TITLE_WORDS = ["rẻ nhất", "độc quyền", "tốt nhất", "số 1", "số một"];

/** 5 tiêu chí kiểm duyệt; cần đạt tối thiểu 3/5 để duyệt. */
export const REVIEW_CRITERIA = [
  { key: "interactive", label: "Tính tương tác", hint: "Khách được thực hành, chạm, thử nghiệm — không chỉ đứng nhìn hay nghe thuyết minh." },
  { key: "localExpertise", label: "Tính bản địa", hint: "Người dẫn / người chia sẻ có chuyên môn hoặc là người địa phương am hiểu sâu sắc." },
  { key: "storytelling", label: "Tính câu chuyện", hint: "Lịch trình có chủ đề rõ ràng, không chung chung kiểu \"Khám phá Hội An\"." },
  { key: "culturalRatio", label: "Tỷ trọng văn hóa > 50%", hint: "Hoạt động văn hóa chiếm đa số, không lồng điểm mua sắm đại trà (trừ làng nghề)." },
  { key: "authenticMedia", label: "Hình ảnh / video trực quan", hint: "Tập trung vào con người, hoạt động trải nghiệm; không dùng ảnh mạng, phong cảnh chung chung." },
];
export const CRITERIA_MIN_TO_APPROVE = 3;

/** Lý do từ chối dạng mã — khớp TourRejectionReason. */
export const REJECTION_REASONS = [
  { code: "INACCURATE_INFORMATION", label: "Thông tin tour chưa chính xác" },
  { code: "INCOMPLETE_INFORMATION", label: "Thông tin tour chưa đầy đủ" },
  { code: "INAPPROPRIATE_TOUR", label: "Tour không phù hợp với nền tảng" },
  { code: "INVALID_PRICE_OR_DATES", label: "Giá hoặc ngày khởi hành không hợp lệ" },
  { code: "INVALID_ITINERARY", label: "Lịch trình hoặc điểm đến chưa hợp lệ" },
  { code: "DUPLICATE_TOUR", label: "Tour bị trùng lặp" },
  { code: "OTHER", label: "Lý do khác" },
];

export const STEP_LABEL = {
  BASIC_INFO: "Bước 1 – Thông tin cơ bản",
  PRICING: "Bước 2 – Giá vé",
  STOPS: "Bước 3 – Điểm đến",
  ITINERARY: "Bước 4 – Lịch trình",
  SCHEDULE: "Bước 5 – Lịch khởi hành",
  REVIEW: "Bước 6 – Xem lại",
  ACCOUNT: "Tài khoản đối tác",
};

/** Bước 1 — "Những thông tin cần lưu ý" (không bắt buộc), hiển thị dạng mục xổ xuống cho khách. */
export const NOTICE_SECTIONS = [
  { key: "priceIncludes", label: "Giá tour bao gồm", max: 5000 },
  { key: "priceExcludes", label: "Giá tour không bao gồm", max: 5000 },
  { key: "forceMajeure", label: "Trường hợp bất khả kháng", max: 5000 },
  { key: "refundPolicy", label: "Chính sách hỗ trợ hoàn tiền", max: 5000 },
  { key: "contactInfo", label: "Liên hệ", max: 2000 },
];
