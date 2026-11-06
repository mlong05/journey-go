package com.journeygo.modules.content.service;

import com.journeygo.common.exception.AppException;
import com.journeygo.common.exception.ErrorCode;
import com.journeygo.modules.content.dto.CulturalContentRequest;
import com.journeygo.modules.content.dto.CulturalContentResponse;
import com.journeygo.modules.content.entity.CulturalContent;
import com.journeygo.modules.content.repository.CulturalContentRepository;
import com.journeygo.modules.moderation.service.ContentModerationService;
import com.journeygo.modules.media.service.CloudinaryImageService;
import com.journeygo.modules.media.dto.CloudinaryUploadedImage;
import com.journeygo.modules.destination.entity.Destination;
import com.journeygo.modules.destination.repository.DestinationRepository;
import com.journeygo.modules.user.entity.Role;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.ArrayList;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class CulturalContentService {

    private final CulturalContentRepository culturalContentRepository;
    private final DestinationRepository destinationRepository;
    private final ContentModerationService contentModerationService;
    private final CloudinaryImageService cloudinaryImageService;

    @Transactional(readOnly = true)
    public List<CulturalContentResponse> getByDestinationId(Long destinationId) {
        findDestinationOrThrow(destinationId);
        return contentModerationService.getApprovedByDestination(destinationId);
    }

    /** Mọi nội dung chưa xóa của điểm đến (kể cả đang chờ duyệt / bị từ chối) cho chủ sở hữu quản lý. */
    @Transactional(readOnly = true)
    public List<CulturalContentResponse> getManageByDestinationId(Long destinationId, Long callerId, Role callerRole) {
        Destination destination = findDestinationOrThrow(destinationId);
        checkOwnership(destination, callerId, callerRole);
        List<CulturalContent> contents = culturalContentRepository
                .findByDestinationIdAndDeletedFalseAndDestinationDeletedFalseOrderBySequenceOrderAsc(destinationId);
        var statuses = contentModerationService.getStatuses(contents.stream().map(CulturalContent::getId).toList());
        return contents.stream()
                .map(c -> CulturalContentResponse.fromEntity(c).toBuilder()
                        .reviewStatus(statuses.containsKey(c.getId()) ? statuses.get(c.getId()).name() : null)
                        .build())
                .toList();
    }

    @Transactional(readOnly = true)
    public List<CulturalContentResponse> getAllApproved() {
        return contentModerationService.getAllApproved();
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
        contentModerationService.requireApproved(id);
        return CulturalContentResponse.fromEntity(findContentOrThrow(id));
    }

    /** Create new cultural content attached to a destination */
    @Transactional
    public CulturalContentResponse create(Long destinationId, CulturalContentRequest request, Long callerId, Role callerRole) {
        Destination destination = findDestinationOrThrow(destinationId);

        checkOwnership(destination, callerId, callerRole);
        cloudinaryImageService.validateAsset(request.mediaUrl(), request.mediaPublicId(), destinationId, callerId, null);

        CulturalContent content = CulturalContent.builder()
                .destination(destination)
                .title(request.title().trim())
                .contentType(request.contentType().trim().toUpperCase())
                .sequenceOrder(request.sequenceOrder())
                .description(request.description())
                .contentText(request.contentText())
                .mediaUrl(request.mediaUrl())
                .mediaPublicId(request.mediaPublicId())
                .duration(request.duration())
                .imageUrls(sanitizeImageUrls(request.imageUrls()))
                .playCount(0L)
                .deleted(false)
                .build();

        CulturalContent saved = culturalContentRepository.save(content);
        contentModerationService.submit(saved.getId(), callerId, callerRole);
        log.info("Created cultural content id={} for destinationId={}", saved.getId(), destinationId);
        return CulturalContentResponse.fromEntity(saved);
    }

    /** Create content and upload its image in one multipart request. */
    @Transactional
    public CulturalContentResponse createWithImage(Long destinationId, CulturalContentRequest request,
                                                   MultipartFile image, Long callerId, Role callerRole) {
        CloudinaryUploadedImage uploaded = cloudinaryImageService.uploadImage(image, destinationId, callerId, callerRole);
        CulturalContentRequest requestWithImage = new CulturalContentRequest(request.title(), request.contentType(),
                request.sequenceOrder(), request.description(), request.contentText(), uploaded.secureUrl(),
                uploaded.publicId(), request.duration(), request.imageUrls());
        try {
            return create(destinationId, requestWithImage, callerId, callerRole);
        } catch (RuntimeException exception) {
            cloudinaryImageService.deleteImmediately(uploaded.publicId());
            throw exception;
        }
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
        String previousPublicId = content.getMediaPublicId();
        cloudinaryImageService.validateAsset(request.mediaUrl(), request.mediaPublicId(),
                content.getDestination().getId(), callerId, previousPublicId);
        content.setMediaUrl(request.mediaUrl());
        content.setMediaPublicId(request.mediaPublicId());
        content.setDuration(request.duration());
        // null = client cũ không gửi thư viện ảnh nên giữ nguyên; danh sách (kể cả rỗng) = thay toàn bộ
        if (request.imageUrls() != null) {
            content.getImageUrls().clear();
            content.getImageUrls().addAll(sanitizeImageUrls(request.imageUrls()));
        }

        CulturalContent saved = culturalContentRepository.save(content);
        contentModerationService.submitAfterEdit(saved.getId(), callerId, callerRole);
        if (previousPublicId != null && !previousPublicId.equals(saved.getMediaPublicId())) {
            cloudinaryImageService.deleteAfterCommit(previousPublicId);
        }
        log.info("Updated cultural content id={}", saved.getId());
        return CulturalContentResponse.fromEntity(saved);
    }

    /** Replace the image and update content fields in one multipart request. */
    @Transactional
    public CulturalContentResponse updateWithImage(Long id, CulturalContentRequest request,
                                                   MultipartFile image, Long callerId, Role callerRole) {
        CulturalContent current = findContentOrThrow(id);
        checkOwnership(current.getDestination(), callerId, callerRole);
        CloudinaryUploadedImage uploaded = cloudinaryImageService.uploadImage(
                image, current.getDestination().getId(), callerId, callerRole);
        CulturalContentRequest requestWithImage = new CulturalContentRequest(request.title(), request.contentType(),
                request.sequenceOrder(), request.description(), request.contentText(), uploaded.secureUrl(),
                uploaded.publicId(), request.duration(), request.imageUrls());
        try {
            return update(id, requestWithImage, callerId, callerRole);
        } catch (RuntimeException exception) {
            cloudinaryImageService.deleteImmediately(uploaded.publicId());
            throw exception;
        }
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

    /** Detach the image while retaining the cultural content. */
    @Transactional
    public CulturalContentResponse removeImage(Long id, Long callerId, Role callerRole) {
        CulturalContent content = findContentOrThrow(id);
        checkOwnership(content.getDestination(), callerId, callerRole);
        String previousPublicId = content.getMediaPublicId();
        content.setMediaUrl(null);
        content.setMediaPublicId(null);
        CulturalContent saved = culturalContentRepository.save(content);
        contentModerationService.submitAfterEdit(saved.getId(), callerId, callerRole);
        if (previousPublicId != null) cloudinaryImageService.deleteAfterCommit(previousPublicId);
        return CulturalContentResponse.fromEntity(saved);
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
        contentModerationService.requireApproved(id);
        CulturalContent content = findContentOrThrow(id);
        content.incrementPlayCount();
        CulturalContent saved = culturalContentRepository.save(content);
        log.info("Played cultural content id={} totalPlayCount={}", saved.getId(), saved.getPlayCount());
        return CulturalContentResponse.fromEntity(saved);
    }

    // ── Helper methods ───────────────────────────────────────────────────────

    /** Chỉ giữ URL https hợp lệ, bỏ trùng, giữ thứ tự và giới hạn số ảnh. */
    private List<String> sanitizeImageUrls(List<String> imageUrls) {
        if (imageUrls == null) return new ArrayList<>();
        List<String> result = new ArrayList<>(imageUrls.stream()
                .filter(url -> url != null && !url.isBlank())
                .map(String::trim)
                .distinct()
                .toList());
        if (result.size() > CulturalContentRequest.MAX_IMAGES
                || result.stream().anyMatch(url -> !url.regionMatches(true, 0, "https://", 0, 8))) {
            throw new AppException(ErrorCode.VALIDATION_ERROR);
        }
        return result;
    }

    private Destination findDestinationOrThrow(Long destinationId) {
        return destinationRepository.findByIdAndDeletedFalse(destinationId)
                .orElseThrow(() -> new AppException(ErrorCode.DESTINATION_NOT_FOUND));
    }

    private CulturalContent findContentOrThrow(Long id) {
        return culturalContentRepository.findByIdAndDeletedFalseAndDestinationDeletedFalse(id)
                .orElseThrow(() -> new AppException(ErrorCode.CONTENT_NOT_FOUND));
    }

    private void checkOwnership(Destination destination, Long callerId, Role callerRole) {
        if (callerRole != null && callerRole.isContentProvider()) {
            Long ownerId = destination.getCreatedBy() != null ? destination.getCreatedBy().getId() : null;
            if (ownerId == null || !ownerId.equals(callerId)) {
                throw new AppException(ErrorCode.UNAUTHORIZED);
            }
        }
    }
}
