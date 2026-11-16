/**
 * Trang "Trở thành đối tác của JourneyGo" (mục "Dành cho đối tác" trên header du khách).
 * Giới thiệu đối tượng tham gia (kèm giấy tờ cần chuẩn bị), quyền lợi, quy trình, hỏi đáp
 * và nút mở biểu mẫu đăng ký. Dùng chung header / footer với trang chủ du khách.
 */
import PartnerProgramScreen from "@/features/tourist/components/PartnerProgramScreen";

export const metadata = {
  title: "Trở thành đối tác | Journey Go",
  description:
    "Đăng ký trở thành đối tác JourneyGo: đưa tour trải nghiệm văn hóa, di sản và làng nghề của bạn đến với du khách. Miễn phí đăng ký, xét duyệt trong 1–3 ngày làm việc.",
};

export default function PartnerProgramPage() {
  return <PartnerProgramScreen />;
}
