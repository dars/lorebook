'use client';
import { useState } from 'react';
import type { Character } from '@/lib/domain/character';
import { bardPowers, bardInitiative, inspirationResource, spendBardPower, type BardPower } from '@/lib/rules/bard';
import { useCharacterStore } from '@/lib/state/character-store';

function PowerCard({c,p}:{c:Character;p:BardPower}) {
  const [slot,setSlot]=useState(0),[message,setMessage]=useState('');
  const resource=p.resource==='Bardic Inspiration'?inspirationResource(c):c.resources.find(r=>r.nameEn===p.resource);
  const slots=c.spellSlots.filter(s=>s.level>0&&s.used<s.total);
  const selected=slots.some(s=>s.level===slot)?slot:slots[0]?.level;
  const act=(initiative=false)=>{try{
    useCharacterStore.getState().update(current=>{if(current.id!==c.id)throw Error('角色已切換，請重新開啟能力。');return initiative?bardInitiative(current):spendBardPower(current,p.id,selected);});
    setMessage(initiative||p.id==='superior'?'已登記擲先攻，恢復適用資源。':p.id==='font'?'已消耗法術位，恢復 1 次激勵。':`已使用${p.name}，扣除 1 次。`);
  }catch(e){setMessage((e as Error).message);}};
  const disabled=!resource||(p.id==='font'?resource.current>=resource.max||!selected:p.id==='superior'?false:resource.current<1);
  return <details className="rounded-card border border-border bg-surface-1 px-3">
    <summary className="flex min-h-11 cursor-pointer items-center gap-2 py-2 text-ui"><span className="flex-1 font-semibold text-text-primary">{p.name}</span><span className="text-small text-text-secondary">{resource?`${resource.current}/${resource.max}${resource.dieFaces?` · d${resource.dieFaces}`:''}`:p.kind==='reaction'?'使用反應':'被動'}</span></summary>
    <p className="pb-2 text-small leading-relaxed text-text-secondary">{p.description}</p>
    {p.id==='font'&&<label className="mb-2 flex min-h-11 items-center gap-2 text-small">消耗法術位<select aria-label="激勵泉源消耗環數" value={selected??''} onChange={e=>setSlot(Number(e.target.value))} className="min-h-11 rounded border border-border bg-surface-2 px-2">{!slots.length&&<option value="">無可用法術位</option>}{slots.map(s=><option key={s.level} value={s.level}>{s.level} 環 · 剩餘 {s.total-s.used}</option>)}</select></label>}
    {p.resource&&<button type="button" disabled={disabled} onClick={()=>act()} className="mb-2 min-h-11 w-full rounded-chip border border-gold px-2 text-small text-gold disabled:opacity-40">{p.id==='font'?'消耗法術位 · 恢復 1 次激勵':p.id==='superior'?'已擲先攻 · 恢復適用資源':p.id==='peerless'?'擲骰後成功 · 消耗 1 次激勵':'使用 · 消耗 1 次'}</button>}
    {p.id==='peerless'&&<button type="button" disabled={!resource?.current} className="mb-2 min-h-11 w-full text-small text-gold disabled:opacity-40" onClick={()=>setMessage('仍然失敗，不消耗激勵。')}>仍然失敗 · 不消耗</button>}
    {p.id==='fate'&&<button type="button" className="mb-2 min-h-11 w-full text-small text-gold" onClick={()=>act(true)}>已擲先攻 · 恢復適用資源</button>}
    {message&&<p role="status" className="pb-2 text-small text-gold">{message}</p>}
  </details>;
}
export function BardPowers({c,kind}:{c:Character;kind:BardPower['kind']}) {return bardPowers(c).filter(p=>p.kind===kind).map(p=><PowerCard key={p.id} c={c} p={p}/>);}
