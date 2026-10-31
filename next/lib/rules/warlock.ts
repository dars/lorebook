import type {Character,Spell} from '../domain/character';
import {spellSlotTotalsFor} from './level-tables';
import {cantripDamage} from './cantrip-damage';
import {DAMAGE,INVOCATIONS} from './progression/options';
const canonical=(s:string)=>s.replaceAll('’',"'");
export const hasInvocation=(c:Character,id:string)=>c.classNameEn==='Warlock'&&(c.progression?.selections.invocations?.includes(id)||c.features.some(f=>!f.isCustom&&canonical(f.nameEn)===canonical(id)))===true;
export const fiend=(c:Character)=>c.classNameEn==='Warlock'&&!c.customSubclass&&['Fiend Patron','The Fiend'].includes(c.subclassEn);
export const pactRing=(c:Character)=>c.classNameEn==='Warlock'?Number(Object.keys(spellSlotTotalsFor('pact',c.level))[0]):0;
export const pactSlot=(c:Character)=>c.spellSlots.find(s=>s.level===pactRing(c));
export function recoverPact(c:Character,all=true):Character{if(c.classNameEn!=='Warlock')return c;return {...c,spellSlots:c.spellSlots.map(s=>s.level===pactRing(c)?{...s,used:all?0:Math.max(0,s.used-Math.ceil(s.total/2))}:s)};}
export const fiendResistance=(c:Character)=>fiend(c)&&c.level>=10?DAMAGE.find(o=>o.id!=='Force'&&(c.progression?.selections['fiendish-resilience']?.includes(o.id)||c.features.some(f=>f.progressionSource==='fiendish-resilience'&&f.nameEn===o.id))):undefined;
export const INVOCATION_SPELLS:Record<string,{spell:string;condition?:string}>={
 'Armor of Shadows':{spell:'Mage Armor',condition:'只能對自己施放。'},'Ascendant Step':{spell:'Levitate',condition:'只能對自己施放。'},'Fiendish Vigor':{spell:'False Life',condition:'只能對自己施放；取得最大值12臨時HP，不疊加。'},'Mask of Many Faces':{spell:'Disguise Self'},'Misty Visions':{spell:'Silent Image'},'Otherworldly Leap':{spell:'Jump',condition:'只能對自己施放。'},'Master of Myriad Forms':{spell:'Alter Self'},'One with Shadows':{spell:'Invisibility',condition:'須位於微光或黑暗，只能對自己施放；仍需專注。'},'Visions of Distant Realms':{spell:'Arcane Eye'},'Whispers of the Grave':{spell:'Speak with Dead'},'Pact of the Chain':{spell:'Find Familiar',condition:'以魔法動作施放。'},
};
export function invocationSpell(c:Character,s:Spell):Spell {
 if(c.classNameEn!=='Warlock'||s.homebrewId)return s;
 const entries=Object.entries(INVOCATION_SPELLS).filter(([id,v])=>hasInvocation(c,id)&&v.spell===s.nameEn);
 if(!entries.length)return s;
 const sources=(s.castingSources??[]).filter(v=>!v.source.startsWith('invocation/'));
 return {...s,castingSources:[...sources,...entries.map(([id,v])=>({source:`invocation/${id}`,title:`${c.features.find(f=>f.nameEn===id)?.name??INVOCATIONS.find(o=>o.id===id)?.name??id}${v.condition?` · ${v.condition}`:''}`,ability:'CHA',free:'atWill' as const}))]};
}
export function warlockDamage(c:Character,s:Spell):string {
 const base=cantripDamage(s,c.level);if(c.classNameEn!=='Warlock'||s.level!==0||s.homebrewId||!base)return base;
 const chosen=c.features.some(f=>!f.isCustom&&((f.nameEn.startsWith('Agonizing Blast:')&&f.name.split(' · ').at(-1)===s.name)||(f.nameEn==='Agonizing Blast'&&s.nameEn==='Eldritch Blast')));
 if(!chosen)return base;
 const mod=c.abilityScores.cha.modifier,add=mod>=0?`+${mod}`:`${mod}`;
 return s.nameEn==='Eldritch Blast'?base.replace('1d10',`(1d10${add})`):`${base}${add}`;
}
const defs:[number,string,string,string][]=[
 [1,'Pact Magic','契約魔法','契約法術位在短休或長休後全部回復；祕法奧秘的免費施放次數仍須長休回復。'],
 [1,'Eldritch Invocations','祕法祈喚','依選擇取得祈喚能力。'],
 [2,'Magical Cunning','魔法機巧','花1分鐘進行儀式，回復至多契約法術位上限的一半（向上取整）；每長休一次。20級邪術宗師改為回復全部。'],
 [9,'Contact Patron','聯絡宗主','每長休一次免費施放異界探知來聯絡宗主，自動通過該法術的豁免；施法時間1分鐘。'],
 [20,'Eldritch Master','邪術宗師','使用魔法機巧時回復全部契約法術位。'],
];
const fiendDefs:[number,string,string,string][]=[
 [3,"Dark One's Blessing",'黑暗祝福','你使敵人降至0HP，或其他人使你10呎內敵人降至0HP時，獲得邪術師等級＋魅力修正的臨時HP（至少1），不與既有臨時HP疊加。'],
 [6,"Dark One's Own Luck",'黑暗者幸運','能力檢定或豁免擲骰後、結果生效前可加1d10，每次擲骰限用一次；魅力修正次（至少1），長休回滿。'],
 [10,'Fiendish Resilience','魔鬼韌性','短休或長休後可選一種力場以外的傷害抗性，持續至另選。'],
 [14,'Hurl Through Hell','拋入地獄','每回合一次，攻擊命中時可令目標以法術DC作魅力豁免。失敗則消失並失能至你下一回合結束，非邪魔另受8d10心靈傷害。每長休一次；可不耗動作消耗一個契約法術位恢復次數。'],
];
export function backfillWarlock(c:Character):Character {
 if(c.classNameEn!=='Warlock')return c;
 const features=c.features.filter(f=>f.isCustom||!fiend(c)||!/Subclass Feature|子職業特性/.test(f.name+' '+f.nameEn));
 for(const [lv,en,name,description] of [...defs,...(fiend(c)?fiendDefs:[])].filter(([lv])=>lv<=c.level)){
 const i=features.findIndex(f=>!f.isCustom&&canonical(f.nameEn)===en);const f={name,nameEn:en,description,source:`${fiendDefs.some(f=>f[1]===en)?'子職：邪魔宗主':'職業：邪術師'} Lv${lv}`,isCustom:false};if(i<0)features.push(f);else features[i]={...features[i],...f};}
 const resources=[...c.resources];const add=(en:string,name:string,max:number)=>{const i=resources.findIndex(r=>canonical(r.nameEn)===en),old=resources[i];const r={...old,name,nameEn:en,max,current:old?Math.min(max,Math.max(0,old.current+max-old.max)):max,recovery:'long' as const,display:'pips' as const,dieFaces:0,unit:'次'};if(i<0)resources.push(r);else resources[i]=r;};
 if(c.level>=2)add('Magical Cunning','魔法機巧',1);if(c.level>=9)add('Contact Patron','聯絡宗主',1);
 if(fiend(c)&&c.level>=6)add("Dark One's Own Luck",'黑暗者幸運',Math.max(1,c.abilityScores.cha.modifier));if(fiend(c)&&c.level>=14)add('Hurl Through Hell','拋入地獄',1);
 return {...c,features,resources,spells:c.spells.map(s=>invocationSpell(c,s)),cantrips:c.cantrips.map(s=>invocationSpell(c,s))};
}
function spend(c:Character,en:string):Character{const r=c.resources.find(r=>r.nameEn===en);if(!r||r.current<1)throw Error('剩餘次數不足。');return {...c,resources:c.resources.map(x=>x===r?{...x,current:x.current-1}:x)};}
export function warlockAction(c:Character,id:'cunning'|'contact'|'blessing'|'luck'|'hurl'|'restore-hurl'|'vigor'):Character {
 if(c.classNameEn!=='Warlock')throw Error('需要邪術師職業。');
 if(id==='cunning'){if(c.level<2||!pactSlot(c)?.used)throw Error('沒有需要回復的契約法術位。');return recoverPact(spend(c,'Magical Cunning'),c.level>=20);}
 if(id==='contact'){if(c.level<9)throw Error('尚未取得聯絡宗主。');return spend(c,'Contact Patron');}
 if(id==='vigor'){if(!hasInvocation(c,'Fiendish Vigor'))throw Error('尚未取得邪魔活力。');return {...c,tempHp:Math.max(c.tempHp,12)};}
 if(!fiend(c))throw Error('需要邪魔宗主。');
 if(id==='blessing'){if(c.level<3)throw Error('尚未取得黑暗祝福。');return {...c,tempHp:Math.max(c.tempHp,c.level+c.abilityScores.cha.modifier,1)};}
 if(id==='luck'){if(c.level<6)throw Error('尚未取得黑暗者幸運。');return spend(c,"Dark One's Own Luck");}
 if(c.level<14)throw Error('尚未取得拋入地獄。');
 if(id==='hurl')return spend(c,'Hurl Through Hell');
 const slot=pactSlot(c);if(!slot||slot.used>=slot.total||c.resources.find(r=>r.nameEn==='Hurl Through Hell')?.current!==0)throw Error('沒有契約法術位，或能力仍有次數。');
 return {...c,spellSlots:c.spellSlots.map(s=>s===slot?{...s,used:s.used+1}:s),resources:c.resources.map(r=>r.nameEn==='Hurl Through Hell'?{...r,current:1}:r)};
}
// SRD簡易／軍用近戰武器。召喚不創造可出售的裝備，獨立保存目前的契約。
export const PACT_WEAPONS=[
 ['Club','棍棒','1d4','bludgeoning'],['Dagger','匕首','1d4','piercing'],['Greatclub','巨棒','1d8','bludgeoning'],['Handaxe','手斧','1d6','slashing'],['Javelin','標槍','1d6','piercing'],['Light Hammer','輕鎚','1d4','bludgeoning'],['Mace','硬頭鎚','1d6','bludgeoning'],['Quarterstaff','長棍','1d6','bludgeoning'],['Sickle','鐮刀','1d4','slashing'],['Spear','長矛','1d6','piercing'],['Battleaxe','戰斧','1d8','slashing'],['Flail','連枷','1d8','bludgeoning'],['Glaive','長柄刀','1d10','slashing'],['Greataxe','巨斧','1d12','slashing'],['Greatsword','巨劍','2d6','slashing'],['Halberd','戟','1d10','slashing'],['Lance','騎槍','1d10','piercing'],['Longsword','長劍','1d8','slashing'],['Maul','巨鎚','2d6','bludgeoning'],['Morningstar','釘頭鎚','1d8','piercing'],['Pike','長槍','1d10','piercing'],['Rapier','細劍','1d8','piercing'],['Scimitar','彎刀','1d6','slashing'],['Shortsword','短劍','1d6','piercing'],['Trident','三叉戟','1d8','piercing'],['Warhammer','戰鎚','1d8','bludgeoning'],['War Pick','戰鎬','1d8','piercing'],['Whip','鞭','1d4','slashing'],
];
export function conjurePact(c:Character,nameEn:string,damageType='normal'):Character {
 if(!hasInvocation(c,'Pact of the Blade'))throw Error('尚未取得刃契。');const w=PACT_WEAPONS.find(w=>w[0]===nameEn);if(!w||!['normal','necrotic','psychic','radiant'].includes(damageType))throw Error('請選簡易或軍用近戰武器與有效傷害類型。');
 return {...c,pactWeapon:{nameEn:w[0],name:w[1],damage:w[2],damageType:damageType==='normal'?w[3]:damageType}};
}
export const pactAttacks=(c:Character)=>hasInvocation(c,'Devouring Blade')&&c.level>=12?3:hasInvocation(c,'Thirsting Blade')&&c.level>=5?2:1;
