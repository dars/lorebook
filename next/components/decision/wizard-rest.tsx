'use client';
import {isLandDruid} from '@/lib/rules/druid';
import {useState} from 'react';
import type {Character} from '@/lib/domain/character';
import {recoverArcaneSlots} from '@/lib/rules/wizard';
import {useCharacterStore} from '@/lib/state/character-store';
export function WizardRest({c}:{c:Character}) {
 const [counts,setCounts]=useState<Record<number,number>>({}),[message,setMessage]=useState('');
 const natural=isLandDruid(c)&&c.level>=6, title=natural?'自然復甦':'奧術回復';
 if(c.classNameEn!=='Wizard'&&!natural)return null;
 const remaining=c.resources.find(r=>r.nameEn===(natural?'Natural Recovery':'Arcane Recovery'))?.current??0;
 const total=Object.entries(counts).reduce((sum,[l,n])=>sum+Number(l)*n,0),budget=Math.ceil(c.level/2);
 const slots=c.spellSlots.filter(s=>s.level<=5&&s.used>0);
 const valid=remaining>0&&c.progression?.rest==='short'&&total>0&&total<=budget&&Object.entries(counts).every(([l,n])=>Number.isInteger(n)&&n>=0&&n<=(c.spellSlots.find(s=>s.level===Number(l))?.used??0));
 return <div className="mt-3 border-t border-border pt-2 text-small">
 <p className="font-semibold text-gold">{title} · {remaining}/1 次</p>
 <p className="py-1 text-text-secondary">短休後恢復一至五環的法術位，總環數上限 {budget}；長休恢復使用次數。</p>
 {c.progression?.rest==='short'&&remaining>0?<><div className="flex flex-wrap gap-2">{slots.map(s=><label key={s.level} className="flex min-h-11 items-center gap-2">{s.level} 環（已用 {s.used}）<input aria-label={`${title} ${s.level} 環數量`} type="number" min={0} max={s.used} value={counts[s.level]??0} onChange={e=>setCounts({...counts,[s.level]:Number(e.target.value)})} className="min-h-11 w-16 rounded-chip border border-border bg-surface-2 px-2"/></label>)}</div><button type="button" disabled={!valid} onClick={()=>{try{useCharacterStore.getState().update(current=>{if(current.id!==c.id)throw Error('角色已切換');return recoverArcaneSlots(current,counts);});setCounts({});setMessage(`已回復法術位並消耗 1 次${title}。`);}catch(e){setMessage(e instanceof Error?e.message:'無法回復');}}} className="min-h-11 text-gold disabled:opacity-40">回復法術位 · 已選 {total}/{budget} 環</button></>:<p className="py-2 text-text-secondary">{remaining?'完成短休後可選擇要回復的法術位。':'已使用，長休後可再次使用。'}</p>}

 {c.classNameEn==='Wizard'&&c.level>=18&&<p className="py-1 text-text-secondary">法術精通：最低環隨意施放、不耗次數；長休後可替換 {c.progression?.rest==='long'?Math.max(0,1-(c.progression.restSpent['spell-mastery']??0)):1} 個。</p>}
 {message&&<p role="status" className="text-gold">{message}</p>}
 </div>;
}
