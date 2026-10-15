package com.journeygo.modules.experience.service;

import com.journeygo.modules.experience.dto.request.CreateExperienceSlotRequest;
import com.journeygo.modules.experience.dto.request.UpdateExperienceSlotRequest;
import com.journeygo.modules.experience.dto.response.ExperienceSlotResponse;
import com.journeygo.modules.experience.entity.Experience;
import com.journeygo.modules.experience.entity.ExperienceSlot;
import com.journeygo.modules.experience.entity.enums.ExperienceStatus;
import com.journeygo.modules.experience.entity.enums.SlotStatus;
import com.journeygo.modules.experience.exception.BusinessException;
import com.journeygo.modules.experience.exception.ResourceNotFoundException;
import com.journeygo.modules.experience.repository.ExperienceRepository;
import com.journeygo.modules.experience.repository.ExperienceSlotRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

/**
 * Service ExperienceSlot — phân bổ quota (theo TOUR) cho Experience theo ngày.
 *
 * Vì Experience 1-1 Destination, slot này ngầm định quản lý cả quota cho destination tương ứng.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ExperienceSlotService {

    private final ExperienceSlotRepository slotRepository;
    private final ExperienceRepository experienceRepository;

    @Transactional(readOnly = true)
    public List<ExperienceSlotResponse> listByExperience(Long experienceId, LocalDate date) {
        List<ExperienceSlot> slots = (date != null)
                ? slotRepository.findByExperienceIdAndSlotDate(experienceId, date)
                        .map(List::of).orElse(List.of())
                : slotRepository.findByExperienceIdOrderBySlotDateAsc(experienceId);
        return slots.stream().map(ExperienceSlotResponse::fromEntity).toList();
    }

    @Transactional(readOnly = true)
    public ExperienceSlotResponse getById(Long id) {
        return ExperienceSlotResponse.fromEntity(findOrThrow(id));
    }

    @Transactional
    public ExperienceSlotResponse create(Long experienceId, CreateExperienceSlotRequest req) {
        Experience exp = experienceRepository.findById(experienceId)
                .orElseThrow(() -> new ResourceNotFoundException("Experience", experienceId));
        if (exp.getStatus() != ExperienceStatus.DRAFT && exp.getStatus() != ExperienceStatus.PUBLISHED) {
            throw new BusinessException("BR-SLOT-CREATE",
                    "Chỉ tạo slot khi Experience ở DRAFT hoặc PUBLISHED");
        }

        // UNIQUE (experience_id, slot_date) — dùng upsert behavior
        ExperienceSlot slot = slotRepository.findByExperienceIdAndSlotDate(experienceId, req.slotDate())
                .orElse(null);
        if (slot == null) {
            slot = ExperienceSlot.builder()
                    .experience(exp)
                    .slotDate(req.slotDate())
                    .bookedTourCount(0)
                    .status(SlotStatus.AVAILABLE)
                    .build();
        }
        slot.setMaxTourPerDay(req.maxTourPerDay());

        ExperienceSlot saved = slotRepository.save(slot);
        log.info("Upserted ExperienceSlot id={} experience={} date={} maxTourPerDay={}",
                saved.getId(), experienceId, req.slotDate(), req.maxTourPerDay());
        return ExperienceSlotResponse.fromEntity(saved);
    }

    @Transactional
    public ExperienceSlotResponse update(Long id, UpdateExperienceSlotRequest req) {
        ExperienceSlot s = findOrThrow(id);
        if (req.maxTourPerDay() != null) s.setMaxTourPerDay(req.maxTourPerDay());
        if (req.status() != null) {
            // Enum đã được Jackson validate khi parse JSON request body
            // → giá trị không hợp lệ sẽ bị reject trước khi vào service
            s.setStatus(req.status());
        }
        ExperienceSlot saved = slotRepository.save(s);
        log.info("Updated ExperienceSlot id={}", saved.getId());
        return ExperienceSlotResponse.fromEntity(saved);
    }

    @Transactional
    public void delete(Long id) {
        ExperienceSlot s = findOrThrow(id);
        slotRepository.delete(s);
        log.info("Deleted ExperienceSlot id={}", id);
    }

    private ExperienceSlot findOrThrow(Long id) {
        return slotRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("ExperienceSlot", id));
    }
}