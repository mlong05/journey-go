import 'package:flutter/material.dart';

/// Nền khi chưa có ảnh hoặc ảnh lỗi: một màu trung tính, không biểu tượng hay hình minh họa.
const Color photoPlaceholder = Color(0xFFE7E4DE);

/// Xin ảnh vừa khung để tải nhanh: Cloudinary thêm tham số thu nhỏ; Wikimedia dùng bản thu nhỏ 500px.
/// URL khác giữ nguyên.
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
  if (url.contains('upload.wikimedia.org') && width <= 500) {
    return url.replaceFirst('/960px-', '/500px-');
  }
  return url;
}

/// Ảnh chụp phủ kín khung (cover). Đang tải / lỗi / không có ảnh: nền trung tính.
/// [credit]: ghi nguồn ảnh (bắt buộc với ảnh CC BY/CC BY-SA), hiện chữ nhỏ ở góc trên bên phải.
class Photo extends StatelessWidget {
  final String? url;

  /// Bề rộng hiển thị dự kiến (px logic) để xin ảnh vừa đủ nét.
  final int width;
  final BorderRadius? borderRadius;
  final String? credit;
  final String? semanticLabel;

  const Photo({super.key, required this.url, this.width = 400, this.borderRadius, this.credit, this.semanticLabel});

  @override
  Widget build(BuildContext context) {
    final u = url;
    final dpr = MediaQuery.maybeDevicePixelRatioOf(context) ?? 2;
    Widget child = const ColoredBox(color: photoPlaceholder, child: SizedBox.expand());
    if (u != null && u.startsWith('https://')) {
      child = Stack(
        fit: StackFit.expand,
        children: [
          child,
          Image.network(
            sizedImageUrl(u, (width * dpr).round()),
            fit: BoxFit.cover,
            semanticLabel: semanticLabel,
            excludeFromSemantics: semanticLabel == null,
            gaplessPlayback: true,
            frameBuilder: (_, img, frame, sync) => sync || frame != null ? img : const SizedBox.shrink(),
            errorBuilder: (_, _, _) => const SizedBox.shrink(),
          ),
          if (credit != null)
            // Góc trên: phía dưới thường là tên / nhãn của thẻ
            Positioned(
              right: 4,
              top: 4,
              left: 24,
              child: Align(
                alignment: Alignment.topRight,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                  decoration: BoxDecoration(color: Colors.black45, borderRadius: BorderRadius.circular(4)),
                  child: Text(
                    credit!,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(color: Colors.white, fontSize: 8, height: 1.2),
                  ),
                ),
              ),
            ),
        ],
      );
    }
    return borderRadius == null ? child : ClipRRect(borderRadius: borderRadius!, child: child);
  }
}
