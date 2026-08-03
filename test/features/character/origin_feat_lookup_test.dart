import 'package:flutter_test/flutter_test.dart';
import 'package:lorebook/features/catalog/domain/catalog_models.dart';
import 'package:lorebook/features/character/domain/origin_feat_lookup.dart';

/// character-management spec「種族特性為結構化條目」延伸：起源專長的說明
/// 亦來自內容庫，否則它會是角色卡上唯一點不開的特性。
const _feats = [
  CatalogFeat(
    id: 'f1',
    name: '警覺',
    engName: 'Alert',
    source: 'XPHB',
    data: {
      'entries': ['先攻加上熟練加值。'],
    },
  ),
  CatalogFeat(
    id: 'f2',
    name: '法術新手',
    engName: 'Magic Initiate',
    source: 'XPHB',
    data: {
      'entries': ['習得兩個戲法與一個一環法術。'],
    },
  ),
];

void main() {
  test('主名直接命中', () {
    final r = originFeatDetail(_feats, '警覺');
    expect(r.nameEn, 'Alert');
    expect(r.description, contains('先攻'));
  });

  test('帶變體括號時以主名比對（內容庫只收主名）', () {
    for (final variant in ['法術新手（法師）', '法術新手（牧師）', '法術新手（德魯伊）']) {
      final r = originFeatDetail(_feats, variant);
      expect(r.nameEn, 'Magic Initiate', reason: variant);
      expect(r.description, contains('戲法'), reason: variant);
    }
  });

  test('查無或空字串時回傳空值（該列退化為不可點擊）', () {
    expect(originFeatDetail(_feats, '不存在的專長').description, isEmpty);
    expect(originFeatDetail(_feats, '').description, isEmpty);
    expect(originFeatDetail(const [], '警覺').description, isEmpty);
  });
}
