/// Danh sách ngân hàng Việt Nam — dùng cho dropdown "Ngân hàng" trong form
/// yêu cầu hoàn tiền (mobile).
///
/// ── Quy ước ──
///  • Giá trị gửi lên backend là TÊN NGÂN HÀNG dạng tiếng Việt đầy đủ
///    (VD: "Ngân hàng TMCP Ngoại thương Việt Nam (Vietcombank)") — Admin đọc
///    dễ hiểu khi chuyển khoản thủ công.
///  • Mã ngân hàng (`code`) chỉ phục vụ nội bộ, KHÔNG gửi lên backend.
///  • "Khác" luôn ở CUỐI danh sách — để khách nhập tên ngân hàng khi không
///    có trong danh sách.
library;

class BankOption {
  /// Mã ngân hàng (nội bộ).
  final String code;

  /// Tên hiển thị trong dropdown.
  final String name;

  /// Tên ngân hàng gửi lên backend.
  final String value;

  const BankOption(this.code, this.name, this.value);
}

/// Danh sách ngân hàng phổ biến tại Việt Nam.
const List<BankOption> kVietnamBanks = [
  BankOption(
    'VCB',
    'Vietcombank',
    'Ngân hàng TMCP Ngoại thương Việt Nam (Vietcombank)',
  ),
  BankOption(
    'VTB',
    'VietinBank',
    'Ngân hàng TMCP Công thương Việt Nam (VietinBank)',
  ),
  BankOption(
    'BIDV',
    'BIDV',
    'Ngân hàng TMCP Đầu tư và Phát triển Việt Nam (BIDV)',
  ),
  BankOption(
    'BVH',
    'Bảo Việt',
    'Ngân hàng TMCP Bảo Việt',
  ),
  BankOption(
    'VPB',
    'VPBank',
    'Ngân hàng TMCP Việt Nam Thương Tín (VPBank)',
  ),
  BankOption(
    'MBB',
    'MB Bank',
    'Ngân hàng TMCP Quân đội (MB Bank)',
  ),
  BankOption(
    'ACB',
    'ACB',
    'Ngân hàng TMCP Á Châu (ACB)',
  ),
  BankOption(
    'TPB',
    'TPBank',
    'Ngân hàng TMCP Đầu tư và Phát triển Sài Gòn (TPBank)',
  ),
  BankOption(
    'TECHCOMBANK',
    'Techcombank',
    'Ngân hàng TMCP Kỹ thương Việt Nam (Techcombank)',
  ),
  BankOption(
    'VIB',
    'VIB',
    'Ngân hàng TMCP Quốc tế Việt Nam (VIB)',
  ),
  BankOption(
    'HDBANK',
    'HDBank',
    'Ngân hàng TMCP Nhà Hà Nội (HDBank)',
  ),
  BankOption(
    'SHB',
    'SHB',
    'Ngân hàng TMCP Sài Gòn - Hà Nội (SHB)',
  ),
  BankOption(
    'EIB',
    'Eximbank',
    'Ngân hàng TMCP Ngoại thương Việt Nam (Eximbank)',
  ),
  BankOption(
    'MSB',
    'MSB',
    'Ngân hàng TMCP Tân tiến (MSB)',
  ),
  BankOption(
    'OCB',
    'OCB',
    'Ngân hàng TMCP Á Châu (OCB)',
  ),
  BankOption(
    'LPB',
    'LPBank',
    'Ngân hàng TMCP Bưu điện Liên Việt (LPBank)',
  ),
  BankOption(
    'CTB',
    'CTBank',
    'Ngân hàng TMCP Công thương Việt Nam (CTBank)',
  ),
  BankOption(
    'PGBANK',
    'PGBank',
    'Ngân hàng TMCP Đầu tư và Phát triển (PGBank)',
  ),
  BankOption(
    'MBB',
    'Military Bank',
    'Ngân hàng Quân đội (Military Bank)',
  ),
];

/// Lựa chọn "khác" — khách tự nhập tên ngân hàng.
const BankOption kOtherBankOption = BankOption(
  'OTHER',
  'Khác (ghi rõ tên ngân hàng)',
  'Khác',
);

/// Danh sách đầy đủ gồm cả lựa chọn "Khác" ở cuối.
const List<BankOption> kBankDropdownOptions = [
  ...kVietnamBanks,
  kOtherBankOption,
];
