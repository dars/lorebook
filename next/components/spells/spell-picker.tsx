'use client';

import { AppLink as Link } from '@/components/ui/app-link';
import { useState } from 'react';
import { EditorSheet } from '@/components/ui/editor-sheet';
import { SpellCard } from '@/components/character/spell-card';
import { fetchCatalogSpellOptions, fetchCustomSpells, type CatalogSpellOption } from '@/lib/spells/actions';
import { addCatalogSpell, addCustomSpell, hasCatalogSpell, removeSpellAt, spellFromCustom, type CustomSpell } from '@/lib/spells/types';
import { useCharacterStore } from '@/lib/state/character-store';
import type { Character } from '@/lib/domain/character';

type Source = 'catalog' | 'custom';

const fieldClass = 'min-h-11 w-full rounded-card border border-border bg-surface-1 px-3 py-2 text-ui text-text-primary';

export function SpellPicker({ c, kind }: { c: Character; kind: 'cantrips' | 'spells' }) {
  const label = kind === 'cantrips' ? '戲法' : '法術';
  const [open, setOpen] = useState(false);
  const [source, setSource] = useState<Source>('catalog');
  const [loading, setLoading] = useState(false);
  const [catalog, setCatalog] = useState<CatalogSpellOption[] | null>(null);
  const [custom, setCustom] = useState<CustomSpell[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  // 預設只列本職業的法術：全部列出時已備法術有三百多道，找不到自己要的。
  // 職業不在內容庫（自訂職業、尚未選職業）時這個開關沒有意義，直接列全部。
  const [ownClassOnly, setOwnClassOnly] = useState(true);

  async function load(next: Source) {
    setSource(next); setError(null);
    if (next === 'catalog' ? catalog : custom) return;
    setLoading(true);
    try {
      if (next === 'catalog') {
        const result = await fetchCatalogSpellOptions(kind);
        setError(result.error); if (!result.error) setCatalog(result.options);
      } else {
        const result = await fetchCustomSpells();
        setError(result.error); if (!result.error) setCustom(result.spells);
      }
    } catch { setError('連線失敗，請重試。'); }
    finally { setLoading(false); }
  }
  function show() { setOpen(true); void load(source); }

  const q = search.trim().toLocaleLowerCase();
  const matches = (name: string, nameEn: string) => !q || [name, nameEn].some(n => n.toLocaleLowerCase().includes(q));
  const classKnown = !!c.classNameEn && !!catalog?.some(o => o.classes.includes(c.classNameEn));
  const catalogVisible = (catalog ?? []).filter(o =>
    (!ownClassOnly || !classKnown || o.classes.includes(c.classNameEn)) && matches(o.spell.name, o.spell.nameEn));
  const customVisible = (custom ?? []).filter(s =>
    (kind === 'cantrips' ? s.level === 0 : s.level > 0) && matches(s.name, s.nameEn));
  const update = (fn: (current: Character) => Character) =>
    useCharacterStore.getState().update(current => current.id === c.id ? fn(current) : current);
  const tabClass = (on: boolean) => `min-h-11 flex-1 rounded-card border text-ui ${on ? 'border-gold bg-gold/10 text-gold' : 'border-border-2 text-text-secondary'}`;

  return <>
    <button type="button" aria-label={`選用${label}`} aria-haspopup="dialog" className="min-h-11 shrink-0 px-2 text-small text-gold hover:text-text-primary" onClick={show}>＋ 選用</button>
    <EditorSheet open={open} title={`選用${label}`} onClose={() => setOpen(false)} closeLabel="完成">
      <p className="mb-4 text-ui leading-6 text-text-secondary">選用後立即保存角色副本，不會增加法術位。請與 DM 確認環數與使用資格；自創法術的新增、編輯請前往<Link className="text-gold underline" href="/library">收藏紀錄</Link>。</p>
      <div role="tablist" className="mb-3 flex gap-2">
        <button role="tab" aria-selected={source === 'catalog'} className={tabClass(source === 'catalog')} onClick={() => load('catalog')}>系統法術</button>
        <button role="tab" aria-selected={source === 'custom'} className={tabClass(source === 'custom')} onClick={() => load('custom')}>自創收藏</button>
      </div>
      <input type="search" aria-label={`搜尋${label}`} placeholder="搜尋中文或英文名稱" className={fieldClass} value={search} onChange={e => setSearch(e.target.value)} />
      {source === 'catalog' && classKnown && <label className="mt-2 flex min-h-11 items-center gap-2 text-ui text-text-secondary"><input type="checkbox" checked={ownClassOnly} onChange={e => setOwnClassOnly(e.target.checked)} />只顯示{c.className || c.classNameEn}的{label}</label>}
      <div className="mt-3">
        {loading && <p role="status">載入中…</p>}
        {error && <div role="alert"><p className="text-danger">{error}</p><button className="min-h-11 text-gold" onClick={() => load(source)}>重試</button></div>}
        {!loading && !error && source === 'catalog' && catalog && (catalogVisible.length
          ? <div className="space-y-3">{catalogVisible.map(o => {
              const selected = hasCatalogSpell(c, o.spell);
              return <div key={o.id}><SpellCard spell={o.spell} /><button disabled={selected} className="min-h-11 text-ui text-gold disabled:text-text-secondary" onClick={() => update(current => addCatalogSpell(current, o.spell))}>{selected ? '已選用' : `選用 ${o.spell.name}`}</button></div>;
            })}</div>
          : <p>沒有符合的{label}。</p>)}
        {!loading && !error && source === 'custom' && custom && (customVisible.length
          ? <div className="space-y-3">{customVisible.map(s => {
              const selected = [...c.cantrips, ...c.spells].some(x => x.homebrewId === s.id);
              return <div key={s.id}><SpellCard spell={spellFromCustom(s)} /><button disabled={selected} className="min-h-11 text-ui text-gold disabled:text-text-secondary" onClick={() => update(current => addCustomSpell(current, s))}>{selected ? '已選用（保留角色版本）' : `選用 ${s.name}`}</button></div>;
            })}</div>
          : <p>{q ? `沒有符合的${label}。` : `收藏尚無自創${label}，請先到收藏紀錄新增。`}</p>)}
      </div>
      {!!c[kind].length && <div className="mt-5 border-t border-border pt-4"><h3 className="text-gold">角色已選用</h3><p className="mt-1 text-small text-text-secondary">移除只影響角色，不會刪除收藏。重新選用會取得最新版本。</p>{c[kind].map((s, i) => <div key={`${s.homebrewId ?? s.name}-${i}`} className="flex items-center justify-between gap-3"><span>{s.name}</span><button className="min-h-11 px-3 text-ui text-text-secondary" aria-label={`從角色移除 ${s.name}`} onClick={() => update(current => removeSpellAt(current, kind, i, s.name))}>移除</button></div>)}</div>}
    </EditorSheet>
  </>;
}
