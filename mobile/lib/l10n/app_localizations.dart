import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:intl/intl.dart' as intl;

import 'app_localizations_en.dart';
import 'app_localizations_ja.dart';
import 'app_localizations_vi.dart';

// ignore_for_file: type=lint

/// Callers can lookup localized strings with an instance of AppLocalizations
/// returned by `AppLocalizations.of(context)`.
///
/// Applications need to include `AppLocalizations.delegate()` in their app's
/// `localizationDelegates` list, and the locales they support in the app's
/// `supportedLocales` list. For example:
///
/// ```dart
/// import 'l10n/app_localizations.dart';
///
/// return MaterialApp(
///   localizationsDelegates: AppLocalizations.localizationsDelegates,
///   supportedLocales: AppLocalizations.supportedLocales,
///   home: MyApplicationHome(),
/// );
/// ```
///
/// ## Update pubspec.yaml
///
/// Please make sure to update your pubspec.yaml to include the following
/// packages:
///
/// ```yaml
/// dependencies:
///   # Internationalization support.
///   flutter_localizations:
///     sdk: flutter
///   intl: any # Use the pinned version from flutter_localizations
///
///   # Rest of dependencies
/// ```
///
/// ## iOS Applications
///
/// iOS applications define key application metadata, including supported
/// locales, in an Info.plist file that is built into the application bundle.
/// To configure the locales supported by your app, you’ll need to edit this
/// file.
///
/// First, open your project’s ios/Runner.xcworkspace Xcode workspace file.
/// Then, in the Project Navigator, open the Info.plist file under the Runner
/// project’s Runner folder.
///
/// Next, select the Information Property List item, select Add Item from the
/// Editor menu, then select Localizations from the pop-up menu.
///
/// Select and expand the newly-created Localizations item then, for each
/// locale your application supports, add a new item and select the locale
/// you wish to add from the pop-up menu in the Value field. This list should
/// be consistent with the languages listed in the AppLocalizations.supportedLocales
/// property.
abstract class AppLocalizations {
  AppLocalizations(String locale)
    : localeName = intl.Intl.canonicalizedLocale(locale.toString());

  final String localeName;

  static AppLocalizations of(BuildContext context) {
    return Localizations.of<AppLocalizations>(context, AppLocalizations)!;
  }

  static const LocalizationsDelegate<AppLocalizations> delegate =
      _AppLocalizationsDelegate();

  /// A list of this localizations delegate along with the default localizations
  /// delegates.
  ///
  /// Returns a list of localizations delegates containing this delegate along with
  /// GlobalMaterialLocalizations.delegate, GlobalCupertinoLocalizations.delegate,
  /// and GlobalWidgetsLocalizations.delegate.
  ///
  /// Additional delegates can be added by appending to this list in
  /// MaterialApp. This list does not have to be used at all if a custom list
  /// of delegates is preferred or required.
  static const List<LocalizationsDelegate<dynamic>> localizationsDelegates =
      <LocalizationsDelegate<dynamic>>[
        delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
      ];

  /// A list of this localizations delegate's supported locales.
  static const List<Locale> supportedLocales = <Locale>[
    Locale('en'),
    Locale('ja'),
    Locale('vi'),
  ];

  /// No description provided for @appTitle.
  ///
  /// In vi, this message translates to:
  /// **'Journey Go - Cổng Du Lịch Văn Hóa Việt Nam'**
  String get appTitle;

  /// No description provided for @reloginSuccess.
  ///
  /// In vi, this message translates to:
  /// **'Đã đăng nhập lại. Bạn có thể tiếp tục thao tác.'**
  String get reloginSuccess;

  /// No description provided for @commonClose.
  ///
  /// In vi, this message translates to:
  /// **'Đóng'**
  String get commonClose;

  /// No description provided for @commonCancel.
  ///
  /// In vi, this message translates to:
  /// **'Hủy bỏ'**
  String get commonCancel;

  /// No description provided for @languageTitle.
  ///
  /// In vi, this message translates to:
  /// **'Ngôn ngữ'**
  String get languageTitle;

  /// No description provided for @languageSubtitle.
  ///
  /// In vi, this message translates to:
  /// **'Ứng dụng hiển thị bằng tiếng Việt'**
  String get languageSubtitle;

  /// No description provided for @languageSheetTitle.
  ///
  /// In vi, this message translates to:
  /// **'Chọn ngôn ngữ'**
  String get languageSheetTitle;

  /// No description provided for @languageSheetNote.
  ///
  /// In vi, this message translates to:
  /// **'Một số màn hình và nội dung tour, diễn đàn có thể vẫn hiển thị bằng tiếng Việt.'**
  String get languageSheetNote;

  /// No description provided for @profileHeader.
  ///
  /// In vi, this message translates to:
  /// **'Hồ sơ du khách'**
  String get profileHeader;

  /// No description provided for @profileNotifications.
  ///
  /// In vi, this message translates to:
  /// **'Thông báo'**
  String get profileNotifications;

  /// No description provided for @profileEdit.
  ///
  /// In vi, this message translates to:
  /// **'Sửa hồ sơ'**
  String get profileEdit;

  /// No description provided for @profileMemberSince.
  ///
  /// In vi, this message translates to:
  /// **'Từ {date}'**
  String profileMemberSince(String date);

  /// No description provided for @profileTopRank.
  ///
  /// In vi, this message translates to:
  /// **'Bạn đã đạt hạng cao nhất'**
  String get profileTopRank;

  /// No description provided for @profilePointsToNextRank.
  ///
  /// In vi, this message translates to:
  /// **'Còn {points} điểm lên {rank}'**
  String profilePointsToNextRank(String points, String rank);

  /// No description provided for @profileStatPoints.
  ///
  /// In vi, this message translates to:
  /// **'Điểm khả dụng'**
  String get profileStatPoints;

  /// No description provided for @profileStatBadges.
  ///
  /// In vi, this message translates to:
  /// **'Huy hiệu'**
  String get profileStatBadges;

  /// No description provided for @profileStatPlaces.
  ///
  /// In vi, this message translates to:
  /// **'Điểm đã đến'**
  String get profileStatPlaces;

  /// No description provided for @rankBronze.
  ///
  /// In vi, this message translates to:
  /// **'Hạng Đồng'**
  String get rankBronze;

  /// No description provided for @rankSilver.
  ///
  /// In vi, this message translates to:
  /// **'Hạng Bạc'**
  String get rankSilver;

  /// No description provided for @rankGold.
  ///
  /// In vi, this message translates to:
  /// **'Hạng Vàng'**
  String get rankGold;

  /// No description provided for @rankPlatinum.
  ///
  /// In vi, this message translates to:
  /// **'Bạch Kim'**
  String get rankPlatinum;

  /// No description provided for @heritageTitle.
  ///
  /// In vi, this message translates to:
  /// **'Hành trình di sản'**
  String get heritageTitle;

  /// No description provided for @heritageSubtitle.
  ///
  /// In vi, this message translates to:
  /// **'Dấu ấn văn hoá bạn đã ghi lại'**
  String get heritageSubtitle;

  /// No description provided for @achievementsTitle.
  ///
  /// In vi, this message translates to:
  /// **'Thành tựu & Nhận thưởng'**
  String get achievementsTitle;

  /// No description provided for @achievementsAchieved.
  ///
  /// In vi, this message translates to:
  /// **'{count} đã đạt'**
  String achievementsAchieved(int count);

  /// No description provided for @achievementsUnclaimed.
  ///
  /// In vi, this message translates to:
  /// **'{count} chờ nhận'**
  String achievementsUnclaimed(int count);

  /// No description provided for @journeyLogTitle.
  ///
  /// In vi, this message translates to:
  /// **'Nhật ký hành trình'**
  String get journeyLogTitle;

  /// No description provided for @journeyPlacesVisited.
  ///
  /// In vi, this message translates to:
  /// **'{count} điểm đã đến'**
  String journeyPlacesVisited(int count);

  /// No description provided for @journeyLogSubtitle.
  ///
  /// In vi, this message translates to:
  /// **'{count} điểm di sản đã check-in'**
  String journeyLogSubtitle(int count);

  /// No description provided for @journeyEmpty.
  ///
  /// In vi, this message translates to:
  /// **'Chưa có điểm nào. Check-in tại điểm đến trong hành trình để ghi lại dấu ấn đầu tiên.'**
  String get journeyEmpty;

  /// No description provided for @pointsHistoryTitle.
  ///
  /// In vi, this message translates to:
  /// **'Lịch sử tích điểm'**
  String get pointsHistoryTitle;

  /// No description provided for @pointsHistorySubtitle.
  ///
  /// In vi, this message translates to:
  /// **'Các giao dịch điểm gần đây'**
  String get pointsHistorySubtitle;

  /// No description provided for @pointsNoTransactions.
  ///
  /// In vi, this message translates to:
  /// **'Chưa có giao dịch'**
  String get pointsNoTransactions;

  /// No description provided for @pointsLatestGain.
  ///
  /// In vi, this message translates to:
  /// **'Gần nhất +{points}'**
  String pointsLatestGain(String points);

  /// No description provided for @pointsEarned.
  ///
  /// In vi, this message translates to:
  /// **'Đã tích lũy'**
  String get pointsEarned;

  /// No description provided for @pointsSpent.
  ///
  /// In vi, this message translates to:
  /// **'Đã tiêu'**
  String get pointsSpent;

  /// No description provided for @pointsAvailable.
  ///
  /// In vi, this message translates to:
  /// **'Khả dụng'**
  String get pointsAvailable;

  /// No description provided for @pointsEmpty.
  ///
  /// In vi, this message translates to:
  /// **'Chưa có giao dịch điểm. Check-in điểm đến và hoàn thành nhiệm vụ để bắt đầu tích điểm.'**
  String get pointsEmpty;

  /// No description provided for @pointsOpenWallet.
  ///
  /// In vi, this message translates to:
  /// **'Xem ví & đổi voucher'**
  String get pointsOpenWallet;

  /// No description provided for @badgesTitle.
  ///
  /// In vi, this message translates to:
  /// **'Huy hiệu di sản'**
  String get badgesTitle;

  /// No description provided for @badgesUnlocked.
  ///
  /// In vi, this message translates to:
  /// **'{count} đã mở khoá'**
  String badgesUnlocked(int count);

  /// No description provided for @voucherTitle.
  ///
  /// In vi, this message translates to:
  /// **'Voucher'**
  String get voucherTitle;

  /// No description provided for @voucherAvailablePoints.
  ///
  /// In vi, this message translates to:
  /// **'{points} điểm khả dụng'**
  String voucherAvailablePoints(String points);

  /// No description provided for @servicesTitle.
  ///
  /// In vi, this message translates to:
  /// **'Vé & hỗ trợ'**
  String get servicesTitle;

  /// No description provided for @myBookingsTitle.
  ///
  /// In vi, this message translates to:
  /// **'Đơn đặt tour của tôi'**
  String get myBookingsTitle;

  /// No description provided for @myBookingsSubtitle.
  ///
  /// In vi, this message translates to:
  /// **'Theo dõi đơn, thanh toán & mã QR trải nghiệm'**
  String get myBookingsSubtitle;

  /// No description provided for @providerSupportTitle.
  ///
  /// In vi, this message translates to:
  /// **'Hỗ trợ từ nhà tour'**
  String get providerSupportTitle;

  /// No description provided for @providerSupportSubtitle.
  ///
  /// In vi, this message translates to:
  /// **'Lịch sử chat với các nhà tour (nhắn trước khi đặt vé)'**
  String get providerSupportSubtitle;

  /// No description provided for @supportTitle.
  ///
  /// In vi, this message translates to:
  /// **'Hỗ trợ & khiếu nại'**
  String get supportTitle;

  /// No description provided for @supportSubtitle.
  ///
  /// In vi, this message translates to:
  /// **'Hoàn tiền và xử lý sự cố vé'**
  String get supportSubtitle;

  /// No description provided for @refundsInProgress.
  ///
  /// In vi, this message translates to:
  /// **'{count} đang xử lý'**
  String refundsInProgress(int count);

  /// No description provided for @settingsTitle.
  ///
  /// In vi, this message translates to:
  /// **'Cài đặt'**
  String get settingsTitle;

  /// No description provided for @personalInfoTitle.
  ///
  /// In vi, this message translates to:
  /// **'Thông tin cá nhân'**
  String get personalInfoTitle;

  /// No description provided for @personalInfoSubtitle.
  ///
  /// In vi, this message translates to:
  /// **'Họ tên, email, số điện thoại'**
  String get personalInfoSubtitle;

  /// No description provided for @changePasswordTitle.
  ///
  /// In vi, this message translates to:
  /// **'Đổi mật khẩu'**
  String get changePasswordTitle;

  /// No description provided for @changePasswordSubtitle.
  ///
  /// In vi, this message translates to:
  /// **'Bảo vệ tài khoản của bạn'**
  String get changePasswordSubtitle;

  /// No description provided for @hotlineTitle.
  ///
  /// In vi, this message translates to:
  /// **'Tổng đài {number}'**
  String hotlineTitle(String number);

  /// No description provided for @hotlineSubtitle.
  ///
  /// In vi, this message translates to:
  /// **'Bấm để gọi hỗ trợ du khách'**
  String get hotlineSubtitle;

  /// No description provided for @hotlineCannotOpen.
  ///
  /// In vi, this message translates to:
  /// **'Không mở được trình gọi điện trên thiết bị này.'**
  String get hotlineCannotOpen;

  /// No description provided for @logoutTitle.
  ///
  /// In vi, this message translates to:
  /// **'Đăng xuất'**
  String get logoutTitle;

  /// No description provided for @logoutSubtitle.
  ///
  /// In vi, this message translates to:
  /// **'Thoát tài khoản khỏi thiết bị'**
  String get logoutSubtitle;

  /// No description provided for @logoutConfirmTitle.
  ///
  /// In vi, this message translates to:
  /// **'Xác nhận đăng xuất'**
  String get logoutConfirmTitle;

  /// No description provided for @logoutConfirmMessage.
  ///
  /// In vi, this message translates to:
  /// **'Phiên làm việc hiện tại sẽ được hủy an toàn trên máy chủ và toàn bộ token trên thiết bị sẽ được xóa.'**
  String get logoutConfirmMessage;

  /// No description provided for @logoutConfirmButton.
  ///
  /// In vi, this message translates to:
  /// **'Đăng xuất ngay'**
  String get logoutConfirmButton;

  /// No description provided for @commonNotifications.
  ///
  /// In vi, this message translates to:
  /// **'Thông báo'**
  String get commonNotifications;

  /// No description provided for @commonSeeAll.
  ///
  /// In vi, this message translates to:
  /// **'Xem tất cả'**
  String get commonSeeAll;

  /// No description provided for @commonRetry.
  ///
  /// In vi, this message translates to:
  /// **'Thử lại'**
  String get commonRetry;

  /// No description provided for @navHome.
  ///
  /// In vi, this message translates to:
  /// **'Trang chủ'**
  String get navHome;

  /// No description provided for @navTrips.
  ///
  /// In vi, this message translates to:
  /// **'Chuyến đi'**
  String get navTrips;

  /// No description provided for @navCheckIn.
  ///
  /// In vi, this message translates to:
  /// **'Check-in'**
  String get navCheckIn;

  /// No description provided for @navForum.
  ///
  /// In vi, this message translates to:
  /// **'Diễn đàn'**
  String get navForum;

  /// No description provided for @navAccount.
  ///
  /// In vi, this message translates to:
  /// **'Tài khoản'**
  String get navAccount;

  /// No description provided for @navCheckInSemantics.
  ///
  /// In vi, this message translates to:
  /// **'Check-in tại điểm đến'**
  String get navCheckInSemantics;

  /// No description provided for @homeGreeting.
  ///
  /// In vi, this message translates to:
  /// **'Xin chào, {name} 👋'**
  String homeGreeting(String name);

  /// No description provided for @homeGreetingNoName.
  ///
  /// In vi, this message translates to:
  /// **'Xin chào 👋'**
  String get homeGreetingNoName;

  /// No description provided for @homeHeadline.
  ///
  /// In vi, this message translates to:
  /// **'Đi để hiểu,\nkhông chỉ để ngắm'**
  String get homeHeadline;

  /// No description provided for @homeSearchHint.
  ///
  /// In vi, this message translates to:
  /// **'Bạn muốn đi đâu?'**
  String get homeSearchHint;

  /// No description provided for @homeSearchSemantics.
  ///
  /// In vi, this message translates to:
  /// **'Tìm tour, điểm đến, chủ đề'**
  String get homeSearchSemantics;

  /// No description provided for @homePoints.
  ///
  /// In vi, this message translates to:
  /// **'{points} điểm'**
  String homePoints(String points);

  /// No description provided for @heroPlaceMuCangChai.
  ///
  /// In vi, this message translates to:
  /// **'Ruộng bậc thang Mù Cang Chải'**
  String get heroPlaceMuCangChai;

  /// No description provided for @heroPlaceHoiAn.
  ///
  /// In vi, this message translates to:
  /// **'Chùa Cầu, phố cổ Hội An'**
  String get heroPlaceHoiAn;

  /// No description provided for @heroPlaceMuiNe.
  ///
  /// In vi, this message translates to:
  /// **'Làng chài Mũi Né'**
  String get heroPlaceMuiNe;

  /// No description provided for @homeCatDayTrip.
  ///
  /// In vi, this message translates to:
  /// **'Trong ngày'**
  String get homeCatDayTrip;

  /// No description provided for @homeCatMultiDay.
  ///
  /// In vi, this message translates to:
  /// **'Nhiều ngày'**
  String get homeCatMultiDay;

  /// No description provided for @homeCatByDate.
  ///
  /// In vi, this message translates to:
  /// **'Theo ngày'**
  String get homeCatByDate;

  /// No description provided for @homeCatDeals.
  ///
  /// In vi, this message translates to:
  /// **'Ưu đãi'**
  String get homeCatDeals;

  /// No description provided for @homeFeatured.
  ///
  /// In vi, this message translates to:
  /// **'Tour nổi bật'**
  String get homeFeatured;

  /// No description provided for @homeAllTours.
  ///
  /// In vi, this message translates to:
  /// **'Tất cả tour'**
  String get homeAllTours;

  /// No description provided for @homeUpcoming.
  ///
  /// In vi, this message translates to:
  /// **'Khởi hành sắp tới'**
  String get homeUpcoming;

  /// No description provided for @homeThemes.
  ///
  /// In vi, this message translates to:
  /// **'Khám phá theo chủ đề'**
  String get homeThemes;

  /// No description provided for @homeAllThemes.
  ///
  /// In vi, this message translates to:
  /// **'Tất cả chủ đề'**
  String get homeAllThemes;

  /// No description provided for @homeMoreThemes.
  ///
  /// In vi, this message translates to:
  /// **'chủ đề'**
  String get homeMoreThemes;

  /// No description provided for @homeRegions.
  ///
  /// In vi, this message translates to:
  /// **'Điểm đến theo vùng miền'**
  String get homeRegions;

  /// No description provided for @homeAllRegions.
  ///
  /// In vi, this message translates to:
  /// **'Tất cả vùng miền'**
  String get homeAllRegions;

  /// No description provided for @homeMoreRegions.
  ///
  /// In vi, this message translates to:
  /// **'vùng'**
  String get homeMoreRegions;

  /// No description provided for @homeRegionTourCount.
  ///
  /// In vi, this message translates to:
  /// **'{count} tour'**
  String homeRegionTourCount(int count);

  /// No description provided for @homeDayTours.
  ///
  /// In vi, this message translates to:
  /// **'Tour trong ngày'**
  String get homeDayTours;

  /// No description provided for @homeMultiDayTours.
  ///
  /// In vi, this message translates to:
  /// **'Tour nhiều ngày'**
  String get homeMultiDayTours;

  /// No description provided for @homeSeeAllCount.
  ///
  /// In vi, this message translates to:
  /// **'Xem tất cả {count} tour'**
  String homeSeeAllCount(int count);

  /// No description provided for @homeSeeAllTours.
  ///
  /// In vi, this message translates to:
  /// **'Xem tất cả tour'**
  String get homeSeeAllTours;

  /// No description provided for @homeNoToursTitle.
  ///
  /// In vi, this message translates to:
  /// **'Chưa có tour nào được mở bán'**
  String get homeNoToursTitle;

  /// No description provided for @homeNoToursMessage.
  ///
  /// In vi, this message translates to:
  /// **'Các tour mới sẽ xuất hiện ở đây ngay khi được duyệt.'**
  String get homeNoToursMessage;

  /// No description provided for @homeAllOwnedTitle.
  ///
  /// In vi, this message translates to:
  /// **'Bạn đã mua tất cả tour hiện có'**
  String get homeAllOwnedTitle;

  /// No description provided for @homeAllOwnedMessage.
  ///
  /// In vi, this message translates to:
  /// **'Xem mục \"Chuyến đi\" để trải nghiệm các tour đã đặt.'**
  String get homeAllOwnedMessage;

  /// No description provided for @homeAllOwnedAction.
  ///
  /// In vi, this message translates to:
  /// **'Xem chuyến đi của tôi'**
  String get homeAllOwnedAction;

  /// No description provided for @homeToursErrorTitle.
  ///
  /// In vi, this message translates to:
  /// **'Không tải được danh sách tour'**
  String get homeToursErrorTitle;

  /// No description provided for @homeJourneyOngoing.
  ///
  /// In vi, this message translates to:
  /// **'Đang đi · Trạm {position}/{total}'**
  String homeJourneyOngoing(int position, int total);

  /// No description provided for @homeJourneyAtStop.
  ///
  /// In vi, this message translates to:
  /// **'Đang ở trạm'**
  String get homeJourneyAtStop;

  /// No description provided for @homeJourneyNextStop.
  ///
  /// In vi, this message translates to:
  /// **'Trạm kế tiếp'**
  String get homeJourneyNextStop;

  /// No description provided for @homeJourneyAllDone.
  ///
  /// In vi, this message translates to:
  /// **'Đã đi hết các trạm'**
  String get homeJourneyAllDone;

  /// No description provided for @homeJourneyCheckedIn.
  ///
  /// In vi, this message translates to:
  /// **'{name} · đã check-in'**
  String homeJourneyCheckedIn(String name);

  /// No description provided for @homeJourneyDistance.
  ///
  /// In vi, this message translates to:
  /// **'{name} · cách {distance}'**
  String homeJourneyDistance(String name, String distance);

  /// No description provided for @homeJourneyContinue.
  ///
  /// In vi, this message translates to:
  /// **'Tiếp tục'**
  String get homeJourneyContinue;

  /// No description provided for @homeJourneyMissions.
  ///
  /// In vi, this message translates to:
  /// **'{count} nhiệm vụ chờ: '**
  String homeJourneyMissions(int count);

  /// No description provided for @tourPriceFree.
  ///
  /// In vi, this message translates to:
  /// **'Miễn phí'**
  String get tourPriceFree;

  /// No description provided for @tourPriceFromPrefix.
  ///
  /// In vi, this message translates to:
  /// **'Từ '**
  String get tourPriceFromPrefix;

  /// No description provided for @tourPriceFromSuffix.
  ///
  /// In vi, this message translates to:
  /// **''**
  String get tourPriceFromSuffix;

  /// No description provided for @tourStopCount.
  ///
  /// In vi, this message translates to:
  /// **'{count} trạm'**
  String tourStopCount(int count);

  /// No description provided for @durationMinutes.
  ///
  /// In vi, this message translates to:
  /// **'{minutes} phút'**
  String durationMinutes(int minutes);

  /// No description provided for @durationHours.
  ///
  /// In vi, this message translates to:
  /// **'{hours} giờ'**
  String durationHours(int hours);

  /// No description provided for @durationHoursMinutes.
  ///
  /// In vi, this message translates to:
  /// **'{hours} giờ {minutes} phút'**
  String durationHoursMinutes(int hours, int minutes);

  /// No description provided for @durationDaysNights.
  ///
  /// In vi, this message translates to:
  /// **'{days}N{nights}Đ'**
  String durationDaysNights(int days, int nights);

  /// No description provided for @durationDays.
  ///
  /// In vi, this message translates to:
  /// **'{days} ngày'**
  String durationDays(int days);

  /// No description provided for @durationDayTrip.
  ///
  /// In vi, this message translates to:
  /// **'Trong ngày'**
  String get durationDayTrip;

  /// No description provided for @commonShowMore.
  ///
  /// In vi, this message translates to:
  /// **'Xem thêm'**
  String get commonShowMore;

  /// No description provided for @commonShowLess.
  ///
  /// In vi, this message translates to:
  /// **'Thu gọn'**
  String get commonShowLess;

  /// No description provided for @priceVnd.
  ///
  /// In vi, this message translates to:
  /// **'{amount} đ'**
  String priceVnd(String amount);

  /// No description provided for @tourPriceFrom.
  ///
  /// In vi, this message translates to:
  /// **'Từ {price}'**
  String tourPriceFrom(String price);

  /// No description provided for @tourDepartsOn.
  ///
  /// In vi, this message translates to:
  /// **'Khởi hành {date}'**
  String tourDepartsOn(String date);

  /// No description provided for @rewardPlusPoints.
  ///
  /// In vi, this message translates to:
  /// **'+{points} điểm'**
  String rewardPlusPoints(String points);

  /// No description provided for @rewardMaxPoints.
  ///
  /// In vi, this message translates to:
  /// **'tối đa {points} điểm'**
  String rewardMaxPoints(String points);

  /// No description provided for @tourTaskCount.
  ///
  /// In vi, this message translates to:
  /// **'{count} nhiệm vụ'**
  String tourTaskCount(int count);

  /// No description provided for @tourBadgeCount.
  ///
  /// In vi, this message translates to:
  /// **'{count} huy hiệu'**
  String tourBadgeCount(int count);

  /// No description provided for @tourDestinationStops.
  ///
  /// In vi, this message translates to:
  /// **'{count} điểm dừng'**
  String tourDestinationStops(int count);

  /// No description provided for @tourCheckpointCount.
  ///
  /// In vi, this message translates to:
  /// **'{count} trạm'**
  String tourCheckpointCount(int count);

  /// No description provided for @tourOwnedBadge.
  ///
  /// In vi, this message translates to:
  /// **'Đã có vé'**
  String get tourOwnedBadge;

  /// No description provided for @tourLoadFailed.
  ///
  /// In vi, this message translates to:
  /// **'Không tải được thông tin tour. Vui lòng thử lại.'**
  String get tourLoadFailed;

  /// No description provided for @tourTypeCultural.
  ///
  /// In vi, this message translates to:
  /// **'Văn hóa'**
  String get tourTypeCultural;

  /// No description provided for @tourTypeAdventure.
  ///
  /// In vi, this message translates to:
  /// **'Phiêu lưu'**
  String get tourTypeAdventure;

  /// No description provided for @tourTypeBeach.
  ///
  /// In vi, this message translates to:
  /// **'Biển'**
  String get tourTypeBeach;

  /// No description provided for @tourTypeMountain.
  ///
  /// In vi, this message translates to:
  /// **'Núi'**
  String get tourTypeMountain;

  /// No description provided for @tourTypeCity.
  ///
  /// In vi, this message translates to:
  /// **'Thành phố'**
  String get tourTypeCity;

  /// No description provided for @tourTypeEco.
  ///
  /// In vi, this message translates to:
  /// **'Sinh thái'**
  String get tourTypeEco;

  /// No description provided for @tourTypeHistorical.
  ///
  /// In vi, this message translates to:
  /// **'Lịch sử'**
  String get tourTypeHistorical;

  /// No description provided for @tourTypeGastronomy.
  ///
  /// In vi, this message translates to:
  /// **'Ẩm thực'**
  String get tourTypeGastronomy;

  /// No description provided for @tourTypeOther.
  ///
  /// In vi, this message translates to:
  /// **'Khác'**
  String get tourTypeOther;

  /// No description provided for @guestAdult.
  ///
  /// In vi, this message translates to:
  /// **'Người lớn'**
  String get guestAdult;

  /// No description provided for @guestChild.
  ///
  /// In vi, this message translates to:
  /// **'Trẻ em'**
  String get guestChild;

  /// No description provided for @guestToddler.
  ///
  /// In vi, this message translates to:
  /// **'Trẻ nhỏ'**
  String get guestToddler;

  /// No description provided for @guestInfant.
  ///
  /// In vi, this message translates to:
  /// **'Em bé'**
  String get guestInfant;

  /// No description provided for @durationSeconds.
  ///
  /// In vi, this message translates to:
  /// **'{seconds} giây'**
  String durationSeconds(int seconds);

  /// No description provided for @durationMinutesSeconds.
  ///
  /// In vi, this message translates to:
  /// **'{minutes} phút {seconds} giây'**
  String durationMinutesSeconds(int minutes, int seconds);

  /// No description provided for @durationFlexible.
  ///
  /// In vi, this message translates to:
  /// **'Tự do'**
  String get durationFlexible;

  /// No description provided for @departureTime.
  ///
  /// In vi, this message translates to:
  /// **'Giờ khởi hành'**
  String get departureTime;

  /// No description provided for @departureMeetingPoint.
  ///
  /// In vi, this message translates to:
  /// **'Địa điểm tập trung'**
  String get departureMeetingPoint;

  /// No description provided for @departurePickup.
  ///
  /// In vi, this message translates to:
  /// **'Giờ đón và điểm đón'**
  String get departurePickup;

  /// No description provided for @progressInProgress.
  ///
  /// In vi, this message translates to:
  /// **'Đang trải nghiệm · {done}/{total} điểm'**
  String progressInProgress(int done, int total);

  /// No description provided for @progressCompleted.
  ///
  /// In vi, this message translates to:
  /// **'Đã hoàn thành'**
  String get progressCompleted;

  /// No description provided for @progressCompletedOn.
  ///
  /// In vi, this message translates to:
  /// **'Đã hoàn thành · {date}'**
  String progressCompletedOn(String date);

  /// No description provided for @listSearchHint.
  ///
  /// In vi, this message translates to:
  /// **'Tìm tour, vùng miền, chủ đề...'**
  String get listSearchHint;

  /// No description provided for @listFilter.
  ///
  /// In vi, this message translates to:
  /// **'Bộ lọc'**
  String get listFilter;

  /// No description provided for @listAll.
  ///
  /// In vi, this message translates to:
  /// **'Tất cả'**
  String get listAll;

  /// No description provided for @listEmptyTitle.
  ///
  /// In vi, this message translates to:
  /// **'Không tìm thấy tour phù hợp'**
  String get listEmptyTitle;

  /// No description provided for @listAllOwned.
  ///
  /// In vi, this message translates to:
  /// **'Bạn đã mua tất cả các tour đang hiển thị. Hãy xem mục \"Chuyến đi\" để trải nghiệm.'**
  String get listAllOwned;

  /// No description provided for @listEmptyHint.
  ///
  /// In vi, this message translates to:
  /// **'Thử bỏ bớt bộ lọc hoặc tìm bằng từ khóa khác.'**
  String get listEmptyHint;

  /// No description provided for @listSort.
  ///
  /// In vi, this message translates to:
  /// **'Sắp xếp'**
  String get listSort;

  /// No description provided for @listSortNewest.
  ///
  /// In vi, this message translates to:
  /// **'Mới nhất'**
  String get listSortNewest;

  /// No description provided for @listSortPriceAsc.
  ///
  /// In vi, this message translates to:
  /// **'Giá thấp đến cao'**
  String get listSortPriceAsc;

  /// No description provided for @listSortPriceDesc.
  ///
  /// In vi, this message translates to:
  /// **'Giá cao đến thấp'**
  String get listSortPriceDesc;

  /// No description provided for @listSortDeparture.
  ///
  /// In vi, this message translates to:
  /// **'Khởi hành sớm nhất'**
  String get listSortDeparture;

