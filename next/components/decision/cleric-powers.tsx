'use client';
import {useState} from 'react';
import type {Character} from '@/lib/domain/character';
import {clericPowers,channelResource,spendClericPower,preserveLife,isLifeCleric,discipleHealingBonus,type ClericPower,type HealingTarget} from '@/lib/rules/cleric';
import {useCharacterStore} from '@/lib/state/character-store';
const button='mb-2 min-h-11 w-full rounded-chip border border-gold px-2 text-small text-gold disabled:opacity-40';
function PowerCard({c,p}:{c:Character;p:ClericPower}){
 const [wish,setWish]=useState(false),[rests,setRests]=useState(''),[message,setMessage]=useState('');
 const [targets,setTargets]=useState<HealingTarget[]>([c.currentHp<=Math.floor(c.maxHp/2)?{name:'自己',current:c.currentHp,max:c.maxHp,amount:0,self:true}:{name:'其他目標',current:0,max:20,amount:0,self:false}]);
 const r=p.resource==='Channel Divinity'?channelResource(c):c.resources.find(r=>r.nameEn===p.resource);
 const cooldown=p.id==='intervention'?(c.divineInterventionRests??0):0;
 const updateTarget=(index:number,patch:Partial<HealingTarget>)=>setTargets(old=>old.map((t,i)=>i===index?{...t,...patch}:t));
 const act=()=>{try{useCharacterStore.getState().update(current=>{if(current.id!==c.id)throw Error('角色已切換，請重新開啟能力。');return p.id==='preserve'?preserveLife(current,targets):spendClericPower(current,p.id,wish?Number(rests):undefined);});setMessage(p.id==='preserve'?'已消耗 1 次引導神力；自己的 HP 已同步，其他目標請依分配更新角色卡。':`已使用${p.name}，消耗 1 次。`);}catch(e){setMessage((e as Error).message);}};
 return <details className="rounded-card border border-border bg-surface-1 px-3">
  <summary className="flex min-h-11 cursor-pointer items-center gap-2 py-2 text-ui"><span className="flex-1 font-semibold text-text-primary">{p.name}</span><span className="text-small text-text-secondary">{cooldown?`還需 ${cooldown} 次長休`:`${r?.current??0}/${r?.max??0}`}</span></summary>
  <p className="pb-2 text-small leading-relaxed text-text-secondary">{p.description}</p>
  {p.id==='preserve'&&<div className="space-y-2 pb-2 text-small">
   <p className="text-gold">已分配 {targets.reduce((n,t)=>n+t.amount,0)} / {c.level*5} HP</p>
   {targets.map((t,i)=><fieldset key={i} className="border-t border-border-2 pt-2"><legend>目標 {i+1}</legend>
    <label className="flex min-h-11 items-center gap-2"><input type="checkbox" checked={!!t.self} onChange={e=>updateTarget(i,{self:e.target.checked})}/>自己（同步 HP）</label>
    {!t.self&&<label className="block">名稱<input aria-label={`目標${i+1}名稱`} value={t.name} onChange={e=>updateTarget(i,{name:e.target.value})} className="min-h-11 w-full border border-border bg-surface-2 px-2"/></label>}
    <div className="grid grid-cols-3 gap-2">{(['current','max','amount'] as const).map((key,j)=><label key={key}>{['目前HP','最大HP','治療量'][j]}<input aria-label={`目標${i+1}${['目前HP','最大HP','治療量'][j]}`} type="number" min={key==='max'?1:0} disabled={t.self&&key!=='amount'} value={t.self&&key!=='amount'?(key==='max'?c.maxHp:c.currentHp):t[key]} onChange={e=>updateTarget(i,{[key]:Number(e.target.value)})} className="min-h-11 w-full border border-border bg-surface-2 px-2"/></label>)}</div>
    <button type="button" className="min-h-11 text-gold" onClick={()=>setTargets(old=>old.filter((_,n)=>n!==i))}>移除目標</button>
   </fieldset>)}
   <button type="button" className="min-h-11 text-gold" onClick={()=>setTargets(old=>[...old,{name:'其他目標',current:0,max:20,amount:0}])}>＋新增治療目標</button>
  </div>}
  {p.id==='intervention'&&c.level>=20&&<div className="pb-2 text-small"><label className="flex min-h-11 items-center gap-2"><input type="checkbox" checked={wish} onChange={e=>setWish(e.target.checked)}/>施放祈願術</label>{wish&&<label className="flex min-h-11 items-center gap-2">2d4 擲骰合計<input aria-label="祈願術恢復所需長休次數" type="number" min={2} max={8} value={rests} onChange={e=>setRests(e.target.value)} className="min-h-11 w-20 border border-border bg-surface-2 px-2"/></label>}</div>}
  <button type="button" className={button} disabled={!r||r.current<1||cooldown>0||(wish&&(!Number.isInteger(Number(rests))||Number(rests)<2||Number(rests)>8))} onClick={act}>{p.id==='preserve'?'確認分配 · 消耗 1 次引導神力':p.id==='intervention'?'使用神聖介入 · 不消耗法術位':'使用 · 消耗 1 次引導神力'}</button>
  {message&&<p role="status" className="pb-2 text-small text-gold">{message}</p>}
 </details>;
}
function LifeHealing({c}:{c:Character}){
 const [level,setLevel]=useState(1);
 if(!isLifeCleric(c)||c.level<3)return null;
 return <details className="rounded-card border border-border bg-surface-1 px-3"><summary className="flex min-h-11 cursor-pointer items-center py-2 text-ui">生命領域 · 治療加值</summary><label className="flex min-h-11 items-center gap-2 text-small">實際消耗的法術位<select aria-label="生命門徒法術位環數" value={level} onChange={e=>setLevel(Number(e.target.value))} className="min-h-11 border border-border bg-surface-2 px-2"><option value={0}>免費施放／引導神力</option>{Array.from({length:9},(_,i)=>i+1).map(n=><option key={n} value={n}>{n} 環</option>)}</select></label><p className="pb-2 text-small text-text-secondary">生命門徒：施放回合每個治療目標額外 +{discipleHealingBonus(c,level)} HP。{c.level>=6&&`祝福醫者：若這次使用法術位治療其他生物，自己額外恢復 ${discipleHealingBonus(c,level)} HP。`}{c.level>=17?'至高治療：法術及引導神力的治療骰取最高值；傷害骰照常擲。':''}這裡顯示加值，法術位與治療結果請在對應角色卡登記。</p></details>;
}
export function ClericPowers({c}:{c:Character}){return <>{clericPowers(c).map(p=><PowerCard key={p.id} c={c} p={p}/>)}<LifeHealing c={c}/></>;}
