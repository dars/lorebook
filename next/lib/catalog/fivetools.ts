/**
 * 5etools 文字的純解析層，移植自 Flutter 端的 `fivetools_text.dart`。
 * 驗收依據為 golden/ft_plain_text.json、ft_flatten_entries.json、ft_format.json。
 *
 * 內容庫的規則文字帶有 `{@dice 1d8}`、`{@condition 無力}` 這類行內標記。
 * 規格明訂**未知標記與不成對括號須降級為純文字**，不得使畫面錯誤——那些
 * 降級路徑最容易在重寫時漏掉，golden 各有專門案例。
 */

/** 骰子／數值類標記（渲染層施以強調樣式）。 */
export const FT_DICE_TAGS = new Set([
  'dice', 'damage', 'scaledice', 'scaledamage', 'd20', 'hit', 'dc', 'chance',
]);

/** 規則參照類標記（渲染層施以強調色；未來可掛點擊導覽）。 */
export const FT_REF_TAGS = new Set([
  'spell', 'item', 'creature', 'condition', 'action', 'skill', 'sense', 'feat',
  'background', 'race', 'class', 'classFeature', 'subclassFeature',
  'optionalfeature', 'variantrule', 'deity', 'status', 'disease', 'reward',
  'object', 'table', 'hazard', 'vehicle', 'language', 'charoption', 'trap',
  'quickref', 'filter', 'book', 'adventure',
]);

export const FT_BOLD_TAGS = new Set(['b', 'bold']);
export const FT_ITALIC_TAGS = new Set(['i', 'italic']);

export type FtToken = {
  /** 標記名（如 'dice'）；純文字時為 null。 */
  tag: string | null;
  /** 標記內容以 `|` 切開的參數。 */
  parts: string[];
  /** 原始內容（純文字即原文；標記為大括號內去掉 `{@tag ` 的部分）。 */
  raw: string;
};

/**
 * 標記的顯示文字。
 *
 * 5etools 慣例：參照類 `{@spell 名稱|書源|顯示名}` 顯示名在第 3 參數；
 * 骰子類 `{@dice 1d8|顯示名}` 在第 2 參數；`{@dc 15}` → 'DC 15'、
 * `{@hit 5}` → '+5'（已帶正負號則不重複）。
 */
export function ftDisplay(t: FtToken): string {
  if (t.tag === null) return t.raw;
  if (t.tag === 'dc') return `DC ${t.parts[0]}`;
  if (t.tag === 'hit') {
    const v = t.parts[0];
    return v.startsWith('+') || v.startsWith('-') ? v : `+${v}`;
  }
  if (FT_DICE_TAGS.has(t.tag)) {
    return t.parts.length >= 2 && t.parts[1] !== '' ? t.parts[1] : t.parts[0];
  }
  if (FT_REF_TAGS.has(t.tag)) {
    return t.parts.length >= 3 && t.parts[2] !== '' ? t.parts[2] : t.parts[0];
  }
  // 樣式類與未知標記：顯示完整內容（可能含巢狀標記，由呼叫端遞迴）。
  return t.raw;
}

/**
 * 把含標記的文字切成 tokens。
 *
 * 支援巢狀大括號（`{@b 內含 {@dice 1d6}}`）；**不成對的大括號連同其後的
 * 文字原樣輸出**，不拋例外也不吞掉內容。
 */
export function ftTokenize(input: string): FtToken[] {
  const tokens: FtToken[] = [];
  let textStart = 0;
  let i = 0;

  while (i < input.length) {
    if (!input.startsWith('{@', i)) {
      i++;
      continue;
    }
    // 找到與 `{` 配對的 `}`（含巢狀）。
    let depth = 0;
    let j = i;
    while (j < input.length) {
      const ch = input[j];
      if (ch === '{') depth++;
      if (ch === '}') {
        depth--;
        if (depth === 0) break;
      }
      j++;
    }
    if (j >= input.length) break; // 不成對：其餘原樣輸出

    if (i > textStart) {
      tokens.push({ tag: null, parts: [], raw: input.slice(textStart, i) });
    }
    const inner = input.slice(i + 2, j); // 去掉 '{@' 與 '}'
    const sp = inner.indexOf(' ');
    if (sp < 0) {
      tokens.push({ tag: inner, parts: [''], raw: '' });
    } else {
      const content = inner.slice(sp + 1);
      tokens.push({ tag: inner.slice(0, sp), parts: content.split('|'), raw: content });
    }
    i = j + 1;
    textStart = i;
  }

  if (textStart < input.length) {
    tokens.push({ tag: null, parts: [], raw: input.slice(textStart) });
  }
  return tokens;
}