  /// No description provided for @listGroupFormat.
  ///
  /// In vi, this message translates to:
  /// **'Hình thức'**
  String get listGroupFormat;

  /// No description provided for @listGroupRegion.
  ///
  /// In vi, this message translates to:
  /// **'Vùng miền'**
  String get listGroupRegion;

  /// No description provided for @listGroupTheme.
  ///
  /// In vi, this message translates to:
  /// **'Chủ đề'**
  String get listGroupTheme;

  /// No description provided for @listReset.
  ///
  /// In vi, this message translates to:
  /// **'Đặt lại'**
  String get listReset;

  /// No description provided for @listApply.
  ///
  /// In vi, this message translates to:
  /// **'Áp dụng'**
  String get listApply;

  /// No description provided for @tdTitle.
  ///
  /// In vi, this message translates to:
  /// **'Chi tiết tour'**
  String get tdTitle;

  /// No description provided for @tdCancelledOldBooking.
  ///
  /// In vi, this message translates to:
  /// **'Đã hủy đơn cũ. Bấm \"Đặt tour\" để đặt lại.'**
  String get tdCancelledOldBooking;

  /// No description provided for @tdNoProvider.
  ///
  /// In vi, this message translates to:
  /// **'Tour này chưa có nhà tour liên hệ.'**
  String get tdNoProvider;

  /// No description provided for @tdLoginToChat.
  ///
  /// In vi, this message translates to:
  /// **'Vui lòng đăng nhập để nhắn tin cho nhà tour.'**
  String get tdLoginToChat;

  /// No description provided for @tdDatesLoading.
  ///
  /// In vi, this message translates to:
  /// **'Đang tải lịch trải nghiệm, vui lòng thử lại sau.'**
  String get tdDatesLoading;

  /// No description provided for @tdNoDates.
  ///
  /// In vi, this message translates to:
  /// **'Hiện chưa có ngày nào còn chỗ cho tour này. Vui lòng quay lại sau.'**
  String get tdNoDates;

  /// No description provided for @tdPickDateTitle.
  ///
  /// In vi, this message translates to:
  /// **'Chọn ngày trải nghiệm'**
  String get tdPickDateTitle;

  /// No description provided for @tdPickDateHint.
  ///
  /// In vi, this message translates to:
  /// **'Số trong ô là số chỗ còn lại — chỉ ngày còn chỗ mới chọn được'**
  String get tdPickDateHint;

  /// No description provided for @tdNoDateSelected.
  ///
  /// In vi, this message translates to:
  /// **'Chưa chọn ngày nào'**
  String get tdNoDateSelected;

  /// No description provided for @tdDateSelected.
  ///
  /// In vi, this message translates to:
  /// **'Đang chọn: {date}'**
  String tdDateSelected(String date);

  /// No description provided for @tdConfirmDate.
  ///
  /// In vi, this message translates to:
  /// **'Xác nhận chọn ngày'**
  String get tdConfirmDate;

  /// No description provided for @tdRouteMap.
  ///
  /// In vi, this message translates to:
  /// **'Bản đồ lộ trình'**
  String get tdRouteMap;

  /// No description provided for @tdLegs.
  ///
  /// In vi, this message translates to:
  /// **'Các chặng hành trình'**
  String get tdLegs;

  /// No description provided for @tdNoDestinations.
  ///
  /// In vi, this message translates to:
  /// **'Tour chưa có điểm đến.'**
  String get tdNoDestinations;

  /// No description provided for @tdLoadFailed.
  ///
  /// In vi, this message translates to:
  /// **'Không tải được chi tiết tour.'**
  String get tdLoadFailed;

  /// No description provided for @tdDestinationCount.
  ///
  /// In vi, this message translates to:
  /// **'{count} điểm đến'**
  String tdDestinationCount(int count);

  /// No description provided for @tdVerified.
  ///
  /// In vi, this message translates to:
  /// **'Tour đã được kiểm duyệt'**
  String get tdVerified;

  /// No description provided for @tdFinalLeg.
  ///
  /// In vi, this message translates to:
  /// **'Chặng cuối'**
  String get tdFinalLeg;

  /// No description provided for @tdLeg.
  ///
  /// In vi, this message translates to:
  /// **'Chặng {n}'**
  String tdLeg(int n);

  /// No description provided for @tdCheckInBadgeHint.
  ///
  /// In vi, this message translates to:
  /// **'Check-in tại đây để mở khóa huy hiệu của điểm đến'**
  String get tdCheckInBadgeHint;

  /// No description provided for @tdExperiencesError.
  ///
  /// In vi, this message translates to:
  /// **'Không tải được trải nghiệm của điểm này. Kéo xuống để thử lại.'**
  String get tdExperiencesError;

  /// No description provided for @tdNoExperiences.
  ///
  /// In vi, this message translates to:
  /// **'Điểm đến này chưa có trải nghiệm nào được phát hành.'**
  String get tdNoExperiences;

  /// No description provided for @tdOwned.
  ///
  /// In vi, this message translates to:
  /// **'Bạn đã mua tour này'**
  String get tdOwned;

  /// No description provided for @tdDaysUntilStart.
  ///
  /// In vi, this message translates to:
  /// **'Còn {days} ngày nữa lên đường!'**
  String tdDaysUntilStart(int days);

  /// No description provided for @tdExperienceDate.
  ///
  /// In vi, this message translates to:
  /// **'Ngày trải nghiệm: {date}'**
  String tdExperienceDate(String date);

  /// No description provided for @tdStartExperience.
  ///
  /// In vi, this message translates to:
  /// **'Bắt đầu trải nghiệm'**
  String get tdStartExperience;

  /// No description provided for @tdContinueJourney.
  ///
  /// In vi, this message translates to:
  /// **'Tiếp tục hành trình'**
  String get tdContinueJourney;

  /// No description provided for @tdPriceFromAdult.
  ///
  /// In vi, this message translates to:
  /// **'Giá từ (người lớn)'**
  String get tdPriceFromAdult;

  /// No description provided for @tdTotalPayment.
  ///
  /// In vi, this message translates to:
  /// **'Tổng thanh toán'**
  String get tdTotalPayment;

  /// No description provided for @tdPerGuest.
  ///
  /// In vi, this message translates to:
  /// **' /khách'**
  String get tdPerGuest;

  /// No description provided for @tdHolding.
  ///
  /// In vi, this message translates to:
  /// **'Đang giữ chỗ...'**
  String get tdHolding;

  /// No description provided for @tdContinuePayment.
  ///
  /// In vi, this message translates to:
  /// **'Tiếp tục thanh toán'**
  String get tdContinuePayment;

  /// No description provided for @tdBookAgain.
  ///
  /// In vi, this message translates to:
  /// **'Đặt lại'**
  String get tdBookAgain;

  /// No description provided for @tdBookNow.
  ///
  /// In vi, this message translates to:
  /// **'Đặt tour ngay'**
  String get tdBookNow;

  /// No description provided for @tdRefundProcessingTitle.
  ///
  /// In vi, this message translates to:
  /// **'Đang trong quá trình hoàn tiền'**
  String get tdRefundProcessingTitle;

  /// No description provided for @tdRefundDoneTitle.
  ///
  /// In vi, this message translates to:
  /// **'Đã xử lý hoàn tiền'**
  String get tdRefundDoneTitle;

  /// No description provided for @tdRefundProcessingMessage.
  ///
  /// In vi, this message translates to:
  /// **'Đơn đặt tour này đang được xử lý hoàn tiền.'**
  String get tdRefundProcessingMessage;

  /// No description provided for @tdRefundDoneMessage.
  ///
  /// In vi, this message translates to:
  /// **'Đơn đặt tour này đã được xử lý xong.'**
  String get tdRefundDoneMessage;

  /// No description provided for @tdBookingCancelledTitle.
  ///
  /// In vi, this message translates to:
  /// **'Đơn đặt tour đã hủy'**
  String get tdBookingCancelledTitle;

  /// No description provided for @tdBookingExpiredTitle.
  ///
  /// In vi, this message translates to:
  /// **'Đơn đặt tour đã hết hạn'**
  String get tdBookingExpiredTitle;

  /// No description provided for @tdBookingCancelledMessage.
  ///
  /// In vi, this message translates to:
  /// **'Chỗ đã được trả lại — bạn không thể trải nghiệm tour này.'**
  String get tdBookingCancelledMessage;

  /// No description provided for @tdBookingExpiredMessage.
  ///
  /// In vi, this message translates to:
  /// **'Đơn quá hạn thanh toán — chỗ đã được giải phóng.'**
  String get tdBookingExpiredMessage;

  /// No description provided for @tdChatWithProvider.
  ///
  /// In vi, this message translates to:
  /// **'Chat với bên {name}'**
  String tdChatWithProvider(String name);

  /// No description provided for @tdProvidedBy.
  ///
  /// In vi, this message translates to:
  /// **'Cung cấp bởi {name} · đã được kiểm duyệt'**
  String tdProvidedBy(String name);

  /// No description provided for @tdTabIntro.
  ///
  /// In vi, this message translates to:
  /// **'Giới thiệu'**
  String get tdTabIntro;

  /// No description provided for @tdTabItinerary.
  ///
  /// In vi, this message translates to:
  /// **'Lịch trình'**
  String get tdTabItinerary;

  /// No description provided for @tdTabStops.
  ///
  /// In vi, this message translates to:
  /// **'Điểm dừng'**
  String get tdTabStops;

  /// No description provided for @tdTabPrices.
  ///
  /// In vi, this message translates to:
  /// **'Giá & lịch'**
  String get tdTabPrices;

  /// No description provided for @tdTabNotes.
  ///
  /// In vi, this message translates to:
  /// **'Lưu ý'**
  String get tdTabNotes;

  /// No description provided for @tdHighlights.
  ///
  /// In vi, this message translates to:
  /// **'Điểm nổi bật'**
  String get tdHighlights;

  /// No description provided for @tdPhotos.
  ///
  /// In vi, this message translates to:
  /// **'Hình ảnh nổi bật'**
  String get tdPhotos;

  /// No description provided for @tdItineraryDetail.
  ///
  /// In vi, this message translates to:
  /// **'Lịch trình chi tiết'**
  String get tdItineraryDetail;

  /// No description provided for @tdStopsTitle.
  ///
  /// In vi, this message translates to:
  /// **'Các điểm dừng ({count})'**
  String tdStopsTitle(int count);

  /// No description provided for @tdPriceTable.
  ///
  /// In vi, this message translates to:
  /// **'Bảng giá'**
  String get tdPriceTable;

  /// No description provided for @tdMaxGuests.
  ///
  /// In vi, this message translates to:
  /// **'Tối đa {count} khách mỗi chuyến'**
  String tdMaxGuests(int count);

  /// No description provided for @tdDepartures.
  ///
  /// In vi, this message translates to:
  /// **'Lịch khởi hành'**
  String get tdDepartures;

  /// No description provided for @tdMoreDates.
  ///
  /// In vi, this message translates to:
  /// **'+{count} ngày'**
  String tdMoreDates(int count);

  /// No description provided for @tdNotes.
  ///
  /// In vi, this message translates to:
  /// **'Thông tin cần lưu ý'**
  String get tdNotes;

  /// No description provided for @tdPriceIncludes.
  ///
  /// In vi, this message translates to:
  /// **'Giá bao gồm'**
  String get tdPriceIncludes;

  /// No description provided for @tdPriceExcludes.
  ///
  /// In vi, this message translates to:
  /// **'Giá không bao gồm'**
  String get tdPriceExcludes;

  /// No description provided for @tdCancellationPolicy.
  ///
  /// In vi, this message translates to:
  /// **'Chính sách hủy'**
  String get tdCancellationPolicy;

  /// No description provided for @tdRefundPolicy.
  ///
  /// In vi, this message translates to:
  /// **'Chính sách hoàn tiền'**
  String get tdRefundPolicy;

  /// No description provided for @tdForceMajeure.
  ///
  /// In vi, this message translates to:
  /// **'Trường hợp bất khả kháng'**
  String get tdForceMajeure;

  /// No description provided for @tdContact.
  ///
  /// In vi, this message translates to:
  /// **'Liên hệ'**
  String get tdContact;

  /// No description provided for @tdDayN.
  ///
  /// In vi, this message translates to:
  /// **'Ngày {day}'**
  String tdDayN(int day);

  /// No description provided for @tdQuizCount.
  ///
  /// In vi, this message translates to:
  /// **'{count} câu đố'**
  String tdQuizCount(int count);

  /// No description provided for @tdActivityCount.
  ///
  /// In vi, this message translates to:
  /// **'{count} hoạt động'**
  String tdActivityCount(int count);

  /// No description provided for @tdStopN.
  ///
  /// In vi, this message translates to:
  /// **'Điểm dừng {n}'**
  String tdStopN(int n);

  /// No description provided for @tdIntroVideo.
  ///
  /// In vi, this message translates to:
  /// **'Video giới thiệu'**
  String get tdIntroVideo;

  /// No description provided for @tdCulturalStory.
  ///
  /// In vi, this message translates to:
  /// **'Câu chuyện văn hoá'**
  String get tdCulturalStory;

  /// No description provided for @tdCulturalContent.
  ///
  /// In vi, this message translates to:
  /// **'Nội dung văn hóa'**
  String get tdCulturalContent;

  /// No description provided for @tdStoryLabel.
  ///
  /// In vi, this message translates to:
  /// **'Câu chuyện'**
  String get tdStoryLabel;

  /// No description provided for @tdArchivePhotos.
  ///
  /// In vi, this message translates to:
  /// **'{count} ảnh tư liệu'**
  String tdArchivePhotos(int count);

  /// No description provided for @tdArtifactCount.
  ///
  /// In vi, this message translates to:
  /// **'{count} hiện vật'**
  String tdArtifactCount(int count);

  /// No description provided for @tdUnlockOnCheckIn.
  ///
  /// In vi, this message translates to:
  /// **'Mở khóa khi bạn check-in tại điểm dừng trong hành trình.'**
  String get tdUnlockOnCheckIn;

  /// No description provided for @tdArtifacts.
  ///
  /// In vi, this message translates to:
  /// **'Hiện vật'**
  String get tdArtifacts;

  /// No description provided for @tdChallenges.
  ///
  /// In vi, this message translates to:
  /// **'Thử thách tại điểm'**
  String get tdChallenges;

  /// No description provided for @tdCulturalQuiz.
  ///
  /// In vi, this message translates to:
  /// **'Câu đố văn hoá'**
  String get tdCulturalQuiz;

  /// No description provided for @tdQuizQuestions.
  ///
  /// In vi, this message translates to:
  /// **'{count} câu trắc nghiệm'**
  String tdQuizQuestions(int count);

  /// No description provided for @tdScanQrToConfirm.
  ///
  /// In vi, this message translates to:
  /// **'quét QR tại điểm để xác nhận'**
  String get tdScanQrToConfirm;

  /// No description provided for @tdActivityFallback.
  ///
  /// In vi, this message translates to:
  /// **'Hoạt động thực địa'**
  String get tdActivityFallback;

  /// No description provided for @tripCountdown.
  ///
  /// In vi, this message translates to:
  /// **'{days} ngày nữa lên đường!'**
  String tripCountdown(int days);

  /// No description provided for @statusPendingPayment.
  ///
  /// In vi, this message translates to:
  /// **'Chờ thanh toán'**
  String get statusPendingPayment;

  /// No description provided for @statusConfirmed.
  ///
  /// In vi, this message translates to:
  /// **'Đã xác nhận'**
  String get statusConfirmed;

  /// No description provided for @statusCompleted.
  ///
  /// In vi, this message translates to:
  /// **'Đã hoàn thành'**
  String get statusCompleted;

  /// No description provided for @statusExpired.
  ///
  /// In vi, this message translates to:
  /// **'Đã hết hạn'**
  String get statusExpired;

  /// No description provided for @statusPaymentExpired.
  ///
  /// In vi, this message translates to:
  /// **'Hết hạn thanh toán'**
  String get statusPaymentExpired;

  /// No description provided for @statusCancelled.
  ///
  /// In vi, this message translates to:
  /// **'Đã hủy'**
  String get statusCancelled;

  /// No description provided for @statusUnknown.
  ///
  /// In vi, this message translates to:
  /// **'Không rõ'**
  String get statusUnknown;

  /// No description provided for @payStatusPending.
  ///
  /// In vi, this message translates to:
  /// **'Đang chờ'**
  String get payStatusPending;

  /// No description provided for @payStatusProcessing.
  ///
  /// In vi, this message translates to:
  /// **'Đang xử lý'**
  String get payStatusProcessing;

  /// No description provided for @payStatusVerifying.
  ///
  /// In vi, this message translates to:
  /// **'Đang xác minh'**
  String get payStatusVerifying;

  /// No description provided for @payStatusSuccess.
  ///
  /// In vi, this message translates to:
  /// **'Thành công'**
  String get payStatusSuccess;

  /// No description provided for @payStatusFailed.
  ///
  /// In vi, this message translates to:
  /// **'Thất bại'**
  String get payStatusFailed;

  /// No description provided for @payStatusCustomerCancelled.
  ///
  /// In vi, this message translates to:
  /// **'Khách đã hủy'**
  String get payStatusCustomerCancelled;

  /// No description provided for @payStatusSuperseded.
  ///
  /// In vi, this message translates to:
  /// **'Đã bị thay thế'**
  String get payStatusSuperseded;

  /// No description provided for @ageAdult.
  ///
  /// In vi, this message translates to:
  /// **'Từ 12 tuổi'**
  String get ageAdult;

  /// No description provided for @ageChild.
  ///
  /// In vi, this message translates to:
  /// **'5 – 11 tuổi'**
  String get ageChild;

  /// No description provided for @ageToddler.
  ///
  /// In vi, this message translates to:
  /// **'2 – 4 tuổi'**
  String get ageToddler;

  /// No description provided for @ageInfant.
  ///
  /// In vi, this message translates to:
  /// **'Dưới 2 tuổi'**
  String get ageInfant;

  /// No description provided for @genderMale.
  ///
  /// In vi, this message translates to:
  /// **'Nam'**
  String get genderMale;

  /// No description provided for @genderFemale.
  ///
  /// In vi, this message translates to:
  /// **'Nữ'**
  String get genderFemale;

  /// No description provided for @genderOther.
  ///
  /// In vi, this message translates to:
  /// **'Khác'**
  String get genderOther;

  /// No description provided for @bgTitle.
  ///
  /// In vi, this message translates to:
  /// **'Đặt tour'**
  String get bgTitle;

  /// No description provided for @bgRemainingSlots.
  ///
  /// In vi, this message translates to:
  /// **'Số chỗ còn'**
  String get bgRemainingSlots;

  /// No description provided for @bgNoDate.
  ///
  /// In vi, this message translates to:
  /// **'Chưa chọn ngày'**
  String get bgNoDate;

  /// No description provided for @bgSlotsLeft.
  ///
  /// In vi, this message translates to:
  /// **'Còn {count} chỗ'**
  String bgSlotsLeft(int count);

  /// No description provided for @bgSlotsSelected.
  ///
  /// In vi, this message translates to:
  /// **'Đã chọn {count} chỗ'**
  String bgSlotsSelected(int count);

  /// No description provided for @bgGuestsNotCounted.
  ///
  /// In vi, this message translates to:
  /// **'{count} người không tính slot'**
  String bgGuestsNotCounted(int count);

  /// No description provided for @bgTotalGuests.
  ///
  /// In vi, this message translates to:
  /// **'Tổng · {count} khách'**
  String bgTotalGuests(int count);

  /// No description provided for @bgConfirm.
  ///
  /// In vi, this message translates to:
  /// **'Xác nhận đặt'**
  String get bgConfirm;

  /// No description provided for @bgMissingPassenger.
  ///
  /// In vi, this message translates to:
  /// **'Mở từng mục \"Hành khách\" và điền đủ thông tin để tiếp tục.'**
  String get bgMissingPassenger;

  /// No description provided for @bgNoSlot.
  ///
  /// In vi, this message translates to:
  /// **'không tính chỗ'**
  String get bgNoSlot;

  /// No description provided for @bgPassengerN.
  ///
  /// In vi, this message translates to:
  /// **'Hành khách {n}'**
  String bgPassengerN(int n);

  /// No description provided for @bgOwnerTag.
  ///
  /// In vi, this message translates to:
  /// **'Người đặt tour'**
  String get bgOwnerTag;

  /// No description provided for @bgPassengerComplete.
  ///
  /// In vi, this message translates to:
  /// **'Đã điền đủ thông tin'**
  String get bgPassengerComplete;

  /// No description provided for @bgPassengerHintAdult.
  ///
  /// In vi, this message translates to:
  /// **'Bấm để nhập họ tên, ngày sinh, giới tính, email'**
  String get bgPassengerHintAdult;

  /// No description provided for @bgPassengerHint.
  ///
  /// In vi, this message translates to:
  /// **'Bấm để nhập họ tên, ngày sinh, giới tính'**
  String get bgPassengerHint;

  /// No description provided for @bgPassengerInfo.
  ///
  /// In vi, this message translates to:
  /// **'Thông tin hành khách'**
  String get bgPassengerInfo;

  /// No description provided for @bgFullName.
  ///
  /// In vi, this message translates to:
  /// **'Họ và tên *'**
  String get bgFullName;

  /// No description provided for @bgBirthDate.
  ///
  /// In vi, this message translates to:
  /// **'Ngày sinh *'**
  String get bgBirthDate;

  /// No description provided for @bgGender.
  ///
  /// In vi, this message translates to:
  /// **'Giới tính *'**
  String get bgGender;

  /// No description provided for @bgEmailHint.
  ///
  /// In vi, this message translates to:
  /// **'Người lớn cần email để nhận vé, liên kết tài khoản và nhận lời mời tham gia tour.'**
  String get bgEmailHint;

  /// No description provided for @bgAgeMismatch.
  ///
  /// In vi, this message translates to:
  /// **'Tuổi tại ngày trải nghiệm thuộc loại \"{type}\" — hãy kiểm tra lại nhóm khách.'**
  String bgAgeMismatch(String type);

  /// No description provided for @calHasDates.
  ///
  /// In vi, this message translates to:
  /// **'Còn lịch'**
  String get calHasDates;

  /// No description provided for @calNoDates.
  ///
  /// In vi, this message translates to:
  /// **'Không có lịch'**
  String get calNoDates;

  /// No description provided for @calAvailable.
  ///
  /// In vi, this message translates to:
  /// **'Còn chỗ'**
  String get calAvailable;

  /// No description provided for @calAlmostFull.
  ///
  /// In vi, this message translates to:
  /// **'Sắp hết'**
  String get calAlmostFull;

  /// No description provided for @calFull.
  ///
  /// In vi, this message translates to:
  /// **'Hết chỗ'**
  String get calFull;

  /// No description provided for @calThisMonth.
  ///
  /// In vi, this message translates to:
  /// **'Về tháng này'**
  String get calThisMonth;

  /// No description provided for @voucherSheetTitle.
  ///
  /// In vi, this message translates to:
  /// **'Chọn voucher giảm giá'**
  String get voucherSheetTitle;

  /// No description provided for @voucherSkip.
  ///
  /// In vi, this message translates to:
  /// **'Bỏ qua'**
  String get voucherSkip;

  /// No description provided for @voucherLoadFailed.
  ///
  /// In vi, this message translates to:
  /// **'Không thể tải danh sách voucher.'**
  String get voucherLoadFailed;

  /// No description provided for @voucherNotApplicable.
  ///
  /// In vi, this message translates to:
  /// **'Voucher không áp dụng được cho tour này.'**
  String get voucherNotApplicable;

  /// No description provided for @voucherValidateFailed.
  ///
  /// In vi, this message translates to:
  /// **'Không thể xác minh voucher. Vui lòng thử lại.'**
  String get voucherValidateFailed;

  /// No description provided for @voucherEmpty.
  ///
  /// In vi, this message translates to:
  /// **'Bạn chưa có voucher nào.\nĐổi điểm thưởng để nhận voucher!'**
  String get voucherEmpty;

  /// No description provided for @voucherOffTag.
  ///
  /// In vi, this message translates to:
  /// **'GIẢM'**
  String get voucherOffTag;

  /// No description provided for @voucherCode.
  ///
  /// In vi, this message translates to:
  /// **'Mã: {code}'**
  String voucherCode(String code);

  /// No description provided for @voucherExpiry.
  ///
  /// In vi, this message translates to:
  /// **'HSD: {date}'**
  String voucherExpiry(String date);

  /// No description provided for @pendingDialogTitle.
  ///
  /// In vi, this message translates to:
  /// **'Bạn đang có đơn giữ chỗ'**
  String get pendingDialogTitle;

  /// No description provided for @pendingDialogMessage.
  ///
  /// In vi, this message translates to:
  /// **'Đơn {code} cho ngày {date} ({total}) đang giữ chỗ, còn {countdown} để thanh toán.\n\nMuốn đổi ngày hoặc số khách, hãy hủy đơn cũ rồi đặt lại.'**
  String pendingDialogMessage(
    String code,
    String date,
    String total,
    String countdown,
  );

  /// No description provided for @pendingCancelAndRebook.
  ///
  /// In vi, this message translates to:
  /// **'Hủy đơn cũ và đặt lại'**
  String get pendingCancelAndRebook;

  /// No description provided for @pendingBannerHome.
  ///
  /// In vi, this message translates to:
  /// **'Bạn có đơn chờ thanh toán · còn {countdown}'**
  String pendingBannerHome(String countdown);

  /// No description provided for @pendingBannerTour.
  ///
  /// In vi, this message translates to:
  /// **'Bạn đang giữ chỗ · còn {countdown}'**
  String pendingBannerTour(String countdown);

  /// No description provided for @pendingBannerDetail.
  ///
  /// In vi, this message translates to:
  /// **'Ngày {date} · {total}'**
  String pendingBannerDetail(String date, String total);

  /// No description provided for @pendingPayAction.
  ///
  /// In vi, this message translates to:
  /// **'Thanh toán'**
  String get pendingPayAction;

  /// No description provided for @coTitle.
  ///
  /// In vi, this message translates to:
  /// **'Thanh toán'**
  String get coTitle;

  /// No description provided for @coNoPaymentUrl.
  ///
  /// In vi, this message translates to:
  /// **'Máy chủ không trả về đường dẫn thanh toán.'**
  String get coNoPaymentUrl;

  /// No description provided for @coOpenPaymentFailed.
  ///
  /// In vi, this message translates to:
  /// **'Không mở được trang thanh toán. Vui lòng thử lại.'**
  String get coOpenPaymentFailed;

  /// No description provided for @coVerifyingPrevious.
  ///
  /// In vi, this message translates to:
  /// **'Giao dịch trước đang được xác minh với VNPay...'**
  String get coVerifyingPrevious;

  /// No description provided for @coAwaitingConfirmation.
  ///
  /// In vi, this message translates to:
  /// **'Đang chờ xác nhận thanh toán. Sau khi thanh toán xong, hãy quay lại ứng dụng.'**
  String get coAwaitingConfirmation;

  /// No description provided for @coNoResultYet.
  ///
  /// In vi, this message translates to:
  /// **'Chưa nhận được kết quả từ VNPay. Tiền của bạn chưa bị mất, hãy kiểm tra lại mục \"Đơn của tôi\" sau ít phút.'**
  String get coNoResultYet;

  /// No description provided for @coCancelTitle.
  ///
  /// In vi, this message translates to:
  /// **'Hủy đơn đặt?'**
  String get coCancelTitle;

  /// No description provided for @coCancelMessage.
  ///
  /// In vi, this message translates to:
  /// **'Chỗ đã giữ sẽ được trả lại.'**
  String get coCancelMessage;

  /// No description provided for @coKeep.
  ///
  /// In vi, this message translates to:
  /// **'Giữ lại'**
  String get coKeep;

  /// No description provided for @coCancelBooking.
  ///
  /// In vi, this message translates to:
  /// **'Hủy đơn'**
  String get coCancelBooking;

  /// No description provided for @coCancelBookingLong.
  ///
  /// In vi, this message translates to:
  /// **'Hủy đơn đặt'**
  String get coCancelBookingLong;

  /// No description provided for @coHoldEnd.
  ///
  /// In vi, this message translates to:
  /// **'hết thời gian giữ chỗ'**
  String get coHoldEnd;

  /// No description provided for @coLeaveTitle.
  ///
  /// In vi, this message translates to:
  /// **'Rời màn thanh toán?'**
  String get coLeaveTitle;

  /// No description provided for @coLeaveMessage.
  ///
  /// In vi, this message translates to:
  /// **'Chỗ của bạn vẫn được giữ đến {until} (còn {countdown}). Bạn có thể quay lại thanh toán ở trang tour, Trang chủ hoặc mục Đơn đặt tour.'**
  String coLeaveMessage(String until, String countdown);

  /// No description provided for @coLeaveKeep.
  ///
  /// In vi, this message translates to:
  /// **'Thoát, vẫn giữ chỗ'**
  String get coLeaveKeep;

  /// No description provided for @coStay.
  ///
  /// In vi, this message translates to:
  /// **'Ở lại'**
  String get coStay;

  /// No description provided for @coNotFound.
  ///
  /// In vi, this message translates to:
  /// **'Không tìm thấy đơn đặt.'**
  String get coNotFound;

  /// No description provided for @coGuestCount.
  ///
  /// In vi, this message translates to:
  /// **'{count} khách'**
  String coGuestCount(int count);

  /// No description provided for @coPaymentDetails.
  ///
  /// In vi, this message translates to:
  /// **'Chi tiết thanh toán'**
  String get coPaymentDetails;

  /// No description provided for @coTourPrice.
  ///
  /// In vi, this message translates to:
  /// **'Giá tour'**
  String get coTourPrice;

  /// No description provided for @coTourPriceGuests.
  ///
  /// In vi, this message translates to:
  /// **'Giá tour ({count} khách)'**
  String coTourPriceGuests(int count);

  /// No description provided for @coDiscount.
  ///
  /// In vi, this message translates to:
  /// **'Ưu đãi · {code}'**
  String coDiscount(String code);

  /// No description provided for @coCancelled.
  ///
  /// In vi, this message translates to:
  /// **'Đơn đã được hủy.'**
  String get coCancelled;

  /// No description provided for @coSecureNote.
  ///
  /// In vi, this message translates to:
  /// **'Thanh toán an toàn qua cổng VNPay, bảo mật thông tin'**
  String get coSecureNote;

  /// No description provided for @coCheckPrevious.
  ///
  /// In vi, this message translates to:
  /// **'Kiểm tra kết quả giao dịch trước'**
  String get coCheckPrevious;

  /// No description provided for @coAttempts.
  ///
  /// In vi, this message translates to:
  /// **'Các lần thanh toán'**
  String get coAttempts;

  /// No description provided for @coDuplicateAttempt.
  ///
  /// In vi, this message translates to:
  /// **'Giao dịch trùng với một giao dịch đã thanh toán'**
  String get coDuplicateAttempt;

  /// No description provided for @coPaidMessage.
  ///
  /// In vi, this message translates to:
  /// **'Đơn đặt của bạn đã được xác nhận. Chúc bạn có chuyến đi đầy cảm hứng!'**
  String get coPaidMessage;

  /// No description provided for @coChooseMethod.
  ///
  /// In vi, this message translates to:
  /// **'Chọn phương thức thanh toán'**
  String get coChooseMethod;

  /// No description provided for @coMethodDomestic.
  ///
  /// In vi, this message translates to:
  /// **'Thẻ nội địa và tài khoản ngân hàng'**
  String get coMethodDomestic;

