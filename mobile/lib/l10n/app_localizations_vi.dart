// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for Vietnamese (`vi`).
class AppLocalizationsVi extends AppLocalizations {
  AppLocalizationsVi([String locale = 'vi']) : super(locale);

  @override
  String get appTitle => 'Journey Go - Cổng Du Lịch Văn Hóa Việt Nam';

  @override
  String get reloginSuccess =>
      'Đã đăng nhập lại. Bạn có thể tiếp tục thao tác.';

  @override
  String get commonClose => 'Đóng';

  @override
  String get commonCancel => 'Hủy bỏ';

  @override
  String get commonRefresh => 'Làm mới';

  @override
  String get languageTitle => 'Ngôn ngữ';

  @override
  String get languageSubtitle => 'Ứng dụng hiển thị bằng tiếng Việt';

  @override
  String get languageSheetTitle => 'Chọn ngôn ngữ';

  @override
  String get languageSheetNote =>
      'Một số màn hình và nội dung tour, diễn đàn có thể vẫn hiển thị bằng tiếng Việt.';

  @override
  String languageConfirmTitle(String language) {
    return 'Đổi ngôn ngữ sang $language?';
  }

  @override
  String get languageConfirmMessage =>
      'Ứng dụng sẽ tải lại giao diện để áp dụng ngôn ngữ mới cho toàn bộ màn hình.';

  @override
  String get languageConfirmAction => 'Xác nhận & tải lại';

  @override
  String get tourRequestsTitle => 'Tour theo nhu cầu';

  @override
  String get tourRequestsSubtitle =>
      'Đăng yêu cầu & đặt tour thiết kế riêng cho bạn';

  @override
  String get tourRequestsMyTitle => 'Tour theo nhu cầu của tôi';

  @override
  String get tourRequestsNewButton => 'Yêu cầu mới';

  @override
  String get profileHeader => 'Hồ sơ du khách';

  @override
  String get profileNotifications => 'Thông báo';

  @override
  String get profileEdit => 'Sửa hồ sơ';

  @override
  String profileMemberSince(String date) {
    return 'Từ $date';
  }

  @override
  String get profileTopRank => 'Bạn đã đạt hạng cao nhất';

  @override
  String profilePointsToNextRank(String points, String rank) {
    return 'Còn $points điểm lên $rank';
  }

  @override
  String get profileStatPoints => 'Điểm khả dụng';

  @override
  String get profileStatBadges => 'Huy hiệu';

  @override
  String get profileStatPlaces => 'Điểm đã đến';

  @override
  String get rankBronze => 'Hạng Đồng';

  @override
  String get rankSilver => 'Hạng Bạc';

  @override
  String get rankGold => 'Hạng Vàng';

  @override
  String get rankPlatinum => 'Bạch Kim';

  @override
  String get heritageTitle => 'Hành trình di sản';

  @override
  String get heritageSubtitle => 'Dấu ấn văn hoá bạn đã ghi lại';

  @override
  String get achievementsTitle => 'Thành tựu & Nhận thưởng';

  @override
  String achievementsAchieved(int count) {
    return '$count đã đạt';
  }

  @override
  String achievementsUnclaimed(int count) {
    return '$count chờ nhận';
  }

  @override
  String get journeyLogTitle => 'Nhật ký hành trình';

  @override
  String journeyPlacesVisited(int count) {
    return '$count điểm đã đến';
  }

  @override
  String journeyLogSubtitle(int count) {
    return '$count điểm di sản đã check-in';
  }

  @override
  String get journeyEmpty =>
      'Chưa có điểm nào. Check-in tại điểm đến trong hành trình để ghi lại dấu ấn đầu tiên.';

  @override
  String get pointsHistoryTitle => 'Lịch sử tích điểm';

  @override
  String get pointsHistorySubtitle => 'Các giao dịch điểm gần đây';

  @override
  String get pointsNoTransactions => 'Chưa có giao dịch';

  @override
  String pointsLatestGain(String points) {
    return 'Gần nhất +$points';
  }

  @override
  String get pointsEarned => 'Đã tích lũy';

  @override
  String get pointsSpent => 'Đã tiêu';

  @override
  String get pointsAvailable => 'Khả dụng';

  @override
  String get pointsEmpty =>
      'Chưa có giao dịch điểm. Check-in điểm đến và hoàn thành nhiệm vụ để bắt đầu tích điểm.';

  @override
  String get pointsOpenWallet => 'Xem ví & đổi voucher';

  @override
  String get badgesTitle => 'Huy hiệu di sản';

  @override
  String badgesUnlocked(int count) {
    return '$count đã mở khoá';
  }

  @override
  String get voucherTitle => 'Voucher';

  @override
  String voucherAvailablePoints(String points) {
    return '$points điểm khả dụng';
  }

  @override
  String get servicesTitle => 'Vé & hỗ trợ';

  @override
  String get myBookingsTitle => 'Đơn đặt tour của tôi';

  @override
  String get myBookingsSubtitle =>
      'Theo dõi đơn, thanh toán & mã QR trải nghiệm';

  @override
  String get providerSupportTitle => 'Hỗ trợ từ nhà tour';

  @override
  String get providerSupportSubtitle =>
      'Lịch sử chat với các nhà tour (nhắn trước khi đặt vé)';

  @override
  String get supportTitle => 'Hỗ trợ & khiếu nại';

  @override
  String get supportSubtitle => 'Hoàn tiền và xử lý sự cố vé';

  @override
  String refundsInProgress(int count) {
    return '$count đang xử lý';
  }

  @override
  String get settingsTitle => 'Cài đặt';

  @override
  String get personalInfoTitle => 'Thông tin cá nhân';

  @override
  String get personalInfoSubtitle => 'Họ tên, email, số điện thoại';

  @override
  String get changePasswordTitle => 'Đổi mật khẩu';

  @override
  String get changePasswordSubtitle => 'Bảo vệ tài khoản của bạn';

  @override
  String hotlineTitle(String number) {
    return 'Tổng đài $number';
  }

  @override
  String get hotlineSubtitle => 'Bấm để gọi hỗ trợ du khách';

  @override
  String get hotlineCannotOpen =>
      'Không mở được trình gọi điện trên thiết bị này.';

  @override
  String get logoutTitle => 'Đăng xuất';

  @override
  String get logoutSubtitle => 'Thoát tài khoản khỏi thiết bị';

  @override
  String get logoutConfirmTitle => 'Đăng xuất khỏi tài khoản?';

  @override
  String get logoutConfirmMessage =>
      'Bạn sẽ thoát khỏi tài khoản trên thiết bị này. Bạn có thể đăng nhập lại bất cứ lúc nào.';

  @override
  String get logoutConfirmButton => 'Đăng xuất';

  @override
  String get commonNotifications => 'Thông báo';

  @override
  String get commonSeeAll => 'Xem tất cả';

  @override
  String get commonRetry => 'Thử lại';

  @override
  String get navHome => 'Trang chủ';

  @override
  String get navTrips => 'Chuyến đi';

  @override
  String get navCheckIn => 'Check-in';

  @override
  String get navForum => 'Diễn đàn';

  @override
  String get navAccount => 'Tài khoản';

  @override
  String get navCheckInSemantics => 'Check-in tại điểm đến';

  @override
  String homeGreeting(String name) {
    return 'Xin chào, $name 👋';
  }

  @override
  String get homeGreetingNoName => 'Xin chào 👋';

  @override
  String get homeHeadline => 'Đi để hiểu,\nkhông chỉ để ngắm';

  @override
  String get homeSearchHint => 'Bạn muốn đi đâu?';

  @override
  String get homeSearchSemantics => 'Tìm tour, điểm đến, chủ đề';

  @override
  String homePoints(String points) {
    return '$points điểm';
  }

  @override
  String get heroPlaceMuCangChai => 'Ruộng bậc thang Mù Cang Chải';

  @override
  String get heroPlaceHoiAn => 'Chùa Cầu, phố cổ Hội An';

  @override
  String get heroPlaceMuiNe => 'Làng chài Mũi Né';

  @override
  String get homeCatDayTrip => 'Trong ngày';

  @override
  String get homeCatMultiDay => 'Nhiều ngày';

  @override
  String get homeCatByDate => 'Theo ngày';

  @override
  String get homeCatDeals => 'Ưu đãi';

  @override
  String get homeFeatured => 'Tour nổi bật';

  @override
  String get homeAllTours => 'Tất cả tour';

  @override
  String get homeUpcoming => 'Khởi hành sắp tới';

  @override
  String get homeThemes => 'Khám phá theo chủ đề';

  @override
  String get homeAllThemes => 'Tất cả chủ đề';

  @override
  String get homeMoreThemes => 'chủ đề';

  @override
  String get homeRegions => 'Điểm đến theo vùng miền';

  @override
  String get homeAllRegions => 'Tất cả vùng miền';

  @override
  String get homeMoreRegions => 'vùng';

  @override
  String homeRegionTourCount(int count) {
    return '$count tour';
  }

  @override
  String get homeDayTours => 'Tour trong ngày';

  @override
  String get homeMultiDayTours => 'Tour nhiều ngày';

  @override
  String homeSeeAllCount(int count) {
    return 'Xem tất cả $count tour';
  }

  @override
  String get homeSeeAllTours => 'Xem tất cả tour';

  @override
  String get homeNoToursTitle => 'Chưa có tour nào được mở bán';

  @override
  String get homeNoToursMessage =>
      'Các tour mới sẽ xuất hiện ở đây ngay khi được duyệt.';

  @override
  String get homeAllOwnedTitle => 'Bạn đã mua tất cả tour hiện có';

  @override
  String get homeAllOwnedMessage =>
      'Xem mục \"Chuyến đi\" để trải nghiệm các tour đã đặt.';

  @override
  String get homeAllOwnedAction => 'Xem chuyến đi của tôi';

  @override
  String get homeToursErrorTitle => 'Không tải được danh sách tour';

  @override
  String homeJourneyOngoing(int position, int total) {
    return 'Đang đi · Trạm $position/$total';
  }

  @override
  String get homeJourneyAtStop => 'Đang ở trạm';

  @override
  String get homeJourneyNextStop => 'Trạm kế tiếp';

  @override
  String get homeJourneyAllDone => 'Đã đi hết các trạm';

  @override
  String homeJourneyCheckedIn(String name) {
    return '$name · đã check-in';
  }

  @override
  String homeJourneyDistance(String name, String distance) {
    return '$name · cách $distance';
  }

  @override
  String get homeJourneyContinue => 'Tiếp tục';

  @override
  String homeJourneyMissions(int count) {
    return '$count nhiệm vụ chờ: ';
  }

  @override
  String get tourPriceFree => 'Miễn phí';

  @override
  String get tourPriceFromPrefix => 'Từ ';

  @override
  String get tourPriceFromSuffix => '';

  @override
  String tourStopCount(int count) {
    return '$count trạm';
  }

  @override
  String durationMinutes(int minutes) {
    return '$minutes phút';
  }

  @override
  String durationHours(int hours) {
    return '$hours giờ';
  }

  @override
  String durationHoursMinutes(int hours, int minutes) {
    return '$hours giờ $minutes phút';
  }

  @override
  String durationDaysNights(int days, int nights) {
    return '${days}N$nightsĐ';
  }

  @override
  String durationDays(int days) {
    return '$days ngày';
  }

  @override
  String get durationDayTrip => 'Trong ngày';

  @override
  String get commonShowMore => 'Xem thêm';

  @override
  String get commonShowLess => 'Thu gọn';

  @override
  String priceVnd(String amount) {
    return '$amount đ';
  }

  @override
  String tourPriceFrom(String price) {
    return 'Từ $price';
  }

  @override
  String tourDepartsOn(String date) {
    return 'Khởi hành $date';
  }

  @override
  String rewardPlusPoints(String points) {
    return '+$points điểm';
  }

  @override
  String rewardMaxPoints(String points) {
    return 'tối đa $points điểm';
  }

  @override
  String tourTaskCount(int count) {
    return '$count nhiệm vụ';
  }

  @override
  String tourBadgeCount(int count) {
    return '$count huy hiệu';
  }

  @override
  String tourDestinationStops(int count) {
    return '$count điểm dừng';
  }

  @override
  String tourCheckpointCount(int count) {
    return '$count trạm';
  }

  @override
  String get tourOwnedBadge => 'Đã có vé';

  @override
  String get tourLoadFailed =>
      'Không tải được thông tin tour. Vui lòng thử lại.';

  @override
  String get tourTypeCultural => 'Văn hóa';

  @override
  String get tourTypeAdventure => 'Phiêu lưu';

  @override
  String get tourTypeBeach => 'Biển';

  @override
  String get tourTypeMountain => 'Núi';

  @override
  String get tourTypeCity => 'Thành phố';

  @override
  String get tourTypeEco => 'Sinh thái';

  @override
  String get tourTypeHistorical => 'Lịch sử';

  @override
  String get tourTypeGastronomy => 'Ẩm thực';

  @override
  String get tourTypeOther => 'Khác';

  @override
  String get guestAdult => 'Người lớn';

  @override
  String get guestChild => 'Trẻ em';

  @override
  String get guestToddler => 'Trẻ nhỏ';

  @override
  String get guestInfant => 'Em bé';

  @override
  String durationSeconds(int seconds) {
    return '$seconds giây';
  }

  @override
  String durationMinutesSeconds(int minutes, int seconds) {
    return '$minutes phút $seconds giây';
  }

  @override
  String get durationFlexible => 'Tự do';

  @override
  String get departureTime => 'Giờ khởi hành';

  @override
  String get departureMeetingPoint => 'Địa điểm tập trung';

  @override
  String get departurePickup => 'Giờ đón và điểm đón';

  @override
  String progressInProgress(int done, int total) {
    return 'Đang trải nghiệm · $done/$total điểm';
  }

  @override
  String get progressCompleted => 'Đã hoàn thành';

  @override
  String progressCompletedOn(String date) {
    return 'Đã hoàn thành · $date';
  }

  @override
  String get listSearchHint => 'Tìm tour, vùng miền, chủ đề...';

  @override
  String get listFilter => 'Bộ lọc';

  @override
  String get listAll => 'Tất cả';

  @override
  String get listEmptyTitle => 'Không tìm thấy tour phù hợp';

  @override
  String get listAllOwned =>
      'Bạn đã mua tất cả các tour đang hiển thị. Hãy xem mục \"Chuyến đi\" để trải nghiệm.';

  @override
  String get listEmptyHint => 'Thử bỏ bớt bộ lọc hoặc tìm bằng từ khóa khác.';

  @override
  String get listSort => 'Sắp xếp';

  @override
  String get listSortNewest => 'Mới nhất';

  @override
  String get listSortPriceAsc => 'Giá thấp đến cao';

  @override
  String get listSortPriceDesc => 'Giá cao đến thấp';

  @override
  String get listSortDeparture => 'Khởi hành sớm nhất';

  @override
  String get listGroupFormat => 'Hình thức';

  @override
  String get listGroupRegion => 'Vùng miền';

  @override
  String get listGroupTheme => 'Chủ đề';

  @override
  String get listReset => 'Đặt lại';

  @override
  String get listApply => 'Áp dụng';

  @override
  String get tdTitle => 'Chi tiết tour';

  @override
  String get tdCancelledOldBooking =>
      'Đã hủy đơn cũ. Bấm \"Đặt tour\" để đặt lại.';

  @override
  String get tdNoProvider => 'Tour này chưa có nhà tour liên hệ.';

  @override
  String get tdLoginToChat => 'Vui lòng đăng nhập để nhắn tin cho nhà tour.';

  @override
  String get tdDatesLoading =>
      'Đang tải lịch trải nghiệm, vui lòng thử lại sau.';

  @override
  String get tdNoDates =>
      'Hiện chưa có ngày nào còn chỗ cho tour này. Vui lòng quay lại sau.';

  @override
  String get tdPickDateTitle => 'Chọn ngày trải nghiệm';

  @override
  String get tdPickDateHint =>
      'Số trong ô là số chỗ còn lại — chỉ ngày còn chỗ mới chọn được';

  @override
  String get tdNoDateSelected => 'Chưa chọn ngày nào';

  @override
  String tdDateSelected(String date) {
    return 'Đang chọn: $date';
  }

  @override
  String get tdConfirmDate => 'Xác nhận chọn ngày';

  @override
  String get tdRouteMap => 'Bản đồ lộ trình';

  @override
  String get tdLegs => 'Các chặng hành trình';

  @override
  String get tdNoDestinations => 'Tour chưa có điểm đến.';

  @override
  String get tdLoadFailed => 'Không tải được chi tiết tour.';

  @override
  String tdDestinationCount(int count) {
    return '$count điểm đến';
  }

  @override
  String get tdVerified => 'Tour đã được kiểm duyệt';

  @override
  String get tdFinalLeg => 'Chặng cuối';

  @override
  String tdLeg(int n) {
    return 'Chặng $n';
  }

  @override
  String get tdCheckInBadgeHint =>
      'Check-in tại đây để mở khóa huy hiệu của điểm đến';

  @override
  String get tdExperiencesError =>
      'Không tải được trải nghiệm của điểm này. Kéo xuống để thử lại.';

  @override
  String get tdNoExperiences =>
      'Điểm đến này chưa có trải nghiệm nào được phát hành.';

  @override
  String get tdOwned => 'Bạn đã mua tour này';

  @override
  String tdDaysUntilStart(int days) {
    return 'Còn $days ngày nữa lên đường!';
  }

  @override
  String tdExperienceDate(String date) {
    return 'Ngày trải nghiệm: $date';
  }

  @override
  String get tdStartExperience => 'Bắt đầu trải nghiệm';

  @override
  String get tdExperienceExpired => 'Đã quá ngày trải nghiệm';

  @override
  String tdExperienceWindow(String dates) {
    return 'Thời gian tour: $dates';
  }

  @override
  String get tdContinueJourney => 'Tiếp tục hành trình';

  @override
  String get tdPriceFromAdult => 'Giá từ (người lớn)';

  @override
  String get tdTotalPayment => 'Tổng thanh toán';

  @override
  String get tdPerGuest => ' /khách';

  @override
  String get tdHolding => 'Đang giữ chỗ...';

  @override
  String get tdContinuePayment => 'Tiếp tục thanh toán';

  @override
  String get tdBookAgain => 'Đặt lại';

  @override
  String get tdBookNow => 'Đặt tour ngay';

  @override
  String get tdRefundProcessingTitle => 'Đang trong quá trình hoàn tiền';

  @override
  String get tdRefundDoneTitle => 'Đã xử lý hoàn tiền';

