package com.journeygo.modules.aiguide.service;

import com.journeygo.common.dto.PageResponse;
import com.journeygo.common.exception.AppException;
import com.journeygo.common.exception.ErrorCode;
import com.journeygo.common.service.CloudinaryService;
import com.journeygo.modules.aiguide.dto.AiKnowledgeDocumentDto;
import com.journeygo.modules.aiguide.dto.AiKnowledgeDocumentUpdateRequest;
import com.journeygo.modules.aiguide.entity.AiDocumentScope;
import com.journeygo.modules.aiguide.entity.AiDocumentType;
import com.journeygo.modules.aiguide.entity.AiKnowledgeDocument;
import com.journeygo.modules.aiguide.repository.AiKnowledgeDocumentRepository;
import com.journeygo.modules.destination.entity.Destination;
import com.journeygo.modules.destination.repository.DestinationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Service quản lý tài liệu Context & Rule do Quản trị viên tải lên hoặc soạn trực tiếp cho AI RAG.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AiKnowledgeDocumentService {

    private static final String CLOUDINARY_DOC_FOLDER = "journeygo/ai-documents";

    private final AiKnowledgeDocumentRepository documentRepository;
    private final DestinationRepository destinationRepository;
    private final AiDocumentParserService parserService;
    private final DocumentIngestionService ingestionService;
    private final CloudinaryService cloudinaryService;

    @Transactional(readOnly = true)
    public PageResponse<AiKnowledgeDocumentDto> listDocuments(AiDocumentType docType,
                                                              AiDocumentScope scope,
                                                              Long destinationId,
                                                              Boolean active,
                                                              Pageable pageable) {
        Page<AiKnowledgeDocument> page = documentRepository.findFiltered(docType, scope, destinationId, active, pageable);
        Map<Long, String> destNames = resolveDestinationNames(page.getContent());
        Page<AiKnowledgeDocumentDto> dtoPage = page.map(doc -> AiKnowledgeDocumentDto.from(
                doc,
                doc.getDestinationId() != null ? destNames.get(doc.getDestinationId()) : null,
                false
        ));
        return PageResponse.from(dtoPage);
    }

    @Transactional(readOnly = true)
    public AiKnowledgeDocumentDto getDocument(Long id) {
        AiKnowledgeDocument doc = findOrThrow(id);
        String destName = resolveDestinationName(doc.getDestinationId());
        return AiKnowledgeDocumentDto.from(doc, destName, true);
    }

    @Transactional
    public AiKnowledgeDocumentDto createDocument(String title,
                                                 AiDocumentType docType,
                                                 AiDocumentScope scope,
                                                 Long destinationId,
                                                 String rawText,
                                                 MultipartFile file,
                                                 boolean active,
                                                 Long uploadedBy) {
        if (!StringUtils.hasText(title) || title.trim().length() > 200) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Tiêu đề phải từ 1 đến 200 ký tự");
        }
        if (docType == null) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Phân loại tài liệu không được để trống");
        }
        AiDocumentScope effectiveScope = scope != null ? scope : AiDocumentScope.GLOBAL;
        Destination targetDest = validateScopeAndDestination(effectiveScope, destinationId);
        Long effectiveDestId = targetDest != null ? targetDest.getId() : null;
        String destName = targetDest != null ? targetDest.getName() : null;

        boolean hasFile = file != null && !file.isEmpty();
        boolean hasRawText = StringUtils.hasText(rawText);
        if (!hasFile && !hasRawText) {
            throw new AppException(ErrorCode.VALIDATION_ERROR,
                    "Vui lòng tải lên tệp tài liệu (.txt, .md, .docx, .pdf) hoặc nhập nội dung trực tiếp");
        }

        String fileName = null;
        String fileType = "TEXT";
        long fileSize;
        String finalText;

        if (hasFile) {
            AiDocumentParserService.ParsedFileResult parsed = parserService.parse(file);
            fileName = parsed.fileName();
            fileType = parsed.fileType();
            fileSize = parsed.fileSize();
            finalText = hasRawText ? rawText.trim() : parsed.extractedText();
        } else {
            finalText = rawText.trim();
            fileSize = finalText.getBytes(StandardCharsets.UTF_8).length;
        }

        validateRuleLengthIfNeeded(docType, finalText);

        String fileUrl = null;
        String filePublicId = null;
        if (hasFile) {
            CloudinaryService.RawUploadResult upload = cloudinaryService.uploadRawFile(file, CLOUDINARY_DOC_FOLDER);
            if (upload != null) {
                fileUrl = upload.url();
                filePublicId = upload.publicId();
            }
        }

        AiKnowledgeDocument doc = AiKnowledgeDocument.builder()
                .title(title.trim())
                .docType(docType)
                .scope(effectiveScope)
                .destinationId(effectiveDestId)
                .fileName(fileName)
                .fileType(fileType)
                .fileSize(fileSize)
                .fileUrl(fileUrl)
                .filePublicId(filePublicId)
                .rawText(finalText)
                .active(active)
                .chunkCount(0)
                .uploadedBy(uploadedBy)
                .build();

        AiKnowledgeDocument saved = documentRepository.save(doc);
        syncDocumentChunks(saved, destName);
        saved = documentRepository.save(saved);

        log.info("Admin userId={} đã tạo tài liệu AI id={} type={} scope={} chunks={}",
                uploadedBy, saved.getId(), saved.getDocType(), saved.getScope(), saved.getChunkCount());
        return AiKnowledgeDocumentDto.from(saved, destName, true);
    }

    @Transactional
    public AiKnowledgeDocumentDto updateDocument(Long id, AiKnowledgeDocumentUpdateRequest request) {
        AiKnowledgeDocument doc = findOrThrow(id);
        Destination targetDest = validateScopeAndDestination(request.scope(), request.destinationId());
        Long effectiveDestId = targetDest != null ? targetDest.getId() : null;
        String destName = targetDest != null ? targetDest.getName() : null;

        String finalText = request.rawText().trim();
        validateRuleLengthIfNeeded(request.docType(), finalText);

        doc.setTitle(request.title().trim());
        doc.setDocType(request.docType());
        doc.setScope(request.scope());
        doc.setDestinationId(effectiveDestId);
        doc.setRawText(finalText);
        if (request.active() != null) {
            doc.setActive(request.active());
        }

        syncDocumentChunks(doc, destName);
        AiKnowledgeDocument saved = documentRepository.save(doc);
        return AiKnowledgeDocumentDto.from(saved, destName, true);
    }

    @Transactional
    public AiKnowledgeDocumentDto toggleActive(Long id, boolean active) {
        AiKnowledgeDocument doc = findOrThrow(id);
        doc.setActive(active);
        String destName = resolveDestinationName(doc.getDestinationId());
        syncDocumentChunks(doc, destName);
        AiKnowledgeDocument saved = documentRepository.save(doc);
        return AiKnowledgeDocumentDto.from(saved, destName, false);
    }

    @Transactional
    public AiKnowledgeDocumentDto reindexDocument(Long id) {
        AiKnowledgeDocument doc = findOrThrow(id);
        String destName = resolveDestinationName(doc.getDestinationId());
        syncDocumentChunks(doc, destName);
        AiKnowledgeDocument saved = documentRepository.save(doc);
        return AiKnowledgeDocumentDto.from(saved, destName, false);
    }

    @Transactional
    public void deleteDocument(Long id) {
        AiKnowledgeDocument doc = findOrThrow(id);
        ingestionService.invalidateContent("ADMIN_DOC:" + doc.getId());
        if (StringUtils.hasText(doc.getFilePublicId())) {
            cloudinaryService.deleteRawFile(doc.getFilePublicId());
        }
        documentRepository.delete(doc);
        log.info("Đã xóa tài liệu AI id={} title={}", id, doc.getTitle());
    }

    private void syncDocumentChunks(AiKnowledgeDocument doc, String destName) {
        String sourceId = "ADMIN_DOC:" + doc.getId();
        if (doc.isActive() && doc.getDocType() != null && doc.getDocType().isRagIndexed()) {
            int chunks = ingestionService.ingestAdminDocument(
                    doc.getId(),
                    doc.getDestinationId(),
                    destName,
                    doc.getDocType().name(),
                    doc.getTitle(),
                    doc.getRawText()
            );
            doc.setChunkCount(chunks);
        } else {
            ingestionService.invalidateContent(sourceId);
            doc.setChunkCount(0);
        }
    }

    private AiKnowledgeDocument findOrThrow(Long id) {
        return documentRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.AI_DOCUMENT_NOT_FOUND));
    }

    private Destination validateScopeAndDestination(AiDocumentScope scope, Long destinationId) {
        if (scope == AiDocumentScope.DESTINATION) {
            if (destinationId == null) {
                throw new AppException(ErrorCode.VALIDATION_ERROR,
                        "Vui lòng chọn điểm đến khi áp dụng phạm vi DESTINATION");
            }
            return destinationRepository.findByIdAndDeletedFalse(destinationId)
                    .orElseThrow(() -> new AppException(ErrorCode.DESTINATION_NOT_FOUND));
        }
        return null;
    }

    private void validateRuleLengthIfNeeded(AiDocumentType docType, String text) {
        if (docType == AiDocumentType.AI_RULE && text.length() > VirtualGuidePromptTemplate.MAX_DYNAMIC_RULES_CHARS) {
            throw new AppException(
                    ErrorCode.VALIDATION_ERROR,
                    "Quy tắc AI (AI_RULE) tối đa " + VirtualGuidePromptTemplate.MAX_DYNAMIC_RULES_CHARS
                            + " ký tự để không ảnh hưởng hiệu năng System Prompt. Với tài liệu dài, hãy chọn Chính sách nền tảng hoặc FAQ."
            );
        }
    }

    private String resolveDestinationName(Long destinationId) {
        if (destinationId == null) {
            return null;
        }
        return destinationRepository.findByIdAndDeletedFalse(destinationId)
                .map(Destination::getName)
                .orElse("Điểm đến #" + destinationId);
    }

    private Map<Long, String> resolveDestinationNames(List<AiKnowledgeDocument> docs) {
        Set<Long> ids = docs.stream()
                .map(AiKnowledgeDocument::getDestinationId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
        if (ids.isEmpty()) {
            return Collections.emptyMap();
        }
        Map<Long, String> map = new HashMap<>();
        for (Destination dest : destinationRepository.findAllById(ids)) {
            map.put(dest.getId(), dest.getName());
        }
        return map;
    }
}
