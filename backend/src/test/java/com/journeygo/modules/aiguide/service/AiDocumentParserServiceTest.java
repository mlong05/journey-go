package com.journeygo.modules.aiguide.service;

import com.journeygo.common.exception.AppException;
import com.journeygo.common.exception.ErrorCode;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class AiDocumentParserServiceTest {

    private final AiDocumentParserService parserService = new AiDocumentParserService();

    @Test
    @DisplayName("Trích xuất thành công .txt và .md kèm loại bỏ UTF-8 BOM")
    void parse_txtAndMarkdownWithBom_stripsBomAndNormalizes() {
        byte[] bomContent = ("\uFEFF# Chính sách hoàn tiền\r\nHoàn 100% khi lỗi hệ thống.").getBytes(StandardCharsets.UTF_8);
        MockMultipartFile mdFile = new MockMultipartFile("file", "policy.md", "text/markdown", bomContent);

        AiDocumentParserService.ParsedFileResult result = parserService.parse(mdFile);

        assertThat(result.fileName()).isEqualTo("policy.md");
        assertThat(result.fileType()).isEqualTo("MD");
        assertThat(result.extractedText()).isEqualTo("# Chính sách hoàn tiền\nHoàn 100% khi lỗi hệ thống.");
    }

    @Test
    @DisplayName("Trích xuất văn bản từ file Word .docx bằng Apache POI")
    void parse_docx_extractsText() throws Exception {
        byte[] docxBytes;
        try (XWPFDocument doc = new XWPFDocument();
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            doc.createParagraph().createRun().setText("Thuyết minh văn hóa Hoàng Thành Huế.");
            doc.write(out);
            docxBytes = out.toByteArray();
        }

        MockMultipartFile file = new MockMultipartFile(
                "file",
                "hue-heritage.docx",
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                docxBytes
        );

        AiDocumentParserService.ParsedFileResult result = parserService.parse(file);

        assertThat(result.fileType()).isEqualTo("DOCX");
        assertThat(result.extractedText()).contains("Thuyết minh văn hóa Hoàng Thành Huế.");
    }

    @Test
    @DisplayName("Trích xuất văn bản từ file .pdf bằng PDFBox 3")
    void parse_pdf_extractsText() throws Exception {
        byte[] pdfBytes;
        try (PDDocument pdf = new PDDocument();
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            PDPage page = new PDPage();
            pdf.addPage(page);
            try (PDPageContentStream stream = new PDPageContentStream(pdf, page)) {
                stream.beginText();
                stream.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA), 12);
                stream.newLineAtOffset(50, 700);
                stream.showText("JourneyGo Platform Policy 2026");
                stream.endText();
            }
            pdf.save(out);
            pdfBytes = out.toByteArray();
        }

        MockMultipartFile file = new MockMultipartFile("file", "policy.pdf", "application/pdf", pdfBytes);

        AiDocumentParserService.ParsedFileResult result = parserService.parse(file);

        assertThat(result.fileType()).isEqualTo("PDF");
        assertThat(result.extractedText()).contains("JourneyGo Platform Policy 2026");
    }

    @Test
    @DisplayName("Từ chối PDF trống không chứa văn bản")
    void parse_blankPdf_throwsValidationError() throws Exception {
        byte[] pdfBytes;
        try (PDDocument pdf = new PDDocument();
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            pdf.addPage(new PDPage());
            pdf.save(out);
            pdfBytes = out.toByteArray();
        }

        MockMultipartFile file = new MockMultipartFile("file", "scan.pdf", "application/pdf", pdfBytes);

        assertThatThrownBy(() -> parserService.parse(file))
                .isInstanceOf(AppException.class)
                .extracting(ex -> ((AppException) ex).getErrorCode())
                .isEqualTo(ErrorCode.VALIDATION_ERROR);
    }

    @Test
    @DisplayName("Từ chối định dạng tệp không hợp lệ (.exe)")
    void parse_unsupportedExtension_throwsValidationError() {
        MockMultipartFile file = new MockMultipartFile("file", "bad.exe", "application/octet-stream", "data".getBytes());

        assertThatThrownBy(() -> parserService.parse(file))
                .isInstanceOf(AppException.class)
                .extracting(ex -> ((AppException) ex).getErrorCode())
                .isEqualTo(ErrorCode.VALIDATION_ERROR);
    }
}
