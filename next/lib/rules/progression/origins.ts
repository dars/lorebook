import type {Character} from '@/lib/domain/character';
import {originId,featOriginKey} from './options';
export function backgroundOrigin(c:Character){return c.features.find(f=>!f.isCustom&&f.source.startsWith('背景：'));}
export function fixedBackgroundList(c:Character):string {
 const f=backgroundOrigin(c);
 if(!f||originId(f.name,f.nameEn)!=='Magic Initiate')return '';
 const name=`${f.name} ${f.nameEn}`;
 return /法師|Wizard/.test(name)?'Wizard':/牧師|Cleric/.test(name)?'Cleric':/德魯伊|Druid/.test(name)?'Druid':'';
}
/** 草稿會跨背景／專長切換存活；只接受仍存在的來源，不能由孤立子鍵推斷能力。 */
export function normalizeOrigins(c:Character,input:Record<string,string[]>):Record<string,string[]> {
 const bg=backgroundOrigin(c),bgId=bg?originId(bg.name,bg.nameEn):'';
 let result=input;
 const remove=(key:string)=>{if(result===input)result={...input};delete result[key];};
 for(const key of Object.keys(input)){
  if(key==='background-origin'||key.startsWith('background-origin/')){
   const suffix=key.slice('background-origin'.length);
   if(!bgId || (bgId!=='Magic Initiate'&&['/list','/ability','/cantrips','/spell'].includes(suffix)) || (bgId!=='Skilled'&&suffix==='/skills')) remove(key);
  }
  if(key.startsWith('human-origin/')&&(c.speciesEn!=='Human'||(!input['human-origin']?.includes('Magic Initiate')&&/\/(list|ability|cantrips|spell)$/.test(key))))remove(key);
 }
 const fixed=fixedBackgroundList(c);
 if(fixed&&result['background-origin/list']?.[0]!==fixed)result={...result,'background-origin/list':[fixed]};
 return result;
}
export function magicInitiateSources(c:Character,s:Record<string,string[]>):string[]{
 const sources=new Set<string>();
 const bg=backgroundOrigin(c);
 if(bg&&originId(bg.name,bg.nameEn)==='Magic Initiate')sources.add('background-origin');
 if(c.speciesEn==='Human'&&s['human-origin']?.includes('Magic Initiate'))sources.add('human-origin');
 for(const [key,ids] of Object.entries(s)) if((key.startsWith('feat-origin-')||key.startsWith('invocation-origin-'))&&ids.includes('Magic Initiate'))sources.add(key);
 for(const f of c.features)if(!f.isCustom&&!f.progressionSource&&f.source.startsWith('專長')&&originId(f.name,f.nameEn)==='Magic Initiate')sources.add(featOriginKey(f.source,f.nameEn));
 return [...sources];
}
