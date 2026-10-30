'use client';
import {useState} from 'react';
import type {Character} from '@/lib/domain/character';
import {focusDc,focusResource,martialArtsActive,martialDie,monkPowers,openHand,activateMonkPower,type MonkPower} from '@/lib/rules/monk';
import {useCharacterStore} from '@/lib/state/character-store';
function Power({c,p}:{c:Character;p:MonkPower}){
 const [roll,setRoll]=useState(''),[target,setTarget]=useState(''),[message,setMessage]=useState('');
 const needsRoll=['metabolism','whole'].includes(p.id)||(p.id==='patient'&&c.level>=10);
 const dice=p.id==='patient'?2:1,max=dice*martialDie(c.level);
 const resource=p.id==='metabolism'?'Uncanny Metabolism':p.id==='whole'?'Wholeness of Body':null;
 const remaining=resource?c.resources.find(r=>r.nameEn===resource)?.current??0:focusResource(c)?.current??0;
 const disabled=(resource?remaining<1:remaining<p.cost)||(p.id==='unarmed'&&!martialArtsActive(c))||(needsRoll&&(!Number.isInteger(Number(roll))||Number(roll)<dice||Number(roll)>max))||(p.id==='palm'&&!target.trim())||(p.id==='perfect'&&remaining>=4);
 const act=()=>{try{useCharacterStore.getState().update(current=>{if(current.id!==c.id)throw Error('角色已切換');return activateMonkPower(current,p.id,needsRoll?Number(roll):undefined,target);});setMessage(`已使用${p.name}${p.cost?`，消耗 ${p.cost} 點專注`:''}。`);}catch(e){setMessage((e as Error).message);}};
 return <details className="border-t border-border text-small"><summary className="flex min-h-11 cursor-pointer items-center justify-between gap-2"><span className="font-semibold">{p.name}</span><span className="text-gold">{resource?`剩 ${remaining} 次`:p.cost?`${p.cost} 專注`:'不耗專注'}</span></summary><p className="pb-2 leading-relaxed text-text-secondary">{p.description}</p>
 {needsRoll&&<label className="flex min-h-11 items-center gap-2">{dice}d{martialDie(c.level)} 擲骰結果<input aria-label={`${p.name}骰子結果`} type="number" min={dice} max={max} value={roll} onChange={e=>setRoll(e.target.value)} className="min-h-11 w-20 border border-border bg-surface-2 px-2"/></label>}
 {p.id==='palm'&&<label className="flex min-h-11 items-center gap-2">目標<input aria-label="顫掌目標" value={target} onChange={e=>setTarget(e.target.value)} className="min-h-11 min-w-0 flex-1 border border-border bg-surface-2 px-2"/></label>}
 <button type="button" disabled={disabled} onClick={act} className="mb-2 min-h-11 rounded-chip border border-border px-3 text-gold disabled:opacity-40">{p.id==='metabolism'||p.id==='perfect'?'擲先攻時使用':'使用'}</button>
 {message&&<p role="status" className="pb-2 text-gold">{message}</p>}
 </details>;
}
export function MonkPowers({c,kind}:{c:Character;kind:MonkPower['kind']}){
 if(c.classNameEn!=='Monk')return null;
 const update=(fn:(c:Character)=>Character)=>useCharacterStore.getState().update(current=>current.id===c.id?fn(current):current);
 return <div className="text-small">
 {kind==='other'&&<p className="pb-2 text-gold">專注 {focusResource(c)?.current??0}/{focusResource(c)?.max??0} · 專注豁免 DC {focusDc(c)} · 武藝 1d{martialDie(c.level)}</p>}
 {monkPowers(c).filter(p=>p.kind===kind).map(p=><Power key={p.id} c={c} p={p}/>)}
 {kind==='bonus'&&openHand(c)&&c.level>=11&&<p className="py-2 text-text-secondary">迅捷步伐：使用其他附贈動作後，可立即再用疾步如風；免費版不扣專注，強化版仍花1點。</p>}
 {kind==='other'&&c.monkSuperiorDefense&&<div className="py-2 text-gold">卓絕防禦啟用中 · 抗力場以外全部傷害<button type="button" onClick={()=>update(c=>({...c,monkSuperiorDefense:false}))} className="min-h-11 px-3 underline">結束效果</button></div>}
 {kind==='other'&&c.quiveringPalmTarget&&<div className="py-2"><p>顫掌目標：{c.quiveringPalmTarget}。同位面才能引爆；動作或攻擊動作中放棄一次攻擊，體質豁免 DC {focusDc(c)}，失敗10d12力場、成功半傷。引爆不再扣專注。</p><button type="button" className="min-h-11 px-3 text-gold" onClick={()=>update(c=>({...c,quiveringPalmTarget:undefined}))}>引爆並清除目標</button><button type="button" className="min-h-11 px-3 text-gold" onClick={()=>update(c=>({...c,quiveringPalmTarget:undefined}))}>無害解除</button></div>}
 {kind==='other'&&c.level>=10&&<div className="py-2"><p>自我復原 · 自己回合結束移除一個狀態</p>{c.conditions.filter(x=>['魅惑','恐懼','中毒','Charmed','Frightened','Poisoned'].includes(x)).map(x=><button key={x} type="button" onClick={()=>update(c=>({...c,conditions:c.conditions.filter(s=>s!==x)}))} className="min-h-11 px-3 text-gold">移除{x}</button>)}</div>}
 </div>;
}
