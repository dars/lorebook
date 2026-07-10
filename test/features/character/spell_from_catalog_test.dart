import 'package:flutter_test/flutter_test.dart';
import 'package:lorebook/features/catalog/domain/catalog_models.dart';
import 'package:lorebook/features/catalog/domain/fivetools_text.dart';
import 'package:lorebook/features/character/domain/character.dart';
import 'package:lorebook/features/character/domain/spell_from_catalog.dart';

void main() {
  group('ftFlattenEntries', () {
    test('字串段落 + 標記壓平', () {
      final out = ftFlattenEntries([
        '命中時，目標受到 {@damage 1d10} 點火焰傷害。',
        '第二段含{@condition 中毒}狀態。',
      ]);
      expect(out, '命中時，目標受到 1d10 點火焰傷害。\n第二段含中毒狀態。');
    });

    test('list 轉列點、table 捨棄、具名區塊帶標題', () {
      final out = ftFlattenEntries([
        {
          'type': 'list',
          'items': ['項目一', '含{@dice 1d6}的項目'],
        },
        {
          'type': 'table',
          'colLabels': ['等級', '效果'],
          'rows': [
            ['1', 'x'],
          ],
        },
        {
          'type': 'entries',
          'name': '升環施法',
          'entries': ['使用更高法術位時…'],
        },
      ]);
      expect(out, '• 項目一\n• 含1d6的項目\n【升環施法】\n使用更高法術位時…');
    });

    test('巢狀樣式標記展開', () {
      expect(ftFlattenEntries(['{@b 粗體含 {@dice 2d6} 傷害}']), '粗體含 2d6 傷害');
    });
  });

  group('formatter', () {
    test('casting time', () {
      expect(
        ftFormatCastingTime([
          {'unit': 'action', 'number': 1},
        ]),
        '1 動作',
      );
      expect(
        ftFormatCastingTime([
          {'unit': 'minute', 'number': 10},
        ]),
        '10 分鐘',
      );
      expect(ftFormatCastingTime([]), '');
    });

    test('range', () {
      expect(
        ftFormatRange({
          'type': 'point',
          'distance': {'type': 'feet', 'amount': 120},
        }),
        '120呎',
      );
      expect(
        ftFormatRange({
          'type': 'point',
          'distance': {'type': 'touch'},
        }),
        '觸及',
      );
      expect(
        ftFormatRange({
          'type': 'point',
          'distance': {'type': 'self'},
        }),
        '自身',
      );
      expect(
        ftFormatRange({
          'type': 'cone',
          'distance': {'type': 'feet', 'amount': 15},
        }),
        '自身 (15呎錐形)',
      );
      expect(ftFormatRange({}), '');
    });
  });

  group('spellFromCatalog', () {
    test('以真實 v_spells 資料列映射（奧法之掌）', () {
      // fixture 取自實際 v_spells 資料列（source=XPHB，SRD 定名）。
      final catalog = CatalogSpell.fromJson({
        'id': '7fde298d-f501-4a0d-9d71-459f55692d4b',
        'name': '奧法之掌',
        'eng_name': "Arcane Hand",
        'source': 'XPHB',
        'page': 218,
        'level': 5,
        'school': 'V',
        'school_name': 'Evocation',
        'ritual': false,
        'concentration': true,
        'srd': true,
        'comp_v': true,
        'comp_s': true,
        'comp_m': '一個蛋殼和一隻蛇皮手套',
        'casting_time': [
          {'unit': 'action', 'number': 1},
        ],
        'range': {
          'type': 'point',
          'distance': {'type': 'feet', 'amount': 120},
        },
        'duration': [],
        'classes': ['Wizard'],
        'damage_inflict': [],
        'saving_throw': [],
        'condition_inflict': [],
        'entries': ['你在射程內創造出一個{@dice 1d4}的力場手掌。'],
      });
      final spell = spellFromCatalog(catalog);
      expect(spell.name, '奧法之掌');
      expect(spell.nameEn, "Arcane Hand");
      expect(spell.level, 5);
      expect(spell.concentration, isTrue);
      expect(spell.prepared, isTrue);
      expect(spell.castingTime, '1 動作');
      expect(spell.castKind, SpellCastKind.action);
      expect(spell.range, '120呎');
      expect(spell.description, '你在射程內創造出一個1d4的力場手掌。');
      expect(spell.description.contains('{@'), isFalse);
    });
  });
}
