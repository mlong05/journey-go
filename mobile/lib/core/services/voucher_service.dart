/// Service gọi API voucher (/api/v1/vouchers) — phía mobile.
library;

import 'api_client.dart';

/// Kết quả xác minh voucher người dùng.
class VoucherValidationResult {
  final int? voucherId;
  final String? voucherCode;
  final String? title;
  final String? voucherScope;
  final num originalPrice;
  final num discountAmount;
  final num finalPrice;
  final bool valid;
  final String? errorMessage;

  const VoucherValidationResult({
    this.voucherId,
    this.voucherCode,
    this.title,
    this.voucherScope,
    required this.originalPrice,
    required this.discountAmount,
    required this.finalPrice,
    required this.valid,
    this.errorMessage,
  });

  factory VoucherValidationResult.fromJson(Map<String, dynamic> json) {
    num asNum(dynamic v) => v is num ? v : (num.tryParse(v?.toString() ?? '') ?? 0);
    return VoucherValidationResult(
      voucherId: json['voucherId'] is num ? (json['voucherId'] as num).toInt() : null,
      voucherCode: json['voucherCode']?.toString(),
      title: json['title']?.toString(),
      voucherScope: json['voucherScope']?.toString(),
      originalPrice: asNum(json['originalPrice']),
      discountAmount: asNum(json['discountAmount']),
      finalPrice: asNum(json['finalPrice']),
      valid: json['valid'] == true,
      errorMessage: json['errorMessage']?.toString(),
    );
  }
}

class VoucherService {
  static final VoucherService _instance = VoucherService._internal();
  factory VoucherService() => _instance;
  VoucherService._internal();

  /// POST /api/v1/vouchers/validate-user-voucher
  ///
  /// Xác minh mã voucher đã quy đổi, tính giá sau giảm và kiểm tra
  /// ràng buộc doanh thu của bên sở hữu voucher.
  Future<VoucherValidationResult> validateUserVoucher({
    required String userVoucherCode,
    required num tourPrice,
    int? partnerId,
  }) async {
    final body = <String, dynamic>{
      'userVoucherCode': userVoucherCode,
      'tourPrice': tourPrice,
    };
    if (partnerId != null) body['partnerId'] = partnerId;
    final data = await ApiClient.request(
      'POST',
      '/vouchers/validate-user-voucher',
      body: body,
    );
    return VoucherValidationResult.fromJson(
      data is Map<String, dynamic> ? data : <String, dynamic>{},
    );
  }
}
