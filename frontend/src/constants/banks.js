/**
 * Danh sách ngân hàng thụ hưởng — dùng chung cho:
 *  • Form đăng ký đối tác (Giai đoạn 3 — Thiết lập thanh toán)
 *  • Form yêu cầu chỉnh sửa thông tin của đối tác (Thông tin thanh toán)
 *  • Form "Thông tin liên hệ & Tài khoản nhận tiền" của yêu cầu hoàn tiền (du khách)
 *
 * <p>Dùng chung để mọi nơi chọn đúng tên ngân hàng ⇒ dữ liệu nhất quán,
 * tránh viết tay sai tên ("Vietcombank" vs "Ngân hàng TMCP Ngoại thương Việt Nam (Vietcombank)").
 */
export const BANKS = [
  "Ngân hàng TMCP Ngoại thương Việt Nam (Vietcombank)",
  "Ngân hàng TMCP Kỹ thương Việt Nam (Techcombank)",
  "Ngân hàng TMCP Đầu tư và Phát triển Việt Nam (BIDV)",
  "Ngân hàng TMCP Quân đội (MB)",
  "Ngân hàng TMCP Á Châu (ACB)",
  "Ngân hàng TMCP Sài Gòn – Hà Nội (SHB)",
  "Ngân hàng TMCP Đông Á (DongA Bank)",
  "Ngân hàng TMCP Bưu điện Liên Việt (LienVietPostBank)",
  "Ngân hàng TMCP Nam Á (Nam A Bank)",
  "Ngân hàng TMCP Đại Đồng Tiến (VietinBank)",
  "Ngân hàng TMCP Quốc tế Bắc Á (NCB)",
  "Ngân hàng TMCP Quốc tế Việt Nam (VIB)",
  "Ngân hàng TMCP Bản Việt (BVBank)",
  "Ngân hàng TMCP Hàng Hải Việt Nam (MSB)",
  "Ngân hàng TMCP Xuất nhập khẩu Việt Nam (Eximbank)",
  "Ngân hàng TMCP Phát triển Thành phố Hồ Chí Minh (TPBank)",
  "Ngân hàng TMCP Bản Á Châu (ABBank)",
  "Ngân hàng TMCP Bắc Á (BAC)",
  "Ngân hàng TMCP Đông Nam Á (DNB)",
  "Ngân hàng TMCP Dầu khí Toàn cầu (PVcomBank)",
  "Ngân hàng TMCP An Bình (AB)",
  "Ngân hàng TMCP Đại Việt (DaiViet)",
  "Ngân hàng TMCP Bến Thành (BenThanh)",
  "Ngân hàng TMCP Đô thị Mới Hà Nội (MHB)",
  "Ngân hàng TMCP Phát triển TP. Hồ Chí Minh (HDBank)",
  "Ngân hàng Nông nghiệp và Thực phẩm Việt Nam (Agribank)",
  "Ngân hàng Chính sách xã hội (VSSB)",
  "Ngân hàng Đầu tư và Phát triển Chính phủ (VDB)",
  "Ngân hàng Quốc tế (IB)",
  "Ngân hàng Ngoại thương (VCB)",
];

/**
 * Chuẩn hoá tên ngân hàng để so khớp khi tìm trong {@link BANKS}.
 *
 * <p>Người dùng có thể gõ tắt ("NCB", "Vietcombank", "techcombank"…) ⇒ vẫn chọn
 * được đúng ngân hàng trong dropdown.
 */
export function findBankName(loose) {
  if (!loose) return "";
  const raw = String(loose).trim();
  if (!raw) return "";
  const exact = BANKS.find((b) => b.toLowerCase() === raw.toLowerCase());
  if (exact) return exact;
  const normalized = raw.toLowerCase().replace(/[^a-z0-9]/g, "");
  const hit = BANKS.find((b) => {
    const key = b.toLowerCase().replace(/[^a-z0-9]/g, "");
    return key.includes(normalized) || normalized.includes(key);
  });
  return hit || raw;
}
