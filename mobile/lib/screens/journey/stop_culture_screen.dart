import 'package:flutter/material.dart';
import 'package:flutter_tts/flutter_tts.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../core/constants/app_colors.dart';
import '../../core/models/tour_detail_model.dart';
import '../../core/services/api_client.dart';
import '../../core/services/journey_service.dart';
import '../common/heritage_motion.dart';
import '../common/inline_video.dart';
import '../common/ink.dart';
import '../common/photo.dart';
import '../culture/cultural_stories.dart';
import '../../l10n/locale_controller.dart';

/// Đánh dấu du khách đã đọc phần văn hoá của một trạm (lưu trên máy, chỉ để hiện nhãn "Mới").
class CultureReadStore {
  static String _key(int journeyId, int destinationId) => 'jg_culture_read_${journeyId}_$destinationId';

  static Future<bool> isRead(int journeyId, int destinationId) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      return prefs.getBool(_key(journeyId, destinationId)) ?? false;
    } catch (_) {
      return false;
    }
  }

  static Future<void> markRead(int journeyId, int destinationId) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setBool(_key(journeyId, destinationId), true);
    } catch (_) {}
  }
}

/// Kết quả khi rời màn văn hoá: du khách bấm "Sang phần Trải nghiệm".
const String goToExperience = 'experience';

/// Phần "Nội dung văn hóa" của một trạm, mở sau khi check-in: trình bày như một trang tạp chí di sản.
///
/// Tour 5 bước lấy nội dung từ `GET /journeys/{id}/destinations/{stopId}/culture` (backend chỉ trả khi đã
/// check-in); tour luồng cũ dùng các câu chuyện văn hoá của điểm đến.
class StopCultureScreen extends StatefulWidget {
  final int journeyId;
  final int destinationId;
  final int order;
  final String name;
  final bool wizard;
  final bool hasExperience;

  const StopCultureScreen({
    super.key,
    required this.journeyId,
    required this.destinationId,
    required this.order,
    required this.name,
    required this.wizard,
    required this.hasExperience,
  });

  static Future<String?> open(BuildContext context, StopCultureScreen screen) =>
      Navigator.of(context).push<String>(MaterialPageRoute(builder: (_) => screen));

  @override
  State<StopCultureScreen> createState() => _StopCultureScreenState();
}

class _StopCultureScreenState extends State<StopCultureScreen> {
  final ScrollController _scrollCtrl = ScrollController();
  final PageController _storyPageCtrl = PageController(viewportFraction: 0.92);
  final PageController _artifactPageCtrl = PageController(viewportFraction: 0.86);
  final FlutterTts _tts = FlutterTts();

  StopCulture? _culture;
  bool _loading = true;
  String? _error;

  double _readProgress = 0;
  bool _storyCardsMode = true;
  int _storyPage = 0;
  int _artifactPage = 0;

  bool _speaking = false;
  double _ttsRate = 1.0;

  @override
  void initState() {
    super.initState();
    _scrollCtrl.addListener(_onScroll);
    _initTts();
    if (widget.wizard) {
      _load();
    } else {
      CultureReadStore.markRead(widget.journeyId, widget.destinationId);
      _loading = false;
    }
  }

  void _initTts() {
    _tts.setCompletionHandler(() {
      if (mounted) setState(() => _speaking = false);
    });
    _tts.setCancelHandler(() {
      if (mounted) setState(() => _speaking = false);
    });
    _tts.setErrorHandler((_) {
      if (mounted) setState(() => _speaking = false);
    });
  }

  void _onScroll() {
    if (!_scrollCtrl.hasClients) return;
    final max = _scrollCtrl.position.maxScrollExtent;
    final next = max <= 0 ? 0.0 : (_scrollCtrl.offset / max).clamp(0.0, 1.0);
    if ((next - _readProgress).abs() > 0.01) {
      setState(() => _readProgress = next);
    }
  }

