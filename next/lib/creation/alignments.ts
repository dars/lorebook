/**
 * 九宮陣營。中文與英文成對——角色卡兩邊都要顯示。
 *
 * 抽成共用模組是因為它有**兩個**使用者：建角流程與基本資訊編輯器。
 * 原本只住在編輯器裡，建角那邊因此整個少掉陣營欄位。
 *
 * 用固定選單而非自由填空，遵循「開軌道選單不開自由填空」的原則。
 */
export const ALIGNMENTS: [string, string][] = [
  ['守序善良', 'Lawful Good'],
  ['中立善良', 'Neutral Good'],
  ['混亂善良', 'Chaotic Good'],
  ['守序中立', 'Lawful Neutral'],
  ['絕對中立', 'True Neutral'],
  ['混亂中立', 'Chaotic Neutral'],
  ['守序邪惡', 'Lawful Evil'],
  ['中立邪惡', 'Neutral Evil'],
  ['混亂邪惡', 'Chaotic Evil'],
];

export const alignmentEnFor = (cn: string) =>
  ALIGNMENTS.find(([c]) => c === cn)?.[1] ?? '';
