/** Nhãn tiếng Việt cho phương thức xác minh nhiệm vụ (enum VerificationMethod ở backend). */
export const VERIFICATION_METHOD_LABELS = {
  ANSWER_MATCH: "So khớp đáp án (trắc nghiệm)",
  GPS_PRESENCE: "Định vị tại chỗ",
  QR_SCAN: "Quét mã QR hiện vật",
  PHOTO_SUBMISSION: "Nộp ảnh thực địa",
};

/** Phương thức đã hỗ trợ trong nhiệm vụ của tour (khớp TourStopTask.SUPPORTED_METHODS ở backend). */
export const TOUR_SUPPORTED_METHODS = ["ANSWER_MATCH", "GPS_PRESENCE"];

export const isTourSupportedType = (type) => TOUR_SUPPORTED_METHODS.includes(type?.verificationMethod);

export const verificationMethodLabel = (value) =>
  VERIFICATION_METHOD_LABELS[value] || "Chưa xác định";
