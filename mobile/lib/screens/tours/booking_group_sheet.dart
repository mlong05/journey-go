import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../core/constants/app_colors.dart';
import '../../core/models/gamification_model.dart' show formatThousands;
import '../../core/models/tour_detail_model.dart';
import '../../core/services/booking_service.dart';

/// Loại khách mà tour đang bán — nhãn + khoảng tuổi.
///
/// Khớp với `GuestType` của backend: ADULT / CHILD / TODDLER / INFANT.
class GuestTypeOption {
  final String key;
  final String label;
  final String ageRange;
  final double price;
  final bool alwaysFree;
  final bool countsTowardSlot;

  const GuestTypeOption({
    required this.key,
    required this.label,
    required this.ageRange,
    required this.price,
    required this.alwaysFree,
    required this.countsTowardSlot,
  });

  String get formattedPrice =>
      alwaysFree || price <= 0 ? 'Miễn phí' : '${formatThousands(price)} đ';
}

/// Một hành khách trong nhóm (thông tin do khách nhập).
class PassengerDraft {
  /// Khoá ổn định để gắn TextEditingController (không dùng index vì danh sách
  /// thay đổi khi tăng/giảm số lượng theo loại khách).
  ///
  /// ⚠️ Có bộ đếm phụ vì `DateTime.now()` trên Windows chỉ chính xác tới
  /// ~micro giây ⇒ hai hành khách tạo trong cùng nhịp có thể trùng id
  /// ⇒ trùng `ValueKey` của accordion và trộn dữ liệu controller.
  static int _counter = 0;

  final String id = '${DateTime.now().microsecondsSinceEpoch}-${_counter++}';

  String fullName;
  String birthDate;
  String gender;
  String email;

  PassengerDraft({
    required this.fullName,
    required this.birthDate,
    required this.gender,
    required this.email,
  });
}

/// Kết quả đặt tour: danh sách hành khách đã chốt (để màn gọi tạo booking).
class BookingGroupDraft {
  final List<BookingPassengerInput> passengers;
  final double total;

  const BookingGroupDraft({required this.passengers, required this.total});
}

/// Bottom sheet ĐẶT TOUR THẬT — chọn số khách theo loại + nhập thông tin hành khách.
///
/// ── Vì sao cần form này? ──
/// Backend yêu cầu `POST /bookings` kèm danh sách `passengers[]` (không được rỗng):
/// mỗi hành khách cần họ tên, ngày sinh, giới tính — và EMAIL bắt buộc với người lớn
/// (để nhận vé và quyền truy cập tour).
///
/// ── Quy tắc nghiệp vụ áp dụng ──
///  • Loại khách suy ra từ TUỔI TẠI NGÀY TRẢI NGHIỆM (không phải ngày đặt tour).
///  • Em bé luôn miễn phí và (theo cấu hình đối tác) không chiếm slot.
///  • Số chỗ còn của ngày đã chọn giới hạn số hành khách CHIẾM SLOT.
///
/// Trả về `BookingGroupDraft` để màn gọi tạo booking; null nếu khách đóng bảng.
Future<BookingGroupDraft?> showBookingGroupSheet({
  required BuildContext context,
  required TourDetailModel detail,
  required String experienceDate,
  required int? remainingSlots,
  String accountEmail = '',
}) {
  return showModalBottomSheet<BookingGroupDraft>(
    context: context,
    isScrollControlled: true,
    showDragHandle: true,
    backgroundColor: AppCultureColors.surface,
    builder: (_) => _BookingGroupSheet(
      detail: detail,
      experienceDate: experienceDate,
      remainingSlots: remainingSlots,
      accountEmail: accountEmail,
    ),
  );
}

class _BookingGroupSheet extends StatefulWidget {
  final TourDetailModel detail;
  final String experienceDate;
  final int? remainingSlots;
  final String accountEmail;

  const _BookingGroupSheet({
    required this.detail,
    required this.experienceDate,
    required this.remainingSlots,
    required this.accountEmail,
  });

