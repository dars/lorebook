import {backfillRogue} from '../rules/rogue';
import {backfillMonk} from '../rules/monk';
import {backfillDruid} from '../rules/druid';
import { backfillCleric } from '../rules/cleric';
import { backfillBard } from '../rules/bard';
import { backfillBarbarian } from '../rules/barbarian';
import { backfillWizard } from '../rules/wizard';
import { backfillPaladin } from '@/lib/rules/paladin';
import { repairFeatDescriptions } from '@/lib/rules/repair-feat-descriptions';
import { backfillFighterFeatures } from '@/lib/rules/fighter-features';
import { backfillIndomitable } from '@/lib/rules/class-resources';
import { z } from 'zod';

/**
 * 角色卡的領域模型，逐欄對齊 Flutter 端的
 * `lib/features/character/domain/character.dart`（freezed ＋ json_serializable）。
 *
 * 用 Zod 而非純 TypeScript interface 的理由：freezed 的 `@Default(...)` 是
 * **執行期**行為——舊資料缺欄位時由預設值補齊。編譯期型別辦不到這件事，而
 * 「新型別要能解析既有的真實資料」是這次重寫的驗收條件之一。
 *
 * 序列化慣例（已對真實資料驗證）：
 * - enum 一律是小寫的成員名字串（`"gear"`、`"none"`、`"action"`）
 * - 智力的鍵是 **`int_`**（Dart 的 `int` 是保留字，欄位名帶了底線）
 * - 缺欄位一律套預設值，不得視為錯誤——舊角色比新欄位早存在
 */

// ── 列舉 ─────────────────────────────────────
export const SpellCastKind = z.enum(['action', 'bonus', 'reaction', 'other']);
export const ItemType = z.enum(['weapon', 'armor', 'gear', 'consumable']);
export const ItemSource = z.enum(['catalog', 'custom']);
export const ArmorCategory = z.enum([
  'none',
  'light',
  'medium',
  'heavy',
  'shield',
]);
export const ResourceRecovery = z.enum(['short', 'long', 'none']);
export const ResourceDisplay = z.enum(['pips', 'number', 'dice']);

// ── 基礎結構 ──────────────────────────────────
export const AbilityScore = z.object({
  score: z.number().int(),
  modifier: z.number().int(),
  proficientSave: z.boolean().default(false),
});

export const AbilityScores = z.object({
  str: AbilityScore,
  dex: AbilityScore,
  con: AbilityScore,
  int_: AbilityScore,
  wis: AbilityScore,
  cha: AbilityScore,
});

export const Skill = z.object({
  expertise: z.boolean().optional(),
  name: z.string(),
  nameEn: z.string().default(''),
  abilityType: z.string(),
  modifier: z.number().int(),
  proficient: z.boolean().default(false),
});

export const Spell = z.object({
  spellAbility: z.string().optional(),
  castingSources: z.array(z.object({source:z.string(),title:z.string(),ability:z.string().optional(),free:z.enum(['atWill','short','long']).optional()})).optional(),
  alwaysPrepared: z.boolean().optional(),
  progressionSource: z.string().optional(),
  homebrewId: z.string().optional(),
  name: z.string(),
  nameEn: z.string().default(''),
  level: z.number().int(),
  description: z.string().default(''),
  upgrade: z.string().default(''),
  damage: z.string().default(''),
  damageType: z.string().default(''),
  range: z.string().default(''),
  /** 純顯示字串（如 '1 動作'）——邏輯判斷一律看 castKind。 */
  castingTime: z.string().default('1 action'),
  castKind: SpellCastKind.default('action'),
  prepared: z.boolean().default(true),
  concentration: z.boolean().default(false),
});

export const SpellSlots = z.object({
  level: z.number().int(),
  total: z.number().int(),
  used: z.number().int().default(0),
});

/**
 * 舊版靜態武器模型。
 *
 * 實測既有 21 筆資料中 **0 筆**含非空的 `weapons`，因此**不移植**轉換邏輯
 * （design D6）——此處保留型別只為讓舊 JSON 仍能解析而不報錯。攻擊列一律
 * 由 equipment 推導。
 */
