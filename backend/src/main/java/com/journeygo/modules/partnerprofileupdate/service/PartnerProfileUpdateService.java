package com.journeygo.modules.partnerprofileupdate.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.journeygo.common.exception.AppException;
import com.journeygo.common.exception.ErrorCode;
import com.journeygo.modules.notification.service.NotificationPublisher;
import com.journeygo.modules.partnerapplication.entity.PartnerApplication;
import com.journeygo.modules.partnerapplication.entity.enums.RepresentativePosition;
import com.journeygo.modules.partnerapplication.repository.PartnerApplicationRepository;
import com.journeygo.modules.partnerprofileupdate.dto.request.PartnerProfileUpdateDecisionRequest;
import com.journeygo.modules.partnerprofileupdate.dto.request.PartnerProfileUpdateSubmitRequest;
import com.journeygo.modules.partnerprofileupdate.dto.request.RejectPartnerProfileUpdateRequest;
import com.journeygo.modules.partnerprofileupdate.dto.response.PartnerProfileInfoResponse;
import com.journeygo.modules.partnerprofileupdate.dto.response.PartnerProfileUpdateHistoryResponse;
import com.journeygo.modules.partnerprofileupdate.dto.response.PartnerProfileUpdateResponse;
import com.journeygo.modules.partnerprofileupdate.entity.PartnerProfileUpdateHistory;
import com.journeygo.modules.partnerprofileupdate.entity.PartnerProfileUpdateRequest;
import com.journeygo.modules.partnerprofileupdate.entity.enums.PartnerProfileUpdateAction;
import com.journeygo.modules.partnerprofileupdate.entity.enums.PartnerProfileUpdateStatus;
import com.journeygo.modules.partnerprofileupdate.repository.PartnerProfileUpdateHistoryRepository;
import com.journeygo.modules.partnerprofileupdate.repository.PartnerProfileUpdateRequestRepository;
import com.journeygo.modules.partnerprofileupdate.support.PartnerProfileFields;
import com.journeygo.modules.providerprofile.entity.ProviderProfile;
import com.journeygo.modules.providerprofile.repository.ProviderProfileRepository;
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
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;