  /// No description provided for @coMethodDomesticDesc.
  ///
  /// In vi, this message translates to:
  /// **'Thanh toán bằng thẻ ATM nội địa hoặc tài khoản ngân hàng (Internet Banking, Mobile Banking của các ngân hàng Việt Nam).'**
  String get coMethodDomesticDesc;

  /// No description provided for @coProcessing.
  ///
  /// In vi, this message translates to:
  /// **'Đang xử lý...'**
  String get coProcessing;

  /// No description provided for @coPayAmount.
  ///
  /// In vi, this message translates to:
  /// **'Thanh toán {amount}'**
  String coPayAmount(String amount);

  /// No description provided for @coExpired.
  ///
  /// In vi, this message translates to:
  /// **'Đã quá hạn thanh toán. Chỗ giữ sẽ được giải phóng.'**
  String get coExpired;

  /// No description provided for @coHoldCountdown.
  ///
  /// In vi, this message translates to:
  /// **'Giữ chỗ còn {countdown}'**
  String coHoldCountdown(String countdown);

  /// No description provided for @paySuccessTitle.
  ///
  /// In vi, this message translates to:
  /// **'Thanh toán thành công'**
  String get paySuccessTitle;

  /// No description provided for @paySuccessShort.
  ///
  /// In vi, this message translates to:
  /// **'Thanh toán thành công!'**
  String get paySuccessShort;

  /// No description provided for @paySuccessViewBooking.
  ///
  /// In vi, this message translates to:
  /// **'Xem đơn của tôi'**
  String get paySuccessViewBooking;

  /// No description provided for @paySuccessBookingCode.
  ///
  /// In vi, this message translates to:
  /// **'Mã đơn: {code}'**
  String paySuccessBookingCode(String code);

  /// No description provided for @paySuccessAmount.
  ///
  /// In vi, this message translates to:
  /// **'Số tiền: {amount}'**
  String paySuccessAmount(String amount);

  /// No description provided for @paySuccessConfirmed.
  ///
  /// In vi, this message translates to:
  /// **'Giao dịch của bạn đã được xác nhận thành công.'**
  String get paySuccessConfirmed;

  /// No description provided for @payNotSuccessful.
  ///
  /// In vi, this message translates to:
  /// **'Thanh toán chưa thành công.'**
  String get payNotSuccessful;

  /// No description provided for @payFailedRetry.
  ///
  /// In vi, this message translates to:
  /// **'Thanh toán không thành công. Bạn có thể thử lại.'**
  String get payFailedRetry;

  /// No description provided for @payLoadFailed.
  ///
  /// In vi, this message translates to:
  /// **'Không thể tải thông tin thanh toán.'**
  String get payLoadFailed;

  /// No description provided for @payMethodsLoadFailed.
  ///
  /// In vi, this message translates to:
  /// **'Không thể tải phương thức thanh toán.'**
  String get payMethodsLoadFailed;

  /// No description provided for @payUnverifiedLater.
  ///
  /// In vi, this message translates to:
  /// **'Chưa xác minh được kết quả giao dịch trước. Vui lòng thử lại sau.'**
  String get payUnverifiedLater;

  /// No description provided for @payUnverifiedRetry.
  ///
  /// In vi, this message translates to:
  /// **'Chưa xác minh được kết quả giao dịch trước. Nếu bạn chưa thanh toán, bạn có thể thử lại ngay; nếu đã thanh toán, hãy kiểm tra lại sau ít phút.'**
  String get payUnverifiedRetry;

  /// No description provided for @payAwaitingResult.
  ///
  /// In vi, this message translates to:
  /// **'Đang chờ kết quả thanh toán...'**
  String get payAwaitingResult;

  /// No description provided for @payInitializingTxn.
  ///
  /// In vi, this message translates to:
  /// **'Đang khởi tạo giao dịch...'**
  String get payInitializingTxn;

  /// No description provided for @payInitFailed.
  ///
  /// In vi, this message translates to:
  /// **'Không thể khởi tạo thanh toán. Vui lòng thử lại.'**
  String get payInitFailed;

  /// No description provided for @payScanQrToFinish.
  ///
  /// In vi, this message translates to:
  /// **'Quét mã QR để hoàn tất thanh toán.'**
  String get payScanQrToFinish;

  /// No description provided for @payOpenBrowserFailed.
  ///
  /// In vi, this message translates to:
  /// **'Không thể mở trang thanh toán. Vui lòng kiểm tra trình duyệt.'**
  String get payOpenBrowserFailed;

  /// No description provided for @payStatusCheckFailed.
  ///
  /// In vi, this message translates to:
  /// **'Không thể kiểm tra trạng thái thanh toán. Vui lòng thử lại.'**
  String get payStatusCheckFailed;

  /// No description provided for @payCheckingResult.
  ///
  /// In vi, this message translates to:
  /// **'Đang kiểm tra kết quả thanh toán...'**
  String get payCheckingResult;

  /// No description provided for @paySuperseded.
  ///
  /// In vi, this message translates to:
  /// **'Giao dịch này đã bị thay thế — đơn hàng đã được thanh toán bởi một giao dịch khác.'**
  String get paySuperseded;

  /// No description provided for @payDeadlineExceeded.
  ///
  /// In vi, this message translates to:
  /// **'Đã hết thời hạn thanh toán 10 phút. Vui lòng đặt lại tour.'**
  String get payDeadlineExceeded;

  /// No description provided for @payRetryTitle.
  ///
  /// In vi, this message translates to:
  /// **'Thanh toán lại?'**
  String get payRetryTitle;

  /// No description provided for @payRetryMessage.
  ///
  /// In vi, this message translates to:
  /// **'Hệ thống chưa xác minh được kết quả giao dịch trước.\n\n• Nếu bạn CHƯA thanh toán: bạn có thể thử lại ngay với thời hạn còn lại.\n• Nếu bạn ĐÃ thanh toán: vui lòng chọn \"Kiểm tra lại\" để hệ thống đồng bộ kết quả, tránh thanh toán trùng.'**
  String get payRetryMessage;

  /// No description provided for @payCheckAgain.
  ///
  /// In vi, this message translates to:
  /// **'Kiểm tra lại'**
  String get payCheckAgain;

  /// No description provided for @payBookingNumber.
  ///
  /// In vi, this message translates to:
  /// **'Đơn #{id}'**
  String payBookingNumber(int id);

  /// No description provided for @payTourFallback.
  ///
  /// In vi, this message translates to:
  /// **'Tour trải nghiệm'**
  String get payTourFallback;

  /// No description provided for @payExperienceDate.
  ///
  /// In vi, this message translates to:
  /// **'Ngày trải nghiệm'**
  String get payExperienceDate;

  /// No description provided for @payMethodTitle.
  ///
  /// In vi, this message translates to:
  /// **'Phương thức thanh toán'**
  String get payMethodTitle;

  /// No description provided for @payMethodsUnavailable.
  ///
  /// In vi, this message translates to:
  /// **'Không tải được phương thức thanh toán. Bạn vẫn có thể thử lại.'**
  String get payMethodsUnavailable;

  /// No description provided for @payInitializing.
  ///
  /// In vi, this message translates to:
  /// **'Đang khởi tạo...'**
  String get payInitializing;

  /// No description provided for @payChecking.
  ///
  /// In vi, this message translates to:
  /// **'Đang kiểm tra...'**
  String get payChecking;

  /// No description provided for @payCheckResult.
  ///
  /// In vi, this message translates to:
  /// **'Kiểm tra kết quả thanh toán'**
  String get payCheckResult;

  /// No description provided for @payTimeLimitNote.
  ///
  /// In vi, this message translates to:
  /// **'Bạn có 10 phút để hoàn tất thanh toán. Trang VNPay sẽ mở bằng trình duyệt.'**
  String get payTimeLimitNote;

  /// No description provided for @payQrTitle.
  ///
  /// In vi, this message translates to:
  /// **'Quét mã để thanh toán'**
  String get payQrTitle;

  /// No description provided for @payQrHint.
  ///
  /// In vi, this message translates to:
  /// **'Mở ứng dụng ngân hàng hoặc ví điện tử hỗ trợ VNPay-QR để quét mã này.'**
  String get payQrHint;

  /// No description provided for @payChooseCard.
  ///
  /// In vi, this message translates to:
  /// **'Chọn loại thẻ'**
  String get payChooseCard;

  /// No description provided for @payChooseCardHint.
  ///
  /// In vi, this message translates to:
  /// **'Chọn loại thẻ (Visa, Mastercard, JCB…)'**
  String get payChooseCardHint;

  /// No description provided for @payCardType.
  ///
  /// In vi, this message translates to:
  /// **'Loại thẻ: {type}'**
  String payCardType(String type);

  /// No description provided for @payCardTypesUnavailable.
  ///
  /// In vi, this message translates to:
  /// **'Không tải được danh sách loại thẻ. Bạn vẫn có thể thanh toán bằng thẻ quốc tế.'**
  String get payCardTypesUnavailable;

  /// No description provided for @payMethodIntl.
  ///
  /// In vi, this message translates to:
  /// **'Thẻ thanh toán quốc tế'**
  String get payMethodIntl;

  /// No description provided for @payMethodQr.
  ///
  /// In vi, this message translates to:
  /// **'Ứng dụng ngân hàng & Ví điện tử'**
  String get payMethodQr;

  /// No description provided for @mbTitle.
  ///
  /// In vi, this message translates to:
  /// **'Đơn đặt tour'**
  String get mbTitle;

  /// No description provided for @mbTabAll.
  ///
  /// In vi, this message translates to:
  /// **'Tất cả ({count})'**
  String mbTabAll(int count);

  /// No description provided for @mbTabPurchased.
  ///
  /// In vi, this message translates to:
  /// **'Đã mua ({count})'**
  String mbTabPurchased(int count);

  /// No description provided for @mbTabPending.
  ///
  /// In vi, this message translates to:
  /// **'Chờ thanh toán ({count})'**
  String mbTabPending(int count);

  /// No description provided for @mbTabExperiencing.
  ///
  /// In vi, this message translates to:
  /// **'Đang trải nghiệm ({count})'**
  String mbTabExperiencing(int count);

  /// No description provided for @mbTabCompleted.
  ///
  /// In vi, this message translates to:
  /// **'Đã hoàn thành ({count})'**
  String mbTabCompleted(int count);

  /// No description provided for @mbTabRefunding.
  ///
  /// In vi, this message translates to:
  /// **'Đang hoàn tiền ({count})'**
  String mbTabRefunding(int count);

  /// No description provided for @mbTabRefunded.
  ///
  /// In vi, this message translates to:
  /// **'Đã hoàn tiền ({count})'**
  String mbTabRefunded(int count);

  /// No description provided for @mbTabClosed.
  ///
  /// In vi, this message translates to:
  /// **'Đã hủy/Hết hạn ({count})'**
  String mbTabClosed(int count);

  /// No description provided for @mbEmptyAll.
  ///
  /// In vi, this message translates to:
  /// **'Chưa có đơn nào.'**
  String get mbEmptyAll;

  /// No description provided for @mbEmptyPurchased.
  ///
  /// In vi, this message translates to:
  /// **'Chưa có đơn nào đã thanh toán.'**
  String get mbEmptyPurchased;

  /// No description provided for @mbEmptyPending.
  ///
  /// In vi, this message translates to:
  /// **'Không có đơn nào đang chờ thanh toán.'**
  String get mbEmptyPending;

  /// No description provided for @mbEmptyExperiencing.
  ///
  /// In vi, this message translates to:
  /// **'Không có chuyến nào đang diễn ra.'**
  String get mbEmptyExperiencing;

  /// No description provided for @mbEmptyCompleted.
  ///
  /// In vi, this message translates to:
  /// **'Chưa có đơn nào đã hoàn thành.'**
  String get mbEmptyCompleted;

  /// No description provided for @mbEmptyRefunding.
  ///
  /// In vi, this message translates to:
  /// **'Không có đơn nào đang hoàn tiền.'**
  String get mbEmptyRefunding;

  /// No description provided for @mbEmptyRefunded.
  ///
  /// In vi, this message translates to:
  /// **'Chưa có đơn nào đã hoàn tiền xong.'**
  String get mbEmptyRefunded;

  /// No description provided for @mbEmptyClosed.
  ///
  /// In vi, this message translates to:
  /// **'Không có đơn nào đã hủy hoặc hết hạn.'**
  String get mbEmptyClosed;

  /// No description provided for @mbDetails.
  ///
  /// In vi, this message translates to:
  /// **'Chi tiết'**
  String get mbDetails;

  /// No description provided for @mbRebook.
  ///
  /// In vi, this message translates to:
  /// **'Đặt lại tour'**
  String get mbRebook;

  /// No description provided for @mbBookingCancelled.
  ///
  /// In vi, this message translates to:
  /// **'Đơn đã hủy'**
  String get mbBookingCancelled;

  /// No description provided for @mbBookingExpired.
  ///
  /// In vi, this message translates to:
  /// **'Đơn đã hết hạn'**
  String get mbBookingExpired;

  /// No description provided for @mbEnterExperience.
  ///
  /// In vi, this message translates to:
  /// **'Vào trải nghiệm'**
  String get mbEnterExperience;

  /// No description provided for @mbReason.
  ///
  /// In vi, this message translates to:
  /// **'Lý do: {reason}'**
  String mbReason(String reason);

  /// No description provided for @mbPaidButClosed.
  ///
  /// In vi, this message translates to:
  /// **'Khoản tiền đã được ghi nhận nhưng chỗ đã được trả lại. Vui lòng liên hệ hỗ trợ để được hoàn tiền.'**
  String get mbPaidButClosed;

  /// No description provided for @mbViewDetails.
  ///
  /// In vi, this message translates to:
  /// **'Xem chi tiết đơn'**
  String get mbViewDetails;

  /// No description provided for @mbPaymentDeadline.
  ///
  /// In vi, this message translates to:
  /// **'Hạn thanh toán: {time}'**
  String mbPaymentDeadline(String time);

  /// No description provided for @bdTitle.
  ///
  /// In vi, this message translates to:
  /// **'Chi Tiết Đơn'**
  String get bdTitle;

  /// No description provided for @bdLoadFailed.
  ///
  /// In vi, this message translates to:
  /// **'Không thể tải chi tiết đơn.'**
  String get bdLoadFailed;

  /// No description provided for @bdPaymentConfirmedToast.
  ///
  /// In vi, this message translates to:
  /// **'Đã xác nhận thanh toán thành công!'**
  String get bdPaymentConfirmedToast;

  /// No description provided for @bdTxnFailedConfirmed.
  ///
  /// In vi, this message translates to:
  /// **'Giao dịch đã được xác nhận không thành công.'**
  String get bdTxnFailedConfirmed;

  /// No description provided for @bdUnverified.
  ///
  /// In vi, this message translates to:
  /// **'Chưa xác minh được kết quả. Nếu bạn đã thanh toán, vui lòng thử lại sau ít phút.'**
  String get bdUnverified;

  /// No description provided for @bdCancelTitle.
  ///
  /// In vi, this message translates to:
  /// **'Hủy đơn đặt tour'**
  String get bdCancelTitle;

  /// No description provided for @bdCancelMessage.
  ///
  /// In vi, this message translates to:
  /// **'Sau khi hủy, chỗ đã giữ sẽ được trả lại cho khách khác. Bạn không thể hoàn tác thao tác này.'**
  String get bdCancelMessage;

  /// No description provided for @bdCancelReasonHint.
  ///
  /// In vi, this message translates to:
  /// **'Lý do hủy (không bắt buộc)'**
  String get bdCancelReasonHint;

  /// No description provided for @bdKeepBooking.
  ///
  /// In vi, this message translates to:
  /// **'Giữ đơn'**
  String get bdKeepBooking;

  /// No description provided for @bdCancelledToast.
  ///
  /// In vi, this message translates to:
  /// **'Đã hủy đơn. Chỗ đã giữ được giải phóng.'**
  String get bdCancelledToast;

  /// No description provided for @bdCancelFailed.
  ///
  /// In vi, this message translates to:
  /// **'Không thể hủy đơn. Vui lòng thử lại.'**
  String get bdCancelFailed;

  /// No description provided for @bdRefundWindowClosed.
  ///
  /// In vi, this message translates to:
  /// **'Yêu cầu hoàn tiền chỉ được gửi trước ngày khởi hành của tour. Bạn đã trải nghiệm hoặc tour đã hoàn thành nên không thể gửi yêu cầu.'**
  String get bdRefundWindowClosed;

  /// No description provided for @bdEyebrowCode.
  ///
  /// In vi, this message translates to:
  /// **'MÃ ĐƠN'**
  String get bdEyebrowCode;

  /// No description provided for @bdEyebrowTotal.
  ///
  /// In vi, this message translates to:
  /// **'TỔNG TIỀN'**
  String get bdEyebrowTotal;

  /// No description provided for @bdNoExperienceDate.
  ///
  /// In vi, this message translates to:
  /// **'Chưa có ngày trải nghiệm'**
  String get bdNoExperienceDate;

  /// No description provided for @bdExperienceCount.
  ///
  /// In vi, this message translates to:
  /// **'{count} trải nghiệm'**
  String bdExperienceCount(int count);

  /// No description provided for @bdStepBooked.
  ///
  /// In vi, this message translates to:
  /// **'Đặt tour'**
  String get bdStepBooked;

  /// No description provided for @bdStepBookedCreated.
  ///
  /// In vi, this message translates to:
  /// **'Đã tạo đơn'**
  String get bdStepBookedCreated;

  /// No description provided for @bdStepPayment.
  ///
  /// In vi, this message translates to:
  /// **'Thanh toán'**
  String get bdStepPayment;

  /// No description provided for @bdStepNotPaid.
  ///
  /// In vi, this message translates to:
  /// **'Chưa thanh toán'**
  String get bdStepNotPaid;

  /// No description provided for @bdStepConfirmed.
  ///
  /// In vi, this message translates to:
  /// **'Xác nhận'**
  String get bdStepConfirmed;

  /// No description provided for @bdStepCompleted.
  ///
  /// In vi, this message translates to:
  /// **'Hoàn thành'**
  String get bdStepCompleted;

  /// No description provided for @bdStepNotDone.
  ///
  /// In vi, this message translates to:
  /// **'Không thực hiện'**
  String get bdStepNotDone;

  /// No description provided for @bdStepNotExperienced.
  ///
  /// In vi, this message translates to:
  /// **'Chưa trải nghiệm'**
  String get bdStepNotExperienced;

  /// No description provided for @bdProgressTitle.
  ///
  /// In vi, this message translates to:
  /// **'Tiến trình đơn'**
  String get bdProgressTitle;

  /// No description provided for @bdCountdownHint.
  ///
  /// In vi, this message translates to:
  /// **'Còn {countdown} để thanh toán. Quá hạn, chỗ đã giữ sẽ được trả lại cho khách khác.'**
  String bdCountdownHint(String countdown);

  /// No description provided for @bdExperiencesTitle.
  ///
  /// In vi, this message translates to:
  /// **'Trải nghiệm trong đơn'**
  String get bdExperiencesTitle;

  /// No description provided for @bdItemCount.
  ///
  /// In vi, this message translates to:
  /// **'{count} mục'**
  String bdItemCount(int count);

  /// No description provided for @bdExperiencesHint.
  ///
  /// In vi, this message translates to:
  /// **'Mỗi trải nghiệm trong tour chiếm 1 chỗ trong ngày bạn chọn.'**
  String get bdExperiencesHint;

  /// No description provided for @bdNoExperiences.
  ///
  /// In vi, this message translates to:
  /// **'Đơn này không ghi nhận trải nghiệm nào.'**
  String get bdNoExperiences;

  /// No description provided for @bdExperiencesTotal.
  ///
  /// In vi, this message translates to:
  /// **'Tổng giá trải nghiệm'**
  String get bdExperiencesTotal;

  /// No description provided for @bdExperienceNumber.
  ///
  /// In vi, this message translates to:
  /// **'Trải nghiệm #{id}'**
  String bdExperienceNumber(String id);

  /// No description provided for @bdDepartureTitle.
  ///
  /// In vi, this message translates to:
  /// **'Thông tin khởi hành'**
  String get bdDepartureTitle;

  /// No description provided for @bdOrderInfoTitle.
  ///
  /// In vi, this message translates to:
  /// **'Thông tin đơn'**
  String get bdOrderInfoTitle;

  /// No description provided for @bdRowCode.
  ///
  /// In vi, this message translates to:
  /// **'Mã đơn'**
  String get bdRowCode;

  /// No description provided for @bdRowTour.
  ///
  /// In vi, this message translates to:
  /// **'Tour'**
  String get bdRowTour;

  /// No description provided for @bdRowExperienceCount.
  ///
  /// In vi, this message translates to:
  /// **'Số trải nghiệm'**
  String get bdRowExperienceCount;

  /// No description provided for @bdRowPaidAt.
  ///
  /// In vi, this message translates to:
  /// **'Thanh toán lúc'**
  String get bdRowPaidAt;

  /// No description provided for @bdRowBookedAt.
  ///
  /// In vi, this message translates to:
  /// **'Đặt lúc'**
  String get bdRowBookedAt;

  /// No description provided for @bdRowDeadline.
  ///
  /// In vi, this message translates to:
  /// **'Hạn thanh toán'**
  String get bdRowDeadline;

  /// No description provided for @bdRowCancelReason.
  ///
  /// In vi, this message translates to:
  /// **'Lý do hủy'**
  String get bdRowCancelReason;

  /// No description provided for @bdPassengersTitle.
  ///
  /// In vi, this message translates to:
  /// **'Hành khách trong nhóm'**
  String get bdPassengersTitle;

  /// No description provided for @bdPeopleCount.
  ///
  /// In vi, this message translates to:
  /// **'{count} người'**
  String bdPeopleCount(int count);

  /// No description provided for @bdPassengersHint.
  ///
  /// In vi, this message translates to:
  /// **'Số người tham gia đã nhập khi đặt tour.'**
  String get bdPassengersHint;

  /// No description provided for @bdInviteHint.
  ///
  /// In vi, this message translates to:
  /// **'Gửi lời mời để hành khách tạo tài khoản JourneyGo và xem tour cùng nhóm. Lời mời hết hạn sau 24 giờ.'**
  String get bdInviteHint;

  /// No description provided for @bdBookerTag.
  ///
  /// In vi, this message translates to:
  /// **'Người đặt'**
  String get bdBookerTag;

  /// No description provided for @bdResendInvite.
  ///
  /// In vi, this message translates to:
  /// **'Gửi lại lời mời'**
  String get bdResendInvite;

  /// No description provided for @bdInvite.
  ///
  /// In vi, this message translates to:
  /// **'Mời tham gia'**
  String get bdInvite;

  /// No description provided for @bdAge.
  ///
  /// In vi, this message translates to:
  /// **'{age} tuổi'**
  String bdAge(int age);

  /// No description provided for @bdInfoHidden.
  ///
  /// In vi, this message translates to:
  /// **'Thông tin cá nhân được ẩn'**
  String get bdInfoHidden;

  /// No description provided for @bdNoEmail.
  ///
  /// In vi, this message translates to:
  /// **'Chưa có email'**
  String get bdNoEmail;

  /// No description provided for @bdInviteSent.
  ///
  /// In vi, this message translates to:
  /// **'Đã gửi lời mời tới {email}'**
  String bdInviteSent(String email);

  /// No description provided for @bdInviteEmailTitle.
  ///
  /// In vi, this message translates to:
  /// **'Nhập email người được mời'**
  String get bdInviteEmailTitle;

  /// No description provided for @bdEmailExample.
  ///
  /// In vi, this message translates to:
  /// **'vidu@gmail.com'**
  String get bdEmailExample;

  /// No description provided for @bdSendInvite.
  ///
  /// In vi, this message translates to:
  /// **'Gửi lời mời'**
  String get bdSendInvite;

  /// No description provided for @bdPaymentHistory.
  ///
  /// In vi, this message translates to:
  /// **'Lịch sử thanh toán'**
  String get bdPaymentHistory;

  /// No description provided for @bdNoPayments.
  ///
  /// In vi, this message translates to:
  /// **'Chưa có giao dịch thanh toán nào.'**
  String get bdNoPayments;

  /// No description provided for @bdRefundEntryTitle.
  ///
  /// In vi, this message translates to:
  /// **'Hủy chuyến & hoàn tiền'**
  String get bdRefundEntryTitle;

  /// No description provided for @bdRefundEntryHint.
  ///
  /// In vi, this message translates to:
  /// **'Gửi yêu cầu trước ngày khởi hành'**
  String get bdRefundEntryHint;

  /// No description provided for @bdRefundEntryHintDate.
  ///
  /// In vi, this message translates to:
  /// **'Gửi yêu cầu trước ngày {date}'**
  String bdRefundEntryHintDate(String date);

  /// No description provided for @bdRefundRequests.
  ///
  /// In vi, this message translates to:
  /// **'Yêu cầu hoàn tiền'**
  String get bdRefundRequests;

  /// No description provided for @bdRefundProcessingDetail.
  ///
  /// In vi, this message translates to:
  /// **'Yêu cầu {code} đang được xử lý. Bạn có thể theo dõi từng bước trong \"Lịch sử xử lý hoàn tiền\" bên dưới.'**
  String bdRefundProcessingDetail(String code);

  /// No description provided for @bdRefundDoneDetail.
  ///
  /// In vi, this message translates to:
  /// **'Yêu cầu {code} đã được xử lý: {status}.'**
  String bdRefundDoneDetail(String code, String status);

  /// No description provided for @bdAuditTitle.
  ///
  /// In vi, this message translates to:
  /// **'Lịch sử xử lý hoàn tiền'**
  String get bdAuditTitle;

  /// No description provided for @bdAuditHint.
  ///
  /// In vi, this message translates to:
  /// **'Các bước xử lý được ghi nhận theo thứ tự thời gian — cũ nhất ở trên, mới nhất ở dưới.'**
  String get bdAuditHint;

  /// No description provided for @bdRefundNumber.
  ///
  /// In vi, this message translates to:
  /// **'Yêu cầu #{id}'**
  String bdRefundNumber(int id);

  /// No description provided for @bdTransactionAt.
  ///
  /// In vi, this message translates to:
  /// **'Giao dịch {time}'**
  String bdTransactionAt(String time);

  /// No description provided for @bdStuckHint.
  ///
  /// In vi, this message translates to:
  /// **'Chưa nhận được xác nhận từ VNPay. Nếu bạn đã thanh toán, hãy kiểm tra lại.'**
  String get bdStuckHint;

  /// No description provided for @bdChecking.
  ///
  /// In vi, this message translates to:
  /// **'Đang kiểm tra'**
  String get bdChecking;

  /// No description provided for @bdRefundAwaitingTriage.
  ///
  /// In vi, this message translates to:
  /// **'{status} • Chờ quản trị viên phân loại'**
  String bdRefundAwaitingTriage(String status);

  /// No description provided for @bdAwaitingTriage.
  ///
  /// In vi, this message translates to:
  /// **'Chờ phân loại'**
  String get bdAwaitingTriage;

  /// No description provided for @bdHintConfirmed.
  ///
  /// In vi, this message translates to:
  /// **'Thanh toán thành công — chỗ của bạn đã được xác nhận.'**
  String get bdHintConfirmed;

  /// No description provided for @bdHintCompleted.
  ///
  /// In vi, this message translates to:
  /// **'Bạn đã hoàn thành trải nghiệm. Cảm ơn bạn đã đồng hành!'**
  String get bdHintCompleted;

  /// No description provided for @bdHintPending.
  ///
  /// In vi, this message translates to:
  /// **'Đơn đang chờ thanh toán — hãy hoàn tất trong hạn 10 phút.'**
  String get bdHintPending;

  /// No description provided for @bdHintCancelled.
  ///
  /// In vi, this message translates to:
  /// **'Đơn đã được hủy và chỗ đã được trả lại.'**
  String get bdHintCancelled;

  /// No description provided for @auditCreated.
  ///
  /// In vi, this message translates to:
  /// **'Đã gửi yêu cầu hoàn tiền'**
  String get auditCreated;

  /// No description provided for @auditApproved.
  ///
  /// In vi, this message translates to:
  /// **'Quản trị viên đã duyệt yêu cầu'**
  String get auditApproved;

  /// No description provided for @auditRejected.
  ///
  /// In vi, this message translates to:
  /// **'Yêu cầu bị từ chối'**
  String get auditRejected;

  /// No description provided for @auditCancelled.
  ///
  /// In vi, this message translates to:
  /// **'Yêu cầu đã được hủy'**
  String get auditCancelled;

  /// No description provided for @auditVnpaySent.
  ///
  /// In vi, this message translates to:
  /// **'Đã gửi yêu cầu hoàn tiền tới VNPay'**
  String get auditVnpaySent;

  /// No description provided for @auditVnpayResponse.
  ///
  /// In vi, this message translates to:
  /// **'VNPay phản hồi kết quả hoàn tiền'**
  String get auditVnpayResponse;

  /// No description provided for @auditManualRecorded.
  ///
  /// In vi, this message translates to:
  /// **'Đã ghi nhận chuyển khoản thủ công'**
  String get auditManualRecorded;

  /// No description provided for @auditManualConfirmed.
  ///
  /// In vi, this message translates to:
  /// **'Đã xác nhận chuyển khoản — hoàn tiền thành công'**
  String get auditManualConfirmed;

  /// No description provided for @auditStatusUpdated.
  ///
  /// In vi, this message translates to:
  /// **'Cập nhật trạng thái yêu cầu'**
  String get auditStatusUpdated;

  /// No description provided for @auditOther.
  ///
  /// In vi, this message translates to:
  /// **'Cập nhật yêu cầu hoàn tiền'**
  String get auditOther;

  /// No description provided for @holdReleased.
  ///
  /// In vi, this message translates to:
  /// **'Đã trả lại'**
  String get holdReleased;

  /// No description provided for @holdFreed.
  ///
  /// In vi, this message translates to:
  /// **'Đã giải phóng'**
  String get holdFreed;

  /// No description provided for @holdHolding.
  ///
  /// In vi, this message translates to:
  /// **'Đang giữ chỗ'**
  String get holdHolding;

  /// No description provided for @refundToneRefunded.
  ///
  /// In vi, this message translates to:
  /// **'Đã hoàn tiền'**
  String get refundToneRefunded;

  /// No description provided for @refundToneRejected.
  ///
  /// In vi, this message translates to:
  /// **'Từ chối'**
  String get refundToneRejected;

  /// No description provided for @rfPolicyCustomer.
  ///
  /// In vi, this message translates to:
  /// **'Lỗi từ khách hàng (Hủy tour)'**
  String get rfPolicyCustomer;

  /// No description provided for @rfCancelBefore.
  ///
  /// In vi, this message translates to:
  /// **'Hủy trước {days} ngày'**
  String rfCancelBefore(int days);

  /// No description provided for @rfRefundPercent.
  ///
  /// In vi, this message translates to:
  /// **'Hoàn {percent}%'**
  String rfRefundPercent(int percent);

  /// No description provided for @rfCancelWithin.
  ///
  /// In vi, this message translates to:
  /// **'Hủy trong vòng {hours} giờ / Không đến (theo lịch trình)'**
  String rfCancelWithin(int hours);

  /// No description provided for @rfPolicyPlatform.
  ///
  /// In vi, this message translates to:
  /// **'Lỗi hệ thống / Đối tác'**
  String get rfPolicyPlatform;

  /// No description provided for @rfPolicyPlatformLine.
  ///
  /// In vi, this message translates to:
  /// **'Lỗi không mở khóa được trải nghiệm, đối tác không tổ chức...'**
  String get rfPolicyPlatformLine;

  /// No description provided for @rfPolicyForceMajeure.
  ///
  /// In vi, this message translates to:
  /// **'Bất khả kháng'**
  String get rfPolicyForceMajeure;

