package com.journeygo.common.service;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import com.journeygo.common.exception.AppException;
import com.journeygo.common.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Base64;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class CloudinaryService {

    private final Cloudinary cloudinary;

    @Value("${cloudinary.cloud-name:}")
    private String cloudName;

    @Value("${cloudinary.api-key:}")
    private String apiKey;

    @Value("${cloudinary.api-secret:}")
    private String apiSecret;

    /**
     * Kiểm tra xem thông tin cấu hình Cloudinary đã được nhập hay chưa.
     */
    public boolean isConfigured() {
        return StringUtils.hasText(cloudName)
                && StringUtils.hasText(apiKey)
                && StringUtils.hasText(apiSecret);
    }

    /**
     * Upload ảnh lên Cloudinary và trả về đường dẫn secure URL (https).
     * Nếu Cloudinary chưa được cấu hình, tự động chuyển đổi sang Base64 Data URL
     * để hệ thống vẫn hoạt động thông suốt mà không làm gián đoạn phát triển.
     */
    public String uploadImage(MultipartFile file, String folder) {
        validateImageFile(file);

        if (isConfigured()) {
            try {
                String targetFolder = StringUtils.hasText(folder) ? folder : "journeygo/uploads";
                @SuppressWarnings("unchecked")
                Map<String, Object> uploadResult = cloudinary.uploader().upload(
                        file.getBytes(),
                        ObjectUtils.asMap(
                                "folder", targetFolder,
                                "resource_type", "image"
                        )
                );
                String secureUrl = (String) uploadResult.get("secure_url");
                log.info("Uploaded image to Cloudinary successfully: url={}", secureUrl);
                return secureUrl;
            } catch (IOException e) {
                log.error("Failed to upload image to Cloudinary: {}", e.getMessage(), e);
                throw new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION, "Lỗi khi tải ảnh lên dịch vụ Cloudinary: " + e.getMessage());
            }
        }

        // Fallback Base64 khi chưa cấu hình API Key Cloudinary
        log.warn("Cloudinary chưa được cấu hình key (CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET). " +
                "Đang tự động chuyển đổi tệp sang Base64 Data URL để tiếp tục chạy.");
        try {
            String base64 = Base64.getEncoder().encodeToString(file.getBytes());
            String mimeType = file.getContentType() != null ? file.getContentType() : "image/jpeg";
            return "data:" + mimeType + ";base64," + base64;
        } catch (IOException e) {
            throw new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION, "Lỗi khi đọc file ảnh: " + e.getMessage());
        }
    }

    /**
     * Upload tài liệu (ảnh hoặc PDF) lên Cloudinary và trả về secure URL.
     *
     * <p>Dùng cho hồ sơ đăng ký đối tác: giấy phép, GPKD, giấy ký quỹ — có thể là PDF.
     * Nếu Cloudinary chưa cấu hình thì trả Base64 Data URL để luồng vẫn chạy được.
     */
    public String uploadDocument(MultipartFile file, String folder) {
        validateDocumentFile(file);

        if (isConfigured()) {
            try {
                String targetFolder = StringUtils.hasText(folder) ? folder : "journeygo/documents";
                @SuppressWarnings("unchecked")
                Map<String, Object> uploadResult = cloudinary.uploader().upload(
                        file.getBytes(),
                        ObjectUtils.asMap(
                                "folder", targetFolder,
                                "resource_type", "auto"
                        )
                );
                String secureUrl = (String) uploadResult.get("secure_url");
                log.info("Uploaded document to Cloudinary successfully: url={}", secureUrl);
                return secureUrl;
            } catch (IOException e) {
                log.error("Failed to upload document to Cloudinary: {}", e.getMessage(), e);
                throw new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION,
                        "Lỗi khi tải tài liệu lên dịch vụ Cloudinary: " + e.getMessage());
            }
        }

        log.warn("Cloudinary chưa được cấu hình key. Đang chuyển tệp sang Base64 Data URL để tiếp tục chạy.");
        try {
            String base64 = Base64.getEncoder().encodeToString(file.getBytes());
            String mimeType = file.getContentType() != null ? file.getContentType() : "application/octet-stream";
            return "data:" + mimeType + ";base64," + base64;
        } catch (IOException e) {
            throw new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION, "Lỗi khi đọc file tài liệu: " + e.getMessage());
        }
    }

    /**
     * Xóa ảnh trên Cloudinary theo publicId
     */
    public void deleteImage(String publicId) {
        if (!isConfigured() || !StringUtils.hasText(publicId)) {
            return;
        }
        try {
            cloudinary.uploader().destroy(publicId, ObjectUtils.emptyMap());
            log.info("Deleted image from Cloudinary: publicId={}", publicId);
        } catch (IOException e) {
            log.warn("Could not delete image from Cloudinary: publicId={}, error={}", publicId, e.getMessage());
        }
    }

    private void validateImageFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Tệp tải lên không được để trống");
        }

        // Một số client di động gửi application/octet-stream cho mọi tệp, khi đó xét theo đuôi tên tệp
        String contentType = file.getContentType();
        boolean imageType = contentType != null && contentType.toLowerCase().startsWith("image/");
        String filename = file.getOriginalFilename() == null ? "" : file.getOriginalFilename().toLowerCase();
        boolean imageExtension = filename.matches(".*\\.(png|jpe?g|webp|gif|heic|heif)$");
        if (!imageType && !imageExtension) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Chỉ chấp nhận tệp hình ảnh (PNG, JPG, JPEG, WEBP, GIF)");
        }

        // Giới hạn 10MB
        long maxSize = 10L * 1024 * 1024;
        if (file.getSize() > maxSize) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Dung lượng ảnh tối đa cho phép là 10MB");
        }
    }

    /** Dung lượng video tối đa (giới hạn upload của gói Cloudinary miễn phí là 100MB). */
    public static final long MAX_VIDEO_BYTES = 100L * 1024 * 1024;

    /**
     * Upload video (MP4 / WEBM / MOV) lên Cloudinary — dùng cho video cổ vật của tour.
     * Video không có phương án Base64 dự phòng vì quá lớn để lưu trong DB: chưa cấu hình Cloudinary thì báo lỗi.
     */
    public String uploadVideo(MultipartFile file, String folder) {
        if (file == null || file.isEmpty()) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Tệp tải lên không được để trống");
        }
        String contentType = file.getContentType() == null ? "" : file.getContentType().toLowerCase();
        String filename = file.getOriginalFilename() == null ? "" : file.getOriginalFilename().toLowerCase();
        boolean videoType = contentType.startsWith("video/");
        boolean videoExtension = filename.matches(".*\\.(mp4|webm|mov|m4v)$");
        if (!videoType && !videoExtension) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Chỉ chấp nhận tệp video (MP4, WEBM, MOV)");
        }
        if (file.getSize() > MAX_VIDEO_BYTES) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Dung lượng video tối đa cho phép là 100MB");
        }
        if (!isConfigured()) {
            throw new AppException(ErrorCode.VALIDATION_ERROR,
                    "Máy chủ chưa cấu hình Cloudinary nên chưa tải được video. Vui lòng dùng link YouTube hoặc MP4");
        }
        try {
            String targetFolder = StringUtils.hasText(folder) ? folder : "journeygo/videos";
            @SuppressWarnings("unchecked")
            Map<String, Object> uploadResult = cloudinary.uploader().upload(
                    file.getBytes(),
                    ObjectUtils.asMap("folder", targetFolder, "resource_type", "video"));
            String secureUrl = (String) uploadResult.get("secure_url");
            log.info("Uploaded video to Cloudinary successfully: url={}", secureUrl);
            return secureUrl;
        } catch (IOException e) {
            log.error("Failed to upload video to Cloudinary: {}", e.getMessage(), e);
            throw new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION, "Lỗi khi tải video lên dịch vụ Cloudinary: " + e.getMessage());
        }
    }

    /**
     * Kiểm tra tệp tài liệu: chấp nhận ảnh và PDF (hồ sơ đăng ký đối tác).
     */
    private void validateDocumentFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Tệp tải lên không được để trống");
        }

        String contentType = file.getContentType() == null
                ? "" : file.getContentType().toLowerCase();
        String filename = file.getOriginalFilename() == null ? "" : file.getOriginalFilename().toLowerCase();

        boolean imageType = contentType.startsWith("image/");
        boolean pdfType = contentType.equals("application/pdf");
        boolean imageExtension = filename.matches(".*\\.(png|jpe?g|webp|gif|heic|heif)$");
        boolean pdfExtension = filename.endsWith(".pdf");

        if (!imageType && !pdfType && !imageExtension && !pdfExtension) {
            throw new AppException(ErrorCode.VALIDATION_ERROR,
                    "Chỉ chấp nhận tệp ảnh (PNG, JPG, WEBP) hoặc PDF");
        }

        long maxSize = 10L * 1024 * 1024;
        if (file.getSize() > maxSize) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Dung lượng tệp tối đa cho phép là 10MB");
        }
    }
}
