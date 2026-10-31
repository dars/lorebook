'use client';
import {useState} from 'react';
import type {Character} from '@/lib/domain/character';
import {rangerAction,markDie} from '@/lib/rules/ranger';
import {useCharacterStore} from '@/lib/state/character-store';
export function RangerPowers({c,kind}:{c:Character;kind:'other'|'bonus'|'mark'}){
 const [roll,setRoll]=useState(''),[message,setMessage]=useState('');
 if(c.classNameEn!=='Ranger')return null;
 const update=(fn:(c:Character)=>Character)=>useCharacterStore.getState().update(current=>current.id===c.id?fn(current):current);
 const activate=(id:'mark'|'tireless'|'veil')=>{try{update(c=>rangerAction(c,id,Number(roll)));setMessage(id==='mark'?'已免費施放獵人印記並開始專注；請指定一個90呎內可見目標。':id==='veil'?'已消耗1次自然面紗。效果至你的下回合結束，請屆時解除。':'已取得臨時HP；與既有臨時HP取較高值。');}catch(e){setMessage((e as Error).message);}};
 const count=(en:string)=>c.resources.find(r=>r.nameEn===en)?.current??0;
 const button='min-h-11 rounded-chip border border-border px-3 text-gold disabled:opacity-40';
 return <div className="text-small">
 {kind==='mark'&&<><p className="py-2 text-text-secondary">宿敵：免費施放剩 {count('Favored Enemy')} 次，長休回滿。命中標記目標額外 {markDie(c)} 力場傷害。{c.level>=13?'受到傷害不會中斷此法術專注。':''}{c.level>=17?'對標記目標攻擊具有優勢。':''}</p><button className={button} disabled={!count('Favored Enemy')} onClick={()=>activate('mark')}>宿敵 · 免費施放獵人印記</button><p className="py-1 text-text-secondary">附贈動作；會取代目前的專注。若使用法術位施放，請扣除法術位並設定專注。</p></>}
 {kind==='other'&&c.level>=10&&<details className="border-t border-border"><summary className="min-h-11 cursor-pointer py-3 font-semibold">不知疲倦 · 剩 {count('Tireless')} 次</summary><p>魔法動作，取得1d8＋感知修正（{c.abilityScores.wis.modifier}）臨時HP，至少1。長休恢復次數。</p><label className="flex min-h-11 items-center gap-2">1d8擲骰結果<input aria-label="不知疲倦擲骰結果" type="number" min={1} max={8} value={roll} onChange={e=>setRoll(e.target.value)} className="min-h-11 w-20 border border-border bg-surface-2 px-2"/></label><button className={button} disabled={!count('Tireless')||!Number.isInteger(Number(roll))||Number(roll)<1||Number(roll)>8} onClick={()=>activate('tireless')}>使用並取得臨時HP</button></details>}
 {kind==='bonus'&&c.level>=14&&<details className="border-t border-border"><summary className="min-h-11 cursor-pointer py-3 font-semibold">自然面紗 · 剩 {count('Nature’s Veil')} 次</summary><p className="pb-2">附贈動作獲得隱形，直到你的下回合結束；長休恢復次數。</p><button className={button} disabled={!count('Nature’s Veil')} onClick={()=>activate('veil')}>啟用自然面紗</button></details>}
 {kind==='bonus'&&c.rangerVeilActive&&<p className="py-2 text-gold">自然面紗：隱形中<button className="min-h-11 px-3 underline" onClick={()=>{update(c=>({...c,rangerVeilActive:false}));setMessage('自然面紗已結束。');}}>下回合結束 · 解除</button></p>}
 {kind==='other'&&c.level>=18&&<p className="py-2 text-gold">野性感官 · 盲視30呎</p>}
 {message&&<p role="status" className="py-2 text-gold">{message}</p>}
 </div>;
}
