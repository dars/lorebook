import {describe,it,expect} from 'vitest';
import {Character,parseCharacter} from '@/lib/domain/character';
import {deriveClassResources} from './class-resources';
import {levelUpFeatIssue,planFor,syncClassResources} from './level-up';
import {applyStartingEquipment} from './progression/equipment';
import {CatalogItem} from '@/lib/catalog/types';
import {computeAc} from './ac';
import {attackEntries} from './attacks';
const fighter=(level=1)=>Character.parse({id:'fighter',name:'測試戰士',classNameEn:'Fighter',level,abilityScores:Object.fromEntries(['str','dex','con','int_','wis','cha'].map(k=>[k,{score:14,modifier:2}]))});
describe('戰士連續升級回歸',()=>{
 it.each([[8,0],[9,1],[12,1],[13,2],[16,2],[17,3],[20,3]])('%i 級不屈不撓為 %i 次', (lv,max)=>{
  const r=deriveClassResources('Fighter',lv,fighter().abilityScores).find(r=>r.nameEn==='Indomitable');
  expect(r?.max??0).toBe(max);if(r)expect(r.recovery).toBe('long');
 });
 it('資源升級只補新次數，舊卡補缺項不回復已用資源',()=>{
  const c=fighter(20);c.resources=deriveClassResources('Fighter',20,c.abilityScores).filter(r=>r.nameEn!=='Indomitable').map(r=>({...r,current:0}));
  const loaded=parseCharacter(c);expect(loaded.resources.find(r=>r.nameEn==='Indomitable')?.current).toBe(3);
  expect(loaded.resources.filter(r=>r.nameEn!=='Indomitable').every(r=>r.current===0)).toBe(true);
  const spent={...loaded,resources:loaded.resources.map(r=>({...r,current:0}))};expect(parseCharacter(spent)).toEqual(spent);
  const existing=deriveClassResources('Fighter',12,c.abilityScores).map(r=>({...r,current:0}));
  expect(syncClassResources(existing,'Fighter',13,c.abilityScores).find(r=>r.nameEn==='Indomitable')).toMatchObject({current:1,max:2});
 });
 it.each([4,6,8,12,14,16,19])('升到 %i 級必須分配能力值或選專長',level=>{
  const c=fighter(level-1);expect(planFor(c,0).hasAsi).toBe(true);
  expect(levelUpFeatIssue(c,{})).toBeTruthy();expect(levelUpFeatIssue(c,{asi:{STR:1}})).toBeTruthy();
  expect(levelUpFeatIssue(c,{asi:{STR:2}})).toBeNull();
  expect(levelUpFeatIssue(c,{feat:{name:'所選專長',nameEn:'Boon of Combat Prowess',description:'',source:'專長',isCustom:false}})).toBeNull();
 });
 it('18 級不是戰士 ASI 等級，能力值已20不能浪費提升',()=>{
  expect(planFor(fighter(17),0).hasAsi).toBe(false);const c=fighter(5);c.abilityScores.str.score=20;
  expect(levelUpFeatIssue(c,{asi:{STR:2}})).toBeTruthy();
 });
 it('新建戰士組合A穿戴鎖子甲，防禦風格AC17且列出巨劍攻擊',()=>{
  const items=[CatalogItem.parse({id:'armor',name:'鎖子甲',eng_name:'Chain Mail',category:'armor',armor_category:'heavy',ac_base:16}),CatalogItem.parse({id:'sword',name:'巨劍',eng_name:'Greatsword',category:'weapon',damage_dice:'2d6'}),...['Flail','Javelin',"Dungeoneer's Pack"].map(n=>CatalogItem.parse({id:n,name:n,eng_name:n}))];
  const c=fighter();c.features.push({name:'防禦',nameEn:'Defense',source:'職業',description:'',isCustom:false});
  const result=applyStartingEquipment(c,{equipment:['0']},items,true);
  expect(computeAc(result).value).toBe(17);expect(attackEntries(result).some(a=>a.nameEn==='Greatsword')).toBe(true);
  expect(applyStartingEquipment(c,{equipment:['0']},items).equipment.every(e=>!e.equipped)).toBe(true);
 });
});

import {choiceGroups} from './progression/groups';
it('本次19級專長由主表單處理，補選頁仍保留缺漏的19級選擇',()=>{
 const c=fighter(19);const catalog={spells:[],items:[],feats:[]};
 expect(choiceGroups(c,catalog).some(g=>g.id==='feat-19')).toBe(true);
 expect(choiceGroups(c,{...catalog,handledFeatLevel:19}).some(g=>g.id==='feat-19')).toBe(false);
 expect(choiceGroups(c,{...catalog,handledFeatLevel:19}).some(g=>g.id==='feat-16')).toBe(true);
});

import {fighterActions,backfillFighterFeatures} from './fighter-features';
it('舊戰士補第二風，不重複新增或覆蓋說明',()=>{
 const c=fighter(20);const filled=backfillFighterFeatures(c);
 expect(filled.features.filter(f=>f.nameEn==='Second Wind')).toHaveLength(1);
 expect(backfillFighterFeatures(filled)).toBe(filled);
 expect(parseCharacter(c).features.some(f=>f.nameEn==='Second Wind')).toBe(true);
});
it('第二風屬附贈動作，動作如潮不耗動作並沿用剩餘次數',()=>{
 const c=fighter(20);c.resources=deriveClassResources('Fighter',20,c.abilityScores).map(r=>({...r,current:0}));
 expect(fighterActions(c)).toEqual(expect.arrayContaining([expect.objectContaining({nameEn:'Second Wind',kind:'bonus',value:'恢復 1d10＋20 HP',meta:'剩餘 0/4 次'}),expect.objectContaining({nameEn:'Action Surge',kind:'free',meta:'剩餘 0/2 次'})]));
 expect(fighterActions(fighter(1))).toHaveLength(1);
 expect(fighterActions({...c,classNameEn:'Wizard'})).toEqual([]);
});
