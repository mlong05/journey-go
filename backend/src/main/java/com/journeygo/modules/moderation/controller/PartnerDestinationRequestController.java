package com.journeygo.modules.moderation.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.journeygo.common.dto.ApiResponse;
import com.journeygo.common.dto.PageResponse;
import com.journeygo.common.exception.AppException;
import com.journeygo.common.exception.ErrorCode;
import com.journeygo.modules.moderation.dto.request.*;
import com.journeygo.modules.moderation.dto.response.DestinationRequestResponse;
import com.journeygo.modules.moderation.entity.enums.DestinationRequestStatus;
import com.journeygo.modules.moderation.service.PartnerDestinationRequestService;
import com.journeygo.modules.user.entity.Role;
import com.journeygo.security.UserPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.Part;
import jakarta.validation.Valid;
import jakarta.validation.Validator;
import lombok.RequiredArgsConstructor;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;

@RestController
@RequestMapping("/api/v1/destination-requests")
@RequiredArgsConstructor
@Tag(name = "Quy trình kiểm duyệt đề xuất điểm đến (Destination Requests)")
@SecurityRequirement(name = "Bearer Authentication")
public class PartnerDestinationRequestController {

    private final PartnerDestinationRequestService service;
    private final ObjectMapper objectMapper;
    private final Validator validator;

    // ── 1. Partner: Gửi đề xuất & Quản lý đề xuất của tôi ─────────────────────

