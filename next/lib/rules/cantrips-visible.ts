import type {Character} from '@/lib/domain/character';
import {CANTRIPS_KNOWN} from './level-tables';
import {originId} from './progression/options';
export function showCantrips(c:Character):boolean {
 return c.cantrips.length>0 || (CANTRIPS_KNOWN[c.classNameEn]?.[c.level-1]??0)>0 || Object.values(c.progression?.selections??{}).some(v=>v.some(x=>['Blessed Warrior','Druidic Warrior','Magic Initiate'].includes(x))) || c.features.some(f=>!f.isCustom&&originId(f.name,f.nameEn)==='Magic Initiate');
}
