import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../core/constants/app_colors.dart';
import '../../core/services/api_client.dart';
import '../../core/services/auth_service.dart';
import '../common/heritage_motion.dart';

// Khôi phục mật khẩu bằng mã OTP qua email, và đổi mật khẩu khi đang đăng nhập.

/// Đầu trang kiểu di sản: nền ngọc, hoa văn trống đồng xoay chậm, tiêu đề ánh vàng.
class _HeritageHeader extends StatelessWidget {
  final String title;
  final String subtitle;
  final IconData icon;

  const _HeritageHeader({required this.title, required this.subtitle, required this.icon});

  @override
  Widget build(BuildContext context) {
    final top = MediaQuery.paddingOf(context).top;
    return Container(
      clipBehavior: Clip.antiAlias,
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          colors: [AppCultureColors.jadeDark, AppCultureColors.oceanBlue],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.vertical(bottom: Radius.circular(28)),
      ),
      child: Stack(
        children: [
          Positioned(
            right: -60,
            top: top - 30,
            child: SlowSpin(child: DrumMotif(size: 210, color: Colors.white.withValues(alpha: 0.1))),
          ),
          Padding(
            padding: EdgeInsets.fromLTRB(8, top + 4, 20, 26),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                IconButton(
                  onPressed: () => Navigator.of(context).maybePop(),
                  icon: const Icon(Icons.arrow_back_rounded, color: Colors.white),
                  tooltip: 'Quay lại',
                ),
                const SizedBox(height: 6),
                Padding(
                  padding: const EdgeInsets.only(left: 12),
                  child: Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: Colors.white.withValues(alpha: 0.16),
                          borderRadius: BorderRadius.circular(14),
                        ),
                        child: Icon(icon, color: Colors.white, size: 24),
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            ShimmerText(
                              title,
                              style: const TextStyle(fontSize: 21, fontWeight: FontWeight.w700, color: Colors.white),
                            ),
                            const SizedBox(height: 3),
                            Text(
                              subtitle,
                              style: TextStyle(fontSize: 13, height: 1.4, color: Colors.white.withValues(alpha: 0.88)),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

InputDecoration _fieldDecoration(String label, IconData icon, {Widget? suffix, String? helper}) {
  OutlineInputBorder border(Color c, [double w = 1]) => OutlineInputBorder(
        borderRadius: BorderRadius.circular(16),
        borderSide: BorderSide(color: c, width: w),
      );
  return InputDecoration(
    labelText: label,
    helperText: helper,
    helperMaxLines: 2,
    prefixIcon: Icon(icon, color: AppCultureColors.textMuted),
    suffixIcon: suffix,
    filled: true,
    fillColor: Colors.white,
    border: border(AppCultureColors.border),
    enabledBorder: border(AppCultureColors.border),
    focusedBorder: border(AppCultureColors.heritageJade, 1.5),
    errorBorder: border(AppCultureColors.error),
  );
}

/// Ô mật khẩu có nút ẩn/hiện.
class _PasswordField extends StatefulWidget {
  final TextEditingController controller;
  final String label;
  final String? helper;
  final String? Function(String?)? validator;
  final TextInputAction action;

  const _PasswordField({
    required this.controller,
    required this.label,
    this.helper,
    this.validator,
    this.action = TextInputAction.next,
  });

  @override
  State<_PasswordField> createState() => _PasswordFieldState();
}

class _PasswordFieldState extends State<_PasswordField> {
  bool _hidden = true;

  @override
  Widget build(BuildContext context) {
    return TextFormField(
      controller: widget.controller,
      obscureText: _hidden,
      textInputAction: widget.action,
      validator: widget.validator,
      decoration: _fieldDecoration(
        widget.label,
        Icons.lock_outline_rounded,
        helper: widget.helper,
        suffix: IconButton(
          tooltip: _hidden ? 'Hiện mật khẩu' : 'Ẩn mật khẩu',
          icon: Icon(_hidden ? Icons.visibility_outlined : Icons.visibility_off_outlined),
          onPressed: () => setState(() => _hidden = !_hidden),
        ),
      ),
    );
  }
}

Widget _primaryButton({required String label, required bool busy, required VoidCallback? onPressed}) {
  return SizedBox(
    width: double.infinity,
    height: 52,
    child: FilledButton(
      onPressed: busy ? null : onPressed,
      style: FilledButton.styleFrom(
        backgroundColor: AppCultureColors.heritageJade,
        disabledBackgroundColor: AppCultureColors.heritageJade.withValues(alpha: 0.6),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      ),
      child: busy
          ? const SizedBox(
              width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2.4, color: Colors.white))
          : Text(label, style: const TextStyle(fontSize: 15.5, fontWeight: FontWeight.w600)),
    ),
  );
}

Widget _errorBox(String message) {
  return Container(
    width: double.infinity,
    margin: const EdgeInsets.only(bottom: 14),
    padding: const EdgeInsets.all(12),
    decoration: BoxDecoration(
      color: const Color(0xFFFEF2F2),
      borderRadius: BorderRadius.circular(14),
      border: const Border(left: BorderSide(color: AppCultureColors.error, width: 3)),
    ),
    child: Text(message, style: const TextStyle(fontSize: 13, height: 1.4, color: AppCultureColors.error)),
  );
}

String? _validateNewPassword(String? v) {
  if (v == null || v.isEmpty) return 'Vui lòng nhập mật khẩu mới';
  if (v.length < 6) return 'Mật khẩu phải có ít nhất 6 ký tự';
  return null;
}

// ─────────────────────────── Quên mật khẩu ───────────────────────────

/// Ba bước: nhập email → nhập mã OTP → đặt mật khẩu mới. Thành công thì trả về email để điền sẵn ở màn đăng nhập.
class ForgotPasswordScreen extends StatefulWidget {
  final String initialEmail;

  const ForgotPasswordScreen({super.key, this.initialEmail = ''});

  @override
  State<ForgotPasswordScreen> createState() => _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends State<ForgotPasswordScreen> {
  static const _resendSeconds = 60;

  final AuthService _auth = AuthService();
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _email = TextEditingController(text: widget.initialEmail);
  final TextEditingController _otp = TextEditingController();
  final TextEditingController _password = TextEditingController();
  final TextEditingController _confirm = TextEditingController();

  int _step = 0; // 0: email, 1: OTP, 2: mật khẩu mới
  bool _busy = false;
  String? _error;
  int _resendIn = 0;
  Timer? _timer;

  @override
  void dispose() {
    _timer?.cancel();
    _email.dispose();
    _otp.dispose();
    _password.dispose();
    _confirm.dispose();
    super.dispose();
  }

  void _startCountdown() {
    _timer?.cancel();
    setState(() => _resendIn = _resendSeconds);
    _timer = Timer.periodic(const Duration(seconds: 1), (t) {
      if (!mounted) return t.cancel();
      setState(() => _resendIn--);
      if (_resendIn <= 0) t.cancel();
    });
  }

  Future<void> _run(Future<void> Function() action) async {
    FocusManager.instance.primaryFocus?.unfocus();
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await action();
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _sendCode({bool resend = false}) async {
    if (!resend && !(_formKey.currentState?.validate() ?? false)) return;
    await _run(() async {
      await _auth.forgotPassword(_email.text);
      if (!mounted) return;
      _startCountdown();
      setState(() => _step = 1);
      if (resend) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
          content: Text('Đã gửi lại mã OTP tới email của bạn.'),
          behavior: SnackBarBehavior.floating,
        ));
      }
    });
  }

  Future<void> _verifyCode() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    await _run(() async {
      await _auth.verifyOtp(email: _email.text, otp: _otp.text.trim());
      if (mounted) setState(() => _step = 2);
    });
  }

  Future<void> _reset() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    await _run(() async {
      await _auth.resetPassword(
        email: _email.text,
        otp: _otp.text.trim(),
        newPassword: _password.text,
        confirmPassword: _confirm.text,
      );
      if (!mounted) return;
      await showDialog<void>(
        context: context,
        builder: (ctx) => AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(22)),
          icon: const Icon(Icons.verified_rounded, color: AppCultureColors.heritageJade, size: 44),
          title: const Text('Đặt lại mật khẩu thành công',
              textAlign: TextAlign.center, style: TextStyle(fontSize: 17, fontWeight: FontWeight.w700)),
          content: const Text('Hãy đăng nhập bằng mật khẩu mới.',
              textAlign: TextAlign.center, style: TextStyle(color: AppCultureColors.textMuted)),
          actions: [
            FilledButton(
              onPressed: () => Navigator.pop(ctx),
              style: FilledButton.styleFrom(backgroundColor: AppCultureColors.heritageJade),
              child: const Text('Đăng nhập'),
            ),
          ],
        ),
      );
      if (mounted) Navigator.of(context).pop(_email.text.trim());
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppCultureColors.background,
      body: SingleChildScrollView(
        keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
        child: Column(
          children: [
            const _HeritageHeader(
              title: 'Khôi phục mật khẩu',
              subtitle: 'Nhận mã OTP qua email để đặt lại mật khẩu',
              icon: Icons.key_rounded,
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 20, 20, 32),
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _StepIndicator(step: _step, labels: const ['Email', 'Mã OTP', 'Mật khẩu mới']),
                    const SizedBox(height: 22),
                    if (_error != null) _errorBox(_error!),
                    AnimatedSwitcher(
                      duration: reduceMotion(context) ? Duration.zero : const Duration(milliseconds: 280),
                      transitionBuilder: (child, anim) => FadeTransition(
                        opacity: anim,
                        child: SlideTransition(
                          position: Tween(begin: const Offset(0.06, 0), end: Offset.zero).animate(anim),
                          child: child,
                        ),
                      ),
                      child: KeyedSubtree(key: ValueKey(_step), child: _buildStep()),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStep() {
    switch (_step) {
      case 0:
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Nhập email bạn đã dùng để đăng ký. Chúng tôi sẽ gửi mã gồm 6 chữ số.',
                style: TextStyle(fontSize: 13.5, height: 1.45, color: AppCultureColors.textMuted)),
            const SizedBox(height: 16),
            TextFormField(
              controller: _email,
              keyboardType: TextInputType.emailAddress,
              textInputAction: TextInputAction.done,
              onFieldSubmitted: (_) => _sendCode(),
              validator: (v) {
                final value = v?.trim() ?? '';
                if (value.isEmpty) return 'Vui lòng nhập email';
                if (!RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$').hasMatch(value)) return 'Email không đúng định dạng';
                return null;
              },
              decoration: _fieldDecoration('Email', Icons.alternate_email_rounded),
            ),
            const SizedBox(height: 22),
            _primaryButton(label: 'Gửi mã OTP', busy: _busy, onPressed: _sendCode),
          ],
        );
      case 1:
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text.rich(
              TextSpan(children: [
                const TextSpan(text: 'Mã đã được gửi tới '),
                TextSpan(
                  text: _email.text.trim(),
                  style: const TextStyle(fontWeight: FontWeight.w600, color: AppCultureColors.textDark),
                ),
                const TextSpan(text: '. Kiểm tra cả thư mục Spam nếu chưa thấy.'),
              ]),
              style: const TextStyle(fontSize: 13.5, height: 1.45, color: AppCultureColors.textMuted),
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _otp,
              autofocus: true,
              keyboardType: TextInputType.number,
              textAlign: TextAlign.center,
              maxLength: 6,
              inputFormatters: [FilteringTextInputFormatter.digitsOnly],
              onChanged: (v) {
                if (v.length == 6) _verifyCode();
              },
              validator: (v) => (v ?? '').length != 6 ? 'Mã OTP gồm đúng 6 chữ số' : null,
              style: const TextStyle(fontSize: 26, letterSpacing: 12, fontWeight: FontWeight.w600),
              decoration: _fieldDecoration('Mã OTP', Icons.pin_outlined).copyWith(counterText: ''),
            ),
            const SizedBox(height: 22),
            _primaryButton(label: 'Xác nhận mã', busy: _busy, onPressed: _verifyCode),
            const SizedBox(height: 8),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                TextButton(
                  onPressed: _busy
                      ? null
                      : () => setState(() {
                            _step = 0;
                            _error = null;
                          }),
                  child: const Text('Đổi email'),
                ),
                TextButton(
                  onPressed: _busy || _resendIn > 0 ? null : () => _sendCode(resend: true),
                  child: Text(_resendIn > 0 ? 'Gửi lại sau ${_resendIn}s' : 'Gửi lại mã'),
                ),
              ],
            ),
          ],
        );
      default:
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Đặt mật khẩu mới cho tài khoản của bạn.',
                style: TextStyle(fontSize: 13.5, height: 1.45, color: AppCultureColors.textMuted)),
            const SizedBox(height: 16),
            _PasswordField(
              controller: _password,
              label: 'Mật khẩu mới',
              helper: 'Ít nhất 6 ký tự',
              validator: _validateNewPassword,
            ),
            const SizedBox(height: 14),
            _PasswordField(
              controller: _confirm,
              label: 'Nhập lại mật khẩu mới',
              action: TextInputAction.done,
              validator: (v) => v != _password.text ? 'Mật khẩu nhập lại không khớp' : null,
            ),
            const SizedBox(height: 22),
            _primaryButton(label: 'Đặt lại mật khẩu', busy: _busy, onPressed: _reset),
          ],
        );
    }
  }
}

