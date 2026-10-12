package com.journeygo.modules.destination.service;

import com.journeygo.common.exception.AppException;
import com.journeygo.common.exception.ErrorCode;
import com.journeygo.modules.destination.dto.DestinationRequest;
import com.journeygo.modules.destination.dto.DestinationResponse;
import com.journeygo.modules.destination.entity.Destination;
import com.journeygo.modules.destination.repository.DestinationRepository;
import com.journeygo.modules.user.entity.User;
import com.journeygo.modules.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class DestinationService {

    private final DestinationRepository destinationRepository;
    private final UserRepository userRepository;

    /** Retrieve all non-deleted destinations. */
    @Transactional(readOnly = true)
    public List<DestinationResponse> getAll() {
        return destinationRepository.findByDeletedFalse()
                .stream().map(DestinationResponse::fromEntity).toList();
    }

    /** Retrieve only approved, non-deleted destinations. */
    @Transactional(readOnly = true)
    public List<DestinationResponse> getApproved() {
        return destinationRepository.findByApprovedAndDeletedFalse(true)
                .stream().map(DestinationResponse::fromEntity).toList();
    }

    /** Retrieve a single non-deleted destination by id. */
    @Transactional(readOnly = true)
    public DestinationResponse getById(Long id) {
        return DestinationResponse.fromEntity(findOrThrow(id));
    }

    /** Retrieve all soft-deleted destinations. */
    @Transactional(readOnly = true)
    public List<DestinationResponse> getDeleted() {
        return destinationRepository.findByDeletedTrue()
                .stream().map(DestinationResponse::fromEntity).toList();
    }

    /** Create a new destination (unapproved by default). */
    @Transactional
    public DestinationResponse create(DestinationRequest request, Long creatorId) {
        if (destinationRepository.existsByNameAndAddressAndDeletedFalse(request.name(), request.address())) {
            throw new AppException(ErrorCode.DESTINATION_EXISTED);
        }
        if (destinationRepository.existsByLatitudeAndLongitudeAndDeletedFalse(request.latitude(), request.longitude())) {
            throw new AppException(ErrorCode.DESTINATION_COORDINATE_EXISTED);
        }

        User creator = userRepository.findById(creatorId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));

        Destination destination = Destination.builder()
                .name(request.name())
                .address(request.address())
                .latitude(request.latitude())
                .longitude(request.longitude())
                .capacity(request.capacity())
                .approved(false)
                .deleted(false)
                .createdBy(creator)
                .build();

        Destination saved = destinationRepository.save(destination);
        log.info("Created destination id={} name={}", saved.getId(), saved.getName());
        return DestinationResponse.fromEntity(saved);
    }

    /** Update an existing destination and reset approval. */
    @Transactional
    public DestinationResponse update(Long id, DestinationRequest request) {
        Destination existing = findOrThrow(id);
        if (destinationRepository.existsByLatitudeAndLongitudeAndDeletedFalseAndIdNot(request.latitude(), request.longitude(), id)) {
            throw new AppException(ErrorCode.DESTINATION_COORDINATE_EXISTED);
        }
        existing.setName(request.name());
        existing.setAddress(request.address());
        existing.setLatitude(request.latitude());
        existing.setLongitude(request.longitude());
        existing.setCapacity(request.capacity());
        existing.setApproved(false);
        Destination saved = destinationRepository.save(existing);
        log.info("Updated destination id={}", saved.getId());
        return DestinationResponse.fromEntity(saved);
    }

    /** Approve or revoke approval for a destination. */
    @Transactional
    public DestinationResponse setApproval(Long id, boolean approved) {
        Destination destination = findOrThrow(id);
        destination.setApproved(approved);
        Destination saved = destinationRepository.save(destination);
        log.info("Destination id={} approved={}", saved.getId(), saved.isApproved());
        return DestinationResponse.fromEntity(saved);
    }

    /** Soft-delete a destination by id. */
    @Transactional
    public void delete(Long id) {
        Destination destination = findOrThrow(id);
        destination.setDeleted(true);
        destinationRepository.save(destination);
        log.info("Soft-deleted destination id={}", id);
    }

    /** Restore a soft-deleted destination. */
    @Transactional
    public DestinationResponse restore(Long id) {
        Destination destination = destinationRepository.findByIdAndDeletedTrue(id)
                .orElseThrow(() -> new AppException(ErrorCode.DESTINATION_NOT_FOUND));
        destination.setDeleted(false);
        destination.setApproved(false);
        Destination saved = destinationRepository.save(destination);
        log.info("Restored destination id={}", saved.getId());
        return DestinationResponse.fromEntity(saved);
    }

    // ── internal helper ──────────────────────────────────────────────────────

    private Destination findOrThrow(Long id) {
        return destinationRepository.findByIdAndDeletedFalse(id)
                .orElseThrow(() -> new AppException(ErrorCode.DESTINATION_NOT_FOUND));
    }
}