  @override
  State<_BookingGroupSheet> createState() => _BookingGroupSheetState();
}

class _BookingGroupSheetState extends State<_BookingGroupSheet> {
  /// Loại khách tour đang bán (fallback: một loại "Người lớn" theo giá hiển thị).
  late final List<GuestTypeOption> _types = widget.detail.prices.isNotEmpty
      ? widget.detail.prices
          .map((p) => GuestTypeOption(
                key: p.guestType,
                label: p.label.isEmpty ? p.guestType : p.label,
                ageRange: p.ageRange,
                price: p.price,
                alwaysFree: p.alwaysFree,
                // Em bé đi kèm KHÔNG tính slot; các loại khác theo cấu hình đối tác.
                countsTowardSlot: p.countsTowardSlot,
              ))
          .toList()
      : [
          GuestTypeOption(
            key: 'ADULT',
            label: 'Người lớn',
            ageRange: '',
            price: widget.detail.price,
            alwaysFree: false,
            countsTowardSlot: true,
          ),
        ];

  /// Số lượng theo loại khách.
  late final Map<String, int> _counts = {
    for (final t in _types) t.key: t.key == 'ADULT' ? 1 : 0,
  };

  /// Thông tin từng hành khách (key = loại khách).
  final Map<String, List<PassengerDraft>> _passengers = {};

  /// Id của hành khách VỪA được thêm ⇒ mở sẵn accordion để khách điền ngay.
  final Set<String> _justAdded = {};

  @override
  void initState() {
    super.initState();
    // Hành khách đầu tiên = người đặt tour ⇒ gán sẵn email tài khoản.
    final adult = _types.where((t) => t.key == 'ADULT').firstOrNull;
    final key = adult?.key ?? 'ADULT';
    final count = _counts[key] ?? 0;
    if (count > 0) {
      _passengers[key] = [
        for (var i = 0; i < count; i++)
          PassengerDraft(
            fullName: '',
            birthDate: '',
            gender: '',
            email: i == 0 ? widget.accountEmail : '',
          ),
      ];
    }
  }

  int _countOf(String key) => _counts[key] ?? 0;

  /// Tổng số hành khách.
  int get _totalGuests => _counts.values.fold(0, (a, b) => a + b);

  /// Số hành khách CHIẾM SLOT (em bé không tính).
  int get _usedSlots => _types
      .where((t) => t.countsTowardSlot)
      .fold(0, (sum, t) => sum + _countOf(t.key));

  /// Số chỗ còn của ngày đã chọn (null = chưa biết ⇒ không giới hạn cứng).
  int get _maxSlots => widget.remainingSlots ?? (1 << 30);

  /// Tổng tiền ước tính.
  double get _total => _types.fold(
      0.0,
      (sum, t) =>
          sum + (t.alwaysFree ? 0 : t.price) * _countOf(t.key));

  bool get _canConfirm {
    if (_totalGuests == 0) return false;
    // Mọi hành khách phải đủ họ tên + ngày sinh + giới tính; người lớn cần thêm email.
    for (final entry in _passengers.entries) {
      final type = _types.where((t) => t.key == entry.key).firstOrNull;
      final isAdult = type?.key == 'ADULT';
      for (final p in entry.value) {
        if (!_isPassengerComplete(p, isAdult)) return false;
      }
    }
    return true;
  }

  /// Hành khách đã điền đủ thông tin bắt buộc chưa.
  bool _isPassengerComplete(PassengerDraft p, bool isAdult) {
    if (p.fullName.trim().isEmpty || p.birthDate.isEmpty || p.gender.isEmpty) {
      return false;
    }
    if (isAdult && p.email.trim().isEmpty) return false;
    return true;
  }

  /// Còn hành khách nào thiếu thông tin không (dùng để nhắc dưới nút xác nhận).
  bool get _hasMissingPassenger {
    for (final entry in _passengers.entries) {
      final type = _types.where((t) => t.key == entry.key).firstOrNull;
      final isAdult = type?.key == 'ADULT';
      for (final p in entry.value) {
        if (!_isPassengerComplete(p, isAdult)) return true;
      }
    }
    return false;
  }