export const Weapon = z.object({
  name: z.string(),
  nameEn: z.string().default(''),
  attackBonus: z.number().int(),
  damage: z.string(),
  damageType: z.string().default(''),
  properties: z.array(z.string()).default([]),
});

export const Equipment = z.object({
  name: z.string(),
  nameEn: z.string().default(''),
  /** 顯示用副標；行為判斷一律看 itemType。 */
  type: z.string().default(''),
  description: z.string().default(''),
  equipped: z.boolean().default(false),
  itemType: ItemType.default('gear'),
  source: ItemSource.default('custom'),
  quantity: z.number().int().default(1),
  /** 任務物品：刪除需確認、消耗歸零保留、販售排除。 */
  quest: z.boolean().default(false),
  /** 實際成交價（cp 計）。0 = 無價格資訊。 */
  priceCp: z.number().int().default(0),
  catalogRef: z.string().default(''),
  // 武器機制（itemType=weapon）
  damage: z.string().default(''),
  damageType: z.string().default(''),
  finesse: z.boolean().default(false),
  properties: z.array(z.string()).default([]),
  // 護甲機制（itemType=armor）：AC 公式參數
  armorCategory: ArmorCategory.default('none'),
  acBase: z.number().int().default(0),
});

export const Currency = z.object({
  pp: z.number().int().default(0),
  gp: z.number().int().default(0),
  ep: z.number().int().default(0),
  sp: z.number().int().default(0),
  cp: z.number().int().default(0),
});

export const Personality = z.object({
  traits: z.string().default(''),
  ideals: z.string().default(''),
  bonds: z.string().default(''),
  flaws: z.string().default(''),
});

export const CharacterFeature = z.object({
  progressionSource: z.string().optional(),
  name: z.string(),
  nameEn: z.string().default(''),
  source: z.string().default(''),
  description: z.string().default(''),
  /**
   * 內容是否為使用者自創（自訂子職的特性、自訂的起源專長）。
   *
   * 曾以來源字串的後綴 `・自訂` 承載這個語意，但那是給人看的慣例——UI 無法
   * 據以做呈現決策，措辭一改標示就靜默消失。`source` 現在只承載來源敘述。
   *
   * 判斷的是**內容**是否自創，不是「來自自訂容器」：以自訂背景選了 SRD 的
   * 起源專長時，那個專長仍是 SRD 的，此處為 false——背景是自訂的這件事由
   * `backgroundIsCustom` 表達，不必在特性上重複一次。
   */
  isCustom: z.boolean().default(false),
});

/**
 * 使用者自填專長（自訂起源專長、升級時的自訂專長）的字數上限。
 * 兩處是同一種東西，上限只定義一次。
 */
export const FEAT_NAME_MAX = 20;
export const FEAT_DESC_MAX = 200;

export const ClassResource = z.object({
  progressionSource: z.string().optional(),
  name: z.string(),
  nameEn: z.string().default(''),
  current: z.number().int().default(0),
  max: z.number().int().default(0),
  recovery: ResourceRecovery.default('long'),
  display: ResourceDisplay.default('pips'),
  /**
   * 上限怎麼隨等級走。**省略＝固定值**。
   *
   * 只有 'proficiency'（等於熟練加值）需要標記：職業資源的上限由
   * `class-resources.ts` 的規則表依等級算，不需要這個欄位；自訂種族的能力
   * 沒有規則表可查，所以把**意圖**存進角色卡，由升級時重算（custom-species
   * D9）。寫死數字的話，玩家 5 級時熟練加值變 3、App 卻還顯示 2 次，而且
   * 沒有任何徵兆。
   *
   * 刻意不給 default：職業資源的形狀是 golden 快照的既有契約，替 160 筆
   * 都補上一個永遠是 'fixed' 的欄位只是噪音。
   */
  scaling: z.enum(['fixed', 'proficiency']).optional(),
  /** display === 'dice' 時的骰面（如吟遊激勵 d8 → 8）。 */
  dieFaces: z.number().int().default(0),
  /** display === 'number' 時的單位。 */
  unit: z.string().default(''),
});

export const JournalEntry = z.object({
  id: z.string(),
  title: z.string().default(''),
  body: z.string().default(''),
  createdAt: z.string(),
  updatedAt: z.string(),
});

