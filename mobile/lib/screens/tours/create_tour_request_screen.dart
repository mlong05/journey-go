import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';
import '../../core/services/tour_request_service.dart';

class CreateTourRequestScreen extends StatefulWidget {
  const CreateTourRequestScreen({super.key});

  @override
  State<CreateTourRequestScreen> createState() => _CreateTourRequestScreenState();
}

class _CreateTourRequestScreenState extends State<CreateTourRequestScreen> {
  final _formKey = GlobalKey<FormState>();
  final _titleController = TextEditingController();
  final _descController = TextEditingController();
  final _destController = TextEditingController();
  final _guestCountController = TextEditingController(text: '2');
  final _budgetMinController = TextEditingController();
  final _budgetMaxController = TextEditingController();
  final _specialReqController = TextEditingController();

  DateTime? _dateFrom;
  DateTime? _dateTo;
  bool _loading = false;
  String? _errorMessage;

  final TourRequestService _service = TourRequestService();

  @override
  void dispose() {
    _titleController.dispose();
    _descController.dispose();
    _destController.dispose();
    _guestCountController.dispose();
    _budgetMinController.dispose();
    _budgetMaxController.dispose();
    _specialReqController.dispose();
    super.dispose();
  }

  Future<void> _pickDate(bool isFrom) async {
    final now = DateTime.now();
    final initial = isFrom
        ? (_dateFrom ?? now.add(const Duration(days: 3)))
        : (_dateTo ?? (_dateFrom ?? now.add(const Duration(days: 5))));
    final first = isFrom ? now : (_dateFrom ?? now);

    final picked = await showDatePicker(
      context: context,
      initialDate: initial.isBefore(first) ? first : initial,
      firstDate: first,
      lastDate: now.add(const Duration(days: 365)),
      builder: (ctx, child) => Theme(
        data: Theme.of(ctx).copyWith(
          colorScheme: const ColorScheme.light(
            primary: AppCultureColors.heritageJade,
            onPrimary: Colors.white,
            onSurface: AppCultureColors.textDark,
          ),
        ),
        child: child!,
      ),
    );

    if (picked != null) {
      setState(() {
        if (isFrom) {
          _dateFrom = picked;
          if (_dateTo != null && _dateTo!.isBefore(picked)) {
            _dateTo = picked;
          }
        } else {
          _dateTo = picked;
        }
      });
    }
  }

