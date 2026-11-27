import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';

import '../../core/constants/app_colors.dart';
import '../../core/models/tour_review_model.dart';
import '../../core/services/api_client.dart';
import '../../core/services/tour_review_service.dart';
import '../../core/utils/formatters.dart';
import '../../l10n/locale_controller.dart';

class StarRatingRow extends StatelessWidget {
  final num value;
  final double size;

  const StarRatingRow({super.key, required this.value, this.size = 15});

  @override
  Widget build(BuildContext context) {
    final rounded = value.round();
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        for (var i = 1; i <= 5; i++)
          Icon(
            Icons.star_rounded,
            size: size,
            color: i <= rounded ? AppCultureColors.goldBright : AppCultureColors.decorative,
          ),
      ],
    );
  }
}

class StarRatingPicker extends StatelessWidget {
  final int value;
  final ValueChanged<int?> onChanged;
  final double size;
  final bool allowClear;

  const StarRatingPicker({
    super.key,
    required this.value,
    required this.onChanged,
    this.size = 30,
    this.allowClear = false,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        for (var i = 1; i <= 5; i++)
          InkWell(
            borderRadius: BorderRadius.circular(20),
            onTap: () => onChanged(allowClear && value == i ? null : i),
            child: Padding(
              padding: const EdgeInsets.all(2),
              child: Icon(
                Icons.star_rounded,
                size: size,
                color: i <= value ? AppCultureColors.goldBright : AppCultureColors.decorative,
              ),
            ),
          ),
      ],
    );
  }
}

Future<TourReviewModel?> showTourReviewSheet(
  BuildContext context, {
  required int bookingId,
  TourReviewModel? existingReview,
}) {
  return showModalBottomSheet<TourReviewModel>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    showDragHandle: true,
    backgroundColor: AppCultureColors.surface,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
    ),
    builder: (_) => _TourReviewFormSheet(
      bookingId: bookingId,
      existingReview: existingReview,
    ),
  );
}

class _TourReviewFormSheet extends StatefulWidget {
  final int bookingId;
  final TourReviewModel? existingReview;

  const _TourReviewFormSheet({required this.bookingId, this.existingReview});

  @override
  State<_TourReviewFormSheet> createState() => _TourReviewFormSheetState();
}

class _TourReviewFormSheetState extends State<_TourReviewFormSheet> {
  final _service = TourReviewService();
  final _picker = ImagePicker();
  late int _overall;
  int? _guide;
  int? _culture;
  int? _schedule;
  int? _value;
  late final TextEditingController _titleCtrl;
  late final TextEditingController _commentCtrl;
  late List<String> _imageUrls;

  bool _uploading = false;
  bool _submitting = false;
  String? _error;

  bool get _isEdit => widget.existingReview != null;

  @override
  void initState() {
    super.initState();
    final r = widget.existingReview;
    _overall = r?.overallRating ?? 5;
    _guide = r?.guideRating;
    _culture = r?.cultureRating;
    _schedule = r?.scheduleRating;
    _value = r?.valueRating;
    _titleCtrl = TextEditingController(text: r?.title ?? '');
    _commentCtrl = TextEditingController(text: r?.comment ?? '');
    _imageUrls = List<String>.from(r?.imageUrls ?? const []);
  }

  @override
  void dispose() {
    _titleCtrl.dispose();
    _commentCtrl.dispose();
    super.dispose();
  }

  Future<void> _pickImages() async {
    final l10n = context.l10n;
    if (_imageUrls.length >= 5) {
      setState(() => _error = l10n.rvErrMaxPhotos);
      return;
    }
    final picked = await _picker.pickMultiImage(imageQuality: 85);
    if (!mounted || picked.isEmpty) return;
    if (_imageUrls.length + picked.length > 5) {
      setState(() => _error = l10n.rvErrMaxPhotos);
      return;
    }
    setState(() {
      _uploading = true;
      _error = null;
    });
    try {
      final urls = <String>[];
      for (final file in picked) {
        final url = await _service.uploadReviewImage(file.path);
        urls.add(url);
      }
      if (!mounted) return;
      setState(() {
        _imageUrls.addAll(urls);
        if (_imageUrls.length > 5) _imageUrls = _imageUrls.take(5).toList();
      });
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } catch (_) {
      if (mounted) setState(() => _error = l10n.tdLoadFailed);
    } finally {
      if (mounted) setState(() => _uploading = false);
    }
  }

