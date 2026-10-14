import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';
import '../../core/models/community_model.dart';
import '../../core/models/destination_model.dart';
import '../../core/services/user_data_service.dart';

class CreatePostModal extends StatefulWidget {
  final String authorName;
  final String authorAvatar;
  final List<DestinationModel> destinations;
  final VoidCallback? onPostCreated;

  const CreatePostModal({
    super.key,
    required this.authorName,
    required this.authorAvatar,
    required this.destinations,
    this.onPostCreated,
  });

  @override
  State<CreatePostModal> createState() => _CreatePostModalState();
}

class _CreatePostModalState extends State<CreatePostModal> {
  final TextEditingController _contentController = TextEditingController();
  final TextEditingController _captionController = TextEditingController();
  final UserDataService _userDataService = UserDataService();

  double _rating = 5.0;
  String _selectedCategory = 'checkin';
  String _selectedLocation = 'Văn Miếu - Quốc Tử Giám';
  String? _selectedImage = 'assets/images/vanmieu.png';
  bool _isSubmitting = false;

  final List<Map<String, String>> _availableImages = [
    {'name': 'Khuê Văn Các', 'path': 'assets/images/vanmieu.png'},
    {'name': 'Hoàng Thành Thăng Long', 'path': 'assets/images/thanglong.png'},
    {'name': 'Làng Gốm Bát Tràng', 'path': 'assets/images/gomsu.png'},
    {'name': 'Quần Thể Tràng An', 'path': 'assets/images/trangan.png'},
    {'name': 'Bảo Tàng Lịch Sử', 'path': 'assets/images/baotang.png'},
  ];

  @override
  void initState() {
    super.initState();
    if (widget.destinations.isNotEmpty) {
      _selectedLocation = widget.destinations.first.name;
    }
  }

  @override
  void dispose() {
    _contentController.dispose();
    _captionController.dispose();
    super.dispose();
  }

  void _handleSubmit() async {
    final content = _contentController.text.trim();
    if (content.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Vui lòng nhập nội dung chia sẻ cảm nhận!')),
      );
      return;
    }

    setState(() => _isSubmitting = true);

    final now = DateTime.now();
    final newPost = CommunityPost(
      id: 'post_${now.millisecondsSinceEpoch}',
      authorName: widget.authorName,
      authorAvatar: widget.authorAvatar,
      authorBadge: 'Nhà Thám Hiểm Di Sản',
      createdAt: 'Vừa xong',
      location: _selectedLocation,
      rating: _rating,
      ratingLabel: _rating >= 4.5 ? 'Tuyệt vời' : (_rating >= 3.5 ? 'Đáng trải nghiệm' : 'Bình thường'),
      content: content,
      image: _selectedImage,
      imageCaption: _captionController.text.trim().isNotEmpty
          ? _captionController.text.trim()
          : 'Ảnh chụp lưu niệm thực địa tại $_selectedLocation',
      category: _selectedCategory,
      likesCount: 1,
      isLiked: true,
      commentsCount: 0,
      sharesCount: 0,
      comments: [],
    );

    await _userDataService.addPost(newPost);
    await _userDataService.addPoints(50);

