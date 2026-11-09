import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/core/services/catalog_service.dart';
import 'package:mobile/screens/common/photo.dart';

void main() {
  group('CatalogItem', () {
    test('reads image and credit', () {
      final item = CatalogItem.fromJson({
        'id': 3,
        'name': 'Làng nghề truyền thống',
        'slug': 'lang-nghe-truyen-thong',
        'imageUrl': 'https://res.cloudinary.com/demo/image/upload/v1/journeygo/catalog/a.jpg',
        'imageCredit': ' Steven C. Price · CC BY-SA 4.0 ',
      });
      expect(item.imageUrl, startsWith('https://'));
      expect(item.imageCredit, 'Steven C. Price · CC BY-SA 4.0');
    });

    test('ignores non-https image and blank credit', () {
      final item = CatalogItem.fromJson({'id': 1, 'name': 'Miền Bắc', 'slug': 'mien-bac', 'imageUrl': 'http://x/a.jpg', 'imageCredit': ''});
      expect(item.imageUrl, isNull);
      expect(item.imageCredit, isNull);
    });
  });

  group('sizedImageUrl', () {
    test('adds Cloudinary resize params once', () {
      const url = 'https://res.cloudinary.com/demo/image/upload/v1/journeygo/tours/a.jpg';
      final sized = sizedImageUrl(url, 300);
      expect(sized, 'https://res.cloudinary.com/demo/image/upload/w_400,c_limit,q_auto,f_auto/v1/journeygo/tours/a.jpg');
      // Đã có tham số thì giữ nguyên
      expect(sizedImageUrl(sized, 300), sized);
    });

    test('uses the 500px Wikimedia thumbnail for small boxes', () {
      const url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ac/X.jpg/960px-X.jpg';
      expect(sizedImageUrl(url, 400), 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ac/X.jpg/500px-X.jpg');
      expect(sizedImageUrl(url, 900), url);
    });

    test('leaves other hosts alone', () {
      expect(sizedImageUrl('https://example.com/a.jpg', 200), 'https://example.com/a.jpg');
    });
  });
}