  /// Bỏ hành khách khỏi nhóm ⇒ huỷ controller và trạng thái "mới thêm".
  ///
  /// ⚠️ Controller KHÔNG dispose ngay: `EditableText` đang gắn vào nó sẽ bị
  /// dispose trong cùng frame ⇒ phải chờ frame kế tiếp rồi mới dispose.
  void _discardPassenger(PassengerDraft p) {
    _justAdded.remove(p.id);
    final pending = <TextEditingController>[];
    for (final field in const ['fullName', 'birthDate', 'email']) {
      final controller = _controllers.remove('${p.id}:$field');
      if (controller != null) pending.add(controller);
    }
    if (pending.isEmpty) return;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      for (final controller in pending) {
        controller.dispose();
      }
    });
  }

  void _changeCount(GuestTypeOption type, int delta) {
    final current = _countOf(type.key);
    if (delta > 0) {
      if (type.countsTowardSlot) {
        if (_usedSlots >= _maxSlots) return;
      } else {
        // Em bé đi kèm ⇒ không được nhiều hơn số người lớn đi kèm.
        if (current >= _usedSlots) return;
      }
    }
    final next = (current + delta).clamp(0, 1 << 20);
    if (next == current) return;

    setState(() {
      _counts[type.key] = next;
      final list = _passengers.putIfAbsent(type.key, () => []);
      // Giữ nguyên dữ liệu của các hành khách còn lại khi tăng/giảm.
      while (list.length > next) {
        final removed = list.removeLast();
        _discardPassenger(removed);
      }
      while (list.length < next) {
        final draft = PassengerDraft(
          fullName: '',
          birthDate: '',
          gender: '',
          email: '',
        );
        list.add(draft);
        // Hành khách mới ⇒ mở sẵn accordion để khách điền thông tin ngay.
        _justAdded.add(draft.id);
      }
      // Hành khách đầu tiên (người đặt) luôn có email tài khoản.
      if (list.isNotEmpty && list.first.email.trim().isEmpty) {
        list.first.email = widget.accountEmail;
      }
    });
  }

  /// Suy ra loại khách từ tuổi tại NGÀY TRẢI NGHIỆM.
  String? _inferGuestType(String birthDate) {
    if (birthDate.isEmpty) return null;
    final birth = DateTime.tryParse(birthDate);
    final on = DateTime.tryParse(widget.experienceDate);
    if (birth == null || on == null) return null;
    var age = on.year - birth.year;
    if (on.month < birth.month ||
        (on.month == birth.month && on.day < birth.day)) {
      age -= 1;
    }
    if (age < 0) return null;
    if (age >= 12) return 'ADULT';
    if (age >= 5) return 'CHILD';
    if (age >= 2) return 'TODDLER';
    return 'INFANT';
  }

  void _confirm() {
    // Gom hành khách theo thứ tự nhóm loại khách; gắn `guestType` của nhóm tương ứng.
    final all = <BookingPassengerInput>[];
    for (final type in _types) {
      for (final p in _passengers[type.key] ?? const <PassengerDraft>[]) {
        all.add(BookingPassengerInput(
          fullName: p.fullName.trim(),
          birthDate: p.birthDate,
          gender: p.gender,
          email: p.email.trim().isEmpty ? null : p.email.trim(),
          guestType: type.key,
        ));
      }
    }
    Navigator.of(context).pop(
      BookingGroupDraft(passengers: all, total: _total),
    );
  }

  @override
  void dispose() {
    for (final c in _controllers.values) {
      c.dispose();
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    // ── Né bàn phím ──────────────────────────────────────────────────────────
    // `showModalBottomSheet` KHÔNG tự né bàn phím: bàn phím che mất phần dưới
    // của sheet ⇒ người dùng không thấy ô đang nhập. Ta tự cấp phần chừa cho
    // bàn phím (`viewInsets.bottom`) và co lại chiều cao khung cuộn cho vừa.
    final media = MediaQuery.of(context);
    final keyboard = media.viewInsets.bottom;
    final maxHeight =
        (media.size.height * 0.9 - keyboard).clamp(0.0, media.size.height);
    // Khi bàn phím mở thì phần inset hệ thống ở đáy đã bị bàn phím che ⇒ không
    // cần chừa thêm (tránh thừa khoảng trống).
    final bottomInset = keyboard > 0 ? keyboard : media.padding.bottom;

    return AnimatedPadding(
      duration: const Duration(milliseconds: 160),
      curve: Curves.easeOut,
      padding: EdgeInsets.only(bottom: bottomInset),
      child: SafeArea(
        top: true,
        bottom: false,
        child: ConstrainedBox(
          constraints: BoxConstraints(maxHeight: maxHeight),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 0, 20, 4),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Đặt tour',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w800,
                      color: AppCultureColors.textDark,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    widget.detail.title,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                        fontSize: 13, color: AppCultureColors.textMuted),
                  ),
                ],
              ),
            ),
              Flexible(
                child: SingleChildScrollView(
                  // Khi bàn phím mở, chừa thêm khoảng trống ở đáy để ô đang nhập
                  // (nhất là ô cuối) cuộn lên được phía trên bàn phím.
                  padding: EdgeInsets.fromLTRB(20, 12, 20, keyboard > 0 ? 24 : 8),
                  child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // ── Số chỗ còn ──
                    Row(
                      children: [
                        const Expanded(
                          child: Text('Số chỗ còn',
                              style: TextStyle(
                                  fontSize: 14,
                                  fontWeight: FontWeight.w700,
                                  color: AppCultureColors.textDark)),
                        ),
                        Text(
                          widget.remainingSlots == null
                              ? 'Chưa chọn ngày'
                              : 'Còn ${widget.remainingSlots} chỗ',
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                            color: widget.remainingSlots == null
                                ? AppCultureColors.textMuted
                                : (widget.remainingSlots! > 0
                                    ? AppCultureColors.jadeDark
                                    : AppCultureColors.error),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    // ── Chọn số lượng theo loại khách ──
                    for (final type in _types) _guestRow(type),
                    if (_totalGuests > 0) ...[
                      const SizedBox(height: 8),
                      Text(
                        'Đã chọn $_usedSlots chỗ'
                        '${_totalGuests > _usedSlots ? ' · ${_totalGuests - _usedSlots} người không tính slot' : ''}',
                        style: const TextStyle(
                            fontSize: 11.5, color: AppCultureColors.textMuted),
                      ),
                    ],
                    const SizedBox(height: 14),
                    // ── Thông tin từng hành khách (accordion thu gọn / mở ra) ──
                    for (final type in _types) ...[
                      for (var i = 0;
                          i < (_passengers[type.key]?.length ?? 0);
                          i++)
                        _passengerAccordion(type, i),
                    ],
                  ],
                ),
              ),
            ),
            Container(
              padding: const EdgeInsets.fromLTRB(20, 12, 20, 12),
              decoration: const BoxDecoration(
                border: Border(top: BorderSide(color: AppCultureColors.border)),
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text('Tổng · $_totalGuests khách',
                                style: const TextStyle(
                                    fontSize: 12,
                                    color: AppCultureColors.textMuted)),
                            Text(
                              _total <= 0
                                  ? 'Miễn phí'
                                  : '${formatThousands(_total)} đ',
                              style: const TextStyle(
                                  fontSize: 19,
                                  fontWeight: FontWeight.w800,
                                  color: AppCultureColors.jadeDark),
                            ),
                          ],
                        ),
                      ),
                      FilledButton(
                        onPressed: _canConfirm ? _confirm : null,
                        style: FilledButton.styleFrom(
                          backgroundColor: AppCultureColors.heritageJade,
                          minimumSize: const Size(150, 50),
                          shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(16)),
                        ),
                        child: const Text('Xác nhận đặt',
                            style: TextStyle(fontWeight: FontWeight.w700)),
                      ),
                    ],
                  ),
                  if (_hasMissingPassenger) ...[
                    const SizedBox(height: 6),
                    const Text(
                      'Mở từng mục "Hành khách" và điền đủ thông tin để tiếp tục.',
                      style: TextStyle(
                          fontSize: 11.5, color: AppCultureColors.amberDark),
                    ),
                  ],
                ],
              ),
            ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _guestRow(GuestTypeOption type) {
    final count = _countOf(type.key);
    final canAdd = type.countsTowardSlot
        ? _usedSlots < _maxSlots
        : count < _usedSlots;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  type.label,
                  style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w700,
                      color: AppCultureColors.textDark),
                ),
                Text(
                  [
                    if (type.ageRange.isNotEmpty) type.ageRange,
                    type.formattedPrice,
                    if (!type.countsTowardSlot) 'không tính chỗ',
                  ].join(' · '),
                  style: const TextStyle(
                      fontSize: 12, color: AppCultureColors.textMuted),
                ),
              ],
            ),
          ),
          IconButton.outlined(
            onPressed:
                count > 0 ? () => _changeCount(type, -1) : null,
            icon: const Icon(Icons.remove_rounded, size: 18),
            visualDensity: VisualDensity.compact,
          ),
          SizedBox(
            width: 32,
            child: Text(
              '$count',
              textAlign: TextAlign.center,
              style: const TextStyle(
                  fontSize: 16, fontWeight: FontWeight.w800),
            ),
          ),
          IconButton.outlined(
            onPressed: canAdd ? () => _changeCount(type, 1) : null,
            icon: const Icon(Icons.add_rounded, size: 18),
            visualDensity: VisualDensity.compact,
          ),
        ],
      ),
    );
  }

  /// Một hành khách trong sheet, dạng accordion (thu gọn / mở ra) — giống mục
  /// "Thông tin cần lưu ý" / "Giá bao gồm" ở màn chi tiết tour.
  ///
  /// • Tiêu đề: "Hành khách 1", "Hành khách 2"... (bấm để mở/đóng form nhập).
  /// • Mới thêm hành khách ⇒ mở sẵn để khách điền ngay.
  /// • Hành khách đã điền đủ ⇒ hiện dấu tick xanh.
  Widget _passengerAccordion(GuestTypeOption type, int index) {
    final passenger = _passengers[type.key]![index];
    final isAdult = type.key == 'ADULT';
    final isOwner = index == 0 && isAdult;
    final complete = _isPassengerComplete(passenger, isAdult);
    final justAdded = _justAdded.contains(passenger.id);
    final number = _passengerIndex(type, index) + 1;

    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Theme(
        data: Theme.of(context).copyWith(dividerColor: Colors.transparent),
        child: ExpansionTile(
          // Khoá theo id ⇒ thêm/bớt hành khách không làm lẫn trạng thái mở/đóng.
          key: ValueKey<String>(passenger.id),
          // Giữ form trong bộ nhớ khi đóng ⇒ không mất dữ liệu đã nhập.
          maintainState: true,
          // Mới thêm ⇒ mở sẵn; các hành khách khác giữ trạng thái đóng/mở.
          initiallyExpanded: justAdded,
          onExpansionChanged: (expanded) {
            if (expanded) _justAdded.remove(passenger.id);
          },
          tilePadding: const EdgeInsets.symmetric(horizontal: 12),
          childrenPadding: const EdgeInsets.fromLTRB(12, 0, 12, 12),
          expandedCrossAxisAlignment: CrossAxisAlignment.start,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(14),
            side: const BorderSide(color: AppCultureColors.border),
          ),
          collapsedShape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(14),
            side: const BorderSide(color: AppCultureColors.border),
          ),
          backgroundColor: Colors.white,
          collapsedBackgroundColor: Colors.white,
          leading: Container(
            width: 34,
            height: 34,
            decoration: BoxDecoration(
              color: complete ? AppCultureColors.jadeLight : AppCultureColors.surfaceSubtle,
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(
              complete ? Icons.check_circle_rounded : Icons.person_rounded,
              size: 18,
              color: complete ? AppCultureColors.heritageJade : AppCultureColors.textMuted,
            ),
          ),
          title: Row(
            children: [
              Flexible(
                child: Text(
                  'Hành khách $number',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w800,
                    color: AppCultureColors.textDark,
                  ),
                ),
              ),
              if (isOwner) ...[
                const SizedBox(width: 8),
                const _Tag(text: 'Người đặt tour'),
              ],
            ],
          ),
          subtitle: Text(
            complete
                ? 'Đã điền đủ thông tin'
                : 'Bấm để nhập họ tên, ngày sinh, giới tính, email',
            style: TextStyle(
              fontSize: 11.5,
              color: complete ? AppCultureColors.jadeDark : AppCultureColors.textMuted,
            ),
          ),
          children: [_passengerFields(type, index)],
        ),
      ),
    );
  }

  /// Form nhập thông tin của một hành khách (nằm trong accordion).
  Widget _passengerFields(GuestTypeOption type, int index) {
    final passenger = _passengers[type.key]![index];
    final isAdult = type.key == 'ADULT';
    final inferred = _inferGuestType(passenger.birthDate);
    final mismatch = inferred != null && inferred != type.key;

    return Container(
      padding: const EdgeInsets.fromLTRB(14, 12, 14, 14),
      decoration: BoxDecoration(
        color: AppCultureColors.surfaceSubtle.withValues(alpha: 0.45),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppCultureColors.borderLight),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // ── Tiêu đề nhóm ──
          Row(
            children: [
              Container(
                width: 30,
                height: 30,
                decoration: BoxDecoration(
                  color: AppCultureColors.oceanLight,
                  borderRadius: BorderRadius.circular(9),
                ),
                child: const Icon(
                  Icons.badge_outlined,
                  size: 17,
                  color: AppCultureColors.oceanDark,
                ),
              ),
              const SizedBox(width: 10),
              const Expanded(
                child: Text(
                  'Thông tin hành khách',
                  style: TextStyle(
                    fontSize: 13.5,
                    fontWeight: FontWeight.w800,
                    color: AppCultureColors.textDark,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _controller(passenger, 'fullName'),
            textCapitalization: TextCapitalization.words,
            textInputAction: TextInputAction.next,
            // Đẩy con trỏ lên đủ cao để ô đang nhập không bị bàn phím che.
            scrollPadding: const EdgeInsets.only(bottom: 120, left: 20, right: 20),
            style: const TextStyle(fontSize: 14, color: AppCultureColors.textDark),
            decoration: _inputDecoration(
              label: 'Họ và tên *',
              icon: Icons.person_outline_rounded,
            ),
          ),
          const SizedBox(height: 12),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                flex: 6,
                child: TextField(
                  controller: _controller(passenger, 'birthDate'),
                  keyboardType: TextInputType.number,
                  textInputAction: TextInputAction.next,
                  inputFormatters: [
                    FilteringTextInputFormatter.digitsOnly,
                    _DateMaskFormatter(),
                  ],
                  scrollPadding: const EdgeInsets.only(bottom: 120, left: 20, right: 20),
                  style: const TextStyle(fontSize: 14, color: AppCultureColors.textDark),
                  decoration: _inputDecoration(
                    label: 'Ngày sinh *',
                    icon: Icons.cake_outlined,
                    hint: 'dd/mm/yyyy',
                  ),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                flex: 5,
                child: DropdownButtonFormField<String>(
                  initialValue: passenger.gender.isEmpty ? null : passenger.gender,
                  isExpanded: true,
                  style: const TextStyle(fontSize: 14, color: AppCultureColors.textDark),
                  decoration: _inputDecoration(
                    label: 'Giới tính *',
                    icon: Icons.wc_outlined,
                  ),
                  icon: const Icon(Icons.expand_more_rounded, size: 20),
                  borderRadius: BorderRadius.circular(12),
                  items: const [
                    DropdownMenuItem(value: 'MALE', child: Text('Nam')),
                    DropdownMenuItem(value: 'FEMALE', child: Text('Nữ')),
                    DropdownMenuItem(value: 'OTHER', child: Text('Khác')),
                  ],
                  onChanged: (v) => setState(() => passenger.gender = v ?? ''),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _controller(passenger, 'email'),
            keyboardType: TextInputType.emailAddress,
            textInputAction: TextInputAction.done,
            scrollPadding: const EdgeInsets.only(bottom: 120, left: 20, right: 20),
            style: const TextStyle(fontSize: 14, color: AppCultureColors.textDark),
            decoration: _inputDecoration(
              label: isAdult ? 'Email *' : 'Email (không bắt buộc)',
              icon: Icons.alternate_email_rounded,
            ),
          ),
          if (isAdult)
            const Padding(
              padding: EdgeInsets.only(top: 6, left: 2),
              child: Text(
                'Người lớn cần email để nhận vé, liên kết tài khoản và nhận lời mời tham gia tour.',
                style: TextStyle(fontSize: 11, color: AppCultureColors.textMuted, height: 1.35),
              ),
            ),
          if (mismatch)
            Padding(
              padding: const EdgeInsets.only(top: 8, left: 2),
              child: Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                decoration: BoxDecoration(
                  color: AppCultureColors.warning.withValues(alpha: 0.10),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: AppCultureColors.warning.withValues(alpha: 0.35)),
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Icon(Icons.info_outline_rounded,
                        size: 15, color: AppCultureColors.amberDark),
                    const SizedBox(width: 7),
                    Expanded(
                      child: Text(
                        'Tuổi tại ngày trải nghiệm thuộc loại "${_labelOf(inferred)}" — hãy kiểm tra lại nhóm khách.',
                        style: const TextStyle(
                            fontSize: 11, color: AppCultureColors.amberDark, height: 1.35),
                      ),
                    ),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }

  /// InputDecoration dùng chung cho form hành khách — bo góc, nền trắng, có icon.
  InputDecoration _inputDecoration({
    required String label,
    required IconData icon,
    String? hint,
  }) {
    final border = OutlineInputBorder(
      borderRadius: BorderRadius.circular(12),
      borderSide: const BorderSide(color: AppCultureColors.border),
    );
    return InputDecoration(
      labelText: label,
      hintText: hint,
      isDense: true,
      filled: true,
      fillColor: AppCultureColors.surface,
      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
      prefixIcon: Icon(icon, size: 18, color: AppCultureColors.textMuted),
      prefixIconConstraints: const BoxConstraints(minWidth: 40, minHeight: 40),
      floatingLabelBehavior: FloatingLabelBehavior.auto,
      labelStyle: const TextStyle(fontSize: 13.5, color: AppCultureColors.textMuted),
      floatingLabelStyle: const TextStyle(
          fontSize: 13, fontWeight: FontWeight.w700, color: AppCultureColors.oceanDark),
      hintStyle: const TextStyle(fontSize: 13.5, color: AppCultureColors.textLight),
      border: border,
      enabledBorder: border,
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: AppCultureColors.oceanBlue, width: 1.4),
      ),
    );
  }

  /// Thứ tự hiển thị của hành khách trong nhóm (theo thứ tự nhóm loại khách).
  int _passengerIndex(GuestTypeOption type, int index) {
    var offset = 0;
    for (final t in _types) {
      if (t.key == type.key) return offset + index;
      offset += _countOf(t.key);
    }
    return index;
  }

  String _labelOf(String? key) {
    if (key == null) return '';
    return _types.where((t) => t.key == key).firstOrNull?.label ?? key;
  }

  // ── Controller cache (tránh tạo TextEditingController mới mỗi lần build) ──
  final Map<String, TextEditingController> _controllers = {};

  TextEditingController _controller(PassengerDraft p, String field) {
    final key = '${p.id}:$field';
    final existing = _controllers[key];
    if (existing != null) return existing;
    final controller = TextEditingController(
      text: switch (field) {
        'fullName' => p.fullName,
        // Ô nhập hiển thị dd/MM/yyyy còn model lưu ISO yyyy-MM-dd.
        'birthDate' => formatBirthDateForInput(p.birthDate),
        'email' => p.email,
        _ => '',
      },
    );
    controller.addListener(() {
      switch (field) {
        case 'fullName':
          p.fullName = controller.text;
        case 'birthDate':
          // Chuyển dd/MM/yyyy → ISO; gán '' nếu chưa nhập đủ hoặc ngày không hợp lệ.
          p.birthDate = parseBirthDateInput(controller.text);
        case 'email':
          p.email = controller.text;
      }
      // Cập nhật dấu tick "đã điền đủ" trên tiêu đề accordion.
      if (mounted) setState(() {});
    });
    _controllers[key] = controller;
    return controller;
  }
}

/// Chuyển ngày ISO (`yyyy-MM-dd`) sang định dạng hiển thị `dd/MM/yyyy`.
///
/// Trả về chuỗi rỗng nếu dữ liệu không hợp lệ.
String formatBirthDateForInput(String iso) {
  if (iso.isEmpty) return '';
  final parts = iso.split('-');
  if (parts.length != 3) return '';
  final y = int.tryParse(parts[0]);
  final m = int.tryParse(parts[1]);
  final d = int.tryParse(parts[2]);
  if (y == null || m == null || d == null) return '';
  return '${d.toString().padLeft(2, '0')}/${m.toString().padLeft(2, '0')}/$y';
}

/// Chuyển chuỗi nhập `dd/MM/yyyy` sang ISO `yyyy-MM-dd`.
///
/// Trả về chuỗi rỗng nếu chưa nhập đủ 8 chữ số hoặc ngày không tồn tại
/// (ví dụ 31/02/2024, 13/01/2020).
String parseBirthDateInput(String input) {
  final cleaned = input.trim();
  if (cleaned.isEmpty) return '';
  final match = RegExp(r'^(\d{1,2})/(\d{1,2})/(\d{4})$').firstMatch(cleaned);
  if (match == null) return '';
  final d = int.parse(match.group(1)!);
  final m = int.parse(match.group(2)!);
  final y = int.parse(match.group(3)!);
  if (m < 1 || m > 12 || d < 1 || d > 31) return '';
  final parsed = DateTime(y, m, d);
  // Bắt lỗi ngày không tồn tại (vd 31/02) — DateTime tự lùi sang tháng trước.
  if (parsed.year != y || parsed.month != m || parsed.day != d) return '';
  final now = DateTime.now();
  if (parsed.isAfter(now)) return '';
  return '$y-${m.toString().padLeft(2, '0')}-${d.toString().padLeft(2, '0')}';
}

/// Bộ định dạng ô nhập ngày sinh — tự chèn dấu `/` theo mẫu `dd/MM/yyyy`.
///
/// ⚠️ Không mở lịch (date picker): người dùng gõ trực tiếp theo mẫu.
class _DateMaskFormatter extends TextInputFormatter {
  @override
  TextEditingValue formatEditUpdate(
    TextEditingValue oldValue,
    TextEditingValue newValue,
  ) {
    final digits = newValue.text.replaceAll(RegExp(r'\D'), '');
    final limited = digits.length > 8 ? digits.substring(0, 8) : digits;

    final buffer = StringBuffer();
    for (var i = 0; i < limited.length; i++) {
      if (i == 2 || i == 4) buffer.write('/');
      buffer.write(limited[i]);
    }
    final text = buffer.toString();

    return TextEditingValue(
      text: text,
      selection: TextSelection.collapsed(offset: text.length),
    );
  }
}

/// Nhãn nhỏ kiểu "chip".
class _Tag extends StatelessWidget {
  final String text;
  const _Tag({required this.text});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(
        color: AppCultureColors.jadeLight,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(
        text,
        style: const TextStyle(
          fontSize: 10.5,
          fontWeight: FontWeight.w700,
          color: AppCultureColors.jadeDark,
        ),
      ),
    );
  }
}
