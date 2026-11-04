// ============================================================================
// SLIDE ẢNH ĐIỂM ĐẾN VĂN HOÁ (cột trái màn đăng nhập)
// Chỉ dùng ảnh rộng ≥ 1200px để không bị mờ khi phóng to.
// Ảnh lấy từ Wikimedia Commons: giữ nguyên trường "credit" để ghi nguồn đúng giấy phép.
// ============================================================================
export const SLIDE_ITEMS = [
  {
    id: "thanhha",
    shortName: "Khám Phá",
    name: "Làng gốm Thanh Hà - Hội An",
    tag: "Làng nghề truyền thống",
    slogan: "Hồn Việt Làng Nghề",
    subSlogan: "Ngồi bên bàn xoay cùng nghệ nhân, nặn nên món gốm mang dấu tay của riêng bạn.",
    image: "/image/hoian-pottery-craft.jpg",
    position: "40% 50%",
  },
  {
    id: "trangan",
    shortName: "Tràng An",
    name: "Tràng An - Ninh Bình",
    tag: "Di sản Văn hoá & Thiên nhiên Thế giới",
    slogan: "Sơn Thuỷ Hữu Tình",
    subSlogan: "Ngồi thuyền nan len giữa núi đá vôi và hang động nơi cố đô Hoa Lư.",
    image: "/image/trangan-boats.jpg",
    position: "50% 65%",
    credit: { author: "Jakub Hałun", license: "CC BY 4.0", url: "https://commons.wikimedia.org/wiki/File:Trang_An_Landscape_Complex,_Ninh_Binh_Province,_Vietnam,_20240202_1446_5304.jpg" },
  },
  {
    id: "hoian",
    shortName: "Hội An",
    name: "Phố cổ Hội An - Quảng Nam",
    tag: "Di sản Văn hoá Thế giới",
    slogan: "Phố Cổ Lên Đèn",
    subSlogan: "Dạo phố cổ khi hoàng hôn buông, hàng trăm đèn lồng lụa cùng thắp sáng.",
    image: "/image/hoian-lanterns.jpg",
    position: "50% 55%",
    credit: { author: "Mig Gilbert", license: "CC BY-SA 2.0", url: "https://commons.wikimedia.org/wiki/File:Lanterns_in_Hoi_An_(40480642302).jpg" },
  },
  {
    id: "vanmieu",
    shortName: "Văn Miếu",
    name: "Văn Miếu - Quốc Tử Giám, Hà Nội",
    tag: "Di tích Quốc gia Đặc biệt",
    slogan: "Ngàn Năm Văn Hiến",
    subSlogan: "Khuê Văn Các, biểu tượng của trường đại học đầu tiên của Việt Nam.",
    image: "/image/vanmieu-khuevancac.jpg",
    position: "50% 40%",
    credit: { author: "Daderot", license: "CC0", url: "https://commons.wikimedia.org/wiki/File:Constellation_of_Literature_pavilion_-_Temple_of_Literature,_Hanoi_-_DSC04553.JPG" },
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
