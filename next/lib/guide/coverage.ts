/** 支援程度只描述選擇流程，不替能力的所有自動效果背書。 */
export const COVERAGE_CHECKED_ON = '2026-10-29';
export type Coverage = { status: 'supported' | 'partial' | 'missing'; note: string; evidence: string[] };
export const COVERAGE = {
  skills: { status: 'supported', note: "建角提供職業技能；成長選擇補上額外技能與熟練專長，檢查數量及重複。", evidence: ["components/creation/create-wizard.tsx", "lib/rules/progression/engine.ts"] },
  subclass: { status: 'supported', note: "3 級可選 SRD 或自創子職，也可補選；SRD 子職的分支選擇納入成長流程。", evidence: ["components/level-up/level-up-view.tsx", "lib/rules/progression/groups.ts"] },
  feat: { status: 'supported', note: "能力值提升、起源、戰鬥風格、一般專長及 19 級史詩恩賜可選；檢查前置條件與專長內的額外選擇。", evidence: ["lib/rules/feats.ts", "lib/rules/progression/groups.ts"] },
  spells: { status: 'supported', note: "依職業等級提供新增與替換名額；額外授予法術保留來源，不占一般已備名額。", evidence: ["lib/rules/progression/groups.ts", "lib/rules/progression/engine.ts"] },
  spellbook: { status: 'supported', note: "法術書與已備法術分開；每級與塑能學者免費名額獨立，冒險抄錄可另行加入。", evidence: ["components/spells/spell-picker.tsx", "lib/rules/progression/groups.ts"] },
  equipment: { status: 'supported', note: "提供職業起始裝備或購裝金額選擇；既有角色可登記已領取，避免重複發放。", evidence: ["lib/rules/progression/equipment.ts"] },
  languages: { status: 'supported', note: "依來源提供語言、樂器及工具熟練名額，保留玩家原有紀錄。", evidence: ["lib/rules/progression/groups.ts", "lib/rules/progression/engine.ts"] },
  expertise: { status: 'supported', note: "只能選已熟練技能，取得雙倍熟練加值；升級後會重新計算。", evidence: ["lib/rules/progression/engine.ts"] },
  style: { status: 'supported', note: "戰士、聖騎士及遊俠依等級選風格；替代戲法、勇士額外風格與替換限制各自處理。", evidence: ["lib/rules/progression/groups.ts"] },
  mastery: { status: 'supported', note: "依職業限制武器種類、名額與長休替換數量；戰士及野蠻人每次僅換一種。", evidence: ["lib/rules/progression/groups.ts", "lib/rules/progression/engine.ts"] },
  classOption: { status: 'supported', note: "神聖／原初職責、祝福打擊、元素之怒、祕法奧秘、法術精通及 SRD 子職分支均可選擇並保存。", evidence: ["lib/rules/progression/groups.ts"] },
  metamagic: { status: 'supported', note: "依等級提供 2／4／6 項超魔，每次升級最多替換一項。", evidence: ["lib/rules/progression/groups.ts"] },
  invocation: { status: 'supported', note: "依等級提供祈喚名額，檢查戲法及前置祈喚；魔書與先人教誨有獨立子選項。", evidence: ["lib/rules/progression/groups.ts", "lib/rules/progression/engine.ts"] },
  wildShape: { status: 'supported', note: "記錄已知形態名稱、CR 與飛行條件，依等級限制數量與長休替換；不收錄野獸數據。", evidence: ["lib/rules/progression/groups.ts", "components/progression/choice-editor.tsx"] },
  origin: { status: 'supported', note: "人類額外起源專長與背景分開；法術新手、熟練的內部選擇與重複限制均納入。", evidence: ["lib/rules/progression/groups.ts"] },
} satisfies Record<string, Coverage>;
export type CoverageKey = keyof typeof COVERAGE;
export const COVERAGE_LABELS = { supported: '已支援選擇', partial: '部分支援', missing: '尚未支援' };
