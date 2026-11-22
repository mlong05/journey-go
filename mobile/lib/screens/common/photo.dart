import 'package:flutter/material.dart';

import '../../core/constants/app_colors.dart';

/// Nền trung tính (giữ lại cho các màn cũ còn tham chiếu).
const Color photoPlaceholder = AppCultureColors.surfaceSubtle;

/// Xin ảnh vừa khung để tải nhanh: Cloudinary thêm tham số thu nhỏ. URL khác (kể cả Wikimedia) giữ nguyên.
///
/// ⚠️ KHÔNG đổi ảnh Wikimedia sang bản nhỏ hơn (500px/330px...): máy chủ Wikimedia trả 429 cho các
/// bản thu nhỏ không có sẵn khi tải từ app (User-Agent Dart), chỉ bản 960px trong dữ liệu là tải được
/// ⇒ ô ảnh nhỏ sẽ trống. Đã kiểm tra: 960px → 200, 500/330/250px → 429.
String sizedImageUrl(String url, int width) {
  const marker = '/image/upload/';
  final i = url.indexOf(marker);
  if (url.contains('res.cloudinary.com') && i >= 0) {
    final rest = url.substring(i + marker.length);
    // Đã có tham số biến đổi (vd. w_300,...) thì giữ nguyên
    if (RegExp(r'^[a-z]{1,3}_[^/]+/').hasMatch(rest)) return url;
    final w = width <= 400 ? 400 : (width <= 800 ? 800 : 1200);
    return '${url.substring(0, i + marker.length)}w_$w,c_limit,q_auto,f_auto/$rest';
  }
  return url;
}

/// Ảnh giữ chỗ mặc định: nền giấy ấm có vân nhẹ + icon phong cảnh mờ — thay cho ô xám trống.
class PhotoFallback extends StatelessWidget {
  final IconData icon;
  const PhotoFallback({super.key, this.icon = Icons.landscape_rounded});

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          colors: [AppCultureColors.surfaceSubtle, Color(0xFFE2E8F0)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
      ),
      child: LayoutBuilder(
        builder: (_, box) => Center(
          child: Icon(icon, size: (box.biggest.shortestSide * 0.32).clamp(18.0, 56.0), color: AppCultureColors.decorative),
        ),
      ),
    );
  }
}

/// Ảnh chụp phủ kín khung (cover). Đang tải / lỗi / không có ảnh: hiện [placeholder]
/// (mặc định [PhotoFallback]).
/// [credit]: ghi nguồn ảnh (bắt buộc với ảnh CC BY/CC BY-SA) — gói trong nút ⓘ nhỏ ở góc trên
/// bên phải, chạm để xem, thay vì chữ 8px khó đọc đè lên ảnh.
class Photo extends StatelessWidget {
  final String? url;

  /// Bề rộng hiển thị dự kiến (px logic) để xin ảnh vừa đủ nét.
  final int width;
  final BorderRadius? borderRadius;
  final String? credit;
  final String? semanticLabel;
  final Widget? placeholder;

  const Photo({
    super.key,
    required this.url,
    this.width = 400,
    this.borderRadius,
    this.credit,
    this.semanticLabel,
    this.placeholder,
  });

  @override
  Widget build(BuildContext context) {
    final u = url;
    final dpr = MediaQuery.maybeDevicePixelRatioOf(context) ?? 2;
    final fallback = placeholder ?? const PhotoFallback();
    Widget child = SizedBox.expand(child: fallback);
    if (u != null && u.startsWith('https://')) {
      child = Stack(
        fit: StackFit.expand,
        children: [
          fallback,
          Image.network(
            sizedImageUrl(u, (width * dpr).round()),
            fit: BoxFit.cover,
            semanticLabel: semanticLabel,
            excludeFromSemantics: semanticLabel == null,
            gaplessPlayback: true,
            // Hiện dần khi tải xong thay vì bật đột ngột
            frameBuilder: (_, img, frame, sync) => sync
                ? img
                : AnimatedOpacity(
                    opacity: frame == null ? 0 : 1,
                    duration: const Duration(milliseconds: 280),
                    curve: Curves.easeOut,
                    child: img,
                  ),
            errorBuilder: (_, _, _) => const SizedBox.shrink(),
          ),
          if (credit != null) Positioned(right: 6, top: 6, child: PhotoCreditButton(credit: credit!)),
        ],
      );
    }
    return borderRadius == null ? child : ClipRRect(borderRadius: borderRadius!, child: child);
  }
}

/// Nút ⓘ ghi nguồn ảnh: chạm để hiện tên tác giả / giấy phép.
class PhotoCreditButton extends StatelessWidget {
  final String credit;
  const PhotoCreditButton({super.key, required this.credit});

  @override
  Widget build(BuildContext context) {
    return Tooltip(
      message: 'Ảnh: $credit',
      triggerMode: TooltipTriggerMode.tap,
      showDuration: const Duration(seconds: 4),
      preferBelow: true,
      child: Semantics(
        button: true,
        label: 'Nguồn ảnh: $credit',
        child: Container(
          width: 24,
          height: 24,
          decoration: BoxDecoration(color: Colors.black.withValues(alpha: 0.45), shape: BoxShape.circle),
          child: const Icon(Icons.info_outline_rounded, size: 15, color: Colors.white),
        ),
      ),
    );
  }
}
