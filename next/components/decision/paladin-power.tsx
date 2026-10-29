'use client';
import {useState} from 'react';
import type {Character} from '@/lib/domain/character';
import {paladinPowers,spendPaladinPower,restoreNimbus,restoringConditions,type PaladinPower} from '@/lib/rules/paladin';
import {useCharacterStore} from '@/lib/state/character-store';
export function PaladinPowerCard({c,power:p}:{c:Character;power:PaladinPower}){
 const [healing,setHealing]=useState(1),[self,setSelf]=useState(false),[conditions,setConditions]=useState<string[]>([]),[message,setMessage]=useState('');
 const r=c.resources.find(r=>r.nameEn===p.resource),cost=p.id==='lay'?healing+conditions.length*5:1;
 const act=(restore=false)=>{try{useCharacterStore.getState().update(current=>{if(current.id!==c.id)throw Error('角色已切換，請重新開啟能力。');return restore?restoreNimbus(current):spendPaladinPower(current,p.id,healing,conditions,self);});setMessage(restore?'已恢復 1 次神聖光環。':`已使用${p.name}。`);}catch(e){setMessage(e instanceof Error?e.message:'無法使用');}};
 return <details className="rounded-card border border-border bg-surface-1 px-3">
  <summary className="flex min-h-11 cursor-pointer items-center justify-between gap-2 py-2 text-ui"><span className="font-semibold text-text-primary">{p.name}</span><span className="text-small text-text-secondary">{r?`${r.name} ${r.current}/${r.max}`:'被動・不耗次數'}</span></summary>
  <p className="pb-2 text-small leading-relaxed text-text-secondary">{p.description}</p>
  {p.id==='lay'&&<div className="space-y-2 text-small">
   <label className="flex min-h-11 items-center gap-2">治療點數<input aria-label="聖療治療點數" type="number" min={0} max={r?.current??0} value={healing} onChange={e=>setHealing(Number(e.target.value))} className="min-h-11 w-20 rounded-chip border border-border bg-surface-2 px-2"/></label>
   <label className="flex min-h-11 items-center gap-2"><input type="checkbox" checked={self} onChange={e=>setSelf(e.target.checked)}/>用於自己（同步回復 HP／解除狀態）</label>
   <p>解除狀態，每項 5 點{c.level>=14?'（含復原之觸）':''}</p>
   <div className="flex flex-wrap gap-x-3">{restoringConditions(c.level).map(x=><label key={x} className="flex min-h-11 items-center gap-1"><input type="checkbox" checked={conditions.includes(x)} onChange={e=>setConditions(e.target.checked?[...conditions,x]:conditions.filter(v=>v!==x))}/>{x}</label>)}</div>
  </div>}
  {p.resource&&<button type="button" disabled={!r||r.current<cost||!Number.isInteger(cost)||cost<1} onClick={()=>act()} className="mb-2 min-h-11 w-full rounded-chip border border-gold px-2 text-small text-gold disabled:opacity-40">使用・消耗 {cost} {p.id==='lay'?'點':'次'}</button>}
  {p.id==='nimbus'&&<button type="button" disabled={!r||r.current>=r.max||!c.spellSlots.some(s=>s.level===5&&s.used<s.total)} onClick={()=>act(true)} className="mb-2 min-h-11 w-full text-small text-gold disabled:opacity-40">消耗 5 環法術位恢復次數</button>}
  {message&&<p role="status" className="pb-2 text-small text-gold">{message}</p>}
 </details>;
}
export function PaladinPowers({c,kind}:{c:Character;kind:PaladinPower['kind']}){return paladinPowers(c).filter(p=>p.kind===kind).map(p=><PaladinPowerCard key={p.id} c={c} power={p}/>);}