  @override
  String get tdRefundProcessingMessage =>
      'Đơn đặt tour này đang được xử lý hoàn tiền.';

  @override
  String get tdRefundDoneMessage => 'Đơn đặt tour này đã được xử lý xong.';

  @override
  String get tdBookingCancelledTitle => 'Đơn đặt tour đã hủy';

  @override
  String get tdBookingExpiredTitle => 'Đơn đặt tour đã hết hạn';

  @override
  String get tdBookingCancelledMessage =>
      'Chỗ đã được trả lại — bạn không thể trải nghiệm tour này.';

  @override
  String get tdBookingExpiredMessage =>
      'Đơn quá hạn thanh toán — chỗ đã được giải phóng.';

  @override
  String tdChatWithProvider(String name) {
    return 'Chat với bên $name';
  }

  @override
  String tdProvidedBy(String name) {
    return 'Cung cấp bởi $name · đã được kiểm duyệt';
  }

  @override
  String get tdTabIntro => 'Giới thiệu';

  @override
  String get tdTabItinerary => 'Lịch trình';

  @override
  String get tdTabStops => 'Điểm dừng';

  @override
  String get tdTabPrices => 'Giá & lịch';

  @override
  String get tdTabNotes => 'Lưu ý';

  @override
  String get tdHighlights => 'Điểm nổi bật';

  @override
  String get tdPhotos => 'Hình ảnh nổi bật';

  @override
  String get tdItineraryDetail => 'Lịch trình chi tiết';

  @override
  String tdStopsTitle(int count) {
    return 'Các điểm dừng ($count)';
  }

  @override
  String get tdPriceTable => 'Bảng giá';

  @override
  String tdMaxGuests(int count) {
    return 'Tối đa $count khách mỗi chuyến';
  }

  @override
  String get tdDepartures => 'Lịch khởi hành';

  @override
  String get tdDepartureInfo => 'Thông tin khởi hành';

  @override
  String tdMoreDates(int count) {
    return '+$count ngày';
  }

  @override
  String get tdNotes => 'Thông tin cần lưu ý';

  @override
  String get tdPriceIncludes => 'Giá bao gồm';

  @override
  String get tdPriceExcludes => 'Giá không bao gồm';

  @override
  String get tdCancellationPolicy => 'Chính sách hủy';

  @override
  String get tdRefundPolicy => 'Chính sách hoàn tiền';

  @override
  String get tdForceMajeure => 'Trường hợp bất khả kháng';

  @override
  String get tdContact => 'Liên hệ';

  @override
  String tdDayN(int day) {
    return 'Ngày $day';
  }

  @override
  String tdQuizCount(int count) {
    return '$count câu đố';
  }

  @override
  String tdActivityCount(int count) {
    return '$count hoạt động';
  }

  @override
  String tdStopN(int n) {
    return 'Điểm dừng $n';
  }

  @override
  String get tdIntroVideo => 'Video giới thiệu';

  @override
  String get tdCulturalStory => 'Câu chuyện văn hoá';

  @override
  String get tdCulturalContent => 'Nội dung văn hóa';

  @override
  String get tdStoryLabel => 'Câu chuyện';

  @override
  String tdArchivePhotos(int count) {
    return '$count ảnh tư liệu';
  }

  @override
  String tdArtifactCount(int count) {
    return '$count hiện vật';
  }

  @override
  String get tdUnlockOnCheckIn =>
      'Mở khóa khi bạn check-in tại điểm dừng trong hành trình.';

  @override
  String get tdArtifacts => 'Hiện vật';

  @override
  String get tdChallenges => 'Thử thách tại điểm';

  @override
  String get tdCulturalQuiz => 'Câu đố văn hoá';

  @override
  String tdQuizQuestions(int count) {
    return '$count câu đố';
  }

  @override
  String get tdScanQrToConfirm => 'quét QR tại điểm để xác nhận';

  @override
  String get tdActivityFallback => 'Trải nghiệm thực tế';

  @override
  String tripCountdown(int days) {
    return '$days ngày nữa lên đường!';
  }

  @override
  String get statusPendingPayment => 'Chờ thanh toán';

  @override
  String get statusConfirmed => 'Đã xác nhận';

  @override
  String get statusCompleted => 'Đã hoàn thành';

  @override
  String get statusExpired => 'Đã hết hạn';

  @override
  String get statusPaymentExpired => 'Hết hạn thanh toán';

  @override
  String get statusCancelled => 'Đã hủy';

  @override
  String get statusUnknown => 'Không rõ';

  @override
  String get payStatusPending => 'Đang chờ';

  @override
  String get payStatusProcessing => 'Đang xử lý';

  @override
  String get payStatusVerifying => 'Đang xác minh';

  @override
  String get payStatusSuccess => 'Thành công';

  @override
  String get payStatusFailed => 'Thất bại';

  @override
  String get payStatusCustomerCancelled => 'Khách đã hủy';

  @override
  String get payStatusSuperseded => 'Đã bị thay thế';

  @override
  String get ageAdult => 'Từ 12 tuổi';

  @override
  String get ageChild => '5 – 11 tuổi';

  @override
  String get ageToddler => '2 – 4 tuổi';

  @override
  String get ageInfant => 'Dưới 2 tuổi';

  @override
  String get genderMale => 'Nam';

  @override
  String get genderFemale => 'Nữ';

  @override
  String get genderOther => 'Khác';

  @override
  String get bgTitle => 'Đặt tour';

  @override
  String get bgRemainingSlots => 'Số chỗ còn';

  @override
  String get bgNoDate => 'Chưa chọn ngày';

  @override
  String bgSlotsLeft(int count) {
    return 'Còn $count chỗ';
  }

  @override
  String bgSlotsSelected(int count) {
    return 'Đã chọn $count chỗ';
  }

  @override
  String bgGuestsNotCounted(int count) {
    return '$count người không tính slot';
  }

  @override
  String bgTotalGuests(int count) {
    return 'Tổng · $count khách';
  }

  @override
  String get bgConfirm => 'Xác nhận đặt';

  @override
  String get bgMissingPassenger =>
      'Mở từng mục \"Hành khách\" và điền đủ thông tin để tiếp tục.';

  @override
  String get bgNoSlot => 'không tính chỗ';

  @override
  String bgPassengerN(int n) {
    return 'Hành khách $n';
  }

  @override
  String get bgOwnerTag => 'Người đặt tour';

  @override
  String get bgPassengerComplete => 'Đã điền đủ thông tin';

  @override
  String get bgPassengerHintAdult =>
      'Bấm để nhập họ tên, ngày sinh, giới tính, email';

  @override
  String get bgPassengerHint => 'Bấm để nhập họ tên, ngày sinh, giới tính';

  @override
  String get bgPassengerInfo => 'Thông tin hành khách';

  @override
  String get bgFullName => 'Họ và tên *';

  @override
  String get bgBirthDate => 'Ngày sinh *';

  @override
  String get bgGender => 'Giới tính *';

  @override
  String get bgEmailHint =>
      'Người lớn cần email để nhận vé, liên kết tài khoản và nhận lời mời tham gia tour.';

  @override
  String bgAgeMismatch(String type) {
    return 'Tuổi tại ngày trải nghiệm thuộc loại \"$type\" — hãy kiểm tra lại nhóm khách.';
  }

  @override
  String get calHasDates => 'Còn lịch';

  @override
  String get calNoDates => 'Không có lịch';

  @override
  String get calAvailable => 'Còn chỗ';

  @override
  String get calAlmostFull => 'Sắp hết';

  @override
  String get calFull => 'Hết chỗ';

  @override
  String get calThisMonth => 'Về tháng này';

  @override
  String get voucherSheetTitle => 'Chọn voucher giảm giá';

  @override
  String get voucherSkip => 'Bỏ qua';

  @override
  String get voucherLoadFailed => 'Không thể tải danh sách voucher.';

  @override
  String get voucherNotApplicable => 'Voucher không áp dụng được cho tour này.';

  @override
  String get voucherValidateFailed =>
      'Không thể xác minh voucher. Vui lòng thử lại.';

  @override
  String get voucherEmpty =>
      'Bạn chưa có voucher nào.\nĐổi điểm thưởng để nhận voucher!';

  @override
  String get voucherOffTag => 'GIẢM';

  @override
  String voucherCode(String code) {
    return 'Mã: $code';
  }

  @override
  String voucherExpiry(String date) {
    return 'HSD: $date';
  }

  @override
  String get pendingDialogTitle => 'Bạn đang có đơn giữ chỗ';

  @override
  String pendingDialogMessage(
    String code,
    String date,
    String total,
    String countdown,
  ) {
    return 'Đơn $code cho ngày $date ($total) đang giữ chỗ, còn $countdown để thanh toán.\n\nMuốn đổi ngày hoặc số khách, hãy hủy đơn cũ rồi đặt lại.';
  }

  @override
  String get pendingCancelAndRebook => 'Hủy đơn cũ và đặt lại';

  @override
  String pendingBannerHome(String countdown) {
    return 'Bạn có đơn chờ thanh toán · còn $countdown';
  }

  @override
  String pendingBannerTour(String countdown) {
    return 'Bạn đang giữ chỗ · còn $countdown';
  }

  @override
  String pendingBannerDetail(String date, String total) {
    return 'Ngày $date · $total';
  }

  @override
  String get pendingPayAction => 'Thanh toán';

  @override
  String get coTitle => 'Thanh toán';

  @override
  String get coNoPaymentUrl => 'Máy chủ không trả về đường dẫn thanh toán.';

  @override
  String get coOpenPaymentFailed =>
      'Không mở được trang thanh toán. Vui lòng thử lại.';

  @override
  String get coVerifyingPrevious =>
      'Giao dịch trước đang được xác minh với VNPay...';

  @override
  String get coAwaitingConfirmation =>
      'Đang chờ xác nhận thanh toán. Sau khi thanh toán xong, hãy quay lại ứng dụng.';

  @override
  String get coNoResultYet =>
      'Chưa nhận được kết quả từ VNPay. Tiền của bạn chưa bị mất, hãy kiểm tra lại mục \"Đơn của tôi\" sau ít phút.';

  @override
  String get coCancelTitle => 'Hủy đơn đặt?';

  @override
  String get coCancelMessage => 'Chỗ đã giữ sẽ được trả lại.';

  @override
  String get coKeep => 'Giữ lại';

  @override
  String get coCancelBooking => 'Hủy đơn';

  @override
  String get coCancelBookingLong => 'Hủy đơn đặt';

  @override
  String get coHoldEnd => 'hết thời gian giữ chỗ';

  @override
  String get coLeaveTitle => 'Rời màn thanh toán?';

  @override
  String coLeaveMessage(String until, String countdown) {
    return 'Chỗ của bạn vẫn được giữ đến $until (còn $countdown). Bạn có thể quay lại thanh toán ở trang tour, Trang chủ hoặc mục Đơn đặt tour.';
  }

  @override
  String get coLeaveKeep => 'Thoát, vẫn giữ chỗ';

  @override
  String get coStay => 'Ở lại';

  @override
  String get coNotFound => 'Không tìm thấy đơn đặt.';

  @override
  String coGuestCount(int count) {
    return '$count khách';
  }

  @override
  String get coPaymentDetails => 'Chi tiết thanh toán';

  @override
  String get coTourPrice => 'Giá tour';

  @override
  String coTourPriceGuests(int count) {
    return 'Giá tour ($count khách)';
  }

  @override
  String coDiscount(String code) {
    return 'Ưu đãi · $code';
  }

  @override
  String get coCancelled => 'Đơn đã được hủy.';

  @override
  String get coSecureNote =>
      'Thanh toán an toàn qua cổng VNPay, bảo mật thông tin';

  @override
  String get coCheckPrevious => 'Kiểm tra kết quả giao dịch trước';

  @override
  String get coAttempts => 'Các lần thanh toán';

  @override
  String get coDuplicateAttempt =>
      'Giao dịch trùng với một giao dịch đã thanh toán';

  @override
  String get coPaidMessage =>
      'Đơn đặt của bạn đã được xác nhận. Chúc bạn có chuyến đi đầy cảm hứng!';

  @override
  String get coChooseMethod => 'Chọn phương thức thanh toán';

  @override
  String get coMethodDomestic => 'Thẻ nội địa và tài khoản ngân hàng';

  @override
  String get coMethodDomesticDesc =>
      'Thanh toán bằng thẻ ATM nội địa hoặc tài khoản ngân hàng (Internet Banking, Mobile Banking của các ngân hàng Việt Nam).';

  @override
  String get coProcessing => 'Đang xử lý...';

  @override
  String coPayAmount(String amount) {
    return 'Thanh toán $amount';
  }

  @override
  String get coExpired => 'Đã quá hạn thanh toán. Chỗ giữ sẽ được giải phóng.';

  @override
  String coHoldCountdown(String countdown) {
    return 'Giữ chỗ còn $countdown';
  }

  @override
  String get paySuccessTitle => 'Thanh toán thành công';

  @override
  String get paySuccessShort => 'Thanh toán thành công!';

  @override
  String get paySuccessViewBooking => 'Xem đơn của tôi';

  @override
  String paySuccessBookingCode(String code) {
    return 'Mã đơn: $code';
  }

  @override
  String paySuccessAmount(String amount) {
    return 'Số tiền: $amount';
  }

  @override
  String get paySuccessConfirmed =>
      'Giao dịch của bạn đã được xác nhận thành công.';

  @override
  String get payNotSuccessful => 'Thanh toán chưa thành công.';

  @override
  String get payFailedRetry =>
      'Thanh toán không thành công. Bạn có thể thử lại.';

  @override
  String get payLoadFailed => 'Không thể tải thông tin thanh toán.';

  @override
  String get payMethodsLoadFailed => 'Không thể tải phương thức thanh toán.';

  @override
  String get payUnverifiedLater =>
      'Chưa xác minh được kết quả giao dịch trước. Vui lòng thử lại sau.';

  @override
  String get payUnverifiedRetry =>
      'Chưa xác minh được kết quả giao dịch trước. Nếu bạn chưa thanh toán, bạn có thể thử lại ngay; nếu đã thanh toán, hãy kiểm tra lại sau ít phút.';

  @override
  String get payAwaitingResult => 'Đang chờ kết quả thanh toán...';

  @override
  String get payInitializingTxn => 'Đang khởi tạo giao dịch...';

  @override
  String get payInitFailed =>
      'Không thể khởi tạo thanh toán. Vui lòng thử lại.';

  @override
  String get payScanQrToFinish => 'Quét mã QR để hoàn tất thanh toán.';

  @override
  String get payOpenBrowserFailed =>
      'Không thể mở trang thanh toán. Vui lòng kiểm tra trình duyệt.';

  @override
  String get payStatusCheckFailed =>
      'Không thể kiểm tra trạng thái thanh toán. Vui lòng thử lại.';

  @override
  String get payCheckingResult => 'Đang kiểm tra kết quả thanh toán...';

  @override
  String get paySuperseded =>
      'Giao dịch này đã bị thay thế — đơn hàng đã được thanh toán bởi một giao dịch khác.';

  @override
  String get payDeadlineExceeded =>
      'Đã hết thời hạn thanh toán 10 phút. Vui lòng đặt lại tour.';

  @override
  String get payRetryTitle => 'Thanh toán lại?';

  @override
  String get payRetryMessage =>
      'Hệ thống chưa xác minh được kết quả giao dịch trước.\n\n• Nếu bạn CHƯA thanh toán: bạn có thể thử lại ngay với thời hạn còn lại.\n• Nếu bạn ĐÃ thanh toán: vui lòng chọn \"Kiểm tra lại\" để hệ thống đồng bộ kết quả, tránh thanh toán trùng.';

  @override
  String get payCheckAgain => 'Kiểm tra lại';

  @override
  String payBookingNumber(int id) {
    return 'Đơn #$id';
  }

  @override
  String get payTourFallback => 'Tour trải nghiệm';

  @override
  String get payExperienceDate => 'Ngày trải nghiệm';

  @override
  String get payMethodTitle => 'Phương thức thanh toán';

  @override
  String get payMethodsUnavailable =>
      'Không tải được phương thức thanh toán. Bạn vẫn có thể thử lại.';

  @override
  String get payInitializing => 'Đang khởi tạo...';

  @override
  String get payChecking => 'Đang kiểm tra...';

  @override
  String get payCheckResult => 'Kiểm tra kết quả thanh toán';

  @override
  String get payTimeLimitNote =>
      'Bạn có 10 phút để hoàn tất thanh toán. Trang VNPay sẽ mở bằng trình duyệt.';

  @override
  String get payQrTitle => 'Quét mã để thanh toán';

  @override
  String get payQrHint =>
      'Mở ứng dụng ngân hàng hoặc ví điện tử hỗ trợ VNPay-QR để quét mã này.';

  @override
  String get payChooseCard => 'Chọn loại thẻ';

  @override
  String get payChooseCardHint => 'Chọn loại thẻ (Visa, Mastercard, JCB…)';

  @override
  String payCardType(String type) {
    return 'Loại thẻ: $type';
  }

  @override
  String get payCardTypesUnavailable =>
      'Không tải được danh sách loại thẻ. Bạn vẫn có thể thanh toán bằng thẻ quốc tế.';

  @override
  String get payMethodIntl => 'Thẻ thanh toán quốc tế';

  @override
  String get payMethodQr => 'Ứng dụng ngân hàng & Ví điện tử';

  @override
  String get mbTitle => 'Đơn đặt tour';

  @override
  String mbTabAll(int count) {
    return 'Tất cả ($count)';
  }

  @override
  String mbTabPurchased(int count) {
    return 'Đã mua ($count)';
  }

  @override
  String mbTabPending(int count) {
    return 'Chờ thanh toán ($count)';
  }

  @override
  String mbTabExperiencing(int count) {
    return 'Đang trải nghiệm ($count)';
  }

  @override
  String mbTabCompleted(int count) {
    return 'Đã hoàn thành ($count)';
  }

  @override
  String mbTabRefunding(int count) {
    return 'Đang hoàn tiền ($count)';
  }

  @override
  String mbTabRefunded(int count) {
    return 'Đã hoàn tiền ($count)';
  }

  @override
  String mbTabClosed(int count) {
    return 'Đã hủy / Hết hạn ($count)';
  }

  @override
  String get mbEmptyAll => 'Chưa có đơn nào.';

  @override
  String get mbEmptyPurchased => 'Chưa có đơn nào đã thanh toán.';

  @override
  String get mbEmptyPending => 'Không có đơn nào đang chờ thanh toán.';

  @override
  String get mbEmptyExperiencing => 'Không có chuyến nào đang diễn ra.';

