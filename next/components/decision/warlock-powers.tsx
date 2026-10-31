'use client';
import {useState} from 'react';
import type {Character} from '@/lib/domain/character';
import {useCharacterStore} from '@/lib/state/character-store';
import {warlockAction,hasInvocation,fiend,fiendResistance,pactSlot,pactAttacks,PACT_WEAPONS,conjurePact} from '@/lib/rules/warlock';
const btn='min-h-11 rounded-chip border border-border px-3 text-gold disabled:opacity-40';
export function WarlockPowers({c,kind}:{c:Character;kind:'other'|'bonus'|'rest'}){
 const [weapon,setWeapon]=useState(c.pactWeapon?.nameEn??'Longsword'),[damage,setDamage]=useState('normal'),[message,setMessage]=useState('');
 if(c.classNameEn!=='Warlock')return null;
 const update=(fn:(c:Character)=>Character,text:string)=>{try{useCharacterStore.getState().update(v=>{if(v.id!==c.id)throw Error('角色已切換');return fn(v);});setMessage(text);}catch(e){setMessage((e as Error).message);}};
 const use=(id:Parameters<typeof warlockAction>[1],text:string)=>update(c=>warlockAction(c,id),text);
 const count=(en:string)=>c.resources.find(r=>r.nameEn===en)?.current??0,slot=pactSlot(c),resist=fiendResistance(c);
 return <div className="text-small">
 {(kind==='rest'||kind==='other')&&<>
 <p className="py-2 text-gold">契約法術位：{slot?`${slot.level}環 · ${slot.total-slot.used}/${slot.total}`:'尚無法術位'}，短休或長休全部回復。祕法奧秘須長休。</p>
 {c.level>=2&&<details className="border-t border-border"><summary className="min-h-11 cursor-pointer py-3 font-semibold">{c.level>=20?'魔法機巧／邪術宗師':'魔法機巧'} · 剩{count('Magical Cunning')}/1次</summary><p>花1分鐘完成儀式，回復{c.level>=20?'全部':`至多${Math.ceil((slot?.total??0)/2)}個`}已消耗的契約法術位；長休恢復使用次數，不需先短休。</p><button className={btn} disabled={!slot?.used||!count('Magical Cunning')} onClick={()=>use('cunning','儀式完成，已回復契約法術位。')}>完成1分鐘儀式並回復</button></details>}
 </>}
 {kind==='bonus'&&hasInvocation(c,'Pact of the Blade')&&<details className="border-t border-border"><summary className="min-h-11 cursor-pointer py-3 font-semibold">刃契 · {c.pactWeapon?.name??'召喚契約武器'}</summary><p>附贈動作召喚簡易或軍用近戰武器，以魅力攻擊並具有熟練；可作施法法器。每次攻擊可選原本、黯蝕、心靈或光耀傷害。契約武器每個攻擊動作可攻擊{pactAttacks(c)}次。</p><label className="flex min-h-11 items-center gap-2">武器<select aria-label="契約武器" className="min-h-11 bg-surface-2" value={weapon} onChange={e=>setWeapon(e.target.value)}>{PACT_WEAPONS.map(w=><option key={w[0]} value={w[0]}>{w[1]} · {w[2]}</option>)}</select></label><label className="flex min-h-11 items-center gap-2">傷害類型<select aria-label="契約傷害類型" className="min-h-11 bg-surface-2" value={damage} onChange={e=>setDamage(e.target.value)}>{[['normal','原本'],['necrotic','黯蝕'],['psychic','心靈'],['radiant','光耀']].map(([id,name])=><option key={id} value={id}>{name}</option>)}</select></label><button className={btn} onClick={()=>update(c=>conjurePact(c,weapon,damage),'契約武器已出現在攻擊列。')}>附贈動作 · 召喚／替換武器</button>{c.pactWeapon&&<><button className={btn} onClick={()=>update(c=>conjurePact(c,c.pactWeapon!.nameEn,damage),'已更新本次攻擊的傷害類型，不耗動作。')}>套用傷害類型 · 不耗動作</button><button className={btn} onClick={()=>update(c=>({...c,pactWeapon:undefined}),'已解除契約，召喚武器消失。')}>解除契約</button></>}<p className="py-2 text-text-secondary">召喚武器不加入可販售裝備。離身超過5呎滿1分鐘或死亡時請解除契約；仍須遵守武器的雙手、重型等屬性。</p></details>}
 {kind==='other'&&<>
 {c.level>=9&&<details className="border-t border-border"><summary className="min-h-11 cursor-pointer py-3 font-semibold">聯絡宗主 · 剩{count('Contact Patron')}/1次</summary><p>花1分鐘免費施放異界探知聯絡宗主，自動通過法術的豁免，不耗契約法術位；長休恢復。</p><button className={btn} disabled={!count('Contact Patron')} onClick={()=>use('contact','已使用聯絡宗主；不消耗法術位，自動通過豁免。')}>完成施法並消耗1次</button></details>}
 {fiend(c)&&c.level>=3&&<details className="border-t border-border"><summary className="min-h-11 cursor-pointer py-3 font-semibold">黑暗祝福 · {Math.max(1,c.level+c.abilityScores.cha.modifier)}臨時HP</summary><p>你使敵人降至0HP，或別人使你10呎內敵人降至0HP時觸發，不耗動作；與既有臨時HP取較高值。</p><button className={btn} onClick={()=>use('blessing','已套用黑暗祝福，臨時HP不疊加。')}>符合觸發 · 取得臨時HP</button></details>}
 {fiend(c)&&c.level>=6&&<details className="border-t border-border"><summary className="min-h-11 cursor-pointer py-3 font-semibold">黑暗者幸運 · 剩{count("Dark One's Own Luck")}次</summary><p>能力檢定或豁免擲骰後、結果生效前加1d10，不耗動作；每次擲骰限一次。每長休魅力修正次（至少1）。請自行擲1d10並加到結果。</p><button className={btn} disabled={!count("Dark One's Own Luck")} onClick={()=>use('luck','已消耗1次黑暗者幸運；此次檢定或豁免加1d10。')}>使用 · 加1d10</button></details>}
 {fiend(c)&&c.level>=10&&<div className="border-t border-border py-3"><strong>魔鬼韌性 · {resist?`${resist.name}抗性`:'尚未選擇抗性'}</strong><p>短休或長休後可於「調整休息後可替換的選項」更換；不可選力場。</p></div>}
 {fiend(c)&&c.level>=14&&<details className="border-t border-border"><summary className="min-h-11 cursor-pointer py-3 font-semibold">拋入地獄 · 剩{count('Hurl Through Hell')}/1次</summary><p>每回合一次，攻擊命中時，目標作魅力豁免DC {c.spellDc}。失敗則消失並失能至你下回合結束；非邪魔受8d10心靈傷害。無論豁免結果皆消耗次數。</p><button className={btn} disabled={!count('Hurl Through Hell')} onClick={()=>use('hurl','已消耗拋入地獄；請讓目標進行魅力豁免。')}>命中後使用 · 消耗1次</button><button className={btn} disabled={!!count('Hurl Through Hell')||!slot||slot.used>=slot.total} onClick={()=>use('restore-hurl','已消耗1個契約法術位恢復拋入地獄次數。')}>契約法術位恢復1次 · 不耗動作</button></details>}
 {hasInvocation(c,'Fiendish Vigor')&&<details className="border-t border-border"><summary className="min-h-11 cursor-pointer py-3 font-semibold">邪魔活力 · 隨意施放</summary><p>魔法動作，對自己施放一環虛假生命，取得最大值12臨時HP，不耗法術位、不疊加。</p><button className={btn} onClick={()=>use('vigor','已施放虛假生命，臨時HP取較高值。')}>免費施放 · 12臨時HP</button></details>}
 {hasInvocation(c,'One with Shadows')&&<details className="border-t border-border"><summary className="min-h-11 cursor-pointer py-3 font-semibold">與影合一 · 隨意施放</summary><p>在微光或黑暗中，以魔法動作對自己施放二環隱形術，不耗法術位，專注至多1小時；攻擊、造成傷害或施法時結束。會取代原本的專注。</p><button className={btn} onClick={()=>update(c=>({...c,concentrationSpell:'隱形術'}),'已開始專注隱形術；請同步記錄隱形狀態，效果結束時解除專注。')}>處於微光／黑暗 · 免費施放</button></details>}
 </>}
 {message&&<p role="status" className="py-2 text-gold">{message}</p>}
 </div>;
}
