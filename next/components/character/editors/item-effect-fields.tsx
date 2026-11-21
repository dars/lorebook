'use client';

import type { ComponentProps } from 'react';
import type { EquipmentEffect } from '@/lib/domain/character';
import { EQUIPMENT_ABILITIES, equipmentEffectLabel } from '@/lib/rules/equipment-effects';

const inputClass = 'block h-11 min-h-11 w-full min-w-0 rounded-chip border border-border bg-surface-2 px-3 text-body leading-normal text-text-primary';
/** Safari 的原生選單會壓縮高度，明確指定外觀並以同一個箭頭對齊輸入框。 */
function EffectSelect({ className = '', ...props }: ComponentProps<'select'>) {
  return <span className={`relative block w-full min-w-0 ${className}`}>
    <select {...props} className={`${inputClass} appearance-none pr-10`} />
    <svg aria-hidden viewBox="0 0 20 20" fill="none" className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-text-secondary">
      <path d="m5 7.5 5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  </span>;
}

const defaults = (kind: EquipmentEffect['kind']): EquipmentEffect => {
  switch (kind) {
    case 'abilityFloor': return { kind, ability: 'str', value: 19 };
    case 'abilityBonus': return { kind, ability: 'str', value: 2, max: 20 };
    case 'acBonus': return { kind, value: 1 };
    case 'weaponBonus': return { kind, attack: 1, damage: 1 };
  }
};

export function ItemEffectFields({ effects, weapon, onChange }: {
  effects: EquipmentEffect[];
  weapon: boolean;
  onChange: (effects: EquipmentEffect[]) => void;
}) {
  const update = (index: number, effect: EquipmentEffect) => onChange(effects.map((old, i) => i === index ? effect : old));
  return <section aria-label="裝備效果" className="mt-5 border-t border-border/40 pt-4">
    <h3 className="text-body font-semibold text-text-primary">裝備效果</h3>
    <p className="mt-1 text-small leading-relaxed text-text-secondary">穿戴且符合同調條件時自動套用；卸下後恢復基礎數值。敘述文字不會自動套用。</p>
    <div className="mt-3 space-y-3">
      {effects.map((effect, i) => <fieldset key={i} className="rounded-card border border-border p-3">
        <legend className="px-1 text-small text-text-secondary">效果 {i + 1}</legend>
        <div className="flex items-center gap-2">
          <EffectSelect aria-label={`效果 ${i + 1} 類型`} value={effect.kind} onChange={e => update(i, defaults(e.target.value as EquipmentEffect['kind']))}>
            <option value="abilityFloor">能力值下限（至少為）</option>
            <option value="abilityBonus">能力值加值</option>
            <option value="acBonus">AC 加值</option>
            {weapon && <option value="weaponBonus">此武器命中／傷害加值</option>}
          </EffectSelect>
          <button type="button" aria-label={`移除效果 ${i + 1}`} className="min-h-11 shrink-0 px-2 text-small text-danger" onClick={() => onChange(effects.filter((_, index) => index !== i))}>移除</button>
        </div>
        <div className="mt-3 grid grid-cols-2 items-start gap-2">
          {'ability' in effect && <label className="text-small text-text-secondary">能力
            <EffectSelect aria-label={`效果 ${i + 1} 能力`} value={effect.ability} className="mt-1" onChange={e => update(i, { ...effect, ability: e.target.value as typeof effect.ability })}>
              {EQUIPMENT_ABILITIES.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
            </EffectSelect>
          </label>}
          {'value' in effect && <label className="text-small text-text-secondary">{effect.kind === 'abilityFloor' ? '最低數值' : '增加數值'}
            <input aria-label={`效果 ${i + 1} 數值`} type="number" inputMode="numeric" min={1} max={effect.kind === 'abilityFloor' ? 30 : 10} value={Number.isNaN(effect.value) ? '' : effect.value} className={`${inputClass} mt-1`} onChange={e => update(i, { ...effect, value: e.target.value === '' ? NaN : Number(e.target.value) })} />
          </label>}
          {effect.kind === 'abilityBonus' && <label className="col-span-2 text-small text-text-secondary">能力上限（留空為 30）
            <input aria-label={`效果 ${i + 1} 上限`} type="number" inputMode="numeric" min={1} max={30} value={effect.max ?? ''} className={`${inputClass} mt-1`} onChange={e => update(i, { ...effect, max: e.target.value === '' ? undefined : Number(e.target.value) })} />
          </label>}
          {effect.kind === 'weaponBonus' && (['attack', 'damage'] as const).map((key, j) => <label key={key} className="text-small text-text-secondary">{j === 0 ? '命中加值' : '傷害加值'}
            <input aria-label={`效果 ${i + 1} ${j === 0 ? '命中' : '傷害'}加值`} type="number" inputMode="numeric" min={0} max={10} value={Number.isNaN(effect[key]) ? '' : effect[key]} className={`${inputClass} mt-1`} onChange={e => update(i, { ...effect, [key]: e.target.value === '' ? NaN : Number(e.target.value) })} />
          </label>)}
        </div>
        {!Object.values(effect).some(value => typeof value === 'number' && !Number.isFinite(value)) && <p className="mt-2 text-small text-gold">{equipmentEffectLabel(effect)}</p>}
      </fieldset>)}
    </div>
    <button type="button" disabled={effects.length >= 12} className="mt-2 min-h-11 rounded-chip border border-border-2 px-3 text-small text-gold disabled:opacity-40" onClick={() => onChange([...effects, defaults('abilityFloor')])}>＋ 新增效果</button>
    {!effects.length && <p className="mt-1 text-small text-text-secondary">一般物品可留空。護手可設定「力量至少為 19」。</p>}
  </section>;
}
