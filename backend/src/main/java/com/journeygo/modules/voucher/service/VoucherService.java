package com.journeygo.modules.voucher.service;

import com.journeygo.common.exception.AppException;
import com.journeygo.common.exception.ErrorCode;
import com.journeygo.modules.providerprofile.entity.ProviderProfile;
import com.journeygo.modules.providerprofile.repository.ProviderProfileRepository;
import com.journeygo.modules.voucher.dto.request.CreateVoucherRequest;
import com.journeygo.modules.voucher.dto.request.UpdateVoucherRequest;
import com.journeygo.modules.voucher.dto.request.ValidateVoucherRequest;
import com.journeygo.modules.voucher.dto.response.VoucherCalculationResult;
import com.journeygo.modules.voucher.dto.response.VoucherResponse;
import com.journeygo.modules.voucher.entity.Voucher;
import com.journeygo.modules.voucher.entity.enums.DiscountType;
import com.journeygo.modules.voucher.entity.enums.VoucherScope;
import com.journeygo.modules.voucher.repository.VoucherRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class VoucherService {

    private final VoucherRepository voucherRepository;
    private final ProviderProfileRepository providerProfileRepository;

    @Transactional
    public VoucherResponse createVoucher(CreateVoucherRequest request) {
        if (voucherRepository.existsByCode(request.code())) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Mã voucher đã tồn tại: " + request.code());
        }

        ProviderProfile partner = null;
        if (request.voucherScope() == VoucherScope.PARTNER) {
            if (request.partnerId() == null) {
                throw new AppException(ErrorCode.VALIDATION_ERROR, "Voucher đối tác bắt buộc phải chọn Đối tác");
            }
            partner = providerProfileRepository.findById(request.partnerId())
                    .orElseThrow(() -> new AppException(ErrorCode.INVALID_KEY, "Không tìm thấy thông tin đối tác"));
        }

        if (request.discountType() == DiscountType.PERCENTAGE) {
            if (request.discountValue().compareTo(BigDecimal.valueOf(100)) > 0) {
                throw new AppException(ErrorCode.VALIDATION_ERROR, "Tỷ lệ giảm giá phần trăm không được vượt quá 100%");
            }
            if (request.maxDiscountAmount() == null || request.maxDiscountAmount().compareTo(BigDecimal.ZERO) <= 0) {
                throw new AppException(ErrorCode.VALIDATION_ERROR, "Voucher giảm theo % bắt buộc phải có mức giảm tối đa (maxDiscountAmount)");
            }
        }

        Voucher voucher = Voucher.builder()
                .code(request.code().trim().toUpperCase())
                .title(request.title())
                .description(request.description())
                .voucherScope(request.voucherScope())
                .partner(partner)
                .discountType(request.discountType())
                .discountValue(request.discountValue())
                .minOrderAmount(request.minOrderAmount())
                .maxDiscountAmount(request.maxDiscountAmount())
                .pointsRequired(request.pointsRequired() != null ? request.pointsRequired() : 0)
                .totalQuantity(request.totalQuantity())
                .remainingQuantity(request.totalQuantity())
                .validDays(request.validDays() != null ? request.validDays() : 30)
                .startDate(request.startDate())
                .endDate(request.endDate())
                .active(request.active() != null ? request.active() : true)
                .build();

        Voucher saved = voucherRepository.save(voucher);
        log.info("Admin đã tạo voucher mới: {} (Scope: {})", saved.getCode(), saved.getVoucherScope());
        return VoucherResponse.fromEntity(saved);
    }

    @Transactional
    public VoucherResponse updateVoucher(Long id, UpdateVoucherRequest request) {
        Voucher voucher = voucherRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.INVALID_KEY, "Không tìm thấy voucher"));

        if (request.title() != null) voucher.setTitle(request.title());
        if (request.description() != null) voucher.setDescription(request.description());

        if (request.voucherScope() != null) {
            voucher.setVoucherScope(request.voucherScope());
            if (request.voucherScope() == VoucherScope.PARTNER) {
                if (request.partnerId() != null) {
                    ProviderProfile partner = providerProfileRepository.findById(request.partnerId())
                            .orElseThrow(() -> new AppException(ErrorCode.INVALID_KEY, "Không tìm thấy thông tin đối tác"));
                    voucher.setPartner(partner);
                } else if (voucher.getPartner() == null) {
                    throw new AppException(ErrorCode.VALIDATION_ERROR, "Voucher đối tác bắt buộc phải có đối tác sở hữu");
                }
            } else {
                voucher.setPartner(null);
            }
        }

        if (request.discountType() != null) voucher.setDiscountType(request.discountType());
        if (request.discountValue() != null) voucher.setDiscountValue(request.discountValue());
        if (request.minOrderAmount() != null) voucher.setMinOrderAmount(request.minOrderAmount());
        if (request.maxDiscountAmount() != null) voucher.setMaxDiscountAmount(request.maxDiscountAmount());

        if (voucher.getDiscountType() == DiscountType.PERCENTAGE) {
            if (voucher.getDiscountValue().compareTo(BigDecimal.valueOf(100)) > 0) {
                throw new AppException(ErrorCode.VALIDATION_ERROR, "Tỷ lệ giảm giá phần trăm không được vượt quá 100%");
            }
            if (voucher.getMaxDiscountAmount() == null || voucher.getMaxDiscountAmount().compareTo(BigDecimal.ZERO) <= 0) {
                throw new AppException(ErrorCode.VALIDATION_ERROR, "Voucher giảm theo % bắt buộc phải có mức giảm tối đa (maxDiscountAmount)");
            }
        }

        if (request.totalQuantity() != null) {
            int diff = request.totalQuantity() - voucher.getTotalQuantity();
            voucher.setTotalQuantity(request.totalQuantity());
            voucher.setRemainingQuantity(Math.max(0, voucher.getRemainingQuantity() + diff));
        }

        if (request.pointsRequired() != null) voucher.setPointsRequired(request.pointsRequired());
        if (request.validDays() != null) voucher.setValidDays(request.validDays());
        if (request.startDate() != null) voucher.setStartDate(request.startDate());
        if (request.endDate() != null) voucher.setEndDate(request.endDate());
        if (request.active() != null) voucher.setActive(request.active());

        Voucher saved = voucherRepository.save(voucher);
        return VoucherResponse.fromEntity(saved);
    }

    @Transactional(readOnly = true)
    public VoucherResponse getVoucherById(Long id) {
        return voucherRepository.findById(id)
                .map(VoucherResponse::fromEntity)
                .orElseThrow(() -> new AppException(ErrorCode.INVALID_KEY, "Không tìm thấy voucher"));
    }

    @Transactional(readOnly = true)
    public Page<VoucherResponse> getVouchers(VoucherScope scope, Long partnerId, Boolean active, String search, Pageable pageable) {
        return voucherRepository.findVouchersWithFilter(scope, partnerId, active, search, pageable)
                .map(VoucherResponse::fromEntity);
    }

    @Transactional(readOnly = true)
    public List<VoucherResponse> getApplicableVouchers(Long partnerId) {
        return voucherRepository.findApplicableVouchersForTour(partnerId, Instant.now())
                .stream()
                .map(VoucherResponse::fromEntity)
                .toList();
    }

    /**
     * Tính toán và thẩm định áp dụng Voucher cho Tour:
     * - Voucher Nền tảng: Trừ vào doanh thu nền tảng. Số tiền giảm không được vượt quá doanh thu nền tảng.
     * - Voucher Đối tác: Trừ vào doanh thu đối tác. Số tiền giảm không được vượt quá doanh thu đối tác.
     */
    @Transactional(readOnly = true)
    public VoucherCalculationResult calculateAndValidateVoucher(ValidateVoucherRequest request) {
        Voucher voucher = voucherRepository.findByCode(request.voucherCode().trim().toUpperCase())
                .orElseThrow(() -> new AppException(ErrorCode.INVALID_KEY, "Mã voucher không tồn tại"));

        Instant now = Instant.now();
        if (!voucher.isActive()) {
            return buildInvalidResult(voucher, request.tourPrice(), "Voucher hiện đang bị khóa");
        }
        if (voucher.getRemainingQuantity() <= 0) {
            return buildInvalidResult(voucher, request.tourPrice(), "Voucher đã hết số lượng sử dụng");
        }
        if (voucher.getStartDate() != null && voucher.getStartDate().isAfter(now)) {
            return buildInvalidResult(voucher, request.tourPrice(), "Chương trình ưu đãi của voucher chưa bắt đầu");
        }
        if (voucher.getEndDate() != null && voucher.getEndDate().isBefore(now)) {
            return buildInvalidResult(voucher, request.tourPrice(), "Voucher đã hết hạn sử dụng");
        }

        if (voucher.getMinOrderAmount() != null && request.tourPrice().compareTo(voucher.getMinOrderAmount()) < 0) {
            return buildInvalidResult(voucher, request.tourPrice(),
                    "Đơn hàng chưa đạt giá trị tối thiểu " + voucher.getMinOrderAmount() + "đ để áp dụng voucher này");
        }

        // Kiểm tra phạm vi đối tác
        if (voucher.getVoucherScope() == VoucherScope.PARTNER) {
            if (voucher.getPartner() == null || !voucher.getPartner().getId().equals(request.partnerId())) {
                return buildInvalidResult(voucher, request.tourPrice(), "Voucher này chỉ áp dụng cho các tour của đối tác phát hành");
            }
        }

        // Tính discount thô
        BigDecimal discount;
        if (voucher.getDiscountType() == DiscountType.FIXED_AMOUNT) {
            discount = voucher.getDiscountValue();
        } else {
            BigDecimal rawPercentDiscount = request.tourPrice()
                    .multiply(voucher.getDiscountValue())
                    .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
            if (voucher.getMaxDiscountAmount() != null && rawPercentDiscount.compareTo(voucher.getMaxDiscountAmount()) > 0) {
                discount = voucher.getMaxDiscountAmount();
            } else {
                discount = rawPercentDiscount;
            }
        }

        // Tính doanh thu lý thuyết ban đầu
        BigDecimal initialPlatformRevenue = request.tourPrice()
                .multiply(request.commissionRate())
                .setScale(2, RoundingMode.HALF_UP);
        BigDecimal initialPartnerRevenue = request.tourPrice().subtract(initialPlatformRevenue);

        BigDecimal finalPlatformRevenue;
        BigDecimal finalPartnerRevenue;

        // BẢO VỆ DOANH THU CỦA BÊN SỞ HỮU VOUCHER:
        // Số tiền giảm giá không được vượt quá doanh thu của người sở hữu voucher đó!
        if (voucher.getVoucherScope() == VoucherScope.PLATFORM) {
            if (discount.compareTo(initialPlatformRevenue) > 0) {
                return buildInvalidResult(voucher, request.tourPrice(),
                        "Số tiền giảm giá (" + discount + "đ) vượt quá doanh thu nền tảng tối đa có thể khấu trừ (" + initialPlatformRevenue + "đ)");
            }
            finalPlatformRevenue = initialPlatformRevenue.subtract(discount);
            finalPartnerRevenue = initialPartnerRevenue; // Đối tác nhận trọn vẹn phần của mình
        } else { // PARTNER
            if (discount.compareTo(initialPartnerRevenue) > 0) {
                return buildInvalidResult(voucher, request.tourPrice(),
                        "Số tiền giảm giá (" + discount + "đ) vượt quá doanh thu thực nhận của đối tác (" + initialPartnerRevenue + "đ)");
            }
            finalPartnerRevenue = initialPartnerRevenue.subtract(discount);
            finalPlatformRevenue = initialPlatformRevenue; // Sàn giữ trọn vẹn hoa hồng
        }

        BigDecimal finalPrice = request.tourPrice().subtract(discount);

        return VoucherCalculationResult.builder()
                .voucherId(voucher.getId())
                .voucherCode(voucher.getCode())
                .title(voucher.getTitle())
                .voucherScope(voucher.getVoucherScope())
                .originalPrice(request.tourPrice())
                .discountAmount(discount)
                .finalPrice(finalPrice)
                .platformRevenue(finalPlatformRevenue)
                .partnerRevenue(finalPartnerRevenue)
                .valid(true)
                .errorMessage(null)
                .build();
    }

    private VoucherCalculationResult buildInvalidResult(Voucher voucher, BigDecimal originalPrice, String error) {
        return VoucherCalculationResult.builder()
                .voucherId(voucher != null ? voucher.getId() : null)
                .voucherCode(voucher != null ? voucher.getCode() : null)
                .title(voucher != null ? voucher.getTitle() : null)
                .voucherScope(voucher != null ? voucher.getVoucherScope() : null)
                .originalPrice(originalPrice)
                .discountAmount(BigDecimal.ZERO)
                .finalPrice(originalPrice)
                .platformRevenue(BigDecimal.ZERO)
                .partnerRevenue(BigDecimal.ZERO)
                .valid(false)
                .errorMessage(error)
                .build();
    }
}
