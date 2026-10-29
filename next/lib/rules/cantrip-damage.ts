import type {Spell} from '@/lib/domain/character';
const dice:Record<string,number>={'Acid Splash':6,'Chill Touch':10,'Fire Bolt':10,'Poison Spray':12,'Ray of Frost':8,'Sacred Flame':8,'Shocking Grasp':8,'Starry Wisp':8,'Thorn Whip':6,'Thunderclap':6,'Vicious Mockery':6,'Produce Flame':8};
/** 只推導 SRD 戲法；不改寫快照，避免重整或升級重複倍乘。 */
export function cantripDamage(s:Spell,level:number):string {
 if(s.level!==0||s.homebrewId)return s.damage;
 const tier=Number(level>=5)+Number(level>=11)+Number(level>=17);
 if(s.nameEn==='Eldritch Blast')return `${tier+1} 道 × 1d10`;
 if(s.nameEn==='True Strike')return tier?`武器傷害＋${tier}d6`:'武器傷害';
 if(s.nameEn==='Shillelagh')return ['1d8','1d10','1d12','2d6'][tier];
 return dice[s.nameEn]?`${tier+1}d${dice[s.nameEn]}`:s.damage;
}