  @override
  String get mbEmptyCompleted => 'Chưa có đơn nào đã hoàn thành.';

  @override
  String get mbEmptyRefunding => 'Không có đơn nào đang hoàn tiền.';

  @override
  String get mbEmptyRefunded => 'Chưa có đơn nào đã hoàn tiền xong.';

  @override
  String get mbEmptyClosed => 'Không có đơn nào đã hủy hoặc hết hạn.';

  @override
  String get mbDetails => 'Chi tiết';

  @override
  String get mbRebook => 'Đặt lại tour';

  @override
  String get mbBookingCancelled => 'Đơn đã hủy';

  @override
  String get mbBookingExpired => 'Đơn đã hết hạn';

  @override
  String get mbEnterExperience => 'Vào trải nghiệm';

  @override
  String mbReason(String reason) {
    return 'Lý do: $reason';
  }

  @override
  String get mbPaidButClosed =>
      'Khoản tiền đã được ghi nhận nhưng chỗ đã được trả lại. Vui lòng liên hệ hỗ trợ để được hoàn tiền.';

  @override
  String get mbViewDetails => 'Xem chi tiết đơn';

  @override
  String mbPaymentDeadline(String time) {
    return 'Hạn thanh toán: $time';
  }

  @override
  String get bdTitle => 'Chi Tiết Đơn';

  @override
  String get bdLoadFailed => 'Không thể tải chi tiết đơn.';

  @override
  String get bdPaymentConfirmedToast => 'Đã xác nhận thanh toán thành công!';

  @override
  String get bdTxnFailedConfirmed =>
      'Giao dịch đã được xác nhận không thành công.';

  @override
  String get bdUnverified =>
      'Chưa xác minh được kết quả. Nếu bạn đã thanh toán, vui lòng thử lại sau ít phút.';

  @override
  String get bdCancelTitle => 'Hủy đơn đặt tour';

  @override
  String get bdCancelMessage =>
      'Sau khi hủy, chỗ đã giữ sẽ được trả lại cho khách khác. Bạn không thể hoàn tác thao tác này.';

  @override
  String get bdCancelReasonHint => 'Lý do hủy (không bắt buộc)';

  @override
  String get bdKeepBooking => 'Giữ đơn';

  @override
  String get bdCancelledToast => 'Đã hủy đơn. Chỗ đã giữ được giải phóng.';

  @override
  String get bdCancelFailed => 'Không thể hủy đơn. Vui lòng thử lại.';

  @override
  String get bdRefundWindowClosed =>
      'Yêu cầu hoàn tiền chỉ được gửi trước ngày khởi hành của tour. Bạn đã trải nghiệm hoặc tour đã hoàn thành nên không thể gửi yêu cầu.';

  @override
  String get bdEyebrowCode => 'MÃ ĐƠN';

  @override
  String get bdEyebrowTotal => 'TỔNG TIỀN';

  @override
  String get bdNoExperienceDate => 'Chưa có ngày trải nghiệm';

  @override
  String bdExperienceCount(int count) {
    return '$count trải nghiệm';
  }

  @override
  String get bdStepBooked => 'Đặt tour';

  @override
  String get bdStepBookedCreated => 'Đã tạo đơn';

  @override
  String get bdStepPayment => 'Thanh toán';

  @override
  String get bdStepNotPaid => 'Chưa thanh toán';

  @override
  String get bdStepConfirmed => 'Xác nhận';

  @override
  String get bdStepCompleted => 'Hoàn thành';

  @override
  String get bdStepNotDone => 'Không thực hiện';

  @override
  String get bdStepNotExperienced => 'Chưa trải nghiệm';

  @override
  String get bdProgressTitle => 'Tiến trình đơn';

  @override
  String bdCountdownHint(String countdown) {
    return 'Còn $countdown để thanh toán. Quá hạn, chỗ đã giữ sẽ được trả lại cho khách khác.';
  }

  @override
  String get bdExperiencesTitle => 'Trải nghiệm trong đơn';

  @override
  String bdItemCount(int count) {
    return '$count mục';
  }

  @override
  String get bdExperiencesHint =>
      'Mỗi trải nghiệm trong tour chiếm 1 chỗ trong ngày bạn chọn.';

  @override
  String get bdNoExperiences => 'Đơn này không ghi nhận trải nghiệm nào.';

  @override
  String get bdExperiencesTotal => 'Tổng giá trải nghiệm';

  @override
  String bdExperienceNumber(String id) {
    return 'Trải nghiệm #$id';
  }

  @override
  String get bdDepartureTitle => 'Thông tin khởi hành';

  @override
  String get bdOrderInfoTitle => 'Thông tin đơn';

  @override
  String get bdRowCode => 'Mã đơn';

  @override
  String get bdRowTour => 'Tour';

  @override
  String get bdRowExperienceCount => 'Số trải nghiệm';

  @override
  String get bdRowPaidAt => 'Thanh toán lúc';

  @override
  String get bdRowBookedAt => 'Đặt lúc';

  @override
  String get bdRowDeadline => 'Hạn thanh toán';

  @override
  String get bdRowCancelReason => 'Lý do hủy';

  @override
  String get bdPassengersTitle => 'Hành khách trong nhóm';

  @override
  String bdPeopleCount(int count) {
    return '$count người';
  }

  @override
  String get bdPassengersHint => 'Số người tham gia đã nhập khi đặt tour.';

  @override
  String get bdInviteHint =>
      'Gửi lời mời để hành khách tạo tài khoản JourneyGo và xem tour cùng nhóm. Lời mời hết hạn sau 24 giờ.';

  @override
  String get bdBookerTag => 'Người đặt';

  @override
  String get bdResendInvite => 'Gửi lại lời mời';

  @override
  String get bdInvite => 'Mời tham gia';

  @override
  String bdAge(int age) {
    return '$age tuổi';
  }

  @override
  String get bdInfoHidden => 'Thông tin cá nhân được ẩn';

  @override
  String get bdNoEmail => 'Chưa có email';

  @override
  String bdInviteSent(String email) {
    return 'Đã gửi lời mời tới $email';
  }

  @override
  String get bdInviteEmailTitle => 'Nhập email người được mời';

  @override
  String get bdEmailExample => 'vidu@gmail.com';

  @override
  String get bdSendInvite => 'Gửi lời mời';

  @override
  String get bdPaymentHistory => 'Lịch sử thanh toán';

  @override
  String get bdNoPayments => 'Chưa có giao dịch thanh toán nào.';

  @override
  String get bdRefundEntryTitle => 'Hủy chuyến & hoàn tiền';

  @override
  String get bdRefundEntryHint => 'Gửi yêu cầu trước ngày khởi hành';

  @override
  String bdRefundEntryHintDate(String date) {
    return 'Gửi yêu cầu trước ngày $date';
  }

  @override
  String get bdRefundRequests => 'Yêu cầu hoàn tiền';

  @override
  String bdRefundProcessingDetail(String code) {
    return 'Yêu cầu $code đang được xử lý. Bạn có thể theo dõi từng bước trong \"Lịch sử xử lý hoàn tiền\" bên dưới.';
  }

  @override
  String bdRefundDoneDetail(String code, String status) {
    return 'Yêu cầu $code đã được xử lý: $status.';
  }

  @override
  String get bdAuditTitle => 'Lịch sử xử lý hoàn tiền';

  @override
  String get bdAuditHint =>
      'Các bước xử lý được ghi nhận theo thứ tự thời gian — cũ nhất ở trên, mới nhất ở dưới.';

  @override
  String bdRefundNumber(int id) {
    return 'Yêu cầu #$id';
  }

  @override
  String bdTransactionAt(String time) {
    return 'Giao dịch $time';
  }

  @override
  String get bdStuckHint =>
      'Chưa nhận được xác nhận từ VNPay. Nếu bạn đã thanh toán, hãy kiểm tra lại.';

  @override
  String get bdChecking => 'Đang kiểm tra';

  @override
  String bdRefundAwaitingTriage(String status) {
    return '$status • Chờ quản trị viên phân loại';
  }

  @override
  String get bdAwaitingTriage => 'Chờ phân loại';

  @override
  String get bdHintConfirmed =>
      'Thanh toán thành công — chỗ của bạn đã được xác nhận.';

  @override
  String get bdHintCompleted =>
      'Bạn đã hoàn thành trải nghiệm. Cảm ơn bạn đã đồng hành!';

  @override
  String get bdHintPending =>
      'Đơn đang chờ thanh toán — hãy hoàn tất trong hạn 10 phút.';

  @override
  String get bdHintCancelled => 'Đơn đã được hủy và chỗ đã được trả lại.';

  @override
  String get auditCreated => 'Đã gửi yêu cầu hoàn tiền';

  @override
  String get auditApproved => 'Quản trị viên đã duyệt yêu cầu';

  @override
  String get auditRejected => 'Yêu cầu bị từ chối';

  @override
  String get auditCancelled => 'Yêu cầu đã được hủy';

  @override
  String get auditVnpaySent => 'Đã gửi yêu cầu hoàn tiền tới VNPay';

  @override
  String get auditVnpayResponse => 'VNPay phản hồi kết quả hoàn tiền';

  @override
  String get auditManualRecorded => 'Đã ghi nhận chuyển khoản thủ công';

  @override
  String get auditManualConfirmed =>
      'Đã xác nhận chuyển khoản — hoàn tiền thành công';

  @override
  String get auditStatusUpdated => 'Cập nhật trạng thái yêu cầu';

  @override
  String get auditOther => 'Cập nhật yêu cầu hoàn tiền';

  @override
  String get holdReleased => 'Đã trả lại';

  @override
  String get holdFreed => 'Đã giải phóng';

  @override
  String get holdHolding => 'Đang giữ chỗ';

  @override
  String get refundToneRefunded => 'Đã hoàn tiền';

  @override
  String get refundToneRejected => 'Từ chối';

  @override
  String get rfPolicyCustomer => 'Lỗi từ khách hàng (Hủy tour)';

  @override
  String rfCancelBefore(int days) {
    return 'Hủy trước $days ngày';
  }

  @override
  String rfRefundPercent(int percent) {
    return 'Hoàn $percent%';
  }

  @override
  String rfCancelWithin(int hours) {
    return 'Hủy trong vòng $hours giờ / Không đến (theo lịch trình)';
  }

  @override
  String get rfPolicyPlatform => 'Lỗi hệ thống / Đối tác';

  @override
  String get rfPolicyPlatformLine =>
      'Lỗi không mở khóa được trải nghiệm, đối tác không tổ chức...';

  @override
  String get rfPolicyForceMajeure => 'Bất khả kháng';

  @override
  String get rfPolicyForceMajeureLine => 'Thiên tai, dịch bệnh,...';

  @override
  String rfMaxFiles(int max) {
    return 'Mỗi yêu cầu chỉ đính kèm tối đa $max tệp.';
  }

  @override
  String get rfGalleryFailed => 'Không thể mở thư viện ảnh.';

  @override
  String get rfVideoFailed => 'Không thể chọn video.';

  @override
  String get rfUploadFailed =>
      'Không tải được toàn bộ bằng chứng lên máy chủ. Vui lòng thử lại.';

  @override
  String get rfSubmitFailed =>
      'Không thể gửi yêu cầu hoàn tiền. Vui lòng thử lại.';

  @override
  String get rfErrSummary => 'Vui lòng nhập lý do ngắn gọn.';

  @override
  String get rfErrDetail =>
      'Vui lòng tường thuật chi tiết sự cố hoặc lý do không thể tham gia.';

  @override
  String get rfErrBank => 'Vui lòng điền đầy đủ thông tin tài khoản nhận tiền.';

  @override
  String get rfErrContact => 'Vui lòng điền đầy đủ thông tin liên hệ.';

  @override
  String get rfErrReceipt =>
      'Vui lòng tải lên ảnh chụp biên lai giao dịch thành công (bắt buộc để quản trị viên đối chiếu).';

  @override
  String get rfErrAgree =>
      'Vui lòng xác nhận cam đoan thông tin và bằng chứng.';

  @override
  String get rfErrGeneric => 'Vui lòng kiểm tra lại thông tin đã nhập.';

  @override
  String get rfSentTitle => 'Đã Gửi Yêu Cầu Hoàn Tiền';

  @override
  String rfSentDetail(String code, String status) {
    return 'Mã yêu cầu: $code\nTrạng thái: $status';
  }

  @override
  String get rfGotIt => 'Đã hiểu';

  @override
  String get rfTitle => 'Yêu Cầu Hoàn Tiền';

  @override
  String get rfFooterNote =>
      'Yêu cầu sẽ được quản trị viên xem xét và đối chiếu bằng chứng. Số tiền thực nhận, tỷ lệ hoàn và phương thức hoàn sẽ được thông báo sau khi phê duyệt.';

  @override
  String get rfOrder => 'Đơn hàng';

  @override
  String get rfPaidBooking => 'Đơn đã thanh toán';

  @override
  String get rfAmountPaid => 'Số tiền đã thanh toán';

  @override
  String get rfPaidDate => 'Ngày thanh toán';

  @override
  String get rfPolicyTitle => 'Chính sách Hoàn Tiền';

  @override
  String get rfReasonTitle => 'Lý do hoàn tiền';

  @override
  String get rfReasonHint =>
      'Quản trị viên sẽ đọc nội dung này để đối chiếu và quyết định mức hoàn.';

  @override
  String get rfSummaryHint => 'Nhập lý do ngắn gọn (VD: Bị ốm đột xuất,....)';

  @override
  String get rfDetailHint =>
      'Vui lòng tường thuật chi tiết sự cố bạn gặp phải hoặc lý do không thể tham gia để admin hỗ trợ tốt nhất';

  @override
  String get rfEvidenceTitle => 'Đính kèm bằng chứng';

  @override
  String get rfEvidenceTypes => '(Ảnh/Video/Giấy tờ)';

  @override
  String get rfEvidenceExamples =>
      'Giấy khám bệnh, hình ảnh sự cố, ảnh chụp màn hình lỗi ứng dụng, v.v.';

  @override
  String get rfReceiptRequired =>
      'Bắt buộc: ảnh chụp biên lai giao dịch thành công';

  @override
  String get rfReceiptHint =>
      'Hãy chụp màn hình biên lai VNPay hiển thị \"Giao dịch thành công\" rồi bấm \"Thêm ảnh\" bên dưới. Không có ảnh, yêu cầu sẽ không được gửi.';

  @override
  String get rfAddPhoto => 'Thêm ảnh';

  @override
  String get rfAddVideo => 'Thêm video';

  @override
  String get rfUploadError => 'Lỗi tải lên';

  @override
  String get rfBankTitle => 'Tài khoản nhận tiền';

  @override
  String get rfBankHint =>
      'Cung cấp để hỗ trợ hoàn tiền bằng phương thức thủ công nếu cần.';

  @override
  String get rfAccountNumber => 'Số tài khoản';

  @override
  String get rfAccountName => 'Tên chủ tài khoản';

  @override
  String get rfBank => 'Ngân hàng';

  @override
  String get rfContactTitle => 'Thông tin liên hệ';

  @override
  String get rfPhone => 'Số điện thoại';

  @override
  String get rfBackupEmail => 'Email dự phòng';

  @override
  String get rfAgreement =>
      'Tôi cam đoan các thông tin và bằng chứng cung cấp là sự thật, đồng thời đã đọc và hiểu rõ chính sách hoàn tiền.';

  @override
  String get rfSending => 'Đang gửi...';

  @override
  String get rfSubmit => 'Gửi yêu cầu hoàn tiền';

  @override
  String get rhLoadFailed => 'Không thể tải lịch sử hoàn tiền.';

  @override
  String get rhAwaitingAdminTriage => 'Chờ quản trị viên phân loại';

  @override
  String get rhTitle => 'Lịch Sử Hoàn Tiền';

  @override
  String get rhEmpty => 'Chưa có yêu cầu hoàn tiền nào';

  @override
  String get rhMyBooking => 'Đơn của tôi';

  @override
  String get rhNoRefund => 'Không hoàn tiền';

  @override
  String get rhAwaitingAdmin => 'Chờ quản trị viên xử lý';

  @override
  String get rhNotRefunded => 'Không được hoàn';

  @override
  String rhRejectReason(String reason) {
    return 'Lý do từ chối: $reason';
  }

  @override
  String rhMethod(String method) {
    return 'Phương thức: $method';
  }

  @override
  String get rhEvidenceLoadFailed => 'Không tải được bằng chứng';

  @override
  String get rhFilterPending => 'Chờ xử lý';

  @override
  String get rhFilterRefunded => 'Đã hoàn';

  @override
  String get rsTitle => 'Hỗ trợ & Hoàn tiền';

  @override
  String get rsLoadFailed => 'Không tải được yêu cầu hoàn tiền';

  @override
  String get rsEmptyTitle => 'Chưa có yêu cầu hoàn tiền';

  @override
  String get rsEmptyMessage =>
      'Các yêu cầu hoàn tiền vé của bạn và tiến độ xử lý sẽ hiển thị tại đây.';

  @override
  String rsBookingNumber(String id) {
    return 'Đơn #$id';
  }

  @override
  String rsSentAt(String time) {
    return 'Gửi lúc $time';
  }

  @override
  String get rsApprovedAmount => 'Số tiền được duyệt';

  @override
  String get rsProposedAmount => 'Số tiền đề xuất';

  @override
  String get rsAmount => 'Số tiền';

  @override
  String get refundStatusPendingReview => 'Chờ duyệt';

  @override
  String get refundStatusApproved => 'Đã duyệt';

  @override
  String get refundStatusVnpay => 'Chờ VNPay xác nhận hoàn tiền';

  @override
  String get refundStatusProcessing => 'Đang hoàn tiền';

  @override
  String get refundStatusManual => 'Chờ chuyển khoản thủ công';

  @override
  String get refundStatusRejected => 'Bị từ chối';

  @override
  String get refundStatusRejected2 => 'Đã từ chối';

  @override
  String get refundStatusFailed => 'Hoàn tiền lỗi';

  @override
  String get refundReasonCustomer => 'Lỗi khách hàng';

  @override
  String get refundReasonPlatform => 'Lỗi nền tảng';

  @override
  String get refundReasonProvider => 'Lỗi đối tác';

  @override
  String get refundReasonForceMajeure => 'Lỗi bất khả kháng';

  @override
  String get refundReasonOther => 'Lý do khác';

  @override
  String get refundMethodVnpay => 'Hoàn qua VNPay';

  @override
  String get refundMethodManual => 'Chuyển khoản thủ công';

  @override
  String get refundMethodUnknown => 'Chưa xác định';