  /// No description provided for @rfPolicyForceMajeureLine.
  ///
  /// In vi, this message translates to:
  /// **'Thiên tai, dịch bệnh,...'**
  String get rfPolicyForceMajeureLine;

  /// No description provided for @rfMaxFiles.
  ///
  /// In vi, this message translates to:
  /// **'Mỗi yêu cầu chỉ đính kèm tối đa {max} tệp.'**
  String rfMaxFiles(int max);

  /// No description provided for @rfGalleryFailed.
  ///
  /// In vi, this message translates to:
  /// **'Không thể mở thư viện ảnh.'**
  String get rfGalleryFailed;

  /// No description provided for @rfVideoFailed.
  ///
  /// In vi, this message translates to:
  /// **'Không thể chọn video.'**
  String get rfVideoFailed;

  /// No description provided for @rfUploadFailed.
  ///
  /// In vi, this message translates to:
  /// **'Không tải được toàn bộ bằng chứng lên máy chủ. Vui lòng thử lại.'**
  String get rfUploadFailed;

  /// No description provided for @rfSubmitFailed.
  ///
  /// In vi, this message translates to:
  /// **'Không thể gửi yêu cầu hoàn tiền. Vui lòng thử lại.'**
  String get rfSubmitFailed;

  /// No description provided for @rfErrSummary.
  ///
  /// In vi, this message translates to:
  /// **'Vui lòng nhập lý do ngắn gọn.'**
  String get rfErrSummary;

  /// No description provided for @rfErrDetail.
  ///
  /// In vi, this message translates to:
  /// **'Vui lòng tường thuật chi tiết sự cố hoặc lý do không thể tham gia.'**
  String get rfErrDetail;

  /// No description provided for @rfErrBank.
  ///
  /// In vi, this message translates to:
  /// **'Vui lòng điền đầy đủ thông tin tài khoản nhận tiền.'**
  String get rfErrBank;

  /// No description provided for @rfErrContact.
  ///
  /// In vi, this message translates to:
  /// **'Vui lòng điền đầy đủ thông tin liên hệ.'**
  String get rfErrContact;

  /// No description provided for @rfErrReceipt.
  ///
  /// In vi, this message translates to:
  /// **'Vui lòng tải lên ảnh chụp biên lai giao dịch thành công (bắt buộc để quản trị viên đối chiếu).'**
  String get rfErrReceipt;

  /// No description provided for @rfErrAgree.
  ///
  /// In vi, this message translates to:
  /// **'Vui lòng xác nhận cam đoan thông tin và bằng chứng.'**
  String get rfErrAgree;

  /// No description provided for @rfErrGeneric.
  ///
  /// In vi, this message translates to:
  /// **'Vui lòng kiểm tra lại thông tin đã nhập.'**
  String get rfErrGeneric;

  /// No description provided for @rfSentTitle.
  ///
  /// In vi, this message translates to:
  /// **'Đã Gửi Yêu Cầu Hoàn Tiền'**
  String get rfSentTitle;

  /// No description provided for @rfSentDetail.
  ///
  /// In vi, this message translates to:
  /// **'Mã yêu cầu: {code}\nTrạng thái: {status}'**
  String rfSentDetail(String code, String status);

  /// No description provided for @rfGotIt.
  ///
  /// In vi, this message translates to:
  /// **'Đã hiểu'**
  String get rfGotIt;

  /// No description provided for @rfTitle.
  ///
  /// In vi, this message translates to:
  /// **'Yêu Cầu Hoàn Tiền'**
  String get rfTitle;

  /// No description provided for @rfFooterNote.
  ///
  /// In vi, this message translates to:
  /// **'Yêu cầu sẽ được quản trị viên xem xét và đối chiếu bằng chứng. Số tiền thực nhận, tỷ lệ hoàn và phương thức hoàn sẽ được thông báo sau khi phê duyệt.'**
  String get rfFooterNote;

  /// No description provided for @rfOrder.
  ///
  /// In vi, this message translates to:
  /// **'Đơn hàng'**
  String get rfOrder;

  /// No description provided for @rfPaidBooking.
  ///
  /// In vi, this message translates to:
  /// **'Đơn đã thanh toán'**
  String get rfPaidBooking;

  /// No description provided for @rfAmountPaid.
  ///
  /// In vi, this message translates to:
  /// **'Số tiền đã thanh toán'**
  String get rfAmountPaid;

  /// No description provided for @rfPaidDate.
  ///
  /// In vi, this message translates to:
  /// **'Ngày thanh toán'**
  String get rfPaidDate;

  /// No description provided for @rfPolicyTitle.
  ///
  /// In vi, this message translates to:
  /// **'Chính sách Hoàn Tiền'**
  String get rfPolicyTitle;

  /// No description provided for @rfReasonTitle.
  ///
  /// In vi, this message translates to:
  /// **'Lý do hoàn tiền'**
  String get rfReasonTitle;

  /// No description provided for @rfReasonHint.
  ///
  /// In vi, this message translates to:
  /// **'Quản trị viên sẽ đọc nội dung này để đối chiếu và quyết định mức hoàn.'**
  String get rfReasonHint;

  /// No description provided for @rfSummaryHint.
  ///
  /// In vi, this message translates to:
  /// **'Nhập lý do ngắn gọn (VD: Bị ốm đột xuất,....)'**
  String get rfSummaryHint;

  /// No description provided for @rfDetailHint.
  ///
  /// In vi, this message translates to:
  /// **'Vui lòng tường thuật chi tiết sự cố bạn gặp phải hoặc lý do không thể tham gia để admin hỗ trợ tốt nhất'**
  String get rfDetailHint;

  /// No description provided for @rfEvidenceTitle.
  ///
  /// In vi, this message translates to:
  /// **'Đính kèm bằng chứng'**
  String get rfEvidenceTitle;

  /// No description provided for @rfEvidenceTypes.
  ///
  /// In vi, this message translates to:
  /// **'(Ảnh/Video/Giấy tờ)'**
  String get rfEvidenceTypes;

  /// No description provided for @rfEvidenceExamples.
  ///
  /// In vi, this message translates to:
  /// **'Giấy khám bệnh, hình ảnh sự cố, ảnh chụp màn hình lỗi ứng dụng, v.v.'**
  String get rfEvidenceExamples;

  /// No description provided for @rfReceiptRequired.
  ///
  /// In vi, this message translates to:
  /// **'Bắt buộc: ảnh chụp biên lai giao dịch thành công'**
  String get rfReceiptRequired;

  /// No description provided for @rfReceiptHint.
  ///
  /// In vi, this message translates to:
  /// **'Hãy chụp màn hình biên lai VNPay hiển thị \"Giao dịch thành công\" rồi bấm \"Thêm ảnh\" bên dưới. Không có ảnh, yêu cầu sẽ không được gửi.'**
  String get rfReceiptHint;

  /// No description provided for @rfAddPhoto.
  ///
  /// In vi, this message translates to:
  /// **'Thêm ảnh'**
  String get rfAddPhoto;

  /// No description provided for @rfAddVideo.
  ///
  /// In vi, this message translates to:
  /// **'Thêm video'**
  String get rfAddVideo;

  /// No description provided for @rfUploadError.
  ///
  /// In vi, this message translates to:
  /// **'Lỗi tải lên'**
  String get rfUploadError;

  /// No description provided for @rfBankTitle.
  ///
  /// In vi, this message translates to:
  /// **'Tài khoản nhận tiền'**
  String get rfBankTitle;

  /// No description provided for @rfBankHint.
  ///
  /// In vi, this message translates to:
  /// **'Cung cấp để hỗ trợ hoàn tiền bằng phương thức thủ công nếu cần.'**
  String get rfBankHint;

  /// No description provided for @rfAccountNumber.
  ///
  /// In vi, this message translates to:
  /// **'Số tài khoản'**
  String get rfAccountNumber;

  /// No description provided for @rfAccountName.
  ///
  /// In vi, this message translates to:
  /// **'Tên chủ tài khoản'**
  String get rfAccountName;

  /// No description provided for @rfBank.
  ///
  /// In vi, this message translates to:
  /// **'Ngân hàng'**
  String get rfBank;

  /// No description provided for @rfContactTitle.
  ///
  /// In vi, this message translates to:
  /// **'Thông tin liên hệ'**
  String get rfContactTitle;

  /// No description provided for @rfPhone.
  ///
  /// In vi, this message translates to:
  /// **'Số điện thoại'**
  String get rfPhone;

  /// No description provided for @rfBackupEmail.
  ///
  /// In vi, this message translates to:
  /// **'Email dự phòng'**
  String get rfBackupEmail;

  /// No description provided for @rfAgreement.
  ///
  /// In vi, this message translates to:
  /// **'Tôi cam đoan các thông tin và bằng chứng cung cấp là sự thật, đồng thời đã đọc và hiểu rõ chính sách hoàn tiền.'**
  String get rfAgreement;

  /// No description provided for @rfSending.
  ///
  /// In vi, this message translates to:
  /// **'Đang gửi...'**
  String get rfSending;

  /// No description provided for @rfSubmit.
  ///
  /// In vi, this message translates to:
  /// **'Gửi yêu cầu hoàn tiền'**
  String get rfSubmit;

  /// No description provided for @rhLoadFailed.
  ///
  /// In vi, this message translates to:
  /// **'Không thể tải lịch sử hoàn tiền.'**
  String get rhLoadFailed;

  /// No description provided for @rhAwaitingAdminTriage.
  ///
  /// In vi, this message translates to:
  /// **'Chờ quản trị viên phân loại'**
  String get rhAwaitingAdminTriage;

  /// No description provided for @rhTitle.
  ///
  /// In vi, this message translates to:
  /// **'Lịch Sử Hoàn Tiền'**
  String get rhTitle;

  /// No description provided for @rhEmpty.
  ///
  /// In vi, this message translates to:
  /// **'Chưa có yêu cầu hoàn tiền nào'**
  String get rhEmpty;

  /// No description provided for @rhMyBooking.
  ///
  /// In vi, this message translates to:
  /// **'Đơn của tôi'**
  String get rhMyBooking;

  /// No description provided for @rhNoRefund.
  ///
  /// In vi, this message translates to:
  /// **'Không hoàn tiền'**
  String get rhNoRefund;

  /// No description provided for @rhAwaitingAdmin.
  ///
  /// In vi, this message translates to:
  /// **'Chờ quản trị viên xử lý'**
  String get rhAwaitingAdmin;

  /// No description provided for @rhNotRefunded.
  ///
  /// In vi, this message translates to:
  /// **'Không được hoàn'**
  String get rhNotRefunded;

  /// No description provided for @rhRejectReason.
  ///
  /// In vi, this message translates to:
  /// **'Lý do từ chối: {reason}'**
  String rhRejectReason(String reason);

  /// No description provided for @rhMethod.
  ///
  /// In vi, this message translates to:
  /// **'Phương thức: {method}'**
  String rhMethod(String method);

  /// No description provided for @rhEvidenceLoadFailed.
  ///
  /// In vi, this message translates to:
  /// **'Không tải được bằng chứng'**
  String get rhEvidenceLoadFailed;

  /// No description provided for @rhFilterPending.
  ///
  /// In vi, this message translates to:
  /// **'Chờ xử lý'**
  String get rhFilterPending;

  /// No description provided for @rhFilterRefunded.
  ///
  /// In vi, this message translates to:
  /// **'Đã hoàn'**
  String get rhFilterRefunded;

  /// No description provided for @rsTitle.
  ///
  /// In vi, this message translates to:
  /// **'Hỗ trợ & Hoàn tiền'**
  String get rsTitle;

  /// No description provided for @rsLoadFailed.
  ///
  /// In vi, this message translates to:
  /// **'Không tải được yêu cầu hoàn tiền'**
  String get rsLoadFailed;

  /// No description provided for @rsEmptyTitle.
  ///
  /// In vi, this message translates to:
  /// **'Chưa có yêu cầu hoàn tiền'**
  String get rsEmptyTitle;

  /// No description provided for @rsEmptyMessage.
  ///
  /// In vi, this message translates to:
  /// **'Các yêu cầu hoàn tiền vé của bạn và tiến độ xử lý sẽ hiển thị tại đây.'**
  String get rsEmptyMessage;

  /// No description provided for @rsBookingNumber.
  ///
  /// In vi, this message translates to:
  /// **'Đơn #{id}'**
  String rsBookingNumber(String id);

  /// No description provided for @rsSentAt.
  ///
  /// In vi, this message translates to:
  /// **'Gửi lúc {time}'**
  String rsSentAt(String time);

  /// No description provided for @rsApprovedAmount.
  ///
  /// In vi, this message translates to:
  /// **'Số tiền được duyệt'**
  String get rsApprovedAmount;

  /// No description provided for @rsProposedAmount.
  ///
  /// In vi, this message translates to:
  /// **'Số tiền đề xuất'**
  String get rsProposedAmount;

  /// No description provided for @rsAmount.
  ///
  /// In vi, this message translates to:
  /// **'Số tiền'**
  String get rsAmount;

  /// No description provided for @refundStatusPendingReview.
  ///
  /// In vi, this message translates to:
  /// **'Chờ duyệt'**
  String get refundStatusPendingReview;

  /// No description provided for @refundStatusApproved.
  ///
  /// In vi, this message translates to:
  /// **'Đã duyệt'**
  String get refundStatusApproved;

  /// No description provided for @refundStatusVnpay.
  ///
  /// In vi, this message translates to:
  /// **'Chờ VNPay xác nhận hoàn tiền'**
  String get refundStatusVnpay;

  /// No description provided for @refundStatusProcessing.
  ///
  /// In vi, this message translates to:
  /// **'Đang hoàn tiền'**
  String get refundStatusProcessing;

  /// No description provided for @refundStatusManual.
  ///
  /// In vi, this message translates to:
  /// **'Chờ chuyển khoản thủ công'**
  String get refundStatusManual;

  /// No description provided for @refundStatusRejected.
  ///
  /// In vi, this message translates to:
  /// **'Bị từ chối'**
  String get refundStatusRejected;

  /// No description provided for @refundStatusRejected2.
  ///
  /// In vi, this message translates to:
  /// **'Đã từ chối'**
  String get refundStatusRejected2;

  /// No description provided for @refundStatusFailed.
  ///
  /// In vi, this message translates to:
  /// **'Hoàn tiền lỗi'**
  String get refundStatusFailed;

  /// No description provided for @refundReasonCustomer.
  ///
  /// In vi, this message translates to:
  /// **'Lỗi khách hàng'**
  String get refundReasonCustomer;

  /// No description provided for @refundReasonPlatform.
  ///
  /// In vi, this message translates to:
  /// **'Lỗi nền tảng'**
  String get refundReasonPlatform;

  /// No description provided for @refundReasonProvider.
  ///
  /// In vi, this message translates to:
  /// **'Lỗi đối tác'**
  String get refundReasonProvider;

  /// No description provided for @refundReasonForceMajeure.
  ///
  /// In vi, this message translates to:
  /// **'Lỗi bất khả kháng'**
  String get refundReasonForceMajeure;

  /// No description provided for @refundReasonOther.
  ///
  /// In vi, this message translates to:
  /// **'Lý do khác'**
  String get refundReasonOther;

  /// No description provided for @refundMethodVnpay.
  ///
  /// In vi, this message translates to:
  /// **'Hoàn qua VNPay'**
  String get refundMethodVnpay;

  /// No description provided for @refundMethodManual.
  ///
  /// In vi, this message translates to:
  /// **'Chuyển khoản thủ công'**
  String get refundMethodManual;

  /// No description provided for @refundMethodUnknown.
  ///
  /// In vi, this message translates to:
  /// **'Chưa xác định'**
  String get refundMethodUnknown;

  /// No description provided for @rfOtherBank.
  ///
  /// In vi, this message translates to:
  /// **'Khác (ghi rõ tên ngân hàng)'**
  String get rfOtherBank;

  /// No description provided for @invLoadFailed.
  ///
  /// In vi, this message translates to:
  /// **'Không thể tải thông tin lời mời. Vui lòng thử lại.'**
  String get invLoadFailed;

  /// No description provided for @invLoginWithEmail.
  ///
  /// In vi, this message translates to:
  /// **'Vui lòng đăng nhập bằng email {email} để xác nhận lời mời.'**
  String invLoginWithEmail(String email);

  /// No description provided for @invConfirmFailed.
  ///
  /// In vi, this message translates to:
  /// **'Không thể xác nhận lời mời. Vui lòng thử lại.'**
  String get invConfirmFailed;

  /// No description provided for @invStatusPending.
  ///
  /// In vi, this message translates to:
  /// **'Chờ xác nhận'**
  String get invStatusPending;

  /// No description provided for @invStatusRevoked.
  ///
  /// In vi, this message translates to:
  /// **'Đã bị thu hồi'**
  String get invStatusRevoked;

  /// No description provided for @invTitle.
  ///
  /// In vi, this message translates to:
  /// **'Lời mời tham gia tour'**
  String get invTitle;

  /// No description provided for @invJoined.
  ///
  /// In vi, this message translates to:
  /// **'Bạn đã tham gia tour!'**
  String get invJoined;

  /// No description provided for @invNoLongerValid.
  ///
  /// In vi, this message translates to:
  /// **'Lời mời không còn hiệu lực'**
  String get invNoLongerValid;

  /// No description provided for @invInvited.
  ///
  /// In vi, this message translates to:
  /// **'Bạn được mời tham gia tour'**
  String get invInvited;

  /// No description provided for @invLinked.
  ///
  /// In vi, this message translates to:
  /// **'Hành khách đã được liên kết với đơn đặt tour.'**
  String get invLinked;

  /// No description provided for @invExpiredHint.
  ///
  /// In vi, this message translates to:
  /// **'Lời mời đã hết hạn hoặc bị thu hồi. Vui lòng liên hệ người đặt tour để được gửi lại.'**
  String get invExpiredHint;

  /// No description provided for @invConfirmHint.
  ///
  /// In vi, this message translates to:
  /// **'Xác nhận lời mời để được cấp quyền tham gia tour cùng nhóm.'**
  String get invConfirmHint;

  /// No description provided for @invInfoTitle.
  ///
  /// In vi, this message translates to:
  /// **'THÔNG TIN LỜI MỜI'**
  String get invInfoTitle;

  /// No description provided for @invPassenger.
  ///
  /// In vi, this message translates to:
  /// **'Hành khách'**
  String get invPassenger;

  /// No description provided for @invInvitedEmail.
  ///
  /// In vi, this message translates to:
  /// **'Email được mời'**
  String get invInvitedEmail;

  /// No description provided for @invValidUntil.
  ///
  /// In vi, this message translates to:
  /// **'Hiệu lực đến'**
  String get invValidUntil;

  /// No description provided for @invStatus.
  ///
  /// In vi, this message translates to:
  /// **'Trạng thái'**
  String get invStatus;

  /// No description provided for @invConfirming.
  ///
  /// In vi, this message translates to:
  /// **'Đang xác nhận...'**
  String get invConfirming;

  /// No description provided for @invConfirmJoin.
  ///
  /// In vi, this message translates to:
  /// **'Xác nhận tham gia'**
  String get invConfirmJoin;

  /// No description provided for @invLoginToConfirm.
  ///
  /// In vi, this message translates to:
  /// **'Đăng nhập để xác nhận'**
  String get invLoginToConfirm;

  /// No description provided for @invNotFound.
  ///
  /// In vi, this message translates to:
  /// **'Không tìm thấy lời mời'**
  String get invNotFound;

  /// No description provided for @invNotFoundHint.
  ///
  /// In vi, this message translates to:
  /// **'Lời mời không tồn tại hoặc đã hết hạn.'**
  String get invNotFoundHint;

  /// No description provided for @invListLoadFailed.
  ///
  /// In vi, this message translates to:
  /// **'Không tải được danh sách lời mời. Vui lòng thử lại.'**
  String get invListLoadFailed;

  /// No description provided for @invConfirmFailed2.
  ///
  /// In vi, this message translates to:
  /// **'Không xác nhận được lời mời. Vui lòng thử lại.'**
  String get invConfirmFailed2;

  /// No description provided for @invInviterFallback.
  ///
  /// In vi, this message translates to:
  /// **'Người đặt tour'**
  String get invInviterFallback;

  /// No description provided for @invInvitedBy.
  ///
  /// In vi, this message translates to:
  /// **'{inviter} đã mời bạn vào tour {tour}. Xác nhận lời mời để được cấp quyền tham gia tour cùng nhóm.'**
  String invInvitedBy(String inviter, String tour);

  /// No description provided for @invJoinedDetail.
  ///
  /// In vi, this message translates to:
  /// **'Hành khách đã được liên kết với đơn đặt tour. Bạn có thể xem chi tiết booking và truy cập tour.'**
  String get invJoinedDetail;

  /// No description provided for @invNoneLeft.
  ///
  /// In vi, this message translates to:
  /// **'Không còn lời mời nào'**
  String get invNoneLeft;

  /// No description provided for @invNoneLeftHint.
  ///
  /// In vi, this message translates to:
  /// **'Bạn không có lời mời tham gia tour nào đang chờ xác nhận.'**
  String get invNoneLeftHint;

  /// No description provided for @invLoginSnack.
  ///
  /// In vi, this message translates to:
  /// **'Bạn được mời tham gia tour. Vui lòng đăng nhập để xác nhận lời mời.'**
  String get invLoginSnack;

  /// No description provided for @invTagSent.
  ///
  /// In vi, this message translates to:
  /// **'Đã gửi lời mời'**
  String get invTagSent;

  /// No description provided for @invTagJoined.
  ///
  /// In vi, this message translates to:
  /// **'Đã tham gia'**
  String get invTagJoined;

  /// No description provided for @invTagExpired.
  ///
  /// In vi, this message translates to:
  /// **'Lời mời đã hết hạn'**
  String get invTagExpired;

  /// No description provided for @invTagRevoked.
  ///
  /// In vi, this message translates to:
  /// **'Lời mời đã hủy'**
  String get invTagRevoked;

  /// No description provided for @tripsTitle.
  ///
  /// In vi, this message translates to:
  /// **'Chuyến đi của tôi'**
  String get tripsTitle;

  /// No description provided for @tripsSubtitle.
  ///
  /// In vi, this message translates to:
  /// **'Vé đã mua, hành trình đang đi và đã hoàn thành'**
  String get tripsSubtitle;

  /// No description provided for @tripsLoadFailed.
  ///
  /// In vi, this message translates to:
  /// **'Không tải được chuyến đi của bạn'**
  String get tripsLoadFailed;

  /// No description provided for @tripsEmptySection.
  ///
  /// In vi, this message translates to:
  /// **'Chưa có chuyến đi nào ở mục này.'**
  String get tripsEmptySection;

  /// No description provided for @tripsStageActive.
  ///
  /// In vi, this message translates to:
  /// **'Đang diễn ra'**
  String get tripsStageActive;

  /// No description provided for @tripsStageReady.
  ///
  /// In vi, this message translates to:
  /// **'Sắp khởi hành'**
  String get tripsStageReady;

  /// No description provided for @tripsLive.
  ///
  /// In vi, this message translates to:
  /// **'Trực tiếp'**
  String get tripsLive;

  /// No description provided for @tripsEmptyTitle.
  ///
  /// In vi, this message translates to:
  /// **'Bạn chưa có chuyến đi nào'**
  String get tripsEmptyTitle;

  /// No description provided for @tripsEmptyMessage.
  ///
  /// In vi, this message translates to:
  /// **'Đặt một tour ở trang Khám phá, vé sẽ nằm tại đây để bạn bắt đầu hành trình khi đến nơi.'**
  String get tripsEmptyMessage;

  /// No description provided for @tripsExplore.
  ///
  /// In vi, this message translates to:
  /// **'Khám phá tour'**
  String get tripsExplore;

  /// No description provided for @tripsFilterActive.
  ///
  /// In vi, this message translates to:
  /// **'Đang đi'**
  String get tripsFilterActive;

  /// No description provided for @tripsFilterReady.
  ///
  /// In vi, this message translates to:
  /// **'Sắp tới'**
  String get tripsFilterReady;

  /// No description provided for @tripsFilterDone.
  ///
  /// In vi, this message translates to:
  /// **'Đã xong'**
  String get tripsFilterDone;

  /// No description provided for @tripsExperiencing.
  ///
  /// In vi, this message translates to:
  /// **'Đang trải nghiệm'**
  String get tripsExperiencing;

  /// No description provided for @tripsStopProgress.
  ///
  /// In vi, this message translates to:
  /// **'Trạm {current}/{total}'**
  String tripsStopProgress(int current, int total);

  /// No description provided for @tripsStopsCheckedIn.
  ///
  /// In vi, this message translates to:
  /// **' trạm đã check-in'**
  String get tripsStopsCheckedIn;

  /// No description provided for @tripsDestinations.
  ///
  /// In vi, this message translates to:
  /// **'{count} điểm đến'**
  String tripsDestinations(int count);

  /// No description provided for @tripsTicketDetails.
  ///
  /// In vi, this message translates to:
  /// **'Chi tiết vé'**
  String get tripsTicketDetails;

  /// No description provided for @tripsViewItinerary.
  ///
  /// In vi, this message translates to:
  /// **'Xem lịch trình'**
  String get tripsViewItinerary;

  /// No description provided for @tripsStart.
  ///
  /// In vi, this message translates to:
  /// **'Bắt đầu'**
  String get tripsStart;

  /// No description provided for @tripsToday.
  ///
  /// In vi, this message translates to:
  /// **'Hôm nay'**
  String get tripsToday;

  /// No description provided for @tripsTomorrow.
  ///
  /// In vi, this message translates to:
  /// **'Ngày mai'**
  String get tripsTomorrow;

  /// No description provided for @tripsDaysLeft.
  ///
  /// In vi, this message translates to:
  /// **'Còn {days} ngày'**
  String tripsDaysLeft(int days);

  /// No description provided for @tripsCodeSemantics.
  ///
  /// In vi, this message translates to:
  /// **'Mã vé {code}, chạm để sao chép'**
  String tripsCodeSemantics(String code);

  /// No description provided for @tripsCodeCopied.
  ///
  /// In vi, this message translates to:
  /// **'Đã sao chép mã vé {code}'**
  String tripsCodeCopied(String code);

  /// No description provided for @tripsTicketCode.
  ///
  /// In vi, this message translates to:
  /// **'Mã vé'**
  String get tripsTicketCode;

  /// No description provided for @calLoadFailed.
  ///
  /// In vi, this message translates to:
  /// **'Không tải được lịch khởi hành.'**
  String get calLoadFailed;

  /// No description provided for @calTitle.
  ///
  /// In vi, this message translates to:
  /// **'Xem tour theo ngày'**
  String get calTitle;

  /// No description provided for @calLoadFailedTitle.
  ///
  /// In vi, this message translates to:
  /// **'Không tải được lịch'**
  String get calLoadFailedTitle;

  /// No description provided for @calPrevMonth.
  ///
  /// In vi, this message translates to:
  /// **'Tháng trước'**
  String get calPrevMonth;

  /// No description provided for @calNextMonth.
  ///
  /// In vi, this message translates to:
  /// **'Tháng sau'**
  String get calNextMonth;

  /// No description provided for @calNoDepartures.
  ///
  /// In vi, this message translates to:
  /// **'Chưa có lịch khởi hành'**
  String get calNoDepartures;

  /// No description provided for @calDepartureCount.
  ///
  /// In vi, this message translates to:
  /// **'{count} lượt khởi hành'**
  String calDepartureCount(int count);

  /// No description provided for @calDaySemantics.
  ///
  /// In vi, this message translates to:
  /// **'Ngày {date}, {count} tour'**
  String calDaySemantics(String date, int count);

  /// No description provided for @calDaySemanticsNone.
  ///
  /// In vi, this message translates to:
  /// **'Ngày {date}, không có tour'**
  String calDaySemanticsNone(String date);

  /// No description provided for @calNoDeparturesHint.
  ///
  /// In vi, this message translates to:
  /// **'Các tour sẽ hiện ở đây khi đối tác mở ngày khởi hành.'**
  String get calNoDeparturesHint;

  /// No description provided for @authLoginSuccess.
  ///
  /// In vi, this message translates to:
  /// **'Đăng nhập thành công!'**
  String get authLoginSuccess;

  /// No description provided for @authWelcomeBackName.
  ///
  /// In vi, this message translates to:
  /// **'Chào mừng du khách {name} quay trở lại với Di sản Việt Nam.'**
  String authWelcomeBackName(String name);

  /// No description provided for @authSignupSuccess.
  ///
  /// In vi, this message translates to:
  /// **'Khởi tạo tài khoản thành công!'**
  String get authSignupSuccess;

  /// No description provided for @authSignupReward.
  ///
  /// In vi, this message translates to:
  /// **'🎉 Quý khách đã nhận được +100 điểm thưởng khám phá di sản!'**
  String get authSignupReward;

  /// No description provided for @authLoginFailed.
  ///
  /// In vi, this message translates to:
  /// **'Đăng nhập không thành công'**
  String get authLoginFailed;

  /// No description provided for @authSignupFailedMessage.
  ///
  /// In vi, this message translates to:
  /// **'Đăng ký tài khoản không thành công. Vui lòng thử lại.'**
  String get authSignupFailedMessage;

  /// No description provided for @authSignupFailed.
  ///
  /// In vi, this message translates to:
  /// **'Đăng ký không thành công'**
  String get authSignupFailed;

  /// No description provided for @authInvalid.
  ///
  /// In vi, this message translates to:
  /// **'Tài khoản hoặc mật khẩu không hợp lệ!'**
  String get authInvalid;

  /// No description provided for @authAppleUnsupported.
  ///
  /// In vi, this message translates to:
  /// **'Đăng nhập Apple ID hiện chưa hỗ trợ trên Android.'**
  String get authAppleUnsupported;

  /// No description provided for @authWelcomeBack.
  ///
  /// In vi, this message translates to:
  /// **'Chào mừng quý khách quay trở lại với JourneyGo!'**
  String get authWelcomeBack;

  /// No description provided for @authPrivacyTitle.
  ///
  /// In vi, this message translates to:
  /// **'Tiêu chuẩn Di sản số'**
  String get authPrivacyTitle;

  /// No description provided for @authPrivacyBody.
  ///
  /// In vi, this message translates to:
  /// **'Dữ liệu của du khách được mã hóa an toàn theo tiêu chuẩn bảo tồn văn hóa số quốc gia. Chúng tôi cam kết tuyệt đối bảo mật thông tin định danh, lịch sử chuyến đi và tài sản điểm thưởng di sản của quý khách.'**
  String get authPrivacyBody;

  /// No description provided for @authPrivacyAgree.
  ///
  /// In vi, this message translates to:
  /// **'Đã hiểu và đồng ý'**
  String get authPrivacyAgree;

  /// No description provided for @authFullName.
  ///
  /// In vi, this message translates to:
  /// **'Họ và tên'**
  String get authFullName;

  /// No description provided for @authFullNameExample.
  ///
  /// In vi, this message translates to:
  /// **'Nguyễn Văn An'**
  String get authFullNameExample;

  /// No description provided for @authErrNameRequired.
  ///
  /// In vi, this message translates to:
  /// **'Vui lòng nhập họ và tên của quý khách'**
  String get authErrNameRequired;

  /// No description provided for @authErrNameShort.
  ///
  /// In vi, this message translates to:
  /// **'Họ tên quá ngắn'**
  String get authErrNameShort;

  /// No description provided for @authErrEmailRequired.
  ///
  /// In vi, this message translates to:
  /// **'Vui lòng nhập địa chỉ email'**
  String get authErrEmailRequired;

