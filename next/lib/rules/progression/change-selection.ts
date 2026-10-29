import type {Character} from '@/lib/domain/character';
import {choiceGroups,type ChoiceCatalog,type Selections} from './groups';
import {normalizePreparedSelections} from './granted-spells';
/** 換清單只移除不再合資格的法術；跨清單仍可選的法術與施法屬性不必重填。 */
export function changeSelection(c:Character,catalog:ChoiceCatalog,current:Selections,id:string,ids:string[]){
 const value=normalizePreparedSelections(c,current,catalog.spells);
 const next={...value,[id]:ids};
 const removed:string[]=[];
 if(id.endsWith('/list')&&value[id]?.[0]!==ids[0]){
  const source=id.slice(0,-5),groups=choiceGroups(c,catalog,next);
  for(const suffix of ['/cantrips','/spell']){
   const key=source+suffix,options=groups.find(g=>g.id===key)?.options??[];
   if(!next[key])continue;
   next[key]=next[key].filter(old=>{
    const eligible=options.some(o=>o.id===old&&!o.disabledReason);
    if(!eligible)removed.push(catalog.spells.find(s=>s.id===old)?.name??'舊法術');
    return eligible;
   });
  }
 }
 return {value:next,removed};
}
