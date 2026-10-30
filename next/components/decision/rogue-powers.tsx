'use client';
import {useState} from 'react';
import type {Character} from '@/lib/domain/character';
import {sneakDice,cunningDc,cunningOptions,cunningRemaining,isThief,activateStrokeOfLuck} from '@/lib/rules/rogue';
import {characterActions,useCharacterStore} from '@/lib/state/character-store';
const button='min-h-11 rounded-chip border border-border px-3 text-gold disabled:opacity-40';
function Option({name,description}:{name:string;description:string}){
 const [used,setUsed]=useState(false);
 return <details className="border-t border-border"><summary className="min-h-11 cursor-pointer py-3 font-semibold">{name}</summary><p className="pb-2 text-text-secondary">{description}</p><button className={button} type="button" onClick={()=>setUsed(!used)}>{used?'清除使用提示':'使用'}</button>{used&&<p role="status" className="py-2 text-gold">本次使用：{description}</p>}</details>;
}
export function RoguePowers({c,kind}:{c:Character;kind:'other'|'bonus'|'reaction'}){
 const [selected,setSelected]=useState<string[]>([]),[message,setMessage]=useState(''),[damage,setDamage]=useState('');
 if(c.classNameEn!=='Rogue')return null;
 const options=cunningOptions(c),active=selected.filter(id=>options.some(o=>o.id===id));
 const remaining=cunningRemaining(c,active),luck=c.resources.find(r=>r.nameEn==='Stroke of Luck');
 return <div className="text-small">
 {kind==='bonus'&&<>
 {c.level>=2&&[['衝刺','本回合獲得等同速度的額外移動。'],['撤離','本回合移動不引發機會攻擊。'],['躲藏','進行敏捷（隱匿）檢定，依現場掩護條件判定。']].map(([name,description])=><Option key={name} name={`靈巧動作 · ${name}`} description={description}/>)}
 {c.level>=3&&<Option name="穩定瞄準" description="僅本回合尚未移動時可用；本回合下一次攻擊具有優勢，之後速度為0直到回合結束。"/>}
 {isThief(c)&&c.level>=3&&<Option name="快手" description="以巧手檢定扒竊、使用盜賊工具開鎖或拆陷阱；或使用物品動作、啟動魔法物品的魔法動作。"/>}
 </>}
 {kind==='reaction'&&c.level>=5&&<details className="border-t border-border"><summary className="min-h-11 cursor-pointer py-3 font-semibold">直覺閃避 · 傷害減半</summary><p className="text-text-secondary">可見攻擊者以攻擊骰命中你時，使用反應將該次攻擊傷害減半（向下取整）。請輸入尚未扣除的傷害。</p><label className="flex min-h-11 items-center gap-2">原始傷害<input aria-label="直覺閃避原始傷害" className="min-h-11 w-24 border border-border bg-surface-2 px-2" type="number" min={0} value={damage} onChange={e=>setDamage(e.target.value)}/></label><button className={button} disabled={damage===''||!Number.isInteger(Number(damage))||Number(damage)<0} onClick={()=>{if(useCharacterStore.getState().character?.id!==c.id)return;const n=Math.floor(Number(damage)/2);characterActions.adjustHp(-n);setMessage(`已使用反應，承受 ${n} 傷害（先扣臨時HP）。`);setDamage('');}}>使用並扣除減半傷害</button></details>}
 {kind==='other'&&<>
 <p className="pb-2 text-gold">偷襲 {sneakDice(c.level)}d6{c.level>=5?` · 狡詐打擊 DC ${cunningDc(c)}`:''}</p><p className="pb-2 text-text-secondary">每回合一次，以靈巧或遠程武器命中且有優勢；或目標5呎內有未失能盟友且你無劣勢。符合條件才追加，傷害類型同武器。</p>
 {c.level>=5&&<details className="border-t border-border"><summary className="min-h-11 cursor-pointer py-3 font-semibold">狡詐打擊 · 本次偷襲效果</summary><p className="text-text-secondary">最多選 {c.level>=11?2:1} 種，先扣偷襲骰，再擲傷害；效果於傷害後發生。</p>{options.map(o=><label key={o.id} className="flex min-h-11 items-start gap-2 py-2"><input className="mt-1 accent-gold" type="checkbox" checked={active.includes(o.id)} disabled={!active.includes(o.id)&&(active.length>=(c.level>=11?2:1)||remaining<o.cost)} onChange={()=>setSelected(active.includes(o.id)?active.filter(id=>id!==o.id):[...active,o.id])}/><span>{o.name} · 減少{o.cost}d6<span className="block text-text-secondary">{o.desc}</span></span></label>)}<p role="status" className="py-2 font-semibold text-gold">本次偷襲：{remaining}d6 · 豁免 DC {cunningDc(c)}</p><button className={button} onClick={()=>setSelected([])}>清除本次效果</button></details>}
 {isThief(c)&&c.level>=17&&<p className="py-2 text-text-secondary">竊賊反射：戰鬥第一輪有兩個回合，先攻 {c.initiative} 與 {c.initiative-10}。</p>}
 {c.level>=20&&<details className="border-t border-border"><summary className="min-h-11 cursor-pointer py-3 font-semibold">幸運一擊 · {luck?.current??0}/1</summary><p className="pb-2 text-text-secondary">D20檢定失敗時，將擲骰結果改為20。短休或長休恢復。</p><button className={button} disabled={!luck?.current} onClick={()=>{try{useCharacterStore.getState().update(current=>current.id===c.id?activateStrokeOfLuck(current):current);setMessage('幸運一擊已使用：本次D20擲骰結果改為20。');}catch(e){setMessage((e as Error).message);}}}>使用幸運一擊</button></details>}
 </>}
 {message&&<p role="status" className="py-2 text-gold">{message}</p>}
 </div>;
}
