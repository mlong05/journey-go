// ============================================================================
// DỮ LIỆU 3 DANH THẮNG DI SẢN TIÊU BIỂU (Hero Slideshow)
// ============================================================================
export const SLIDE_ITEMS = [
  {
    id: "travelista",
    shortName: "Khám Phá",
    name: "Hành Trình Di Sản - Chạm vào Kỳ quan",
    tag: "Khám Phá Di Sản & Thiên Nhiên",
    slogan: "Hành Trình Di Sản",
    subSlogan: "Du lịch là trải nghiệm duy nhất làm giàu tâm hồn vượt trên mọi giá trị vật chất",
    quote:
      "Du lịch là hành trình duy nhất bạn chi trả để nhận lại sự giàu có vô hạn về trải nghiệm, tâm hồn và tri thức di sản văn hóa.",
    statNumber: "3,143m",
    statLabel: "Đỉnh cao tuyệt cảnh thiên nhiên",
    image: "/image/travel_mountain_hero.jpg",
  },
  {
    id: "trangan",
    shortName: "Tràng An",
    name: "Tràng An - Ninh Bình",
    tag: "Di sản Kép Thế giới UNESCO",
    slogan: "Chạm vào Hành trình - Khám phá Di sản",
    subSlogan: "Quần thể danh thắng thiên nhiên & văn hoá kỳ vĩ giữa lòng cố đô Hoa Lư.",
    quote:
      "Nơi hội tụ trầm tích lịch sử ngàn năm, kết nối con người với thiên nhiên nguyên sơ, tạo tác nên tuyệt phẩm sơn thủy hữu tình.",
    statNumber: "3,500+ ha",
    statLabel: "Vùng lõi bảo tồn nghiêm ngặt",
    image: "/image/trangan.jpg",
  },
  {
    id: "hoian",
    shortName: "Hội An",
    name: "Phố Cổ Hội An - Quảng Nam",
    tag: "Di sản Văn hóa Thế giới",
    slogan: "Lung linh Đèn lồng - Dấu ấn Thương cảng",
    subSlogan: "Không gian kiến trúc cổ kính giao thoa tinh hoa văn hóa Á - Âu thế kỷ XVII.",
    quote:
      "Mỗi mái ngói rêu phong, mỗi góc phố cổ là một câu chuyện lịch sử sống động trường tồn cùng dòng sông Hoài thơ mộng.",
    statNumber: "400+ năm",
    statLabel: "Lịch sử thương cảng quốc tế",
    image: "/image/hoian.jpg",
  },
  {
    id: "vanmieu",
    shortName: "Văn Miếu",
    name: "Văn Miếu Quốc Tử Giám - Hà Nội",
    tag: "Di tích Quốc gia Đặc biệt",
    slogan: "Ngàn năm Văn hiến - Tinh hoa Đạo học",
    subSlogan: "Trường đại học đầu tiên của Việt Nam, nơi lưu giữ 82 bia tiến sĩ trứ danh.",
    quote:
      "Hiền tài là nguyên khí quốc gia, cội nguồn sức mạnh và hưng thịnh của dân tộc Việt Nam qua bao thăng trầm thời đại.",
    statNumber: "82 Bia",
    statLabel: "Di sản Tư liệu Thế giới UNESCO",
    image: "/image/vanmieu.jpg",
  },
];

// ============================================================================
// DANH SÁCH VAI TRÒ HỆ THỐNG (Kết nối API xác thực & phân quyền JourneyGo)
// Hỗ trợ: Tourist, Provider, Moderator, Admin
// ============================================================================
export const ROLES = [
  {
    id: "admin",
    roleEnum: "ADMIN",
    title: "Quản trị viên",
    scope: "Quản trị hệ thống & vận hành",
    redirectPath: "/admin",
    sampleEmail: "user@journeygo.com",
    samplePassword: "Password123@",
    desc: "Toàn quyền quản trị hệ thống, người dùng và kiểm toán",
  },
  {
    id: "moderator",
    roleEnum: "MODERATOR",
    title: "Kiểm duyệt viên",
    scope: "Thẩm định hồ sơ & nội dung",
    redirectPath: "/moderator",
    sampleEmail: "moderator@journeygo.com",
    samplePassword: "Password123@",
    desc: "Kiểm định chất lượng điểm di tích, giải quyết vi phạm",
  },
  {
    id: "provider",
    roleEnum: "PROVIDER",
    title: "Đối tác Điểm đến",
    scope: "Quản lý di tích & tour",
    redirectPath: "/provider",
    sampleEmail: "provider@journeygo.com",
    samplePassword: "Password123@",
    desc: "Cập nhật thông tin điểm di sản, phát hành tour & vé",
  },
  {
    id: "tourist",
    roleEnum: "TOURIST",
    title: "Khách du lịch",
    scope: "Khám phá di sản",
    redirectPath: "/",
    sampleEmail: "tourist@journeygo.com",
    samplePassword: "Password123@",
    desc: "Khám phá điểm đến, hoàn thành nhiệm vụ và tích lũy điểm thưởng",
  },
];
