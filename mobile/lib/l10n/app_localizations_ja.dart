// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for Japanese (`ja`).
class AppLocalizationsJa extends AppLocalizations {
  AppLocalizationsJa([String locale = 'ja']) : super(locale);

  @override
  String get appTitle => 'Journey Go - ベトナム文化旅行';

  @override
  String get reloginSuccess => '再ログインしました。そのまま操作を続けられます。';

  @override
  String get commonClose => '閉じる';

  @override
  String get commonCancel => 'キャンセル';

  @override
  String get commonRefresh => '更新';

  @override
  String get languageTitle => '言語';

  @override
  String get languageSubtitle => 'アプリは日本語で表示されています';

  @override
  String get languageSheetTitle => '言語を選択';

  @override
  String get languageSheetNote => '一部の画面やツアー内容、フォーラムの投稿はベトナム語のまま表示される場合があります。';

  @override
  String languageConfirmTitle(String language) {
    return '$languageに切り替えますか？';
  }

  @override
  String get languageConfirmMessage => '新しい言語をすべての画面に適用するため、アプリを再読み込みします。';

  @override
  String get languageConfirmAction => '確認して再読み込み';

  @override
  String get tourRequestsTitle => 'リクエストツアー';

  @override
  String get tourRequestsSubtitle => 'ご希望に合わせた専用ツアーを作成・予約';

  @override
  String get tourRequestsMyTitle => 'マイリクエストツアー';

  @override
  String get tourRequestsNewButton => '新規リクエスト';

  @override
  String get profileHeader => '旅行者プロフィール';

  @override
  String get profileNotifications => 'お知らせ';

  @override
  String get profileEdit => 'プロフィールを編集';

  @override
  String profileMemberSince(String date) {
    return '$dateから';
  }

  @override
  String get profileTopRank => '最高ランクに到達しました';

  @override
  String profilePointsToNextRank(String points, String rank) {
    return '$rankまであと$pointsポイント';
  }

  @override
  String get profileStatPoints => '利用可能ポイント';

  @override
  String get profileStatBadges => 'バッジ';

  @override
  String get profileStatPlaces => '訪問地';

  @override
  String get rankBronze => 'ブロンズ';

  @override
  String get rankSilver => 'シルバー';

  @override
  String get rankGold => 'ゴールド';

  @override
  String get rankPlatinum => 'プラチナ';

  @override
  String get heritageTitle => '遺産の旅';

  @override
  String get heritageSubtitle => 'あなたが記録した文化の足跡';

  @override
  String get achievementsTitle => '実績と報酬';

  @override
  String achievementsAchieved(int count) {
    return '$count件達成';
  }

  @override
  String achievementsUnclaimed(int count) {
    return '$count件受け取り待ち';
  }

  @override
  String get journeyLogTitle => '旅の記録';

  @override
  String journeyPlacesVisited(int count) {
    return '$countか所訪問';
  }

  @override
  String journeyLogSubtitle(int count) {
    return '$countか所の遺産にチェックイン済み';
  }

  @override
  String get journeyEmpty => 'まだ記録がありません。旅程の目的地でチェックインして、最初の足跡を残しましょう。';

  @override
  String get pointsHistoryTitle => 'ポイント履歴';

  @override
  String get pointsHistorySubtitle => '最近のポイント取引';

  @override
  String get pointsNoTransactions => '取引はまだありません';

  @override
  String pointsLatestGain(String points) {
    return '直近 +$points';
  }

  @override
  String get pointsEarned => '獲得';

  @override
  String get pointsSpent => '使用';

  @override
  String get pointsAvailable => '利用可能';

  @override
  String get pointsEmpty => 'ポイント取引はまだありません。目的地でチェックインし、ミッションを達成してポイントを貯めましょう。';

  @override
  String get pointsOpenWallet => 'ウォレットを見る・クーポンに交換';

  @override
  String get badgesTitle => '遺産バッジ';

  @override
  String badgesUnlocked(int count) {
    return '$count個獲得';
  }

  @override
  String get voucherTitle => 'クーポン';

  @override
  String voucherAvailablePoints(String points) {
    return '利用可能 $pointsポイント';
  }

  @override
  String get servicesTitle => 'チケットとサポート';

  @override
  String get myBookingsTitle => 'ツアー予約一覧';

  @override
  String get myBookingsSubtitle => '予約・支払い・体験用QRコードを確認';

  @override
  String get providerSupportTitle => 'ツアー会社のサポート';

  @override
  String get providerSupportSubtitle => 'ツアー会社とのチャット履歴（予約前のメッセージ）';

  @override
  String get supportTitle => 'サポートと苦情';

  @override
  String get supportSubtitle => '返金とチケットのトラブル対応';

  @override
  String refundsInProgress(int count) {
    return '$count件処理中';
  }

  @override
  String get settingsTitle => '設定';

  @override
  String get personalInfoTitle => '個人情報';

  @override
  String get personalInfoSubtitle => '氏名、メールアドレス、電話番号';

  @override
  String get changePasswordTitle => 'パスワードを変更';

  @override
  String get changePasswordSubtitle => 'アカウントを安全に保ちます';

  @override
  String hotlineTitle(String number) {
    return 'コールセンター $number';
  }

  @override
  String get hotlineSubtitle => 'タップして旅行者サポートに電話';

  @override
  String get hotlineCannotOpen => 'この端末では電話アプリを開けませんでした。';

  @override
  String get logoutTitle => 'ログアウト';

  @override
  String get logoutSubtitle => 'この端末からログアウトします';

  @override
  String get logoutConfirmTitle => 'アカウントからログアウトしますか？';

  @override
  String get logoutConfirmMessage => 'この端末からログアウトします。いつでも再ログインできます。';

  @override
  String get logoutConfirmButton => 'ログアウト';

  @override
  String get commonNotifications => 'お知らせ';

  @override
  String get commonSeeAll => 'すべて見る';

  @override
  String get commonRetry => '再試行';

  @override
  String get navHome => 'ホーム';

  @override
  String get navTrips => '旅程';

  @override
  String get navCheckIn => 'チェックイン';

  @override
  String get navForum => 'フォーラム';

  @override
  String get navAccount => 'アカウント';

  @override
  String get navCheckInSemantics => '目的地でチェックイン';

  @override
  String homeGreeting(String name) {
    return 'こんにちは、$nameさん 👋';
  }

  @override
  String get homeGreetingNoName => 'こんにちは 👋';

  @override
  String get homeHeadline => '見るだけでなく、\n知るための旅へ';

  @override
  String get homeSearchHint => 'どこへ行きますか？';

  @override
  String get homeSearchSemantics => 'ツアー・目的地・テーマを検索';

  @override
  String homePoints(String points) {
    return '$points pt';
  }

  @override
  String get heroPlaceMuCangChai => 'ムーカンチャイの棚田';

  @override
  String get heroPlaceHoiAn => '来遠橋（日本橋）、ホイアン旧市街';

  @override
  String get heroPlaceMuiNe => 'ムイネーの漁村';

  @override
  String get homeCatDayTrip => '日帰り';

  @override
  String get homeCatMultiDay => '宿泊';

  @override
  String get homeCatByDate => '日付で探す';

  @override
  String get homeCatDeals => '特典';

  @override
  String get homeFeatured => 'おすすめツアー';

  @override
  String get homeAllTours => 'すべてのツアー';

  @override
  String get homeUpcoming => '近日出発';

  @override
  String get homeThemes => 'テーマから探す';

  @override
  String get homeAllThemes => 'すべてのテーマ';

  @override
  String get homeMoreThemes => 'テーマ';

  @override
  String get homeRegions => '地域から探す';

  @override
  String get homeAllRegions => 'すべての地域';

  @override
  String get homeMoreRegions => '地域';

  @override
  String homeRegionTourCount(int count) {
    return '$count件';
  }

  @override
  String get homeDayTours => '日帰りツアー';

  @override
  String get homeMultiDayTours => '宿泊ツアー';

  @override
  String homeSeeAllCount(int count) {
    return '$count件のツアーをすべて見る';
  }

  @override
  String get homeSeeAllTours => 'すべてのツアーを見る';

  @override
  String get homeNoToursTitle => '販売中のツアーはまだありません';

  @override
  String get homeNoToursMessage => '新しいツアーは承認され次第ここに表示されます。';

  @override
  String get homeAllOwnedTitle => '現在のツアーはすべて購入済みです';

  @override
  String get homeAllOwnedMessage => '「旅程」タブで予約済みのツアーをお楽しみください。';

  @override
  String get homeAllOwnedAction => '旅程を見る';

  @override
  String get homeToursErrorTitle => 'ツアーを読み込めませんでした';

  @override
  String homeJourneyOngoing(int position, int total) {
    return '進行中・$position/$totalか所目';
  }

  @override
  String get homeJourneyAtStop => '現在地';

  @override
  String get homeJourneyNextStop => '次の地点';

  @override
  String get homeJourneyAllDone => 'すべての地点を回りました';

  @override
  String homeJourneyCheckedIn(String name) {
    return '$name・チェックイン済み';
  }

  @override
  String homeJourneyDistance(String name, String distance) {
    return '$name・あと$distance';
  }

  @override
  String get homeJourneyContinue => '続ける';

  @override
  String homeJourneyMissions(int count) {
    return '未完了ミッション$count件：';
  }

  @override
  String get tourPriceFree => '無料';

  @override
  String get tourPriceFromPrefix => '';

  @override
  String get tourPriceFromSuffix => '〜';

  @override
  String tourStopCount(int count) {
    return '$countか所';
  }

  @override
  String durationMinutes(int minutes) {
    return '$minutes分';
  }

  @override
  String durationHours(int hours) {
    return '$hours時間';
  }

  @override
  String durationHoursMinutes(int hours, int minutes) {
    return '$hours時間$minutes分';
  }

  @override
  String durationDaysNights(int days, int nights) {
    return '$nights泊$days日';
  }

  @override
  String durationDays(int days) {
    return '$days日間';
  }

  @override
  String get durationDayTrip => '日帰り';

  @override
  String get commonShowMore => 'もっと見る';

  @override
  String get commonShowLess => '閉じる';

  @override
  String priceVnd(String amount) {
    return '$amountドン';
  }

  @override
  String tourPriceFrom(String price) {
    return '$price〜';
  }

  @override
  String tourDepartsOn(String date) {
    return '$date出発';
  }

  @override
  String rewardPlusPoints(String points) {
    return '+${points}pt';
  }

  @override
  String rewardMaxPoints(String points) {
    return '最大${points}pt';
  }

  @override
  String tourTaskCount(int count) {
    return 'ミッション$count件';
  }

  @override
  String tourBadgeCount(int count) {
    return 'バッジ$count個';
  }

  @override
  String tourDestinationStops(int count) {
    return '$countか所';
  }

  @override
  String tourCheckpointCount(int count) {
    return 'チェックポイント$countか所';
  }

  @override
  String get tourOwnedBadge => '購入済み';

  @override
  String get tourLoadFailed => 'ツアー情報を読み込めませんでした。もう一度お試しください。';

  @override
  String get tourTypeCultural => '文化';

  @override
  String get tourTypeAdventure => 'アドベンチャー';

  @override
  String get tourTypeBeach => 'ビーチ';

  @override
  String get tourTypeMountain => '山';

  @override
  String get tourTypeCity => '都市';

  @override
  String get tourTypeEco => 'エコツーリズム';

  @override
  String get tourTypeHistorical => '歴史';

  @override
  String get tourTypeGastronomy => 'グルメ';

  @override
  String get tourTypeOther => 'その他';

  @override
  String get guestAdult => '大人';

  @override
  String get guestChild => '子ども';

  @override
  String get guestToddler => '幼児';

  @override
  String get guestInfant => '乳児';

  @override
  String durationSeconds(int seconds) {
    return '$seconds秒';
  }

  @override
  String durationMinutesSeconds(int minutes, int seconds) {
    return '$minutes分$seconds秒';
  }

  @override
  String get durationFlexible => '自由';

  @override
  String get departureTime => '出発時刻';

  @override
  String get departureMeetingPoint => '集合場所';

  @override
  String get departurePickup => '送迎時間・場所';

  @override
  String progressInProgress(int done, int total) {
    return '体験中・$done/$totalか所';
  }

  @override
  String get progressCompleted => '完了';

  @override
  String progressCompletedOn(String date) {
    return '$dateに完了';
  }

  @override
  String get listSearchHint => 'ツアー・地域・テーマを検索...';

  @override
  String get listFilter => '絞り込み';

  @override
  String get listAll => 'すべて';

  @override
  String get listEmptyTitle => '該当するツアーが見つかりません';

  @override
  String get listAllOwned => '表示中のツアーはすべて購入済みです。「旅程」タブで体験を始めましょう。';

  @override
  String get listEmptyHint => '絞り込み条件を減らすか、別のキーワードで検索してください。';

  @override
  String get listSort => '並び替え';

  @override
  String get listSortNewest => '新着順';

  @override
  String get listSortPriceAsc => '価格の安い順';

  @override
  String get listSortPriceDesc => '価格の高い順';

  @override
  String get listSortDeparture => '出発日が近い順';

  @override
  String get listGroupFormat => 'ツアー形式';

  @override
  String get listGroupRegion => '地域';

  @override
  String get listGroupTheme => 'テーマ';

  @override
  String get listReset => 'リセット';

  @override
  String get listApply => '適用';

  @override
  String get tdTitle => 'ツアー詳細';

  @override
  String get tdCancelledOldBooking => '以前の予約をキャンセルしました。「予約」をタップして予約し直してください。';

  @override
  String get tdNoProvider => 'このツアーにはまだ連絡できるツアー会社がありません。';

  @override
  String get tdLoginToChat => 'ツアー会社にメッセージを送るにはログインしてください。';

  @override
  String get tdDatesLoading => '体験日を読み込み中です。しばらくしてからもう一度お試しください。';

  @override
  String get tdNoDates => '現在このツアーに空きのある日はありません。後ほどご確認ください。';

  @override
  String get tdPickDateTitle => '体験日を選択';

  @override
  String get tdPickDateHint => '数字は残席数です。空きのある日のみ選択できます';

  @override
  String get tdNoDateSelected => '日付が選択されていません';

  @override
  String tdDateSelected(String date) {
    return '選択中：$date';
  }

  @override
  String get tdConfirmDate => 'この日付で確定';

  @override
  String get tdRouteMap => 'ルートマップ';

  @override
  String get tdLegs => '旅の行程';

  @override
  String get tdNoDestinations => 'このツアーにはまだ目的地がありません。';

  @override
  String get tdLoadFailed => 'ツアー詳細を読み込めませんでした。';

  @override
  String tdDestinationCount(int count) {
    return '目的地$countか所';
  }

  @override
  String get tdVerified => '審査済みツアー';

  @override
  String get tdFinalLeg => '最終行程';

  @override
  String tdLeg(int n) {
    return '行程$n';
  }

  @override
  String get tdCheckInBadgeHint => 'ここでチェックインすると、この目的地のバッジを獲得できます';

  @override
  String get tdExperiencesError => 'この地点の体験を読み込めませんでした。下に引いて再試行してください。';

  @override
  String get tdNoExperiences => 'この目的地で公開中の体験はまだありません。';

  @override
  String get tdOwned => 'このツアーは購入済みです';

  @override
  String tdDaysUntilStart(int days) {
    return '出発まであと$days日！';
  }

  @override
  String tdExperienceDate(String date) {
    return '体験日：$date';
  }

