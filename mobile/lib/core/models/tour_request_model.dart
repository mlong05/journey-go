class TourRequestModel {
  final int id;
  final int? requesterId;
  final String? requesterName;
  final String? requesterEmail;
  final String? requesterAvatarUrl;
  final String title;
  final String description;
  final String? preferredDestination;
  final DateTime? preferredDateFrom;
  final DateTime? preferredDateTo;
  final int? guestCount;
  final double? budgetMin;
  final double? budgetMax;
  final String? specialRequirements;
  final String status; // OPEN, ACCEPTED, FULFILLED, CANCELLED, EXPIRED
  final int? acceptedById;
  final String? acceptedByName;
  final DateTime? acceptedAt;
  final int? fulfilledTourId;
  final DateTime createdAt;
  final DateTime? updatedAt;

  TourRequestModel({
    required this.id,
    this.requesterId,
    this.requesterName,
    this.requesterEmail,
    this.requesterAvatarUrl,
    required this.title,
    required this.description,
    this.preferredDestination,
    this.preferredDateFrom,
    this.preferredDateTo,
    this.guestCount,
    this.budgetMin,
    this.budgetMax,
    this.specialRequirements,
    required this.status,
    this.acceptedById,
    this.acceptedByName,
    this.acceptedAt,
    this.fulfilledTourId,
    required this.createdAt,
    this.updatedAt,
  });

  bool get isOpen => status == 'OPEN';
  bool get isAccepted => status == 'ACCEPTED';
  bool get isFulfilled => status == 'FULFILLED';
  bool get isCancelled => status == 'CANCELLED';

  String get statusLabel {
    switch (status) {
      case 'OPEN':
        return 'Chờ đối tác nhận';
      case 'ACCEPTED':
        return 'Đang thiết kế';
      case 'FULFILLED':
        return 'Tour sẵn sàng';
      case 'CANCELLED':
        return 'Đã hủy';
      case 'EXPIRED':
        return 'Hết hạn';
      default:
        return status;
    }
  }

  factory TourRequestModel.fromJson(Map<String, dynamic> json) {
    DateTime? parseDate(dynamic v) {
      if (v == null) return null;
      if (v is String) return DateTime.tryParse(v);
      return null;
    }

    double? parseDouble(dynamic v) {
      if (v == null) return null;
      if (v is num) return v.toDouble();
      return double.tryParse(v.toString());
    }

    return TourRequestModel(
      id: (json['id'] as num).toInt(),
      requesterId: (json['requesterId'] as num?)?.toInt(),
      requesterName: json['requesterName'] as String?,
      requesterEmail: json['requesterEmail'] as String?,
      requesterAvatarUrl: json['requesterAvatarUrl'] as String?,
      title: json['title'] as String? ?? '',
      description: json['description'] as String? ?? '',
      preferredDestination: json['preferredDestination'] as String?,
      preferredDateFrom: parseDate(json['preferredDateFrom']),
      preferredDateTo: parseDate(json['preferredDateTo']),
      guestCount: (json['guestCount'] as num?)?.toInt(),
      budgetMin: parseDouble(json['budgetMin']),
      budgetMax: parseDouble(json['budgetMax']),
      specialRequirements: json['specialRequirements'] as String?,
      status: json['status'] as String? ?? 'OPEN',
      acceptedById: (json['acceptedById'] as num?)?.toInt(),
      acceptedByName: json['acceptedByName'] as String?,
      acceptedAt: parseDate(json['acceptedAt']),
      fulfilledTourId: (json['fulfilledTourId'] as num?)?.toInt(),
      createdAt: parseDate(json['createdAt']) ?? DateTime.now(),
      updatedAt: parseDate(json['updatedAt']),
    );
  }
}
