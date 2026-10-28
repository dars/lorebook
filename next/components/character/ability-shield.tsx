/**
 * 屬性盾牌，對照 Flutter 端的 `AbilityShield`。
 *
 * 盾形路徑與 Flutter 的 CustomPainter 完全相同（比例座標）：
 *   M 0.5,0 → L 1,0.06 → L 1,0.55 → Q 1,0.82 0.5,1 → Q 0,0.82 0,0.55 → L 0,0.06 → Z
 * 用 SVG 而非 clip-path：需要同時填色與描邊，clip-path 只能裁切。
 *
 * 施法屬性以金色高亮（框線 ＋ 8% 金色底），與 Flutter 一致。
 *
 * 修正值與原始值走 Cinzel（`font-display`）。這裡是整張屬性頁的視覺焦點，
 * 掉回內文字體會讓六個盾牌看起來像表格欄位。
 *
 * ## 內容隨盾牌縮放
 *
 * 六面盾牌永遠是一排等分（各斷點皆然），寬度因此從手機的 ~50px 到寬螢幕的
 * ~240px 都有可能，而盾形是 aspect-ratio 撐開的。字級若寫死：
 *
 * - 太窄 → 24px 的修正值與 24px 的圓圈直接撐破盾牌
 * - 太寬 → 內容縮在中間一小坨，四周一圈空白
 *
 * 所以所有尺寸都以容器寬度換算的單位 `--u` 表示（container query 的 `cqw`）。
 * 基準是 120px 寬的盾牌 → `--u = 1.2px`，此時各項數值正好等於 Flutter 的
 * 11 / 24 / 9 / 24 / 11。上限 1.5px（125%）避免在超寬螢幕上長成招牌。
 *
 * Flutter 用的是 `FittedBox(scaleDown)`——只縮不放，所以它只解決了太窄那一
 * 半；太寬那一半在線上版仍看得到。這裡兩邊都處理。
 */
export function AbilityShield({
  nameCn,
  nameEn,
  modifier,
  score,
  highlighted = false,
}: {
  nameCn: string;
  nameEn: string;
  modifier: number;
  score: number;
  highlighted?: boolean;
}) {
  const sign = modifier >= 0 ? `+${modifier}` : `${modifier}`;

  return (
    <div className="@container relative aspect-[0.82] [--u:min(1cqw,1.5px)]">
      <svg
        viewBox="0 0 100 122"
        preserveAspectRatio="none"
        className="absolute inset-0 size-full"
        aria-hidden
      >
        <path
          d="M50 0 L100 7.3 L100 67.1 Q100 100 50 122 Q0 100 0 67.1 L0 7.3 Z"
          className={
            highlighted
              ? 'fill-gold/8 stroke-gold'
              : 'fill-surface-1 stroke-border'
          }
          strokeWidth={1.2}
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      {/* 內容**垂直置中**。Flutter 是 Padding + FittedBox（預設 alignment
          center），靠上排會讓盾牌下半部空掉一塊、重心整個往上跑。 */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pb-[calc(var(--u)*6.7)] pl-[calc(var(--u)*5)] pr-[calc(var(--u)*5)] pt-[calc(var(--u)*3.3)]">
        <span className="text-[calc(var(--u)*9.2)] leading-tight text-text-primary">
          {nameCn}
        </span>
        <span
          className={`font-display mt-[calc(var(--u)*1.7)] text-[calc(var(--u)*20)] font-bold leading-none ${
            highlighted ? 'text-gold' : 'text-text-primary'
          }`}
        >
          {sign}
        </span>
        <span className="font-label mt-[calc(var(--u)*1.7)] text-[calc(var(--u)*7.5)] leading-tight tracking-[calc(var(--u)*0.83)] text-text-secondary">
          {nameEn}
        </span>
        {/* 原始值以圓形徽章置於盾牌下緣。 */}
        <span
          className={`font-display mt-[calc(var(--u)*5)] flex size-[calc(var(--u)*20)] items-center justify-center rounded-full border bg-surface-0 text-[calc(var(--u)*9.2)] font-bold text-text-primary ${
            highlighted ? 'border-gold' : 'border-border'
          }`}
        >
          {score}
        </span>
      </div>
    </div>
  );
}
