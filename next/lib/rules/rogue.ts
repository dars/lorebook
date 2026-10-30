import type {Character} from '../domain/character';
export const sneakDice=(level:number)=>Math.ceil(level/2);
export const cunningDc=(c:Character)=>8+c.abilityScores.dex.modifier+c.proficiencyBonus;
export const isThief=(c:Character)=>c.classNameEn==='Rogue'&&!c.customSubclass&&c.subclassEn==='Thief';
const features:[number,string,string,string][]=[
 [1,'Expertise','專精','1級選兩項已熟練技能取得專精；6級再選兩項不同技能。專精使用雙倍熟練加值。'],
 [1,'Sneak Attack','偷襲','每回合一次，以靈巧或遠程武器命中且攻擊有優勢時追加偷襲骰。若目標5呎內有未失能盟友且攻擊無劣勢，也能偷襲。'],
 [1,'Thieves’ Cant','盜賊黑話','學會盜賊黑話及另一種自選語言。'],
 [2,'Cunning Action','靈巧動作','可用附贈動作衝刺、撤離或躲藏。'],
 [3,'Steady Aim','穩定瞄準','本回合尚未移動時，可用附贈動作使本回合下一次攻擊具優勢，之後速度為0直到回合結束。'],
 [5,'Cunning Strike','狡詐打擊','造成偷襲傷害時，放棄指定數量的偷襲骰換取效果；DC＝8＋敏捷修正＋熟練加值。'],
 [5,'Uncanny Dodge','直覺閃避','可見攻擊者以攻擊骰命中你時，用反應將該次攻擊傷害減半，向下取整。'],
 [7,'Evasion','迴避閃避','敏捷豁免可減半傷害的效果，成功無傷、失敗半傷；失能時不適用。'],
 [7,'Reliable Talent','可靠才能','使用熟練技能或工具的能力檢定，d20擲出9以下視為10。'],
 [11,'Improved Cunning Strike','精進狡詐打擊','每次偷襲可選最多兩種效果，分別支付偷襲骰。'],
 [14,'Devious Strikes','陰險打擊','新增暈眩、擊昏與遮蔽三種狡詐打擊效果。'],
 [15,'Slippery Mind','心靈滑溜','取得感知與魅力豁免熟練。'],
 [18,'Elusive','難以捉摸','未失能時，針對你的攻擊骰不能具有優勢。'],
 [20,'Stroke of Luck','幸運一擊','D20檢定失敗時，可將擲骰結果改為20；短休或長休恢復一次使用。'],
];
const thief:[number,string,string,string][]=[
 [3,'Fast Hands','快手','附贈動作可用巧手檢定扒竊、以盜賊工具開鎖或拆陷阱，或使用物品動作、啟動魔法物品的魔法動作。'],
 [3,'Second-Story Work','飛簷走壁','攀爬速度等於速度；可用敏捷決定跳躍距離。'],
 [9,'Supreme Sneak','至高潛行','新增潛行攻擊：放棄1d6偷襲骰，若因躲藏而隱形且回合結束在四分之三或全掩護後，此次攻擊不終止隱形。'],
 [13,'Use Magic Device','使用魔法裝置','可同調四件魔法物品。使用需充能物品時擲1d6，6不消耗充能。可用智力施放任何法術卷軸；二環以上先通過DC10＋環數的奧秘檢定，失敗卷軸消散。'],
 [17,'Thief’s Reflexes','竊賊反射','戰鬥第一輪可進行兩個回合，先攻分別為原值與原值減10。'],
];
export function backfillRogue(c:Character):Character{
 if(c.classNameEn!=='Rogue')return c;
 const list=c.features.filter(f=>f.isCustom||!isThief(c)||!(f.nameEn==='Thief'||/Subclass Feature|子職業特性/i.test(f.nameEn+' '+f.name)));
 for(const [lv,en,name,description] of [...features,...(isThief(c)?thief:[])].filter(([lv])=>lv<=c.level)){
  const matches=(s:string)=>s.replaceAll("'",'’')===en;
  const old=list.find(f=>!f.isCustom&&matches(f.nameEn));
  for(let i=list.length-1;i>=0;i--)if(!list[i].isCustom&&matches(list[i].nameEn))list.splice(i,1);
  list.push({...old,name,nameEn:en,description,source:`${thief.some(f=>f[1]===en)?'子職：竊賊':'職業：盜賊'} Lv${lv}`,isCustom:false});
 }
 const resources=[...c.resources];
 if(c.level>=20){const i=resources.findIndex(r=>r.nameEn==='Stroke of Luck');const r={name:'幸運一擊',nameEn:'Stroke of Luck',max:1,current:i<0?1:Math.min(1,resources[i].current),recovery:'short' as const,display:'pips' as const,dieFaces:0,unit:'次'};if(i<0)resources.push(r);else resources[i]={...resources[i],...r};}
 return {...c,features:list,resources,abilityScores:c.level<15?c.abilityScores:{...c.abilityScores,wis:{...c.abilityScores.wis,proficientSave:true},cha:{...c.abilityScores.cha,proficientSave:true}}};
}
export function activateStrokeOfLuck(c:Character):Character{
 const r=c.resources.find(r=>r.nameEn==='Stroke of Luck');
 if(c.classNameEn!=='Rogue'||c.level<20||!r||r.current<1)throw Error('幸運一擊尚不可用；短休或長休後恢復。');
 return {...c,resources:c.resources.map(x=>x===r?{...x,current:x.current-1}:x)};
}
export function cunningOptions(c:Character){
 if(c.classNameEn!=='Rogue'||c.level<5)return [];
 return [
  {id:'poison',name:'下毒',cost:1,level:5,desc:'須隨身持有製毒工具。體質豁免失敗則中毒1分鐘；每回合結束重試，成功結束。'},
  {id:'trip',name:'絆倒',cost:1,level:5,desc:'大型或更小目標，敏捷豁免失敗則倒地。'},
  {id:'withdraw',name:'抽身',cost:1,level:5,desc:'傷害後立即移動至多半速，不引發機會攻擊。'},
  {id:'daze',name:'暈眩',cost:2,level:14,desc:'體質豁免失敗，下一回合只能選移動、動作或附贈動作之一。'},
  {id:'knockout',name:'擊昏',cost:6,level:14,desc:'體質豁免失敗則昏迷1分鐘或直到受傷；每回合結束重試，成功結束。'},
  {id:'obscure',name:'遮蔽',cost:3,level:14,desc:'敏捷豁免失敗則目盲，至其下回合結束。'},
  ...(isThief(c)?[{id:'stealth',name:'潛行攻擊',cost:1,level:9,desc:'須因躲藏而隱形，且回合結束於四分之三或全掩護後；此次攻擊不結束該隱形。'}]:[]),
 ].filter(o=>o.level<=c.level);
}
export function cunningRemaining(c:Character,ids:string[]):number{
 const options=cunningOptions(c),unique=new Set(ids);
 if(unique.size!==ids.length||ids.length>(c.level>=11?2:1)||ids.some(id=>!options.some(o=>o.id===id)))throw Error('狡詐打擊選項不符合等級或數量限制。');
 const dice=sneakDice(c.level)-ids.reduce((sum,id)=>sum+options.find(o=>o.id===id)!.cost,0);
 if(dice<0)throw Error('偷襲骰不足。');return dice;
}
