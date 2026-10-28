package com.journeygo.modules.wallet.controller;

import com.journeygo.common.dto.ApiResponse;
import com.journeygo.common.dto.PageResponse;
import com.journeygo.modules.wallet.dto.response.WalletResponse;
import com.journeygo.modules.wallet.dto.response.WalletTransactionResponse;
import com.journeygo.modules.wallet.service.WalletService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/wallets")
@RequiredArgsConstructor
@Tag(name = "Wallet (Ví nội bộ)",
        description = "Ví nội bộ của Partner và lịch sử giao dịch ví")
public class WalletController {

    private final WalletService walletService;

    @GetMapping("/partner/{partnerId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'PARTNER')")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Số dư ví của một đối tác",
            description = "Số dư phản ánh quyền lợi tài chính đã được ghi nhận, KHÔNG đồng nghĩa "
                    + "tiền đã chuyển vào tài khoản ngân hàng.")
    public ResponseEntity<ApiResponse<WalletResponse>> getByPartner(@PathVariable Long partnerId) {
        return ResponseEntity.ok(ApiResponse.success("Lấy thông tin ví thành công",
                walletService.getByPartner(partnerId)));
    }

    @GetMapping("/{walletId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'PARTNER')")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Chi tiết ví theo ID")
    public ResponseEntity<ApiResponse<WalletResponse>> getById(@PathVariable Long walletId) {
        return ResponseEntity.ok(ApiResponse.success("Lấy thông tin ví thành công",
                walletService.getById(walletId)));
    }

    @GetMapping("/partner/{partnerId}/transactions")
    @PreAuthorize("hasAnyRole('ADMIN', 'PARTNER')")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Lịch sử giao dịch ví của một đối tác",
            description = "Mọi biến động số dư đều có một giao dịch tương ứng: SETTLEMENT_CREDIT, "
                    + "REFUND_ADJUSTMENT, MANUAL_ADJUSTMENT.")
    public ResponseEntity<ApiResponse<PageResponse<WalletTransactionResponse>>> getTransactionsByPartner(
            @PathVariable Long partnerId,
            @ParameterObject @PageableDefault(page = 0, size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success("Lấy lịch sử giao dịch ví thành công",
                walletService.getTransactions(partnerId, pageable)));
    }

    @GetMapping("/{walletId}/transactions")
    @PreAuthorize("hasAnyRole('ADMIN', 'PARTNER')")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Lịch sử giao dịch của một ví theo ID")
    public ResponseEntity<ApiResponse<PageResponse<WalletTransactionResponse>>> getTransactions(
            @PathVariable Long walletId,
            @ParameterObject @PageableDefault(page = 0, size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success("Lấy lịch sử giao dịch ví thành công",
                walletService.getTransactionsByWallet(walletId, pageable)));
    }
}
