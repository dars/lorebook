'use client';
import { automaticSpellNames, normalizePreparedSelections } from '@/lib/rules/progression/granted-spells';
import {changeSelection} from '@/lib/rules/progression/change-selection';
import { CoinAmount } from '@/components/character/coins';
import { useState } from 'react';
import type { Character } from '@/lib/domain/character';
import { choiceGroups, type ChoiceCatalog, type ChoiceGroup, type Selections } from '@/lib/rules/progression/groups';
import { replacementLimit, validateChoices, type ChoiceContext } from '@/lib/rules/progression/engine';
export function ChoiceEditor({ character, catalog, value: rawValue, onChange, context = 'backfill' }: {
    character: Character;
    catalog: ChoiceCatalog;
    value: Selections;
    onChange: (v: Selections) => void;
    context?: ChoiceContext;
}) {
    const [notice,setNotice]=useState('');
    const value=normalizePreparedSelections(character,rawValue,catalog.spells);
    const groups = choiceGroups(character, catalog, value);
    const issues = validateChoices(character, value, catalog, context);
    const complete = groups.filter(g => (value[g.id]?.length ?? 0) >= (g.minCount??g.count) && (value[g.id]?.length??0)<=g.count && !issues.some(i=>i.group===g.id)).length;
    const always=new Set([...groups.filter(g=>g.kind==='spell'&&g.always).flatMap(g=>(value[g.id]??[]).filter(id=>catalog.spells.some(s=>s.id===id&&s.level>0))),...catalog.spells.filter(s=>s.level>0&&automaticSpellNames(character,value).includes(s.eng_name??'')).map(s=>s.id)]);
    const originHints=['background-origin','human-origin'].filter(source=>groups.some(g=>g.id===source+'/list')).map(source=>({label:source==='background-origin'?'背景法術新手':'人類法術新手',missing:groups.filter(g=>g.id.startsWith(source+'/')&&(value[g.id]?.length??0)<g.count).map(g=>`${g.title.split(' · ').at(-1)} ${value[g.id]?.length??0}/${g.count}`)})).filter(x=>x.missing.length);
    const change=(id:string,ids:string[])=>{const result=changeSelection(character,catalog,value,id,ids);onChange(result.value);if(result.promoted.length)setNotice(`已改為始終準備：${result.promoted.join('、')}。法術仍保留，新來源與免費施放資格會一併記錄；釋出的職業準備名額可另選法術。`);else if(id.endsWith('/list'))setNotice(result.removed.length?`已切換法術清單，清除不適用的舊選擇：${result.removed.join('、')}。請補選空出的名額。`:'已切換法術清單，仍符合資格的選擇已保留。');};
    return <section aria-label="成長選擇" className="my-4">
    <div className="mb-3 flex items-baseline justify-between gap-3 border-b border-border pb-2"><h2 className="font-cjk text-body font-bold text-gold">成長選擇</h2><span className="text-small text-text-secondary">{complete} / {groups.length} 項完成</span></div>
    <p className="mb-3 text-small leading-relaxed text-text-secondary">點選項目即可選取，再點一次取消。已選內容留在原位。既有法術選入名額後會歸到該來源，其他手動與自創內容會保留。{context === 'creation' && '起始組合會自動穿戴護甲並啟用武器，之後可在物品頁調整。'}</p>
    {character.classNameEn==='Bard'&&character.level>=10&&<aside className="mb-3 border-l-2 border-gold pl-3 text-small"><strong className="text-gold">魔法奧祕 · 10 級已解鎖</strong><p className="text-text-secondary">新增或替換的已備法術可從詩人、牧師、德魯伊、法師清單選擇，共用已備名額。每次升級可替換 1 個舊法術。</p><a href="#choice-prepared" className="inline-flex min-h-11 items-center text-gold underline">前往已備法術選擇</a></aside>}
    {always.size>0&&<p role="status" className="mb-3 text-small text-gold">目前已準備 {(value.prepared?.length??0)+always.size} 個法術：一般準備 {value.prepared?.length??0} 個 ＋ 始終準備 {always.size} 個（不占名額）。空出的名額可稍後補選，原有法術仍可施放。</p>}
    {groups.some(g=>g.id.startsWith('background-origin/')&&g.id.endsWith('/list'))&&<p className="mb-2 text-small text-text-secondary">{groups.some(g=>g.id==='human-origin/list')?'背景與人類專長各自授予一組法術新手，都需要分別選擇施法屬性、2 個戲法與 1 個一環法術。':'背景法術新手還需選擇施法屬性、2 個戲法與 1 個一環法術。'}完成數包含這些細項。</p>}
    {originHints.map(h=><p key={h.label} className="mb-1 text-small text-gold">{h.label}尚缺：{h.missing.join('、')}</p>)}
    {groups.filter(g=>g.legacyDuplicateIds?.length).map(g=><label key={g.id} className="mb-3 flex min-h-11 items-start gap-2 border-l-2 border-gold pl-3 text-small text-text-secondary"><input type="checkbox" className="mt-1" checked={g.legacyDuplicateIds!.every(id=>value[`keep-duplicate:${g.id}`]?.includes(id))} onChange={e=>onChange({...value,[`keep-duplicate:${g.id}`]:e.target.checked?g.legacyDuplicateIds!:[]})}/><span>{g.title}：沒有其他可選戲法。保留既有重複選擇並允許保存（不同戲法總數不會增加；不消耗替換額度）。</span></label>)}
    {notice&&<p role="status" className="my-2 text-small text-gold">{notice}</p>}
    <div className="divide-y divide-border-2">{groups.map(g => <Group key={g.id} group={g} character={character} value={value[g.id] ?? []} onChange={v => change(g.id,v)} context={context} issues={issues.filter(i => i.group === g.id).map(i => i.message)}/>)}</div>
  </section>;
}
function Group({ group: g, character: c, value, onChange, context, issues }: {
    group: ChoiceGroup;
    character: Character;
    value: string[];
    onChange: (v: string[]) => void;
    context: ChoiceContext;
    issues: string[];
}) {
    const [search, setSearch] = useState('');
    const [open, setOpen] = useState(false);
    const before = c.progression?.selections[g.id] ?? [];
    const limit = replacementLimit(c, g, context);
    const locked = !issues.length && before.length >= g.count && !limit && (g.kind === 'form' || before.every(id => value.includes(id) && g.options.some(o => o.id === id && !o.disabledReason)));
    const available: ChoiceGroup['options'] = [...g.options, ...value.filter(id => g.kind !== 'form' && !g.options.some(o => o.id === id)).map(id => ({ id, name: '已選項目需重新確認', detail: '名額或前置條件已改變，請取消後重選。' }))];
    const matches = available.filter(o => `${o.name} ${o.id} ${o.detail ?? ''}`.toLowerCase().includes(search.toLowerCase()));
    const toggle = (id: string) => onChange(value.includes(id) ? value.filter(v => v !== id) : g.count === 1 ? [id] : [...value, id]);
    const preview = value.map(v => g.kind === 'form' ? formName(v) : g.options.find(o => o.id === v)?.name ?? '待確認項目').join('、');
    return <div id={`choice-${g.id}`} className="scroll-mt-4 py-1">
    <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="flex min-h-11 w-full items-center gap-2 text-left"><span aria-hidden className="text-gold">{open ? '▾' : '▸'}</span><span className="min-w-0 flex-1"><span className="text-ui font-semibold text-text-primary">{g.title}</span><span className="ml-2 text-small text-text-secondary">{preview || '尚未選擇'}</span></span><span className={`shrink-0 text-small ${issues.length ? 'text-text-secondary' : 'text-gold'}`}>{g.id==='prepared'?`一般 ${value.length} · 上限 ${g.count}`:`${value.length}/${g.count}`}</span></button>
    {open && <div className="pb-3 pl-5">
      {g.detail && <p className="mb-2 text-small text-text-secondary">{g.detail}</p>}
      {locked ? <p className="text-small text-text-secondary">已完成。{g.replace ? `可在${g.replace.when === 'level' ? '下次升級' : g.replace.when === 'long' ? '長休' : '短休或長休'}後替換。` : '此為取得時的固定選擇。'}</p> : <>
        {before.length > 0 && limit > 0 && <p className="mb-2 text-small text-section-label">本次可替換 {limit >= 99 ? '整份清單' : `${limit} 項`}。請先取消舊項目，再選新項目。</p>}
        {g.kind === 'form' ? <FormPicker value={value} onChange={onChange} count={g.count} level={c.level}/> : <>
          {g.options.length > 8 && <input aria-label={`搜尋${g.title}`} placeholder="搜尋名稱…" value={search} onChange={e => setSearch(e.target.value)} className="mb-2 min-h-11 w-full rounded-chip border border-border bg-surface-2 px-3 text-ui text-text-primary"/>}
          <div className="max-h-72 overflow-y-auto rounded-chip border border-border-2 divide-y divide-border-2">
            {matches.map(o => <div key={o.id} className={`relative ${value.includes(o.id) ? 'bg-gold/10' : ''}`}><label className={`flex min-h-11 cursor-pointer items-start gap-2 px-3 py-2 ${o.description ? 'pr-24' : ''}`}><input type="checkbox" className="mt-1 size-4 shrink-0 accent-gold" checked={value.includes(o.id)} disabled={!value.includes(o.id) && (!!o.disabledReason || (value.length >= g.count && g.count !== 1))} onChange={() => toggle(o.id)}/><span className="min-w-0 text-ui text-text-primary">{o.name}{o.detail && <span className="mt-0.5 block text-small text-text-secondary">{o.detail}</span>}{o.priceCp !== undefined && <span className="mt-1 block"><CoinAmount cp={o.priceCp}/></span>}{o.disabledReason && <span className="block text-small text-section-label">{o.disabledReason}</span>}</span></label>{o.description && <details className="px-3 text-small text-text-secondary"><summary className="absolute right-3 top-0 inline-flex min-h-11 cursor-pointer items-center text-gold">查看效果</summary><p className="whitespace-pre-wrap pb-2 text-ui leading-relaxed text-text-primary">{o.description}</p></details>}</div>)}
            {!matches.length && <p className="p-3 text-small text-text-secondary">目前沒有候選項目。法術書或前置選擇完成後會出現；若內容庫離線，請稍後重試。</p>}
          </div>
        </>}
      </>}
      {value.length > 0 && issues.length > 0 && <p className="mt-2 text-small text-danger">{[...new Set(issues)].join(' ')}</p>}
    </div>}
  </div>;
}
function formName(v: string) { try {
    return JSON.parse(v).name;
}
catch {
    return '待確認形態';
} }
function FormPicker({ value, onChange, count, level }: {
    value: string[];
    onChange: (v: string[]) => void;
    count: number;
    level: number;
}) {
    const [name, setName] = useState(''), [cr, setCr] = useState('0'), [fly, setFly] = useState(false);
    return <div>
    {value.map(v => <div key={v} className="flex min-h-11 items-center justify-between gap-2 border-b border-border-2 text-ui text-text-primary"><span>{formName(v)} · CR {JSON.parse(v).cr}{JSON.parse(v).fly ? ' · 飛行' : ''}</span><button type="button" onClick={() => onChange(value.filter(x => x !== v))} className="min-h-11 px-2 text-small text-gold">移除</button></div>)}
    {value.length < count && <div className="mt-2 flex flex-wrap gap-2"><input aria-label="形態名稱" value={name} maxLength={100} onChange={e => setName(e.target.value)} placeholder="與 DM 確認的野獸名稱" className="min-h-11 min-w-0 flex-1 rounded-chip border border-border bg-surface-2 px-2 text-ui"/><select aria-label="挑戰等級" value={cr} onChange={e => setCr(e.target.value)} className="min-h-11 rounded-chip border border-border bg-surface-2 px-2 text-ui">{[0, .125, .25, ...(level >= 4 ? [.5] : []), ...(level >= 8 ? [1] : [])].map(v => <option key={v} value={v}>CR {v}</option>)}</select>{level >= 8 && <label className="flex min-h-11 items-center gap-1 text-small"><input type="checkbox" checked={fly} onChange={e => setFly(e.target.checked)}/>飛行</label>}<button type="button" disabled={!name.trim()} onClick={() => { const v = JSON.stringify({ name: name.trim(), cr: Number(cr), fly }); if (!value.includes(v))
        onChange([...value, v]); setName(''); }} className="min-h-11 px-3 text-gold disabled:opacity-40">加入形態</button></div>}
  </div>;
}
