class TicketModel {
  final String ticketCode;
  final String tourName;
  final String destination;
  final String price;
  final int numericPrice;
  String status; // 'ACTIVE', 'USED', 'REFUNDED'
  String statusLabel;
  final String purchaseDate;
  final String validDate;
  String? usedAt;
  String? refundedAt;
  final String paymentGateway;
  final String transactionId;
  final String qrCodeUrl;
  final String holderName;
  final int passengerCount;
  final List<String> benefits;

  TicketModel({
    required this.ticketCode,
    required this.tourName,
    required this.destination,
    required this.price,
    required this.numericPrice,
    required this.status,
    required this.statusLabel,
    required this.purchaseDate,
    required this.validDate,
    this.usedAt,
    this.refundedAt,
    required this.paymentGateway,
    required this.transactionId,
    required this.qrCodeUrl,
    required this.holderName,
    this.passengerCount = 1,
    required this.benefits,
  });

  bool get isActive => status == 'ACTIVE';
  bool get isUsed => status == 'USED';
  bool get isRefunded => status == 'REFUNDED';

  factory TicketModel.fromJson(Map<String, dynamic> json) {
    return TicketModel(
      ticketCode: json['ticketCode']?.toString() ?? '',
      tourName: json['tourName']?.toString() ?? '',
      destination: json['destination']?.toString() ?? '',
      price: json['price']?.toString() ?? 'Miễn phí',
      numericPrice: json['numericPrice'] is num ? (json['numericPrice'] as num).toInt() : 0,
      status: json['status']?.toString() ?? 'ACTIVE',
      statusLabel: json['statusLabel']?.toString() ?? 'Còn hiệu lực',
      purchaseDate: json['purchaseDate']?.toString() ?? '',
      validDate: json['validDate']?.toString() ?? '',
      usedAt: json['usedAt']?.toString(),
      refundedAt: json['refundedAt']?.toString(),
      paymentGateway: json['paymentGateway']?.toString() ?? 'VNPay',
      transactionId: json['transactionId']?.toString() ?? '',
      qrCodeUrl: json['qrCodeUrl']?.toString() ?? '',
      holderName: json['holderName']?.toString() ?? 'Nguyễn An',
      passengerCount: json['passengerCount'] is num ? (json['passengerCount'] as num).toInt() : 1,
      benefits: (json['benefits'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? [],
    );
  }

  Map<String, dynamic> toJson() => {
    'ticketCode': ticketCode,
    'tourName': tourName,
    'destination': destination,
    'price': price,
    'numericPrice': numericPrice,
    'status': status,
    'statusLabel': statusLabel,
    'purchaseDate': purchaseDate,
    'validDate': validDate,
    'usedAt': usedAt,
    'refundedAt': refundedAt,
    'paymentGateway': paymentGateway,
    'transactionId': transactionId,
    'qrCodeUrl': qrCodeUrl,
    'holderName': holderName,
    'passengerCount': passengerCount,
    'benefits': benefits,
  };
}
