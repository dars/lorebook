import {afterEach,describe,expect,it} from 'vitest';
import {Character,parseCharacter,Spell} from '../domain/character';
import {backfillDruid,circleSpellNames,druidAction,formLimits,isLandDruid,landDice,wildShape} from './druid';
import {characterActions,useCharacterStore} from '../state/character-store';
import {recoverArcaneSlots} from './wizard';
import {applyChoices,validateChoices,beginChoiceRest} from './progression/engine';
import {applyLevelUp,planFor} from './level-up';
const druid=(level=20)=>backfillDruid(Character.parse({id:'druid-test',name:'德魯伊',className:'德魯伊',classNameEn:'Druid',subclassEn:'Circle of the Land',level,maxHp:140,currentHp:100,tempHp:2,spellDc:19,proficiencyBonus:6,abilityScores:Object.fromEntries(['str','dex','con','int_','wis','cha'].map(k=>[k,{score:k==='con'?18:k==='wis'?20:10,modifier:k==='con'?4:k==='wis'?5:0}])),spellSlots:[{level:1,total:4,used:3},{level:2,total:3,used:2},{level:5,total:2,used:1},{level:6,total:1,used:1}],progression:{selections:{land:['Temperate'],forms:[JSON.stringify({name:'狼',cr:.25,fly:false})],'elemental-fury':['Potent Spellcasting']}}}));
const load=(c:Character)=>{useCharacterStore.getState().clear();useCharacterStore.getState().load(c);};
afterEach(()=>useCharacterStore.getState().clear());
describe('德魯伊 SRD 5.2.1',()=>{
 it.each([[4,0,1],[6,1,2],[20,0,1]])('短休只回1次：%i級', (level,current,expected)=>{const c=druid(level);c.resources=c.resources.map(r=>r.nameEn==='Wild Shape'?{...r,current}:r);load(c);characterActions.shortRest();expect(wildShape(useCharacterStore.getState().character!)?.current).toBe(expected);expect(useCharacterStore.getState().character!.currentHp).toBe(100);characterActions.longRest();expect(wildShape(useCharacterStore.getState().character!)?.current).toBe(wildShape(c)?.max);});
 it('變身扣次數、給臨時HP、不改HP與施法數值；結束不退費',()=>{const c=druid(),next=druidAction(c,'shape','狼');expect(next.wildShapeForm).toBe('狼');expect(next.tempHp).toBe(20);expect(next.maxHp).toBe(c.maxHp);expect(next.currentHp).toBe(c.currentHp);expect(next.spellDc).toBe(19);expect(wildShape(next)?.current).toBe(3);expect(druidAction(next,'end-form').wildShapeForm).toBeUndefined();expect(druidAction({...c,tempHp:25},'shape','狼').tempHp).toBe(25);expect(()=>druidAction(c,'shape','龍')).toThrow();});
 it('型態CR及飛行限制',()=>{expect(formLimits(2)).toEqual({count:4,cr:.25,fly:false});expect(formLimits(4)).toEqual({count:6,cr:.5,fly:false});expect(formLimits(8)).toEqual({count:8,cr:1,fly:true});});
 it('荒野夥伴可選法術位或變身，不能免費召喚',()=>{const c=druid();expect(druidAction(c,'companion',2).spellSlots[1].used).toBe(3);expect(wildShape(druidAction(c,'companion'))?.current).toBe(3);expect(()=>druidAction(c,'companion',6)).toThrow();});
 it('荒野重生僅耗盡時能換變身，反向每長休一次；新增位長休移除',()=>{let c=druid();expect(()=>druidAction(c,'slot-to-shape',1)).toThrow();c={...c,resources:c.resources.map(r=>r.nameEn==='Wild Shape'?{...r,current:0}:r)};c=druidAction(c,'slot-to-shape',1);expect(wildShape(c)?.current).toBe(1);expect(c.spellSlots[0].used).toBe(4);c=druidAction(c,'shape-to-slot');expect(c.spellSlots[0].used).toBe(3);expect(()=>druidAction(c,'shape-to-slot')).toThrow();const full=druid();full.spellSlots[0].used=0;const extra=druidAction(full,'shape-to-slot');expect(extra.spellSlots[0].total).toBe(5);load(extra);characterActions.longRest();expect(useCharacterStore.getState().character!.spellSlots[0]).toEqual({level:1,total:4,used:0});});
 it('法術位換變身可跨回合重複使用，不受反向轉換已耗盡影響',()=>{
  let c=druid();c.spellSlots[0].used=0;
  c=druidAction(c,'shape-to-slot');
  c={...c,resources:c.resources.map(r=>r.nameEn==='Wild Shape'?{...r,current:0}:r)};
  for(let turn=0;turn<3;turn++){
   c=druidAction(c,'slot-to-shape',1);
   expect(wildShape(c)?.current).toBe(1);
   expect(c.resources.find(r=>r.nameEn==='Wild Resurgence')?.current).toBe(0);
   expect(()=>druidAction(c,'slot-to-shape',1)).toThrow();
   c=druidAction(c,'companion');
  }
  expect(c.spellSlots[0].used).toBe(3);
  expect(wildShape(c)?.current).toBe(0);
 });
 it('常青僅先攻且0次補1，自然術士換單一法術位每長休一次',()=>{const c=druid();expect(()=>druidAction(c,'evergreen')).toThrow();const empty={...c,resources:c.resources.map(r=>r.nameEn==='Wild Shape'?{...r,current:0}:r)};expect(wildShape(druidAction(empty,'evergreen'))?.current).toBe(1);const next=druidAction(c,'magician',3);expect(next.spellSlots.find(s=>s.level===6)?.used).toBe(0);expect(wildShape(next)?.current).toBe(1);expect(()=>druidAction(next,'magician',1)).toThrow();expect(()=>druidAction(druid(19),'evergreen')).toThrow();});
 it('大地之助等級骰與庇所共享變身資源；自訂子職不套用',()=>{expect([3,10,14].map(l=>landDice(druid(l)))).toEqual([2,3,4]);const c=druid();expect(wildShape(druidAction(c,'aid'))?.current).toBe(3);expect(druidAction(c,'sanctuary').natureSanctuaryActive).toBe(true);expect(isLandDruid({...c,customSubclass:{}} as Character)).toBe(false);expect(()=>druidAction({...c,subclassEn:'Other'},'aid')).toThrow();});
 it('自然復甦兩種用途獨立、回復單環<=5及總環預算',()=>{let c=druid(6);expect(()=>recoverArcaneSlots(c,{1:1})).toThrow();c=beginChoiceRest(c,'short');expect(()=>recoverArcaneSlots(c,{6:1})).toThrow();expect(()=>recoverArcaneSlots(c,{2:2})).toThrow();c=recoverArcaneSlots(c,{1:1,2:1});expect(c.spellSlots[0].used).toBe(2);expect(c.resources.find(r=>r.nameEn==='Natural Recovery Casting')?.current).toBe(1);expect(()=>recoverArcaneSlots(c,{1:1})).toThrow();c.spells=[Spell.parse({name:'迷蹤步',nameEn:'Misty Step',level:2,alwaysPrepared:true})];const next=druidAction(c,'circle-cast','Misty Step');expect(next.spellSlots).toEqual(c.spellSlots);expect(next.resources.find(r=>r.nameEn==='Natural Recovery Casting')?.current).toBe(0);expect(circleSpellNames(c)).toContain('Lightning Bolt');expect(()=>druidAction(c,'circle-cast','Cure Wounds')).toThrow();});
 it('補齊能力只保留元素之怒所選分支，19級有恩賜',()=>{const c=druid();expect(c.features.some(f=>f.nameEn==='Primal Strike')).toBe(false);expect(c.features.filter(f=>f.nameEn==='Potent Spellcasting')).toHaveLength(1);expect(c.features.some(f=>f.nameEn==='Land’s Aid')).toBe(true);expect(c.features.some(f=>f.nameEn==='Epic Boon')).toBe(true);expect(parseCharacter(c).resources).toEqual(c.resources);});
 it('同名型態可修正CR及飛行，不耗長休替換；違規值仍擋下',()=>{const c=druid(8);const forms=Array.from({length:8},(_,i)=>JSON.stringify({name:`獸${i}`,cr:0,fly:false}));c.progression!.selections={forms};const fixed=forms.map((f,i)=>i===0?JSON.stringify({name:'獸0',cr:1,fly:true}):f);expect(validateChoices(c,{forms:fixed},{spells:[],items:[]},'backfill',false)).toEqual([]);const saved=applyChoices(c,{forms:fixed},{spells:[],items:[]},'backfill',false);expect(saved.progression!.restSpent.forms).toBeUndefined();expect(validateChoices({...c,level:4},{forms:fixed},{spells:[],items:[]},'backfill',false).length).toBeGreaterThan(0);});
 it.each([11,15])('升級體質+2回溯全部等級HP：%i',level=>{const c=druid(level);const plan=planFor(c,0);const next=applyLevelUp(c,plan,{asi:{CON:2}});expect(next.maxHp-c.maxHp).toBe(plan.averageHp+5+level+plan.speciesHpPerLevel);});
});
