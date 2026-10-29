import {describe,it,expect} from 'vitest';
import {Character,parseCharacter,Spell} from '@/lib/domain/character';
import {CatalogSpell} from '@/lib/catalog/types';
import {choiceGroups} from './groups';
import {applyChoices,validateChoices,beginChoiceRest} from './engine';
import {normalizePreparedSelections} from './granted-spells';
import {memorizeSpellUses} from '../wizard';
const spell=(id:string,level=0,classes=['Wizard','Cleric','Druid'])=>CatalogSpell.parse({id,name:id,eng_name:id,level,classes,casting_time:[{unit:'action'}]});
const spells=[spell('Light'),spell('Mage Hand',0,['Wizard']),spell('Guidance'),spell('Resistance'),spell('Healing',1),...Array.from({length:30},(_,i)=>spell(`book${i}`,i<2?3:1))];
const catalog={spells,items:[]};
const sage=()=>Character.parse({id:'old-wizard',name:'舊資料測試',classNameEn:'Wizard',className:'法師',speciesEn:'Human',level:20,maxHp:120,currentHp:70,spellDc:19,spellSlots:[{level:1,total:4,used:2}],abilityScores:Object.fromEntries(['str','dex','con','int_','wis','cha'].map(k=>[k,{score:10,modifier:0,proficientSave:false}])),features:[{name:'法術新手（法師）',nameEn:'Magic Initiate',source:'背景：賢者',description:'',isCustom:false}],spellbook:spells.filter(s=>s.level>0).map(s=>Spell.parse({name:s.name,nameEn:s.eng_name,level:s.level}))});
describe('起源選項與舊法師保存回歸',()=>{
 it('固定背景清單不會被舊人類重複清單鎖死，舊人類可改選',()=>{
  const c=sage();c.progression={selections:{'human-origin':['Magic Initiate'],'human-origin/list':['Wizard'],'background-origin/list':['Wizard']},grantedSkills:[],grantedTools:[],grantedLanguages:[],restSpent:{}};
  const groups=choiceGroups(c,catalog);
  expect(groups.find(g=>g.id==='background-origin/list')?.options.map(o=>[o.id,o.disabledReason])).toEqual([['Wizard',undefined]]);
  expect(groups.find(g=>g.id==='human-origin/list')?.options.filter(o=>!o.disabledReason).map(o=>o.id)).toEqual(['Cleric','Druid']);
  const s={...c.progression.selections,'human-origin/list':['Cleric']};
  expect(validateChoices(c,s,catalog,'backfill',false)).toEqual([]);
  const saved=applyChoices(c,s,catalog,'backfill',false);
  const loaded=parseCharacter(JSON.parse(JSON.stringify(saved)));
  expect(loaded.progression?.selections['human-origin/list']).toEqual(['Cleric']);
  expect(validateChoices(loaded,loaded.progression!.selections,catalog,'backfill',false)).toEqual([]);
  expect([loaded.maxHp,loaded.currentHp,loaded.spellDc,loaded.spellSlots]).toEqual([c.maxHp,c.currentHp,c.spellDc,c.spellSlots]);
 });
 it('賢者換士兵後，孤立背景清單不會繼續佔用法師選項',()=>{
  const c=sage();c.features=[{name:'野蠻攻擊者',nameEn:'Savage Attacker',source:'背景：士兵',description:'',isCustom:false}];
  const s={'human-origin':['Magic Initiate'],'background-origin/list':['Wizard'],'background-origin/ability':['INT'],'background-origin/cantrips':['Light'],'background-origin/spell':['Healing']};
  const normalized=normalizePreparedSelections(c,s,spells);
  expect(Object.keys(normalized).some(k=>k.startsWith('background-origin'))).toBe(false);
  expect(choiceGroups(c,catalog,s).find(g=>g.id==='human-origin/list')?.options.every(o=>!o.disabledReason)).toBe(true);
 });
 it('牧師法術新手不能重複學會職業已有的光亮術',()=>{
  const c=sage();const s={'human-origin':['Magic Initiate'],'human-origin/list':['Cleric'],cantrips:['Light','Mage Hand','Guidance','Resistance','missing']};
  expect(choiceGroups(c,catalog,s).find(g=>g.id==='human-origin/cantrips')?.options.find(o=>o.id==='Light')?.disabledReason).toBeTruthy();
  c.cantrips=[Spell.parse({name:'Light',nameEn:'Light',level:0})];
  expect(choiceGroups(c,catalog,{'human-origin':['Magic Initiate'],'human-origin/list':['Cleric']}).find(g=>g.id==='human-origin/cantrips')?.options.find(o=>o.id==='Light')?.disabledReason).toBeTruthy();
 });
 it('25個法術轉成23一般＋2招牌，仍有25個已準備且可保存空名額',()=>{
  const c=sage();c.features=[];c.speciesEn='Elf';
  const prepared=Array.from({length:25},(_,i)=>`book${i}`);
  const initial=applyChoices(c,{prepared},catalog,'backfill',false);
  const s={...initial.progression!.selections,signature:['book0','book1']};
  expect(validateChoices(initial,s,catalog,'backfill',false)).toEqual([]);
  const saved=applyChoices(initial,s,catalog,'backfill',false);
  expect(saved.progression?.selections.prepared).toHaveLength(23);
  expect(saved.spells.filter(s=>s.prepared)).toHaveLength(25);
  expect(saved.spells.filter(s=>s.alwaysPrepared)).toHaveLength(2);
  expect(parseCharacter(JSON.parse(JSON.stringify(saved))).spells).toEqual(saved.spells);
  const filled=applyChoices(saved,{...saved.progression!.selections,prepared:[...saved.progression!.selections.prepared,'book25','book26']},catalog,'backfill',false);
  expect(filled.spells).toHaveLength(27);
 });
 it('記憶法術保存後扣次，重新載入不回復，下次短休才回復',()=>{
  let c=sage();c.features=[];c.speciesEn='Elf';
  c=applyChoices(c,{prepared:Array.from({length:25},(_,i)=>`book${i}`)},catalog,'backfill',false);
  expect(memorizeSpellUses(c)).toBe(0);
  c=beginChoiceRest(c,'short');expect(memorizeSpellUses(c)).toBe(1);
  c=applyChoices(c,{...c.progression!.selections,prepared:[...c.progression!.selections.prepared.slice(1),'book25']},catalog,'rest',false);
  c=parseCharacter(JSON.parse(JSON.stringify(c)));expect(memorizeSpellUses(c)).toBe(0);
  expect(memorizeSpellUses(beginChoiceRest(c,'short'))).toBe(1);
 });
});
