'use client';

import { useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { EditorSheet } from '@/components/ui/editor-sheet';
import { ParchmentCard } from '@/components/ui/decorations';
import { LibrarySectionHeader, LibraryNoResults } from '@/components/homebrew/library-section-header';
import { SpellCard } from '@/components/character/spell-card';
import { randomId } from '@/lib/creation/id';
import { CustomSpell, spellFromCustom } from '@/lib/spells/types';
import { deleteCustomSpell, upsertCustomSpell } from '@/lib/spells/actions';

const fieldClass = 'mt-1 min-h-11 w-full rounded-card border border-border bg-surface-1 px-3 py-2 text-text-primary';
const buttonClass = 'min-h-11 rounded-card border border-border-2 px-3 text-ui text-gold hover:border-gold';

export function SpellManager({ initial, extras, search = '' }: { initial: CustomSpell[]; extras: Record<string, ReactNode>; search?: string }) {
  const [editing, setEditing] = useState<CustomSpell | null>(null);
  const [deleting, setDeleting] = useState<CustomSpell | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  async function remove() {
    if (!deleting || busy) return;
    setBusy(true); setError(null);
    try {
      const result = await deleteCustomSpell(deleting.id);
      if (result.error) setError(result.error);
      else { setDeleting(null); router.refresh(); }
    } catch { setError('連線失敗，請重試。'); }
    finally { setBusy(false); }
  }
  const visible = initial.filter(s => [s.name, s.nameEn].some(name => name.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())));
  return <section className="min-w-0">
    <LibrarySectionHeader title="法術" subtitle="撰寫咒語，再到角色的法術頁從收藏選用。" count={initial.length} onCreate={() => setEditing({ ...CustomSpell.parse({ id: randomId(), name: '新法術', level: 0, description: '法術效果' }), name: '', description: '' })} />
      {!initial.length && <div className="rounded-card border border-dashed border-border px-4 py-10 text-center"><p className="text-body text-text-primary">尚未收藏法術</p><p className="mt-2 text-ui text-text-secondary">從「新增法術」開始，寫下你的第一道咒語。</p></div>}
      {initial.length > 0 && !visible.length && <LibraryNoResults />}
      <div className="space-y-3">{visible.map(s => <ParchmentCard key={s.id} className="overflow-hidden">
        <div className="medium:flex medium:items-start">
        <div className="min-w-0 flex-1"><SpellCard spell={spellFromCustom(s)} borderless /></div>
        <div className="flex shrink-0 justify-end gap-2 px-3 pb-3 medium:pt-3">
          <button className={buttonClass} onClick={() => setEditing(s)} aria-label={`編輯 ${s.name}`}>編輯</button>
          <button className={buttonClass} onClick={() => { setError(null); setDeleting(s); }} aria-label={`刪除 ${s.name}`}>刪除</button>
        </div>
        </div>
        {extras[s.id] && <div className="px-4 pb-1">{extras[s.id]}</div>}
      </ParchmentCard>)}</div>
    {editing && <SpellEditor initial={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); router.refresh(); }} />}
    <EditorSheet open={!!deleting} title="刪除自創法術" onClose={() => { if (!busy) setDeleting(null); }} onSave={remove} saveEnabled={!busy} saveLabel={busy ? '刪除中…' : '確認刪除'} saveTone="danger">
      <p>刪除「{deleting?.name}」？既有角色保存的法術不受影響，但此法術的分享連結將無法使用。</p>
      {error && <p role="alert" className="mt-3 text-danger">{error}</p>}
    </EditorSheet>
  </section>;
}

function SpellEditor({ initial, onClose, onSaved }: { initial: CustomSpell; onClose: () => void; onSaved: () => void }) {
  const [draft, setDraft] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  function patch<K extends keyof CustomSpell>(key: K, value: CustomSpell[K]) { setDraft(d => ({ ...d, [key]: value })); }
  async function save() {
    if (busy) return;
    setBusy(true); setError(null);
    try {
      const result = await upsertCustomSpell(draft);
      if (result.error) setError(result.error); else onSaved();
    } catch { setError('連線失敗，草稿仍保留，請重試。'); }
    finally { setBusy(false); }
  }
  return <EditorSheet open title="編寫自創法術" onClose={() => { if (!busy) onClose(); }} onSave={save} saveEnabled={!busy && CustomSpell.safeParse(draft).success} saveLabel={busy ? '儲存中…' : '儲存法術'}>
    <fieldset disabled={busy} className="space-y-4 text-ui text-text-secondary">
      <p>名稱與效果說明為必填；儲存不會更新已選用此法術的角色。</p>
      <div className="grid grid-cols-1 gap-3 medium:grid-cols-2">
        {([['name','法術名稱 *',120],['nameEn','英文名稱',120],['school','學派',80],['castingTime','施法時間 *',200],['range','射程',200],['duration','持續時間',200],['components','成分（言語／姿勢／材料）',500],['damage','傷害骰',120],['damageType','傷害類型',120]] as const).map(([key,label,max]) => <label key={key}>{label}<input className={fieldClass} maxLength={max} value={draft[key]} onChange={e => patch(key,e.target.value)} /></label>)}
        <label>環數<select className={fieldClass} value={draft.level} onChange={e => patch('level',Number(e.target.value))}>{Array.from({length:10},(_,i) => <option key={i} value={i}>{i === 0 ? '戲法' : `${i} 環`}</option>)}</select></label>
        <label>行動分類<select className={fieldClass} value={draft.castKind} onChange={e => patch('castKind',e.target.value as CustomSpell['castKind'])}>{([['action','動作'],['bonus','附贈動作'],['reaction','反應'],['other','其他']] as const).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      </div>
      <div className="flex gap-5">{([['concentration','需要專注'],['ritual','可作為儀式']] as const).map(([key,label]) => <label key={key} className="flex min-h-11 items-center gap-2"><input type="checkbox" checked={draft[key]} onChange={e => patch(key,e.target.checked)} />{label}</label>)}</div>
      <label className="block">效果說明 *<textarea className={fieldClass} rows={6} maxLength={20000} value={draft.description} onChange={e => patch('description',e.target.value)} /></label>
      <label className="block">升環／成長效果<textarea className={fieldClass} rows={3} maxLength={5000} value={draft.upgrade} onChange={e => patch('upgrade',e.target.value)} /></label>
      {error && <p role="alert" className="text-danger">{error}</p>}
    </fieldset>
  </EditorSheet>;
}