  @override
  void dispose() {
    _tts.stop();
    _scrollCtrl.removeListener(_onScroll);
    _scrollCtrl.dispose();
    _storyPageCtrl.dispose();
    _artifactPageCtrl.dispose();
    super.dispose();
  }

  Future<void> _stopTts() async {
    try {
      await _tts.stop();
    } catch (_) {}
    if (mounted && _speaking) setState(() => _speaking = false);
  }

  Future<void> _toggleSpeak(String text) async {
    if (text.trim().isEmpty) return;
    if (_speaking) {
      await _stopTts();
      return;
    }
    try {
      final lang = Localizations.localeOf(context).languageCode;
      final ttsLang = switch (lang) {
        'ja' => 'ja-JP',
        'en' => 'en-US',
        _ => 'vi-VN',
      };
      await _tts.setLanguage(ttsLang);
      await _tts.setSpeechRate(_ttsRate * 0.5);
      await _tts.setPitch(1.0);
      if (mounted) setState(() => _speaking = true);
      await _tts.speak(text);
    } catch (_) {
      if (mounted) setState(() => _speaking = false);
    }
  }

  Future<void> _cycleTtsRate(String currentText) async {
    final next = _ttsRate == 1.0 ? 1.25 : (_ttsRate == 1.25 ? 1.5 : 1.0);
    setState(() => _ttsRate = next);
    if (_speaking) {
      await _stopTts();
      await _toggleSpeak(currentText);
    }
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final culture = await JourneyService().getCulture(
        journeyId: widget.journeyId,
        destinationId: widget.destinationId,
      );
      if (!mounted) return;
      setState(() => _culture = culture);
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } finally {
      CultureReadStore.markRead(widget.journeyId, widget.destinationId);
      if (mounted) setState(() => _loading = false);
    }
  }

  /// Ảnh đầu trang: chỉ ảnh của nội dung văn hoá; không có ⇒ để trống (KHÔNG mượn ảnh trạm / tour).
  String? get _hero => _culture?.imageUrl ?? _culture?.culturalImages.firstOrNull;

  @override
  Widget build(BuildContext context) {
    final video = _culture?.videoUrl;
    final hasParallaxHero = video == null && _hero != null;

    return Scaffold(
      backgroundColor: AppInk.paper,
      body: Column(
        children: [
          Expanded(
            child: CustomScrollView(
              controller: _scrollCtrl,
              slivers: [
                SliverAppBar(
                  backgroundColor: AppInk.paper,
                  surfaceTintColor: Colors.transparent,
                  foregroundColor: hasParallaxHero ? Colors.white : AppInk.ink,
                  pinned: true,
                  expandedHeight: hasParallaxHero ? 260 : null,
                  titleSpacing: 0,
                  leading: IconButton(
                    icon: Container(
                      padding: const EdgeInsets.all(6),
                      decoration: hasParallaxHero
                          ? BoxDecoration(
                              color: Colors.black.withValues(alpha: 0.35),
                              shape: BoxShape.circle,
                            )
                          : null,
                      child: Icon(
                        Icons.arrow_back_rounded,
                        color: hasParallaxHero ? Colors.white : AppInk.ink,
                      ),
                    ),
                    onPressed: () => Navigator.of(context).maybePop(),
                  ),
                  title: Text(
                    appL10n.scStopHeader(widget.order.toString().padLeft(2, '0')),
                    style: AppType.eyebrow(
                      color: hasParallaxHero ? Colors.white.withValues(alpha: 0.92) : AppInk.accent,
                    ),
                  ),
                  flexibleSpace: hasParallaxHero
                      ? FlexibleSpaceBar(
                          collapseMode: CollapseMode.parallax,
                          background: Stack(
                            fit: StackFit.expand,
                            children: [
                              Photo(url: _hero, width: 640, semanticLabel: widget.name),
                              DecoratedBox(
                                decoration: BoxDecoration(
                                  gradient: LinearGradient(
                                    begin: Alignment.topCenter,
                                    end: Alignment.bottomCenter,
                                    colors: [
                                      Colors.black.withValues(alpha: 0.42),
                                      Colors.black.withValues(alpha: 0.08),
                                      Colors.black.withValues(alpha: 0.72),
                                    ],
                                    stops: const [0.0, 0.45, 1.0],
                                  ),
                                ),
                              ),
                              Positioned(
                                left: 20,
                                right: 20,
                                bottom: 18,
                                child: Text(
                                  widget.name,
                                  style: AppType.display(size: 25, color: Colors.white),
                                ),
                              ),
                            ],
                          ),
                        )
                      : null,
                  bottom: PreferredSize(
                    preferredSize: const Size.fromHeight(2.5),
                    child: LinearProgressIndicator(
                      value: _readProgress,
                      minHeight: 2.5,
                      backgroundColor: AppInk.border.withValues(alpha: 0.4),
                      valueColor: const AlwaysStoppedAnimation<Color>(AppInk.accent),
                    ),
                  ),
                ),
                if (video != null)
                  SliverToBoxAdapter(
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(16, 10, 16, 0),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          InlineVideo(key: ValueKey(video), url: video),
                          const SizedBox(height: 14),
                          Row(
                            children: [
                              const Icon(Icons.movie_outlined, size: 16, color: AppInk.muted),
                              const SizedBox(width: 6),
                              Text(appL10n.scVideo, style: const TextStyle(fontSize: 12.5, color: AppInk.muted)),
                            ],
                          ),
                          const SizedBox(height: 6),
                          Text(widget.name, style: AppType.display(size: 25)),
                        ],
                      ),
                    ),
                  )
                else if (!hasParallaxHero)
                  SliverToBoxAdapter(
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(20, 16, 20, 0),
                      child: Text(widget.name, style: AppType.display(size: 25)),
                    ),
                  ),
                SliverToBoxAdapter(child: _body()),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _body() {
    if (!widget.wizard) {
      return Padding(
        padding: const EdgeInsets.fromLTRB(20, 20, 20, 32),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            CulturalStoriesSection(destinationId: widget.destinationId, unlocked: true, showTeaser: true),
            const SizedBox(height: 28),
            _footer(),
          ],
        ),
      );
    }
    if (_loading) {
      return const Padding(
        padding: EdgeInsets.symmetric(vertical: 80),
        child: Center(child: CircularProgressIndicator(color: AppInk.accent)),
      );
    }
    if (_error != null) {
      return Padding(
        padding: const EdgeInsets.fromLTRB(24, 48, 24, 24),
        child: Column(
          children: [
            const Icon(Icons.lock_outline_rounded, size: 40, color: AppInk.muted),
            const SizedBox(height: 12),
            Text(_error!, textAlign: TextAlign.center, style: const TextStyle(height: 1.5, color: AppInk.muted)),
            const SizedBox(height: 16),
            OutlinedButton(onPressed: _load, child: Text(appL10n.commonRetry)),
          ],
        ),
      );
    }
    final c = _culture!;
    final paragraphs = (c.culturalContent ?? '')
        .split(RegExp(r'\n\s*\n|\r\n\s*\r\n'))
        .map((p) => p.trim())
        .where((p) => p.isNotEmpty)
        .toList();

    final fullNarration = [
      if (c.shortDescription != null && c.shortDescription!.trim().isNotEmpty) c.shortDescription!.trim(),
      ...paragraphs,
      if (c.funFact != null && c.funFact!.trim().isNotEmpty) c.funFact!.trim(),
    ].join('. ');

    return Padding(
      padding: const EdgeInsets.fromLTRB(0, 16, 0, 32),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (c.shortDescription != null)
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 0, 20, 16),
              child: Reveal(
                order: 0,
                child: Container(
                  padding: const EdgeInsets.fromLTRB(14, 12, 14, 12),
                  decoration: BoxDecoration(
                    color: AppInk.soft,
                    borderRadius: BorderRadius.circular(12),
                    border: const Border(left: BorderSide(color: AppInk.brass, width: 3)),
                  ),
                  child: Text(
                    c.shortDescription!,
                    style: AppType.reading(size: 15.5, color: AppInk.ink).copyWith(fontStyle: FontStyle.italic),
                  ),
                ),
              ),
            ),
          if (fullNarration.isNotEmpty)
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
              child: Reveal(
                order: 1,
                child: _audioGuideBar(fullNarration),
              ),
            ),
          if (paragraphs.isNotEmpty) ...[
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  Expanded(child: _SectionTitle(label: appL10n.jsStory)),
                  if (paragraphs.length > 1) _storyModeToggle(),
                ],
              ),
            ),
            if (_storyCardsMode && paragraphs.length > 1)
              _storyCarousel(paragraphs)
            else
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    for (var i = 0; i < paragraphs.length; i++)
                      Padding(
                        padding: const EdgeInsets.only(bottom: 14),
                        child: i == 0 ? _dropCapParagraph(paragraphs[i]) : Text(paragraphs[i], style: AppType.reading(size: 16)),
                      ),
                  ],
                ),
              ),
          ],
          if (c.culturalImages.isNotEmpty) ...[
            const SizedBox(height: 22),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: _SectionTitle(label: appL10n.scImages, trailing: appL10n.scImageCount(c.culturalImages.length)),
            ),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: _gallery(c.culturalImages),
            ),
          ],
          if (c.funFact != null) ...[
            const SizedBox(height: 22),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: _funFactCard(c.funFact!),
            ),
          ],
          if (c.timeline.isNotEmpty) ...[
            const SizedBox(height: 26),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: const _SectionTitle(label: 'Dòng thời gian lịch sử'),
            ),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: _timelineSection(c.timeline),
            ),
          ],
          if (c.glossary.isNotEmpty) ...[
            const SizedBox(height: 26),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: const _SectionTitle(label: 'Thuật ngữ văn hóa'),
            ),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: _glossarySection(c.glossary),
            ),
          ],
          if (c.artifacts.isNotEmpty) ...[
            const SizedBox(height: 28),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: _SectionTitle(label: appL10n.tdArtifacts, trailing: appL10n.scArtifactCount(c.artifacts.length)),
            ),
            _artifactShowcase(c.artifacts),
          ],
          if (c.isEmpty)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
              child: Text(appL10n.scNoContent, style: const TextStyle(color: AppInk.muted)),
            ),
          const SizedBox(height: 28),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: _footer(),
          ),
        ],
      ),
    );
  }

  Widget _audioGuideBar(String narration) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: _speaking ? AppInk.accentSoft : AppInk.surface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: _speaking ? AppInk.accent.withValues(alpha: 0.4) : AppInk.border),
      ),
      child: Row(
        children: [
          InkWell(
            onTap: () => _toggleSpeak(narration),
            borderRadius: BorderRadius.circular(24),
            child: Container(
              width: 40,
              height: 40,
              decoration: const BoxDecoration(color: AppInk.accent, shape: BoxShape.circle),
              child: Icon(
                _speaking ? Icons.stop_rounded : Icons.headphones_rounded,
                color: Colors.white,
                size: 20,
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  _speaking ? 'Đang phát thuyết minh...' : 'Nghe thuyết minh văn hóa',
                  style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w700, color: AppInk.ink),
                ),
                const SizedBox(height: 2),
                Text(
                  _speaking ? 'Chạm nút dừng hoặc đổi tốc độ đọc' : 'Audio Guide tự động đọc theo ngôn ngữ app',
                  style: const TextStyle(fontSize: 11.5, color: AppInk.muted),
                ),
              ],
            ),
          ),
          InkWell(
            onTap: () => _cycleTtsRate(narration),
            borderRadius: BorderRadius.circular(20),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
              decoration: BoxDecoration(
                color: AppInk.soft,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: AppInk.border),
              ),
              child: Text(
                '${_ttsRate}x',
                style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppInk.ink),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _storyModeToggle() {
    Widget btn(String label, bool active, VoidCallback onTap) => GestureDetector(
          onTap: onTap,
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
            decoration: BoxDecoration(
              color: active ? AppInk.accent : Colors.transparent,
              borderRadius: BorderRadius.circular(14),
            ),
            child: Text(
              label,
              style: TextStyle(
                fontSize: 11.5,
                fontWeight: FontWeight.w700,
                color: active ? Colors.white : AppInk.muted,
              ),
            ),
          ),
        );

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(2),
      decoration: BoxDecoration(
        color: AppInk.soft,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppInk.border),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          btn('Thẻ vuốt', _storyCardsMode, () => setState(() => _storyCardsMode = true)),
          btn('Toàn văn', !_storyCardsMode, () => setState(() => _storyCardsMode = false)),
        ],
      ),
    );
  }

  Widget _storyCarousel(List<String> paragraphs) {
    return Column(
      children: [
        SizedBox(
          height: 225,
          child: PageView.builder(
            controller: _storyPageCtrl,
            itemCount: paragraphs.length,
            onPageChanged: (i) => setState(() => _storyPage = i),
            itemBuilder: (_, i) {
              final text = paragraphs[i];
              return Padding(
                padding: const EdgeInsets.only(right: 10),
                child: Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: AppInk.surface,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: AppInk.border),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.04),
                        blurRadius: 10,
                        offset: const Offset(0, 4),
                      ),
                    ],
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                            decoration: BoxDecoration(
                              color: AppInk.accentSoft,
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Text(
                              'PHẦN ${(i + 1).toString().padLeft(2, '0')} / ${paragraphs.length.toString().padLeft(2, '0')}',
                              style: AppType.eyebrow(color: AppInk.accent),
                            ),
                          ),
                          const Spacer(),
                          InkWell(
                            onTap: () => _toggleSpeak(text),
                            borderRadius: BorderRadius.circular(16),
                            child: Padding(
                              padding: const EdgeInsets.all(4),
                              child: Icon(
                                _speaking ? Icons.volume_off_rounded : Icons.volume_up_rounded,
                                size: 18,
                                color: AppInk.accent,
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 10),
                      Expanded(
                        child: SingleChildScrollView(
                          child: i == 0 ? _dropCapParagraph(text) : Text(text, style: AppType.reading(size: 15.5)),
                        ),
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
        ),
        const SizedBox(height: 10),
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            for (var i = 0; i < paragraphs.length; i++)
              AnimatedContainer(
                duration: const Duration(milliseconds: 220),
                margin: const EdgeInsets.symmetric(horizontal: 3),
                width: _storyPage == i ? 18 : 6,
                height: 6,
                decoration: BoxDecoration(
                  color: _storyPage == i ? AppInk.accent : AppInk.border,
                  borderRadius: BorderRadius.circular(4),
                ),
              ),
          ],
        ),
      ],
    );
  }

  Widget _dropCapParagraph(String text) {
    if (text.length < 2) return Text(text, style: AppType.reading(size: 16));
    final first = text[0];
    final rest = text.substring(1);
    return RichText(
      text: TextSpan(
        children: [
          TextSpan(
            text: first,
            style: AppType.display(size: 28, color: AppInk.lacquer),
          ),
          TextSpan(
            text: rest,
            style: AppType.reading(size: 15.5),
          ),
        ],
      ),
    );
  }

  /// Lưới 3 cột ảnh vuông nhỏ; chạm để xem lớn và vuốt qua lại.
  Widget _gallery(List<String> images) {
    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      padding: EdgeInsets.zero,
      itemCount: images.length,
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 3,
        mainAxisSpacing: 6,
        crossAxisSpacing: 6,
      ),
      itemBuilder: (_, i) => Semantics(
        button: true,
        label: appL10n.scViewImage(i + 1),
        child: GestureDetector(
          onTap: () => _viewImage(images, i),
          child: Photo(url: images[i], width: 140, borderRadius: BorderRadius.circular(10)),
        ),
      ),
    );
  }

  void _viewImage(List<String> images, int initial) {
    Navigator.of(context).push(
      MaterialPageRoute(
        fullscreenDialog: true,
        builder: (_) => _ImageViewer(images: images, initial: initial),
      ),
    );
  }

  /// Thẻ hiện vật dạng bảo tàng vuốt ngang.
  Widget _artifactShowcase(List<TourArtifact> artifacts) {
    return Column(
      children: [
        SizedBox(
          height: 235,
          child: PageView.builder(
            controller: _artifactPageCtrl,
            itemCount: artifacts.length,
            onPageChanged: (i) => setState(() => _artifactPage = i),
            itemBuilder: (_, i) {
              final a = artifacts[i];
              final label = appL10n.scArtifactNumber((i + 1).toString().padLeft(2, '0'));
              return Padding(
                padding: const EdgeInsets.only(right: 12),
                child: Pressable(
                  onTap: () => _showArtifact(a, label),
                  child: Container(
                    clipBehavior: Clip.antiAlias,
                    decoration: BoxDecoration(
                      color: AppInk.surface,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: AppInk.border),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.04),
                          blurRadius: 10,
                          offset: const Offset(0, 4),
                        ),
                      ],
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        SizedBox(
                          height: 118,
                          width: double.infinity,
                          child: Stack(
                            fit: StackFit.expand,
                            children: [
                              if (a.imageUrl != null)
                                Photo(url: a.imageUrl, width: 320, semanticLabel: a.name)
                              else
                                Container(
                                  color: AppInk.soft,
                                  child: const Icon(Icons.museum_outlined, size: 36, color: AppInk.muted),
                                ),
                              Positioned(
                                left: 10,
                                top: 10,
                                child: Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                  decoration: BoxDecoration(
                                    color: Colors.black.withValues(alpha: 0.62),
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                  child: Text(label, style: AppType.eyebrow(color: Colors.white)),
                                ),
                              ),
                              if (a.videoUrl != null)
                                Positioned(
                                  right: 10,
                                  top: 10,
                                  child: Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                    decoration: BoxDecoration(
                                      color: AppInk.accent,
                                      borderRadius: BorderRadius.circular(8),
                                    ),
                                    child: Row(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        const Icon(Icons.play_arrow_rounded, size: 14, color: Colors.white),
                                        const SizedBox(width: 2),
                                        Text(appL10n.scHasVideo, style: const TextStyle(fontSize: 10.5, fontWeight: FontWeight.w700, color: Colors.white)),
                                      ],
                                    ),
                                  ),
                                ),
                            ],
                          ),
                        ),
                        Expanded(
                          child: Padding(
                            padding: const EdgeInsets.fromLTRB(12, 10, 12, 10),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(a.name, maxLines: 1, overflow: TextOverflow.ellipsis, style: AppType.display(size: 16)),
                                if (a.shortDescription != null) ...[
                                  const SizedBox(height: 4),
                                  Text(
                                    a.shortDescription!,
                                    maxLines: 2,
                                    overflow: TextOverflow.ellipsis,
                                    style: const TextStyle(fontSize: 12.5, height: 1.35, color: AppInk.muted),
                                  ),
                                ],
                                const Spacer(),
                                Row(
                                  children: [
                                    Text(
                                      'Chạm để khám phá chi tiết',
                                      style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w600, color: AppInk.accent),
                                    ),
                                    const SizedBox(width: 4),
                                    const Icon(Icons.arrow_forward_rounded, size: 13, color: AppInk.accent),
                                  ],
                                ),
                              ],
                            ),
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
        if (artifacts.length > 1) ...[
          const SizedBox(height: 10),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              for (var i = 0; i < artifacts.length; i++)
                AnimatedContainer(
                  duration: const Duration(milliseconds: 220),
                  margin: const EdgeInsets.symmetric(horizontal: 3),
                  width: _artifactPage == i ? 18 : 6,
                  height: 6,
                  decoration: BoxDecoration(
                    color: _artifactPage == i ? AppInk.accent : AppInk.border,
                    borderRadius: BorderRadius.circular(4),
                  ),
                ),
            ],
          ),
        ],
      ],
    );
  }

  Widget _funFactCard(String fact) {
    return Container(
      padding: const EdgeInsets.all(15),
      decoration: BoxDecoration(
        color: AppInk.brass.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppInk.brass.withValues(alpha: 0.35)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: AppInk.brass.withValues(alpha: 0.16),
              borderRadius: BorderRadius.circular(10),
            ),
            child: const Icon(Icons.lightbulb_outline_rounded, size: 20, color: AppInk.brass),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('BẠN CÓ BIẾT?', style: AppType.eyebrow(color: AppInk.brass)),
                const SizedBox(height: 4),
                Text(fact, style: AppType.reading(size: 14.5)),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _timelineSection(List<CulturalTimelineItem> items) {
    return Column(
      children: [
        for (var i = 0; i < items.length; i++)
          IntrinsicHeight(
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                SizedBox(
                  width: 24,
                  child: Column(
                    children: [
                      Container(
                        width: 11,
                        height: 11,
                        margin: const EdgeInsets.only(top: 5),
                        decoration: BoxDecoration(
                          color: AppInk.accent,
                          shape: BoxShape.circle,
                          border: Border.all(color: AppInk.accentSoft, width: 2.5),
                        ),
                      ),
                      if (i < items.length - 1)
                        Expanded(
                          child: Container(
                            width: 2,
                            margin: const EdgeInsets.symmetric(vertical: 3),
                            color: AppInk.accent.withValues(alpha: 0.25),
                          ),
                        ),
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Container(
                    margin: EdgeInsets.only(bottom: i < items.length - 1 ? 14 : 0),
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: AppInk.surface,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: AppInk.border),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        if (items[i].period != null) ...[
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                            decoration: BoxDecoration(
                              color: AppInk.accentSoft,
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Text(
                              items[i].period!,
                              style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, color: AppInk.accent),
                            ),
                          ),
                          const SizedBox(height: 6),
                        ],
                        if (items[i].event != null) Text(items[i].event!, style: AppType.reading(size: 14.5)),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
      ],
    );
  }

  Widget _glossarySection(List<CulturalGlossaryItem> items) {
    return Container(
      clipBehavior: Clip.antiAlias,
      decoration: BoxDecoration(
        color: AppInk.surface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppInk.border),
      ),
      child: Column(
        children: [
          for (var i = 0; i < items.length; i++)
            Container(
              decoration: BoxDecoration(
                border: i < items.length - 1 ? const Border(bottom: BorderSide(color: AppInk.line)) : null,
              ),
              child: ExpansionTile(
                tilePadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 2),
                childrenPadding: const EdgeInsets.fromLTRB(14, 0, 14, 12),
                shape: const Border(),
                collapsedShape: const Border(),
                leading: const Icon(Icons.menu_book_rounded, size: 18, color: AppInk.accent),
                title: Text(
                  items[i].term ?? '',
                  style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: AppInk.ink),
                ),
                children: [
                  Align(
                    alignment: Alignment.centerLeft,
                    child: Text(items[i].meaning ?? '', style: AppType.reading(size: 14, color: AppInk.muted)),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }

  /// Bảng chi tiết hiện vật: ảnh vừa khung (không tràn màn), mô tả đầy đủ, video nếu có.
  void _showArtifact(TourArtifact a, String label) {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      backgroundColor: AppInk.paper,
      builder: (ctx) => DraggableScrollableSheet(
        expand: false,
        initialChildSize: 0.7,
        maxChildSize: 0.92,
        builder: (_, controller) => ListView(
          controller: controller,
          padding: const EdgeInsets.fromLTRB(20, 0, 20, 28),
          children: [
            if (a.imageUrl != null)
              GestureDetector(
                onTap: () => _viewImage([a.imageUrl!], 0),
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxHeight: 240),
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(14),
                    child: AspectRatio(aspectRatio: 4 / 3, child: Photo(url: a.imageUrl, width: 400, semanticLabel: a.name)),
                  ),
                ),
              ),
            const SizedBox(height: 14),
            Text(label, style: AppType.eyebrow()),
            const SizedBox(height: 4),
            Text(a.name, style: AppType.display(size: 21)),
            if (a.shortDescription != null) ...[
              const SizedBox(height: 10),
              Text(a.shortDescription!, style: AppType.reading(size: 15.5)),
            ],
            if (a.videoUrl != null) ...[
              const SizedBox(height: 16),
              InlineVideo(url: a.videoUrl!),
            ],
          ],
        ),
      ),
    );
  }

  Widget _footer() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const _Ornament(),
        const SizedBox(height: 20),
        if (widget.hasExperience)
          FilledButton.icon(
            onPressed: () => Navigator.of(context).pop(goToExperience),
            style: FilledButton.styleFrom(
              backgroundColor: AppInk.accent,
              foregroundColor: Colors.white,
              minimumSize: const Size.fromHeight(52),
              shape: const StadiumBorder(),
              textStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15),
            ),
            icon: const Icon(Icons.explore_outlined),
            label: Text(appL10n.scToExperience),
          )
        else
          OutlinedButton(
            onPressed: () => Navigator.of(context).maybePop(),
            style: OutlinedButton.styleFrom(
              foregroundColor: AppInk.ink,
              side: const BorderSide(color: AppInk.ink),
              minimumSize: const Size.fromHeight(52),
              shape: const StadiumBorder(),
            ),
            child: Text(appL10n.scBackToRoute),
          ),
      ],
    );
  }
}

