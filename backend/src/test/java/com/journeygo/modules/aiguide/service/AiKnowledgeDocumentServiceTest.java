package com.journeygo.modules.aiguide.service;

import com.journeygo.common.exception.AppException;
import com.journeygo.common.exception.ErrorCode;
import com.journeygo.common.service.CloudinaryService;
import com.journeygo.modules.aiguide.dto.AiKnowledgeDocumentDto;
import com.journeygo.modules.aiguide.entity.AiDocumentScope;
import com.journeygo.modules.aiguide.entity.AiDocumentType;
import com.journeygo.modules.aiguide.entity.AiKnowledgeDocument;
import com.journeygo.modules.aiguide.repository.AiKnowledgeDocumentRepository;
import com.journeygo.modules.destination.entity.Destination;
import com.journeygo.modules.destination.repository.DestinationRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AiKnowledgeDocumentServiceTest {

    @Mock
    private AiKnowledgeDocumentRepository documentRepository;

    @Mock
    private DestinationRepository destinationRepository;

    @Mock
    private AiDocumentParserService parserService;

    @Mock
    private DocumentIngestionService ingestionService;

    @Mock
    private CloudinaryService cloudinaryService;

    @InjectMocks
    private AiKnowledgeDocumentService documentService;

    @Test
    @DisplayName("Tạo tài liệu RAG với file đính kèm: lưu Cloudinary raw, nạp vector và lưu metadata DB")
    void createDocument_ragDocWithFile_uploadsCloudinaryAndIngests() {
        MockMultipartFile file = new MockMultipartFile(
                "file", "refund-policy.md", "text/markdown", "Hoàn tiền 100%".getBytes(StandardCharsets.UTF_8)
        );

        when(parserService.parse(file)).thenReturn(
                new AiDocumentParserService.ParsedFileResult("refund-policy.md", "MD", 16L, "Hoàn tiền 100%")
        );
        when(cloudinaryService.uploadRawFile(file, "journeygo/ai-documents"))
                .thenReturn(new CloudinaryService.RawUploadResult("https://res.cloudinary.com/demo/raw/policy.md", "journeygo/ai-documents/policy"));
        when(documentRepository.save(any(AiKnowledgeDocument.class))).thenAnswer(inv -> {
            AiKnowledgeDocument d = inv.getArgument(0);
            if (d.getId() == null) d.setId(10L);
            if (d.getCreatedAt() == null) d.setCreatedAt(Instant.now());
            d.setUpdatedAt(Instant.now());
            return d;
        });
        when(ingestionService.ingestAdminDocument(10L, null, null, "PLATFORM_POLICY", "Chính sách hoàn tiền", "Hoàn tiền 100%"))
                .thenReturn(2);

        AiKnowledgeDocumentDto result = documentService.createDocument(
                "Chính sách hoàn tiền",
                AiDocumentType.PLATFORM_POLICY,
                AiDocumentScope.GLOBAL,
                null,
                null,
                file,
                true,
                1L
        );

        assertThat(result.id()).isEqualTo(10L);
        assertThat(result.chunkCount()).isEqualTo(2);
        assertThat(result.fileUrl()).isEqualTo("https://res.cloudinary.com/demo/raw/policy.md");
        verify(ingestionService).ingestAdminDocument(10L, null, null, "PLATFORM_POLICY", "Chính sách hoàn tiền", "Hoàn tiền 100%");
    }

    @Test
    @DisplayName("Tạo AI_RULE không cắt chunk/vector và từ chối nếu vượt quá 4000 ký tự")
    void createDocument_aiRule_skipsVectorAndEnforcesLengthLimit() {
        when(documentRepository.save(any(AiKnowledgeDocument.class))).thenAnswer(inv -> {
            AiKnowledgeDocument d = inv.getArgument(0);
            if (d.getId() == null) d.setId(11L);
            return d;
        });

        AiKnowledgeDocumentDto ruleDto = documentService.createDocument(
                "Quy tắc xưng hô",
                AiDocumentType.AI_RULE,
                AiDocumentScope.GLOBAL,
                null,
                "Luôn giữ thái độ lịch sự, tôn trọng văn hóa bản địa.",
                null,
                true,
                1L
        );

        assertThat(ruleDto.docType()).isEqualTo(AiDocumentType.AI_RULE);
        assertThat(ruleDto.chunkCount()).isZero();
        verify(ingestionService, never()).ingestAdminDocument(any(), any(), any(), any(), any(), any());
        verify(ingestionService).invalidateContent("ADMIN_DOC:11");

        String tooLong = "x".repeat(VirtualGuidePromptTemplate.MAX_DYNAMIC_RULES_CHARS + 1);
        assertThatThrownBy(() -> documentService.createDocument(
                "Rule quá dài",
                AiDocumentType.AI_RULE,
                AiDocumentScope.GLOBAL,
                null,
                tooLong,
                null,
                true,
                1L
        ))
                .isInstanceOf(AppException.class)
                .extracting(ex -> ((AppException) ex).getErrorCode())
                .isEqualTo(ErrorCode.VALIDATION_ERROR);
    }

    @Test
    @DisplayName("Tắt/bật tài liệu RAG sẽ xóa vector cũ khi tắt và đánh chỉ mục lại khi bật")
    void toggleActive_invalidatesAndReindexesRagChunks() {
        Destination dest = Destination.builder().id(50L).name("Chùa Thiên Mụ").deleted(false).build();
        AiKnowledgeDocument doc = AiKnowledgeDocument.builder()
                .id(12L)
                .title("Văn hóa Chùa Thiên Mụ")
                .docType(AiDocumentType.CULTURAL_SUPPLEMENT)
                .scope(AiDocumentScope.DESTINATION)
                .destinationId(50L)
                .rawText("Thông tin bổ sung về đại hồng chung.")
                .active(true)
                .chunkCount(1)
                .build();

        when(documentRepository.findById(12L)).thenReturn(Optional.of(doc));
        when(destinationRepository.findByIdAndDeletedFalse(50L)).thenReturn(Optional.of(dest));
        when(documentRepository.save(any(AiKnowledgeDocument.class))).thenAnswer(inv -> inv.getArgument(0));
        when(ingestionService.ingestAdminDocument(12L, 50L, "Chùa Thiên Mụ", "CULTURAL_SUPPLEMENT", "Văn hóa Chùa Thiên Mụ", "Thông tin bổ sung về đại hồng chung."))
                .thenReturn(1);

        AiKnowledgeDocumentDto disabled = documentService.toggleActive(12L, false);
        assertThat(disabled.active()).isFalse();
        assertThat(disabled.chunkCount()).isZero();
        verify(ingestionService).invalidateContent("ADMIN_DOC:12");

        AiKnowledgeDocumentDto enabled = documentService.toggleActive(12L, true);
        assertThat(enabled.active()).isTrue();
        assertThat(enabled.chunkCount()).isEqualTo(1);
    }

    @Test
    @DisplayName("Xóa tài liệu dọn cả Vector Store, file Cloudinary raw và bản ghi DB")
    void deleteDocument_cleansVectorsCloudinaryAndDatabase() {
        AiKnowledgeDocument doc = AiKnowledgeDocument.builder()
                .id(15L)
                .title("Chính sách cũ")
                .docType(AiDocumentType.PLATFORM_POLICY)
                .scope(AiDocumentScope.GLOBAL)
                .filePublicId("journeygo/ai-documents/old_policy")
                .rawText("Nội dung cũ")
                .build();
        when(documentRepository.findById(15L)).thenReturn(Optional.of(doc));

        documentService.deleteDocument(15L);

        verify(ingestionService).invalidateContent("ADMIN_DOC:15");
        verify(cloudinaryService).deleteRawFile("journeygo/ai-documents/old_policy");
        verify(documentRepository).delete(doc);
    }
}
