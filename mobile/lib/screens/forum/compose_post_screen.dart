import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import '../../core/constants/app_colors.dart';
import '../../core/models/forum_model.dart';
import '../../core/models/tour_model.dart';
import '../../core/services/api_client.dart';
import '../../core/services/booking_service.dart';
import '../../core/services/forum_service.dart';
import '../../core/services/journey_service.dart';
import '../../core/services/tour_service.dart';
import '../rewards/rewards_widgets.dart' show buildRewardsAppBar;
import 'forum_widgets.dart';

const int _titleMax = 200;
const int _contentMax = 5000;
const int _maxImages = 10;

/// Soạn bài mới hoặc chỉnh sửa bài (truyền `editing`). Khi xong trả về bài đã lưu.
class ComposePostScreen extends StatefulWidget {
  final ForumPost? editing;

  const ComposePostScreen({super.key, this.editing});

  @override
  State<ComposePostScreen> createState() => _ComposePostScreenState();
}

class _ComposePostScreenState extends State<ComposePostScreen> {
  final ForumService _service = ForumService();
  final ImagePicker _picker = ImagePicker();
  final TextEditingController _title = TextEditingController();
  final TextEditingController _content = TextEditingController();

  // Ảnh đã có trên máy chủ (khi sửa) và ảnh mới chọn từ thư viện.
  final List<String> _remoteImages = [];
  final List<String> _localImages = [];

  ForumOption? _destination;
  ForumOption? _tour;
  String? _error;
  String _busyLabel = '';
  bool _busy = false;

  bool get _isEditing => widget.editing != null;
  int get _imageCount => _remoteImages.length + _localImages.length;

  @override
  void initState() {
    super.initState();
    final post = widget.editing;
    if (post != null) {
      _title.text = post.title;
      _content.text = post.content;
      _remoteImages.addAll(post.imageUrls);
      if (post.destinationId != null) {
        _destination = ForumOption(post.destinationId!, post.destinationName ?? 'Điểm đến');
      }
      if (post.tourId != null) {
        _tour = ForumOption(post.tourId!, post.tourTitle ?? 'Tour');
      }
    }
  }

  @override
  void dispose() {
    _title.dispose();
    _content.dispose();
    super.dispose();
  }

  Future<void> _pickImages() async {
    final remaining = _maxImages - _imageCount;
    if (remaining <= 0) {
      showForumSnack(context, 'Mỗi bài viết chỉ đính kèm tối đa $_maxImages ảnh.');
      return;
    }
    try {
      final files = await _picker.pickMultiImage(
        imageQuality: 85,
        maxWidth: 1800,
        limit: remaining,
      );
      if (files.isEmpty || !mounted) return;
      setState(() => _localImages.addAll(files.take(remaining).map((f) => f.path)));
    } catch (_) {
      if (mounted) showForumSnack(context, 'Không mở được thư viện ảnh. Hãy kiểm tra quyền truy cập.');
    }
  }

  /// Bài viết chỉ gắn tour. Danh sách: tour bạn đã tham gia (đã đặt vé hoặc đã đi) lên đầu,
  /// sau đó là các tour đang mở bán, để vẫn hỏi được về một tour trước khi đi.
  Future<void> _chooseTour() async {
    final picked = await showForumOptionPicker(
      context,
      title: 'Chọn tour',
      loader: () async {
        final results = await Future.wait([
          TourService().getPublishedTours(),
          _joinedTourIds(),
        ]);
        final tours = results[0] as List<TourModel>;
        final joined = results[1] as Set<int>;
        final mine = tours.where((t) => joined.contains(t.id));
        final others = tours.where((t) => !joined.contains(t.id));
        return [
          for (final t in mine) ForumOption(t.id, t.title, note: 'Bạn đã tham gia'),
          for (final t in others) ForumOption(t.id, t.title),
        ];
      },
    );
    if (picked != null && mounted) setState(() => _tour = picked.id < 0 ? null : picked);
  }

