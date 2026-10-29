'use client';
import {useState} from 'react';
import type {Character} from '@/lib/domain/character';
import {recoverArcaneSlots} from '@/lib/rules/wizard';
import {useCharacterStore} from '@/lib/state/character-store';
export function WizardRest({c}:{c:Character}) {
 const [counts,setCounts]=useState<Record<number,number>>({}),[message,setMessage]=useState('');
 if(c.classNameEn!=='Wizard')return null;
 const remaining=c.resources.find(r=>r.nameEn==='Arcane Recovery')?.current??0;
 const total=Object.entries(counts).reduce((sum,[l,n])=>sum+Number(l)*n,0),budget=Math.ceil(c.level/2);
 const slots=c.spellSlots.filter(s=>s.level<=5&&s.used>0);
 const valid=remaining>0&&c.progression?.rest==='short'&&total>0&&total<=budget&&Object.entries(counts).every(([l,n])=>Number.isInteger(n)&&n>=0&&n<=(c.spellSlots.find(s=>s.level===Number(l))?.used??0));
 return <div className="mt-3 border-t border-border pt-2 text-small">
 <p className="font-semibold text-gold">奧術回復 · {remaining}/1 次</p>
 <p className="py-1 text-text-secondary">短休後恢復一至五環的法術位，總環數上限 {budget}；長休恢復使用次數。</p>
 {c.progression?.rest==='short'&&remaining>0?<><div className="flex flex-wrap gap-2">{slots.map(s=><label key={s.level} className="flex min-h-11 items-center gap-2">{s.level} 環（已用 {s.used}）<input aria-label={`奧術回復 ${s.level} 環數量`} type="number" min={0} max={s.used} value={counts[s.level]??0} onChange={e=>setCounts({...counts,[s.level]:Number(e.target.value)})} className="min-h-11 w-16 rounded-chip border border-border bg-surface-2 px-2"/></label>)}</div><button type="button" disabled={!valid} onClick={()=>{try{useCharacterStore.getState().update(current=>{if(current.id!==c.id)throw Error('角色已切換');return recoverArcaneSlots(current,counts);});setCounts({});setMessage('已回復法術位並消耗 1 次奧術回復。');}catch(e){setMessage(e instanceof Error?e.message:'無法回復');}}} className="min-h-11 text-gold disabled:opacity-40">回復法術位 · 已選 {total}/{budget} 環</button></>:<p className="py-2 text-text-secondary">{remaining?'完成短休後可選擇要回復的法術位。':'已使用，長休後可再次使用。'}</p>}
 {c.level>=5&&<p className="py-1 text-text-secondary">記憶法術：{c.progression?.rest==='short'?`本次短休可替換 ${Math.max(0,1-(c.progression.restSpent.prepared??0))} 個已備法術。`:'短休後可更換一個已備法術。'}登入角色可從休息後的調整入口更換。</p>}
 {c.level>=18&&<p className="py-1 text-text-secondary">法術精通：最低環隨意施放、不耗次數；長休後可替換 {c.progression?.rest==='long'?Math.max(0,1-(c.progression.restSpent['spell-mastery']??0)):1} 個。</p>}
 {message&&<p role="status" className="text-gold">{message}</p>}
 </div>;
}
