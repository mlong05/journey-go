/**
 * Bộ phiên dịch thông báo lỗi từ backend sang tiếng Việt thân thiện
 * Mục đích: Khi backend trả message tiếng Anh thô (đặc biệt các message
 * mặc định từ Spring Security / framework), FE sẽ hiển thị câu tiếng
 * Việt tự nhiên, nhất quán với giọng văn của sản phẩm.
 *
 * Áp dụng cho: mọi luồng login (email/mật khẩu, Google OAuth, ...).
 *
 * Tham số:
 *   - rawMessage: chuỗi từ err.message (mặc định là data.message của response)
 *   - fallback: câu fallback tiếng Việt nếu không khớp rule nào
 *
 * Trả về: câu tiếng Việt đã được dịch, hoặc giữ nguyên rawMessage nếu nó
 * đã là tiếng Việt và fallback không phù hợp.
 */

// Các cụm từ backend thường dùng → câu tiếng Việt
const MESSAGE_RULES = [
  // Tài khoản bị khóa / vô hiệu hóa (Spring Security mặc định + custom)
  {
    test: /user account is locked/i,
    vi: "Tài khoản của bạn đã bị vô hiệu hóa. Vui lòng liên hệ quản trị viên để được hướng dẫn khôi phục.",
  },
  {
    test: /account is locked/i,
    vi: "Tài khoản của bạn đã bị vô hiệu hóa. Vui lòng liên hệ quản trị viên để được hướng dẫn khôi phục.",
  },
  {
    test: /account is disabled/i,
    vi: "Tài khoản của bạn đã bị vô hiệu hóa. Vui lòng liên hệ quản trị viên để được hướng dẫn khôi phục.",
  },
  {
    test: /account has been locked/i,
    vi: "Tài khoản của bạn đã bị vô hiệu hóa. Vui lòng liên hệ quản trị viên để được hướng dẫn khôi phục.",
  },
  {
    test: /tài khoản.*(vô hiệu hóa|khóa|bị khóa|bị vô hiệu)/i,
    vi: "Tài khoản của bạn đã bị vô hiệu hóa. Vui lòng liên hệ quản trị viên để được hướng dẫn khôi phục.",
  },
  {
    test: /tài khoản.*(không hoạt động|ngưng hoạt động)/i,
    vi: "Tài khoản của bạn đã bị vô hiệu hóa. Vui lòng liên hệ quản trị viên để được hướng dẫn khôi phục.",
  },

  // Sai mật khẩu / không tìm thấy tài khoản
  {
    test: /bad credentials/i,
    vi: "Tài khoản hoặc mật khẩu không đúng. Vui lòng kiểm tra lại.",
  },
  {
    test: /(invalid (username|email|password|credential))/i,
    vi: "Tài khoản hoặc mật khẩu không đúng. Vui lòng kiểm tra lại.",
  },
  {
    test: /(user not found|email not found|no such user)/i,
    vi: "Tài khoản hoặc mật khẩu không đúng. Vui lòng kiểm tra lại.",
  },

  // Mật khẩu yếu / không đạt yêu cầu
  {
    test: /(password.*(weak|too short|invalid|incorrect format))/i,
    vi: "Mật khẩu chưa đáp ứng yêu cầu bảo mật. Vui lòng thử lại.",
  },

  // Email đã tồn tại
  {
    test: /(email already (exists|in use|registered))/i,
    vi: "Email này đã được đăng ký trong hệ thống. Vui lòng sử dụng email khác.",
  },

  // Token / OTP
  {
    test: /(token.*(expired|invalid|malformed))/i,
    vi: "Phiên xác thực đã hết hạn hoặc không hợp lệ. Vui lòng đăng nhập lại.",
  },
  {
    test: /(otp.*(expired|invalid|incorrect|wrong))/i,
    vi: "Mã xác thực không đúng hoặc đã hết hạn. Vui lòng thử lại.",
  },

  // Quyền truy cập
  {
    test: /(access denied|forbidden|not authorized)/i,
    vi: "Bạn không có quyền thực hiện thao tác này.",
  },

  // Hết phiên
  {
    test: /(session.*(expired|timeout)|jwt.*expired)/i,
    vi: "Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.",
  },
];

/**
 * Dịch message backend → tiếng Việt thân thiện.
 *
 * @param {string|Error|undefined} rawMessage - chuỗi lỗi từ backend hoặc Error object
 * @param {string} [fallback] - câu fallback nếu không khớp rule nào
 * @returns {string} câu tiếng Việt đã được dịch
 */
export function translateAuthError(rawMessage, fallback) {
  let text = "";

  if (rawMessage instanceof Error) {
    text = rawMessage.message || "";
  } else if (typeof rawMessage === "string") {
    text = rawMessage;
  } else if (rawMessage && typeof rawMessage === "object" && rawMessage.message) {
    text = String(rawMessage.message);
  }

  const trimmed = text.trim();
  if (!trimmed) {
    return fallback || "Đăng nhập thất bại. Vui lòng thử lại.";
  }

  for (const rule of MESSAGE_RULES) {
    if (rule.test.test(trimmed)) {
      return rule.vi;
    }
  }

  // Nếu message đã chứa ký tự tiếng Việt có dấu → giữ nguyên (đã là tiếng Việt)
  if (/[ăâđêôơưàáảãạằắẳẵặầấẩẫậèéẻẽẹềếểễệìíỉĩịòóỏõọồốổỗộờớởỡợùúủũụừứửữựỳýỷỹỵ]/i.test(trimmed)) {
    return trimmed;
  }

  // Nếu là message tiếng Anh chưa map được → dùng fallback
  return fallback || "Đăng nhập thất bại. Vui lòng thử lại.";
}
