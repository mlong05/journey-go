package com.journeygo.modules.experience.service;

import com.journeygo.modules.experience.dto.request.CheckInRequest;
import com.journeygo.modules.experience.dto.response.UserCheckInResponse;
import com.journeygo.modules.experience.entity.CheckInPoint;
import com.journeygo.modules.experience.entity.Experience;
import com.journeygo.modules.experience.entity.Task;
import com.journeygo.modules.experience.entity.UserCheckInPoint;
import com.journeygo.modules.experience.entity.enums.CheckInVerificationMethod;
import com.journeygo.modules.experience.entity.enums.ExperienceStatus;
import com.journeygo.modules.experience.entity.enums.TaskStatus;
import com.journeygo.modules.experience.exception.BusinessException;
import com.journeygo.modules.experience.exception.ResourceNotFoundException;
import com.journeygo.modules.experience.repository.CheckInPointRepository;
import com.journeygo.modules.experience.repository.ExperienceRepository;
import com.journeygo.modules.experience.repository.TaskRepository;
import com.journeygo.modules.experience.repository.UserCheckInPointRepository;
import com.journeygo.modules.experience.util.GeoUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

/**
 * Service xử lý Tourist check-in tại CheckInPoint vi mô.
 *
 * BR-UCIP-1: User chỉ check-in 1 lần / CheckInPoint.
 * BR-UCIP-2: Check-in hợp lệ khi distance <= radius_meters (với GPS) hoặc QR khớp token.
 *
 * Phân biệt với CheckIn vĩ mô (User↔Destination) thuộc module Gamification.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class UserCheckInPointService {

    private final UserCheckInPointRepository userCheckInPointRepository;
    private final CheckInPointRepository checkInPointRepository;
    private final ExperienceRepository experienceRepository;
    private final TaskRepository taskRepository;

    @Transactional(readOnly = true)
    public List<UserCheckInResponse> listByUser(Long userId) {
        return userCheckInPointRepository.findByUserIdOrderByCheckedInAtDesc(userId)
                .stream().map(UserCheckInResponse::fromEntity).toList();
    }

    @Transactional(readOnly = true)
    public List<UserCheckInResponse> listByUserAndExperience(Long userId, Long experienceId) {
        return userCheckInPointRepository.findByUserIdAndExperienceIdOrderByCheckedInAtDesc(userId, experienceId)
                .stream().map(UserCheckInResponse::fromEntity).toList();
    }

    /**
     * Tourist check-in tại CheckInPoint vi mô.
     *
     * Flow:
     *   1. Validate CheckInPoint + Experience ở PUBLISHED.
     *   2. BR-UCIP-1: đã check-in trước đó → trả về record cũ (idempotent).
     *   3. Với GPS: tính distance bằng Haversine (BR-UCIP-2).
     *   4. Với QR: so sánh qrValue với check_in_point.qr_token.
     *   5. Lưu UserCheckInPoint với isValid = kết quả validation.
     */
    @Transactional
    public UserCheckInResponse checkIn(Long checkInPointId, CheckInRequest body, Long userId) {
        CheckInPoint cip = checkInPointRepository.findById(checkInPointId)
                .orElseThrow(() -> new ResourceNotFoundException("CheckInPoint", checkInPointId));

        Experience exp = cip.getExperience();
        if (exp == null || exp.getStatus() != ExperienceStatus.PUBLISHED) {
            throw new BusinessException("BR-UCIP-EXP",
                    "Chỉ check-in tại Experience đã PUBLISHED");
        }

        // BR-UCIP-1: idempotent — user đã check-in trước đó
        var existing = userCheckInPointRepository.findByUserIdAndCheckInPointId(userId, checkInPointId);
        if (existing.isPresent()) {
            log.info("User {} đã check-in CheckInPoint {} trước đó — idempotent", userId, checkInPointId);
            return UserCheckInResponse.fromEntity(existing.get());
        }

        Task task = null;
        if (body.taskId() != null) {
            task = taskRepository.findById(body.taskId())
                    .orElseThrow(() -> new ResourceNotFoundException("Task", body.taskId()));
            if (task.getStatus() != TaskStatus.PUBLISHED) {
                throw new BusinessException("BR-UCIP-TASK",
                        "Task chưa được PUBLISHED");
            }
        }

        BigDecimal distance = null;
        boolean isValid = false;

        switch (body.verificationMethod()) {
            case GPS -> {
                if (body.latitude() == null || body.longitude() == null) {
                    throw new BusinessException("BR-UCIP-GPS",
                            "Verification GPS yêu cầu latitude & longitude");
                }
                distance = GeoUtils.haversineMeters(
                        body.latitude(), body.longitude(),
                        cip.getLatitude(), cip.getLongitude());
                // Dùng compareTo, TUYỆT ĐỐI KHÔNG dùng intValue() vì sẽ truncate
                // (vd 50.99m → intValue=50 → vượt radius=50 mà vẫn pass check-in).
                BigDecimal radius = BigDecimal.valueOf(cip.getRadiusMeters());
                isValid = distance.compareTo(radius) <= 0;
                log.info("CheckIn GPS distance={}m radius={}m isValid={}", distance, cip.getRadiusMeters(), isValid);
            }
            case QR -> {
                if (body.qrValue() == null || body.qrValue().isBlank()) {
                    throw new BusinessException("BR-UCIP-QR",
                            "Verification QR yêu cầu qrValue");
                }
                isValid = cip.getQrToken().equalsIgnoreCase(body.qrValue().trim());
                log.info("CheckIn QR match={}", isValid);
            }
            case MANUAL -> {
                // MANUAL: do CM/CP xác nhận → isValid = true luôn
                isValid = true;
            }
            case BEACON -> {
                // TODO: integrate với beacon hardware — placeholder
                isValid = false;
            }
        }

        UserCheckInPoint ucp = UserCheckInPoint.builder()
                .userId(userId)
                .checkInPoint(cip)
                .experience(exp)
                .task(task)
                .verificationMethod(body.verificationMethod())
                .latitude(body.latitude())
                .longitude(body.longitude())
                .distanceMeters(distance != null ? distance.intValue() : null)
                .qrValue(body.qrValue())
                .isValid(isValid)
                .build();

        // saveAndFlush thay vì save để UNIQUE violation (BR-UCIP-1) nổ ngay lập tức
        // → GlobalExceptionHandler map thành 400. Nếu dùng save(), exception chỉ nổ ở
        // commit time → caller nhận 500 thay vì 400 + mã BR-UCIP-1.
        UserCheckInPoint saved = userCheckInPointRepository.saveAndFlush(ucp);
        log.info("User {} check-in CheckInPoint {} isValid={}", userId, checkInPointId, isValid);
        return UserCheckInResponse.fromEntity(saved);
    }
}