'use client';

import { useEffect, useState } from 'react';
import { EditorSheet, FieldLabel } from '@/components/ui/editor-sheet';
import type { CatalogItem } from '@/lib/catalog/types';
import type { Character } from '@/lib/domain/character';
import { useCharacterStore } from '@/lib/state/character-store';
import { applyStringSelection } from '@/lib/ui/selection';

const LANGUAGES = ['通用語', '矮人語', '精靈語', '巨人語', '侏儒語', '地精語', '半身人語', '獸人語', '深淵語', '天界語', '深潛語', '龍語', '煉獄語', '原初語', '精類語', '地底通用語'];

export function ProficiencyEditor({ open, onClose, tools }: { open: boolean; onClose: () => void; tools: CatalogItem[] }) {
  const c = useCharacterStore(s => s.character);
  return open && c ? <ProficiencyDraft key={c.id} initial={c} tools={tools} onClose={onClose} /> : null;
}

function ProficiencyDraft({ initial, tools, onClose }: { initial: Character; tools: CatalogItem[]; onClose: () => void }) {
  const [before] = useState(initial);
  const [languages, setLanguages] = useState(before.languages);
  const [proficiencies, setProficiencies] = useState(before.toolProficiencies);
  const [discard, setDiscard] = useState(false);
  const changed = (a: string[], b: string[]) => a.length !== b.length || a.some(s => !b.includes(s));
  const dirty = changed(before.languages, languages) || changed(before.toolProficiencies, proficiencies);
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  return <>
    <EditorSheet open title="管理熟練" onClose={() => dirty ? setDiscard(true) : onClose()} saveLabel="儲存變更" saveEnabled={dirty}
      footer={<p role="status" className="text-small text-text-secondary">已選 {languages.length} 種語言 · {proficiencies.length} 項工具</p>}
      onSave={() => {
        useCharacterStore.getState().update(c => c.id !== before.id ? c : { ...c,
          languages: applyStringSelection(c.languages, before.languages, languages),
          toolProficiencies: applyStringSelection(c.toolProficiencies, before.toolProficiencies, proficiencies),
        });
        onClose();
      }}>
      <p className="mb-4 text-ui text-text-secondary">原地勾選或取消，儲存後才套用到角色。成長選擇授予的熟練請至「成長選擇／補選」管理。</p>
      <Choices title="語言" options={[...LANGUAGES, ...before.languages]} locked={before.progression?.grantedLanguages} selected={languages} onChange={setLanguages} />
      <div className="mt-6"><Choices title="工具" options={[...tools.map(t => t.name), ...before.toolProficiencies]} locked={before.progression?.grantedTools} selected={proficiencies} onChange={setProficiencies} /></div>
      {!tools.length && <p className="text-small text-text-secondary">工具目錄暫無資料，仍可管理既有熟練或自行填寫。</p>}
    </EditorSheet>
    <EditorSheet open={discard} title="捨棄尚未儲存的熟練變更？" onClose={() => setDiscard(false)} closeLabel="繼續編輯" onSave={onClose} saveLabel="捨棄變更" saveTone="danger"><p>角色目前的熟練不會改變。</p></EditorSheet>
  </>;
}

function Choices({ title, options, selected, onChange, locked=[] }: { locked?:string[]; title: string; options: string[]; selected: string[]; onChange: (items: string[]) => void }) {
  const [custom, setCustom] = useState<string[]>([]);
  const [value, setValue] = useState('');
  const all = [...new Set([...options, ...custom])];
  return <section aria-label={title}>
    <FieldLabel>{title}</FieldLabel>
    <div className="grid gap-2 medium:grid-cols-2">{all.map(item => <label key={item} className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-card border px-3 py-2 text-ui ${selected.includes(item) ? 'border-gold bg-gold/10 text-gold' : 'border-border-2 text-text-primary'}`}>
      <input type="checkbox" className="size-4 shrink-0 accent-gold" checked={selected.includes(item)} disabled={locked.includes(item)} onChange={() => onChange(selected.includes(item) ? selected.filter(s => s !== item) : [...selected, item])} />
      <span className="break-words">{item}</span>
    </label>)}</div>
    <div className="mt-3 flex gap-2">
      <input aria-label={`自訂${title}`} maxLength={20} value={value} onChange={e => setValue(e.target.value)} placeholder={`自行填寫${title}…`} className="min-h-11 min-w-0 flex-1 rounded-card border border-border bg-surface-0 px-3 text-body" />
      <button type="button" disabled={!value.trim()} className="min-h-11 px-3 text-ui text-gold disabled:opacity-40" onClick={() => {
        const item = value.trim();
        if (!all.includes(item)) setCustom([...custom, item]);
        if (!selected.includes(item)) onChange([...selected, item]);
        setValue('');
      }}>加入</button>
    </div>
  </section>;
}