  /// No description provided for @authErrEmailInvalid.
  ///
  /// In vi, this message translates to:
  /// **'Định dạng email chưa hợp lệ'**
  String get authErrEmailInvalid;

  /// No description provided for @authPhone.
  ///
  /// In vi, this message translates to:
  /// **'Số điện thoại'**
  String get authPhone;

  /// No description provided for @authErrPhoneRequired.
  ///
  /// In vi, this message translates to:
  /// **'Vui lòng cung cấp số điện thoại'**
  String get authErrPhoneRequired;

  /// No description provided for @authErrPhoneLength.
  ///
  /// In vi, this message translates to:
  /// **'Số điện thoại gồm 9 - 11 chữ số'**
  String get authErrPhoneLength;

  /// No description provided for @authPassword.
  ///
  /// In vi, this message translates to:
  /// **'Mật khẩu'**
  String get authPassword;

  /// No description provided for @authPasswordHintLogin.
  ///
  /// In vi, this message translates to:
  /// **'Nhập mật khẩu'**
  String get authPasswordHintLogin;

  /// No description provided for @authPasswordHintSignup.
  ///
  /// In vi, this message translates to:
  /// **'Tối thiểu 6 ký tự'**
  String get authPasswordHintSignup;

  /// No description provided for @authErrPasswordRequired.
  ///
  /// In vi, this message translates to:
  /// **'Vui lòng nhập mật khẩu'**
  String get authErrPasswordRequired;

  /// No description provided for @authErrPasswordShort.
  ///
  /// In vi, this message translates to:
  /// **'Mật khẩu phải chứa ít nhất 6 ký tự'**
  String get authErrPasswordShort;

  /// No description provided for @authConfirmPassword.
  ///
  /// In vi, this message translates to:
  /// **'Nhập lại mật khẩu'**
  String get authConfirmPassword;

  /// No description provided for @authConfirmPasswordHint.
  ///
  /// In vi, this message translates to:
  /// **'Nhập lại mật khẩu vừa tạo'**
  String get authConfirmPasswordHint;

  /// No description provided for @authErrConfirmRequired.
  ///
  /// In vi, this message translates to:
  /// **'Vui lòng nhập lại mật khẩu'**
  String get authErrConfirmRequired;

  /// No description provided for @authErrConfirmMismatch.
  ///
  /// In vi, this message translates to:
  /// **'Mật khẩu xác nhận không khớp'**
  String get authErrConfirmMismatch;

  /// No description provided for @authHeaderLogin.
  ///
  /// In vi, this message translates to:
  /// **'Chào mừng trở lại! Đăng nhập để tiếp tục hành trình.'**
  String get authHeaderLogin;

  /// No description provided for @authHeaderSignup.
  ///
  /// In vi, this message translates to:
  /// **'Tạo tài khoản để khám phá di sản và nhận điểm thưởng.'**
  String get authHeaderSignup;

  /// No description provided for @authLogin.
  ///
  /// In vi, this message translates to:
  /// **'Đăng nhập'**
  String get authLogin;

  /// No description provided for @authSignup.
  ///
  /// In vi, this message translates to:
  /// **'Tạo tài khoản'**
  String get authSignup;

  /// No description provided for @authPromoPrefix.
  ///
  /// In vi, this message translates to:
  /// **'Nhận ngay '**
  String get authPromoPrefix;

  /// No description provided for @authPromoPoints.
  ///
  /// In vi, this message translates to:
  /// **'+100 điểm thưởng '**
  String get authPromoPoints;

  /// No description provided for @authPromoSuffix.
  ///
  /// In vi, this message translates to:
  /// **'khám phá di sản khi tạo tài khoản mới!'**
  String get authPromoSuffix;

  /// No description provided for @authRemember.
  ///
  /// In vi, this message translates to:
  /// **'Ghi nhớ đăng nhập'**
  String get authRemember;

  /// No description provided for @authForgot.
  ///
  /// In vi, this message translates to:
  /// **'Quên mật khẩu?'**
  String get authForgot;

  /// No description provided for @authOrContinue.
  ///
  /// In vi, this message translates to:
  /// **'hoặc tiếp tục với'**
  String get authOrContinue;

  /// No description provided for @authGoogle.
  ///
  /// In vi, this message translates to:
  /// **'Tiếp tục với Google'**
  String get authGoogle;

  /// No description provided for @authFooter.
  ///
  /// In vi, this message translates to:
  /// **'Bảo mật theo tiêu chuẩn Di sản Văn hóa số • Điều khoản'**
  String get authFooter;

  /// No description provided for @authServerUnreachableDebug.
  ///
  /// In vi, this message translates to:
  /// **'Không thể kết nối đến máy chủ ({url}).\nChi tiết: {detail}\n\n{hint}'**
  String authServerUnreachableDebug(String url, String detail, String hint);

  /// No description provided for @authServerUnreachable.
  ///
  /// In vi, this message translates to:
  /// **'Không thể kết nối đến máy chủ. Vui lòng thử lại sau.'**
  String get authServerUnreachable;

  /// No description provided for @authServerTimeoutDebug.
  ///
  /// In vi, this message translates to:
  /// **'Kết nối đến máy chủ ({url}) quá hạn.\n\n{hint}'**
  String authServerTimeoutDebug(String url, String hint);

  /// No description provided for @authServerTimeout.
  ///
  /// In vi, this message translates to:
  /// **'Kết nối đến máy chủ quá hạn (timeout). Vui lòng thử lại sau.'**
  String get authServerTimeout;

  /// No description provided for @authNetworkError.
  ///
  /// In vi, this message translates to:
  /// **'Lỗi kết nối mạng: {error}'**
  String authNetworkError(String error);

  /// No description provided for @authErr401.
  ///
  /// In vi, this message translates to:
  /// **'Thông tin đăng nhập không hợp lệ hoặc phiên đã hết hạn.'**
  String get authErr401;

  /// No description provided for @authErr403.
  ///
  /// In vi, this message translates to:
  /// **'Bạn không có quyền truy cập chức năng này.'**
  String get authErr403;

  /// No description provided for @authErr404.
  ///
  /// In vi, this message translates to:
  /// **'Không tìm thấy tài nguyên yêu cầu (404).'**
  String get authErr404;

  /// No description provided for @authErrServer.
  ///
  /// In vi, this message translates to:
  /// **'Lỗi máy chủ ({code}). Vui lòng thử lại sau.'**
  String authErrServer(String code);

  /// No description provided for @authNoRefreshToken.
  ///
  /// In vi, this message translates to:
  /// **'Không tìm thấy Refresh Token. Vui lòng đăng nhập lại.'**
  String get authNoRefreshToken;

  /// No description provided for @authSessionExpiredDetail.
  ///
  /// In vi, this message translates to:
  /// **'Phiên đăng nhập đã hết hạn: {detail}'**
  String authSessionExpiredDetail(String detail);

  /// No description provided for @apiInvalidData.
  ///
  /// In vi, this message translates to:
  /// **'Máy chủ trả về dữ liệu không hợp lệ.'**
  String get apiInvalidData;

  /// No description provided for @googleCancelled.
  ///
  /// In vi, this message translates to:
  /// **'Người dùng đã huỷ đăng nhập Google.'**
  String get googleCancelled;

  /// No description provided for @googleNoToken.
  ///
  /// In vi, this message translates to:
  /// **'Không lấy được idToken từ Google. Vui lòng thử lại.'**
  String get googleNoToken;

  /// No description provided for @sessionExpired.
  ///
  /// In vi, this message translates to:
  /// **'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại để tiếp tục.'**
  String get sessionExpired;

  /// No description provided for @apiRequestFailed.
  ///
  /// In vi, this message translates to:
  /// **'Không thể xử lý yêu cầu (mã {code}).'**
  String apiRequestFailed(String code);

  /// No description provided for @apiTimeout.
  ///
  /// In vi, this message translates to:
  /// **'Kết nối đến máy chủ quá hạn. Vui lòng thử lại.'**
  String get apiTimeout;

  /// No description provided for @apiUnreachable.
  ///
  /// In vi, this message translates to:
  /// **'Không thể kết nối đến máy chủ. Hãy kiểm tra mạng và địa chỉ API.'**
  String get apiUnreachable;

  /// No description provided for @apiNoImageUrl.
  ///
  /// In vi, this message translates to:
  /// **'Máy chủ không trả về đường dẫn ảnh.'**
  String get apiNoImageUrl;

  /// No description provided for @apiImageUploadFailed.
  ///
  /// In vi, this message translates to:
  /// **'Không thể tải ảnh lên (mã {code}).'**
  String apiImageUploadFailed(String code);

  /// No description provided for @apiImageTimeout.
  ///
  /// In vi, this message translates to:
  /// **'Tải ảnh quá hạn. Vui lòng thử lại.'**
  String get apiImageTimeout;

  /// No description provided for @apiNoVideoUrl.
  ///
  /// In vi, this message translates to:
  /// **'Máy chủ không trả về đường dẫn video.'**
  String get apiNoVideoUrl;

  /// No description provided for @apiVideoUploadFailed.
  ///
  /// In vi, this message translates to:
  /// **'Không thể tải video lên (mã {code}).'**
  String apiVideoUploadFailed(String code);

  /// No description provided for @apiVideoTimeout.
  ///
  /// In vi, this message translates to:
  /// **'Tải video quá hạn. Vui lòng thử lại.'**
  String get apiVideoTimeout;

  /// No description provided for @pwShow.
  ///
  /// In vi, this message translates to:
  /// **'Hiện mật khẩu'**
  String get pwShow;

  /// No description provided for @pwHide.
  ///
  /// In vi, this message translates to:
  /// **'Ẩn mật khẩu'**
  String get pwHide;

  /// No description provided for @pwErrNewRequired.
  ///
  /// In vi, this message translates to:
  /// **'Vui lòng nhập mật khẩu mới'**
  String get pwErrNewRequired;

  /// No description provided for @pwErrNewShort.
  ///
  /// In vi, this message translates to:
  /// **'Mật khẩu phải có ít nhất 6 ký tự'**
  String get pwErrNewShort;

  /// No description provided for @pwOtpResent.
  ///
  /// In vi, this message translates to:
  /// **'Đã gửi lại mã OTP tới email của bạn.'**
  String get pwOtpResent;

  /// No description provided for @pwResetSuccess.
  ///
  /// In vi, this message translates to:
  /// **'Đặt lại mật khẩu thành công'**
  String get pwResetSuccess;

  /// No description provided for @pwResetSuccessHint.
  ///
  /// In vi, this message translates to:
  /// **'Hãy đăng nhập bằng mật khẩu mới.'**
  String get pwResetSuccessHint;

  /// No description provided for @pwForgotTitle.
  ///
  /// In vi, this message translates to:
  /// **'Khôi phục mật khẩu'**
  String get pwForgotTitle;

  /// No description provided for @pwForgotSubtitle.
  ///
  /// In vi, this message translates to:
  /// **'Nhận mã OTP qua email để đặt lại mật khẩu'**
  String get pwForgotSubtitle;

  /// No description provided for @pwStepOtp.
  ///
  /// In vi, this message translates to:
  /// **'Mã OTP'**
  String get pwStepOtp;

  /// No description provided for @pwStepNewPassword.
  ///
  /// In vi, this message translates to:
  /// **'Mật khẩu mới'**
  String get pwStepNewPassword;

  /// No description provided for @pwEmailIntro.
  ///
  /// In vi, this message translates to:
  /// **'Nhập email bạn đã dùng để đăng ký. Chúng tôi sẽ gửi mã gồm 6 chữ số.'**
  String get pwEmailIntro;

  /// No description provided for @pwErrEmailRequired.
  ///
  /// In vi, this message translates to:
  /// **'Vui lòng nhập email'**
  String get pwErrEmailRequired;

  /// No description provided for @pwErrEmailInvalid.
  ///
  /// In vi, this message translates to:
  /// **'Email không đúng định dạng'**
  String get pwErrEmailInvalid;

  /// No description provided for @pwSendOtp.
  ///
  /// In vi, this message translates to:
  /// **'Gửi mã OTP'**
  String get pwSendOtp;

  /// No description provided for @pwCodeSentPrefix.
  ///
  /// In vi, this message translates to:
  /// **'Mã đã được gửi tới '**
  String get pwCodeSentPrefix;

  /// No description provided for @pwCodeSentSuffix.
  ///
  /// In vi, this message translates to:
  /// **'. Kiểm tra cả thư mục Spam nếu chưa thấy.'**
  String get pwCodeSentSuffix;

  /// No description provided for @pwErrOtpLength.
  ///
  /// In vi, this message translates to:
  /// **'Mã OTP gồm đúng 6 chữ số'**
  String get pwErrOtpLength;

  /// No description provided for @pwVerifyCode.
  ///
  /// In vi, this message translates to:
  /// **'Xác nhận mã'**
  String get pwVerifyCode;

  /// No description provided for @pwChangeEmail.
  ///
  /// In vi, this message translates to:
  /// **'Đổi email'**
  String get pwChangeEmail;

  /// No description provided for @pwResendIn.
  ///
  /// In vi, this message translates to:
  /// **'Gửi lại sau {seconds}s'**
  String pwResendIn(int seconds);

  /// No description provided for @pwResend.
  ///
  /// In vi, this message translates to:
  /// **'Gửi lại mã'**
  String get pwResend;

  /// No description provided for @pwNewIntro.
  ///
  /// In vi, this message translates to:
  /// **'Đặt mật khẩu mới cho tài khoản của bạn.'**
  String get pwNewIntro;

  /// No description provided for @pwMin6.
  ///
  /// In vi, this message translates to:
  /// **'Ít nhất 6 ký tự'**
  String get pwMin6;

  /// No description provided for @pwConfirmNew.
  ///
  /// In vi, this message translates to:
  /// **'Nhập lại mật khẩu mới'**
  String get pwConfirmNew;

  /// No description provided for @pwErrMismatch.
  ///
  /// In vi, this message translates to:
  /// **'Mật khẩu nhập lại không khớp'**
  String get pwErrMismatch;

  /// No description provided for @pwResetButton.
  ///
  /// In vi, this message translates to:
  /// **'Đặt lại mật khẩu'**
  String get pwResetButton;

  /// No description provided for @pwChangeSuccess.
  ///
  /// In vi, this message translates to:
  /// **'Đổi mật khẩu thành công.'**
  String get pwChangeSuccess;

  /// No description provided for @pwChangeSubtitle.
  ///
  /// In vi, this message translates to:
  /// **'Giữ an toàn cho hành trang di sản của bạn'**
  String get pwChangeSubtitle;

  /// No description provided for @pwCurrent.
  ///
  /// In vi, this message translates to:
  /// **'Mật khẩu hiện tại'**
  String get pwCurrent;

  /// No description provided for @pwCurrentGoogleHint.
  ///
  /// In vi, this message translates to:
  /// **'Bỏ trống nếu bạn đăng nhập bằng Google và chưa từng đặt mật khẩu'**
  String get pwCurrentGoogleHint;

  /// No description provided for @pwErrCurrentRequired.
  ///
  /// In vi, this message translates to:
  /// **'Vui lòng nhập mật khẩu hiện tại'**
  String get pwErrCurrentRequired;

  /// No description provided for @pwNewHelper.
  ///
  /// In vi, this message translates to:
  /// **'Ít nhất 6 ký tự, khác mật khẩu hiện tại'**
  String get pwNewHelper;

  /// No description provided for @pwSave.
  ///
  /// In vi, this message translates to:
  /// **'Lưu mật khẩu mới'**
  String get pwSave;

  /// No description provided for @epNameRequired.
  ///
  /// In vi, this message translates to:
  /// **'Họ tên không được để trống!'**
  String get epNameRequired;

  /// No description provided for @epSaved.
  ///
  /// In vi, this message translates to:
  /// **'Cập nhật hồ sơ cá nhân thành công qua máy chủ!'**
  String get epSaved;

  /// No description provided for @epTitle.
  ///
  /// In vi, this message translates to:
  /// **'Chỉnh Sửa Hồ Sơ Du Khách'**
  String get epTitle;

  /// No description provided for @epEmailLabel.
  ///
  /// In vi, this message translates to:
  /// **'Email tài khoản (không thể thay đổi):'**
  String get epEmailLabel;

  /// No description provided for @epNameLabel.
  ///
  /// In vi, this message translates to:
  /// **'Họ và tên:'**
  String get epNameLabel;

  /// No description provided for @epNameHint.
  ///
  /// In vi, this message translates to:
  /// **'Nhập họ và tên đầy đủ'**
  String get epNameHint;

  /// No description provided for @epPhoneLabel.
  ///
  /// In vi, this message translates to:
  /// **'Số điện thoại:'**
  String get epPhoneLabel;

  /// No description provided for @epPhoneHint.
  ///
  /// In vi, this message translates to:
  /// **'Nhập số điện thoại liên hệ'**
  String get epPhoneHint;

  /// No description provided for @epSaving.
  ///
  /// In vi, this message translates to:
  /// **'Đang lưu thay đổi lên máy chủ...'**
  String get epSaving;

  /// No description provided for @epSave.
  ///
  /// In vi, this message translates to:
  /// **'Lưu Thông Tin Mới'**
  String get epSave;

  /// No description provided for @notifCatBooking.
  ///
  /// In vi, this message translates to:
  /// **'Đặt chỗ'**
  String get notifCatBooking;

  /// No description provided for @notifCatRefund.
  ///
  /// In vi, this message translates to:
  /// **'Hoàn tiền'**
  String get notifCatRefund;

  /// No description provided for @notifCatReward.
  ///
  /// In vi, this message translates to:
  /// **'Phần thưởng'**
  String get notifCatReward;

  /// No description provided for @notifCatApproved.
  ///
  /// In vi, this message translates to:
  /// **'Đã duyệt'**
  String get notifCatApproved;

  /// No description provided for @notifCatRejected.
  ///
  /// In vi, this message translates to:
  /// **'Cần xem lại'**
  String get notifCatRejected;

  /// No description provided for @notifCatCommunity.
  ///
  /// In vi, this message translates to:
  /// **'Cộng đồng'**
  String get notifCatCommunity;

  /// No description provided for @notifCatFinance.
  ///
  /// In vi, this message translates to:
  /// **'Tài chính'**
  String get notifCatFinance;

  /// No description provided for @notifCatReview.
  ///
  /// In vi, this message translates to:
  /// **'Thẩm định'**
  String get notifCatReview;

  /// No description provided for @notifCatChat.
  ///
  /// In vi, this message translates to:
  /// **'Tin nhắn'**
  String get notifCatChat;

  /// No description provided for @timeJustNow.
  ///
  /// In vi, this message translates to:
  /// **'Vừa xong'**
  String get timeJustNow;

  /// No description provided for @timeMinutesAgo.
  ///
  /// In vi, this message translates to:
  /// **'{count} phút trước'**
  String timeMinutesAgo(int count);

  /// No description provided for @timeHoursAgo.
  ///
  /// In vi, this message translates to:
  /// **'{count} giờ trước'**
  String timeHoursAgo(int count);

  /// No description provided for @timeYesterday.
  ///
  /// In vi, this message translates to:
  /// **'Hôm qua'**
  String get timeYesterday;

  /// No description provided for @timeDaysAgo.
  ///
  /// In vi, this message translates to:
  /// **'{count} ngày trước'**
  String timeDaysAgo(int count);

  /// No description provided for @notifNewCount.
  ///
  /// In vi, this message translates to:
  /// **'{count} mới'**
  String notifNewCount(int count);

  /// No description provided for @notifReadAll.
  ///
  /// In vi, this message translates to:
  /// **'Đọc tất cả'**
  String get notifReadAll;

  /// No description provided for @notifOlder.
  ///
  /// In vi, this message translates to:
  /// **'Xem thông báo cũ hơn'**
  String get notifOlder;

  /// No description provided for @notifEmpty.
  ///
  /// In vi, this message translates to:
  /// **'Chưa có thông báo'**
  String get notifEmpty;

  /// No description provided for @notifEmptyHint.
  ///
  /// In vi, this message translates to:
  /// **'Kết quả thanh toán, hoàn tiền, huy hiệu và bài viết của bạn sẽ hiện ở đây.'**
  String get notifEmptyHint;

  /// No description provided for @notifChannelTimer.
  ///
  /// In vi, this message translates to:
  /// **'Hẹn giờ hoạt động'**
  String get notifChannelTimer;

  /// No description provided for @notifChannelTimerDesc.
  ///
  /// In vi, this message translates to:
  /// **'Nhắc khi hết giờ đếm ngược của hoạt động thực địa'**
  String get notifChannelTimerDesc;

  /// No description provided for @notifChannelMain.
  ///
  /// In vi, this message translates to:
  /// **'Thông báo Journey Go'**
  String get notifChannelMain;

  /// No description provided for @notifChannelMainDesc.
  ///
  /// In vi, this message translates to:
  /// **'Đơn đặt tour, hoàn tiền, huy hiệu, bài viết diễn đàn'**
  String get notifChannelMainDesc;

  /// No description provided for @chatListLoadFailed.
  ///
  /// In vi, this message translates to:
  /// **'Không thể tải lịch sử hỗ trợ.'**
  String get chatListLoadFailed;

  /// No description provided for @chatEmpty.
  ///
  /// In vi, this message translates to:
  /// **'Chưa có cuộc trò chuyện nào'**
  String get chatEmpty;

  /// No description provided for @chatEmptyHint.
  ///
  /// In vi, this message translates to:
  /// **'Mở chi tiết bất kỳ tour nào và bấm \"Chat với bên …\" để hỏi nhà tour trước khi đặt vé. Lịch sử sẽ được lưu lại tại đây.'**
  String get chatEmptyHint;

  /// No description provided for @chatNoMessages.
  ///
  /// In vi, this message translates to:
  /// **'Chưa có tin nhắn nào'**
  String get chatNoMessages;

  /// No description provided for @chatOpenFailed.
  ///
  /// In vi, this message translates to:
  /// **'Không thể mở cuộc trò chuyện.'**
  String get chatOpenFailed;

  /// No description provided for @chatProviderFallback.
  ///
  /// In vi, this message translates to:
  /// **'Nhà tour'**
  String get chatProviderFallback;

  /// No description provided for @chatAskAbout.
  ///
  /// In vi, this message translates to:
  /// **'Hỏi {name} về tour này'**
  String chatAskAbout(String name);

  /// No description provided for @chatProviderLower.
  ///
  /// In vi, this message translates to:
  /// **'nhà tour'**
  String get chatProviderLower;

  /// No description provided for @chatAskHint.
  ///
  /// In vi, this message translates to:
  /// **'Bạn có thể hỏi về lịch trình, giá, điều kiện thời tiết hoặc thủ tục đặt tour — trước khi quyết định đặt vé.'**
  String get chatAskHint;

  /// No description provided for @chatInputHint.
  ///
  /// In vi, this message translates to:
  /// **'Nhắn tin cho nhà tour…'**
  String get chatInputHint;

  /// No description provided for @forumFilterTour.
  ///
  /// In vi, this message translates to:
  /// **'Lọc theo tour'**
  String get forumFilterTour;

  /// No description provided for @forumTitle.
  ///
  /// In vi, this message translates to:
  /// **'Diễn đàn di sản'**
  String get forumTitle;

  /// No description provided for @forumSubtitle.
  ///
  /// In vi, this message translates to:
  /// **'Chia sẻ trải nghiệm văn hoá cùng cộng đồng'**
  String get forumSubtitle;

  /// No description provided for @forumMyPosts.
  ///
  /// In vi, this message translates to:
  /// **'Bài của tôi'**
  String get forumMyPosts;

  /// No description provided for @forumLoadFailed.
  ///
  /// In vi, this message translates to:
  /// **'Không tải được Diễn đàn'**
  String get forumLoadFailed;

  /// No description provided for @forumNoMatch.
  ///
  /// In vi, this message translates to:
  /// **'Không có bài viết phù hợp'**
  String get forumNoMatch;

  /// No description provided for @forumNoPosts.
  ///
  /// In vi, this message translates to:
  /// **'Chưa có bài viết nào'**
  String get forumNoPosts;

  /// No description provided for @forumNoMatchHint.
  ///
  /// In vi, this message translates to:
  /// **'Thử bỏ bớt bộ lọc để xem thêm bài viết.'**
  String get forumNoMatchHint;

  /// No description provided for @forumNoPostsHint.
  ///
  /// In vi, this message translates to:
  /// **'Hãy là người đầu tiên chia sẻ trải nghiệm của bạn.'**
  String get forumNoPostsHint;

  /// No description provided for @forumComposePrompt.
  ///
  /// In vi, this message translates to:
  /// **'Bạn vừa có trải nghiệm gì thú vị?'**
  String get forumComposePrompt;

  /// No description provided for @forumSortNewest.
  ///
  /// In vi, this message translates to:
  /// **'Mới nhất'**
  String get forumSortNewest;

  /// No description provided for @forumSortTop.
  ///
  /// In vi, this message translates to:
  /// **'Nổi bật'**
  String get forumSortTop;

  /// No description provided for @forumDestinationFallback.
  ///
  /// In vi, this message translates to:
  /// **'Điểm đến'**
  String get forumDestinationFallback;

  /// No description provided for @forumMaxImages.
  ///
  /// In vi, this message translates to:
  /// **'Mỗi bài viết chỉ đính kèm tối đa {max} ảnh.'**
  String forumMaxImages(int max);

  /// No description provided for @forumGalleryFailed.
  ///
  /// In vi, this message translates to:
  /// **'Không mở được thư viện ảnh. Hãy kiểm tra quyền truy cập.'**
  String get forumGalleryFailed;

  /// No description provided for @forumChooseTour.
  ///
  /// In vi, this message translates to:
  /// **'Chọn tour'**
  String get forumChooseTour;

  /// No description provided for @forumJoinedNote.
  ///
  /// In vi, this message translates to:
  /// **'Bạn đã tham gia'**
  String get forumJoinedNote;

  /// No description provided for @forumErrTitle.
  ///
  /// In vi, this message translates to:
  /// **'Vui lòng nhập tiêu đề bài viết.'**
  String get forumErrTitle;

  /// No description provided for @forumErrContent.
  ///
  /// In vi, this message translates to:
  /// **'Vui lòng nhập nội dung bài viết.'**
  String get forumErrContent;

  /// No description provided for @forumSaving.
  ///
  /// In vi, this message translates to:
  /// **'Đang lưu bài viết...'**
  String get forumSaving;

  /// No description provided for @forumUploadingImage.
  ///
  /// In vi, this message translates to:
  /// **'Đang tải ảnh {index}/{total}...'**
  String forumUploadingImage(int index, int total);

  /// No description provided for @forumDraftSaved.
  ///
  /// In vi, this message translates to:
  /// **'Đã lưu bản nháp.'**
  String get forumDraftSaved;

  /// No description provided for @forumSubmitted.
  ///
  /// In vi, this message translates to:
  /// **'Đã gửi bài viết. Bài sẽ hiển thị sau khi được kiểm duyệt.'**
  String get forumSubmitted;

  /// No description provided for @forumEditPost.
  ///
  /// In vi, this message translates to:
  /// **'Chỉnh sửa bài viết'**
  String get forumEditPost;

  /// No description provided for @forumNewPost.
  ///
  /// In vi, this message translates to:
  /// **'Viết bài mới'**
  String get forumNewPost;

  /// No description provided for @forumFieldTitle.
  ///
  /// In vi, this message translates to:
  /// **'Tiêu đề'**
  String get forumFieldTitle;

  /// No description provided for @forumFieldContent.
  ///
  /// In vi, this message translates to:
  /// **'Nội dung'**
  String get forumFieldContent;

  /// No description provided for @forumFieldTour.
  ///
  /// In vi, this message translates to:
  /// **'Tour liên quan'**
  String get forumFieldTour;

  /// No description provided for @forumTourOptional.
  ///
  /// In vi, this message translates to:
  /// **'Chọn tour (không bắt buộc)'**
  String get forumTourOptional;

  /// No description provided for @forumTourLocked.
  ///
  /// In vi, this message translates to:
  /// **'Không thể đổi tour sau khi đã đăng.'**
  String get forumTourLocked;

  /// No description provided for @forumTourHint.
  ///
  /// In vi, this message translates to:
  /// **'Tour bạn đã tham gia được đưa lên đầu danh sách.'**
  String get forumTourHint;

  /// No description provided for @forumPhotos.
  ///
  /// In vi, this message translates to:
  /// **'Ảnh ({count}/{max})'**
  String forumPhotos(int count, int max);

  /// No description provided for @forumModerationNote.
  ///
  /// In vi, this message translates to:
  /// **'Bài viết sẽ hiển thị trên Diễn đàn sau khi được kiểm duyệt viên phê duyệt.'**
  String get forumModerationNote;

  /// No description provided for @forumSaveChanges.
  ///
  /// In vi, this message translates to:
  /// **'Lưu thay đổi'**
  String get forumSaveChanges;

  /// No description provided for @forumSaveDraft.
  ///
  /// In vi, this message translates to:
  /// **'Lưu nháp'**
  String get forumSaveDraft;

  /// No description provided for @forumSubmitReview.
  ///
  /// In vi, this message translates to:
  /// **'Gửi duyệt'**
  String get forumSubmitReview;

  /// No description provided for @forumAddPhotoHint.
  ///
  /// In vi, this message translates to:
  /// **'Chạm để thêm ảnh từ thư viện'**
  String get forumAddPhotoHint;

  /// No description provided for @forumReportPost.
  ///
  /// In vi, this message translates to:
  /// **'Báo cáo bài viết'**
  String get forumReportPost;

  /// No description provided for @forumReportDescription.
  ///
  /// In vi, this message translates to:
  /// **'Mô tả thêm (không bắt buộc)'**
  String get forumReportDescription;

  /// No description provided for @forumSendReport.
  ///
  /// In vi, this message translates to:
  /// **'Gửi báo cáo'**
  String get forumSendReport;

  /// No description provided for @forumAgree.
  ///
  /// In vi, this message translates to:
  /// **'Đồng ý'**
  String get forumAgree;

  /// No description provided for @forumJoinedTour.
  ///
  /// In vi, this message translates to:
  /// **'Đã tham gia tour'**
  String get forumJoinedTour;

  /// No description provided for @forumModeratorFeedback.
  ///
  /// In vi, this message translates to:
  /// **'Phản hồi từ kiểm duyệt viên: {note}'**
  String forumModeratorFeedback(String note);

  /// No description provided for @forumDeselect.
  ///
  /// In vi, this message translates to:
  /// **'Bỏ chọn'**
  String get forumDeselect;

  /// No description provided for @forumListLoadFailed.
  ///
  /// In vi, this message translates to:
  /// **'Không tải được danh sách. Vui lòng thử lại sau.'**
  String get forumListLoadFailed;

  /// No description provided for @forumNothingToPick.
  ///
  /// In vi, this message translates to:
  /// **'Chưa có mục nào để chọn.'**
  String get forumNothingToPick;

  /// No description provided for @forumTabDraft.
  ///
  /// In vi, this message translates to:
  /// **'Nháp'**
  String get forumTabDraft;

  /// No description provided for @forumTabPending.
  ///
  /// In vi, this message translates to:
  /// **'Chờ duyệt'**
  String get forumTabPending;

  /// No description provided for @forumTabPublished.
  ///
  /// In vi, this message translates to:
  /// **'Đã đăng'**
  String get forumTabPublished;

  /// No description provided for @forumTabRevision.
  ///
  /// In vi, this message translates to:
  /// **'Cần sửa'**
  String get forumTabRevision;

  /// No description provided for @forumTabRejected.
  ///
  /// In vi, this message translates to:
  /// **'Bị từ chối'**
  String get forumTabRejected;

  /// No description provided for @forumWrite.
  ///
  /// In vi, this message translates to:
  /// **'Viết bài'**
  String get forumWrite;