/// Ba chấm bước nối nhau; bước đã qua tô ngọc, bước hiện tại phóng to nhẹ.
class _StepIndicator extends StatelessWidget {
  final int step;
  final List<String> labels;

  const _StepIndicator({required this.step, required this.labels});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        for (var i = 0; i < labels.length; i++) ...[
          if (i > 0)
            Expanded(
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 300),
                height: 2,
                margin: const EdgeInsets.only(bottom: 18),
                color: i <= step ? AppCultureColors.heritageJade : AppCultureColors.border,
              ),
            ),
          Column(
            children: [
              AnimatedContainer(
                duration: const Duration(milliseconds: 300),
                width: i == step ? 32 : 26,
                height: i == step ? 32 : 26,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: i <= step ? AppCultureColors.heritageJade : Colors.white,
                  border: Border.all(color: i <= step ? AppCultureColors.heritageJade : AppCultureColors.border, width: 2),
                ),
                child: Center(
                  child: i < step
                      ? const Icon(Icons.check_rounded, size: 16, color: Colors.white)
                      : Text('${i + 1}',
                          style: TextStyle(
                            fontSize: 12.5,
                            fontWeight: FontWeight.w600,
                            color: i <= step ? Colors.white : AppCultureColors.textMuted,
                          )),
                ),
              ),
              const SizedBox(height: 4),
              Text(labels[i],
                  style: TextStyle(
                    fontSize: 11.5,
                    color: i == step ? AppCultureColors.jadeDark : AppCultureColors.textMuted,
                    fontWeight: i == step ? FontWeight.w600 : FontWeight.w400,
                  )),
            ],
          ),
        ],
      ],
    );
  }
}

