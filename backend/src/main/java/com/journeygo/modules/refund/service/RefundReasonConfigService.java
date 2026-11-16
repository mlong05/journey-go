package com.journeygo.modules.refund.service;

import com.journeygo.common.exception.AppException;
import com.journeygo.common.exception.ErrorCode;
import com.journeygo.modules.finance.config.FinanceProperties;
import com.journeygo.modules.refund.dto.request.CreateRefundReasonCodeRequest;
import com.journeygo.modules.refund.dto.request.UpdateRefundReasonCodeRequest;
import com.journeygo.modules.refund.dto.request.UpdateRefundReasonGroupRequest;
import com.journeygo.modules.refund.dto.response.RefundReasonGroupResponse;
import com.journeygo.modules.refund.entity.RefundReasonCode;
import com.journeygo.modules.refund.entity.RefundReasonGroup;
import com.journeygo.modules.refund.entity.enums.RefundReason;
import com.journeygo.modules.refund.repository.RefundReasonCodeRepository;
import com.journeygo.modules.refund.repository.RefundReasonGroupRepository;
import com.journeygo.modules.refund.repository.RefundRequestRepository;
import com.journeygo.modules.user.entity.User;
import com.journeygo.modules.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Quản lý cấu hình lý do hoàn tiền (Admin — tab "Cấu hình lý do hoàn tiền").
 *
 * <p>Nguyên tắc:
 * <ul>
 *   <li>Mã nhóm lý do là enum {@link RefundReason} — 4 nhóm cố định theo chính sách,
 *       KHÔNG cho tạo/xóa nhóm mới (chỉ sửa tên, tỷ lệ, mô tả, thứ tự, bật/tắt).</li>
 *   <li>Mã lý do chi tiết do Admin tự do — thêm / sửa / xóa / bật-tắt tùy ý.</li>
 *   <li>Xóa mã lý do đã được dùng trong yêu cầu hoàn tiền thì bị chặn
 *       (chỉ cho tắt) — để không mất dấu vết lịch sử tài chính.</li>
 *   <li>Nhóm không có mã lý do đang bật thì Tourist không thể chọn nhóm đó.</li>
 * </ul>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class RefundReasonConfigService {

    private final RefundReasonGroupRepository groupRepository;
    private final RefundReasonCodeRepository codeRepository;
    private final RefundRequestRepository refundRepository;
    private final UserRepository userRepository;
    private final FinanceProperties financeProperties;

    // ── Read ──────────────────────────────────────────────────────────────────

    /**
     * Danh sách nhóm lý do + mã lý do chi tiết.
     *
     * @param onlyActive true = chỉ trả về nhóm/mã đang bật (dùng cho Tourist)
     */
    @Transactional(readOnly = true)
    public List<RefundReasonGroupResponse> getGroups(boolean onlyActive) {
        List<RefundReasonGroup> groups = onlyActive
                ? groupRepository.findByActiveTrueOrderByDisplayOrderAsc()
                : groupRepository.findAllOrdered();

        Map<Long, List<RefundReasonCode>> codesByGroup = codeRepository.findAllOrdered().stream()
                .filter(c -> !onlyActive || c.isActive())
                .collect(Collectors.groupingBy(c -> c.getGroup().getId()));

        return groups.stream()
                .map(g -> RefundReasonGroupResponse.fromEntity(
                        g,
                        codesByGroup.getOrDefault(g.getId(), List.of()),
                        noShowWindowHoursOf(g.getCode()),
                        noShowRefundRateOf(g.getCode())))
                .toList();
    }

    /**
     * Số giờ trước ngày trải nghiệm mà nhóm này bị đưa xuống mức hoàn 0%.
     *
     * <p>Hiện chỉ nhóm cá nhân (PERSONAL) có mức 0% riêng: hủy quá muộn hoặc
     * không xuất hiện (no-show) ⇒ không hoàn. Các nhóm khác không có mức 0%
     * riêng ⇒ trả {@code null} (UI không hiển thị mức phụ).
     */
    private Integer noShowWindowHoursOf(String groupCode) {
        if (!RefundReason.PERSONAL.name().equals(groupCode)) {
            return null;
        }
        int hours = financeProperties.effectiveRefundNoShowWindowHours();
        return hours > 0 ? hours : null;
    }

    /** Tỷ lệ hoàn của nhóm khi rơi vào cửa sổ no-show (luôn 0% nếu có cửa sổ). */
    private BigDecimal noShowRefundRateOf(String groupCode) {
        if (noShowWindowHoursOf(groupCode) == null) {
            return null;
        }
        return BigDecimal.ZERO;
    }

    /** Danh sách mã lý do chi tiết của một nhóm. */
    @Transactional(readOnly = true)
    public List<RefundReasonGroupResponse.RefundReasonCodeResponse> getCodesOfGroup(String groupCode) {
        RefundReasonGroup group = requireGroup(groupCode);
        List<RefundReasonCode> codes = codeRepository.findByGroup_IdOrderByDisplayOrderAsc(group.getId());
        return codes.stream().map(RefundReasonGroupResponse.RefundReasonCodeResponse::fromEntity).toList();
    }

    /**
     * Nhóm theo mã — dùng nội bộ để tính tỷ lệ hoàn.
     */
    @Transactional(readOnly = true)
    public RefundReasonGroup requireGroup(String groupCode) {
        return groupRepository.findByCode(groupCode)
                .orElseThrow(() -> new AppException(ErrorCode.REFUND_REASON_GROUP_NOT_FOUND,
                        "Không tìm thấy nhóm lý do hoàn tiền: " + groupCode));
    }

    /**
     * Tỷ lệ hoàn tiền áp dụng cho nhóm — đọc từ cấu hình của Admin.
     *
     * <p>Fallback về {@link RefundReason#defaultRefundRate()} khi DB chưa có cấu hình
     * (ví dụ môi trường mới cài đặt chưa chạy migration V26).
     */
    @Transactional(readOnly = true)
    public BigDecimal refundRateOf(RefundReason reason) {
        if (reason == null) {
            return BigDecimal.ZERO;
        }
        return groupRepository.findByCode(reason.name())
                .map(RefundReasonGroup::getRefundRate)
                .filter(rate -> rate != null)
                .orElseGet(reason::defaultRefundRate);
    }

    /**
     * Mã lý do chi tiết — dùng nội bộ khi duyệt yêu cầu.
     */
    @Transactional(readOnly = true)
    public RefundReasonCode requireReasonCode(String code) {
        if (code == null || code.isBlank()) {
            return null;
        }
        return codeRepository.findByCodeWithGroup(code)
                .orElseThrow(() -> new AppException(ErrorCode.REFUND_REASON_CODE_NOT_FOUND,
                        "Không tìm thấy mã lý do hoàn tiền: " + code));
    }

    // ── Tên hiển thị (KHÔNG lộ mã kỹ thuật ra ngoài) ─────────────────────────

    /**
     * Tên tiếng Việt của một mã lý do chi tiết.
     *
     * <p>Mã kỹ thuật (VD: {@code PERSONAL_7}) là chi tiết nội bộ ⇒ web/mobile KHÔNG
     * được hiển thị. Hàm này trả về tên tiếng Việt mà Admin đã đặt cho lý do đó.
     *
     * @return tên hiển thị, hoặc null nếu không tìm thấy
     */
    @Transactional(readOnly = true)
    public String reasonCodeName(String code) {
        if (code == null || code.isBlank()) {
            return null;
        }
        return codeRepository.findByCodeWithGroup(code)
                .map(RefundReasonCode::getName)
                .orElse(null);
    }

    /**
     * Tên tiếng Việt của nhóm lý do.
     *
     * <p>Cũng là "tên nhóm" mà người dùng thấy (VD: "Lỗi khách hàng"), không phải mã
     * kỹ thuật (VD: {@code PERSONAL}).
     *
     * @return tên hiển thị, hoặc null nếu không tìm thấy
     */
    @Transactional(readOnly = true)
    public String groupName(String groupCode) {
        if (groupCode == null || groupCode.isBlank()) {
            return null;
        }
        return groupRepository.findByCode(groupCode)
                .map(RefundReasonGroup::getName)
                .orElse(null);
    }

    // ── Admin: nhóm lý do ─────────────────────────────────────────────────────

    /** Admin cập nhật nhóm lý do (tên, tỷ lệ, mô tả, thứ tự, bật/tắt). */
    @Transactional
    public RefundReasonGroupResponse updateGroup(String groupCode,
                                                 UpdateRefundReasonGroupRequest request,
                                                 Long adminId) {
        RefundReasonGroup group = requireGroup(groupCode);
        User admin = userRepository.findById(adminId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));

        group.setName(request.name().trim());
        if (request.refundRate() != null) {
            group.setRefundRate(request.refundRate().setScale(4, java.math.RoundingMode.HALF_UP));
        }
        if (request.description() != null) {
            group.setDescription(request.description().trim());
        }
        if (request.displayOrder() != null) {
            group.setDisplayOrder(request.displayOrder());
        }
        if (request.active() != null) {
            group.setActive(request.active());
        }
        group.setCreatedBy(admin);
        groupRepository.save(group);

        log.info("[RefundConfig] Admin {} cập nhật nhóm lý do {}", adminId, groupCode);

        List<RefundReasonCode> codes = codeRepository.findByGroup_IdOrderByDisplayOrderAsc(group.getId());
        return RefundReasonGroupResponse.fromEntity(group, codes);
    }

    // ── Admin: mã lý do chi tiết ─────────────────────────────────────────────

    /** Admin tạo mã lý do chi tiết mới. */
    @Transactional
    public RefundReasonGroupResponse.RefundReasonCodeResponse createCode(CreateRefundReasonCodeRequest request,
                                                                          Long adminId) {
        RefundReasonGroup group = requireGroup(request.groupCode());

        // ── Mã kỹ thuật: cho phép Admin để trống ⇒ hệ thống tự sinh ──────────
        // Mã chỉ dùng nội bộ (khóa ngoại logic, tra cứu) — KHÔNG hiển thị cho
        // người dùng, nên không bắt buộc Admin phải nghĩ ra mã kỹ thuật.
        String requested = request.code() != null ? request.code().trim().toUpperCase() : "";
        String code = requested.isEmpty()
                ? generateCode(group)
                : requested;

        if (codeRepository.existsByCode(code)) {
            throw new AppException(ErrorCode.VALIDATION_ERROR,
                    "Mã lý do đã tồn tại: " + code);
        }
        if (codeRepository.existsByGroupIdAndCode(group.getId(), code)) {
            throw new AppException(ErrorCode.VALIDATION_ERROR,
                    "Mã lý do đã tồn tại trong nhóm " + group.getName() + ": " + code);
        }

        User admin = userRepository.findById(adminId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));

        RefundReasonCode entity = RefundReasonCode.builder()
                .code(code)
                .group(group)
                .name(request.name().trim())
                .conditions(request.conditions() != null ? request.conditions().trim() : null)
                .requireEvidence(Boolean.TRUE.equals(request.requireEvidence()))
                // Số thứ tự: Admin KHÔNG cần nhập — hệ thống tự gán số kế tiếp
                // (đang có 5 lý do ⇒ lý do mới là số 6).
                .displayOrder(request.displayOrder() != null
                        ? request.displayOrder()
                        : nextDisplayOrder(group))
                .active(true)
                .createdBy(admin)
                .build();

        RefundReasonCode saved = codeRepository.save(entity);
        log.info("[RefundConfig] Admin {} tạo mã lý do {} trong nhóm {}", adminId, code, group.getCode());

        return RefundReasonGroupResponse.RefundReasonCodeResponse.fromEntity(saved);
    }

    /**
     * Số thứ tự tiếp theo trong nhóm — dùng khi Admin thêm lý do mới.
     *
     * <p>Lấy {@code max(displayOrder) + 1} (không phải {@code count + 1}) để tránh
     * trùng số khi nhóm đã có lý do bị xoá giữa chừng.
     */
    private int nextDisplayOrder(RefundReasonGroup group) {
        List<RefundReasonCode> codes =
                codeRepository.findByGroup_IdOrderByDisplayOrderAsc(group.getId());
        int max = 0;
        for (RefundReasonCode c : codes) {
            if (c.getDisplayOrder() > max) {
                max = c.getDisplayOrder();
            }
        }
        return max + 1;
    }

    /**
     * Sinh mã kỹ thuật tự động cho mã lý do mới — VD: {@code PERSONAL_7}.
     *
     * <p>Mã chỉ mang tính định danh nội bộ ⇒ không cần "đẹp", chỉ cần DUY NHẤT.
     * Dùng số thứ tự tăng dần trong nhóm để không đụng mã đã có.
     */
    private String generateCode(RefundReasonGroup group) {
        String prefix = group.getCode();
        long seq = codeRepository.countByGroup_Id(group.getId()) + 1;
        String candidate;
        do {
            candidate = prefix + "_" + seq;
            seq++;
        } while (codeRepository.existsByCode(candidate));
        return candidate;
    }

    /** Admin sửa mã lý do chi tiết. */
    @Transactional
    public RefundReasonGroupResponse.RefundReasonCodeResponse updateCode(Long codeId,
                                                                          UpdateRefundReasonCodeRequest request,
                                                                          Long adminId) {
        RefundReasonCode entity = codeRepository.findById(codeId)
                .orElseThrow(() -> new AppException(ErrorCode.REFUND_REASON_CODE_NOT_FOUND));

        entity.setName(request.name().trim());
        if (request.conditions() != null) {
            entity.setConditions(request.conditions().trim());
        }
        if (request.requireEvidence() != null) {
            entity.setRequireEvidence(request.requireEvidence());
        }
        if (request.displayOrder() != null) {
            entity.setDisplayOrder(request.displayOrder());
        }
        if (request.active() != null) {
            entity.setActive(request.active());
        }

        RefundReasonCode saved = codeRepository.save(entity);
        log.info("[RefundConfig] Admin {} cập nhật mã lý do {}", adminId, saved.getCode());

        return RefundReasonGroupResponse.RefundReasonCodeResponse.fromEntity(saved);
    }

    /**
     * Admin xóa mã lý do chi tiết.
     *
     * <p>Mã lý do đã từng được chọn trong yêu cầu hoàn tiền thì KHÔNG cho xóa
     * (để giữ dấu vết lịch sử tài chính) — chỉ được tắt.
     */
    @Transactional
    public void deleteCode(Long codeId, Long adminId) {
        RefundReasonCode entity = codeRepository.findById(codeId)
                .orElseThrow(() -> new AppException(ErrorCode.REFUND_REASON_CODE_NOT_FOUND));

        if (isCodeInUse(entity.getCode())) {
            throw new AppException(ErrorCode.REFUND_REASON_CODE_IN_USE,
                    "Mã lý do đã được dùng trong yêu cầu hoàn tiền nên không thể xóa. "
                            + "Hãy tắt mã lý do này thay vì xóa.");
        }

        codeRepository.delete(entity);

        // ── Đánh số lại ───────────────────────────────────────────────────
        // Xóa giữa chừng làm các mã còn lại giữ displayOrder cũ ⇒ STT hiển thị
        // bị lỗi (VD: xóa số 7, 8 thì danh sách hiện 1 2 3 4 5 6 9 10 11 12
        // thay vì 1 2 3 4 5 6 7 8 9 10).
        // ⇒ Gán lại liên tục 1..N theo thứ tự hiện tại của nhóm.
        resequenceGroup(entity.getGroup().getId());

        log.info("[RefundConfig] Admin {} xóa mã lý do {}", adminId, entity.getCode());
    }

    /**
     * Gán lại {@code displayOrder} liên tục 1..N cho toàn bộ mã lý do của nhóm.
     *
     * <p>Gọi sau mỗi lần xóa để STT luôn khớp với vị trí thực tế trong danh sách.
     * Chỉ ghi khi giá trị thực sự đổi ⇒ tránh ghi thừa và giữ nguyên
     * {@code updated_at} của những mã không bị ảnh hưởng.
     */
    private void resequenceGroup(Long groupId) {
        List<RefundReasonCode> codes =
                codeRepository.findByGroup_IdOrderByDisplayOrderAsc(groupId);

        int expected = 1;
        boolean changed = false;
        for (RefundReasonCode c : codes) {
            if (c.getDisplayOrder() != expected) {
                c.setDisplayOrder(expected);
                changed = true;
            }
            expected++;
        }
        if (changed) {
            codeRepository.saveAll(codes);
        }
    }

    /**
     * Mã lý do đã từng được dùng trong yêu cầu hoàn tiền hay chưa.
     */
    private boolean isCodeInUse(String code) {
        return refundRepository.countByDeclaredReasonCodeOrApprovedReasonCode(code) > 0;
    }
}
