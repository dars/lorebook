import type {Character,CharacterFeature} from '../domain/character';
import {LAND} from './progression/granted-spells';
import {deriveClassResources} from './class-resources';
export const isLandDruid=(c:Character)=>c.classNameEn==='Druid'&&!c.customSubclass&&c.subclassEn==='Circle of the Land';
export const wildShape=(c:Character)=>c.resources.find(r=>r.nameEn==='Wild Shape');
export const formLimits=(level:number)=>({count:level>=8?8:level>=4?6:4,cr:level>=8?1:level>=4?.5:.25,fly:level>=8});
export type BeastForm={name:string;cr:number;fly:boolean};
export function knownForms(c:Character):BeastForm[]{return (c.progression?.selections.forms??[]).flatMap(s=>{try{return [JSON.parse(s) as BeastForm];}catch{return [];}});}
export const circleSpellNames=(c:Character)=>Object.entries(LAND[c.progression?.selections.land?.[0]??'']??{}).filter(([lv])=>Number(lv)<=c.level).flatMap(([,names])=>names);
export const landDice=(c:Character)=>c.level>=14?4:c.level>=10?3:2;
const feature=(level:number,name:string,nameEn:string,description:string,sub=false):CharacterFeature=>({name,nameEn,description,source:`${sub?'子職：大地結社':'職業：德魯伊'} Lv${level}`,isCustom:false});
export function backfillDruid(c:Character):Character{
 if(c.classNameEn!=='Druid')return c;
 const resources=[...c.resources];
 if(c.level>=2&&!wildShape(c))resources.push(...deriveClassResources('Druid',c.level,c.abilityScores).filter(r=>r.nameEn==='Wild Shape'));
 const add=(name:string,nameEn:string)=>{if(!resources.some(r=>r.nameEn===nameEn))resources.push({name,nameEn,current:1,max:1,recovery:'long',display:'pips',dieFaces:0,unit:'次'});};
 if(c.level>=5)add('荒野重生 · 換法術位','Wild Resurgence');
 if(c.level>=20)add('自然術士 · 換法術位','Nature Magician');
 if(isLandDruid(c)&&c.level>=6){add('自然復甦 · 回復法術位','Natural Recovery');add('自然復甦 · 免費施法','Natural Recovery Casting');}
 let features=c.features.filter(f=>f.isCustom||!isLandDruid(c)||!/Subclass Feature|子職業特性/i.test(f.nameEn+' '+f.name));
 const branch=c.progression?.selections['elemental-fury']?.[0];
 if(c.level>=7&&branch){features=features.filter(f=>f.isCustom||!['Primal Strike','Potent Spellcasting'].includes(f.nameEn));features.push({...feature(7,branch==='Primal Strike'?'原初打擊':'強效施法',branch,branch==='Primal Strike'?`自己的每回合一次，武器或野獸攻擊命中時加 ${c.level>=15?2:1}d8 寒冷／火焰／閃電／雷鳴傷害。`:`德魯伊戲法傷害加感知修正。${c.level>=15?'射程至少10呎的德魯伊戲法射程增加300呎。':''}`),progressionSource:'elemental-fury'});}
 const defs=[feature(2,'荒野變身','Wild Shape','附贈動作變成已知野獸形態，獲得德魯伊等級的臨時HP，持續半個等級的小時。可用附贈動作結束；短休回1次、長休回滿。'),feature(2,'荒野夥伴','Wild Companion','魔法動作消耗一個法術位或一次荒野變身，施放尋獲魔寵，不需材料；魔寵為妖精，長休時消失。'),feature(5,'荒野重生','Wild Resurgence','每個自己的回合一次，荒野變身耗盡時可用法術位換1次；也可用1次荒野變身換1環法術位，此方向每長休一次，皆不需動作。'),feature(19,'史詩恩賜','Epic Boon','選擇史詩恩賜或其他符合條件的專長。'),feature(20,'常青荒野變身','Evergreen Wild Shape','擲先攻時，若荒野變身剩0次，恢復1次。'),feature(20,'自然術士','Nature Magician','不需動作，消耗荒野變身，每次換2環，合成一個法術位；每長休一次。')];
 if(isLandDruid(c))defs.push(feature(3,'大地之助',"Land’s Aid",`魔法動作消耗1次荒野變身；60呎內一點、10呎半徑，選定生物體質豁免，失敗受${landDice(c)}d6黯蝕傷害、成功減半；區域內一個生物恢復${landDice(c)}d6 HP。`,true),feature(6,'自然復甦','Natural Recovery','每長休可免費施放一個一環以上結社法術一次。另外，每長休一次可在短休恢復法術位，總環數不超過等級一半進位，單一法術位不得超過五環。',true),feature(10,'自然守護',"Nature’s Ward",'免疫中毒狀態；依地形獲得抗性：乾旱火焰、極地寒冷、溫帶閃電、熱帶毒素。',true),feature(14,'自然庇所',"Nature’s Sanctuary",'魔法動作消耗1次荒野變身，在120呎內地面建立15呎立方區域，持續1分鐘或失能／死亡。區內自己與盟友獲半掩護，盟友獲自然守護的抗性。附贈動作可移動區域60呎。',true));
 for(const f of defs.filter(f=>Number(f.source.match(/Lv(\d+)/)?.[1])<=c.level)){const i=features.findIndex(x=>!x.isCustom&&x.nameEn.replace(/'/g,'’')===f.nameEn);if(i<0)features.push(f);else features[i]={...features[i],...f};}
 return {...c,features,resources};
}
function spend(c:Character,name:string,n=1):Character{const r=c.resources.find(r=>r.nameEn===name);if(!r||r.current<n||n<1||!Number.isInteger(n))throw Error('剩餘資源不足。');return {...c,resources:c.resources.map(x=>x===r?{...x,current:x.current-n}:x)};}
function spendSlot(c:Character,level:number):Character{const s=c.spellSlots.find(s=>s.level===level);if(!s||s.used>=s.total)throw Error('沒有可用法術位。');return {...c,spellSlots:c.spellSlots.map(x=>x===s?{...x,used:x.used+1}:x)};}
function gainSlot(c:Character,level:number):Character{const s=c.spellSlots.find(s=>s.level===level);return {...c,spellSlots:s?c.spellSlots.map(x=>x===s?x.used>0?{...x,used:x.used-1}:{...x,total:x.total+1}:x):[...c.spellSlots,{level,total:1,used:0}],druidCreatedSlots:{...c.druidCreatedSlots,[level]:(c.druidCreatedSlots?.[level]??0)+(s&&s.used>0?0:1)}};}
export function druidAction(c:Character,id:string,arg?:string|number):Character{
 if(c.classNameEn!=='Druid')throw Error('不是德魯伊。');
 if(id==='end-form')return {...c,wildShapeForm:undefined};
 if(id==='shape'&&c.level>=2){const f=knownForms(c).find(f=>f.name===arg),limit=formLimits(c.level);if(!f||f.cr>limit.cr||(f.fly&&!limit.fly))throw Error('請先選擇符合資格的已知形態。');return {...spend(c,'Wild Shape'),wildShapeForm:f.name,tempHp:Math.max(c.tempHp,c.level)};}
 if(id==='companion'&&c.level>=2)return {...arg?spendSlot(c,Number(arg)):spend(c,'Wild Shape'),wildCompanionActive:true};
 if(id==='slot-to-shape'&&c.level>=5){if((wildShape(c)?.current??0)!==0)throw Error('荒野變身必須已耗盡。');const next=spendSlot(c,Number(arg));return {...next,resources:next.resources.map(r=>r.nameEn==='Wild Shape'?{...r,current:1}:r)};}
 if(id==='shape-to-slot'&&c.level>=5)return gainSlot(spend(spend(c,'Wild Resurgence'),'Wild Shape'),1);
 if(id==='evergreen'&&c.level>=20){if(wildShape(c)?.current!==0)throw Error('僅擲先攻且荒野變身耗盡時可用。');return {...c,resources:c.resources.map(r=>r.nameEn==='Wild Shape'?{...r,current:1}:r)};}
 if(id==='magician'&&c.level>=20){const n=Number(arg);if(!Number.isInteger(n)||n<1||n>4)throw Error('請選1至4次荒野變身。');return gainSlot(spend(spend(c,'Nature Magician'),'Wild Shape',n),n*2);}
 if(isLandDruid(c)){
  if(id==='aid'&&c.level>=3)return spend(c,'Wild Shape');
  if(id==='sanctuary'&&c.level>=14)return {...spend(c,'Wild Shape'),natureSanctuaryActive:true};
  if(id==='end-sanctuary')return {...c,natureSanctuaryActive:false};
  if(id==='circle-cast'&&c.level>=6){if(!c.spells.some(s=>s.nameEn===arg&&s.level>0&&s.alwaysPrepared&&circleSpellNames(c).includes(s.nameEn)))throw Error('請選擇目前地形的結社法術。');return spend(c,'Natural Recovery Casting');}
 }
 throw Error('尚未取得此能力。');
}

export function endIncapacitatedDruidEffects(c:Character):Character {
 if(c.classNameEn!=='Druid'||!c.conditions.some(x=>['失能','昏迷','麻痺','石化','震懾','死亡','Incapacitated','Unconscious','Paralyzed','Petrified','Stunned','Dead'].includes(x)))return c;
 return {...c,wildShapeForm:undefined,natureSanctuaryActive:false};
}
