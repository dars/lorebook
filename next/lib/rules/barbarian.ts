import {unarmoredMonk,monkMoveBonus} from './monk';
import type { Character, CharacterFeature } from '../domain/character';
import { wearingHeavyArmor } from './ac';
import { abilityModifier } from './ability';

const definitions: [number,string,string,string][] = [
 [1,'Rage','狂暴','附贈動作消耗 1 次狂暴。力量攻擊傷害加值、力量檢定與豁免優勢，並抗鈍擊、穿刺、揮砍傷害；不能施法或專注。短休恢復 1 次，長休全部恢復。最長 10 分鐘；15 級前須每回合攻擊敵人、迫使敵人豁免或以附贈動作延續。穿重甲時不能使用。'],
 [1,'Unarmored Defense','無甲防禦','未穿護甲時，AC = 10＋敏捷修正＋體質修正，可以持盾。'],
 [3,'Primal Knowledge','原初知識','額外取得一項職業技能熟練。狂暴時可改以力量進行特技、威嚇、察覺、隱匿或求生檢定。'],
 [5,'Extra Attack','額外攻擊','在自己的回合採取攻擊動作時可攻擊兩次，而非一次。'],
 [5,'Fast Movement','快速移動','未穿重甲時速度增加 10 呎。'],
 [7,'Instinctive Pounce','本能猛撲','啟動狂暴的附贈動作中，可移動至多一半速度。'],
 [11,'Relentless Rage','不屈狂暴','狂暴中降至 0 HP 且未立即死亡時，可作 DC 10 體質豁免；成功則 HP 改為野蠻人等級的兩倍。每次使用後 DC 增加 5，短休或長休重設。'],
 [13,'Improved Brutal Strike','精通殘暴打擊','殘暴打擊增加失衡打擊與破綻打擊選項：使目標下一次豁免劣勢且不能機會攻擊，或讓另一生物下一次對其攻擊 +5，持續至你下回合開始。'],
 [15,'Persistent Rage','持續狂暴','狂暴持續 10 分鐘，不再需要逐回合延續；昏迷或穿重甲時提前結束。擲先攻時可恢復全部狂暴次數，此恢復方式每長休一次。'],
 [17,'Improved Brutal Strike','精通殘暴打擊：增強','殘暴打擊額外傷害提升至 2d10，且每次可選兩種不同效果。'],
 [20,'Primal Champion','原初勇士','力量與體質各增加 4，上限 25。'],
];
const berserker: typeof definitions = [
 [3,'Frenzy','狂亂','狂暴中使用魯莽攻擊時，本回合首次力量攻擊命中的目標額外受到等同狂暴傷害加值顆數的 d6 傷害。'],
 [6,'Mindless Rage','無心狂暴','狂暴時免疫魅惑與恐懼；啟動狂暴時結束身上的魅惑與恐懼。'],
 [10,'Retaliation','報復','受到 5 呎內生物的傷害時，可用反應以武器或徒手對其進行一次近戰攻擊。'],
 [14,'Intimidating Presence','威嚇氣勢','附贈動作：選擇自身 30 呎發散內生物，感知豁免 DC = 8＋力量修正＋熟練加值；失敗則恐懼 1 分鐘，每回合結束重試。每長休一次，可花 1 次狂暴恢復使用次數（不耗動作）。'],
];
export const isBerserker = (c:Character) => !c.customSubclass && (['Path of the Berserker','Berserker'].includes(c.subclassEn) || /狂戰士/.test(c.subclass));
export const rageDamage = (c:Character) => c.level>=16?4:c.level>=9?3:2;
const incapacitated = (c:Character) => c.conditions.some(x=>['失能','昏迷','麻痺','石化','震懾','Incapacitated','Unconscious','Paralyzed','Petrified','Stunned'].includes(x));
export const rageActive = (c:Character) => c.classNameEn==='Barbarian' && !!c.raging && !wearingHeavyArmor(c) && !c.conditions.some(x=>['昏迷','Unconscious',...(c.level<15?['失能','麻痺','石化','震懾','Incapacitated','Paralyzed','Petrified','Stunned']:[])].includes(x));
export const movementFeet = (c:Character) => (Number(c.speed.replace(/[^0-9]/g,''))||0)+(((c.classNameEn==='Barbarian'&&c.level>=5)||(c.classNameEn==='Ranger'&&c.level>=6))&&!wearingHeavyArmor(c)?10:0)+(unarmoredMonk(c)?monkMoveBonus(c.level):0);
export function setRage(c:Character,active:boolean):Character {
 if(!active)return {...c,raging:false};
 if(rageActive(c))return c;
 const r=c.resources.find(r=>r.nameEn==='Rage'||r.name==='狂暴');
 if(c.classNameEn!=='Barbarian'||incapacitated(c)||wearingHeavyArmor(c)||!r||r.current<1||!rageActive({...c,raging:true}))throw Error('目前無法狂暴：請確認剩餘次數、重甲與失能狀態。');
 return {...c,raging:true,concentrationSpell:null,resources:c.resources.map(x=>x===r?{...x,current:x.current-1}:x),conditions:isBerserker(c)&&c.level>=6?c.conditions.filter(x=>!['魅惑','恐懼','Charmed','Frightened'].includes(x)):c.conditions};
}
/** 舊角色只補一次原初勇士；標記隨角色 JSON 保存，重新讀取不累加。 */
export function backfillBarbarian(c:Character):Character {
 if(c.classNameEn!=='Barbarian')return c;
 let features=[...c.features];
 const defs=[...definitions,...(isBerserker(c)?berserker:[])].filter(([lv])=>lv<=c.level);
 if(isBerserker(c))features=features.filter(f=>f.isCustom||!(/子職業特性|Subclass [Ff]eature/.test(f.name+' '+f.nameEn)));
 for(const [lv,en,name,description] of defs){
  const index=features.findIndex(f=>!f.isCustom&&f.nameEn===en&&(en!=='Improved Brutal Strike'||Number(f.source.match(/Lv\s*(\d+)/)?.[1])===lv));
  const feature:CharacterFeature={name,nameEn:en,description,source:`${berserker.some(d=>d[1]===en)?'子職':'職業'}：${berserker.some(d=>d[1]===en)?c.subclass:c.className} Lv${lv}`,isCustom:false};
  if(index>=0)features[index]={...features[index],...feature};else features.push(feature);
 }
 let mastery=0;
 features=features.map(f=>f.progressionSource==='mastery'?{...f,source:`職業：${c.className} Lv${[1,1,4,10][mastery++]??1}`} :f);
 let result={...c,features};
 if(c.level>=20&&!c.primalChampionApplied){
  const scores={...c.abilityScores};
  for(const key of ['str','con'] as const){const score=Math.max(scores[key].score,Math.min(25,scores[key].score+4));scores[key]={...scores[key],score,modifier:abilityModifier(score)};}
  const hp=(scores.con.modifier-c.abilityScores.con.modifier)*c.level;
  result={...result,primalChampionApplied:true,abilityScores:scores,maxHp:c.maxHp+hp,currentHp:c.currentHp+hp,skills:c.skills.map(s=>({...s,modifier:s.modifier+(s.abilityType==='STR'?scores.str.modifier-c.abilityScores.str.modifier:s.abilityType==='CON'?scores.con.modifier-c.abilityScores.con.modifier:0)}))};
 }
 return result;
}