  Future<void> _submit() async {
    final l10n = context.l10n;
    if (_overall < 1 || _overall > 5) {
      setState(() => _error = l10n.rvErrRating);
      return;
    }
    final comment = _commentCtrl.text.trim();
    if (comment.length < 10) {
      setState(() => _error = l10n.rvErrMinComment);
      return;
    }

    setState(() {
      _submitting = true;
      _error = null;
    });
    try {
      final saved = _isEdit
          ? await _service.updateReview(
              widget.existingReview!.id,
              overallRating: _overall,
              guideRating: _guide,
              cultureRating: _culture,
              scheduleRating: _schedule,
              valueRating: _value,
              title: _titleCtrl.text,
              comment: comment,
              imageUrls: _imageUrls,
            )
          : await _service.createReview(
              bookingId: widget.bookingId,
              overallRating: _overall,
              guideRating: _guide,
              cultureRating: _culture,
              scheduleRating: _schedule,
              valueRating: _value,
              title: _titleCtrl.text,
              comment: comment,
              imageUrls: _imageUrls,
            );
      if (!mounted) return;
      Navigator.of(context).pop(saved);
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } catch (_) {
      if (mounted) setState(() => _error = l10n.tdLoadFailed);
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final bottomInset = MediaQuery.viewInsetsOf(context).bottom;
    return Padding(
      padding: EdgeInsets.fromLTRB(18, 0, 18, 16 + bottomInset),
      child: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                color: AppCultureColors.successLight,
                borderRadius: BorderRadius.circular(20),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.verified_user_rounded, size: 13, color: AppCultureColors.success),
                  const SizedBox(width: 4),
                  Text(
                    l10n.rvVerifiedBadge,
                    style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, color: AppCultureColors.success),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 8),
            Text(
              _isEdit ? l10n.rvModalEditTitle : l10n.rvModalCreateTitle,
              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: AppCultureColors.textDark),
            ),
            const SizedBox(height: 14),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: AppCultureColors.brass50,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppCultureColors.brass200),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    l10n.rvOverallLabel,
                    style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppCultureColors.textDark),
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      StarRatingPicker(
                        value: _overall,
                        onChanged: (v) {
                          if (v != null) setState(() => _overall = v);
                        },
                      ),
                      const SizedBox(width: 10),
                      Text(
                        l10n.rvFilterStars(_overall),
                        style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: AppCultureColors.amberDark),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 14),
            Text(
              l10n.rvCriteriaOptional,
              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppCultureColors.textMuted),
            ),
            const SizedBox(height: 8),
            for (final item in [
              (l10n.rvCriteriaGuide, _guide, (int? v) => setState(() => _guide = v)),
              (l10n.rvCriteriaCulture, _culture, (int? v) => setState(() => _culture = v)),
              (l10n.rvCriteriaSchedule, _schedule, (int? v) => setState(() => _schedule = v)),
              (l10n.rvCriteriaValue, _value, (int? v) => setState(() => _value = v)),
            ])
              Padding(
                padding: const EdgeInsets.only(bottom: 6),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: AppCultureColors.border),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(item.$1, style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600, color: AppCultureColors.textDark)),
                      StarRatingPicker(value: item.$2 ?? 0, onChanged: item.$3, size: 22, allowClear: true),
                    ],
                  ),
                ),
              ),
            const SizedBox(height: 10),
            Text(l10n.rvTitleLabel, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppCultureColors.textDark)),
            const SizedBox(height: 6),
            TextField(
              controller: _titleCtrl,
              maxLength: 150,
              decoration: InputDecoration(
                hintText: l10n.rvTitlePlaceholder,
                counterText: '',
                contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
              ),
            ),
            const SizedBox(height: 12),
            Text(l10n.rvCommentLabel, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppCultureColors.textDark)),
            const SizedBox(height: 6),
            TextField(
              controller: _commentCtrl,
              maxLines: 4,
              maxLength: 2000,
              decoration: InputDecoration(
                hintText: l10n.rvCommentPlaceholder,
                contentPadding: const EdgeInsets.all(12),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
              ),
            ),
            const SizedBox(height: 8),
            Text(l10n.rvPhotosLabel, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppCultureColors.textDark)),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                for (var i = 0; i < _imageUrls.length; i++)
                  Stack(
                    children: [
                      ClipRRect(
                        borderRadius: BorderRadius.circular(12),
                        child: Image.network(_imageUrls[i], width: 72, height: 72, fit: BoxFit.cover),
                      ),
                      Positioned(
                        right: 2,
                        top: 2,
                        child: GestureDetector(
                          onTap: () => setState(() => _imageUrls.removeAt(i)),
                          child: Container(
                            padding: const EdgeInsets.all(3),
                            decoration: const BoxDecoration(color: Colors.black54, shape: BoxShape.circle),
                            child: const Icon(Icons.close_rounded, size: 14, color: Colors.white),
                          ),
                        ),
                      ),
                    ],
                  ),
                if (_imageUrls.length < 5)
                  InkWell(
                    borderRadius: BorderRadius.circular(12),
                    onTap: _uploading ? null : _pickImages,
                    child: Container(
                      width: 80,
                      height: 72,
                      decoration: BoxDecoration(
                        color: AppCultureColors.surfaceSubtle,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: AppCultureColors.border),
                      ),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          if (_uploading)
                            const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2))
                          else
                            const Icon(Icons.add_photo_alternate_outlined, size: 22, color: AppCultureColors.heritageJade),
                          const SizedBox(height: 4),
                          Text(
                            _uploading ? l10n.rvUploading : l10n.rvAddPhoto,
                            textAlign: TextAlign.center,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(fontSize: 10.5, fontWeight: FontWeight.w700, color: AppCultureColors.textMuted),
                          ),
                        ],
                      ),
                    ),
                  ),
              ],
            ),
            if (_error != null) ...[
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: AppCultureColors.errorLight,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.error_outline_rounded, size: 16, color: AppCultureColors.error),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(_error!, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppCultureColors.error)),
                    ),
                  ],
                ),
              ),
            ],
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: _submitting ? null : () => Navigator.of(context).pop(),
                    style: OutlinedButton.styleFrom(
                      minimumSize: const Size(0, 46),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    child: Text(l10n.rvCancel),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  flex: 2,
                  child: FilledButton(
                    onPressed: (_submitting || _uploading) ? null : _submit,
                    style: FilledButton.styleFrom(
                      backgroundColor: AppCultureColors.heritageJade,
                      minimumSize: const Size(0, 46),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    child: _submitting
                        ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                        : Text(
                            _isEdit ? l10n.rvSaveChanges : l10n.rvSubmit,
                            style: const TextStyle(fontWeight: FontWeight.w700),
                          ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class TourReviewsSection extends StatefulWidget {
  final int tourId;

  const TourReviewsSection({super.key, required this.tourId});

  @override
  State<TourReviewsSection> createState() => _TourReviewsSectionState();
}

class _TourReviewsSectionState extends State<TourReviewsSection> {
  final _service = TourReviewService();
  TourRatingSummaryModel? _summary;
  List<TourReviewModel> _items = const [];
  bool _loading = true;
  bool _loadingMore = false;
  bool _hasMore = false;
  int _page = 0;
  int? _ratingFilter;
  bool _hasPhotos = false;
  String _sort = 'newest';

  @override
  void initState() {
    super.initState();
    _loadAll();
  }

  @override
  void didUpdateWidget(covariant TourReviewsSection oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.tourId != widget.tourId) {
      _loadAll();
    }
  }

  Future<void> _loadAll() async {
    _loadSummary();
    await _loadReviews(reset: true);
  }

  Future<void> _loadSummary() async {
    try {
      final sum = await _service.getTourSummary(widget.tourId);
      if (mounted) setState(() => _summary = sum);
    } catch (_) {
      if (mounted) setState(() => _summary = null);
    }
  }

  Future<void> _loadReviews({required bool reset}) async {
    final nextPage = reset ? 0 : _page + 1;
    if (reset) {
      setState(() => _loading = true);
    } else {
      setState(() => _loadingMore = true);
    }
    try {
      final res = await _service.getPublicReviews(
        widget.tourId,
        rating: _ratingFilter,
        hasPhotos: _hasPhotos,
        sort: _sort,
        page: nextPage,
        size: 6,
      );
      if (!mounted) return;
      setState(() {
        _page = nextPage;
        _hasMore = res.hasMore;
        _items = reset ? res.items : [..._items, ...res.items];
      });
    } catch (_) {
      if (mounted && reset) setState(() => _items = const []);
    } finally {
      if (mounted) {
        setState(() {
          _loading = false;
          _loadingMore = false;
        });
      }
    }
  }

  void _openPhoto(String url) {
    showDialog<void>(
      context: context,
      builder: (ctx) => Dialog(
        backgroundColor: Colors.black,
        insetPadding: const EdgeInsets.all(12),
        child: Stack(
          children: [
            InteractiveViewer(child: Image.network(url, fit: BoxFit.contain)),
            Positioned(
              right: 8,
              top: 8,
              child: IconButton(
                onPressed: () => Navigator.of(ctx).pop(),
                icon: const Icon(Icons.close_rounded, color: Colors.white),
              ),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final sum = _summary;
    final total = sum?.totalReviews ?? 0;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppCultureColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.star_rounded, size: 20, color: AppCultureColors.goldBright),
              const SizedBox(width: 6),
              Expanded(
                child: Text(
                  l10n.rvSectionTitle,
                  style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: AppCultureColors.textDark),
                ),
              ),
              if (total > 0)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: AppCultureColors.successLight,
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(
                    l10n.rvTotalCount(total),
                    style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: AppCultureColors.success),
                  ),
                ),
            ],
          ),
          if (sum != null && total > 0) ...[
            const SizedBox(height: 14),
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: AppCultureColors.surfaceSubtle,
                borderRadius: BorderRadius.circular(16),
              ),
              child: Column(
                children: [
                  Row(
                    children: [
                      Column(
                        children: [
                          Text(
                            sum.averageRating.toStringAsFixed(1),
                            style: const TextStyle(fontSize: 32, fontWeight: FontWeight.w900, color: AppCultureColors.textDark),
                          ),
                          StarRatingRow(value: sum.averageRating, size: 15),
                          if (sum.replyRate > 0) ...[
                            const SizedBox(height: 4),
                            Text(
                              l10n.rvReplyRate(sum.replyRate.round()),
                              style: const TextStyle(fontSize: 10.5, fontWeight: FontWeight.w600, color: AppCultureColors.heritageJade),
                            ),
                          ],
                        ],
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Column(
                          children: [
                            for (var star = 5; star >= 1; star--)
                              _StarProgressBar(
                                label: l10n.rvFilterStars(star),
                                count: sum.starDistribution[star] ?? 0,
                                total: total,
                                selected: _ratingFilter == star,
                                onTap: () {
                                  setState(() => _ratingFilter = _ratingFilter == star ? null : star);
                                  _loadReviews(reset: true);
                                },
                              ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  if (sum.avgGuideRating != null ||
                      sum.avgCultureRating != null ||
                      sum.avgScheduleRating != null ||
                      sum.avgValueRating != null) ...[
                    const SizedBox(height: 12),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: [
                        if (sum.avgGuideRating != null) _CriteriaChip(l10n.rvCriteriaGuide, sum.avgGuideRating!),
                        if (sum.avgCultureRating != null) _CriteriaChip(l10n.rvCriteriaCulture, sum.avgCultureRating!),
                        if (sum.avgScheduleRating != null) _CriteriaChip(l10n.rvCriteriaSchedule, sum.avgScheduleRating!),
                        if (sum.avgValueRating != null) _CriteriaChip(l10n.rvCriteriaValue, sum.avgValueRating!),
                      ],
                    ),
                  ],
                ],
              ),
            ),
            const SizedBox(height: 12),
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  _FilterPill(
                    label: l10n.rvFilterAll,
                    selected: _ratingFilter == null && !_hasPhotos,
                    onTap: () {
                      setState(() {
                        _ratingFilter = null;
                        _hasPhotos = false;
                      });
                      _loadReviews(reset: true);
                    },
                  ),
                  for (var s = 5; s >= 1; s--)
                    _FilterPill(
                      label: l10n.rvFilterStars(s),
                      selected: _ratingFilter == s,
                      onTap: () {
                        setState(() => _ratingFilter = _ratingFilter == s ? null : s);
                        _loadReviews(reset: true);
                      },
                    ),
                  _FilterPill(
                    label: l10n.rvFilterPhotos,
                    selected: _hasPhotos,
                    onTap: () {
                      setState(() => _hasPhotos = !_hasPhotos);
                      _loadReviews(reset: true);
                    },
                  ),
                  const SizedBox(width: 6),
                  DropdownButtonHideUnderline(
                    child: DropdownButton<String>(
                      value: _sort,
                      isDense: true,
                      style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppCultureColors.textDark),
                      items: [
                        DropdownMenuItem(value: 'newest', child: Text(l10n.rvSortNewest)),
                        DropdownMenuItem(value: 'highest', child: Text(l10n.rvSortHighest)),
                        DropdownMenuItem(value: 'lowest', child: Text(l10n.rvSortLowest)),
                      ],
                      onChanged: (v) {
                        if (v == null) return;
                        setState(() => _sort = v);
                        _loadReviews(reset: true);
                      },
                    ),
                  ),
                ],
              ),
            ),
          ],
          const SizedBox(height: 12),
          if (_loading)
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(vertical: 20, horizontal: 16),
              decoration: BoxDecoration(
                color: AppCultureColors.surfaceSubtle,
                borderRadius: BorderRadius.circular(14),
              ),
              child: Text(
                l10n.rvEmptyTitle,
                textAlign: TextAlign.center,
                style: const TextStyle(fontSize: 13, color: AppCultureColors.textMuted),
              ),
            )
          else if (_items.isEmpty)
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppCultureColors.surfaceSubtle,
                borderRadius: BorderRadius.circular(14),
              ),
              child: Column(
                children: [
                  Text(l10n.rvEmptyTitle, style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w700, color: AppCultureColors.textDark)),
                  const SizedBox(height: 4),
                  Text(l10n.rvEmptyDesc, textAlign: TextAlign.center, style: const TextStyle(fontSize: 12, color: AppCultureColors.textMuted)),
                ],
              ),
            )
          else ...[
            for (final r in _items)
              Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: _ReviewItemCard(review: r, onTapPhoto: _openPhoto),
              ),
            if (_hasMore)
              Center(
                child: OutlinedButton(
                  onPressed: _loadingMore ? null : () => _loadReviews(reset: false),
                  child: _loadingMore
                      ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2))
                      : Text(l10n.rvLoadMore),
                ),
              ),
          ],
        ],
      ),
    );
  }
}

