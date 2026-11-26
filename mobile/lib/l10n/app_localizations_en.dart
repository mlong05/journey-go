// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for English (`en`).
class AppLocalizationsEn extends AppLocalizations {
  AppLocalizationsEn([String locale = 'en']) : super(locale);

  @override
  String get appTitle => 'Journey Go - Vietnam Cultural Travel';

  @override
  String get reloginSuccess =>
      'Signed in again. You can continue where you left off.';

  @override
  String get commonClose => 'Close';

  @override
  String get commonCancel => 'Cancel';

  @override
  String get commonRefresh => 'Refresh';

  @override
  String get languageTitle => 'Language';

  @override
  String get languageSubtitle => 'The app is displayed in English';

  @override
  String get languageSheetTitle => 'Choose language';

  @override
  String get languageSheetNote =>
      'Some screens, tour content and forum posts may still appear in Vietnamese.';

  @override
  String languageConfirmTitle(String language) {
    return 'Switch language to $language?';
  }

  @override
  String get languageConfirmMessage =>
      'The app will reload to apply the new language across all screens.';

  @override
  String get languageConfirmAction => 'Confirm & reload';

  @override
  String get tourRequestsTitle => 'Custom Tour Requests';

  @override
  String get tourRequestsSubtitle =>
      'Request & book a tailor-made tour just for you';

  @override
  String get tourRequestsMyTitle => 'My Custom Tour Requests';

  @override
  String get tourRequestsNewButton => 'New request';

  @override
  String get profileHeader => 'Traveler profile';

  @override
  String get profileNotifications => 'Notifications';

  @override
  String get profileEdit => 'Edit profile';

  @override
  String profileMemberSince(String date) {
    return 'Since $date';
  }

  @override
  String get profileTopRank => 'You\'ve reached the highest tier';

  @override
  String profilePointsToNextRank(String points, String rank) {
    return '$points points to $rank';
  }

  @override
  String get profileStatPoints => 'Available points';

  @override
  String get profileStatBadges => 'Badges';

  @override
  String get profileStatPlaces => 'Places visited';

  @override
  String get rankBronze => 'Bronze';

  @override
  String get rankSilver => 'Silver';

  @override
  String get rankGold => 'Gold';

  @override
  String get rankPlatinum => 'Platinum';

  @override
  String get heritageTitle => 'Heritage journey';

  @override
  String get heritageSubtitle => 'The cultural marks you\'ve collected';

  @override
  String get achievementsTitle => 'Achievements & Rewards';

  @override
  String achievementsAchieved(int count) {
    return '$count achieved';
  }

  @override
  String achievementsUnclaimed(int count) {
    return '$count to claim';
  }

  @override
  String get journeyLogTitle => 'Journey log';

