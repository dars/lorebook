'use client';

import { AppLink as Link } from '@/components/ui/app-link';
import { useState } from 'react';
import { EditorSheet } from '@/components/ui/editor-sheet';
import { SpellCard } from '@/components/character/spell-card';
import { fetchCustomSpells } from '@/lib/spells/actions';
import { addCustomSpell, removeCustomSpell, spellFromCustom, type CustomSpell } from '@/lib/spells/types';
import { useCharacterStore } from '@/lib/state/character-store';
import type { Character } from '@/lib/domain/character';

export function SpellPicker({ c, kind }: { c: Character; kind: 'cantrips' | 'spells' }) {
  const label = kind === 'cantrips' ? '戲法' : '法術';
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [spells, setSpells] = useState<CustomSpell[]>([]);
  const [error, setError] = useState<string | null>(null);
  async function show() {
    setOpen(true); setLoading(true); setError(null);
    try {
      const result = await fetchCustomSpells();
      setSpells(result.spells); setError(result.error);
    } catch { setError('連線失敗，請重試。'); }
    finally { setLoading(false); }
  }
  const existing = c[kind].filter(s => s.homebrewId);
  const available = spells.filter(s => kind === 'cantrips' ? s.level === 0 : s.level > 0);
  return <>
    <button type="button" aria-label={`從收藏選用${label}`} aria-haspopup="dialog" className="min-h-11 shrink-0 px-2 text-[12px] text-gold hover:text-text-primary" onClick={show}>＋ 選用</button>
    <EditorSheet open={open} title={`從收藏選用${label}`} onClose={() => setOpen(false)} closeLabel="完成">
      <p className="mb-4 text-[13px] leading-6 text-text-secondary">選用後立即保存角色副本，不會增加法術位。請與 DM 確認環數與使用資格；新增、編輯請前往<Link className="text-gold underline" href="/library">收藏紀錄</Link>。</p>
      {loading && <p role="status">載入中…</p>}
      {error && <div role="alert"><p className="text-danger">{error}</p><button className="min-h-11 text-gold" onClick={show}>重試</button></div>}
      {!loading && !error && !available.length && <p>收藏尚無自創{label}，請先到收藏紀錄新增。</p>}
      <div className="space-y-3">{!loading && !error && available.map(s => {
        const selected = [...c.cantrips, ...c.spells].some(x => x.homebrewId === s.id);
        return <div key={s.id}><SpellCard spell={spellFromCustom(s)} /><button disabled={selected} className="min-h-11 text-[13px] text-gold disabled:text-text-secondary" onClick={() => useCharacterStore.getState().update(current => current.id === c.id ? addCustomSpell(current,s) : current)}>{selected ? '已選用（保留角色版本）' : `選用 ${s.name}`}</button></div>;
      })}</div>
      {!!existing.length && <div className="mt-5 border-t border-border pt-4"><h3 className="text-gold">角色已選用</h3><p className="mt-1 text-[12px] text-text-secondary">移除只影響角色，不會刪除收藏。重新選用會取得收藏中的最新版本。</p>{existing.map(s => <div key={s.homebrewId} className="flex items-center justify-between gap-3"><span>{s.name}</span><button className="min-h-11 px-3 text-[13px] text-text-secondary" aria-label={`從角色移除 ${s.name}`} onClick={() => useCharacterStore.getState().update(current => current.id !== c.id ? current : removeCustomSpell(current, s.homebrewId!))}>移除</button></div>)}</div>}
    </EditorSheet>
  </>;
}
