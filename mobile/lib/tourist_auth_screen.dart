import 'package:flutter/material.dart';
import 'core/models/auth_models.dart';
import 'core/services/auth_service.dart';
import 'core/services/google_auth_service.dart';
import 'screens/account/password_screens.dart';
import 'core/services/token_storage.dart';
import 'screens/tourist_home_screen.dart';

import 'core/constants/app_colors.dart';

/// Màn hình Đăng nhập & Đăng ký Khách du lịch (Tourist Auth Screen)
class TouristAuthScreen extends StatefulWidget {
  const TouristAuthScreen({super.key});

  @override
  State<TouristAuthScreen> createState() => _TouristAuthScreenState();
}

class _TouristAuthScreenState extends State<TouristAuthScreen>
    with SingleTickerProviderStateMixin {
  final AuthService _authService = AuthService();

  // GlobalKey cho Form validation
  final GlobalKey<FormState> _formKey = GlobalKey<FormState>();

  // Controllers cho các trường dữ liệu
  final TextEditingController _fullNameController = TextEditingController();
  final TextEditingController _emailController = TextEditingController();
  final TextEditingController _phoneController = TextEditingController();
  final TextEditingController _passwordController = TextEditingController();
  final TextEditingController _confirmPasswordController =
      TextEditingController();

  // FocusNodes để theo dõi trạng thái focus tạo viền đổi màu mượt mà
  final FocusNode _fullNameFocus = FocusNode();
  final FocusNode _emailFocus = FocusNode();
  final FocusNode _phoneFocus = FocusNode();
  final FocusNode _passwordFocus = FocusNode();
  final FocusNode _confirmPasswordFocus = FocusNode();

  // Trạng thái hiển thị mật khẩu
  bool _obscurePassword = true;
  bool _obscureConfirmPassword = true;

  // Trạng thái tab: true = Đăng nhập, false = Đăng ký
  bool _isLogin = true;

  // Trạng thái ghi nhớ đăng nhập
  bool _rememberMe = true;

  // Trạng thái đang gửi yêu cầu (Loading)
  bool _isLoading = false;

  // Trạng thái hiệu ứng nảy (Active Scale) khi nhấn CTA
  bool _isButtonPressed = false;

  @override
  void initState() {
    super.initState();
    // Khôi phục email đã ghi nhớ nếu có
    TokenStorage.getSavedEmail().then((saved) {
      if (saved != null && saved.isNotEmpty && mounted) {
        setState(() {
          _emailController.text = saved;
        });
      }
    });

    // Lắng nghe focus để cập nhật viền input
    _fullNameFocus.addListener(() => setState(() {}));
    _emailFocus.addListener(() => setState(() {}));
    _phoneFocus.addListener(() => setState(() {}));
    _passwordFocus.addListener(() => setState(() {}));
    _confirmPasswordFocus.addListener(() => setState(() {}));
  }

  @override
  void dispose() {
    _fullNameController.dispose();
    _emailController.dispose();
    _phoneController.dispose();
    _passwordController.dispose();
    _confirmPasswordController.dispose();

    _fullNameFocus.dispose();
    _emailFocus.dispose();
    _phoneFocus.dispose();
    _passwordFocus.dispose();
    _confirmPasswordFocus.dispose();
    super.dispose();
  }

  // Chuyển đổi giữa 2 tab Đăng nhập / Đăng ký
  void _switchTab(bool isLoginTab) {
    if (_isLogin == isLoginTab) return;
    FocusScope.of(context).unfocus();
    setState(() {
      _isLogin = isLoginTab;
      _formKey.currentState?.reset();
    });
  }

  // Xử lý nộp form đăng nhập / đăng ký
  Future<void> _handleSubmit() async {
    FocusScope.of(context).unfocus();
    if (!_formKey.currentState!.validate()) {
      return;
    }

    setState(() {
      _isLoading = true;
    });

    try {
      if (_isLogin) {
        // ĐĂNG NHẬP (POST /api/v1/auth/login) VỚI ROLE USER
        final auth = await _authService.login(
          email: _emailController.text,
          password: _passwordController.text,
        );

        // BẢO MẬT: Kiểm tra vai trò Khách du lịch (USER / TOURIST)
        if (!isTouristRole(auth.user.role)) {
          await TokenStorage.clear();
          throw Exception(kInvalidAuthErrorMessage);
        }

        if (_rememberMe) {
          await TokenStorage.setRememberMe(true, email: _emailController.text);
        } else {
          await TokenStorage.setRememberMe(false);
        }

        if (!mounted) return;

        setState(() {
          _isLoading = false;
        });

        _showSuccessFeedback(
          title: 'Đăng nhập thành công!',
          message: 'Chào mừng du khách ${auth.user.fullName} quay trở lại với Di sản Việt Nam.',
          isReward: false,
        );

        await Future.delayed(const Duration(milliseconds: 300));
        if (!mounted) return;

        Navigator.pushReplacement(
          context,
          MaterialPageRoute(
            builder: (_) => TouristHomeScreen(initialUser: auth.user),
          ),
        );
      } else {
        // ĐĂNG KÝ (POST /api/v1/auth/register) VỚI ROLE USER
        final cleanPhone = _phoneController.text.replaceAll(RegExp(r'\s+'), '').trim();
        final auth = await _authService.register(
          email: _emailController.text.trim(),
          password: _passwordController.text,
          fullName: _fullNameController.text.trim(),
          phone: cleanPhone,
        );

        // BẢO MẬT: Kiểm tra vai trò Khách du lịch (USER / TOURIST)
        if (!isTouristRole(auth.user.role)) {
          await TokenStorage.clear();
          throw Exception(kInvalidAuthErrorMessage);
        }

        if (!mounted) return;

        setState(() {
          _isLoading = false;
        });

        _showSuccessFeedback(
          title: 'Khởi tạo tài khoản thành công!',
          message: '🎉 Quý khách đã nhận được +100 điểm thưởng khám phá di sản!',
          isReward: true,
        );

        await Future.delayed(const Duration(milliseconds: 300));
        if (!mounted) return;

        Navigator.pushReplacement(
          context,
          MaterialPageRoute(
            builder: (_) => TouristHomeScreen(initialUser: auth.user),
          ),
        );
      }
    } on AuthRoleException {
      // TUYỆT ĐỐI KHÔNG hiển thị dialog lộ thông tin vai trò hệ thống
      await TokenStorage.clear();
      if (!mounted) return;
      setState(() {
        _isLoading = false;
      });
      _showErrorFeedback(
        title: 'Đăng nhập không thành công',
        message: kInvalidAuthErrorMessage,
      );
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _isLoading = false;
      });
      final rawError = e.toString().replaceAll('Exception: ', '').trim();

      String displayMessage;
      if (_isLogin) {
        // Luồng ĐĂNG NHẬP: Bảo mật tuyệt đối, chặn lộ vai trò hệ thống
        displayMessage = (rawError.contains('vai trò') ||
                rawError.contains('role') ||
                rawError.contains('Role') ||
                rawError.contains('không hợp lệ') ||
                rawError.contains('401') ||
                rawError.contains('403'))
            ? kInvalidAuthErrorMessage
            : (rawError.isNotEmpty ? rawError : kInvalidAuthErrorMessage);
      } else {
        // Luồng ĐĂNG KÝ: Hiển thị thông báo nghiệp vụ chi tiết từ backend (email trùng lặp, định dạng...)
        displayMessage = (rawError.contains('vai trò') || rawError.contains('Role'))
            ? kInvalidAuthErrorMessage
            : (rawError.isNotEmpty ? rawError : 'Đăng ký tài khoản không thành công. Vui lòng thử lại.');
      }

      _showErrorFeedback(
        title: _isLogin ? 'Đăng nhập không thành công' : 'Đăng ký không thành công',
        message: displayMessage,
      );
    }
  }

  // Thông báo lỗi dạng SnackBar cao cấp
  void _showErrorFeedback({
    required String title,
    required String message,
  }) {
    ScaffoldMessenger.of(context).clearSnackBars();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        behavior: SnackBarBehavior.floating,
        margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
        content: Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          decoration: BoxDecoration(
            color: AppCultureColors.error,
            borderRadius: BorderRadius.circular(16),
            boxShadow: [
              BoxShadow(
                color: AppCultureColors.error.withValues(alpha: 0.35),
                blurRadius: 18,
                offset: const Offset(0, 8),
              ),
            ],
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              Container(
                width: 38,
                height: 38,
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.2),
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.error_outline_rounded,
                  color: Colors.white,
                  size: 22,
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: const TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.w700,
                        fontSize: 14,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      message,
                      style: TextStyle(
                        color: Colors.white.withValues(alpha: 0.95),
                        fontWeight: FontWeight.w400,
                        fontSize: 12.5,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
        duration: const Duration(seconds: 4),
      ),
    );
  }

  // Xử lý đăng nhập Mạng xã hội (Google / Apple) với kiểm tra bảo mật vai trò nghiêm ngặt
  Future<void> _handleSocialLogin(String provider, {String? token}) async {
    FocusScope.of(context).unfocus();
    setState(() {
      _isLoading = true;
    });

    try {
      AuthResponseModel? auth;
      if (token != null && token.isNotEmpty) {
        if (provider.toLowerCase().contains('google')) {
          auth = await _authService.loginWithGoogle(idToken: token);
        } else if (provider.toLowerCase().contains('apple')) {
          auth = await _authService.loginWithApple(identityToken: token);
        }
      } else {
        // Chưa có token -> mở SDK Google/Apple thật
        if (provider.toLowerCase().contains('google')) {
          final idToken = await GoogleAuthService.signInAndGetIdToken();
          auth = await _authService.loginWithGoogle(idToken: idToken);
        } else if (provider.toLowerCase().contains('apple')) {
          // TODO: tích hợp sign_in_with_apple sau. Hiện tại chưa hỗ trợ Apple trên Android.
          throw Exception('Đăng nhập Apple ID hiện chưa hỗ trợ trên Android.');
        }
      }

      if (auth != null) {
        final loggedInUser = auth.user;
        // KIỂM TRA BẢO MẬT: Chỉ cho phép USER / TOURIST
        if (!isTouristRole(loggedInUser.role)) {
          await TokenStorage.clear();
          throw Exception(kInvalidAuthErrorMessage);
        }

        if (!mounted) return;
        setState(() {
          _isLoading = false;
        });

        _showSuccessFeedback(
          title: 'Đăng nhập thành công!',
          message: 'Chào mừng quý khách quay trở lại với JourneyGo!',
          isReward: false,
        );

        await Future.delayed(const Duration(milliseconds: 250));
        if (!mounted) return;

        Navigator.pushReplacement(
          context,
          MaterialPageRoute(
            builder: (_) => TouristHomeScreen(initialUser: loggedInUser),
          ),
        );
      }
    } on AuthRoleException {
      // TUYỆT ĐỐI KHÔNG hiển thị dialog lộ thông tin vai trò hệ thống
      await TokenStorage.clear();
      if (!mounted) return;
      setState(() {
        _isLoading = false;
      });
      _showErrorFeedback(
        title: 'Đăng nhập không thành công',
        message: kInvalidAuthErrorMessage,
      );
    } catch (e) {
      await TokenStorage.clear();
      if (!mounted) return;
      setState(() {
        _isLoading = false;
      });
      final rawError = e.toString().replaceAll('Exception: ', '').trim();
      final displayMessage = (rawError.contains('vai trò') ||
              rawError.contains('role') ||
              rawError.contains('Role') ||
              rawError.contains('không hợp lệ') ||
              rawError.contains('401') ||
              rawError.contains('403'))
          ? kInvalidAuthErrorMessage
          : (rawError.isNotEmpty ? rawError : kInvalidAuthErrorMessage);

      _showErrorFeedback(
        title: 'Đăng nhập không thành công',
        message: displayMessage,
      );
    }
  }

  // Hiển thị SnackBar chúc mừng đạt chuẩn thông báo thương mại
  void _showSuccessFeedback({
    required String title,
    required String message,
    required bool isReward,
  }) {
    ScaffoldMessenger.of(context).clearSnackBars();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        behavior: SnackBarBehavior.floating,
        margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
        content: Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          decoration: BoxDecoration(
            color: isReward
                ? AppCultureColors.heritageJade
                : AppCultureColors.oceanBlue,
            borderRadius: BorderRadius.circular(16),
            boxShadow: [
              BoxShadow(
                color: (isReward
                        ? AppCultureColors.heritageJade
                        : AppCultureColors.oceanBlue)
                    .withValues(alpha: 0.35),
                blurRadius: 18,
                offset: const Offset(0, 8),
              ),
            ],
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              Container(
                width: 38,
                height: 38,
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.2),
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.check_circle_rounded,
                  color: Colors.white,
                  size: 22,
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: const TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.w700,
                        fontSize: 14,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      message,
                      style: TextStyle(
                        color: Colors.white.withValues(alpha: 0.95),
                        fontWeight: FontWeight.w400,
                        fontSize: 12.5,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
        duration: const Duration(seconds: 4),
      ),
    );
  }

  // Dialog Quên Mật Khẩu
  /// Khôi phục mật khẩu bằng mã OTP qua email; xong thì điền sẵn email để đăng nhập lại.
  Future<void> _showForgotPasswordDialog() async {
    final email = await Navigator.of(context).push<String>(
      MaterialPageRoute(
        builder: (_) => ForgotPasswordScreen(initialEmail: _emailController.text.trim()),
      ),
    );
    if (email != null && mounted) {
      setState(() {
        _emailController.text = email;
        _passwordController.clear();
      });
    }
  }

  void _showTermsModal() {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (BuildContext sheetContext) {
        return Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Row(
                    children: [
                      Icon(
                        Icons.verified_user_rounded,
                        color: AppCultureColors.heritageJade,
                        size: 24,
                      ),
                      SizedBox(width: 8),
                      Text(
                        'Tiêu chuẩn Di sản số',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w700,
                          color: AppCultureColors.textDark,
                        ),
                      ),
                    ],
                  ),
                  IconButton(
                    icon: const Icon(Icons.close_rounded),
                    onPressed: () => Navigator.pop(sheetContext),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              const Text(
                'Dữ liệu của du khách được mã hóa an toàn theo tiêu chuẩn bảo tồn văn hóa số quốc gia. Chúng tôi cam kết tuyệt đối bảo mật thông tin định danh, lịch sử chuyến đi và tài sản điểm thưởng di sản của quý khách.',
                style: TextStyle(
                  fontSize: 13.5,
                  color: AppCultureColors.textMuted,
                  height: 1.5,
                ),
              ),
              const SizedBox(height: 20),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () => Navigator.pop(sheetContext),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppCultureColors.heritageJade,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(14),
                    ),
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    elevation: 0,
                  ),
                  child: const Text(
                    'Đã hiểu và đồng ý',
                    style: TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppCultureColors.background,
      body: GestureDetector(
        // Chạm ra ngoài để ẩn bàn phím mềm
        onTap: () => FocusScope.of(context).unfocus(),
        child: SingleChildScrollView(
          physics: const BouncingScrollPhysics(),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // ========================================================
              // 1. ĐẦU TRANG: LOGO JOURNEYGO + LỜI CHÀO
              // ========================================================
              _buildBrandHeader(),

              // ========================================================
              // NỘI DUNG THÂN GIAO DIỆN CHÍNH
              // ========================================================
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    const SizedBox(height: 16),

                    // ====================================================
                    // 2. BỘ CHUYỂN ĐỔI SEGMENTED CONTROL DẠNG VIÊN THUỐC
                    // ====================================================
                    _buildSegmentedControl(),

                    const SizedBox(height: 14),

                    // ====================================================
                    // 3. HỘP THÔNG BÁO ƯU ĐÃI (KHI Ở TAB TẠO TÀI KHOẢN)
                    // ====================================================
                    AnimatedCrossFade(
                      duration: const Duration(milliseconds: 250),
                      crossFadeState: !_isLogin
                          ? CrossFadeState.showFirst
                          : CrossFadeState.showSecond,
                      firstChild: _buildRewardBanner(),
                      secondChild: const SizedBox(height: 2),
                    ),

                    const SizedBox(height: 16),

                    // ====================================================
                    // 4. FORM NHẬP LIỆU CHUẨN THUMB-ZONE & STATE
                    // ====================================================
                    Form(
                      key: _formKey,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          // Các trường chỉ hiển thị khi ĐĂNG KÝ
                          if (!_isLogin) ...[
                            _buildInputField(
                              label: 'Họ và tên',
                              hintText: 'Nguyễn Văn An',
                              controller: _fullNameController,
                              focusNode: _fullNameFocus,
                              prefixIcon: Icons.badge_outlined,
                              textCapitalization: TextCapitalization.words,
                              validator: (value) {
                                if (value == null || value.trim().isEmpty) {
                                  return 'Vui lòng nhập họ và tên của quý khách';
                                }
                                if (value.trim().length < 2) {
                                  return 'Họ tên quá ngắn';
                                }
                                return null;
                              },
                            ),
                            const SizedBox(height: 14),
                          ],

                          // Trường Email / Tài khoản (Dùng cho cả Đăng nhập & Đăng ký)
                          _buildInputField(
                            label: 'Email',
                            hintText: 'ten@email.com',
                            controller: _emailController,
                            focusNode: _emailFocus,
                            prefixIcon: Icons.alternate_email_rounded,
                            keyboardType: TextInputType.emailAddress,
                            validator: (value) {
                              if (value == null || value.trim().isEmpty) {
                                return 'Vui lòng nhập địa chỉ email';
                              }
                              final emailRegex = RegExp(
                                r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$',
                              );
                              if (!emailRegex.hasMatch(value.trim())) {
                                return 'Định dạng email chưa hợp lệ';
                              }
                              return null;
                            },
                          ),
                          const SizedBox(height: 14),

                          // Trường Số điện thoại (Chỉ hiển thị khi ĐĂNG KÝ)
                          if (!_isLogin) ...[
                            _buildInputField(
                              label: 'Số điện thoại',
                              hintText: '0987 654 321',
                              controller: _phoneController,
                              focusNode: _phoneFocus,
                              prefixIcon: Icons.phone_android_rounded,
                              keyboardType: TextInputType.phone,
                              validator: (value) {
                                if (value == null || value.trim().isEmpty) {
                                  return 'Vui lòng cung cấp số điện thoại';
                                }
                                final cleanPhone =
                                    value.replaceAll(RegExp(r'\s+'), '');
                                if (cleanPhone.length < 9 ||
                                    cleanPhone.length > 11) {
                                  return 'Số điện thoại gồm 9 - 11 chữ số';
                                }
                                return null;
                              },
                            ),
                            const SizedBox(height: 14),
                          ],

                          // Trường Mật khẩu (Dùng cho cả 2 tab)
                          _buildInputField(
                            label: 'Mật khẩu',
                            hintText: _isLogin ? 'Nhập mật khẩu' : 'Tối thiểu 6 ký tự',
                            controller: _passwordController,
                            focusNode: _passwordFocus,
                            prefixIcon: Icons.lock_outline_rounded,
                            obscureText: _obscurePassword,
                            suffixIcon: IconButton(
                              splashRadius: 18,
                              icon: Icon(
                                _obscurePassword
                                    ? Icons.visibility_off_outlined
                                    : Icons.visibility_outlined,
                                color: AppCultureColors.textMuted,
                                size: 20,
                              ),
                              onPressed: () {
                                setState(() {
                                  _obscurePassword = !_obscurePassword;
                                });
                              },
                            ),
                            validator: (value) {
                              if (value == null || value.isEmpty) {
                                return 'Vui lòng nhập mật khẩu';
                              }
                              if (value.length < 6) {
                                return 'Mật khẩu phải chứa ít nhất 6 ký tự';
                              }
                              return null;
                            },
                          ),

                          // Trường Xác nhận mật khẩu (Chỉ hiển thị khi ĐĂNG KÝ)
                          if (!_isLogin) ...[
                            const SizedBox(height: 14),
                            _buildInputField(
                              label: 'Nhập lại mật khẩu',
                              hintText: 'Nhập lại mật khẩu vừa tạo',
                              controller: _confirmPasswordController,
                              focusNode: _confirmPasswordFocus,
                              prefixIcon: Icons.verified_user_outlined,
                              obscureText: _obscureConfirmPassword,
                              suffixIcon: IconButton(
                                splashRadius: 18,
                                icon: Icon(
                                  _obscureConfirmPassword
                                      ? Icons.visibility_off_outlined
                                      : Icons.visibility_outlined,
                                  color: AppCultureColors.textMuted,
                                  size: 20,
                                ),
                                onPressed: () {
                                  setState(() {
                                    _obscureConfirmPassword =
                                        !_obscureConfirmPassword;
                                  });
                                },
                              ),
                              validator: (value) {
                                if (value == null || value.isEmpty) {
                                  return 'Vui lòng nhập lại mật khẩu';
                                }
                                if (value != _passwordController.text) {
                                  return 'Mật khẩu xác nhận không khớp';
                                }
                                return null;
                              },
                            ),
                          ],

                          const SizedBox(height: 10),

                          // Hàng tiện ích: Checkbox Ghi nhớ & Quên mật khẩu
                          _buildUtilitiesRow(),

                          const SizedBox(height: 18),

                          // ====================================================
                          // 5. NÚT HÀNH ĐỘNG CHÍNH (PRIMARY CTA VỚI BOUNCE SCALE)
                          // ====================================================
                          _buildPrimaryCTA(),

                          const SizedBox(height: 24),

                          // ====================================================
                          // 6. ĐĂNG NHẬP MẠNG XÃ HỘI (SOCIAL LOGIN)
                          // ====================================================
                          _buildSocialLoginSection(),

                          const SizedBox(height: 28),

                          // ====================================================
                          // 7. CHÂN TRANG CAM KẾT BẢO MẬT & ĐIỀU KHOẢN
                          // ====================================================
                          _buildSecurityFooter(),

                          const SizedBox(height: 24),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // --------------------------------------------------------------------------
  // WIDGET: ĐẦU TRANG THƯƠNG HIỆU (LOGO GIỐNG TRANG WEB)
  // --------------------------------------------------------------------------
  /// Logo JourneyGo (biểu tượng + chữ, cùng bộ ảnh với frontend) và khẩu hiệu,
  /// trên nền chuyển màu nhẹ, không phụ thuộc mạng.
  Widget _buildBrandHeader() {
    return Container(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [AppCultureColors.jadeLight, AppCultureColors.background],
        ),
      ),
      child: SafeArea(
        bottom: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(24, 28, 24, 8),
          child: Column(
            children: [
              Image.asset(
                'assets/images/journeygo_emblem.png',
                height: 96,
                filterQuality: FilterQuality.medium,
              ),
              const SizedBox(height: 10),
              Image.asset(
                'assets/images/journeygo_wordmark.png',
                height: 46,
                filterQuality: FilterQuality.medium,
              ),
              const SizedBox(height: 12),
              AnimatedSwitcher(
                duration: const Duration(milliseconds: 200),
                child: Text(
                  _isLogin
                      ? 'Chào mừng trở lại! Đăng nhập để tiếp tục hành trình.'
                      : 'Tạo tài khoản để khám phá di sản và nhận điểm thưởng.',
                  key: ValueKey(_isLogin),
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    fontSize: 13.5,
                    height: 1.4,
                    color: AppCultureColors.textMuted,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // --------------------------------------------------------------------------
  // WIDGET: BỘ CHUYỂN ĐỔI SEGMENTED CONTROL DẠNG VIÊN THUỐC
  // --------------------------------------------------------------------------
  Widget _buildSegmentedControl() {
    return Container(
      height: 46,
      padding: const EdgeInsets.all(3.5),
      decoration: BoxDecoration(
        color: AppCultureColors.surfaceSubtle,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: AppCultureColors.border,
          width: 0.8,
        ),
      ),
      child: LayoutBuilder(
        builder: (context, constraints) {
          final double segmentWidth = (constraints.maxWidth) / 2;

          return Stack(
            children: [
              // Nút trượt nền trắng đổ bóng nhẹ
              AnimatedAlign(
                duration: const Duration(milliseconds: 220),
                curve: Curves.easeOutCubic,
                alignment:
                    _isLogin ? Alignment.centerLeft : Alignment.centerRight,
                child: Container(
                  width: segmentWidth,
                  height: double.infinity,
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(11),
                    boxShadow: const [
                      BoxShadow(
                        color: Color(0x140F172A),
                        blurRadius: 6,
                        offset: Offset(0, 2),
                      ),
                    ],
                  ),
                ),
              ),

              // 2 Tùy chọn bấm
              Row(
                children: [
                  Expanded(
                    child: InkWell(
                      borderRadius: BorderRadius.circular(11),
                      onTap: () => _switchTab(true),
                      child: Center(
                        child: AnimatedDefaultTextStyle(
                          duration: const Duration(milliseconds: 200),
                          style: TextStyle(
                            fontSize: 13.5,
                            fontWeight:
                                _isLogin ? FontWeight.w700 : FontWeight.w500,
                            color: _isLogin
                                ? AppCultureColors.oceanBlue
                                : AppCultureColors.textMuted,
                          ),
                          child: const Text('Đăng nhập'),
                        ),
                      ),
                    ),
                  ),
                  Expanded(
                    child: InkWell(
                      borderRadius: BorderRadius.circular(11),
                      onTap: () => _switchTab(false),
                      child: Center(
                        child: AnimatedDefaultTextStyle(
                          duration: const Duration(milliseconds: 200),
                          style: TextStyle(
                            fontSize: 13.5,
                            fontWeight:
                                !_isLogin ? FontWeight.w700 : FontWeight.w500,
                            color: !_isLogin
                                ? AppCultureColors.heritageJade
                                : AppCultureColors.textMuted,
                          ),
                          child: const Text('Tạo tài khoản'),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ],
          );
        },
      ),
    );
  }

  // --------------------------------------------------------------------------
  // WIDGET: HỘP THÔNG BÁO ƯU ĐÃI NỀN VÀNG KEM (+100 ĐIỂM)
  // --------------------------------------------------------------------------
  Widget _buildRewardBanner() {
    return Container(
      margin: const EdgeInsets.only(top: 10),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
      decoration: BoxDecoration(
        color: AppCultureColors.rewardBg,
        borderRadius: BorderRadius.circular(13),
        border: Border.all(
          color: AppCultureColors.rewardBorder,
          width: 0.9,
        ),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          const Text(
            '🎉',
            style: TextStyle(fontSize: 18),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: RichText(
              text: const TextSpan(
                style: TextStyle(
                  color: AppCultureColors.rewardText,
                  fontSize: 12.5,
                  height: 1.35,
                ),
                children: [
                  TextSpan(
                    text: 'Nhận ngay ',
                  ),
                  TextSpan(
                    text: '+100 điểm thưởng ',
                    style: TextStyle(fontWeight: FontWeight.w700),
                  ),
                  TextSpan(
                    text: 'khám phá di sản khi tạo tài khoản mới!',
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  // --------------------------------------------------------------------------
  // WIDGET: Ô INPUT CHUẨN THUMB-ZONE VỚI FOCUS GLOW
  // --------------------------------------------------------------------------
  Widget _buildInputField({
    required String label,
    required String hintText,
    required TextEditingController controller,
    required FocusNode focusNode,
    required IconData prefixIcon,
    Widget? suffixIcon,
    bool obscureText = false,
    TextInputType keyboardType = TextInputType.text,
    TextCapitalization textCapitalization = TextCapitalization.none,
    String? Function(String?)? validator,
  }) {
    final bool isFocused = focusNode.hasFocus;
    final Color activeColor =
        _isLogin ? AppCultureColors.oceanBlue : AppCultureColors.heritageJade;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Label trên ô nhập
        Text(
          label,
          style: const TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w600,
            color: AppCultureColors.textDark,
          ),
        ),
        const SizedBox(height: 6),

        // Khung TextFormField bo góc mềm mại
        AnimatedContainer(
          duration: const Duration(milliseconds: 180),
          decoration: BoxDecoration(
            color: AppCultureColors.surface,
            borderRadius: BorderRadius.circular(13),
            border: Border.all(
              color: isFocused ? activeColor : AppCultureColors.border,
              width: isFocused ? 1.4 : 1.0,
            ),
            boxShadow: isFocused
                ? [
                    BoxShadow(
                      color: activeColor.withValues(alpha: 0.12),
                      blurRadius: 8,
                      offset: const Offset(0, 2),
                    ),
                  ]
                : const [],
          ),
          child: TextFormField(
            controller: controller,
            focusNode: focusNode,
            obscureText: obscureText,
            keyboardType: keyboardType,
            textCapitalization: textCapitalization,
            validator: validator,
            style: const TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w500,
              color: AppCultureColors.textDark,
            ),
            decoration: InputDecoration(
              hintText: hintText,
              hintStyle: const TextStyle(
                color: AppCultureColors.textLight,
                fontSize: 13.5,
                fontWeight: FontWeight.w400,
              ),
              prefixIcon: Icon(
                prefixIcon,
                color: isFocused ? activeColor : AppCultureColors.textMuted,
                size: 19,
              ),
              suffixIcon: suffixIcon,
              contentPadding: const EdgeInsets.symmetric(
                horizontal: 14,
                vertical: 13,
              ),
              border: InputBorder.none,
              isDense: true,
              errorStyle: const TextStyle(
                color: AppCultureColors.error,
                fontSize: 11.5,
                height: 1.1,
              ),
            ),
          ),
        ),
      ],
    );
  }

  // --------------------------------------------------------------------------
  // WIDGET: HÀNG TIỆN ÍCH (GHI NHỚ & QUÊN MẬT KHẨU)
  // --------------------------------------------------------------------------
  Widget _buildUtilitiesRow() {
    final Color activeColor =
        _isLogin ? AppCultureColors.oceanBlue : AppCultureColors.heritageJade;

    return Row(
      mainAxisAlignment: dynamicMainAxisAlignment(),
      children: [
        // Checkbox ghi nhớ đăng nhập
        InkWell(
          borderRadius: BorderRadius.circular(8),
          onTap: () {
            setState(() {
              _rememberMe = !_rememberMe;
            });
          },
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 4.0),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                AnimatedContainer(
                  duration: const Duration(milliseconds: 180),
                  width: 20,
                  height: 20,
                  decoration: BoxDecoration(
                    color: _rememberMe ? activeColor : Colors.white,
                    borderRadius: BorderRadius.circular(6),
                    border: Border.all(
                      color: _rememberMe
                          ? activeColor
                          : AppCultureColors.textLight,
                      width: 1.4,
                    ),
                  ),
                  child: _rememberMe
                      ? const Icon(
                          Icons.check_rounded,
                          size: 14,
                          color: Colors.white,
                        )
                      : null,
                ),
                const SizedBox(width: 8),
                const Text(
                  'Ghi nhớ đăng nhập',
                  style: TextStyle(
                    fontSize: 12.5,
                    color: AppCultureColors.textMuted,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
            ),
          ),
        ),

        // Link Quên mật khẩu
        TextButton(
          onPressed: _showForgotPasswordDialog,
          style: TextButton.styleFrom(
            padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 4),
            minimumSize: Size.zero,
            tapTargetSize: MaterialTapTargetSize.shrinkWrap,
          ),
          child: const Text(
            'Quên mật khẩu?',
            style: TextStyle(
              fontSize: 12.5,
              fontWeight: FontWeight.w600,
              color: AppCultureColors.oceanBlue,
            ),
          ),
        ),
      ],
    );
  }

  MainAxisAlignment dynamicMainAxisAlignment() => MainAxisAlignment.spaceBetween;

  // --------------------------------------------------------------------------
  // WIDGET: NÚT PRIMARY CTA VỚI HIỆU ỨNG NẢY (ACTIVE SCALE)
  // --------------------------------------------------------------------------
  Widget _buildPrimaryCTA() {
    final Color buttonColor =
        _isLogin ? AppCultureColors.oceanBlue : AppCultureColors.heritageJade;
    final String buttonLabel =
        _isLogin ? 'Đăng nhập' : 'Tạo tài khoản ';

    return GestureDetector(
      onTapDown: (_) => setState(() => _isButtonPressed = true),
      onTapUp: (_) {
        setState(() => _isButtonPressed = false);
        _handleSubmit();
      },
      onTapCancel: () => setState(() => _isButtonPressed = false),
      child: AnimatedScale(
        scale: _isButtonPressed ? 0.97 : 1.0,
        duration: const Duration(milliseconds: 120),
        curve: Curves.easeOutQuad,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 250),
          height: 48,
          decoration: BoxDecoration(
            color: buttonColor,
            borderRadius: BorderRadius.circular(14),
            boxShadow: [
              BoxShadow(
                color: buttonColor.withValues(alpha: 0.35),
                blurRadius: 14,
                offset: const Offset(0, 6),
              ),
            ],
          ),
          child: Stack(
            alignment: Alignment.center,
            children: [
              if (_isLoading)
                const SizedBox(
                  width: 22,
                  height: 22,
                  child: CircularProgressIndicator(
                    strokeWidth: 2.4,
                    color: Colors.white,
                  ),
                )
              else
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16.0),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(
                        buttonLabel,
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 14.5,
                          fontWeight: FontWeight.w700,
                          letterSpacing: 0.1,
                        ),
                      ),
                      const SizedBox(width: 8),

                      // Biểu tượng mũi tên lồng trong vòng tròn (Button-in-Button Pattern)
                      Container(
                        width: 26,
                        height: 26,
                        decoration: BoxDecoration(
                          color: Colors.white.withValues(alpha: 0.22),
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(
                          Icons.arrow_forward_rounded,
                          color: Colors.white,
                          size: 15,
                        ),
                      ),
                    ],
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }

  // --------------------------------------------------------------------------
  // WIDGET: CỤM ĐĂNG NHẬP MẠNG XÃ HỘI
  // --------------------------------------------------------------------------
  Widget _buildSocialLoginSection() {
    return Column(
      children: [
        // Dòng phân cách "HOẶC TIẾP TỤC VỚI"
        const Row(
          children: [
            Expanded(
              child: Divider(
                color: AppCultureColors.border,
                thickness: 0.8,
              ),
            ),
            Padding(
              padding: EdgeInsets.symmetric(horizontal: 12.0),
              child: Text(
                'hoặc tiếp tục với',
                style: TextStyle(
                  fontSize: 10.5,
                  fontWeight: FontWeight.w600,
                  letterSpacing: 0.2,
                  color: AppCultureColors.textMuted,
                ),
              ),
            ),
            Expanded(
              child: Divider(
                color: AppCultureColors.border,
                thickness: 0.8,
              ),
            ),
          ],
        ),

        const SizedBox(height: 16),

        // Đăng nhập Google (Apple ID chưa hỗ trợ trên Android nên chưa hiện)
        SizedBox(
          width: double.infinity,
          child: _buildSocialButton(
            label: 'Tiếp tục với Google',
            iconWidget: CustomPaint(
              size: const Size(18, 18),
              painter: GoogleLogoPainter(),
            ),
            onTap: () => _handleSocialLogin('Google'),
          ),
        ),
      ],
    );
  }

  // Nút xã hội đơn lẻ
  Widget _buildSocialButton({
    required String label,
    required Widget iconWidget,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(14),
      child: Container(
        height: 46,
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: AppCultureColors.border,
            width: 1.0,
          ),
          boxShadow: const [
            BoxShadow(
              color: Color(0x0A0F172A),
              blurRadius: 6,
              offset: Offset(0, 2),
            ),
          ],
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            iconWidget,
            const SizedBox(width: 8),
            Text(
              label,
              style: const TextStyle(
                fontSize: 13.5,
                fontWeight: FontWeight.w600,
                color: AppCultureColors.textDark,
              ),
            ),
          ],
        ),
      ),
    );
  }

  // --------------------------------------------------------------------------
  // WIDGET: CHÂN TRANG CAM KẾT BẢO MẬT & ĐIỀU KHOẢN
  // --------------------------------------------------------------------------
  Widget _buildSecurityFooter() {
    return Center(
      child: InkWell(
        onTap: _showTermsModal,
        borderRadius: BorderRadius.circular(8),
        child: const Padding(
          padding: EdgeInsets.symmetric(horizontal: 8.0, vertical: 4.0),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                Icons.shield_outlined,
                size: 14,
                color: AppCultureColors.heritageJade,
              ),
              SizedBox(width: 6),
              Flexible(
                child: Text(
                  'Bảo mật theo tiêu chuẩn Di sản Văn hóa số • Điều khoản',
                  style: TextStyle(
                    fontSize: 11.5,
                    color: AppCultureColors.textMuted,
                    fontWeight: FontWeight.w500,
                    decoration: TextDecoration.underline,
                    decorationColor: AppCultureColors.border,
                  ),
                  textAlign: TextAlign.center,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ============================================================================
// CUSTOM PAINTER 2: BIỂU TƯỢNG GOOGLE 'G' ĐA SẮC CHUẨN THƯƠNG HIỆU
// ============================================================================
class GoogleLogoPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final double w = size.width;
    final double h = size.height;
    final Offset center = Offset(w / 2, h / 2);
    final double radius = w * 0.42;
    const double strokeWidth = 3.6;

    final Rect rect = Rect.fromCircle(center: center, radius: radius);

    final Paint redPaint = Paint()
      ..color = const Color(0xFFEA4335)
      ..style = PaintingStyle.stroke
      ..strokeWidth = strokeWidth
      ..strokeCap = StrokeCap.round;

    final Paint yellowPaint = Paint()
      ..color = const Color(0xFFFBBC05)
      ..style = PaintingStyle.stroke
      ..strokeWidth = strokeWidth
      ..strokeCap = StrokeCap.round;

    final Paint greenPaint = Paint()
      ..color = const Color(0xFF34A853)
      ..style = PaintingStyle.stroke
      ..strokeWidth = strokeWidth
      ..strokeCap = StrokeCap.round;

    final Paint bluePaint = Paint()
      ..color = const Color(0xFF4285F4)
      ..style = PaintingStyle.stroke
      ..strokeWidth = strokeWidth
      ..strokeCap = StrokeCap.round;

    // Vòng cung Đỏ (Góc trên cùng)
    canvas.drawArc(rect, 3.8, 1.4, false, redPaint);

    // Vòng cung Vàng (Góc bên trái)
    canvas.drawArc(rect, 2.3, 1.5, false, yellowPaint);

    // Vòng cung Xanh lá (Góc dưới cùng)
    canvas.drawArc(rect, 0.8, 1.5, false, greenPaint);

    // Vòng cung Xanh dương (Góc phải)
    canvas.drawArc(rect, 0.0, 0.8, false, bluePaint);

    // Thanh ngang màu xanh dương ở giữa chữ 'G'
    final Paint blueFill = Paint()
      ..color = const Color(0xFF4285F4)
      ..style = PaintingStyle.stroke
      ..strokeWidth = strokeWidth
      ..strokeCap = StrokeCap.round;

    canvas.drawLine(
      Offset(center.dx - 1, center.dy),
      Offset(center.dx + radius, center.dy),
      blueFill,
    );
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