// ── 角色卡 ────────────────────────────────────
export const Progression = z.object({
  selections: z.record(z.string(), z.array(z.string())).default({}),
  rest: z.enum(['short', 'long']).optional(),
  restSpent: z.record(z.string(), z.number().int().nonnegative()).default({}),
  grantedSkills: z.array(z.string()).default([]),
  grantedTools: z.array(z.string()).default([]),
  grantedLanguages: z.array(z.string()).default([]),
});
export const Character = z.object({
  progression: Progression.optional(),
  spellbook: z.array(Spell).optional(),
  id: z.string(),
  name: z.string(),
  nameEn: z.string().default(''),
  portraitUrl: z.string().default(''),
  /** 立繪取景：縮放（1–4，1 = cover 基準）與中心點（0–1）。 */
  portraitScale: z.number().default(1),
  portraitCenterX: z.number().default(0.5),
  portraitCenterY: z.number().default(0.5),

  species: z.string().default(''),
  speciesEn: z.string().default(''),
  /**
   * 種族的每級額外 HP（矮人堅毅 = 1），**建角時快照**。
   *
   * 升級不以種族名反查內建清單：自訂種族查不到會靜默回 0，每級 +1 HP 就
   * 這樣消失且不會有任何提示（custom-species D3）。快照也讓「改了自訂種族
   * 之後既有角色突然變壯」不會發生——與整份角色卡的快照語意一致。
   *
   * 本欄位之前建立的角色由 `lib/characters/backfill.ts` 依種族名補齊。
   */
  speciesHpPerLevel: z.number().int().default(0),
  className: z.string().default(''),
  classNameEn: z.string().default(''),
  subclass: z.string().default(''),
  subclassEn: z.string().default(''),
  /**
   * 自訂子職的**整份**快照（選用自訂子職時寫入；SRD 子職為 null）。
   *
   * 快照整份而非僅當級特性：子職的特性散布在 3/6/10/14 等多個等級，若只存
   * 當級的，玩家升到下一個有特性的等級時就得回查來源表——而那時他可能已經
   * 刪掉那個自訂子職，角色就卡在那裡升不上去。
   *
   * 後續等級一律自此取用，不回查 user_subclasses。
   */
  customSubclass: z
    .object({
      id: z.string(),
      name: z.string(),
      nameEn: z.string().default(''),
      classEn: z.string(),
      levels: z.array(z.number().int()).default([]),
      features: z
        .array(
          z.object({
            level: z.number().int(),
            name: z.string(),
            description: z.string().default(''),
          }),
        )
        .default([]),
    })
    .nullish()
    .transform((v) => v ?? null),
  level: z.number().int().default(1),
  background: z.string().default(''),
  backgroundEn: z.string().default(''),
  /**
   * 背景是否來自使用者自訂。純標示，不參與任何推導。
   *
   * **只記旗標，不記來源 id**：角色卡上的自創內容一律是快照，而 id 唯一的
   * 用途就是回查來源——那正是快照哲學禁止的事（來源可能已被刪除）。留一個
   * id 在這裡只會誘使日後有人寫出回查的程式碼。
   *
   * **既有角色不回填**：唯一的線索是「背景名稱是否出現在該使用者的
   * user_backgrounds 中」，但那會在使用者自訂了一個與 SRD 同名的背景時誤判，
   * 也會在他刪掉那個自訂背景後失效。沒標示只是少了資訊，標錯會讓 DM 誤判。
   * 這是刻意的取捨，不是待修的 bug——請不要改成猜測式回填。
   */
  backgroundIsCustom: z.boolean().default(false),
  alignment: z.string().default(''),
  alignmentEn: z.string().default(''),
  deity: z.string().default(''),
  deityEn: z.string().default(''),
  creatureType: z.string().default(''),
  size: z.string().default(''),

  /** 靜態 AC 欄位。**推導值請用 computeAc()**——此欄僅在自訂護甲缺參數時作為回退。 */
  ac: z.number().int().default(10),
  maxHp: z.number().int().default(1),
  currentHp: z.number().int().default(1),
  bodyAndMindApplied: z.boolean().optional(),
  monkSuperiorDefense: z.boolean().optional(),
  quiveringPalmTarget: z.string().optional(),
  wildShapeForm: z.string().optional(),
  wildCompanionActive: z.boolean().optional(),
  natureSanctuaryActive: z.boolean().optional(),
  druidCreatedSlots: z.record(z.string(),z.number().int().min(0)).optional(),
  tempHp: z.number().int().default(0),
  speed: z.string().default('30ft'),
  initiative: z.number().int().default(0),
  proficiencyBonus: z.number().int().default(2),
  passivePerception: z.number().int().default(10),
  spellDc: z.number().int().default(0),
  spellAttack: z.number().int().default(0),
  spellcastingAbility: z.string().default(''),
  concentrationSpell: z.string().nullable().default(null),
  /** 法師護甲生效中；著甲時自動關閉（equipment-effects 規格）。 */
  mageArmorActive: z.boolean().default(false),
  raging: z.boolean().optional(),
  divineInterventionRests: z.number().int().min(0).max(8).optional(),
  primalChampionApplied: z.boolean().optional(),

  abilityScores: AbilityScores,
  skills: z.array(Skill).default([]),
  spells: z.array(Spell).default([]),
  cantrips: z.array(Spell).default([]),
  spellSlots: z.array(SpellSlots).default([]),
  weapons: z.array(Weapon).default([]),
  equipment: z.array(Equipment).default([]),
  // 預設值寫完整字面值：Zod 的 .default() **不會**把值走一次 schema，
  // 給 `{}` 會得到欄位全為 undefined 的物件（測試抓到過）。
  currency: Currency.default({ pp: 0, gp: 0, ep: 0, sp: 0, cp: 0 }),
  personality: Personality.default({
    traits: '',
    ideals: '',
    bonds: '',
    flaws: '',
  }),
  features: z.array(CharacterFeature).default([]),
  languages: z.array(z.string()).default([]),
  /** 工具熟練。獨立於 skills——不帶關聯屬性與加值，2024 規則多為情境判定。 */
  toolProficiencies: z.array(z.string()).default([]),
  backstory: z.string().default(''),
  personalityTags: z.array(z.string()).default([]),
  conditions: z.array(z.string()).default([]),
  /** 力竭等級（0–6）。 */
  exhaustionLevel: z.number().int().default(0),
  resources: z.array(ClassResource).default([]),
  /** 生命骰骰面（依職業）。總數 = 角色等級。 */
  hitDieFaces: z.number().int().default(8),
  hitDiceUsed: z.number().int().default(0),
  journalEntries: z.array(JournalEntry).default([]),
});