/** 把一段含標記的文字壓成純文字（標記取顯示名，遞迴展開巢狀）。 */
export function ftPlainText(input: string): string {
  let out = '';
  for (const t of ftTokenize(input)) {
    const styleOrUnknown =
      t.tag !== null &&
      (FT_BOLD_TAGS.has(t.tag) ||
        FT_ITALIC_TAGS.has(t.tag) ||
        (!FT_DICE_TAGS.has(t.tag) && !FT_REF_TAGS.has(t.tag)));
    // 樣式類／未知標記的內容可能還有巢狀標記。
    out += styleOrUnknown ? ftPlainText(ftDisplay(t)) : ftDisplay(t);
  }
  return out;
}

/**
 * 把 5etools entries 區塊壓成純文字：
 * 字串 → 段落；list 項目 → 「• 」開頭一行；具名巢狀區塊 → 「【名稱】」+ 內容；
 * table 捨棄（純文字無法表達）。段落以換行連接。
 */
export function ftFlattenEntries(entries: unknown[]): string {
  const parts: string[] = [];

  const walk = (e: unknown): void => {
    if (typeof e === 'string') {
      parts.push(ftPlainText(e));
      return;
    }
    if (e === null || typeof e !== 'object') return;
    const map = e as Record<string, unknown>;

    if (map.type === 'table') return; // 純文字無法表達，捨棄

    if (map.type === 'list') {
      for (const item of (map.items as unknown[]) ?? []) {
        if (typeof item === 'string') parts.push(`• ${ftPlainText(item)}`);
        else walk(item);
      }
      return;
    }

    const name = map.name as string | undefined;
    if (name) parts.push(`【${name}】`);
    for (const inner of ((map.entries ?? map.items) as unknown[]) ?? []) {
      walk(inner);
    }
  };

  for (const e of entries) walk(e);
  return parts.join('\n');
}

const TIME_UNITS: Record<string, string> = {
  action: '動作',
  bonus: '附贈動作',
  reaction: '反應',
  minute: '分鐘',
  hour: '小時',
};

/** `casting_time`（如 `[{unit:'action',number:1}]`）→ '1 動作'。 */
export function ftFormatCastingTime(castingTime: unknown[]): string {
  if (castingTime.length === 0) return '';
  const t = castingTime[0] as Record<string, unknown>;
  const unit = TIME_UNITS[t.unit as string] ?? `${t.unit ?? ''}`;
  return `${t.number ?? 1} ${unit}`.trim();
}

const SHAPES: Record<string, string> = {
  cone: '錐形',
  line: '直線',
  radius: '半徑',
  sphere: '球形',
  cube: '立方',
  hemisphere: '半球',
};

/** `range` 結構 → 顯示字串（'120呎'、'觸及'、'自身 (15呎錐形)'…）。 */
export function ftFormatRange(range: Record<string, unknown>): string {
  if (Object.keys(range).length === 0) return '';
  const dist = range.distance as Record<string, unknown> | undefined;

  const d = (): string => {
    switch (dist?.type) {
      case 'feet':
        return `${dist.amount}呎`;
      case 'miles':
        return `${dist.amount}哩`;
      case 'touch':
        return '觸及';
      case 'self':
        return '自身';
      case 'sight':
        return '視線';
      case 'unlimited':
        return '無限';
      default:
        return '';
    }
  };

  const type = range.type as string | undefined;
  if (type === 'point') return d();
  if (type === 'special') return '特殊';
  const shape = type ? SHAPES[type] : undefined;
  if (shape) return `自身 (${d()}${shape})`;
  return d();
}