/**
 * Nghiệp vụ "Yêu cầu đổi thông tin đối tác".
 *
 * <p>Luồng đối tác:
 * <ol>
 *   <li>Đọc hồ sơ hiện tại + trạng thái yêu cầu: {@link #getMyProfileInfo}.</li>
 *   <li>Bấm "Yêu cầu chỉnh sửa thông tin" ⇒ {@link #submit} tạo bản ghi PENDING
 *       và gửi sang Dashboard Admin.</li>
 *   <li>Trong lúc chờ duyệt: đối tác vẫn hoạt động với thông tin cũ, không tạo được yêu cầu mới.</li>
 * </ol>
 *
 * <p>Luồng Admin:
 * <ol>
 *   <li>{@link #approve} — ghi đè thông tin mới vào hồ sơ chính thức (đơn đăng ký + User + ProviderProfile).</li>
 *   <li>{@link #reject} — giữ nguyên hồ sơ cũ, lưu lý do từ chối hiển thị cho đối tác.</li>
 * </ol>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PartnerProfileUpdateService {

    private final PartnerProfileUpdateRequestRepository requestRepository;
    private final PartnerProfileUpdateHistoryRepository historyRepository;
    private final PartnerApplicationRepository applicationRepository;
    private final ProviderProfileRepository providerProfileRepository;
    private final UserRepository userRepository;
    private final NotificationPublisher notifications;
    private final ObjectMapper objectMapper;

    // ═══════════════════════════════════════════════════════════════════════════
    //  ĐỐI TÁC — ĐỌC & GỬI YÊU CẦU
    // ═══════════════════════════════════════════════════════════════════════════

    /** Hồ sơ hiện tại + yêu cầu đang chờ + yêu cầu gần nhất (để hiện lý do từ chối). */
    @Transactional(readOnly = true)
    public PartnerProfileInfoResponse getMyProfileInfo(Long partnerUserId) {
        User partner = userRepository.findById(partnerUserId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));

        PartnerApplication application = findApprovedApplication(partner);
        Map<String, String> profile = application != null
                ? PartnerProfileFields.fromApplication(application)
                : fallbackProfile(partner);

        PartnerProfileUpdateRequest pending = requestRepository
                .findFirstByPartner_IdAndStatusOrderByCreatedAtDesc(
                        partnerUserId, PartnerProfileUpdateStatus.PENDING)
                .orElse(null);

        List<PartnerProfileUpdateRequest> all = requestRepository.findByPartner_IdOrderByCreatedAtDesc(partnerUserId);
        PartnerProfileUpdateRequest last = all.isEmpty() ? null : all.get(0);

        PartnerProfileUpdateResponse pendingResponse = pending == null ? null
                : buildResponse(pending);
        PartnerProfileUpdateResponse lastResponse = (last == null || last.equals(pending)) ? null
                : buildResponse(last);

        // Toàn bộ lịch sử của đối tác — nối liền qua mọi yêu cầu (không mất lịch sử cũ
        // khi đối tác gửi yêu cầu lần 2, 3…).
        List<PartnerProfileUpdateHistoryResponse> history =
                historyRepository.findByRequest_Partner_IdOrderByCreatedAtDesc(partnerUserId).stream()
                        .map(PartnerProfileUpdateHistoryResponse::fromEntity)
                        .toList();

        return new PartnerProfileInfoResponse(
                profile,
                application == null ? null : application.getId(),
                pendingResponse,
                lastResponse,
                history,
                pending == null
        );
    }

    /**
     * Đối tác gửi yêu cầu đổi thông tin.
     *
     * <p>Chặn tạo yêu cầu thứ 2 khi yêu cầu thứ nhất chưa được duyệt/từ chối.
     */
    @Transactional
    public PartnerProfileUpdateResponse submit(Long partnerUserId, PartnerProfileUpdateSubmitRequest request) {
        User partner = userRepository.findById(partnerUserId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));

        requestRepository.findFirstByPartner_IdAndStatusOrderByCreatedAtDesc(
                        partnerUserId, PartnerProfileUpdateStatus.PENDING)
                .ifPresent(existing -> {
                    throw new AppException(ErrorCode.PARTNER_PROFILE_UPDATE_PENDING_EXISTS,
                            "Hệ thống đang xem xét yêu cầu thay đổi thông tin của bạn. "
                                    + "Trong thời gian này, bạn không thể tạo thêm yêu cầu mới.");
                });

        PartnerApplication application = findApprovedApplication(partner);
        if (application == null) {
            throw new AppException(ErrorCode.PARTNER_PROFILE_UPDATE_NO_PROFILE,
                    "Chưa tìm thấy hồ sơ đối tác đã được duyệt để thực hiện thay đổi thông tin.");
        }

        Map<String, String> oldData = PartnerProfileFields.fromApplication(application);
        Map<String, String> newData = PartnerProfileFields.fromSubmitRequest(request);

        List<String> changed = PartnerProfileFields.changedFields(oldData, newData);
        if (changed.isEmpty()) {
            throw new AppException(ErrorCode.PARTNER_PROFILE_UPDATE_NO_CHANGE,
                    "Không có thay đổi nào để gửi. Vui lòng chỉnh sửa ít nhất một trường.");
        }

        ProviderProfile profile = providerProfileRepository.findByUser_Id(partnerUserId).orElse(null);

        PartnerProfileUpdateRequest entity = PartnerProfileUpdateRequest.builder()
                .partner(partner)
                .applicationId(application.getId())
                .providerProfileId(profile == null ? null : profile.getId())
                .status(PartnerProfileUpdateStatus.PENDING)
                .oldData(writeJson(oldData))
                .newData(writeJson(newData))
                .changedFields(writeJson(changed))
                .partnerNote(request == null ? null : trimToNull(request.note()))
                .submittedAt(Instant.now())
                .build();

        PartnerProfileUpdateRequest saved = requestRepository.save(entity);

        historyRepository.save(PartnerProfileUpdateHistory.builder()
                .request(saved)
                .actor(partner)
                .action(PartnerProfileUpdateAction.SUBMITTED)
                .statusBefore(null)
                .statusAfter(PartnerProfileUpdateStatus.PENDING)
                .reason("Đối tác gửi yêu cầu thay đổi thông tin")
                .build());

        // Báo cho Admin có hàng chờ cần xử lý.
        notifications.send(com.journeygo.modules.notification.entity.enums.NotificationType.PARTNER_PROFILE_UPDATE_PENDING)
                .toRole(Role.ADMIN)
                .title("Yêu cầu đổi thông tin đối tác mới")
                .body(NotificationPublisher.quote(application.getBusinessName())
                        + " đã gửi yêu cầu thay đổi thông tin hồ sơ.")
                .link("/admin/partner-profile-updates")
                .ref("PARTNER_PROFILE_UPDATE", saved.getId())
                .queue(NotificationPublisher.Queue.PARTNER_PROFILE_UPDATE)
                .publish();

        log.info("[PartnerProfileUpdate] Đối tác user={} gửi yêu cầu #{} ({} trường thay đổi)",
                partnerUserId, saved.getId(), changed.size());

        return buildResponse(saved);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    //  ADMIN — DANH SÁCH & XỬ LÝ
    // ═══════════════════════════════════════════════════════════════════════════

    @Transactional(readOnly = true)
    public Page<PartnerProfileUpdateResponse> getQueue(PartnerProfileUpdateStatus status, Pageable pageable) {
        Page<PartnerProfileUpdateRequest> page = (status != null)
                ? requestRepository.findByStatus(status, pageable)
                : requestRepository.findAllByOrderByCreatedAtDesc(pageable);
        return page.map(this::buildResponse);
    }

    @Transactional(readOnly = true)
    public Map<String, Long> getStats() {
        Map<String, Long> stats = new LinkedHashMap<>();
        for (PartnerProfileUpdateStatus s : PartnerProfileUpdateStatus.values()) {
            stats.put(s.name(), requestRepository.countByStatus(s));
        }
        return stats;
    }

    @Transactional(readOnly = true)
    public PartnerProfileUpdateResponse getById(Long requestId) {
        return buildResponse(findOrThrow(requestId));
    }

    /**
     * Admin duyệt yêu cầu ⇒ ghi đè thông tin mới vào hồ sơ chính thức.
     */
    @Transactional
    public PartnerProfileUpdateResponse approve(Long requestId, PartnerProfileUpdateDecisionRequest request,
                                                 Long adminId) {
        PartnerProfileUpdateRequest entity = findOrThrow(requestId);
        if (entity.getStatus() != PartnerProfileUpdateStatus.PENDING) {
            throw new AppException(ErrorCode.PARTNER_PROFILE_UPDATE_INVALID_STATUS,
                    "Chỉ duyệt được yêu cầu đang ở trạng thái chờ duyệt");
        }

        Map<String, String> oldData = readMap(entity.getOldData());
        Map<String, String> newData = readMap(entity.getNewData());

        applyToOfficialProfile(entity, newData);

        entity.setStatus(PartnerProfileUpdateStatus.APPROVED);
        entity.setReviewerId(adminId);
        entity.setReviewedAt(Instant.now());
        entity.setAdminNote(request == null ? null : trimToNull(request.note()));
        entity.setReason(null);
        PartnerProfileUpdateRequest saved = requestRepository.save(entity);

        historyRepository.save(PartnerProfileUpdateHistory.builder()
                .request(saved)
                .actor(userRepository.getReferenceById(adminId))
                .action(PartnerProfileUpdateAction.APPROVED)
                .statusBefore(PartnerProfileUpdateStatus.PENDING)
                .statusAfter(PartnerProfileUpdateStatus.APPROVED)
                .reason("Thông tin mới đã được ghi đè vào hồ sơ chính thức")
                .build());

        notifyPartner(saved, oldData, newData, true, null);

        log.info("[PartnerProfileUpdate] Admin {} duyệt yêu cầu #{}", adminId, saved.getId());
        return buildResponse(saved);
    }

    /**
     * Admin từ chối yêu cầu — bắt buộc có lý do; hồ sơ cũ giữ nguyên.
     */
    @Transactional
    public PartnerProfileUpdateResponse reject(Long requestId, RejectPartnerProfileUpdateRequest request,
                                               Long adminId) {
        PartnerProfileUpdateRequest entity = findOrThrow(requestId);
        if (entity.getStatus() != PartnerProfileUpdateStatus.PENDING) {
            throw new AppException(ErrorCode.PARTNER_PROFILE_UPDATE_INVALID_STATUS,
                    "Chỉ từ chối được yêu cầu đang ở trạng thái chờ duyệt");
        }
        if (request == null || request.reason() == null || request.reason().isBlank()) {
            throw new AppException(ErrorCode.PARTNER_PROFILE_UPDATE_REASON_REQUIRED);
        }

        entity.setStatus(PartnerProfileUpdateStatus.REJECTED);
        entity.setReviewerId(adminId);
        entity.setReviewedAt(Instant.now());
        entity.setReason(request.reason().trim());
        PartnerProfileUpdateRequest saved = requestRepository.save(entity);

        historyRepository.save(PartnerProfileUpdateHistory.builder()
                .request(saved)
                .actor(userRepository.getReferenceById(adminId))
                .action(PartnerProfileUpdateAction.REJECTED)
                .statusBefore(PartnerProfileUpdateStatus.PENDING)
                .statusAfter(PartnerProfileUpdateStatus.REJECTED)
                .reason(saved.getReason())
                .build());

        notifyPartner(saved, readMap(entity.getOldData()), readMap(entity.getNewData()), false, saved.getReason());

        log.info("[PartnerProfileUpdate] Admin {} từ chối yêu cầu #{}", adminId, saved.getId());
        return buildResponse(saved);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    //  HELPERS
    // ═══════════════════════════════════════════════════════════════════════════

    /** Ghi đè thông tin mới vào hồ sơ chính thức: đơn đăng ký + User + ProviderProfile. */
    private void applyToOfficialProfile(PartnerProfileUpdateRequest entity, Map<String, String> newData) {
        if (newData == null || newData.isEmpty()) {
            return;
        }

        // 1. Đơn đăng ký đã duyệt — nguồn dữ liệu chính thức của hồ sơ đối tác.
        if (entity.getApplicationId() != null) {
            applicationRepository.findById(entity.getApplicationId()).ifPresent(app -> {
                applyToApplication(app, newData);
                applicationRepository.save(app);
            });
        }

        // 2. Tài khoản User — họ tên & số điện thoại người đại diện.
        User partner = entity.getPartner();
        if (partner != null) {
            String repName = newData.get(PartnerProfileFields.REPRESENTATIVE_NAME);
            if (repName != null && !repName.isBlank()) {
                partner.setFullName(repName.trim());
            }
            String phone = newData.get(PartnerProfileFields.PHONE);
            if (phone != null && !phone.isBlank()) {
                partner.setPhone(phone.trim());
            }
            userRepository.save(partner);
        }

        // 3. Hồ sơ ProviderProfile — tên hiển thị của đối tác.
        if (partner != null) {
            providerProfileRepository.findByUser_Id(partner.getId()).ifPresent(profile -> {
                String businessName = newData.get(PartnerProfileFields.BUSINESS_NAME);
                if (businessName != null && !businessName.isBlank()) {
                    profile.setProviderName(businessName.trim());
                    providerProfileRepository.save(profile);
                }
            });
        }
    }

    private void applyToApplication(PartnerApplication app, Map<String, String> newData) {
        if (newData.containsKey(PartnerProfileFields.PHONE)) {
            app.setPhone(newData.get(PartnerProfileFields.PHONE));
        }
        if (newData.containsKey(PartnerProfileFields.REPRESENTATIVE_NAME)) {
            app.setRepresentativeName(newData.get(PartnerProfileFields.REPRESENTATIVE_NAME));
        }
        if (newData.containsKey(PartnerProfileFields.REPRESENTATIVE_POSITION)) {
            app.setRepresentativePosition(resolvePosition(newData.get(PartnerProfileFields.REPRESENTATIVE_POSITION)));
        }
        if (newData.containsKey(PartnerProfileFields.BUSINESS_NAME)) {
            app.setBusinessName(newData.get(PartnerProfileFields.BUSINESS_NAME));
        }
        if (newData.containsKey(PartnerProfileFields.TAX_CODE)) {
            app.setTaxCode(newData.get(PartnerProfileFields.TAX_CODE));
        }
        if (newData.containsKey(PartnerProfileFields.BUSINESS_REGISTRATION_INFO)) {
            app.setBusinessRegistrationInfo(newData.get(PartnerProfileFields.BUSINESS_REGISTRATION_INFO));
        }
        if (newData.containsKey(PartnerProfileFields.PROVINCE)) {
            app.setProvince(newData.get(PartnerProfileFields.PROVINCE));
        }
        if (newData.containsKey(PartnerProfileFields.WARD)) {
            app.setWard(newData.get(PartnerProfileFields.WARD));
        }
        if (newData.containsKey(PartnerProfileFields.ADDRESS_DETAIL)) {
            app.setAddressDetail(newData.get(PartnerProfileFields.ADDRESS_DETAIL));
        }
        if (newData.containsKey(PartnerProfileFields.BUSINESS_SCOPE)) {
            app.setBusinessScope(newData.get(PartnerProfileFields.BUSINESS_SCOPE));
        }
        if (newData.containsKey(PartnerProfileFields.BANK_NAME)) {
            app.setBankName(newData.get(PartnerProfileFields.BANK_NAME));
        }
        if (newData.containsKey(PartnerProfileFields.BANK_ACCOUNT_NUMBER)) {
            app.setBankAccountNumber(newData.get(PartnerProfileFields.BANK_ACCOUNT_NUMBER));
        }
        if (newData.containsKey(PartnerProfileFields.BANK_ACCOUNT_HOLDER)) {
            app.setBankAccountHolder(newData.get(PartnerProfileFields.BANK_ACCOUNT_HOLDER));
        }
    }

    /** Chấp nhận cả tên enum (OWNER) lẫn nhãn tiếng Việt (Chủ doanh nghiệp). */
    private RepresentativePosition resolvePosition(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        String trimmed = value.trim();
        for (RepresentativePosition p : RepresentativePosition.values()) {
            if (p.name().equalsIgnoreCase(trimmed) || p.getLabel().equalsIgnoreCase(trimmed)) {
                return p;
            }
        }
        return null;
    }

    private void notifyPartner(PartnerProfileUpdateRequest saved,
                               Map<String, String> oldData,
                               Map<String, String> newData,
                               boolean approved,
                               String reason) {
        if (saved.getPartner() == null) {
            return;
        }
        int changedCount = 0;
        try {
            changedCount = PartnerProfileFields.changedFields(oldData, newData).size();
        } catch (Exception ignored) {
            // Không chặn nghiệp vụ vì lỗi tính số trường.
        }

        if (approved) {
            notifications.send(com.journeygo.modules.notification.entity.enums.NotificationType.PARTNER_PROFILE_UPDATE_APPROVED)
                    .to(saved.getPartner().getId())
                    .title("Yêu cầu thay đổi thông tin đã được duyệt")
                    .body("Thông tin hồ sơ đối tác của bạn đã được cập nhật (" + changedCount + " trường).")
                    .link("/provider/partner-info")
                    .ref("PARTNER_PROFILE_UPDATE", saved.getId())
                    .publish();
        } else {
            notifications.send(com.journeygo.modules.notification.entity.enums.NotificationType.PARTNER_PROFILE_UPDATE_REJECTED)
                    .to(saved.getPartner().getId())
                    .title("Yêu cầu thay đổi thông tin bị từ chối")
                    .body("Lý do từ chối: " + (reason == null ? "Không nêu rõ" : reason))
                    .link("/provider/partner-info")
                    .ref("PARTNER_PROFILE_UPDATE", saved.getId())
                    .publish();
        }
    }

    private PartnerProfileUpdateResponse buildResponse(PartnerProfileUpdateRequest entity) {
        List<PartnerProfileUpdateHistory> history =
                historyRepository.findByRequest_IdOrderByCreatedAtDesc(entity.getId());
        List<String> changed = readList(entity.getChangedFields());
        return PartnerProfileUpdateResponse.fromEntity(
                entity,
                readMap(entity.getOldData()),
                readMap(entity.getNewData()),
                changed,
                history
        );
    }

    /** Đơn đăng ký đã được duyệt của đối tác — nguồn của hồ sơ chính thức. */
    private PartnerApplication findApprovedApplication(User partner) {
        List<PartnerApplication> apps = applicationRepository.findByApplicant_IdOrderByCreatedAtDesc(partner.getId());
        return apps.stream()
                .filter(a -> a.getStatus() == com.journeygo.modules.partnerapplication.entity.enums.PartnerApplicationStatus.APPROVED)
                .findFirst()
                .orElseGet(() -> applicationRepository.findByEmailIgnoreCase(partner.getEmail())
                        .filter(a -> a.getStatus() == com.journeygo.modules.partnerapplication.entity.enums.PartnerApplicationStatus.APPROVED)
                        .orElse(null));
    }

    /**
     * Hồ sơ tối thiểu khi đối tác KHÔNG có đơn đăng ký đã duyệt (ví dụ Admin tạo tài khoản
     * CONTENT_PROVIDER trực tiếp). Lấy những gì có từ User + ProviderProfile.
     */
    private Map<String, String> fallbackProfile(User partner) {
        Map<String, String> profile = new LinkedHashMap<>();
        ProviderProfile pp = providerProfileRepository.findByUser_Id(partner.getId()).orElse(null);
        profile.put(PartnerProfileFields.REPRESENTATIVE_NAME, partner.getFullName());
        profile.put(PartnerProfileFields.PHONE, partner.getPhone());
        profile.put(PartnerProfileFields.BUSINESS_NAME, pp == null ? null : pp.getProviderName());
        return profile;
    }

    private PartnerProfileUpdateRequest findOrThrow(Long requestId) {
        return requestRepository.findById(requestId)
                .orElseThrow(() -> new AppException(ErrorCode.PARTNER_PROFILE_UPDATE_NOT_FOUND));
    }

    private String writeJson(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (Exception e) {
            throw new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION,
                    "Không lưu được dữ liệu yêu cầu đổi thông tin: " + e.getMessage());
        }
    }

    private Map<String, String> readMap(String json) {
        if (json == null || json.isBlank()) {
            return new LinkedHashMap<>();
        }
        try {
            return objectMapper.readValue(json, new TypeReference<LinkedHashMap<String, String>>() {
            });
        } catch (Exception e) {
            log.warn("[PartnerProfileUpdate] Không đọc được JSON snapshot: {}", e.getMessage());
            return new LinkedHashMap<>();
        }
    }

    private List<String> readList(String json) {
        if (json == null || json.isBlank()) {
            return new ArrayList<>();
        }
        try {
            return objectMapper.readValue(json, new TypeReference<ArrayList<String>>() {
            });
        } catch (Exception e) {
            log.warn("[PartnerProfileUpdate] Không đọc được JSON danh sách trường: {}", e.getMessage());
            return new ArrayList<>();
        }
    }

    private static String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
