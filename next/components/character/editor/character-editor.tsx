'use client';

import { useEffect, useState } from 'react';

import type { Character } from '@/lib/domain/character';
import type { ShareRow } from '@/lib/share/actions';
import { computeAc } from '@/lib/rules/ac';
import { attackEntries } from '@/lib/rules/attacks';
import { characterActions, useCharacterStore } from '@/lib/state/character-store';
import { useCharacterSync } from '@/lib/state/sync';
import { Chip, Section, StatBox } from '../primitives';
import { Pips, StepperButton, ToggleChip } from './controls';
import { SharePanel } from './share-panel';

/** SRD 5.2 的狀態異常。內建固定清單，與 App 其他規則資料同哲學。 */
const CONDITIONS = [
  '目盲', '魅惑', '耳聾', '恐懼', '擒抱', '失能', '隱形',
  '麻痺', '石化', '中毒', '倒地', '束縛', '震懾', '昏迷',
];

/** 常用的傷害／治療級距。逐點加減在戰鬥中太慢。 */
const HP_STEPS = [-10, -5, -1, 1, 5, 10];

export function CharacterEditor({
  initial,
  shares,
}: {
  initial: Character;
  shares: ShareRow[];
}) {
  const load = useCharacterStore((s) => s.load);
  const c = useCharacterStore((s) => s.character);
  const dirty = useCharacterStore((s) => s.dirty);
  const syncError = useCharacterStore((s) => s.syncError);

  // 伺服器取得的角色灌進 store。id 變更時重灌——切換角色時不能沿用舊狀態。
  useEffect(() => {
    load(initial);
  }, [initial, load]);

  useCharacterSync();

  // 首次 render 時 store 還是空的（effect 尚未跑），先用伺服器資料墊著，
  // 避免閃一下空白。
  const ch = c ?? initial;
  const ac = computeAc(ch);
  const attacks = attackEntries(ch);

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-lg pb-4xl">
      <header className="flex items-baseline justify-between pt-xl">
        <div>
          <h1 className="font-display text-title text-gold">{ch.name}</h1>
          <p className="text-small text-text-light">
            {[ch.species, ch.className, ch.subclass].filter(Boolean).join(' · ')}
            {` · ${ch.level} 級`}
          </p>
        </div>
        <SyncBadge dirty={dirty} error={syncError} />
      </header>

      <Section id="hp" title="生命值" titleEn="HIT POINTS">
        <div className="flex flex-wrap items-center gap-md">
          <StatBox label="生命值" value={`${ch.currentHp}/${ch.maxHp}`} />
          <StatBox label="護甲等級" value={ac.value} sub={ac.label} />
          {ch.tempHp > 0 && <StatBox label="臨時生命值" value={ch.tempHp} />}
        </div>

        <div className="mt-md flex flex-wrap gap-sm">
          {HP_STEPS.map((d) => (
            <StepperButton
              key={d}
              label={d < 0 ? `扣 ${-d} 點生命值` : `回復 ${d} 點生命值`}
              onClick={() => characterActions.adjustHp(d)}
            >
              {d > 0 ? `+${d}` : d}
            </StepperButton>
          ))}
        </div>

        <TempHpInput current={ch.tempHp} />
      </Section>

      <Section id="conditions" title="狀態" titleEn="CONDITIONS">
        <div className="flex flex-wrap gap-sm">
          {CONDITIONS.map((name) => (
            <ToggleChip
              key={name}
              active={ch.conditions.includes(name)}
              onClick={() => characterActions.toggleCondition(name)}
            >
              {name}
            </ToggleChip>
          ))}
        </div>
        {ch.concentrationSpell && (
          <div className="mt-md flex items-center gap-sm">
            <Chip tone="gold">專注：{ch.concentrationSpell}</Chip>
            <StepperButton
              label="結束專注"
              onClick={() => characterActions.setConcentration(null)}
            >
              結束
            </StepperButton>
          </div>
        )}
      </Section>

      {ch.spellSlots.length > 0 && (
        <Section id="slots" title="法術位" titleEn="SPELL SLOTS">
          {ch.spellSlots.map((s) => (
            <div key={s.level} className="flex items-center gap-md py-sm">
              <span className="w-16 shrink-0 text-small text-text-secondary">
                {s.level} 環
              </span>
              <Pips
                total={s.total}
                used={s.used}
                label={`${s.level} 環法術位`}
                onChange={(d) => characterActions.adjustSpellSlot(s.level, d)}
              />
              <span className="text-small text-gold">
                {s.total - s.used}/{s.total}
              </span>
            </div>
          ))}
        </Section>
      )}

      {ch.resources.length > 0 && (
        <Section id="resources" title="職業資源" titleEn="RESOURCES">
          {ch.resources.map((r) => (
            <div key={r.name} className="flex items-center gap-md py-sm">
              <span className="w-24 shrink-0 text-small text-text-secondary">
                {r.name}
                {r.dieFaces > 0 && ` d${r.dieFaces}`}
              </span>
              {/* 數字池（如聖療之觸的 HP）用加減鈕；次數型用點數格。 */}
              {r.display === 'number' ? (
                <>
                  <StepperButton
                    label={`${r.name} 減 5`}
                    onClick={() => characterActions.adjustResource(r.name, -5)}
                  >
                    −5
                  </StepperButton>
                  <span className="text-body text-gold">
                    {r.current}/{r.max} {r.unit}
                  </span>
                  <StepperButton
                    label={`${r.name} 加 5`}
                    onClick={() => characterActions.adjustResource(r.name, 5)}
                  >
                    +5
                  </StepperButton>
                </>
              ) : (
                <>
                  <Pips
                    total={r.max}
                    used={r.max - r.current}
                    label={r.name}
                    onChange={(d) => characterActions.adjustResource(r.name, d)}
                  />
                  <span className="text-small text-gold">
                    {r.current}/{r.max}
                  </span>
                </>
              )}
            </div>
          ))}
        </Section>
      )}

      <Section id="share" title="分享" titleEn="SHARE">
        <SharePanel characterId={ch.id} initial={shares} />
      </Section>

      <Section id="attacks" title="攻擊" titleEn="ATTACKS">
        <table className="w-full text-body">
          <thead>
            <tr className="text-left text-tiny text-text-secondary">
              <th className="py-xs font-normal">名稱</th>
              <th className="py-xs font-normal">命中</th>
              <th className="py-xs font-normal">傷害</th>
            </tr>
          </thead>
          <tbody>
            {attacks.map((a, i) => (
              <tr key={`${a.name}-${i}`} className="border-t border-border-2">
                <td className="py-sm">
                  {a.name}
                  {a.quantity > 1 && (
                    <span className="text-text-secondary"> ×{a.quantity}</span>
                  )}
                </td>
                <td className="py-sm text-gold">
                  {a.hitBonus === null
                    ? '—'
                    : a.hitBonus >= 0
                      ? `+${a.hitBonus}`
                      : a.hitBonus}
                </td>
                <td className="py-sm">
                  {a.damage ?? '—'}
                  {a.damageType && (
                    <span className="text-tiny text-text-secondary">
                      {' '}
                      {a.damageType}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>
    </main>
  );
}

/** 臨時 HP：2024 規則不疊加，取較高者——此處以「設定為」而非「增加」表達。 */
function TempHpInput({ current }: { current: number }) {
  const [value, setValue] = useState('');

  return (
    <div className="mt-md flex items-center gap-sm">
      <label htmlFor="temp-hp" className="text-small text-text-secondary">
        臨時生命值
      </label>
      <input
        id="temp-hp"
        type="number"
        inputMode="numeric"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={String(current)}
        className="min-h-11 w-20 rounded-chip border border-border bg-surface-2 px-sm text-body text-text-primary"
      />
      <StepperButton
        label="設定臨時生命值"
        onClick={() => {
          const n = Number(value);
          if (Number.isFinite(n)) {
            // 不疊加，取較高者（2024 規則）。
            characterActions.setTempHp(Math.max(n, current));
            setValue('');
          }
        }}
      >
        設定
      </StepperButton>
    </div>
  );
}

/**
 * 同步狀態。持續可見而非只在失敗時閃一次——使用者要能隨時知道自己的變更
 * 是否已經上雲，尤其在收訊不穩的場合。
 */
function SyncBadge({ dirty, error }: { dirty: boolean; error: string | null }) {
  if (error) return <Chip tone="danger">同步失敗</Chip>;
  if (dirty) return <Chip>未同步</Chip>;
  return <Chip tone="gold">已同步</Chip>;
}