  @override
  String get rfOtherBank => 'Khác (ghi rõ tên ngân hàng)';

  @override
  String get invLoadFailed =>
      'Không thể tải thông tin lời mời. Vui lòng thử lại.';

  @override
  String invLoginWithEmail(String email) {
    return 'Vui lòng đăng nhập bằng email $email để xác nhận lời mời.';
  }

  @override
  String get invConfirmFailed =>
      'Không thể xác nhận lời mời. Vui lòng thử lại.';

  @override
  String get invStatusPending => 'Chờ xác nhận';

  @override
  String get invStatusRevoked => 'Đã bị thu hồi';

  @override
  String get invTitle => 'Lời mời tham gia tour';

  @override
  String get invJoined => 'Bạn đã tham gia tour!';

  @override
  String get invNoLongerValid => 'Lời mời không còn hiệu lực';

  @override
  String get invInvited => 'Bạn được mời tham gia tour';

  @override
  String get invLinked => 'Hành khách đã được liên kết với đơn đặt tour.';

  @override
  String get invExpiredHint =>
      'Lời mời đã hết hạn hoặc bị thu hồi. Vui lòng liên hệ người đặt tour để được gửi lại.';

  @override
  String get invConfirmHint =>
      'Xác nhận lời mời để được cấp quyền tham gia tour cùng nhóm.';

  @override
  String get invInfoTitle => 'THÔNG TIN LỜI MỜI';

  @override
  String get invPassenger => 'Hành khách';

  @override
  String get invInvitedEmail => 'Email được mời';

  @override
  String get invValidUntil => 'Hiệu lực đến';

  @override
  String get invStatus => 'Trạng thái';

  @override
  String get invConfirming => 'Đang xác nhận...';

  @override
  String get invConfirmJoin => 'Xác nhận tham gia';

  @override
  String get invLoginToConfirm => 'Đăng nhập để xác nhận';

  @override
  String get invNotFound => 'Không tìm thấy lời mời';

  @override
  String get invNotFoundHint => 'Lời mời không tồn tại hoặc đã hết hạn.';

  @override
  String get invListLoadFailed =>
      'Không tải được danh sách lời mời. Vui lòng thử lại.';

  @override
  String get invConfirmFailed2 =>
      'Không xác nhận được lời mời. Vui lòng thử lại.';

  @override
  String get invInviterFallback => 'Người đặt tour';

  @override
  String invInvitedBy(String inviter, String tour) {
    return '$inviter đã mời bạn vào tour $tour. Xác nhận lời mời để được cấp quyền tham gia tour cùng nhóm.';
  }

  @override
  String get invJoinedDetail =>
      'Hành khách đã được liên kết với đơn đặt tour. Bạn có thể xem chi tiết booking và truy cập tour.';

  @override
  String get invNoneLeft => 'Không còn lời mời nào';

  @override
  String get invNoneLeftHint =>
      'Bạn không có lời mời tham gia tour nào đang chờ xác nhận.';

  @override
  String get invLoginSnack =>
      'Bạn được mời tham gia tour. Vui lòng đăng nhập để xác nhận lời mời.';

  @override
  String get invTagSent => 'Đã gửi lời mời';

  @override
  String get invTagJoined => 'Đã tham gia';

  @override
  String get invTagExpired => 'Lời mời đã hết hạn';

  @override
  String get invTagRevoked => 'Lời mời đã hủy';

  @override
  String get tripsTitle => 'Chuyến đi của tôi';

  @override
  String get tripsSubtitle => 'Vé đã mua, hành trình đang đi và đã hoàn thành';

  @override
  String get tripsLoadFailed => 'Không tải được chuyến đi của bạn';

  @override
  String get tripsEmptySection => 'Chưa có chuyến đi nào ở mục này.';

  @override
  String get tripsStageActive => 'Đang diễn ra';

  @override
  String get tripsStageReady => 'Sắp khởi hành';

  @override
  String get tripsStageEnded => 'Đã kết thúc';

  @override
  String get tripsNotJoined => 'Bạn chưa tham gia tour này';

  @override
  String get tripsLive => 'Trực tiếp';

  @override
  String get tripsEmptyTitle => 'Bạn chưa có chuyến đi nào';

  @override
  String get tripsEmptyMessage =>
      'Đặt một tour ở trang Khám phá, vé sẽ nằm tại đây để bạn bắt đầu hành trình khi đến nơi.';

  @override
  String get tripsExplore => 'Khám phá tour';

  @override
  String get tripsFilterActive => 'Đang đi';

  @override
  String get tripsFilterReady => 'Sắp tới';

  @override
  String get tripsFilterDone => 'Đã xong';

  @override
  String get tripsExperiencing => 'Đang trải nghiệm';

  @override
  String tripsStopProgress(int current, int total) {
    return 'Trạm $current/$total';
  }

  @override
  String get tripsStopsCheckedIn => ' trạm hoàn thành';

  @override
  String tripsNextStop(int current, int total) {
    return 'Trạm tiếp theo $current/$total';
  }

  @override
  String get tripsAllStopsChecked => 'Đã đi trọn các trạm';

  @override
  String get tripsUnfinished => 'Đi tiếp nhé';

  @override
  String tripsUnfinishedHint(String date) {
    return 'Hành trình bắt đầu $date nhưng chưa hoàn tất.';
  }

  @override
  String get tripsActionTitle => 'Cần bạn xử lý';

  @override
  String get tripsRefundNeededTitle =>
      'Đã thanh toán nhưng đơn bị hủy · cần gửi yêu cầu hoàn tiền';

  @override
  String tripsDestinations(int count) {
    return '$count điểm đến';
  }

  @override
  String get tripsTicketDetails => 'Chi tiết vé';

  @override
  String get tripsViewItinerary => 'Xem lịch trình';

  @override
  String get tripsStart => 'Bắt đầu';

  @override
  String get tripsToday => 'Hôm nay';

  @override
  String get tripsTomorrow => 'Ngày mai';

  @override
  String tripsDaysLeft(int days) {
    return 'Còn $days ngày';
  }

  @override
  String tripsCodeSemantics(String code) {
    return 'Mã vé $code, chạm để sao chép';
  }

  @override
  String tripsCodeCopied(String code) {
    return 'Đã sao chép mã vé $code';
  }

  @override
  String get tripsTicketCode => 'Mã vé';

  @override
  String get calLoadFailed => 'Không tải được lịch khởi hành.';

  @override
  String get calTitle => 'Xem tour theo ngày';

  @override
  String get calLoadFailedTitle => 'Không tải được lịch';

  @override
  String get calPrevMonth => 'Tháng trước';

  @override
  String get calNextMonth => 'Tháng sau';

  @override
  String get calNoDepartures => 'Chưa có lịch khởi hành';

  @override
  String calDepartureCount(int count) {
    return '$count lượt khởi hành';
  }

  @override
  String calDaySemantics(String date, int count) {
    return 'Ngày $date, $count tour';
  }

  @override
  String calDaySemanticsNone(String date) {
    return 'Ngày $date, không có tour';
  }

  @override
  String get calNoDeparturesHint =>
      'Các tour sẽ hiện ở đây khi đối tác mở ngày khởi hành.';

  @override
  String get authLoginSuccess => 'Đăng nhập thành công!';

  @override
  String authWelcomeBackName(String name) {
    return 'Chào mừng du khách $name quay trở lại với Di sản Việt Nam.';
  }

  @override
  String get authSignupSuccess => 'Khởi tạo tài khoản thành công!';

  @override
  String get authSignupReward =>
      '🎉 Quý khách đã nhận được +100 điểm thưởng khám phá di sản!';

  @override
  String get authLoginFailed => 'Đăng nhập không thành công';

  @override
  String get authSignupFailedMessage =>
      'Đăng ký tài khoản không thành công. Vui lòng thử lại.';

  @override
  String get authSignupFailed => 'Đăng ký không thành công';

  @override
  String get authInvalid => 'Tài khoản hoặc mật khẩu không hợp lệ!';

  @override
  String get authAppleUnsupported =>
      'Đăng nhập Apple ID hiện chưa hỗ trợ trên Android.';

  @override
  String get authWelcomeBack =>
      'Chào mừng quý khách quay trở lại với JourneyGo!';

  @override
  String get authPrivacyTitle => 'Tiêu chuẩn Di sản số';

  @override
  String get authPrivacyBody =>
      'Dữ liệu của du khách được mã hóa an toàn theo tiêu chuẩn bảo tồn văn hóa số quốc gia. Chúng tôi cam kết tuyệt đối bảo mật thông tin định danh, lịch sử chuyến đi và tài sản điểm thưởng di sản của quý khách.';

  @override
  String get authPrivacyAgree => 'Đã hiểu và đồng ý';

  @override
  String get authFullName => 'Họ và tên';

  @override
  String get authFullNameExample => 'Nguyễn Văn An';

  @override
  String get authErrNameRequired => 'Vui lòng nhập họ và tên của quý khách';

  @override
  String get authErrNameShort => 'Họ tên quá ngắn';

  @override
  String get authErrEmailRequired => 'Vui lòng nhập địa chỉ email';

  @override
  String get authErrEmailInvalid => 'Định dạng email chưa hợp lệ';

  @override
  String get authPhone => 'Số điện thoại';

  @override
  String get authErrPhoneRequired => 'Vui lòng cung cấp số điện thoại';

  @override
  String get authErrPhoneLength => 'Số điện thoại gồm 9 - 11 chữ số';

  @override
  String get authPassword => 'Mật khẩu';

  @override
  String get authPasswordHintLogin => 'Nhập mật khẩu';

  @override
  String get authPasswordHintSignup => 'Tối thiểu 6 ký tự';

  @override
  String get authErrPasswordRequired => 'Vui lòng nhập mật khẩu';

  @override
  String get authErrPasswordShort => 'Mật khẩu phải chứa ít nhất 6 ký tự';

  @override
  String get authConfirmPassword => 'Nhập lại mật khẩu';

  @override
  String get authConfirmPasswordHint => 'Nhập lại mật khẩu vừa tạo';

  @override
  String get authErrConfirmRequired => 'Vui lòng nhập lại mật khẩu';

  @override
  String get authErrConfirmMismatch => 'Mật khẩu xác nhận không khớp';

  @override
  String get authHeaderLogin =>
      'Chào mừng trở lại! Đăng nhập để tiếp tục hành trình.';

  @override
  String get authHeaderSignup =>
      'Tạo tài khoản để khám phá di sản và nhận điểm thưởng.';

  @override
  String get authLogin => 'Đăng nhập';

  @override
  String get authSignup => 'Tạo tài khoản';

  @override
  String get authPromoPrefix => 'Nhận ngay ';

  @override
  String get authPromoPoints => '+100 điểm thưởng ';

  @override
  String get authPromoSuffix => 'khám phá di sản khi tạo tài khoản mới!';

  @override
  String get authRemember => 'Ghi nhớ đăng nhập';

  @override
  String get authForgot => 'Quên mật khẩu?';

  @override
  String get authOrContinue => 'hoặc tiếp tục với';

  @override
  String get authGoogle => 'Tiếp tục với Google';

  @override
  String get authFooter =>
      'Bảo mật theo tiêu chuẩn Di sản Văn hóa số • Điều khoản';

  @override
  String authServerUnreachableDebug(String url, String detail, String hint) {
    return 'Không thể kết nối đến máy chủ ($url).\nChi tiết: $detail\n\n$hint';
  }

  @override
  String get authServerUnreachable =>
      'Không thể kết nối đến máy chủ. Vui lòng thử lại sau.';

  @override
  String authServerTimeoutDebug(String url, String hint) {
    return 'Kết nối đến máy chủ ($url) quá hạn.\n\n$hint';
  }

  @override
  String get authServerTimeout =>
      'Kết nối đến máy chủ quá hạn (timeout). Vui lòng thử lại sau.';

  @override
  String authNetworkError(String error) {
    return 'Lỗi kết nối mạng: $error';
  }

  @override
  String get authErr401 =>
      'Thông tin đăng nhập không hợp lệ hoặc phiên đã hết hạn.';

  @override
  String get authErr403 => 'Bạn không có quyền truy cập chức năng này.';

  @override
  String get authErr404 => 'Không tìm thấy tài nguyên yêu cầu (404).';

  @override
  String authErrServer(String code) {
    return 'Lỗi máy chủ ($code). Vui lòng thử lại sau.';
  }

  @override
  String get authNoRefreshToken =>
      'Không tìm thấy Refresh Token. Vui lòng đăng nhập lại.';

  @override
  String authSessionExpiredDetail(String detail) {
    return 'Phiên đăng nhập đã hết hạn: $detail';
  }

  @override
  String get apiInvalidData => 'Máy chủ trả về dữ liệu không hợp lệ.';

  @override
  String get googleCancelled => 'Người dùng đã huỷ đăng nhập Google.';

  @override
  String get googleNoToken =>
      'Không lấy được idToken từ Google. Vui lòng thử lại.';

  @override
  String get sessionExpired =>
      'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại để tiếp tục.';

  @override
  String apiRequestFailed(String code) {
    return 'Không thể xử lý yêu cầu (mã $code).';
  }

  @override
  String get apiTimeout => 'Kết nối đến máy chủ quá hạn. Vui lòng thử lại.';

  @override
  String get apiUnreachable =>
      'Không thể kết nối đến máy chủ. Hãy kiểm tra mạng và địa chỉ API.';

  @override
  String get apiNoImageUrl => 'Máy chủ không trả về đường dẫn ảnh.';

  @override
  String apiImageUploadFailed(String code) {
    return 'Không thể tải ảnh lên (mã $code).';
  }

  @override
  String get apiImageTimeout => 'Tải ảnh quá hạn. Vui lòng thử lại.';

  @override
  String get apiNoVideoUrl => 'Máy chủ không trả về đường dẫn video.';

  @override
  String apiVideoUploadFailed(String code) {
    return 'Không thể tải video lên (mã $code).';
  }

  @override
  String get apiVideoTimeout => 'Tải video quá hạn. Vui lòng thử lại.';

  @override
  String get pwShow => 'Hiện mật khẩu';

  @override
  String get pwHide => 'Ẩn mật khẩu';

  @override
  String get pwErrNewRequired => 'Vui lòng nhập mật khẩu mới';

  @override
  String get pwErrNewShort => 'Mật khẩu phải có ít nhất 6 ký tự';

  @override
  String get pwOtpResent => 'Đã gửi lại mã OTP tới email của bạn.';

  @override
  String get pwResetSuccess => 'Đặt lại mật khẩu thành công';

  @override
  String get pwResetSuccessHint => 'Hãy đăng nhập bằng mật khẩu mới.';

  @override
  String get pwForgotTitle => 'Khôi phục mật khẩu';

  @override
  String get pwForgotSubtitle => 'Nhận mã OTP qua email để đặt lại mật khẩu';

  @override
  String get pwStepOtp => 'Mã OTP';

  @override
  String get pwStepNewPassword => 'Mật khẩu mới';

  @override
  String get pwEmailIntro =>
      'Nhập email bạn đã dùng để đăng ký. Chúng tôi sẽ gửi mã gồm 6 chữ số.';

  @override
  String get pwErrEmailRequired => 'Vui lòng nhập email';

  @override
  String get pwErrEmailInvalid => 'Email không đúng định dạng';

  @override
  String get pwSendOtp => 'Gửi mã OTP';

  @override
  String get pwCodeSentPrefix => 'Mã đã được gửi tới ';

  @override
  String get pwCodeSentSuffix => '. Kiểm tra cả thư mục Spam nếu chưa thấy.';

  @override
  String get pwErrOtpLength => 'Mã OTP gồm đúng 6 chữ số';

  @override
  String get pwVerifyCode => 'Xác nhận mã';

  @override
  String get pwChangeEmail => 'Đổi email';

  @override
  String pwResendIn(int seconds) {
    return 'Gửi lại sau ${seconds}s';
  }

  @override
  String get pwResend => 'Gửi lại mã';

  @override
  String get pwNewIntro => 'Đặt mật khẩu mới cho tài khoản của bạn.';

  @override
  String get pwMin6 => 'Ít nhất 6 ký tự';

  @override
  String get pwConfirmNew => 'Nhập lại mật khẩu mới';

  @override
  String get pwErrMismatch => 'Mật khẩu nhập lại không khớp';

  @override
  String get pwResetButton => 'Đặt lại mật khẩu';

  @override
  String get pwChangeSuccess => 'Đổi mật khẩu thành công.';

  @override
  String get pwChangeSubtitle => 'Giữ an toàn cho hành trang di sản của bạn';

  @override
  String get pwCurrent => 'Mật khẩu hiện tại';

  @override
  String get pwCurrentGoogleHint =>
      'Bỏ trống nếu bạn đăng nhập bằng Google và chưa từng đặt mật khẩu';

  @override
  String get pwErrCurrentRequired => 'Vui lòng nhập mật khẩu hiện tại';

  @override
  String get pwNewHelper => 'Ít nhất 6 ký tự, khác mật khẩu hiện tại';

  @override
  String get pwSave => 'Lưu mật khẩu mới';

  @override
  String get epNameRequired => 'Họ tên không được để trống!';

  @override
  String get epSaved => 'Cập nhật hồ sơ cá nhân thành công qua máy chủ!';

  @override
  String get epTitle => 'Chỉnh Sửa Hồ Sơ Du Khách';

  @override
  String get epEmailLabel => 'Email tài khoản (không thể thay đổi):';

  @override
  String get epNameLabel => 'Họ và tên:';

  @override
  String get epNameHint => 'Nhập họ và tên đầy đủ';

  @override
  String get epPhoneLabel => 'Số điện thoại:';

  @override
  String get epPhoneHint => 'Nhập số điện thoại liên hệ';

  @override
  String get epSaving => 'Đang lưu thay đổi lên máy chủ...';

  @override
  String get epSave => 'Lưu Thông Tin Mới';

  @override
  String get notifCatBooking => 'Đặt chỗ';

  @override
  String get notifCatRefund => 'Hoàn tiền';

  @override
  String get notifCatReward => 'Phần thưởng';

  @override
  String get notifCatApproved => 'Đã duyệt';

  @override
  String get notifCatRejected => 'Cần xem lại';

  @override
  String get notifCatCommunity => 'Cộng đồng';

  @override
  String get notifCatFinance => 'Tài chính';

  @override
  String get notifCatReview => 'Thẩm định';

  @override
  String get notifCatChat => 'Tin nhắn';

  @override
  String get timeJustNow => 'Vừa xong';

  @override
  String timeMinutesAgo(int count) {
    return '$count phút trước';
  }