  String _formatDate(DateTime? dt) {
    if (dt == null) return 'Chọn ngày';
    return '${dt.day.toString().padLeft(2, '0')}/${dt.month.toString().padLeft(2, '0')}/${dt.year}';
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;

    final minBudget = double.tryParse(_budgetMinController.text.replaceAll(RegExp(r'[^0-9]'), ''));
    final maxBudget = double.tryParse(_budgetMaxController.text.replaceAll(RegExp(r'[^0-9]'), ''));

    if (minBudget != null && maxBudget != null && minBudget > maxBudget) {
      setState(() => _errorMessage = 'Ngân sách tối đa phải lớn hơn hoặc bằng ngân sách tối thiểu.');
      return;
    }

    setState(() {
      _loading = true;
      _errorMessage = null;
    });

    try {
      final guestCount = int.tryParse(_guestCountController.text) ?? 2;
      final result = await _service.createRequest(
        title: _titleController.text,
        description: _descController.text,
        preferredDestination: _destController.text.isNotEmpty ? _destController.text : null,
        preferredDateFrom: _dateFrom,
        preferredDateTo: _dateTo,
        guestCount: guestCount,
        budgetMin: minBudget,
        budgetMax: maxBudget,
        specialRequirements: _specialReqController.text.isNotEmpty ? _specialReqController.text : null,
      );

      if (!mounted) return;

      if (result != null) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Đăng yêu cầu tạo tour thành công!'),
            backgroundColor: AppCultureColors.heritageJade,
          ),
        );
        Navigator.of(context).pop(true);
      } else {
        setState(() => _errorMessage = 'Không thể gửi yêu cầu tạo tour. Vui lòng kiểm tra lại.');
      }
    } catch (e) {
      setState(() => _errorMessage = e.toString().replaceFirst('Exception: ', ''));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppCultureColors.background,
      appBar: AppBar(
        title: const Text('Yêu cầu tạo tour riêng'),
        elevation: 0,
        backgroundColor: Colors.white,
        foregroundColor: AppCultureColors.textDark,
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (_errorMessage != null) ...[
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: AppCultureColors.lacquer50,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: AppCultureColors.lacquer500.withValues(alpha: 0.3)),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.error_outline_rounded, color: AppCultureColors.lacquer500, size: 20),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            _errorMessage!,
                            style: const TextStyle(color: AppCultureColors.lacquer500, fontSize: 13),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),
                ],

                // Tiêu đề
                _buildFieldLabel('Tiêu đề mong muốn', required: true),
                TextFormField(
                  controller: _titleController,
                  maxLength: 200,
                  decoration: _inputDecoration(
                    hint: 'VD: Cần thiết kế tour khám phá ẩm thực Đà Lạt 3N2Đ',
                    prefixIcon: Icons.title_rounded,
                  ),
                  validator: (v) {
                    if (v == null || v.trim().isEmpty) return 'Vui lòng nhập tiêu đề yêu cầu';
                    return null;
                  },
                ),
                const SizedBox(height: 14),

                // Điểm đến
                _buildFieldLabel('Địa điểm / Vùng mong muốn'),
                TextFormField(
                  controller: _destController,
                  maxLength: 500,
                  decoration: _inputDecoration(
                    hint: 'VD: Đà Lạt, Lâm Đồng',
                    prefixIcon: Icons.place_rounded,
                  ),
                ),
                const SizedBox(height: 14),

                // Thời gian
                _buildFieldLabel('Thời gian dự kiến'),
                Row(
                  children: [
                    Expanded(
                      child: InkWell(
                        onTap: () => _pickDate(true),
                        borderRadius: BorderRadius.circular(12),
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: AppCultureColors.border),
                          ),
                          child: Row(
                            children: [
                              const Icon(Icons.calendar_today_rounded, size: 16, color: AppCultureColors.heritageJade),
                              const SizedBox(width: 8),
                              Expanded(
                                child: Text(
                                  _formatDate(_dateFrom),
                                  style: TextStyle(
                                    fontSize: 13,
                                    color: _dateFrom == null ? AppCultureColors.textLight : AppCultureColors.textDark,
                                    fontWeight: _dateFrom == null ? FontWeight.normal : FontWeight.w600,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                    const Padding(
                      padding: EdgeInsets.symmetric(horizontal: 8),
                      child: Text('—', style: TextStyle(color: AppCultureColors.textMuted)),
                    ),
                    Expanded(
                      child: InkWell(
                        onTap: () => _pickDate(false),
                        borderRadius: BorderRadius.circular(12),
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: AppCultureColors.border),
                          ),
                          child: Row(
                            children: [
                              const Icon(Icons.calendar_month_rounded, size: 16, color: AppCultureColors.heritageJade),
                              const SizedBox(width: 8),
                              Expanded(
                                child: Text(
                                  _formatDate(_dateTo),
                                  style: TextStyle(
                                    fontSize: 13,
                                    color: _dateTo == null ? AppCultureColors.textLight : AppCultureColors.textDark,
                                    fontWeight: _dateTo == null ? FontWeight.normal : FontWeight.w600,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),

                // Số lượng khách
                _buildFieldLabel('Số lượng khách dự kiến'),
                TextFormField(
                  controller: _guestCountController,
                  keyboardType: TextInputType.number,
                  decoration: _inputDecoration(
                    hint: '2',
                    prefixIcon: Icons.people_alt_rounded,
                  ),
                  validator: (v) {
                    final n = int.tryParse(v ?? '');
                    if (n != null && (n < 1 || n > 500)) return 'Số khách từ 1 đến 500';
                    return null;
                  },
                ),
                const SizedBox(height: 16),

                // Ngân sách
                _buildFieldLabel('Ngân sách dự kiến (VND / người hoặc cả nhóm)'),
                Row(
                  children: [
                    Expanded(
                      child: TextFormField(
                        controller: _budgetMinController,
                        keyboardType: TextInputType.number,
                        decoration: _inputDecoration(
                          hint: 'Tối thiểu',
                          prefixIcon: Icons.payments_outlined,
                        ),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: TextFormField(
                        controller: _budgetMaxController,
                        keyboardType: TextInputType.number,
                        decoration: _inputDecoration(
                          hint: 'Tối đa',
                          prefixIcon: Icons.payments_rounded,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),

                // Mô tả chi tiết
                _buildFieldLabel('Mô tả chi tiết mong muốn', required: true),
                TextFormField(
                  controller: _descController,
                  maxLines: 4,
                  maxLength: 5000,
                  decoration: _inputDecoration(
                    hint: 'Mô tả cụ thể lịch trình bạn mong muốn, các hoạt động ưa thích, phương tiện di chuyển...',
                  ),
                  validator: (v) {
                    if (v == null || v.trim().isEmpty) return 'Vui lòng nhập mô tả chi tiết';
                    return null;
                  },
                ),
                const SizedBox(height: 14),

                // Yêu cầu đặc biệt
                _buildFieldLabel('Yêu cầu đặc biệt (nếu có)'),
                TextFormField(
                  controller: _specialReqController,
                  maxLines: 2,
                  maxLength: 2000,
                  decoration: _inputDecoration(
                    hint: 'VD: Ăn chay, phòng khách sạn có ban công, đón tại sân bay...',
                  ),
                ),
                const SizedBox(height: 24),

                // Nút gửi
                SizedBox(
                  width: double.infinity,
                  height: 48,
                  child: ElevatedButton(
                    onPressed: _loading ? null : _submit,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppCultureColors.heritageJade,
                      foregroundColor: Colors.white,
                      elevation: 0,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                    ),
                    child: _loading
                        ? const SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                          )
                        : const Text(
                            'Gửi yêu cầu tạo tour',
                            style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
                          ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildFieldLabel(String label, {bool required = false}) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: RichText(
        text: TextSpan(
          text: label,
          style: const TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w700,
            color: AppCultureColors.textDark,
          ),
          children: [
            if (required)
              const TextSpan(
                text: ' *',
                style: TextStyle(color: AppCultureColors.lacquer500),
              ),
          ],
        ),
      ),
    );
  }

  InputDecoration _inputDecoration({required String hint, IconData? prefixIcon}) {
    return InputDecoration(
      hintText: hint,
      hintStyle: const TextStyle(fontSize: 13, color: AppCultureColors.textLight),
      filled: true,
      fillColor: Colors.white,
      prefixIcon: prefixIcon != null ? Icon(prefixIcon, size: 18, color: AppCultureColors.textMuted) : null,
      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: AppCultureColors.border),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: AppCultureColors.border),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: AppCultureColors.heritageJade, width: 1.5),
      ),
    );
  }
}
