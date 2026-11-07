package com.journeygo.modules.finance.service;

import com.journeygo.common.exception.AppException;
import com.journeygo.common.exception.ErrorCode;
import com.journeygo.modules.finance.dto.request.CreateCommissionPolicyRequest;
import com.journeygo.modules.finance.dto.response.CommissionPolicyResponse;
import com.journeygo.modules.finance.entity.CommissionPolicy;
import com.journeygo.modules.finance.repository.CommissionPolicyRepository;
import com.journeygo.modules.user.entity.User;
import com.journeygo.modules.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

/**
 * Quản lý chính sách hoa hồng mặc định (Admin Dashboard — "Quản lý chính sách hoa hồng").
 *
 * <p>Quy tắc nghiệp vụ được enforce ở tầng service (BR-01 → BR-09):
 * <ul>
 *   <li><b>BR-01</b> — Chỉ Admin gọi được các API này (@PreAuthorize ở controller).</li>
 *   <li><b>BR-02</b> — Rate &gt; 0% và &lt; 100%.</li>
 *   <li><b>BR-03</b> — Mỗi thời điểm chỉ một chính sách có hiệu lực.</li>
 *   <li><b>BR-04</b> — Không tạo chính sách có khoảng hiệu lực chồng lấn.</li>
 *   <li><b>BR-05</b> — Không áp dụng hồi tố: settlement dùng commission snapshot trên
 *       {@code ProviderRevenue}, không tính lại từ tỷ lệ hiện tại.</li>
 *   <li><b>BR-06</b> — Mọi thay đổi có changeReason + người thực hiện.</li>
 *   <li><b>BR-07</b> — Chính sách đã có hiệu lực không sửa trực tiếp.</li>
 *   <li><b>BR-08</b> — Chính sách tương lai có thể hủy / thay thế.</li>
 *   <li><b>BR-09</b> — Xem {@code ProviderRevenueService}.</li>
 * </ul>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class CommissionPolicyService {

    private final CommissionPolicyRepository commissionPolicyRepository;
    private final UserRepository userRepository;

    // ── Read ──────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<CommissionPolicyResponse> getAll() {
        return commissionPolicyRepository.findAllByOrderByEffectiveFromDesc().stream()
                .map(CommissionPolicyResponse::fromEntity)
                .toList();
    }

    /** Chính sách đang có hiệu lực tại thời điểm hiện tại. */
    @Transactional(readOnly = true)
    public CommissionPolicyResponse getCurrentEffective() {
        return commissionPolicyRepository.findEffectiveAt(Instant.now()).stream()
                .findFirst()
                .map(CommissionPolicyResponse::fromEntity)
                .orElse(null);
    }

    /**
     * Tỷ lệ hoa hồng đang có hiệu lực — dùng làm mặc định khi tạo doanh thu đối tác.
     *
     * <p>Trả về {@code null} nếu chưa có chính sách nào hiệu lực — khi đó tầng gọi quyết
     * định fallback sang cấu hình tài chính mặc định.
     */
    @Transactional(readOnly = true)
    public BigDecimal getEffectiveRate() {
        return commissionPolicyRepository.findEffectiveAt(Instant.now()).stream()
                .findFirst()
                .map(CommissionPolicy::getCommissionRate)
                .orElse(null);
    }

    @Transactional(readOnly = true)
    public CommissionPolicyResponse getById(Long id) {
        return CommissionPolicyResponse.fromEntity(findOrThrow(id));
    }

    // ── Create ────────────────────────────────────────────────────────────────

    /**
     * Tạo chính sách hoa hồng mới.
     *
     * <p>Chính sách mới có ngày hiệu lực riêng. Chính sách cũ tự động KẾT THÚC hiệu lực khi
     * chính sách mới bắt đầu — miễn là khoảng hiệu lực không chồng lấn (BR-04).
     */
    @Transactional
    public CommissionPolicyResponse create(CreateCommissionPolicyRequest request, Long adminId) {
        // BR-02
        validateRate(request.commissionRate());

        Instant from = request.effectiveFrom();
        Instant to = request.effectiveTo();
        if (to != null && !to.isAfter(from)) {
            throw new AppException(ErrorCode.COMMISSION_POLICY_INVALID_RATE,
                    "Ngày kết thúc hiệu lực phải sau ngày bắt đầu hiệu lực");
        }

        // BR-04 — không chồng lấn với chính sách đang có.
        List<CommissionPolicy> active = commissionPolicyRepository.findByCancelledFalseOrderByEffectiveFromAsc();
        CommissionPolicy conflicting = findOverlapping(active, from, to);
        if (conflicting != null) {
            throw new AppException(ErrorCode.COMMISSION_POLICY_OVERLAPPING,
                    "Thời gian hiệu lực chồng lấn với chính sách: “" + conflicting.getName() + "”");
        }

        CommissionPolicy policy = CommissionPolicy.builder()
                .name(request.name().trim())
                .commissionRate(request.commissionRate())
                .effectiveFrom(from)
                .effectiveTo(to)
                .changeReason(request.changeReason().trim())
                .createdBy(adminId == null ? null : userRepository.getReferenceById(adminId))
                .cancelled(false)
                .build();

        CommissionPolicy saved = commissionPolicyRepository.save(policy);

        // Đặc tả: "Chính sách cũ tự động kết thúc hiệu lực khi chính sách mới bắt đầu."
        // ⇒ đóng khoảng hiệu lực của chính sách đang mở (effectiveTo = null) tại mốc
        // bắt đầu của chính sách mới. BR-07: chính sách đã có hiệu lực không được sửa
        // trực tiếp — nên chỉ đóng những chính sách CHƯA có hiệu lực, hoặc chính sách
        // đang mở (chưa xác định ngày kết thúc) được phép kết thúc theo mốc mới.
        closeOpenEndedPolicies(active, from);

        log.info("[CommissionPolicy] Admin {} tạo chính sách “{}” rate={} hiệu lực từ {}",
                adminId, saved.getName(), saved.getCommissionRate(), saved.getEffectiveFrom());

        return CommissionPolicyResponse.fromEntity(saved);
    }

    /**
     * Tìm chính sách có khoảng hiệu lực chồng lấn với {@code [from, to]}.
     *
     * <p>Quy tắc (BR-04 + đặc tả "chính sách cũ tự động kết thúc hiệu lực khi chính sách
     * mới bắt đầu"):
     * <ul>
     *   <li>Chính sách đang MỞ (effectiveTo = null) và bắt đầu TRƯỚC {@code from} ⇒ không
     *       chồng lấn — hệ thống tự đóng nó tại {@code from} (chỉ khi {@code from} nằm
     *       trong tương lai; nếu {@code from} nằm quá khứ ⇒ tính là chồng lấn vì sẽ
     *       thu hồi hiệu lực của chính sách đang áp dụng).</li>
     *   <li>Chính sách có khoảng hữu hạn ⇒ chồng lấn khi hai khoảng cắt nhau.</li>
     * </ul>
     */
    private CommissionPolicy findOverlapping(List<CommissionPolicy> active, Instant from, Instant to) {
        Instant now = Instant.now();
        boolean fromInFuture = from.isAfter(now);

        for (CommissionPolicy p : active) {
            Instant pFrom = p.getEffectiveFrom();
            Instant pTo = p.getEffectiveTo();

            if (pTo == null) {
                // Khoảng mở vô hạn — chỉ chấp nhận khi chính sách mới bắt đầu SAU nó
                // và bắt đầu trong tương lai (sẽ được đóng tại `from`).
                if (fromInFuture && pFrom.isBefore(from)) {
                    continue;
                }
                return p;
            }

            // Khoảng hữu hạn [pFrom, pTo).
            boolean newEndsAfterPStarts = (to == null) || pFrom.isBefore(to);
            if (from.isBefore(pTo) && newEndsAfterPStarts) {
                return p;
            }
        }
        return null;
    }

    /**
     * Đóng khoảng hiệu lực mở (effectiveTo = null) của các chính sách cũ tại mốc
     * {@code newFrom} — theo đặc tả "chính sách cũ tự động kết thúc hiệu lực khi
     * chính sách mới bắt đầu".
     */
    private void closeOpenEndedPolicies(List<CommissionPolicy> active, Instant newFrom) {
        for (CommissionPolicy p : active) {
            if (p.getEffectiveTo() != null) {
                continue;
            }
            // Chỉ đóng khoảng mở khi nó thực sự nằm trước chính sách mới.
            if (p.getEffectiveFrom().isBefore(newFrom)) {
                p.setEffectiveTo(newFrom);
                commissionPolicyRepository.save(p);
            }
        }
    }

    // ── Cancel (BR-08) ────────────────────────────────────────────────────────

    /**
     * Hủy chính sách — chỉ áp dụng cho chính sách TƯƠNG LAI (chưa tới ngày hiệu lực).
     */
    @Transactional
    public CommissionPolicyResponse cancel(Long id, String reason, Long adminId) {
        CommissionPolicy policy = findOrThrow(id);

        if (!policy.isFuture()) {
            throw new AppException(ErrorCode.COMMISSION_POLICY_NOT_CANCELLABLE,
                    "Chỉ có thể hủy chính sách chưa tới ngày hiệu lực");
        }
        if (reason == null || reason.isBlank()) {
            throw new AppException(ErrorCode.COMMISSION_POLICY_REASON_REQUIRED);
        }

        policy.setCancelled(true);
        policy.setChangeReason(reason.trim());
        policy.setCreatedBy(adminId == null ? policy.getCreatedBy() : userRepository.getReferenceById(adminId));
        CommissionPolicy saved = commissionPolicyRepository.save(policy);

        log.info("[CommissionPolicy] Admin {} hủy chính sách id={}", adminId, id);
        return CommissionPolicyResponse.fromEntity(saved);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private void validateRate(BigDecimal rate) {
        if (rate == null
                || rate.compareTo(BigDecimal.ZERO) <= 0
                || rate.compareTo(BigDecimal.ONE) >= 0) {
            throw new AppException(ErrorCode.COMMISSION_POLICY_INVALID_RATE);
        }
    }

    private CommissionPolicy findOrThrow(Long id) {
        return commissionPolicyRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.COMMISSION_POLICY_NOT_FOUND));
    }
}
