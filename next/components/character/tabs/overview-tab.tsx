import type { ReactNode } from 'react';

import { CollapsibleSection } from '@/components/ui/collapsible-section';
import { InfoField, ParchmentCard } from '@/components/ui/decorations';
import { EditIcon } from '@/components/ui/editor-sheet';
import type { Character } from '@/lib/domain/character';
import { CustomBadge } from '../custom-badge';
import { PortraitCard } from '../portrait-card';

/**
 * 總覽分頁，對照 Flutter 端的 `OverviewTab`：
 * 立繪卡 → BASIC 基本資訊（2 欄 × 3 列、列間細線）→ STATS 戰鬥數值（四格）。
 */
export function OverviewTab({
  c,
  share,
  onEditBasic,
  onEditPortrait,
}: {
  c: Character;
  share?: ReactNode;
  onEditBasic?: () => void;
  onEditPortrait?: () => void;
}) {
  const rows: [
    React.ComponentProps<typeof InfoField>,
    React.ComponentProps<typeof InfoField>,
  ][] = [
    [
      { label: 'SPECIES · 物種', value: c.species, valueEn: c.speciesEn },
      { label: 'TYPE · 生物類型', value: c.creatureType },
    ],
    [
      { label: 'SIZE · 體型', value: c.size },
      { label: 'ALIGNMENT · 陣營', value: c.alignment, valueEn: c.alignmentEn },
    ],
    [
      { label: 'DEITY · 信仰', value: c.deity, valueEn: c.deityEn },
      {
        label: 'BACKGROUND · 背景',
        value: c.background,
        valueEn: c.backgroundEn,
        badge: c.backgroundIsCustom ? <CustomBadge /> : undefined,
      },
    ],
  ];

  const stats = [
    { value: c.speed.replace(/[^0-9]/g, ''), sub: '速度', icon: 'run' as const },
    {
      value:
        c.proficiencyBonus >= 0
          ? `+${c.proficiencyBonus}`
          : `${c.proficiencyBonus}`,
      sub: '熟練',
      icon: 'verified' as const,
    },
    { value: `${c.passivePerception}`, sub: '察覺', icon: 'eye' as const },
    { value: `${c.spellDc}`, sub: '法術 DC', icon: 'sparkle' as const },
  ];

  return (
    <div className="px-4 pb-10">
      <PortraitCard c={c} onEdit={onEditPortrait} />

      <CollapsibleSection
        en="BASIC"
        cn="基本資訊"
        trailing={
          onEditBasic && <EditIcon onClick={onEditBasic} label="編輯基本資訊" />
        }
      >
        <ParchmentCard className="px-5 py-2">
          {rows.map((row, i) => (
            <div key={i}>
              {i > 0 && <div className="h-px bg-border/40" />}
              <div className="flex gap-4 py-3">
                <div className="flex-1">
                  <InfoField {...row[0]} />
                </div>
                <div className="flex-1">
                  <InfoField {...row[1]} />
                </div>
              </div>
            </div>
          ))}
        </ParchmentCard>
      </CollapsibleSection>

      <CollapsibleSection en="STATS" cn="戰鬥數值">
        <div className="flex gap-2">
          {stats.map((s) => (
            <ParchmentCard key={s.sub} className="flex-1 py-3">
              <div className="flex flex-col items-center">
                <StatIcon name={s.icon} />
                <span className="font-display mt-1 text-[22px] font-bold text-gold">
                  {s.value}
                </span>
                <span className="mt-0.5 text-[12px] text-text-primary/70">
                  {s.sub}
                </span>
              </div>
            </ParchmentCard>
          ))}
        </div>
      </CollapsibleSection>

      {share}
    </div>
  );
}

/** 16px 金色圖示，對應 Flutter 用的 Material outlined icons。 */
function StatIcon({ name }: { name: 'run' | 'verified' | 'eye' | 'sparkle' }) {
  const paths = {
    run: 'M13.5 5.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4M9.8 8.9 7 23h2.1l1.8-8 2.1 2v6h2v-7.5l-2.1-2 .6-3A7 7 0 0 0 19 13v-2c-1.8 0-3.3-1-4.1-2.4l-1-1.6c-.4-.6-1-1-1.7-1-.3 0-.5 0-.8.2L6 7.7V12h2V9.1z',
    verified:
      'M23 12l-2.4-2.8.3-3.7-3.6-.8L15.4 1.5 12 3 8.6 1.5 6.7 4.7l-3.6.8.3 3.7L1 12l2.4 2.8-.3 3.7 3.6.8 1.9 3.2L12 21l3.4 1.5 1.9-3.2 3.6-.8-.3-3.7zm-12.9 4.6-3.6-3.6 1.4-1.4 2.2 2.2 5.7-5.7 1.4 1.4z',
    eye: 'M12 4.5C7 4.5 2.7 7.6 1 12c1.7 4.4 6 7.5 11 7.5s9.3-3.1 11-7.5c-1.7-4.4-6-7.5-11-7.5m0 12.5a5 5 0 1 1 0-10 5 5 0 0 1 0 10m0-8a3 3 0 1 0 0 6 3 3 0 0 0 0-6',
    sparkle:
      'm19 9 1.25-2.75L23 5l-2.75-1.25L19 1l-1.25 2.75L15 5l2.75 1.25zm-7.5.5L9 4 6.5 9.5 1 12l5.5 2.5L9 20l2.5-5.5L17 12zM19 15l-1.25 2.75L15 19l2.75 1.25L19 23l1.25-2.75L23 19l-2.75-1.25z',
  };
  return (
    <svg viewBox="0 0 24 24" className="size-4 fill-gold" aria-hidden>
      <path d={paths[name]} />
    </svg>
  );
}
