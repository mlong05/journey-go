package com.journeygo.modules.tour.importer;

import com.journeygo.common.exception.AppException;
import com.journeygo.common.exception.ErrorCode;
import com.journeygo.modules.destination.entity.Region;
import com.journeygo.modules.destination.entity.Theme;
import com.journeygo.modules.destination.repository.RegionRepository;
import com.journeygo.modules.destination.repository.ThemeRepository;
import com.journeygo.modules.tour.dto.wizard.TourDetailResponse;
import com.journeygo.modules.tour.dto.wizard.TourValidationIssue;
import com.journeygo.modules.tour.importer.dto.TourImportIssue;
import com.journeygo.modules.tour.importer.dto.TourImportResult;
import com.journeygo.modules.tour.service.TourDraftService;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionStatus;
import org.springframework.transaction.support.SimpleTransactionStatus;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.List;
import java.util.function.Consumer;

import static com.journeygo.modules.tour.importer.TourImportLayout.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class TourImportServiceTest {

    private static final long USER = 42L;
    private static final long TOUR = 900L;

    private final RegionRepository regionRepository = mock(RegionRepository.class);
    private final ThemeRepository themeRepository = mock(ThemeRepository.class);
    private final TourDraftService draftService = mock(TourDraftService.class);
    private final PlatformTransactionManager txManager = mock(PlatformTransactionManager.class);
    private final Validator validator = Validation.buildDefaultValidatorFactory().getValidator();
    private TourImportService service;

    @BeforeEach
    void setUp() {
        Region region = new Region();
        region.setId(1L);
        region.setName("Miền Trung");
        Theme theme = new Theme();
        theme.setId(7L);
        theme.setName("Kiến trúc");
        when(regionRepository.findByDeletedFalse()).thenReturn(List.of(region));
        when(themeRepository.findByDeletedFalse()).thenReturn(List.of(theme));
        when(txManager.getTransaction(any())).thenAnswer(inv -> new SimpleTransactionStatus());
        TourDetailResponse created = mock(TourDetailResponse.class);
        when(created.tourId()).thenReturn(TOUR);
        when(draftService.create(any(), eq(USER))).thenReturn(created);
        service = new TourImportService(regionRepository, themeRepository, draftService, validator, txManager);
    }

    private MockMultipartFile sampleFile(Consumer<XSSFWorkbook> edit) throws IOException {
        byte[] bytes = service.template(true);
        try (XSSFWorkbook wb = new XSSFWorkbook(new ByteArrayInputStream(bytes));
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            edit.accept(wb);
            wb.write(out);
            return new MockMultipartFile("file", "tour.xlsx", "application/octet-stream", out.toByteArray());
        }
    }

    @Test
    @DisplayName("Chạy thử: gọi đủ các bước, đổi cảnh báo gửi duyệt về đúng ô, rồi rollback")
    void previewRollsBack() throws IOException {
        when(draftService.validate(TOUR, USER)).thenReturn(List.of(
                TourValidationIssue.stop(1, "quiz[0].answers", "Câu hỏi cần đủ 4 đáp án"),
                TourValidationIssue.of("BASIC_INFO", "highlights", "Cần từ 3 đến 5 điểm nổi bật"),
                TourValidationIssue.of("REVIEW", "contentRightsConfirmed", "Vui lòng xác nhận")));

        TourImportResult result = service.preview(sampleFile(wb -> { }), USER);

        assertTrue(result.valid(), () -> String.valueOf(result.errors()));
        assertNull(result.tourId());
        assertEquals(List.of(
                new TourImportIssue(SHEET_QUIZ, 3, "Đáp án đúng (A–D)", "Câu hỏi cần đủ 4 đáp án"),
                new TourImportIssue(SHEET_GENERAL, GENERAL_FIRST_ROW + Field.HIGHLIGHT_1.ordinal() + 1,
                        "Điểm nổi bật 1", "Cần từ 3 đến 5 điểm nổi bật")), result.warnings());
        verify(draftService).updateBasicInfo(eq(TOUR), any(), eq(USER));
        verify(draftService).updatePricing(eq(TOUR), any(), eq(USER));
        verify(draftService).updateStops(eq(TOUR), argThat(s -> s.stops().size() == 2), eq(USER));
        verify(draftService).updateSchedule(eq(TOUR), any(), eq(USER));
        verify(txManager).commit(argThat(TransactionStatus::isRollbackOnly));
    }

    @Test
    @DisplayName("Nhập thật: trả về id bản nháp, không rollback")
    void importCommits() throws IOException {
        when(draftService.validate(TOUR, USER)).thenReturn(List.of());

        TourImportResult result = service.importTour(sampleFile(wb -> { }), USER);

        assertTrue(result.valid());
        assertEquals(TOUR, result.tourId());
        verify(txManager).commit(argThat(status -> !status.isRollbackOnly()));
    }

    @Test
    @DisplayName("Lỗi Bean Validation được đổi về đúng ô, không gọi service")
    void beanValidationMappedToCell() throws IOException {
        TourImportResult result = service.importTour(sampleFile(wb -> {
            Row row = wb.getSheet(SHEET_STOPS).getRow(2);
            row.createCell(1).setCellValue("x".repeat(201));
            wb.getSheet(SHEET_EXPERIENCES).getRow(1).createCell(4).setCellValue(5);
        }), USER);

        assertFalse(result.valid());
        assertEquals(java.util.Set.of(
                new TourImportIssue(SHEET_STOPS, 3, "Tên điểm đến", "Tối đa 200 ký tự"),
                new TourImportIssue(SHEET_EXPERIENCES, 2, "Bán kính (mét)", "Bán kính tối thiểu 10m")),
                java.util.Set.copyOf(result.errors()));
        verifyNoInteractions(draftService);
    }

    @Test
    @DisplayName("Lỗi nghiệp vụ của service → rollback, trả lỗi chung")
    void serviceErrorRollsBack() throws IOException {
        when(draftService.create(any(), eq(USER)))
                .thenThrow(new AppException(ErrorCode.VALIDATION_ERROR, "Tài khoản đối tác chưa được duyệt"));

        TourImportResult result = service.importTour(sampleFile(wb -> { }), USER);

        assertFalse(result.valid());
        assertEquals(List.of(TourImportIssue.general("Tài khoản đối tác chưa được duyệt")), result.errors());
        verify(txManager).commit(argThat(TransactionStatus::isRollbackOnly));
    }

    @Test
    @DisplayName("Sai định dạng file")
    void rejectsNonXlsx() {
        TourImportResult wrongExt = service.preview(
                new MockMultipartFile("file", "tour.csv", "text/csv", "a,b".getBytes()), USER);
        assertFalse(wrongExt.valid());
        assertTrue(wrongExt.errors().get(0).message().contains(".xlsx"));

        TourImportResult garbage = service.preview(
                new MockMultipartFile("file", "tour.xlsx", "application/octet-stream", "not a zip".getBytes()), USER);
        assertFalse(garbage.valid());
        assertTrue(garbage.errors().get(0).message().startsWith("Không đọc được file"));
    }
}
