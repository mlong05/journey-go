/// Thông điệp lỗi chuẩn bảo mật - không làm lộ vai trò người dùng
const String kInvalidAuthErrorMessage = 'Tài khoản hoặc mật khẩu không hợp lệ!';

/// Kiểm tra vai trò hợp lệ cho ứng dụng di động Khách du lịch.
///
/// Backend chỉ còn 4 role chính thức: ADMIN, CONTENT_MODERATOR, CONTENT_PROVIDER, TOURIST.
/// Role cũ `USER` đã bị gỡ trong đợt hợp nhất Role → Content Provider, nhưng vẫn chấp nhận
/// để tương thích với phiên đăng nhập đã lưu sẵn trên thiết bị.
bool isTouristRole(String? role) {
  if (role == null) return false;
  final normalized = role.trim().toUpperCase();
  return normalized == 'USER' ||
      normalized == 'TOURIST' ||
      normalized == 'ROLE_USER' ||
      normalized == 'ROLE_TOURIST';
}

class UserModel {
  final int id;
  final String email;
  final String fullName;
  final String? phone;
  final String role;
  final String? authProvider;
  final String? avatarUrl;
  final bool active;
  final String? createdAt;

  UserModel({
    required this.id,
    required this.email,
    required this.fullName,
    this.phone,
    required this.role,
    this.authProvider,
    this.avatarUrl,
    this.active = true,
    this.createdAt,
  });

  /// Kiểm tra tài khoản có vai trò Khách du lịch (USER/TOURIST) hợp lệ cho Mobile
  bool get isUserRole => isTouristRole(role);
  bool get isTourist => isTouristRole(role);

  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      id: json['id'] is num ? (json['id'] as num).toInt() : int.tryParse(json['id']?.toString() ?? '0') ?? 0,
      email: json['email']?.toString() ?? '',
      fullName: json['fullName']?.toString() ?? (json['email']?.toString() ?? ''),
      phone: json['phone']?.toString(),
      role: json['role']?.toString().toUpperCase() ?? 'USER',
      authProvider: json['authProvider']?.toString(),
      avatarUrl: json['avatarUrl']?.toString(),
      active: json['active'] == true || json['active'] == null,
      createdAt: json['createdAt']?.toString(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'email': email,
      'fullName': fullName,
      'phone': phone,
      'role': role,
      'authProvider': authProvider,
      'avatarUrl': avatarUrl,
      'active': active,
      'createdAt': createdAt,
    };
  }
}

class AuthResponseModel {
  final String accessToken;
  final String refreshToken;
  final String tokenType;
  final int expiresIn;
  final UserModel user;

  AuthResponseModel({
    required this.accessToken,
    required this.refreshToken,
    this.tokenType = 'Bearer',
    required this.expiresIn,
    required this.user,
  });

  factory AuthResponseModel.fromJson(Map<String, dynamic> json) {
    final userData = json['user'] is Map<String, dynamic>
        ? json['user'] as Map<String, dynamic>
        : <String, dynamic>{};

    return AuthResponseModel(
      accessToken: json['accessToken']?.toString() ?? json['token']?.toString() ?? '',
      refreshToken: json['refreshToken']?.toString() ?? '',
      tokenType: json['tokenType']?.toString() ?? 'Bearer',
      expiresIn: json['expiresIn'] is num
          ? (json['expiresIn'] as num).toInt()
          : int.tryParse(json['expiresIn']?.toString() ?? '900000') ?? 900000,
      user: UserModel.fromJson(userData),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'accessToken': accessToken,
      'refreshToken': refreshToken,
      'tokenType': tokenType,
      'expiresIn': expiresIn,
      'user': user.toJson(),
    };
  }
}

class ApiResponseModel<T> {
  final int code;
  final String message;
  final T? data;

  ApiResponseModel({
    required this.code,
    required this.message,
    this.data,
  });

  bool get isSuccess => code >= 200 && code < 300;

  factory ApiResponseModel.fromJson(
    Map<String, dynamic> json,
    T Function(dynamic dataJson) parser,
  ) {
    return ApiResponseModel<T>(
      code: json['code'] is num ? (json['code'] as num).toInt() : 200,
      message: json['message']?.toString() ?? '',
      data: json['data'] != null ? parser(json['data']) : null,
    );
  }
}

class AuthRoleException implements Exception {
  final String message;
  final String? actualRole;

  AuthRoleException({
    this.message = kInvalidAuthErrorMessage,
    this.actualRole,
  });

  @override
  String toString() => message;
}