class _StarProgressBar extends StatelessWidget {
  final String label;
  final int count;
  final int total;
  final bool selected;
  final VoidCallback onTap;

  const _StarProgressBar({
    required this.label,
    required this.count,
    required this.total,
    required this.selected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final ratio = total > 0 ? count / total : 0.0;
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(6),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 2),
        child: Row(
          children: [
            SizedBox(
              width: 42,
              child: Text(
                label,
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: selected ? FontWeight.w800 : FontWeight.w600,
                  color: selected ? AppCultureColors.amberDark : AppCultureColors.textMuted,
                ),
              ),
            ),
            Expanded(
              child: ClipRRect(
                borderRadius: BorderRadius.circular(4),
                child: LinearProgressIndicator(
                  value: ratio,
                  minHeight: 6,
                  backgroundColor: Colors.white,
                  valueColor: const AlwaysStoppedAnimation(AppCultureColors.goldBright),
                ),
              ),
            ),
            SizedBox(
              width: 24,
              child: Text(
                '$count',
                textAlign: TextAlign.right,
                style: const TextStyle(fontSize: 11, color: AppCultureColors.textMuted),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _CriteriaChip extends StatelessWidget {
  final String label;
  final double value;

  const _CriteriaChip(this.label, this.value);

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(10),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(label, style: const TextStyle(fontSize: 11, color: AppCultureColors.textMuted)),
          const SizedBox(width: 6),
          Text(value.toStringAsFixed(1), style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: AppCultureColors.textDark)),
        ],
      ),
    );
  }
}

