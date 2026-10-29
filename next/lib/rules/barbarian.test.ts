import {describe,it,expect} from 'vitest';
import {Character,Equipment,parseCharacter} from '../domain/character';
import {backfillBarbarian,movementFeet,setRage,rageDamage} from './barbarian';
import {shortRestResource} from './paladin';
import {attackEntries,attacksPerAction} from './attacks';
import {applyLevelUp,planFor} from './level-up';
import {computeAc} from './ac';
const barb=(level=1)=>Character.parse({id:'barb',name:'野蠻人',className:'野蠻人',classNameEn:'Barbarian',subclass:'狂戰士道途',subclassEn:'Path of the Berserker',level,speed:'30 ft',maxHp:100,currentHp:80,hitDieFaces:12,proficiencyBonus:6,abilityScores:Object.fromEntries(['str','dex','con','int_','wis','cha'].map(k=>[k,{score:k==='str'?21:k==='con'?20:12,modifier:k==='str'||k==='con'?5:1,proficientSave:false}])),resources:[{name:'狂暴',nameEn:'Rage',current:0,max:level===1?2:6,recovery:'long'}]});
describe('野蠻人 SRD 5.2.1',()=>{
 it('短休在所有等級精確恢復一次，不受舊 recovery 欄位影響',()=>{for(let lv=1;lv<=20;lv++){const c=barb(lv);expect(shortRestResource(c,c.resources[0]).current).toBe(1);expect(shortRestResource(c,{...c.resources[0],current:3,max:6,recovery:'short'}).current).toBe(4);expect(shortRestResource(c,{...c.resources[0],current:6,max:6}).current).toBe(6);}});
 it('啟動扣一次、重複啟動不扣、結束不退費，停止專注',()=>{const c=barb();c.resources[0].current=2;c.concentrationSpell='測試';const active=setRage(c,true);expect(active.resources[0].current).toBe(1);expect(active.concentrationSpell).toBeNull();expect(setRage(active,true)).toEqual(active);expect(setRage(active,false).resources[0].current).toBe(1);expect(()=>setRage(barb(),true)).toThrow();});
 it('狂暴傷害依等級加在力量攻擊，敏捷遠程不加',()=>{for(const [lv,bonus] of [[1,2],[9,3],[16,4]]){const c=barb(lv);c.raging=true;c.equipment=[Equipment.parse({name:'巨劍',nameEn:'Greatsword',itemType:'weapon',equipped:true,damage:'2d6'}),Equipment.parse({name:'長弓',nameEn:'Longbow',itemType:'weapon',equipped:true,damage:'1d8'})];expect(rageDamage(c)).toBe(bonus);expect(attackEntries(c).map(a=>a.damage)).toEqual([`2d6+${5+bonus}`,'1d8+1',String(6+bonus)]);}});
 it('快速移動受等級與重甲限制，額外攻擊只影響攻擊動作',()=>{expect(movementFeet(barb(4))).toBe(30);expect(movementFeet(barb(5))).toBe(40);const c=barb(20);c.equipment=[Equipment.parse({name:'板甲',itemType:'armor',armorCategory:'heavy',equipped:true})];expect(movementFeet(c)).toBe(30);c.resources[0].current=1;expect(()=>setRage(c,true)).toThrow();expect(attacksPerAction(barb(4))).toBe(1);expect(attacksPerAction(barb(20))).toBe(2);});
 it('舊20級補正力量體質及HP/AC且重新載入不重複',()=>{const c=parseCharacter(barb(20));expect(c.abilityScores.str.score).toBe(25);expect(c.abilityScores.con.score).toBe(24);expect(c.maxHp).toBe(140);expect(c.currentHp).toBe(120);expect(computeAc(c).value).toBe(18);expect(parseCharacter(c)).toEqual(c);expect(c.resources[0].current).toBe(0);});
 it('19升20也只套用一次，能力和子職名稱完整',()=>{const c=barb(19);const next=applyLevelUp(c,planFor(c,0),{});expect(next.abilityScores.con.score).toBe(24);expect(next.maxHp).toBe(152);expect(parseCharacter(next)).toEqual(next);expect(next.features.map(f=>f.name)).toEqual(expect.arrayContaining(['狂暴','無甲防禦','無心狂暴','報復','威嚇氣勢','精通殘暴打擊','精通殘暴打擊：增強']));});
 it('自訂子職不替換成狂戰士',()=>{const c=barb(10);c.subclassEn='Custom';c.subclass='自訂';expect(backfillBarbarian(c).features.some(f=>f.nameEn==='Retaliation')).toBe(false);});
});
