import 'package:flutter_test/flutter_test.dart';
import 'package:lorebook/features/catalog/domain/catalog_models.dart';

/// Fixtures 取自實際 Supabase 資料列（source=PHB），欄位形狀與
/// designs/SUPABASE.md 一致。
void main() {
  group('CatalogSpecies', () {
    test('解析提升欄位並保留 data', () {
      final s = CatalogSpecies.fromJson({
        'id': 'e2b1acc8-9e82-4b23-a439-9bbf2ddf3785',
        'name': '龍裔',
        'eng_name': 'Dragonborn',
        'source': 'PHB',
        'page': 32,
        'srd': true,
        'size': ['M'],
        'data': {
          'speed': 30,
          'entries': ['…'],
        },
      });
      expect(s.name, '龍裔');
      expect(s.engName, 'Dragonborn');
      expect(s.sizes, ['M']);
      expect(s.srd, isTrue);
      expect(s.data['speed'], 30);
    });

    test('可空欄位缺值時給預設', () {
      final s = CatalogSpecies.fromJson({
        'id': 'x',
        'name': '某種族',
        'eng_name': null,
        'source': 'PHB',
        'page': null,
        'srd': null,
        'size': null,
        'data': null,
      });
      expect(s.engName, isNull);
      expect(s.page, isNull);
      expect(s.srd, isFalse);
      expect(s.sizes, isEmpty);
      expect(s.data, isEmpty);
    });
  });

  group('CatalogClass', () {
    test('施法職業欄位', () {
      final c = CatalogClass.fromJson({
        'id': 'u1',
        'name': '法師',
        'eng_name': 'Wizard',
        'source': 'PHB',
        'page': 112,
        'srd': true,
        'hd_faces': 6,
        'spellcasting_ability': 'int',
        'caster_progression': 'full',
        'data': {},
      });
      expect(c.hdFaces, 6);
      expect(c.spellcastingAbility, 'int');
      expect(c.casterProgression, 'full');
    });

    test('非施法職業 spellcasting 為 null', () {
      final c = CatalogClass.fromJson({
        'id': 'u2',
        'name': '野蠻人',
        'eng_name': 'Barbarian',
        'source': 'PHB',
        'page': 46,
        'srd': true,
        'hd_faces': 12,
        'spellcasting_ability': null,
        'caster_progression': null,
        'data': {},
      });
      expect(c.hdFaces, 12);
      expect(c.spellcastingAbility, isNull);
      expect(c.casterProgression, isNull);
    });
  });

  group('CatalogSubclass / CatalogClassFeature', () {
    test('subclass 帶 class_id 代理鍵', () {
      final sc = CatalogSubclass.fromJson({
        'id': '09f1bf97-a71f-4cbf-bca8-28783e118e5e',
        'name': '狂戰士道途',
        'eng_name': 'Path of the Berserker',
        'short_name': '狂戰士',
        'class_name': '野蠻人',
        'class_source': 'PHB',
        'source': 'PHB',
        'page': 49,
        'data': {'srd': true},
        'class_id': '63136b83-c4e1-42cd-b3b5-004c79d5f97c',
      });
      expect(sc.shortName, '狂戰士');
      expect(sc.classId, '63136b83-c4e1-42cd-b3b5-004c79d5f97c');
    });

    test('class feature 的 level 與 is_subclass', () {
      final f = CatalogClassFeature.fromJson({
        'id': 'f1',
        'name': '道途能力',
        'eng_name': 'Path Feature',
        'source': 'PHB',
        'page': 46,
        'class_name': 'Barbarian',
        'class_source': 'PHB',
        'subclass_short_name': null,
        'subclass_source': null,
        'level': 14,
        'is_subclass': false,
        'data': {
          'entries': ['在14級時，你獲得一個來自你原初道途的能力。'],
        },
        'class_id': '63136b83-c4e1-42cd-b3b5-004c79d5f97c',
      });
      expect(f.level, 14);
      expect(f.isSubclass, isFalse);
      expect(f.subclassShortName, isNull);
      expect(f.data['entries'], isNotEmpty);
    });
  });

  group('CatalogFeat', () {
    test('prerequisite 可為 null，data 保留 ability 加值', () {
      final f = CatalogFeat.fromJson({
        'id': '282dff09-8778-493d-815d-a7c08f12b681',
        'name': '演員',
        'eng_name': 'Actor',
        'source': 'PHB',
        'page': 165,
        'srd': false,
        'prerequisite': null,
        'data': {
          'ability': [
            {'cha': 1},
          ],
        },
      });
      expect(f.prerequisite, isNull);
      expect(f.data['ability'], [
        {'cha': 1},
      ]);
    });
  });

  group('CatalogSpell（v_spells）', () {
    test('解析攤平欄位與 5etools 原始結構', () {
      final s = CatalogSpell.fromJson({
        'id': '7fde298d-f501-4a0d-9d71-459f55692d4b',
        'name': '畢格比之掌',
        'eng_name': "Bigby's Hand",
        'source': 'PHB',
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
        'duration': [
          {
            'type': 'timed',
            'duration': {'type': 'minute', 'amount': 1},
            'concentration': true,
          },
        ],
        'classes': ['Wizard', 'Artificer'],
        'damage_inflict': ['bludgeoning', 'force'],
        'saving_throw': [],
        'condition_inflict': [],
        'entries': ['你在射程內…'],
      });
      expect(s.level, 5);
      expect(s.school, 'V');
      expect(s.schoolName, 'Evocation');
      expect(s.concentration, isTrue);
      expect(s.compM, '一個蛋殼和一隻蛇皮手套');
      expect(s.classes, contains('Wizard'));
      expect(s.range['type'], 'point');
      expect(s.damageInflict, ['bludgeoning', 'force']);
      expect(s.savingThrow, isEmpty);
    });

    test('comp_m 為物件（有價材料）時取 text', () {
      final s = CatalogSpell.fromJson({
        'id': 'm1',
        'name': '尋獲魔寵',
        'eng_name': 'Find Familiar',
        'source': 'PHB',
        'level': 1,
        'comp_m': {
          'text': '價值10gp的木炭、薰香和藥草，法術施放時被火盆的火焰消耗',
          'cost': 1000,
          'consume': true,
        },
      });
      expect(s.compM, startsWith('價值10gp'));
    });

    test('戲法（level 0）與無材料成分', () {
      final s = CatalogSpell.fromJson({
        'id': 'c1',
        'name': '火焰箭',
        'eng_name': 'Fire Bolt',
        'source': 'PHB',
        'page': 242,
        'level': 0,
        'school': 'V',
        'school_name': 'Evocation',
        'ritual': false,
        'concentration': false,
        'srd': true,
        'comp_v': true,
        'comp_s': true,
        'comp_m': null,
        'casting_time': [],
        'range': null,
        'duration': [],
        'classes': ['Wizard', 'Sorcerer'],
        'damage_inflict': ['fire'],
        'saving_throw': [],
        'condition_inflict': [],
        'entries': [],
      });
      expect(s.level, 0);
      expect(s.compM, isNull);
      expect(s.range, isEmpty);
    });
  });

  group('CatalogEntry', () {
    test('以 kind 判別的長尾條目', () {
      final e = CatalogEntry.fromJson({
        'id': '90fdb2da-2e85-4bf4-a26f-acf8a584a1a9',
        'kind': 'condition',
        'name': '中毒',
        'eng_name': 'Poisoned',
        'source': 'PHB',
        'page': 292,
        'srd': true,
        'data': {
          'entries': [
            {
              'type': 'list',
              'items': ['…'],
            },
          ],
        },
      });
      expect(e.kind, 'condition');
      expect(e.name, '中毒');
      expect(e.data['entries'], isNotEmpty);
    });
  });
}
