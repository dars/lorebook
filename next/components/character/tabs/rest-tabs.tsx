import { CollapsibleSection } from '@/components/ui/collapsible-section';
import { ParchmentCard } from '@/components/ui/decorations';
import type { Character } from '@/lib/domain/character';
import { formatCp } from '@/lib/rules/currency';

/** 法術／物品／傳記三個分頁。版面語彙與其他分頁一致（區段標題＋卡片）。 */

export function SpellsTab({ c }: { c: Character }) {
  return (
    <div className="px-4 pb-10">
      <CollapsibleSection en="SPELLCASTING" cn="施法" first>
        <div className="flex gap-2">
          {[
            { v: `${c.spellDc}`, s: '法術 DC' },
            { v: c.spellAttack >= 0 ? `+${c.spellAttack}` : `${c.spellAttack}`, s: '法術命中' },
            { v: c.spellcastingAbility || '—', s: '施法屬性' },
          ].map((x) => (
            <ParchmentCard key={x.s} className="flex-1 py-3">
              <div className="flex flex-col items-center">
                <span className="font-display text-[22px] font-bold text-gold">
                  {x.v}
                </span>
                <span className="mt-0.5 text-[10px] text-text-primary/55">
                  {x.s}
                </span>
              </div>
            </ParchmentCard>
          ))}
        </div>
      </CollapsibleSection>

      {c.spellSlots.length > 0 && (
        <CollapsibleSection en="SLOTS" cn="法術位">
          <ParchmentCard className="px-4 py-1">
            {c.spellSlots.map((s, i) => (
              <div
                key={s.level}
                className={`flex items-center justify-between py-2 ${i > 0 ? 'border-t border-border/40' : ''}`}
              >
                <span className="text-[13px] text-text-primary">
                  {s.level} 環
                </span>
                <span className="text-[15px] font-semibold text-gold">
                  {s.total - s.used}/{s.total}
                </span>
              </div>
            ))}
          </ParchmentCard>
        </CollapsibleSection>
      )}

      <SpellGroup title="CANTRIPS" cn="戲法" spells={c.cantrips} />
      <SpellGroup title="SPELLS" cn="法術" spells={c.spells} />
    </div>
  );
}

function SpellGroup({
  title,
  cn,
  spells,
}: {
  title: string;
  cn: string;
  spells: Character['spells'];
}) {
  if (spells.length === 0) return null;
  return (
    <CollapsibleSection en={title} cn={cn}>
      <ParchmentCard className="px-4">
        {spells.map((s, i) => (
          <details
            key={`${s.name}-${i}`}
            className={`py-2 ${i > 0 ? 'border-t border-border/40' : ''}`}
          >
            <summary className="cursor-pointer">
              <span className="text-[14px] text-text-primary">{s.name}</span>
              <span className="font-label ml-1.5 text-[10px] text-text-primary/40">
                {s.nameEn}
              </span>
              {s.concentration && (
                <span className="ml-1.5 text-[10px] text-gold">專注</span>
              )}
              {s.damage && (
                <span className="ml-1.5 text-[12px] text-text-secondary">
                  {s.damage} {s.damageType}
                </span>
              )}
            </summary>
            {s.description && (
              <p className="mt-2 whitespace-pre-wrap text-[13px] leading-relaxed text-text-light">
                {s.description}
              </p>
            )}
          </details>
        ))}
      </ParchmentCard>
    </CollapsibleSection>
  );
}

export function InventoryTab({ c }: { c: Character }) {
  const coins = (['pp', 'gp', 'ep', 'sp', 'cp'] as const).filter(
    (k) => c.currency[k] > 0,
  );
  const totalCp =
    c.currency.cp +
    c.currency.sp * 10 +
    c.currency.ep * 50 +
    c.currency.gp * 100 +
    c.currency.pp * 1000;

  return (
    <div className="px-4 pb-10">
      <CollapsibleSection en="CURRENCY" cn="財富" first>
        <ParchmentCard className="px-4 py-3">
          {coins.length === 0 ? (
            <p className="text-[13px] text-text-secondary">身無分文。</p>
          ) : (
            <div className="flex flex-wrap items-baseline gap-3">
              {coins.map((k) => (
                <span key={k} className="text-[15px] text-text-primary">
                  <span className="font-display font-bold text-gold">
                    {c.currency[k]}
                  </span>
                  <span className="font-label ml-1 text-[11px] text-text-primary/50">
                    {k}
                  </span>
                </span>
              ))}
              <span className="ml-auto text-[11px] text-text-secondary">
                合計 {formatCp(totalCp)}
              </span>
            </div>
          )}
        </ParchmentCard>
      </CollapsibleSection>

      <CollapsibleSection en="EQUIPMENT" cn="裝備">
        {c.equipment.length === 0 ? (
          <p className="py-3 text-[13px] text-text-secondary">沒有物品。</p>
        ) : (
          <ParchmentCard className="px-4">
            {c.equipment.map((e, i) => (
              <div
                key={`${e.name}-${i}`}
                className={`flex items-baseline justify-between gap-3 py-2 ${i > 0 ? 'border-t border-border/40' : ''}`}
              >
                <span>
                  {e.equipped && <span className="mr-1 text-gold">▸</span>}
                  <span className="text-[14px] text-text-primary">{e.name}</span>
                  {e.quantity > 1 && (
                    <span className="ml-1 text-[12px] text-text-secondary">
                      ×{e.quantity}
                    </span>
                  )}
                  {e.description && (
                    <span className="block text-[12px] text-text-secondary">
                      {e.description}
                    </span>
                  )}
                </span>
                {e.quest && (
                  <span className="shrink-0 rounded-chip border border-border-2 px-2 py-0.5 text-[10px] text-text-secondary">
                    任務
                  </span>
                )}
              </div>
            ))}
          </ParchmentCard>
        )}
      </CollapsibleSection>
    </div>
  );
}

