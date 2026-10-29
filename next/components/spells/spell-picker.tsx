'use client';

import { useEffect, useState } from 'react';
import { AppLink } from '@/components/ui/app-link';
import { EditorSheet } from '@/components/ui/editor-sheet';
import { fetchCatalogSpellOptions, fetchCustomSpells, type CatalogSpellOption } from '@/lib/spells/actions';
import { spellFromCustom, type CustomSpell } from '@/lib/spells/types';
import { applySpellSelection, selectionDelta, spellKey } from '@/lib/spells/selection';
import { useCharacterStore } from '@/lib/state/character-store';
import type { Character, Spell } from '@/lib/domain/character';

type Source = 'catalog' | 'custom';
export function SpellPicker({ c, kind }: { c: Character; kind: 'cantrips' | 'spells' | 'spellbook' }) {
  const [open, setOpen] = useState(false);
  return <>
    <button type="button" aria-haspopup="dialog" className="min-h-11 shrink-0 px-2 text-small text-gold hover:text-text-primary" onClick={() => setOpen(true)}>{kind === 'spellbook' ? '抄錄法術' : `管理${kind === 'cantrips' ? '戲法' : '法術'}`}</button>
    {open && <SpellSelection key={`${c.id}-${kind}`} c={c} kind={kind} onClose={() => setOpen(false)} />}
  </>;
}

