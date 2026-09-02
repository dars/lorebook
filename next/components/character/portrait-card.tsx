import type { Character } from '@/lib/domain/character';
import { CustomBadge } from './custom-badge';

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
export function PortraitCard({
  c,
  onEdit,
}: {
  c: Character;
  /** 編輯入口。唯讀檢視不傳——立繪僅供觀看。 */
  onEdit?: () => void;
}) {
  // 取景：Flutter 端存 scale 與正規化中心點，此處以 object-position 與
  // scale 表達同一件事。
  const objectPosition = `${c.portraitCenterX * 100}% ${c.portraitCenterY * 100}%`;

  return (
    <div className="mx-auto w-full max-w-[420px]">
      <div className="relative aspect-square overflow-hidden rounded-character-header border border-border bg-linear-to-b from-[#2E2418] via-[#1E160C] to-[#14110C] medium:aspect-4/5">
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
          // 無圖時的「未知人像」，與 Flutter overview_tab 相同（BoxFit.cover）。
          // eslint-disable-next-line @next/next/no-img-element -- 靜態佔位圖
          <img
            src="/images/unknown.jpg"
            alt=""
            className="absolute inset-0 size-full object-cover"
          />
        )}

        {/* 底部漸層：自中段開始加深，確保文字可讀。 */}
        <div className="pointer-events-none absolute inset-0 bg-linear-to-b from-transparent from-50% to-black/80" />

        {onEdit && (
          <button
            type="button"
            onClick={onEdit}
            aria-label="更換角色圖"
            className="absolute right-3 top-3 flex size-11 items-center justify-center rounded-full border border-border bg-black/60"
          >
            <svg viewBox="0 0 24 24" className="size-[18px] fill-white/90" aria-hidden>
              <path d="M9 3 7.2 5H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-3.2L15 3zm3 5a6 6 0 1 1 0 12 6 6 0 0 1 0-12m0 2a4 4 0 1 0 0 8 4 4 0 0 0 0-8" />
            </svg>
          </button>
        )}

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
              {c.customSubclass && <CustomBadge className="ml-1.5" />}
            </p>
          )}
          <h1 className="mt-1.5 text-[36px] font-bold leading-[1.05] text-white medium:text-[44px]">
            {c.name}
          </h1>
          {c.nameEn && (
            <p className="font-display text-[16px] tracking-[8px] text-white/70">
              {c.nameEn.toUpperCase()}
            </p>
          )}
          {(c.background || c.alignment || c.deity) && (
            <p className="mt-2.5 text-[14px] text-white/85">
              {c.background}
              {c.backgroundIsCustom && <CustomBadge className="ml-1.5" />}
              {/* 徽章是元素，不能再用 join(' · ')——分隔符改由各項自帶。 */}
              {[c.alignment, c.deity && `${c.deity}信徒`]
                .filter(Boolean)
                .map((s, i) => (
                  <span key={i}>
                    {(c.background || i > 0) && ' · '}
                    {s}
                  </span>
                ))}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