    @PostMapping(value = "/with-images", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('PARTNER', 'ADMIN')")
    @Operation(summary = "Đối tác gửi đề xuất điểm đến và tải ảnh lên Cloudinary cùng lúc",
            description = "Gửi multipart/form-data gồm phần request (JSON) và image (file ảnh) hoặc images (nhiều ảnh). Backend tự động upload lên Cloudinary.",
            requestBody = @io.swagger.v3.oas.annotations.parameters.RequestBody(required = true,
                    content = @io.swagger.v3.oas.annotations.media.Content(
                            mediaType = MediaType.MULTIPART_FORM_DATA_VALUE,
                            schema = @io.swagger.v3.oas.annotations.media.Schema(implementation = DestinationProposalWithImagesForm.class),
                            encoding = {
                                    @io.swagger.v3.oas.annotations.media.Encoding(name = "request", contentType = MediaType.APPLICATION_JSON_VALUE),
                                    @io.swagger.v3.oas.annotations.media.Encoding(name = "image", contentType = "image/*"),
                                    @io.swagger.v3.oas.annotations.media.Encoding(name = "images", contentType = "image/*")
                            })))
    public ResponseEntity<ApiResponse<DestinationRequestResponse>> submitRequestWithImages(
            @RequestPart("request") Part requestPart,
            @RequestPart(value = "image", required = false) MultipartFile image,
            @RequestPart(value = "images", required = false) List<MultipartFile> images,
            @AuthenticationPrincipal UserPrincipal principal) {
        CreateDestinationProposalRequest dto = parseRequestPart(requestPart);
        List<MultipartFile> allFiles = new java.util.ArrayList<>();
        if (image != null && !image.isEmpty()) {
            allFiles.add(image);
        }
        if (images != null && !images.isEmpty()) {
            allFiles.addAll(images);
        }
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Gửi đề xuất điểm đến và tải ảnh lên Cloudinary thành công",
                        service.submitRequestWithImages(dto, allFiles, principal.getId())));
    }

    @PostMapping(value = "/{id}/images", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('PARTNER', 'ADMIN')")
    @Operation(summary = "Tải thêm ảnh lên Cloudinary cho đề xuất điểm đến",
            description = "Tải các tệp ảnh trực tiếp lên Cloudinary và gắn vào danh sách ảnh của yêu cầu")
    public ResponseEntity<ApiResponse<DestinationRequestResponse>> uploadImages(
            @PathVariable Long id,
            @RequestPart("files") List<MultipartFile> files,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success("Tải ảnh lên Cloudinary thành công",
                service.addImagesToRequest(id, files, principal.getId())));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('PARTNER', 'ADMIN')")
    @Operation(summary = "Đối tác gửi đề xuất điểm đến mới bằng JSON (SUBMITTED)",
            description = "Đối tác cung cấp thông tin điểm đến và danh sách URL ảnh đã tải lên Cloudinary trước đó")
    public ResponseEntity<ApiResponse<DestinationRequestResponse>> submitRequest(
            @Valid @RequestBody CreateDestinationProposalRequest dto,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Gửi đề xuất điểm đến thành công",
                        service.submitRequest(dto, principal.getId())));
    }

    @GetMapping("/my")
    @PreAuthorize("hasAnyRole('PARTNER', 'ADMIN')")
    @Operation(summary = "Lấy danh sách đề xuất của đối tác hiện tại")
    public ResponseEntity<ApiResponse<PageResponse<DestinationRequestResponse>>> getMyRequests(
            @RequestParam(required = false) DestinationRequestStatus status,
            @RequestParam(required = false) String search,
            @ParameterObject @PageableDefault(size = 10, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách đề xuất thành công",
                service.getMyRequests(principal.getId(), status, search, pageable)));
    }

    @PostMapping("/{id}/cancel")
    @PreAuthorize("hasAnyRole('PARTNER', 'ADMIN')")
    @Operation(summary = "Đối tác rút/hủy đề xuất điểm đến (CANCELLED)",
            description = "Cho phép đối tác rút lại yêu cầu khi chưa bắt đầu thực hiện")
    public ResponseEntity<ApiResponse<DestinationRequestResponse>> cancelRequest(
            @PathVariable Long id,
            @RequestBody(required = false) CancelDestinationProposalRequest dto,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success("Đã hủy đề xuất điểm đến",
                service.cancelRequest(id, principal.getId(), role(principal), dto)));
    }

    // ── 2. Content Moderator: Kiểm tra sơ bộ lần 1 (Hợp lệ & Phù hợp) ─────────

    @GetMapping("/queue/initial")
    @PreAuthorize("hasAnyRole('ADMIN', 'MODERATOR')")
    @Operation(summary = "Hàng chờ kiểm duyệt lần 1 (SUBMITTED, UNDER_REVIEW)")
    public ResponseEntity<ApiResponse<PageResponse<DestinationRequestResponse>>> getQueueInitialReview(
            @ParameterObject @PageableDefault(size = 10, sort = "createdAt", direction = Sort.Direction.ASC) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success("Lấy hàng chờ sơ duyệt thành công",
                service.getQueueInitialReview(pageable)));
    }

    @PostMapping("/{id}/start-review")
    @PreAuthorize("hasAnyRole('ADMIN', 'MODERATOR')")
    @Operation(summary = "Moderator bắt đầu thẩm định sơ bộ (UNDER_REVIEW)")
    public ResponseEntity<ApiResponse<DestinationRequestResponse>> startReview(
            @PathVariable Long id,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success("Bắt đầu xem xét đề xuất điểm đến",
                service.startReview(id, principal.getId())));
    }

    @PostMapping("/{id}/initial-approve")
    @PreAuthorize("hasAnyRole('ADMIN', 'MODERATOR')")
    @Operation(summary = "Moderator phê duyệt tính hợp lệ (Lần 1 -> APPROVED)",
            description = "Xác nhận điểm đến hợp lệ và phù hợp với nền tảng, chuyển sang hàng chờ phân công")
    public ResponseEntity<ApiResponse<DestinationRequestResponse>> initialApprove(
            @PathVariable Long id,
            @RequestBody(required = false) InitialReviewDecisionRequest dto,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success("Đã phê duyệt đề xuất điểm đến, chuyển sang hàng chờ phân công",
                service.initialApprove(id, principal.getId(), dto)));
    }

    @PostMapping("/{id}/initial-reject")
    @PreAuthorize("hasAnyRole('ADMIN', 'MODERATOR')")
    @Operation(summary = "Moderator từ chối đề xuất (Lần 1 -> REJECTED)",
            description = "Từ chối đề xuất chưa phù hợp và gửi thông báo lý do cho đối tác")
    public ResponseEntity<ApiResponse<DestinationRequestResponse>> initialReject(
            @PathVariable Long id,
            @RequestBody @Valid InitialReviewDecisionRequest dto,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success("Đã từ chối đề xuất điểm đến",
                service.initialReject(id, principal.getId(), dto)));
    }

    // ── 3. Phân công Content Provider (Admin / Moderator) ────────────────────

    @GetMapping("/queue/assignment")
    @PreAuthorize("hasAnyRole('ADMIN', 'MODERATOR')")
    @Operation(summary = "Hàng chờ phân công Content Provider (APPROVED)")
    public ResponseEntity<ApiResponse<PageResponse<DestinationRequestResponse>>> getQueueAssignment(
            @ParameterObject @PageableDefault(size = 10, sort = "createdAt", direction = Sort.Direction.ASC) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success("Lấy hàng chờ phân công thành công",
                service.getQueueAssignment(pageable)));
    }

    @PostMapping("/{id}/assign")
    @PreAuthorize("hasAnyRole('ADMIN', 'MODERATOR')")
    @Operation(summary = "Phân công request cho Content Provider (ASSIGNED)",
            description = "Giao request đã APPROVED cho một Content Provider (role PROVIDER) để bắt đầu xây dựng nội dung")
    public ResponseEntity<ApiResponse<DestinationRequestResponse>> assignCp(
            @PathVariable Long id,
            @RequestBody @Valid AssignCpRequest dto,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success("Phân công Content Provider thành công",
                service.assignToCp(id, principal.getId(), dto)));
    }

    // ── 4. Content Provider (CP): Nhận việc, thiết kế & nộp duyệt nội dung ────

    @GetMapping("/assigned-to-me")
    @PreAuthorize("hasAnyRole('PROVIDER', 'ADMIN')")
    @Operation(summary = "Lấy danh sách đề xuất được phân công cho Content Provider hiện tại")
    public ResponseEntity<ApiResponse<PageResponse<DestinationRequestResponse>>> getAssignedToMe(
            @RequestParam(required = false) DestinationRequestStatus status,
            @RequestParam(required = false) String search,
            @ParameterObject @PageableDefault(size = 10, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách công việc thành công",
                service.getAssignedToCp(principal.getId(), status, search, pageable)));
    }

    @PostMapping("/{id}/start-progress")
    @PreAuthorize("hasAnyRole('PROVIDER', 'ADMIN')")
    @Operation(summary = "CP tiếp nhận và bắt đầu nghiên cứu/thiết kế (IN_PROGRESS)")
    public ResponseEntity<ApiResponse<DestinationRequestResponse>> startProgress(
            @PathVariable Long id,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success("Bắt đầu thực hiện xây dựng nội dung",
                service.startProgress(id, principal.getId())));
    }

    @PostMapping("/{id}/link-destination/{destinationId}")
    @PreAuthorize("hasAnyRole('PROVIDER', 'ADMIN')")
    @Operation(summary = "CP liên kết bản ghi Destination thực tế với request")
    public ResponseEntity<ApiResponse<DestinationRequestResponse>> linkDestination(
            @PathVariable Long id,
            @PathVariable Long destinationId,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success("Liên kết điểm đến thành công",
                service.linkDestination(id, destinationId, principal.getId())));
    }

    @PostMapping("/{id}/submit-content")
    @PreAuthorize("hasAnyRole('PROVIDER', 'ADMIN')")
    @Operation(summary = "CP nộp nội dung hoàn chỉnh để duyệt lần 2 (PENDING_CONTENT_REVIEW)")
    public ResponseEntity<ApiResponse<DestinationRequestResponse>> submitContent(
            @PathVariable Long id,
            @RequestBody(required = false) SubmitContentRequest dto,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success("Đã nộp nội dung để kiểm duyệt chất lượng",
                service.submitContent(id, principal.getId(), dto)));
    }

    // ── 5. Content Moderator: Kiểm duyệt chất lượng nội dung lần 2 ────────────

    @GetMapping("/queue/content")
    @PreAuthorize("hasAnyRole('ADMIN', 'MODERATOR')")
    @Operation(summary = "Hàng chờ kiểm duyệt nội dung lần 2 (PENDING_CONTENT_REVIEW)")
    public ResponseEntity<ApiResponse<PageResponse<DestinationRequestResponse>>> getQueueContentReview(
            @ParameterObject @PageableDefault(size = 10, sort = "createdAt", direction = Sort.Direction.ASC) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success("Lấy hàng chờ kiểm duyệt nội dung thành công",
                service.getQueueContentReview(pageable)));
    }

    @PostMapping("/{id}/content-approve")
    @PreAuthorize("hasAnyRole('ADMIN', 'MODERATOR')")
    @Operation(summary = "Moderator duyệt nội dung lần 2 -> Xuất bản Destination (COMPLETED)",
            description = "Kiểm duyệt chất lượng và độ chính xác của nội dung do CP tạo ra. Điểm đến được chuyển sang PUBLISHED.")
    public ResponseEntity<ApiResponse<DestinationRequestResponse>> approveContent(
            @PathVariable Long id,
            @RequestBody(required = false) ContentApproveDecisionRequest dto,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success("Đã phê duyệt nội dung và xuất bản điểm đến thành công",
                service.approveContent(id, principal.getId(), dto)));
    }

    @PostMapping("/{id}/content-reject")
    @PreAuthorize("hasAnyRole('ADMIN', 'MODERATOR')")
    @Operation(summary = "Moderator từ chối nội dung lần 2 -> Trả về IN_PROGRESS kèm feedback cho CP")
    public ResponseEntity<ApiResponse<DestinationRequestResponse>> rejectContent(
            @PathVariable Long id,
            @RequestBody @Valid ContentRejectDecisionRequest dto,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success("Đã yêu cầu chỉnh sửa nội dung, trả về cho Content Provider",
                service.rejectContent(id, principal.getId(), dto)));
    }

    // ── Tra cứu chung & chi tiết ─────────────────────────────────────────────

    @GetMapping("/{id}")
    @Operation(summary = "Xem chi tiết đề xuất điểm đến và lịch sử xử lý")
    public ResponseEntity<ApiResponse<DestinationRequestResponse>> getById(
            @PathVariable Long id,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success("Lấy thông tin đề xuất thành công",
                service.getById(id, principal.getId(), role(principal))));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'MODERATOR', 'PARTNER', 'PROVIDER')")
    @Operation(summary = "Lấy danh sách đề xuất điểm đến (phân quyền theo vai trò)")
    public ResponseEntity<ApiResponse<PageResponse<DestinationRequestResponse>>> getAll(
            @RequestParam(required = false) DestinationRequestStatus status,
            @RequestParam(required = false) String search,
            @ParameterObject @PageableDefault(size = 10, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách đề xuất thành công",
                service.getAll(status, search, pageable, principal.getId(), role(principal))));
    }

    private CreateDestinationProposalRequest parseRequestPart(Part requestPart) {
        try {
            String json = new String(requestPart.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
            CreateDestinationProposalRequest request = objectMapper.readValue(json, CreateDestinationProposalRequest.class);
            var violations = validator.validate(request);
            if (!violations.isEmpty()) {
                throw new AppException(ErrorCode.VALIDATION_ERROR, violations.iterator().next().getMessage());
            }
            return request;
        } catch (IOException exception) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Không đọc được phần JSON request trong multipart request");
        }
    }

    private Role role(UserPrincipal principal) {
        if (principal == null || principal.getAuthorities() == null || principal.getAuthorities().isEmpty()) {
            return Role.builder().name(Role.TOURIST).build();
        }
        String authority = principal.getAuthorities().iterator().next().getAuthority();
        String roleName = authority.startsWith("ROLE_") ? authority.substring(5) : authority;
        return Role.builder().name(roleName).build();
    }
}
