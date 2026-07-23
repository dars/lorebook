import 'package:flutter_test/flutter_test.dart';
import 'package:lorebook/features/character/domain/character.dart';
import 'package:lorebook/features/character/domain/character_math.dart';
import 'package:lorebook/features/character/domain/level_up.dart';

AbilityScore _as(int score, {bool save = false}) => AbilityScore(
  score: score,
  modifier: abilityModifier(score),
  proficientSave: save,
);

Character _wizard({int level = 2, int con = 14}) => Character(
  id: 't1',
  name: '測試法師',
  species: '人類',
  className: '法師',
  classNameEn: 'Wizard',
  level: level,
  maxHp: 14,
  currentHp: 10,
  proficiencyBonus: proficiencyBonusFor(level),
  spellcastingAbility: 'INT',
  hitDieFaces: 6,
  abilityScores: AbilityScores(
    str: _as(8),
    dex: _as(14),
    con: _as(con),
    int_: _as(16, save: true),
    wis: _as(12, save: true),
    cha: _as(10),
  ),
  skills: const [
    Skill(name: '奧秘', abilityType: 'INT', modifier: 5, proficient: true),
    Skill(name: '感知', abilityType: 'WIS', modifier: 1, proficient: false),
  ],
  spellSlots: const [SpellSlots(level: 1, total: 3, used: 3)],
);

