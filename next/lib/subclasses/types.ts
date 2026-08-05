import { z } from 'zod';

import levels from './feature-levels.json';

/**
 * 自訂子職業。
 *
 * 特性等級**由母職業推導**而非自由填寫：12 個職業的子職特性等級各不相同且
 * 無規律（戰士 3/7/10/15/18、牧師 3/6/17、盜賊 3/9/13/17），要使用者自填
 * 等於要他先去查規則書。
 *
 * 內容為**顯示文字**，不驅動任何數值推導——與自訂背景一致。
 */

export const SubclassFeature = z.object({
  level: z.number().int(),
  name: z.string(),
  description: z.string().default(''),
});

export const CustomSubclass = z.object({
  id: z.string(),
  name: z.string(),
  nameEn: z.string().default(''),
  /** 母職業英文名。角色卡存的是 classNameEn，一律以英文名為關聯鍵。 */
  classEn: z.string(),
  /**
   * 本子職的等級清單，**儲存時固定**。
   *
   * 不在讀取時重新推導：內容庫的等級表日後變動（規則勘誤或資料修正）時，
   * 既有自訂子職維持原樣——與整個 App 的快照哲學一致。要跟進新表就重新
   * 編輯一次。
   */
  levels: z.array(z.number().int()),
  features: z.array(SubclassFeature).default([]),
});

export type SubclassFeature = z.infer<typeof SubclassFeature>;
export type CustomSubclass = z.infer<typeof CustomSubclass>;

/**
 * 各職業的子職特性等級。
 *
 * 自 `class_features`（source=XPHB、is_subclass=true）匯出的快照。SRD 資料
 * 極少變動，因此靜態內建而非每次查詢——建立自訂子職時不必連內容庫。
 * 上游資料若更新，重新執行匯出即可（見 openspec design D1）。
 */
export const SUBCLASS_FEATURE_LEVELS = levels as Record<string, number[]>;

export const featureLevelsFor = (classEn: string): number[] =>
  SUBCLASS_FEATURE_LEVELS[classEn] ?? [];

export const NAME_MAX = 30;
export const FEATURE_NAME_MAX = 30;
export const FEATURE_DESC_MAX = 500;

/**
 * 結構驗證。**只管合法性，不管平衡**——強度是 DM 的職責，App 不替桌上的人
 * 做裁決（與自訂背景一致）。
 */
export function validate(b: Partial<CustomSubclass>): string | null {
  if (!b.name?.trim()) return '請填寫名稱';
  if (!b.classEn || featureLevelsFor(b.classEn).length === 0) {
    return '請選擇母職業';
  }
  const features = (b.features ?? []).filter((f) => f.name.trim());
  // 3 級是取得子職的等級；沒有該級特性的子職在規則上不成立。
  if (!features.some((f) => f.level === 3)) {
    return '至少需要一個 3 級特性——3 級是取得子職的等級';
  }
  return null;
}

export const isValid = (b: Partial<CustomSubclass>) => validate(b) === null;

/** 去掉名稱空白的特性條目——UI 上允許暫時留空，儲存時不寫入。 */
export const cleanFeatures = (features: SubclassFeature[]) =>
  features.filter((f) => f.name.trim()).map((f) => ({ ...f, name: f.name.trim() }));
