package com.journeygo.modules.media.service;

import com.journeygo.common.exception.AppException;
import com.journeygo.common.exception.ErrorCode;
import com.journeygo.modules.destination.entity.Destination;
import com.journeygo.modules.destination.repository.DestinationRepository;
import com.journeygo.modules.media.dto.CloudinaryUploadSignatureResponse;
import com.journeygo.modules.media.dto.CloudinaryUploadedImage;
import com.journeygo.modules.user.entity.Role;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.client.MultipartBodyBuilder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.multipart.MultipartFile;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.net.URI;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;
import java.util.UUID;

@Slf4j
@Service
public class CloudinaryImageService {
    private static final String FOLDER_ROOT = "journey-go/cultural-content";
    private static final String ALLOWED_FORMATS = "jpg,png,webp,avif";

    private final String cloudName;
    private final String apiKey;
    private final String apiSecret;
    private final DestinationRepository destinationRepository;
    private final RestClient restClient = RestClient.create();

    public CloudinaryImageService(
            @Value("${app.cloudinary.cloud-name:}") String cloudName,
            @Value("${app.cloudinary.api-key:}") String apiKey,
            @Value("${app.cloudinary.api-secret:}") String apiSecret,
            DestinationRepository destinationRepository) {
        this.cloudName = cloudName;
        this.apiKey = apiKey;
        this.apiSecret = apiSecret;
        this.destinationRepository = destinationRepository;
    }

    public CloudinaryUploadSignatureResponse createUploadSignature(Long destinationId, Long callerId, Role callerRole) {
        requireConfigured();
        Destination destination = destinationRepository.findByIdAndDeletedFalse(destinationId)
                .orElseThrow(() -> new AppException(ErrorCode.DESTINATION_NOT_FOUND));
        if (callerRole != null && callerRole.isContentProvider()) {
            Long ownerId = destination.getCreatedBy() == null ? null : destination.getCreatedBy().getId();
            if (ownerId == null || !ownerId.equals(callerId)) throw new AppException(ErrorCode.UNAUTHORIZED);
        }

        String folder = FOLDER_ROOT + "/destination-" + destinationId + "/user-" + callerId;
        String publicId = UUID.randomUUID().toString();
        long timestamp = Instant.now().getEpochSecond();
        Map<String, String> signedParams = new TreeMap<>();
        signedParams.put("allowed_formats", ALLOWED_FORMATS);
        signedParams.put("folder", folder);
        signedParams.put("public_id", publicId);
        signedParams.put("timestamp", Long.toString(timestamp));
        String signature = sign(signedParams);
        return new CloudinaryUploadSignatureResponse(cloudName, apiKey, folder, publicId, timestamp,
                ALLOWED_FORMATS, signature,
                "https://api.cloudinary.com/v1_1/" + cloudName + "/image/upload");
    }

    /** Upload an image from a multipart content-create request using a server-side Cloudinary signature. */
    public CloudinaryUploadedImage uploadImage(MultipartFile file, Long destinationId, Long callerId, Role callerRole) {
        requireConfigured();
        if (file == null || file.isEmpty() || file.getSize() > 8L * 1024 * 1024) {
            throw new AppException(ErrorCode.INVALID_CLOUDINARY_ASSET, "Ảnh không được để trống và tối đa 8 MB");
        }
        String mediaType = file.getContentType();
        if (mediaType == null || !Set.of("image/jpeg", "image/png", "image/webp", "image/avif").contains(mediaType.toLowerCase())) {
            throw new AppException(ErrorCode.INVALID_CLOUDINARY_ASSET, "Chỉ chấp nhận ảnh JPG, PNG, WEBP hoặc AVIF");
        }

        Destination destination = destinationRepository.findByIdAndDeletedFalse(destinationId)
                .orElseThrow(() -> new AppException(ErrorCode.DESTINATION_NOT_FOUND));
        if (callerRole != null && callerRole.isContentProvider()) {
            Long ownerId = destination.getCreatedBy() == null ? null : destination.getCreatedBy().getId();
            if (ownerId == null || !ownerId.equals(callerId)) throw new AppException(ErrorCode.UNAUTHORIZED);
        }

        String folder = FOLDER_ROOT + "/destination-" + destinationId + "/user-" + callerId;
        String requestedPublicId = UUID.randomUUID().toString();
        long timestamp = Instant.now().getEpochSecond();
        Map<String, String> signedParams = new TreeMap<>();
        signedParams.put("allowed_formats", ALLOWED_FORMATS);
        signedParams.put("folder", folder);
        signedParams.put("public_id", requestedPublicId);
        signedParams.put("timestamp", Long.toString(timestamp));

        MultipartBodyBuilder body = new MultipartBodyBuilder();
        try {
            byte[] bytes = file.getBytes();
            String filename = file.getOriginalFilename() == null ? "content-image" : file.getOriginalFilename();
            body.part("file", new ByteArrayResource(bytes) {
                @Override public String getFilename() { return filename; }
            }).contentType(MediaType.parseMediaType(mediaType));
        } catch (java.io.IOException exception) {
            throw new AppException(ErrorCode.INVALID_CLOUDINARY_ASSET, "Không thể đọc file ảnh");
        }
        body.part("api_key", apiKey);
        body.part("timestamp", Long.toString(timestamp));
        body.part("folder", folder);
        body.part("public_id", requestedPublicId);
        body.part("allowed_formats", ALLOWED_FORMATS);
        body.part("signature", sign(signedParams));

        Map<?, ?> result;
        try {
            result = restClient.post()
                    .uri("https://api.cloudinary.com/v1_1/{cloudName}/image/upload", cloudName)
                    .body(body.build())
                    .retrieve()
                    .body(Map.class);
        } catch (RestClientException exception) {
            log.error("Cloudinary upload failed for destinationId={}", destinationId, exception);
            throw new AppException(ErrorCode.INVALID_CLOUDINARY_ASSET, "Tải ảnh lên Cloudinary thất bại");
        }
        if (result == null || result.get("secure_url") == null || result.get("public_id") == null) {
            throw new AppException(ErrorCode.INVALID_CLOUDINARY_ASSET, "Cloudinary không trả về thông tin ảnh hợp lệ");
        }
        return new CloudinaryUploadedImage(result.get("secure_url").toString(), result.get("public_id").toString());
    }