export type AbilityScore = z.infer<typeof AbilityScore>;
export type AbilityScores = z.infer<typeof AbilityScores>;
export type Skill = z.infer<typeof Skill>;
export type Spell = z.infer<typeof Spell>;
export type SpellSlots = z.infer<typeof SpellSlots>;
export type Weapon = z.infer<typeof Weapon>;
export type Equipment = z.infer<typeof Equipment>;
export type Currency = z.infer<typeof Currency>;
export type Personality = z.infer<typeof Personality>;
export type CharacterFeature = z.infer<typeof CharacterFeature>;
export type ClassResource = z.infer<typeof ClassResource>;
export type JournalEntry = z.infer<typeof JournalEntry>;
export type Character = z.infer<typeof Character>;

export type ItemType = z.infer<typeof ItemType>;
export type ArmorCategory = z.infer<typeof ArmorCategory>;

/** 生命骰總數（= 角色等級）與剩餘可花用數。 */
export const hitDiceTotal = (c: Character) => c.level;
export const hitDiceRemaining = (c: Character) =>
  Math.min(Math.max(c.level - c.hitDiceUsed, 0), c.level);

/** 解析雲端／快取的角色 JSON。失敗時拋出，由呼叫端決定如何呈現。 */
export function parseCharacter(json: unknown): Character {
  return backfillRogue(backfillMonk(backfillDruid(backfillCleric(backfillBard(backfillBarbarian(backfillWizard(backfillPaladin(repairFeatDescriptions(backfillFighterFeatures(backfillIndomitable(Character.parse(json))))))))))));
}