  /// No description provided for @forumPostsLoadFailed.
  ///
  /// In vi, this message translates to:
  /// **'Không tải được bài viết'**
  String get forumPostsLoadFailed;

  /// No description provided for @forumMyEmpty.
  ///
  /// In vi, this message translates to:
  /// **'Bạn chưa có bài viết nào'**
  String get forumMyEmpty;

  /// No description provided for @forumMyEmptyTab.
  ///
  /// In vi, this message translates to:
  /// **'Không có bài ở mục \"{tab}\"'**
  String forumMyEmptyTab(String tab);

  /// No description provided for @forumMyEmptyHint.
  ///
  /// In vi, this message translates to:
  /// **'Chia sẻ trải nghiệm chuyến đi để mọi người cùng khám phá.'**
  String get forumMyEmptyHint;

  /// No description provided for @forumDeleteComment.
  ///
  /// In vi, this message translates to:
  /// **'Xóa bình luận'**
  String get forumDeleteComment;

  /// No description provided for @forumDeleteCommentConfirm.
  ///
  /// In vi, this message translates to:
  /// **'Bạn muốn xóa bình luận này?'**
  String get forumDeleteCommentConfirm;

  /// No description provided for @forumDelete.
  ///
  /// In vi, this message translates to:
  /// **'Xóa'**
  String get forumDelete;

  /// No description provided for @forumCommentReported.
  ///
  /// In vi, this message translates to:
  /// **'Đã báo cáo bình luận. Cảm ơn bạn đã giúp cộng đồng.'**
  String get forumCommentReported;

  /// No description provided for @forumReportComment.
  ///
  /// In vi, this message translates to:
  /// **'Báo cáo bình luận'**
  String get forumReportComment;

  /// No description provided for @forumReportCommentHint.
  ///
  /// In vi, this message translates to:
  /// **'Spam, ngôn từ xúc phạm, thông tin sai lệch…'**
  String get forumReportCommentHint;

  /// No description provided for @forumReportSent.
  ///
  /// In vi, this message translates to:
  /// **'Đã gửi báo cáo. Cảm ơn bạn đã giúp cộng đồng.'**
  String get forumReportSent;

  /// No description provided for @forumDeletePost.
  ///
  /// In vi, this message translates to:
  /// **'Xóa bài viết'**
  String get forumDeletePost;

  /// No description provided for @forumDeletePostConfirm.
  ///
  /// In vi, this message translates to:
  /// **'Bài viết và các bình luận sẽ bị xóa vĩnh viễn.'**
  String get forumDeletePostConfirm;

  /// No description provided for @forumDeletePostShort.
  ///
  /// In vi, this message translates to:
  /// **'Xóa bài'**
  String get forumDeletePostShort;

  /// No description provided for @forumSentForReview.
  ///
  /// In vi, this message translates to:
  /// **'Đã gửi bài viết để kiểm duyệt.'**
  String get forumSentForReview;

  /// No description provided for @forumPost.
  ///
  /// In vi, this message translates to:
  /// **'Bài viết'**
  String get forumPost;

  /// No description provided for @forumOptions.
  ///
  /// In vi, this message translates to:
  /// **'Tùy chọn'**
  String get forumOptions;

  /// No description provided for @forumEdit.
  ///
  /// In vi, this message translates to:
  /// **'Chỉnh sửa'**
  String get forumEdit;

  /// No description provided for @forumResubmit.
  ///
  /// In vi, this message translates to:
  /// **'Gửi duyệt lại'**
  String get forumResubmit;

  /// No description provided for @forumReactionsAfterReview.
  ///
  /// In vi, this message translates to:
  /// **'Bài viết chỉ nhận cảm xúc và bình luận sau khi được kiểm duyệt.'**
  String get forumReactionsAfterReview;

  /// No description provided for @forumComments.
  ///
  /// In vi, this message translates to:
  /// **'Bình luận ({count})'**
  String forumComments(int count);

  /// No description provided for @forumNoComments.
  ///
  /// In vi, this message translates to:
  /// **'Chưa có bình luận nào. Hãy là người đầu tiên!'**
  String get forumNoComments;

  /// No description provided for @forumLoading.
  ///
  /// In vi, this message translates to:
  /// **'Đang tải...'**
  String get forumLoading;

  /// No description provided for @forumMoreComments.
  ///
  /// In vi, this message translates to:
  /// **'Xem thêm bình luận'**
  String get forumMoreComments;

  /// No description provided for @forumCommentHint.
  ///
  /// In vi, this message translates to:
  /// **'Viết bình luận...'**
  String get forumCommentHint;

  /// No description provided for @forumSendComment.
  ///
  /// In vi, this message translates to:
  /// **'Gửi bình luận'**
  String get forumSendComment;

  /// No description provided for @forumReasonSpam.
  ///
  /// In vi, this message translates to:
  /// **'Spam hoặc quảng cáo'**
  String get forumReasonSpam;

  /// No description provided for @forumReasonInappropriate.
  ///
  /// In vi, this message translates to:
  /// **'Nội dung không phù hợp'**
  String get forumReasonInappropriate;

  /// No description provided for @forumReasonHate.
  ///
  /// In vi, this message translates to:
  /// **'Ngôn từ thù ghét'**
  String get forumReasonHate;

  /// No description provided for @forumReasonFalse.
  ///
  /// In vi, this message translates to:
  /// **'Thông tin sai sự thật'**
  String get forumReasonFalse;

  /// No description provided for @forumReasonCopyright.
  ///
  /// In vi, this message translates to:
  /// **'Vi phạm bản quyền'**
  String get forumReasonCopyright;

  /// No description provided for @forumStatusHidden.
  ///
  /// In vi, this message translates to:
  /// **'Đang được xem xét'**
  String get forumStatusHidden;

  /// No description provided for @forumStatusDraft.
  ///
  /// In vi, this message translates to:
  /// **'Bản nháp'**
  String get forumStatusDraft;

  /// No description provided for @forumStatusRevision.
  ///
  /// In vi, this message translates to:
  /// **'Cần chỉnh sửa'**
  String get forumStatusRevision;

  /// No description provided for @forumAuthorFallback.
  ///
  /// In vi, this message translates to:
  /// **'Du khách'**
  String get forumAuthorFallback;

  /// No description provided for @achCatTour.
  ///
  /// In vi, this message translates to:
  /// **'Hành trình khám phá'**
  String get achCatTour;

  /// No description provided for @achCatTourShort.
  ///
  /// In vi, this message translates to:
  /// **'Hành trình'**
  String get achCatTourShort;

  /// No description provided for @achCatTourDesc.
  ///
  /// In vi, this message translates to:
  /// **'Chinh phục các chuyến đi & vùng đất mới'**
  String get achCatTourDesc;

  /// No description provided for @achUnitTour.
  ///
  /// In vi, this message translates to:
  /// **'tour'**
  String get achUnitTour;

  /// No description provided for @achCatCheckin.
  ///
  /// In vi, this message translates to:
  /// **'Dấu chân điểm đến'**
  String get achCatCheckin;

  /// No description provided for @achCatCheckinShort.
  ///
  /// In vi, this message translates to:
  /// **'Check-in'**
  String get achCatCheckinShort;

  /// No description provided for @achCatCheckinDesc.
  ///
  /// In vi, this message translates to:
  /// **'Check-in GPS tại các tọa độ di sản'**
  String get achCatCheckinDesc;

  /// No description provided for @achUnitDestination.
  ///
  /// In vi, this message translates to:
  /// **'điểm đến'**
  String get achUnitDestination;

  /// No description provided for @achCatCulture.
  ///
  /// In vi, this message translates to:
  /// **'Văn hóa & Tri thức'**
  String get achCatCulture;

  /// No description provided for @achCatCultureShort.
  ///
  /// In vi, this message translates to:
  /// **'Văn hóa'**
  String get achCatCultureShort;

  /// No description provided for @achCatCultureDesc.
  ///
  /// In vi, this message translates to:
  /// **'Khám phá câu chuyện di sản & giải đố'**
  String get achCatCultureDesc;

  /// No description provided for @achUnitLesson.
  ///
  /// In vi, this message translates to:
  /// **'bài'**
  String get achUnitLesson;

  /// No description provided for @achCatExperience.
  ///
  /// In vi, this message translates to:
  /// **'Thử thách trải nghiệm'**
  String get achCatExperience;

  /// No description provided for @achCatExperienceShort.
  ///
  /// In vi, this message translates to:
  /// **'Trải nghiệm'**
  String get achCatExperienceShort;

  /// No description provided for @achCatExperienceDesc.
  ///
  /// In vi, this message translates to:
  /// **'Vượt qua nhiệm vụ thực tế tại điểm dừng'**
  String get achCatExperienceDesc;

  /// No description provided for @achUnitMission.
  ///
  /// In vi, this message translates to:
  /// **'nhiệm vụ'**
  String get achUnitMission;

  /// No description provided for @achCatStreak.
  ///
  /// In vi, this message translates to:
  /// **'Kiên định & Gắn bó'**
  String get achCatStreak;

  /// No description provided for @achCatStreakShort.
  ///
  /// In vi, this message translates to:
  /// **'Gắn bó'**
  String get achCatStreakShort;

  /// No description provided for @achCatStreakDesc.
  ///
  /// In vi, this message translates to:
  /// **'Duy trì ngọn lửa đam mê cùng JourneyGo'**
  String get achCatStreakDesc;

  /// No description provided for @achUnitMilestone.
  ///
  /// In vi, this message translates to:
  /// **'mốc'**
  String get achUnitMilestone;

  /// No description provided for @achTierBronze.
  ///
  /// In vi, this message translates to:
  /// **'Đồng'**
  String get achTierBronze;

  /// No description provided for @achTierSilver.
  ///
  /// In vi, this message translates to:
  /// **'Bạc'**
  String get achTierSilver;

  /// No description provided for @achTierGold.
  ///
  /// In vi, this message translates to:
  /// **'Vàng'**
  String get achTierGold;

  /// No description provided for @achTierLegendary.
  ///
  /// In vi, this message translates to:
  /// **'Huyền thoại'**
  String get achTierLegendary;

  /// No description provided for @achUnitDays.
  ///
  /// In vi, this message translates to:
  /// **'ngày'**
  String get achUnitDays;

  /// No description provided for @achTitle.
  ///
  /// In vi, this message translates to:
  /// **'Thành tựu & Huy hiệu'**
  String get achTitle;

  /// No description provided for @achBadgeCollection.
  ///
  /// In vi, this message translates to:
  /// **'Bộ sưu tập huy hiệu'**
  String get achBadgeCollection;

  /// No description provided for @achLoadFailed.
  ///
  /// In vi, this message translates to:
  /// **'Không tải được thành tựu'**
  String get achLoadFailed;

  /// No description provided for @achFilterUnlocked.
  ///
  /// In vi, this message translates to:
  /// **'Đã mở khóa'**
  String get achFilterUnlocked;

  /// No description provided for @achFilterClaimable.
  ///
  /// In vi, this message translates to:
  /// **'Chờ nhận thưởng'**
  String get achFilterClaimable;

  /// No description provided for @achAchieved.
  ///
  /// In vi, this message translates to:
  /// **'Thành tựu đã đạt'**
  String get achAchieved;

  /// No description provided for @achPoints.
  ///
  /// In vi, this message translates to:
  /// **'Điểm thành tựu'**
  String get achPoints;

  /// No description provided for @achBadgesClaimed.
  ///
  /// In vi, this message translates to:
  /// **'Đã nhận {count} huy hiệu'**
  String achBadgesClaimed(int count);

  /// No description provided for @achPending.
  ///
  /// In vi, this message translates to:
  /// **'Chờ nhận'**
  String get achPending;

  /// No description provided for @achAllClaimed.
  ///
  /// In vi, this message translates to:
  /// **'Đã nhận hết'**
  String get achAllClaimed;

  /// No description provided for @achCompleteToUnlock.
  ///
  /// In vi, this message translates to:
  /// **'Hoàn thành để mở khóa'**
  String get achCompleteToUnlock;

  /// No description provided for @achCategoryProgress.
  ///
  /// In vi, this message translates to:
  /// **'{achieved}/{total} thành tựu • {pct}%'**
  String achCategoryProgress(int achieved, int total, int pct);

  /// No description provided for @achNoMatch.
  ///
  /// In vi, this message translates to:
  /// **'Không có thành tựu nào khớp bộ lọc trong danh mục này'**
  String get achNoMatch;

  /// No description provided for @achNoMatchHint.
  ///
  /// In vi, this message translates to:
  /// **'Thử chuyển sang bộ lọc \"Tất cả\" hoặc chọn danh mục khác để tiếp tục theo dõi tiến độ.'**
  String get achNoMatchHint;

  /// No description provided for @achSeeAllInCategory.
  ///
  /// In vi, this message translates to:
  /// **'Xem tất cả trong mục này'**
  String get achSeeAllInCategory;

  /// No description provided for @achReady.
  ///
  /// In vi, this message translates to:
  /// **'Sẵn sàng nhận'**
  String get achReady;

  /// No description provided for @achProgress.
  ///
  /// In vi, this message translates to:
  /// **'Tiến độ: {current}/{target} {unit}'**
  String achProgress(String current, String target, String unit);

  /// No description provided for @achClaiming.
  ///
  /// In vi, this message translates to:
  /// **'Đang nhận...'**
  String get achClaiming;

  /// No description provided for @achClaim.
  ///
  /// In vi, this message translates to:
  /// **'Nhận thưởng'**
  String get achClaim;

  /// No description provided for @achClaimed.
  ///
  /// In vi, this message translates to:
  /// **'Đã nhận'**
  String get achClaimed;

  /// No description provided for @achClaimBarrier.
  ///
  /// In vi, this message translates to:
  /// **'Nhận thưởng thành tựu'**
  String get achClaimBarrier;

  /// No description provided for @achUnlockedEyebrow.
  ///
  /// In vi, this message translates to:
  /// **'THÀNH TỰU ĐẠT ĐƯỢC'**
  String get achUnlockedEyebrow;

  /// No description provided for @achBadgeName.
  ///
  /// In vi, this message translates to:
  /// **'Huy hiệu: {name}'**
  String achBadgeName(String name);

  /// No description provided for @achRewardEyebrow.
  ///
  /// In vi, this message translates to:
  /// **'PHẦN THƯỞNG VỪA NHẬN'**
  String get achRewardEyebrow;

  /// No description provided for @achNewBalance.
  ///
  /// In vi, this message translates to:
  /// **'Số dư hiện tại: {balance} JP'**
  String achNewBalance(String balance);

  /// No description provided for @achKeepExploring.
  ///
  /// In vi, this message translates to:
  /// **'Tuyệt vời! Tiếp tục khám phá'**
  String get achKeepExploring;

  /// No description provided for @bdgLoadFailed.
  ///
  /// In vi, this message translates to:
  /// **'Không tải được huy hiệu'**
  String get bdgLoadFailed;

  /// No description provided for @bdgEmpty.
  ///
  /// In vi, this message translates to:
  /// **'Chưa có huy hiệu nào'**
  String get bdgEmpty;

  /// No description provided for @bdgEmptyHint.
  ///
  /// In vi, this message translates to:
  /// **'Check-in tại các điểm di sản để mở khóa huy hiệu đầu tiên.'**
  String get bdgEmptyHint;

  /// No description provided for @bdgCount.
  ///
  /// In vi, this message translates to:
  /// **'{earned} / {total} huy hiệu'**
  String bdgCount(int earned, int total);

  /// No description provided for @bdgViewProgress.
  ///
  /// In vi, this message translates to:
  /// **'Xem tiến độ & nhận thưởng thành tựu'**
  String get bdgViewProgress;

  /// No description provided for @bdgLocked.
  ///
  /// In vi, this message translates to:
  /// **'Chưa mở khóa'**
  String get bdgLocked;

  /// No description provided for @bdgEarnedOn.
  ///
  /// In vi, this message translates to:
  /// **'Nhận ngày {date}'**
  String bdgEarnedOn(String date);

  /// No description provided for @bdgBonus.
  ///
  /// In vi, this message translates to:
  /// **'+{points} điểm thưởng'**
  String bdgBonus(String points);

  /// No description provided for @mvCopied.
  ///
  /// In vi, this message translates to:
  /// **'Đã sao chép mã voucher'**
  String get mvCopied;

  /// No description provided for @mvTitle.
  ///
  /// In vi, this message translates to:
  /// **'Voucher của tôi'**
  String get mvTitle;

  /// No description provided for @mvTabUsable.
  ///
  /// In vi, this message translates to:
  /// **'Còn dùng ({count})'**
  String mvTabUsable(int count);

  /// No description provided for @mvTabUsed.
  ///
  /// In vi, this message translates to:
  /// **'Đã dùng ({count})'**
  String mvTabUsed(int count);

  /// No description provided for @mvTabExpired.
  ///
  /// In vi, this message translates to:
  /// **'Hết hạn ({count})'**
  String mvTabExpired(int count);

  /// No description provided for @mvLoadFailed.
  ///
  /// In vi, this message translates to:
  /// **'Không tải được kho voucher'**
  String get mvLoadFailed;

  /// No description provided for @mvEmptyUsable.
  ///
  /// In vi, this message translates to:
  /// **'Chưa có voucher nào'**
  String get mvEmptyUsable;

  /// No description provided for @mvEmptyUsableHint.
  ///
  /// In vi, this message translates to:
  /// **'Dùng điểm tích lũy để đổi voucher tại mục Đổi thưởng.'**
  String get mvEmptyUsableHint;

  /// No description provided for @mvEmptyUsed.
  ///
  /// In vi, this message translates to:
  /// **'Chưa dùng voucher nào'**
  String get mvEmptyUsed;

  /// No description provided for @mvEmptyUsedHint.
  ///
  /// In vi, this message translates to:
  /// **'Voucher bạn đã dùng sẽ hiển thị tại đây.'**
  String get mvEmptyUsedHint;

  /// No description provided for @mvEmptyExpired.
  ///
  /// In vi, this message translates to:
  /// **'Không có voucher hết hạn'**
  String get mvEmptyExpired;

  /// No description provided for @mvEmptyExpiredHint.
  ///
  /// In vi, this message translates to:
  /// **'Hãy dùng voucher trước ngày hết hạn nhé.'**
  String get mvEmptyExpiredHint;

  /// No description provided for @mvStatusUsable.
  ///
  /// In vi, this message translates to:
  /// **'Còn dùng'**
  String get mvStatusUsable;

  /// No description provided for @mvStatusUsed.
  ///
  /// In vi, this message translates to:
  /// **'Đã dùng'**
  String get mvStatusUsed;

  /// No description provided for @mvStatusExpired.
  ///
  /// In vi, this message translates to:
  /// **'Hết hạn'**
  String get mvStatusExpired;

  /// No description provided for @mvUsedOn.
  ///
  /// In vi, this message translates to:
  /// **'Đã dùng {date}'**
  String mvUsedOn(String date);

  /// No description provided for @mvExpiredOn.
  ///
  /// In vi, this message translates to:
  /// **'Hết hạn {date}'**
  String mvExpiredOn(String date);

  /// No description provided for @mvValidUntil.
  ///
  /// In vi, this message translates to:
  /// **'Hạn dùng đến {date}'**
  String mvValidUntil(String date);

  /// No description provided for @mvCopyCode.
  ///
  /// In vi, this message translates to:
  /// **'Sao chép mã'**
  String get mvCopyCode;

  /// No description provided for @mvRedeemedFor.
  ///
  /// In vi, this message translates to:
  /// **'Đã đổi {points} điểm'**
  String mvRedeemedFor(String points);

  /// No description provided for @rwBalanceLeft.
  ///
  /// In vi, this message translates to:
  /// **'Còn {balance}'**
  String rwBalanceLeft(String balance);

  /// No description provided for @vsConfirmTitle.
  ///
  /// In vi, this message translates to:
  /// **'Xác nhận đổi voucher'**
  String get vsConfirmTitle;

  /// No description provided for @vsConfirmMessage.
  ///
  /// In vi, this message translates to:
  /// **'Dùng {points} điểm để đổi \"{title}\"? Điểm đã đổi sẽ không được hoàn lại.'**
  String vsConfirmMessage(String points, String title);

  /// No description provided for @vsRedeemNow.
  ///
  /// In vi, this message translates to:
  /// **'Đổi ngay'**
  String get vsRedeemNow;

  /// No description provided for @vsSuccessTitle.
  ///
  /// In vi, this message translates to:
  /// **'Đổi voucher thành công'**
  String get vsSuccessTitle;

  /// No description provided for @vsSuccessSubtitle.
  ///
  /// In vi, this message translates to:
  /// **'Mã của bạn đã được lưu trong mục \"Voucher của tôi\".'**
  String get vsSuccessSubtitle;

  /// No description provided for @vsLoadFailed.
  ///
  /// In vi, this message translates to:
  /// **'Không tải được danh sách voucher'**
  String get vsLoadFailed;

  /// No description provided for @vsEmpty.
  ///
  /// In vi, this message translates to:
  /// **'Chưa có voucher để đổi'**
  String get vsEmpty;

  /// No description provided for @vsEmptyHint.
  ///
  /// In vi, this message translates to:
  /// **'Các ưu đãi mới sẽ xuất hiện tại đây. Hãy quay lại sau nhé.'**
  String get vsEmptyHint;

  /// No description provided for @vsYourPoints.
  ///
  /// In vi, this message translates to:
  /// **'Điểm của bạn'**
  String get vsYourPoints;

  /// No description provided for @vsMinOrder.
  ///
  /// In vi, this message translates to:
  /// **'Đơn từ {amount}'**
  String vsMinOrder(String amount);

  /// No description provided for @vsMaxDiscount.
  ///
  /// In vi, this message translates to:
  /// **'Giảm tối đa {amount}'**
  String vsMaxDiscount(String amount);

  /// No description provided for @vsValidDays.
  ///
  /// In vi, this message translates to:
  /// **'Dùng trong {days} ngày'**
  String vsValidDays(int days);

  /// No description provided for @vsRedeemUntil.
  ///
  /// In vi, this message translates to:
  /// **'Đổi được đến {date}'**
  String vsRedeemUntil(String date);

  /// No description provided for @vsPoints.
  ///
  /// In vi, this message translates to:
  /// **'{points} điểm'**
  String vsPoints(String points);

  /// No description provided for @vsNeedMore.
  ///
  /// In vi, this message translates to:
  /// **'Cần thêm {points} điểm'**
  String vsNeedMore(String points);

  /// No description provided for @vsRemaining.
  ///
  /// In vi, this message translates to:
  /// **'Còn {count} lượt'**
  String vsRemaining(int count);

  /// No description provided for @vsRedeem.
  ///
  /// In vi, this message translates to:
  /// **'Đổi'**
  String get vsRedeem;

  /// No description provided for @wTitle.
  ///
  /// In vi, this message translates to:
  /// **'Ví điểm'**
  String get wTitle;

  /// No description provided for @wLoadFailed.
  ///
  /// In vi, this message translates to:
  /// **'Không tải được ví điểm'**
  String get wLoadFailed;

  /// No description provided for @wEmpty.
  ///
  /// In vi, this message translates to:
  /// **'Chưa có giao dịch điểm'**
  String get wEmpty;

  /// No description provided for @wEmptyHint.
  ///
  /// In vi, this message translates to:
  /// **'Check-in điểm đến và hoàn thành nhiệm vụ để bắt đầu tích điểm.'**
  String get wEmptyHint;

  /// No description provided for @wBalance.
  ///
  /// In vi, this message translates to:
  /// **'Số dư hiện tại'**
  String get wBalance;

  /// No description provided for @wPointsUnit.
  ///
  /// In vi, this message translates to:
  /// **'điểm'**
  String get wPointsUnit;

  /// No description provided for @wRedeem.
  ///
  /// In vi, this message translates to:
  /// **'Đổi voucher'**
  String get wRedeem;

  /// No description provided for @wMilestoneHint.
  ///
  /// In vi, this message translates to:
  /// **'Mở khóa mốc hành trình để nhận thêm điểm thưởng'**
  String get wMilestoneHint;

  /// No description provided for @wHistory.
  ///
  /// In vi, this message translates to:
  /// **'Lịch sử điểm'**
  String get wHistory;

  /// No description provided for @badgeTypeCheckin.
  ///
  /// In vi, this message translates to:
  /// **'Check-in điểm đến'**
  String get badgeTypeCheckin;

  /// No description provided for @badgeTypeTour.
  ///
  /// In vi, this message translates to:
  /// **'Hoàn thành tour'**
  String get badgeTypeTour;

  /// No description provided for @badgeTypeTask.
  ///
  /// In vi, this message translates to:
  /// **'Bậc thầy nhiệm vụ'**
  String get badgeTypeTask;

  /// No description provided for @badgeTypeStreak.
  ///
  /// In vi, this message translates to:
  /// **'Chuỗi ngày'**
  String get badgeTypeStreak;

  /// No description provided for @badgeTypeEvent.
  ///
  /// In vi, this message translates to:
  /// **'Sự kiện đặc biệt'**
  String get badgeTypeEvent;

  /// No description provided for @badgeTypeOther.
  ///
  /// In vi, this message translates to:
  /// **'Huy hiệu'**
  String get badgeTypeOther;

  /// No description provided for @ptxTask.
  ///
  /// In vi, this message translates to:
  /// **'Hoàn thành nhiệm vụ'**
  String get ptxTask;

  /// No description provided for @ptxExperience.
  ///
  /// In vi, this message translates to:
  /// **'Trải nghiệm'**
  String get ptxExperience;

  /// No description provided for @ptxAchievement.
  ///
  /// In vi, this message translates to:
  /// **'Thưởng thành tựu'**
  String get ptxAchievement;

  /// No description provided for @ptxAdmin.
  ///
  /// In vi, this message translates to:
  /// **'Điều chỉnh bởi quản trị'**
  String get ptxAdmin;

  /// No description provided for @ptxVoucherRefund.
  ///
  /// In vi, this message translates to:
  /// **'Hoàn điểm voucher hết hạn'**
  String get ptxVoucherRefund;

  /// No description provided for @ptxOther.
  ///
  /// In vi, this message translates to:
  /// **'Giao dịch điểm'**
  String get ptxOther;

  /// No description provided for @voucherOutOfStock.
  ///
  /// In vi, this message translates to:
  /// **'Đã hết lượt đổi'**
  String get voucherOutOfStock;

  /// No description provided for @voucherNotStarted.
  ///
  /// In vi, this message translates to:
  /// **'Chưa mở đổi'**
  String get voucherNotStarted;

  /// No description provided for @jsEnded.
  ///
  /// In vi, this message translates to:
  /// **'Hành trình này đã kết thúc. Bạn có thể xem lại câu chuyện văn hóa đã mở khóa.'**
  String get jsEnded;

  /// No description provided for @jsAlreadyCheckedInCurrent.
  ///
  /// In vi, this message translates to:
  /// **'Bạn đã check-in điểm đến hiện tại rồi. Hãy hoàn thành nhiệm vụ để mở điểm đến kế tiếp.'**
  String get jsAlreadyCheckedInCurrent;

  /// No description provided for @jsQrTitle.
  ///
  /// In vi, this message translates to:
  /// **'Check-in bằng QR'**
  String get jsQrTitle;

  /// No description provided for @jsQrHint.
  ///
  /// In vi, this message translates to:
  /// **'Quét mã QR tại {place}'**
  String jsQrHint(String place);

  /// No description provided for @jsAlreadyCheckedInAt.
  ///
  /// In vi, this message translates to:
  /// **'Bạn đã check-in {place} rồi.'**
  String jsAlreadyCheckedInAt(String place);

  /// No description provided for @jsHeritageBadge.
  ///
  /// In vi, this message translates to:
  /// **'Huy hiệu di sản'**
  String get jsHeritageBadge;

  /// No description provided for @jsCheckInSuccessAt.
  ///
  /// In vi, this message translates to:
  /// **'Check-in thành công tại {place}. Đã mở khóa Nội dung văn hóa và Trải nghiệm.'**
  String jsCheckInSuccessAt(String place);

  /// No description provided for @jsExplore.
  ///
  /// In vi, this message translates to:
  /// **'Khám phá'**
  String get jsExplore;

  /// No description provided for @jsCheckInSuccess.
  ///
  /// In vi, this message translates to:
  /// **'Check-in thành công. Đã mở khóa Nội dung văn hóa và Trải nghiệm.'**
  String get jsCheckInSuccess;

  /// No description provided for @jsSkipTitle.
  ///
  /// In vi, this message translates to:
  /// **'Bỏ qua điểm đến?'**
  String get jsSkipTitle;

  /// No description provided for @jsSkipMessage.
  ///
  /// In vi, this message translates to:
  /// **'Bạn sẽ không nhận huy hiệu và điểm thưởng tại {place}. Hành trình tiếp tục ở điểm kế tiếp.'**
  String jsSkipMessage(String place);

  /// No description provided for @jsSkip.
  ///
  /// In vi, this message translates to:
  /// **'Bỏ qua'**
  String get jsSkip;

  /// No description provided for @jsNoLocation.
  ///
  /// In vi, this message translates to:
  /// **'Chưa lấy được vị trí'**
  String get jsNoLocation;

  /// No description provided for @jsOpenSettings.
  ///
  /// In vi, this message translates to:
  /// **'Mở cài đặt'**
  String get jsOpenSettings;

  /// No description provided for @jsCompletedJourney.
  ///
  /// In vi, this message translates to:
  /// **'Bạn đã hoàn thành hành trình'**
  String get jsCompletedJourney;

  /// No description provided for @jsAlreadyCheckedInShort.
  ///
  /// In vi, this message translates to:
  /// **'Bạn đã check-in rồi'**
  String get jsAlreadyCheckedInShort;

  /// No description provided for @jsCheckedInAllDone.
  ///
  /// In vi, this message translates to:
  /// **'Bạn đã check-in {place} và đi trọn hành trình. Không cần check-in thêm.'**
  String jsCheckedInAllDone(String place);

  /// No description provided for @jsCheckedInContinue.
  ///
  /// In vi, this message translates to:
  /// **'Bạn đã check-in {place} rồi. Hãy tiếp tục làm nhiệm vụ tại điểm đến này.'**
  String jsCheckedInContinue(String place);

  /// No description provided for @jsCannotCheckIn.
  ///
  /// In vi, this message translates to:
  /// **'Chưa thể check-in'**
  String get jsCannotCheckIn;

  /// No description provided for @jsRankPerfect.
  ///
  /// In vi, this message translates to:
  /// **'Hoàn thành trọn vẹn'**
  String get jsRankPerfect;

  /// No description provided for @jsRankPartial.
  ///
  /// In vi, this message translates to:
  /// **'Đã đi hết hành trình'**
  String get jsRankPartial;

  /// No description provided for @jsRankDone.
  ///
  /// In vi, this message translates to:
  /// **'Hoàn thành hành trình'**
  String get jsRankDone;

  /// No description provided for @jsCompletedPerfect.
  ///
  /// In vi, this message translates to:
  /// **'Bạn đã đi trọn \"{tour}\" và nhận thêm {bonus} điểm thưởng. Cảm ơn bạn đã lan tỏa di sản!'**
  String jsCompletedPerfect(String tour, String bonus);

  /// No description provided for @jsCompletedPartial.
  ///
  /// In vi, this message translates to:
  /// **'Bạn đã đi hết \"{tour}\". Cảm ơn bạn đã đồng hành cùng di sản!'**
  String jsCompletedPartial(String tour);

  /// No description provided for @jsViewSummary.
  ///
  /// In vi, this message translates to:
  /// **'Xem tổng kết'**
  String get jsViewSummary;