  @override
  String get tdStartExperience => '体験を始める';

  @override
  String get tdExperienceExpired => '体験日を過ぎました';

  @override
  String tdExperienceWindow(String dates) {
    return 'ツアー期間：$dates';
  }

  @override
  String get tdContinueJourney => '旅を続ける';

  @override
  String get tdPriceFromAdult => '料金（大人）';

  @override
  String get tdTotalPayment => 'お支払い合計';

  @override
  String get tdPerGuest => '／人';

  @override
  String get tdHolding => '席を確保中...';

  @override
  String get tdContinuePayment => '支払いを続ける';

  @override
  String get tdBookAgain => 'もう一度予約';

  @override
  String get tdBookNow => '今すぐ予約';

  @override
  String get tdRefundProcessingTitle => '返金手続き中';

  @override
  String get tdRefundDoneTitle => '返金処理済み';

  @override
  String get tdRefundProcessingMessage => 'この予約は返金手続き中です。';

  @override
  String get tdRefundDoneMessage => 'この予約の処理は完了しました。';

  @override
  String get tdBookingCancelledTitle => '予約はキャンセルされました';

  @override
  String get tdBookingExpiredTitle => '予約の有効期限が切れました';

  @override
  String get tdBookingCancelledMessage => '席は解放されました。このツアーには参加できません。';

  @override
  String get tdBookingExpiredMessage => '支払い期限を過ぎたため、席は解放されました。';

  @override
  String tdChatWithProvider(String name) {
    return '$nameとチャット';
  }

  @override
  String tdProvidedBy(String name) {
    return '提供：$name・審査済み';
  }

  @override
  String get tdTabIntro => '概要';

  @override
  String get tdTabItinerary => '行程';

  @override
  String get tdTabStops => '立ち寄り地';

  @override
  String get tdTabPrices => '料金と日程';

  @override
  String get tdTabNotes => '注意事項';

  @override
  String get tdHighlights => '見どころ';

  @override
  String get tdPhotos => 'フォト';

  @override
  String get tdItineraryDetail => '詳しい行程';

  @override
  String tdStopsTitle(int count) {
    return '立ち寄り地（$count）';
  }

  @override
  String get tdPriceTable => '料金表';

  @override
  String tdMaxGuests(int count) {
    return '1回あたり最大$count名';
  }

  @override
  String get tdDepartures => '出発日';

  @override
  String get tdDepartureInfo => '出発情報';

  @override
  String tdMoreDates(int count) {
    return '+$count日';
  }

  @override
  String get tdNotes => '注意事項';

  @override
  String get tdPriceIncludes => '料金に含まれるもの';

  @override
  String get tdPriceExcludes => '料金に含まれないもの';

  @override
  String get tdCancellationPolicy => 'キャンセルポリシー';

  @override
  String get tdRefundPolicy => '返金ポリシー';

  @override
  String get tdForceMajeure => '不可抗力の場合';

  @override
  String get tdContact => 'お問い合わせ';

  @override
  String tdDayN(int day) {
    return '$day日目';
  }

  @override
  String tdQuizCount(int count) {
    return 'クイズ$count問';
  }

  @override
  String tdActivityCount(int count) {
    return 'アクティビティ$count件';
  }

  @override
  String tdStopN(int n) {
    return '立ち寄り地$n';
  }

  @override
  String get tdIntroVideo => '紹介動画';

  @override
  String get tdCulturalStory => '文化のストーリー';

  @override
  String get tdCulturalContent => '文化コンテンツ';

  @override
  String get tdStoryLabel => 'ストーリー';

  @override
  String tdArchivePhotos(int count) {
    return '資料写真$count枚';
  }

  @override
  String tdArtifactCount(int count) {
    return '展示品$count点';
  }

  @override
  String get tdUnlockOnCheckIn => '旅の途中でこの地点にチェックインすると解放されます。';

  @override
  String get tdArtifacts => '展示品';

  @override
  String get tdChallenges => '現地チャレンジ';

  @override
  String get tdCulturalQuiz => '文化クイズ';

  @override
  String tdQuizQuestions(int count) {
    return 'クイズ$count問';
  }

  @override
  String get tdScanQrToConfirm => '現地のQRコードをスキャンして確認';

  @override
  String get tdActivityFallback => '現地体験';

  @override
  String tripCountdown(int days) {
    return '出発まであと$days日！';
  }

  @override
  String get statusPendingPayment => '支払い待ち';

  @override
  String get statusConfirmed => '確定済み';

  @override
  String get statusCompleted => '完了';

  @override
  String get statusExpired => '期限切れ';

  @override
  String get statusPaymentExpired => '支払い期限切れ';

  @override
  String get statusCancelled => 'キャンセル済み';

  @override
  String get statusUnknown => '不明';

  @override
  String get payStatusPending => '保留中';

  @override
  String get payStatusProcessing => '処理中';

  @override
  String get payStatusVerifying => '確認中';

  @override
  String get payStatusSuccess => '成功';

  @override
  String get payStatusFailed => '失敗';

  @override
  String get payStatusCustomerCancelled => 'お客様によるキャンセル';

  @override
  String get payStatusSuperseded => '置き換え済み';

  @override
  String get ageAdult => '12歳以上';

  @override
  String get ageChild => '5〜11歳';

  @override
  String get ageToddler => '2〜4歳';

  @override
  String get ageInfant => '2歳未満';

  @override
  String get genderMale => '男性';

  @override
  String get genderFemale => '女性';

  @override
  String get genderOther => 'その他';

  @override
  String get bgTitle => 'ツアーを予約';

  @override
  String get bgRemainingSlots => '残席';

  @override
  String get bgNoDate => '日付未選択';

  @override
  String bgSlotsLeft(int count) {
    return '残り$count席';
  }

  @override
  String bgSlotsSelected(int count) {
    return '$count席を選択';
  }

  @override
  String bgGuestsNotCounted(int count) {
    return '$count名は席にカウントされません';
  }

  @override
  String bgTotalGuests(int count) {
    return '合計・$count名';
  }

  @override
  String get bgConfirm => '予約を確定';

  @override
  String get bgMissingPassenger => '各「参加者」欄を開き、すべての情報を入力してください。';

  @override
  String get bgNoSlot => '席不要';

  @override
  String bgPassengerN(int n) {
    return '参加者$n';
  }

  @override
  String get bgOwnerTag => '予約代表者';

  @override
  String get bgPassengerComplete => '入力完了';

  @override
  String get bgPassengerHintAdult => 'タップして氏名・生年月日・性別・メールを入力';

  @override
  String get bgPassengerHint => 'タップして氏名・生年月日・性別を入力';

  @override
  String get bgPassengerInfo => '参加者情報';

  @override
  String get bgFullName => '氏名 *';

  @override
  String get bgBirthDate => '生年月日 *';

  @override
  String get bgGender => '性別 *';

  @override
  String get bgEmailHint => '大人はチケットの受け取り、アカウント連携、ツアー招待のためにメールアドレスが必要です。';

  @override
  String bgAgeMismatch(String type) {
    return '体験日時点の年齢では「$type」に該当します。参加者区分をご確認ください。';
  }

  @override
  String get calHasDates => '空きあり';

  @override
  String get calNoDates => '日程なし';

  @override
  String get calAvailable => '空きあり';

  @override
  String get calAlmostFull => '残りわずか';

  @override
  String get calFull => '満席';

  @override
  String get calThisMonth => '今月に戻る';

  @override
  String get voucherSheetTitle => '割引クーポンを選択';

  @override
  String get voucherSkip => 'スキップ';

  @override
  String get voucherLoadFailed => 'クーポン一覧を読み込めませんでした。';

  @override
  String get voucherNotApplicable => 'このクーポンはこのツアーには使えません。';

  @override
  String get voucherValidateFailed => 'クーポンを確認できませんでした。もう一度お試しください。';

  @override
  String get voucherEmpty => 'クーポンはまだありません。\nポイントを交換してクーポンを手に入れましょう！';

  @override
  String get voucherOffTag => '割引';

  @override
  String voucherCode(String code) {
    return 'コード：$code';
  }

  @override
  String voucherExpiry(String date) {
    return '有効期限：$date';
  }

  @override
  String get pendingDialogTitle => '席を確保中の予約があります';

  @override
  String pendingDialogMessage(
    String code,
    String date,
    String total,
    String countdown,
  ) {
    return '予約$code（$date・$total）の席を確保中です。お支払いまで残り$countdownです。\n\n日付や人数を変更する場合は、古い予約をキャンセルしてから予約し直してください。';
  }

  @override
  String get pendingCancelAndRebook => 'キャンセルして予約し直す';

  @override
  String pendingBannerHome(String countdown) {
    return '支払い待ちの予約があります・残り$countdown';
  }

  @override
  String pendingBannerTour(String countdown) {
    return '席を確保中・残り$countdown';
  }

  @override
  String pendingBannerDetail(String date, String total) {
    return '$date・$total';
  }

  @override
  String get pendingPayAction => '支払う';

  @override
  String get coTitle => 'お支払い';

  @override
  String get coNoPaymentUrl => 'サーバーから支払いリンクが返されませんでした。';

  @override
  String get coOpenPaymentFailed => '支払いページを開けませんでした。もう一度お試しください。';

  @override
  String get coVerifyingPrevious => '前回の取引をVNPayで確認しています...';

  @override
  String get coAwaitingConfirmation => '支払いの確認を待っています。お支払い後、アプリに戻ってください。';

  @override
  String get coNoResultYet =>
      'VNPayからまだ結果が届いていません。お金は失われていません。数分後に「予約一覧」をご確認ください。';

  @override
  String get coCancelTitle => '予約をキャンセルしますか？';

  @override
  String get coCancelMessage => '確保した席は解放されます。';

  @override
  String get coKeep => '保持する';

  @override
  String get coCancelBooking => 'キャンセル';

  @override
  String get coCancelBookingLong => '予約をキャンセル';

  @override
  String get coHoldEnd => '確保期限';

  @override
  String get coLeaveTitle => '支払い画面を離れますか？';

  @override
  String coLeaveMessage(String until, String countdown) {
    return '席は$untilまで確保されています（残り$countdown）。ツアーページ、ホーム、または予約一覧から支払いに戻れます。';
  }

  @override
  String get coLeaveKeep => '離れる（席は確保）';

  @override
  String get coStay => 'とどまる';

  @override
  String get coNotFound => '予約が見つかりません。';

  @override
  String coGuestCount(int count) {
    return '$count名';
  }

  @override
  String get coPaymentDetails => '支払い内訳';

  @override
  String get coTourPrice => 'ツアー料金';

  @override
  String coTourPriceGuests(int count) {
    return 'ツアー料金（$count名）';
  }

  @override
  String coDiscount(String code) {
    return '割引・$code';
  }

  @override
  String get coCancelled => 'この予約はキャンセルされました。';

  @override
  String get coSecureNote => 'VNPayによる安全な決済で情報を保護します';

  @override
  String get coCheckPrevious => '前回の取引結果を確認';

  @override
  String get coAttempts => '支払い履歴';

  @override
  String get coDuplicateAttempt => '支払い済みの取引と重複しています';

  @override
  String get coPaidMessage => '予約が確定しました。素敵な旅になりますように！';

  @override
  String get coChooseMethod => '支払い方法を選択';

  @override
  String get coMethodDomestic => '国内カード・銀行口座';

  @override
  String get coMethodDomesticDesc =>
      'ベトナム国内のATMカードまたは銀行口座（ベトナムの銀行のインターネットバンキング・モバイルバンキング）で支払います。';

  @override
  String get coProcessing => '処理中...';

  @override
  String coPayAmount(String amount) {
    return '$amountを支払う';
  }

  @override
  String get coExpired => '支払い期限を過ぎました。確保した席は解放されます。';

  @override
  String coHoldCountdown(String countdown) {
    return '席の確保：残り$countdown';
  }

  @override
  String get paySuccessTitle => 'お支払い完了';

  @override
  String get paySuccessShort => 'お支払いが完了しました！';

  @override
  String get paySuccessViewBooking => '予約を見る';

  @override
  String paySuccessBookingCode(String code) {
    return '予約コード：$code';
  }

  @override
  String paySuccessAmount(String amount) {
    return '金額：$amount';
  }

  @override
  String get paySuccessConfirmed => 'お取引は正常に確認されました。';

  @override
  String get payNotSuccessful => 'お支払いは完了していません。';

  @override
  String get payFailedRetry => 'お支払いに失敗しました。もう一度お試しいただけます。';

  @override
  String get payLoadFailed => '支払い情報を読み込めませんでした。';

  @override
  String get payMethodsLoadFailed => '支払い方法を読み込めませんでした。';

  @override
  String get payUnverifiedLater => '前回の取引結果をまだ確認できません。後ほどお試しください。';

  @override
  String get payUnverifiedRetry =>
      '前回の取引結果をまだ確認できません。未払いの場合はすぐに再試行できます。支払い済みの場合は数分後に再度ご確認ください。';

  @override
  String get payAwaitingResult => '支払い結果を待っています...';

  @override
  String get payInitializingTxn => '取引を開始しています...';

  @override
  String get payInitFailed => '支払いを開始できませんでした。もう一度お試しください。';

  @override
  String get payScanQrToFinish => 'QRコードをスキャンしてお支払いを完了してください。';

  @override
  String get payOpenBrowserFailed => '支払いページを開けませんでした。ブラウザをご確認ください。';

  @override
  String get payStatusCheckFailed => '支払い状況を確認できませんでした。もう一度お試しください。';

  @override
  String get payCheckingResult => '支払い結果を確認しています...';

  @override
  String get paySuperseded => 'この取引は置き換えられました。予約は別の取引で支払い済みです。';

  @override
  String get payDeadlineExceeded => '10分間の支払い期限が過ぎました。もう一度ツアーを予約してください。';

  @override
  String get payRetryTitle => 'もう一度支払いますか？';

  @override
  String get payRetryMessage =>
      '前回の取引結果をまだ確認できません。\n\n• まだ支払っていない場合：残り時間内にすぐ再試行できます。\n• すでに支払った場合：二重払いを防ぐため「再確認」を選んで結果を同期してください。';

  @override
  String get payCheckAgain => '再確認';

  @override
  String payBookingNumber(int id) {
    return '予約 #$id';
  }

  @override
  String get payTourFallback => '体験ツアー';

  @override
  String get payExperienceDate => '体験日';

  @override
  String get payMethodTitle => '支払い方法';

  @override
  String get payMethodsUnavailable => '支払い方法を読み込めませんでした。再試行は可能です。';

  @override
  String get payInitializing => '開始中...';

  @override
  String get payChecking => '確認中...';

  @override
  String get payCheckResult => '支払い結果を確認';

  @override
  String get payTimeLimitNote => 'お支払いは10分以内に完了してください。VNPayのページがブラウザで開きます。';

  @override
  String get payQrTitle => 'スキャンして支払う';

  @override
  String get payQrHint => 'VNPay-QR対応の銀行アプリまたは電子ウォレットでこのコードをスキャンしてください。';

  @override
  String get payChooseCard => 'カードの種類を選択';

  @override
  String get payChooseCardHint => 'カードの種類を選択（Visa、Mastercard、JCB…）';

  @override
  String payCardType(String type) {
    return 'カードの種類：$type';
  }

  @override
  String get payCardTypesUnavailable => 'カードの種類を読み込めませんでした。国際カードでのお支払いは可能です。';

