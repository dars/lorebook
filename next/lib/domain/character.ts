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
  name: z.string(),
  nameEn: z.string().default(''),
  abilityType: z.string(),
  modifier: z.number().int(),
  proficient: z.boolean().default(false),
});

export const Spell = z.object({
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
  name: z.string(),
  nameEn: z.string().default(''),
  source: z.string().default(''),
  description: z.string().default(''),
});

export const ClassResource = z.object({
  name: z.string(),
  nameEn: z.string().default(''),
  current: z.number().int().default(0),
  max: z.number().int().default(0),
  recovery: ResourceRecovery.default('long'),
  display: ResourceDisplay.default('pips'),
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
export const Character = z.object({
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
  className: z.string().default(''),
  classNameEn: z.string().default(''),
  subclass: z.string().default(''),
  subclassEn: z.string().default(''),
  level: z.number().int().default(1),
  background: z.string().default(''),
  backgroundEn: z.string().default(''),
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
  return Character.parse(json);
}
