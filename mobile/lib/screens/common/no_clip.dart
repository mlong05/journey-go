import 'package:flutter/material.dart';

import '../../core/constants/app_colors.dart';
import '../../l10n/locale_controller.dart';

/// Các khối "không bị cắt": thay cho hàng cuộn ngang (thẻ/chip lộ một nửa ở mép màn hình).
/// Mọi mục hiện trọn, nhãn 1 dòng; hết chỗ thì tự xuống hàng.

/// Chip chọn tab xếp theo [Wrap] — thay [TabBar] cuộn ngang. Dùng [DefaultTabController] sẵn có
/// (đặt widget này trong body, bên dưới DefaultTabController) nên TabBarView không cần đổi gì.
class TabChipWrap extends StatelessWidget {
  final List<String> labels;
  final EdgeInsetsGeometry padding;

  const TabChipWrap({super.key, required this.labels, this.padding = const EdgeInsets.fromLTRB(16, 10, 16, 10)});

  @override
  Widget build(BuildContext context) {
    final controller = DefaultTabController.of(context);
    return ColoredBox(
      color: AppCultureColors.surface,
      child: Padding(
        padding: padding,
        child: SizedBox(
          width: double.infinity,
          child: AnimatedBuilder(
            animation: controller,
            builder: (context, _) => Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                for (var i = 0; i < labels.length; i++)
                  WrapChoiceChip(
                    label: labels[i],
                    selected: controller.index == i,
                    onTap: () => controller.animateTo(i),
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// Chip chọn 1 dòng (viên thuốc): đang chọn nền xanh ngọc chữ trắng; chưa chọn nền trắng viền nhạt.
/// Chữ quá dài so với bề ngang thì thu nhỏ vừa chỗ, không xuống dòng.
class WrapChoiceChip extends StatelessWidget {
  final String label;
  final bool selected;
  final VoidCallback? onTap;
  final Widget? leading;

  const WrapChoiceChip({super.key, required this.label, required this.selected, this.onTap, this.leading});

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, box) => ConstrainedBox(
        constraints: BoxConstraints(maxWidth: box.maxWidth.isFinite ? box.maxWidth : double.infinity),
        child: Semantics(
          button: true,
          selected: selected,
          child: Material(
            color: selected ? AppCultureColors.heritageJade : AppCultureColors.surface,
            shape: StadiumBorder(
              side: BorderSide(color: selected ? AppCultureColors.heritageJade : AppCultureColors.border),
            ),
            child: InkWell(
              onTap: onTap,
              customBorder: const StadiumBorder(),
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                child: FittedBox(
                  fit: BoxFit.scaleDown,
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      if (leading != null) ...[leading!, const SizedBox(width: 6)],
                      Text(
                        label,
                        maxLines: 1,
                        softWrap: false,
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight: selected ? FontWeight.w700 : FontWeight.w600,
                          color: selected ? Colors.white : AppCultureColors.textDark,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// Album ảnh dạng lưới [columns] cột vừa khít bề ngang (thay dải ảnh vuốt ngang bị cắt ở mép).
/// Hiện tối đa [maxCells] ô; còn ảnh thì ô cuối phủ "+N". Bấm ô nào mở xem ảnh đó.
class PhotoGridPreview extends StatelessWidget {
  final List<String> images;
  final void Function(int index) onOpen;
  final int columns;
  final int maxCells;
  final double spacing;

  const PhotoGridPreview({
    super.key,
    required this.images,
    required this.onOpen,
    this.columns = 3,
    this.maxCells = 6,
    this.spacing = 8,
  });

  @override
  Widget build(BuildContext context) {
    final shown = images.length > maxCells ? maxCells : images.length;
    final extra = images.length - shown;
    return LayoutBuilder(
      builder: (context, box) {
        final cell = (box.maxWidth - spacing * (columns - 1)) / columns;
        return Wrap(
          spacing: spacing,
          runSpacing: spacing,
          children: [
            for (var i = 0; i < shown; i++)
              Semantics(
                button: true,
                label: appL10n.photoViewOf(i + 1, images.length),
                child: GestureDetector(
                  onTap: () => onOpen(i),
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(12),
                    child: SizedBox(
                      width: cell,
                      height: cell,
                      child: Stack(
                        fit: StackFit.expand,
                        children: [
                          Image.network(
                            images[i],
                            fit: BoxFit.cover,
                            errorBuilder: (_, _, _) => const ColoredBox(color: AppCultureColors.surfaceSubtle),
                          ),
                          if (extra > 0 && i == shown - 1)
                            ColoredBox(
                              color: Colors.black.withValues(alpha: 0.5),
                              child: Center(
                                child: Text(
                                  '+$extra',
                                  maxLines: 1,
                                  style: const TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.w800),
                                ),
                              ),
                            ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
          ],
        );
      },
    );
  }
}
