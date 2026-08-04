import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:lorebook/features/catalog/data/catalog_repository.dart';
import 'package:lorebook/features/catalog/domain/catalog_models.dart';
import 'package:lorebook/features/character/domain/character_creation_data.dart';
import 'package:lorebook/features/character/domain/custom_background.dart';
import 'package:lorebook/features/character/domain/tool_proficiency_options.dart';

/// character-management spec「背景給予工具熟練並記錄於角色卡」
/// 與 custom-backgrounds spec「自訂背景的工具熟練」。
const _items = [
  CatalogItem(
    id: 'i1',
    name: '書法工具',
    source: 'XPHB',
    category: 'tool',
    subcategory: '工匠工具',
  ),
  CatalogItem(
    id: 'i2',
    name: '盜賊工具',
    source: 'XPHB',
    category: 'tool',
    subcategory: '工具',
  ),
  CatalogItem(
    id: 'i3',
    name: '骰子套組',
    source: 'XPHB',
    category: 'tool',
    subcategory: '遊戲組',
  ),
  // 非工具，應被濾掉
  CatalogItem(
    id: 'i4',
    name: '長劍',
    source: 'XPHB',
    category: 'weapon',
    subcategory: '軍用近戰',
  ),
];

void main() {
  group('內建背景的工具（SRD 5.2）', () {
    test('四個背景皆有工具且對應正確', () {
      String tool(String cn) =>
          kBackgrounds.firstWhere((b) => b.cn == cn).toolProficiency;
      expect(tool('士兵'), '遊戲組');
      expect(tool('賢者'), '書法工具');
      expect(tool('侍僧'), '書法工具');
      expect(tool('罪犯'), '盜賊工具');
      for (final b in kBackgrounds) {
        expect(b.toolProficiency, isNotEmpty, reason: '${b.cn} 應有工具');
      }
    });
  });

  group('工具選項', () {
    test('僅取 category=tool，依 subcategory 分組', () async {
      final container = ProviderContainer(
        overrides: [itemCatalogProvider.overrideWith((ref) async => _items)],
      );
      addTearDown(container.dispose);

      final grouped = await container.read(
        toolProficiencyOptionsProvider.future,
      );
      expect(grouped.keys.toSet(), {'工匠工具', '工具', '遊戲組'});
      expect(grouped['工匠工具']!.single.name, '書法工具');
      // 武器不該出現在任何分組
      expect(
        grouped.values.expand((v) => v).map((i) => i.name),
        isNot(contains('長劍')),
      );
    });

    test('內容庫為空（離線）時回傳空 map，呼叫端據此降級', () async {
      final container = ProviderContainer(
        overrides: [
          itemCatalogProvider.overrideWith((ref) async => <CatalogItem>[]),
        ],
      );
      addTearDown(container.dispose);
      expect(
        await container.read(toolProficiencyOptionsProvider.future),
        isEmpty,
      );
    });
  });

  test('BackgroundOption 的工具可直接供建角寫入（空字串不寫入）', () {
    List<String> toolsOf(BackgroundOption b) => [
      if (b.toolProficiency.isNotEmpty) b.toolProficiency,
    ];
    expect(toolsOf(kBackgrounds.firstWhere((b) => b.cn == '罪犯')), ['盜賊工具']);
    expect(
      toolsOf(
        const BackgroundOption(
          cn: 'x',
          en: 'x',
          abilities: [],
          skills: [],
          originFeat: '',
        ),
      ),
      isEmpty,
    );
  });

  group('自訂背景', () {
    const base = CustomBackground(
      id: 'bg-1',
      name: '獵人',
      abilities: ['DEX', 'CON', 'WIS'],
      skills: ['隱匿', '求生'],
      originFeat: '警覺',
    );

    test('工具隨 toBackgroundOption 帶出', () {
      final opt = base.copyWith(toolProficiency: '草藥工具').toBackgroundOption();
      expect(opt.toolProficiency, '草藥工具');
    });

    test('既有資料（無此欄位）讀入為空字串——離線建立者亦可留空', () {
      final legacy = CustomBackground.fromJson({
        'id': 'bg-old',
        'name': '獵人',
        'abilities': ['DEX', 'CON', 'WIS'],
        'skills': ['隱匿', '求生'],
        'originFeat': '警覺',
      });
      expect(legacy.toolProficiency, '');
      expect(legacy.toBackgroundOption().toolProficiency, '');
    });
  });
}