    if (mounted) {
      setState(() => _isSubmitting = false);
      Navigator.of(context).pop();
      widget.onPostCreated?.call();

      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Đã đăng bài viết lên Diễn đàn di sản thành công! (+50 pts)'),
          backgroundColor: AppCultureColors.heritageJade,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      height: MediaQuery.of(context).size.height * 0.85,
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
      ),
      child: Column(
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
                'Tạo Bài Viết Cộng Đồng',
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

          Expanded(
            child: SingleChildScrollView(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const SizedBox(height: 12),

                  // Author preview row
                  Row(
                    children: [
                      CircleAvatar(
                        radius: 20,
                        backgroundColor: AppCultureColors.jadeLight,
                        child: const Icon(Icons.person, color: AppCultureColors.heritageJade),
                      ),
                      const SizedBox(width: 12),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            widget.authorName,
                            style: const TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.w700,
                              color: AppCultureColors.textDark,
                            ),
                          ),
                          const Text(
                            'Công khai trên Diễn đàn di sản',
                            style: TextStyle(fontSize: 12, color: AppCultureColors.textMuted),
                          ),
                        ],
                      ),
                    ],
                  ),

                  const SizedBox(height: 16),

                  // Content input
                  TextField(
                    controller: _contentController,
                    maxLines: 4,
                    decoration: InputDecoration(
                      hintText: 'Chia sẻ cảm nhận hoặc kỷ niệm đáng nhớ của bạn...',
                      hintStyle: const TextStyle(color: AppCultureColors.textLight, fontSize: 14),
                      filled: true,
                      fillColor: AppCultureColors.surfaceSubtle,
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

                  const SizedBox(height: 16),

                  // Rating row
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'Đánh giá trải nghiệm:',
                        style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: AppCultureColors.textDark),
                      ),
                      Row(
                        children: List.generate(5, (index) {
                          final star = index + 1;
                          return GestureDetector(
                            onTap: () => setState(() => _rating = star.toDouble()),
                            child: Padding(
                              padding: const EdgeInsets.symmetric(horizontal: 2),
                              child: Icon(
                                Icons.star_rounded,
                                size: 28,
                                color: _rating >= star ? AppCultureColors.gold : Colors.grey[300],
                              ),
                            ),
                          );
                        }),
                      ),
                    ],
                  ),

                  const SizedBox(height: 16),

                  // Location picker
                  const Text(
                    'Gắn địa điểm di tích:',
                    style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: AppCultureColors.textDark),
                  ),
                  const SizedBox(height: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14),
                    decoration: BoxDecoration(
                      color: AppCultureColors.surfaceSubtle,
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: AppCultureColors.border),
                    ),
                    child: DropdownButtonHideUnderline(
                      child: DropdownButton<String>(
                        value: _selectedLocation,
                        isExpanded: true,
                        items: widget.destinations.map((d) {
                          return DropdownMenuItem<String>(
                            value: d.name,
                            child: Text(d.name, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
                          );
                        }).toList(),
                        onChanged: (val) {
                          if (val != null) setState(() => _selectedLocation = val);
                        },
                      ),
                    ),
                  ),

                  const SizedBox(height: 16),

                  // Photo selection
                  const Text(
                    'Đính kèm ảnh thực địa:',
                    style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: AppCultureColors.textDark),
                  ),
                  const SizedBox(height: 8),
                  SizedBox(
                    height: 80,
                    child: ListView.builder(
                      scrollDirection: Axis.horizontal,
                      itemCount: _availableImages.length,
                      itemBuilder: (context, idx) {
                        final img = _availableImages[idx];
                        final isSelected = _selectedImage == img['path'];

                        return GestureDetector(
                          onTap: () => setState(() => _selectedImage = img['path']),
                          child: Container(
                            width: 80,
                            margin: const EdgeInsets.only(right: 10),
                            decoration: BoxDecoration(
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(
                                color: isSelected ? AppCultureColors.heritageJade : Colors.transparent,
                                width: 2.5,
                              ),
                            ),
                            child: ClipRRect(
                              borderRadius: BorderRadius.circular(10),
                              child: Stack(
                                fit: StackFit.expand,
                                children: [
                                  Image.asset(img['path']!, fit: BoxFit.cover),
                                  if (isSelected)
                                    Container(
                                      color: Colors.black.withOpacity(0.3),
                                      child: const Center(
                                        child: Icon(Icons.check_circle_rounded, color: Colors.white, size: 24),
                                      ),
                                    ),
                                ],
                              ),
                            ),
                          ),
                        );
                      },
                    ),
                  ),

                  const SizedBox(height: 14),

                  TextField(
                    controller: _captionController,
                    decoration: InputDecoration(
                      hintText: 'Mô tả ngắn cho bức ảnh (không bắt buộc)',
                      hintStyle: const TextStyle(color: AppCultureColors.textLight, fontSize: 13),
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
                ],
              ),
            ),
          ),

          const SizedBox(height: 12),

          // Submit CTA
          SizedBox(
            width: double.infinity,
            height: 52,
            child: ElevatedButton.icon(
              onPressed: _isSubmitting ? null : _handleSubmit,
              icon: _isSubmitting
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                    )
                  : const Icon(Icons.send_rounded, size: 20),
              label: Text(
                _isSubmitting ? 'Đang chia sẻ bài viết...' : 'Đăng Bài Viết (+50 pts)',
                style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15),
              ),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppCultureColors.heritageJade,
                foregroundColor: Colors.white,
                elevation: 0,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
