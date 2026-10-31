import 'package:flutter/foundation.dart' show kDebugMode;
import 'package:flutter/material.dart';
import 'core/models/auth_models.dart';
import 'core/services/auth_service.dart';
import 'core/services/google_auth_service.dart';
import 'core/services/server_finder.dart';
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

  // Hộp thoại tùy chỉnh cấu hình máy chủ Backend API
  /// Cấu hình địa chỉ backend (chỉ có ở bản chạy thử). Điện thoại thật không dùng được 10.0.2.2:
  /// cần IP Wi-Fi của máy tính, hoặc cắm USB + `adb reverse tcp:8088 tcp:8088` rồi dùng 127.0.0.1.
  void _showServerConfigDialog() async {
    final custom = await TokenStorage.hasCustomBaseUrl();
    final currentUrl = await TokenStorage.getBaseUrl();
    final urlController = TextEditingController(text: currentUrl);
    final envUrl = ServerFinder.envBaseUrl;

    if (!mounted) return;

    // null: chưa kiểm tra · true/false: kết quả kiểm tra địa chỉ đang nhập
    bool? reachable;
    bool checking = false;
    String note = custom ? 'Đang dùng địa chỉ bạn đã lưu.' : 'Đang tự dò máy chủ (chưa lưu địa chỉ).';

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) {
          Future<void> check() async {
            setDialogState(() {
              checking = true;
              reachable = null;
            });
            final ok = await ServerFinder.isReachable(urlController.text);
            if (ctx.mounted) {
              setDialogState(() {
                checking = false;
                reachable = ok;
              });
            }
          }

          Widget chip(String label, String url) => ActionChip(
                label: Text(label),
                labelStyle: const TextStyle(fontSize: 12),
                onPressed: () {
                  urlController.text = url;
                  check();
                },
              );

          return AlertDialog(
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
            backgroundColor: Colors.white,
            title: const Row(
              children: [
                Icon(Icons.dns_rounded, color: AppCultureColors.oceanBlue, size: 22),
                SizedBox(width: 10),
                Expanded(
                  child: Text(
                    'Máy chủ API',
                    style: TextStyle(fontSize: 17, fontWeight: FontWeight.w700, color: AppCultureColors.textDark),
                  ),
                ),
              ],
            ),
            content: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(note, style: const TextStyle(fontSize: 12.5, color: AppCultureColors.textMuted)),
                  const SizedBox(height: 10),
                  TextField(
                    controller: urlController,
                    keyboardType: TextInputType.url,
                    onChanged: (_) => setDialogState(() => reachable = null),
                    decoration: InputDecoration(
                      filled: true,
                      fillColor: AppCultureColors.surface,
                      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(10),
                        borderSide: const BorderSide(color: AppCultureColors.border),
                      ),
                      suffixIcon: checking
                          ? const Padding(
                              padding: EdgeInsets.all(12),
                              child: SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2)),
                            )
                          : reachable == null
                              ? null
                              : Icon(
                                  reachable! ? Icons.check_circle_rounded : Icons.error_rounded,
                                  color: reachable! ? AppCultureColors.heritageJade : AppCultureColors.error,
                                ),
                    ),
                    style: const TextStyle(fontSize: 13, fontFamily: 'monospace'),
                  ),
                  if (reachable != null) ...[
                    const SizedBox(height: 6),
                    Text(
                      reachable! ? 'Kết nối được máy chủ.' : 'Không kết nối được địa chỉ này.',
                      style: TextStyle(
                        fontSize: 12,
                        color: reachable! ? AppCultureColors.jadeDark : AppCultureColors.error,
                      ),
                    ),
                  ],
                  const SizedBox(height: 12),
                  const Text(
                    'Chọn nhanh:',
                    style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600, color: AppCultureColors.textDark),
                  ),
                  const SizedBox(height: 6),
                  Wrap(
                    spacing: 6,
                    runSpacing: 6,
                    children: [
                      if (envUrl != null) chip('Từ .env', envUrl),
                      chip('USB (127.0.0.1)', 'http://127.0.0.1:8088/api/v1'),
                      chip('Máy ảo (10.0.2.2)', 'http://10.0.2.2:8088/api/v1'),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: AppCultureColors.oceanLight,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Text(
                      'Điện thoại thật: nhập IP Wi-Fi của máy tính, ví dụ http://192.168.1.5:8088/api/v1 '
                      '(cùng mạng Wi-Fi), hoặc cắm cáp USB, chạy "adb reverse tcp:8088 tcp:8088" rồi chọn USB. '
                      'Địa chỉ 10.0.2.2 chỉ dùng cho máy ảo.',
                      style: TextStyle(fontSize: 12, height: 1.4, color: AppCultureColors.oceanDark),
                    ),
                  ),
                ],
              ),
            ),
            actions: [
              TextButton(
                onPressed: checking
                    ? null
                    : () async {
                        await TokenStorage.resetBaseUrl();
                        final found = await ServerFinder.find();
                        final ok = await ServerFinder.isReachable(found);
                        if (ctx.mounted) {
                          setDialogState(() {
                            urlController.text = found;
                            reachable = ok;
                            note = ok
                                ? 'Đã tự dò thấy máy chủ. App sẽ tự dò mỗi lần mở.'
                                : 'Không dò thấy máy chủ. Hãy nhập IP Wi-Fi của máy tính.';
                          });
                        }
                      },
                child: const Text('Tự dò'),
              ),
              TextButton(
                onPressed: checking ? null : check,
                child: const Text('Kiểm tra'),
              ),
              ElevatedButton(
                onPressed: () async {
                  final newUrl = urlController.text.trim();
                  if (newUrl.isNotEmpty) {
                    await TokenStorage.setBaseUrl(newUrl);
                  }
                  if (ctx.mounted) Navigator.pop(ctx);
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppCultureColors.oceanBlue,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  elevation: 0,
                ),
                child: const Text('Lưu'),
              ),
            ],
          );
        },
      ),
    );
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
    final double screenHeight = MediaQuery.of(context).size.height;
    // Hero banner chiếm ~30% chiều cao màn hình (tối thiểu 230px, tối đa 270px)
    final double bannerHeight = (screenHeight * 0.30).clamp(230.0, 270.0);

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
              // 1. HERO BANNER TRÀN VIỀN PHÍA TRÊN (~30% CHIỀU CAO)
              // ========================================================
              _buildHeroBanner(bannerHeight),

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
                              label: 'Họ và tên du khách',
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
                            label: _isLogin
                                ? 'Tài khoản hoặc Địa chỉ Email'
                                : 'Địa chỉ Email ',
                            hintText: 'dulich@journeygo.vn',
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
                              label: 'Số điện thoại liên hệ',
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
                            label: 'Mật khẩu bảo mật',
                            hintText: 'Tối thiểu 6 ký tự',
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
                              label: 'Xác nhận lại mật khẩu',
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
  // WIDGET: HERO BANNER TRÀN VIỀN
  // --------------------------------------------------------------------------
  Widget _buildHeroBanner(double height) {
    return SizedBox(
      height: height,
      child: Stack(
        fit: StackFit.expand,
        children: [
          // 1. Ảnh phong cảnh thực tế (Tam Cốc - Tràng An / Ninh Bình)
          Image.network(
            'https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=1200&q=80',
            fit: BoxFit.cover,
            errorBuilder: (context, error, stackTrace) {
              // Dự phòng khi thiết bị offline
              return Container(
                decoration: const BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [
                      Color(0xFF0F3E32),
                      Color(0xFF00A86B),
                      Color(0xFF0288D1),
                    ],
                  ),
                ),
              );
            },
            loadingBuilder: (context, child, loadingProgress) {
              if (loadingProgress == null) return child;
              return Container(
                color: const Color(0xFF1E293B),
                child: const Center(
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    color: AppCultureColors.heritageJade,
                  ),
                ),
              );
            },
          ),

          // 2. Lớp phủ Gradient mờ dần từ đen nhẹ ở trên xuống trắng tinh khôi ở đáy
          Positioned.fill(
            child: Container(
              decoration: const BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  stops: [0.0, 0.35, 0.72, 1.0],
                  colors: [
                    Color(0x73000000), // Đen nhẹ 45% ở trên cùng
                    Color(0x22000000),
                    Color(0xB3FFFFFF), // Chuyển tiếp trắng 70%
                    Color(0xFFFFFFFF), // Trắng tinh khôi #FFFFFF ở chân ảnh
                  ],
                ),
              ),
            ),
          ),

          // 3. Thanh trạng thái & Khẩu hiệu thương hiệu nổi đè trên ảnh
          SafeArea(
            bottom: false,
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 18.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const SizedBox(height: 6),

                  // Thanh Top: Logo thương hiệu Hoa Sen Journey Go
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      // Nút cấu hình máy chủ Backend API: chỉ hiện ở bản chạy thử (debug)
                      if (kDebugMode)
                      Material(
                        color: Colors.transparent,
                        child: InkWell(
                          onTap: _showServerConfigDialog,
                          borderRadius: BorderRadius.circular(20),
                          child: Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 10,
                              vertical: 5,
                            ),
                            decoration: BoxDecoration(
                              color: Colors.white.withValues(alpha: 0.92),
                              borderRadius: BorderRadius.circular(20),
                              boxShadow: const [
                                BoxShadow(
                                  color: Color(0x1A000000),
                                  blurRadius: 8,
                                  offset: Offset(0, 2),
                                ),
                              ],
                            ),
                            child: const Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(
                                  Icons.dns_rounded,
                                  size: 14,
                                  color: AppCultureColors.oceanBlue,
                                ),
                                SizedBox(width: 5),
                                Text(
                                  'API :8088',
                                  style: TextStyle(
                                    color: AppCultureColors.textDark,
                                    fontSize: 11.5,
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      )
                      else
                        const SizedBox(width: 1),

                      // Logo thương hiệu "journey go" có hoa sen cách điệu
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 12,
                          vertical: 5,
                        ),
                        decoration: BoxDecoration(
                          color: Colors.white.withValues(alpha: 0.92),
                          borderRadius: BorderRadius.circular(20),
                          boxShadow: const [
                            BoxShadow(
                              color: Color(0x1A000000),
                              blurRadius: 8,
                              offset: Offset(0, 2),
                            ),
                          ],
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            CustomPaint(
                              size: const Size(16, 16),
                              painter: VietLotusLogoPainter(
                                color: AppCultureColors.heritageJade,
                              ),
                            ),
                            const SizedBox(width: 6),
                            const Text(
                              'journey go',
                              style: TextStyle(
                                color: AppCultureColors.textDark,
                                fontSize: 13,
                                fontWeight: FontWeight.w700,
                                letterSpacing: -0.3,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),

                  const Spacer(),

                  // Tag nhỏ: CỔNG TRẢI NGHIỆM DU KHÁCH
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 3.5,
                    ),
                    decoration: BoxDecoration(
                      color: AppCultureColors.heritageJade.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(6),
                      border: Border.all(
                        color: AppCultureColors.heritageJade.withValues(alpha: 0.28),
                        width: 0.8,
                      ),
                    ),
                    child: const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          Icons.travel_explore_rounded,
                          size: 12,
                          color: AppCultureColors.heritageJade,
                        ),
                        SizedBox(width: 4),
                        Text(
                          'Cổng trải nghiệm du khách',
                          style: TextStyle(
                            color: AppCultureColors.heritageJade,
                            fontSize: 10,
                            fontWeight: FontWeight.w700,
                            letterSpacing: 0.2,
                          ),
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 6),

                  // Khẩu hiệu chính
                  const Text(
                    'Chạm vào Lịch sử - Khám phá Di sản',
                    style: TextStyle(
                      color: AppCultureColors.textDark,
                      fontSize: 19.5,
                      fontWeight: FontWeight.w700,
                      letterSpacing: -0.4,
                      height: 1.2,
                    ),
                  ),

                  const SizedBox(height: 4),
                ],
              ),
            ),
          ),
        ],
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
// CUSTOM PAINTER 1: BIỂU TƯỢNG HOA SEN VIỆT NAM (VIETNAM LOTUS LOGO)
// ============================================================================
class VietLotusLogoPainter extends CustomPainter {
  final Color color;

