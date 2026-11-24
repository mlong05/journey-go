// ============================================================================
// SLIDE ẢNH ĐIỂM ĐẾN VĂN HOÁ (cột trái màn đăng nhập)
// Chỉ dùng ảnh rộng ≥ 1200px để không bị mờ khi phóng to.
// Ảnh lấy từ Wikimedia Commons: giữ nguyên trường "credit" để ghi nguồn đúng giấy phép.
// ============================================================================
export const SLIDE_ITEMS = [
  {
    id: "thanhha",
    shortNameKey: "misc.slide.thanhha.shortName",
    nameKey: "misc.slide.thanhha.name",
    tagKey: "misc.slide.thanhha.tag",
    sloganKey: "misc.slide.thanhha.slogan",
    subSloganKey: "misc.slide.thanhha.subSlogan",
    image: "/image/hoian-pottery-craft.jpg",
    position: "40% 50%",
  },
  {
    id: "trangan",
    shortNameKey: "misc.slide.trangan.shortName",
    nameKey: "misc.slide.trangan.name",
    tagKey: "misc.slide.trangan.tag",
    sloganKey: "misc.slide.trangan.slogan",
    subSloganKey: "misc.slide.trangan.subSlogan",
    image: "/image/trangan-boats.jpg",
    position: "50% 65%",
    credit: { author: "Jakub Hałun", license: "CC BY 4.0", url: "https://commons.wikimedia.org/wiki/File:Trang_An_Landscape_Complex,_Ninh_Binh_Province,_Vietnam,_20240202_1446_5304.jpg" },
  },
  {
    id: "hoian",
    shortNameKey: "misc.slide.hoian.shortName",
    nameKey: "misc.slide.hoian.name",
    tagKey: "misc.slide.hoian.tag",
    sloganKey: "misc.slide.hoian.slogan",
    subSloganKey: "misc.slide.hoian.subSlogan",
    image: "/image/hoian-lanterns.jpg",
    position: "50% 55%",
    credit: { author: "Mig Gilbert", license: "CC BY-SA 2.0", url: "https://commons.wikimedia.org/wiki/File:Lanterns_in_Hoi_An_(40480642302).jpg" },
  },
  {
    id: "vanmieu",
    shortNameKey: "misc.slide.vanmieu.shortName",
    nameKey: "misc.slide.vanmieu.name",
    tagKey: "misc.slide.vanmieu.tag",
    sloganKey: "misc.slide.vanmieu.slogan",
    subSloganKey: "misc.slide.vanmieu.subSlogan",
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
    titleKey: "misc.role.admin.title",
    scopeKey: "misc.role.admin.scope",
    redirectPath: "/admin",
    sampleEmail: "user@journeygo.com",
    samplePassword: "Password123@",
    descKey: "misc.role.admin.desc",
  },
  {
    id: "moderator",
    roleEnum: "CONTENT_MODERATOR",
    titleKey: "misc.role.moderator.title",
    scopeKey: "misc.role.moderator.scope",
    redirectPath: "/moderator",
    sampleEmail: "moderator@journeygo.com",
    samplePassword: "Password123@",
    descKey: "misc.role.moderator.desc",
  },
  {
    id: "provider",
    roleEnum: "CONTENT_PROVIDER",
    titleKey: "misc.role.provider.title",
    scopeKey: "misc.role.provider.scope",
    redirectPath: "/provider",
    sampleEmail: "provider@journeygo.com",
    samplePassword: "Password123@",
    descKey: "misc.role.provider.desc",
  },
  {
    id: "tourist",
    roleEnum: "TOURIST",
    titleKey: "misc.role.tourist.title",
    scopeKey: "misc.role.tourist.scope",
    redirectPath: "/",
    sampleEmail: "tourist@journeygo.com",
    samplePassword: "Password123@",
    descKey: "misc.role.tourist.desc",
  },
];
