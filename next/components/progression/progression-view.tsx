'use client';
import { choiceGroups } from '@/lib/rules/progression/groups';
import { useState } from 'react';
import { AppLink } from '@/components/ui/app-link';
import type { Character } from '@/lib/domain/character';
import type { ChoiceCatalog, Selections } from '@/lib/rules/progression/groups';
import { applyChoices, validateChoices, type ChoiceContext } from '@/lib/rules/progression/engine';
import { ChoiceEditor } from './choice-editor';
import { updateCharacter } from '@/lib/characters/actions';
import { useFormDraft } from '@/lib/hooks/use-form-draft';
export function ProgressionView({ initial, catalog, context = 'backfill' }: {
    initial: Character;
    catalog: ChoiceCatalog;
    context?: ChoiceContext;
}) {
    const [value, setValue] = useState<Selections>(initial.progression?.selections ?? {});
    const [busy, setBusy] = useState(false), [error, setError] = useState('');
    const { pending, accept, discard, clear, checkpoint } = useFormDraft({ key: `lorebook-progression-${initial.id}-${initial.level}-${context}`, value, saving:busy, active: JSON.stringify(value) !== JSON.stringify(initial.progression?.selections ?? {}) });
    const errors = validateChoices(initial, value, catalog, context, false);
    const save = async () => { if(busy||errors.length)return; checkpoint(); setBusy(true); setError(''); try {
        const result = await updateCharacter(applyChoices(initial, value, catalog, context, false));
        if (result.error) {
            setError(result.error);
            setBusy(false);
        }
        else
            clear();
    }
    catch (e) {
        if (e instanceof Error && e.message.includes('NEXT_REDIRECT')) { clear(); throw e; }
        setError(e instanceof Error ? e.message : '保存失敗，請重試。');
        setBusy(false);
    } };
    return <main className="mx-auto w-full max-w-[800px] px-4 pb-12">
    <AppLink href="/main/character" className="inline-flex min-h-11 items-center text-small text-gold">‹ 返回角色</AppLink>
    <h1 className="font-cjk text-h2 text-text-primary">{context === 'rest' ? '休息後調整' : '補齊成長選擇'}</h1><p className="mt-2 text-small text-text-secondary">{initial.name} · {initial.className} {initial.level} 級。此頁不會提升等級或回復生命與資源；尚未選取的項目可以分次補齊。</p>
    {pending && <div className="my-3 flex items-center gap-3 text-small"><span>有未完成的選擇。</span><button disabled={busy} className="min-h-11 text-gold" onClick={() => { setValue(pending); accept(); }}>恢復草稿</button><button disabled={busy} className="min-h-11 text-text-secondary" onClick={discard}>捨棄草稿</button></div>}
    <fieldset disabled={busy} aria-busy={busy}><ChoiceEditor character={initial} catalog={catalog} value={value} onChange={setValue} context={context}/></fieldset>
    {busy&&<p role="status" className="my-2 text-small text-gold">正在保存，請稍候。若中斷或重新整理，在同一分頁回到本頁即可恢復草稿再送出。</p>}
    {(error || errors.length > 0) && <p role="alert" className="my-3 text-small text-danger">{error || errors.map(i=>`${choiceGroups(initial,catalog,value).find(g=>g.id===i.group)?.title??'起源專長'}：${i.message}`).join('；')}</p>}
    <button type="button" disabled={busy || errors.length > 0} onClick={save} className="min-h-12 w-full rounded-card border border-gold bg-gold/10 text-body font-bold text-gold disabled:opacity-40">{busy ? '保存中…' : '保存選擇'}</button>
  </main>;
}