  /// No description provided for @jsEnableLocation.
  ///
  /// In vi, this message translates to:
  /// **'Hãy bật định vị và cho phép truy cập vị trí để chỉ đường.'**
  String get jsEnableLocation;

  /// No description provided for @jsNoRoute.
  ///
  /// In vi, this message translates to:
  /// **'Không tìm được đường tới điểm này.'**
  String get jsNoRoute;

  /// No description provided for @jsNear500.
  ///
  /// In vi, this message translates to:
  /// **'Còn chưa tới 500 m nữa là đến {place}'**
  String jsNear500(Object place);

  /// No description provided for @jsAlmostThere.
  ///
  /// In vi, this message translates to:
  /// **'Sắp tới nơi, chuẩn bị check-in'**
  String get jsAlmostThere;

  /// No description provided for @jsArrived.
  ///
  /// In vi, this message translates to:
  /// **'Bạn đã đến {place}'**
  String jsArrived(String place);

  /// No description provided for @jsRoute.
  ///
  /// In vi, this message translates to:
  /// **'Lộ trình'**
  String get jsRoute;

  /// No description provided for @jsMap.
  ///
  /// In vi, this message translates to:
  /// **'Bản đồ'**
  String get jsMap;

  /// No description provided for @jsHeritageStamps.
  ///
  /// In vi, this message translates to:
  /// **'Dấu ấn di sản'**
  String get jsHeritageStamps;

  /// No description provided for @jsCaptionSkipped.
  ///
  /// In vi, this message translates to:
  /// **'Bỏ qua'**
  String get jsCaptionSkipped;

  /// No description provided for @jsCaptionStamped.
  ///
  /// In vi, this message translates to:
  /// **'Đã đóng'**
  String get jsCaptionStamped;

  /// No description provided for @jsCaptionOpen.
  ///
  /// In vi, this message translates to:
  /// **'Đang mở'**
  String get jsCaptionOpen;

  /// No description provided for @jsStopN.
  ///
  /// In vi, this message translates to:
  /// **'Trạm {n}'**
  String jsStopN(int n);

  /// No description provided for @jsStampCount.
  ///
  /// In vi, this message translates to:
  /// **'{done}/{total} dấu'**
  String jsStampCount(int done, int total);

  /// No description provided for @jsPointsSuffix.
  ///
  /// In vi, this message translates to:
  /// **' điểm'**
  String get jsPointsSuffix;

  /// No description provided for @jsHeaderDone.
  ///
  /// In vi, this message translates to:
  /// **'Đã đi xong · {count} trạm'**
  String jsHeaderDone(int count);

  /// No description provided for @jsHeaderActive.
  ///
  /// In vi, this message translates to:
  /// **'Đang trải nghiệm · {count} trạm'**
  String jsHeaderActive(int count);

  /// No description provided for @jsNoPointsStop.
  ///
  /// In vi, this message translates to:
  /// **'Không tính điểm cho trạm này'**
  String get jsNoPointsStop;

  /// No description provided for @jsDoneReview.
  ///
  /// In vi, this message translates to:
  /// **'Đã xong · +{points} điểm · chạm để xem lại'**
  String jsDoneReview(int points);

  /// No description provided for @jsUnlockAfter.
  ///
  /// In vi, this message translates to:
  /// **'Mở khi xong trạm {n}'**
  String jsUnlockAfter(int n);

  /// No description provided for @jsChallengeCount.
  ///
  /// In vi, this message translates to:
  /// **'{count} thử thách'**
  String jsChallengeCount(int count);

  /// No description provided for @jsLocked.
  ///
  /// In vi, this message translates to:
  /// **'Chưa mở'**
  String get jsLocked;

  /// No description provided for @jsSkippedStatus.
  ///
  /// In vi, this message translates to:
  /// **'Đã bỏ qua'**
  String get jsSkippedStatus;

  /// No description provided for @jsAtStop.
  ///
  /// In vi, this message translates to:
  /// **'Bạn đang ở trạm'**
  String get jsAtStop;

  /// No description provided for @jsAtStopSince.
  ///
  /// In vi, this message translates to:
  /// **'Bạn đang ở trạm · check-in lúc {time}'**
  String jsAtStopSince(String time);

  /// No description provided for @jsStopOpenDistance.
  ///
  /// In vi, this message translates to:
  /// **'Trạm đang mở · cách {distance}'**
  String jsStopOpenDistance(String distance);

  /// No description provided for @jsStopOpen.
  ///
  /// In vi, this message translates to:
  /// **'Trạm đang mở'**
  String get jsStopOpen;

  /// No description provided for @jsStory.
  ///
  /// In vi, this message translates to:
  /// **'Câu chuyện'**
  String get jsStory;

  /// No description provided for @jsNoChallenges.
  ///
  /// In vi, this message translates to:
  /// **'Không có thử thách'**
  String get jsNoChallenges;

  /// No description provided for @jsChallengeProgress.
  ///
  /// In vi, this message translates to:
  /// **'{done}/{total} thử thách · +{points} điểm'**
  String jsChallengeProgress(int done, int total, int points);

  /// No description provided for @jsQuizQuestions.
  ///
  /// In vi, this message translates to:
  /// **'Câu đố {count} câu'**
  String jsQuizQuestions(int count);

  /// No description provided for @jsCultureTitle.
  ///
  /// In vi, this message translates to:
  /// **'Nội dung văn hóa'**
  String get jsCultureTitle;

  /// No description provided for @jsCultureFallback.
  ///
  /// In vi, this message translates to:
  /// **'Câu chuyện tại điểm'**
  String get jsCultureFallback;

  /// No description provided for @jsRead.
  ///
  /// In vi, this message translates to:
  /// **'Đã đọc'**
  String get jsRead;

  /// No description provided for @jsNew.
  ///
  /// In vi, this message translates to:
  /// **'Mới'**
  String get jsNew;

  /// No description provided for @jsExperienceTitle.
  ///
  /// In vi, this message translates to:
  /// **'Trải nghiệm'**
  String get jsExperienceTitle;

  /// No description provided for @jsExperienceFallback.
  ///
  /// In vi, this message translates to:
  /// **'Thử thách tại điểm'**
  String get jsExperienceFallback;

  /// No description provided for @jsCompletedBadge.
  ///
  /// In vi, this message translates to:
  /// **'Hoàn thành'**
  String get jsCompletedBadge;

  /// No description provided for @jsCheckInRadiusHint.
  ///
  /// In vi, this message translates to:
  /// **'Đến trong bán kính {radius} m quanh điểm đến rồi check-in trạm, hoặc quét mã QR dán tại cổng, để mở khóa Nội dung văn hóa và Trải nghiệm.'**
  String jsCheckInRadiusHint(String radius);

  /// No description provided for @jsCheckInHint.
  ///
  /// In vi, this message translates to:
  /// **'Đến nơi rồi check-in để mở khóa Nội dung văn hóa, Trải nghiệm và nhận huy hiệu di sản.'**
  String get jsCheckInHint;

  /// No description provided for @jsDirections.
  ///
  /// In vi, this message translates to:
  /// **'Chỉ đường'**
  String get jsDirections;

  /// No description provided for @jsCheckInStop.
  ///
  /// In vi, this message translates to:
  /// **'Check-in trạm'**
  String get jsCheckInStop;

  /// No description provided for @jsCheckInGps.
  ///
  /// In vi, this message translates to:
  /// **'Check-in GPS'**
  String get jsCheckInGps;

  /// No description provided for @jsScanQr.
  ///
  /// In vi, this message translates to:
  /// **'Quét mã QR tại điểm'**
  String get jsScanQr;

  /// No description provided for @jsSkipStop.
  ///
  /// In vi, this message translates to:
  /// **'Bỏ qua trạm này'**
  String get jsSkipStop;

  /// No description provided for @jsCompleteAll.
  ///
  /// In vi, this message translates to:
  /// **'Đi trọn {count} trạm'**
  String jsCompleteAll(int count);

  /// No description provided for @jsCompleteAllHint.
  ///
  /// In vi, this message translates to:
  /// **'Nhận điểm thưởng hoàn thành và bảng tổng kết chuyến đi. Bỏ qua trạm nào thì không có thưởng hoàn thành.'**
  String get jsCompleteAllHint;

  /// No description provided for @jsSkippedNoBonus.
  ///
  /// In vi, this message translates to:
  /// **'Bỏ qua {count} trạm nên chưa nhận thưởng hoàn thành.'**
  String jsSkippedNoBonus(int count);

  /// No description provided for @jsStatPoints.
  ///
  /// In vi, this message translates to:
  /// **'Điểm'**
  String get jsStatPoints;

  /// No description provided for @jsStatPerfectChallenges.
  ///
  /// In vi, this message translates to:
  /// **'Thử thách đạt trọn'**
  String get jsStatPerfectChallenges;

  /// No description provided for @jsStatStops.
  ///
  /// In vi, this message translates to:
  /// **'Trạm đã đi'**
  String get jsStatStops;

  /// No description provided for @jsEndedLabel.
  ///
  /// In vi, this message translates to:
  /// **'Hành trình đã kết thúc'**
  String get jsEndedLabel;

  /// No description provided for @jsEndedTitle.
  ///
  /// In vi, this message translates to:
  /// **'{points} điểm · {done}/{total} trạm'**
  String jsEndedTitle(int points, int done, int total);

  /// No description provided for @jsNextStop.
  ///
  /// In vi, this message translates to:
  /// **'Trạm kế tiếp'**
  String get jsNextStop;

  /// No description provided for @jsUnlockedCulture.
  ///
  /// In vi, this message translates to:
  /// **'Đã mở khóa · Nội dung văn hóa'**
  String get jsUnlockedCulture;

  /// No description provided for @jsReadStory.
  ///
  /// In vi, this message translates to:
  /// **'Đọc câu chuyện'**
  String get jsReadStory;

  /// No description provided for @jsUnlockedExperience.
  ///
  /// In vi, this message translates to:
  /// **'Đã mở khóa · Trải nghiệm'**
  String get jsUnlockedExperience;

  /// No description provided for @jsChallengesWaiting.
  ///
  /// In vi, this message translates to:
  /// **'{count} thử thách đang chờ'**
  String jsChallengesWaiting(int count);

  /// No description provided for @jsDirectionsTo.
  ///
  /// In vi, this message translates to:
  /// **'Chỉ đường tới {place}'**
  String jsDirectionsTo(String place);

  /// No description provided for @jsWholeRoute.
  ///
  /// In vi, this message translates to:
  /// **'Xem toàn bộ đường đi'**
  String get jsWholeRoute;

  /// No description provided for @jsWholeTour.
  ///
  /// In vi, this message translates to:
  /// **'Xem toàn tuyến'**
  String get jsWholeTour;

  /// No description provided for @jsFollowMe.
  ///
  /// In vi, this message translates to:
  /// **'Bám theo vị trí của tôi'**
  String get jsFollowMe;

  /// No description provided for @jsMyLocation.
  ///
  /// In vi, this message translates to:
  /// **'Vị trí của tôi'**
  String get jsMyLocation;

  /// No description provided for @jsStreetMap.
  ///
  /// In vi, this message translates to:
  /// **'Bản đồ đường phố'**
  String get jsStreetMap;

  /// No description provided for @jsSatellite.
  ///
  /// In vi, this message translates to:
  /// **'Ảnh vệ tinh'**
  String get jsSatellite;

  /// No description provided for @jsStateAtStop.
  ///
  /// In vi, this message translates to:
  /// **'đang ở trạm'**
  String get jsStateAtStop;

  /// No description provided for @jsStateOpen.
  ///
  /// In vi, this message translates to:
  /// **'đang mở'**
  String get jsStateOpen;

  /// No description provided for @jsStateSkipped.
  ///
  /// In vi, this message translates to:
  /// **'đã bỏ qua'**
  String get jsStateSkipped;

  /// No description provided for @jsStateDone.
  ///
  /// In vi, this message translates to:
  /// **'đã xong'**
  String get jsStateDone;

  /// No description provided for @jsStateLocked.
  ///
  /// In vi, this message translates to:
  /// **'chưa mở'**
  String get jsStateLocked;

  /// No description provided for @jsChallengesLeft.
  ///
  /// In vi, this message translates to:
  /// **'{count} thử thách còn lại'**
  String jsChallengesLeft(int count);

  /// No description provided for @jsAllChallengesDone.
  ///
  /// In vi, this message translates to:
  /// **'Đã làm hết thử thách'**
  String get jsAllChallengesDone;

  /// No description provided for @jsDistanceAway.
  ///
  /// In vi, this message translates to:
  /// **'Cách {distance}'**
  String jsDistanceAway(String distance);

  /// No description provided for @jsArriveToCheckIn.
  ///
  /// In vi, this message translates to:
  /// **'Đến nơi để check-in'**
  String get jsArriveToCheckIn;

  /// No description provided for @jsNoPointsHere.
  ///
  /// In vi, this message translates to:
  /// **'Không nhận điểm tại trạm này'**
  String get jsNoPointsHere;

  /// No description provided for @jsStopState.
  ///
  /// In vi, this message translates to:
  /// **'Trạm {n} · {state}'**
  String jsStopState(int n, String state);

  /// No description provided for @jsViewStop.
  ///
  /// In vi, this message translates to:
  /// **'Xem trạm'**
  String get jsViewStop;

  /// No description provided for @jsLoadFailed.
  ///
  /// In vi, this message translates to:
  /// **'Không tải được hành trình.'**
  String get jsLoadFailed;

  /// No description provided for @jsOpenTile.
  ///
  /// In vi, this message translates to:
  /// **'Mở {title}'**
  String jsOpenTile(String title);

  /// No description provided for @jsTileLocked.
  ///
  /// In vi, this message translates to:
  /// **'{title}, check-in để mở khóa'**
  String jsTileLocked(String title);

  /// No description provided for @jsCheckInToUnlock.
  ///
  /// In vi, this message translates to:
  /// **'Check-in để mở khóa\n{info}'**
  String jsCheckInToUnlock(String info);

  /// No description provided for @tkMapsFailed.
  ///
  /// In vi, this message translates to:
  /// **'Không mở được ứng dụng bản đồ.'**
  String get tkMapsFailed;

  /// No description provided for @tkQrMismatchActivity.
  ///
  /// In vi, this message translates to:
  /// **'Mã QR không khớp với điểm hoạt động này. Hãy quét đúng mã tại chỗ.'**
  String get tkQrMismatchActivity;

  /// No description provided for @tkQrMismatchStop.
  ///
  /// In vi, this message translates to:
  /// **'Mã QR không khớp với trạm này. Hãy thử lại.'**
  String get tkQrMismatchStop;

  /// No description provided for @tkQrConfirmTitle.
  ///
  /// In vi, this message translates to:
  /// **'Quét QR xác nhận hoàn thành'**
  String get tkQrConfirmTitle;

  /// No description provided for @tkQrStopTitle.
  ///
  /// In vi, this message translates to:
  /// **'Quét QR tại trạm'**
  String get tkQrStopTitle;

  /// No description provided for @tkQrAtPlace.
  ///
  /// In vi, this message translates to:
  /// **'Quét mã QR tại {place}'**
  String tkQrAtPlace(String place);

  /// No description provided for @tkQrNextStop.
  ///
  /// In vi, this message translates to:
  /// **'Quét mã QR tại trạm kế tiếp'**
  String get tkQrNextStop;

  /// No description provided for @tkCheckedIn.
  ///
  /// In vi, this message translates to:
  /// **'Đã check-in!'**
  String get tkCheckedIn;

  /// No description provided for @tkNoLocation.
  ///
  /// In vi, this message translates to:
  /// **'Chưa xác định được vị trí của bạn. Hãy bật GPS rồi thử lại.'**
  String get tkNoLocation;

  /// No description provided for @tkTooFarToCheckIn.
  ///
  /// In vi, this message translates to:
  /// **'Bạn còn cách trạm {distance}. Hãy vào trong bán kính {radius} m để check-in.'**
  String tkTooFarToCheckIn(String distance, String radius);

  /// No description provided for @tkTimeUpTitle.
  ///
  /// In vi, this message translates to:
  /// **'Hết giờ: {name}'**
  String tkTimeUpTitle(String name);

  /// No description provided for @tkTimeUpBody.
  ///
  /// In vi, this message translates to:
  /// **'Quét mã QR tại {place} để trả lời câu hỏi và nhận điểm.'**
  String tkTimeUpBody(String place);

  /// No description provided for @tkTimeUp.
  ///
  /// In vi, this message translates to:
  /// **'Hết giờ!'**
  String get tkTimeUp;

  /// No description provided for @tkPlusPoints.
  ///
  /// In vi, this message translates to:
  /// **'+{points} điểm'**
  String tkPlusPoints(int points);

  /// No description provided for @tkLeg.
  ///
  /// In vi, this message translates to:
  /// **'Chặng {current}/{total}'**
  String tkLeg(int current, int total);

  /// No description provided for @tkClue.
  ///
  /// In vi, this message translates to:
  /// **'Manh mối'**
  String get tkClue;

  /// No description provided for @tkGotIt.
  ///
  /// In vi, this message translates to:
  /// **'Đã rõ'**
  String get tkGotIt;

  /// No description provided for @tkLoadFailed.
  ///
  /// In vi, this message translates to:
  /// **'Không tải được nhiệm vụ.'**
  String get tkLoadFailed;

  /// No description provided for @tkFieldMission.
  ///
  /// In vi, this message translates to:
  /// **'Nhiệm vụ thực địa'**
  String get tkFieldMission;

  /// No description provided for @tkHeritageQuiz.
  ///
  /// In vi, this message translates to:
  /// **'Đố vui di sản'**
  String get tkHeritageQuiz;

  /// No description provided for @tkQuestionsLabel.
  ///
  /// In vi, this message translates to:
  /// **'câu hỏi'**
  String get tkQuestionsLabel;

  /// No description provided for @tkBonusLabel.
  ///
  /// In vi, this message translates to:
  /// **'điểm thưởng'**
  String get tkBonusLabel;

  /// No description provided for @tkAttemptsLabel.
  ///
  /// In vi, this message translates to:
  /// **'lượt còn lại'**
  String get tkAttemptsLabel;

  /// No description provided for @tkRules.
  ///
  /// In vi, this message translates to:
  /// **'Thể lệ'**
  String get tkRules;

  /// No description provided for @tkRuleAllCorrect.
  ///
  /// In vi, this message translates to:
  /// **'Trả lời đúng tất cả câu hỏi để nhận trọn điểm thưởng (chỉ một lần).'**
  String get tkRuleAllCorrect;

  /// No description provided for @tkRuleLocation.
  ///
  /// In vi, this message translates to:
  /// **'Mỗi câu hỏi gắn với một địa điểm. Bạn cần đứng trong bán kính của trạm để mở câu hỏi.'**
  String get tkRuleLocation;

  /// No description provided for @tkRuleRestart.
  ///
  /// In vi, this message translates to:
  /// **'Trả lời sai một câu, bạn sẽ phải làm lại từ câu đầu.'**
  String get tkRuleRestart;

  /// No description provided for @tkRuleRetry.
  ///
  /// In vi, this message translates to:
  /// **'Chưa đúng hết, bạn có thể làm lại nếu còn lượt (tối đa {max} lượt).'**
  String tkRuleRetry(int max);

  /// No description provided for @tkMissionDone.
  ///
  /// In vi, this message translates to:
  /// **'Bạn đã hoàn thành nhiệm vụ này.'**
  String get tkMissionDone;

  /// No description provided for @tkNoAttempts.
  ///
  /// In vi, this message translates to:
  /// **'Bạn đã hết lượt làm nhiệm vụ này.'**
  String get tkNoAttempts;

  /// No description provided for @tkDirectionsToStop.
  ///
  /// In vi, this message translates to:
  /// **'Chỉ đường tới trạm'**
  String get tkDirectionsToStop;

  /// No description provided for @tkRetryMission.
  ///
  /// In vi, this message translates to:
  /// **'Làm lại nhiệm vụ'**
  String get tkRetryMission;

  /// No description provided for @tkStartMission.
  ///
  /// In vi, this message translates to:
  /// **'Bắt đầu nhiệm vụ'**
  String get tkStartMission;

  /// No description provided for @tkViewClue.
  ///
  /// In vi, this message translates to:
  /// **'Xem manh mối'**
  String get tkViewClue;

  /// No description provided for @tkStages.
  ///
  /// In vi, this message translates to:
  /// **'Các chặng'**
  String get tkStages;

  /// No description provided for @tkStagesDone.
  ///
  /// In vi, this message translates to:
  /// **'{done}/{total} hoàn thành'**
  String tkStagesDone(int done, int total);

  /// No description provided for @tkUnlockAfterStage.
  ///
  /// In vi, this message translates to:
  /// **'Mở khóa sau chặng {n}'**
  String tkUnlockAfterStage(int n);

  /// No description provided for @tkLocating.
  ///
  /// In vi, this message translates to:
  /// **'Đang xác định vị trí...'**
  String get tkLocating;

  /// No description provided for @tkNoPosition.
  ///
  /// In vi, this message translates to:
  /// **'Chưa có vị trí của bạn'**
  String get tkNoPosition;

  /// No description provided for @tkArrivedReady.
  ///
  /// In vi, this message translates to:
  /// **'Bạn đã tới trạm, sẵn sàng mở câu hỏi'**
  String get tkArrivedReady;

  /// No description provided for @tkDistanceRadius.
  ///
  /// In vi, this message translates to:
  /// **'Cách {distance} · bán kính {radius} m'**
  String tkDistanceRadius(String distance, String radius);

  /// No description provided for @tkStageAt.
  ///
  /// In vi, this message translates to:
  /// **'Chặng {n} · {place}'**
  String tkStageAt(int n, String place);

  /// No description provided for @tkRefreshDistance.
  ///
  /// In vi, this message translates to:
  /// **'Cập nhật khoảng cách'**
  String get tkRefreshDistance;

  /// No description provided for @tkShowBoth.
  ///
  /// In vi, this message translates to:
  /// **'Xem cả bạn và trạm'**
  String get tkShowBoth;

  /// No description provided for @tkStopOf.
  ///
  /// In vi, this message translates to:
  /// **'Trạm {current}/{total}'**
  String tkStopOf(int current, int total);

  /// No description provided for @tkLocatingYou.
  ///
  /// In vi, this message translates to:
  /// **'Đang xác định vị trí của bạn...'**
  String get tkLocatingYou;

  /// No description provided for @tkTooFarToWalk.
  ///
  /// In vi, this message translates to:
  /// **'Khá xa để đi bộ{eta}. Hãy đi xe tới gần rồi đi bộ vào trạm.'**
  String tkTooFarToWalk(String eta);

  /// No description provided for @tkWalkRoute.
  ///
  /// In vi, this message translates to:
  /// **'Đi bộ ~{duration} theo đường trên bản đồ'**
  String tkWalkRoute(String duration);

  /// No description provided for @tkTurnHeading.
  ///
  /// In vi, this message translates to:
  /// **'{turn} · hướng {direction}'**
  String tkTurnHeading(String turn, String direction);

  /// No description provided for @tkHeadTo.
  ///
  /// In vi, this message translates to:
  /// **'Đi về hướng {direction}'**
  String tkHeadTo(String direction);

  /// No description provided for @tkArrivedAtStop.
  ///
  /// In vi, this message translates to:
  /// **'Bạn đã tới trạm'**
  String get tkArrivedAtStop;

  /// No description provided for @tkCheckedInPressStart.
  ///
  /// In vi, this message translates to:
  /// **'Đã check-in · bấm \"Bắt đầu nhiệm vụ\"'**
  String get tkCheckedInPressStart;

  /// No description provided for @tkPressCheckIn.
  ///
  /// In vi, this message translates to:
  /// **'Bấm \"Check-in\" để xác nhận đã tới nơi'**
  String get tkPressCheckIn;

  /// No description provided for @tkOpeningQuestion.
  ///
  /// In vi, this message translates to:
  /// **'Đang mở câu hỏi...'**
  String get tkOpeningQuestion;

  /// No description provided for @tkQuestionAutoOpen.
  ///
  /// In vi, this message translates to:
  /// **'Câu hỏi sẽ tự mở'**
  String get tkQuestionAutoOpen;

  /// No description provided for @tkRadius.
  ///
  /// In vi, this message translates to:
  /// **'Bán kính {radius} m'**
  String tkRadius(String radius);

  /// No description provided for @tkOpenLocationSettings.
  ///
  /// In vi, this message translates to:
  /// **'Mở cài đặt vị trí'**
  String get tkOpenLocationSettings;

  /// No description provided for @tkStartMissionTimed.
  ///
  /// In vi, this message translates to:
  /// **'Bắt đầu nhiệm vụ · {duration}'**
  String tkStartMissionTimed(String duration);

  /// No description provided for @tkCheckInAtStop.
  ///
  /// In vi, this message translates to:
  /// **'Check-in tại trạm'**
  String get tkCheckInAtStop;

  /// No description provided for @tkNotAtStop.
  ///
  /// In vi, this message translates to:
  /// **'Chưa tới trạm'**
  String get tkNotAtStop;

  /// No description provided for @tkNotAtStopDistance.
  ///
  /// In vi, this message translates to:
  /// **'Chưa tới trạm · còn {distance}'**
  String tkNotAtStopDistance(String distance);

  /// No description provided for @tkOpenQuestion.
  ///
  /// In vi, this message translates to:
  /// **'Mở câu hỏi'**
  String get tkOpenQuestion;

  /// No description provided for @tkGoogleMaps.
  ///
  /// In vi, this message translates to:
  /// **'Chỉ đường bằng Google Maps'**
  String get tkGoogleMaps;

  /// No description provided for @tkCheckLocation.
  ///
  /// In vi, this message translates to:
  /// **'Kiểm tra vị trí'**
  String get tkCheckLocation;

  /// No description provided for @tkNextStop.
  ///
  /// In vi, this message translates to:
  /// **'Trạm kế tiếp'**
  String get tkNextStop;

  /// No description provided for @tkNextPlace.
  ///
  /// In vi, this message translates to:
  /// **'Địa điểm kế tiếp'**
  String get tkNextPlace;

  /// No description provided for @tkFindQr.
  ///
  /// In vi, this message translates to:
  /// **'Tìm mã QR đặt tại trạm và quét để mở câu hỏi.'**
  String get tkFindQr;

  /// No description provided for @tkStartActivity.
  ///
  /// In vi, this message translates to:
  /// **'Bắt đầu hoạt động'**
  String get tkStartActivity;

  /// No description provided for @tkActivityDone.
  ///
  /// In vi, this message translates to:
  /// **'Hoàn thành hoạt động! Quét mã QR tại điểm để trả lời câu hỏi.'**
  String get tkActivityDone;

  /// No description provided for @tkActivityInProgress.
  ///
  /// In vi, this message translates to:
  /// **'Thực hiện hoạt động tại chỗ. Hết giờ bạn sẽ được quét mã QR.'**
  String get tkActivityInProgress;

  /// No description provided for @tkCorrectReward.
  ///
  /// In vi, this message translates to:
  /// **'Trả lời đúng nhận +{points} điểm'**
  String tkCorrectReward(int points);

  /// No description provided for @tkScanQrOnSite.
  ///
  /// In vi, this message translates to:
  /// **'Quét mã QR tại điểm'**
  String get tkScanQrOnSite;

  /// No description provided for @tkSkipCountdownDev.
  ///
  /// In vi, this message translates to:
  /// **'Bỏ qua đếm ngược (dev)'**
  String get tkSkipCountdownDev;

  /// No description provided for @tkNoQuestions.
  ///
  /// In vi, this message translates to:
  /// **'Nhiệm vụ này chưa có câu hỏi.'**
  String get tkNoQuestions;

  /// No description provided for @tkQuestionOf.
  ///
  /// In vi, this message translates to:
  /// **'Câu {current} / {total}'**
  String tkQuestionOf(int current, int total);

  /// No description provided for @tkAtPlace.
  ///
  /// In vi, this message translates to:
  /// **'Tại: {place}'**
  String tkAtPlace(String place);

  /// No description provided for @tkConfirmAnswer.
  ///
  /// In vi, this message translates to:
  /// **'Xác nhận câu trả lời'**
  String get tkConfirmAnswer;

  /// No description provided for @tkSubmit.
  ///
  /// In vi, this message translates to:
  /// **'Nộp bài'**
  String get tkSubmit;

  /// No description provided for @tkNextQuestion.
  ///
  /// In vi, this message translates to:
  /// **'Câu tiếp theo'**
  String get tkNextQuestion;

  /// No description provided for @tkAnswerHint.
  ///
  /// In vi, this message translates to:
  /// **'Nhập câu trả lời của bạn...'**
  String get tkAnswerHint;

  /// No description provided for @tkExcellent.
  ///
  /// In vi, this message translates to:
  /// **'Xuất sắc!'**
  String get tkExcellent;

  /// No description provided for @tkCompleted.
  ///
  /// In vi, this message translates to:
  /// **'Hoàn thành!'**
  String get tkCompleted;

  /// No description provided for @tkSubmitted.
  ///
  /// In vi, this message translates to:
  /// **'Đã nộp bài'**
  String get tkSubmitted;

  /// No description provided for @tkResultScore.
  ///
  /// In vi, this message translates to:
  /// **'Bạn trả lời đúng {correct}/{total} câu của \"{name}\".'**
  String tkResultScore(int correct, int total, String name);

  /// No description provided for @tkMissionCompleted.
  ///
  /// In vi, this message translates to:
  /// **'Bạn đã hoàn thành nhiệm vụ \"{name}\".'**
  String tkMissionCompleted(String name);

  /// No description provided for @tkCorrect.
  ///
  /// In vi, this message translates to:
  /// **'Chính xác!'**
  String get tkCorrect;

  /// No description provided for @tkCorrectSoFar.
  ///
  /// In vi, this message translates to:
  /// **'Bạn đã trả lời đúng {current}/{total} câu. Hãy đến địa điểm kế tiếp để mở câu hỏi tiếp theo.'**
  String tkCorrectSoFar(int current, int total);

  /// No description provided for @tkIncorrect.
  ///
  /// In vi, this message translates to:
  /// **'Chưa chính xác'**
  String get tkIncorrect;

  /// No description provided for @tkRetryInfo.
  ///
  /// In vi, this message translates to:
  /// **'Bạn đúng {correct}/{total} câu. Cần đúng tất cả để nhận điểm. Còn {attempts} lượt làm lại.'**
  String tkRetryInfo(int correct, int total, int attempts);

  /// No description provided for @tkBonusPoints.
  ///
  /// In vi, this message translates to:
  /// **'+{points} điểm thưởng'**
  String tkBonusPoints(int points);

  /// No description provided for @tkGoNextPlace.
  ///
  /// In vi, this message translates to:
  /// **'Đến địa điểm kế tiếp'**
  String get tkGoNextPlace;

  /// No description provided for @tkRetry.
  ///
  /// In vi, this message translates to:
  /// **'Làm lại'**
  String get tkRetry;

  /// No description provided for @tkBackToJourney.
  ///
  /// In vi, this message translates to:
  /// **'Về hành trình'**
  String get tkBackToJourney;

  /// No description provided for @navArrived.
  ///
  /// In vi, this message translates to:
  /// **'Bạn đã đến nơi'**
  String get navArrived;

  /// No description provided for @navRerouting.
  ///
  /// In vi, this message translates to:
  /// **'Đang tìm lại đường…'**
  String get navRerouting;

  /// No description provided for @navOffRoute.
  ///
  /// In vi, this message translates to:
  /// **'Bạn đã đi khác tuyến gợi ý'**
  String get navOffRoute;

  /// No description provided for @navStart.
  ///
  /// In vi, this message translates to:
  /// **'Bắt đầu đi'**
  String get navStart;

