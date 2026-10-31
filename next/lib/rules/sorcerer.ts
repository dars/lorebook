import type {Character,Spell} from '../domain/character';
import {METAMAGIC,DAMAGE} from './progression/options';
export const draconic=(c:Character)=>c.classNameEn==='Sorcerer'&&c.level>=3&&!c.customSubclass&&['Draconic Sorcery','Draconic Bloodline'].includes(c.subclassEn);
export const sorceryPoints=(c:Character)=>c.resources.find(r=>r.nameEn==='Sorcery Points');
export const innateActive=(c:Character)=>c.classNameEn==='Sorcerer'&&!!c.innateSorceryActive;
export const effectiveSpellDc=(c:Character)=>c.spellDc+(innateActive(c)?1:0);
export const affinity=(c:Character)=>draconic(c)&&c.level>=6?DAMAGE.slice(0,5).find(o=>c.progression?.selections['elemental-affinity']?.includes(o.id)||c.features.some(f=>!f.isCustom&&f.progressionSource==='elemental-affinity'&&f.nameEn===o.id)):undefined;
export const affinityMatches=(c:Character,s:Spell)=>{const a=affinity(c);return !!a&&!s.homebrewId&&(s.damageType.toLowerCase().includes(a.id.toLowerCase())||s.damageType.includes(a.name));};
export const SLOT_CREATION=[{level:1,cost:2,min:2},{level:2,cost:3,min:3},{level:3,cost:5,min:5},{level:4,cost:6,min:7},{level:5,cost:7,min:9}];
const defs:[number,string,string,string][]=[
 [1,'Spellcasting','施法','以魅力施放術士法術。'],
 [1,'Innate Sorcery','天生術法','附贈動作啟動1分鐘：術士法術DC＋1，術士法術攻擊骰具有優勢。每長休2次。'],
 [2,'Font of Magic','魔力之泉','法術位可不耗動作轉為等同環數的術法點，不能超過術士等級。附贈動作花2／3／5／6／7點創造1／2／3／4／5環法術位，需術士2／3／5／7／9級；創造的法術位長休時消失。'],
 [2,'Metamagic','超魔','施法時花費術法點套用已選的超魔，須符合各選項條件。通常每個法術僅一種，強效與追蹤可併用。'],
 [5,'Sorcerous Restoration','術法回復','完成短休時可恢復至多術士等級一半（向下取整）的術法點，不超過上限。每長休一次。'],
 [7,'Sorcery Incarnate','術法化身','天生術法次數用完時，可花2術法點啟動；啟動期間每個法術可使用兩種超魔。'],
 [20,'Arcane Apotheosis','奧術神化','天生術法啟動時，每個自己的回合可免費使用一種超魔。'],
];
const dragon:[number,string,string,string][]=[
 [3,'Draconic Resilience','龍族韌性','3級HP上限增加3，之後每個術士等級再加1；未著甲時AC可用10＋敏捷修正＋魅力修正。'],
 [6,'Elemental Affinity','元素親和','所選傷害類型取得抗性，施放該類型傷害的法術時，可在其中一次傷害擲骰加上魅力修正。'],
 [14,'Dragon Wings','龍翼','附贈動作展開龍翼，飛行速度60呎，持續1小時或自行解除。每長休一次；可不耗動作花3術法點恢復使用次數。'],
 [18,'Dragon Companion','龍族夥伴','召喚龍不需材料，每長休可免費施放一次。每次施放可選不需專注，但持續時間改為1分鐘。'],
];
export function backfillSorcerer(c:Character):Character{
 if(c.classNameEn!=='Sorcerer')return c;
 const delta=draconic(c)?Math.max(0,c.level-(c.draconicHpApplied??0)):0;
 const features=c.features.filter(f=>f.isCustom||!draconic(c)||!/Subclass Feature|子職業特性/.test(f.nameEn+' '+f.name));
 for(const [lv,en,name,description] of [...defs,...(draconic(c)?dragon:[])].filter(([lv])=>lv<=c.level)){
 const i=features.findIndex(f=>!f.isCustom&&f.nameEn===en);const f={name,nameEn:en,description,source:`${dragon.some(f=>f[1]===en)?'子職：龍族術法':'職業：術士'} Lv${lv}`,isCustom:false};if(i<0)features.push(f);else features[i]={...features[i],...f};}
 const resources=[...c.resources];const add=(name:string,en:string,max:number,display:'pips'|'number'='pips')=>{const i=resources.findIndex(r=>r.nameEn===en);const old=i<0?null:resources[i];const r={...old,name,nameEn:en,max,current:old?Math.min(max,Math.max(0,old.current+max-old.max)):max,recovery:'long' as const,display,dieFaces:0,unit:display==='number'?'點':'次'};if(i<0)resources.push(r);else resources[i]=r;};
 add('天生術法','Innate Sorcery',2);if(c.level>=2)add('術法點','Sorcery Points',c.level,'number');if(c.level>=5)add('術法回復','Sorcerous Restoration',1);
 if(draconic(c)&&c.level>=14)add('龍翼','Dragon Wings',1);if(draconic(c)&&c.level>=18)add('龍族夥伴','Dragon Companion',1);
 return {...c,features,resources,maxHp:c.maxHp+delta,currentHp:c.currentHp+delta,...(draconic(c)?{draconicHpApplied:c.level}:{})};
}
function spend(c:Character,en:string,n:number):Character{const r=c.resources.find(r=>r.nameEn===en);if(!r||r.current<n||n<0)throw Error('剩餘次數或術法點不足。');return {...c,resources:c.resources.map(x=>x===r?{...x,current:x.current-n}:x)};}
export function sorcererAction(c:Character,id:'innate'|'restore'|'wings'|'restore-wings'|'dragon',noConcentration=false):Character{
 if(c.classNameEn!=='Sorcerer')throw Error('需要術士職業。');
 if(id==='innate'){const r=c.resources.find(r=>r.nameEn==='Innate Sorcery');const result=r?.current?spend(c,'Innate Sorcery',1):c.level>=7?spend(c,'Sorcery Points',2):null;if(!result)throw Error('天生術法次數已用完。');return {...result,innateSorceryActive:true};}
 if(id==='restore'){if(c.level<5||c.progression?.rest!=='short')throw Error('請先完成短休。');const p=sorceryPoints(c);if(!p||p.current>=p.max)throw Error('術法點已滿。');const result=spend(c,'Sorcerous Restoration',1);return {...result,resources:result.resources.map(r=>r.nameEn==='Sorcery Points'?{...r,current:Math.min(r.max,r.current+Math.floor(c.level/2))}:r)};}
 if(!draconic(c))throw Error('需要龍族術法。');
 if(id==='restore-wings'){if(c.level<14||c.resources.find(r=>r.nameEn==='Dragon Wings')?.current!==0)throw Error('龍翼尚有次數或未取得。');const result=spend(c,'Sorcery Points',3);return {...result,resources:result.resources.map(r=>r.nameEn==='Dragon Wings'?{...r,current:1}:r)};}
 if(id==='wings'){if(c.level<14)throw Error('尚未取得龍翼。');return {...spend(c,'Dragon Wings',1),dragonWingsActive:true};}
 if(c.level<18)throw Error('尚未取得龍族夥伴。');return {...spend(c,'Dragon Companion',1),...(noConcentration?{}:{concentrationSpell:'召喚龍'}),dragonCompanionActive:noConcentration?'1分鐘，不需專注':'至多1小時，需專注'};
}
export function convertSorcery(c:Character,direction:'slot-to-points'|'points-to-slot',level:number):Character{
 if(c.classNameEn!=='Sorcerer'||c.level<2)throw Error('尚未取得魔力之泉。');
 const p=sorceryPoints(c);if(!p)throw Error('沒有術法點。');
 if(direction==='slot-to-points'){const s=c.spellSlots.find(s=>s.level===level);if(!s||s.used>=s.total||p.current>=p.max)throw Error('沒有可用法術位，或術法點已滿。');return {...c,spellSlots:c.spellSlots.map(x=>x===s?{...x,used:x.used+1}:x),resources:c.resources.map(r=>r===p?{...r,current:Math.min(r.max,r.current+level)}:r)};}
 const recipe=SLOT_CREATION.find(r=>r.level===level&&r.min<=c.level);if(!recipe)throw Error('此環數超出魔力之泉或目前等級上限。');const result=spend(c,'Sorcery Points',recipe.cost),existing=c.spellSlots.find(s=>s.level===level);
 return {...result,spellSlots:(existing?c.spellSlots.map(s=>s===existing?{...s,total:s.total+1}:s):[...c.spellSlots,{level,total:1,used:0}]).sort((a,b)=>a.level-b.level),sorceryCreatedSlots:{...c.sorceryCreatedSlots,[level]:(c.sorceryCreatedSlots?.[level]??0)+1}};
}
export const knownMetamagic=(c:Character)=>c.classNameEn==='Sorcerer'&&c.level>=2?METAMAGIC.filter(o=>c.progression?.selections.metamagic?.includes(o.id)||c.features.some(f=>!f.isCustom&&f.nameEn===o.id)):[];
export const metamagicCost=(id:string)=>['Heightened Spell','Quickened Spell'].includes(id)?2:1;
export function applyMetamagic(c:Character,ids:string[],free?:string):Character{
 const known=knownMetamagic(c);if(!ids.length||new Set(ids).size!==ids.length||ids.some(id=>!known.some(o=>o.id===id)))throw Error('請選已學會且不重複的超魔。');
 const ordinary=ids.filter(id=>!['Empowered Spell','Seeking Spell'].includes(id));if(ordinary.length>(innateActive(c)&&c.level>=7?2:1))throw Error('此狀態不能同時使用這些超魔。');
 if(free&&(!ids.includes(free)||c.level<20||!innateActive(c)||c.apotheosisUsed))throw Error('奧術神化每個自己的回合僅能免費一次，且須啟動天生術法。');
 const cost=ids.reduce((n,id)=>n+(id===free?0:metamagicCost(id)),0);
 return {...spend(c,'Sorcery Points',cost),...(free?{apotheosisUsed:true}:{})};
}