  @override
  String get payMethodIntl => '国際カード';

  @override
  String get payMethodQr => '銀行アプリ・電子ウォレット';

  @override
  String get mbTitle => '予約一覧';

  @override
  String mbTabAll(int count) {
    return 'すべて（$count）';
  }

  @override
  String mbTabPurchased(int count) {
    return '購入済み（$count）';
  }

  @override
  String mbTabPending(int count) {
    return '支払い待ち（$count）';
  }

  @override
  String mbTabExperiencing(int count) {
    return '体験中（$count）';
  }

  @override
  String mbTabCompleted(int count) {
    return '完了（$count）';
  }

  @override
  String mbTabRefunding(int count) {
    return '返金処理中（$count）';
  }

  @override
  String mbTabRefunded(int count) {
    return '返金済み（$count）';
  }

  @override
  String mbTabClosed(int count) {
    return 'キャンセル・期限切れ（$count）';
  }

  @override
  String get mbEmptyAll => '予約はまだありません。';

  @override
  String get mbEmptyPurchased => '支払い済みの予約はまだありません。';

  @override
  String get mbEmptyPending => '支払い待ちの予約はありません。';

  @override
  String get mbEmptyExperiencing => '進行中の旅はありません。';

  @override
  String get mbEmptyCompleted => '完了した予約はまだありません。';

  @override
  String get mbEmptyRefunding => '返金中の予約はありません。';

  @override
  String get mbEmptyRefunded => '返金済みの予約はまだありません。';

  @override
  String get mbEmptyClosed => 'キャンセル・期限切れの予約はありません。';

  @override
  String get mbDetails => '詳細';

  @override
  String get mbRebook => 'もう一度予約する';

  @override
  String get mbBookingCancelled => '予約はキャンセル済み';

  @override
  String get mbBookingExpired => '予約は期限切れ';

  @override
  String get mbEnterExperience => '体験を始める';

  @override
  String mbReason(String reason) {
    return '理由：$reason';
  }

  @override
  String get mbPaidButClosed =>
      'お支払いは記録されましたが、席は解放されています。返金についてはサポートにお問い合わせください。';

  @override
  String get mbViewDetails => '予約の詳細を見る';

  @override
  String mbPaymentDeadline(String time) {
    return '支払い期限：$time';
  }

  @override
  String get bdTitle => '予約詳細';

  @override
  String get bdLoadFailed => '予約詳細を読み込めませんでした。';

  @override
  String get bdPaymentConfirmedToast => 'お支払いが確認されました！';

  @override
  String get bdTxnFailedConfirmed => 'この取引は失敗として確認されました。';

  @override
  String get bdUnverified => 'まだ結果を確認できません。支払い済みの場合は数分後に再度お試しください。';

  @override
  String get bdCancelTitle => '予約をキャンセル';

  @override
  String get bdCancelMessage => 'キャンセルすると、確保した席は他のお客様に解放されます。この操作は取り消せません。';

  @override
  String get bdCancelReasonHint => 'キャンセル理由（任意）';

  @override
  String get bdKeepBooking => '予約を保持';

  @override
  String get bdCancelledToast => '予約をキャンセルしました。確保した席は解放されました。';

  @override
  String get bdCancelFailed => '予約をキャンセルできませんでした。もう一度お試しください。';

  @override
  String get bdRefundWindowClosed =>
      '返金申請はツアー出発日より前のみ可能です。体験済み、またはツアーが完了しているため申請できません。';

  @override
  String get bdEyebrowCode => '予約コード';

  @override
  String get bdEyebrowTotal => '合計金額';

  @override
  String get bdNoExperienceDate => '体験日はまだ未定です';

  @override
  String bdExperienceCount(int count) {
    return '体験$count件';
  }

  @override
  String get bdStepBooked => '予約';

  @override
  String get bdStepBookedCreated => '予約作成済み';

  @override
  String get bdStepPayment => '支払い';

  @override
  String get bdStepNotPaid => '未払い';

  @override
  String get bdStepConfirmed => '確定';

  @override
  String get bdStepCompleted => '完了';

  @override
  String get bdStepNotDone => '実施なし';

  @override
  String get bdStepNotExperienced => '未体験';

  @override
  String get bdProgressTitle => '予約の進行状況';

  @override
  String bdCountdownHint(String countdown) {
    return 'お支払いまで残り$countdown。期限を過ぎると、確保した席は他のお客様に解放されます。';
  }

  @override
  String get bdExperiencesTitle => '予約に含まれる体験';

  @override
  String bdItemCount(int count) {
    return '$count件';
  }

  @override
  String get bdExperiencesHint => 'ツアー内の各体験は、選択した日の席を1つ使用します。';

  @override
  String get bdNoExperiences => 'この予約に記録された体験はありません。';

  @override
  String get bdExperiencesTotal => '体験の合計金額';

  @override
  String bdExperienceNumber(String id) {
    return '体験 #$id';
  }

  @override
  String get bdDepartureTitle => '出発情報';

  @override
  String get bdOrderInfoTitle => '予約情報';

  @override
  String get bdRowCode => '予約コード';

  @override
  String get bdRowTour => 'ツアー';

  @override
  String get bdRowExperienceCount => '体験数';

  @override
  String get bdRowPaidAt => '支払い日時';

  @override
  String get bdRowBookedAt => '予約日時';

  @override
  String get bdRowDeadline => '支払い期限';

  @override
  String get bdRowCancelReason => 'キャンセル理由';

  @override
  String get bdPassengersTitle => 'グループの参加者';

  @override
  String bdPeopleCount(int count) {
    return '$count名';
  }

  @override
  String get bdPassengersHint => '予約時に入力された参加者です。';

  @override
  String get bdInviteHint =>
      '招待を送ると、参加者はJourneyGoアカウントを作成してグループでツアーを確認できます。招待の有効期限は24時間です。';

  @override
  String get bdBookerTag => '予約者';

  @override
  String get bdResendInvite => '招待を再送';

  @override
  String get bdInvite => '招待する';

  @override
  String bdAge(int age) {
    return '$age歳';
  }

  @override
  String get bdInfoHidden => '個人情報は非表示';

  @override
  String get bdNoEmail => 'メール未登録';

  @override
  String bdInviteSent(String email) {
    return '$emailに招待を送信しました';
  }

  @override
  String get bdInviteEmailTitle => '招待する人のメールアドレスを入力';

  @override
  String get bdEmailExample => 'example@gmail.com';

  @override
  String get bdSendInvite => '招待を送信';

  @override
  String get bdPaymentHistory => '支払い履歴';

  @override
  String get bdNoPayments => '支払い取引はまだありません。';

  @override
  String get bdRefundEntryTitle => '旅行のキャンセルと返金';

  @override
  String get bdRefundEntryHint => '出発日より前に申請してください';

  @override
  String bdRefundEntryHintDate(String date) {
    return '$dateより前に申請してください';
  }

  @override
  String get bdRefundRequests => '返金申請';

  @override
  String bdRefundProcessingDetail(String code) {
    return '申請$codeは処理中です。下の「返金処理履歴」で各ステップを確認できます。';
  }

  @override
  String bdRefundDoneDetail(String code, String status) {
    return '申請$codeは処理済みです：$status。';
  }

  @override
  String get bdAuditTitle => '返金処理履歴';

  @override
  String get bdAuditHint => '処理ステップは時系列で表示されます（上が古く、下が新しい順）。';

  @override
  String bdRefundNumber(int id) {
    return '申請 #$id';
  }

  @override
  String bdTransactionAt(String time) {
    return '取引 $time';
  }

  @override
  String get bdStuckHint => 'VNPayからまだ確認が届いていません。支払い済みの場合は再確認してください。';

  @override
  String get bdChecking => '確認中';

  @override
  String bdRefundAwaitingTriage(String status) {
    return '$status・管理者の分類待ち';
  }

  @override
  String get bdAwaitingTriage => '分類待ち';

  @override
  String get bdHintConfirmed => 'お支払い完了 — 席が確定しました。';

  @override
  String get bdHintCompleted => '体験が完了しました。ご参加ありがとうございました！';

  @override
  String get bdHintPending => 'この予約は支払い待ちです。10分以内にお支払いを完了してください。';

  @override
  String get bdHintCancelled => 'この予約はキャンセルされ、席は解放されました。';

  @override
  String get auditCreated => '返金申請を送信しました';

  @override
  String get auditApproved => '管理者が申請を承認しました';

  @override
  String get auditRejected => '申請は却下されました';

  @override
  String get auditCancelled => '申請はキャンセルされました';

  @override
  String get auditVnpaySent => 'VNPayに返金リクエストを送信しました';

  @override
  String get auditVnpayResponse => 'VNPayから返金結果の応答がありました';

  @override
  String get auditManualRecorded => '手動振込を記録しました';

  @override
  String get auditManualConfirmed => '振込を確認しました — 返金完了';

  @override
  String get auditStatusUpdated => '申請ステータスを更新しました';

  @override
  String get auditOther => '返金申請を更新しました';

  @override
  String get holdReleased => '返却済み';

  @override
  String get holdFreed => '解放済み';

  @override
  String get holdHolding => '確保中';

  @override
  String get refundToneRefunded => '返金済み';

  @override
  String get refundToneRejected => '却下';

  @override
  String get rfPolicyCustomer => 'お客様都合（ツアーのキャンセル）';

  @override
  String rfCancelBefore(int days) {
    return '$days日前までにキャンセル';
  }

  @override
  String rfRefundPercent(int percent) {
    return '$percent%返金';
  }

  @override
  String rfCancelWithin(int hours) {
    return '$hours時間以内のキャンセル／不参加（日程どおり）';
  }

  @override
  String get rfPolicyPlatform => 'システム・提携先の問題';

  @override
  String get rfPolicyPlatformLine => '体験が解放されない、提携先がツアーを実施しない…';

  @override
  String get rfPolicyForceMajeure => '不可抗力';

  @override
  String get rfPolicyForceMajeureLine => '自然災害、感染症など…';

  @override
  String rfMaxFiles(int max) {
    return '1件の申請に添付できるファイルは最大$max件です。';
  }

  @override
  String get rfGalleryFailed => 'フォトライブラリを開けませんでした。';

  @override
  String get rfVideoFailed => '動画を選択できませんでした。';

  @override
  String get rfUploadFailed => '証拠をすべてアップロードできませんでした。もう一度お試しください。';

  @override
  String get rfSubmitFailed => '返金申請を送信できませんでした。もう一度お試しください。';

  @override
  String get rfErrSummary => '簡単な理由を入力してください。';

  @override
  String get rfErrDetail => '問題の内容または参加できない理由を詳しくご記入ください。';

  @override
  String get rfErrBank => '受取口座の情報をすべて入力してください。';

  @override
  String get rfErrContact => '連絡先情報をすべて入力してください。';

  @override
  String get rfErrReceipt => '決済完了の領収書のスクリーンショットをアップロードしてください（管理者の照合に必須）。';

  @override
  String get rfErrAgree => '情報と証拠が正確であることを確認してください。';

  @override
  String get rfErrGeneric => '入力内容をご確認ください。';

  @override
  String get rfSentTitle => '返金申請を送信しました';

  @override
  String rfSentDetail(String code, String status) {
    return '申請コード：$code\nステータス：$status';
  }

  @override
  String get rfGotIt => '了解';

  @override
  String get rfTitle => '返金申請';

  @override
  String get rfFooterNote => '申請と証拠は管理者が確認します。受取金額、返金率、返金方法は承認後にお知らせします。';

  @override
  String get rfOrder => '予約';

  @override
  String get rfPaidBooking => '支払い済みの予約';

  @override
  String get rfAmountPaid => '支払い金額';

  @override
  String get rfPaidDate => '支払い日';

  @override
  String get rfPolicyTitle => '返金ポリシー';

  @override
  String get rfReasonTitle => '返金理由';

  @override
  String get rfReasonHint => '管理者がこの内容を確認し、返金額を決定します。';

  @override
  String get rfSummaryHint => '簡単な理由を入力（例：急病など）';

  @override
  String get rfDetailHint => '管理者が適切に対応できるよう、発生した問題や参加できない理由を詳しくご記入ください';

  @override
  String get rfEvidenceTitle => '証拠を添付';

  @override
  String get rfEvidenceTypes => '（写真・動画・書類）';

  @override
  String get rfEvidenceExamples => '診断書、問題の写真、アプリのエラー画面のスクリーンショットなど。';

  @override
  String get rfReceiptRequired => '必須：決済完了の領収書のスクリーンショット';

  @override
  String get rfReceiptHint =>
      '「取引成功」と表示されたVNPayの領収書をスクリーンショットし、下の「写真を追加」をタップしてください。写真がないと申請は送信されません。';

  @override
  String get rfAddPhoto => '写真を追加';

  @override
  String get rfAddVideo => '動画を追加';

  @override
  String get rfUploadError => 'アップロード失敗';

  @override
  String get rfBankTitle => '受取口座';

  @override
  String get rfBankHint => '必要に応じて手動で返金するために入力してください。';

  @override
  String get rfAccountNumber => '口座番号';

  @override
  String get rfAccountName => '口座名義';

  @override
  String get rfBank => '銀行';

  @override
  String get rfContactTitle => '連絡先';

  @override
  String get rfPhone => '電話番号';

  @override
  String get rfBackupEmail => '予備のメールアドレス';

  @override
  String get rfAgreement => '提供した情報と証拠が真実であり、返金ポリシーを読んで理解したことを誓約します。';

  @override
  String get rfSending => '送信中...';

  @override
  String get rfSubmit => '返金を申請する';

  @override
  String get rhLoadFailed => '返金履歴を読み込めませんでした。';

  @override
  String get rhAwaitingAdminTriage => '管理者の分類待ち';

  @override
  String get rhTitle => '返金履歴';

  @override
  String get rhEmpty => '返金申請はまだありません';

  @override
  String get rhMyBooking => '私の予約';

  @override
  String get rhNoRefund => '返金なし';

  @override
  String get rhAwaitingAdmin => '管理者の処理待ち';

  @override
  String get rhNotRefunded => '返金対象外';

  @override
  String rhRejectReason(String reason) {
    return '却下理由：$reason';
  }

  @override
  String rhMethod(String method) {
    return '方法：$method';
  }

  @override
  String get rhEvidenceLoadFailed => '証拠を読み込めませんでした';

  @override
  String get rhFilterPending => '処理待ち';

  @override
  String get rhFilterRefunded => '返金済み';

  @override
  String get rsTitle => 'サポートと返金';

  @override
  String get rsLoadFailed => '返金申請を読み込めませんでした';

  @override
  String get rsEmptyTitle => '返金申請はまだありません';

  @override
  String get rsEmptyMessage => 'チケットの返金申請と処理状況はここに表示されます。';

  @override
  String rsBookingNumber(String id) {
    return '予約 #$id';
  }

  @override
  String rsSentAt(String time) {
    return '送信日時 $time';
  }

  @override
  String get rsApprovedAmount => '承認金額';

  @override
  String get rsProposedAmount => '提案金額';

  @override
  String get rsAmount => '金額';

  @override
  String get refundStatusPendingReview => '審査待ち';

  @override
  String get refundStatusApproved => '承認済み';

  @override
  String get refundStatusVnpay => 'VNPayの返金確認待ち';

  @override
  String get refundStatusProcessing => '返金中';

  @override
  String get refundStatusManual => '手動振込待ち';

