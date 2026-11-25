import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';
import '../../core/models/gamification_model.dart' show formatThousands;
import '../../core/models/tour_request_model.dart';
import '../../core/services/tour_request_service.dart';
import 'create_tour_request_screen.dart';
import 'tour_detail_opener.dart';

class TourRequestsScreen extends StatefulWidget {
  const TourRequestsScreen({super.key});

  @override
  State<TourRequestsScreen> createState() => _TourRequestsScreenState();
}

class _TourRequestsScreenState extends State<TourRequestsScreen> {
  final TourRequestService _service = TourRequestService();
  bool _loading = true;
  List<TourRequestModel> _requests = [];
  String? _error;

  @override
  void initState() {
    super.initState();
    _fetchRequests();
  }

  Future<void> _fetchRequests() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final list = await _service.getMyRequests();
      if (!mounted) return;
      setState(() {
        _requests = list;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.toString().replaceFirst('Exception: ', '');
        _loading = false;
      });
    }
  }

  Future<void> _cancelRequest(TourRequestModel item) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Hủy yêu cầu tour'),
        content: Text('Bạn có chắc chắn muốn hủy yêu cầu "${item.title}" không?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: const Text('Không'),
          ),
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(true),
            style: TextButton.styleFrom(foregroundColor: AppCultureColors.lacquer),
            child: const Text('Hủy yêu cầu'),
          ),
        ],
      ),
    );

    if (confirm != true) return;

    final ok = await _service.cancelRequest(item.id);
    if (!mounted) return;
    if (ok) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Đã hủy yêu cầu tour thành công.'),
          backgroundColor: AppCultureColors.heritageJade,
        ),
      );
      _fetchRequests();
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Không thể hủy yêu cầu tour.'),
          backgroundColor: AppCultureColors.lacquer,
        ),
      );
    }
  }

  void _openCreate() async {
    final created = await Navigator.of(context).push<bool>(
      MaterialPageRoute(builder: (_) => const CreateTourRequestScreen()),
    );
    if (created == true) {
      _fetchRequests();
    }
  }

  String _formatDate(DateTime dt) {
    return '${dt.day.toString().padLeft(2, '0')}/${dt.month.toString().padLeft(2, '0')}/${dt.year}';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppCultureColors.background,
      appBar: AppBar(
        title: const Text('Tour theo nhu cầu của tôi'),
        elevation: 0,
        backgroundColor: Colors.white,
        foregroundColor: AppCultureColors.textDark,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            onPressed: _fetchRequests,
            tooltip: 'Làm mới',
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _openCreate,
        backgroundColor: AppCultureColors.heritageJade,
        foregroundColor: Colors.white,
        icon: const Icon(Icons.add_rounded),
        label: const Text('Yêu cầu mới', style: TextStyle(fontWeight: FontWeight.bold)),
      ),
      body: _buildBody(),
    );
  }

  Widget _buildBody() {
    if (_loading) {
      return const Center(
        child: CircularProgressIndicator(color: AppCultureColors.heritageJade),
      );
    }

    if (_error != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.error_outline_rounded, size: 48, color: AppCultureColors.lacquer),
              const SizedBox(height: 12),
              Text(
                _error!,
                textAlign: TextAlign.center,
                style: const TextStyle(fontSize: 14, color: AppCultureColors.textMuted),
              ),
              const SizedBox(height: 16),
              ElevatedButton.icon(
                onPressed: _fetchRequests,
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppCultureColors.heritageJade,
                  foregroundColor: Colors.white,
                ),
                icon: const Icon(Icons.refresh_rounded, size: 16),
                label: const Text('Thử lại'),
              ),
            ],
          ),
        ),
      );
    }

    if (_requests.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 72,
                height: 72,
                decoration: const BoxDecoration(
                  color: AppCultureColors.jadeLight,
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.auto_awesome_rounded, size: 36, color: AppCultureColors.heritageJade),
              ),
              const SizedBox(height: 16),
              const Text(
                'Chưa có yêu cầu tour nào',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppCultureColors.textDark),
              ),
              const SizedBox(height: 8),
              const Text(
                'Bạn có thể gửi yêu cầu tạo tour với điểm đến, thời gian và ngân sách mong muốn. Các nhà tour đối tác sẽ thiết kế riêng cho bạn!',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 13, color: AppCultureColors.textMuted, height: 1.4),
              ),
              const SizedBox(height: 20),
              ElevatedButton.icon(
                onPressed: _openCreate,
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppCultureColors.heritageJade,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                ),
                icon: const Icon(Icons.add_rounded),
                label: const Text('Tạo yêu cầu đầu tiên', style: TextStyle(fontWeight: FontWeight.bold)),
              ),
            ],
          ),
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _fetchRequests,
      color: AppCultureColors.heritageJade,
      child: ListView.separated(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 80),
        itemCount: _requests.length,
        separatorBuilder: (_, _) => const SizedBox(height: 12),
        itemBuilder: (ctx, i) => _buildRequestCard(_requests[i]),
      ),
    );
  }

  Widget _buildRequestCard(TourRequestModel item) {
    Color statusBg;
    Color statusFg;
    IconData statusIcon;

    switch (item.status) {
      case 'OPEN':
        statusBg = AppCultureColors.coralLight;
        statusFg = AppCultureColors.coralDark;
        statusIcon = Icons.access_time_rounded;
        break;
      case 'ACCEPTED':
        statusBg = AppCultureColors.skyLight;
        statusFg = AppCultureColors.skyDark;
        statusIcon = Icons.design_services_rounded;
        break;
      case 'FULFILLED':
        statusBg = AppCultureColors.jadeLight;
        statusFg = AppCultureColors.jadeDark;
        statusIcon = Icons.check_circle_rounded;
        break;
      default:
        statusBg = AppCultureColors.surfaceSubtle;
        statusFg = AppCultureColors.textMuted;
        statusIcon = Icons.info_outline_rounded;
    }

    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppCultureColors.border),
      ),
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Text(
                  item.title,
                  style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.bold,
                    color: AppCultureColors.textDark,
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: statusBg,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(statusIcon, size: 12, color: statusFg),
                    const SizedBox(width: 4),
                    Text(
                      item.statusLabel,
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.bold,
                        color: statusFg,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            item.description,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(fontSize: 12.5, color: AppCultureColors.textMuted, height: 1.35),
          ),
          const SizedBox(height: 12),
          Wrap(
            spacing: 12,
            runSpacing: 6,
            children: [
              if (item.preferredDestination != null)
                _iconText(Icons.place_rounded, item.preferredDestination!),
              if (item.guestCount != null)
                _iconText(Icons.people_alt_rounded, '${item.guestCount} khách'),
              if (item.preferredDateFrom != null || item.preferredDateTo != null)
                _iconText(
                  Icons.calendar_today_rounded,
                  '${item.preferredDateFrom != null ? _formatDate(item.preferredDateFrom!) : "Tùy ý"} - ${item.preferredDateTo != null ? _formatDate(item.preferredDateTo!) : "Tùy ý"}',
                ),
              if (item.budgetMin != null || item.budgetMax != null)
                _iconText(
                  Icons.payments_rounded,
                  item.budgetMin != null && item.budgetMax != null
                      ? '${formatThousands(item.budgetMin!)} - ${formatThousands(item.budgetMax!)} đ'
                      : item.budgetMin != null
                          ? 'Từ ${formatThousands(item.budgetMin!)} đ'
                          : 'Đến ${formatThousands(item.budgetMax!)} đ',
                ),
            ],
          ),
          const Divider(height: 20, color: AppCultureColors.borderLight),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Đăng ngày ${_formatDate(item.createdAt)}',
                style: const TextStyle(fontSize: 11, color: AppCultureColors.textLight),
              ),
              Row(
                children: [
                  if (item.isOpen)
                    TextButton.icon(
                      onPressed: () => _cancelRequest(item),
                      style: TextButton.styleFrom(
                        foregroundColor: AppCultureColors.lacquer,
                        visualDensity: VisualDensity.compact,
                      ),
                      icon: const Icon(Icons.delete_outline_rounded, size: 14),
                      label: const Text('Hủy', style: TextStyle(fontSize: 12)),
                    ),
                  if (item.isFulfilled && item.fulfilledTourId != null)
                    ElevatedButton.icon(
                      onPressed: () {
                        openTourDetailScreen(context, tourId: item.fulfilledTourId!);
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppCultureColors.heritageJade,
                        foregroundColor: Colors.white,
                        visualDensity: VisualDensity.compact,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                      ),
                      icon: const Icon(Icons.auto_awesome_rounded, size: 13),
                      label: const Text('Đặt Tour Riêng', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                    ),
                ],
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _iconText(IconData icon, String text) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 13, color: AppCultureColors.textLight),
        const SizedBox(width: 4),
        Text(
          text,
          style: const TextStyle(fontSize: 11.5, color: AppCultureColors.textDark, fontWeight: FontWeight.w500),
        ),
      ],
    );
  }
}