// ─────────────────────────── Đổi mật khẩu ───────────────────────────

/// Đổi mật khẩu khi đang đăng nhập. Tài khoản Google chưa từng đặt mật khẩu được bỏ trống mật khẩu hiện tại.
class ChangePasswordScreen extends StatefulWidget {
  final bool signedInWithGoogle;

  const ChangePasswordScreen({super.key, this.signedInWithGoogle = false});

  @override
  State<ChangePasswordScreen> createState() => _ChangePasswordScreenState();
}

class _ChangePasswordScreenState extends State<ChangePasswordScreen> {
  final AuthService _auth = AuthService();
  final _formKey = GlobalKey<FormState>();
  final TextEditingController _current = TextEditingController();
  final TextEditingController _password = TextEditingController();
  final TextEditingController _confirm = TextEditingController();
  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    _current.dispose();
    _password.dispose();
    _confirm.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    FocusManager.instance.primaryFocus?.unfocus();
    if (!(_formKey.currentState?.validate() ?? false)) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await _auth.changePassword(
        currentPassword: _current.text,
        newPassword: _password.text,
        confirmPassword: _confirm.text,
      );
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
        content: Text('Đổi mật khẩu thành công.'),
        behavior: SnackBarBehavior.floating,
      ));
      Navigator.of(context).pop(true);
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppCultureColors.background,
      body: SingleChildScrollView(
        keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
        child: Column(
          children: [
            const _HeritageHeader(
              title: 'Đổi mật khẩu',
              subtitle: 'Giữ an toàn cho hành trang di sản của bạn',
              icon: Icons.shield_outlined,
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 24, 20, 32),
              child: Form(
                key: _formKey,
                child: Column(
                  children: [
                    if (_error != null) _errorBox(_error!),
                    _PasswordField(
                      controller: _current,
                      label: 'Mật khẩu hiện tại',
                      helper: widget.signedInWithGoogle
                          ? 'Bỏ trống nếu bạn đăng nhập bằng Google và chưa từng đặt mật khẩu'
                          : null,
                      validator: (v) => !widget.signedInWithGoogle && (v ?? '').isEmpty
                          ? 'Vui lòng nhập mật khẩu hiện tại'
                          : null,
                    ),
                    const SizedBox(height: 14),
                    _PasswordField(
                      controller: _password,
                      label: 'Mật khẩu mới',
                      helper: 'Ít nhất 6 ký tự, khác mật khẩu hiện tại',
                      validator: _validateNewPassword,
                    ),
                    const SizedBox(height: 14),
                    _PasswordField(
                      controller: _confirm,
                      label: 'Nhập lại mật khẩu mới',
                      action: TextInputAction.done,
                      validator: (v) => v != _password.text ? 'Mật khẩu nhập lại không khớp' : null,
                    ),
                    const SizedBox(height: 24),
                    _primaryButton(label: 'Lưu mật khẩu mới', busy: _busy, onPressed: _submit),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