void main() {
  group('LevelUpPlan', () {
    test('法師 Lv2→3：選子職、無 ASI、二環開放、法書 +2', () {
      final plan = LevelUpPlan.forCharacter(_wizard());
      expect(plan.targetLevel, 3);
      expect(plan.pickSubclass, isTrue);
      expect(plan.hasAsi, isFalse);
      expect(plan.averageHp, 4);
      expect(plan.newSlotTotals, {1: 4, 2: 2});
      expect(plan.maxRing, 2);
      expect(plan.spellPicks, 2);
      expect(plan.cantripPicks, 0);
    });

    test('Lv3→4 有 ASI；矮人 speciesHpPerLevel = 1', () {
      final dwarf = _wizard(level: 3).copyWith(species: '矮人');
      final plan = LevelUpPlan.forCharacter(dwarf);
      expect(plan.hasAsi, isTrue);
      expect(plan.speciesHpPerLevel, 1);
    });

    test('非施法職業無法術事件', () {
      final fighter = _wizard().copyWith(
        classNameEn: 'Fighter',
        spellcastingAbility: '',
      );
      final plan = LevelUpPlan.forCharacter(fighter);
      expect(plan.isCaster, isFalse);
      expect(plan.newSlotTotals, isEmpty);
      expect(plan.spellPicks, 0);
    });

    test('職業別 ASI：戰士 6/14、盜賊 10（2024）', () {
      expect(asiLevelsFor('Fighter'), containsAll({4, 6, 8, 12, 14, 16}));
      expect(asiLevelsFor('Rogue'), containsAll({4, 8, 10, 12, 16}));
      expect(asiLevelsFor('Wizard'), isNot(contains(6)));

      final fighter5 = _wizard(
        level: 5,
      ).copyWith(classNameEn: 'Fighter', spellcastingAbility: '');
      expect(LevelUpPlan.forCharacter(fighter5).hasAsi, isTrue);

      final rogue9 = _wizard(
        level: 9,
      ).copyWith(classNameEn: 'Rogue', spellcastingAbility: '');
      expect(LevelUpPlan.forCharacter(rogue9).hasAsi, isTrue);

      final wizard5 = _wizard(level: 5);
      expect(LevelUpPlan.forCharacter(wizard5).hasAsi, isFalse);
    });

    test('法師可備法術數 Lv14 起高於其他全施法者（XPHB）', () {
      expect(kPreparedSpells['Wizard']![13], 18); // Lv14
      expect(kPreparedSpells['Wizard']![19], 25); // Lv20
      expect(kPreparedSpells['Bard']![19], 22);
    });
  });

  group('applyLevelUp', () {
    test('法師 Lv2→3 平均值：HP/等級/法術位/子職/追加內容', () {
      final c = _wizard();
      final plan = LevelUpPlan.forCharacter(c);
      final next = applyLevelUp(
        c,
        plan,
        const LevelUpChoices(
          subclass: '塑能學派',
          subclassEn: 'School of Evocation',
          features: [CharacterFeature(name: '塑能學者')],
          spells: [Spell(name: '灼熱射線', level: 2)],
        ),
      );
      expect(next.level, 3);
      expect(next.maxHp, 14 + 4 + 2, reason: 'd6 平均 4 + CON +2');
      expect(next.currentHp, 10 + 6, reason: '當前 HP 同步加增量，不回滿');
      expect(next.proficiencyBonus, 2);
      expect(next.subclass, '塑能學派');
      expect(next.features.last.name, '塑能學者');
      expect(next.spells.last.name, '灼熱射線');
      final slots = {for (final s in next.spellSlots) s.level: s};
      expect(slots[1]!.total, 4);
      expect(slots[1]!.used, 3, reason: '已用法術位保留，升級不是休息');
      expect(slots[2]!.total, 2);
      expect(slots[2]!.used, 0);
    });

    test('手動骰值與最低 1 下限', () {
      final c = _wizard(con: 4);
      final plan = LevelUpPlan.forCharacter(c);
      final next = applyLevelUp(c, plan, const LevelUpChoices(hpRoll: 1));
      expect(next.maxHp, 14 + 1, reason: '1 + (-3) 夾至最低 1');
    });

    test('ASI 提升 CON：本級用新修正值並回溯 Δmod × 原等級', () {
      final c = _wizard(level: 3, con: 15);
      final plan = LevelUpPlan.forCharacter(c);
      final next = applyLevelUp(
        c,
        plan,
        const LevelUpChoices(hpRoll: 4, asi: {'CON': 2}),
      );
      expect(next.abilityScores.con.score, 17);
      expect(next.abilityScores.con.modifier, 3);
      expect(next.maxHp, 14 + (4 + 3) + 1 * 3, reason: '本級 4+3，回溯 (3-2)×3 級');
    });

    test('ASI 上限 20', () {
      final c = _wizard(level: 3).copyWith(
        abilityScores: AbilityScores(
          str: _as(8),
          dex: _as(14),
          con: _as(14),
          int_: _as(19, save: true),
          wis: _as(12, save: true),
          cha: _as(10),
        ),
      );
      final plan = LevelUpPlan.forCharacter(c);
      final next = applyLevelUp(c, plan, const LevelUpChoices(asi: {'INT': 2}));
      expect(next.abilityScores.int_.score, 20);
    });

    test('Lv4→5 熟練加值提升並重算技能/施法/被動察覺', () {
      final c = _wizard(level: 4);
      final plan = LevelUpPlan.forCharacter(c);
      final next = applyLevelUp(c, plan, const LevelUpChoices());
      expect(next.proficiencyBonus, 3);
      final arcana = next.skills.firstWhere((s) => s.name == '奧秘');
      expect(arcana.modifier, 3 + 3, reason: 'INT +3、熟練 +3');
      expect(next.spellDc, 8 + 3 + 3);
      expect(next.spellAttack, 3 + 3);
      expect(next.passivePerception, 10 + 1, reason: '感知未熟練');
      expect(next.initiative, 2);
    });

    test('邪術師契約位階移動：舊環已用數不殘留', () {
      final warlock = _wizard().copyWith(
        classNameEn: 'Warlock',
        spellcastingAbility: 'CHA',
        spellSlots: const [SpellSlots(level: 1, total: 2, used: 2)],
      );
      final plan = LevelUpPlan.forCharacter(warlock);
      final next = applyLevelUp(warlock, plan, const LevelUpChoices());
      expect(next.spellSlots.length, 1);
      expect(next.spellSlots.first.level, 2);
      expect(next.spellSlots.first.total, 2);
      expect(next.spellSlots.first.used, 0);
    });
  });

  group('applyLevelUp 職業資源同步', () {
    Character char(String cn, String en, int level, {int cha = 10}) =>
        Character(
          id: 'r1',
          name: '測試$cn',
          className: cn,
          classNameEn: en,
          level: level,
          maxHp: 20,
          currentHp: 20,
          proficiencyBonus: proficiencyBonusFor(level),
          hitDieFaces: 12,
          abilityScores: AbilityScores(
            str: _as(16),
            dex: _as(14),
            con: _as(14),
            int_: _as(8),
            wis: _as(10),
            cha: _as(cha),
          ),
        );

    test('野蠻人 2→3：狂暴 1/2 差額入帳為 2/3', () {
      final c = char('野蠻人', 'Barbarian', 2).copyWith(
        resources: const [
          ClassResource(name: '狂暴', nameEn: 'Rage', current: 1, max: 2),
        ],
      );
      final next = applyLevelUp(
        c,
        LevelUpPlan.forCharacter(c),
        const LevelUpChoices(),
      );
      final rage = next.resources.firstWhere((r) => r.nameEn == 'Rage');
      expect(rage.current, 2);
      expect(rage.max, 3);
    });

    test('術士 1→2：獲得術法點數 2/2', () {
      final c = char('術士', 'Sorcerer', 1, cha: 16);
      final next = applyLevelUp(
        c,
        LevelUpPlan.forCharacter(c),
        const LevelUpChoices(),
      );
      final sp = next.resources.firstWhere((r) => r.nameEn == 'Sorcery Points');
      expect(sp.current, 2);
      expect(sp.max, 2);
    });

    test('吟遊詩人 4→5：吟遊激勵 d6→d8、恢復轉短休', () {
      final c = char('吟遊詩人', 'Bard', 4, cha: 16).copyWith(
        resources: const [
          ClassResource(
            name: '吟遊激勵',
            nameEn: 'Bardic Inspiration',
            current: 2,
            max: 3,
            display: ResourceDisplay.dice,
            dieFaces: 6,
          ),
        ],
      );
      final next = applyLevelUp(
        c,
        LevelUpPlan.forCharacter(c),
        const LevelUpChoices(),
      );
      final bi = next.resources.firstWhere(
        (r) => r.nameEn == 'Bardic Inspiration',
      );
      expect(bi.dieFaces, 8);
      expect(bi.recovery, ResourceRecovery.short);
      expect(bi.current, 2); // max 不變 → current 不動
    });
  });

  group('isChoiceFeature', () {
    test('選項型特性關鍵字', () {
      expect(isChoiceFeature('Expertise'), isTrue);
      expect(isChoiceFeature('Metamagic'), isTrue);
      expect(isChoiceFeature('Eldritch Invocations'), isTrue);
      expect(isChoiceFeature('Battle Master Maneuvers'), isTrue);
      expect(isChoiceFeature('Sculpt Spells'), isFalse);
    });
  });
}
