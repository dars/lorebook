import type { Character } from '@/lib/domain/character';

/**
 * 幣別的視覺／文字規格，對照 Flutter 端 `inventory_tab.dart` 的 `_coinSpecs`。
 *
 * 財富卡與資產計算機共用同一份定義，避免圖示與順序分岔。圖示裁自
 * designs/images/coin.PNG（鐵砧＝銅、彎月＝銀、琥珀寶石＝琥珀金、
 * 太陽＝金、八芒星＝鉑金）。
 */
export type CoinCode = 'pp' | 'gp' | 'ep' | 'sp' | 'cp';

export const COIN_SPECS: { code: CoinCode; label: string; src: string }[] = [
  { code: 'pp', label: '鉑金', src: '/images/coins/coin_pp.png' },
  { code: 'gp', label: '金幣', src: '/images/coins/coin_gp.png' },
  { code: 'ep', label: '琥珀金', src: '/images/coins/coin_ep.png' },
  { code: 'sp', label: '銀幣', src: '/images/coins/coin_sp.png' },
  { code: 'cp', label: '銅幣', src: '/images/coins/coin_cp.png' },
];

/** 計算機的幣別列由小到大；序位同時決定「只能由大到小依序點選」的限制。 */
export const ASCENDING_CODES: CoinCode[] = ['cp', 'sp', 'ep', 'gp', 'pp'];

export const coinRank = (code: CoinCode) => ASCENDING_CODES.indexOf(code);

export const SPEC_BY_CODE = Object.fromEntries(
  COIN_SPECS.map((s) => [s.code, s]),
) as Record<CoinCode, (typeof COIN_SPECS)[number]>;

/** 「金幣（gp）」——tooltip 與螢幕閱讀器共用的幣別說明。 */
export const coinTitle = (code: CoinCode) =>
  `${SPEC_BY_CODE[code]?.label ?? code}（${code}）`;

export function CoinIcon({
  code,
  size = 16,
}: {
  code: CoinCode;
  size?: number;
}) {
  const spec = SPEC_BY_CODE[code];
  if (!spec) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- 靜態小圖示
    <img
      src={spec.src}
      alt={spec.label}
      // 16px 的圖示分不出太陽（gp）、琥珀寶石（ep）與八芒星（pp）——而
      // 「1🪙5🪙」是 1pp5gp 還是 1gp5sp 差十倍。滑鼠停留給出答案。
      title={coinTitle(code)}
      width={size}
      height={size}
      style={{ width: size, height: size }}
      className="inline-block shrink-0 align-middle"
    />
  );
}

/**
 * 財富卡，對照 Flutter 的 `_Treasury`：五個等寬欄位，每欄 32px 幣圖在上、
 * 數量在下。**五種幣別一律全列**（含 0），不因為是 0 就隱藏——那是財富的
 * 完整狀態，缺欄會讓人以為壞掉。
 */
export function Treasury({
  currency,
  onTap,
}: {
  currency: Character['currency'];
  /** 唯讀（分享檢視）時不傳——金額仍顯示，但不開啟計算機。 */
  onTap?: () => void;
}) {
  const coins = (
    <div className="flex py-4">
      {COIN_SPECS.map((s) => (
        <div key={s.code} className="flex flex-1 flex-col items-center">
          <CoinIcon code={s.code} size={32} />
          <span className="font-display mt-1.5 text-[18px] font-bold text-text-primary">
            {currency[s.code]}
          </span>
        </div>
      ))}
    </div>
  );

  if (!onTap) return coins;

  return (
    <button
      type="button"
      onClick={onTap}
      aria-label="開啟資產計算機"
      className="w-full"
    >
      {coins}
    </button>
  );
}

/**
 * 以「數字＋幣別圖示」呈現 cp 總額（拆為 pp/gp/sp/cp，**不產生 ep**），
 * 對照 Flutter 端的 `CoinAmount`。取代純文字的 formatCp 顯示。
 *
 * 全 App 的金額一律走這裡——純文字幣別（「3 gp」）不符既有的呈現慣例。
 */
export function CoinAmount({
  cp,
  coinSize = 16,
  className = '',
  textClassName = 'text-[14px]',
}: {
  cp: number;
  coinSize?: number;
  className?: string;
  /** 數字的字級。外層 className 蓋不到它——數字有自己的 span。 */
  textClassName?: string;
}) {
  let rest = cp;
  const parts: [CoinCode, number][] = [];
  for (const [code, value] of [
    ['pp', 1000],
    ['gp', 100],
    ['sp', 10],
    ['cp', 1],
  ] as [CoinCode, number][]) {
    const n = Math.trunc(rest / value);
    rest %= value;
    if (n > 0) parts.push([code, n]);
  }
  if (parts.length === 0) parts.push(['cp', 0]);

  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      {parts.map(([code, n]) => (
        // title 掛在整組上（不只圖示）：滑鼠通常停在數字而不是那顆小圖。
        <span
          key={code}
          title={coinTitle(code)}
          className="inline-flex items-center gap-0.5"
        >
          <span className={`font-display font-bold ${textClassName}`}>{n}</span>
          <CoinIcon code={code} size={coinSize} />
        </span>
      ))}
    </span>
  );
}
