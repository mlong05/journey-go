# Exception mapping - Report5_Unit Test (27/11/2026)

Mục Exception của mỗi sheet liệt kê **loại exception** theo kiểu bản copy. Cột *Real class in code* là class backend thật sự ném; cột *Written in report* là tên ghi trong sheet, phân loại theo ý nghĩa mã lỗi.

## Quy tắc
- **ResourceNotFoundException**: không tìm thấy / không tồn tại (`*_NOT_EXISTED`, `*_NOT_FOUND`, `*-NOT-FOUND`).
- **IllegalArgumentException**: dữ liệu vào sai, thiếu, không khớp hoặc không hợp lệ (`*_REQUIRED`, `*_MISMATCH`, `WRONG_*`, `VALIDATION_ERROR`, GPS/QR không hợp lệ...).
- **IllegalStateException**: còn lại - đã tồn tại / đã dùng / hết hạn / bị giới hạn / không được phép trong trạng thái hiện tại / không có quyền.

| Sheet | Function | Error code | Real class in code | Written in report | UTCID |
|---|---|---|---|---|---|
| AUTH-GGL-001 | AuthService.processGoogleAuth | `UNAUTHORIZED` | AppException | IllegalStateException | 3 |
| AUTH-FPW-001 | AuthService.forgotPassword | `USER_NOT_EXISTED` | AppException | ResourceNotFoundException | 2 |
| AUTH-OTP-001 | AuthService.verifyOtp | `OTP_EXPIRED` | AppException | IllegalStateException | 2 |
| AUTH-RPW-001 | AuthService.resetPassword | `PASSWORD_NOT_MATCH` | AppException | IllegalArgumentException | 2 |
| AUTH-CPW-001 | AuthService.changePassword | `WRONG_CURRENT_PASSWORD` | AppException | IllegalArgumentException | 2 |
| AUTH-LRL-001 | LoginRateLimiterService.checkLoginAllowed | `LOGIN_RATE_LIMITED` | AppException | IllegalStateException | 2 |
| USR-CRT-001 | UserService.createUser | `USER_EXISTED` | AppException | IllegalStateException | 2 |
| USR-GET-001 | UserService.getUserById | `USER_NOT_EXISTED` | AppException | ResourceNotFoundException | 2 |
| USR-UPD-001 | UserService.updateUser | `CANNOT_DEACTIVATE_ADMIN` | AppException | IllegalStateException | 2 |
| USR-ROL-001 | UserService.updateUserRole | `CANNOT_MODIFY_OWN_ROLE` | AppException | IllegalStateException | 2 |
| USR-ACT-001 | UserService.setUserActiveStatus | `CANNOT_DEACTIVATE_SELF` | AppException | IllegalStateException | 3 |
| USR-ACT-001 | UserService.setUserActiveStatus | `CANNOT_DEACTIVATE_ADMIN` | AppException | IllegalStateException | 4 |
| SEC-FIN-001 | AuthorizationGuard.requireFinanceOwnerOrAdmin | `FORBIDDEN-FINANCE-OWNER` | BusinessException | IllegalStateException | 3, 4, 5 |
| SEC-FIN-001 | AuthorizationGuard.requireFinanceOwnerOrAdmin | `UNAUTH*` | BusinessException | IllegalStateException | 6 |
| SEC-FIN-001 | AuthorizationGuard.requireFinanceOwnerOrAdmin | `FORBIDDEN-FINANCE-OWNER` | BusinessException | IllegalStateException | 6 |
| TOUR-APR-001 | TourModerationService.approve | `TOUR_REVIEW_CRITERIA_NOT_MET` | AppException | IllegalArgumentException | 2 |
| TOUR-APR-001 | TourModerationService.approve | `TOUR_REVIEW_CRITERIA_REQUIRED` | AppException | IllegalArgumentException | 3 |
| TOUR-APR-001 | TourModerationService.approve | `VALIDATION_ERROR` | AppException | IllegalArgumentException | 4 |
| TOUR-RCH-001 | TourModerationService.requestChanges | `TOUR_REVIEW_NOTES_REQUIRED` | AppException | IllegalArgumentException | 1 |
| TOUR-REJ-001 | TourModerationService.reject | `TOUR_REJECTION_REASON_REQUIRED` | AppException | IllegalArgumentException | 1 |
| BKG-CRT-001 | BookingService.createBooking | `BOOKING_PENDING_EXISTS` | AppException | IllegalStateException | 1 |
| BKG-INV-001 | BookingInvitationService.invite | `MAIL_SEND_FAILED` | AppException | IllegalStateException | 5, 6 |
| BKG-INV-001 | BookingInvitationService.invite | `BOOKING_INVITATION_NO_EMAIL` | AppException | IllegalArgumentException | 7, 8 |
| BKG-INV-001 | BookingInvitationService.invite | `BOOKING_INVITATION_ALREADY_PENDING` | AppException | IllegalStateException | 9 |
| BKG-ACC-001 | BookingInvitationService.accept | `BOOKING_INVITATION_EMAIL_MISMATCH` | AppException | IllegalArgumentException | 2 |
| BKG-ACC-001 | BookingInvitationService.accept | `BOOKING_INVITATION_EXPIRED` | AppException | IllegalStateException | 3 |
| BKG-ACC-001 | BookingInvitationService.accept | `BOOKING_INVITATION_ALREADY_USED` | AppException | IllegalStateException | 4 |
| STL-PRS-001 | SettlementPeriod.parse | `VALIDATION_ERROR` | AppException | IllegalArgumentException | 3 |
| STL-CRT-001 | BatchSettlementService.createBatchSettlement | `SETTLEMENT_ALREADY_EXISTS` | AppException | IllegalStateException | 3, 4 |
| STL-CRT-001 | BatchSettlementService.createBatchSettlement | `SETTLEMENT_PERIOD_NOT_CLOSED` | AppException | IllegalStateException | 5 |
| STL-CRT-001 | BatchSettlementService.createBatchSettlement | `SETTLEMENT_NO_ELIGIBLE_REVENUE` | AppException | IllegalStateException | 6 |
| JRN-CHK-001 | JourneyService.checkInDestination | `GPS-OUT-OF-RANGE` | BusinessException | IllegalArgumentException | 3, 4 |
| JRN-CHK-001 | JourneyService.checkInDestination | `DEST-COORDINATES-MISSING` | BusinessException | IllegalStateException | 6 |
| JRN-CHK-001 | JourneyService.checkInDestination | `QR-INVALID` | BusinessException | IllegalArgumentException | 8 |
| JRN-SUB-001 | JourneyService.submitTask | `TASK-ATTEMPTS-EXHAUSTED` | BusinessException | IllegalStateException | 4 |
| JRN-SUB-001 | JourneyService.submitTask | `DEST-NOT-CHECKED-IN` | BusinessException | IllegalStateException | 6 |
| JRN-SUB-001 | JourneyService.submitTask | `GPS-OUT-OF-PUZZLE-ZONE` | BusinessException | IllegalArgumentException | 7 |
| JRN-SUB-001 | JourneyService.submitTask | `ANSWER-MISSING` | BusinessException | IllegalArgumentException | 9 |
| JRN-SUB-001 | JourneyService.submitTask | `QR-INVALID` | BusinessException | IllegalArgumentException | 13 |
| JRN-SUB-002 | JourneyService.submitTask | `QR-REQUIRED` | BusinessException | IllegalArgumentException | 5 |
| JRN-SUB-002 | JourneyService.submitTask | `QR-INVALID` | BusinessException | IllegalArgumentException | 6 |
| JRN-ANS-001 | JourneyService.answerQuestion | `QUESTION-OUT-OF-ORDER` | BusinessException | IllegalStateException | 2 |
| JRN-CUL-001 | JourneyService.getDestinationCulture | `CULTURE-LOCKED` | BusinessException | IllegalStateException | 2 |
| JRN-CUL-001 | JourneyService.getDestinationCulture | `FORBIDDEN-JOURNEY` | BusinessException | IllegalStateException | 3 |
| CMT-PST-001 | CommunityService.createPost | `POST-TOUR-NOT-FOUND` | BusinessException | ResourceNotFoundException | 3 |
| CMT-PST-001 | CommunityService.createPost | `POST-TOUR-NOT-PUBLISHED` | BusinessException | IllegalStateException | 4 |
| CMT-PST-001 | CommunityService.createPost | `POST-JOURNEY-FORBIDDEN` | BusinessException | IllegalStateException | 5 |
| CMT-PST-001 | CommunityService.createPost | `POST-JOURNEY-MISMATCH` | BusinessException | IllegalArgumentException | 6 |
| CMT-UPD-001 | CommunityService.updatePost | `FORBIDDEN-POST` | BusinessException | IllegalStateException | 2 |
| CMT-CMT-001 | CommunityService.addComment | `COMMENT-NOT-ALLOWED` | BusinessException | IllegalStateException | 3 |
| CMT-MOD-001 | CommunityService.moderatePost | `INVALID-MODERATION-ACTION` | BusinessException | IllegalArgumentException | 3 |
| CMT-RPT-001 | CommunityService.reportPost | `ALREADY-REPORTED` | BusinessException | IllegalStateException | 2 |
| CMT-CRP-001 | CommentReportService.reportComment | `CANNOT-REPORT-OWN-COMMENT` | BusinessException | IllegalStateException | 3 |
| CMT-CRP-001 | CommentReportService.reportComment | `ALREADY-REPORTED` | BusinessException | IllegalStateException | 4 |
| CMT-CRP-002 | CommentReportService.resolve | `REPORT-ALREADY-HANDLED` | BusinessException | IllegalStateException | 3 |
| ACH-CLM-001 | AchievementService.claimReward | `ACHIEVEMENT_NOT_CLAIMABLE` | AppException | IllegalStateException | 2, 3 |
| ACH-CRT-001 | AchievementService.createAchievement | `ACHIEVEMENT_CODE_EXISTED` | AppException | IllegalStateException | 2 |
| AI-RTL-001 | AiRateLimiterService.checkAndConsume | `AI_RATE_LIMITED` | AppException | IllegalStateException | 3 |
| AI-CHAT-001 | VirtualGuideChatService.chat | `AI_RATE_LIMITED` | AppException | IllegalStateException | 5 |
| AI-CHAT-001 | VirtualGuideChatService.chat | `AI_SESSION_NOT_FOUND` | AppException | ResourceNotFoundException | 6 |
| AI-PRS-001 | AiDocumentParserService.parse | `VALIDATION_ERROR` | AppException | IllegalArgumentException | 4, 5 |

**Tổng:** 61 mã lỗi - IllegalStateException: 37, ResourceNotFoundException: 4, IllegalArgumentException: 20.
