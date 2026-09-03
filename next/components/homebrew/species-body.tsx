import { ParchmentCard } from '@/components/ui/decorations';
import { sizeCn } from '@/lib/creation/data';
import type { CustomSpecies } from '@/lib/species/types';

/**
 * 自訂種族的內容區塊。
 *
 * 順序照「要不要用它」的判斷順序：先是機制數值（速度、體型、黑暗視覺、
 * 每級額外 HP、種族技能），再是會佔用資源格的有限次數能力，最後才是純文字
 * 的特性。全部純文字，不進標記解析路徑。
 */
export function SpeciesBody({ s }: { s: CustomSpecies }) {
  const sizeLabel =
    s.sizeMode === 'choice'
      ? '中型或小型（建角時選擇）'
      : sizeCn(s.sizeMode === 'small' ? 'Small' : 'Medium');

  return (
    <div className="mt-3 space-y-3">
      {s.description && (
        <ParchmentCard className="p-4">
          <p className="whitespace-pre-wrap text-small leading-relaxed text-text-primary">
            {s.description}
          </p>
        </ParchmentCard>
      )}

      <ParchmentCard className="p-4">
        <Row label="速度" value={`${s.speedFt} 呎`} />
        <Row label="體型" value={sizeLabel} />
        <Row
          label="黑暗視覺"
          value={s.darkvisionFt > 0 ? `${s.darkvisionFt} 呎` : '無'}
        />
        {s.hpPerLevel > 0 && (
          <Row label="每級額外 HP" value={`+${s.hpPerLevel}`} />
        )}
        {s.skillPickCount > 0 && (
          <Row
            label={`種族技能（選 ${s.skillPickCount}）`}
            value={s.skillPickFrom.join('、')}
          />
        )}
      </ParchmentCard>

      {s.abilities.length > 0 && (
        <ParchmentCard className="p-4">
          <div className="font-label text-[10px] tracking-[1.5px] text-section-label">
            LIMITED USES · 有限次數能力
          </div>
          <div className="mt-2 space-y-3">
            {s.abilities.map((a, i) => (
              <div key={i}>
                <p className="text-[15px] font-semibold text-text-primary">
                  {a.name}
                  <span className="ml-2 text-tiny font-normal text-text-secondary">
                    {a.uses === 'proficiency' ? '熟練加值' : a.uses} 次／
                    {a.recovery === 'short' ? '短休' : '長休'}
                  </span>
                </p>
                {a.description && (
                  <p className="mt-1 whitespace-pre-wrap text-small leading-relaxed text-text-light">
                    {a.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        </ParchmentCard>
      )}

      {s.traits.length > 0 && (
        <ParchmentCard className="p-4">
          <div className="font-label text-[10px] tracking-[1.5px] text-section-label">
            TRAITS · 特性
          </div>
          <div className="mt-2 space-y-3">
            {s.traits.map((t, i) => (
              <div key={i}>
                <p className="text-[15px] font-semibold text-text-primary">
                  {t.name}
                  {t.nameEn && (
                    <span className="font-label ml-2 text-tiny text-text-primary/70">
                      {t.nameEn}
                    </span>
                  )}
                </p>
                {t.description && (
                  <p className="mt-1 whitespace-pre-wrap text-small leading-relaxed text-text-light">
                    {t.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        </ParchmentCard>
      )}
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