  @override
  String get refundStatusRejected => '却下';

  @override
  String get refundStatusRejected2 => '却下済み';

  @override
  String get refundStatusFailed => '返金失敗';

  @override
  String get refundReasonCustomer => 'お客様都合';

  @override
  String get refundReasonPlatform => 'プラットフォームの問題';

  @override
  String get refundReasonProvider => '提携先の問題';

  @override
  String get refundReasonForceMajeure => '不可抗力';

  @override
  String get refundReasonOther => 'その他の理由';

  @override
  String get refundMethodVnpay => 'VNPayで返金';

  @override
  String get refundMethodManual => '手動振込';

  @override
  String get refundMethodUnknown => '未定';

  @override
  String get rfOtherBank => 'その他（銀行名を記入）';

  @override
  String get invLoadFailed => '招待情報を読み込めませんでした。もう一度お試しください。';

  @override
  String invLoginWithEmail(String email) {
    return '招待を確認するには$emailでログインしてください。';
  }

  @override
  String get invConfirmFailed => '招待を確認できませんでした。もう一度お試しください。';

  @override
  String get invStatusPending => '確認待ち';

  @override
  String get invStatusRevoked => '取り消し済み';

  @override
  String get invTitle => 'ツアーへの招待';

  @override
  String get invJoined => 'ツアーに参加しました！';

  @override
  String get invNoLongerValid => 'この招待は無効です';

  @override
  String get invInvited => 'ツアーに招待されています';

  @override
  String get invLinked => '参加者が予約に紐づけられました。';

  @override
  String get invExpiredHint => '招待の有効期限が切れたか、取り消されました。予約者に再送を依頼してください。';

  @override
  String get invConfirmHint => '招待を確認すると、グループでツアーに参加できるようになります。';

  @override
  String get invInfoTitle => '招待情報';

  @override
  String get invPassenger => '参加者';

  @override
  String get invInvitedEmail => '招待されたメール';

  @override
  String get invValidUntil => '有効期限';

  @override
  String get invStatus => 'ステータス';

  @override
  String get invConfirming => '確認中...';

  @override
  String get invConfirmJoin => '参加を確定';

  @override
  String get invLoginToConfirm => 'ログインして確認';

  @override
  String get invNotFound => '招待が見つかりません';

  @override
  String get invNotFoundHint => '招待が存在しないか、有効期限が切れています。';

  @override
  String get invListLoadFailed => '招待一覧を読み込めませんでした。もう一度お試しください。';

  @override
  String get invConfirmFailed2 => '招待を確認できませんでした。もう一度お試しください。';

  @override
  String get invInviterFallback => '予約者';

  @override
  String invInvitedBy(String inviter, String tour) {
    return '$inviterさんがツアー「$tour」にあなたを招待しました。招待を確認すると、グループでツアーに参加できます。';
  }

  @override
  String get invJoinedDetail => '参加者が予約に紐づけられました。予約の詳細を確認し、ツアーにアクセスできます。';

  @override
  String get invNoneLeft => '招待はもうありません';

  @override
  String get invNoneLeftHint => '確認待ちのツアー招待はありません。';

  @override
  String get invLoginSnack => 'ツアーに招待されています。ログインして招待を確認してください。';

  @override
  String get invTagSent => '招待送信済み';

  @override
  String get invTagJoined => '参加済み';

  @override
  String get invTagExpired => '招待の有効期限切れ';

  @override
  String get invTagRevoked => '招待はキャンセル済み';

  @override
  String get tripsTitle => 'マイ旅程';

  @override
  String get tripsSubtitle => '購入済みチケット、進行中・完了した旅';

  @override
  String get tripsLoadFailed => '旅程を読み込めませんでした';

  @override
  String get tripsEmptySection => 'この項目に旅はまだありません。';

  @override
  String get tripsStageActive => '進行中';

  @override
  String get tripsStageReady => 'まもなく出発';

  @override
  String get tripsStageEnded => '終了';

  @override
  String get tripsNotJoined => 'このツアーには参加しませんでした';

  @override
  String get tripsLive => 'ライブ';

  @override
  String get tripsEmptyTitle => '旅はまだありません';

  @override
  String get tripsEmptyMessage => '探索ページでツアーを予約すると、ここにチケットが表示され、現地で旅を始められます。';

  @override
  String get tripsExplore => 'ツアーを探す';

  @override
  String get tripsFilterActive => '進行中';

  @override
  String get tripsFilterReady => '予定';

  @override
  String get tripsFilterDone => '完了';

  @override
  String get tripsExperiencing => '体験中';

  @override
  String tripsStopProgress(int current, int total) {
    return '$current/$totalか所目';
  }

  @override
  String get tripsStopsCheckedIn => ' か所完了';

  @override
  String tripsNextStop(int current, int total) {
    return '次のスポット $current/$total';
  }

  @override
  String get tripsAllStopsChecked => '全スポット完了';

  @override
  String get tripsUnfinished => '続きから';

  @override
  String tripsUnfinishedHint(String date) {
    return '$dateに開始しましたが、まだ完了していません。';
  }

  @override
  String get tripsActionTitle => '対応が必要です';

  @override
  String get tripsRefundNeededTitle => '支払い済みですがキャンセルされました・返金を申請してください';

  @override
  String tripsDestinations(int count) {
    return '目的地$countか所';
  }

  @override
  String get tripsTicketDetails => 'チケット詳細';

  @override
  String get tripsViewItinerary => '行程を見る';

  @override
  String get tripsStart => '開始';

  @override
  String get tripsToday => '今日';

  @override
  String get tripsTomorrow => '明日';

  @override
  String tripsDaysLeft(int days) {
    return 'あと$days日';
  }

  @override
  String tripsCodeSemantics(String code) {
    return 'チケットコード$code、タップでコピー';
  }

  @override
  String tripsCodeCopied(String code) {
    return 'チケットコード$codeをコピーしました';
  }

  @override
  String get tripsTicketCode => 'チケットコード';

  @override
  String get calLoadFailed => '出発日を読み込めませんでした。';

  @override
  String get calTitle => '日付からツアーを探す';

  @override
  String get calLoadFailedTitle => 'カレンダーを読み込めませんでした';

  @override
  String get calPrevMonth => '前の月';

  @override
  String get calNextMonth => '次の月';

  @override
  String get calNoDepartures => '出発予定はまだありません';

  @override
  String calDepartureCount(int count) {
    return '出発$count件';
  }

  @override
  String calDaySemantics(String date, int count) {
    return '$date、ツアー$count件';
  }

  @override
  String calDaySemanticsNone(String date) {
    return '$date、ツアーなし';
  }

  @override
  String get calNoDeparturesHint => '提携先が出発日を公開すると、ここにツアーが表示されます。';

  @override
  String get authLoginSuccess => 'ログインしました！';

  @override
  String authWelcomeBackName(String name) {
    return '$nameさん、ベトナムの文化遺産へおかえりなさい。';
  }

  @override
  String get authSignupSuccess => 'アカウントを作成しました！';

  @override
  String get authSignupReward => '🎉 文化遺産探索ポイント+100を獲得しました！';

  @override
  String get authLoginFailed => 'ログインできませんでした';

  @override
  String get authSignupFailedMessage => 'アカウントを作成できませんでした。もう一度お試しください。';

  @override
  String get authSignupFailed => '登録できませんでした';

  @override
  String get authInvalid => 'アカウントまたはパスワードが正しくありません！';

  @override
  String get authAppleUnsupported => 'AndroidではまだApple IDでのログインに対応していません。';

  @override
  String get authWelcomeBack => 'JourneyGoへおかえりなさい！';

  @override
  String get authPrivacyTitle => 'デジタル文化遺産基準';

  @override
  String get authPrivacyBody =>
      '旅行者のデータは国のデジタル文化保存基準に沿って安全に暗号化されています。身元情報、旅行履歴、文化遺産ポイントを確実に保護します。';

  @override
  String get authPrivacyAgree => '理解して同意します';

  @override
  String get authFullName => '氏名';

  @override
  String get authFullNameExample => '山田 太郎';

  @override
  String get authErrNameRequired => '氏名を入力してください';

  @override
  String get authErrNameShort => '氏名が短すぎます';

  @override
  String get authErrEmailRequired => 'メールアドレスを入力してください';

  @override
  String get authErrEmailInvalid => 'メールアドレスの形式が正しくありません';

  @override
  String get authPhone => '電話番号';

  @override
  String get authErrPhoneRequired => '電話番号を入力してください';

  @override
  String get authErrPhoneLength => '電話番号は9〜11桁で入力してください';

  @override
  String get authPassword => 'パスワード';

  @override
  String get authPasswordHintLogin => 'パスワードを入力';

  @override
  String get authPasswordHintSignup => '6文字以上';

  @override
  String get authErrPasswordRequired => 'パスワードを入力してください';

  @override
  String get authErrPasswordShort => 'パスワードは6文字以上にしてください';

  @override
  String get authConfirmPassword => 'パスワード（確認）';

  @override
  String get authConfirmPasswordHint => '作成したパスワードをもう一度入力';

  @override
  String get authErrConfirmRequired => 'パスワードをもう一度入力してください';

  @override
  String get authErrConfirmMismatch => 'パスワードが一致しません';

  @override
  String get authHeaderLogin => 'おかえりなさい！ログインして旅を続けましょう。';

  @override
  String get authHeaderSignup => 'アカウントを作成して文化遺産を探索し、ポイントを獲得しましょう。';

  @override
  String get authLogin => 'ログイン';

  @override
  String get authSignup => 'アカウント作成';

  @override
  String get authPromoPrefix => '新規登録で';

  @override
  String get authPromoPoints => '+100ポイント';

  @override
  String get authPromoSuffix => 'の文化遺産探索ボーナスをプレゼント！';

  @override
  String get authRemember => 'ログイン状態を保持';

  @override
  String get authForgot => 'パスワードをお忘れですか？';

  @override
  String get authOrContinue => 'または次の方法で続行';

  @override
  String get authGoogle => 'Googleで続行';

  @override
  String get authFooter => 'デジタル文化遺産基準のセキュリティ・利用規約';

  @override
  String authServerUnreachableDebug(String url, String detail, String hint) {
    return 'サーバー（$url）に接続できませんでした。\n詳細：$detail\n\n$hint';
  }

  @override
  String get authServerUnreachable => 'サーバーに接続できませんでした。後ほどお試しください。';

  @override
  String authServerTimeoutDebug(String url, String hint) {
    return 'サーバー（$url）への接続がタイムアウトしました。\n\n$hint';
  }

  @override
  String get authServerTimeout => 'サーバーへの接続がタイムアウトしました。後ほどお試しください。';

  @override
  String authNetworkError(String error) {
    return 'ネットワークエラー：$error';
  }

  @override
  String get authErr401 => 'ログイン情報が正しくないか、セッションの有効期限が切れています。';

  @override
  String get authErr403 => 'この機能へのアクセス権限がありません。';

  @override
  String get authErr404 => 'リクエストされたリソースが見つかりません（404）。';

  @override
  String authErrServer(String code) {
    return 'サーバーエラー（$code）。後ほどお試しください。';
  }

  @override
  String get authNoRefreshToken => 'リフレッシュトークンが見つかりません。再度ログインしてください。';

  @override
  String authSessionExpiredDetail(String detail) {
    return 'セッションの有効期限が切れました：$detail';
  }

  @override
  String get apiInvalidData => 'サーバーから無効なデータが返されました。';

  @override
  String get googleCancelled => 'Googleログインがキャンセルされました。';

  @override
  String get googleNoToken => 'GoogleからIDトークンを取得できませんでした。もう一度お試しください。';

  @override
  String get sessionExpired => 'セッションの有効期限が切れました。続けるには再度ログインしてください。';

  @override
  String apiRequestFailed(String code) {
    return 'リクエストを処理できませんでした（コード$code）。';
  }

  @override
  String get apiTimeout => 'サーバーへの接続がタイムアウトしました。もう一度お試しください。';

  @override
  String get apiUnreachable => 'サーバーに接続できませんでした。ネットワークとAPIアドレスをご確認ください。';

  @override
  String get apiNoImageUrl => 'サーバーから画像URLが返されませんでした。';

  @override
  String apiImageUploadFailed(String code) {
    return '画像をアップロードできませんでした（コード$code）。';
  }

  @override
  String get apiImageTimeout => '画像のアップロードがタイムアウトしました。もう一度お試しください。';

  @override
  String get apiNoVideoUrl => 'サーバーから動画URLが返されませんでした。';

  @override
  String apiVideoUploadFailed(String code) {
    return '動画をアップロードできませんでした（コード$code）。';
  }

  @override
  String get apiVideoTimeout => '動画のアップロードがタイムアウトしました。もう一度お試しください。';

  @override
  String get pwShow => 'パスワードを表示';

  @override
  String get pwHide => 'パスワードを隠す';

  @override
  String get pwErrNewRequired => '新しいパスワードを入力してください';

  @override
  String get pwErrNewShort => 'パスワードは6文字以上にしてください';

  @override
  String get pwOtpResent => 'OTPコードをメールに再送しました。';

  @override
  String get pwResetSuccess => 'パスワードを再設定しました';

  @override
  String get pwResetSuccessHint => '新しいパスワードでログインしてください。';

  @override
  String get pwForgotTitle => 'パスワードの再設定';

  @override
  String get pwForgotSubtitle => 'メールでOTPコードを受け取ってパスワードを再設定';

  @override
  String get pwStepOtp => 'OTPコード';

  @override
  String get pwStepNewPassword => '新しいパスワード';

  @override
  String get pwEmailIntro => '登録したメールアドレスを入力してください。6桁のコードをお送りします。';

  @override
  String get pwErrEmailRequired => 'メールアドレスを入力してください';

  @override
  String get pwErrEmailInvalid => 'メールアドレスの形式が正しくありません';

  @override
  String get pwSendOtp => 'OTPコードを送信';

  @override
  String get pwCodeSentPrefix => '';

  @override
  String get pwCodeSentSuffix => ' にコードを送信しました。届かない場合は迷惑メールフォルダもご確認ください。';

  @override
  String get pwErrOtpLength => 'OTPコードは6桁で入力してください';

  @override
  String get pwVerifyCode => 'コードを確認';

  @override
  String get pwChangeEmail => 'メールアドレスを変更';

  @override
  String pwResendIn(int seconds) {
    return '$seconds秒後に再送';
  }

  @override
  String get pwResend => 'コードを再送';

  @override
  String get pwNewIntro => 'アカウントの新しいパスワードを設定してください。';

  @override
  String get pwMin6 => '6文字以上';

  @override
  String get pwConfirmNew => '新しいパスワード（確認）';

  @override
  String get pwErrMismatch => 'パスワードが一致しません';

  @override
  String get pwResetButton => 'パスワードを再設定';

  @override
  String get pwChangeSuccess => 'パスワードを変更しました。';

  @override
  String get pwChangeSubtitle => '文化遺産の旅を安全に守りましょう';

  @override
  String get pwCurrent => '現在のパスワード';

  @override
  String get pwCurrentGoogleHint =>
      'Googleでログインしていて、パスワードを設定したことがない場合は空欄のままにしてください';

  @override
  String get pwErrCurrentRequired => '現在のパスワードを入力してください';

  @override
  String get pwNewHelper => '6文字以上で、現在のパスワードと異なるもの';

  @override
  String get pwSave => '新しいパスワードを保存';

  @override
  String get epNameRequired => '氏名を入力してください！';

