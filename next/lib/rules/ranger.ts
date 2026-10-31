import type {Character,Spell} from '../domain/character';
export const favoredUses=(level:number)=>level>=17?6:level>=13?5:level>=9?4:level>=5?3:2;
export const isHuntersMark=(s:Spell)=>!s.homebrewId&&/^(Hunter['’]s Mark)$/i.test(s.nameEn);
export const markDie=(c:Character)=>c.classNameEn==='Ranger'&&c.level>=20?'1d10':'1d6';
const defs:[number,string,string,string][]=[
 [1,'Spellcasting','施法','使用感知施法；依遊俠等級準備法術，獵人印記始終準備且不占名額。長休可替換一個已備法術。'],
 [1,'Favored Enemy','宿敵','獵人印記始終準備，依遊俠等級可免費施放2至6次，長休回滿。仍需附贈動作與專注。'],
 [2,'Deft Explorer','熟練探索者','選一項已有熟練、尚未專精的技能取得專精，並學會兩種語言。'],
 [6,'Roving','健行','未穿重甲時速度增加10呎；另獲等同速度的攀爬與游泳速度。'],
 [10,'Tireless','不知疲倦','魔法動作獲得1d8＋感知修正的臨時HP（至少1），感知修正次（至少1次），長休回滿。每次短休力竭減1級。'],
 [13,'Relentless Hunter','不懈獵手','受到傷害不會中斷你對獵人印記的專注；其他中斷專注的原因仍適用。'],
 [14,'Nature’s Veil','自然面紗','附贈動作獲得隱形，直到你的下回合結束。感知修正次（至少1次），長休回滿。'],
 [17,'Precise Hunter','精準獵手','對自己獵人印記所標記的生物進行攻擊骰時具有優勢。'],
 [18,'Feral Senses','野性感官','獲得30呎盲視。'],
 [20,'Foe Slayer','殺敵者','獵人印記額外傷害骰由1d6改為1d10。'],
];
export function backfillRanger(c:Character):Character{
 if(c.classNameEn!=='Ranger')return c;
 const features=[...c.features];
 for(const [lv,en,name,description] of defs.filter(([lv])=>lv<=c.level)){
 const i=features.findIndex(f=>!f.isCustom&&f.nameEn.replaceAll("'",'’')===en);const f={name,nameEn:en,description,source:`職業：遊俠 Lv${lv}`,isCustom:false};if(i<0)features.push(f);else features[i]={...features[i],...f};
 }
 const resources=[...c.resources];
 const add=(name:string,en:string,max:number)=>{const i=resources.findIndex(r=>r.nameEn.replaceAll("'",'’')===en);const old=i<0?null:resources[i];const r={...old,name,nameEn:en,max,current:old?Math.min(max,Math.max(0,old.current+max-old.max)):max,recovery:'long' as const,display:'pips' as const,dieFaces:0,unit:'次'};if(i<0)resources.push(r);else resources[i]=r;};
 add('宿敵 · 獵人印記','Favored Enemy',favoredUses(c.level));
 if(c.level>=10)add('不知疲倦','Tireless',Math.max(1,c.abilityScores.wis.modifier));
 if(c.level>=14)add('自然面紗','Nature’s Veil',Math.max(1,c.abilityScores.wis.modifier));
 const spells=c.spells.map(s=>isHuntersMark(s)?{...s,alwaysPrepared:true,prepared:true,damage:markDie(c),description:c.level>=20?s.description.replaceAll('1d6','1d10'):s.description}:s);
 if(!spells.some(isHuntersMark))spells.push({name:'獵人印記',nameEn:'Hunter’s Mark',level:1,damage:markDie(c),damageType:'force',description:'附贈動作標記90呎內可見生物，專注至多1小時。每次以攻擊骰命中該目標時追加力場傷害；追蹤目標的感知（察覺或求生）檢定具優勢。目標降至0HP後，可在之後的回合以附贈動作轉移標記。',upgrade:'三至四環專注至多8小時；五環以上至多24小時。',range:'90呎',castingTime:'附贈動作',castKind:'bonus',prepared:true,alwaysPrepared:true,concentration:true});
 return {...c,features,resources,spells};
}
export function rangerAction(c:Character,id:'mark'|'tireless'|'veil',roll?:number):Character{
 const level=id==='mark'?1:id==='tireless'?10:14,en=id==='mark'?'Favored Enemy':id==='tireless'?'Tireless':'Nature’s Veil';
 const r=c.resources.find(r=>r.nameEn===en);if(c.classNameEn!=='Ranger'||c.level<level||!r||r.current<1)throw Error('此能力尚不可用或次數已用完。');
 if(id==='tireless'&&(!Number.isInteger(roll)||roll!<1||roll!>8))throw Error('請填寫1d8的擲骰結果（1–8）。');
 return {...c,resources:c.resources.map(x=>x===r?{...x,current:x.current-1}:x),...(id==='mark'?{concentrationSpell:'獵人印記'}:id==='veil'?{rangerVeilActive:true}:{tempHp:Math.max(c.tempHp,Math.max(1,roll!+c.abilityScores.wis.modifier))})};
}
