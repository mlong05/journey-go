import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';
import '../../core/models/journey_model.dart';
import '../../core/services/user_data_service.dart';

class MissionModal extends StatefulWidget {
  final ActiveMission mission;
  final VoidCallback? onMissionCompleted;

  const MissionModal({
    super.key,
    required this.mission,
    this.onMissionCompleted,
  });

  @override
  State<MissionModal> createState() => _MissionModalState();
}

class _MissionModalState extends State<MissionModal> {
  final UserDataService _userDataService = UserDataService();
  int? _selectedOption;
  bool _hasSubmitted = false;
  bool _isCorrect = false;

  void _handleSubmit() async {
    if (_selectedOption == null) return;

    final correct = _selectedOption == widget.mission.correctIndex;
    setState(() {
      _hasSubmitted = true;
      _isCorrect = correct;
    });

    if (correct) {
      await _userDataService.addPoints(widget.mission.rewardPoints);
      await _userDataService.completeMission(widget.mission.id);
      await _userDataService.unlockBadge('badge_giai_do');
      widget.onMissionCompleted?.call();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
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
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: AppCultureColors.rewardBg,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Icon(
                      Icons.quiz_rounded,
                      color: AppCultureColors.amberDark,
                      size: 22,
                    ),
                  ),
                  const SizedBox(width: 10),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        widget.mission.title,
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w800,
                          color: AppCultureColors.textDark,
                        ),
                      ),
                      Text(
                        widget.mission.siteName,
                        style: const TextStyle(
                          fontSize: 12,
                          color: AppCultureColors.textMuted,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                decoration: BoxDecoration(
                  color: AppCultureColors.rewardBg,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: AppCultureColors.rewardBorder),
                ),
                child: Text(
                  '+${widget.mission.rewardPoints} pts',
                  style: const TextStyle(
                    fontWeight: FontWeight.w800,
                    color: AppCultureColors.rewardText,
                    fontSize: 12,
                  ),
                ),
              ),
            ],
          ),

          const SizedBox(height: 18),

          // Question box
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppCultureColors.surfaceSubtle,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: AppCultureColors.border),
            ),
            child: Text(
              widget.mission.question,
              style: const TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.w700,
                color: AppCultureColors.textDark,
                height: 1.4,
              ),
            ),
          ),

          const SizedBox(height: 16),

          // Options
          ...List.generate(widget.mission.options.length, (idx) {
            final optionText = widget.mission.options[idx];
            final isSelected = _selectedOption == idx;

            Color borderColor = AppCultureColors.border;
            Color bgColor = Colors.white;
            Color textColor = AppCultureColors.textDark;

            if (_hasSubmitted) {
              if (idx == widget.mission.correctIndex) {
                borderColor = AppCultureColors.heritageJade;
                bgColor = AppCultureColors.jadeLight;
                textColor = AppCultureColors.jadeDark;
              } else if (isSelected && !(_isCorrect)) {
                borderColor = AppCultureColors.error;
                bgColor = const Color(0xFFFEE2E2);
                textColor = AppCultureColors.error;
              }
            } else if (isSelected) {
              borderColor = AppCultureColors.heritageJade;
              bgColor = AppCultureColors.jadeLight.withValues(alpha: 0.5);
              textColor = AppCultureColors.jadeDark;
            }

            return Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: InkWell(
                onTap: _hasSubmitted
                    ? null
                    : () {
                        setState(() => _selectedOption = idx);
                      },
                borderRadius: BorderRadius.circular(14),
                child: Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  decoration: BoxDecoration(
                    color: bgColor,
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: borderColor, width: isSelected ? 1.8 : 1),
                  ),
                  child: Row(
                    children: [
                      Container(
                        width: 22,
                        height: 22,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          border: Border.all(
                            color: isSelected
                                ? AppCultureColors.heritageJade
                                : Colors.grey[400]!,
                            width: 2,
                          ),
                          color: isSelected
                              ? AppCultureColors.heritageJade
                              : Colors.transparent,
                        ),
                        child: isSelected
                            ? const Icon(Icons.check, size: 14, color: Colors.white)
                            : null,
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          optionText,
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                            color: textColor,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            );
          }),

          // Explanation feedback
          if (_hasSubmitted) ...[
            const SizedBox(height: 10),
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: _isCorrect ? AppCultureColors.jadeLight : const Color(0xFFFEE2E2),
                borderRadius: BorderRadius.circular(14),
                border: Border.all(
                  color: _isCorrect ? AppCultureColors.heritageJade : AppCultureColors.error,
                  width: 1,
                ),
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(
                    _isCorrect ? Icons.check_circle_rounded : Icons.info_rounded,
                    color: _isCorrect ? AppCultureColors.heritageJade : AppCultureColors.error,
                    size: 20,
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          _isCorrect ? 'Chính xác! +${widget.mission.rewardPoints} điểm' : 'Chưa chính xác!',
                          style: TextStyle(
                            fontWeight: FontWeight.w800,
                            fontSize: 14,
                            color: _isCorrect ? AppCultureColors.jadeDark : AppCultureColors.error,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          widget.mission.explanation,
                          style: TextStyle(
                            fontSize: 13,
                            color: _isCorrect ? AppCultureColors.jadeDark : const Color(0xFF991B1B),
                            height: 1.35,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ],

          const SizedBox(height: 20),

          // Action Button
          SizedBox(
            width: double.infinity,
            height: 50,
            child: ElevatedButton(
              onPressed: _hasSubmitted
                  ? () => Navigator.of(context).pop()
                  : (_selectedOption != null ? _handleSubmit : null),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppCultureColors.heritageJade,
                foregroundColor: Colors.white,
                elevation: 0,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                ),
              ),
              child: Text(
                _hasSubmitted ? 'Đóng & Tiếp tục' : 'Xác nhận câu trả lời',
                style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15),
              ),
            ),
          ),
          const SizedBox(height: 10),
        ],
      ),
    );
  }
}
