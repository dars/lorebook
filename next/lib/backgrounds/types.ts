import { z } from 'zod';

/**
 * 自訂背景，對照 Flutter 端的 `CustomBackground`。
 *
 * 建角時與內建背景並列，選取後即快照進角色卡——之後刪改自訂背景不影響
 * 已建立的角色（與整個 App 的快照哲學一致）。
 */
export const CustomBackground = z.object({
  id: z.string(),
  name: z.string(),
  /** 恰 3 個能力代碼。 */
  abilities: z.array(z.string()),
  /** 恰 2 個技能中文名。 */
  skills: z.array(z.string()),
  originFeat: z.string(),
  toolProficiency: z.string().default(''),
  /** true＝使用者自訂的起源專長（名稱可與 SRD 同名，模式由此旗標決定）。 */
  originFeatCustom: z.boolean().default(false),
  originFeatDescription: z.string().default(''),
  description: z.string().default(''),
});

export type CustomBackground = z.infer<typeof CustomBackground>;

/** SRD 起源專長。自訂模式時使用者自行填寫，名稱可與這些同名——模式由旗標決定。 */
export const ORIGIN_FEAT_CHOICES = [
  '技藝精湛',
  '野蠻打擊',
  '警覺',
  '法術新手（法師）',
  '法術新手（牧師）',
  '法術新手（德魯伊）',
];

export const ABILITY_LABELS: Record<string, string> = {
  STR: '力量', DEX: '敏捷', CON: '體質',
  INT: '智力', WIS: '感知', CHA: '魅力',
};

export const NAME_MAX = 20;
export const ORIGIN_FEAT_NAME_MAX = 20;
export const ORIGIN_FEAT_DESC_MAX = 200;

/** 2024 背景建構規則：恰 3 個能力候選、恰 2 個技能、名稱非空。 */
export function isValid(b: Partial<CustomBackground>): boolean {
  if (!b.name?.trim()) return false;
  if ((b.abilities?.length ?? 0) !== 3) return false;
  if ((b.skills?.length ?? 0) !== 2) return false;
  if (!b.originFeat?.trim()) return false;
  return true;
}