  @override
  String timeHoursAgo(int count) {
    return '$count giờ trước';
  }

  @override
  String get timeYesterday => 'Hôm qua';

  @override
  String timeDaysAgo(int count) {
    return '$count ngày trước';
  }

  @override
  String notifNewCount(int count) {
    return '$count mới';
  }

  @override
  String get notifReadAll => 'Đọc tất cả';

  @override
  String get notifOlder => 'Xem thông báo cũ hơn';

  @override
  String get notifEmpty => 'Chưa có thông báo';

  @override
  String get notifEmptyHint =>
      'Kết quả thanh toán, hoàn tiền, huy hiệu và bài viết của bạn sẽ hiện ở đây.';

  @override
  String get notifChannelTimer => 'Hẹn giờ hoạt động';

  @override
  String get notifChannelTimerDesc =>
      'Nhắc khi hết giờ đếm ngược của trải nghiệm thực tế';

  @override
  String get notifChannelCountdown => 'Đồng hồ đếm ngược';

  @override
  String get notifChannelCountdownDesc =>
      'Thời gian còn lại của hoạt động thực địa, hiện cả trên màn hình khoá';

  @override
  String tkCountdownBody(String place) {
    return 'Đang đếm ngược · $place';
  }

  @override
  String get ovHideTitle => 'Ẩn đồng hồ nổi?';

  @override
  String get ovHideBody => 'Thời gian vẫn tiếp tục đếm trong ứng dụng.';

  @override
  String get ovHide => 'Ẩn';

  @override
  String get ovCancel => 'Huỷ';

  @override
  String get ovPermTitle => 'Hiện đồng hồ khi rời ứng dụng?';

  @override
  String get ovPermBody =>
      'Cho phép Journey Go hiển thị trên ứng dụng khác để thấy thời gian còn lại ngay trên màn hình chính.';

  @override
  String get ovPermAllow => 'Cho phép';

  @override
  String get ovPermLater => 'Để sau';

  @override
  String get notifChannelMain => 'Thông báo Journey Go';

  @override
  String get notifChannelMainDesc =>
      'Đơn đặt tour, hoàn tiền, huy hiệu, bài viết diễn đàn';

  @override
  String get chatListLoadFailed => 'Không thể tải lịch sử hỗ trợ.';

  @override
  String get chatEmpty => 'Chưa có cuộc trò chuyện nào';

  @override
  String get chatEmptyHint =>
      'Mở chi tiết bất kỳ tour nào và bấm \"Chat với bên …\" để hỏi nhà tour trước khi đặt vé. Lịch sử sẽ được lưu lại tại đây.';

  @override
  String get chatNoMessages => 'Chưa có tin nhắn nào';

  @override
  String get chatOpenFailed => 'Không thể mở cuộc trò chuyện.';

  @override
  String get chatProviderFallback => 'Nhà tour';

  @override
  String chatAskAbout(String name) {
    return 'Hỏi $name về tour này';
  }

  @override
  String get chatProviderLower => 'nhà tour';

  @override
  String get chatAskHint =>
      'Bạn có thể hỏi về lịch trình, giá, điều kiện thời tiết hoặc thủ tục đặt tour — trước khi quyết định đặt vé.';

  @override
  String get chatInputHint => 'Nhắn tin cho nhà tour…';

  @override
  String get pcVerified => 'Đối tác đã xác minh';

  @override
  String get pcOnline => 'Đang trực tuyến';

  @override
  String get pcReplyFewMinutes => 'Thường trả lời trong vài phút';

  @override
  String pcReplyMinutes(int minutes) {
    return 'Thường trả lời trong khoảng $minutes phút';
  }

  @override
  String pcReplyHours(int hours) {
    return 'Thường trả lời trong khoảng $hours giờ';
  }

  @override
  String get pcReplyDay => 'Thường trả lời trong vòng 1 ngày';

  @override
  String get pcReplyDays => 'Thường trả lời sau vài ngày';

  @override
  String get pcNotifyReply => 'Bạn sẽ nhận thông báo khi nhà tour trả lời';

  @override
  String pcAskingAbout(String tour) {
    return 'Đang hỏi về: $tour';
  }

  @override
  String get pcToday => 'Hôm nay';

  @override
  String get pcYesterday => 'Hôm qua';

  @override
  String get pcQuick1 => 'Lịch khởi hành gần nhất?';

  @override
  String get pcQuick2 => 'Giá cho trẻ em thế nào?';

  @override
  String get pcQuick3 => 'Có đón tại khách sạn không?';

  @override
  String get pcQuick4 => 'Cần chuẩn bị mang gì?';

  @override
  String get pcQuickTitle => 'Câu hỏi gợi ý';

  @override
  String pcNewMessages(int count) {
    return '$count tin mới';
  }

  @override
  String get pcSending => 'Đang gửi…';

  @override
  String get pcSendFailed => 'Gửi lỗi · Chạm để gửi lại';

  @override
  String get pcCopied => 'Đã sao chép tin nhắn';

  @override
  String get pcLoadOlder => 'Xem tin nhắn cũ hơn';

  @override
  String get pcHistoryEnd => 'Bạn đã xem hết lịch sử tin nhắn';

  @override
  String get pcInfoTitle => 'Thông tin nhà tour';

  @override
  String get pcInfoBody =>
      'Nhà tour được Journey Go kiểm duyệt. Tin nhắn được lưu lại để bạn xem tiếp bất cứ lúc nào.';

  @override
  String get pcViewTour => 'Xem tour';

  @override
  String get pcSeen => 'Đã xem';

  @override
  String get pcSent => 'Đã gửi';

  @override
  String get pcStartChat => 'Bắt đầu trò chuyện';

  @override
  String get pcListSubtitle =>
      'Hỏi lịch trình, giá, điểm đón… trực tiếp với nhà tour';

  @override
  String get forumFilterTour => 'Lọc theo tour';

  @override
  String get forumTitle => 'Diễn đàn di sản';

  @override
  String get forumSubtitle => 'Chia sẻ trải nghiệm văn hoá cùng cộng đồng';

  @override
  String get forumMyPosts => 'Bài của tôi';

  @override
  String get forumLoadFailed => 'Không tải được Diễn đàn';

  @override
  String get forumNoMatch => 'Không có bài viết phù hợp';

  @override
  String get forumNoPosts => 'Chưa có bài viết nào';

  @override
  String get forumNoMatchHint => 'Thử bỏ bớt bộ lọc để xem thêm bài viết.';

  @override
  String get forumNoPostsHint =>
      'Hãy là người đầu tiên chia sẻ trải nghiệm của bạn.';

  @override
  String get forumComposePrompt => 'Bạn vừa có trải nghiệm gì thú vị?';

  @override
  String get forumSortNewest => 'Mới nhất';

  @override
  String get forumSortTop => 'Nổi bật';

  @override
  String get forumDestinationFallback => 'Điểm đến';

  @override
  String forumMaxImages(int max) {
    return 'Mỗi bài viết chỉ đính kèm tối đa $max ảnh.';
  }

  @override
  String get forumGalleryFailed =>
      'Không mở được thư viện ảnh. Hãy kiểm tra quyền truy cập.';

  @override
  String get forumChooseTour => 'Chọn tour';

  @override
  String get forumJoinedNote => 'Bạn đã tham gia';

  @override
  String get forumErrTitle => 'Vui lòng nhập tiêu đề bài viết.';

  @override
  String get forumErrContent => 'Vui lòng nhập nội dung bài viết.';

  @override
  String get forumSaving => 'Đang lưu bài viết...';

  @override
  String forumUploadingImage(int index, int total) {
    return 'Đang tải ảnh $index/$total...';
  }

  @override
  String get forumDraftSaved => 'Đã lưu bản nháp.';

  @override
  String get forumSubmitted =>
      'Đã gửi bài viết. Bài sẽ hiển thị sau khi được kiểm duyệt.';

  @override
  String get forumEditPost => 'Chỉnh sửa bài viết';

  @override
  String get forumNewPost => 'Viết bài mới';

  @override
  String get forumFieldTitle => 'Tiêu đề';

  @override
  String get forumFieldContent => 'Nội dung';

  @override
  String get forumFieldTour => 'Tour liên quan';

  @override
  String get forumTourOptional => 'Chọn tour (không bắt buộc)';

  @override
  String get forumTourLocked => 'Không thể đổi tour sau khi đã đăng.';

  @override
  String get forumTourHint =>
      'Tour bạn đã tham gia được đưa lên đầu danh sách.';

  @override
  String forumPhotos(int count, int max) {
    return 'Ảnh ($count/$max)';
  }

  @override
  String get forumModerationNote =>
      'Bài viết sẽ hiển thị trên Diễn đàn sau khi được kiểm duyệt viên phê duyệt.';

  @override
  String get forumSaveChanges => 'Lưu thay đổi';

  @override
  String get forumSaveDraft => 'Lưu nháp';

  @override
  String get forumSubmitReview => 'Gửi duyệt';

  @override
  String get forumAddPhotoHint => 'Chạm để thêm ảnh từ thư viện';

  @override
  String get forumReportPost => 'Báo cáo bài viết';

  @override
  String get forumReportDescription => 'Mô tả thêm (không bắt buộc)';

  @override
  String get forumSendReport => 'Gửi báo cáo';

  @override
  String get forumAgree => 'Đồng ý';

  @override
  String get forumJoinedTour => 'Đã tham gia tour';

  @override
  String forumModeratorFeedback(String note) {
    return 'Phản hồi từ kiểm duyệt viên: $note';
  }

  @override
  String get forumDeselect => 'Bỏ chọn';

  @override
  String get forumListLoadFailed =>
      'Không tải được danh sách. Vui lòng thử lại sau.';

  @override
  String get forumNothingToPick => 'Chưa có mục nào để chọn.';

  @override
  String get forumTabDraft => 'Nháp';

  @override
  String get forumTabPending => 'Chờ duyệt';

  @override
  String get forumTabPublished => 'Đã đăng';

  @override
  String get forumTabRevision => 'Cần sửa';

  @override
  String get forumTabRejected => 'Bị từ chối';

  @override
  String get forumWrite => 'Viết bài';

  @override
  String get forumPostsLoadFailed => 'Không tải được bài viết';

  @override
  String get forumMyEmpty => 'Bạn chưa có bài viết nào';

  @override
  String forumMyEmptyTab(String tab) {
    return 'Không có bài ở mục \"$tab\"';
  }

  @override
  String get forumMyEmptyHint =>
      'Chia sẻ trải nghiệm chuyến đi để mọi người cùng khám phá.';

  @override
  String get forumDeleteComment => 'Xóa bình luận';

  @override
  String get forumDeleteCommentConfirm => 'Bạn muốn xóa bình luận này?';

  @override
  String get forumDelete => 'Xóa';

  @override
  String get forumCommentReported =>
      'Đã báo cáo bình luận. Cảm ơn bạn đã giúp cộng đồng.';

  @override
  String get forumReportComment => 'Báo cáo bình luận';

  @override
  String get forumReportCommentHint =>
      'Spam, ngôn từ xúc phạm, thông tin sai lệch…';

  @override
  String get forumReportSent => 'Đã gửi báo cáo. Cảm ơn bạn đã giúp cộng đồng.';

  @override
  String get forumDeletePost => 'Xóa bài viết';

  @override
  String get forumDeletePostConfirm =>
      'Bài viết và các bình luận sẽ bị xóa vĩnh viễn.';

  @override
  String get forumDeletePostShort => 'Xóa bài';

  @override
  String get forumSentForReview => 'Đã gửi bài viết để kiểm duyệt.';

  @override
  String get forumPost => 'Bài viết';

  @override
  String get forumOptions => 'Tùy chọn';

  @override
  String get forumEdit => 'Chỉnh sửa';

  @override
  String get forumResubmit => 'Gửi duyệt lại';

  @override
  String get forumReactionsAfterReview =>
      'Bài viết chỉ nhận cảm xúc và bình luận sau khi được kiểm duyệt.';

  @override
  String forumComments(int count) {
    return 'Bình luận ($count)';
  }

  @override
  String get forumNoComments => 'Chưa có bình luận nào. Hãy là người đầu tiên!';

  @override
  String get forumLoading => 'Đang tải...';

  @override
  String get forumMoreComments => 'Xem thêm bình luận';

  @override
  String get forumCommentHint => 'Viết bình luận...';

  @override
  String get forumSendComment => 'Gửi bình luận';

  @override
  String get forumReasonSpam => 'Spam hoặc quảng cáo';

  @override
  String get forumReasonInappropriate => 'Nội dung không phù hợp';

  @override
  String get forumReasonHate => 'Ngôn từ thù ghét';

  @override
  String get forumReasonFalse => 'Thông tin sai sự thật';

  @override
  String get forumReasonCopyright => 'Vi phạm bản quyền';

  @override
  String get forumStatusHidden => 'Đang được xem xét';

  @override
  String get forumStatusDraft => 'Bản nháp';

  @override
  String get forumStatusRevision => 'Cần chỉnh sửa';

  @override
  String get forumAuthorFallback => 'Du khách';

  @override
  String get achCatTour => 'Hành trình khám phá';

  @override
  String get achCatTourShort => 'Hành trình';

  @override
  String get achCatTourDesc => 'Chinh phục các chuyến đi & vùng đất mới';

  @override
  String get achUnitTour => 'tour';

  @override
  String get achCatCheckin => 'Dấu chân điểm đến';

  @override
  String get achCatCheckinShort => 'Check-in';

  @override
  String get achCatCheckinDesc => 'Check-in GPS tại các tọa độ di sản';

  @override
  String get achUnitDestination => 'điểm đến';

  @override
  String get achCatCulture => 'Văn hóa & Tri thức';

  @override
  String get achCatCultureShort => 'Văn hóa';

  @override
  String get achCatCultureDesc => 'Khám phá câu chuyện di sản & giải đố';

  @override
  String get achUnitLesson => 'bài';

  @override
  String get achCatExperience => 'Thử thách trải nghiệm';

  @override
  String get achCatExperienceShort => 'Trải nghiệm';

  @override
  String get achCatExperienceDesc => 'Vượt qua nhiệm vụ thực tế tại điểm dừng';

  @override
  String get achUnitMission => 'nhiệm vụ';

  @override
  String get achCatStreak => 'Kiên định & Gắn bó';

  @override
  String get achCatStreakShort => 'Gắn bó';

  @override
  String get achCatStreakDesc => 'Duy trì ngọn lửa đam mê cùng JourneyGo';

  @override
  String get achUnitMilestone => 'mốc';

  @override
  String get achTierBronze => 'Đồng';

  @override
  String get achTierSilver => 'Bạc';

  @override
  String get achTierGold => 'Vàng';

  @override
  String get achTierLegendary => 'Huyền thoại';

  @override
  String get achUnitDays => 'ngày';

  @override
  String get achTitle => 'Thành tựu & Huy hiệu';

  @override
  String get achBadgeCollection => 'Bộ sưu tập huy hiệu';

  @override
  String get achLoadFailed => 'Không tải được thành tựu';

  @override
  String get achFilterUnlocked => 'Đã mở khóa';

  @override
  String get achFilterClaimable => 'Chờ nhận thưởng';

  @override
  String get achAchieved => 'Thành tựu đã đạt';

  @override
  String get achPoints => 'Điểm thành tựu';

  @override
  String achBadgesClaimed(int count) {
    return 'Đã nhận $count huy hiệu';
  }

  @override
  String get achPending => 'Chờ nhận';

  @override
  String get achAllClaimed => 'Đã nhận hết';

  @override
  String get achCompleteToUnlock => 'Hoàn thành để mở khóa';

  @override
  String achCategoryProgress(int achieved, int total, int pct) {
    return '$achieved/$total thành tựu • $pct%';
  }

  @override
  String get achNoMatch =>
      'Không có thành tựu nào khớp bộ lọc trong danh mục này';

  @override
  String get achNoMatchHint =>
      'Thử chuyển sang bộ lọc \"Tất cả\" hoặc chọn danh mục khác để tiếp tục theo dõi tiến độ.';

  @override
  String get achSeeAllInCategory => 'Xem tất cả trong mục này';

  @override
  String get achReady => 'Sẵn sàng nhận';

  @override
  String achProgress(String current, String target, String unit) {
    return 'Tiến độ: $current/$target $unit';
  }

  @override
  String get achClaiming => 'Đang nhận...';

  @override
  String get achClaim => 'Nhận thưởng';

  @override
  String get achClaimed => 'Đã nhận';

  @override
  String get achClaimBarrier => 'Nhận thưởng thành tựu';

  @override
  String get achUnlockedEyebrow => 'THÀNH TỰU ĐẠT ĐƯỢC';

  @override
  String achBadgeName(String name) {
    return 'Huy hiệu: $name';
  }

  @override
  String get achRewardEyebrow => 'PHẦN THƯỞNG VỪA NHẬN';

  @override
  String achNewBalance(String balance) {
    return 'Số dư hiện tại: $balance JP';
  }

  @override
  String get achKeepExploring => 'Tuyệt vời! Tiếp tục khám phá';

  @override
  String get bdgLoadFailed => 'Không tải được huy hiệu';

  @override
  String get bdgEmpty => 'Chưa có huy hiệu nào';

  @override
  String get bdgEmptyHint =>
      'Check-in tại các điểm di sản để mở khóa huy hiệu đầu tiên.';

  @override
  String bdgCount(int earned, int total) {
    return '$earned / $total huy hiệu';
  }

  @override
  String get bdgViewProgress => 'Xem tiến độ & nhận thưởng thành tựu';

  @override
  String get bdgLocked => 'Chưa mở khóa';

  @override
  String bdgEarnedOn(String date) {
    return 'Nhận ngày $date';
  }

  @override
  String bdgBonus(String points) {
    return '+$points điểm thưởng';
  }

  @override
  String get mvCopied => 'Đã sao chép mã voucher';

  @override
  String get mvTitle => 'Voucher của tôi';

  @override
  String mvTabUsable(int count) {
    return 'Còn dùng ($count)';
  }

  @override
  String mvTabUsed(int count) {
    return 'Đã dùng ($count)';
  }

  @override
  String mvTabExpired(int count) {
    return 'Hết hạn ($count)';
  }

  @override
  String get mvLoadFailed => 'Không tải được kho voucher';

  @override
  String get mvEmptyUsable => 'Chưa có voucher nào';

  @override
  String get mvEmptyUsableHint =>
      'Dùng điểm tích lũy để đổi voucher tại mục Đổi thưởng.';

  @override
  String get mvEmptyUsed => 'Chưa dùng voucher nào';

  @override
  String get mvEmptyUsedHint => 'Voucher bạn đã dùng sẽ hiển thị tại đây.';

