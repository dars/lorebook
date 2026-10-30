import {describe,it,expect,afterEach} from 'vitest';
import {Character,Spell,CharacterFeature,parseCharacter} from '../domain/character';
import {CatalogSpell} from '../catalog/types';
import {backfillCleric,channelResource,clericPowers,spendClericPower,preserveLife,discipleHealingBonus,sparkDice} from './cleric';
import {choiceGroups} from './progression/groups';
import {validateChoices,applyChoices} from './progression/engine';
import {changeSelection} from './progression/change-selection';
import {characterActions,useCharacterStore} from '../state/character-store';
const cleric=(level=1)=>backfillCleric(Character.parse({id:'cleric',name:'牧師',className:'牧師',classNameEn:'Cleric',subclass:'生命領域',subclassEn:'Life Domain',speciesEn:'Human',level,proficiencyBonus:6,spellDc:19,spellcastingAbility:'WIS',abilityScores:Object.fromEntries(['str','dex','con','int_','wis','cha'].map(k=>[k,{score:k==='wis'?20:14,modifier:k==='wis'?5:2,proficientSave:false}])),maxHp:101,currentHp:20,spellSlots:[{level:1,total:4,used:2}]}));
const cat={items:[],spells:[['flame','Sacred Flame',0],['mending','Mending',0],['light','Light',0],['guidance','Guidance',0],['resistance','Resistance',0],['spare','Spare the Dying',0],['thaum','Thaumaturgy',0],['bless','Bless',1],['cure','Cure Wounds',1],['bane','Bane',1],['command','Command',1]].map(([id,name,level])=>CatalogSpell.parse({id,name,eng_name:name,level,classes:['Cleric']}))};
const load=(c:ReturnType<typeof cleric>)=>{useCharacterStore.getState().clear();useCharacterStore.getState().load(c);};
afterEach(()=>useCharacterStore.getState().clear());
describe('牧師 SRD 5.2.1 回歸',()=>{
 it('奇術師及職業戲法不能選其他來源已學會的戲法，包含兩個方向',()=>{
  const c=cleric(10),s={'divine-order':['Thaumaturge'],cantrips:['flame'],'human-origin':['Magic Initiate'],'human-origin/list':['Cleric'],'human-origin/ability':['WIS'],'human-origin/cantrips':['mending','light']};
  const groups=choiceGroups(c,cat,s);
  expect(groups.find(g=>g.id==='order-cantrip')?.options.find(o=>o.id==='flame')?.disabledReason).toBeTruthy();
  expect(groups.find(g=>g.id==='cantrips')?.options.find(o=>o.id==='mending')?.disabledReason).toBeTruthy();
  expect(validateChoices(c,{...s,'order-cantrip':['flame']},cat,'backfill',false).some(i=>i.group==='order-cantrip')).toBe(true);
  const prior={...c,cantrips:[Spell.parse({name:'修補術',nameEn:'Mending',level:0,progressionSource:'human-origin/cantrips'})]};
  expect(choiceGroups(prior,cat).find(g=>g.id==='cantrips')?.options.find(o=>o.id==='mending')?.disabledReason).toBeTruthy();
 });
 it('舊角色重複戲法會提示並可補選，不消耗替換額度',()=>{
  const c=cleric(1),selections={cantrips:['mending','flame','guidance'],'human-origin':['Magic Initiate'],'human-origin/list':['Cleric'],'human-origin/ability':['WIS'],'human-origin/cantrips':['mending','light'],'human-origin/spell':['bless']};
  c.progression={selections,grantedSkills:[],grantedTools:[],grantedLanguages:[],restSpent:{}};
  expect(validateChoices(c,selections,cat,'backfill',false).some(i=>i.group==='cantrips')).toBe(true);
  const fixed={...selections,cantrips:['resistance','flame','guidance']};
  expect(validateChoices(c,fixed,cat,'backfill',false)).toEqual([]);
  const saved=applyChoices(c,fixed,cat,'backfill',false);
  expect(saved.cantrips).toHaveLength(5);
  expect(saved.cantrips.filter(s=>s.nameEn==='Mending')).toHaveLength(1);
 });
 it('牧師七個SRD戲法耗盡可明確保留舊重複來源並保存重載',()=>{
  const c=cleric(20),s={cantrips:['flame','guidance','spare','thaum','mending'],'divine-order':['Thaumaturge'],'order-cantrip':['resistance'],'human-origin':['Magic Initiate'],'human-origin/list':['Cleric'],'human-origin/ability':['WIS'],'human-origin/cantrips':['light','mending'],'human-origin/spell':['bless']};
  c.progression={selections:s,grantedSkills:[],grantedTools:[],grantedLanguages:[],restSpent:{}};
  expect(validateChoices(c,s,cat,'backfill',false).some(i=>i.group==='cantrips')).toBe(true);
  const kept={...s,'keep-duplicate:cantrips':['mending']};
  expect(validateChoices(c,kept,cat,'backfill',false)).toEqual([]);
  const saved=parseCharacter(applyChoices(c,kept,cat,'backfill',false));
  expect(saved.cantrips).toHaveLength(7);
  expect(saved.progression!.selections['keep-duplicate:cantrips']).toEqual(['mending']);
  expect(saved.progression!.restSpent).toEqual({});
  expect(validateChoices(saved,saved.progression!.selections,cat,'backfill',false)).toEqual([]);
 });
 it('法術新手選已準備法術明確回傳來源變更，仍保留法術及免費次數',()=>{
  const c={...cleric(1),subclassEn:'',subclass:''};
  const s={'human-origin':['Magic Initiate'],'human-origin/list':['Cleric'],'human-origin/ability':['WIS'],'human-origin/cantrips':['mending','light'],prepared:['bless','cure','bane','command']};
  const changed=changeSelection(c,cat,s,'human-origin/spell',['bless']);
  expect(changed.promoted).toEqual(['Bless']);expect(changed.value.prepared).toEqual(['cure','bane','command']);
  const result=applyChoices(c,changed.value,cat,'backfill',false);const bless=result.spells.find(s=>s.nameEn==='Bless');
  expect(bless?.alwaysPrepared).toBe(true);expect(bless?.castingSources?.some(s=>s.free==='long')).toBe(true);expect(result.resources.some(r=>r.progressionSource==='human-origin/spell/bless')).toBe(true);
 });
 it.each([2,6,18,20])('%i 級短休精確回1次，長休全回且不改最大HP/DC/熟練',level=>{
  const c=cleric(level);c.resources=c.resources.map(r=>({...r,current:0}));load(c);characterActions.shortRest();expect(channelResource(useCharacterStore.getState().character!)?.current).toBe(1);characterActions.longRest();const result=useCharacterStore.getState().character!;expect(channelResource(result)?.current).toBe(channelResource(c)?.max);expect(result.maxHp).toBe(c.maxHp);expect(result.spellDc).toBe(c.spellDc);expect(result.proficiencyBonus).toBe(c.proficiencyBonus);
 });
 it('7級只留下所選分支，補上6級生命領域能力並可重載',()=>{
  const c=cleric(7);c.features=['Divine Strike','Potent Spellcasting','Potent Spellcasting','Subclass Feature'].map(nameEn=>CharacterFeature.parse({name:nameEn==='Subclass Feature'?'子職業特性':nameEn,nameEn,source:'職業：牧師 Lv7'}));
  c.progression={selections:{'blessed-strikes':['Potent Spellcasting']},grantedSkills:[],grantedTools:[],grantedLanguages:[],restSpent:{}};
  const result=parseCharacter(c);expect(result.features.filter(f=>f.nameEn==='Potent Spellcasting')).toHaveLength(1);expect(result.features.some(f=>f.nameEn==='Divine Strike'||f.nameEn==='Subclass Feature')).toBe(false);expect(result.features.some(f=>f.nameEn==='Blessed Healer')).toBe(true);expect(parseCharacter(result)).toEqual(result);
 });
 it('自訂生命領域不套用SRD子職補正',()=>{const c={...cleric(7),subclassEn:'Custom',subclass:'自訂生命'};expect(clericPowers(c).some(p=>p.id==='preserve')).toBe(false);expect(discipleHealingBonus(c,1)).toBe(0);});
 it('火花、驅散與灼燒共用一次引導神力，火花骰按7/13/18級成長',()=>{for(const [lv,n] of [[2,1],[7,2],[13,3],[18,4]])expect(sparkDice(cleric(lv))).toBe(n);const c=cleric(20),result=spendClericPower(c,'turn');expect(channelResource(result)?.current).toBe(channelResource(c)!.current-1);expect(clericPowers(c).find(p=>p.id==='turn')?.description).toContain('不額外扣次數');expect(clericPowers(c).find(p=>p.id==='spark')?.description).toContain('恢復 32');});
 it('10級介入不扣法術位，短休不回、長休回1次',()=>{const c=cleric(10),used=spendClericPower(c,'intervention');expect(used.spellSlots).toEqual(c.spellSlots);expect(()=>spendClericPower(used,'intervention')).toThrow();load(used);characterActions.shortRest();expect(useCharacterStore.getState().character?.resources.find(r=>r.nameEn==='Divine Intervention')?.current).toBe(0);characterActions.longRest();expect(useCharacterStore.getState().character?.resources.find(r=>r.nameEn==='Divine Intervention')?.current).toBe(1);expect(()=>spendClericPower(cleric(9),'intervention')).toThrow();});
 it('祈願術2d4長休冷卻保存且不能提前恢復',()=>{expect(()=>spendClericPower(cleric(19),'intervention',2)).toThrow();expect(()=>spendClericPower(cleric(20),'intervention',9)).toThrow();const used=spendClericPower(cleric(20),'intervention',3);load(parseCharacter(used));for(let n=2;n>=0;n--){characterActions.longRest();const c=useCharacterStore.getState().character!;expect(c.divineInterventionRests).toBe(n);expect(c.resources.find(r=>r.nameEn==='Divine Intervention')?.current).toBe(n?0:1);if(n)expect(()=>spendClericPower(c,'intervention')).toThrow();}});
 it('保存生命總量、半血上限與自己HP同步，生命門徒不加在引導神力',()=>{const c=cleric(20);const result=preserveLife(c,[{name:'自己',current:0,max:1,amount:30,self:true},{name:'同伴',current:0,max:140,amount:70}]);expect(result.currentHp).toBe(50);expect(channelResource(result)?.current).toBe(channelResource(c)!.current-1);expect(()=>preserveLife(c,[{name:'自己',current:20,max:101,amount:31,self:true}])).toThrow();expect(()=>preserveLife(c,[{name:'同伴',current:0,max:300,amount:101}])).toThrow();expect(discipleHealingBonus(c,0)).toBe(0);for(let slot=1;slot<=9;slot++)expect(discipleHealingBonus(c,slot)).toBe(slot+2);});
});
