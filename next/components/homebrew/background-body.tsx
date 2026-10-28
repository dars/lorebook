import { CustomBadge } from '@/components/character/custom-badge';
import { ParchmentCard } from '@/components/ui/decorations';
import type { CustomBackground } from '@/lib/backgrounds/types';
import { abilityLabels } from '@/lib/creation/data';

/**
 * 自訂背景的內容區塊。
 *
 * 欄位順序照建角時的閱讀順序：先看能力與技能（決定要不要用），再看起源專長
 * （通常是差異最大的一項）。全部純文字。
 */
export function BackgroundBody({ b }: { b: CustomBackground }) {
  return (
    <div className="mt-3 space-y-3">
      {b.description && (
        <ParchmentCard className="p-4">
          <p className="whitespace-pre-wrap text-small leading-relaxed text-text-primary">
            {b.description}
          </p>
        </ParchmentCard>
      )}

      <ParchmentCard className="p-4">
        <Row label="能力值加值候選" value={abilityLabels(b.abilities)} />
        <Row label="技能熟練" value={b.skills.join('、')} />
        {b.toolProficiency && (
          <Row label="工具熟練" value={b.toolProficiency} />
        )}
      </ParchmentCard>

      <ParchmentCard className="p-4">
        <div className="font-label text-eyebrow tracking-[1.5px] text-section-label">
          ORIGIN FEAT · 起源專長
        </div>
        <p className="mt-1 text-body font-semibold text-text-primary">
          {b.originFeat}
          {/* 專長本身是不是自創的，與「背景是自創的」是兩件事——以自訂背景
              選了 SRD 專長時，那個專長仍是 SRD 的。 */}
          {b.originFeatCustom && <CustomBadge className="ml-1.5" />}
        </p>
        {b.originFeatDescription && (
          <p className="mt-2 whitespace-pre-wrap text-small leading-relaxed text-text-light">
            {b.originFeatDescription}
          </p>
        )}
      </ParchmentCard>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3 py-1 text-small">
      <span className="w-[110px] shrink-0 text-text-secondary">{label}</span>
      <span className="text-text-primary">{value}</span>
    </div>
  );
}