  @override
  String get epSaved => 'プロフィールを更新しました！';

  @override
  String get epTitle => '旅行者プロフィールの編集';

  @override
  String get epEmailLabel => 'アカウントのメール（変更不可）：';

  @override
  String get epNameLabel => '氏名：';

  @override
  String get epNameHint => '氏名を入力';

  @override
  String get epPhoneLabel => '電話番号：';

  @override
  String get epPhoneHint => '連絡先の電話番号を入力';

  @override
  String get epSaving => '変更を保存しています...';

  @override
  String get epSave => '変更を保存';

  @override
  String get notifCatBooking => '予約';

  @override
  String get notifCatRefund => '返金';

  @override
  String get notifCatReward => '報酬';

  @override
  String get notifCatApproved => '承認済み';

  @override
  String get notifCatRejected => '要確認';

  @override
  String get notifCatCommunity => 'コミュニティ';

  @override
  String get notifCatFinance => '財務';

  @override
  String get notifCatReview => '審査';

  @override
  String get notifCatChat => 'メッセージ';

  @override
  String get timeJustNow => 'たった今';

  @override
  String timeMinutesAgo(int count) {
    return '$count分前';
  }

  @override
  String timeHoursAgo(int count) {
    return '$count時間前';
  }

  @override
  String get timeYesterday => '昨日';

  @override
  String timeDaysAgo(int count) {
    return '$count日前';
  }

  @override
  String notifNewCount(int count) {
    return '新着$count件';
  }

  @override
  String get notifReadAll => 'すべて既読にする';

  @override
  String get notifOlder => '以前のお知らせを見る';

  @override
  String get notifEmpty => 'お知らせはまだありません';

  @override
  String get notifEmptyHint => '支払い結果、返金、バッジ、投稿に関するお知らせがここに表示されます。';

  @override
  String get notifChannelTimer => 'アクティビティのタイマー';

  @override
  String get notifChannelTimerDesc => '現地体験のカウントダウン終了をお知らせします';

  @override
  String get notifChannelCountdown => 'カウントダウン';

  @override
  String get notifChannelCountdownDesc => '現地アクティビティの残り時間（ロック画面にも表示）';

  @override
  String tkCountdownBody(String place) {
    return 'カウントダウン中・$place';
  }

  @override
  String get ovHideTitle => 'フローティングタイマーを隠しますか？';

  @override
  String get ovHideBody => 'タイマーはアプリ内で動き続けます。';

  @override
  String get ovHide => '隠す';

  @override
  String get ovCancel => 'キャンセル';

  @override
  String get ovPermTitle => 'アプリ外にもタイマーを表示しますか？';

  @override
  String get ovPermBody => 'Journey Go が他のアプリの上に表示できるようにすると、ホーム画面で残り時間を確認できます。';

  @override
  String get ovPermAllow => '許可する';

  @override
  String get ovPermLater => '後で';

  @override
  String get notifChannelMain => 'Journey Goのお知らせ';

  @override
  String get notifChannelMainDesc => 'ツアー予約、返金、バッジ、フォーラム投稿';

  @override
  String get chatListLoadFailed => 'サポート履歴を読み込めませんでした。';

  @override
  String get chatEmpty => '会話はまだありません';

  @override
  String get chatEmptyHint =>
      'ツアー詳細を開いて「…とチャット」をタップすると、予約前にツアー会社へ質問できます。履歴はここに保存されます。';

  @override
  String get chatNoMessages => 'メッセージはまだありません';

  @override
  String get chatOpenFailed => '会話を開けませんでした。';

  @override
  String get chatProviderFallback => 'ツアー会社';

  @override
  String chatAskAbout(String name) {
    return 'このツアーについて$nameに質問';
  }

  @override
  String get chatProviderLower => 'ツアー会社';

  @override
  String get chatAskHint => '予約を決める前に、行程、料金、天候、予約手続きについて質問できます。';

  @override
  String get chatInputHint => 'ツアー会社にメッセージ…';

  @override
  String get pcVerified => '認証済みパートナー';

  @override
  String get pcOnline => 'オンライン';

  @override
  String get pcReplyFewMinutes => '通常数分以内に返信';

  @override
  String pcReplyMinutes(int minutes) {
    return '通常約$minutes分で返信';
  }

  @override
  String pcReplyHours(int hours) {
    return '通常約$hours時間で返信';
  }

  @override
  String get pcReplyDay => '通常1日以内に返信';

  @override
  String get pcReplyDays => '通常数日以内に返信';

  @override
  String get pcNotifyReply => 'ツアー会社から返信があると通知が届きます';

  @override
  String pcAskingAbout(String tour) {
    return '問い合わせ中：$tour';
  }

  @override
  String get pcToday => '今日';

  @override
  String get pcYesterday => '昨日';

  @override
  String get pcQuick1 => '直近の出発日は？';

  @override
  String get pcQuick2 => '子ども料金は？';

  @override
  String get pcQuick3 => 'ホテル送迎はありますか？';

  @override
  String get pcQuick4 => '持ち物は何が必要ですか？';

  @override
  String get pcQuickTitle => 'おすすめの質問';

  @override
  String pcNewMessages(int count) {
    return '新着$count件';
  }

  @override
  String get pcSending => '送信中…';

  @override
  String get pcSendFailed => '送信失敗・タップして再送';

  @override
  String get pcCopied => 'メッセージをコピーしました';

  @override
  String get pcLoadOlder => '以前のメッセージを表示';

  @override
  String get pcHistoryEnd => 'これ以上古いメッセージはありません';

  @override
  String get pcInfoTitle => 'ツアー会社の情報';

  @override
  String get pcInfoBody =>
      'このツアー会社は Journey Go の審査済みです。メッセージは保存され、いつでも続きを確認できます。';

  @override
  String get pcViewTour => 'ツアーを見る';

  @override
  String get pcSeen => '既読';

  @override
  String get pcSent => '送信済み';

  @override
  String get pcStartChat => 'チャットを始める';

  @override
  String get pcListSubtitle => '旅程・料金・送迎などをツアー会社に直接質問';

  @override
  String get forumFilterTour => 'ツアーで絞り込み';

  @override
  String get forumTitle => '文化遺産フォーラム';

  @override
  String get forumSubtitle => 'コミュニティと文化体験をシェアしよう';

  @override
  String get forumMyPosts => '自分の投稿';

  @override
  String get forumLoadFailed => 'フォーラムを読み込めませんでした';

  @override
  String get forumNoMatch => '該当する投稿はありません';

  @override
  String get forumNoPosts => '投稿はまだありません';

  @override
  String get forumNoMatchHint => '絞り込みを減らすと、より多くの投稿が表示されます。';

  @override
  String get forumNoPostsHint => '最初に体験をシェアしましょう。';

  @override
  String get forumComposePrompt => 'どんな素敵な体験をしましたか？';

  @override
  String get forumSortNewest => '新着';

  @override
  String get forumSortTop => '人気';

  @override
  String get forumDestinationFallback => '目的地';

  @override
  String forumMaxImages(int max) {
    return '1つの投稿に添付できる写真は最大$max枚です。';
  }

  @override
  String get forumGalleryFailed => 'フォトライブラリを開けませんでした。アクセス権限をご確認ください。';

  @override
  String get forumChooseTour => 'ツアーを選択';

  @override
  String get forumJoinedNote => '参加済み';

  @override
  String get forumErrTitle => '投稿のタイトルを入力してください。';

  @override
  String get forumErrContent => '投稿の本文を入力してください。';

  @override
  String get forumSaving => '投稿を保存しています...';

  @override
  String forumUploadingImage(int index, int total) {
    return '写真をアップロード中 $index/$total...';
  }

  @override
  String get forumDraftSaved => '下書きを保存しました。';

  @override
  String get forumSubmitted => '投稿を送信しました。審査後に表示されます。';

  @override
  String get forumEditPost => '投稿を編集';

  @override
  String get forumNewPost => '新規投稿';

  @override
  String get forumFieldTitle => 'タイトル';

  @override
  String get forumFieldContent => '本文';

  @override
  String get forumFieldTour => '関連ツアー';

  @override
  String get forumTourOptional => 'ツアーを選択（任意）';

  @override
  String get forumTourLocked => '投稿後はツアーを変更できません。';

  @override
  String get forumTourHint => '参加したツアーがリストの上に表示されます。';

  @override
  String forumPhotos(int count, int max) {
    return '写真（$count/$max）';
  }

  @override
  String get forumModerationNote => '投稿はモデレーターの承認後にフォーラムに表示されます。';

  @override
  String get forumSaveChanges => '変更を保存';

  @override
  String get forumSaveDraft => '下書き保存';

  @override
  String get forumSubmitReview => '審査に送信';

  @override
  String get forumAddPhotoHint => 'タップしてライブラリから写真を追加';

  @override
  String get forumReportPost => '投稿を報告';

  @override
  String get forumReportDescription => '詳細（任意）';

  @override
  String get forumSendReport => '報告を送信';

  @override
  String get forumAgree => 'OK';

  @override
  String get forumJoinedTour => 'ツアー参加済み';

  @override
  String forumModeratorFeedback(String note) {
    return 'モデレーターからのフィードバック：$note';
  }

  @override
  String get forumDeselect => '選択解除';

  @override
  String get forumListLoadFailed => 'リストを読み込めませんでした。後ほどお試しください。';

  @override
  String get forumNothingToPick => '選択できる項目はまだありません。';

  @override
  String get forumTabDraft => '下書き';

  @override
  String get forumTabPending => '審査待ち';

  @override
  String get forumTabPublished => '公開済み';

  @override
  String get forumTabRevision => '要修正';

  @override
  String get forumTabRejected => '却下';

  @override
  String get forumWrite => '投稿する';

  @override
  String get forumPostsLoadFailed => '投稿を読み込めませんでした';

  @override
  String get forumMyEmpty => 'まだ投稿がありません';

  @override
  String forumMyEmptyTab(String tab) {
    return '「$tab」に投稿はありません';
  }

  @override
  String get forumMyEmptyHint => '旅の体験をシェアして、みんなで発見を楽しみましょう。';

  @override
  String get forumDeleteComment => 'コメントを削除';

  @override
  String get forumDeleteCommentConfirm => 'このコメントを削除しますか？';

  @override
  String get forumDelete => '削除';

  @override
  String get forumCommentReported => 'コメントを報告しました。コミュニティへのご協力ありがとうございます。';

  @override
  String get forumReportComment => 'コメントを報告';

  @override
  String get forumReportCommentHint => 'スパム、攻撃的な言葉、誤情報など…';

  @override
  String get forumReportSent => '報告を送信しました。コミュニティへのご協力ありがとうございます。';

  @override
  String get forumDeletePost => '投稿を削除';

  @override
  String get forumDeletePostConfirm => '投稿とコメントは完全に削除されます。';

  @override
  String get forumDeletePostShort => '投稿を削除';

  @override
  String get forumSentForReview => '投稿を審査に送信しました。';

  @override
  String get forumPost => '投稿';

  @override
  String get forumOptions => 'オプション';

  @override
  String get forumEdit => '編集';

  @override
  String get forumResubmit => '再審査に送信';

  @override
  String get forumReactionsAfterReview => '審査後に、リアクションとコメントを受け付けます。';

  @override
  String forumComments(int count) {
    return 'コメント（$count）';
  }

  @override
  String get forumNoComments => 'コメントはまだありません。最初のコメントを書きましょう！';

  @override
  String get forumLoading => '読み込み中...';

  @override
  String get forumMoreComments => 'コメントをもっと見る';

  @override
  String get forumCommentHint => 'コメントを書く...';

  @override
  String get forumSendComment => 'コメントを送信';

  @override
  String get forumReasonSpam => 'スパムまたは広告';

  @override
  String get forumReasonInappropriate => '不適切な内容';

  @override
  String get forumReasonHate => 'ヘイトスピーチ';

  @override
  String get forumReasonFalse => '虚偽の情報';

  @override
  String get forumReasonCopyright => '著作権侵害';

  @override
  String get forumStatusHidden => '確認中';

  @override
  String get forumStatusDraft => '下書き';

  @override
  String get forumStatusRevision => '要修正';

  @override
  String get forumAuthorFallback => '旅行者';

  @override
  String get achCatTour => '探索の旅';

  @override
  String get achCatTourShort => '旅';

  @override
  String get achCatTourDesc => '新しい旅と土地を制覇しよう';

  @override
  String get achUnitTour => 'ツアー';

  @override
  String get achCatCheckin => '目的地の足跡';

  @override
  String get achCatCheckinShort => 'チェックイン';

  @override
  String get achCatCheckinDesc => '文化遺産の地点でGPSチェックイン';

  @override
  String get achUnitDestination => '目的地';

  @override
  String get achCatCulture => '文化と知識';

  @override
  String get achCatCultureShort => '文化';

  @override
  String get achCatCultureDesc => '文化遺産のストーリーとクイズを楽しもう';

  @override
  String get achUnitLesson => '件';

  @override
  String get achCatExperience => '体験チャレンジ';

  @override
  String get achCatExperienceShort => '体験';

  @override
  String get achCatExperienceDesc => '各地点で実際のミッションをクリアしよう';

  @override
  String get achUnitMission => 'ミッション';

  @override
  String get achCatStreak => '継続と愛着';

  @override
  String get achCatStreakShort => '継続';

  @override
  String get achCatStreakDesc => 'JourneyGoで情熱の火を灯し続けよう';

  @override
  String get achUnitMilestone => 'マイルストーン';

  @override
  String get achTierBronze => 'ブロンズ';

  @override
  String get achTierSilver => 'シルバー';

  @override
  String get achTierGold => 'ゴールド';

  @override
  String get achTierLegendary => 'レジェンド';

  @override
  String get achUnitDays => '日';

  @override
  String get achTitle => '実績とバッジ';

  @override
  String get achBadgeCollection => 'バッジコレクション';

  @override
  String get achLoadFailed => '実績を読み込めませんでした';

  @override
  String get achFilterUnlocked => '解除済み';

  @override
  String get achFilterClaimable => '受け取り待ち';

  @override
  String get achAchieved => '達成した実績';

  @override
  String get achPoints => '実績ポイント';

  @override
  String achBadgesClaimed(int count) {
    return 'バッジ$count個を獲得';
  }

  @override
  String get achPending => '受け取り待ち';

  @override
  String get achAllClaimed => 'すべて受け取り済み';

  @override
  String get achCompleteToUnlock => '達成すると解除';

  @override
  String achCategoryProgress(int achieved, int total, int pct) {
    return '実績 $achieved/$total・$pct%';
  }

  @override
  String get achNoMatch => 'このカテゴリに条件に合う実績はありません';

  @override
  String get achNoMatchHint => '「すべて」に切り替えるか、別のカテゴリを選んで進捗を確認してください。';

  @override
  String get achSeeAllInCategory => 'このカテゴリをすべて見る';

  @override
  String get achReady => '受け取り可能';

  @override
  String achProgress(String current, String target, String unit) {
    return '進捗：$current/$target $unit';
  }

  @override
  String get achClaiming => '受け取り中...';

  @override
  String get achClaim => '報酬を受け取る';

  @override
  String get achClaimed => '受け取り済み';

  @override
  String get achClaimBarrier => '実績の報酬を受け取る';

  @override
  String get achUnlockedEyebrow => '実績を達成';

  @override
  String achBadgeName(String name) {
    return 'バッジ：$name';
  }

