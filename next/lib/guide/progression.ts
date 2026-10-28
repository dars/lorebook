import { CLASSES } from '@/lib/creation/data';
import { asiLevelsFor, CANTRIPS_KNOWN, CLASS_PROGRESSION, PREPARED_SPELLS, spellSlotTotalsFor, maxSpellRingFor } from '@/lib/rules/level-tables';
import subclassLevels from '@/lib/subclasses/feature-levels.json';
import { GUIDE_CLASSES, type GuideClass } from './classes';
import type { CoverageKey } from './coverage';

export const SRD_URL = 'https://media.dndbeyond.com/compendium-images/srd/5.2/SRD_CC_v5.2.1.pdf';
export type GuideChoice = { id: string; title: string; detail: string; coverage: CoverageKey; page: number; conditional?: string };
export type GuideLevel = { level: number; features: string[]; choices: GuideChoice[]; growth: string[]; page: number };
type ChoiceSpec = [level: number, id: string, title: string, detail: string, coverage: CoverageKey, page: number];

const STYLES = 'SRD 收錄：箭術 Archery、防禦 Defense、巨武器戰鬥 Great Weapon Fighting、雙武器戰鬥 Two-Weapon Fighting。';
const METAMAGIC = '謹慎 Careful、遠距 Distant、強效 Empowered、延時 Extended、升階 Heightened、瞬發 Quickened、追蹤 Seeking、精妙 Subtle、轉化 Transmuted、孿生 Twinned。';

