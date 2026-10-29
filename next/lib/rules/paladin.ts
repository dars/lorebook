import type { Character, ClassResource } from '@/lib/domain/character';
import { deriveClassResources } from './class-resources';

export const PALADIN_NAMES: Record<string, string> = {
  'Aura Expansion': '靈光擴展', 'Abjure Foes': '斥退敵人', 'Radiant Strikes': '光輝打擊',
};
export const isDevotion = (c: Character) => !c.customSubclass && c.subclassEn === 'Oath of Devotion';
export function backfillPaladin(c: Character): Character {
  if (c.classNameEn !== 'Paladin') return c;
  const resources = c.resources.map(r=>{const match=deriveClassResources('Paladin',c.level,c.abilityScores).find(x=>x.name===r.name);return match&&!r.nameEn?{...r,nameEn:match.nameEn}:r;});
  for (const r of deriveClassResources('Paladin', c.level, c.abilityScores))
    if (!resources.some(x => x.nameEn === r.nameEn || x.name === r.name)) resources.push(r);
  if (isDevotion(c) && c.level >= 20 && !resources.some(r => r.nameEn === 'Holy Nimbus'))
    resources.push({name:'神聖光環',nameEn:'Holy Nimbus',current:1,max:1,recovery:'long',display:'pips',dieFaces:0,unit:''});
  return {...c,resources,features:c.features.map(f => !f.isCustom && PALADIN_NAMES[f.nameEn] ? {...f,name:PALADIN_NAMES[f.nameEn]} : f)};
}
export type PaladinPower = {id:string; name:string; kind:'action'|'bonus'|'free'|'passive'; description:string; resource?:string};
export function paladinPowers(c: Character): PaladinPower[] {
  if (c.classNameEn !== 'Paladin') return [];
  const lv=c.level, radius=lv>=18?30:10, cha=Math.max(1,c.abilityScores.cha.modifier);
  const out:PaladinPower[]=[{id:'lay',name:lv>=14?'聖療／復原之觸':'聖療',kind:'bonus',resource:'Lay on Hands',description:'觸碰自己或其他生物，消耗聖療點數治療；解除中毒花費 5 點。解除狀態所花的點數不會同時治療。'}];
  if(lv>=3)out.push({id:'sense',name:'神聖感知',kind:'bonus',resource:'Channel Divinity',description:'消耗 1 次引導神力，10 分鐘內感知 60 呎內天界、邪魔、不死生物及被祝聖或褻瀆的地點與物品；失能時結束。'});
  if(lv>=3&&isDevotion(c))out.push({id:'weapon',name:'神聖武器',kind:'free',resource:'Channel Divinity',description:`採取攻擊動作時使用，消耗 1 次引導神力。持握的一把近戰武器命中 +${cha}，可改為光輝傷害，持續 10 分鐘；離手或再次使用時結束。`});
  if(lv>=9)out.push({id:'abjure',name:'斥退敵人',kind:'action',resource:'Channel Divinity',description:`魔法動作；消耗 1 次引導神力。選 60 呎內至多 ${cha} 個可見目標，感知豁免 DC ${c.spellDc}，失敗則恐懼 1 分鐘或至受到傷害；期間每回合只能選移動、動作或附贈動作其中一項。`});
  if(lv>=6)out.push({id:'aura',name:lv>=18?'守護靈光／靈光擴展':'守護靈光',kind:'passive',description:`${radius} 呎靈光，自己與盟友豁免 +${cha}；失能時失效。同類靈光不疊加。${lv>=10?'勇氣靈光：免疫恐懼。':''}${lv>=7&&isDevotion(c)?'奉獻靈光：免疫魅惑。':''}`});
  if(lv>=11)out.push({id:'radiant',name:'光輝打擊',kind:'passive',description:'近戰武器或徒手攻擊的攻擊擲骰命中時，額外造成 1d8 光輝傷害；不消耗資源。'});
  if(lv>=15&&isDevotion(c))out.push({id:'protection',name:'守護斬擊',kind:'passive',description:'施放至聖斬後，自己與靈光內盟友獲得半掩護，持續至自己下回合開始。'});
  if(lv>=20&&isDevotion(c))out.push({id:'nimbus',name:'神聖光環',kind:'bonus',resource:'Holy Nimbus',description:'附贈動作啟動 10 分鐘：靈光充滿日光；敵人在其中開始回合時受到魅力修正＋熟練加值的光輝傷害；對邪魔、不死生物造成的豁免具優勢。長休恢復，也可消耗 5 環法術位恢復使用次數。'});
  return out;
}
export const restoringConditions = (level:number) => ['中毒',...(level>=14?['目盲','魅惑','耳聾','恐懼','麻痺','震懾']:[])];
export function spendPaladinPower(c:Character,id:string, healing=0, conditions:string[]=[], self=false):Character {
  const power=paladinPowers(c).find(p=>p.id===id);
  if(!power?.resource)throw Error('目前不能使用此能力。');
  const r=c.resources.find(r=>r.nameEn===power.resource);
  let cost=1;
  if(id==='lay'){
    if(!Number.isInteger(healing)||healing<0||new Set(conditions).size!==conditions.length||conditions.some(x=>!restoringConditions(c.level).includes(x)))throw Error('請輸入有效的治療點數與狀態。');
    cost=healing+5*conditions.length;
  }
  if(!r||cost<1||r.current<cost)throw Error('剩餘資源不足。');
  return {...c,resources:c.resources.map(x=>x===r?{...x,current:x.current-cost}:x),currentHp:self&&id==='lay'?Math.min(c.maxHp,c.currentHp+healing):c.currentHp,conditions:self&&id==='lay'?c.conditions.filter(x=>!conditions.includes(x)):c.conditions};
}
export function restoreNimbus(c:Character):Character {
  const r=c.resources.find(r=>r.nameEn==='Holy Nimbus'), slot=c.spellSlots.find(s=>s.level===5&&s.used<s.total);
  if(!isDevotion(c)||c.classNameEn!=='Paladin'||c.level<20||!r||r.current>=r.max||!slot)throw Error('需要已消耗的神聖光環次數及可用的 5 環法術位。');
  return {...c,resources:c.resources.map(x=>x===r?{...x,current:1}:x),spellSlots:c.spellSlots.map(s=>s===slot?{...s,used:s.used+1}:s)};
}
export function shortRestResource(c:Character,r:ClassResource):ClassResource {
  if(c.classNameEn==='Barbarian'&&(r.nameEn==='Rage'||r.name==='狂暴'))return {...r,current:Math.min(r.max,r.current+1)};
  if(r.recovery!=='short')return r;
  const one = (c.classNameEn==='Paladin'&&r.nameEn==='Channel Divinity') || (c.classNameEn==='Fighter'&&r.nameEn==='Second Wind');
  return {...r,current:one?Math.min(r.max,r.current+1):r.max};
}
