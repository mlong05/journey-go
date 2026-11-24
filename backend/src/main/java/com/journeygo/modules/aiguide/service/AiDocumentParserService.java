package com.journeygo.modules.aiguide.service;

import com.journeygo.common.exception.AppException;
import com.journeygo.common.exception.ErrorCode;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.poi.xwpf.extractor.XWPFWordExtractor;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.Locale;

/**
 * Service trích xuất văn bản thuần từ tệp tải lên của Admin (.txt, .md, .docx, .pdf).
 */
@Service
public class AiDocumentParserService {

    public static final long MAX_FILE_BYTES = 10L * 1024 * 1024;

    public record ParsedFileResult(String fileName, String fileType, long fileSize, String extractedText) {
    }

    public ParsedFileResult parse(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Tệp tải lên không được để trống");
        }
        if (file.getSize() > MAX_FILE_BYTES) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Dung lượng tệp tối đa cho phép là 10MB");
        }

        String originalName = file.getOriginalFilename() != null ? file.getOriginalFilename().trim() : "document";
        String fileType = resolveFileType(originalName);

        String extracted;
        try {
            extracted = switch (fileType) {
                case "TXT", "MD" -> extractPlainText(file);
                case "DOCX" -> extractDocx(file);
                case "PDF" -> extractPdf(file);
                default -> throw new AppException(ErrorCode.VALIDATION_ERROR,
                        "Chỉ hỗ trợ định dạng .txt, .md, .docx, .pdf");
            };
        } catch (AppException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new AppException(ErrorCode.VALIDATION_ERROR,
                    "Không thể đọc nội dung tệp " + originalName + ": " + ex.getMessage());
        }

        String normalized = normalizeText(extracted);
        if (!StringUtils.hasText(normalized)) {
            throw new AppException(ErrorCode.VALIDATION_ERROR,
                    "Không trích xuất được văn bản từ tệp. Nếu là PDF dạng ảnh scan, vui lòng dùng PDF có text hoặc dán nội dung trực tiếp.");
        }

        return new ParsedFileResult(originalName, fileType, file.getSize(), normalized);
    }

    private String resolveFileType(String filename) {
        String lower = filename.toLowerCase(Locale.ROOT);
        if (lower.endsWith(".txt")) {
            return "TXT";
        }
        if (lower.endsWith(".md") || lower.endsWith(".markdown")) {
            return "MD";
        }
        if (lower.endsWith(".docx")) {
            return "DOCX";
        }
        if (lower.endsWith(".pdf")) {
            return "PDF";
        }
        throw new AppException(ErrorCode.VALIDATION_ERROR, "Chỉ hỗ trợ định dạng .txt, .md, .docx, .pdf");
    }

    private String extractPlainText(MultipartFile file) throws IOException {
        String text = new String(file.getBytes(), StandardCharsets.UTF_8);
        if (text.startsWith("\uFEFF")) {
            return text.substring(1);
        }
        return text;
    }

    private String extractDocx(MultipartFile file) throws IOException {
        try (InputStream in = file.getInputStream();
             XWPFDocument doc = new XWPFDocument(in);
             XWPFWordExtractor extractor = new XWPFWordExtractor(doc)) {
            return extractor.getText();
        }
    }

    private String extractPdf(MultipartFile file) throws IOException {
        try (PDDocument doc = Loader.loadPDF(file.getBytes())) {
            PDFTextStripper stripper = new PDFTextStripper();
            return stripper.getText(doc);
        }
    }

    private String normalizeText(String raw) {
        if (raw == null) {
            return "";
        }
        return raw.replace("\r\n", "\n").replace("\r", "\n").trim();
    }
}