  @override
  String get mvEmptyExpired => 'Không có voucher hết hạn';

  @override
  String get mvEmptyExpiredHint => 'Hãy dùng voucher trước ngày hết hạn nhé.';

  @override
  String get mvStatusUsable => 'Còn dùng';

  @override
  String get mvStatusUsed => 'Đã dùng';

  @override
  String get mvStatusExpired => 'Hết hạn';

  @override
  String mvUsedOn(String date) {
    return 'Đã dùng $date';
  }

  @override
  String mvExpiredOn(String date) {
    return 'Hết hạn $date';
  }

  @override
  String mvValidUntil(String date) {
    return 'Hạn dùng đến $date';
  }

  @override
  String get mvCopyCode => 'Sao chép mã';

  @override
  String mvRedeemedFor(String points) {
    return 'Đã đổi $points điểm';
  }

  @override
  String rwBalanceLeft(String balance) {
    return 'Còn $balance';
  }

  @override
  String get vsConfirmTitle => 'Xác nhận đổi voucher';

  @override
  String vsConfirmMessage(String points, String title) {
    return 'Dùng $points điểm để đổi \"$title\"? Điểm đã đổi sẽ không được hoàn lại.';
  }

  @override
  String get vsRedeemNow => 'Đổi ngay';

  @override
  String get vsSuccessTitle => 'Đổi voucher thành công';

  @override
  String get vsSuccessSubtitle =>
      'Mã của bạn đã được lưu trong mục \"Voucher của tôi\".';

  @override
  String get vsLoadFailed => 'Không tải được danh sách voucher';

  @override
  String get vsEmpty => 'Chưa có voucher để đổi';

  @override
  String get vsEmptyHint =>
      'Các ưu đãi mới sẽ xuất hiện tại đây. Hãy quay lại sau nhé.';

  @override
  String get vsYourPoints => 'Điểm của bạn';

  @override
  String vsMinOrder(String amount) {
    return 'Đơn từ $amount';
  }

  @override
  String vsMaxDiscount(String amount) {
    return 'Giảm tối đa $amount';
  }

  @override
  String vsValidDays(int days) {
    return 'Dùng trong $days ngày';
  }

  @override
  String vsRedeemUntil(String date) {
    return 'Đổi được đến $date';
  }

  @override
  String vsPoints(String points) {
    return '$points điểm';
  }

  @override
  String vsNeedMore(String points) {
    return 'Cần thêm $points điểm';
  }

  @override
  String vsRemaining(int count) {
    return 'Còn $count lượt';
  }

  @override
  String get vsRedeem => 'Đổi';

  @override
  String get wTitle => 'Ví điểm';

  @override
  String get wLoadFailed => 'Không tải được ví điểm';

  @override
  String get wEmpty => 'Chưa có giao dịch điểm';

  @override
  String get wEmptyHint =>
      'Check-in điểm đến và hoàn thành nhiệm vụ để bắt đầu tích điểm.';

  @override
  String get wBalance => 'Số dư hiện tại';

  @override
  String get wPointsUnit => 'điểm';

  @override
  String get wRedeem => 'Đổi voucher';

  @override
  String get wMilestoneHint =>
      'Mở khóa mốc hành trình để nhận thêm điểm thưởng';

  @override
  String get wHistory => 'Lịch sử điểm';

  @override
  String get badgeTypeCheckin => 'Check-in điểm đến';

  @override
  String get badgeTypeTour => 'Hoàn thành tour';

  @override
  String get badgeTypeTask => 'Bậc thầy nhiệm vụ';

  @override
  String get badgeTypeStreak => 'Chuỗi ngày';

  @override
  String get badgeTypeEvent => 'Sự kiện đặc biệt';

  @override
  String get badgeTypeOther => 'Huy hiệu';

  @override
  String get ptxTask => 'Hoàn thành nhiệm vụ';

  @override
  String get ptxExperience => 'Trải nghiệm';

  @override
  String get ptxAchievement => 'Thưởng thành tựu';

  @override
  String get ptxAdmin => 'Điều chỉnh bởi quản trị';

  @override
  String get ptxVoucherRefund => 'Hoàn điểm voucher hết hạn';

  @override
  String get ptxOther => 'Giao dịch điểm';

  @override
  String get voucherOutOfStock => 'Đã hết lượt đổi';

  @override
  String get voucherNotStarted => 'Chưa mở đổi';

  @override
  String get jsEnded =>
      'Hành trình này đã kết thúc. Bạn có thể xem lại câu chuyện văn hóa đã mở khóa.';

  @override
  String get jsAlreadyCheckedInCurrent =>
      'Bạn đã check-in điểm đến hiện tại rồi. Hãy hoàn thành nhiệm vụ để mở điểm đến kế tiếp.';

  @override
  String get jsQrTitle => 'Check-in bằng QR';

  @override
  String jsQrHint(String place) {
    return 'Quét mã QR tại $place';
  }

  @override
  String jsAlreadyCheckedInAt(String place) {
    return 'Bạn đã check-in $place rồi.';
  }

  @override
  String get jsHeritageBadge => 'Huy hiệu di sản';

  @override
  String jsCheckInSuccessAt(String place) {
    return 'Check-in thành công tại $place. Đã mở khóa Nội dung văn hóa và Trải nghiệm.';
  }

  @override
  String get jsExplore => 'Khám phá';

  @override
  String get jsCheckInSuccess =>
      'Check-in thành công. Đã mở khóa Nội dung văn hóa và Trải nghiệm.';

  @override
  String get jsSkipTitle => 'Bỏ qua điểm đến?';

  @override
  String jsSkipMessage(String place) {
    return 'Bạn sẽ không nhận huy hiệu và điểm thưởng tại $place. Hành trình tiếp tục ở điểm kế tiếp.';
  }

  @override
  String get jsSkip => 'Bỏ qua';

  @override
  String get jsNoLocation => 'Chưa lấy được vị trí';

  @override
  String get jsOpenSettings => 'Mở cài đặt';

  @override
  String get jsCompletedJourney => 'Bạn đã hoàn thành hành trình';

  @override
  String jsStopDoneTitle(int order) {
    return 'Bạn đã hoàn thành trải nghiệm trạm $order';
  }

  @override
  String jsStopDoneBody(String place) {
    return 'Bạn đã làm xong mọi thử thách tại $place.';
  }

  @override
  String get jsAlreadyCheckedInShort => 'Bạn đã check-in rồi';

  @override
  String jsCheckedInAllDone(String place) {
    return 'Bạn đã check-in $place và đi trọn hành trình. Không cần check-in thêm.';
  }

  @override
  String jsCheckedInContinue(String place) {
    return 'Bạn đã check-in $place rồi. Hãy tiếp tục làm nhiệm vụ tại điểm đến này.';
  }

  @override
  String get jsCannotCheckIn => 'Chưa thể check-in';

  @override
  String get jsRankPerfect => 'Hoàn thành trọn vẹn';

  @override
  String get jsRankPartial => 'Đã đi hết hành trình';

  @override
  String get jsRankDone => 'Hoàn thành hành trình';

  @override
  String jsCompletedPerfect(String tour, String bonus) {
    return 'Bạn đã đi trọn \"$tour\" và nhận thêm $bonus điểm thưởng. Cảm ơn bạn đã lan tỏa di sản!';
  }

  @override
  String jsCompletedPartial(String tour) {
    return 'Bạn đã đi hết \"$tour\". Cảm ơn bạn đã đồng hành cùng di sản!';
  }

  @override
  String get jsViewSummary => 'Xem tổng kết';

  @override
  String get jsEnableLocation =>
      'Hãy bật định vị và cho phép truy cập vị trí để chỉ đường.';

  @override
  String get jsNoRoute => 'Không tìm được đường tới điểm này.';

  @override
  String jsNear500(Object place) {
    return 'Còn chưa tới 500 m nữa là đến $place';
  }

  @override
  String get jsAlmostThere => 'Sắp tới nơi, chuẩn bị check-in';

  @override
  String jsArrived(String place) {
    return 'Bạn đã đến $place';
  }

  @override
  String get jsRoute => 'Lộ trình';

  @override
  String get jsMap => 'Bản đồ';

  @override
  String get jsHeritageStamps => 'Dấu ấn di sản';

  @override
  String get jsCaptionSkipped => 'Bỏ qua';

  @override
  String get jsCaptionStamped => 'Đã đóng';

  @override
  String get jsCaptionOpen => 'Đang mở';

  @override
  String jsStopN(int n) {
    return 'Trạm $n';
  }

  @override
  String jsStampCount(int done, int total) {
    return '$done/$total dấu';
  }

  @override
  String get jsPointsSuffix => ' điểm';

  @override
  String jsHeaderDone(int count) {
    return 'Đã đi xong · $count trạm';
  }

  @override
  String jsHeaderActive(int count) {
    return 'Đang trải nghiệm · $count trạm';
  }

  @override
  String get jsNoPointsStop => 'Không tính điểm cho trạm này';

  @override
  String jsDoneReview(int points) {
    return 'Đã xong · +$points điểm · chạm để xem lại';
  }

  @override
  String jsUnlockAfter(int n) {
    return 'Mở khi xong trạm $n';
  }

  @override
  String jsChallengeCount(int count) {
    return '$count thử thách';
  }

  @override
  String get jsLocked => 'Chưa mở';

  @override
  String get jsSkippedStatus => 'Đã bỏ qua';

  @override
  String get jsAtStop => 'Bạn đang ở trạm';

  @override
  String jsAtStopSince(String time) {
    return 'Bạn đang ở trạm · check-in lúc $time';
  }

  @override
  String jsStopOpenDistance(String distance) {
    return 'Trạm đang mở · cách $distance';
  }

  @override
  String get jsStopOpen => 'Trạm đang mở';

  @override
  String get jsStory => 'Câu chuyện';

  @override
  String get jsNoChallenges => 'Không có thử thách';

  @override
  String jsChallengeProgress(int done, int total, int points) {
    return '$done/$total thử thách · +$points điểm';
  }

  @override
  String jsQuizQuestions(int count) {
    return 'Câu đố $count câu';
  }

  @override
  String get jsCultureTitle => 'Nội dung văn hóa';

  @override
  String get jsCultureFallback => 'Câu chuyện tại điểm';

  @override
  String get jsRead => 'Đã đọc';

  @override
  String get jsNew => 'Mới';

  @override
  String get jsExperienceTitle => 'Trải nghiệm';

  @override
  String get jsExperienceFallback => 'Thử thách tại điểm';

  @override
  String get jsCompletedBadge => 'Hoàn thành';

  @override
  String jsCheckInRadiusHint(String radius) {
    return 'Đến trong bán kính $radius m quanh điểm đến rồi check-in trạm, hoặc quét mã QR dán tại cổng, để mở khóa Nội dung văn hóa và Trải nghiệm.';
  }

  @override
  String get jsCheckInHint =>
      'Đến nơi rồi check-in để mở khóa Nội dung văn hóa, Trải nghiệm và nhận huy hiệu di sản.';

  @override
  String get jsDirections => 'Chỉ đường';

  @override
  String get jsCheckInStop => 'Check-in trạm';

  @override
  String get ciTitle => 'Xác nhận vị trí check-in';

  @override
  String get ciLocating => 'Đang xác định vị trí của bạn…';

  @override
  String ciInside(String meters) {
    return 'Bạn đang cách trạm $meters m — nằm trong vùng check-in.';
  }

  @override
  String ciOutside(String meters, String radius) {
    return 'Bạn chưa tới trạm: còn cách $meters m (cần trong $radius m).';
  }

  @override
  String ciAccuracy(String meters) {
    return 'Độ chính xác GPS ±$meters m';
  }

  @override
  String get ciConfirm => 'Xác nhận check-in';

  @override
  String get ciRefresh => 'Lấy lại vị trí';

  @override
  String get ciQrFallback =>
      'Không dùng được GPS? Quét mã QR dán tại trạm để check-in.';

  @override
  String get ciOpenSettings => 'Mở cài đặt';

  @override
  String get jsCheckInGps => 'Check-in GPS';

  @override
  String get jsScanQr => 'Quét mã QR tại điểm';

  @override
  String get jsScanQrShort => 'Quét QR';

  @override
  String get jsSkipStop => 'Bỏ qua trạm này';

  @override
  String jsCompleteAll(int count) {
    return 'Đi trọn $count trạm';
  }

  @override
  String get jsCompleteAllHint =>
      'Nhận điểm thưởng hoàn thành và bảng tổng kết chuyến đi. Bỏ qua trạm nào thì không có thưởng hoàn thành.';

  @override
  String jsSkippedNoBonus(int count) {
    return 'Bỏ qua $count trạm nên chưa nhận thưởng hoàn thành.';
  }

  @override
  String get jsStatPoints => 'Điểm';

  @override
  String get jsStatPerfectChallenges => 'Thử thách đạt trọn';

  @override
  String get jsStatStops => 'Trạm đã đi';

  @override
  String get jsEndedLabel => 'Hành trình đã kết thúc';

  @override
  String jsEndedTitle(int points, int done, int total) {
    return '$points điểm · $done/$total trạm';
  }

  @override
  String get jsNextStop => 'Trạm kế tiếp';

  @override
  String get jsUnlockedCulture => 'Đã mở khóa · Nội dung văn hóa';

  @override
  String get jsReadStory => 'Đọc câu chuyện';

  @override
  String get jsUnlockedExperience => 'Đã mở khóa · Trải nghiệm';

  @override
  String jsChallengesWaiting(int count) {
    return '$count thử thách đang chờ';
  }

  @override
  String jsDirectionsTo(String place) {
    return 'Chỉ đường tới $place';
  }

  @override
  String get jsWholeRoute => 'Xem toàn bộ đường đi';

  @override
  String get jsWholeTour => 'Xem toàn tuyến';

  @override
  String get jsFollowMe => 'Bám theo vị trí của tôi';

  @override
  String get jsMyLocation => 'Vị trí của tôi';

  @override
  String get jsStreetMap => 'Bản đồ đường phố';

  @override
  String get jsSatellite => 'Ảnh vệ tinh';

  @override
  String get jsStateAtStop => 'đang ở trạm';

  @override
  String get jsStateOpen => 'đang mở';

  @override
  String get jsStateSkipped => 'đã bỏ qua';

  @override
  String get jsStateDone => 'đã xong';

  @override
  String get jsStateLocked => 'chưa mở';

  @override
  String jsChallengesLeft(int count) {
    return '$count thử thách còn lại';
  }

  @override
  String get jsAllChallengesDone => 'Đã làm hết thử thách';

  @override
  String jsDistanceAway(String distance) {
    return 'Cách $distance';
  }

  @override
  String get jsArriveToCheckIn => 'Đến nơi để check-in';

  @override
  String get jsNoPointsHere => 'Không nhận điểm tại trạm này';

  @override
  String jsStopState(int n, String state) {
    return 'Trạm $n · $state';
  }

  @override
  String get jsViewStop => 'Xem trạm';

  @override
  String get jsLoadFailed => 'Không tải được hành trình.';

  @override
  String jsOpenTile(String title) {
    return 'Mở $title';
  }

  @override
  String jsTileLocked(String title) {
    return '$title, check-in để mở khóa';
  }

  @override
  String jsCheckInToUnlock(String info) {
    return 'Check-in để mở khóa\n$info';
  }

  @override
  String get tkMapsFailed => 'Không mở được ứng dụng bản đồ.';

  @override
  String get tkQrMismatchActivity =>
      'Mã QR không khớp với điểm hoạt động này. Hãy quét đúng mã tại chỗ.';

  @override
  String get tkQrMismatchStop => 'Mã QR không khớp với trạm này. Hãy thử lại.';

  @override
  String get tkQrConfirmTitle => 'Quét QR xác nhận hoàn thành';

  @override
  String get tkQrStopTitle => 'Quét QR tại trạm';

  @override
  String tkQrAtPlace(String place) {
    return 'Quét mã QR tại $place';
  }

  @override
  String get tkQrNextStop => 'Quét mã QR tại trạm kế tiếp';

  @override
  String get tkCheckedIn => 'Đã check-in!';

  @override
  String get tkNoLocation =>
      'Chưa xác định được vị trí của bạn. Hãy bật GPS rồi thử lại.';

  @override
  String tkTooFarToCheckIn(String distance, String radius) {
    return 'Bạn còn cách trạm $distance. Hãy vào trong bán kính $radius m để check-in.';
  }

  @override
  String tkTimeUpTitle(String name) {
    return 'Hết giờ: $name';
  }

  @override
  String tkTimeUpBody(String place) {
    return 'Quét mã QR tại $place để trả lời câu hỏi và nhận điểm.';
  }

  @override
  String get tkTimeUp => 'Hết giờ!';

  @override
  String tkPlusPoints(int points) {
    return '+$points điểm';
  }

  @override
  String tkLeg(int current, int total) {
    return 'Chặng $current/$total';
  }

  @override
  String get tkClue => 'Manh mối';

  @override
  String get tkGotIt => 'Đã rõ';

  @override
  String get tkLoadFailed => 'Không tải được nhiệm vụ.';

  @override
  String get tkFieldMission => 'Trải nghiệm thực tế';

  @override
  String get tkHeritageQuiz => 'Đố vui di sản';

  @override
  String get tkQuestionsLabel => 'câu hỏi';

  @override
  String get tkBonusLabel => 'điểm thưởng';

  @override
  String get tkAttemptsLabel => 'lượt còn lại';

  @override
  String get tkRules => 'Thể lệ';

  @override
  String get tkRuleAllCorrect =>
      'Trả lời đúng tất cả câu hỏi để nhận trọn điểm thưởng (chỉ một lần).';

  @override
  String get tkRuleLocation =>
      'Mỗi câu hỏi gắn với một địa điểm. Bạn cần đứng trong bán kính của trạm để mở câu hỏi.';

  @override
  String get tkRuleRestart =>
      'Trả lời sai một câu, bạn sẽ phải làm lại từ câu đầu.';

  @override
  String tkRuleRetry(int max) {
    return 'Chưa đúng hết, bạn có thể làm lại nếu còn lượt (tối đa $max lượt).';
  }

  @override
  String get tkMissionDone => 'Bạn đã hoàn thành nhiệm vụ này.';

  @override
  String get tkNoAttempts => 'Bạn đã hết lượt làm nhiệm vụ này.';

  @override
  String get tkDirectionsToStop => 'Chỉ đường tới trạm';

  @override
  String get tkRetryMission => 'Làm lại nhiệm vụ';

  @override
  String get tkStartMission => 'Bắt đầu nhiệm vụ';

