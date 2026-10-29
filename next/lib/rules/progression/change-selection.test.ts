import {describe,it,expect} from 'vitest';
import {Character} from '@/lib/domain/character';
import {CatalogSpell} from '@/lib/catalog/types';
import {changeSelection} from './change-selection';
const c=Character.parse({id:'switch',name:'測試',classNameEn:'Wizard',speciesEn:'Human',level:1,abilityScores:Object.fromEntries(['str','dex','con','int_','wis','cha'].map(k=>[k,{score:10,modifier:0,proficientSave:false}]))});
const catalog={items:[],spells:[['light','光亮術',0,['Wizard','Cleric']],['hand','法師之手',0,['Wizard']],['shield','護盾術',1,['Wizard']],['bless','祝福術',1,['Cleric']]].map(([id,name,level,classes])=>CatalogSpell.parse({id,name,eng_name:id,level,classes}))};
const old={'human-origin':['Magic Initiate'],'human-origin/list':['Wizard'],'human-origin/ability':['INT'],'human-origin/cantrips':['light','hand'],'human-origin/spell':['shield'],'unrelated':['keep']};
describe('更換法術新手清單',()=>{
 it('清掉不適用法術，保留跨清單法術、施法屬性與其他選項',()=>{
  const result=changeSelection(c,catalog,old,'human-origin/list',['Cleric']);
  expect(result.removed).toEqual(['法師之手','護盾術']);
  expect(result.value['human-origin/cantrips']).toEqual(['light']);
  expect(result.value['human-origin/spell']).toEqual([]);
  expect(result.value['human-origin/ability']).toEqual(['INT']);
  expect(result.value.unrelated).toEqual(['keep']);
  expect(old['human-origin/cantrips']).toEqual(['light','hand']);
 });
 it('同一清單與其他欄位變更不會清除法術',()=>{
  expect(changeSelection(c,catalog,old,'human-origin/list',['Wizard']).removed).toEqual([]);
  expect(changeSelection(c,catalog,old,'human-origin/ability',['WIS']).value['human-origin/spell']).toEqual(['shield']);
 });
 it('不影響背景那一組的已選法術',()=>{
  const value={...old,'background-origin/list':['Wizard'],'background-origin/cantrips':['hand']};
  const background={...c,features:[{name:'法術新手（法師）',nameEn:'Magic Initiate',source:'背景：賢者',isCustom:false,description:''}]};
  expect(changeSelection(background,catalog,value,'human-origin/list',['Cleric']).value['background-origin/cantrips']).toEqual(['hand']);
 });
});
