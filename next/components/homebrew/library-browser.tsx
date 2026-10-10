'use client';

import { useState, type ReactNode } from 'react';
import { useSearchParams } from 'next/navigation';
import { SpellManager } from '@/components/spells/spell-manager';
import { SpeciesManager } from '@/components/species/species-manager';
import { BackgroundManager } from '@/components/backgrounds/background-manager';
import { SubclassManager } from '@/components/subclasses/subclass-manager';
import type { CustomSpell } from '@/lib/spells/types';
import type { CustomSpecies } from '@/lib/species/types';
import type { CustomBackground } from '@/lib/backgrounds/types';
import type { CustomSubclass } from '@/lib/subclasses/types';

const categories = [
  { id: 'spell', name: '法術', en: 'SPELLS', hint: '咒語與奧術' },
  { id: 'species', name: '種族', en: 'SPECIES', hint: '血脈與天賦' },
  { id: 'background', name: '背景', en: 'BACKGROUNDS', hint: '故事的起點' },
  { id: 'subclass', name: '子職業', en: 'SUBCLASSES', hint: '專屬成長路線' },
] as const;

export function LibraryBrowser({ spells, species, backgrounds, subclasses, extras }: {
  spells: CustomSpell[];
  species: CustomSpecies[];
  backgrounds: CustomBackground[];
  subclasses: CustomSubclass[];
  extras: Record<string, ReactNode>;
}) {
  const params = useSearchParams();
  const selected = categories.find(c => c.id === params.get('category')) ?? categories[0];
  const [query, setQuery] = useState('');
  const select = (category: string) => {
    const next = new URLSearchParams(params.toString());
    next.set('category', category);
    window.history.replaceState(null, '', `?${next}`);
    setQuery('');
  };

  return (
    <div className="expanded:grid expanded:grid-cols-[200px_minmax(0,1fr)] expanded:gap-8">
      <aside className="mb-5 expanded:mb-0 expanded:border-r expanded:border-border-2 expanded:pr-5">
        <p className="mb-3 font-label text-[10px] tracking-[2px] text-section-label">典藏索引 / INDEX</p>
        <nav aria-label="收藏分類" className="grid grid-cols-4 gap-1 expanded:grid-cols-1 expanded:gap-2">
          {categories.map(category => (
            <button key={category.id} type="button" aria-pressed={selected.id === category.id} aria-controls={`library-${category.id}`} onClick={() => select(category.id)}
              className={`relative min-h-11 rounded-r-card border-l-2 px-2 py-3 text-center transition-colors expanded:min-h-14 expanded:px-4 expanded:text-left ${selected.id === category.id ? 'border-gold bg-gold/10 text-gold' : 'border-transparent text-text-secondary hover:border-border hover:bg-surface-1 hover:text-text-primary'}`}>
              <span className="block text-[15px] font-semibold">{category.name}</span>
              <span className="mt-1 hidden font-label text-[10px] tracking-[1.5px] expanded:block">{category.en}</span>
            </button>
          ))}
        </nav>
        <p className="mt-6 hidden border-t border-border-2 pt-4 text-[12px] leading-6 text-text-secondary expanded:block">寫下你的創作，或從其他玩家的分享連結收藏。<br />採用前請先與 DM 確認。</p>
      </aside>

      <div className="min-w-0">
        <label className="mb-6 flex min-h-12 items-center gap-3 rounded-card border border-border-2 bg-surface-1 px-4 focus-within:border-gold">
          <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4 shrink-0 fill-none stroke-text-secondary" strokeWidth="1.5"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5" /></svg>
          <span className="sr-only">搜尋{selected.name}名稱</span>
          <input type="search" name="librarySearch" autoComplete="off" value={query} onChange={e => setQuery(e.target.value)} placeholder={`搜尋${selected.name}名稱…`} className="min-h-11 min-w-0 flex-1 bg-transparent text-[14px] text-text-primary placeholder:text-text-secondary" />
        </label>
        {/* 保留各分類實例，切換不丟失管理器的本機清單狀態。 */}
        <div id="library-spell" hidden={selected.id !== 'spell'}><SpellManager initial={spells} extras={extras} search={query} /></div>
        <div id="library-species" hidden={selected.id !== 'species'}><SpeciesManager initial={species} extras={extras} embedded search={query} /></div>
        <div id="library-background" hidden={selected.id !== 'background'}><BackgroundManager initial={backgrounds} extras={extras} embedded search={query} /></div>
        <div id="library-subclass" hidden={selected.id !== 'subclass'}><SubclassManager initial={subclasses} extras={extras} embedded search={query} /></div>
      </div>
    </div>
  );
}