  VietLotusLogoPainter({required this.color});

  @override
  void paint(Canvas canvas, Size size) {
    final Paint paint = Paint()
      ..color = color
      ..style = PaintingStyle.fill
      ..isAntiAlias = true;

    final double w = size.width;
    final double h = size.height;

    // 1. Cánh sen chính giữa (Upright center petal)
    final Path centerPetal = Path();
    centerPetal.moveTo(w * 0.5, h * 0.05);
    centerPetal.cubicTo(w * 0.68, h * 0.35, w * 0.62, h * 0.75, w * 0.5, h * 0.90);
    centerPetal.cubicTo(w * 0.38, h * 0.75, w * 0.32, h * 0.35, w * 0.5, h * 0.05);
    canvas.drawPath(centerPetal, paint);

    // 2. Cánh sen bên trái (Left petal)
    final Path leftPetal = Path();
    leftPetal.moveTo(w * 0.5, h * 0.28);
    leftPetal.cubicTo(w * 0.22, h * 0.30, w * 0.02, h * 0.58, w * 0.18, h * 0.85);
    leftPetal.cubicTo(w * 0.32, h * 0.88, w * 0.44, h * 0.82, w * 0.5, h * 0.90);
    leftPetal.cubicTo(w * 0.40, h * 0.68, w * 0.36, h * 0.46, w * 0.5, h * 0.28);
    canvas.drawPath(leftPetal, paint);

    // 3. Cánh sen bên phải (Right petal)
    final Path rightPetal = Path();
    rightPetal.moveTo(w * 0.5, h * 0.28);
    rightPetal.cubicTo(w * 0.78, h * 0.30, w * 0.98, h * 0.58, w * 0.82, h * 0.85);
    rightPetal.cubicTo(w * 0.68, h * 0.88, w * 0.56, h * 0.82, w * 0.5, h * 0.90);
    rightPetal.cubicTo(w * 0.60, h * 0.68, w * 0.64, h * 0.46, w * 0.5, h * 0.28);
    canvas.drawPath(rightPetal, paint);

    // 4. Đế sen / Đài gương sen mỏng ở đáy
    final Paint basePaint = Paint()
      ..color = color.withValues(alpha: 0.85)
      ..style = PaintingStyle.fill;
    final Rect baseRect = Rect.fromCenter(
      center: Offset(w * 0.5, h * 0.93),
      width: w * 0.50,
      height: h * 0.08,
    );
    canvas.drawRRect(
      RRect.fromRectAndRadius(baseRect, const Radius.circular(3)),
      basePaint,
    );
  }

  @override
  bool shouldRepaint(covariant VietLotusLogoPainter oldDelegate) {
    return oldDelegate.color != color;
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
