import {describe,it,expect} from 'vitest';
import {Character,parseCharacter} from '@/lib/domain/character';
import {backfillPaladin,paladinPowers,spendPaladinPower,restoreNimbus,shortRestResource} from './paladin';
import {applyLevelUp,planFor} from './level-up';
import {showCantrips} from './cantrips-visible';
import {CatalogSpell} from '@/lib/catalog/types';
import {normalizePreparedSelections} from './progression/granted-spells';
import {applyChoices,validateChoices} from './progression/engine';
const paladin=(level=3)=>backfillPaladin(Character.parse({id:'paladin',name:'測試',classNameEn:'Paladin',subclassEn:'Oath of Devotion',level,maxHp:30,currentHp:10,spellcastingAbility:'CHA',spellDc:14,hitDieFaces:10,abilityScores:Object.fromEntries(['str','dex','con','int_','wis','cha'].map(k=>[k,{score:14,modifier:2}]))}));
describe('聖騎士動作與共用資源',()=>{
 it('神聖感知與神聖武器消耗同一份引導神力，耗盡不能使用',()=>{
  const c=paladin();const a=spendPaladinPower(c,'sense');const b=spendPaladinPower(a,'weapon');
  expect(b.resources.find(r=>r.nameEn==='Channel Divinity')?.current).toBe(0);
  expect(()=>spendPaladinPower(b,'sense')).toThrow();expect(()=>spendPaladinPower(paladin(2),'sense')).toThrow();
  expect(paladinPowers(c).find(p=>p.id==='weapon')?.kind).toBe('free');
 });
 it('資源回填保留消耗，短休只恢復一次，11級共有三次',()=>{
  const c=paladin(11);c.resources=c.resources.map(r=>({...r,current:0}));
  expect(parseCharacter(c).resources).toEqual(c.resources);
  const r=c.resources.find(r=>r.nameEn==='Channel Divinity')!;
  expect(r.max).toBe(3);expect(shortRestResource(c,r).current).toBe(1);
 });
 it('聖療可治療自己並解除多個狀態，每種另花五點',()=>{
  const c=paladin(14);c.conditions=['中毒','目盲','被擒抱'];
  const result=spendPaladinPower(c,'lay',8,['中毒','目盲'],true);
  expect(result.currentHp).toBe(18);expect(result.conditions).toEqual(['被擒抱']);
  expect(result.resources.find(r=>r.nameEn==='Lay on Hands')?.current).toBe(52);
  expect(spendPaladinPower(c,'lay',8,[],false).currentHp).toBe(10);
  expect(()=>spendPaladinPower(paladin(13),'lay',0,['目盲'])).toThrow();
  expect(()=>spendPaladinPower(c,'lay',71)).toThrow();
  expect(()=>spendPaladinPower(c,'lay',-1)).toThrow();
 });
 it('靈光不建立虛構次數，18級擴為30呎',()=>{
  expect(paladinPowers(paladin(18)).find(p=>p.id==='aura')).toMatchObject({kind:'passive',description:expect.stringContaining('30 呎')});
  expect(paladinPowers(paladin(18)).find(p=>p.id==='aura')?.resource).toBeUndefined();
 });
 it('神聖光環使用與5環恢復皆更新原資源',()=>{
  const c=paladin(20);c.spellSlots=[{level:5,total:2,used:0}];
  const spent=spendPaladinPower(c,'nimbus');const restored=restoreNimbus(spent);
  expect(restored.resources.find(r=>r.nameEn==='Holy Nimbus')?.current).toBe(1);expect(restored.spellSlots[0].used).toBe(1);
  expect(()=>restoreNimbus(restored)).toThrow();
 });
 it('自創誓言不套奉獻之誓能力，名稱修復不改自訂能力',()=>{
  const c=paladin();c.subclassEn='Custom';expect(paladinPowers(c).some(p=>p.id==='weapon')).toBe(false);
  c.features=[{name:'靈光擴充套件',nameEn:'Aura Expansion',description:'',source:'職業',isCustom:false},{name:'自訂光耀',nameEn:'Radiant Strikes',description:'',source:'自訂',isCustom:true}];
  expect(backfillPaladin(c).features.map(f=>f.name)).toEqual(['靈光擴展','自訂光耀']);
 });
 it('無戲法時隱藏空區塊，祝福戰士保留入口',()=>{
  const c=paladin();expect(showCantrips(c)).toBe(false);
  c.progression={selections:{style:['Blessed Warrior']},grantedSkills:[],grantedTools:[],grantedLanguages:[],restSpent:{}};expect(showCantrips(c)).toBe(true);
 });
 it('體質提升回溯全部等級，預覽不依賴其他選項完成',()=>{
  const c=paladin(3);const result=applyLevelUp(c,planFor(c,0),{asi:{CON:2}});
  expect(result.maxHp).toBe(42); // 30 + 本級(6+3) + 前三級各1
  expect(result.abilityScores.con.modifier).toBe(3);
 });
});
it('信仰之盾改為誓言法術後自動釋出準備名額，不再報不合資格',()=>{
 const c=paladin();const spells=['Shield of Faith','Protection from Evil and Good','Divine Smite','Bless','Command','Cure Wounds','Heroism'].map((name,i)=>CatalogSpell.parse({id:String(i),name,eng_name:name,level:1,classes:['Paladin']}));
 const cat={spells,items:[],feats:[]};const old={prepared:['0','3','4','5']};
 const normalized=normalizePreparedSelections(c,old,spells);expect(normalized.prepared).toEqual(['3','4','5']);
 expect(validateChoices(c,old,cat,'level',false).map(i=>i.message)).toEqual([]);
 const result=applyChoices(c,{prepared:['0','3','4','5','6']},cat,'level',false);
 expect(result.spells.find(s=>s.nameEn==='Shield of Faith')).toMatchObject({alwaysPrepared:true,progressionSource:'automatic'});
 expect(result.progression?.selections.prepared).toEqual(['3','4','5','6']);
});
