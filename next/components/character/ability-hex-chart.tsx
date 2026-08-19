import { ABILITY_ORDER } from '@/lib/creation/data';

/**
 * 能力六角圖，對照 Flutter 端的 `AbilityHexChart`。
 *
 * 建角時的價值不在精確讀數（數字就在旁邊），而在**形狀**：哪兩軸突出、哪軸凹
 * 下去，一眼就知道這是什麼角色。少了它，配點只剩六個孤立的數字。
 *
 * 用 SVG 而非 canvas：尺寸隨容器縮放不糊、色彩直接吃 CSS token，深淺色主題
 * 各自正確。
 */

const LABEL: Record<string, string> = {
  STR: '力量', DEX: '敏捷', CON: '體質',
  INT: '智力', WIS: '感知', CHA: '魅力',
};

/**
 * 分數 → 半徑比例，與 Flutter 的 `_hexValue` 一致。
 *
 * 不是 `score/20`：D&D 的分數實際落在 8–18，那樣算出來的圖形全都擠在中間
 * 一小圈，看不出差別。改成把 6–18 拉滿整個半徑，差距才讀得出來。
 * 下限 0.15 是為了讓最低的軸仍看得見——縮到圓心會讓多邊形變成尖角。
 */
const hexRatio = (finalScore: number) =>
  finalScore <= 0
    ? 0.15
    : Math.max(0.15, Math.min((finalScore - 6) / 12, 1));

/** 格線圈的半徑比例，與 Flutter 一致。 */
const RING_RATIOS = [0.4, 0.7, 1];

export function AbilityHexChart({
  scores,
  size = 200,
}: {
  /** 能力代碼 → 分數；null／缺值以 0 計（該軸縮到中心）。 */
  scores: Record<string, number | null>;
  size?: number;
}) {
  // viewBox 固定，實際尺寸交給 CSS——同一份座標在任何尺寸下都成立。
  // 半徑 100 但畫布 260：留 30 給正上方與正下方的標籤，不留就會被裁掉。
  const R = 100;
  const cx = 130;
  const cy = 130;
  const LABEL_GAP = 18;

  // 力量在正上方，其餘順時針。與能力值列表的順序一致，兩邊才能互相對照。
  const angleAt = (i: number) => (Math.PI * 2 * i) / 6 - Math.PI / 2;
  const pointAt = (i: number, r: number) => [
    cx + Math.cos(angleAt(i)) * r,
    cy + Math.sin(angleAt(i)) * r,
  ];
  const polygon = (radii: number[]) =>
    radii.map((r, i) => pointAt(i, r).join(',')).join(' ');

  const values = ABILITY_ORDER.map((code) => {
    const v = scores[code];
    return v === null || v === undefined ? 0 : Math.max(0, Math.min(v, 20));
  });
  const dataRadii = values.map((v) => hexRatio(v) * R);
  const anyValue = values.some((v) => v > 0);

  return (
    <svg
      viewBox="0 0 260 260"
      width={size}
      height={size}
      role="img"
      aria-label={`能力分布：${ABILITY_ORDER.map(
        (c) => `${LABEL[c]} ${scores[c] ?? '未定'}`,
      ).join('、')}`}
      className="max-w-full"
    >
      {/* 格線圈。最外圈稍亮，作為「滿格在哪」的參考。 */}
      {RING_RATIOS.map((ratio, i) => (
        <polygon
          key={ratio}
          points={polygon(Array(6).fill(R * ratio))}
          className="fill-none stroke-border"
          strokeWidth={i === RING_RATIOS.length - 1 ? 1.2 : 0.8}
          opacity={i === RING_RATIOS.length - 1 ? 0.9 : 0.45}
        />
      ))}

      {/* 自中心到各頂點的軸線 */}
      {ABILITY_ORDER.map((code, i) => {
        const [x, y] = pointAt(i, R);
        return (
          <line
            key={code}
            x1={cx}
            y1={cy}
            x2={x}
            y2={y}
            className="stroke-border"
            strokeWidth={0.8}
            opacity={0.45}
          />
        );
      })}

      {/* 資料多邊形。全未填時不畫——一個縮在中心的點會被誤讀成「全部都是 0」。 */}
      {anyValue && (
        <polygon
          points={polygon(dataRadii)}
          className="fill-gold stroke-gold"
          fillOpacity={0.22}
          strokeWidth={2}
          strokeLinejoin="round"
        />
      )}

      {ABILITY_ORDER.map((code, i) => {
        const [x, y] = pointAt(i, R + LABEL_GAP);
        return (
          <text
            key={code}
            x={x}
            y={y}
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-text-secondary text-[11px]"
          >
            {LABEL[code]}
          </text>
        );
      })}
    </svg>
  );
}