  /// Tour du khách đã tham gia: có hành trình, hoặc vé đã thanh toán / đã hoàn thành. Lỗi thì coi như chưa có.
  Future<Set<int>> _joinedTourIds() async {
    final ids = <int>{};
    try {
      ids.addAll((await JourneyService().getMine()).map((j) => j.tourId));
    } catch (_) {}
    try {
      ids.addAll((await BookingService().getMine())
          .where((b) => b.status == 'CONFIRMED' || b.status == 'COMPLETED')
          .map((b) => b.tourId));
    } catch (_) {}
    return ids;
  }

  String? _validate() {
    if (_title.text.trim().isEmpty) return 'Vui lòng nhập tiêu đề bài viết.';
    if (_content.text.trim().isEmpty) return 'Vui lòng nhập nội dung bài viết.';
    return null;
  }

  /// Lưu bài. Khi `submit` là true thì gửi duyệt ngay sau khi lưu.
  Future<void> _save({required bool submit}) async {
    final problem = _validate();
    if (problem != null) {
      setState(() => _error = problem);
      return;
    }
    setState(() {
      _error = null;
      _busy = true;
      _busyLabel = 'Đang lưu bài viết...';
    });

    try {
      final urls = [..._remoteImages];
      for (var i = 0; i < _localImages.length; i++) {
        if (mounted) setState(() => _busyLabel = 'Đang tải ảnh ${i + 1}/${_localImages.length}...');
        urls.add(await ApiClient.uploadImage(_localImages[i]));
      }
      if (mounted) setState(() => _busyLabel = 'Đang lưu bài viết...');

      ForumPost saved;
      if (_isEditing) {
        saved = await _service.updatePost(
          widget.editing!.id,
          title: _title.text.trim(),
          content: _content.text.trim(),
          mediaUrls: urls,
        );
        final status = saved.status;
        if (submit && (status == 'DRAFT' || status == 'REJECTED' || status == 'NEEDS_REVISION')) {
          saved = await _service.submitPost(saved.id);
        }
      } else {
        saved = await _service.createPost(
          title: _title.text.trim(),
          content: _content.text.trim(),
          tourId: _tour?.id,
          mediaUrls: urls,
          saveAsDraft: !submit,
        );
      }

      if (!mounted) return;
      final messenger = ScaffoldMessenger.of(context);
      Navigator.of(context).pop(saved);
      messenger.showSnackBar(
        SnackBar(
          content: Text(
            saved.status == 'DRAFT'
                ? 'Đã lưu bản nháp.'
                : 'Đã gửi bài viết. Bài sẽ hiển thị sau khi được kiểm duyệt.',
          ),
          behavior: SnackBarBehavior.floating,
        ),
      );
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.message;
        _busy = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final editingStatus = widget.editing?.status;
    final canSubmitWhenEditing = editingStatus == 'DRAFT' ||
        editingStatus == 'REJECTED' ||
        editingStatus == 'NEEDS_REVISION';

    return Scaffold(
      backgroundColor: AppCultureColors.background,
      appBar: buildRewardsAppBar(context, _isEditing ? 'Chỉnh sửa bài viết' : 'Viết bài mới'),
      body: Stack(
        children: [
          ListView(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
            children: [
              _label('Tiêu đề'),
              _CountedField(
                controller: _title,
                max: _titleMax,
                maxLines: 2,
                minLines: 1,
                onChanged: () => setState(() {}),
                weight: FontWeight.w700,
              ),
              const SizedBox(height: 16),
              _label('Nội dung'),
              _CountedField(
                controller: _content,
                max: _contentMax,
                maxLines: 12,
                minLines: 7,
                onChanged: () => setState(() {}),
              ),
              const SizedBox(height: 16),
              _label('Tour liên quan'),
              _PickerTile(
                icon: Icons.route_rounded,
                hint: 'Chọn tour (không bắt buộc)',
                value: _tour?.label,
                onTap: _isEditing ? null : _chooseTour,
              ),
              // Bài cũ từng gắn điểm đến: vẫn hiện để biết, không chọn mới được nữa
              if (_destination != null) ...[
                const SizedBox(height: 8),
                _PickerTile(icon: Icons.place_rounded, hint: 'Điểm đến', value: _destination!.label, onTap: null),
              ],
              Padding(
                padding: const EdgeInsets.only(top: 6),
                child: Text(
                  _isEditing
                      ? 'Không thể đổi tour sau khi đã đăng.'
                      : 'Tour bạn đã tham gia được đưa lên đầu danh sách.',
                  style: const TextStyle(fontSize: 11.5, color: AppCultureColors.textLight),
                ),
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(child: _label('Ảnh ($_imageCount/$_maxImages)')),
                  TextButton.icon(
                    onPressed: _busy ? null : _pickImages,
                    icon: const Icon(Icons.add_photo_alternate_outlined, size: 20),
                    label: const Text('Thêm ảnh'),
                  ),
                ],
              ),
              _buildImageGrid(),
              if (_error != null)
                Container(
                  margin: const EdgeInsets.only(top: 16),
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: AppCultureColors.error.withValues(alpha: 0.08),
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Icon(Icons.error_outline_rounded,
                          size: 18, color: AppCultureColors.error),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          _error!,
                          style: const TextStyle(
                            fontSize: 12.5,
                            height: 1.4,
                            color: AppCultureColors.error,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              const SizedBox(height: 12),
              const Text(
                'Bài viết sẽ hiển thị trên Diễn đàn sau khi được kiểm duyệt viên phê duyệt.',
                style: TextStyle(fontSize: 12, height: 1.4, color: AppCultureColors.textMuted),
              ),
            ],
          ),
          if (_busy)
            Positioned.fill(
              child: Container(
                color: Colors.black.withValues(alpha: 0.35),
                alignment: Alignment.center,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(18),
                  ),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const CircularProgressIndicator(strokeWidth: 2.6),
                      const SizedBox(height: 14),
                      Text(_busyLabel, style: const TextStyle(fontWeight: FontWeight.w700)),
                    ],
                  ),
                ),
              ),
            ),
        ],
      ),
      bottomNavigationBar: SafeArea(
        child: Container(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
          decoration: const BoxDecoration(
            color: Colors.white,
            border: Border(top: BorderSide(color: AppCultureColors.border)),
          ),
          child: Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: _busy ? null : () => _save(submit: false),
                  style: OutlinedButton.styleFrom(
                    minimumSize: const Size(0, 50),
                    foregroundColor: AppCultureColors.textDark,
                    side: const BorderSide(color: AppCultureColors.border),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  ),
                  child: Text(
                    _isEditing ? 'Lưu thay đổi' : 'Lưu nháp',
                    style: const TextStyle(fontWeight: FontWeight.w700),
                  ),
                ),
              ),
              if (!_isEditing || canSubmitWhenEditing) ...[
                const SizedBox(width: 10),
                Expanded(
                  child: FilledButton.icon(
                    onPressed: _busy ? null : () => _save(submit: true),
                    icon: const Icon(Icons.send_rounded, size: 18),
                    label: const Text('Gửi duyệt', style: TextStyle(fontWeight: FontWeight.w700)),
                    style: FilledButton.styleFrom(
                      backgroundColor: AppCultureColors.heritageJade,
                      minimumSize: const Size(0, 50),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                    ),
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Widget _label(String text) => Padding(
        padding: const EdgeInsets.only(bottom: 8),
        child: Text(
          text,
          style: const TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w700,
            color: AppCultureColors.textDark,
          ),
        ),
      );

  Widget _buildImageGrid() {
    if (_imageCount == 0) {
      return InkWell(
        onTap: _busy ? null : _pickImages,
        borderRadius: BorderRadius.circular(18),
        child: Container(
          height: 110,
          alignment: Alignment.center,
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: AppCultureColors.border),
          ),
          child: const Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.photo_library_outlined, color: AppCultureColors.textLight, size: 30),
              SizedBox(height: 6),
              Text(
                'Chạm để thêm ảnh từ thư viện',
                style: TextStyle(fontSize: 12.5, color: AppCultureColors.textMuted),
              ),
            ],
          ),
        ),
      );
    }

    final tiles = <Widget>[
      for (var i = 0; i < _remoteImages.length; i++)
        _thumb(
          Image.network(_remoteImages[i], fit: BoxFit.cover),
          () => setState(() => _remoteImages.removeAt(i)),
        ),
      for (var i = 0; i < _localImages.length; i++)
        _thumb(
          Image.file(File(_localImages[i]), fit: BoxFit.cover, cacheWidth: 400),
          () => setState(() => _localImages.removeAt(i)),
        ),
    ];
    return GridView.count(
      crossAxisCount: 3,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      mainAxisSpacing: 8,
      crossAxisSpacing: 8,
      children: tiles,
    );
  }

  Widget _thumb(Widget image, VoidCallback onRemove) {
    return Stack(
      fit: StackFit.expand,
      children: [
        ClipRRect(borderRadius: BorderRadius.circular(14), child: image),
        Positioned(
          top: 4,
          right: 4,
          child: InkWell(
            onTap: _busy ? null : onRemove,
            borderRadius: BorderRadius.circular(14),
            child: Container(
              width: 28,
              height: 28,
              decoration: const BoxDecoration(color: Colors.black54, shape: BoxShape.circle),
              child: const Icon(Icons.close_rounded, size: 16, color: Colors.white),
            ),
          ),
        ),
      ],
    );
  }
}