export function BiographyTab({ c }: { c: Character }) {
  return (
    <div className="px-4 pb-10">
      <CollapsibleSection en="ABOUT" cn="其人其事" first>
        <ParchmentCard className="px-4 py-3">
          {c.backstory ? (
            <p className="whitespace-pre-wrap text-[14px] leading-relaxed text-text-light">
              「{c.backstory}」
            </p>
          ) : (
            <p className="text-[13px] text-text-secondary">尚未描述。</p>
          )}
          {c.personalityTags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {c.personalityTags.map((t) => (
                <span
                  key={t}
                  className="rounded-chip border border-border-2 px-2 py-1 text-[12px] text-text-secondary"
                >
                  {t}
                </span>
              ))}
            </div>
          )}
        </ParchmentCard>
      </CollapsibleSection>

      <CollapsibleSection en="PERSONALITY" cn="性格">
        <ParchmentCard className="px-4">
          {(
            [
              ['特質', c.personality.traits],
              ['理念', c.personality.ideals],
              ['羈絆', c.personality.bonds],
              ['缺陷', c.personality.flaws],
            ] as const
          )
            .filter(([, v]) => v)
            .map(([label, v], i) => (
              <div
                key={label}
                className={`flex gap-3 py-2 ${i > 0 ? 'border-t border-border/40' : ''}`}
              >
                <span className="w-10 shrink-0 text-[12px] text-section-label">
                  {label}
                </span>
                <span className="text-[13px] text-text-light">{v}</span>
              </div>
            ))}
        </ParchmentCard>
      </CollapsibleSection>

      <CollapsibleSection en="FEATURES & TRAITS" cn="特長">
        <ParchmentCard className="px-4">
          {c.features.map((f, i) => (
            <details
              key={`${f.name}-${i}`}
              className={`py-2 ${i > 0 ? 'border-t border-border/40' : ''}`}
            >
              <summary className="cursor-pointer">
                <span className="text-[14px] text-text-primary">{f.name}</span>
                {f.nameEn && (
                  <span className="font-label ml-1.5 text-[10px] text-text-primary/40">
                    {f.nameEn}
                  </span>
                )}
                {f.source && (
                  <span className="ml-1.5 text-[10px] text-section-label">
                    {f.source}
                  </span>
                )}
              </summary>
              {f.description ? (
                <p className="mt-2 whitespace-pre-wrap text-[13px] leading-relaxed text-text-light">
                  {f.description}
                </p>
              ) : (
                <p className="mt-2 text-[12px] text-text-secondary">
                  這項特性沒有說明文字。
                </p>
              )}
            </details>
          ))}
        </ParchmentCard>
      </CollapsibleSection>

      <CollapsibleSection en="PROFICIENCIES" cn="熟練">
        <ParchmentCard className="px-4 py-1">
          {c.languages.length === 0 && c.toolProficiencies.length === 0 ? (
            <p className="py-2 text-[13px] text-text-secondary">
              尚未有語言或工具熟練。
            </p>
          ) : (
            <>
              {c.languages.length > 0 && (
                <ProfRow label="語言" items={c.languages} />
              )}
              {c.toolProficiencies.length > 0 && (
                <ProfRow label="工具" items={c.toolProficiencies} />
              )}
            </>
          )}
        </ParchmentCard>
      </CollapsibleSection>
    </div>
  );
}

function ProfRow({ label, items }: { label: string; items: string[] }) {
  return (
    <div className="flex gap-3 py-2">
      <span className="w-10 shrink-0 text-[12px] text-section-label">
        {label}
      </span>
      <span className="text-[13px] text-text-light">{items.join(' · ')}</span>
    </div>
  );
}
