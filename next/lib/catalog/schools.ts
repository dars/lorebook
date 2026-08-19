/**
 * 法術學派代碼 → 中文。
 *
 * 內容庫只存代碼（`school`）與英文全名（`school_name`），中文對照在
 * Flutter 端是寫死的常數，移植時漏掉了——結果整個中文介面裡只有學派是
 * 英文。SRD 5.2 就這八個，不會再增加。
 */
const SCHOOL_CN: Record<string, string> = {
  A: '防護',
  C: '咒法',
  D: '預言',
  E: '惑控',
  V: '塑能',
  I: '幻術',
  N: '死靈',
  T: '變化',
};

/** 取學派中文；代碼不認得時退回英文全名，再退回空字串。 */
export const spellSchoolCn = (code: string, engName = '') =>
  SCHOOL_CN[code] ?? engName;
