package com.journeygo.modules.content.service;

import com.journeygo.common.exception.AppException;
import com.journeygo.common.exception.ErrorCode;
import com.journeygo.modules.content.dto.CulturalContentRequest;
import com.journeygo.modules.content.dto.CulturalContentResponse;
import com.journeygo.modules.content.entity.CulturalContent;
import com.journeygo.modules.content.repository.CulturalContentRepository;
import com.journeygo.modules.destination.entity.Destination;
import com.journeygo.modules.destination.repository.DestinationRepository;
import com.journeygo.modules.user.entity.Role;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class CulturalContentService {

    private final CulturalContentRepository culturalContentRepository;
    private final DestinationRepository destinationRepository;

    @Transactional(readOnly = true)
    public List<CulturalContentResponse> getByDestinationId(Long destinationId) {
        findDestinationOrThrow(destinationId);
        return culturalContentRepository.findByDestinationIdAndDeletedFalseAndDestinationDeletedFalseOrderBySequenceOrderAsc(destinationId)
                .stream().map(CulturalContentResponse::fromEntity).toList();
    }

    @Transactional(readOnly = true)
    public List<CulturalContentResponse> getDeletedByDestinationId(Long destinationId, Long callerId, Role callerRole) {
        Destination destination = findDestinationOrThrow(destinationId);
        checkOwnership(destination, callerId, callerRole);
        return culturalContentRepository.findByDestinationIdAndDeletedTrueOrderBySequenceOrderAsc(destinationId)
                .stream().map(CulturalContentResponse::fromEntity).toList();
    }

    @Transactional(readOnly = true)
    public CulturalContentResponse getById(Long id) {
        return CulturalContentResponse.fromEntity(findContentOrThrow(id));
    }

    /** Create new cultural content attached to a destination */
    @Transactional
    public CulturalContentResponse create(Long destinationId, CulturalContentRequest request, Long callerId, Role callerRole) {
        Destination destination = findDestinationOrThrow(destinationId);

        checkOwnership(destination, callerId, callerRole);

        CulturalContent content = CulturalContent.builder()
                .destination(destination)
                .title(request.title().trim())
                .contentType(request.contentType().trim().toUpperCase())
                .sequenceOrder(request.sequenceOrder())
                .description(request.description())
                .contentText(request.contentText())
                .mediaUrl(request.mediaUrl())
                .duration(request.duration())
                .playCount(0L)
                .deleted(false)
                .build();

        CulturalContent saved = culturalContentRepository.save(content);
        log.info("Created cultural content id={} for destinationId={}", saved.getId(), destinationId);
        return CulturalContentResponse.fromEntity(saved);
    }

    /** Update cultural content */
    @Transactional
    public CulturalContentResponse update(Long id, CulturalContentRequest request, Long callerId, Role callerRole) {
        CulturalContent content = findContentOrThrow(id);

        checkOwnership(content.getDestination(), callerId, callerRole);

        content.setTitle(request.title().trim());
        content.setContentType(request.contentType().trim().toUpperCase());
        content.setSequenceOrder(request.sequenceOrder());
        content.setDescription(request.description());
        content.setContentText(request.contentText());
        content.setMediaUrl(request.mediaUrl());
        content.setDuration(request.duration());

        CulturalContent saved = culturalContentRepository.save(content);
        log.info("Updated cultural content id={}", saved.getId());
        return CulturalContentResponse.fromEntity(saved);
    }

    /** Soft-delete cultural content */
    @Transactional
    public void delete(Long id, Long callerId, Role callerRole) {
        CulturalContent content = findContentOrThrow(id);

        checkOwnership(content.getDestination(), callerId, callerRole);

        content.setDeleted(true);
        culturalContentRepository.save(content);
        log.info("Soft-deleted cultural content id={}", id);
    }

    /** Restore a soft-deleted cultural content */
    @Transactional
    public CulturalContentResponse restore(Long id, Long callerId, Role callerRole) {
        CulturalContent content = culturalContentRepository.findByIdAndDeletedTrue(id)
                .orElseThrow(() -> new AppException(ErrorCode.CONTENT_NOT_FOUND));

        checkOwnership(content.getDestination(), callerId, callerRole);

        content.setDeleted(false);
        CulturalContent saved = culturalContentRepository.save(content);
        log.info("Restored cultural content id={}", saved.getId());
        return CulturalContentResponse.fromEntity(saved);
    }

    /** Play content: increments play counter and returns media playback details */
    @Transactional
    public CulturalContentResponse play(Long id) {
        CulturalContent content = findContentOrThrow(id);
        content.incrementPlayCount();
        CulturalContent saved = culturalContentRepository.save(content);
        log.info("Played cultural content id={} totalPlayCount={}", saved.getId(), saved.getPlayCount());
        return CulturalContentResponse.fromEntity(saved);
    }

    // ── Helper methods ───────────────────────────────────────────────────────

    private Destination findDestinationOrThrow(Long destinationId) {
        return destinationRepository.findByIdAndDeletedFalse(destinationId)
                .orElseThrow(() -> new AppException(ErrorCode.DESTINATION_NOT_FOUND));
    }

    private CulturalContent findContentOrThrow(Long id) {
        return culturalContentRepository.findByIdAndDeletedFalseAndDestinationDeletedFalse(id)
                .orElseThrow(() -> new AppException(ErrorCode.CONTENT_NOT_FOUND));
    }

    private void checkOwnership(Destination destination, Long callerId, Role callerRole) {
        if (callerRole == Role.PROVIDER) {
            Long ownerId = destination.getCreatedBy() != null ? destination.getCreatedBy().getId() : null;
            if (ownerId == null || !ownerId.equals(callerId)) {
                throw new AppException(ErrorCode.UNAUTHORIZED);
            }
        }
    }
}
