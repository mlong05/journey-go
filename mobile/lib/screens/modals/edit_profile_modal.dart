import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';
import '../../core/models/auth_models.dart';
import '../../core/services/auth_service.dart';

class EditProfileModal extends StatefulWidget {
  final UserModel currentUser;
  final ValueChanged<UserModel>? onProfileUpdated;

  const EditProfileModal({
    super.key,
    required this.currentUser,
    this.onProfileUpdated,
  });

  @override
  State<EditProfileModal> createState() => _EditProfileModalState();
}

class _EditProfileModalState extends State<EditProfileModal> {
  final AuthService _authService = AuthService();
  late TextEditingController _nameController;
  late TextEditingController _phoneController;
  bool _isSaving = false;

  @override
  void initState() {
    super.initState();
    _nameController = TextEditingController(text: widget.currentUser.fullName);
    _phoneController = TextEditingController(text: widget.currentUser.phone ?? '');
  }

  @override
  void dispose() {
    _nameController.dispose();
    _phoneController.dispose();
    super.dispose();
  }

  void _handleSave() async {
    final name = _nameController.text.trim();
    if (name.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Họ tên không được để trống!')),
      );
      return;
    }

    setState(() => _isSaving = true);

    try {
      final updatedUser = await _authService.updateProfile(
        fullName: name,
        phone: _phoneController.text.trim(),
        avatarUrl: widget.currentUser.avatarUrl,
      );

      if (mounted) {
        setState(() => _isSaving = false);
        Navigator.of(context).pop();
        widget.onProfileUpdated?.call(updatedUser);

        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Cập nhật hồ sơ cá nhân thành công qua máy chủ!'),
            backgroundColor: AppCultureColors.heritageJade,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isSaving = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(e.toString().replaceAll('Exception: ', '')),
            backgroundColor: AppCultureColors.error,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Drag handle
          Center(
            child: Container(
              margin: const EdgeInsets.only(bottom: 12),
              width: 44,
              height: 5,
              decoration: BoxDecoration(
                color: Colors.grey[300],
                borderRadius: BorderRadius.circular(3),
              ),
            ),
          ),

          // Header
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Chỉnh Sửa Hồ Sơ Du Khách',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w800,
                  color: AppCultureColors.textDark,
                ),
              ),
              IconButton(
                onPressed: () => Navigator.of(context).pop(),
                icon: const Icon(Icons.close_rounded, color: AppCultureColors.textMuted),
                style: IconButton.styleFrom(
                  backgroundColor: AppCultureColors.surfaceSubtle,
                ),
              ),
            ],
          ),

          const SizedBox(height: 16),

          // Avatar display
          Center(
            child: Stack(
              children: [
                CircleAvatar(
                  radius: 36,
                  backgroundColor: AppCultureColors.jadeLight,
                  child: const Icon(
                    Icons.face_retouching_natural_rounded,
                    size: 40,
                    color: AppCultureColors.heritageJade,
                  ),
                ),
                Positioned(
                  bottom: 0,
                  right: 0,
                  child: Container(
                    padding: const EdgeInsets.all(4),
                    decoration: const BoxDecoration(
                      color: AppCultureColors.heritageJade,
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(Icons.edit, size: 14, color: Colors.white),
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(height: 20),

          // Email (read only)
          const Text(
            'Email tài khoản (không thể thay đổi):',
            style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppCultureColors.textMuted),
          ),
          const SizedBox(height: 6),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            decoration: BoxDecoration(
              color: AppCultureColors.surfaceSubtle,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: AppCultureColors.border),
            ),
            child: Text(
              widget.currentUser.email,
              style: const TextStyle(fontSize: 14, color: AppCultureColors.textMuted, fontWeight: FontWeight.w600),
            ),
          ),

          const SizedBox(height: 16),

          // Full Name input
          const Text(
            'Họ và tên:',
            style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppCultureColors.textDark),
          ),
          const SizedBox(height: 6),
          TextField(
            controller: _nameController,
            decoration: InputDecoration(
              hintText: 'Nhập họ và tên đầy đủ',
              filled: true,
              fillColor: AppCultureColors.surfaceSubtle,
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(14),
                borderSide: const BorderSide(color: AppCultureColors.border),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(14),
                borderSide: const BorderSide(color: AppCultureColors.border),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(14),
                borderSide: const BorderSide(color: AppCultureColors.heritageJade, width: 1.5),
              ),
            ),
          ),

          const SizedBox(height: 16),

          // Phone input
          const Text(
            'Số điện thoại:',
            style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppCultureColors.textDark),
          ),
          const SizedBox(height: 6),
          TextField(
            controller: _phoneController,
            keyboardType: TextInputType.phone,
            decoration: InputDecoration(
              hintText: 'Nhập số điện thoại liên hệ',
              filled: true,
              fillColor: AppCultureColors.surfaceSubtle,
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(14),
                borderSide: const BorderSide(color: AppCultureColors.border),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(14),
                borderSide: const BorderSide(color: AppCultureColors.border),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(14),
                borderSide: const BorderSide(color: AppCultureColors.heritageJade, width: 1.5),
              ),
            ),
          ),

          const SizedBox(height: 24),

          // Save button
          SizedBox(
            width: double.infinity,
            height: 52,
            child: ElevatedButton(
              onPressed: _isSaving ? null : _handleSave,
              style: ElevatedButton.styleFrom(
                backgroundColor: AppCultureColors.heritageJade,
                foregroundColor: Colors.white,
                elevation: 0,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              ),
              child: _isSaving
                  ? const Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                        ),
                        SizedBox(width: 12),
                        Text(
                          'Đang lưu thay đổi lên máy chủ...',
                          style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15),
                        ),
                      ],
                    )
                  : const Text(
                      'Lưu Thông Tin Mới',
                      style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15),
                    ),
            ),
          ),
          const SizedBox(height: 10),
        ],
      ),
    );
  }
}
