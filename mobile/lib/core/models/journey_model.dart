class JourneyTimelineItem {
  final String id;
  final String siteName;
  final String location;
  final String checkinDate;
  final String method; // "QR Code Scan" | "GPS Check-in"
  final String rewardPoints;
  final String photoUrl;
  final String caption;
  final double lat;
  final double lng;

  JourneyTimelineItem({
    required this.id,
    required this.siteName,
    required this.location,
    required this.checkinDate,
    required this.method,
    required this.rewardPoints,
    required this.photoUrl,
    required this.caption,
    required this.lat,
    required this.lng,
  });

  factory JourneyTimelineItem.fromJson(Map<String, dynamic> json) {
    return JourneyTimelineItem(
      id: json['id']?.toString() ?? '',
      siteName: json['siteName']?.toString() ?? '',
      location: json['location']?.toString() ?? '',
      checkinDate: json['checkinDate']?.toString() ?? '',
      method: json['method']?.toString() ?? 'GPS Check-in',
      rewardPoints: json['rewardPoints']?.toString() ?? '+100 pts',
      photoUrl: json['photoUrl']?.toString() ?? 'assets/images/vanmieu.png',
      caption: json['caption']?.toString() ?? '',
      lat: json['lat'] is num ? (json['lat'] as num).toDouble() : 21.0277,
      lng: json['lng'] is num ? (json['lng'] as num).toDouble() : 105.8351,
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'siteName': siteName,
    'location': location,
    'checkinDate': checkinDate,
    'method': method,
    'rewardPoints': rewardPoints,
    'photoUrl': photoUrl,
    'caption': caption,
    'lat': lat,
    'lng': lng,
  };
}

class BadgeItem {
  final String id;
  final String name;
  final String imageUrl;
  final String earnedAt;
  final String category;
  final String description;
  final bool isUnlocked;

  BadgeItem({
    required this.id,
    required this.name,
    required this.imageUrl,
    required this.earnedAt,
    required this.category,
    required this.description,
    this.isUnlocked = true,
  });

  factory BadgeItem.fromJson(Map<String, dynamic> json) {
    return BadgeItem(
      id: json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? '',
      imageUrl: json['imageUrl']?.toString() ?? 'assets/images/vanmieu.png',
      earnedAt: json['earnedAt']?.toString() ?? '',
      category: json['category']?.toString() ?? '',
      description: json['description']?.toString() ?? '',
      isUnlocked: json['isUnlocked'] == true || json['isUnlocked'] == null,
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'name': name,
    'imageUrl': imageUrl,
    'earnedAt': earnedAt,
    'category': category,
    'description': description,
    'isUnlocked': isUnlocked,
  };
}

class ActiveMission {
  final String id;
  final String siteName;
  final String title;
  final int rewardPoints;
  final String question;
  final List<String> options;
  final int correctIndex;
  final String explanation;
  bool isCompleted;

  ActiveMission({
    required this.id,
    required this.siteName,
    required this.title,
    required this.rewardPoints,
    required this.question,
    required this.options,
    required this.correctIndex,
    required this.explanation,
    this.isCompleted = false,
  });

  factory ActiveMission.fromJson(Map<String, dynamic> json) {
    return ActiveMission(
      id: json['id']?.toString() ?? '',
      siteName: json['siteName']?.toString() ?? '',
      title: json['title']?.toString() ?? '',
      rewardPoints: json['rewardPoints'] is num ? (json['rewardPoints'] as num).toInt() : 50,
      question: json['question']?.toString() ?? '',
      options: (json['options'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? [],
      correctIndex: json['correctIndex'] is num ? (json['correctIndex'] as num).toInt() : 0,
      explanation: json['explanation']?.toString() ?? '',
      isCompleted: json['isCompleted'] == true,
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'siteName': siteName,
    'title': title,
    'rewardPoints': rewardPoints,
    'question': question,
    'options': options,
    'correctIndex': correctIndex,
    'explanation': explanation,
    'isCompleted': isCompleted,
  };
}