function SpellSelection({ c, kind, onClose }: { c: Character; kind: 'cantrips' | 'spells' | 'spellbook'; onClose: () => void }) {
  const label = kind === 'cantrips' ? '戲法' : '法術';
  const [initial] = useState(() => c[kind]??[]);
  const [selected, setSelected] = useState(initial);
  const [source, setSource] = useState<Source>('catalog');
  const [onlySelected, setOnlySelected] = useState(false);
  const [catalog, setCatalog] = useState<CatalogSpellOption[] | null>(null);
  const [custom, setCustom] = useState<CustomSpell[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const [search, setSearch] = useState('');
  const [ownClassOnly, setOwnClassOnly] = useState(true);
  const [discard, setDiscard] = useState(false);
  const { added, removed } = selectionDelta(initial, selected);
  const dirty = added.length + removed.length > 0;
  useEffect(() => {
    let active = true;
    const request = source === 'catalog' ? fetchCatalogSpellOptions(kind==='spellbook'?'spells':kind) : fetchCustomSpells();
    void request.then(result => {
      if (!active) return;
      if (result.error) setError(result.error);
      else if ('options' in result) setCatalog(result.options);
      else setCustom(result.spells);
    }).catch(() => { if (active) setError('連線失敗，請重試。'); });
    return () => { active = false; };
  }, [source, kind, retry]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  const selectedKeys = new Set(selected.map(spellKey));
  const q = search.trim().toLocaleLowerCase();
  const matches = (s: Spell) => [s.name, s.nameEn].some(n => n.toLocaleLowerCase().includes(q));
  const classKnown = !!c.classNameEn && !!catalog?.some(o => o.classes.includes(c.classNameEn));
  const options = source === 'catalog'
    ? (catalog ?? []).filter(o => !ownClassOnly || !classKnown || o.classes.includes(c.classNameEn)).map(o => o.spell)
    : (custom ?? []).filter(s => kind === 'cantrips' ? s.level === 0 : s.level > 0).map(spellFromCustom);
  const visible = (onlySelected ? selected : options).filter(matches);
  const loading = !onlySelected && !error && (source === 'catalog' ? catalog === null : custom === null);
  const toggle = (spell: Spell) => setSelected(current => current.some(s => spellKey(s) === spellKey(spell))
    ? current.filter(s => spellKey(s) !== spellKey(spell))
    : [...current, initial.find(s => spellKey(s) === spellKey(spell)) ?? spell]);
  const close = () => dirty ? setDiscard(true) : onClose();
  const save = () => {
    useCharacterStore.getState().update(current => current.id === c.id ? applySpellSelection(current, kind, initial, selected) : current);
    onClose();
  };
  const tabClass = (active: boolean) => `min-h-11 flex-1 rounded-card border px-3 text-ui ${active ? 'border-gold bg-gold/10 text-gold' : 'border-border-2 text-text-secondary hover:text-text-primary'}`;
  return <>
    <EditorSheet open title={`管理${label}`} onClose={close} onSave={save} saveLabel="儲存變更" saveEnabled={dirty}
      footer={<p role="status" className="text-small text-text-secondary">已選 {selected.length} 項 · 新增 {added.length} · 移除 {removed.length}</p>}>
      <p className="mb-3 text-ui text-text-secondary">勾選加入，再點取消；儲存後才套用到角色，不會增加法術位。</p>
      <div className="mb-3 flex gap-2" aria-label="顯示範圍">
        <button type="button" aria-pressed={!onlySelected} className={tabClass(!onlySelected)} onClick={() => setOnlySelected(false)}>全部</button>
        <button type="button" aria-pressed={onlySelected} className={tabClass(onlySelected)} onClick={() => setOnlySelected(true)}>已選 {selected.length}</button>
      </div>
      {!onlySelected && <div className="mb-3 flex gap-2" aria-label="法術來源">
        <button type="button" aria-pressed={source === 'catalog'} className={tabClass(source === 'catalog')} onClick={() => { setSource('catalog'); setError(null); }}>系統法術</button>
        <button type="button" aria-pressed={source === 'custom'} className={tabClass(source === 'custom')} onClick={() => { setSource('custom'); setError(null); }}>自創收藏</button>
      </div>}
      {initial.some(s=>s.progressionSource)&&<p className="my-2 text-small text-text-secondary">成長選擇授予的法術會保留；名額與替換請到 <AppLink href="/character-choices" className="text-gold underline">成長選擇</AppLink> 調整。</p>}
      {kind==='spellbook'&&<p className="my-2 text-small text-text-secondary">抄錄冒險中獲得的法術；請與 DM 確認資格、抄錄時間與費用。加入法術書不會自動準備。</p>}
      <input type="search" name="spellSearch" autoComplete="off" aria-label={`搜尋${label}`} placeholder="搜尋中文或英文名稱…" className="min-h-11 w-full rounded-card border border-border bg-surface-0 px-3 text-body" value={search} onChange={e => setSearch(e.target.value)} />
      {!onlySelected && source === 'catalog' && classKnown && <label className="flex min-h-11 items-center gap-2 text-ui text-text-secondary"><input type="checkbox" checked={ownClassOnly} onChange={e => setOwnClassOnly(e.target.checked)} />只顯示{c.className || c.classNameEn}的{label}</label>}
      {onlySelected && <p className="mt-2 text-small text-text-secondary">包含所有來源與角色既有版本；取消只影響角色，不會刪除收藏。</p>}
      {loading && <p role="status" className="py-4">載入中…</p>}
      {!onlySelected && error && <div role="alert" className="py-3"><p className="text-danger">{error}</p><button type="button" className="min-h-11 text-gold" onClick={() => { setError(null); setRetry(n => n + 1); }}>重試</button></div>}
      {!loading && (onlySelected || !error) && <div className="mt-3 space-y-2">
        {visible.map(s => <SelectionRow key={spellKey(s)} spell={initial.find(old => spellKey(old) === spellKey(s)) ?? s} checked={selectedKeys.has(spellKey(s))} onToggle={() => toggle(s)} />)}
        {!visible.length && <p className="py-4 text-ui text-text-secondary">{q ? '沒有符合的法術，試試其他名稱。' : onlySelected ? '尚未選擇法術，切換「全部」開始挑選。' : source === 'custom' ? '收藏尚無自創法術，請先到收藏紀錄新增。' : '沒有符合的法術。'}</p>}
      </div>}
      <p className="mt-4 text-small text-text-secondary">請與 DM 確認環數與使用資格。自創內容請在收藏紀錄新增、編輯。</p>
    </EditorSheet>
    <EditorSheet open={discard} title="捨棄尚未儲存的選擇？" onClose={() => setDiscard(false)} closeLabel="繼續編輯" onSave={onClose} saveLabel="捨棄變更" saveTone="danger"><p>角色目前的法術不會改變。</p></EditorSheet>
  </>;
}

function SelectionRow({ spell, checked, onToggle }: { spell: Spell; checked: boolean; onToggle: () => void }) {
  const [details, setDetails] = useState(false);
  return <div className={`rounded-card border ${checked ? 'border-gold bg-gold/10' : 'border-border-2 bg-surface-0'}`}>
    <div className="flex items-center gap-1 p-2">
      <label className="flex min-h-11 min-w-0 flex-1 cursor-pointer items-center gap-3 px-1">
        <input type="checkbox" className="size-5 shrink-0 accent-gold" checked={checked} disabled={!!spell.progressionSource} onChange={onToggle} />
        <span className="min-w-0"><span className="block break-words text-body font-semibold text-text-primary">{spell.name}</span><span className="block break-words text-small text-text-secondary">{[spell.nameEn, spell.level ? `${spell.level} 環` : '戲法', spell.homebrewId ? '自創' : '', spell.range].filter(Boolean).join(' · ')}</span></span>
      </label>
      <button type="button" aria-label={`${spell.name}的說明`} aria-expanded={details} onClick={() => setDetails(!details)} className="min-h-11 shrink-0 px-2 text-small text-gold">說明 {details ? '▴' : '▾'}</button>
    </div>
    {details && <div className="space-y-3 border-t border-border-2 p-3 text-body text-text-primary"><p className="text-small text-text-secondary">施法：{spell.castingTime}{spell.concentration ? ' · 專注' : ''}</p><p className="whitespace-pre-wrap break-words">{spell.description || '尚無說明。'}</p>{spell.upgrade && <p className="whitespace-pre-wrap break-words text-text-light">{spell.upgrade}</p>}</div>}
  </div>;
}