const CHOICES: Record<string, ChoiceSpec[]> = {
  Barbarian: [[3, 'primal-skill', '原初知識：再選 1 項職業技能熟練', '從野蠻人 1 級技能清單選擇尚未熟練的技能。狂暴時改用力量作特定技能檢定，是這項能力的另一個效果。', 'classOption', 29]],
  Bard: [
    [2, 'expertise-2', '專精 Expertise：選 2 項', '從自己已熟練、尚未專精的技能選 2 項，相關技能檢定改為雙倍熟練加值。', 'expertise', 32],
    [9, 'expertise-9', '專精 Expertise：再選 2 項', '再選兩項已熟練但未專精的技能，合計 4 項。', 'expertise', 32],
  ],
  Cleric: [
    [1, 'divine-order', '神聖職責 Divine Order：二選一', '守護者 Protector：軍用武器熟練與重甲訓練；或奇術師 Thaumaturge：額外選 1 個牧師戲法，奧秘／宗教檢定獲得感知修正加值（至少 +1）。額外戲法不占基本戲法名額。', 'classOption', 37],
    [7, 'blessed-strikes', '祝福打擊 Blessed Strikes：二選一', '神聖打擊 Divine Strike：每回合一次武器命中可加 1d8 黯蝕或光輝傷害；或強效施法 Potent Spellcasting：牧師戲法傷害加感知修正。14 級強化原先選擇，不再新選。', 'classOption', 38],
  ],
  Druid: [
    [1, 'primal-order', '原初職責 Primal Order：二選一', '術法師 Magician：額外選 1 個德魯伊戲法，奧秘／自然檢定加感知修正（至少 +1）；或守衛 Warden：軍用武器熟練與中甲訓練。額外戲法不占基本名額。', 'classOption', 42],
    [2, 'forms-2', '荒野形態：選 4 種已知形態', '選 4 種 CR 不超過 1/4、沒有飛行速度的野獸形態。長休後可替換 1 種。指南僅說明選擇限制，不收錄野獸數據。', 'wildShape', 42],
    [4, 'forms-4', '荒野形態：新增 2 種，共 6 種', '已知形態上限升為 6，最高 CR 提升至 1/2，仍不可有飛行速度；既有形態依長休替換規則調整。', 'wildShape', 42],
    [7, 'elemental-fury', '元素之怒 Elemental Fury：二選一', '強效施法 Potent Spellcasting：德魯伊戲法傷害加感知修正；或原初打擊 Primal Strike：每回合一次武器或荒野形態攻擊命中加 1d8 寒冷、火焰、閃電或雷鳴傷害。15 級強化原先選擇。', 'classOption', 43],
    [8, 'forms-8', '荒野形態：新增 2 種，共 8 種', '已知形態上限升為 8，最高 CR 提升至 1，開始允許飛行形態。', 'wildShape', 42],
  ],
  Fighter: [[1, 'fighting-style', '戰鬥風格 Fighting Style：選 1 個專長', `${STYLES} 每升戰士等級可替換為另一個戰鬥風格專長。`, 'style', 47]],
  Monk: [[1, 'monk-tool', '工具熟練：選 1 種', '選 1 種工匠工具或樂器的熟練。', 'languages', 49]],
  Paladin: [[2, 'fighting-style', '戰鬥風格或祝福戰士：二選一', `${STYLES} 也可放棄戰鬥風格專長，改選祝福戰士 Blessed Warrior：選 2 個牧師戲法，以魅力施法；每升聖騎士等級可替換其中 1 個。`, 'style', 54]],
  Ranger: [
    [2, 'deft-expertise', '熟練探索者：選 1 項專精', '從已熟練但未專精的技能選 1 項。', 'expertise', 59],
    [2, 'deft-languages', '熟練探索者：選 2 種語言', '從建角規則的語言表選 2 種額外語言。', 'languages', 59],
    [2, 'fighting-style', '戰鬥風格或德魯伊戰士：二選一', `${STYLES} 也可放棄戰鬥風格專長，改選德魯伊戰士 Druidic Warrior：選 2 個德魯伊戲法，以感知施法；每升遊俠等級可替換其中 1 個。`, 'style', 59],
    [9, 'expertise-9', '專精 Expertise：再選 2 項', '從已熟練但未專精的技能選 2 項，加上 2 級所得合計 3 項。', 'expertise', 59],
  ],
  Rogue: [
    [1, 'expertise-1', '專精 Expertise：選 2 項', '從自己已熟練的技能選 2 項，相關技能檢定改為雙倍熟練加值。', 'expertise', 61],
    [1, 'cant-language', '盜賊黑話：另選 1 種語言', '盜賊黑話自動取得；另外從建角語言表選 1 種語言。', 'languages', 62],
    [6, 'expertise-6', '專精 Expertise：再選 2 項', '再選 2 項已熟練但未專精的技能，合計 4 項。', 'expertise', 61],
  ],
  Sorcerer: [2, 10, 17].map((level, i) => [level, `metamagic-${level}`, `超魔 Metamagic：${i ? '再' : ''}選 2 項，共 ${2 + i * 2} 項`, `${METAMAGIC} 每升術士等級可替換 1 項已知超魔；通常每次施法只能使用一種，依各選項和高階能力例外處理。`, 'metamagic', 66]),
  Warlock: [
    ...([[1, 1, 1], [2, 2, 3], [5, 2, 5], [7, 1, 6], [9, 1, 7], [12, 1, 8], [15, 1, 9], [18, 1, 10]] as const).map(([level, count, total]): ChoiceSpec => [level, `invocations-${level}`, `祕法祈喚 Eldritch Invocations：${level === 1 ? '選' : '新增'} ${count} 項，共 ${total} 項`, '須符合每個祈喚的邪術師等級、已知戲法及前置祈喚要求；除非標示可重複，不能重選同一項。每升邪術師等級可替換 1 項，但不能移除其他已知祈喚的前置條件。魔刃／魔鏈／魔書契約也占祈喚名額；2 級起若選先人教誨 Lessons of the First Ones，還須選 1 個起源專長。完整祈喚表見 SRD 第 72–74 頁。', 'invocation', 71]),
    ...[11, 13, 15, 17].map((level, i): ChoiceSpec => [level, `arcanum-${level}`, `祕法奧秘 Mystic Arcanum：選 1 個 ${6 + i} 環法術`, `從邪術師清單選 1 個 ${6 + i} 環法術。每個奧秘每天可免費施放一次，長休恢復；不占契約法術位。之後每升邪術師等級，可替換 1 個奧秘法術，保持同環數。`, 'classOption', 72]),
  ],
  Wizard: [
    [2, 'scholar', '學者 Scholar：選 1 項專精', '從已熟練的奧秘、歷史、調查、醫藥、自然、宗教中選 1 項，取得專精。', 'expertise', 78],
    [18, 'spell-mastery', '法術精通 Spell Mastery：選 2 個法術', '從法術書選 1 個一環及 1 個二環法術，施法時間都須為一個動作。它們視為始終準備，可免費以最低環施放；長休後可替換其中 1 個同環且合資格的法術。', 'classOption', 79],
    [20, 'signature', '招牌法術 Signature Spells：選 2 個三環法術', '從法術書選 2 個三環法術，視為始終準備；各可免費施放一次，短休或長休恢復。高環施放仍要消耗法術位。', 'classOption', 79],
  ],
};

