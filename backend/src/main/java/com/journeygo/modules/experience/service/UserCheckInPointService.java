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


    @Transactional
    public UserCheckInResponse checkIn(Long checkInPointId, CheckInRequest body, Long userId) {
        CheckInPoint cip = checkInPointRepository.findById(checkInPointId)
                .orElseThrow(() -> new ResourceNotFoundException("CheckInPoint", checkInPointId));

        Experience exp = cip.getExperience();
        if (exp == null || exp.getStatus() != ExperienceStatus.PUBLISHED) {
            throw new BusinessException("BR-UCIP-EXP",
                    "Chỉ check-in tại Experience đã PUBLISHED");
        }

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

                isValid = true;
            }
            case BEACON -> {

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

        UserCheckInPoint saved = userCheckInPointRepository.saveAndFlush(ucp);
        log.info("User {} check-in CheckInPoint {} isValid={}", userId, checkInPointId, isValid);
        return UserCheckInResponse.fromEntity(saved);
    }
}
