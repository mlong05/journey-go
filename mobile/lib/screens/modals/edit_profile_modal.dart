import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import '../../core/constants/app_colors.dart';
import '../../core/models/auth_models.dart';
import '../../core/services/api_client.dart';
import '../../core/services/auth_service.dart';
import '../../l10n/locale_controller.dart';
import '../forum/forum_widgets.dart';

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
  final ImagePicker _picker = ImagePicker();
  late TextEditingController _nameController;
  late TextEditingController _phoneController;
  String? _pickedImagePath;
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

  Future<void> _pickAvatar() async {
    try {
      final picked = await _picker.pickImage(
        source: ImageSource.gallery,
        maxWidth: 1024,
        maxHeight: 1024,
        imageQuality: 85,
      );
      if (picked != null && mounted) {
        setState(() => _pickedImagePath = picked.path);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(e.toString().replaceAll('Exception: ', '')),
            backgroundColor: AppCultureColors.error,
          ),
        );
      }
    }
  }

  void _handleSave() async {
    final name = _nameController.text.trim();
    if (name.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(context.l10n.epNameRequired)),
      );
      return;
    }

    setState(() => _isSaving = true);

    try {
      var avatarUrl = widget.currentUser.avatarUrl;
      if (_pickedImagePath != null) {
        avatarUrl = await ApiClient.uploadImage(
          _pickedImagePath!,
          folder: 'journeygo/avatars',
        );
      }

      final updatedUser = await _authService.updateProfile(
        fullName: name,
        phone: _phoneController.text.trim(),
        avatarUrl: avatarUrl,
      );

      if (mounted) {
        setState(() => _isSaving = false);
        Navigator.of(context).pop();
        widget.onProfileUpdated?.call(updatedUser);

        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(context.l10n.epSaved),
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
              Text(
                context.l10n.epTitle,
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w700,
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

          // Avatar display & picker
          Center(
            child: GestureDetector(
              onTap: _isSaving ? null : _pickAvatar,
              child: Stack(
                children: [
                  if (_pickedImagePath != null)
                    CircleAvatar(
                      radius: 36,
                      backgroundColor: AppCultureColors.jadeLight,
                      backgroundImage: FileImage(File(_pickedImagePath!)),
                    )
                  else if ((widget.currentUser.avatarUrl ?? '').trim().isNotEmpty)
                    ForumAvatar(
                      name: widget.currentUser.fullName,
                      url: widget.currentUser.avatarUrl,
                      size: 72,
                    )
                  else
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
          ),

          const SizedBox(height: 20),

          // Email (read only)
          Text(
            context.l10n.epEmailLabel,
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
          Text(
            context.l10n.epNameLabel,
            style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppCultureColors.textDark),
          ),
          const SizedBox(height: 6),
          TextField(
            controller: _nameController,
            decoration: InputDecoration(
              hintText: context.l10n.epNameHint,
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
          Text(
            context.l10n.epPhoneLabel,
            style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppCultureColors.textDark),
          ),
          const SizedBox(height: 6),
          TextField(
            controller: _phoneController,
            keyboardType: TextInputType.phone,
            decoration: InputDecoration(
              hintText: context.l10n.epPhoneHint,
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
                  ? Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                        ),
                        SizedBox(width: 12),
                        Text(
                          context.l10n.epSaving,
                          style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15),
                        ),
                      ],
                    )
                  : Text(
                      context.l10n.epSave,
                      style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15),
                    ),
            ),
          ),
          const SizedBox(height: 10),
        ],
      ),
    );
  }
}