const SUBCLASS_CHOICES: Record<string, ChoiceSpec[]> = {
  Bard: [
    [3, 'lore-skills', '額外熟練：選 3 項技能', '逸聞學院額外取得 3 項自選技能熟練。', 'classOption', 35],
    [6, 'lore-spells', '魔法發現 Magical Discoveries：選 2 個法術', '從牧師、德魯伊、法師清單選 2 個法術，可混選；可以是戲法或已有法術位環數的法術。始終準備，不占基本已備名額。之後每升吟遊詩人等級可替換其中 1 個。', 'spells', 35],
  ],
  Druid: [[3, 'land', '結社法術：選 1 種地形', '乾旱、極地、溫帶或熱帶；每次長休後可重選。依地形與德魯伊等級取得始終準備的結社法術，不占基本名額。', 'classOption', 46]],
  Fighter: [[7, 'champion-style', '額外戰鬥風格：再選 1 個專長', `${STYLES} 與已取得的戰鬥風格不同。`, 'style', 49]],
  Ranger: [
    [3, 'hunters-prey', '獵物 Hunter’s Prey：二選一', '巨像屠夫 Colossus Slayer：每回合一次對受傷目標加 1d8 武器傷害；或破陣者 Horde Breaker：每回合一次攻擊原目標 5 呎內另一個合資格目標。短休或長休後可切換。', 'classOption', 61],
    [7, 'defensive-tactics', '防禦戰術 Defensive Tactics：二選一', '逃離敵群 Escape the Horde：對你的機會攻擊具有劣勢；或多重攻擊防禦 Multiattack Defense：敵人命中你後，該回合後續對你的攻擊具有劣勢。短休或長休後可切換。', 'classOption', 61],
  ],
  Sorcerer: [[6, 'elemental-affinity', '元素親和 Elemental Affinity：選 1 種傷害', '強酸、寒冷、火焰、閃電、毒素中選 1 種；取得對應抗性，施放該類傷害法術可將魅力修正加到一次傷害擲骰。', 'classOption', 70]],
  Warlock: [[10, 'fiendish-resilience', '邪魔韌性 Fiendish Resilience：選 1 種抗性', '每次短休或長休後，從力場以外的傷害類型選 1 種，取得抗性，直到下次改選。', 'classOption', 76]],
  Wizard: [
    [3, 'evocation-savant', '塑能學者：額外抄錄 2 個塑能法術', '選 2 個不高於二環的法師塑能法術，免費加入法術書，不占每級通常的 2 個名額。', 'spellbook', 82],
    ...[5, 7, 9, 11, 13, 15, 17].map((level): ChoiceSpec => [level, `evocation-${level}`, '塑能學者：額外抄錄 1 個塑能法術', '本級解鎖新的法術位環數，再免費加入 1 個已有法術位環數的法師塑能法術；不一定要選最高環。', 'spellbook', 82]),
  ],
};

function fromSpec(spec: ChoiceSpec, conditional?: string): GuideChoice {
  const [, id, title, detail, coverage, page] = spec;
  return { id, title, detail, coverage, page, conditional };
}

export function getGuideClass(value: string | null): GuideClass {
  return GUIDE_CLASSES.find((item) => item.en.toLowerCase() === value?.toLowerCase()) ?? GUIDE_CLASSES[0];
}