  @override
  String get achRewardEyebrow => '獲得した報酬';

  @override
  String achNewBalance(String balance) {
    return '現在の残高：$balance JP';
  }

  @override
  String get achKeepExploring => 'すばらしい！探索を続けよう';

  @override
  String get bdgLoadFailed => 'バッジを読み込めませんでした';

  @override
  String get bdgEmpty => 'バッジはまだありません';

  @override
  String get bdgEmptyHint => '文化遺産でチェックインして最初のバッジを獲得しましょう。';

  @override
  String bdgCount(int earned, int total) {
    return 'バッジ $earned / $total';
  }

  @override
  String get bdgViewProgress => '進捗を確認して実績の報酬を受け取る';

  @override
  String get bdgLocked => '未解除';

  @override
  String bdgEarnedOn(String date) {
    return '$dateに獲得';
  }

  @override
  String bdgBonus(String points) {
    return 'ボーナス+$pointsポイント';
  }

  @override
  String get mvCopied => 'クーポンコードをコピーしました';

  @override
  String get mvTitle => 'マイクーポン';

  @override
  String mvTabUsable(int count) {
    return '利用可能（$count）';
  }

  @override
  String mvTabUsed(int count) {
    return '使用済み（$count）';
  }

  @override
  String mvTabExpired(int count) {
    return '期限切れ（$count）';
  }

  @override
  String get mvLoadFailed => 'クーポンを読み込めませんでした';

  @override
  String get mvEmptyUsable => 'クーポンはまだありません';

  @override
  String get mvEmptyUsableHint => 'ポイントを使って特典交換でクーポンを手に入れましょう。';

  @override
  String get mvEmptyUsed => '使用したクーポンはまだありません';

  @override
  String get mvEmptyUsedHint => '使用したクーポンはここに表示されます。';

  @override
  String get mvEmptyExpired => '期限切れのクーポンはありません';

  @override
  String get mvEmptyExpiredHint => '有効期限までにクーポンを使いましょう。';

  @override
  String get mvStatusUsable => '利用可能';

  @override
  String get mvStatusUsed => '使用済み';

  @override
  String get mvStatusExpired => '期限切れ';

  @override
  String mvUsedOn(String date) {
    return '$dateに使用';
  }

  @override
  String mvExpiredOn(String date) {
    return '$dateに期限切れ';
  }

  @override
  String mvValidUntil(String date) {
    return '$dateまで有効';
  }

  @override
  String get mvCopyCode => 'コードをコピー';

  @override
  String mvRedeemedFor(String points) {
    return '$pointsポイントで交換';
  }

  @override
  String rwBalanceLeft(String balance) {
    return '残り$balance';
  }

  @override
  String get vsConfirmTitle => 'クーポン交換の確認';

  @override
  String vsConfirmMessage(String points, String title) {
    return '$pointsポイントで「$title」と交換しますか？交換したポイントは返却されません。';
  }

  @override
  String get vsRedeemNow => '今すぐ交換';

  @override
  String get vsSuccessTitle => 'クーポンを交換しました';

  @override
  String get vsSuccessSubtitle => 'コードは「マイクーポン」に保存されました。';

  @override
  String get vsLoadFailed => 'クーポン一覧を読み込めませんでした';

  @override
  String get vsEmpty => '交換できるクーポンはまだありません';

  @override
  String get vsEmptyHint => '新しい特典はここに表示されます。また後でご確認ください。';

  @override
  String get vsYourPoints => 'あなたのポイント';

  @override
  String vsMinOrder(String amount) {
    return '$amount以上のご注文';
  }

  @override
  String vsMaxDiscount(String amount) {
    return '最大$amount割引';
  }

  @override
  String vsValidDays(int days) {
    return '$days日以内に使用';
  }

  @override
  String vsRedeemUntil(String date) {
    return '$dateまで交換可能';
  }

  @override
  String vsPoints(String points) {
    return '${points}pt';
  }

  @override
  String vsNeedMore(String points) {
    return 'あと$pointsポイント必要';
  }

  @override
  String vsRemaining(int count) {
    return '残り$count回';
  }

  @override
  String get vsRedeem => '交換';

  @override
  String get wTitle => 'ポイントウォレット';

  @override
  String get wLoadFailed => 'ポイントウォレットを読み込めませんでした';

  @override
  String get wEmpty => 'ポイント取引はまだありません';

  @override
  String get wEmptyHint => '目的地でチェックインし、ミッションを達成してポイントを貯めましょう。';

  @override
  String get wBalance => '現在の残高';

  @override
  String get wPointsUnit => 'ポイント';

  @override
  String get wRedeem => 'クーポンと交換';

  @override
  String get wMilestoneHint => '旅のマイルストーンを解除してボーナスポイントを獲得';

  @override
  String get wHistory => 'ポイント履歴';

  @override
  String get badgeTypeCheckin => '目的地チェックイン';

  @override
  String get badgeTypeTour => 'ツアー完了';

  @override
  String get badgeTypeTask => 'ミッションマスター';

  @override
  String get badgeTypeStreak => '連続記録';

  @override
  String get badgeTypeEvent => '特別イベント';

  @override
  String get badgeTypeOther => 'バッジ';

  @override
  String get ptxTask => 'ミッション達成';

  @override
  String get ptxExperience => '体験';

  @override
  String get ptxAchievement => '実績報酬';

  @override
  String get ptxAdmin => '管理者による調整';

  @override
  String get ptxVoucherRefund => '期限切れクーポンのポイント返却';

  @override
  String get ptxOther => 'ポイント取引';

  @override
  String get voucherOutOfStock => '交換上限に達しました';

  @override
  String get voucherNotStarted => '交換開始前';

  @override
  String get jsEnded => 'この旅は終了しました。解放した文化のストーリーを見返せます。';

  @override
  String get jsAlreadyCheckedInCurrent =>
      '現在の目的地にはチェックイン済みです。ミッションを達成して次の目的地を解放しましょう。';

  @override
  String get jsQrTitle => 'QRでチェックイン';

  @override
  String jsQrHint(String place) {
    return '$placeのQRコードをスキャン';
  }

  @override
  String jsAlreadyCheckedInAt(String place) {
    return '$placeにはチェックイン済みです。';
  }

  @override
  String get jsHeritageBadge => '文化遺産バッジ';

  @override
  String jsCheckInSuccessAt(String place) {
    return '$placeでチェックインしました。文化コンテンツと体験が解放されました。';
  }

  @override
  String get jsExplore => '探索する';

  @override
  String get jsCheckInSuccess => 'チェックインしました。文化コンテンツと体験が解放されました。';

  @override
  String get jsSkipTitle => 'この目的地をスキップしますか？';

  @override
  String jsSkipMessage(String place) {
    return '$placeのバッジとポイントは獲得できません。旅は次の地点から続きます。';
  }

  @override
  String get jsSkip => 'スキップ';

  @override
  String get jsNoLocation => '位置情報を取得できません';

  @override
  String get jsOpenSettings => '設定を開く';

  @override
  String get jsCompletedJourney => '旅を完了しました';

  @override
  String jsStopDoneTitle(int order) {
    return 'スポット$orderの体験を完了しました';
  }

  @override
  String jsStopDoneBody(String place) {
    return '$placeのチャレンジをすべて完了しました。';
  }

  @override
  String get jsAlreadyCheckedInShort => 'チェックイン済みです';

  @override
  String jsCheckedInAllDone(String place) {
    return '$placeにチェックインし、旅をすべて完了しました。これ以上のチェックインは不要です。';
  }

  @override
  String jsCheckedInContinue(String place) {
    return '$placeにはチェックイン済みです。この目的地のミッションを続けましょう。';
  }

  @override
  String get jsCannotCheckIn => 'まだチェックインできません';

  @override
  String get jsRankPerfect => '完全制覇';

  @override
  String get jsRankPartial => '旅を完走';

  @override
  String get jsRankDone => '旅を完了';

  @override
  String jsCompletedPerfect(String tour, String bonus) {
    return '「$tour」を完全制覇し、ボーナス$bonusポイントを獲得しました。文化遺産を広めてくれてありがとう！';
  }

  @override
  String jsCompletedPartial(String tour) {
    return '「$tour」を完走しました。文化遺産の旅にご参加いただきありがとうございます！';
  }

  @override
  String get jsViewSummary => 'まとめを見る';

  @override
  String get jsEnableLocation => '道案内には位置情報をオンにしてアクセスを許可してください。';

  @override
  String get jsNoRoute => 'この地点へのルートが見つかりませんでした。';

  @override
  String jsNear500(Object place) {
    return '$placeまであと500m以内';
  }

  @override
  String get jsAlmostThere => 'もうすぐ到着、チェックインの準備をしましょう';

  @override
  String jsArrived(String place) {
    return '$placeに到着しました';
  }

  @override
  String get jsRoute => 'ルート';

  @override
  String get jsMap => '地図';

  @override
  String get jsHeritageStamps => '文化遺産スタンプ';

  @override
  String get jsCaptionSkipped => 'スキップ';

  @override
  String get jsCaptionStamped => 'スタンプ済み';

  @override
  String get jsCaptionOpen => '進行中';

  @override
  String jsStopN(int n) {
    return '$nか所目';
  }

  @override
  String jsStampCount(int done, int total) {
    return 'スタンプ $done/$total';
  }

  @override
  String get jsPointsSuffix => ' pt';

  @override
  String jsHeaderDone(int count) {
    return '完了・$countか所';
  }

  @override
  String jsHeaderActive(int count) {
    return '体験中・$countか所';
  }

  @override
  String get jsNoPointsStop => 'この地点はポイント対象外';

  @override
  String jsDoneReview(int points) {
    return '完了・+${points}pt・タップで見返す';
  }

  @override
  String jsUnlockAfter(int n) {
    return '$nか所目の完了後に解放';
  }

  @override
  String jsChallengeCount(int count) {
    return 'チャレンジ$count件';
  }

  @override
  String get jsLocked => '未解放';

  @override
  String get jsSkippedStatus => 'スキップ済み';

  @override
  String get jsAtStop => 'この地点にいます';

  @override
  String jsAtStopSince(String time) {
    return 'この地点にいます・$timeにチェックイン';
  }

  @override
  String jsStopOpenDistance(String distance) {
    return '進行中の地点・あと$distance';
  }

  @override
  String get jsStopOpen => '進行中の地点';

  @override
  String get jsStory => 'ストーリー';

  @override
  String get jsNoChallenges => 'チャレンジなし';

  @override
  String jsChallengeProgress(int done, int total, int points) {
    return 'チャレンジ $done/$total・+${points}pt';
  }

  @override
  String jsQuizQuestions(int count) {
    return '$count問のクイズ';
  }

  @override
  String get jsCultureTitle => '文化コンテンツ';

  @override
  String get jsCultureFallback => 'この地点のストーリー';

  @override
  String get jsRead => '既読';

  @override
  String get jsNew => '新着';

  @override
  String get jsExperienceTitle => '体験';

  @override
  String get jsExperienceFallback => 'この地点のチャレンジ';

  @override
  String get jsCompletedBadge => '完了';

  @override
  String jsCheckInRadiusHint(String radius) {
    return '目的地から半径${radius}m以内でチェックインするか、入口のQRコードをスキャンして、文化コンテンツと体験を解放しましょう。';
  }

  @override
  String get jsCheckInHint => '到着したらチェックインして、文化コンテンツ、体験、文化遺産バッジを解放しましょう。';

  @override
  String get jsDirections => '道案内';

  @override
  String get jsCheckInStop => 'チェックイン';

  @override
  String get ciTitle => 'チェックイン位置の確認';

  @override
  String get ciLocating => '現在地を確認しています…';

  @override
  String ciInside(String meters) {
    return '停留所まで${meters}m — チェックイン範囲内です。';
  }

  @override
  String ciOutside(String meters, String radius) {
    return 'まだ到着していません：${meters}m先です（${radius}m以内が必要）。';
  }

  @override
  String ciAccuracy(String meters) {
    return 'GPS精度 ±${meters}m';
  }

  @override
  String get ciConfirm => 'チェックインする';

  @override
  String get ciRefresh => '位置を再取得';

  @override
  String get ciQrFallback => 'GPSが使えない場合は、停留所のQRコードをスキャンしてチェックインしてください。';

  @override
  String get ciOpenSettings => '設定を開く';

  @override
  String get jsCheckInGps => 'GPSチェックイン';

  @override
  String get jsScanQr => '現地のQRコードをスキャン';

  @override
  String get jsScanQrShort => 'QRスキャン';

  @override
  String get jsSkipStop => 'この地点をスキップ';

  @override
  String jsCompleteAll(int count) {
    return '全$countか所を制覇';
  }

  @override
  String get jsCompleteAllHint =>
      '完走ボーナスと旅のまとめを獲得できます。スキップした地点があると完走ボーナスはもらえません。';

  @override
  String jsSkippedNoBonus(int count) {
    return '$countか所をスキップしたため、完走ボーナスは獲得できませんでした。';
  }

  @override
  String get jsStatPoints => 'ポイント';

  @override
  String get jsStatPerfectChallenges => '満点チャレンジ';

  @override
  String get jsStatStops => '訪れた地点';

  @override
  String get jsEndedLabel => '旅は終了しました';

  @override
  String jsEndedTitle(int points, int done, int total) {
    return '${points}pt・$done/$totalか所';
  }

  @override
  String get jsNextStop => '次の地点';

  @override
  String get jsUnlockedCulture => '解放済み・文化コンテンツ';

  @override
  String get jsReadStory => 'ストーリーを読む';

  @override
  String get jsUnlockedExperience => '解放済み・体験';

  @override
  String jsChallengesWaiting(int count) {
    return '$count件のチャレンジが待っています';
  }

  @override
  String jsDirectionsTo(String place) {
    return '$placeへの道案内';
  }

  @override
  String get jsWholeRoute => 'ルート全体を表示';

  @override
  String get jsWholeTour => 'ツアー全体を表示';

  @override
  String get jsFollowMe => '現在地を追従';

  @override
  String get jsMyLocation => '現在地';

  @override
  String get jsStreetMap => '道路地図';

  @override
  String get jsSatellite => '衛星写真';

  @override
  String get jsStateAtStop => '現在地';

  @override
  String get jsStateOpen => '進行中';

  @override
  String get jsStateSkipped => 'スキップ済み';

  @override
  String get jsStateDone => '完了';

  @override
  String get jsStateLocked => '未解放';

  @override
  String jsChallengesLeft(int count) {
    return '残りチャレンジ$count件';
  }

  @override
  String get jsAllChallengesDone => 'すべてのチャレンジ完了';

  @override
  String jsDistanceAway(String distance) {
    return 'あと$distance';
  }

  @override
  String get jsArriveToCheckIn => '到着したらチェックイン';

  @override
  String get jsNoPointsHere => 'この地点ではポイントなし';

  @override
  String jsStopState(int n, String state) {
    return '$nか所目・$state';
  }

  @override
  String get jsViewStop => '地点を見る';

  @override
  String get jsLoadFailed => '旅を読み込めませんでした。';

  @override
  String jsOpenTile(String title) {
    return '$titleを開く';
  }

  @override
  String jsTileLocked(String title) {
    return '$title、チェックインで解放';
  }

  @override
  String jsCheckInToUnlock(String info) {
    return 'チェックインで解放\n$info';
  }

  @override
  String get tkMapsFailed => '地図アプリを開けませんでした。';