  @override
  String get tkInProgressTitle => 'Đang làm dở';

  @override
  String tkInProgressSummary(int answered, int total, int correct, int points) {
    return 'Đã trả lời $answered/$total câu · đúng $correct · +$points điểm';
  }

  @override
  String tkContinueFromQuestion(int number) {
    return 'Tiếp tục từ câu $number';
  }

  @override
  String get tkExitConfirmTitle => 'Thoát nhiệm vụ?';

  @override
  String get tkExitConfirmBody =>
      'Tiến độ đã được lưu, bạn có thể làm tiếp sau.';

  @override
  String get tkExitActivityBody =>
      'Thời gian vẫn tiếp tục đếm, bạn có thể quay lại bất cứ lúc nào.';

  @override
  String get tkStay => 'Ở lại';

  @override
  String get tkExit => 'Thoát';

  @override
  String get tkEarlierAnswered => 'Các câu trước đã trả lời ở lần trước';

  @override
  String tkQuestionsProgress(int answered, int total) {
    return '$answered/$total câu';
  }

  @override
  String get tkViewClue => 'Xem manh mối';

  @override
  String get tkStages => 'Các chặng';

  @override
  String tkStagesDone(int done, int total) {
    return '$done/$total hoàn thành';
  }

  @override
  String tkUnlockAfterStage(int n) {
    return 'Mở khóa sau chặng $n';
  }

  @override
  String get tkLocating => 'Đang xác định vị trí...';

  @override
  String get tkNoPosition => 'Chưa có vị trí của bạn';

  @override
  String get tkArrivedReady => 'Bạn đã tới trạm, sẵn sàng mở câu hỏi';

  @override
  String tkDistanceRadius(String distance, String radius) {
    return 'Cách $distance · bán kính $radius m';
  }

  @override
  String tkStageAt(int n, String place) {
    return 'Chặng $n · $place';
  }

  @override
  String get tkRefreshDistance => 'Cập nhật khoảng cách';

  @override
  String get tkShowBoth => 'Xem cả bạn và trạm';

  @override
  String tkStopOf(int current, int total) {
    return 'Trạm $current/$total';
  }

  @override
  String get tkLocatingYou => 'Đang xác định vị trí của bạn...';

  @override
  String tkTooFarToWalk(String eta) {
    return 'Khá xa để đi bộ$eta. Hãy đi xe tới gần rồi đi bộ vào trạm.';
  }

  @override
  String tkWalkRoute(String duration) {
    return 'Đi bộ ~$duration theo đường trên bản đồ';
  }

  @override
  String tkTurnHeading(String turn, String direction) {
    return '$turn · hướng $direction';
  }

  @override
  String tkHeadTo(String direction) {
    return 'Đi về hướng $direction';
  }

  @override
  String get tkArrivedAtStop => 'Bạn đã tới trạm';

  @override
  String get tkCheckedInPressStart => 'Đã check-in · bấm \"Bắt đầu nhiệm vụ\"';

  @override
  String get tkPressCheckIn => 'Bấm \"Check-in\" để xác nhận đã tới nơi';

  @override
  String get tkOpeningQuestion => 'Đang mở câu hỏi...';

  @override
  String get tkQuestionAutoOpen => 'Câu hỏi sẽ tự mở';

  @override
  String tkRadius(String radius) {
    return 'Bán kính $radius m';
  }

  @override
  String get tkOpenLocationSettings => 'Mở cài đặt vị trí';

  @override
  String tkStartMissionTimed(String duration) {
    return 'Bắt đầu nhiệm vụ · $duration';
  }

  @override
  String get tkCheckInAtStop => 'Check-in tại trạm';

  @override
  String get tkNotAtStop => 'Chưa tới trạm';

  @override
  String tkNotAtStopDistance(String distance) {
    return 'Chưa tới trạm · còn $distance';
  }

  @override
  String get tkOpenQuestion => 'Mở câu hỏi';

  @override
  String get tkGoogleMaps => 'Chỉ đường bằng Google Maps';

  @override
  String get tkCheckLocation => 'Kiểm tra vị trí';

  @override
  String get tkNextStop => 'Trạm kế tiếp';

  @override
  String get tkNextPlace => 'Địa điểm kế tiếp';

  @override
  String get tkFindQr => 'Tìm mã QR đặt tại trạm và quét để mở câu hỏi.';

  @override
  String get tkStartActivity => 'Bắt đầu hoạt động';

  @override
  String get tkActivityDone =>
      'Hoàn thành hoạt động! Quét mã QR tại điểm để trả lời câu hỏi.';

  @override
  String get tkActivityInProgress =>
      'Thực hiện hoạt động tại chỗ. Hết giờ bạn sẽ được quét mã QR.';

  @override
  String tkCorrectReward(int points) {
    return 'Trả lời đúng nhận +$points điểm';
  }

  @override
  String get tkScanQrOnSite => 'Quét mã QR tại điểm';

  @override
  String get tkSkipCountdownDev => 'Bỏ qua đếm ngược (dev)';

  @override
  String get tkNoQuestions => 'Nhiệm vụ này chưa có câu hỏi.';

  @override
  String tkQuestionOf(int current, int total) {
    return 'Câu $current / $total';
  }

  @override
  String tkAtPlace(String place) {
    return 'Tại: $place';
  }

  @override
  String get tkConfirmAnswer => 'Xác nhận câu trả lời';

  @override
  String get tkSubmit => 'Nộp bài';

  @override
  String get tkNextQuestion => 'Câu tiếp theo';

  @override
  String get tkAnswerHint => 'Nhập câu trả lời của bạn...';

  @override
  String get tkExcellent => 'Xuất sắc!';

  @override
  String get tkCompleted => 'Hoàn thành!';

  @override
  String get tkSubmitted => 'Đã nộp bài';

  @override
  String tkResultScore(int correct, int total, String name) {
    return 'Bạn trả lời đúng $correct/$total câu của \"$name\".';
  }

  @override
  String tkMissionCompleted(String name) {
    return 'Bạn đã hoàn thành nhiệm vụ \"$name\".';
  }

  @override
  String get tkCorrect => 'Chính xác!';

  @override
  String tkCorrectSoFar(int current, int total) {
    return 'Bạn đã trả lời đúng $current/$total câu. Hãy đến địa điểm kế tiếp để mở câu hỏi tiếp theo.';
  }

  @override
  String get tkIncorrect => 'Chưa chính xác';

  @override
  String tkRetryInfo(int correct, int total, int attempts) {
    return 'Bạn đúng $correct/$total câu. Cần đúng tất cả để nhận điểm. Còn $attempts lượt làm lại.';
  }

  @override
  String tkBonusPoints(int points) {
    return '+$points điểm thưởng';
  }

  @override
  String get tkGoNextPlace => 'Đến địa điểm kế tiếp';

  @override
  String get tkRetry => 'Làm lại';

  @override
  String get tkBackToJourney => 'Về hành trình';

  @override
  String get navArrived => 'Bạn đã đến nơi';

  @override
  String get navRerouting => 'Đang tìm lại đường…';

  @override
  String get navOffRoute => 'Bạn đã đi khác tuyến gợi ý';

  @override
  String get navStart => 'Bắt đầu đi';

  @override
  String navContinueFor(String distance) {
    return 'Đi tiếp $distance';
  }

  @override
  String navTo(String place) {
    return 'Tới $place';
  }

  @override
  String get navThen => 'Sau đó';

  @override
  String navArrivedAtStop(String n) {
    return 'ĐÃ ĐẾN TRẠM $n';
  }

  @override
  String navRouteToStop(String n) {
    return 'ĐƯỜNG TỚI TRẠM $n';
  }

  @override
  String get navEnd => 'Kết thúc chỉ đường';

  @override
  String get navFinding => 'Đang tìm đường…';

  @override
  String get navNoRoute => 'Không tìm được đường';

  @override
  String navArriveAt(String time) {
    return 'Đến lúc $time';
  }

  @override
  String get navOnTheWay => 'TRÊN ĐƯỜNG ĐI';

  @override
  String get navCheckInHint =>
      'Check-in để mở khóa Nội dung văn hóa và Trải nghiệm tại trạm này.';

  @override
  String get navSteps => 'Các bước';

  @override
  String navViewSteps(int count) {
    return 'Xem $count bước chỉ đường';
  }

  @override
  String get navOpenGoogleMaps => 'Mở Google Maps (có giọng nói)';

  @override
  String get navDirectionSteps => 'Các bước chỉ đường';

  @override
  String get navGoStraight => 'Đi tiếp';

  @override
  String get navWalk => 'Đi bộ';

  @override
  String get navBike => 'Xe 2 bánh';

  @override
  String get navCar => 'Ô tô';

  @override
  String get compassN => 'Bắc';

  @override
  String get compassNE => 'Đông Bắc';

  @override
  String get compassE => 'Đông';

  @override
  String get compassSE => 'Đông Nam';

  @override
  String get compassS => 'Nam';

  @override
  String get compassSW => 'Tây Nam';

  @override
  String get compassW => 'Tây';

  @override
  String get compassNW => 'Tây Bắc';

  @override
  String get turnStraight => 'Đi thẳng';

  @override
  String get turnBack => 'Quay lại';

  @override
  String get turnRight => 'Rẽ phải';

  @override
  String get turnLeft => 'Rẽ trái';

  @override
  String get mapCredit => 'Bản đồ: © Goong';

  @override
  String get sumPerfectTitle => 'Hoàn thành trọn vẹn';

  @override
  String get sumPerfectSubtitle =>
      'Bạn đã chinh phục mọi điểm đến và trả lời đúng mọi thử thách.';

  @override
  String sumPartialSubtitle(int count) {
    return 'Bạn đã bỏ qua $count điểm đến. Lần sau hãy thử đi đủ để nhận thưởng hoàn thành.';
  }

  @override
  String get sumDoneSubtitle =>
      'Bạn đã đi đủ mọi điểm đến. Vài thử thách còn chưa trọn điểm, thử lại ở chuyến sau nhé!';

  @override
  String get sumTitle => 'Tổng kết hành trình';

  @override
  String get sumPointsEarned => 'điểm nhận được';

  @override
  String get sumDestinationsVisited => 'điểm đến đã ghé';

  @override
  String get sumPerfectChallenges => 'thử thách đạt trọn';

  @override
  String get sumDuration => 'thời gian trải nghiệm';

  @override
  String get sumRoute => 'Lộ trình đã đi';

  @override
  String get sumEachDestination => 'Từng điểm đến';

  @override
  String get sumShare => 'Chia sẻ thành tích';

  @override
  String get sumReview => 'Xem lại hành trình';

  @override
  String sumBonus(String bonus, int total) {
    return 'Thưởng hoàn thành: +$bonus điểm (đã gồm trong tổng $total điểm)';
  }

  @override
  String get sumNoBonus =>
      'Không có thưởng hoàn thành vì có điểm đến bị bỏ qua.';

  @override
  String sumDestinationN(int n, String name) {
    return 'Điểm $n · $name';
  }

  @override
  String sumDestinationStats(int done, int total, int points) {
    return '$done/$total nhiệm vụ · +$points điểm';
  }

  @override
  String get sumNoAttempts => 'Hết lượt';

  @override
  String get shareImageFailed => 'Không tạo được ảnh';

  @override
  String shareText(String tour, int points, int done, int total) {
    return 'Mình vừa hoàn thành \"$tour\" cùng JourneyGo: $points điểm, $done/$total trạm di sản!';
  }

  @override
  String get shareSubject => 'Hành trình di sản cùng JourneyGo';

  @override
  String get shareFailed => 'Không chia sẻ được ảnh. Vui lòng thử lại.';

  @override
  String get shareImage => 'Chia sẻ ảnh';

  @override
  String get shareRankPerfect => 'HOÀN THÀNH TRỌN VẸN';

  @override
  String get shareRankPartial => 'ĐÃ ĐI HẾT HÀNH TRÌNH';

  @override
  String get shareRankDone => 'HOÀN THÀNH HÀNH TRÌNH';

  @override
  String get shareStatPoints => 'điểm';

  @override
  String get shareStatStops => 'trạm';

  @override
  String get shareStatChallenges => 'thử thách';

  @override
  String shareStamps(int count) {
    return 'DẤU ẤN DI SẢN · $count DẤU ẤN';
  }

  @override
  String get shareFooter =>
      'Khám phá di sản Việt cùng JourneyGo · journeygo.id.vn';

  @override
  String get seInZone => 'bạn đang ở trong vùng';

  @override
  String seDistance(String distance) {
    return 'cách $distance';
  }

  @override
  String seStopHeader(String n, String name) {
    return 'TRẠM $n  ·  $name';
  }

  @override
  String get seHeadline => 'Tự tay khám phá di sản';

  @override
  String get seMapHint =>
      'Bấm vào số trên bản đồ để mở hoạt động. Vào trong vòng tròn của hoạt động mới bắt đầu được.';

  @override
  String get seNoChallenges => 'Trạm này không có thử thách.';

  @override
  String get seAllDone => 'Đã hoàn thành mọi thử thách';

  @override
  String get seDone => 'Thử thách đã làm';

  @override
  String get seAnyOrder =>
      'Làm theo thứ tự bất kỳ. Trải nghiệm thực tế cần quét mã QR tại điểm để xác nhận.';

  @override
  String get sePartial => 'Đúng một phần';

  @override
  String get seNoAttempts => 'Đã hết lượt';

  @override
  String seAttempts(int count) {
    return 'Đã làm $count lượt';
  }

  @override
  String get seNotStarted => 'Chưa làm';

  @override
  String get seCulturalQuiz => 'Câu đố văn hóa';

  @override
  String get seFieldActivity => 'Trải nghiệm thực tế';

  @override
  String get seLocationPuzzle => 'Giải đố theo vị trí';

  @override
  String get seChallenge => 'Thử thách';

  @override
  String seQuestions(int count) {
    return '$count câu đố';
  }

  @override
  String get seScanQr => 'quét QR tại điểm';

  @override
  String seChallengeHeader(String n, String kind) {
    return 'THỬ THÁCH $n  ·  $kind';
  }

  @override
  String seMaxPoints(int max) {
    return 'Tối đa +$max điểm';
  }

  @override
  String seEarnedPoints(int earned, String max) {
    return '+$earned$max điểm';
  }

  @override
  String scStopHeader(String n) {
    return 'TRẠM $n  ·  NỘI DUNG VĂN HÓA';
  }

  @override
  String get scVideo => 'Video thuyết minh';

  @override
  String get scImages => 'Hình ảnh';

  @override
  String scImageCount(int count) {
    return '$count ảnh';
  }

  @override
  String scArtifactCount(int count) {
    return '$count hiện vật';
  }

  @override
  String get scNoContent =>
      'Đối tác chưa bổ sung nội dung văn hóa cho trạm này.';

  @override
  String scViewImage(int n) {
    return 'Xem hình ảnh $n';
  }

  @override
  String scArtifactNumber(String n) {
    return 'HIỆN VẬT SỐ $n';
  }

  @override
  String get scHasVideo => 'Có video';

  @override
  String get scToExperience => 'Sang phần Trải nghiệm';

  @override
  String get scBackToRoute => 'Quay lại lộ trình';

  @override
  String get qrTitle => 'Quét mã QR';

  @override
  String get qrHint => 'Đưa mã QR tại điểm đến vào khung';

  @override
  String get qrNoPermission =>
      'Ứng dụng chưa được cấp quyền camera. Hãy cấp quyền trong Cài đặt, hoặc nhập mã thủ công bên dưới.';

  @override
  String get qrCameraFailed =>
      'Không mở được camera. Bạn có thể nhập mã thủ công bên dưới.';

  @override
  String get qrSlowCamera => 'Camera mở chậm? Bạn có thể nhập mã in dưới QR.';

  @override
  String get qrScanned => 'ĐÃ QUÉT';

  @override
  String get qrTorchOff => 'Tắt đèn';

  @override
  String get qrTorchOn => 'Đèn flash';

  @override
  String get qrEnterCode => 'Nhập mã';

  @override
  String get qrEnterPrintedCode => 'Nhập mã in dưới QR';

  @override
  String get qrCodeHelper =>
      'Mã điểm đến bắt đầu bằng JGS-, mã hoạt động bắt đầu bằng JGE-';

  @override
  String get qrConfirmCode => 'Xác nhận mã';

  @override
  String hpStopLabel(String n) {
    return 'TRẠM $n';
  }

  @override
  String hpStampSemantics(String label, String name) {
    return 'Con dấu $label, $name';
  }

  @override
  String hpStampCount(int stamped, int total) {
    return '$stamped/$total dấu ấn';
  }

  @override
  String get hpNoStops => 'Hành trình chưa có trạm nào.';

  @override
  String get hpHint =>
      'Check-in mỗi trạm (GPS hoặc quét mã QR tại cổng) để nhận thêm một dấu ấn.';

  @override
  String get hpStamped => 'Đã đóng dấu';

  @override
  String get hpStampedTitle => 'Đã đóng dấu ấn!';

  @override
  String get hpUnlocked => 'Đã mở khóa Nội dung văn hóa và Trải nghiệm';

  @override
  String get hcCold => 'Lạnh · còn xa';

  @override
  String get hcCool => 'Mát · đang đến gần';

  @override
  String get hcWarm => 'Ấm · gần lắm rồi';

  @override
  String get hcHot => 'Nóng! Ngay quanh đây';

  @override
  String get hcArrived => 'Đã tới checkpoint';

  @override
  String get rwAwesome => 'Tuyệt vời';

  @override
  String get rwBadgeUnlockBarrier => 'Mở khóa huy hiệu';

  @override
  String get rwNewBadge => 'Mở khóa huy hiệu mới';

  @override
  String cmActivity(String n, String name) {
    return 'Hoạt động $n: $name';
  }

  @override
  String get cmShowAll => 'Xem tất cả';

  @override
  String get cmLegendZone => ' Vùng điểm đến   ';

  @override
  String get cmLegendActivity => ' Hoạt động';

  @override
  String get jlNoActiveJourney =>
      'Bạn chưa có hành trình đang đi. Hãy đặt tour và bấm \"Bắt đầu trải nghiệm\".';

  @override
  String get jsvcCheckInInvalid =>
      'Máy chủ trả về kết quả check-in không hợp lệ.';

  @override
  String get jsvcCheckpointInvalid =>
      'Máy chủ trả về bản đồ checkpoint không hợp lệ.';

  @override
  String get jsvcCultureInvalid =>
      'Máy chủ trả về nội dung văn hóa không hợp lệ.';

