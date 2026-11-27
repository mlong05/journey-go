package com.journeygo.modules.experience.security;

import com.journeygo.common.security.AuthorizationGuard;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Quyết định xem response có được phép lộ đáp án (isCorrect / expectedText) hay không.
 *
 * <p>⚠️ SECURITY (P1-3): TRƯỚC đây quyền này do CLIENT quyết định qua query param
 * {@code ?forTourist=true}. Client có thể bỏ qua ⇒ du khách đọc được đáp án đúng.
 *
 * <p>⇒ Nay server tự quyết định dựa trên vai trò của caller:
 * <ul>
 *   <li><b>ADMIN / CONTENT_PROVIDER (owner) / CONTENT_MODERATOR</b> — được xem đáp án
 *       (dùng để soạn nội dung và kiểm duyệt).</li>
 *   <li><b>Mọi role khác (TOURIST, khách chưa đăng nhập)</b> — bị mask
 *       {@code isCorrect}, {@code explanation}, {@code expectedText}.</li>
 * </ul>
 */
@Component("answerVisibilityGuard")
@RequiredArgsConstructor
public class AnswerVisibilityGuard {

    /**
     * Người gọi có được xem đáp án đúng không?
     *
     * @return true = lộ đáp án; false = phải mask
     */
    @Transactional(readOnly = true)
    public boolean canSeeAnswers() {
        return AuthorizationGuard.isAdmin()
                || AuthorizationGuard.hasRole("CONTENT_PROVIDER")
                || AuthorizationGuard.hasRole("CONTENT_MODERATOR");
    }
}
