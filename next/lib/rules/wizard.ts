import type {Character, CharacterFeature} from '@/lib/domain/character';
export const WIZARD_FEATURES: (CharacterFeature & {level:number})[] = [
 {level:1,name:'施法',nameEn:'Spellcasting',source:'職業：法師 Lv1',isCustom:false,description:'以智力施放法師法術。法術書起始記錄六個一環法術，每次法師升級再加入兩個符合環數的法術。長休後可更換準備法術。'},
 {level:1,name:'儀式專家',nameEn:'Ritual Adept',source:'職業：法師 Lv1',isCustom:false,description:'法術書中具有儀式標記的法術可讀書以儀式施放，不必準備該法術。'},
 {level:1,name:'奧術回復',nameEn:'Arcane Recovery',source:'職業：法師 Lv1',isCustom:false,description:'完成短休時可恢復已消耗的法術位，總環數至多法師等級的一半（進位），且不能恢復六環以上法術位。使用後須長休才能再次使用。'},
 {level:5,name:'記憶法術',nameEn:'Memorize Spell',source:'職業：法師 Lv5',isCustom:false,description:'每次完成短休後，可將一個職業已備法術替換成法術書中另一個法術。'},
 {level:18,name:'法術精通',nameEn:'Spell Mastery',source:'職業：法師 Lv18',isCustom:false,description:'選擇書中一個一環與一個二環、施法時間為動作的法術，始終準備且可用最低環隨意施放。升環仍消耗法術位；每次長休後可替換其中一個。'},
];
export function backfillWizard(c:Character):Character {
 if(c.classNameEn!=='Wizard')return c;
 const resources=c.resources.map(r=>r.name==='奧術回復'?{...r,nameEn:'Arcane Recovery'}:r);
 if(!resources.some(r=>r.nameEn==='Arcane Recovery'))resources.push({name:'奧術回復',nameEn:'Arcane Recovery',current:1,max:1,recovery:'long',display:'pips',dieFaces:0,unit:''});
 return {...c,resources,features:[...c.features,...WIZARD_FEATURES.filter(f=>f.level<=c.level&&!c.features.some(x=>!x.isCustom&&(x.nameEn===f.nameEn||x.name===f.name))).map(f=>({name:f.name,nameEn:f.nameEn,source:f.source,description:f.description,isCustom:f.isCustom}))]};
}
export function recoverArcaneSlots(c:Character,counts:Record<number,number>):Character {
 if(c.classNameEn!=='Wizard'||c.progression?.rest!=='short')throw Error('請先完成短休，再使用奧術回復。');
 const resource=c.resources.find(r=>r.nameEn==='Arcane Recovery');
 if(!resource||resource.current<1)throw Error('奧術回復已使用，須長休後恢復。');
 let total=0;
 for(const [key,n] of Object.entries(counts)){
  const level=Number(key),slot=c.spellSlots.find(s=>s.level===level);
  if(!Number.isInteger(level)||level<1||level>5||!Number.isInteger(n)||n<0||!slot||n>slot.used)throw Error('只能恢復已消耗的一至五環法術位。');
  total+=level*n;
 }
 if(total<1||total>Math.ceil(c.level/2))throw Error(`本次可恢復的總環數為 1 至 ${Math.ceil(c.level/2)}。`);
 return {...c,spellSlots:c.spellSlots.map(s=>({...s,used:s.used-(counts[s.level]??0)})),resources:c.resources.map(r=>r===resource?{...r,current:r.current-1}:r)};
}
