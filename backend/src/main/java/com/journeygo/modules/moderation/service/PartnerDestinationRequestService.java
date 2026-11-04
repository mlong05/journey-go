package com.journeygo.modules.moderation.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.journeygo.common.dto.PageResponse;
import com.journeygo.common.exception.AppException;
import com.journeygo.common.exception.ErrorCode;
import com.journeygo.common.service.CloudinaryService;
import com.journeygo.modules.destination.entity.Destination;
import com.journeygo.modules.destination.entity.enums.DestinationStatus;
import com.journeygo.modules.destination.repository.DestinationRepository;
import com.journeygo.modules.moderation.dto.request.*;
import com.journeygo.modules.moderation.dto.response.DestinationRequestResponse;
import com.journeygo.modules.moderation.entity.DestinationRequestHistory;
import com.journeygo.modules.moderation.entity.PartnerDestinationRequest;
import com.journeygo.modules.moderation.entity.enums.DestinationRequestAction;
import com.journeygo.modules.moderation.entity.enums.DestinationRequestStatus;
import com.journeygo.modules.moderation.repository.DestinationRequestHistoryRepository;
import com.journeygo.modules.moderation.repository.PartnerDestinationRequestRepository;
import com.journeygo.modules.notification.entity.enums.NotificationType;
import com.journeygo.modules.notification.service.NotificationPublisher;
import com.journeygo.modules.user.entity.Role;
import com.journeygo.modules.user.entity.User;
import com.journeygo.modules.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class PartnerDestinationRequestService {

    private final PartnerDestinationRequestRepository requestRepository;
    private final DestinationRequestHistoryRepository historyRepository;
    private final DestinationRepository destinationRepository;
    private final UserRepository userRepository;
    private final NotificationPublisher notifications;
    private final CloudinaryService cloudinaryService;
    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    /**
     * 1. Partner gửi Destination Request mới kèm file ảnh tải lên Cloudinary (SUBMITTED)
     */
    @Transactional
    public DestinationRequestResponse submitRequestWithImages(
            CreateDestinationProposalRequest dto,
            List<MultipartFile> imageFiles,
            Long partnerId) {
        User partner = findUserOrThrow(partnerId);

        List<String> uploadedUrls = new ArrayList<>();
        if (dto.images() != null && !dto.images().isEmpty()) {
            uploadedUrls.addAll(dto.images());
        }

        if (imageFiles != null && !imageFiles.isEmpty()) {
            String folder = "journeygo/destination-requests/user-" + partnerId;
            for (MultipartFile file : imageFiles) {
                if (file != null && !file.isEmpty()) {
                    String url = cloudinaryService.uploadImage(file, folder);
                    if (url != null && !url.isBlank()) {
                        uploadedUrls.add(url);
                    }
                }
            }
        }

        String imagesJson = null;
        if (!uploadedUrls.isEmpty()) {
            try {
                imagesJson = OBJECT_MAPPER.writeValueAsString(uploadedUrls);
            } catch (JsonProcessingException e) {
                imagesJson = String.join(",", uploadedUrls);
            }
        }

        PartnerDestinationRequest entity = PartnerDestinationRequest.builder()
                .partner(partner)
                .destinationName(dto.destinationName().trim())
                .location(dto.location().trim())
                .address(dto.address().trim())
                .description(dto.description())
                .images(imagesJson)
                .supportingDocuments(dto.supportingDocuments())
                .contactName(partner.getFullName())
                .contactPhone(partner.getPhone())
                .contactEmail(partner.getEmail())
                .contactInfo(dto.contactInfo())
                .note(dto.note())
                .status(DestinationRequestStatus.SUBMITTED)
                .build();

        PartnerDestinationRequest saved = requestRepository.save(entity);
        addHistory(saved, partner, DestinationRequestAction.SUBMITTED, null, DestinationRequestStatus.SUBMITTED,
                "Partner gửi đề xuất điểm đến mới (kèm ảnh Cloudinary)", null);

        // Gửi thông báo đến Moderator
        notifications.send(NotificationType.DESTINATION_REQUEST_PENDING)
                .toRole(Role.MODERATOR)
                .title("Đề xuất điểm đến mới từ đối tác")
                .body("Đối tác " + partner.getFullName() + " vừa đề xuất điểm đến: " +
                        NotificationPublisher.quote(saved.getDestinationName()) + " (" + saved.getLocation() + ").")
                .link("/moderator/destination-requests/" + saved.getId())
                .ref("DESTINATION_REQUEST", saved.getId())
                .queue(NotificationPublisher.Queue.DESTINATION_REQUEST_REVIEW)
                .publish();

        return DestinationRequestResponse.fromEntity(saved);
    }

    /**
     * Tải thêm ảnh lên Cloudinary cho một yêu cầu đề xuất điểm đến đã có
     */
    @Transactional
    public DestinationRequestResponse addImagesToRequest(Long requestId, List<MultipartFile> files, Long callerId) {
        PartnerDestinationRequest request = findRequestOrThrow(requestId);
        if (!request.getPartner().getId().equals(callerId)) {
            User caller = findUserOrThrow(callerId);
            boolean isAdmin = caller.getRole() != null && Role.ADMIN.equals(caller.getRole().getName());
            if (!isAdmin) {
                throw new AppException(ErrorCode.UNAUTHORIZED, "Bạn không có quyền tải ảnh vào yêu cầu này");
            }
        }

        if (files == null || files.isEmpty()) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Danh sách ảnh không được để trống");
        }

        List<String> currentList = new ArrayList<>();
        if (request.getImages() != null && !request.getImages().isBlank()) {
            try {
                if (request.getImages().startsWith("[")) {
                    currentList.addAll(OBJECT_MAPPER.readValue(request.getImages(), new TypeReference<List<String>>() {}));
                } else {
                    currentList.addAll(List.of(request.getImages().split(",")));
                }
            } catch (Exception e) {
                currentList.add(request.getImages());
            }
        }

        String folder = "journeygo/destination-requests/user-" + request.getPartner().getId();
        for (MultipartFile file : files) {
            if (file != null && !file.isEmpty()) {
                String url = cloudinaryService.uploadImage(file, folder);
                if (url != null && !url.isBlank()) {
                    currentList.add(url);
                }
            }
        }

        try {
            request.setImages(OBJECT_MAPPER.writeValueAsString(currentList));
        } catch (JsonProcessingException e) {
            request.setImages(String.join(",", currentList));
        }

        PartnerDestinationRequest saved = requestRepository.save(request);
        return DestinationRequestResponse.fromEntity(saved);
    }

    /**
     * 1. Partner gửi Destination Request mới (SUBMITTED)
     */
    @Transactional
    public DestinationRequestResponse submitRequest(CreateDestinationProposalRequest dto, Long partnerId) {
        User partner = findUserOrThrow(partnerId);

        String imagesJson = null;
        if (dto.images() != null && !dto.images().isEmpty()) {
            try {
                imagesJson = OBJECT_MAPPER.writeValueAsString(dto.images());
            } catch (JsonProcessingException e) {
                imagesJson = String.join(",", dto.images());
            }
        }

        PartnerDestinationRequest entity = PartnerDestinationRequest.builder()
                .partner(partner)
                .destinationName(dto.destinationName().trim())
                .location(dto.location().trim())
                .address(dto.address().trim())
                .description(dto.description())
                .images(imagesJson)
                .supportingDocuments(dto.supportingDocuments())
                .contactName(partner.getFullName())
                .contactPhone(partner.getPhone())
                .contactEmail(partner.getEmail())
                .contactInfo(dto.contactInfo())
                .note(dto.note())
                .status(DestinationRequestStatus.SUBMITTED)
                .build();

        PartnerDestinationRequest saved = requestRepository.save(entity);
        addHistory(saved, partner, DestinationRequestAction.SUBMITTED, null, DestinationRequestStatus.SUBMITTED,
                "Partner gửi đề xuất điểm đến mới", null);

        // Gửi thông báo đến Moderator
        notifications.send(NotificationType.DESTINATION_REQUEST_PENDING)
                .toRole(Role.MODERATOR)
                .title("Đề xuất điểm đến mới từ đối tác")
                .body("Đối tác " + partner.getFullName() + " vừa đề xuất điểm đến: " +
                        NotificationPublisher.quote(saved.getDestinationName()) + " (" + saved.getLocation() + ").")
                .link("/moderator/destination-requests/" + saved.getId())
                .ref("DESTINATION_REQUEST", saved.getId())
                .queue(NotificationPublisher.Queue.DESTINATION_REQUEST_REVIEW)
                .publish();

        return DestinationRequestResponse.fromEntity(saved);
    }

    /**
     * Chuyển trạng thái sang UNDER_REVIEW khi Moderator bắt đầu xem xét (Lần 1)
     */
    @Transactional
    public DestinationRequestResponse startReview(Long requestId, Long moderatorId) {
        PartnerDestinationRequest request = findRequestOrThrow(requestId);
        if (request.getStatus() != DestinationRequestStatus.SUBMITTED) {
            throw new AppException(ErrorCode.INVALID_DESTINATION_REQUEST_STATUS,
                    "Chỉ có thể bắt đầu xem xét yêu cầu đang ở trạng thái SUBMITTED");
        }

        User moderator = findUserOrThrow(moderatorId);
        DestinationRequestStatus previousStatus = request.getStatus();
        request.setStatus(DestinationRequestStatus.UNDER_REVIEW);
        request.setModerator(moderator);

        PartnerDestinationRequest saved = requestRepository.save(request);
        addHistory(saved, moderator, DestinationRequestAction.START_REVIEW, previousStatus,
                DestinationRequestStatus.UNDER_REVIEW, "Moderator bắt đầu thẩm định sơ bộ", null);

        return DestinationRequestResponse.fromEntity(saved);
    }

    /**
     * 2. Lần 1: Moderator phê duyệt tính hợp lệ và phù hợp -> Chuyển sang hàng đợi phân công (APPROVED)
     */
    @Transactional
    public DestinationRequestResponse initialApprove(Long requestId, Long moderatorId, InitialReviewDecisionRequest dto) {
        PartnerDestinationRequest request = findRequestOrThrow(requestId);
        if (request.getStatus() != DestinationRequestStatus.SUBMITTED && request.getStatus() != DestinationRequestStatus.UNDER_REVIEW) {
            throw new AppException(ErrorCode.INVALID_DESTINATION_REQUEST_STATUS,
                    "Chỉ có thể phê duyệt yêu cầu ở trạng thái SUBMITTED hoặc UNDER_REVIEW");
        }

        User moderator = findUserOrThrow(moderatorId);
        DestinationRequestStatus previousStatus = request.getStatus();
        request.setStatus(DestinationRequestStatus.APPROVED);
        request.setModerator(moderator);
        request.setInitialReviewNote(dto != null ? dto.note() : null);
        request.setInitialReviewedAt(Instant.now());

        PartnerDestinationRequest saved = requestRepository.save(request);
        addHistory(saved, moderator, DestinationRequestAction.INITIAL_APPROVED, previousStatus,
                DestinationRequestStatus.APPROVED, dto != null ? dto.note() : null, null);

        // Thông báo cho Partner
        notifications.send(NotificationType.DESTINATION_REQUEST_APPROVED)
                .to(request.getPartner().getId())
                .title("Đề xuất điểm đến đã được sơ duyệt")
                .body(NotificationPublisher.withNote(
                        "Đề xuất " + NotificationPublisher.quote(saved.getDestinationName()) +
                                " đã được duyệt tính hợp lệ và chuyển sang hàng chờ phân công biên tập nội dung.",
                        request.getInitialReviewNote()))
                .link("/partner/destination-requests/" + saved.getId())
                .ref("DESTINATION_REQUEST", saved.getId())
                .publish();

        // Thông báo cho Admin để phân công
        notifications.send(NotificationType.DESTINATION_REQUEST_APPROVED_FOR_ASSIGN)
                .toRole(Role.ADMIN)
                .title("Điểm đến mới chờ phân công biên tập")
                .body("Đề xuất " + NotificationPublisher.quote(saved.getDestinationName()) + " đã được kiểm duyệt hợp lệ, vui lòng phân công Content Provider.")
                .link("/admin/destination-requests/" + saved.getId())
                .ref("DESTINATION_REQUEST", saved.getId())
                .queue(NotificationPublisher.Queue.DESTINATION_REQUEST_ASSIGNMENT)
                .publish();

        return DestinationRequestResponse.fromEntity(saved);
    }

    /**
     * 2. Lần 1: Moderator từ chối đề xuất (REJECTED) kèm lý do cho Partner
     */
    @Transactional
    public DestinationRequestResponse initialReject(Long requestId, Long moderatorId, InitialReviewDecisionRequest dto) {
        PartnerDestinationRequest request = findRequestOrThrow(requestId);
        if (request.getStatus() != DestinationRequestStatus.SUBMITTED && request.getStatus() != DestinationRequestStatus.UNDER_REVIEW) {
            throw new AppException(ErrorCode.INVALID_DESTINATION_REQUEST_STATUS,
                    "Chỉ có thể từ chối yêu cầu ở trạng thái SUBMITTED hoặc UNDER_REVIEW");
        }

        if (dto == null || ((dto.reason() == null || dto.reason().isBlank()) && (dto.note() == null || dto.note().isBlank()))) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Vui lòng cung cấp lý do từ chối để đối tác nắm thông tin");
        }

        User moderator = findUserOrThrow(moderatorId);
        DestinationRequestStatus previousStatus = request.getStatus();
        request.setStatus(DestinationRequestStatus.REJECTED);
        request.setModerator(moderator);
        request.setRejectionReason(dto.reason());
        request.setRejectionNote(dto.note());
        request.setInitialReviewedAt(Instant.now());

        PartnerDestinationRequest saved = requestRepository.save(request);
        addHistory(saved, moderator, DestinationRequestAction.INITIAL_REJECTED, previousStatus,
                DestinationRequestStatus.REJECTED, dto.note(), dto.reason());

        // Thông báo lý do cho Partner
        notifications.send(NotificationType.DESTINATION_REQUEST_REJECTED)
                .to(request.getPartner().getId())
                .title("Đề xuất điểm đến chưa phù hợp")
                .body(NotificationPublisher.withNote(
                        "Đề xuất " + NotificationPublisher.quote(saved.getDestinationName()) +
                                " chưa thể tiếp nhận. Lý do: " + (dto.reason() != null ? dto.reason() : ""),
                        dto.note()))
                .link("/partner/destination-requests/" + saved.getId())
                .ref("DESTINATION_REQUEST", saved.getId())
                .publish();

        return DestinationRequestResponse.fromEntity(saved);
    }

    /**
     * 3. Admin / Content Management phân công request cho Content Provider (ASSIGNED)
     */
    @Transactional
    public DestinationRequestResponse assignToCp(Long requestId, Long adminId, AssignCpRequest dto) {
        PartnerDestinationRequest request = findRequestOrThrow(requestId);
        if (request.getStatus() != DestinationRequestStatus.APPROVED && request.getStatus() != DestinationRequestStatus.ASSIGNED) {
            throw new AppException(ErrorCode.INVALID_DESTINATION_REQUEST_STATUS,
                    "Chỉ có thể phân công yêu cầu đã được APPROVED hoặc điều chuyển từ ASSIGNED");
        }

        User admin = findUserOrThrow(adminId);
        User cp = findUserOrThrow(dto.cpUserId());

        // Kiểm tra xem cp có đúng role PROVIDER không
        if (cp.getRole() == null || (!Role.PROVIDER.equals(cp.getRole().getName()) && !Role.ADMIN.equals(cp.getRole().getName()))) {
            throw new AppException(ErrorCode.DESTINATION_REQUEST_CP_INVALID);
        }

        DestinationRequestStatus previousStatus = request.getStatus();
        request.setStatus(DestinationRequestStatus.ASSIGNED);
        request.setAssignedBy(admin);
        request.setAssignedCp(cp);
        request.setAssignedAt(Instant.now());
        request.setAssignmentNote(dto.note());

        PartnerDestinationRequest saved = requestRepository.save(request);
        addHistory(saved, admin, DestinationRequestAction.ASSIGNED, previousStatus,
                DestinationRequestStatus.ASSIGNED, dto.note(), "Phân công cho CP: " + cp.getFullName());

        // Thông báo cho CP được phân công
        notifications.send(NotificationType.DESTINATION_REQUEST_ASSIGNED)
                .to(cp.getId())
                .title("Nhiệm vụ biên tập điểm đến mới")
                .body("Bạn được giao xây dựng nội dung cho điểm đến: " +
                        NotificationPublisher.quote(saved.getDestinationName()) + " (" + saved.getLocation() + ").")
                .link("/provider/destination-requests/" + saved.getId())
                .ref("DESTINATION_REQUEST", saved.getId())
                .publish();

        return DestinationRequestResponse.fromEntity(saved);
    }

    /**
     * 4. Content Provider bắt đầu nghiên cứu, thiết kế và tạo Destination (IN_PROGRESS)
     */
    @Transactional
    public DestinationRequestResponse startProgress(Long requestId, Long callerId) {
        PartnerDestinationRequest request = findRequestOrThrow(requestId);
        checkCpAssignment(request, callerId);

        if (request.getStatus() != DestinationRequestStatus.ASSIGNED) {
            throw new AppException(ErrorCode.INVALID_DESTINATION_REQUEST_STATUS,
                    "Chỉ có thể bắt đầu thực hiện khi yêu cầu ở trạng thái ASSIGNED");
        }

        User cp = findUserOrThrow(callerId);
        DestinationRequestStatus previousStatus = request.getStatus();
        request.setStatus(DestinationRequestStatus.IN_PROGRESS);

        PartnerDestinationRequest saved = requestRepository.save(request);
        addHistory(saved, cp, DestinationRequestAction.START_PROGRESS, previousStatus,
                DestinationRequestStatus.IN_PROGRESS, "Content Provider tiếp nhận và bắt đầu xây dựng nội dung", null);

        return DestinationRequestResponse.fromEntity(saved);
    }

    /**
     * CP liên kết Destination đã tạo với request
     */
    @Transactional
    public DestinationRequestResponse linkDestination(Long requestId, Long destinationId, Long callerId) {
        PartnerDestinationRequest request = findRequestOrThrow(requestId);
        checkCpAssignment(request, callerId);

        Destination destination = destinationRepository.findByIdAndDeletedFalse(destinationId)
                .orElseThrow(() -> new AppException(ErrorCode.DESTINATION_NOT_FOUND));

        request.setDestination(destination);
        PartnerDestinationRequest saved = requestRepository.save(request);

        User actor = findUserOrThrow(callerId);
        addHistory(saved, actor, DestinationRequestAction.LINKED_DESTINATION, saved.getStatus(), saved.getStatus(),
                "Liên kết điểm đến: " + destination.getName() + " (ID: " + destinationId + ")", null);

        return DestinationRequestResponse.fromEntity(saved);
    }

    /**
     * 4 & 5. Content Provider nộp nội dung Destination hoàn chỉnh để kiểm duyệt lần 2 (PENDING_CONTENT_REVIEW)
     */
    @Transactional
    public DestinationRequestResponse submitContent(Long requestId, Long callerId, SubmitContentRequest dto) {
        PartnerDestinationRequest request = findRequestOrThrow(requestId);
        checkCpAssignment(request, callerId);

        if (request.getStatus() != DestinationRequestStatus.IN_PROGRESS && request.getStatus() != DestinationRequestStatus.ASSIGNED) {
            throw new AppException(ErrorCode.INVALID_DESTINATION_REQUEST_STATUS,
                    "Chỉ có thể nộp duyệt nội dung khi yêu cầu đang ở trạng thái IN_PROGRESS hoặc ASSIGNED");
        }

        Long destId = dto != null && dto.destinationId() != null ? dto.destinationId()
                : (request.getDestination() != null ? request.getDestination().getId() : null);

        if (destId == null) {
            throw new AppException(ErrorCode.DESTINATION_REQUEST_DESTINATION_REQUIRED);
        }

        Destination destination = destinationRepository.findByIdAndDeletedFalse(destId)
                .orElseThrow(() -> new AppException(ErrorCode.DESTINATION_NOT_FOUND));

        User cp = findUserOrThrow(callerId);
        DestinationRequestStatus previousStatus = request.getStatus();
        request.setDestination(destination);
        request.setStatus(DestinationRequestStatus.PENDING_CONTENT_REVIEW);
        request.setContentSubmittedAt(Instant.now());

        PartnerDestinationRequest saved = requestRepository.save(request);
        String note = dto != null ? dto.note() : null;
        addHistory(saved, cp, DestinationRequestAction.SUBMITTED_CONTENT, previousStatus,
                DestinationRequestStatus.PENDING_CONTENT_REVIEW, note, "Đã nộp nội dung hoàn chỉnh điểm đến: " + destination.getName());

        // Thông báo đến Moderator hàng chờ duyệt lần 2
        notifications.send(NotificationType.DESTINATION_REQUEST_CONTENT_PENDING)
                .toRole(Role.MODERATOR)
                .title("Nội dung điểm đến mới chờ kiểm duyệt")
                .body("Content Provider " + cp.getFullName() + " đã nộp nội dung hoàn chỉnh cho điểm đến: " +
                        NotificationPublisher.quote(destination.getName()) + " đang chờ bạn thẩm định chất lượng.")
                .link("/moderator/destination-requests/" + saved.getId())
                .ref("DESTINATION_REQUEST", saved.getId())
                .queue(NotificationPublisher.Queue.DESTINATION_REQUEST_CONTENT)
                .publish();

        return DestinationRequestResponse.fromEntity(saved);
    }

    /**
     * 6. Lần 2: Moderator kiểm duyệt nội dung hoàn chỉnh -> Phê duyệt và công khai (COMPLETED)
     */
    @Transactional
    public DestinationRequestResponse approveContent(Long requestId, Long moderatorId, ContentApproveDecisionRequest dto) {
        PartnerDestinationRequest request = findRequestOrThrow(requestId);
        if (request.getStatus() != DestinationRequestStatus.PENDING_CONTENT_REVIEW) {
            throw new AppException(ErrorCode.INVALID_DESTINATION_REQUEST_STATUS,
                    "Chỉ có thể phê duyệt nội dung khi yêu cầu đang ở trạng thái PENDING_CONTENT_REVIEW");
        }

        if (request.getDestination() == null) {
            throw new AppException(ErrorCode.DESTINATION_REQUEST_DESTINATION_REQUIRED);
        }

        User moderator = findUserOrThrow(moderatorId);
        Destination destination = request.getDestination();

        // Xuất bản Destination trên hệ thống JourneyGo
        destination.setStatus(DestinationStatus.PUBLISHED);
        destination.setApproved(true);
        destinationRepository.save(destination);

        DestinationRequestStatus previousStatus = request.getStatus();
        request.setStatus(DestinationRequestStatus.COMPLETED);
        request.setContentModerator(moderator);
        request.setContentReviewNote(dto != null ? dto.note() : null);
        request.setContentRejectionReason(null);
        request.setContentReviewedAt(Instant.now());
        request.setCompletedAt(Instant.now());

        PartnerDestinationRequest saved = requestRepository.save(request);
        addHistory(saved, moderator, DestinationRequestAction.CONTENT_APPROVED, previousStatus,
                DestinationRequestStatus.COMPLETED, dto != null ? dto.note() : null, "Đã duyệt nội dung và xuất bản điểm đến");

        // 1. Thông báo cho Partner (Địa điểm đã chính thức công khai trên JourneyGo)
        notifications.send(NotificationType.DESTINATION_REQUEST_COMPLETED)
                .to(request.getPartner().getId())
                .title("Điểm đến của bạn đã được xuất bản!")
                .body("Điểm đến " + NotificationPublisher.quote(destination.getName()) +
                        " đã được phát hành chính thức trên JourneyGo. Du khách có thể khám phá và trải nghiệm ngay!")
                .link("/destinations/" + destination.getId())
                .ref("DESTINATION", destination.getId())
                .publish();

        // 2. Thông báo cho CP (Nội dung bạn thiết kế đã được duyệt thành công)
        if (request.getAssignedCp() != null) {
            notifications.send(NotificationType.DESTINATION_APPROVED)
                    .to(request.getAssignedCp().getId())
                    .title("Nội dung điểm đến đã được duyệt")
                    .body("Nội dung điểm đến " + NotificationPublisher.quote(destination.getName()) + " do bạn xây dựng đã được kiểm duyệt xuất sắc và phát hành.")
                    .link("/provider/destinations/" + destination.getId())
                    .ref("DESTINATION", destination.getId())
                    .publish();
        }

        return DestinationRequestResponse.fromEntity(saved);
    }

    /**
     * 6. Lần 2: Moderator từ chối nội dung -> Trả về IN_PROGRESS kèm feedback cho CP
     */
    @Transactional
    public DestinationRequestResponse rejectContent(Long requestId, Long moderatorId, ContentRejectDecisionRequest dto) {
        PartnerDestinationRequest request = findRequestOrThrow(requestId);
        if (request.getStatus() != DestinationRequestStatus.PENDING_CONTENT_REVIEW) {
            throw new AppException(ErrorCode.INVALID_DESTINATION_REQUEST_STATUS,
                    "Chỉ có thể từ chối nội dung khi yêu cầu đang ở trạng thái PENDING_CONTENT_REVIEW");
        }

        if (dto == null || ((dto.rejectionReason() == null || dto.rejectionReason().isBlank()) && (dto.note() == null || dto.note().isBlank()))) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Vui lòng nhập lý do và hướng dẫn chỉnh sửa cho Content Provider");
        }

        User moderator = findUserOrThrow(moderatorId);
        DestinationRequestStatus previousStatus = request.getStatus();

        // Trả về IN_PROGRESS để CP sửa
        request.setStatus(DestinationRequestStatus.IN_PROGRESS);
        request.setContentModerator(moderator);
        request.setContentRejectionReason(dto.rejectionReason());
        request.setContentReviewNote(dto.note());
        request.setContentReviewedAt(Instant.now());

        PartnerDestinationRequest saved = requestRepository.save(request);
        addHistory(saved, moderator, DestinationRequestAction.CONTENT_REJECTED, previousStatus,
                DestinationRequestStatus.IN_PROGRESS, dto.note(), dto.rejectionReason());

        // Thông báo phản hồi cho CP
        if (request.getAssignedCp() != null) {
            notifications.send(NotificationType.DESTINATION_REQUEST_CONTENT_REJECTED)
                    .to(request.getAssignedCp().getId())
                    .title("Nội dung điểm đến cần chỉnh sửa thêm")
                    .body(NotificationPublisher.withNote(
                            "Nội dung điểm đến " + NotificationPublisher.quote(saved.getDestinationName()) +
                                    " cần điều chỉnh. Lý do: " + (dto.rejectionReason() != null ? dto.rejectionReason() : ""),
                            dto.note()))
                    .link("/provider/destination-requests/" + saved.getId())
                    .ref("DESTINATION_REQUEST", saved.getId())
                    .publish();
        }

        return DestinationRequestResponse.fromEntity(saved);
    }

    /**
     * 7. Partner (hoặc Admin) hủy/rút yêu cầu (CANCELLED)
     */
    @Transactional
    public DestinationRequestResponse cancelRequest(Long requestId, Long callerId, Role callerRole, CancelDestinationProposalRequest dto) {
        PartnerDestinationRequest request = findRequestOrThrow(requestId);

        // Chỉ Partner sở hữu hoặc ADMIN mới có quyền hủy
        boolean isAdmin = callerRole != null && Role.ADMIN.equals(callerRole.getName());
        boolean isOwner = request.getPartner().getId().equals(callerId);
        if (!isAdmin && !isOwner) {
            throw new AppException(ErrorCode.UNAUTHORIZED, "Bạn không có quyền hủy yêu cầu này");
        }

        // Không cho phép hủy khi đã xong hoặc đã hủy
        if (request.getStatus() == DestinationRequestStatus.COMPLETED || request.getStatus() == DestinationRequestStatus.CANCELLED) {
            throw new AppException(ErrorCode.DESTINATION_REQUEST_CANNOT_CANCEL, "Yêu cầu đã hoàn tất hoặc đã bị hủy trước đó");
        }

        User actor = findUserOrThrow(callerId);
        DestinationRequestStatus previousStatus = request.getStatus();
        request.setStatus(DestinationRequestStatus.CANCELLED);
        request.setCancelledAt(Instant.now());
        request.setCancellationReason(dto != null ? dto.reason() : null);

        PartnerDestinationRequest saved = requestRepository.save(request);
        addHistory(saved, actor, DestinationRequestAction.CANCELLED, previousStatus,
                DestinationRequestStatus.CANCELLED, dto != null ? dto.reason() : null, "Đối tác rút yêu cầu đề xuất điểm đến");

        return DestinationRequestResponse.fromEntity(saved);
    }

    /**
     * Tra cứu chi tiết
     */
    @Transactional(readOnly = true)
    public DestinationRequestResponse getById(Long id, Long callerId, Role callerRole) {
        PartnerDestinationRequest request = findRequestOrThrow(id);
        checkReadPermission(request, callerId, callerRole);
        return DestinationRequestResponse.fromEntity(request);
    }

    /**
     * Lấy danh sách chung (ADMIN & MODERATOR xem tất cả; PARTNER xem của mình; CP xem được giao)
     */
    @Transactional(readOnly = true)
    public PageResponse<DestinationRequestResponse> getAll(DestinationRequestStatus status, String search, Pageable pageable, Long callerId, Role callerRole) {
        String roleName = callerRole != null ? callerRole.getName() : "";
        if (Role.ADMIN.equals(roleName) || Role.MODERATOR.equals(roleName)) {
            return PageResponse.from(requestRepository.searchRequests(status, search, pageable), DestinationRequestResponse::fromEntity);
        } else if (Role.PARTNER.equals(roleName)) {
            return PageResponse.from(requestRepository.searchMyRequests(callerId, status, search, pageable), DestinationRequestResponse::fromEntity);
        } else if (Role.PROVIDER.equals(roleName)) {
            return PageResponse.from(requestRepository.searchAssignedToCp(callerId, status, search, pageable), DestinationRequestResponse::fromEntity);
        }
        return PageResponse.from(requestRepository.searchMyRequests(callerId, status, search, pageable), DestinationRequestResponse::fromEntity);
    }

    /**
     * Hàng chờ 1: Kiểm duyệt tính hợp lệ ban đầu (SUBMITTED, UNDER_REVIEW)
     */
    @Transactional(readOnly = true)
    public PageResponse<DestinationRequestResponse> getQueueInitialReview(Pageable pageable) {
        return PageResponse.from(
                requestRepository.findByStatusIn(List.of(DestinationRequestStatus.SUBMITTED, DestinationRequestStatus.UNDER_REVIEW), pageable),
                DestinationRequestResponse::fromEntity
        );
    }

    /**
     * Hàng chờ 2: Chờ Admin phân công CP (APPROVED)
     */
    @Transactional(readOnly = true)
    public PageResponse<DestinationRequestResponse> getQueueAssignment(Pageable pageable) {
        return PageResponse.from(
                requestRepository.findByStatus(DestinationRequestStatus.APPROVED, pageable),
                DestinationRequestResponse::fromEntity
        );
    }

    /**
     * Hàng chờ 3: Kiểm duyệt chất lượng nội dung hoàn chỉnh (PENDING_CONTENT_REVIEW)
     */
    @Transactional(readOnly = true)
    public PageResponse<DestinationRequestResponse> getQueueContentReview(Pageable pageable) {
        return PageResponse.from(
                requestRepository.findByStatus(DestinationRequestStatus.PENDING_CONTENT_REVIEW, pageable),
                DestinationRequestResponse::fromEntity
        );
    }

    /**
     * Lấy danh sách đề xuất do chính Partner hiện tại gửi
     */
    @Transactional(readOnly = true)
    public PageResponse<DestinationRequestResponse> getMyRequests(Long partnerId, DestinationRequestStatus status, String search, Pageable pageable) {
        return PageResponse.from(
                requestRepository.searchMyRequests(partnerId, status, search, pageable),
                DestinationRequestResponse::fromEntity
        );
    }

    /**
     * Lấy danh sách công việc biên tập được giao cho Content Provider
     */
    @Transactional(readOnly = true)
    public PageResponse<DestinationRequestResponse> getAssignedToCp(Long cpId, DestinationRequestStatus status, String search, Pageable pageable) {
        return PageResponse.from(
                requestRepository.searchAssignedToCp(cpId, status, search, pageable),
                DestinationRequestResponse::fromEntity
        );
    }

    // ── Helper methods ────────────────────────────────────────────────────────

    private void addHistory(PartnerDestinationRequest request, User actor, DestinationRequestAction action,
                            DestinationRequestStatus fromStatus, DestinationRequestStatus toStatus,
                            String note, String reason) {
        DestinationRequestHistory history = DestinationRequestHistory.builder()
                .request(request)
                .actor(actor)
                .action(action)
                .fromStatus(fromStatus)
                .toStatus(toStatus)
                .note(note)
                .reason(reason)
                .build();
        historyRepository.save(history);
    }

    private PartnerDestinationRequest findRequestOrThrow(Long id) {
        return requestRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.DESTINATION_REQUEST_NOT_FOUND));
    }

    private User findUserOrThrow(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));
    }

    private void checkCpAssignment(PartnerDestinationRequest request, Long callerId) {
        boolean isAssigned = request.getAssignedCp() != null && request.getAssignedCp().getId().equals(callerId);
        if (!isAssigned) {
            User caller = findUserOrThrow(callerId);
            boolean isAdmin = caller.getRole() != null && Role.ADMIN.equals(caller.getRole().getName());
            if (!isAdmin) {
                throw new AppException(ErrorCode.UNAUTHORIZED, "Bạn không phải là Content Provider được phân công cho yêu cầu này");
            }
        }
    }

    private void checkReadPermission(PartnerDestinationRequest request, Long callerId, Role callerRole) {
        String roleName = callerRole != null ? callerRole.getName() : "";
        if (Role.ADMIN.equals(roleName) || Role.MODERATOR.equals(roleName)) return;
        if (request.getPartner().getId().equals(callerId)) return;
        if (request.getAssignedCp() != null && request.getAssignedCp().getId().equals(callerId)) return;
        throw new AppException(ErrorCode.UNAUTHORIZED, "Bạn không có quyền truy cập yêu cầu này");
    }
}
