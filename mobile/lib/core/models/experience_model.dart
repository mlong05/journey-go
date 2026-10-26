class ExperienceModel {
  final int id;
  final int? destinationId;
  final String title;
  final String description;
  final double price;
  final String currency;
  final int durationMinutes;
  final String status; // 'PUBLISHED', 'DRAFT', 'INACTIVE'
  final int? createdById;
  final String? createdBy;
  final int taskCount;
  final int checkInPointCount;
  final String? createdAt;
  final String? updatedAt;

  // Thuộc tính hiển thị mở rộng cho giao diện Tourist Mobile
  final String coverImage;
  final String formattedPrice;
  final String formattedDuration;
  final double rating;
  final int reviewCount;
  final List<String> tags;

  ExperienceModel({
    required this.id,
    this.destinationId,
    required this.title,
    required this.description,
    required this.price,
    this.currency = 'VND',
    required this.durationMinutes,
    required this.status,
    this.createdById,
    this.createdBy,
    this.taskCount = 0,
    this.checkInPointCount = 0,
    this.createdAt,
    this.updatedAt,
    String? coverImage,
    String? formattedPrice,
    String? formattedDuration,
    double? rating,
    int? reviewCount,
    List<String>? tags,
  })  : coverImage = coverImage ?? _defaultCoverFor(title),
        formattedPrice = formattedPrice ?? _formatPrice(price, currency),
        formattedDuration = formattedDuration ?? _formatDuration(durationMinutes),
        rating = rating ?? 4.9,
        reviewCount = reviewCount ?? 328,
        tags = tags ?? _generateTags(taskCount, checkInPointCount);

  /// Chỉ cho phép hiển thị nếu Tour đã xuất bản / được phê duyệt bởi Moderator hoặc Admin
  bool get isPublished => status.toUpperCase() == 'PUBLISHED';
  bool get isApproved => isPublished;

  static String _defaultCoverFor(String title) {
    final lower = title.toLowerCase();
    if (lower.contains('khuê văn') || lower.contains('văn miếu') || lower.contains('quốc tử giám')) {
      return 'assets/images/vanmieu.png';
    } else if (lower.contains('thăng long') || lower.contains('hoàng thành')) {
      return 'assets/images/thanglong.png';
    } else if (lower.contains('bát tràng') || lower.contains('gốm')) {
      return 'assets/images/gomsu.png';
    } else if (lower.contains('tràng an') || lower.contains('ninh bình')) {
      return 'assets/images/trangan.png';
    } else if (lower.contains('bảo tàng') || lower.contains('chiến tích') || lower.contains('khải định') || lower.contains('huế')) {
      return 'assets/images/baotang.png';
    }
    return 'assets/images/vanmieu.png';
  }

  static String _formatPrice(double price, String currency) {
    if (price <= 0) return 'Miễn phí';
    final intPrice = price.toInt();
    final buffer = StringBuffer();
    final str = intPrice.toString();
    int count = 0;
    for (int i = str.length - 1; i >= 0; i--) {
      buffer.write(str[i]);
      count++;
      if (count % 3 == 0 && i > 0) {
        buffer.write('.');
      }
    }
    final formatted = buffer.toString().split('').reversed.join('');
    return '$formatted đ';
  }

  static String _formatDuration(int minutes) {
    if (minutes <= 0) return 'Tự do';
    if (minutes < 60) return '$minutes phút';
    final hours = minutes ~/ 60;
    final remainingMinutes = minutes % 60;
    if (remainingMinutes == 0) return '$hours giờ';
    return '${hours}h ${remainingMinutes}m';
  }

  static List<String> _generateTags(int tasks, int cips) {
    final list = <String>[];
    if (tasks > 0) {
      list.add('$tasks Thử thách');
    } else {
      list.add('Nhiệm vụ & Đố vui');
    }
    if (cips > 0) {
      list.add('$cips Trạm Check-in');
    } else {
      list.add('Check-in GPS');
    }
    list.add('+150 điểm thưởng');
    return list;
  }

  factory ExperienceModel.fromJson(Map<String, dynamic> json) {
    final rawPrice = json['price'];
    double parsedPrice = 0.0;
    if (rawPrice is num) {
      parsedPrice = rawPrice.toDouble();
    } else if (rawPrice != null) {
      parsedPrice = double.tryParse(rawPrice.toString()) ?? 0.0;
    }

    final rawDuration = json['durationMinutes'];
    int parsedDuration = 0;
    if (rawDuration is num) {
      parsedDuration = rawDuration.toInt();
    } else if (rawDuration != null) {
      parsedDuration = int.tryParse(rawDuration.toString()) ?? 0;
    }

    final rawTasks = json['taskCount'];
    int parsedTasks = 0;
    if (rawTasks is num) {
      parsedTasks = rawTasks.toInt();
    } else if (rawTasks != null) {
      parsedTasks = int.tryParse(rawTasks.toString()) ?? 0;
    }

    final rawCips = json['checkInPointCount'];
    int parsedCips = 0;
    if (rawCips is num) {
      parsedCips = rawCips.toInt();
    } else if (rawCips != null) {
      parsedCips = int.tryParse(rawCips.toString()) ?? 0;
    }

    return ExperienceModel(
      id: json['id'] is num ? (json['id'] as num).toInt() : int.tryParse(json['id']?.toString() ?? '0') ?? 0,
      destinationId: json['destinationId'] is num
          ? (json['destinationId'] as num).toInt()
          : int.tryParse(json['destinationId']?.toString() ?? ''),
      title: json['title']?.toString() ?? 'Trải nghiệm Di sản',
      description: json['description']?.toString() ?? '',
      price: parsedPrice,
      currency: json['currency']?.toString() ?? 'VND',
      durationMinutes: parsedDuration,
      status: json['status']?.toString() ?? 'DRAFT',
      createdById: json['createdById'] is num
          ? (json['createdById'] as num).toInt()
          : int.tryParse(json['createdById']?.toString() ?? ''),
      createdBy: json['createdBy']?.toString(),
      taskCount: parsedTasks,
      checkInPointCount: parsedCips,
      createdAt: json['createdAt']?.toString(),
      updatedAt: json['updatedAt']?.toString(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'destinationId': destinationId,
      'title': title,
      'description': description,
      'price': price,
      'currency': currency,
      'durationMinutes': durationMinutes,
      'status': status,
      'createdById': createdById,
      'createdBy': createdBy,
      'taskCount': taskCount,
      'checkInPointCount': checkInPointCount,
      'createdAt': createdAt,
      'updatedAt': updatedAt,
    };
  }
}