/// Tiêu đề mục: chữ có chân, gạch mảnh màu son bên dưới.
class _SectionTitle extends StatelessWidget {
  final String label;
  final String? trailing;
  const _SectionTitle({required this.label, this.trailing});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Expanded(child: Text(label, style: AppType.display(size: 19))),
              if (trailing != null) Text(trailing!, style: const TextStyle(fontSize: 12.5, color: AppInk.muted)),
            ],
          ),
          const SizedBox(height: 6),
          Container(width: 28, height: 2, color: AppInk.lacquer),
        ],
      ),
    );
  }
}

/// Đường phân cách hai vạch mảnh, giữa là ô vuông xoay — họa tiết trang trí kiểu sách cổ.
class _Ornament extends StatelessWidget {
  const _Ornament();

  @override
  Widget build(BuildContext context) {
    Widget line() => Expanded(child: Container(height: 1, color: AppInk.border));
    return Row(
      children: [
        line(),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 10),
          child: Transform.rotate(
            angle: 0.785398,
            child: Container(width: 7, height: 7, decoration: BoxDecoration(border: Border.all(color: AppInk.brass))),
          ),
        ),
        line(),
      ],
    );
  }
}

class _ImageViewer extends StatelessWidget {
  final List<String> images;
  final int initial;
  const _ImageViewer({required this.images, required this.initial});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(backgroundColor: Colors.black, foregroundColor: Colors.white),
      body: PageView.builder(
        controller: PageController(initialPage: initial),
        itemCount: images.length,
        itemBuilder: (_, i) => InteractiveViewer(
          child: Center(
            child: Image.network(
              images[i],
              fit: BoxFit.contain,
              errorBuilder: (_, _, _) => const Icon(Icons.broken_image_outlined, color: Colors.white54, size: 48),
            ),
          ),
        ),
      ),
    );
  }
}
