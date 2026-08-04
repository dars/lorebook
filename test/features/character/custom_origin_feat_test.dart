import 'package:flutter_test/flutter_test.dart';
import 'package:lorebook/features/character/domain/custom_background.dart';

/// custom-backgrounds spec「起源專長二擇一」：模式以旗標記錄，不由名稱推導。
const _base = CustomBackground(
  id: 'bg-1',
  name: '獵人',
  abilities: ['DEX', 'CON', 'WIS'],
  skills: ['隱匿', '求生'],
  originFeat: '警覺',
);

void main() {
  group('模式與驗證', () {
    test('SRD 模式：名稱須為候選之一', () {
      expect(_base.originFeatValid, isTrue);
      expect(
        _base.copyWith(originFeat: '荒野嚮導').originFeatValid,
        isFalse,
        reason: 'SRD 模式不接受清單外的名稱',
      );
    });

    test('自訂模式：名稱必填、長度受限，說明選填', () {
      final custom = _base.copyWith(
        originFeatCustom: true,
        originFeat: '荒野嚮導',
        originFeatDescription: '在野外行進時不會迷路。',
      );
      expect(custom.originFeatValid, isTrue);
      expect(custom.copyWith(originFeat: '   ').originFeatValid, isFalse);
      expect(
        custom.copyWith(originFeatDescription: '').originFeatValid,
        isTrue,
      );
      expect(
        custom.copyWith(originFeat: 'x' * 21).originFeatValid,
        isFalse,
        reason: '名稱上限 $kCustomOriginFeatNameMax',
      );
      expect(
        custom.copyWith(originFeatDescription: 'x' * 201).originFeatValid,
        isFalse,
        reason: '說明上限 $kCustomOriginFeatDescMax',
      );
    });

    test('自訂模式允許與 SRD 候選同名', () {
      final sameName = _base.copyWith(
        originFeatCustom: true,
        originFeatDescription: '我們這桌的警覺不一樣。',
      );
      expect(sameName.originFeat, '警覺');
      expect(sameName.originFeatValid, isTrue);
      // 同名不會讓它變回 SRD 模式——模式由旗標決定。
      expect(sameName.originFeatCustom, isTrue);
    });
  });

  group('序列化', () {
    test('JSON round-trip 保留兩個新欄位', () {
      final custom = _base.copyWith(
        originFeatCustom: true,
        originFeat: '荒野嚮導',
        originFeatDescription: '說明。',
      );
      expect(CustomBackground.fromJson(custom.toJson()), custom);
    });

    test('既有資料（無新欄位）讀入為 false／空字串', () {
      final legacy = CustomBackground.fromJson({
        'id': 'bg-old',
        'name': '獵人',
        'abilities': ['DEX', 'CON', 'WIS'],
        'skills': ['隱匿', '求生'],
        'originFeat': '警覺',
      });
      expect(legacy.originFeatCustom, isFalse);
      expect(legacy.originFeatDescription, '');
      expect(legacy.originFeatValid, isTrue, reason: '行為與現況相同');
    });
  });

  test('toBackgroundOption 帶出模式與說明', () {
    final opt = _base
        .copyWith(
          originFeatCustom: true,
          originFeat: '荒野嚮導',
          originFeatDescription: '說明。',
        )
        .toBackgroundOption();
    expect(opt.originFeat, '荒野嚮導');
    expect(opt.originFeatCustom, isTrue);
    expect(opt.originFeatDescription, '說明。');
  });
}