class _FilterPill extends StatelessWidget {
  final String label;
  final bool selected;
  final VoidCallback onTap;

  const _FilterPill({required this.label, required this.selected, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(right: 6),
      child: ChoiceChip(
        label: Text(label),
        selected: selected,
        onSelected: (_) => onTap(),
        labelStyle: TextStyle(
          fontSize: 11.5,
          fontWeight: FontWeight.w700,
          color: selected ? Colors.white : AppCultureColors.textDark,
        ),
        selectedColor: AppCultureColors.heritageJade,
        backgroundColor: AppCultureColors.surfaceSubtle,
        side: BorderSide.none,
        visualDensity: VisualDensity.compact,
      ),
    );
  }
}

class _ReviewItemCard extends StatelessWidget {
  final TourReviewModel review;
  final ValueChanged<String> onTapPhoto;

  const _ReviewItemCard({required this.review, required this.onTapPhoto});

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final expDate = review.experienceDate != null ? formatDateVn(review.experienceDate) : '';
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppCultureColors.borderLight),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              CircleAvatar(
                radius: 17,
                backgroundColor: AppCultureColors.jadeLight,
                backgroundImage: review.reviewerAvatarUrl != null ? NetworkImage(review.reviewerAvatarUrl!) : null,
                child: review.reviewerAvatarUrl == null
                    ? Text(
                        review.reviewerName.isNotEmpty ? review.reviewerName[0].toUpperCase() : 'D',
                        style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: AppCultureColors.jadeDark),
                      )
                    : null,
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Flexible(
                          child: Text(
                            review.reviewerName,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppCultureColors.textDark),
                          ),
                        ),
                        const SizedBox(width: 6),
                        const Icon(Icons.verified_rounded, size: 13, color: AppCultureColors.success),
                      ],
                    ),
                    Text(
                      [
                        if (expDate.isNotEmpty) l10n.rvVerifiedDate(expDate),
                        if (review.editedAt != null) l10n.rvEditedLabel,
                      ].join(' · '),
                      style: const TextStyle(fontSize: 11, color: AppCultureColors.textMuted),
                    ),
                  ],
                ),
              ),
              StarRatingRow(value: review.overallRating, size: 14),
            ],
          ),
          if (review.title != null) ...[
            const SizedBox(height: 8),
            Text(review.title!, style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w700, color: AppCultureColors.textDark)),
          ],
          const SizedBox(height: 4),
          Text(review.comment, style: const TextStyle(fontSize: 13, height: 1.45, color: AppCultureColors.textDark)),
          if (review.imageUrls.isNotEmpty) ...[
            const SizedBox(height: 8),
            SizedBox(
              height: 68,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                itemCount: review.imageUrls.length,
                separatorBuilder: (_, _) => const SizedBox(width: 6),
                itemBuilder: (_, idx) {
                  final url = review.imageUrls[idx];
                  return GestureDetector(
                    onTap: () => onTapPhoto(url),
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(10),
                      child: Image.network(url, width: 68, height: 68, fit: BoxFit.cover),
                    ),
                  );
                },
              ),
            ),
          ],
          if (review.providerReply != null) ...[
            const SizedBox(height: 10),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: AppCultureColors.jadeLight.withValues(alpha: 0.6),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    review.providerRepliedByName != null
                        ? '${l10n.rvProviderReplyTitle} · ${review.providerRepliedByName}'
                        : l10n.rvProviderReplyTitle,
                    style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w800, color: AppCultureColors.jadeDark),
                  ),
                  const SizedBox(height: 3),
                  Text(review.providerReply!, style: const TextStyle(fontSize: 12, color: AppCultureColors.textDark)),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class BookingReviewCard extends StatefulWidget {
  final int bookingId;

  const BookingReviewCard({super.key, required this.bookingId});

  @override
  State<BookingReviewCard> createState() => _BookingReviewCardState();
}

