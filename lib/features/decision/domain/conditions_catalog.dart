/// D&D 5.5e（2024）標準異常狀態（Conditions）本機常數。
///
/// 力竭（Exhaustion）為特例：以等級 0–6 累進（`leveled = true`），
/// 其餘為二元狀態（有/無）。
class ConditionInfo {
  final String name; // 中文
  final String nameEn;
  final String effect; // 簡短效果說明
  final bool leveled; // 力竭 = true（以等級表示）

  const ConditionInfo({
    required this.name,
    required this.nameEn,
    required this.effect,
    this.leveled = false,
  });
}

/// 15 種標準狀態（依英文名排序）。
const kConditions = <ConditionInfo>[
  ConditionInfo(
    name: '目盲',
    nameEn: 'Blinded',
    effect: '看不見；你的攻擊有劣勢、攻擊你有優勢；自動失敗需視覺的檢定。',
  ),
  ConditionInfo(
    name: '魅惑',
    nameEn: 'Charmed',
    effect: '不能攻擊魅惑你的來源；對方對你的社交檢定有優勢。',
  ),
  ConditionInfo(name: '耳聾', nameEn: 'Deafened', effect: '聽不見；自動失敗需聽覺的檢定。'),
  ConditionInfo(
    name: '力竭',
    nameEn: 'Exhaustion',
    effect: '每級對所有 d20 檢定 −2、速度每級 −5 呎；第 6 級死亡。',
    leveled: true,
  ),
  ConditionInfo(
    name: '恐懼',
    nameEn: 'Frightened',
    effect: '來源在視線內時攻擊與檢定有劣勢；無法主動接近來源。',
  ),
  ConditionInfo(name: '被擒抱', nameEn: 'Grappled', effect: '速度歸 0；無法受益於速度加成。'),
  ConditionInfo(
    name: '失能',
    nameEn: 'Incapacitated',
    effect: '無法執行動作、附贈動作或反應（含施法）。',
  ),
  ConditionInfo(name: '隱形', nameEn: 'Invisible', effect: '看不見；你攻擊有優勢、攻擊你有劣勢。'),
  ConditionInfo(
    name: '麻痺',
    nameEn: 'Paralyzed',
    effect: '失能且無法移動或說話；自動失敗 STR/DEX 豁免；攻擊你有優勢；近身命中必為重擊。',
  ),
  ConditionInfo(
    name: '石化',
    nameEn: 'Petrified',
    effect: '化為石；失能、無察覺；對多數傷害有抗性；免疫中毒與疾病。',
  ),
  ConditionInfo(name: '中毒', nameEn: 'Poisoned', effect: '攻擊檢定與能力檢定有劣勢。'),
  ConditionInfo(
    name: '倒地',
    nameEn: 'Prone',
    effect: '只能爬行；近戰攻擊你有優勢、遠程攻擊你有劣勢；你的攻擊有劣勢。',
  ),
  ConditionInfo(
    name: '束縛',
    nameEn: 'Restrained',
    effect: '速度歸 0；你攻擊有劣勢、攻擊你有優勢；DEX 豁免有劣勢。',
  ),
  ConditionInfo(
    name: '震懾',
    nameEn: 'Stunned',
    effect: '失能、無法移動、說話含糊；自動失敗 STR/DEX 豁免；攻擊你有優勢。',
  ),
  ConditionInfo(
    name: '昏迷',
    nameEn: 'Unconscious',
    effect: '失能、倒地、無察覺；自動失敗 STR/DEX 豁免；攻擊你有優勢；近身命中必為重擊。',
  ),
];

/// 依中文名查 ConditionInfo（找不到回傳 null）。
ConditionInfo? conditionByName(String name) {
  for (final c in kConditions) {
    if (c.name == name) return c;
  }
  return null;
}
