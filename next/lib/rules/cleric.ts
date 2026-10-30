import type { Character, CharacterFeature, ClassResource } from '../domain/character';
import { deriveClassResources } from './class-resources';
export const isLifeCleric = (c:Character) => c.classNameEn==='Cleric' && !c.customSubclass && c.subclassEn==='Life Domain';
export const blessedStrikeChoice = (c:Character) => c.progression?.selections['blessed-strikes']?.[0] ?? c.features.find(f=>f.progressionSource==='blessed-strikes')?.nameEn;
export const sparkDice = (c:Character) => c.level>=18?4:c.level>=13?3:c.level>=7?2:1;
export const channelResource = (c:Character) => c.resources.find(r=>r.nameEn==='Channel Divinity'||r.name==='引導神力');
const feat=(name:string,nameEn:string,level:number,description:string,sub=false):CharacterFeature=>({name,nameEn,source:`${sub?'子職：生命領域':'職業：牧師'} Lv${level}`,description,isCustom:false});
export function backfillCleric(c:Character):Character {
 if(c.classNameEn!=='Cleric')return c;
 let features=c.features.map(f=>!f.isCustom&&['Divine Intervention','Greater Divine Intervention'].includes(f.nameEn)?{...f,name:f.nameEn==='Divine Intervention'?'神聖介入':'高等神聖介入'}:!f.isCustom&&f.nameEn==='Blessed Strikes'?{...f,name:'祝福打擊',description:'7級選擇神聖打擊或強效施法，只套用所選的分支。'}:f);
 const choice=blessedStrikeChoice(c);
 let selectedFeature:CharacterFeature|undefined;
 if(c.level>=7&&['Divine Strike','Potent Spellcasting'].includes(choice??'')){
  features=features.filter(f=>f.isCustom||!['Divine Strike','Potent Spellcasting'].includes(f.nameEn));
  selectedFeature={...feat(choice==='Divine Strike'?'神聖打擊':'強效施法',choice!,7,choice==='Divine Strike'?`每回合一次武器攻擊命中時，額外造成 ${c.level>=14?2:1}d8 黯蝕或光輝傷害。`:`牧師戲法傷害加感知修正。${c.level>=14?'戲法造成傷害後，可給自己或60呎內另一生物等同兩倍感知修正的臨時生命值。':''}`),progressionSource:'blessed-strikes'};
 }
 if(isLifeCleric(c)){
  features=features.filter(f=>f.isCustom||!(/子職業特性|Subclass [Ff]eature/.test(f.name+' '+f.nameEn)));
  const life=[feat('生命門徒','Disciple of Life',3,'以法術位施放的法術在施放回合治療時，每個目標額外恢復 2＋法術位環數 HP。免費施放與引導神力不適用。',true),feat('保存生命','Preserve Life',3,'魔法動作消耗一次引導神力，把牧師等級×5 HP 分給30呎內的浴血生物（可含自己），每個目標最多恢復至最大 HP 的一半。',true),feat('祝福醫者','Blessed Healer',6,'以法術位施法治療其他生物後，自己恢復 2＋法術位環數 HP。',true),feat('至高治療','Supreme Healing',17,'法術或引導神力的治療骰直接取最高值；不影響傷害骰。',true)];
  for(const f of life)if(c.level>=Number(f.source.match(/Lv(\d+)/)?.[1])&&!features.some(x=>x.nameEn===f.nameEn&&!x.isCustom))features.push(f);
 }
 if(selectedFeature)features.push(selectedFeature);
 const resources=[...c.resources];
 const channel=deriveClassResources('Cleric',c.level,c.abilityScores).find(r=>r.nameEn==='Channel Divinity');
 if(channel&&!channelResource(c))resources.push(channel);
 if(c.level>=10&&!resources.some(r=>r.nameEn==='Divine Intervention'))resources.push({name:'神聖介入',nameEn:'Divine Intervention',max:1,current:1,recovery:'long',display:'pips',dieFaces:0,unit:'次'});
 return {...c,features,resources};
}
export function interventionAfterLongRest(c:Character,r:ClassResource):ClassResource {
 if(c.classNameEn==='Cleric'&&r.nameEn==='Divine Intervention'&&(c.divineInterventionRests??0)>1)return {...r,current:0};
 return {...r,current:r.max};
}
export type ClericPower={id:string;name:string;description:string;resource?:string};
export function clericPowers(c:Character):ClericPower[]{
 if(c.classNameEn!=='Cleric')return [];
 const out:ClericPower[]=[];
 if(c.level>=2){
  out.push({id:'spark',name:'神聖火花',resource:'Channel Divinity',description:`魔法動作；30 呎內另一名可見生物恢復 ${isLifeCleric(c)&&c.level>=17?sparkDice(c)*8:`${sparkDice(c)}d8`}＋${c.abilityScores.wis.modifier} HP，或造成 ${sparkDice(c)}d8＋${c.abilityScores.wis.modifier} 黯蝕／光輝傷害（體質豁免 DC ${c.spellDc}，成功傷害減半）。消耗 1 次引導神力。`});
  out.push({id:'turn',name:c.level>=5?'驅散不死／灼燒不死':'驅散不死',resource:'Channel Divinity',description:`魔法動作；30 呎內選定不死生物感知豁免 DC ${c.spellDc}，失敗則恐懼、失能並遠離你，持續 1 分鐘。受到傷害、你失能或死亡時結束。${c.level>=5?`灼燒不死：可對失敗者造成 ${Math.max(1,c.abilityScores.wis.modifier)}d8 光輝傷害，這次傷害不解除驅散；共用同一次引導神力，不額外扣次數。`:''}`});
 }
 if(isLifeCleric(c)&&c.level>=3)out.push({id:'preserve',name:'保存生命',resource:'Channel Divinity',description:`魔法動作；分配最多 ${c.level*5} HP 給 30 呎內浴血生物，每個目標最多恢復至最大 HP 的一半。可包含自己；不加生命門徒。`});
 if(c.level>=10)out.push({id:'intervention',name:c.level>=20?'神聖介入／高等神聖介入':'神聖介入',resource:'Divine Intervention',description:`魔法動作：施放任一 5 環以下、不以反應施放的牧師法術，不消耗法術位或材料。一般使用長休恢復。${c.level>=20?'也可選祈願術；此時改為擲 2d4，完成該次數的長休後才恢復。':''}`});
 return out;
}
export function spendClericPower(c:Character,id:string,wishRests?:number):Character {
 const power=clericPowers(c).find(p=>p.id===id);
 if(!power?.resource)throw Error('目前沒有此能力。');
 const r=power.resource==='Channel Divinity'?channelResource(c):c.resources.find(r=>r.nameEn===power.resource);
 if(!r||r.current<1||(id==='intervention'&&(c.divineInterventionRests??0)>0))throw Error('能力次數不足或仍在等待長休恢復。');
 if(wishRests!==undefined&&(id!=='intervention'||c.level<20||!Number.isInteger(wishRests)||wishRests<2||wishRests>8))throw Error('祈願術需要20級，請輸入2d4的合計（2–8）。');
 return {...c,resources:c.resources.map(x=>x===r?{...x,current:x.current-1}:x),...(id==='intervention'?{divineInterventionRests:wishRests??0}:{})};
}
export type HealingTarget={name:string;current:number;max:number;amount:number;self?:boolean};
export function preserveLife(c:Character,targets:HealingTarget[]):Character {
 if(!targets.length||targets.filter(t=>t.self).length>1)throw Error('請填寫治療目標。');
 let total=0,selfHealing=0;
 for(const t of targets){
  const current=t.self?c.currentHp:t.current,max=t.self?c.maxHp:t.max;
  if(![current,max,t.amount].every(Number.isInteger)||current<0||max<1||current>max||t.amount<0||current>Math.floor(max/2)||t.amount>Math.floor(max/2)-current)throw Error('保存生命只能治療浴血目標，且不能超過最大HP的一半。');
  total+=t.amount;if(t.self)selfHealing=t.amount;
 }
 if(total<1||total>c.level*5)throw Error(`總治療量須介於1與${c.level*5}。`);
 const result=spendClericPower(c,'preserve');
 return {...result,currentHp:c.currentHp+selfHealing};
}
export const discipleHealingBonus=(c:Character,slotLevel:number)=>isLifeCleric(c)&&c.level>=3&&Number.isInteger(slotLevel)&&slotLevel>=1&&slotLevel<=9?2+slotLevel:0;