    public void validateAsset(String secureUrl, String publicId, Long destinationId, Long callerId, String currentPublicId) {
        if (publicId == null || publicId.isBlank()) return;
        boolean sameExistingAsset = publicId.equals(currentPublicId);
        String expectedPrefix = FOLDER_ROOT + "/destination-" + destinationId + "/user-" + callerId + "/";
        boolean ownedNewAsset = publicId.startsWith(expectedPrefix) && publicId.length() > expectedPrefix.length();
        if (!sameExistingAsset && !ownedNewAsset) {
            throw new AppException(ErrorCode.INVALID_CLOUDINARY_ASSET);
        }
        try {
            URI uri = URI.create(secureUrl == null ? "" : secureUrl);
            String expectedPathPrefix = "/" + cloudName + "/image/upload/";
            if (!"https".equalsIgnoreCase(uri.getScheme())
                    || !"res.cloudinary.com".equalsIgnoreCase(uri.getHost())
                    || !uri.getPath().startsWith(expectedPathPrefix)
                    || !uri.getPath().contains(publicId)) {
                throw new AppException(ErrorCode.INVALID_CLOUDINARY_ASSET);
            }
        } catch (IllegalArgumentException exception) {
            throw new AppException(ErrorCode.INVALID_CLOUDINARY_ASSET);
        }
    }

    /** Delete the old image only after the DB update commits. */
    public void deleteAfterCommit(String publicId) {
        if (publicId == null || publicId.isBlank()) return;
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override public void afterCommit() { delete(publicId); }
            });
        } else {
            delete(publicId);
        }
    }

    public void deleteImmediately(String publicId) {
        delete(publicId);
    }

    private void delete(String publicId) {
        if (!isConfigured()) {
            log.warn("Cloudinary is not configured; skipped deletion for publicId={}", publicId);
            return;
        }
        long timestamp = Instant.now().getEpochSecond();
        Map<String, String> signedParams = new TreeMap<>();
        signedParams.put("public_id", publicId);
        signedParams.put("timestamp", Long.toString(timestamp));
        MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("public_id", publicId);
        form.add("timestamp", Long.toString(timestamp));
        form.add("api_key", apiKey);
        form.add("signature", sign(signedParams));
        try {
            restClient.post()
                    .uri("https://api.cloudinary.com/v1_1/{cloudName}/image/destroy", cloudName)
                    .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                    .body(form)
                    .retrieve()
                    .toBodilessEntity();
        } catch (Exception exception) {
            // Keep the DB change committed; a failed Cloudinary cleanup can be retried manually.
            log.error("Cloudinary image deletion failed for publicId={}", publicId, exception);
        }
    }

    private String sign(Map<String, String> params) {
        String canonical = params.entrySet().stream()
                .map(entry -> entry.getKey() + "=" + entry.getValue())
                .collect(java.util.stream.Collectors.joining("&"));
        try {
            byte[] digest = MessageDigest.getInstance("SHA-1")
                    .digest((canonical + apiSecret).getBytes(StandardCharsets.UTF_8));
            StringBuilder hex = new StringBuilder(digest.length * 2);
            for (byte value : digest) hex.append(String.format("%02x", value));
            return hex.toString();
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-1 is unavailable", exception);
        }
    }

    private void requireConfigured() {
        if (!isConfigured()) throw new AppException(ErrorCode.CLOUDINARY_NOT_CONFIGURED);
    }

    private boolean isConfigured() {
        return cloudName != null && !cloudName.isBlank()
                && apiKey != null && !apiKey.isBlank()
                && apiSecret != null && !apiSecret.isBlank();
    }
}