class _BookingReviewCardState extends State<BookingReviewCard> {
  final _service = TourReviewService();
  TourReviewEligibilityModel? _eligibility;
  bool _loading = true;
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final res = await _service.checkEligibility(widget.bookingId);
      if (mounted) setState(() => _eligibility = res);
    } catch (_) {
      if (mounted) setState(() => _eligibility = null);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _openForm([TourReviewModel? existing]) async {
    final l10n = context.l10n;
    final saved = await showTourReviewSheet(
      context,
      bookingId: widget.bookingId,
      existingReview: existing,
    );
    if (saved == null || !mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(l10n.rvSavedToast), behavior: SnackBarBehavior.floating),
    );
    await _load();
  }

  Future<void> _confirmDelete(int reviewId) async {
    final l10n = context.l10n;
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(l10n.rvDeleteConfirmTitle),
        content: Text(l10n.rvDeleteConfirmDesc),
        actions: [
          TextButton(onPressed: () => Navigator.of(ctx).pop(false), child: Text(l10n.rvCancel)),
          FilledButton(
            onPressed: () => Navigator.of(ctx).pop(true),
            style: FilledButton.styleFrom(backgroundColor: AppCultureColors.error),
            child: Text(l10n.rvDeleteReview),
          ),
        ],
      ),
    );
    if (ok != true || !mounted) return;
    setState(() => _busy = true);
    try {
      await _service.deleteReview(reviewId);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(l10n.rvDeletedToast), behavior: SnackBarBehavior.floating),
      );
      await _load();
    } on ApiException catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.message), behavior: SnackBarBehavior.floating),
        );
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) return const SizedBox.shrink();
    final el = _eligibility;
    if (el == null) return const SizedBox.shrink();
    final existing = el.existingReview;
    if (!el.eligible && existing == null) return const SizedBox.shrink();

    final l10n = context.l10n;
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppCultureColors.brass200),
      ),
      child: existing != null
          ? Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const Icon(Icons.verified_user_rounded, size: 16, color: AppCultureColors.success),
                    const SizedBox(width: 6),
                    Expanded(
                      child: Text(
                        l10n.rvTripCardTitle,
                        style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: AppCultureColors.textDark),
                      ),
                    ),
                    StarRatingRow(value: existing.overallRating, size: 15),
                  ],
                ),
                if (existing.hidden) ...[
                  const SizedBox(height: 8),
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(color: AppCultureColors.errorLight, borderRadius: BorderRadius.circular(10)),
                    child: Text(
                      l10n.rvHiddenNotice(existing.hiddenReason ?? ''),
                      style: const TextStyle(fontSize: 12, color: AppCultureColors.error),
                    ),
                  ),
                ],
                if (existing.title != null) ...[
                  const SizedBox(height: 8),
                  Text(existing.title!, style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w700, color: AppCultureColors.textDark)),
                ],
                const SizedBox(height: 4),
                Text(existing.comment, style: const TextStyle(fontSize: 13, color: AppCultureColors.textDark)),
                if (existing.providerReply != null) ...[
                  const SizedBox(height: 8),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: AppCultureColors.jadeLight.withValues(alpha: 0.6),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(l10n.rvProviderReplyTitle, style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w800, color: AppCultureColors.jadeDark)),
                        const SizedBox(height: 2),
                        Text(existing.providerReply!, style: const TextStyle(fontSize: 12, color: AppCultureColors.textDark)),
                      ],
                    ),
                  ),
                ],
                const SizedBox(height: 10),
                Row(
                  children: [
                    if (existing.canEdit)
                      OutlinedButton.icon(
                        onPressed: _busy ? null : () => _openForm(existing),
                        icon: const Icon(Icons.edit_outlined, size: 15),
                        label: Text(l10n.rvEditReview),
                      ),
                    if (existing.canEdit) const SizedBox(width: 8),
                    OutlinedButton.icon(
                      onPressed: _busy ? null : () => _confirmDelete(existing.id),
                      icon: const Icon(Icons.delete_outline_rounded, size: 15, color: AppCultureColors.error),
                      label: Text(l10n.rvDeleteReview, style: const TextStyle(color: AppCultureColors.error)),
                      style: OutlinedButton.styleFrom(side: const BorderSide(color: AppCultureColors.errorLight)),
                    ),
                  ],
                ),
              ],
            )
          : Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const Icon(Icons.star_rounded, size: 20, color: AppCultureColors.goldBright),
                    const SizedBox(width: 6),
                    Text(
                      l10n.rvTripCardTitle,
                      style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: AppCultureColors.textDark),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                Text(l10n.rvTripEligibleDesc, style: const TextStyle(fontSize: 12.5, color: AppCultureColors.textMuted)),
                const SizedBox(height: 12),
                SizedBox(
                  width: double.infinity,
                  child: FilledButton.icon(
                    onPressed: () => _openForm(),
                    icon: const Icon(Icons.rate_review_rounded, size: 18),
                    label: Text(l10n.rvWriteReview, style: const TextStyle(fontWeight: FontWeight.w700)),
                    style: FilledButton.styleFrom(
                      backgroundColor: AppCultureColors.brass600,
                      minimumSize: const Size(0, 44),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                  ),
                ),
              ],
            ),
    );
  }
}