  @override
  String get jsvcTaskInvalid =>
      'Máy chủ trả về nội dung nhiệm vụ không hợp lệ.';

  @override
  String get jsvcClueFailed => 'Không lấy được manh mối.';

  @override
  String get jsvcSubmitInvalid =>
      'Máy chủ trả về kết quả nộp bài không hợp lệ.';

  @override
  String get jsvcJourneyInvalid =>
      'Máy chủ trả về dữ liệu hành trình không hợp lệ.';

  @override
  String get tjTask => 'Nhiệm vụ';

  @override
  String get tjDestination => 'Điểm đến';

  @override
  String get tjJourney => 'Hành trình';

  @override
  String get tjActivity => 'Hoạt động';

  @override
  String get progCheckedIn => 'Đã check-in';

  @override
  String get locGpsOff =>
      'GPS đang tắt. Hãy bật định vị để xác thực vị trí của bạn.';

  @override
  String get locPermissionNeeded =>
      'Bạn cần cho phép truy cập vị trí để check-in tại điểm đến.';

  @override
  String get locPermissionBlocked =>
      'Quyền vị trí đã bị chặn. Hãy cấp lại trong Cài đặt của ứng dụng.';

  @override
  String get locUnknown =>
      'Chưa xác định được vị trí. Hãy ra nơi thoáng hơn rồi thử lại.';

  @override
  String destLoadFailed(String id) {
    return 'Không thể tải chi tiết điểm đến #$id. Vui lòng kiểm tra kết nối và thử lại.';
  }

  @override
  String get ccAudio => 'Thuyết minh';

  @override
  String get ccVideo => 'Video tư liệu';

  @override
  String get ccStory => 'Truyền thuyết';

  @override
  String get ccImage => 'Hình ảnh';

  @override
  String get cc3d => 'Mô hình 3D / VR';

  @override
  String get ccArticle => 'Bài viết di sản';

  @override
  String get ccNone => 'Điểm đến này chưa có câu chuyện văn hóa được duyệt.';

  @override
  String ccUnlockOnCheckIn(int count) {
    return 'Mở khóa $count nội dung khi check-in tại điểm đến';
  }

  @override
  String get ccAudioFailed => 'Không mở được bản thuyết minh.';

  @override
  String get ccListen => 'Nghe thuyết minh';

  @override
  String get ccHasAudio => 'Có thuyết minh audio';

  @override
  String ccSeeAll(int count) {
    return 'Xem tất cả $count nội dung văn hóa';
  }

  @override
  String ccLockedCount(int count) {
    return '$count nội dung văn hóa · mở khóa khi check-in';
  }

  @override
  String get ccMediaFailed => 'Không mở được nội dung đa phương tiện.';

  @override
  String get ccWatchVideo => 'Xem video';

  @override
  String get ccOpen => 'Mở nội dung';

  @override
  String ccGallery(int count) {
    return 'Hình ảnh ($count)';
  }

  @override
  String get ccOpenFailed => 'Không mở được nội dung.';

  @override
  String get expFallbackTitle => 'Trải nghiệm Di sản';

  @override
  String get payLauncherExpired => 'Đã hết thời hạn thanh toán.';

  @override
  String get payAwaitingConfirmation => 'Đang chờ xác nhận thanh toán...';

  @override
  String get payInvalidData =>
      'Máy chủ trả về dữ liệu thanh toán không hợp lệ.';

  @override
  String get paySyncCancelled => 'Bạn đã hủy giao dịch thanh toán.';

  @override
  String get paySyncAlreadyProcessed => 'Giao dịch này đã được xử lý trước đó.';

  @override
  String get tourNotFound => 'Không tìm thấy tour.';

  @override
  String get videoPlayIntro => 'Phát video giới thiệu';

  @override
  String get videoCannotPlay => 'Không phát được video này trong ứng dụng';

  @override
  String get videoOpenExternal => 'Mở bằng ứng dụng khác';

  @override
  String photoViewOf(int index, int total) {
    return 'Xem ảnh $index trên $total';
  }

  @override
  String photoCredit(String credit) {
    return 'Ảnh: $credit';
  }

  @override
  String photoSource(String credit) {
    return 'Nguồn ảnh: $credit';
  }

  @override
  String get navCheckInNow => 'Check-in ngay';

  @override
  String get rfTier7DaysPlus => 'Từ 7 ngày trở lên';

  @override
  String get rfTier3To6Days => 'Từ 3 đến 6 ngày (72 giờ – 6 ngày)';

  @override
  String get rfTierUnder72Hours => 'Dưới 72 giờ (3 ngày)';

  @override
  String rfRefundRate(String rate) {
    return 'Hoàn $rate';
  }

  @override
  String get homeAiGuideTitle => 'Hướng dẫn viên ảo AI';

  @override
  String get homeAiGuideSubtitle =>
      'Hỏi đáp văn hóa, lịch sử & gợi ý nhiệm vụ thông minh';

  @override
  String get aiAskButton => 'Hỏi AI';

  @override
  String get aiHintButton => 'Gợi ý AI';

  @override
  String get aiSuggestHint1 => 'Gợi ý hướng quan sát cho tôi';

  @override
  String get aiSuggestHint2 => 'Tôi nên chú ý chi tiết nào quanh đây?';

  @override
  String get aiSuggestHint3 => 'Cho tôi một manh mối nhỏ nhé';

  @override
  String aiSuggestDestHistory(String name) {
    return 'Kể cho tôi về lịch sử của $name';
  }

  @override
  String get aiSuggestHeritage => 'Giới thiệu nét văn hóa di sản nổi bật';

  @override
  String get aiSuggestArchitecture => 'Kiến trúc nơi đây có điểm gì đặc sắc?';

  @override
  String get aiSuggestVisitTips => 'Cần lưu ý gì khi tham quan điểm này?';

  @override
  String get aiErrInit => 'Không thể khởi tạo phiên trò chuyện AI.';

  @override
  String get aiErrRequestHuman =>
      'Không thể gửi yêu cầu trò chuyện với Admin / Moderator.';

  @override
  String get aiErrReturnAi => 'Không thể chuyển lại về AI Hướng dẫn viên.';

  @override
  String get aiErrSend =>
      'Không thể kết nối tới Hướng dẫn viên AI. Vui lòng thử lại.';

  @override
  String get aiEndHumanTitle => 'Kết thúc hỗ trợ trực tiếp?';

  @override
  String get aiCancelWaitTitle => 'Hủy yêu cầu hỗ trợ?';

  @override
  String get aiEndHumanBody =>
      'Bạn có chắc muốn kết thúc cuộc trò chuyện với nhân viên hỗ trợ và quay lại chat với AI không?';

  @override
  String get aiCancelWaitBody =>
      'Bạn đang trong hàng chờ gặp nhân viên. Quay lại AI sẽ hủy yêu cầu hỗ trợ này. Bạn có chắc không?';

  @override
  String get aiKeepChatting => 'Tiếp tục chat';

  @override
  String get aiKeepWaiting => 'Tiếp tục chờ';

  @override
  String get aiEndAndReturnAi => 'Kết thúc & quay lại AI';

  @override
  String get aiCancelAndReturnAi => 'Hủy & quay lại AI';

  @override
  String get aiSenderName => 'AI Hướng dẫn viên';

  @override
  String get aiHeaderHintTitle => 'Trợ lý gợi ý AI';

  @override
  String get aiHeaderGuideTitle => 'Hướng dẫn viên AI';

  @override
  String get aiHistoryTooltip => 'Lịch sử phiên trò chuyện';

  @override
  String get aiNewChatTooltip => 'Cuộc trò chuyện mới';

  @override
  String aiChattingWithStaff(String role, String name) {
    return 'Đang chat với $role: $name';
  }

  @override
  String aiChattingWithRole(String role) {
    return 'Đang chat với $role';
  }

  @override
  String get aiHumanSubtitle => 'Nhân sự thật đang hỗ trợ trực tiếp';

  @override
  String get aiWaitingTitle => 'Đang chờ Admin / Moderator tiếp nhận';

  @override
  String get aiWaitingSubtitle =>
      'Bạn vẫn có thể nhắn tin trong lúc chờ hỗ trợ';

  @override
  String get aiDefaultTaskName => 'Nhiệm vụ trải nghiệm';

  @override
  String get aiDefaultDestName => 'Hỏi đáp di sản & hỗ trợ';

  @override
  String get aiHintBannerSubtitle =>
      'Chế độ gợi ý thông minh · Không tiết lộ đáp án';

  @override
  String get aiGuideBannerSubtitle =>
      'Thuyết minh viên ảo dựa trên dữ liệu đã kiểm duyệt';

  @override
  String get aiReturnToAiBtn => 'Quay lại AI';

  @override
  String get aiChatHumanBtn => 'Chat Mod/Admin';

  @override
  String get aiEmptyHintTitle => 'Cần manh mối cho thử thách?';

  @override
  String get aiEmptyGuideTitle => 'Xin chào! Tôi có thể giúp gì cho bạn?';

  @override
  String get aiEmptyHintBody =>
      'Hãy hỏi tôi để nhận gợi ý quan sát hiện trường. Tôi sẽ dẫn dắt bạn tự tìm ra đáp án!';

  @override
  String get aiEmptyGuideBody =>
      'Đặt câu hỏi về lịch sử, câu chuyện văn hóa, kiến trúc hoặc gợi ý khám phá tại điểm dừng.';

  @override
  String get aiHumanBadge => 'NGƯỜI THẬT';

  @override
  String get aiSendingMessage => 'Đang gửi tin nhắn...';

  @override
  String get aiThinking => 'AI đang suy nghĩ...';

  @override
  String get aiInputHintHuman => 'Nhắn tin trực tiếp tới Admin / Moderator...';

  @override
  String get aiInputHintTask => 'Hỏi gợi ý cho nhiệm vụ...';

  @override
  String get aiInputHintGuide => 'Hỏi về lịch sử, kiến trúc điểm đến...';

  @override
  String get aiHistoryTitle => 'Lịch sử trò chuyện AI';

  @override
  String get aiHistoryEmpty => 'Chưa có phiên trò chuyện nào.';

  @override
  String aiDestinationFallback(int id) {
    return 'Điểm đến #$id';
  }

  @override
  String get aiGeneralQa => 'Hỏi đáp chung';

  @override
  String get aiStatusWaiting => 'Đang chờ Mod/Admin';

  @override
  String get aiStatusLive => 'Chat trực tiếp';

  @override
  String aiSessionSubtitle(String status, int count) {
    return '$status · $count tin nhắn';
  }

  @override
  String aiViewTour(int id) {
    return 'Xem tour #$id';
  }

  @override
  String tripsAtStop(int current, int total) {
    return 'Đang ở trạm $current/$total';
  }

  @override
  String tripsUnfinishedRemaining(String date, int count) {
    return 'Bắt đầu $date · còn $count trạm nữa là trọn hành trình.';
  }

  @override
  String seFailedLeft(int count) {
    return 'Chưa đạt · còn $count lượt';
  }

  @override
  String get seDirections => 'Chỉ đường';

  @override
  String seFarFromActivity(String distance) {
    return 'Bạn đang cách hoạt động gần nhất $distance';
  }

  @override
  String get tkReviewTitle => 'Xem lại đáp án';

  @override
  String tkReviewCorrectAnswer(String answer) {
    return 'Đáp án đúng: $answer';
  }

  @override
  String tkReviewYourAnswer(String answer) {
    return 'Bạn trả lời: $answer';
  }

  @override
  String get tkReviewNoAnswer => '(bỏ trống)';

  @override
  String get tkReviewWhy => 'Vì sao?';

  @override
  String jsGoalRemaining(int count) {
    return 'Còn $count trạm nữa để nhận thưởng hoàn thành và bảng tổng kết';
  }

  @override
  String get jsGoalLost =>
      'Đã bỏ qua trạm nên chuyến này không còn thưởng hoàn thành — vẫn đi tiếp để tích điểm nhé.';

  @override
  String get tkOrderingHint =>
      'Giữ và kéo để sắp xếp từ trên xuống theo thứ tự đúng';

  @override
  String get tkNumberHint => 'Kéo thanh trượt hoặc bấm − / + để chọn';

  @override
  String get tkNumberNotChosen => 'Chưa chọn';

  @override
  String get tkSeeResult => 'Xem kết quả';

  @override
  String get tkAnswer => 'Trả lời';

  @override
  String get tkUnsupportedQuestion =>
      'Câu hỏi dạng mới — hãy cập nhật ứng dụng để trả lời.';

  @override
  String tkNumberOff(int diff) {
    return 'lệch $diff';
  }

  @override
  String tkImageOption(String letter) {
    return 'Ảnh $letter';
  }

  @override
  String get tkRevealCorrect => 'Chính xác!';

  @override
  String get tkRevealWrong => 'Chưa đúng';

  @override
  String get tkCorrectOrder => 'Thứ tự đúng';

  @override
  String get scStory => 'Xem dạng story';

  @override
  String get scStoryEndTitle => 'Sẵn sàng thử thách?';

  @override
  String get scStoryEndBody =>
      'Bạn đã xem xong câu chuyện của trạm này. Giờ là lúc thử tài!';

  @override
  String get scReadAll => 'Đọc toàn bộ';

  @override
  String get scStoryArtifact => 'Hiện vật';

  @override
  String get scStoryClose => 'Đóng story';

  @override
  String get scThenNowTitle => 'Xưa và nay';

  @override
  String get scThenNowNow => 'Nay';

  @override
  String get scThenNowThen => 'Xưa';

  @override
  String get scThenNowHint => 'Kéo vạch để so sánh';

  @override
  String scThenNowCredit(String credit) {
    return 'Ảnh tư liệu: $credit';
  }

  @override
  String get tkMatchingHint =>
      'Chọn một mục ở cột A rồi chạm mục tương ứng ở cột B để nối. Đúng toàn bộ mới có điểm.';

  @override
  String get tkMatchingColA => 'Cột A';

  @override
  String get tkMatchingColB => 'Cột B';

  @override
  String get tkMatchingTapZoom => 'Chạm ảnh để phóng to';

  @override
  String get tkMatchingCorrectPairs => 'Cặp nối đúng';

  @override
  String get tkMatchingClear => 'Bỏ nối';

  @override
  String get rvTabLabel => 'Đánh giá';

  @override
  String get rvSectionTitle => 'Đánh giá từ khách đã trải nghiệm';

  @override
  String get rvVerifiedBadge => 'Đã trải nghiệm tour';

  @override
  String rvVerifiedDate(String date) {
    return 'Đi tour ngày $date';
  }

  @override
  String get rvEditedLabel => 'Đã chỉnh sửa';

  @override
  String get rvEmptyTitle => 'Chưa có đánh giá nào';

  @override
  String get rvEmptyDesc =>
      'Những đánh giá xác thực đầu tiên từ du khách hoàn thành chuyến đi sẽ hiển thị tại đây.';

  @override
  String rvTotalCount(int count) {
    return '$count đánh giá xác thực';
  }

  @override
  String rvReplyRate(int rate) {
    return '$rate% phản hồi từ nhà tour';
  }

  @override
  String get rvFilterAll => 'Tất cả';

  @override
  String rvFilterStars(int star) {
    return '$star sao';
  }

  @override
  String get rvFilterPhotos => 'Có ảnh';

  @override
  String get rvSortNewest => 'Mới nhất';

  @override
  String get rvSortHighest => 'Điểm cao nhất';

  @override
  String get rvSortLowest => 'Điểm thấp nhất';

  @override
  String get rvCriteriaGuide => 'Hướng dẫn viên';

  @override
  String get rvCriteriaCulture => 'Nội dung văn hóa';

  @override
  String get rvCriteriaSchedule => 'Đúng lịch trình';

  @override
  String get rvCriteriaValue => 'Đáng giá tiền';

  @override
  String get rvProviderReplyTitle => 'Phản hồi từ nhà tour';

  @override
  String get rvWriteReview => 'Viết đánh giá chuyến đi';

  @override
  String get rvEditReview => 'Chỉnh sửa';

  @override
  String get rvDeleteReview => 'Xóa';

  @override
  String get rvDeleteConfirmTitle => 'Xóa đánh giá của bạn?';

  @override
  String get rvDeleteConfirmDesc =>
      'Đánh giá sẽ bị xóa khỏi trang chi tiết tour và không thể khôi phục.';

  @override
  String get rvTripCardTitle => 'Đánh giá trải nghiệm của bạn';

  @override
  String get rvTripEligibleDesc =>
      'Chuyến đi đã hoàn thành! Chia sẻ cảm nhận thực tế để giúp cộng đồng du khách khác.';

  @override
  String get rvModalCreateTitle => 'Đánh giá tour đã trải nghiệm';

  @override
  String get rvModalEditTitle => 'Chỉnh sửa đánh giá (trong 7 ngày)';

  @override
  String get rvOverallLabel => 'Đánh giá tổng thể *';

  @override
  String get rvCriteriaOptional => 'Đánh giá chi tiết theo tiêu chí (tùy chọn)';

  @override
  String get rvTitleLabel => 'Tiêu đề ngắn (tùy chọn)';

  @override
  String get rvTitlePlaceholder => 'Ví dụ: Hành trình di sản rất giàu cảm xúc';

  @override
  String get rvCommentLabel => 'Cảm nhận chi tiết *';

  @override
  String get rvCommentPlaceholder =>
      'Chia sẻ trải nghiệm về lịch trình, hướng dẫn viên (tối thiểu 10 ký tự)...';

  @override
  String get rvPhotosLabel => 'Ảnh thực tế chuyến đi (tối đa 5 ảnh)';

  @override
  String get rvAddPhoto => 'Thêm ảnh';

  @override
  String get rvUploading => 'Đang tải ảnh...';

  @override
  String get rvSubmit => 'Gửi đánh giá';

  @override
  String get rvSaveChanges => 'Lưu thay đổi';

  @override
  String get rvCancel => 'Đóng';

  @override
  String get rvLoadMore => 'Xem thêm đánh giá';

  @override
  String get rvErrMinComment =>
      'Vui lòng nhập nội dung đánh giá tối thiểu 10 ký tự';

  @override
  String get rvErrRating => 'Vui lòng chọn số sao tổng thể từ 1 đến 5';

  @override
  String get rvErrMaxPhotos => 'Tối đa 5 ảnh cho mỗi đánh giá';

  @override
  String rvHiddenNotice(String reason) {
    return 'Đánh giá đang bị ẩn bởi kiểm duyệt viên: $reason';
  }

  @override
  String get rvSavedToast => 'Đã lưu đánh giá xác thực của bạn!';

  @override
  String get rvDeletedToast => 'Đã xóa đánh giá.';
}