  /// No description provided for @navContinueFor.
  ///
  /// In vi, this message translates to:
  /// **'Đi tiếp {distance}'**
  String navContinueFor(String distance);

  /// No description provided for @navTo.
  ///
  /// In vi, this message translates to:
  /// **'Tới {place}'**
  String navTo(String place);

  /// No description provided for @navThen.
  ///
  /// In vi, this message translates to:
  /// **'Sau đó'**
  String get navThen;

  /// No description provided for @navArrivedAtStop.
  ///
  /// In vi, this message translates to:
  /// **'ĐÃ ĐẾN TRẠM {n}'**
  String navArrivedAtStop(String n);

  /// No description provided for @navRouteToStop.
  ///
  /// In vi, this message translates to:
  /// **'ĐƯỜNG TỚI TRẠM {n}'**
  String navRouteToStop(String n);

  /// No description provided for @navEnd.
  ///
  /// In vi, this message translates to:
  /// **'Kết thúc chỉ đường'**
  String get navEnd;

  /// No description provided for @navFinding.
  ///
  /// In vi, this message translates to:
  /// **'Đang tìm đường…'**
  String get navFinding;

  /// No description provided for @navNoRoute.
  ///
  /// In vi, this message translates to:
  /// **'Không tìm được đường'**
  String get navNoRoute;

  /// No description provided for @navArriveAt.
  ///
  /// In vi, this message translates to:
  /// **'Đến lúc {time}'**
  String navArriveAt(String time);

  /// No description provided for @navOnTheWay.
  ///
  /// In vi, this message translates to:
  /// **'TRÊN ĐƯỜNG ĐI'**
  String get navOnTheWay;

  /// No description provided for @navCheckInHint.
  ///
  /// In vi, this message translates to:
  /// **'Check-in để mở khóa Nội dung văn hóa và Trải nghiệm tại trạm này.'**
  String get navCheckInHint;

  /// No description provided for @navSteps.
  ///
  /// In vi, this message translates to:
  /// **'Các bước'**
  String get navSteps;

  /// No description provided for @navViewSteps.
  ///
  /// In vi, this message translates to:
  /// **'Xem {count} bước chỉ đường'**
  String navViewSteps(int count);

  /// No description provided for @navOpenGoogleMaps.
  ///
  /// In vi, this message translates to:
  /// **'Mở Google Maps (có giọng nói)'**
  String get navOpenGoogleMaps;

  /// No description provided for @navDirectionSteps.
  ///
  /// In vi, this message translates to:
  /// **'Các bước chỉ đường'**
  String get navDirectionSteps;

  /// No description provided for @navGoStraight.
  ///
  /// In vi, this message translates to:
  /// **'Đi tiếp'**
  String get navGoStraight;

  /// No description provided for @navWalk.
  ///
  /// In vi, this message translates to:
  /// **'Đi bộ'**
  String get navWalk;

  /// No description provided for @navBike.
  ///
  /// In vi, this message translates to:
  /// **'Xe 2 bánh'**
  String get navBike;

  /// No description provided for @navCar.
  ///
  /// In vi, this message translates to:
  /// **'Ô tô'**
  String get navCar;

  /// No description provided for @compassN.
  ///
  /// In vi, this message translates to:
  /// **'Bắc'**
  String get compassN;

  /// No description provided for @compassNE.
  ///
  /// In vi, this message translates to:
  /// **'Đông Bắc'**
  String get compassNE;

  /// No description provided for @compassE.
  ///
  /// In vi, this message translates to:
  /// **'Đông'**
  String get compassE;

  /// No description provided for @compassSE.
  ///
  /// In vi, this message translates to:
  /// **'Đông Nam'**
  String get compassSE;

  /// No description provided for @compassS.
  ///
  /// In vi, this message translates to:
  /// **'Nam'**
  String get compassS;

  /// No description provided for @compassSW.
  ///
  /// In vi, this message translates to:
  /// **'Tây Nam'**
  String get compassSW;

  /// No description provided for @compassW.
  ///
  /// In vi, this message translates to:
  /// **'Tây'**
  String get compassW;

  /// No description provided for @compassNW.
  ///
  /// In vi, this message translates to:
  /// **'Tây Bắc'**
  String get compassNW;

  /// No description provided for @turnStraight.
  ///
  /// In vi, this message translates to:
  /// **'Đi thẳng'**
  String get turnStraight;

  /// No description provided for @turnBack.
  ///
  /// In vi, this message translates to:
  /// **'Quay lại'**
  String get turnBack;

  /// No description provided for @turnRight.
  ///
  /// In vi, this message translates to:
  /// **'Rẽ phải'**
  String get turnRight;

  /// No description provided for @turnLeft.
  ///
  /// In vi, this message translates to:
  /// **'Rẽ trái'**
  String get turnLeft;

  /// No description provided for @mapCredit.
  ///
  /// In vi, this message translates to:
  /// **'Bản đồ: © Goong'**
  String get mapCredit;

  /// No description provided for @sumPerfectTitle.
  ///
  /// In vi, this message translates to:
  /// **'Hoàn thành trọn vẹn'**
  String get sumPerfectTitle;

  /// No description provided for @sumPerfectSubtitle.
  ///
  /// In vi, this message translates to:
  /// **'Bạn đã chinh phục mọi điểm đến và trả lời đúng mọi thử thách.'**
  String get sumPerfectSubtitle;

  /// No description provided for @sumPartialSubtitle.
  ///
  /// In vi, this message translates to:
  /// **'Bạn đã bỏ qua {count} điểm đến. Lần sau hãy thử đi đủ để nhận thưởng hoàn thành.'**
  String sumPartialSubtitle(int count);

  /// No description provided for @sumDoneSubtitle.
  ///
  /// In vi, this message translates to:
  /// **'Bạn đã đi đủ mọi điểm đến. Vài thử thách còn chưa trọn điểm, thử lại ở chuyến sau nhé!'**
  String get sumDoneSubtitle;

  /// No description provided for @sumTitle.
  ///
  /// In vi, this message translates to:
  /// **'Tổng kết hành trình'**
  String get sumTitle;

  /// No description provided for @sumPointsEarned.
  ///
  /// In vi, this message translates to:
  /// **'điểm nhận được'**
  String get sumPointsEarned;

  /// No description provided for @sumDestinationsVisited.
  ///
  /// In vi, this message translates to:
  /// **'điểm đến đã ghé'**
  String get sumDestinationsVisited;

  /// No description provided for @sumPerfectChallenges.
  ///
  /// In vi, this message translates to:
  /// **'thử thách đạt trọn'**
  String get sumPerfectChallenges;

  /// No description provided for @sumDuration.
  ///
  /// In vi, this message translates to:
  /// **'thời gian trải nghiệm'**
  String get sumDuration;

  /// No description provided for @sumRoute.
  ///
  /// In vi, this message translates to:
  /// **'Lộ trình đã đi'**
  String get sumRoute;

  /// No description provided for @sumEachDestination.
  ///
  /// In vi, this message translates to:
  /// **'Từng điểm đến'**
  String get sumEachDestination;

  /// No description provided for @sumShare.
  ///
  /// In vi, this message translates to:
  /// **'Chia sẻ thành tích'**
  String get sumShare;

  /// No description provided for @sumReview.
  ///
  /// In vi, this message translates to:
  /// **'Xem lại hành trình'**
  String get sumReview;

  /// No description provided for @sumBonus.
  ///
  /// In vi, this message translates to:
  /// **'Thưởng hoàn thành: +{bonus} điểm (đã gồm trong tổng {total} điểm)'**
  String sumBonus(String bonus, int total);

  /// No description provided for @sumNoBonus.
  ///
  /// In vi, this message translates to:
  /// **'Không có thưởng hoàn thành vì có điểm đến bị bỏ qua.'**
  String get sumNoBonus;

  /// No description provided for @sumDestinationN.
  ///
  /// In vi, this message translates to:
  /// **'Điểm {n} · {name}'**
  String sumDestinationN(int n, String name);

  /// No description provided for @sumDestinationStats.
  ///
  /// In vi, this message translates to:
  /// **'{done}/{total} nhiệm vụ · +{points} điểm'**
  String sumDestinationStats(int done, int total, int points);

  /// No description provided for @sumNoAttempts.
  ///
  /// In vi, this message translates to:
  /// **'Hết lượt'**
  String get sumNoAttempts;

  /// No description provided for @shareImageFailed.
  ///
  /// In vi, this message translates to:
  /// **'Không tạo được ảnh'**
  String get shareImageFailed;

  /// No description provided for @shareText.
  ///
  /// In vi, this message translates to:
  /// **'Mình vừa hoàn thành \"{tour}\" cùng JourneyGo: {points} điểm, {done}/{total} trạm di sản!'**
  String shareText(String tour, int points, int done, int total);

  /// No description provided for @shareSubject.
  ///
  /// In vi, this message translates to:
  /// **'Hành trình di sản cùng JourneyGo'**
  String get shareSubject;

  /// No description provided for @shareFailed.
  ///
  /// In vi, this message translates to:
  /// **'Không chia sẻ được ảnh. Vui lòng thử lại.'**
  String get shareFailed;

  /// No description provided for @shareImage.
  ///
  /// In vi, this message translates to:
  /// **'Chia sẻ ảnh'**
  String get shareImage;

  /// No description provided for @shareRankPerfect.
  ///
  /// In vi, this message translates to:
  /// **'HOÀN THÀNH TRỌN VẸN'**
  String get shareRankPerfect;

  /// No description provided for @shareRankPartial.
  ///
  /// In vi, this message translates to:
  /// **'ĐÃ ĐI HẾT HÀNH TRÌNH'**
  String get shareRankPartial;

  /// No description provided for @shareRankDone.
  ///
  /// In vi, this message translates to:
  /// **'HOÀN THÀNH HÀNH TRÌNH'**
  String get shareRankDone;

  /// No description provided for @shareStatPoints.
  ///
  /// In vi, this message translates to:
  /// **'điểm'**
  String get shareStatPoints;

  /// No description provided for @shareStatStops.
  ///
  /// In vi, this message translates to:
  /// **'trạm'**
  String get shareStatStops;

  /// No description provided for @shareStatChallenges.
  ///
  /// In vi, this message translates to:
  /// **'thử thách'**
  String get shareStatChallenges;

  /// No description provided for @shareStamps.
  ///
  /// In vi, this message translates to:
  /// **'DẤU ẤN DI SẢN · {count} DẤU ẤN'**
  String shareStamps(int count);

  /// No description provided for @shareFooter.
  ///
  /// In vi, this message translates to:
  /// **'Khám phá di sản Việt cùng JourneyGo · journeygo.id.vn'**
  String get shareFooter;

  /// No description provided for @seInZone.
  ///
  /// In vi, this message translates to:
  /// **'bạn đang ở trong vùng'**
  String get seInZone;

  /// No description provided for @seDistance.
  ///
  /// In vi, this message translates to:
  /// **'cách {distance}'**
  String seDistance(String distance);

  /// No description provided for @seStopHeader.
  ///
  /// In vi, this message translates to:
  /// **'TRẠM {n}  ·  {name}'**
  String seStopHeader(String n, String name);

  /// No description provided for @seHeadline.
  ///
  /// In vi, this message translates to:
  /// **'Tự tay khám phá di sản'**
  String get seHeadline;

  /// No description provided for @seMapHint.
  ///
  /// In vi, this message translates to:
  /// **'Bấm vào số trên bản đồ để mở hoạt động. Vào trong vòng tròn của hoạt động mới bắt đầu được.'**
  String get seMapHint;

  /// No description provided for @seNoChallenges.
  ///
  /// In vi, this message translates to:
  /// **'Trạm này không có thử thách.'**
  String get seNoChallenges;

  /// No description provided for @seAllDone.
  ///
  /// In vi, this message translates to:
  /// **'Đã hoàn thành mọi thử thách'**
  String get seAllDone;

  /// No description provided for @seDone.
  ///
  /// In vi, this message translates to:
  /// **'Thử thách đã làm'**
  String get seDone;

  /// No description provided for @seAnyOrder.
  ///
  /// In vi, this message translates to:
  /// **'Làm theo thứ tự bất kỳ. Hoạt động thực địa cần quét mã QR tại điểm để xác nhận.'**
  String get seAnyOrder;

  /// No description provided for @sePartial.
  ///
  /// In vi, this message translates to:
  /// **'Đúng một phần'**
  String get sePartial;

  /// No description provided for @seNoAttempts.
  ///
  /// In vi, this message translates to:
  /// **'Đã hết lượt'**
  String get seNoAttempts;

  /// No description provided for @seAttempts.
  ///
  /// In vi, this message translates to:
  /// **'Đã làm {count} lượt'**
  String seAttempts(int count);

  /// No description provided for @seNotStarted.
  ///
  /// In vi, this message translates to:
  /// **'Chưa làm'**
  String get seNotStarted;

  /// No description provided for @seCulturalQuiz.
  ///
  /// In vi, this message translates to:
  /// **'Câu đố văn hóa'**
  String get seCulturalQuiz;

  /// No description provided for @seFieldActivity.
  ///
  /// In vi, this message translates to:
  /// **'Hoạt động thực địa'**
  String get seFieldActivity;

  /// No description provided for @seLocationPuzzle.
  ///
  /// In vi, this message translates to:
  /// **'Giải đố theo vị trí'**
  String get seLocationPuzzle;

  /// No description provided for @seChallenge.
  ///
  /// In vi, this message translates to:
  /// **'Thử thách'**
  String get seChallenge;

  /// No description provided for @seQuestions.
  ///
  /// In vi, this message translates to:
  /// **'{count} câu hỏi'**
  String seQuestions(int count);

  /// No description provided for @seScanQr.
  ///
  /// In vi, this message translates to:
  /// **'quét QR tại điểm'**
  String get seScanQr;

  /// No description provided for @seChallengeHeader.
  ///
  /// In vi, this message translates to:
  /// **'THỬ THÁCH {n}  ·  {kind}'**
  String seChallengeHeader(String n, String kind);

  /// No description provided for @seMaxPoints.
  ///
  /// In vi, this message translates to:
  /// **'Tối đa +{max} điểm'**
  String seMaxPoints(int max);

  /// No description provided for @seEarnedPoints.
  ///
  /// In vi, this message translates to:
  /// **'+{earned}{max} điểm'**
  String seEarnedPoints(int earned, String max);

  /// No description provided for @scStopHeader.
  ///
  /// In vi, this message translates to:
  /// **'TRẠM {n}  ·  NỘI DUNG VĂN HÓA'**
  String scStopHeader(String n);

  /// No description provided for @scVideo.
  ///
  /// In vi, this message translates to:
  /// **'Video thuyết minh'**
  String get scVideo;

  /// No description provided for @scImages.
  ///
  /// In vi, this message translates to:
  /// **'Hình ảnh'**
  String get scImages;

  /// No description provided for @scImageCount.
  ///
  /// In vi, this message translates to:
  /// **'{count} ảnh'**
  String scImageCount(int count);

  /// No description provided for @scArtifactCount.
  ///
  /// In vi, this message translates to:
  /// **'{count} hiện vật'**
  String scArtifactCount(int count);

  /// No description provided for @scNoContent.
  ///
  /// In vi, this message translates to:
  /// **'Đối tác chưa bổ sung nội dung văn hóa cho trạm này.'**
  String get scNoContent;

  /// No description provided for @scViewImage.
  ///
  /// In vi, this message translates to:
  /// **'Xem hình ảnh {n}'**
  String scViewImage(int n);

  /// No description provided for @scArtifactNumber.
  ///
  /// In vi, this message translates to:
  /// **'HIỆN VẬT SỐ {n}'**
  String scArtifactNumber(String n);

  /// No description provided for @scHasVideo.
  ///
  /// In vi, this message translates to:
  /// **'Có video'**
  String get scHasVideo;

  /// No description provided for @scToExperience.
  ///
  /// In vi, this message translates to:
  /// **'Sang phần Trải nghiệm'**
  String get scToExperience;

  /// No description provided for @scBackToRoute.
  ///
  /// In vi, this message translates to:
  /// **'Quay lại lộ trình'**
  String get scBackToRoute;

  /// No description provided for @qrTitle.
  ///
  /// In vi, this message translates to:
  /// **'Quét mã QR'**
  String get qrTitle;

  /// No description provided for @qrHint.
  ///
  /// In vi, this message translates to:
  /// **'Đưa mã QR tại điểm đến vào khung'**
  String get qrHint;

  /// No description provided for @qrNoPermission.
  ///
  /// In vi, this message translates to:
  /// **'Ứng dụng chưa được cấp quyền camera. Hãy cấp quyền trong Cài đặt, hoặc nhập mã thủ công bên dưới.'**
  String get qrNoPermission;

  /// No description provided for @qrCameraFailed.
  ///
  /// In vi, this message translates to:
  /// **'Không mở được camera. Bạn có thể nhập mã thủ công bên dưới.'**
  String get qrCameraFailed;

  /// No description provided for @qrSlowCamera.
  ///
  /// In vi, this message translates to:
  /// **'Camera mở chậm? Bạn có thể nhập mã in dưới QR.'**
  String get qrSlowCamera;

  /// No description provided for @qrScanned.
  ///
  /// In vi, this message translates to:
  /// **'ĐÃ QUÉT'**
  String get qrScanned;

  /// No description provided for @qrTorchOff.
  ///
  /// In vi, this message translates to:
  /// **'Tắt đèn'**
  String get qrTorchOff;

  /// No description provided for @qrTorchOn.
  ///
  /// In vi, this message translates to:
  /// **'Đèn flash'**
  String get qrTorchOn;

  /// No description provided for @qrEnterCode.
  ///
  /// In vi, this message translates to:
  /// **'Nhập mã'**
  String get qrEnterCode;

  /// No description provided for @qrEnterPrintedCode.
  ///
  /// In vi, this message translates to:
  /// **'Nhập mã in dưới QR'**
  String get qrEnterPrintedCode;

  /// No description provided for @qrCodeHelper.
  ///
  /// In vi, this message translates to:
  /// **'Mã điểm đến bắt đầu bằng JGS-, mã hoạt động bắt đầu bằng JGE-'**
  String get qrCodeHelper;

  /// No description provided for @qrConfirmCode.
  ///
  /// In vi, this message translates to:
  /// **'Xác nhận mã'**
  String get qrConfirmCode;

  /// No description provided for @hpStopLabel.
  ///
  /// In vi, this message translates to:
  /// **'TRẠM {n}'**
  String hpStopLabel(String n);

  /// No description provided for @hpStampSemantics.
  ///
  /// In vi, this message translates to:
  /// **'Con dấu {label}, {name}'**
  String hpStampSemantics(String label, String name);

  /// No description provided for @hpStampCount.
  ///
  /// In vi, this message translates to:
  /// **'{stamped}/{total} dấu ấn'**
  String hpStampCount(int stamped, int total);

  /// No description provided for @hpNoStops.
  ///
  /// In vi, this message translates to:
  /// **'Hành trình chưa có trạm nào.'**
  String get hpNoStops;

  /// No description provided for @hpHint.
  ///
  /// In vi, this message translates to:
  /// **'Check-in mỗi trạm (GPS hoặc quét mã QR tại cổng) để nhận thêm một dấu ấn.'**
  String get hpHint;

  /// No description provided for @hpStamped.
  ///
  /// In vi, this message translates to:
  /// **'Đã đóng dấu'**
  String get hpStamped;

  /// No description provided for @hpStampedTitle.
  ///
  /// In vi, this message translates to:
  /// **'Đã đóng dấu ấn!'**
  String get hpStampedTitle;

  /// No description provided for @hpUnlocked.
  ///
  /// In vi, this message translates to:
  /// **'Đã mở khóa Nội dung văn hóa và Trải nghiệm'**
  String get hpUnlocked;

  /// No description provided for @hcCold.
  ///
  /// In vi, this message translates to:
  /// **'Lạnh · còn xa'**
  String get hcCold;

  /// No description provided for @hcCool.
  ///
  /// In vi, this message translates to:
  /// **'Mát · đang đến gần'**
  String get hcCool;

  /// No description provided for @hcWarm.
  ///
  /// In vi, this message translates to:
  /// **'Ấm · gần lắm rồi'**
  String get hcWarm;

  /// No description provided for @hcHot.
  ///
  /// In vi, this message translates to:
  /// **'Nóng! Ngay quanh đây'**
  String get hcHot;

  /// No description provided for @hcArrived.
  ///
  /// In vi, this message translates to:
  /// **'Đã tới checkpoint'**
  String get hcArrived;

  /// No description provided for @rwAwesome.
  ///
  /// In vi, this message translates to:
  /// **'Tuyệt vời'**
  String get rwAwesome;

  /// No description provided for @rwBadgeUnlockBarrier.
  ///
  /// In vi, this message translates to:
  /// **'Mở khóa huy hiệu'**
  String get rwBadgeUnlockBarrier;

  /// No description provided for @rwNewBadge.
  ///
  /// In vi, this message translates to:
  /// **'Mở khóa huy hiệu mới'**
  String get rwNewBadge;

  /// No description provided for @cmActivity.
  ///
  /// In vi, this message translates to:
  /// **'Hoạt động {n}: {name}'**
  String cmActivity(String n, String name);

  /// No description provided for @cmShowAll.
  ///
  /// In vi, this message translates to:
  /// **'Xem tất cả'**
  String get cmShowAll;

  /// No description provided for @cmLegendZone.
  ///
  /// In vi, this message translates to:
  /// **' Vùng điểm đến   '**
  String get cmLegendZone;

  /// No description provided for @cmLegendActivity.
  ///
  /// In vi, this message translates to:
  /// **' Hoạt động'**
  String get cmLegendActivity;

  /// No description provided for @jlNoActiveJourney.
  ///
  /// In vi, this message translates to:
  /// **'Bạn chưa có hành trình đang đi. Hãy đặt tour và bấm \"Bắt đầu trải nghiệm\".'**
  String get jlNoActiveJourney;

  /// No description provided for @jsvcCheckInInvalid.
  ///
  /// In vi, this message translates to:
  /// **'Máy chủ trả về kết quả check-in không hợp lệ.'**
  String get jsvcCheckInInvalid;

  /// No description provided for @jsvcCheckpointInvalid.
  ///
  /// In vi, this message translates to:
  /// **'Máy chủ trả về bản đồ checkpoint không hợp lệ.'**
  String get jsvcCheckpointInvalid;

  /// No description provided for @jsvcCultureInvalid.
  ///
  /// In vi, this message translates to:
  /// **'Máy chủ trả về nội dung văn hóa không hợp lệ.'**
  String get jsvcCultureInvalid;

  /// No description provided for @jsvcTaskInvalid.
  ///
  /// In vi, this message translates to:
  /// **'Máy chủ trả về nội dung nhiệm vụ không hợp lệ.'**
  String get jsvcTaskInvalid;

  /// No description provided for @jsvcClueFailed.
  ///
  /// In vi, this message translates to:
  /// **'Không lấy được manh mối.'**
  String get jsvcClueFailed;

  /// No description provided for @jsvcSubmitInvalid.
  ///
  /// In vi, this message translates to:
  /// **'Máy chủ trả về kết quả nộp bài không hợp lệ.'**
  String get jsvcSubmitInvalid;

  /// No description provided for @jsvcJourneyInvalid.
  ///
  /// In vi, this message translates to:
  /// **'Máy chủ trả về dữ liệu hành trình không hợp lệ.'**
  String get jsvcJourneyInvalid;

  /// No description provided for @tjTask.
  ///
  /// In vi, this message translates to:
  /// **'Nhiệm vụ'**
  String get tjTask;

  /// No description provided for @tjDestination.
  ///
  /// In vi, this message translates to:
  /// **'Điểm đến'**
  String get tjDestination;

  /// No description provided for @tjJourney.
  ///
  /// In vi, this message translates to:
  /// **'Hành trình'**
  String get tjJourney;

  /// No description provided for @tjActivity.
  ///
  /// In vi, this message translates to:
  /// **'Hoạt động'**
  String get tjActivity;

  /// No description provided for @progCheckedIn.
  ///
  /// In vi, this message translates to:
  /// **'Đã check-in'**
  String get progCheckedIn;

  /// No description provided for @locGpsOff.
  ///
  /// In vi, this message translates to:
  /// **'GPS đang tắt. Hãy bật định vị để xác thực vị trí của bạn.'**
  String get locGpsOff;

  /// No description provided for @locPermissionNeeded.
  ///
  /// In vi, this message translates to:
  /// **'Bạn cần cho phép truy cập vị trí để check-in tại điểm đến.'**
  String get locPermissionNeeded;

  /// No description provided for @locPermissionBlocked.
  ///
  /// In vi, this message translates to:
  /// **'Quyền vị trí đã bị chặn. Hãy cấp lại trong Cài đặt của ứng dụng.'**
  String get locPermissionBlocked;

  /// No description provided for @locUnknown.
  ///
  /// In vi, this message translates to:
  /// **'Chưa xác định được vị trí. Hãy ra nơi thoáng hơn rồi thử lại.'**
  String get locUnknown;

  /// No description provided for @destLoadFailed.
  ///
  /// In vi, this message translates to:
  /// **'Không thể tải chi tiết điểm đến #{id}. Vui lòng kiểm tra kết nối và thử lại.'**
  String destLoadFailed(String id);

  /// No description provided for @ccAudio.
  ///
  /// In vi, this message translates to:
  /// **'Thuyết minh'**
  String get ccAudio;

  /// No description provided for @ccVideo.
  ///
  /// In vi, this message translates to:
  /// **'Video tư liệu'**
  String get ccVideo;

  /// No description provided for @ccStory.
  ///
  /// In vi, this message translates to:
  /// **'Truyền thuyết'**
  String get ccStory;

  /// No description provided for @ccImage.
  ///
  /// In vi, this message translates to:
  /// **'Hình ảnh'**
  String get ccImage;

  /// No description provided for @cc3d.
  ///
  /// In vi, this message translates to:
  /// **'Mô hình 3D / VR'**
  String get cc3d;

  /// No description provided for @ccArticle.
  ///
  /// In vi, this message translates to:
  /// **'Bài viết di sản'**
  String get ccArticle;

  /// No description provided for @ccNone.
  ///
  /// In vi, this message translates to:
  /// **'Điểm đến này chưa có câu chuyện văn hóa được duyệt.'**
  String get ccNone;

  /// No description provided for @ccUnlockOnCheckIn.
  ///
  /// In vi, this message translates to:
  /// **'Mở khóa {count} nội dung khi check-in tại điểm đến'**
  String ccUnlockOnCheckIn(int count);

  /// No description provided for @ccAudioFailed.
  ///
  /// In vi, this message translates to:
  /// **'Không mở được bản thuyết minh.'**
  String get ccAudioFailed;

  /// No description provided for @ccListen.
  ///
  /// In vi, this message translates to:
  /// **'Nghe thuyết minh'**
  String get ccListen;

  /// No description provided for @ccHasAudio.
  ///
  /// In vi, this message translates to:
  /// **'Có thuyết minh audio'**
  String get ccHasAudio;

  /// No description provided for @ccSeeAll.
  ///
  /// In vi, this message translates to:
  /// **'Xem tất cả {count} nội dung văn hóa'**
  String ccSeeAll(int count);

  /// No description provided for @ccLockedCount.
  ///
  /// In vi, this message translates to:
  /// **'{count} nội dung văn hóa · mở khóa khi check-in'**
  String ccLockedCount(int count);

  /// No description provided for @ccMediaFailed.
  ///
  /// In vi, this message translates to:
  /// **'Không mở được nội dung đa phương tiện.'**
  String get ccMediaFailed;

  /// No description provided for @ccWatchVideo.
  ///
  /// In vi, this message translates to:
  /// **'Xem video'**
  String get ccWatchVideo;

  /// No description provided for @ccOpen.
  ///
  /// In vi, this message translates to:
  /// **'Mở nội dung'**
  String get ccOpen;

  /// No description provided for @ccGallery.
  ///
  /// In vi, this message translates to:
  /// **'Hình ảnh ({count})'**
  String ccGallery(int count);

  /// No description provided for @ccOpenFailed.
  ///
  /// In vi, this message translates to:
  /// **'Không mở được nội dung.'**
  String get ccOpenFailed;

  /// No description provided for @expFallbackTitle.
  ///
  /// In vi, this message translates to:
  /// **'Trải nghiệm Di sản'**
  String get expFallbackTitle;

  /// No description provided for @payLauncherExpired.
  ///
  /// In vi, this message translates to:
  /// **'Đã hết thời hạn thanh toán.'**
  String get payLauncherExpired;

  /// No description provided for @payAwaitingConfirmation.
  ///
  /// In vi, this message translates to:
  /// **'Đang chờ xác nhận thanh toán...'**
  String get payAwaitingConfirmation;

  /// No description provided for @payInvalidData.
  ///
  /// In vi, this message translates to:
  /// **'Máy chủ trả về dữ liệu thanh toán không hợp lệ.'**
  String get payInvalidData;

  /// No description provided for @paySyncCancelled.
  ///
  /// In vi, this message translates to:
  /// **'Bạn đã hủy giao dịch thanh toán.'**
  String get paySyncCancelled;

  /// No description provided for @paySyncAlreadyProcessed.
  ///
  /// In vi, this message translates to:
  /// **'Giao dịch này đã được xử lý trước đó.'**
  String get paySyncAlreadyProcessed;

  /// No description provided for @tourNotFound.
  ///
  /// In vi, this message translates to:
  /// **'Không tìm thấy tour.'**
  String get tourNotFound;

  /// No description provided for @videoPlayIntro.
  ///
  /// In vi, this message translates to:
  /// **'Phát video giới thiệu'**
  String get videoPlayIntro;

  /// No description provided for @videoCannotPlay.
  ///
  /// In vi, this message translates to:
  /// **'Không phát được video này trong ứng dụng'**
  String get videoCannotPlay;

  /// No description provided for @videoOpenExternal.
  ///
  /// In vi, this message translates to:
  /// **'Mở bằng ứng dụng khác'**
  String get videoOpenExternal;

  /// No description provided for @photoViewOf.
  ///
  /// In vi, this message translates to:
  /// **'Xem ảnh {index} trên {total}'**
  String photoViewOf(int index, int total);

  /// No description provided for @photoCredit.
  ///
  /// In vi, this message translates to:
  /// **'Ảnh: {credit}'**
  String photoCredit(String credit);

  /// No description provided for @photoSource.
  ///
  /// In vi, this message translates to:
  /// **'Nguồn ảnh: {credit}'**
  String photoSource(String credit);

  /// No description provided for @navCheckInNow.
  ///
  /// In vi, this message translates to:
  /// **'Check-in ngay'**
  String get navCheckInNow;
}

class _AppLocalizationsDelegate
    extends LocalizationsDelegate<AppLocalizations> {
  const _AppLocalizationsDelegate();

  @override
  Future<AppLocalizations> load(Locale locale) {
    return SynchronousFuture<AppLocalizations>(lookupAppLocalizations(locale));
  }

  @override
  bool isSupported(Locale locale) =>
      <String>['en', 'ja', 'vi'].contains(locale.languageCode);

  @override
  bool shouldReload(_AppLocalizationsDelegate old) => false;
}

AppLocalizations lookupAppLocalizations(Locale locale) {
  // Lookup logic when only language code is specified.
  switch (locale.languageCode) {
    case 'en':
      return AppLocalizationsEn();
    case 'ja':
      return AppLocalizationsJa();
    case 'vi':
      return AppLocalizationsVi();
  }

  throw FlutterError(
    'AppLocalizations.delegate failed to load unsupported locale "$locale". This is likely '
    'an issue with the localizations generation tool. Please file an issue '
    'on GitHub with a reproducible sample app and the gen-l10n configuration '
    'that was used.',
  );
}
