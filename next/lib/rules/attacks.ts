import {hasInvocation,pactAttacks} from './warlock';
import {sneakDice} from './rogue';
import {martialArtsActive,martialDie,monkWeapon} from './monk';
import { rageActive, rageDamage } from './barbarian';
import type { Character } from '@/lib/domain/character';

/**
 * 攻擊列推導，移植自 Flutter 端 `derived_stats.dart` 的 `attackEntries`。
 * 驗收依據為 golden/attack_entries.json。
 */

export type AttackEntry = {
  name: string;
  nameEn: string;
  /** null = 機制資料不足，僅顯示名稱。 */
  hitBonus: number | null;
  damage: string | null;
  damageType: string;
  quantity: number;
  unarmed: boolean;
  /** 武器屬性標籤（thrown/versatile…），展開卡片時顯示。 */
  properties: string[];
  sneakAttack?: string;
  mastery?: string;
};

/**
 * 攻擊列 ＝ 裝備中的武器 ＋ **固定一列徒手攻擊**。
 *
 * 武器命中＝屬性調整值（finesse 取力／敏較高）＋熟練；傷害＝傷害骰＋同屬性
 * 調整值。徒手（2024 全角色皆有）：命中＝力調＋熟練，傷害＝1＋力調，下限 0。
 */
export function attackEntries(c: Character): AttackEntry[] {
  const str = c.abilityScores.str.modifier;
  const dex = c.abilityScores.dex.modifier;
  const prof = c.proficiencyBonus;
  const martial=martialArtsActive(c), die=martialDie(c.level), unarmedMod=martial?Math.max(str,dex):str;

  const entries: AttackEntry[] = [];

  for (const e of c.equipment) {
    if (e.itemType !== 'weapon' || !e.equipped) continue;

    if (e.damage === '') {
      // 缺機制資料：降級為僅顯示名稱，不猜測數值。
      entries.push({
        name: e.name,
        nameEn: e.nameEn,
        hitBonus: null,
        damage: null,
        damageType: '',
        quantity: e.quantity,
        unarmed: false,
        properties: e.properties,
      });
      continue;
    }

    const ranged = ['Dart','Shortbow','Sling','Light Crossbow','Blowgun','Hand Crossbow','Heavy Crossbow','Longbow','Pistol','Musket'].includes(e.nameEn);
    const archery = ranged && c.features.some(f=>!f.isCustom&&f.nameEn==='Archery') ? 2 : 0;
    const monk=martial&&monkWeapon(e);
    const mod = (e.finesse||monk) ? Math.max(str, dex) : ranged ? dex : str;
    const usesStrength = (e.finesse||monk) ? str >= dex : !ranged;
    const damageMod = mod + (usesStrength && rageActive(c) ? rageDamage(c) : 0);
    const baseDamage=monk&&/^1d(\d+)$/.test(e.damage)&&Number(e.damage.slice(2))<die?`1d${die}`:e.damage;
    const damage = damageMod === 0 ? baseDamage : `${baseDamage}${damageMod > 0 ? `+${damageMod}` : `${damageMod}`}`;

    entries.push({
      name: e.name,
      nameEn: e.nameEn,
      hitBonus: mod + prof + archery,
      damage,
      damageType: e.damageType,
      quantity: e.quantity,
      unarmed: false,
      properties: e.properties,
      ...(c.classNameEn==='Rogue'&&(e.finesse||ranged)?{sneakAttack:`${sneakDice(c.level)}d6`}:{}),
      ...weaponMastery(c,e.nameEn),
    });
  }

  if(c.pactWeapon&&hasInvocation(c,'Pact of the Blade')){
    const w=c.pactWeapon,mod=c.abilityScores.cha.modifier;
    entries.push({name:`契約武器 · ${w.name}`,nameEn:w.nameEn,hitBonus:mod+prof,damage:`${w.damage}${mod>=0?'+':''}${mod}`,damageType:w.damageType,quantity:1,unarmed:false,properties:[`${w.damageType} 傷害`,...(['Glaive','Greataxe','Greatsword','Halberd','Lance','Maul','Pike'].includes(w.nameEn)&&c.abilityScores.str.score<13?['重型武器：力量未達13，攻擊擲骰具有劣勢。']:[]),`魅力攻擊 · 每個攻擊動作${pactAttacks(c)}次（僅限契約武器）`,'可作施法法器；離身超過5呎滿1分鐘或死亡時解除契約。']});
  }
  entries.push({
    name: '徒手攻擊',
    nameEn: 'Unarmed Strike',
    hitBonus: unarmedMod + prof,
    damage: martial?`1d${die}${unarmedMod===0?'':unarmedMod>0?`+${unarmedMod}`:unarmedMod}`:`${Math.max(0, 1 + str + (rageActive(c) ? rageDamage(c) : 0))}`,
    damageType: 'bludgeoning',
    quantity: 1,
    unarmed: true,
    properties: [],
  });

  return entries;
}

export function attacksPerAction(c:Character):number {
 if(c.classNameEn==='Fighter')return c.level>=20?4:c.level>=11?3:c.level>=5?2:1;
 return ['Barbarian','Monk','Paladin','Ranger'].includes(c.classNameEn)&&c.level>=5?2:1;
}

function weaponMastery(c:Character,name:string):{mastery?:string}{
 const feature=c.features.find(f=>!f.isCustom&&f.nameEn===name&&(f.progressionSource==='mastery'||f.name.startsWith('武器精通')));
 if(!feature)return {};
 const property=feature.description.match(/\b(Cleave|Graze|Nick|Push|Sap|Slow|Topple|Vex)\b/i)?.[0];
 return property?{mastery:property}:{};
}