/// Ô nhập có bộ đếm ký tự nhỏ ở góc phải dưới.
class _CountedField extends StatelessWidget {
  final TextEditingController controller;
  final int max;
  final int maxLines;
  final int minLines;
  final VoidCallback onChanged;
  final FontWeight weight;

  const _CountedField({
    required this.controller,
    required this.max,
    required this.maxLines,
    required this.minLines,
    required this.onChanged,
    this.weight = FontWeight.w500,
  });

  @override
  Widget build(BuildContext context) {
    final length = controller.text.length;
    return Stack(
      children: [
        TextField(
          controller: controller,
          maxLength: max,
          maxLines: maxLines,
          minLines: minLines,
          onChanged: (_) => onChanged(),
          style: TextStyle(fontSize: 14.5, height: 1.5, fontWeight: weight),
          decoration: InputDecoration(
            counterText: '',
            filled: true,
            fillColor: Colors.white,
            contentPadding: const EdgeInsets.fromLTRB(14, 12, 14, 28),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(16),
              borderSide: const BorderSide(color: AppCultureColors.border),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(16),
              borderSide: const BorderSide(color: AppCultureColors.border),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(16),
              borderSide: const BorderSide(color: AppCultureColors.heritageJade, width: 1.5),
            ),
          ),
        ),
        Positioned(
          right: 14,
          bottom: 8,
          child: Text(
            '$length/$max',
            style: TextStyle(
              fontSize: 10.5,
              fontWeight: FontWeight.w700,
              color: length >= max * 0.9 ? AppCultureColors.error : AppCultureColors.textLight,
            ),
          ),
        ),
      ],
    );
  }
}

class _PickerTile extends StatelessWidget {
  final IconData icon;
  final String hint;
  final String? value;
  final VoidCallback? onTap;

  const _PickerTile({required this.icon, required this.hint, this.value, this.onTap});

  @override
  Widget build(BuildContext context) {
    final hasValue = value != null && value!.isNotEmpty;
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
        decoration: BoxDecoration(
          color: onTap == null ? AppCultureColors.surfaceSubtle : Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: hasValue ? AppCultureColors.heritageJade : AppCultureColors.border,
          ),
        ),
        child: Row(
          children: [
            Icon(
              icon,
              size: 18,
              color: hasValue ? AppCultureColors.heritageJade : AppCultureColors.textLight,
            ),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                hasValue ? value! : hint,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: hasValue ? FontWeight.w700 : FontWeight.w500,
                  color: hasValue ? AppCultureColors.textDark : AppCultureColors.textMuted,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