  @override
  String journeyPlacesVisited(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count places visited',
      one: '1 place visited',
    );
    return '$_temp0';
  }

  @override
  String journeyLogSubtitle(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count heritage sites checked in',
      one: '1 heritage site checked in',
    );
    return '$_temp0';
  }

  @override
  String get journeyEmpty =>
      'No places yet. Check in at a stop on your journey to record your first mark.';

  @override
  String get pointsHistoryTitle => 'Points history';

  @override
  String get pointsHistorySubtitle => 'Recent point transactions';

  @override
  String get pointsNoTransactions => 'No transactions yet';

  @override
  String pointsLatestGain(String points) {
    return 'Latest +$points';
  }

  @override
  String get pointsEarned => 'Earned';

  @override
  String get pointsSpent => 'Spent';

  @override
  String get pointsAvailable => 'Available';

  @override
  String get pointsEmpty =>
      'No point transactions yet. Check in at destinations and complete missions to start earning points.';

  @override
  String get pointsOpenWallet => 'Open wallet & redeem vouchers';

  @override
  String get badgesTitle => 'Heritage badges';

  @override
  String badgesUnlocked(int count) {
    return '$count unlocked';
  }

  @override
  String get voucherTitle => 'Vouchers';

  @override
  String voucherAvailablePoints(String points) {
    return '$points points available';
  }

  @override
  String get servicesTitle => 'Tickets & support';

  @override
  String get myBookingsTitle => 'My tour bookings';

  @override
  String get myBookingsSubtitle =>
      'Track bookings, payments & experience QR codes';

  @override
  String get providerSupportTitle => 'Tour provider support';

  @override
  String get providerSupportSubtitle =>
      'Chat history with tour providers (messages before booking)';

  @override
  String get supportTitle => 'Support & complaints';

  @override
  String get supportSubtitle => 'Refunds and ticket issues';

  @override
  String refundsInProgress(int count) {
    return '$count in progress';
  }

  @override
  String get settingsTitle => 'Settings';

  @override
  String get personalInfoTitle => 'Personal information';

  @override
  String get personalInfoSubtitle => 'Full name, email, phone number';

  @override
  String get changePasswordTitle => 'Change password';

  @override
  String get changePasswordSubtitle => 'Keep your account secure';

  @override
  String hotlineTitle(String number) {
    return 'Hotline $number';
  }

  @override
  String get hotlineSubtitle => 'Tap to call traveler support';

  @override
  String get hotlineCannotOpen =>
      'Couldn\'t open the phone dialer on this device.';

  @override
  String get logoutTitle => 'Sign out';

  @override
  String get logoutSubtitle => 'Sign out of this device';

  @override
  String get logoutConfirmTitle => 'Confirm sign out';

  @override
  String get logoutConfirmMessage =>
      'Your current session will be safely ended on the server and all tokens on this device will be removed.';

  @override
  String get logoutConfirmButton => 'Sign out now';

  @override
  String get commonNotifications => 'Notifications';

  @override
  String get commonSeeAll => 'See all';

  @override
  String get commonRetry => 'Try again';

  @override
  String get navHome => 'Home';

  @override
  String get navTrips => 'Trips';

  @override
  String get navCheckIn => 'Check-in';

  @override
  String get navForum => 'Forum';

  @override
  String get navAccount => 'Account';

  @override
  String get navCheckInSemantics => 'Check in at destination';

  @override
  String homeGreeting(String name) {
    return 'Hi, $name 👋';
  }

  @override
  String get homeGreetingNoName => 'Hi there 👋';

  @override
  String get homeHeadline => 'Travel to understand,\nnot just to see';

  @override
  String get homeSearchHint => 'Where do you want to go?';

  @override
  String get homeSearchSemantics => 'Search tours, destinations, themes';

  @override
  String homePoints(String points) {
    return '$points pts';
  }

  @override
  String get heroPlaceMuCangChai => 'Mu Cang Chai rice terraces';

  @override
  String get heroPlaceHoiAn => 'Japanese Covered Bridge, Hoi An Ancient Town';

  @override
  String get heroPlaceMuiNe => 'Mui Ne fishing village';

  @override
  String get homeCatDayTrip => 'Day trips';

  @override
  String get homeCatMultiDay => 'Multi-day';

  @override
  String get homeCatByDate => 'By date';

  @override
  String get homeCatDeals => 'Deals';

  @override
  String get homeFeatured => 'Featured tours';

  @override
  String get homeAllTours => 'All tours';

  @override
  String get homeUpcoming => 'Upcoming departures';

  @override
  String get homeThemes => 'Explore by theme';

  @override
  String get homeAllThemes => 'All themes';

  @override
  String get homeMoreThemes => 'themes';

  @override
  String get homeRegions => 'Destinations by region';

  @override
  String get homeAllRegions => 'All regions';

  @override
  String get homeMoreRegions => 'regions';

  @override
  String homeRegionTourCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count tours',
      one: '1 tour',
    );
    return '$_temp0';
  }

  @override
  String get homeDayTours => 'Day tours';

  @override
  String get homeMultiDayTours => 'Multi-day tours';

  @override
  String homeSeeAllCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: 'See all $count tours',
      one: 'See 1 tour',
    );
    return '$_temp0';
  }

  @override
  String get homeSeeAllTours => 'See all tours';

  @override
  String get homeNoToursTitle => 'No tours on sale yet';

  @override
  String get homeNoToursMessage =>
      'New tours will appear here as soon as they\'re approved.';

  @override
  String get homeAllOwnedTitle => 'You\'ve booked every available tour';

  @override
  String get homeAllOwnedMessage =>
      'Go to \"Trips\" to enjoy the tours you\'ve booked.';

  @override
  String get homeAllOwnedAction => 'View my trips';

  @override
  String get homeToursErrorTitle => 'Couldn\'t load tours';

  @override
  String homeJourneyOngoing(int position, int total) {
    return 'In progress · Stop $position/$total';
  }

  @override
  String get homeJourneyAtStop => 'You\'re at';

  @override
  String get homeJourneyNextStop => 'Next stop';

  @override
  String get homeJourneyAllDone => 'All stops completed';

  @override
  String homeJourneyCheckedIn(String name) {
    return '$name · checked in';
  }

  @override
  String homeJourneyDistance(String name, String distance) {
    return '$name · $distance away';
  }

  @override
  String get homeJourneyContinue => 'Continue';

  @override
  String homeJourneyMissions(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count pending missions: ',
      one: '1 pending mission: ',
    );
    return '$_temp0';
  }

  @override
  String get tourPriceFree => 'Free';

  @override
  String get tourPriceFromPrefix => 'From ';

  @override
  String get tourPriceFromSuffix => '';

  @override
  String tourStopCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count stops',
      one: '1 stop',
    );
    return '$_temp0';
  }

  @override
  String durationMinutes(int minutes) {
    return '$minutes min';
  }

  @override
  String durationHours(int hours) {
    String _temp0 = intl.Intl.pluralLogic(
      hours,
      locale: localeName,
      other: '$hours hours',
      one: '1 hour',
    );
    return '$_temp0';
  }

  @override
  String durationHoursMinutes(int hours, int minutes) {
    return '$hours h $minutes min';
  }

  @override
  String durationDaysNights(int days, int nights) {
    return '${days}D${nights}N';
  }

  @override
  String durationDays(int days) {
    String _temp0 = intl.Intl.pluralLogic(
      days,
      locale: localeName,
      other: '$days days',
      one: '1 day',
    );
    return '$_temp0';
  }

  @override
  String get durationDayTrip => 'Day trip';

  @override
  String get commonShowMore => 'Show more';

  @override
  String get commonShowLess => 'Show less';

  @override
  String priceVnd(String amount) {
    return '$amount VND';
  }

  @override
  String tourPriceFrom(String price) {
    return 'From $price';
  }

  @override
  String tourDepartsOn(String date) {
    return 'Departs $date';
  }

  @override
  String rewardPlusPoints(String points) {
    return '+$points pts';
  }

  @override
  String rewardMaxPoints(String points) {
    return 'up to $points pts';
  }

  @override
  String tourTaskCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count missions',
      one: '1 mission',
    );
    return '$_temp0';
  }

  @override
  String tourBadgeCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count badges',
      one: '1 badge',
    );
    return '$_temp0';
  }

  @override
  String tourDestinationStops(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count stops',
      one: '1 stop',
    );
    return '$_temp0';
  }

  @override
  String tourCheckpointCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count checkpoints',
      one: '1 checkpoint',
    );
    return '$_temp0';
  }

  @override
  String get tourOwnedBadge => 'Ticket owned';

  @override
  String get tourLoadFailed =>
      'Couldn\'t load tour information. Please try again.';

  @override
  String get tourTypeCultural => 'Culture';

  @override
  String get tourTypeAdventure => 'Adventure';

  @override
  String get tourTypeBeach => 'Beach';

  @override
  String get tourTypeMountain => 'Mountain';

  @override
  String get tourTypeCity => 'City';

  @override
  String get tourTypeEco => 'Eco-tourism';

  @override
  String get tourTypeHistorical => 'History';

  @override
  String get tourTypeGastronomy => 'Food';

  @override
  String get tourTypeOther => 'Other';

  @override
  String get guestAdult => 'Adult';

  @override
  String get guestChild => 'Child';

  @override
  String get guestToddler => 'Toddler';

  @override
  String get guestInfant => 'Infant';

  @override
  String durationSeconds(int seconds) {
    return '$seconds sec';
  }

  @override
  String durationMinutesSeconds(int minutes, int seconds) {
    return '$minutes min $seconds sec';
  }

  @override
  String get durationFlexible => 'Flexible';

  @override
  String get departureTime => 'Departure time';

  @override
  String get departureMeetingPoint => 'Meeting point';

  @override
  String get departurePickup => 'Pickup time & location';

  @override
  String progressInProgress(int done, int total) {
    return 'In progress · $done/$total stops';
  }

  @override
  String get progressCompleted => 'Completed';

  @override
  String progressCompletedOn(String date) {
    return 'Completed · $date';
  }

  @override
  String get listSearchHint => 'Search tours, regions, themes...';

  @override
  String get listFilter => 'Filters';

  @override
  String get listAll => 'All';

  @override
  String get listEmptyTitle => 'No matching tours';

  @override
  String get listAllOwned =>
      'You\'ve booked every tour shown here. Check \"Trips\" to start your experience.';

  @override
  String get listEmptyHint =>
      'Try removing some filters or searching with different keywords.';

  @override
  String get listSort => 'Sort by';

  @override
  String get listSortNewest => 'Newest';

  @override
  String get listSortPriceAsc => 'Price: low to high';

  @override
  String get listSortPriceDesc => 'Price: high to low';

  @override
  String get listSortDeparture => 'Earliest departure';

  @override
  String get listGroupFormat => 'Tour type';

  @override
  String get listGroupRegion => 'Region';

  @override
  String get listGroupTheme => 'Theme';

  @override
  String get listReset => 'Reset';

  @override
  String get listApply => 'Apply';

  @override
  String get tdTitle => 'Tour details';

  @override
  String get tdCancelledOldBooking =>
      'Previous booking cancelled. Tap \"Book\" to book again.';

  @override
  String get tdNoProvider => 'This tour doesn\'t have a provider contact yet.';

  @override
  String get tdLoginToChat => 'Please sign in to message the tour provider.';

  @override
  String get tdDatesLoading =>
      'Loading available dates, please try again shortly.';

  @override
  String get tdNoDates =>
      'There are no dates with available spots for this tour right now. Please check back later.';

  @override
  String get tdPickDateTitle => 'Choose your date';

  @override
  String get tdPickDateHint =>
      'Numbers show remaining spots — only dates with spots can be selected';

  @override
  String get tdNoDateSelected => 'No date selected';

  @override
  String tdDateSelected(String date) {
    return 'Selected: $date';
  }

  @override
  String get tdConfirmDate => 'Confirm date';

  @override
  String get tdRouteMap => 'Route map';

  @override
  String get tdLegs => 'Journey stages';

  @override
  String get tdNoDestinations => 'This tour has no destinations yet.';

  @override
  String get tdLoadFailed => 'Couldn\'t load tour details.';

  @override
  String tdDestinationCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count destinations',
      one: '1 destination',
    );
    return '$_temp0';
  }

  @override
  String get tdVerified => 'Verified tour';

  @override
  String get tdFinalLeg => 'Final stage';

  @override
  String tdLeg(int n) {
    return 'Stage $n';
  }

  @override
  String get tdCheckInBadgeHint =>
      'Check in here to unlock this destination\'s badge';

  @override
  String get tdExperiencesError =>
      'Couldn\'t load experiences for this stop. Pull down to retry.';

  @override
  String get tdNoExperiences =>
      'No experiences have been published for this destination yet.';

  @override
  String get tdOwned => 'You\'ve booked this tour';

  @override
  String tdDaysUntilStart(int days) {
    String _temp0 = intl.Intl.pluralLogic(
      days,
      locale: localeName,
      other: '$days days until your trip!',
      one: '1 day until your trip!',
      zero: 'Your trip starts today!',
    );
    return '$_temp0';
  }

  @override
  String tdExperienceDate(String date) {
    return 'Experience date: $date';
  }

  @override
  String get tdStartExperience => 'Start experience';

  @override
  String get tdExperienceExpired => 'Experience date has passed';

  @override
  String tdExperienceWindow(String dates) {
    return 'Tour dates: $dates';
  }

  @override
  String get tdContinueJourney => 'Continue journey';

  @override
  String get tdPriceFromAdult => 'From (adult)';

  @override
  String get tdTotalPayment => 'Total';

  @override
  String get tdPerGuest => ' /guest';

  @override
  String get tdHolding => 'Holding your spot...';

  @override
  String get tdContinuePayment => 'Continue payment';

  @override
  String get tdBookAgain => 'Book again';

  @override
  String get tdBookNow => 'Book now';

  @override
  String get tdRefundProcessingTitle => 'Refund in progress';

  @override
  String get tdRefundDoneTitle => 'Refund processed';

  @override
  String get tdRefundProcessingMessage => 'This booking is being refunded.';

  @override
  String get tdRefundDoneMessage => 'This booking has been fully processed.';

  @override
  String get tdBookingCancelledTitle => 'Booking cancelled';

  @override
  String get tdBookingExpiredTitle => 'Booking expired';

  @override
  String get tdBookingCancelledMessage =>
      'Your spot has been released — you can no longer join this tour.';

  @override
  String get tdBookingExpiredMessage =>
      'The payment window has passed — your spot has been released.';

  @override
  String tdChatWithProvider(String name) {
    return 'Chat with $name';
  }

  @override
  String tdProvidedBy(String name) {
    return 'Provided by $name · verified';
  }

  @override
  String get tdTabIntro => 'Overview';

  @override
  String get tdTabItinerary => 'Itinerary';

  @override
  String get tdTabStops => 'Stops';

  @override
  String get tdTabPrices => 'Prices & dates';

  @override
  String get tdTabNotes => 'Good to know';

  @override
  String get tdHighlights => 'Highlights';

  @override
  String get tdPhotos => 'Photos';

  @override
  String get tdItineraryDetail => 'Detailed itinerary';

  @override
  String tdStopsTitle(int count) {
    return 'Stops ($count)';
  }

  @override
  String get tdPriceTable => 'Prices';

  @override
  String tdMaxGuests(int count) {
    return 'Up to $count guests per departure';
  }

  @override
  String get tdDepartures => 'Departures';

  @override
  String get tdDepartureInfo => 'Departure info';

  @override
  String tdMoreDates(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '+$count dates',
      one: '+1 date',
    );
    return '$_temp0';
  }

  @override
  String get tdNotes => 'Good to know';

  @override
  String get tdPriceIncludes => 'Price includes';

  @override
  String get tdPriceExcludes => 'Price excludes';

  @override
  String get tdCancellationPolicy => 'Cancellation policy';

  @override
  String get tdRefundPolicy => 'Refund policy';

  @override
  String get tdForceMajeure => 'Force majeure';

  @override
  String get tdContact => 'Contact';

  @override
  String tdDayN(int day) {
    return 'Day $day';
  }

  @override
  String tdQuizCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count quizzes',
      one: '1 quiz',
    );
    return '$_temp0';
  }

  @override
  String tdActivityCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count activities',
      one: '1 activity',
    );
    return '$_temp0';
  }

  @override
  String tdStopN(int n) {
    return 'Stop $n';
  }

  @override
  String get tdIntroVideo => 'Intro video';

  @override
  String get tdCulturalStory => 'Cultural story';

  @override
  String get tdCulturalContent => 'Cultural content';

  @override
  String get tdStoryLabel => 'Story';

  @override
  String tdArchivePhotos(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count archive photos',
      one: '1 archive photo',
    );
    return '$_temp0';
  }

  @override
  String tdArtifactCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count artifacts',
      one: '1 artifact',
    );
    return '$_temp0';
  }

  @override
  String get tdUnlockOnCheckIn =>
      'Unlocks when you check in at this stop during your journey.';

  @override
  String get tdArtifacts => 'Artifacts';

  @override
  String get tdChallenges => 'On-site challenges';

  @override
  String get tdCulturalQuiz => 'Cultural quiz';

  @override
  String tdQuizQuestions(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count quiz questions',
      one: '1 quiz question',
    );
    return '$_temp0';
  }

  @override
  String get tdScanQrToConfirm => 'scan the QR code on site to confirm';

  @override
  String get tdActivityFallback => 'Real-world experience';

  @override
  String tripCountdown(int days) {
    String _temp0 = intl.Intl.pluralLogic(
      days,
      locale: localeName,
      other: '$days days to go!',
      one: '1 day to go!',
      zero: 'Your trip starts today!',
    );
    return '$_temp0';
  }

  @override
  String get statusPendingPayment => 'Awaiting payment';

  @override
  String get statusConfirmed => 'Confirmed';

  @override
  String get statusCompleted => 'Completed';

  @override
  String get statusExpired => 'Expired';

  @override
  String get statusPaymentExpired => 'Payment expired';

  @override
  String get statusCancelled => 'Cancelled';

  @override
  String get statusUnknown => 'Unknown';

  @override
  String get payStatusPending => 'Pending';

  @override
  String get payStatusProcessing => 'Processing';

  @override
  String get payStatusVerifying => 'Verifying';

  @override
  String get payStatusSuccess => 'Successful';

  @override
  String get payStatusFailed => 'Failed';

  @override
  String get payStatusCustomerCancelled => 'Cancelled by you';

  @override
  String get payStatusSuperseded => 'Superseded';

  @override
  String get ageAdult => '12 and over';

  @override
  String get ageChild => 'Ages 5 – 11';

  @override
  String get ageToddler => 'Ages 2 – 4';

  @override
  String get ageInfant => 'Under 2';

  @override
  String get genderMale => 'Male';

  @override
  String get genderFemale => 'Female';

  @override
  String get genderOther => 'Other';

  @override
  String get bgTitle => 'Book tour';

  @override
  String get bgRemainingSlots => 'Spots left';

  @override
  String get bgNoDate => 'No date selected';

  @override
  String bgSlotsLeft(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count spots left',
      one: '1 spot left',
    );
    return '$_temp0';
  }

  @override
  String bgSlotsSelected(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count spots selected',
      one: '1 spot selected',
    );
    return '$_temp0';
  }

  @override
  String bgGuestsNotCounted(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count guests don\'t use a spot',
      one: '1 guest doesn\'t use a spot',
    );
    return '$_temp0';
  }

  @override
  String bgTotalGuests(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: 'Total · $count guests',
      one: 'Total · 1 guest',
    );
    return '$_temp0';
  }

  @override
  String get bgConfirm => 'Confirm booking';

  @override
  String get bgMissingPassenger =>
      'Open each \"Passenger\" section and fill in all details to continue.';

  @override
  String get bgNoSlot => 'no spot needed';

  @override
  String bgPassengerN(int n) {
    return 'Passenger $n';
  }

  @override
  String get bgOwnerTag => 'Lead booker';

  @override
  String get bgPassengerComplete => 'All details filled in';

  @override
  String get bgPassengerHintAdult =>
      'Tap to enter name, date of birth, gender, email';

  @override
  String get bgPassengerHint => 'Tap to enter name, date of birth, gender';

  @override
  String get bgPassengerInfo => 'Passenger details';

  @override
  String get bgFullName => 'Full name *';

  @override
  String get bgBirthDate => 'Date of birth *';

  @override
  String get bgGender => 'Gender *';

  @override
  String get bgEmailHint =>
      'Adults need an email to receive tickets, link their account and get tour invitations.';

  @override
  String bgAgeMismatch(String type) {
    return 'On the experience date this person counts as \"$type\" — please check the guest type.';
  }

  @override
  String get calHasDates => 'Dates available';

  @override
  String get calNoDates => 'No dates';

  @override
  String get calAvailable => 'Available';

  @override
  String get calAlmostFull => 'Almost full';

  @override
  String get calFull => 'Full';

  @override
  String get calThisMonth => 'Back to this month';

  @override
  String get voucherSheetTitle => 'Choose a discount voucher';

  @override
  String get voucherSkip => 'Skip';

  @override
  String get voucherLoadFailed => 'Couldn\'t load your vouchers.';

  @override
  String get voucherNotApplicable =>
      'This voucher can\'t be used for this tour.';

  @override
  String get voucherValidateFailed =>
      'Couldn\'t verify the voucher. Please try again.';

  @override
  String get voucherEmpty =>
      'You don\'t have any vouchers yet.\nRedeem your reward points to get one!';

  @override
  String get voucherOffTag => 'OFF';

  @override
  String voucherCode(String code) {
    return 'Code: $code';
  }

  @override
  String voucherExpiry(String date) {
    return 'Expires: $date';
  }

  @override
  String get pendingDialogTitle => 'You have a held booking';

  @override
  String pendingDialogMessage(
    String code,
    String date,
    String total,
    String countdown,
  ) {
    return 'Booking $code for $date ($total) is holding your spot — $countdown left to pay.\n\nTo change the date or number of guests, cancel the old booking and book again.';
  }

  @override
  String get pendingCancelAndRebook => 'Cancel and book again';

  @override
  String pendingBannerHome(String countdown) {
    return 'Booking awaiting payment · $countdown left';
  }

  @override
  String pendingBannerTour(String countdown) {
    return 'Your spot is held · $countdown left';
  }

  @override
  String pendingBannerDetail(String date, String total) {
    return '$date · $total';
  }

  @override
  String get pendingPayAction => 'Pay';

  @override
  String get coTitle => 'Payment';

  @override
  String get coNoPaymentUrl => 'The server didn\'t return a payment link.';

  @override
  String get coOpenPaymentFailed =>
      'Couldn\'t open the payment page. Please try again.';

  @override
  String get coVerifyingPrevious =>
      'Verifying your previous transaction with VNPay...';

  @override
  String get coAwaitingConfirmation =>
      'Waiting for payment confirmation. Come back to the app once you\'ve paid.';

  @override
  String get coNoResultYet =>
      'We haven\'t received a result from VNPay yet. Your money is safe — check \"My bookings\" again in a few minutes.';

  @override
  String get coCancelTitle => 'Cancel booking?';

  @override
  String get coCancelMessage => 'Your held spot will be released.';

  @override
  String get coKeep => 'Keep';

  @override
  String get coCancelBooking => 'Cancel booking';

  @override
  String get coCancelBookingLong => 'Cancel this booking';

  @override
  String get coHoldEnd => 'the end of the hold period';

  @override
  String get coLeaveTitle => 'Leave payment?';

  @override
  String coLeaveMessage(String until, String countdown) {
    return 'Your spot is held until $until ($countdown left). You can come back to pay from the tour page, Home or My bookings.';
  }

  @override
  String get coLeaveKeep => 'Leave, keep my spot';

  @override
  String get coStay => 'Stay';

  @override
  String get coNotFound => 'Booking not found.';

  @override
  String coGuestCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count guests',
      one: '1 guest',
    );
    return '$_temp0';
  }

  @override
  String get coPaymentDetails => 'Payment details';

  @override
  String get coTourPrice => 'Tour price';

  @override
  String coTourPriceGuests(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: 'Tour price ($count guests)',
      one: 'Tour price (1 guest)',
    );
    return '$_temp0';
  }

  @override
  String coDiscount(String code) {
    return 'Discount · $code';
  }

  @override
  String get coCancelled => 'This booking has been cancelled.';

  @override
  String get coSecureNote =>
      'Secure payment via VNPay — your information is protected';

  @override
  String get coCheckPrevious => 'Check previous transaction result';

  @override
  String get coAttempts => 'Payment attempts';

  @override
  String get coDuplicateAttempt =>
      'Duplicate of a transaction that was already paid';

  @override
  String get coPaidMessage =>
      'Your booking is confirmed. Have an inspiring trip!';

  @override
  String get coChooseMethod => 'Choose payment method';

  @override
  String get coMethodDomestic => 'Domestic card & bank account';

  @override
  String get coMethodDomesticDesc =>
      'Pay with a Vietnamese ATM card or bank account (Internet Banking / Mobile Banking of Vietnamese banks).';

  @override
  String get coProcessing => 'Processing...';

  @override
  String coPayAmount(String amount) {
    return 'Pay $amount';
  }

  @override
  String get coExpired =>
      'The payment window has passed. Your held spot will be released.';

  @override
  String coHoldCountdown(String countdown) {
    return 'Spot held for $countdown';
  }

  @override
  String get paySuccessTitle => 'Payment successful';

  @override
  String get paySuccessShort => 'Payment successful!';

  @override
  String get paySuccessViewBooking => 'View my booking';

  @override
  String paySuccessBookingCode(String code) {
    return 'Booking code: $code';
  }

  @override
  String paySuccessAmount(String amount) {
    return 'Amount: $amount';
  }

  @override
  String get paySuccessConfirmed => 'Your transaction has been confirmed.';

  @override
  String get payNotSuccessful => 'Payment was not completed.';

  @override
  String get payFailedRetry => 'Payment failed. You can try again.';

  @override
  String get payLoadFailed => 'Couldn\'t load payment information.';

  @override
  String get payMethodsLoadFailed => 'Couldn\'t load payment methods.';

  @override
  String get payUnverifiedLater =>
      'We couldn\'t verify your previous transaction yet. Please try again later.';

  @override
  String get payUnverifiedRetry =>
      'We couldn\'t verify your previous transaction yet. If you haven\'t paid, you can try again now; if you have, please check again in a few minutes.';

  @override
  String get payAwaitingResult => 'Waiting for payment result...';

  @override
  String get payInitializingTxn => 'Starting transaction...';

  @override
  String get payInitFailed => 'Couldn\'t start the payment. Please try again.';

  @override
  String get payScanQrToFinish => 'Scan the QR code to complete payment.';

  @override
  String get payOpenBrowserFailed =>
      'Couldn\'t open the payment page. Please check your browser.';

  @override
  String get payStatusCheckFailed =>
      'Couldn\'t check the payment status. Please try again.';

  @override
  String get payCheckingResult => 'Checking payment result...';

  @override
  String get paySuperseded =>
      'This transaction was superseded — the booking was paid by another transaction.';

  @override
  String get payDeadlineExceeded =>
      'The 10-minute payment window has expired. Please book the tour again.';

  @override
  String get payRetryTitle => 'Pay again?';

  @override
  String get payRetryMessage =>
      'We couldn\'t verify your previous transaction yet.\n\n• If you HAVEN\'T paid: you can try again now within the remaining time.\n• If you HAVE paid: choose \"Check again\" so we can sync the result and avoid a double payment.';

  @override
  String get payCheckAgain => 'Check again';

  @override
  String payBookingNumber(int id) {
    return 'Booking #$id';
  }

  @override
  String get payTourFallback => 'Experience tour';

  @override
  String get payExperienceDate => 'Experience date';

  @override
  String get payMethodTitle => 'Payment method';

  @override
  String get payMethodsUnavailable =>
      'Couldn\'t load payment methods. You can still try again.';

  @override
  String get payInitializing => 'Starting...';

  @override
  String get payChecking => 'Checking...';

  @override
  String get payCheckResult => 'Check payment result';

  @override
  String get payTimeLimitNote =>
      'You have 10 minutes to complete payment. The VNPay page will open in your browser.';

  @override
  String get payQrTitle => 'Scan to pay';

  @override
  String get payQrHint =>
      'Open a banking or e-wallet app that supports VNPay-QR to scan this code.';

  @override
  String get payChooseCard => 'Choose card type';

  @override
  String get payChooseCardHint => 'Choose card type (Visa, Mastercard, JCB…)';

  @override
  String payCardType(String type) {
    return 'Card type: $type';
  }

  @override
  String get payCardTypesUnavailable =>
      'Couldn\'t load card types. You can still pay with an international card.';

  @override
  String get payMethodIntl => 'International card';

  @override
  String get payMethodQr => 'Banking app & e-wallet';

  @override
  String get mbTitle => 'My bookings';

  @override
  String mbTabAll(int count) {
    return 'All ($count)';
  }

  @override
  String mbTabPurchased(int count) {
    return 'Purchased ($count)';
  }

  @override
  String mbTabPending(int count) {
    return 'Awaiting payment ($count)';
  }

  @override
  String mbTabExperiencing(int count) {
    return 'In progress ($count)';
  }

  @override
  String mbTabCompleted(int count) {
    return 'Completed ($count)';
  }

  @override
  String mbTabRefunding(int count) {
    return 'Refunding ($count)';
  }

  @override
  String mbTabRefunded(int count) {
    return 'Refunded ($count)';
  }

  @override
  String mbTabClosed(int count) {
    return 'Cancelled / Expired ($count)';
  }

  @override
  String get mbEmptyAll => 'No bookings yet.';

  @override
  String get mbEmptyPurchased => 'No paid bookings yet.';

  @override
  String get mbEmptyPending => 'No bookings awaiting payment.';

  @override
  String get mbEmptyExperiencing => 'No trips in progress.';

  @override
  String get mbEmptyCompleted => 'No completed bookings yet.';

  @override
  String get mbEmptyRefunding => 'No bookings being refunded.';

  @override
  String get mbEmptyRefunded => 'No refunded bookings yet.';

  @override
  String get mbEmptyClosed => 'No cancelled or expired bookings.';

  @override
  String get mbDetails => 'Details';

  @override
  String get mbRebook => 'Book this tour again';

  @override
  String get mbBookingCancelled => 'Booking cancelled';

  @override
  String get mbBookingExpired => 'Booking expired';

  @override
  String get mbEnterExperience => 'Start experience';

  @override
  String mbReason(String reason) {
    return 'Reason: $reason';
  }

  @override
  String get mbPaidButClosed =>
      'Your payment was received but the spot has been released. Please contact support to get a refund.';

  @override
  String get mbViewDetails => 'View booking details';

  @override
  String mbPaymentDeadline(String time) {
    return 'Pay by: $time';
  }

  @override
  String get bdTitle => 'Booking details';

  @override
  String get bdLoadFailed => 'Couldn\'t load booking details.';

  @override
  String get bdPaymentConfirmedToast => 'Payment confirmed!';

  @override
  String get bdTxnFailedConfirmed =>
      'The transaction was confirmed as unsuccessful.';

  @override
  String get bdUnverified =>
      'We couldn\'t verify the result yet. If you\'ve paid, please try again in a few minutes.';

  @override
  String get bdCancelTitle => 'Cancel booking';

  @override
  String get bdCancelMessage =>
      'Once cancelled, your held spot will be released to other travelers. This can\'t be undone.';

  @override
  String get bdCancelReasonHint => 'Reason for cancelling (optional)';

  @override
  String get bdKeepBooking => 'Keep booking';

  @override
  String get bdCancelledToast =>
      'Booking cancelled. Your held spot has been released.';

  @override
  String get bdCancelFailed =>
      'Couldn\'t cancel the booking. Please try again.';

  @override
  String get bdRefundWindowClosed =>
      'Refund requests can only be sent before the tour\'s departure date. This tour has started or been completed, so a request can\'t be sent.';

  @override
  String get bdEyebrowCode => 'BOOKING CODE';

  @override
  String get bdEyebrowTotal => 'TOTAL';

  @override
  String get bdNoExperienceDate => 'No experience date yet';

  @override
  String bdExperienceCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count experiences',
      one: '1 experience',
    );
    return '$_temp0';
  }

  @override
  String get bdStepBooked => 'Booked';

  @override
  String get bdStepBookedCreated => 'Booking created';

  @override
  String get bdStepPayment => 'Payment';

  @override
  String get bdStepNotPaid => 'Not paid yet';

  @override
  String get bdStepConfirmed => 'Confirmation';

  @override
  String get bdStepCompleted => 'Completed';

  @override
  String get bdStepNotDone => 'Not carried out';

  @override
  String get bdStepNotExperienced => 'Not experienced yet';

  @override
  String get bdProgressTitle => 'Booking progress';

  @override
  String bdCountdownHint(String countdown) {
    return '$countdown left to pay. After that, your held spot will be released to other travelers.';
  }

  @override
  String get bdExperiencesTitle => 'Experiences in this booking';

  @override
  String bdItemCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count items',
      one: '1 item',
    );
    return '$_temp0';
  }

  @override
  String get bdExperiencesHint =>
      'Each experience in the tour takes one spot on your chosen date.';

  @override
  String get bdNoExperiences => 'No experiences are recorded for this booking.';

  @override
  String get bdExperiencesTotal => 'Experiences total';

  @override
  String bdExperienceNumber(String id) {
    return 'Experience #$id';
  }

  @override
  String get bdDepartureTitle => 'Departure information';

  @override
  String get bdOrderInfoTitle => 'Booking information';

  @override
  String get bdRowCode => 'Booking code';

  @override
  String get bdRowTour => 'Tour';

  @override
  String get bdRowExperienceCount => 'Experiences';

  @override
  String get bdRowPaidAt => 'Paid at';

  @override
  String get bdRowBookedAt => 'Booked at';

  @override
  String get bdRowDeadline => 'Payment deadline';

  @override
  String get bdRowCancelReason => 'Cancellation reason';

  @override
  String get bdPassengersTitle => 'Group passengers';

  @override
  String bdPeopleCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count people',
      one: '1 person',
    );
    return '$_temp0';
  }

  @override
  String get bdPassengersHint => 'Participants entered when booking the tour.';

  @override
  String get bdInviteHint =>
      'Send an invitation so passengers can create a JourneyGo account and view the tour with the group. Invitations expire after 24 hours.';

  @override
  String get bdBookerTag => 'Booker';

  @override
  String get bdResendInvite => 'Resend invitation';

  @override
  String get bdInvite => 'Invite';

  @override
  String bdAge(int age) {
    String _temp0 = intl.Intl.pluralLogic(
      age,
      locale: localeName,
      other: '$age years old',
      one: '1 year old',
    );
    return '$_temp0';
  }

  @override
  String get bdInfoHidden => 'Personal information hidden';

  @override
  String get bdNoEmail => 'No email yet';

  @override
  String bdInviteSent(String email) {
    return 'Invitation sent to $email';
  }

  @override
  String get bdInviteEmailTitle => 'Enter the invitee\'s email';

  @override
  String get bdEmailExample => 'example@gmail.com';

  @override
  String get bdSendInvite => 'Send invitation';

  @override
  String get bdPaymentHistory => 'Payment history';

  @override
  String get bdNoPayments => 'No payment transactions yet.';

  @override
  String get bdRefundEntryTitle => 'Cancel trip & refund';

  @override
  String get bdRefundEntryHint => 'Send a request before the departure date';

  @override
  String bdRefundEntryHintDate(String date) {
    return 'Send a request before $date';
  }

  @override
  String get bdRefundRequests => 'Refund requests';

  @override
  String bdRefundProcessingDetail(String code) {
    return 'Request $code is being processed. You can follow each step in \"Refund history\" below.';
  }

  @override
  String bdRefundDoneDetail(String code, String status) {
    return 'Request $code has been processed: $status.';
  }

  @override
  String get bdAuditTitle => 'Refund history';

  @override
  String get bdAuditHint =>
      'Steps are listed in time order — oldest at the top, newest at the bottom.';

  @override
  String bdRefundNumber(int id) {
    return 'Request #$id';
  }

  @override
  String bdTransactionAt(String time) {
    return 'Transaction $time';
  }

  @override
  String get bdStuckHint =>
      'No confirmation from VNPay yet. If you\'ve paid, please check again.';

  @override
  String get bdChecking => 'Checking';

  @override
  String bdRefundAwaitingTriage(String status) {
    return '$status • Awaiting admin review';
  }

  @override
  String get bdAwaitingTriage => 'Awaiting review';

  @override
  String get bdHintConfirmed => 'Payment successful — your spot is confirmed.';

  @override
  String get bdHintCompleted =>
      'You\'ve completed the experience. Thanks for traveling with us!';

  @override
  String get bdHintPending =>
      'This booking is awaiting payment — please complete it within 10 minutes.';

  @override
  String get bdHintCancelled =>
      'This booking was cancelled and the spot has been released.';

  @override
  String get auditCreated => 'Refund request submitted';

  @override
  String get auditApproved => 'Request approved by admin';

  @override
  String get auditRejected => 'Request rejected';

  @override
  String get auditCancelled => 'Request cancelled';

  @override
  String get auditVnpaySent => 'Refund request sent to VNPay';

  @override
  String get auditVnpayResponse => 'VNPay responded with the refund result';

  @override
  String get auditManualRecorded => 'Manual transfer recorded';

  @override
  String get auditManualConfirmed => 'Transfer confirmed — refund successful';

  @override
  String get auditStatusUpdated => 'Request status updated';

  @override
  String get auditOther => 'Refund request updated';

  @override
  String get holdReleased => 'Released';

  @override
  String get holdFreed => 'Freed';

  @override
  String get holdHolding => 'Holding';

  @override
  String get refundToneRefunded => 'Refunded';

  @override
  String get refundToneRejected => 'Rejected';

  @override
  String get rfPolicyCustomer => 'Customer reasons (tour cancellation)';

  @override
  String rfCancelBefore(int days) {
    String _temp0 = intl.Intl.pluralLogic(
      days,
      locale: localeName,
      other: 'Cancel $days days before',
      one: 'Cancel 1 day before',
    );
    return '$_temp0';
  }

  @override
  String rfRefundPercent(int percent) {
    return '$percent% refund';
  }

  @override
  String rfCancelWithin(int hours) {
    return 'Cancel within $hours hours / No-show (per schedule)';
  }

  @override
  String get rfPolicyPlatform => 'System / partner issues';

  @override
  String get rfPolicyPlatformLine =>
      'Experience couldn\'t be unlocked, partner didn\'t run the tour...';

  @override
  String get rfPolicyForceMajeure => 'Force majeure';

  @override
  String get rfPolicyForceMajeureLine => 'Natural disasters, epidemics...';

  @override
  String rfMaxFiles(int max) {
    return 'Each request can include at most $max files.';
  }

  @override
  String get rfGalleryFailed => 'Couldn\'t open the photo library.';

  @override
  String get rfVideoFailed => 'Couldn\'t select the video.';

  @override
  String get rfUploadFailed =>
      'Couldn\'t upload all evidence to the server. Please try again.';

  @override
  String get rfSubmitFailed =>
      'Couldn\'t send the refund request. Please try again.';

  @override
  String get rfErrSummary => 'Please enter a short reason.';

  @override
  String get rfErrDetail =>
      'Please describe the issue or why you can\'t attend in detail.';

  @override
  String get rfErrBank => 'Please fill in all receiving bank account details.';

  @override
  String get rfErrContact => 'Please fill in all contact details.';

  @override
  String get rfErrReceipt =>
      'Please upload a screenshot of the successful payment receipt (required for admin verification).';

  @override
  String get rfErrAgree =>
      'Please confirm that your information and evidence are accurate.';

  @override
  String get rfErrGeneric => 'Please check the information you entered.';

  @override
  String get rfSentTitle => 'Refund request sent';

  @override
  String rfSentDetail(String code, String status) {
    return 'Request code: $code\nStatus: $status';
  }

  @override
  String get rfGotIt => 'Got it';

  @override
  String get rfTitle => 'Refund request';

  @override
  String get rfFooterNote =>
      'An admin will review your request and evidence. The amount you receive, refund rate and refund method will be shared after approval.';

  @override
  String get rfOrder => 'Booking';

  @override
  String get rfPaidBooking => 'Paid booking';

  @override
  String get rfAmountPaid => 'Amount paid';

  @override
  String get rfPaidDate => 'Payment date';

  @override
  String get rfPolicyTitle => 'Refund policy';

  @override
  String get rfReasonTitle => 'Refund reason';

  @override
  String get rfReasonHint =>
      'An admin will read this to verify your request and decide the refund amount.';

  @override
  String get rfSummaryHint => 'Enter a short reason (e.g. Sudden illness...)';

  @override
  String get rfDetailHint =>
      'Please describe in detail the issue you faced or why you can\'t attend so the admin can help you best';

  @override
  String get rfEvidenceTitle => 'Attach evidence';

  @override
  String get rfEvidenceTypes => '(Photos/Videos/Documents)';

  @override
  String get rfEvidenceExamples =>
      'Medical certificates, photos of the incident, screenshots of app errors, etc.';

  @override
  String get rfReceiptRequired =>
      'Required: screenshot of the successful payment receipt';

  @override
  String get rfReceiptHint =>
      'Take a screenshot of the VNPay receipt showing \"Transaction successful\", then tap \"Add photo\" below. Without it, the request can\'t be sent.';

  @override
  String get rfAddPhoto => 'Add photo';

  @override
  String get rfAddVideo => 'Add video';

  @override
  String get rfUploadError => 'Upload failed';

  @override
  String get rfBankTitle => 'Receiving bank account';

  @override
  String get rfBankHint =>
      'Provide this so we can refund you manually if needed.';

  @override
  String get rfAccountNumber => 'Account number';

  @override
  String get rfAccountName => 'Account holder name';

  @override
  String get rfBank => 'Bank';

  @override
  String get rfContactTitle => 'Contact information';

  @override
  String get rfPhone => 'Phone number';

  @override
  String get rfBackupEmail => 'Backup email';

  @override
  String get rfAgreement =>
      'I confirm that the information and evidence provided are true, and that I have read and understood the refund policy.';

  @override
  String get rfSending => 'Sending...';

  @override
  String get rfSubmit => 'Send refund request';

  @override
  String get rhLoadFailed => 'Couldn\'t load refund history.';

  @override
  String get rhAwaitingAdminTriage => 'Awaiting admin review';

  @override
  String get rhTitle => 'Refund history';

  @override
  String get rhEmpty => 'No refund requests yet';

  @override
  String get rhMyBooking => 'My booking';

  @override
  String get rhNoRefund => 'No refund';

  @override
  String get rhAwaitingAdmin => 'Awaiting admin processing';

  @override
  String get rhNotRefunded => 'Not refunded';

  @override
  String rhRejectReason(String reason) {
    return 'Rejection reason: $reason';
  }

  @override
  String rhMethod(String method) {
    return 'Method: $method';
  }

  @override
  String get rhEvidenceLoadFailed => 'Couldn\'t load evidence';

  @override
  String get rhFilterPending => 'Pending';

  @override
  String get rhFilterRefunded => 'Refunded';

  @override
  String get rsTitle => 'Support & refunds';

  @override
  String get rsLoadFailed => 'Couldn\'t load refund requests';

  @override
  String get rsEmptyTitle => 'No refund requests yet';

  @override
  String get rsEmptyMessage =>
      'Your ticket refund requests and their progress will appear here.';

  @override
  String rsBookingNumber(String id) {
    return 'Booking #$id';
  }

  @override
  String rsSentAt(String time) {
    return 'Sent $time';
  }

  @override
  String get rsApprovedAmount => 'Approved amount';

  @override
  String get rsProposedAmount => 'Proposed amount';

  @override
  String get rsAmount => 'Amount';

  @override
  String get refundStatusPendingReview => 'Pending review';

  @override
  String get refundStatusApproved => 'Approved';

  @override
  String get refundStatusVnpay => 'Awaiting VNPay refund confirmation';

  @override
  String get refundStatusProcessing => 'Refunding';

  @override
  String get refundStatusManual => 'Awaiting manual transfer';

  @override
  String get refundStatusRejected => 'Rejected';

  @override
  String get refundStatusRejected2 => 'Rejected';

  @override
  String get refundStatusFailed => 'Refund failed';

  @override
  String get refundReasonCustomer => 'Customer reason';

  @override
  String get refundReasonPlatform => 'Platform issue';

  @override
  String get refundReasonProvider => 'Partner issue';

  @override
  String get refundReasonForceMajeure => 'Force majeure';

  @override
  String get refundReasonOther => 'Other reason';

  @override
  String get refundMethodVnpay => 'Refund via VNPay';

  @override
  String get refundMethodManual => 'Manual bank transfer';

  @override
  String get refundMethodUnknown => 'Not determined';

  @override
  String get rfOtherBank => 'Other (please specify the bank)';

  @override
  String get invLoadFailed =>
      'Couldn\'t load the invitation. Please try again.';

  @override
  String invLoginWithEmail(String email) {
    return 'Please sign in with $email to confirm the invitation.';
  }

  @override
  String get invConfirmFailed =>
      'Couldn\'t confirm the invitation. Please try again.';

  @override
  String get invStatusPending => 'Awaiting confirmation';

  @override
  String get invStatusRevoked => 'Revoked';

  @override
  String get invTitle => 'Tour invitation';

  @override
  String get invJoined => 'You\'ve joined the tour!';

  @override
  String get invNoLongerValid => 'This invitation is no longer valid';

  @override
  String get invInvited => 'You\'re invited to join a tour';

  @override
  String get invLinked => 'The passenger has been linked to the booking.';

  @override
  String get invExpiredHint =>
      'The invitation has expired or been revoked. Please ask the booker to send it again.';

  @override
  String get invConfirmHint =>
      'Confirm the invitation to get access to the tour with the group.';

  @override
  String get invInfoTitle => 'INVITATION DETAILS';

  @override
  String get invPassenger => 'Passenger';

  @override
  String get invInvitedEmail => 'Invited email';

  @override
  String get invValidUntil => 'Valid until';

  @override
  String get invStatus => 'Status';

  @override
  String get invConfirming => 'Confirming...';

  @override
  String get invConfirmJoin => 'Confirm and join';

  @override
  String get invLoginToConfirm => 'Sign in to confirm';

  @override
  String get invNotFound => 'Invitation not found';

  @override
  String get invNotFoundHint => 'The invitation doesn\'t exist or has expired.';

  @override
  String get invListLoadFailed =>
      'Couldn\'t load your invitations. Please try again.';

  @override
  String get invConfirmFailed2 =>
      'Couldn\'t confirm the invitation. Please try again.';

  @override
  String get invInviterFallback => 'The booker';

  @override
  String invInvitedBy(String inviter, String tour) {
    return '$inviter invited you to the tour $tour. Confirm the invitation to get access to the tour with the group.';
  }

  @override
  String get invJoinedDetail =>
      'The passenger has been linked to the booking. You can now view the booking details and access the tour.';

  @override
  String get invNoneLeft => 'No more invitations';

  @override
  String get invNoneLeftHint =>
      'You have no tour invitations awaiting confirmation.';

  @override
  String get invLoginSnack =>
      'You\'ve been invited to a tour. Please sign in to confirm the invitation.';

  @override
  String get invTagSent => 'Invitation sent';

  @override
  String get invTagJoined => 'Joined';

  @override
  String get invTagExpired => 'Invitation expired';

  @override
  String get invTagRevoked => 'Invitation cancelled';

  @override
  String get tripsTitle => 'My trips';

  @override
  String get tripsSubtitle =>
      'Purchased tickets, journeys in progress and completed';

  @override
  String get tripsLoadFailed => 'Couldn\'t load your trips';

  @override
  String get tripsEmptySection => 'No trips in this section yet.';

  @override
  String get tripsStageActive => 'Happening now';

  @override
  String get tripsStageReady => 'Upcoming';

  @override
  String get tripsStageEnded => 'Ended';

  @override
  String get tripsNotJoined => 'You didn\'t join this tour';

  @override
  String get tripsLive => 'Live';

  @override
  String get tripsEmptyTitle => 'You don\'t have any trips yet';

  @override
  String get tripsEmptyMessage =>
      'Book a tour from Explore — your ticket will appear here so you can start the journey when you arrive.';

  @override
  String get tripsExplore => 'Explore tours';

  @override
  String get tripsFilterActive => 'Active';

  @override
  String get tripsFilterReady => 'Upcoming';

  @override
  String get tripsFilterDone => 'Done';

  @override
  String get tripsExperiencing => 'In progress';

  @override
  String tripsStopProgress(int current, int total) {
    return 'Stop $current/$total';
  }

  @override
  String get tripsStopsCheckedIn => ' stops completed';

  @override
  String tripsNextStop(int current, int total) {
    return 'Next stop $current/$total';
  }

  @override
  String get tripsAllStopsChecked => 'All stops completed';

  @override
  String get tripsUnfinished => 'Keep going';

  @override
  String tripsUnfinishedHint(String date) {
    return 'Started on $date but not finished yet.';
  }

  @override
  String get tripsActionTitle => 'Needs your attention';

  @override
  String get tripsRefundNeededTitle =>
      'Paid but cancelled · please request a refund';

  @override
  String tripsDestinations(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count destinations',
      one: '1 destination',
    );
    return '$_temp0';
  }

  @override
  String get tripsTicketDetails => 'Ticket details';

  @override
  String get tripsViewItinerary => 'View itinerary';

  @override
  String get tripsStart => 'Start';

  @override
  String get tripsToday => 'Today';

  @override
  String get tripsTomorrow => 'Tomorrow';

  @override
  String tripsDaysLeft(int days) {
    String _temp0 = intl.Intl.pluralLogic(
      days,
      locale: localeName,
      other: '$days days left',
      one: '1 day left',
    );
    return '$_temp0';
  }

  @override
  String tripsCodeSemantics(String code) {
    return 'Ticket code $code, tap to copy';
  }

  @override
  String tripsCodeCopied(String code) {
    return 'Copied ticket code $code';
  }

  @override
  String get tripsTicketCode => 'Ticket code';

  @override
  String get calLoadFailed => 'Couldn\'t load departure dates.';

  @override
  String get calTitle => 'Tours by date';

  @override
  String get calLoadFailedTitle => 'Couldn\'t load the calendar';

  @override
  String get calPrevMonth => 'Previous month';

  @override
  String get calNextMonth => 'Next month';

  @override
  String get calNoDepartures => 'No departures yet';

  @override
  String calDepartureCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count departures',
      one: '1 departure',
    );
    return '$_temp0';
  }

  @override
  String calDaySemantics(String date, int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count tours',
      one: '1 tour',
    );
    return '$date, $_temp0';
  }

  @override
  String calDaySemanticsNone(String date) {
    return '$date, no tours';
  }

  @override
  String get calNoDeparturesHint =>
      'Tours will appear here once partners open departure dates.';

  @override
  String get authLoginSuccess => 'Signed in successfully!';

  @override
  String authWelcomeBackName(String name) {
    return 'Welcome back to Vietnamese heritage, $name.';
  }

  @override
  String get authSignupSuccess => 'Account created!';

  @override
  String get authSignupReward =>
      '🎉 You\'ve earned +100 heritage discovery points!';

  @override
  String get authLoginFailed => 'Sign-in failed';

  @override
  String get authSignupFailedMessage =>
      'Couldn\'t create your account. Please try again.';

  @override
  String get authSignupFailed => 'Sign-up failed';

  @override
  String get authInvalid => 'Invalid account or password!';

  @override
  String get authAppleUnsupported =>
      'Sign in with Apple isn\'t supported on Android yet.';

  @override
  String get authWelcomeBack => 'Welcome back to JourneyGo!';

  @override
  String get authPrivacyTitle => 'Digital heritage standard';

  @override
  String get authPrivacyBody =>
      'Traveler data is securely encrypted to national digital-culture preservation standards. We are fully committed to protecting your identity, trip history and heritage reward points.';

  @override
  String get authPrivacyAgree => 'I understand and agree';

  @override
  String get authFullName => 'Full name';

  @override
  String get authFullNameExample => 'Alex Nguyen';

  @override
  String get authErrNameRequired => 'Please enter your full name';

  @override
  String get authErrNameShort => 'Name is too short';

  @override
  String get authErrEmailRequired => 'Please enter your email address';

  @override
  String get authErrEmailInvalid => 'Invalid email format';

  @override
  String get authPhone => 'Phone number';

  @override
  String get authErrPhoneRequired => 'Please enter your phone number';

  @override
  String get authErrPhoneLength => 'Phone number must be 9–11 digits';

  @override
  String get authPassword => 'Password';

  @override
  String get authPasswordHintLogin => 'Enter your password';

  @override
  String get authPasswordHintSignup => 'At least 6 characters';

  @override
  String get authErrPasswordRequired => 'Please enter your password';

  @override
  String get authErrPasswordShort => 'Password must be at least 6 characters';

  @override
  String get authConfirmPassword => 'Confirm password';

  @override
  String get authConfirmPasswordHint =>
      'Re-enter the password you just created';

  @override
  String get authErrConfirmRequired => 'Please confirm your password';

  @override
  String get authErrConfirmMismatch => 'Passwords don\'t match';

  @override
  String get authHeaderLogin =>
      'Welcome back! Sign in to continue your journey.';

  @override
  String get authHeaderSignup =>
      'Create an account to explore heritage and earn reward points.';

  @override
  String get authLogin => 'Sign in';

  @override
  String get authSignup => 'Create account';

  @override
  String get authPromoPrefix => 'Get ';

  @override
  String get authPromoPoints => '+100 reward points ';

  @override
  String get authPromoSuffix => 'for exploring heritage when you sign up!';

  @override
  String get authRemember => 'Remember me';

  @override
  String get authForgot => 'Forgot password?';

  @override
  String get authOrContinue => 'or continue with';

  @override
  String get authGoogle => 'Continue with Google';

  @override
  String get authFooter =>
      'Secured to digital cultural heritage standards • Terms';

  @override
  String authServerUnreachableDebug(String url, String detail, String hint) {
    return 'Couldn\'t connect to the server ($url).\nDetails: $detail\n\n$hint';
  }

  @override
  String get authServerUnreachable =>
      'Couldn\'t connect to the server. Please try again later.';

  @override
  String authServerTimeoutDebug(String url, String hint) {
    return 'Connection to the server ($url) timed out.\n\n$hint';
  }

  @override
  String get authServerTimeout =>
      'The server connection timed out. Please try again later.';

  @override
  String authNetworkError(String error) {
    return 'Network error: $error';
  }

  @override
  String get authErr401 =>
      'Invalid sign-in details or your session has expired.';

  @override
  String get authErr403 => 'You don\'t have permission to access this feature.';

  @override
  String get authErr404 => 'The requested resource wasn\'t found (404).';

  @override
  String authErrServer(String code) {
    return 'Server error ($code). Please try again later.';
  }

  @override
  String get authNoRefreshToken =>
      'No refresh token found. Please sign in again.';

  @override
  String authSessionExpiredDetail(String detail) {
    return 'Your session has expired: $detail';
  }

  @override
  String get apiInvalidData => 'The server returned invalid data.';

  @override
  String get googleCancelled => 'Google sign-in was cancelled.';

  @override
  String get googleNoToken =>
      'Couldn\'t get an ID token from Google. Please try again.';

  @override
  String get sessionExpired =>
      'Your session has expired. Please sign in again to continue.';

  @override
  String apiRequestFailed(String code) {
    return 'Couldn\'t process the request (code $code).';
  }

  @override
  String get apiTimeout => 'The server connection timed out. Please try again.';

  @override
  String get apiUnreachable =>
      'Couldn\'t connect to the server. Please check your network and API address.';

  @override
  String get apiNoImageUrl => 'The server didn\'t return an image URL.';

  @override
  String apiImageUploadFailed(String code) {
    return 'Couldn\'t upload the image (code $code).';
  }

  @override
  String get apiImageTimeout => 'Image upload timed out. Please try again.';

  @override
  String get apiNoVideoUrl => 'The server didn\'t return a video URL.';

  @override
  String apiVideoUploadFailed(String code) {
    return 'Couldn\'t upload the video (code $code).';
  }

  @override
  String get apiVideoTimeout => 'Video upload timed out. Please try again.';

  @override
  String get pwShow => 'Show password';

  @override
  String get pwHide => 'Hide password';

  @override
  String get pwErrNewRequired => 'Please enter a new password';

  @override
  String get pwErrNewShort => 'Password must be at least 6 characters';

  @override
  String get pwOtpResent => 'A new OTP code has been sent to your email.';

  @override
  String get pwResetSuccess => 'Password reset successful';

  @override
  String get pwResetSuccessHint => 'Please sign in with your new password.';

  @override
  String get pwForgotTitle => 'Recover password';

  @override
  String get pwForgotSubtitle =>
      'Get an OTP code by email to reset your password';

  @override
  String get pwStepOtp => 'OTP code';

  @override
  String get pwStepNewPassword => 'New password';

  @override
  String get pwEmailIntro =>
      'Enter the email you signed up with. We\'ll send you a 6-digit code.';

  @override
  String get pwErrEmailRequired => 'Please enter your email';

  @override
  String get pwErrEmailInvalid => 'Invalid email format';

  @override
  String get pwSendOtp => 'Send OTP code';

  @override
  String get pwCodeSentPrefix => 'The code was sent to ';

  @override
  String get pwCodeSentSuffix =>
      '. Check your spam folder if you don\'t see it.';

  @override
  String get pwErrOtpLength => 'The OTP code must be exactly 6 digits';

  @override
  String get pwVerifyCode => 'Verify code';

  @override
  String get pwChangeEmail => 'Change email';

  @override
  String pwResendIn(int seconds) {
    return 'Resend in ${seconds}s';
  }

  @override
  String get pwResend => 'Resend code';

  @override
  String get pwNewIntro => 'Set a new password for your account.';

  @override
  String get pwMin6 => 'At least 6 characters';

  @override
  String get pwConfirmNew => 'Confirm new password';

  @override
  String get pwErrMismatch => 'Passwords don\'t match';

  @override
  String get pwResetButton => 'Reset password';

  @override
  String get pwChangeSuccess => 'Password changed.';

  @override
  String get pwChangeSubtitle => 'Keep your heritage journey secure';

  @override
  String get pwCurrent => 'Current password';

  @override
  String get pwCurrentGoogleHint =>
      'Leave blank if you sign in with Google and have never set a password';

  @override
  String get pwErrCurrentRequired => 'Please enter your current password';

  @override
  String get pwNewHelper =>
      'At least 6 characters, different from your current password';

  @override
  String get pwSave => 'Save new password';

  @override
  String get epNameRequired => 'Full name can\'t be empty!';

  @override
  String get epSaved => 'Your profile has been updated!';

  @override
  String get epTitle => 'Edit traveler profile';

  @override
  String get epEmailLabel => 'Account email (can\'t be changed):';

  @override
  String get epNameLabel => 'Full name:';

  @override
  String get epNameHint => 'Enter your full name';

  @override
  String get epPhoneLabel => 'Phone number:';

  @override
  String get epPhoneHint => 'Enter a contact phone number';

  @override
  String get epSaving => 'Saving your changes...';

  @override
  String get epSave => 'Save changes';

  @override
  String get notifCatBooking => 'Booking';

  @override
  String get notifCatRefund => 'Refund';

  @override
  String get notifCatReward => 'Reward';

  @override
  String get notifCatApproved => 'Approved';

  @override
  String get notifCatRejected => 'Needs review';

  @override
  String get notifCatCommunity => 'Community';

  @override
  String get notifCatFinance => 'Finance';

  @override
  String get notifCatReview => 'Review';

  @override
  String get notifCatChat => 'Messages';

  @override
  String get timeJustNow => 'Just now';

  @override
  String timeMinutesAgo(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count min ago',
      one: '1 min ago',
    );
    return '$_temp0';
  }

  @override
  String timeHoursAgo(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count hours ago',
      one: '1 hour ago',
    );
    return '$_temp0';
  }

  @override
  String get timeYesterday => 'Yesterday';

  @override
  String timeDaysAgo(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count days ago',
      one: '1 day ago',
    );
    return '$_temp0';
  }

  @override
  String notifNewCount(int count) {
    return '$count new';
  }

  @override
  String get notifReadAll => 'Mark all read';

  @override
  String get notifOlder => 'Show older notifications';

  @override
  String get notifEmpty => 'No notifications yet';

  @override
  String get notifEmptyHint =>
      'Payment results, refunds, badges and your posts will appear here.';

  @override
  String get notifChannelTimer => 'Activity timers';

  @override
  String get notifChannelTimerDesc =>
      'Reminds you when a real-world experience countdown ends';

  @override
  String get notifChannelCountdown => 'Countdown timer';

  @override
  String get notifChannelCountdownDesc =>
      'Time left for an on-site activity, also shown on the lock screen';

  @override
  String tkCountdownBody(String place) {
    return 'Counting down · $place';
  }

  @override
  String get ovHideTitle => 'Hide the floating timer?';

  @override
  String get ovHideBody => 'The timer keeps running in the app.';

  @override
  String get ovHide => 'Hide';

  @override
  String get ovCancel => 'Cancel';

  @override
  String get ovPermTitle => 'Show the timer outside the app?';

  @override
  String get ovPermBody =>
      'Allow Journey Go to display over other apps so you can see the time left right on your home screen.';

  @override
  String get ovPermAllow => 'Allow';

  @override
  String get ovPermLater => 'Not now';

  @override
  String get notifChannelMain => 'Journey Go notifications';

  @override
  String get notifChannelMainDesc =>
      'Bookings, refunds, badges and forum posts';

  @override
  String get chatListLoadFailed => 'Couldn\'t load your support history.';

  @override
  String get chatEmpty => 'No conversations yet';

  @override
  String get chatEmptyHint =>
      'Open any tour\'s details and tap \"Chat with …\" to ask the provider before booking. Your history will be saved here.';

  @override
  String get chatNoMessages => 'No messages yet';

  @override
  String get chatOpenFailed => 'Couldn\'t open the conversation.';

  @override
  String get chatProviderFallback => 'Tour provider';

  @override
  String chatAskAbout(String name) {
    return 'Ask $name about this tour';
  }

  @override
  String get chatProviderLower => 'the provider';

  @override
  String get chatAskHint =>
      'You can ask about the itinerary, price, weather conditions or booking procedures before deciding to book.';

  @override
  String get chatInputHint => 'Message the provider…';

  @override
  String get pcVerified => 'Verified partner';

  @override
  String get pcOnline => 'Online now';

  @override
  String get pcReplyFewMinutes => 'Usually replies within minutes';

  @override
  String pcReplyMinutes(int minutes) {
    return 'Usually replies in about $minutes min';
  }

  @override
  String pcReplyHours(int hours) {
    return 'Usually replies in about $hours h';
  }

  @override
  String get pcReplyDay => 'Usually replies within a day';

  @override
  String get pcReplyDays => 'Usually replies within a few days';

  @override
  String get pcNotifyReply => 'You will be notified when the operator replies';

  @override
  String pcAskingAbout(String tour) {
    return 'Asking about: $tour';
  }

  @override
  String get pcToday => 'Today';

  @override
  String get pcYesterday => 'Yesterday';

  @override
  String get pcQuick1 => 'Next departure dates?';

  @override
  String get pcQuick2 => 'What is the price for children?';

  @override
  String get pcQuick3 => 'Is hotel pickup included?';

  @override
  String get pcQuick4 => 'What should I bring?';

  @override
  String get pcQuickTitle => 'Suggested questions';

  @override
  String pcNewMessages(int count) {
    return '$count new';
  }

  @override
  String get pcSending => 'Sending…';

  @override
  String get pcSendFailed => 'Not sent · Tap to retry';

  @override
  String get pcCopied => 'Message copied';

  @override
  String get pcLoadOlder => 'Load older messages';

  @override
  String get pcHistoryEnd => 'You have reached the beginning of the chat';

  @override
  String get pcInfoTitle => 'Tour operator';

  @override
  String get pcInfoBody =>
      'This operator is reviewed by Journey Go. Your messages are saved so you can continue any time.';

  @override
  String get pcViewTour => 'View tour';

  @override
  String get pcSeen => 'Seen';

  @override
  String get pcSent => 'Sent';

  @override
  String get pcStartChat => 'Start chatting';

  @override
  String get pcListSubtitle =>
      'Ask operators about itineraries, prices, pickup…';

  @override
  String get forumFilterTour => 'Filter by tour';

  @override
  String get forumTitle => 'Heritage forum';

  @override
  String get forumSubtitle => 'Share cultural experiences with the community';

  @override
  String get forumMyPosts => 'My posts';

  @override
  String get forumLoadFailed => 'Couldn\'t load the forum';

  @override
  String get forumNoMatch => 'No matching posts';

  @override
  String get forumNoPosts => 'No posts yet';

  @override
  String get forumNoMatchHint => 'Try removing some filters to see more posts.';

  @override
  String get forumNoPostsHint => 'Be the first to share your experience.';

  @override
  String get forumComposePrompt => 'Had an interesting experience?';

  @override
  String get forumSortNewest => 'Newest';

  @override
  String get forumSortTop => 'Top';

  @override
  String get forumDestinationFallback => 'Destination';

  @override
  String forumMaxImages(int max) {
    return 'Each post can include at most $max photos.';
  }

  @override
  String get forumGalleryFailed =>
      'Couldn\'t open the photo library. Please check permissions.';

  @override
  String get forumChooseTour => 'Choose a tour';

  @override
  String get forumJoinedNote => 'You joined';

  @override
  String get forumErrTitle => 'Please enter a post title.';

  @override
  String get forumErrContent => 'Please enter the post content.';

  @override
  String get forumSaving => 'Saving post...';

  @override
  String forumUploadingImage(int index, int total) {
    return 'Uploading photo $index/$total...';
  }

  @override
  String get forumDraftSaved => 'Draft saved.';

  @override
  String get forumSubmitted =>
      'Post submitted. It will appear after moderation.';

  @override
  String get forumEditPost => 'Edit post';

  @override
  String get forumNewPost => 'New post';

  @override
  String get forumFieldTitle => 'Title';

  @override
  String get forumFieldContent => 'Content';

  @override
  String get forumFieldTour => 'Related tour';

  @override
  String get forumTourOptional => 'Choose a tour (optional)';

  @override
  String get forumTourLocked => 'The tour can\'t be changed after posting.';

  @override
  String get forumTourHint => 'Tours you\'ve joined are listed first.';

  @override
  String forumPhotos(int count, int max) {
    return 'Photos ($count/$max)';
  }

  @override
  String get forumModerationNote =>
      'Your post will appear on the forum once a moderator approves it.';

  @override
  String get forumSaveChanges => 'Save changes';

  @override
  String get forumSaveDraft => 'Save draft';

  @override
  String get forumSubmitReview => 'Submit for review';

  @override
  String get forumAddPhotoHint => 'Tap to add photos from your library';

  @override
  String get forumReportPost => 'Report post';

  @override
  String get forumReportDescription => 'Additional details (optional)';

  @override
  String get forumSendReport => 'Send report';

  @override
  String get forumAgree => 'OK';

  @override
  String get forumJoinedTour => 'Joined the tour';

  @override
  String forumModeratorFeedback(String note) {
    return 'Moderator feedback: $note';
  }

  @override
  String get forumDeselect => 'Clear';

  @override
  String get forumListLoadFailed =>
      'Couldn\'t load the list. Please try again later.';

  @override
  String get forumNothingToPick => 'Nothing to choose yet.';

  @override
  String get forumTabDraft => 'Drafts';

  @override
  String get forumTabPending => 'Pending';

  @override
  String get forumTabPublished => 'Published';

  @override
  String get forumTabRevision => 'Needs edits';

  @override
  String get forumTabRejected => 'Rejected';

  @override
  String get forumWrite => 'Write';

  @override
  String get forumPostsLoadFailed => 'Couldn\'t load posts';

  @override
  String get forumMyEmpty => 'You haven\'t posted anything yet';

  @override
  String forumMyEmptyTab(String tab) {
    return 'No posts in \"$tab\"';
  }

  @override
  String get forumMyEmptyHint =>
      'Share your trip experiences so others can explore too.';

  @override
  String get forumDeleteComment => 'Delete comment';

  @override
  String get forumDeleteCommentConfirm => 'Delete this comment?';

  @override
  String get forumDelete => 'Delete';

  @override
  String get forumCommentReported =>
      'Comment reported. Thanks for helping the community.';

  @override
  String get forumReportComment => 'Report comment';

  @override
  String get forumReportCommentHint =>
      'Spam, offensive language, misinformation…';

  @override
  String get forumReportSent =>
      'Report sent. Thanks for helping the community.';

  @override
  String get forumDeletePost => 'Delete post';

  @override
  String get forumDeletePostConfirm =>
      'The post and its comments will be permanently deleted.';

  @override
  String get forumDeletePostShort => 'Delete post';

  @override
  String get forumSentForReview => 'Post sent for moderation.';

  @override
  String get forumPost => 'Post';

  @override
  String get forumOptions => 'Options';

  @override
  String get forumEdit => 'Edit';

  @override
  String get forumResubmit => 'Resubmit for review';

  @override
  String get forumReactionsAfterReview =>
      'The post can receive reactions and comments only after moderation.';

  @override
  String forumComments(int count) {
    return 'Comments ($count)';
  }

  @override
  String get forumNoComments => 'No comments yet. Be the first!';

  @override
  String get forumLoading => 'Loading...';

  @override
  String get forumMoreComments => 'Show more comments';

  @override
  String get forumCommentHint => 'Write a comment...';

  @override
  String get forumSendComment => 'Send comment';

  @override
  String get forumReasonSpam => 'Spam or advertising';

  @override
  String get forumReasonInappropriate => 'Inappropriate content';

  @override
  String get forumReasonHate => 'Hate speech';

  @override
  String get forumReasonFalse => 'False information';

  @override
  String get forumReasonCopyright => 'Copyright violation';

  @override
  String get forumStatusHidden => 'Under review';

  @override
  String get forumStatusDraft => 'Draft';

  @override
  String get forumStatusRevision => 'Needs edits';

  @override
  String get forumAuthorFallback => 'Traveler';

  @override
  String get achCatTour => 'Discovery journeys';

  @override
  String get achCatTourShort => 'Journeys';

  @override
  String get achCatTourDesc => 'Conquer new trips and lands';

  @override
  String get achUnitTour => 'tours';

  @override
  String get achCatCheckin => 'Destination footprints';

  @override
  String get achCatCheckinShort => 'Check-in';

  @override
  String get achCatCheckinDesc => 'GPS check-ins at heritage locations';

  @override
  String get achUnitDestination => 'destinations';

  @override
  String get achCatCulture => 'Culture & knowledge';

  @override
  String get achCatCultureShort => 'Culture';

  @override
  String get achCatCultureDesc => 'Explore heritage stories and quizzes';

  @override
  String get achUnitLesson => 'lessons';

  @override
  String get achCatExperience => 'Experience challenges';

  @override
  String get achCatExperienceShort => 'Experiences';

  @override
  String get achCatExperienceDesc => 'Complete real missions at each stop';

  @override
  String get achUnitMission => 'missions';

  @override
  String get achCatStreak => 'Commitment & loyalty';

  @override
  String get achCatStreakShort => 'Loyalty';

  @override
  String get achCatStreakDesc => 'Keep your passion alive with JourneyGo';

  @override
  String get achUnitMilestone => 'milestones';

  @override
  String get achTierBronze => 'Bronze';

  @override
  String get achTierSilver => 'Silver';

  @override
  String get achTierGold => 'Gold';

  @override
  String get achTierLegendary => 'Legendary';

  @override
  String get achUnitDays => 'days';

  @override
  String get achTitle => 'Achievements & badges';

  @override
  String get achBadgeCollection => 'Badge collection';

  @override
  String get achLoadFailed => 'Couldn\'t load achievements';

  @override
  String get achFilterUnlocked => 'Unlocked';

  @override
  String get achFilterClaimable => 'Ready to claim';

  @override
  String get achAchieved => 'Achievements earned';

  @override
  String get achPoints => 'Achievement points';

  @override
  String achBadgesClaimed(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count badges claimed',
      one: '1 badge claimed',
    );
    return '$_temp0';
  }

  @override
  String get achPending => 'To claim';

  @override
  String get achAllClaimed => 'All claimed';

  @override
  String get achCompleteToUnlock => 'Complete to unlock';

  @override
  String achCategoryProgress(int achieved, int total, int pct) {
    return '$achieved/$total achievements • $pct%';
  }

  @override
  String get achNoMatch => 'No achievements in this category match the filter';

  @override
  String get achNoMatchHint =>
      'Try the \"All\" filter or pick another category to keep tracking your progress.';

  @override
  String get achSeeAllInCategory => 'See all in this category';

  @override
  String get achReady => 'Ready to claim';

  @override
  String achProgress(String current, String target, String unit) {
    return 'Progress: $current/$target $unit';
  }

  @override
  String get achClaiming => 'Claiming...';

  @override
  String get achClaim => 'Claim reward';

  @override
  String get achClaimed => 'Claimed';

  @override
  String get achClaimBarrier => 'Claim achievement reward';

  @override
  String get achUnlockedEyebrow => 'ACHIEVEMENT UNLOCKED';

  @override
  String achBadgeName(String name) {
    return 'Badge: $name';
  }

  @override
  String get achRewardEyebrow => 'REWARD RECEIVED';

  @override
  String achNewBalance(String balance) {
    return 'Current balance: $balance JP';
  }

  @override
  String get achKeepExploring => 'Awesome! Keep exploring';

  @override
  String get bdgLoadFailed => 'Couldn\'t load badges';

  @override
  String get bdgEmpty => 'No badges yet';

  @override
  String get bdgEmptyHint =>
      'Check in at heritage sites to unlock your first badge.';

  @override
  String bdgCount(int earned, int total) {
    return '$earned / $total badges';
  }

  @override
  String get bdgViewProgress => 'View progress & claim achievement rewards';

  @override
  String get bdgLocked => 'Locked';

  @override
  String bdgEarnedOn(String date) {
    return 'Earned on $date';
  }

  @override
  String bdgBonus(String points) {
    return '+$points bonus points';
  }

  @override
  String get mvCopied => 'Voucher code copied';

  @override
  String get mvTitle => 'My vouchers';

  @override
  String mvTabUsable(int count) {
    return 'Available ($count)';
  }

  @override
  String mvTabUsed(int count) {
    return 'Used ($count)';
  }

  @override
  String mvTabExpired(int count) {
    return 'Expired ($count)';
  }

  @override
  String get mvLoadFailed => 'Couldn\'t load your vouchers';

  @override
  String get mvEmptyUsable => 'No vouchers yet';

  @override
  String get mvEmptyUsableHint =>
      'Use your points to redeem vouchers in Rewards.';

  @override
  String get mvEmptyUsed => 'No vouchers used yet';

  @override
  String get mvEmptyUsedHint => 'Vouchers you\'ve used will appear here.';

  @override
  String get mvEmptyExpired => 'No expired vouchers';

  @override
  String get mvEmptyExpiredHint =>
      'Remember to use vouchers before they expire.';

  @override
  String get mvStatusUsable => 'Available';

  @override
  String get mvStatusUsed => 'Used';

  @override
  String get mvStatusExpired => 'Expired';

  @override
  String mvUsedOn(String date) {
    return 'Used $date';
  }

  @override
  String mvExpiredOn(String date) {
    return 'Expired $date';
  }

  @override
  String mvValidUntil(String date) {
    return 'Valid until $date';
  }

  @override
  String get mvCopyCode => 'Copy code';

  @override
  String mvRedeemedFor(String points) {
    return 'Redeemed for $points points';
  }

  @override
  String rwBalanceLeft(String balance) {
    return '$balance left';
  }

  @override
  String get vsConfirmTitle => 'Confirm voucher redemption';

  @override
  String vsConfirmMessage(String points, String title) {
    return 'Use $points points to redeem \"$title\"? Redeemed points can\'t be refunded.';
  }

  @override
  String get vsRedeemNow => 'Redeem now';

  @override
  String get vsSuccessTitle => 'Voucher redeemed';

  @override
  String get vsSuccessSubtitle =>
      'Your code has been saved in \"My vouchers\".';

  @override
  String get vsLoadFailed => 'Couldn\'t load vouchers';

  @override
  String get vsEmpty => 'No vouchers to redeem yet';

  @override
  String get vsEmptyHint => 'New offers will appear here. Check back later.';

  @override
  String get vsYourPoints => 'Your points';

  @override
  String vsMinOrder(String amount) {
    return 'Orders from $amount';
  }

  @override
  String vsMaxDiscount(String amount) {
    return 'Up to $amount off';
  }

  @override
  String vsValidDays(int days) {
    String _temp0 = intl.Intl.pluralLogic(
      days,
      locale: localeName,
      other: 'Use within $days days',
      one: 'Use within 1 day',
    );
    return '$_temp0';
  }

  @override
  String vsRedeemUntil(String date) {
    return 'Redeem by $date';
  }

  @override
  String vsPoints(String points) {
    return '$points pts';
  }

  @override
  String vsNeedMore(String points) {
    return '$points more points needed';
  }

  @override
  String vsRemaining(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count left',
      one: '1 left',
    );
    return '$_temp0';
  }

  @override
  String get vsRedeem => 'Redeem';

  @override
  String get wTitle => 'Points wallet';

  @override
  String get wLoadFailed => 'Couldn\'t load your points wallet';

  @override
  String get wEmpty => 'No point transactions yet';

  @override
  String get wEmptyHint =>
      'Check in at destinations and complete missions to start earning points.';

  @override
  String get wBalance => 'Current balance';

  @override
  String get wPointsUnit => 'points';

  @override
  String get wRedeem => 'Redeem vouchers';

  @override
  String get wMilestoneHint =>
      'Unlock journey milestones to earn more bonus points';

  @override
  String get wHistory => 'Points history';

  @override
  String get badgeTypeCheckin => 'Destination check-in';

  @override
  String get badgeTypeTour => 'Tour completion';

  @override
  String get badgeTypeTask => 'Mission master';

  @override
  String get badgeTypeStreak => 'Streak';

  @override
  String get badgeTypeEvent => 'Special event';

  @override
  String get badgeTypeOther => 'Badge';

  @override
  String get ptxTask => 'Mission completed';

  @override
  String get ptxExperience => 'Experience';

  @override
  String get ptxAchievement => 'Achievement reward';

  @override
  String get ptxAdmin => 'Adjusted by admin';

  @override
  String get ptxVoucherRefund => 'Points returned for expired voucher';

  @override
  String get ptxOther => 'Points transaction';

  @override
  String get voucherOutOfStock => 'Fully redeemed';

  @override
  String get voucherNotStarted => 'Not yet available';

  @override
  String get jsEnded =>
      'This journey has ended. You can revisit the cultural stories you unlocked.';

  @override
  String get jsAlreadyCheckedInCurrent =>
      'You\'ve already checked in at the current destination. Complete its missions to unlock the next one.';

  @override
  String get jsQrTitle => 'QR check-in';

  @override
  String jsQrHint(String place) {
    return 'Scan the QR code at $place';
  }

  @override
  String jsAlreadyCheckedInAt(String place) {
    return 'You\'ve already checked in at $place.';
  }

  @override
  String get jsHeritageBadge => 'Heritage badge';

  @override
  String jsCheckInSuccessAt(String place) {
    return 'Checked in at $place. Cultural content and experiences are now unlocked.';
  }

  @override
  String get jsExplore => 'Explore';

  @override
  String get jsCheckInSuccess =>
      'Checked in. Cultural content and experiences are now unlocked.';

  @override
  String get jsSkipTitle => 'Skip this destination?';

  @override
  String jsSkipMessage(String place) {
    return 'You won\'t receive the badge or points at $place. The journey will continue at the next stop.';
  }

  @override
  String get jsSkip => 'Skip';

  @override
  String get jsNoLocation => 'Couldn\'t get your location';

  @override
  String get jsOpenSettings => 'Open settings';

  @override
  String get jsCompletedJourney => 'You\'ve completed the journey';

  @override
  String get jsAlreadyCheckedInShort => 'You\'re already checked in';

  @override
  String jsCheckedInAllDone(String place) {
    return 'You\'ve checked in at $place and completed the whole journey. No more check-ins needed.';
  }

  @override
  String jsCheckedInContinue(String place) {
    return 'You\'ve already checked in at $place. Keep going with the missions here.';
  }

  @override
  String get jsCannotCheckIn => 'Can\'t check in yet';

  @override
  String get jsRankPerfect => 'Perfect completion';

  @override
  String get jsRankPartial => 'Journey finished';

  @override
  String get jsRankDone => 'Journey completed';

  @override
  String jsCompletedPerfect(String tour, String bonus) {
    return 'You completed all of \"$tour\" and earned $bonus bonus points. Thanks for spreading heritage!';
  }

  @override
  String jsCompletedPartial(String tour) {
    return 'You finished \"$tour\". Thanks for exploring heritage with us!';
  }

  @override
  String get jsViewSummary => 'View summary';

  @override
  String get jsEnableLocation =>
      'Please turn on location and allow access to get directions.';

  @override
  String get jsNoRoute => 'Couldn\'t find a route to this place.';

  @override
  String jsNear500(Object place) {
    return 'Less than 500 m to $place';
  }

  @override
  String get jsAlmostThere => 'Almost there — get ready to check in';

  @override
  String jsArrived(String place) {
    return 'You\'ve arrived at $place';
  }

  @override
  String get jsRoute => 'Route';

  @override
  String get jsMap => 'Map';

  @override
  String get jsHeritageStamps => 'Heritage stamps';

  @override
  String get jsCaptionSkipped => 'Skipped';

  @override
  String get jsCaptionStamped => 'Stamped';

  @override
  String get jsCaptionOpen => 'Open';

  @override
  String jsStopN(int n) {
    return 'Stop $n';
  }

  @override
  String jsStampCount(int done, int total) {
    return '$done/$total stamps';
  }

  @override
  String get jsPointsSuffix => ' pts';

  @override
  String jsHeaderDone(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count stops',
      one: '1 stop',
    );
    return 'Completed · $_temp0';
  }

  @override
  String jsHeaderActive(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count stops',
      one: '1 stop',
    );
    return 'In progress · $_temp0';
  }

  @override
  String get jsNoPointsStop => 'No points for this stop';

  @override
  String jsDoneReview(int points) {
    return 'Done · +$points pts · tap to review';
  }

  @override
  String jsUnlockAfter(int n) {
    return 'Unlocks after stop $n';
  }

  @override
  String jsChallengeCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count challenges',
      one: '1 challenge',
    );
    return '$_temp0';
  }

  @override
  String get jsLocked => 'Locked';

  @override
  String get jsSkippedStatus => 'Skipped';

  @override
  String get jsAtStop => 'You\'re at this stop';

  @override
  String jsAtStopSince(String time) {
    return 'You\'re at this stop · checked in at $time';
  }

  @override
  String jsStopOpenDistance(String distance) {
    return 'Stop open · $distance away';
  }

  @override
  String get jsStopOpen => 'Stop open';

  @override
  String get jsStory => 'Story';

  @override
  String get jsNoChallenges => 'No challenges';

  @override
  String jsChallengeProgress(int done, int total, int points) {
    return '$done/$total challenges · +$points pts';
  }

  @override
  String jsQuizQuestions(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count-question quiz',
      one: '1-question quiz',
    );
    return '$_temp0';
  }

  @override
  String get jsCultureTitle => 'Cultural content';

  @override
  String get jsCultureFallback => 'Stories at this stop';

  @override
  String get jsRead => 'Read';

  @override
  String get jsNew => 'New';

  @override
  String get jsExperienceTitle => 'Experiences';

  @override
  String get jsExperienceFallback => 'Challenges at this stop';

  @override
  String get jsCompletedBadge => 'Completed';

  @override
  String jsCheckInRadiusHint(String radius) {
    return 'Come within $radius m of the destination and check in, or scan the QR code at the entrance, to unlock cultural content and experiences.';
  }

  @override
  String get jsCheckInHint =>
      'Check in when you arrive to unlock cultural content, experiences and the heritage badge.';

  @override
  String get jsDirections => 'Directions';

  @override
  String get jsCheckInStop => 'Check in';

  @override
  String get jsCheckInGps => 'GPS check-in';

  @override
  String get jsScanQr => 'Scan the QR code on site';

  @override
  String get jsScanQrShort => 'Scan QR';

  @override
  String get jsSkipStop => 'Skip this stop';

  @override
  String jsCompleteAll(int count) {
    return 'Complete all $count stops';
  }

  @override
  String get jsCompleteAllHint =>
      'Earn completion points and a trip summary. Skipping any stop forfeits the completion reward.';

  @override
  String jsSkippedNoBonus(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count stops were skipped, so no completion reward.',
      one: '1 stop was skipped, so no completion reward.',
    );
    return '$_temp0';
  }

  @override
  String get jsStatPoints => 'Points';

  @override
  String get jsStatPerfectChallenges => 'Perfect challenges';

  @override
  String get jsStatStops => 'Stops visited';

  @override
  String get jsEndedLabel => 'Journey ended';

  @override
  String jsEndedTitle(int points, int done, int total) {
    return '$points pts · $done/$total stops';
  }

  @override
  String get jsNextStop => 'Next stop';

  @override
  String get jsUnlockedCulture => 'Unlocked · Cultural content';

  @override
  String get jsReadStory => 'Read story';

  @override
  String get jsUnlockedExperience => 'Unlocked · Experiences';

  @override
  String jsChallengesWaiting(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count challenges waiting',
      one: '1 challenge waiting',
    );
    return '$_temp0';
  }

  @override
  String jsDirectionsTo(String place) {
    return 'Directions to $place';
  }

  @override
  String get jsWholeRoute => 'Show the whole route';

  @override
  String get jsWholeTour => 'Show the whole tour';

  @override
  String get jsFollowMe => 'Follow my location';

  @override
  String get jsMyLocation => 'My location';

  @override
  String get jsStreetMap => 'Street map';

  @override
  String get jsSatellite => 'Satellite';

  @override
  String get jsStateAtStop => 'you\'re here';

  @override
  String get jsStateOpen => 'open';

  @override
  String get jsStateSkipped => 'skipped';

  @override
  String get jsStateDone => 'done';

  @override
  String get jsStateLocked => 'locked';

  @override
  String jsChallengesLeft(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count challenges left',
      one: '1 challenge left',
    );
    return '$_temp0';
  }

  @override
  String get jsAllChallengesDone => 'All challenges done';

  @override
  String jsDistanceAway(String distance) {
    return '$distance away';
  }

  @override
  String get jsArriveToCheckIn => 'Arrive to check in';

  @override
  String get jsNoPointsHere => 'No points at this stop';

  @override
  String jsStopState(int n, String state) {
    return 'Stop $n · $state';
  }

  @override
  String get jsViewStop => 'View stop';

  @override
  String get jsLoadFailed => 'Couldn\'t load the journey.';

  @override
  String jsOpenTile(String title) {
    return 'Open $title';
  }

  @override
  String jsTileLocked(String title) {
    return '$title, check in to unlock';
  }

  @override
  String jsCheckInToUnlock(String info) {
    return 'Check in to unlock\n$info';
  }

  @override
  String get tkMapsFailed => 'Couldn\'t open the maps app.';

  @override
  String get tkQrMismatchActivity =>
      'This QR code doesn\'t match this activity point. Please scan the code on site.';

  @override
  String get tkQrMismatchStop =>
      'This QR code doesn\'t match this stop. Please try again.';

  @override
  String get tkQrConfirmTitle => 'Scan QR to confirm completion';

  @override
  String get tkQrStopTitle => 'Scan QR at the stop';

  @override
  String tkQrAtPlace(String place) {
    return 'Scan the QR code at $place';
  }

  @override
  String get tkQrNextStop => 'Scan the QR code at the next stop';

  @override
  String get tkCheckedIn => 'Checked in!';

  @override
  String get tkNoLocation =>
      'Couldn\'t determine your location. Turn on GPS and try again.';

  @override
  String tkTooFarToCheckIn(String distance, String radius) {
    return 'You\'re $distance from the stop. Get within $radius m to check in.';
  }

  @override
  String tkTimeUpTitle(String name) {
    return 'Time\'s up: $name';
  }

  @override
  String tkTimeUpBody(String place) {
    return 'Scan the QR code at $place to answer the question and earn points.';
  }

  @override
  String get tkTimeUp => 'Time\'s up!';

  @override
  String tkPlusPoints(int points) {
    return '+$points pts';
  }

  @override
  String tkLeg(int current, int total) {
    return 'Stage $current/$total';
  }

  @override
  String get tkClue => 'Clue';

  @override
  String get tkGotIt => 'Got it';

  @override
  String get tkLoadFailed => 'Couldn\'t load the mission.';

  @override
  String get tkFieldMission => 'Real-world experience';

  @override
  String get tkHeritageQuiz => 'Heritage quiz';

  @override
  String get tkQuestionsLabel => 'questions';

  @override
  String get tkBonusLabel => 'bonus points';

  @override
  String get tkAttemptsLabel => 'attempts left';

  @override
  String get tkRules => 'Rules';

  @override
  String get tkRuleAllCorrect =>
      'Answer every question correctly to earn the full reward (once only).';

  @override
  String get tkRuleLocation =>
      'Each question is tied to a location. You need to be within the stop\'s radius to open it.';

  @override
  String get tkRuleRestart =>
      'One wrong answer and you\'ll start again from the first question.';

  @override
  String tkRuleRetry(int max) {
    return 'If you don\'t get them all right, you can retry while attempts remain (up to $max).';
  }

  @override
  String get tkMissionDone => 'You\'ve completed this mission.';

  @override
  String get tkNoAttempts => 'You have no attempts left for this mission.';

  @override
  String get tkDirectionsToStop => 'Directions to the stop';

  @override
  String get tkRetryMission => 'Retry mission';

  @override
  String get tkStartMission => 'Start mission';

  @override
  String get tkInProgressTitle => 'In progress';

  @override
  String tkInProgressSummary(int answered, int total, int correct, int points) {
    return 'Answered $answered/$total · $correct correct · +$points pts';
  }

  @override
  String tkContinueFromQuestion(int number) {
    return 'Continue from question $number';
  }

  @override
  String get tkExitConfirmTitle => 'Leave this mission?';

  @override
  String get tkExitConfirmBody =>
      'Your progress is saved — you can continue later.';

  @override
  String get tkExitActivityBody =>
      'The timer keeps running — you can come back any time.';

  @override
  String get tkStay => 'Stay';

  @override
  String get tkExit => 'Leave';

  @override
  String get tkEarlierAnswered =>
      'Earlier questions were answered in a previous session';

  @override
  String tkQuestionsProgress(int answered, int total) {
    return '$answered/$total questions';
  }

  @override
  String get tkViewClue => 'View clue';

  @override
  String get tkStages => 'Stages';

  @override
  String tkStagesDone(int done, int total) {
    return '$done/$total completed';
  }

  @override
  String tkUnlockAfterStage(int n) {
    return 'Unlocks after stage $n';
  }

  @override
  String get tkLocating => 'Finding your location...';

  @override
  String get tkNoPosition => 'No location yet';

  @override
  String get tkArrivedReady =>
      'You\'ve reached the stop — ready to open the question';

  @override
  String tkDistanceRadius(String distance, String radius) {
    return '$distance away · $radius m radius';
  }

  @override
  String tkStageAt(int n, String place) {
    return 'Stage $n · $place';
  }

  @override
  String get tkRefreshDistance => 'Refresh distance';

  @override
  String get tkShowBoth => 'Show you and the stop';

  @override
  String tkStopOf(int current, int total) {
    return 'Stop $current/$total';
  }

  @override
  String get tkLocatingYou => 'Finding your location...';

  @override
  String tkTooFarToWalk(String eta) {
    return 'Quite far to walk$eta. Take a vehicle closer, then walk to the stop.';
  }

  @override
  String tkWalkRoute(String duration) {
    return 'Walk ~$duration along the route on the map';
  }

  @override
  String tkTurnHeading(String turn, String direction) {
    return '$turn · heading $direction';
  }

  @override
  String tkHeadTo(String direction) {
    return 'Head $direction';
  }

  @override
  String get tkArrivedAtStop => 'You\'ve reached the stop';

  @override
  String get tkCheckedInPressStart => 'Checked in · tap \"Start mission\"';

  @override
  String get tkPressCheckIn => 'Tap \"Check-in\" to confirm you\'ve arrived';

  @override
  String get tkOpeningQuestion => 'Opening the question...';

  @override
  String get tkQuestionAutoOpen => 'The question will open automatically';

  @override
  String tkRadius(String radius) {
    return '$radius m radius';
  }

  @override
  String get tkOpenLocationSettings => 'Open location settings';

  @override
  String tkStartMissionTimed(String duration) {
    return 'Start mission · $duration';
  }

  @override
  String get tkCheckInAtStop => 'Check in at the stop';

  @override
  String get tkNotAtStop => 'Not at the stop yet';

  @override
  String tkNotAtStopDistance(String distance) {
    return 'Not at the stop yet · $distance to go';
  }

  @override
  String get tkOpenQuestion => 'Open question';

  @override
  String get tkGoogleMaps => 'Get directions in Google Maps';

  @override
  String get tkCheckLocation => 'Check location';

  @override
  String get tkNextStop => 'Next stop';

  @override
  String get tkNextPlace => 'Next location';

  @override
  String get tkFindQr =>
      'Find the QR code at the stop and scan it to open the question.';

  @override
  String get tkStartActivity => 'Start activity';

  @override
  String get tkActivityDone =>
      'Activity done! Scan the QR code on site to answer the question.';

  @override
  String get tkActivityInProgress =>
      'Do the activity on site. When time\'s up, you\'ll scan the QR code.';

  @override
  String tkCorrectReward(int points) {
    return 'Answer correctly to earn +$points pts';
  }

  @override
  String get tkScanQrOnSite => 'Scan the QR code on site';

  @override
  String get tkSkipCountdownDev => 'Skip countdown (dev)';

  @override
  String get tkNoQuestions => 'This mission has no questions yet.';

  @override
  String tkQuestionOf(int current, int total) {
    return 'Question $current / $total';
  }

  @override
  String tkAtPlace(String place) {
    return 'At: $place';
  }

  @override
  String get tkConfirmAnswer => 'Confirm answer';

  @override
  String get tkSubmit => 'Submit';

  @override
  String get tkNextQuestion => 'Next question';

  @override
  String get tkAnswerHint => 'Type your answer...';

  @override
  String get tkExcellent => 'Excellent!';

  @override
  String get tkCompleted => 'Completed!';

  @override
  String get tkSubmitted => 'Submitted';

  @override
  String tkResultScore(int correct, int total, String name) {
    return 'You got $correct/$total right in \"$name\".';
  }

  @override
  String tkMissionCompleted(String name) {
    return 'You\'ve completed the mission \"$name\".';
  }

  @override
  String get tkCorrect => 'Correct!';

  @override
  String tkCorrectSoFar(int current, int total) {
    return 'You\'ve answered $current/$total correctly. Head to the next location to open the next question.';
  }

  @override
  String get tkIncorrect => 'Not quite';

  @override
  String tkRetryInfo(int correct, int total, int attempts) {
    return 'You got $correct/$total right. All answers must be correct to earn points. $attempts retries left.';
  }

  @override
  String tkBonusPoints(int points) {
    return '+$points bonus points';
  }

  @override
  String get tkGoNextPlace => 'Go to the next location';

  @override
  String get tkRetry => 'Try again';

  @override
  String get tkBackToJourney => 'Back to journey';

  @override
  String get navArrived => 'You\'ve arrived';

  @override
  String get navRerouting => 'Rerouting…';

  @override
  String get navOffRoute => 'You\'ve left the suggested route';

  @override
  String get navStart => 'Start';

  @override
  String navContinueFor(String distance) {
    return 'Continue for $distance';
  }

  @override
  String navTo(String place) {
    return 'To $place';
  }

  @override
  String get navThen => 'Then';

  @override
  String navArrivedAtStop(String n) {
    return 'ARRIVED AT STOP $n';
  }

  @override
  String navRouteToStop(String n) {
    return 'ROUTE TO STOP $n';
  }

  @override
  String get navEnd => 'End navigation';

  @override
  String get navFinding => 'Finding a route…';

  @override
  String get navNoRoute => 'No route found';

  @override
  String navArriveAt(String time) {
    return 'Arrive at $time';
  }

  @override
  String get navOnTheWay => 'ON THE WAY';

  @override
  String get navCheckInHint =>
      'Check in to unlock cultural content and experiences at this stop.';

  @override
  String get navSteps => 'Steps';

  @override
  String navViewSteps(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: 'View $count direction steps',
      one: 'View 1 direction step',
    );
    return '$_temp0';
  }

  @override
  String get navOpenGoogleMaps => 'Open Google Maps (with voice)';

  @override
  String get navDirectionSteps => 'Direction steps';

  @override
  String get navGoStraight => 'Continue';

  @override
  String get navWalk => 'Walk';

  @override
  String get navBike => 'Two-wheeler';

  @override
  String get navCar => 'Car';

  @override
  String get compassN => 'north';

  @override
  String get compassNE => 'northeast';

  @override
  String get compassE => 'east';

  @override
  String get compassSE => 'southeast';

  @override
  String get compassS => 'south';

  @override
  String get compassSW => 'southwest';

  @override
  String get compassW => 'west';

  @override
  String get compassNW => 'northwest';

  @override
  String get turnStraight => 'Go straight';

  @override
  String get turnBack => 'Turn back';

  @override
  String get turnRight => 'Turn right';

  @override
  String get turnLeft => 'Turn left';

  @override
  String get mapCredit => 'Map: © Goong';

  @override
  String get sumPerfectTitle => 'Perfect completion';

  @override
  String get sumPerfectSubtitle =>
      'You conquered every destination and aced every challenge.';

  @override
  String sumPartialSubtitle(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: 'You skipped $count destinations.',
      one: 'You skipped 1 destination.',
    );
    return '$_temp0 Next time, visit them all to earn the completion reward.';
  }

  @override
  String get sumDoneSubtitle =>
      'You visited every destination. A few challenges weren\'t perfect — try again next trip!';

  @override
  String get sumTitle => 'Journey summary';

  @override
  String get sumPointsEarned => 'points earned';

  @override
  String get sumDestinationsVisited => 'destinations visited';

  @override
  String get sumPerfectChallenges => 'perfect challenges';

  @override
  String get sumDuration => 'time spent';

  @override
  String get sumRoute => 'Route taken';

  @override
  String get sumEachDestination => 'Each destination';

  @override
  String get sumShare => 'Share achievement';

  @override
  String get sumReview => 'Review journey';

  @override
  String sumBonus(String bonus, int total) {
    return 'Completion reward: +$bonus pts (included in the $total pts total)';
  }

  @override
  String get sumNoBonus =>
      'No completion reward because some destinations were skipped.';

  @override
  String sumDestinationN(int n, String name) {
    return 'Stop $n · $name';
  }

  @override
  String sumDestinationStats(int done, int total, int points) {
    return '$done/$total missions · +$points pts';
  }

  @override
  String get sumNoAttempts => 'No attempts left';

  @override
  String get shareImageFailed => 'Couldn\'t create the image';

  @override
  String shareText(String tour, int points, int done, int total) {
    return 'I just completed \"$tour\" with JourneyGo: $points points, $done/$total heritage stops!';
  }

  @override
  String get shareSubject => 'My heritage journey with JourneyGo';

  @override
  String get shareFailed => 'Couldn\'t share the image. Please try again.';

  @override
  String get shareImage => 'Share image';

  @override
  String get shareRankPerfect => 'PERFECT COMPLETION';

  @override
  String get shareRankPartial => 'JOURNEY FINISHED';

  @override
  String get shareRankDone => 'JOURNEY COMPLETED';

  @override
  String get shareStatPoints => 'points';

  @override
  String get shareStatStops => 'stops';

  @override
  String get shareStatChallenges => 'challenges';

  @override
  String shareStamps(int count) {
    return 'HERITAGE STAMPS · $count';
  }

  @override
  String get shareFooter =>
      'Explore Vietnamese heritage with JourneyGo · journeygo.id.vn';

  @override
  String get seInZone => 'you\'re in the zone';

  @override
  String seDistance(String distance) {
    return '$distance away';
  }

  @override
  String seStopHeader(String n, String name) {
    return 'STOP $n  ·  $name';
  }

  @override
  String get seHeadline => 'Discover heritage hands-on';

  @override
  String get seMapHint =>
      'Tap a number on the map to open an activity. You can start it once you\'re inside its circle.';

  @override
  String get seNoChallenges => 'This stop has no challenges.';

  @override
  String get seAllDone => 'All challenges completed';

  @override
  String get seDone => 'Challenges done';

  @override
  String get seAnyOrder =>
      'Do them in any order. Real-world experiences require scanning the on-site QR code to confirm.';

  @override
  String get sePartial => 'Partly correct';

  @override
  String get seNoAttempts => 'No attempts left';

  @override
  String seAttempts(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count attempts',
      one: '1 attempt',
    );
    return '$_temp0';
  }

  @override
  String get seNotStarted => 'Not started';

  @override
  String get seCulturalQuiz => 'Cultural quiz';

  @override
  String get seFieldActivity => 'Real-world experience';

  @override
  String get seLocationPuzzle => 'Location puzzle';

  @override
  String get seChallenge => 'Challenge';

  @override
  String seQuestions(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count questions',
      one: '1 question',
    );
    return '$_temp0';
  }

  @override
  String get seScanQr => 'scan QR on site';

  @override
  String seChallengeHeader(String n, String kind) {
    return 'CHALLENGE $n  ·  $kind';
  }

  @override
  String seMaxPoints(int max) {
    return 'Up to +$max pts';
  }

  @override
  String seEarnedPoints(int earned, String max) {
    return '+$earned$max pts';
  }

  @override
  String scStopHeader(String n) {
    return 'STOP $n  ·  CULTURAL CONTENT';
  }

  @override
  String get scVideo => 'Narrated video';

  @override
  String get scImages => 'Images';

  @override
  String scImageCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count photos',
      one: '1 photo',
    );
    return '$_temp0';
  }

  @override
  String scArtifactCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count artifacts',
      one: '1 artifact',
    );
    return '$_temp0';
  }

  @override
  String get scNoContent =>
      'The partner hasn\'t added cultural content for this stop yet.';

  @override
  String scViewImage(int n) {
    return 'View image $n';
  }

  @override
  String scArtifactNumber(String n) {
    return 'ARTIFACT NO. $n';
  }

  @override
  String get scHasVideo => 'Has video';

  @override
  String get scToExperience => 'Go to experiences';

  @override
  String get scBackToRoute => 'Back to route';

  @override
  String get qrTitle => 'Scan QR code';

  @override
  String get qrHint => 'Fit the destination\'s QR code in the frame';

  @override
  String get qrNoPermission =>
      'The app doesn\'t have camera permission. Grant it in Settings, or enter the code manually below.';

  @override
  String get qrCameraFailed =>
      'Couldn\'t open the camera. You can enter the code manually below.';

  @override
  String get qrSlowCamera =>
      'Camera slow to open? You can enter the code printed under the QR.';

  @override
  String get qrScanned => 'SCANNED';

  @override
  String get qrTorchOff => 'Light off';

  @override
  String get qrTorchOn => 'Flashlight';

  @override
  String get qrEnterCode => 'Enter code';

  @override
  String get qrEnterPrintedCode => 'Enter the code printed under the QR';

  @override
  String get qrCodeHelper =>
      'Destination codes start with JGS-, activity codes start with JGE-';

  @override
  String get qrConfirmCode => 'Confirm code';

  @override
  String hpStopLabel(String n) {
    return 'STOP $n';
  }

  @override
  String hpStampSemantics(String label, String name) {
    return 'Stamp $label, $name';
  }

  @override
  String hpStampCount(int stamped, int total) {
    return '$stamped/$total stamps';
  }

  @override
  String get hpNoStops => 'This journey has no stops yet.';

  @override
  String get hpHint =>
      'Check in at each stop (GPS or the QR code at the entrance) to earn another stamp.';

  @override
  String get hpStamped => 'Stamped';

  @override
  String get hpStampedTitle => 'Stamp collected!';

  @override
  String get hpUnlocked => 'Cultural content and experiences unlocked';

  @override
  String get hcCold => 'Cold · still far';

  @override
  String get hcCool => 'Cool · getting closer';

  @override
  String get hcWarm => 'Warm · very close';

  @override
  String get hcHot => 'Hot! Right around here';

  @override
  String get hcArrived => 'Checkpoint reached';

  @override
  String get rwAwesome => 'Awesome';

  @override
  String get rwBadgeUnlockBarrier => 'Badge unlocked';

  @override
  String get rwNewBadge => 'New badge unlocked';

  @override
  String cmActivity(String n, String name) {
    return 'Activity $n: $name';
  }

  @override
  String get cmShowAll => 'Show all';

  @override
  String get cmLegendZone => ' Destination zone   ';

  @override
  String get cmLegendActivity => ' Activity';

  @override
  String get jlNoActiveJourney =>
      'You don\'t have a journey in progress. Book a tour and tap \"Start experience\".';

  @override
  String get jsvcCheckInInvalid =>
      'The server returned an invalid check-in result.';

  @override
  String get jsvcCheckpointInvalid =>
      'The server returned an invalid checkpoint map.';

  @override
  String get jsvcCultureInvalid =>
      'The server returned invalid cultural content.';

  @override
  String get jsvcTaskInvalid => 'The server returned invalid mission content.';

  @override
  String get jsvcClueFailed => 'Couldn\'t get the clue.';

  @override
  String get jsvcSubmitInvalid =>
      'The server returned an invalid submission result.';

  @override
  String get jsvcJourneyInvalid => 'The server returned invalid journey data.';

  @override
  String get tjTask => 'Mission';

  @override
  String get tjDestination => 'Destination';

  @override
  String get tjJourney => 'Journey';

  @override
  String get tjActivity => 'Activity';

  @override
  String get progCheckedIn => 'Checked in';

  @override
  String get locGpsOff =>
      'GPS is off. Turn on location to verify your position.';

  @override
  String get locPermissionNeeded =>
      'You need to allow location access to check in at destinations.';

  @override
  String get locPermissionBlocked =>
      'Location permission is blocked. Please re-enable it in the app\'s settings.';

  @override
  String get locUnknown =>
      'Couldn\'t determine your location. Move to an open area and try again.';

  @override
  String destLoadFailed(String id) {
    return 'Couldn\'t load destination #$id. Please check your connection and try again.';
  }

  @override
  String get ccAudio => 'Audio guide';

  @override
  String get ccVideo => 'Documentary video';

  @override
  String get ccStory => 'Legend';

  @override
  String get ccImage => 'Images';

  @override
  String get cc3d => '3D model / VR';

  @override
  String get ccArticle => 'Heritage article';

  @override
  String get ccNone => 'This destination has no approved cultural stories yet.';

  @override
  String ccUnlockOnCheckIn(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: 'Unlock $count items by checking in at the destination',
      one: 'Unlock 1 item by checking in at the destination',
    );
    return '$_temp0';
  }

  @override
  String get ccAudioFailed => 'Couldn\'t open the audio guide.';

  @override
  String get ccListen => 'Listen to audio guide';

  @override
  String get ccHasAudio => 'Audio guide available';

  @override
  String ccSeeAll(int count) {
    return 'See all $count cultural items';
  }

  @override
  String ccLockedCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count cultural items',
      one: '1 cultural item',
    );
    return '$_temp0 · unlocks on check-in';
  }

  @override
  String get ccMediaFailed => 'Couldn\'t open the media content.';

  @override
  String get ccWatchVideo => 'Watch video';

  @override
  String get ccOpen => 'Open content';

  @override
  String ccGallery(int count) {
    return 'Images ($count)';
  }

  @override
  String get ccOpenFailed => 'Couldn\'t open the content.';

  @override
  String get expFallbackTitle => 'Heritage experience';

  @override
  String get payLauncherExpired => 'The payment window has expired.';

  @override
  String get payAwaitingConfirmation => 'Waiting for payment confirmation...';

  @override
  String get payInvalidData => 'The server returned invalid payment data.';

  @override
  String get paySyncCancelled => 'You cancelled the payment.';

  @override
  String get paySyncAlreadyProcessed =>
      'This transaction was already processed.';

  @override
  String get tourNotFound => 'Tour not found.';

  @override
  String get videoPlayIntro => 'Play intro video';

  @override
  String get videoCannotPlay => 'This video can\'t be played in the app';

  @override
  String get videoOpenExternal => 'Open in another app';

  @override
  String photoViewOf(int index, int total) {
    return 'View photo $index of $total';
  }

  @override
  String photoCredit(String credit) {
    return 'Photo: $credit';
  }

  @override
  String photoSource(String credit) {
    return 'Photo source: $credit';
  }

  @override
  String get navCheckInNow => 'Check in now';

  @override
  String get rfTier7DaysPlus => '7 or more days before';

  @override
  String get rfTier3To6Days => '3 to 6 days (72 hours – 6 days)';

  @override
  String get rfTierUnder72Hours => 'Under 72 hours (3 days)';

  @override
  String rfRefundRate(String rate) {
    return 'Refund $rate';
  }

  @override
  String get homeAiGuideTitle => 'AI Virtual Guide';

  @override
  String get homeAiGuideSubtitle =>
      'Cultural & historical Q&A and smart task hints';

  @override
  String get aiAskButton => 'Ask AI';

  @override
  String get aiHintButton => 'AI Hint';

  @override
  String get aiSuggestHint1 => 'Give me a hint on what to observe';

  @override
  String get aiSuggestHint2 => 'What details around here should I notice?';

  @override
  String get aiSuggestHint3 => 'Give me a small clue, please';

  @override
  String aiSuggestDestHistory(String name) {
    return 'Tell me about the history of $name';
  }

  @override
  String get aiSuggestHeritage => 'Introduce the cultural heritage highlights';

  @override
  String get aiSuggestArchitecture =>
      'What is special about the architecture here?';

  @override
  String get aiSuggestVisitTips =>
      'What should I keep in mind when visiting here?';

  @override
  String get aiErrInit => 'Couldn\'t start the AI chat session.';

  @override
  String get aiErrRequestHuman =>
      'Couldn\'t request live chat with an Admin or Moderator.';

  @override
  String get aiErrReturnAi => 'Couldn\'t switch back to the AI Guide.';

  @override
  String get aiErrSend => 'Couldn\'t reach the AI Guide. Please try again.';

  @override
  String get aiEndHumanTitle => 'End live support?';

  @override
  String get aiCancelWaitTitle => 'Cancel support request?';

  @override
  String get aiEndHumanBody =>
      'Are you sure you want to end the chat with support staff and return to the AI Guide?';

  @override
  String get aiCancelWaitBody =>
      'You\'re currently waiting for support staff. Returning to AI will cancel this request. Are you sure?';

  @override
  String get aiKeepChatting => 'Keep chatting';

  @override
  String get aiKeepWaiting => 'Keep waiting';

  @override
  String get aiEndAndReturnAi => 'End & return to AI';

  @override
  String get aiCancelAndReturnAi => 'Cancel & return to AI';

  @override
  String get aiSenderName => 'AI Guide';

  @override
  String get aiHeaderHintTitle => 'AI Hint Assistant';

  @override
  String get aiHeaderGuideTitle => 'AI Guide';

  @override
  String get aiHistoryTooltip => 'Chat history';

  @override
  String get aiNewChatTooltip => 'New chat';

  @override
  String aiChattingWithStaff(String role, String name) {
    return 'Chatting with $role: $name';
  }

  @override
  String aiChattingWithRole(String role) {
    return 'Chatting with $role';
  }

  @override
  String get aiHumanSubtitle => 'Live support from a team member';

  @override
  String get aiWaitingTitle => 'Waiting for an Admin / Moderator';

  @override
  String get aiWaitingSubtitle => 'You can still send messages while waiting';

  @override
  String get aiDefaultTaskName => 'Experience challenge';

  @override
  String get aiDefaultDestName => 'Heritage Q&A & support';

  @override
  String get aiHintBannerSubtitle => 'Smart hint mode · No spoilers';

  @override
  String get aiGuideBannerSubtitle =>
      'Virtual guide powered by verified heritage data';

  @override
  String get aiReturnToAiBtn => 'Back to AI';

  @override
  String get aiChatHumanBtn => 'Chat Support';

  @override
  String get aiEmptyHintTitle => 'Need a clue for this challenge?';

  @override
  String get aiEmptyGuideTitle => 'Hello! How can I help you today?';

  @override
  String get aiEmptyHintBody =>
      'Ask me for observation hints on site. I\'ll guide you to find the answer yourself!';

  @override
  String get aiEmptyGuideBody =>
      'Ask about history, cultural stories, architecture, or exploration tips at this stop.';

  @override
  String get aiHumanBadge => 'LIVE AGENT';

  @override
  String get aiSendingMessage => 'Sending message...';

  @override
  String get aiThinking => 'AI is thinking...';

  @override
  String get aiInputHintHuman => 'Message Admin / Moderator directly...';

  @override
  String get aiInputHintTask => 'Ask for a task hint...';

  @override
  String get aiInputHintGuide => 'Ask about history, architecture, or tips...';

  @override
  String get aiHistoryTitle => 'AI Chat History';

  @override
  String get aiHistoryEmpty => 'No chat sessions yet.';

  @override
  String aiDestinationFallback(int id) {
    return 'Destination #$id';
  }

  @override
  String get aiGeneralQa => 'General Q&A';

  @override
  String get aiStatusWaiting => 'Waiting for staff';

  @override
  String get aiStatusLive => 'Live chat';

  @override
  String aiSessionSubtitle(String status, int count) {
    return '$status · $count messages';
  }

  @override
  String aiViewTour(int id) {
    return 'View tour #$id';
  }

  @override
  String tripsAtStop(int current, int total) {
    return 'At stop $current/$total';
  }

  @override
  String tripsUnfinishedRemaining(String date, int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count more stops',
      one: '1 more stop',
    );
    return 'Started $date · $_temp0 to finish.';
  }

  @override
  String seFailedLeft(int count) {
    return 'Not passed · $count left';
  }

  @override
  String get seDirections => 'Directions';

  @override
  String seFarFromActivity(String distance) {
    return 'Nearest activity is $distance away';
  }

  @override
  String get tkReviewTitle => 'Review answers';

  @override
  String tkReviewCorrectAnswer(String answer) {
    return 'Correct answer: $answer';
  }

  @override
  String tkReviewYourAnswer(String answer) {
    return 'Your answer: $answer';
  }

  @override
  String get tkReviewNoAnswer => '(no answer)';

  @override
  String get tkReviewWhy => 'Why?';

  @override
  String jsGoalRemaining(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count more stops',
      one: '1 more stop',
    );
    return '$_temp0 to earn the completion bonus and trip summary';
  }

  @override
  String get jsGoalLost =>
      'A stop was skipped, so this trip no longer earns the completion bonus — keep going to collect points.';

  @override
  String get tkOrderingHint =>
      'Hold and drag to put the items in the right order, top to bottom';

  @override
  String get tkNumberHint => 'Drag the slider or tap − / + to choose';

  @override
  String get tkNumberNotChosen => 'Not chosen';

  @override
  String get tkSeeResult => 'See results';

  @override
  String get tkAnswer => 'Answer';

  @override
  String get tkUnsupportedQuestion =>
      'New question type — please update the app to answer.';

  @override
  String tkNumberOff(int diff) {
    return '$diff off';
  }

  @override
  String tkImageOption(String letter) {
    return 'Image $letter';
  }

  @override
  String get tkRevealCorrect => 'Correct!';

  @override
  String get tkRevealWrong => 'Not quite';

  @override
  String get tkCorrectOrder => 'Correct order';

  @override
  String get scStory => 'View as story';

  @override
  String get scStoryEndTitle => 'Ready for the challenge?';

  @override
  String get scStoryEndBody =>
      'You have finished this stop\'s story. Time to test what you learned!';

  @override
  String get scReadAll => 'Read in full';

  @override
  String get scStoryArtifact => 'Artifact';

  @override
  String get scStoryClose => 'Close story';

  @override
  String get scThenNowTitle => 'Then and now';

  @override
  String get scThenNowNow => 'Now';

  @override
  String get scThenNowThen => 'Then';

  @override
  String get scThenNowHint => 'Drag the line to compare';

  @override
  String scThenNowCredit(String credit) {
    return 'Archive photo: $credit';
  }

  @override
  String get tkMatchingHint =>
      'Tap an item in Column A, then tap its match in Column B. All pairs must be correct to earn points.';

  @override
  String get tkMatchingColA => 'Column A';

  @override
  String get tkMatchingColB => 'Column B';

  @override
  String get tkMatchingTapZoom => 'Tap image to zoom';

  @override
  String get tkMatchingCorrectPairs => 'Correct pairs';

  @override
  String get tkMatchingClear => 'Unlink';
}
