package com.journeygo.modules.tourrequest.service;

import com.journeygo.common.dto.PageResponse;
import com.journeygo.common.exception.AppException;
import com.journeygo.common.exception.ErrorCode;
import com.journeygo.modules.notification.entity.enums.NotificationType;
import com.journeygo.modules.notification.service.NotificationPublisher;
import com.journeygo.modules.providerprofile.service.ProviderProfileService;
import com.journeygo.modules.tourrequest.dto.CreateTourRequestRequest;
import com.journeygo.modules.tourrequest.dto.TourRequestResponse;
import com.journeygo.modules.tourrequest.entity.TourRequest;
import com.journeygo.modules.tourrequest.entity.enums.TourRequestStatus;
import com.journeygo.modules.tourrequest.repository.TourRequestRepository;
import com.journeygo.modules.user.entity.Role;
import com.journeygo.modules.user.entity.User;
import com.journeygo.modules.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

@Slf4j
@Service
@RequiredArgsConstructor
public class TourRequestService {

    private final TourRequestRepository tourRequestRepository;
    private final UserRepository userRepository;
    private final ProviderProfileService providerProfileService;
    private final NotificationPublisher notifications;

    /**
     * Du khách đăng bài yêu cầu tạo tour riêng.
     */
    @Transactional
    public TourRequestResponse create(CreateTourRequestRequest request, Long requesterId) {
        User requester = userRepository.findById(requesterId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));

        if (request.preferredDateFrom() != null && request.preferredDateTo() != null
                && request.preferredDateTo().isBefore(request.preferredDateFrom())) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Ngày kết thúc phải bằng hoặc sau ngày bắt đầu");
        }

        if (request.budgetMin() != null && request.budgetMax() != null
                && request.budgetMax().compareTo(request.budgetMin()) < 0) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Ngân sách tối đa phải lớn hơn hoặc bằng ngân sách tối thiểu");
        }

        TourRequest tourRequest = TourRequest.builder()
                .requester(requester)
                .title(request.title().trim())
                .description(request.description().trim())
                .preferredDestination(request.preferredDestination() != null ? request.preferredDestination().trim() : null)
                .preferredDateFrom(request.preferredDateFrom())
                .preferredDateTo(request.preferredDateTo())
                .guestCount(request.guestCount())
                .budgetMin(request.budgetMin())
                .budgetMax(request.budgetMax())
                .specialRequirements(request.specialRequirements() != null ? request.specialRequirements().trim() : null)
                .status(TourRequestStatus.OPEN)
                .build();

        TourRequest saved = tourRequestRepository.save(tourRequest);
        log.info("Tourist id={} created tour request id={}", requesterId, saved.getId());

        // Gửi thông báo đến tất cả Content Provider
        notifications.send(NotificationType.TOUR_REQUEST_NEW)
                .toRole(Role.CONTENT_PROVIDER)
                .title("Yêu cầu tạo tour theo nhu cầu mới")
                .body("Du khách " + requester.getFullName() + " vừa đăng yêu cầu: " + NotificationPublisher.quote(saved.getTitle()))
                .link("/provider/tour-requests/" + saved.getId())
                .ref("TOUR_REQUEST", saved.getId())
                .publish();

        return TourRequestResponse.fromEntity(saved);
    }

    /**
     * Danh sách yêu cầu của chính du khách (phân trang).
     */
    @Transactional(readOnly = true)
    public PageResponse<TourRequestResponse> getMyRequests(Long requesterId, Pageable pageable) {
        Page<TourRequest> page = tourRequestRepository.findByRequester_Id(requesterId, pageable);
        return PageResponse.from(page, TourRequestResponse::fromEntity);
    }

    /**
     * Chi tiết yêu cầu tạo tour.
     */
    @Transactional(readOnly = true)
    public TourRequestResponse getDetail(Long requestId, Long callerId) {
        TourRequest tr = tourRequestRepository.findById(requestId)
                .orElseThrow(() -> new AppException(ErrorCode.TOUR_REQUEST_NOT_FOUND));

        return TourRequestResponse.fromEntity(tr);
    }

    /**
     * Du khách hủy yêu cầu (chỉ khi còn ở trạng thái OPEN).
     */
    @Transactional
    public void cancel(Long requestId, Long requesterId) {
        TourRequest tr = tourRequestRepository.findById(requestId)
                .orElseThrow(() -> new AppException(ErrorCode.TOUR_REQUEST_NOT_FOUND));

        if (!tr.getRequester().getId().equals(requesterId)) {
            throw new AppException(ErrorCode.TOUR_REQUEST_NOT_OWNER);
        }

        if (tr.getStatus() != TourRequestStatus.OPEN) {
            throw new AppException(ErrorCode.TOUR_REQUEST_INVALID_STATUS,
                    "Chỉ có thể hủy yêu cầu khi chưa có đối tác nhận");
        }

        tr.setStatus(TourRequestStatus.CANCELLED);
        tourRequestRepository.save(tr);
        log.info("Tourist id={} cancelled tour request id={}", requesterId, requestId);
    }

    /**
     * Đối tác (Content Provider): Danh sách yêu cầu đang OPEN để nhận.
     */
    @Transactional(readOnly = true)
    public PageResponse<TourRequestResponse> listOpenRequests(Pageable pageable) {
        Page<TourRequest> page = tourRequestRepository.findByStatus(TourRequestStatus.OPEN, pageable);
        return PageResponse.from(page, TourRequestResponse::fromEntity);
    }

    /**
     * Đối tác (Content Provider): Danh sách yêu cầu mà chính đối tác đã nhận.
     */
    @Transactional(readOnly = true)
    public PageResponse<TourRequestResponse> listMyAcceptedRequests(Long providerId, Pageable pageable) {
        Page<TourRequest> page = tourRequestRepository.findByAcceptedBy_Id(providerId, pageable);
        return PageResponse.from(page, TourRequestResponse::fromEntity);
    }

    /**
     * Đối tác bấm nhận yêu cầu tour (First come, first served).
     */
    @Transactional
    public TourRequestResponse acceptRequest(Long requestId, Long providerId) {
        User provider = userRepository.findById(providerId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));

        // Kiểm tra đối tác đã được Admin phê duyệt tài khoản chưa
        providerProfileService.requireCanManageTours(providerId);

        TourRequest tr = tourRequestRepository.findById(requestId)
                .orElseThrow(() -> new AppException(ErrorCode.TOUR_REQUEST_NOT_FOUND));

        if (tr.getStatus() != TourRequestStatus.OPEN) {
            throw new AppException(ErrorCode.TOUR_REQUEST_ALREADY_ACCEPTED);
        }

        tr.setStatus(TourRequestStatus.ACCEPTED);
        tr.setAcceptedBy(provider);
        tr.setAcceptedAt(Instant.now());

        TourRequest saved = tourRequestRepository.save(tr);
        log.info("Provider id={} accepted tour request id={}", providerId, requestId);

        // Gửi thông báo cho du khách yêu cầu
        notifications.send(NotificationType.TOUR_REQUEST_ACCEPTED)
                .to(tr.getRequester().getId())
                .title("Đối tác đã nhận yêu cầu tạo tour của bạn")
                .body(provider.getFullName() + " đã nhận yêu cầu "
                        + NotificationPublisher.quote(tr.getTitle()) + " và đang chuẩn bị lịch trình theo yêu cầu của bạn.")
                .link("/tour-requests/" + tr.getId())
                .ref("TOUR_REQUEST", tr.getId())
                .publish();

        return TourRequestResponse.fromEntity(saved);
    }
}
