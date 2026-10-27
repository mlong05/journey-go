package com.journeygo.modules.moderation.service;

import com.journeygo.common.dto.PageResponse;
import com.journeygo.common.exception.AppException;
import com.journeygo.common.exception.ErrorCode;
import com.journeygo.modules.destination.dto.DestinationResponse;
import com.journeygo.modules.destination.entity.Destination;
import com.journeygo.modules.destination.entity.DestinationStatus;
import com.journeygo.modules.destination.repository.DestinationRepository;
import com.journeygo.modules.user.entity.Role;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class DestinationModerationService {
    private final DestinationRepository destinationRepository;

    @Transactional
    public DestinationResponse submit(Long id, Long callerId, Role callerRole) {
        Destination destination = findOrThrow(id);
        checkOwnership(destination, callerId, callerRole);
        destination.submit();
        return DestinationResponse.fromEntity(destinationRepository.save(destination));
    }

    @Transactional(readOnly = true)
    public PageResponse<DestinationResponse> getQueue(Pageable pageable) {
        Page<Destination> page = destinationRepository.findByStatusAndDeletedFalse(DestinationStatus.PENDING, pageable);
        return PageResponse.from(page, DestinationResponse::fromEntity);
    }

    @Transactional(readOnly = true)
    public PageResponse<DestinationResponse> getByStatus(DestinationStatus status, Pageable pageable) {
        Page<Destination> page = destinationRepository.findByStatusAndDeletedFalse(status, pageable);
        return PageResponse.from(page, DestinationResponse::fromEntity);
    }

    @Transactional
    public DestinationResponse approve(Long id) {
        Destination destination = findOrThrow(id);
        destination.publish();
        Destination saved = destinationRepository.save(destination);
        log.info("Approved destination id={}", id);
        return DestinationResponse.fromEntity(saved);
    }

    @Transactional
    public DestinationResponse reject(Long id) {
        Destination destination = findOrThrow(id);
        destination.reject();
        Destination saved = destinationRepository.save(destination);
        log.info("Rejected destination id={}", id);
        return DestinationResponse.fromEntity(saved);
    }

    @Transactional
    public DestinationResponse setApproval(Long id, boolean approved) {
        return approved ? approve(id) : reject(id);
    }

    private Destination findOrThrow(Long id) {
        return destinationRepository.findByIdAndDeletedFalse(id)
                .orElseThrow(() -> new AppException(ErrorCode.DESTINATION_NOT_FOUND));
    }

    private void checkOwnership(Destination destination, Long callerId, Role callerRole) {
        if (callerRole != null && callerRole.isProvider()) {
            Long ownerId = destination.getCreatedBy() == null ? null : destination.getCreatedBy().getId();
            if (ownerId == null || !ownerId.equals(callerId)) {
                throw new AppException(ErrorCode.UNAUTHORIZED);
            }
        }
    }
}
