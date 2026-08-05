import type { Character } from '@/lib/domain/character';

/**
 * 立繪卡：角色頁最具識別度的元件。
 *
 * 規格逐項對照 Flutter 端 overview_tab 的 `_heroCard`：
 * - 4:5 比例、最大寬 420px、置中
 * - 三段垂直漸層底（#2E2418 → #1E160C → #14110C）＋ border 框、16px 圓角
 * - 立繪以 cover 填滿，套用持久化的取景（scale 與中心點）
 * - 底部由中段起的黑色漸層遮罩，確保文字可讀
 * - 文字自底部起：職業列（13px 字距 2 金色）／名稱（44px w700 白）／
 *   英文名（Cinzel 16px 字距 8 白 70%）／背景·陣營·信仰（14px 白 85%）
 */
export function PortraitCard({ c }: { c: Character }) {
  // 取景：Flutter 端存 scale 與正規化中心點，此處以 object-position 與
  // scale 表達同一件事。
  const objectPosition = `${c.portraitCenterX * 100}% ${c.portraitCenterY * 100}%`;

  return (
    <div className="mx-auto w-full max-w-[420px]">
      <div className="relative aspect-4/5 overflow-hidden rounded-character-header border border-border bg-linear-to-b from-[#2E2418] via-[#1E160C] to-[#14110C]">
        {c.portraitUrl ? (
          // 立繪為 Supabase Storage 的任意外部 URL，且需要 object-position
          // 取景；next/image 的最佳化在此無用武之地（來源已是壓縮好的上傳圖），
          // 反而要為每個 bucket 設定 remotePatterns。
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={c.portraitUrl}
            alt={`${c.name}的角色圖`}
            className="absolute inset-0 size-full object-cover"
            style={{ objectPosition, scale: c.portraitScale }}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="font-display text-[72px] text-white/10">
              {c.name.slice(0, 1)}
            </span>
          </div>
        )}

        {/* 底部漸層：自中段開始加深，確保文字可讀。 */}
        <div className="pointer-events-none absolute inset-0 bg-linear-to-b from-transparent from-50% to-black/80" />

        <div className="absolute inset-0 flex flex-col justify-end p-5">
          {(c.className || c.subclass) && (
            <p className="text-[13px] tracking-[2px] text-gold">
              {[
                c.className,
                c.classNameEn.toUpperCase(),
              ]
                .filter(Boolean)
                .join(' ')}
              {c.subclass && ` · ${c.subclass}`}
            </p>
          )}
          <h1 className="mt-1.5 text-[44px] font-bold leading-[1.05] text-white">
            {c.name}
          </h1>
          {c.nameEn && (
            <p className="font-display text-[16px] tracking-[8px] text-white/70">
              {c.nameEn.toUpperCase()}
            </p>
          )}
          {(c.background || c.alignment || c.deity) && (
            <p className="mt-2.5 text-[14px] text-white/85">
              {[c.background, c.alignment, c.deity && `${c.deity}信徒`]
                .filter(Boolean)
                .join(' · ')}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
