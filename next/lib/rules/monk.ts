import type {Character,Equipment,CharacterFeature} from '../domain/character';
import {wearingArmor,wieldingShield} from './ac';
import {abilityModifier} from './ability';
export const martialDie=(level:number)=>level>=17?12:level>=11?10:level>=5?8:6;
export const monkMoveBonus=(level:number)=>level<2?0:level>=18?30:level>=14?25:level>=10?20:level>=6?15:10;
export const unarmoredMonk=(c:Character)=>c.classNameEn==='Monk'&&!wearingArmor(c)&&!wieldingShield(c);
export const monkWeapon=(e:Equipment)=>['Club','Dagger','Greatclub','Handaxe','Javelin','Light Hammer','Mace','Quarterstaff','Sickle','Spear','Scimitar','Shortsword'].includes(e.nameEn);
export const martialArtsActive=(c:Character)=>unarmoredMonk(c)&&c.equipment.filter(e=>e.equipped&&e.itemType==='weapon').every(monkWeapon);
export const focusDc=(c:Character)=>8+c.proficiencyBonus+c.abilityScores.wis.modifier;
export const focusResource=(c:Character)=>c.resources.find(r=>['Focus Points','Ki Points'].includes(r.nameEn)||r.name==='專注點');
export const openHand=(c:Character)=>c.classNameEn==='Monk'&&!c.customSubclass&&['Warrior of the Open Hand','Way of the Open Hand','Open Hand'].includes(c.subclassEn);
const definitions:[number,string,string,string][]=[
 [1,'Martial Arts','武藝','未著甲、未持盾，且空手或僅持武僧武器時：徒手與武僧武器可改用敏捷及武藝骰，並可用附贈動作徒手攻擊一次。'],
 [1,'Unarmored Defense','無甲防禦','未著甲且未持盾時，AC為10＋敏捷修正＋感知修正。'],
 [2,'Uncanny Metabolism','超凡代謝','擲先攻時可恢復全部專注，並恢復武僧等級＋一顆武藝骰的HP；每長休一次。'],
 [2,'Unarmored Movement','無甲移動','未著甲且未持盾時，依武僧等級增加速度。'],
 [5,'Stunning Strike','震懾拳','每回合一次，徒手或武僧武器命中時花1專注；體質豁免失敗震懾至你下回合開始，成功則速度減半且下一次對其攻擊有優勢。'],
 [7,'Evasion','迴避閃避','敏捷豁免成功可減半傷害的效果，成功改為無傷、失敗半傷；失能時不適用。'],
 [10,'Heightened Focus','強化專注','疾風連擊增至3次徒手攻擊；花專注堅忍防禦獲2顆武藝骰臨時HP；花專注疾步如風可帶5呎內自願大型以下生物同行且不引發機會攻擊。'],
 [10,'Self-Restoration','自我復原','每個自己的回合結束可移除自己的魅惑、恐懼或中毒其中一個狀態；不進食飲水不造成力竭。'],
 [14,'Disciplined Survivor','嚴律生還者','所有豁免均獲熟練。豁免失敗時可花1專注重擲，必須採用新結果。'],
 [15,'Perfect Focus','完滿專注','擲先攻且不使用超凡代謝時，若專注少於4點，恢復至4點。不消耗專注。'],
 [18,'Superior Defense','卓絕防禦','回合開始花3專注，1分鐘內抗所有傷害但不含力場，失能時結束。'],
 [20,'Body and Mind','身心合一','敏捷與感知各增加4，上限25。'],
];
const hand:[number,string,string,string][]=[
 [3,'Open Hand Technique','散打技巧','疾風連擊命中時可選：使對方至其下回合開始不能機會攻擊；力量豁免失敗推15呎；或敏捷豁免失敗倒地。'],
 [6,'Wholeness of Body','全身之愈','附贈動作恢復一顆武藝骰＋感知修正HP，至少1。每長休可用感知修正次，至少1次。'],
 [11,'Fleet Step','迅捷步伐','使用疾步如風以外的附贈動作後，可立即再使用疾步如風。'],
 [17,'Quivering Palm','顫掌','徒手命中時花4專注，在一個目標設下震動，持續武僧等級天。動作或攻擊動作中放棄一次攻擊引爆，同位面目標體質豁免，失敗10d12力場、成功半傷。可不耗動作無害解除。'],
];
export function backfillMonk(c:Character):Character{
 if(c.classNameEn!=='Monk')return c;
 let result=c;
 if(c.level>=20&&!c.bodyAndMindApplied){const scores={...c.abilityScores};for(const k of ['dex','wis'] as const){const score=Math.max(scores[k].score,Math.min(25,scores[k].score+4));scores[k]={...scores[k],score,modifier:abilityModifier(score)};}
 const dd=scores.dex.modifier-c.abilityScores.dex.modifier,dw=scores.wis.modifier-c.abilityScores.wis.modifier;
 result={...c,bodyAndMindApplied:true,abilityScores:scores,initiative:c.initiative+dd,passivePerception:c.passivePerception+dw,skills:c.skills.map(s=>({...s,modifier:s.modifier+(s.abilityType==='DEX'?dd:s.abilityType==='WIS'?dw:0)}))};}
 if(c.level>=14)result={...result,abilityScores:Object.fromEntries(Object.entries(result.abilityScores).map(([k,v])=>[k,{...v,proficientSave:true}])) as Character['abilityScores']};
 const features=result.features.filter(f=>f.isCustom||!openHand(c)||!/Subclass Feature|子職業特性/i.test(f.nameEn+' '+f.name));
 for(const [level,en,name,description] of [...definitions,...(openHand(c)?hand:[])].filter(([l])=>l<=c.level)){
 const f:CharacterFeature={name,nameEn:en,description,source:`${hand.some(h=>h[1]===en)?'子職：散打宗':'職業：武僧'} Lv${level}`,isCustom:false};const i=features.findIndex(x=>!x.isCustom&&x.nameEn===en);if(i>=0)features[i]={...features[i],...f};else features.push(f);
 }
 const resources=[...result.resources];
 const add=(name:string,en:string,max:number,recovery:'short'|'long')=>{const i=resources.findIndex(r=>r.nameEn===en||(en==='Focus Points'&&r===focusResource(result)));if(i<0)resources.push({name,nameEn:en,max,current:max,recovery,display:'pips',dieFaces:0,unit:'次'});else resources[i]={...resources[i],name,nameEn:en,max,current:Math.min(max,Math.max(0,resources[i].current+max-resources[i].max)),recovery};};
 if(c.level>=2){add('專注點','Focus Points',c.level,'short');add('超凡代謝','Uncanny Metabolism',1,'long');}
 if(openHand(c)&&c.level>=6)add('全身之愈','Wholeness of Body',Math.max(1,result.abilityScores.wis.modifier),'long');
 return {...result,features,resources};
}
export type MonkPower={id:string;name:string;kind:'bonus'|'other'|'reaction';level:number;cost:number;description:string};
export function monkPowers(c:Character):MonkPower[]{
 if(c.classNameEn!=='Monk')return [];
 const d=martialDie(c.level),dc=focusDc(c);
 const p:MonkPower[]=[
 {id:'unarmed',name:'武藝 · 徒手攻擊',kind:'bonus',level:1,cost:0,description:'附贈動作進行一次徒手攻擊；須符合武藝的裝備條件。'},
 {id:'flurry',name:'疾風連擊',kind:'bonus',level:2,cost:1,description:`附贈動作，進行${c.level>=10?3:2}次徒手攻擊。${openHand(c)?`每次命中可選散打技巧：禁止機會攻擊、力量豁免推15呎、敏捷豁免倒地（DC ${dc}）。`:''}`},
 {id:'disengage',name:'堅忍防禦 · 免費',kind:'bonus',level:2,cost:0,description:'附贈動作撤離。'},
 {id:'patient',name:'堅忍防禦 · 強化',kind:'bonus',level:2,cost:1,description:`附贈動作撤離並閃避。${c.level>=10?`另外獲得2d${d}臨時HP，請輸入兩骰合計。`:''}`},
 {id:'dash',name:'疾步如風 · 免費',kind:'bonus',level:2,cost:0,description:'附贈動作衝刺。'},
 {id:'wind',name:'疾步如風 · 強化',kind:'bonus',level:2,cost:1,description:`附贈動作撤離並衝刺，本回合跳躍距離加倍。${c.level>=10?'可帶5呎內自願的大型以下生物同行，同行移動不引發機會攻擊。':''}`},
 {id:'metabolism',name:'超凡代謝',kind:'other',level:2,cost:0,description:`擲先攻時使用，每長休一次。專注回滿，恢復${c.level}＋1d${d} HP，請輸入骰子結果。`},
 {id:'deflect',name:c.level>=13?'撥擋能量 · 反擊':'撥擋攻擊 · 反擊',kind:'reaction',level:3,cost:1,description:`先用反應減少1d10＋敏捷修正＋等級傷害；減至0後可花1專注反擊，敏捷豁免 DC ${dc}，失敗受2d${d}＋敏捷修正傷害。${c.level<13?'原攻擊須含鈍擊、穿刺或揮砍。':'可抵擋任意傷害類型。'}`},
 {id:'stun',name:'震懾拳',kind:'other',level:5,cost:1,description:`每回合一次，徒手或武僧武器命中後使用。體質豁免 DC ${dc}，失敗震懾至你下回合開始；成功則速度減半，下一次對其攻擊有優勢。`},
 {id:'reroll',name:'嚴律生還者 · 重擲',kind:'other',level:14,cost:1,description:'豁免失敗時使用，重擲後必須採用新結果。'},
 {id:'perfect',name:'完滿專注',kind:'other',level:15,cost:0,description:'擲先攻且不使用超凡代謝，若專注少於4點則回復至4點。'},
 {id:'superior',name:'卓絕防禦',kind:'other',level:18,cost:3,description:'回合開始啟用；1分鐘內抗所有傷害但不含力場，失能時結束。'},
 ];
 if(openHand(c))p.push({id:'whole',name:'全身之愈',kind:'bonus',level:6,cost:0,description:`恢復1d${d}＋${c.abilityScores.wis.modifier} HP（至少1），請輸入骰子結果。每長休感知修正次，至少1次。`},{id:'palm',name:'顫掌 · 設下震動',kind:'other',level:17,cost:4,description:`徒手命中後記錄一個目標，持續${c.level}天；只能同時保留一個目標。`});
 return p.filter(p=>p.level<=c.level);
}
export function activateMonkPower(c:Character,id:string,roll?:number,target?:string):Character{
 const p=monkPowers(c).find(p=>p.id===id);if(!p)throw Error('尚未取得此能力。');
 if(id==='unarmed'&&!martialArtsActive(c))throw Error('武藝需要空手或僅持武僧武器，未著甲且未持盾。');
 let result=c;
 const spend=(en:string,n=1)=>{const r=result.resources.find(r=>r.nameEn===en);if(!r||r.current<n)throw Error('剩餘次數或專注不足。');result={...result,resources:result.resources.map(x=>x===r?{...x,current:x.current-n}:x)};};
 const dice=(count=1)=>{if(!Number.isInteger(roll)||roll!<count||roll!>count*martialDie(c.level))throw Error('請填入有效的武藝骰結果。');return roll!;};
 if(p.cost)spend('Focus Points',p.cost);
 if(id==='patient'&&c.level>=10)result={...result,tempHp:Math.max(c.tempHp,dice(2))};
 if(id==='metabolism'){const heal=dice()+c.level;spend('Uncanny Metabolism');result={...result,currentHp:Math.min(c.maxHp,c.currentHp+heal),resources:result.resources.map(r=>r.nameEn==='Focus Points'?{...r,current:r.max}:r)};}
 if(id==='whole'){const heal=Math.max(1,dice()+c.abilityScores.wis.modifier);spend('Wholeness of Body');result={...result,currentHp:Math.min(c.maxHp,c.currentHp+heal)};}
 if(id==='perfect'){const r=focusResource(c);if(!r||r.current>=4)throw Error('擲先攻時專注須少於4點，且此次不使用超凡代謝。');result={...result,resources:result.resources.map(x=>x===r?{...x,current:4}:x)};}
 if(id==='superior')result={...result,monkSuperiorDefense:true};
 if(id==='palm'){if(!target?.trim())throw Error('請填寫命中的目標。');result={...result,quiveringPalmTarget:target.trim()};}
 return result;
}
