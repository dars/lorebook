import {it,expect} from 'vitest';
import {Character,parseCharacter} from '@/lib/domain/character';
import {displayedCharacter} from './displayed-character';
const c=(level:number,id='a')=>Character.parse({id,name:'測試',level,abilityScores:Object.fromEntries(['str','dex','con','int_','wis','cha'].map(k=>[k,{score:10,modifier:0}]))});
it('頁首隨角色升級，不保留layout的舊等級',()=>{
 expect(displayedCharacter(c(3),c(4)).level).toBe(4);
 expect(displayedCharacter(c(4),c(3)).level).toBe(4);
 expect(displayedCharacter(c(3),null).level).toBe(3);
 expect(displayedCharacter(c(3,'b'),c(4)).id).toBe('b');
});
it('同一角色的名稱等即時修改也會反映到頁首',()=>{
 const local={...c(4),name:'新名稱'};
 expect(displayedCharacter(c(4),local)).toBe(local);
});
it('只修復舊SRD專長的壞字串，不覆寫自創或其他說明',()=>{
 const description="技能或type=tool;artisan's tools;instrument;gaming set熟練";
 const initial=c(4);initial.features=[{name:'技藝精湛',nameEn:'Skilled',source:'專長：Lv4',description,isCustom:false},{name:'法術新手',nameEn:'Magic Initiate',source:'背景',description:'level=0;1、level=0;1或level=0;1法術列表',isCustom:false},{name:'自訂',nameEn:'Skilled',source:'自訂',description,isCustom:true}];
 const repaired=parseCharacter(initial);
 expect(repaired.features.map(f=>f.description)).toEqual(['技能或工具熟練','牧師、德魯伊或法師法術列表',description]);
 expect(parseCharacter(repaired)).toEqual(repaired);
});
