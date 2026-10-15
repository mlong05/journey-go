package com.journeygo.modules.experience.service;

import com.journeygo.modules.experience.dto.request.CreateCheckInPointRequest;
import com.journeygo.modules.experience.dto.request.UpdateCheckInPointRequest;
import com.journeygo.modules.experience.dto.response.CheckInPointResponse;
import com.journeygo.modules.experience.entity.CheckInPoint;
import com.journeygo.modules.experience.entity.Experience;
import com.journeygo.modules.experience.entity.enums.ExperienceStatus;
import com.journeygo.modules.experience.exception.BusinessException;
import com.journeygo.modules.experience.exception.ResourceNotFoundException;
import com.journeygo.modules.experience.repository.CheckInPointRepository;
import com.journeygo.modules.experience.repository.ExperienceRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class CheckInPointService {

    private final CheckInPointRepository checkInPointRepository;
    private final ExperienceRepository experienceRepository;

    @Transactional(readOnly = true)
    public CheckInPointResponse getById(Long id) {
        return CheckInPointResponse.fromEntity(findOrThrow(id));
    }

    @Transactional(readOnly = true)
    public List<CheckInPointResponse> listByExperience(Long experienceId) {
        return checkInPointRepository.findByExperienceIdOrderBySequenceOrderAsc(experienceId)
                .stream().map(CheckInPointResponse::fromEntity).toList();
    }

    @Transactional
    public CheckInPointResponse create(Long experienceId, CreateCheckInPointRequest req) {
        Experience exp = experienceRepository.findById(experienceId)
                .orElseThrow(() -> new ResourceNotFoundException("Experience", experienceId));
        if (exp.getStatus() != ExperienceStatus.DRAFT) {
            throw new BusinessException("BR-CIP-CREATE",
                    "Chỉ tạo CheckInPoint khi Experience ở trạng thái DRAFT");
        }

        if (checkInPointRepository.existsByQrToken(req.qrToken())) {
            throw new BusinessException("BR-CIP-1",
                    "qrToken '" + req.qrToken() + "' đã tồn tại trong hệ thống");
        }

        CheckInPoint c = CheckInPoint.builder()
                .experience(exp)
                .name(req.name())
                .latitude(req.latitude())
                .longitude(req.longitude())
                .radiusMeters(req.radiusMeters())
                .qrToken(req.qrToken())
                .sequenceOrder(req.sequenceOrder())
                .build();

        CheckInPoint saved = checkInPointRepository.saveAndFlush(c);
        log.info("Created CheckInPoint id={} qr={}", saved.getId(), saved.getQrToken());
        return CheckInPointResponse.fromEntity(saved);
    }

    @Transactional
    public CheckInPointResponse update(Long id, UpdateCheckInPointRequest req) {
        CheckInPoint c = findOrThrow(id);
        if (c.getExperience().getStatus() != ExperienceStatus.DRAFT) {
            throw new BusinessException("BR-CIP-EDIT",
                    "Chỉ sửa CheckInPoint khi Experience ở trạng thái DRAFT");
        }
        if (req.name() != null) c.setName(req.name());
        if (req.latitude() != null) c.setLatitude(req.latitude());
        if (req.longitude() != null) c.setLongitude(req.longitude());
        if (req.radiusMeters() != null) c.setRadiusMeters(req.radiusMeters());
        if (req.qrToken() != null && !req.qrToken().equals(c.getQrToken())) {
            if (checkInPointRepository.existsByQrToken(req.qrToken())) {
                throw new BusinessException("BR-CIP-1",
                        "qrToken '" + req.qrToken() + "' đã tồn tại trong hệ thống");
            }
            c.setQrToken(req.qrToken());
        }
        if (req.sequenceOrder() != null) c.setSequenceOrder(req.sequenceOrder());

        CheckInPoint saved = checkInPointRepository.saveAndFlush(c);
        log.info("Updated CheckInPoint id={}", saved.getId());
        return CheckInPointResponse.fromEntity(saved);
    }

    @Transactional
    public void delete(Long id) {
        CheckInPoint c = findOrThrow(id);
        if (c.getExperience().getStatus() != ExperienceStatus.DRAFT) {
            throw new BusinessException("BR-CIP-DELETE",
                    "Chỉ xóa CheckInPoint khi Experience ở trạng thái DRAFT");
        }
        checkInPointRepository.delete(c);
        log.info("Deleted CheckInPoint id={}", id);
    }

    private CheckInPoint findOrThrow(Long id) {
        return checkInPointRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("CheckInPoint", id));
    }
}
