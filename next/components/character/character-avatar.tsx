import type { Character } from '@/lib/domain/character';

/**
 * 角色頭像，對照 Flutter 端的 `CharacterAvatar`。
 *
 * 無圖時顯示「未知人像」佔位圖（`unknown.jpg`，黑霧金瞳），**不是首字母**——
 * 那張圖是這個 App 的識別之一，各顯示點共用同一份。
 *
 * 佔位圖高於寬，Flutter 以 `Alignment(0, -0.4)` 取上緣偏中讓眼睛落在圓框內；
 * 對應到 CSS 即 `object-position: 50% 30%`。
 */
export function CharacterAvatar({
  c,
  size,
  className = '',
}: {
  c: Character;
  /** 直徑（px）。 */
  size: number;
  className?: string;
}) {
  const style = { width: size, height: size };

  if (!c.portraitUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- 靜態佔位圖，無需最佳化
      <img
        src="/images/unknown.jpg"
        alt=""
        style={{ ...style, objectPosition: '50% 30%' }}
        className={`shrink-0 rounded-full border-[1.5px] border-gold object-cover ${className}`}
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- 外部 Storage URL
    <img
      src={c.portraitUrl}
      alt=""
      style={{
        ...style,
        objectPosition: `${c.portraitCenterX * 100}% ${c.portraitCenterY * 100}%`,
      }}
      className={`shrink-0 rounded-full border-[1.5px] border-gold object-cover ${className}`}
    />
  );
}
