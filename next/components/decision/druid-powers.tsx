'use client';
import {useState} from 'react';
import type {Character} from '@/lib/domain/character';
import {circleSpellNames,druidAction,isLandDruid,knownForms,landDice,wildShape} from '@/lib/rules/druid';
import {useCharacterStore} from '@/lib/state/character-store';
const control='min-h-11 rounded-chip border border-border bg-surface-2 px-2 text-small';
export function DruidPowers({c,bonusOnly=false}:{c:Character;bonusOnly?:boolean}){
 const [form,setForm]=useState(''),[slot,setSlot]=useState(1),[uses,setUses]=useState(1),[spell,setSpell]=useState(''),[message,setMessage]=useState('');
 if(c.classNameEn!=='Druid'||c.level<2)return null;
 const act=(id:string,arg?:string|number)=>{try{useCharacterStore.getState().update(current=>{if(current.id!==c.id)throw Error('角色已切換');return druidAction(current,id,arg);});setMessage('已更新能力與資源。');}catch(e){setMessage((e as Error).message);}};
 const button=(title:string,id:string,arg?:string|number,disabled=false)=><button type="button" disabled={disabled} onClick={()=>act(id,arg)} className="min-h-11 rounded-chip border border-border px-3 text-small text-gold disabled:opacity-40">{title}</button>;
 const remaining=wildShape(c)?.current??0;
 return <div className="space-y-2 text-small">
 <p className="text-gold">荒野變身 {remaining}/{wildShape(c)?.max??0} · 短休回1次、長休回滿</p>
 {bonusOnly&&<details className="border-t border-border"><summary className="flex min-h-11 cursor-pointer items-center">荒野變身 · 附贈動作{c.wildShapeForm?` · 目前：${c.wildShapeForm}`:''}</summary>
 <p>持續 {c.level/2} 小時，獲得 {c.level} 臨時 HP（與原有較高者擇一）。此處記錄型態及資源；野獸的 AC、攻擊與移動請依團桌採用的數據判定。</p>
 <select aria-label="變身型態" value={form} onChange={e=>setForm(e.target.value)} className={control}><option value="">選擇已知型態</option>{knownForms(c).map(f=><option key={f.name} value={f.name}>{f.name} · CR {f.cr}{f.fly?' · 飛行':''}</option>)}</select>
 {button('變身 · 消耗1次','shape',form,!form||!remaining)}{c.wildShapeForm&&button('結束變身 · 附贈動作','end-form')}
 </details>}
 {!bonusOnly&&<>
 <label className="flex min-h-11 items-center gap-2">使用的法術位<select aria-label="德魯伊能力法術位" value={slot} onChange={e=>setSlot(Number(e.target.value))} className={control}>{c.spellSlots.map(s=><option key={s.level} value={s.level}>{s.level} 環 · 剩 {s.total-s.used}</option>)}</select></label>
 <details className="border-t border-border"><summary className="flex min-h-11 cursor-pointer items-center">荒野夥伴 · 魔法動作{c.wildCompanionActive?' · 已召喚':''}</summary><p>施放尋獲魔寵，不需材料；妖精魔寵持續至長休。</p>{button('使用1次荒野變身','companion',undefined,!remaining)}{button('使用選定法術位','companion',slot)}</details>
 {c.level>=5&&<details className="border-t border-border"><summary className="flex min-h-11 cursor-pointer items-center">荒野重生 · 不需動作</summary><div className="py-2"><p className="font-semibold">法術位 → 變身次數</p><p>沒有每長休次數限制。每個自己的回合一次，變身剩 0 次時，可消耗一個法術位恢復 1 次。</p></div>{button('選定法術位 → 1次變身','slot-to-shape',slot,remaining!==0)}<div className="border-t border-border py-2"><p className="font-semibold">變身次數 → 1 環法術位</p><p>只有這個方向每長休限用一次，使用後不影響上方的轉換。</p></div>{button(`1次變身 → 1環法術位（剩 ${c.resources.find(r=>r.nameEn==='Wild Resurgence')?.current??0} 次）`,'shape-to-slot',undefined,!remaining||!c.resources.find(r=>r.nameEn==='Wild Resurgence')?.current)}</details>}
 {isLandDruid(c)&&c.level>=3&&<details className="border-t border-border"><summary className="flex min-h-11 cursor-pointer items-center">大地之助 · 魔法動作</summary><p>60呎內10呎半徑，選定生物體質豁免 DC {c.spellDc}，失敗 {landDice(c)}d6 黯蝕傷害、成功減半；區域內一個生物恢復 {landDice(c)}d6 HP。請自行擲骰並更新目標 HP。</p>{button('使用大地之助 · 消耗1次變身','aid',undefined,!remaining)}</details>}
 {isLandDruid(c)&&c.level>=6&&<details className="border-t border-border"><summary className="flex min-h-11 cursor-pointer items-center">自然復甦 · 免費結社施法</summary><p>每長休一次，依原法術的施法時間施放。短休回復法術位是獨立用途，請至休息區操作。</p><select aria-label="免費結社法術" value={spell} onChange={e=>setSpell(e.target.value)} className={control}><option value="">選擇結社法術</option>{c.spells.filter(s=>s.level>0&&circleSpellNames(c).includes(s.nameEn)).map(s=><option key={s.nameEn} value={s.nameEn}>{s.name}</option>)}</select>{button(`免費施放（剩 ${c.resources.find(r=>r.nameEn==='Natural Recovery Casting')?.current??0} 次）`,'circle-cast',spell,!spell)}</details>}
 {isLandDruid(c)&&c.level>=14&&<details className="border-t border-border"><summary className="flex min-h-11 cursor-pointer items-center">自然庇所 · 魔法動作{c.natureSanctuaryActive?' · 啟用中':''}</summary><p>120呎內15呎立方區域，持續1分鐘或失能／死亡；自己與盟友獲半掩護，盟友獲目前地形抗性。附贈動作可移動60呎，無額外消耗。</p>{button('建立庇所 · 消耗1次變身','sanctuary',undefined,!remaining)}{c.natureSanctuaryActive&&button('結束庇所','end-sanctuary')}</details>}
 {c.level>=20&&<details className="border-t border-border"><summary className="flex min-h-11 cursor-pointer items-center">大德魯伊 · 先攻與法術位轉換</summary><p>常青荒野變身：只有擲先攻且剩0次時恢復1次，不是額外每日資源。</p>{button('擲先攻 · 恢復1次變身','evergreen',undefined,remaining!==0)}<p>自然術士：每次變身換2環，合成一個法術位，每長休一次。</p><select aria-label="自然術士消耗次數" className={control} value={uses} onChange={e=>setUses(Number(e.target.value))}>{[1,2,3,4].map(n=><option key={n} value={n}>{n} 次 → {2*n} 環</option>)}</select>{button('轉換法術位','magician',uses,remaining<uses)}</details>}
 </>}
 {message&&<p role="status" className="text-gold">{message}</p>}
 </div>;
}
