'use client';

import { useState } from 'react';
import type { Character } from '@/lib/domain/character';
import { featureArmorViolation } from '@/lib/rules/ac';
import { groupFeatures, type FeatureGroup } from '@/lib/ui/feature-groups';
import { CustomBadge } from './custom-badge';

export function FeatureGroups({ c }: { c: Character }) {
  const groups = groupFeatures(c.features);
  return groups.length ? <div className="space-y-2">{groups.map(group => <Group key={group.key} group={group} c={c} />)}</div>
    : <p className="py-4 text-ui text-text-secondary">尚無特長紀錄。</p>;
}

function Group({ group, c }: { group: FeatureGroup; c: Character }) {
  const [open, setOpen] = useState(true);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const allCustom = group.features.every(({ feature }) => feature.isCustom);
  return <section aria-label={[group.title, group.source].filter(Boolean).join(' · ')}>
    <h3><button type="button" aria-expanded={open} onClick={() => setOpen(!open)} className="flex min-h-11 w-full items-center gap-2 border-b border-border px-1 py-2 text-left hover:bg-gold/5">
      <span aria-hidden className="text-gold">{open ? '▾' : '▸'}</span>
      <span className="min-w-0 flex-1"><span className="font-cjk text-body font-bold tracking-wider text-section-label">{group.title}</span>{group.source && <span className="ml-3 break-words font-reading text-small font-normal text-text-secondary">{group.source}</span>}</span>
      {allCustom && <CustomBadge />}
      <span className="shrink-0 font-reading text-small tabular-nums text-text-secondary">{group.features.length} 項</span>
    </button></h3>
    {open && <div className="ml-5 divide-y divide-border-2 sm:ml-6">
      {group.features.map(({ feature: f, index, level }) => {
        const violation = featureArmorViolation(c, f);
        return <div key={index}>
          <button type="button" aria-expanded={expanded.has(index)} onClick={() => setExpanded(previous => { const next = new Set(previous); if (!next.delete(index)) next.add(index); return next; })} className="flex min-h-11 w-full cursor-pointer items-center gap-2 py-2 text-left">
            <span aria-hidden className="shrink-0 text-text-secondary">{expanded.has(index) ? '▾' : '▸'}</span>
            <span className="min-w-0 flex-1">
              <span className={`break-words text-body font-medium ${violation ? 'text-text-secondary line-through' : 'text-text-primary'}`}>{f.name}</span>
              {f.nameEn && <span className="ml-2 break-words font-label text-small text-text-secondary">{f.nameEn}</span>}
              {!group.source && f.source && <span className="ml-2 text-small text-section-label">{f.source}</span>}
              {violation && <span className="block text-small text-danger">{violation}</span>}
            </span>
            <span className="flex shrink-0 flex-col items-end gap-1">{level !== null && <span className="font-label text-small text-section-label">Lv {level}</span>}{f.isCustom && !allCustom && <CustomBadge />}</span>
          </button>
          {expanded.has(index) && <div className="border-t border-border-2 py-3 pl-6">
            <p className="whitespace-pre-wrap break-words text-body text-text-primary">{f.description || '這項特性沒有說明文字。'}</p>
            {f.source && <p className="mt-3 text-small text-text-secondary">來源：{f.source}</p>}
          </div>}
        </div>;
      })}
    </div>}
  </section>;
}