  @override
  String get tkQrMismatchActivity =>
      'このQRコードはこのアクティビティ地点と一致しません。現地のコードをスキャンしてください。';

  @override
  String get tkQrMismatchStop => 'このQRコードはこの地点と一致しません。もう一度お試しください。';

  @override
  String get tkQrConfirmTitle => 'QRをスキャンして完了を確認';

  @override
  String get tkQrStopTitle => '地点のQRをスキャン';

  @override
  String tkQrAtPlace(String place) {
    return '$placeのQRコードをスキャン';
  }

  @override
  String get tkQrNextStop => '次の地点のQRコードをスキャン';

  @override
  String get tkCheckedIn => 'チェックイン完了！';

  @override
  String get tkNoLocation => '現在地を特定できません。GPSをオンにしてもう一度お試しください。';

  @override
  String tkTooFarToCheckIn(String distance, String radius) {
    return '地点まであと$distanceです。半径${radius}m以内に入ってチェックインしてください。';
  }

  @override
  String tkTimeUpTitle(String name) {
    return '時間切れ：$name';
  }

  @override
  String tkTimeUpBody(String place) {
    return '$placeのQRコードをスキャンして質問に答え、ポイントを獲得しましょう。';
  }

  @override
  String get tkTimeUp => '時間切れ！';

  @override
  String tkPlusPoints(int points) {
    return '+${points}pt';
  }

  @override
  String tkLeg(int current, int total) {
    return '行程 $current/$total';
  }

  @override
  String get tkClue => 'ヒント';

  @override
  String get tkGotIt => 'わかった';

  @override
  String get tkLoadFailed => 'ミッションを読み込めませんでした。';

  @override
  String get tkFieldMission => '現地体験';

  @override
  String get tkHeritageQuiz => '文化遺産クイズ';

  @override
  String get tkQuestionsLabel => '問';

  @override
  String get tkBonusLabel => 'ボーナスポイント';

  @override
  String get tkAttemptsLabel => '残り回数';

  @override
  String get tkRules => 'ルール';

  @override
  String get tkRuleAllCorrect => 'すべての質問に正解すると満額のポイントを獲得できます（1回のみ）。';

  @override
  String get tkRuleLocation => '各質問は特定の場所に紐づいています。質問を開くには地点の半径内にいる必要があります。';

  @override
  String get tkRuleRestart => '1問でも間違えると、最初の質問からやり直しになります。';

  @override
  String tkRuleRetry(int max) {
    return '全問正解でなくても、回数が残っていればやり直せます（最大$max回）。';
  }

  @override
  String get tkMissionDone => 'このミッションは完了しました。';

  @override
  String get tkNoAttempts => 'このミッションの挑戦回数がなくなりました。';

  @override
  String get tkDirectionsToStop => '地点への道案内';

  @override
  String get tkRetryMission => 'ミッションに再挑戦';

  @override
  String get tkStartMission => 'ミッション開始';

  @override
  String get tkInProgressTitle => '途中まで回答済み';

  @override
  String tkInProgressSummary(int answered, int total, int correct, int points) {
    return '$answered/$total問回答済み・正解$correct・+$pointsポイント';
  }

  @override
  String tkContinueFromQuestion(int number) {
    return '第$number問から再開';
  }

  @override
  String get tkExitConfirmTitle => 'ミッションを中断しますか？';

  @override
  String get tkExitConfirmBody => '進捗は保存されています。後で続きから再開できます。';

  @override
  String get tkExitActivityBody => 'タイマーは動き続けます。いつでも戻れます。';

  @override
  String get tkStay => '続ける';

  @override
  String get tkExit => '中断する';

  @override
  String get tkEarlierAnswered => '前の問題は前回回答済みです';

  @override
  String tkQuestionsProgress(int answered, int total) {
    return '$answered/$total問';
  }

  @override
  String get tkViewClue => 'ヒントを見る';

  @override
  String get tkStages => '行程';

  @override
  String tkStagesDone(int done, int total) {
    return '$done/$total 完了';
  }

  @override
  String tkUnlockAfterStage(int n) {
    return '行程$nの後に解放';
  }

  @override
  String get tkLocating => '現在地を確認中...';

  @override
  String get tkNoPosition => '現在地が未取得です';

  @override
  String get tkArrivedReady => '地点に到着しました。質問を開けます';

  @override
  String tkDistanceRadius(String distance, String radius) {
    return 'あと$distance・半径${radius}m';
  }

  @override
  String tkStageAt(int n, String place) {
    return '行程$n・$place';
  }

  @override
  String get tkRefreshDistance => '距離を更新';

  @override
  String get tkShowBoth => '現在地と地点を表示';

  @override
  String tkStopOf(int current, int total) {
    return '$current/$totalか所目';
  }

  @override
  String get tkLocatingYou => '現在地を確認中...';

  @override
  String tkTooFarToWalk(String eta) {
    return '徒歩では遠めです$eta。近くまで乗り物で移動してから歩いて地点へ向かいましょう。';
  }

  @override
  String tkWalkRoute(String duration) {
    return '地図のルートに沿って徒歩約$duration';
  }

  @override
  String tkTurnHeading(String turn, String direction) {
    return '$turn・$direction方向';
  }

  @override
  String tkHeadTo(String direction) {
    return '$direction方向へ進む';
  }

  @override
  String get tkArrivedAtStop => '地点に到着しました';

  @override
  String get tkCheckedInPressStart => 'チェックイン済み・「ミッション開始」をタップ';

  @override
  String get tkPressCheckIn => '「チェックイン」をタップして到着を確認';

  @override
  String get tkOpeningQuestion => '質問を開いています...';

  @override
  String get tkQuestionAutoOpen => '質問は自動で開きます';

  @override
  String tkRadius(String radius) {
    return '半径${radius}m';
  }

  @override
  String get tkOpenLocationSettings => '位置情報の設定を開く';

  @override
  String tkStartMissionTimed(String duration) {
    return 'ミッション開始・$duration';
  }

  @override
  String get tkCheckInAtStop => '地点でチェックイン';

  @override
  String get tkNotAtStop => 'まだ地点に到着していません';

  @override
  String tkNotAtStopDistance(String distance) {
    return 'まだ地点に到着していません・あと$distance';
  }

  @override
  String get tkOpenQuestion => '質問を開く';

  @override
  String get tkGoogleMaps => 'Googleマップで道案内';

  @override
  String get tkCheckLocation => '位置を確認';

  @override
  String get tkNextStop => '次の地点';

  @override
  String get tkNextPlace => '次の場所';

  @override
  String get tkFindQr => '地点に設置されたQRコードを見つけてスキャンし、質問を開きましょう。';

  @override
  String get tkStartActivity => 'アクティビティ開始';

  @override
  String get tkActivityDone => 'アクティビティ完了！現地のQRコードをスキャンして質問に答えましょう。';

  @override
  String get tkActivityInProgress => '現地でアクティビティを行いましょう。時間になったらQRコードをスキャンします。';

  @override
  String tkCorrectReward(int points) {
    return '正解で+${points}pt獲得';
  }

  @override
  String get tkScanQrOnSite => '現地のQRコードをスキャン';

  @override
  String get tkSkipCountdownDev => 'カウントダウンをスキップ（開発用）';

  @override
  String get tkNoQuestions => 'このミッションにはまだ質問がありません。';

  @override
  String tkQuestionOf(int current, int total) {
    return '第$current問 / $total';
  }

  @override
  String tkAtPlace(String place) {
    return '場所：$place';
  }

  @override
  String get tkConfirmAnswer => '回答を確定';

  @override
  String get tkSubmit => '提出';

  @override
  String get tkNextQuestion => '次の質問';

  @override
  String get tkAnswerHint => '回答を入力...';

  @override
  String get tkExcellent => 'お見事！';

  @override
  String get tkCompleted => '完了！';

  @override
  String get tkSubmitted => '提出しました';

  @override
  String tkResultScore(int correct, int total, String name) {
    return '「$name」で$total問中$correct問正解しました。';
  }

  @override
  String tkMissionCompleted(String name) {
    return 'ミッション「$name」を完了しました。';
  }

  @override
  String get tkCorrect => '正解！';

  @override
  String tkCorrectSoFar(int current, int total) {
    return '$total問中$current問正解しました。次の場所へ向かって次の質問を開きましょう。';
  }

  @override
  String get tkIncorrect => '不正解';

  @override
  String tkRetryInfo(int correct, int total, int attempts) {
    return '$total問中$correct問正解でした。ポイント獲得には全問正解が必要です。残り$attempts回挑戦できます。';
  }

  @override
  String tkBonusPoints(int points) {
    return 'ボーナス+$pointsポイント';
  }

  @override
  String get tkGoNextPlace => '次の場所へ';

  @override
  String get tkRetry => 'やり直す';

  @override
  String get tkBackToJourney => '旅に戻る';

  @override
  String get navArrived => '到着しました';

  @override
  String get navRerouting => 'ルートを再検索中…';

  @override
  String get navOffRoute => '推奨ルートから外れました';

  @override
  String get navStart => '出発';

  @override
  String navContinueFor(String distance) {
    return '$distance直進';
  }

  @override
  String navTo(String place) {
    return '$placeまで';
  }

  @override
  String get navThen => 'その後';

  @override
  String navArrivedAtStop(String n) {
    return '$nか所目に到着';
  }

  @override
  String navRouteToStop(String n) {
    return '$nか所目へのルート';
  }

  @override
  String get navEnd => '道案内を終了';

  @override
  String get navFinding => 'ルートを検索中…';

  @override
  String get navNoRoute => 'ルートが見つかりません';

  @override
  String navArriveAt(String time) {
    return '$timeに到着';
  }

  @override
  String get navOnTheWay => 'ルート上';

  @override
  String get navCheckInHint => 'チェックインしてこの地点の文化コンテンツと体験を解放しましょう。';

  @override
  String get navSteps => '手順';

  @override
  String navViewSteps(int count) {
    return '道案内の$countステップを見る';
  }

  @override
  String get navOpenGoogleMaps => 'Googleマップを開く（音声案内あり）';

  @override
  String get navDirectionSteps => '道案内の手順';

  @override
  String get navGoStraight => '直進';

  @override
  String get navWalk => '徒歩';

  @override
  String get navBike => '二輪車';

  @override
  String get navCar => '車';

  @override
  String get compassN => '北';

  @override
  String get compassNE => '北東';

  @override
  String get compassE => '東';

  @override
  String get compassSE => '南東';

  @override
  String get compassS => '南';

  @override
  String get compassSW => '南西';

  @override
  String get compassW => '西';

  @override
  String get compassNW => '北西';

  @override
  String get turnStraight => '直進';

  @override
  String get turnBack => '引き返す';

  @override
  String get turnRight => '右折';

  @override
  String get turnLeft => '左折';

  @override
  String get mapCredit => '地図：© Goong';

  @override
  String get sumPerfectTitle => '完全制覇';

  @override
  String get sumPerfectSubtitle => 'すべての目的地を制覇し、すべてのチャレンジに正解しました。';

  @override
  String sumPartialSubtitle(int count) {
    return '$countか所の目的地をスキップしました。次回はすべて訪れて完走ボーナスを獲得しましょう。';
  }

  @override
  String get sumDoneSubtitle => 'すべての目的地を訪れました。満点でないチャレンジもあるので、次の旅で再挑戦しましょう！';

  @override
  String get sumTitle => '旅のまとめ';

  @override
  String get sumPointsEarned => '獲得ポイント';

  @override
  String get sumDestinationsVisited => '訪れた目的地';

  @override
  String get sumPerfectChallenges => '満点チャレンジ';

  @override
  String get sumDuration => '体験時間';

  @override
  String get sumRoute => 'たどったルート';

  @override
  String get sumEachDestination => '目的地ごと';

  @override
  String get sumShare => '成果をシェア';

  @override
  String get sumReview => '旅を見返す';

  @override
  String sumBonus(String bonus, int total) {
    return '完走ボーナス：+${bonus}pt（合計${total}ptに含む）';
  }

  @override
  String get sumNoBonus => 'スキップした目的地があるため、完走ボーナスはありません。';

  @override
  String sumDestinationN(int n, String name) {
    return '$nか所目・$name';
  }

  @override
  String sumDestinationStats(int done, int total, int points) {
    return 'ミッション $done/$total・+${points}pt';
  }

  @override
  String get sumNoAttempts => '回数切れ';

  @override
  String get shareImageFailed => '画像を作成できませんでした';

  @override
  String shareText(String tour, int points, int done, int total) {
    return 'JourneyGoで「$tour」を完了しました：$pointsポイント、文化遺産$done/$totalか所！';
  }

  @override
  String get shareSubject => 'JourneyGoで巡る文化遺産の旅';

  @override
  String get shareFailed => '画像をシェアできませんでした。もう一度お試しください。';

  @override
  String get shareImage => '画像をシェア';

  @override
  String get shareRankPerfect => '完全制覇';

  @override
  String get shareRankPartial => '旅を完走';

  @override
  String get shareRankDone => '旅を完了';

  @override
  String get shareStatPoints => 'ポイント';

  @override
  String get shareStatStops => '地点';

  @override
  String get shareStatChallenges => 'チャレンジ';

  @override
  String shareStamps(int count) {
    return '文化遺産スタンプ・$count個';
  }

  @override
  String get shareFooter => 'JourneyGoでベトナムの文化遺産を探索・journeygo.id.vn';

  @override
  String get seInZone => 'エリア内にいます';

  @override
  String seDistance(String distance) {
    return 'あと$distance';
  }

  @override
  String seStopHeader(String n, String name) {
    return '$nか所目  ·  $name';
  }

  @override
  String get seHeadline => '自分の手で文化遺産を体験';

  @override
  String get seMapHint => '地図上の番号をタップしてアクティビティを開きましょう。円の中に入ると開始できます。';

  @override
  String get seNoChallenges => 'この地点にチャレンジはありません。';

  @override
  String get seAllDone => 'すべてのチャレンジを完了';

  @override
  String get seDone => '完了したチャレンジ';

  @override
  String get seAnyOrder => '順番は自由です。現地体験は現地のQRコードをスキャンして確認します。';

  @override
  String get sePartial => '一部正解';

  @override
  String get seNoAttempts => '回数切れ';

  @override
  String seAttempts(int count) {
    return '$count回挑戦済み';
  }

  @override
  String get seNotStarted => '未挑戦';

  @override
  String get seCulturalQuiz => '文化クイズ';

  @override
  String get seFieldActivity => '現地体験';

  @override
  String get seLocationPuzzle => '位置謎解き';

  @override
  String get seChallenge => 'チャレンジ';

  @override
  String seQuestions(int count) {
    return '$count問';
  }

  @override
  String get seScanQr => '現地でQRをスキャン';

  @override
  String seChallengeHeader(String n, String kind) {
    return 'チャレンジ$n  ·  $kind';
  }

  @override
  String seMaxPoints(int max) {
    return '最大+${max}pt';
  }

  @override
  String seEarnedPoints(int earned, String max) {
    return '+$earned${max}pt';
  }

  @override
  String scStopHeader(String n) {
    return '$nか所目  ·  文化コンテンツ';
  }

  @override
  String get scVideo => '解説動画';

  @override
  String get scImages => '画像';

  @override
  String scImageCount(int count) {
    return '$count枚';
  }

  @override
  String scArtifactCount(int count) {
    return '$count点';
  }

  @override
  String get scNoContent => '提携先はこの地点の文化コンテンツをまだ追加していません。';