/** 共用既有法術進程，避免指南與升級計算各維護一份數量。 */
export function guideLevels(cls: GuideClass, withSubclass = false): GuideLevel[] {
  const basics = CLASSES.find((item) => item.en === cls.en)!;
  return Array.from({ length: 20 }, (_, index) => {
    const level = index + 1;
    const choices = (CHOICES[cls.en] ?? []).filter((item) => item[0] === level).map((item) => fromSpec(item));
    const features = cls.features[level] ? [cls.features[level]] : [];
    const growth: string[] = [];
    if (level === 1) {
      choices.unshift({ id: 'class-skills', title: `職業技能：選 ${basics.skillCount} 項熟練`, detail: `從${basics.skillChoices.join('、')}中選擇；與背景等來源重複熟練時，依建角規則調整。`, coverage: 'skills', page: cls.page });
      choices.push({ id: 'equipment', title: '起始裝備：選裝備組合或金幣', detail: '依本職業 Core Traits 的 Starting Equipment 選 A 或 B（戰士有 A／B／C）。完整組合見本級規則來源；以金幣購裝與直接取得裝備組合是替代方案。', coverage: 'equipment', page: cls.page });
      if (cls.en === 'Bard') choices.push({ id: 'instruments', title: '樂器熟練：選 3 種', detail: '選 3 種樂器取得熟練。', coverage: 'languages', page: 31 });
    }
    const mastery = cls.en === 'Fighter' ? ({ 1: 3, 4: 1, 10: 1, 16: 1 } as Record<number, number>) : cls.en === 'Barbarian' ? { 1: 2, 4: 1, 10: 1 } as Record<number, number> : ['Paladin', 'Ranger', 'Rogue'].includes(cls.en) ? { 1: 2 } as Record<number, number> : {};
    if (mastery[level]) choices.push({ id: `mastery-${level}`, title: `武器精通 Weapon Mastery：${level === 1 ? '選' : '再選'} ${mastery[level]} 種武器`, detail: cls.en === 'Rogue' ? '選簡易武器或具靈巧／輕型屬性的軍用武器種類；長休後可重選。' : '從自己熟練的武器種類中選擇，才能使用該種類的精通屬性；替換時機見上方提醒。', coverage: 'mastery', page: cls.page });
    if (level === 3) choices.push({ id: 'subclass', title: '選擇子職業 Subclass', detail: `選 1 個子職業並取得其 3 級能力。SRD 收錄：${cls.subclass.name}。其他自創子職依各自設計，後續選項可能不同。`, coverage: 'subclass', page: cls.subclass.page });
    const milestones = subclassLevels[cls.en as keyof typeof subclassLevels];
    if (!withSubclass && milestones.includes(level)) features.push(level === 3 ? '取得所選子職業的初始能力' : '取得所選子職業的新能力（依子職內容）');
    if (withSubclass) {
      if (cls.subclass.features[level]) features.push(`${cls.subclass.name}：${cls.subclass.features[level]}`);
      choices.push(...(SUBCLASS_CHOICES[cls.en] ?? []).filter((item) => item[0] === level).map((item) => fromSpec(item, cls.subclass.name)));
    }
    if (asiLevelsFor(cls.en).has(level)) choices.push({ id: `feat-${level}`, title: level === 19 ? '史詩恩賜 Epic Boon：選 1 個專長' : '能力值提升或專長：二選一', detail: level === 19 ? '選 1 個史詩恩賜專長，或改選任何符合先決條件的其他專長；能力值提升也是可選專長。不是同時取得恩賜與能力值提升。' : '選能力值提升專長：一項能力 +2 或兩項各 +1，上限 20；也可改選 1 個符合先決條件的其他專長。專長本身可能另外要求選屬性、技能或法術。', coverage: 'feat', page: cls.page });
    const cantrips = CANTRIPS_KNOWN[cls.en]?.[index] ?? 0;
    const previousCantrips = CANTRIPS_KNOWN[cls.en]?.[index - 1] ?? 0;
    if (cantrips > previousCantrips) choices.push({ id: `cantrips-${level}`, title: `基本戲法：${level === 1 ? '選' : '新增'} ${cantrips - previousCantrips} 個，共 ${cantrips} 個`, detail: `從${cls.cn}戲法清單選擇。職責、戰鬥風格替代方案、專長或子職額外給予的戲法另計。`, coverage: 'spells', page: cls.page });
    const prepared = PREPARED_SPELLS[cls.en]?.[index] ?? 0;
    const previousPrepared = PREPARED_SPELLS[cls.en]?.[index - 1] ?? 0;
    const progression = CLASS_PROGRESSION[cls.en] ?? 'none';
    const maxRing = maxSpellRingFor(progression, level);
    if (cls.en === 'Wizard') choices.push({ id: `spellbook-${level}`, title: `法術書：${level === 1 ? '選 6 個一環法術' : '免費加入 2 個法術'}`, detail: `從法師清單選擇，最高 ${maxRing} 環。基本已備法術上限 ${prepared} 個，須從書中另行準備；法術書數量與已備數量分開計算。`, coverage: 'spellbook', page: 78 });
    else if (prepared > previousPrepared) choices.push({ id: `spells-${level}`, title: `基本已備法術：${level === 1 ? '選' : '增加'} ${prepared - previousPrepared} 個，上限 ${prepared} 個`, detail: `從${cls.cn === '吟遊詩人' && level >= 10 ? '吟遊詩人、牧師、德魯伊、法師' : cls.cn}法術清單補足名額，須為已有法術位環數的法術（最高 ${maxRing} 環）。始終準備的額外法術不占此上限；替換時機見上方提醒。`, coverage: 'spells', page: cls.page });
    if (prepared) {
      growth.push(`基本已備 ${prepared} 個${cantrips ? ` · 基本戲法 ${cantrips} 個` : ''}`);
      growth.push(`${progression === 'pact' ? '契約法術位' : '法術位'}：${Object.entries(spellSlotTotalsFor(progression, level)).map(([ring, n]) => `${ring} 環 × ${n}`).join('、')}`);
    }
    if ([1, 5, 9, 13, 17].includes(level)) growth.push(`熟練加值 +${2 + Math.floor(index / 4)}`);
    return { level, choices, features, growth, page: cls.page };
  });
}

export function filterGuideLevels(rows: GuideLevel[], query: string, choicesOnly: boolean): GuideLevel[] {
  const search = query.trim().toLocaleLowerCase();
  return rows.filter((row) => {
    if (choicesOnly && row.choices.length === 0) return false;
    if (/^\d+$/.test(search)) return row.level === Number(search);
    return !search || [...row.features, ...row.growth, ...row.choices.flatMap((choice) => [choice.title, choice.detail, choice.conditional ?? ''])].join(' ').toLocaleLowerCase().includes(search);
  });
}
