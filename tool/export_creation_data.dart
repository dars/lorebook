// 建角選項資料的匯出器。
//
// 用途：Next.js 端需要同一份 kSpecies / kClasses / kBackgrounds / kSkills
// 等常數表。**匯出而非手抄**——28 個選項物件、687 行資料，手動轉寫必然出錯，
// 而且錯在資料裡不會有編譯錯誤，只會讓某個種族少一個特性、某個職業少一個
// 可選技能，難以察覺。這與 golden 對照是同一套紀律。
//
//   flutter test tool/export_creation_data.dart --dart-define=out=next/lib/creation
//
// 產出 creation-data.json，由 TS 端以 Zod 解析。

import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

import 'package:lorebook/features/character/domain/character_creation_data.dart';

const _out = String.fromEnvironment('out');

void main() {
  test('匯出建角選項資料', () {
    if (_out.isEmpty) fail('需要 --dart-define=out=<輸出目錄>');

    final data = {
      'species': [
        for (final s in kSpecies)
          {
            'cn': s.cn,
            'en': s.en,
            'speed': s.speed,
            'size': s.size,
            'darkvisionFt': s.darkvisionFt,
            'hpPerLevel': s.hpPerLevel,
            'skillPickCount': s.skillPickCount,
            'skillPickFrom': s.skillPickFrom,
            'sizeChoices': s.effectiveSizeChoices,
            'description': s.description,
            // allTraits 而非 traits：黑暗視覺是由 darkvisionFt 推導出的特性，
            // 只取 traits 會漏掉它。
            'traits': [
              for (final t in s.allTraits)
                {
                  'name': t.name,
                  'nameEn': t.nameEn,
                  'description': t.description,
                },
            ],
          },
      ],
      'classes': [
        for (final c in kClasses)
          {
            'cn': c.cn,
            'en': c.en,
            'hitDie': c.hitDie,
            'spellAbility': c.spellAbility,
            'saves': c.saves,
            'primaryAbilities': c.primaryAbilities,
            'skillCount': c.skillCount,
            'skillChoices': c.skillChoices,
            'cantripsKnown': c.cantripsKnown,
            'preparedSpells': c.preparedSpells,
            'level1Slots': c.level1Slots,
            'unarmoredDefense': c.unarmoredDefense,
            'description': c.description,
          },
      ],
      'backgrounds': [
        for (final b in kBackgrounds)
          {
            'cn': b.cn,
            'en': b.en,
            'abilities': b.abilities,
            'skills': b.skills,
            'originFeat': b.originFeat,
            'toolProficiency': b.toolProficiency,
            'originFeatCustom': b.originFeatCustom,
            'originFeatDescription': b.originFeatDescription,
            'description': b.description,
          },
      ],
      'skills': [
        for (final s in kSkills)
          {'name': s.name, 'nameEn': s.nameEn, 'ability': s.ability},
      ],
      'languages': kLanguages,
      'abilityOrder': kAbilityOrder,
      'proficiencyEntryMax': kProficiencyEntryMax,
    };

    final f = File('$_out/creation-data.json');
    f.parent.createSync(recursive: true);
    f.writeAsStringSync(
      '${const JsonEncoder.withIndent('  ').convert(data)}\n',
    );
    stdout.writeln(
      '已寫入 ${f.path}：'
      '${kSpecies.length} 種族、${kClasses.length} 職業、'
      '${kBackgrounds.length} 背景、${kSkills.length} 技能',
    );
  });
}
