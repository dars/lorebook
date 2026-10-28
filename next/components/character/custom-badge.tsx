/**
 * 「自訂」標示——角色卡上標記使用者自創的內容（背景、子職、自創特性）。
 *
 * 用文字而非圖示或色塊：新手看到「自訂」知道那是什麼，看到一個小星號不知道。
 * 這與 chip 一律「文字＋數值」的既有慣例一致。
 *
 * 金色描邊在羊皮紙底與立繪的深色底上都讀得出來，因此不分變體。
 */
export function CustomBadge({ className = '' }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-chip border border-gold/60 px-1.5 py-px align-middle text-small leading-none text-gold ${className}`}
    >
      自訂
    </span>
  );
}
