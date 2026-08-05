/**
 * 屬性盾牌，對照 Flutter 端的 `AbilityShield`。
 *
 * 盾形路徑與 Flutter 的 CustomPainter 完全相同（比例座標）：
 *   M 0.5,0 → L 1,0.06 → L 1,0.55 → Q 1,0.82 0.5,1 → Q 0,0.82 0,0.55 → L 0,0.06 → Z
 * 用 SVG 而非 clip-path：需要同時填色與描邊，clip-path 只能裁切。
 *
 * 施法屬性以金色高亮（框線 ＋ 8% 金色底），與 Flutter 一致。
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
    <div className="relative aspect-[0.82]">
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
          strokeWidth={1.5}
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center pb-2 pl-1.5 pr-1.5 pt-1">
        <span className="text-[11px] text-text-primary">{nameCn}</span>
        <span
          className={`mt-0.5 text-[24px] font-bold leading-none ${
            highlighted ? 'text-gold' : 'text-text-primary'
          }`}
        >
          {sign}
        </span>
        <span className="font-label mt-0.5 text-[9px] tracking-wider text-text-primary/50">
          {nameEn}
        </span>
        {/* 原始值以圓形徽章置於盾牌下緣。 */}
        <span
          className={`mt-1.5 flex size-6 items-center justify-center rounded-full border bg-surface-0 text-[11px] text-text-primary ${
            highlighted ? 'border-gold' : 'border-border'
          }`}
        >
          {score}
        </span>
      </div>
    </div>
  );
}
