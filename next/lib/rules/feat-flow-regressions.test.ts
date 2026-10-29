import {it,expect} from 'vitest';
import {Character} from '@/lib/domain/character';
import {CatalogFeat} from '@/lib/catalog/types';
import featsJson from './fixtures/srd-feats.json';
import {catalogFeatFeature} from './feats';
import {choiceGroups} from './progression/groups';
import {validateChoices} from './progression/engine';
it('升級選起源專長：無重複野蠻打擊與選滿三項技藝精湛皆可通過',()=>{for(const name of ['Savage Attacker','Skilled']){
const feats=CatalogFeat.array().parse(featsJson);const f=feats.find(f=>f.eng_name===name)!;
const c=Character.parse({id:'x',name:'x',classNameEn:'Fighter',level:4,abilityScores:Object.fromEntries(["str","dex","con","int_","wis","cha"].map(k=>[k,{score:14,modifier:2}])),features:[catalogFeatFeature(f,4)]});
const cat={spells:[],items:[],feats,handledFeatLevel:4};
const groups=choiceGroups(c,cat);const s=Object.fromEntries(groups.filter(g=>g.kind==='mixed').map(g=>[g.id,g.options.slice(0,3).map(o=>o.id)]));
expect(validateChoices(c,s,cat,'level',false),name).toEqual([]);
}});

import {featPrereqUnmet} from './feats';
const make = () => Character.parse({id:'x',name:'x',classNameEn:'Fighter',level:4,abilityScores:Object.fromEntries(['str','dex','con','int_','wis','cha'].map(k=>[k,{score:14,modifier:2}]))});
it('只有中文的背景野蠻打擊也要在選單提示已取得',()=>{
 const c=make();c.features=[{name:'野蠻打擊',nameEn:'',source:'背景：士兵',description:'',isCustom:false}];
 const f=CatalogFeat.array().parse(featsJson).find(f=>f.eng_name==='Savage Attacker')!;
 expect(featPrereqUnmet(f,c,4)).toBe('已取得此專長');
});
it('人類與背景可重複取得技藝精湛，三項熟練各自記錄',()=>{
 const c=make();c.speciesEn='Human';c.features=[{name:'技藝精湛',nameEn:'',source:'背景：自訂背景',description:'',isCustom:false}];
 const cat={spells:[],items:[],feats:[],handledFeatLevel:4};
 const s={'human-origin':['Skilled'],'background-origin/skills':['skill:Arcana','skill:History','skill:Investigation'],'human-origin/skills':['skill:Medicine','skill:Nature','skill:Religion']};
 expect(validateChoices(c,s,cat,'level',false)).toEqual([]);
});

it('延後舊選擇不能跳過本級技藝精湛的三項熟練',()=>{
 const c=make();const feats=CatalogFeat.array().parse(featsJson);c.features=[catalogFeatFeature(feats.find(f=>f.eng_name==='Skilled')!,4)];
 expect(validateChoices(c,{}, {spells:[],items:[],feats,handledFeatLevel:4},'level',false)).toEqual([expect.objectContaining({message:'需選 3 項，目前 0 項。'})]);
});
