/** 支援程度只描述選擇流程，不替能力的所有自動效果背書。 */
export const COVERAGE_CHECKED_ON = '2026-10-28';
export type Coverage = { status: 'supported' | 'partial' | 'missing'; note: string; evidence: string[] };
export const COVERAGE = {
  skills: { status: 'supported', note: '建角可從職業技能清單選擇指定數量，並檢查重複熟練。', evidence: ['components/creation/create-wizard.tsx', 'lib/creation/build.ts'] },
  subclass: { status: 'supported', note: '3 級可選 SRD 或自創子職，也可補選；內部額外選擇須另行核對。', evidence: ['components/level-up/level-up-view.tsx', 'lib/rules/level-up.ts'] },
  feat: { status: 'partial', note: '升級支援能力值提升、內容庫一般專長及 19 級史詩恩賜；起源／戰鬥風格類別未列入，專長內的額外選擇不完整。', evidence: ['lib/rules/feats.ts', 'lib/catalog/fetch.ts', 'components/level-up/level-up-view.tsx'] },
  spells: { status: 'partial', note: '建角及角色法術頁可選用法術；升級頁尚未串接本級新增數量、替換限制及來源名額。', evidence: ['components/creation/create-wizard.tsx', 'components/spells/spell-manager.tsx', 'components/level-up/level-up-view.tsx'] },
  spellbook: { status: 'partial', note: '可以加入角色法術清單，但尚未分開管理法術書、已備法術與免費抄錄名額。', evidence: ['lib/domain/character.ts', 'components/spells/spell-manager.tsx'] },
  equipment: { status: 'partial', note: '建角後可手動管理裝備與金幣，未提供職業起始裝備 A／B 選擇流程。', evidence: ['lib/creation/build.ts', 'components/character/editors/inventory-editor.tsx'] },
  languages: { status: 'partial', note: '熟練編輯器可手動記錄語言與工具，但沒有依能力限制數量的選擇步驟。', evidence: ['components/character/editors/proficiency-editor.tsx'] },
  expertise: { status: 'missing', note: '目前技能只區分是否熟練，沒有專精選擇及雙倍熟練加值欄位。', evidence: ['lib/domain/character.ts', 'lib/rules/ability.ts'] },
  style: { status: 'missing', note: '尚無戰鬥風格／替代戲法的專屬選擇；升級專長清單不包含戰鬥風格。', evidence: ['lib/catalog/fetch.ts', 'components/level-up/level-up-view.tsx'] },
  mastery: { status: 'missing', note: '裝備可保留精通屬性，但未管理角色選擇的精通武器種類與名額。', evidence: ['lib/domain/character.ts', 'components/creation/create-wizard.tsx'] },
  classOption: { status: 'missing', note: '可顯示能力說明，但尚無能力內的分支選擇及保存欄位。', evidence: ['lib/rules/level-up.ts', 'components/level-up/level-up-view.tsx'] },
  metamagic: { status: 'missing', note: '已有術法點資源，尚無超魔選項、名額及升級替換流程。', evidence: ['lib/rules/class-resources.ts', 'lib/rules/level-up.ts'] },
  invocation: { status: 'missing', note: '尚無祈喚選擇、先決條件與相依祈喚的替換檢查。', evidence: ['lib/rules/level-up.ts', 'components/level-up/level-up-view.tsx'] },
  wildShape: { status: 'missing', note: '已有荒野形態使用次數，尚無已知形態名額與 CR／飛行限制的選擇流程。', evidence: ['lib/rules/class-resources.ts', 'lib/domain/character.ts'] },
  origin: { status: 'missing', note: '人類額外起源專長目前僅有特性文字，沒有建角選擇欄位。', evidence: ['lib/creation/creation-data.json', 'lib/creation/build.ts'] },
} satisfies Record<string, Coverage>;
export type CoverageKey = keyof typeof COVERAGE;
export const COVERAGE_LABELS = { supported: '已支援選擇', partial: '部分支援', missing: '尚未支援' };