  @override
  String scViewImage(int n) {
    return '画像$nを見る';
  }

  @override
  String scArtifactNumber(String n) {
    return '展示品 No.$n';
  }

  @override
  String get scHasVideo => '動画あり';

  @override
  String get scToExperience => '体験へ進む';

  @override
  String get scBackToRoute => 'ルートに戻る';

  @override
  String get qrTitle => 'QRコードをスキャン';

  @override
  String get qrHint => '目的地のQRコードを枠内に合わせてください';

  @override
  String get qrNoPermission => 'カメラの権限がありません。設定で許可するか、下でコードを手入力してください。';

  @override
  String get qrCameraFailed => 'カメラを開けませんでした。下でコードを手入力できます。';

  @override
  String get qrSlowCamera => 'カメラの起動が遅い場合は、QRの下に印字されたコードを入力できます。';

  @override
  String get qrScanned => 'スキャン済み';

  @override
  String get qrTorchOff => 'ライトを消す';

  @override
  String get qrTorchOn => 'ライト';

  @override
  String get qrEnterCode => 'コードを入力';

  @override
  String get qrEnterPrintedCode => 'QRの下に印字されたコードを入力';

  @override
  String get qrCodeHelper => '目的地コードはJGS-、アクティビティコードはJGE-で始まります';

  @override
  String get qrConfirmCode => 'コードを確認';

  @override
  String hpStopLabel(String n) {
    return '$nか所目';
  }

  @override
  String hpStampSemantics(String label, String name) {
    return 'スタンプ $label、$name';
  }

  @override
  String hpStampCount(int stamped, int total) {
    return 'スタンプ $stamped/$total';
  }

  @override
  String get hpNoStops => 'この旅にはまだ地点がありません。';

  @override
  String get hpHint => '各地点でチェックイン（GPSまたは入口のQRコード）すると、スタンプがもらえます。';

  @override
  String get hpStamped => 'スタンプ済み';

  @override
  String get hpStampedTitle => 'スタンプを獲得！';

  @override
  String get hpUnlocked => '文化コンテンツと体験が解放されました';

  @override
  String get hcCold => '冷たい・まだ遠い';

  @override
  String get hcCool => '涼しい・近づいている';

  @override
  String get hcWarm => '暖かい・とても近い';

  @override
  String get hcHot => '熱い！すぐ近く';

  @override
  String get hcArrived => 'チェックポイントに到着';

  @override
  String get rwAwesome => 'すばらしい';

  @override
  String get rwBadgeUnlockBarrier => 'バッジ解除';

  @override
  String get rwNewBadge => '新しいバッジを解除';

  @override
  String cmActivity(String n, String name) {
    return 'アクティビティ$n：$name';
  }

  @override
  String get cmShowAll => 'すべて表示';

  @override
  String get cmLegendZone => ' 目的地エリア   ';

  @override
  String get cmLegendActivity => ' アクティビティ';

  @override
  String get jlNoActiveJourney => '進行中の旅はありません。ツアーを予約して「体験を始める」をタップしてください。';

  @override
  String get jsvcCheckInInvalid => 'サーバーから無効なチェックイン結果が返されました。';

  @override
  String get jsvcCheckpointInvalid => 'サーバーから無効なチェックポイント地図が返されました。';

  @override
  String get jsvcCultureInvalid => 'サーバーから無効な文化コンテンツが返されました。';

  @override
  String get jsvcTaskInvalid => 'サーバーから無効なミッション内容が返されました。';

  @override
  String get jsvcClueFailed => 'ヒントを取得できませんでした。';

  @override
  String get jsvcSubmitInvalid => 'サーバーから無効な提出結果が返されました。';

  @override
  String get jsvcJourneyInvalid => 'サーバーから無効な旅のデータが返されました。';

  @override
  String get tjTask => 'ミッション';

  @override
  String get tjDestination => '目的地';

  @override
  String get tjJourney => '旅';

  @override
  String get tjActivity => 'アクティビティ';

  @override
  String get progCheckedIn => 'チェックイン済み';

  @override
  String get locGpsOff => 'GPSがオフです。位置情報をオンにして現在地を確認してください。';

  @override
  String get locPermissionNeeded => '目的地でチェックインするには位置情報へのアクセスを許可してください。';

  @override
  String get locPermissionBlocked => '位置情報の権限がブロックされています。アプリの設定で再度許可してください。';

  @override
  String get locUnknown => '現在地を特定できません。開けた場所に移動してもう一度お試しください。';

  @override
  String destLoadFailed(String id) {
    return '目的地 #$id を読み込めませんでした。接続を確認してもう一度お試しください。';
  }

  @override
  String get ccAudio => '音声ガイド';

  @override
  String get ccVideo => '資料動画';

  @override
  String get ccStory => '伝説';

  @override
  String get ccImage => '画像';

  @override
  String get cc3d => '3Dモデル／VR';

  @override
  String get ccArticle => '文化遺産の記事';

  @override
  String get ccNone => 'この目的地には承認済みの文化ストーリーがまだありません。';

  @override
  String ccUnlockOnCheckIn(int count) {
    return '目的地でチェックインすると$count件のコンテンツを解放';
  }

  @override
  String get ccAudioFailed => '音声ガイドを開けませんでした。';

  @override
  String get ccListen => '音声ガイドを聴く';

  @override
  String get ccHasAudio => '音声ガイドあり';

  @override
  String ccSeeAll(int count) {
    return '文化コンテンツ$count件をすべて見る';
  }

  @override
  String ccLockedCount(int count) {
    return '文化コンテンツ$count件・チェックインで解放';
  }

  @override
  String get ccMediaFailed => 'メディアコンテンツを開けませんでした。';

  @override
  String get ccWatchVideo => '動画を見る';

  @override
  String get ccOpen => 'コンテンツを開く';

  @override
  String ccGallery(int count) {
    return '画像（$count）';
  }

  @override
  String get ccOpenFailed => 'コンテンツを開けませんでした。';

  @override
  String get expFallbackTitle => '文化遺産体験';

  @override
  String get payLauncherExpired => '支払い期限が切れました。';

  @override
  String get payAwaitingConfirmation => '支払いの確認を待っています...';

  @override
  String get payInvalidData => 'サーバーから無効な支払いデータが返されました。';

  @override
  String get paySyncCancelled => '支払いをキャンセルしました。';

  @override
  String get paySyncAlreadyProcessed => 'この取引はすでに処理されています。';

  @override
  String get tourNotFound => 'ツアーが見つかりません。';

  @override
  String get videoPlayIntro => '紹介動画を再生';

  @override
  String get videoCannotPlay => 'この動画はアプリ内で再生できません';

  @override
  String get videoOpenExternal => '別のアプリで開く';

  @override
  String photoViewOf(int index, int total) {
    return '写真 $index/$total を見る';
  }

  @override
  String photoCredit(String credit) {
    return '写真：$credit';
  }

  @override
  String photoSource(String credit) {
    return '写真の出典：$credit';
  }

  @override
  String get navCheckInNow => '今すぐチェックイン';

  @override
  String get rfTier7DaysPlus => '7日前以上';

  @override
  String get rfTier3To6Days => '3〜6日前（72時間〜6日前）';

  @override
  String get rfTierUnder72Hours => '72時間（3日）未満';

  @override
  String rfRefundRate(String rate) {
    return '$rate返金';
  }

  @override
  String get homeAiGuideTitle => 'AIバーチャルガイド';

  @override
  String get homeAiGuideSubtitle => '文化・歴史のQ&Aやスマートなミッションヒント';

  @override
  String get aiAskButton => 'AIに質問';

  @override
  String get aiHintButton => 'AIヒント';

  @override
  String get aiSuggestHint1 => '観察のポイントを教えてください';

  @override
  String get aiSuggestHint2 => '周りのどんな細部に注目すべきですか？';

  @override
  String get aiSuggestHint3 => '小さなヒントをいただけますか？';

  @override
  String aiSuggestDestHistory(String name) {
    return '$nameの歴史について教えてください';
  }

  @override
  String get aiSuggestHeritage => '文化遺産の主な見どころを紹介してください';

  @override
  String get aiSuggestArchitecture => 'ここの建築にはどんな特徴がありますか？';

  @override
  String get aiSuggestVisitTips => 'ここを見学する際の注意点はありますか？';

  @override
  String get aiErrInit => 'AIチャットセッションを開始できませんでした。';

  @override
  String get aiErrRequestHuman => '管理者・モデレーターへのチャット依頼を送信できませんでした。';

  @override
  String get aiErrReturnAi => 'AIガイドへ戻すことができませんでした。';

  @override
  String get aiErrSend => 'AIガイドに接続できませんでした。もう一度お試しください。';

  @override
  String get aiEndHumanTitle => '有人サポートを終了しますか？';

  @override
  String get aiCancelWaitTitle => 'サポート依頼をキャンセルしますか？';

  @override
  String get aiEndHumanBody => 'サポートスタッフとのチャットを終了し、AIガイドに戻ってもよろしいですか？';

  @override
  String get aiCancelWaitBody =>
      '現在スタッフの対応待ちです。AIに戻るとこのサポート依頼はキャンセルされます。よろしいですか？';

  @override
  String get aiKeepChatting => 'チャットを続ける';

  @override
  String get aiKeepWaiting => 'このまま待つ';

  @override
  String get aiEndAndReturnAi => '終了してAIに戻る';

  @override
  String get aiCancelAndReturnAi => 'キャンセルしてAIに戻る';

  @override
  String get aiSenderName => 'AIガイド';

  @override
  String get aiHeaderHintTitle => 'AIヒントアシスタント';

  @override
  String get aiHeaderGuideTitle => 'AIガイド';

  @override
  String get aiHistoryTooltip => 'チャット履歴';

  @override
  String get aiNewChatTooltip => '新しいチャット';

  @override
  String aiChattingWithStaff(String role, String name) {
    return '$roleとチャット中：$name';
  }

  @override
  String aiChattingWithRole(String role) {
    return '$roleとチャット中';
  }

  @override
  String get aiHumanSubtitle => 'スタッフが直接サポートしています';

  @override
  String get aiWaitingTitle => '管理者・モデレーターの対応待ち';

  @override
  String get aiWaitingSubtitle => 'お待ちの間もメッセージを送信できます';

  @override
  String get aiDefaultTaskName => '体験ミッション';

  @override
  String get aiDefaultDestName => '文化遺産Q&A・サポート';

  @override
  String get aiHintBannerSubtitle => 'スマートヒントモード · 答えは明かしません';

  @override
  String get aiGuideBannerSubtitle => '検証済みデータに基づくバーチャルガイド';

  @override
  String get aiReturnToAiBtn => 'AIに戻る';

  @override
  String get aiChatHumanBtn => 'スタッフに相談';

  @override
  String get aiEmptyHintTitle => 'チャレンジのヒントが必要ですか？';

  @override
  String get aiEmptyGuideTitle => 'こんにちは！何かお手伝いできますか？';

  @override
  String get aiEmptyHintBody => '現場での観察ヒントをお尋ねください。ご自身で答えを見つけられるようご案内します！';

  @override
  String get aiEmptyGuideBody => '歴史や文化の物語、建築、このスポットの散策のコツなどを質問してみてください。';

  @override
  String get aiHumanBadge => 'スタッフ';

  @override
  String get aiSendingMessage => 'メッセージを送信中...';

  @override
  String get aiThinking => 'AIが考えています...';

  @override
  String get aiInputHintHuman => '管理者・モデレーターへ直接メッセージ...';

  @override
  String get aiInputHintTask => 'ミッションのヒントを聞く...';

  @override
  String get aiInputHintGuide => '歴史や建築について質問する...';

  @override
  String get aiHistoryTitle => 'AIチャット履歴';

  @override
  String get aiHistoryEmpty => 'まだチャット履歴がありません。';

  @override
  String aiDestinationFallback(int id) {
    return 'スポット #$id';
  }

  @override
  String get aiGeneralQa => '一般Q&A';

  @override
  String get aiStatusWaiting => 'スタッフ対応待ち';

  @override
  String get aiStatusLive => '有人チャット';

  @override
  String aiSessionSubtitle(String status, int count) {
    return '$status · $count件のメッセージ';
  }

  @override
  String aiViewTour(int id) {
    return 'ツアー #$id を見る';
  }

  @override
  String tripsAtStop(int current, int total) {
    return 'スポット $current/$total に滞在中';
  }

  @override
  String tripsUnfinishedRemaining(String date, int count) {
    return '$dateに開始 · あと$countか所で完走です。';
  }

  @override
  String seFailedLeft(int count) {
    return '未達成 · 残り$count回';
  }

  @override
  String get seDirections => 'ルート案内';

  @override
  String seFarFromActivity(String distance) {
    return '最寄りのアクティビティまで$distance';
  }

  @override
  String get tkReviewTitle => '答えの振り返り';

  @override
  String tkReviewCorrectAnswer(String answer) {
    return '正解: $answer';
  }

  @override
  String tkReviewYourAnswer(String answer) {
    return 'あなたの答え: $answer';
  }

  @override
  String get tkReviewNoAnswer => '(未回答)';

  @override
  String get tkReviewWhy => '解説';

  @override
  String jsGoalRemaining(int count) {
    return 'あと$countか所で完走ボーナスと旅のまとめがもらえます';
  }

  @override
  String get jsGoalLost => 'スキップした地点があるため完走ボーナスは対象外です。引き続きポイントを集めましょう。';

  @override
  String get tkOrderingHint => '長押ししてドラッグし、上から正しい順に並べ替えてください';

  @override
  String get tkNumberHint => 'スライダーをドラッグするか − / + で選んでください';

  @override
  String get tkNumberNotChosen => '未選択';

  @override
  String get tkSeeResult => '結果を見る';

  @override
  String get tkAnswer => '回答する';

  @override
  String get tkUnsupportedQuestion => '新しい形式の問題です。回答するにはアプリを更新してください。';

  @override
  String tkNumberOff(int diff) {
    return '$diffのずれ';
  }

  @override
  String tkImageOption(String letter) {
    return '画像$letter';
  }

  @override
  String get tkRevealCorrect => '正解！';

  @override
  String get tkRevealWrong => '残念';

  @override
  String get tkCorrectOrder => '正しい順番';

  @override
  String get scStory => 'ストーリーで見る';

  @override
  String get scStoryEndTitle => '挑戦の準備はいい？';

  @override
  String get scStoryEndBody => 'このスポットのストーリーを見終わりました。腕試しの時間です！';

  @override
  String get scReadAll => '全文を読む';

  @override
  String get scStoryArtifact => '展示品';

  @override
  String get scStoryClose => 'ストーリーを閉じる';

  @override
  String get scThenNowTitle => '昔と今';

  @override
  String get scThenNowNow => '今';

  @override
  String get scThenNowThen => '昔';

  @override
  String get scThenNowHint => '線をドラッグして比較';

  @override
  String scThenNowCredit(String credit) {
    return '資料写真: $credit';
  }

  @override
  String get tkMatchingHint => 'A列の項目をタップし、対応するB列の項目をタップして結びます。全問正解でポイント獲得。';

  @override
  String get tkMatchingColA => 'A列';

  @override
  String get tkMatchingColB => 'B列';

  @override
  String get tkMatchingTapZoom => '画像をタップして拡大';

  @override
  String get tkMatchingCorrectPairs => '正しい組み合わせ';

  @override
  String get tkMatchingClear => '解除';
}
