'use client';

import { useEffect } from 'react';

import { CollapsibleSection } from '@/components/ui/collapsible-section';
import { ParchmentCard } from '@/components/ui/decorations';
import type { Character } from '@/lib/domain/character';
import { computeAc } from '@/lib/rules/ac';
import { attackEntries } from '@/lib/rules/attacks';
import {
  characterActions,
  useCharacterStore,
} from '@/lib/state/character-store';
import { useCharacterSync } from '@/lib/state/sync';

/**
 * 行動頁，對照 Flutter 端的 `DecisionPage`。
 *
 * 區段順序照搬：STATUS 狀態 → RESOURCES 資源 → MOVEMENT 移動 → ACTION 動作。
 * 這個順序不是隨意的——跑團輪到你時的思考順序就是「我現在怎麼樣 → 我還有什麼
 * → 我能走多遠 → 我要做什麼」。
 */

/** SRD 5.2 狀態異常。 */
const CONDITIONS = [
  '目盲', '魅惑', '耳聾', '恐懼', '擒抱', '失能', '隱形',
  '麻痺', '石化', '中毒', '倒地', '束縛', '震懾', '昏迷',
];

const sign = (n: number) => (n >= 0 ? `+${n}` : `${n}`);

export function DecisionView({ initial }: { initial: Character }) {
  const load = useCharacterStore((s) => s.load);
  const stored = useCharacterStore((s) => s.character);
  const dirty = useCharacterStore((s) => s.dirty);
  const syncError = useCharacterStore((s) => s.syncError);

  useEffect(() => {
    load(initial);
  }, [initial, load]);
  useCharacterSync();

  const c = stored ?? initial;
  const ac = computeAc(c);
  const attacks = attackEntries(c);
  const hpRatio = c.maxHp > 0 ? c.currentHp / c.maxHp : 0;

  return (
    <div className="mx-auto w-full max-w-[700px] px-4">
      <CollapsibleSection
        en="STATUS"
        cn="狀態"
        first
        trailing={<SyncBadge dirty={dirty} error={syncError} />}
      >
        <ParchmentCard className="p-3">
          <div className="flex items-center">
            {/* HP */}
            <div className="flex flex-1 flex-col items-center">
              <span className="font-label text-[9px] tracking-[1.5px] text-section-label">
                HIT POINTS
              </span>
              <div className="mt-1 flex items-center gap-2">
                <StepBtn label="扣 1 點生命值" onClick={() => characterActions.adjustHp(-1)}>
                  −
                </StepBtn>
                <span className="font-display text-[28px] font-bold leading-none text-gold">
                  {c.currentHp}
                </span>
                <span className="text-[13px] text-text-secondary">
                  /{c.maxHp}
                </span>
                <StepBtn label="回復 1 點生命值" onClick={() => characterActions.adjustHp(1)}>
                  ＋
                </StepBtn>
              </div>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-hp-bar-bg">
                <div
                  className="h-full rounded-full bg-hp-full transition-[width]"
                  style={{ width: `${Math.max(0, Math.min(1, hpRatio)) * 100}%` }}
                />
              </div>
              {c.tempHp > 0 && (
                <span className="mt-1.5 rounded-chip border border-temp-hp px-2 py-0.5 text-[11px] text-temp-hp">
                  臨時 {c.tempHp}
                </span>
              )}
            </div>

            <span className="mx-2 h-[100px] w-px bg-border/40" />

            {/* AC 盾牌 */}
            <div className="relative w-16 shrink-0">
              <svg viewBox="0 0 100 122" preserveAspectRatio="none" className="w-full" aria-hidden>
                <path
                  d="M50 0 L100 7.3 L100 67.1 Q100 100 50 122 Q0 100 0 67.1 L0 7.3 Z"
                  className="fill-surface-2 stroke-border"
                  strokeWidth={1.5}
                  vectorEffect="non-scaling-stroke"
                />
              </svg>
              <span className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-display text-[24px] font-bold leading-none text-gold">
                  {ac.value}
                </span>
                <span className="font-label text-[8px] tracking-wider text-text-secondary">
                  AC
                </span>
              </span>
            </div>

            <span className="mx-2 h-[100px] w-px bg-border/40" />

            {/* 專注 */}
            <div className="flex flex-1 flex-col items-center">
              <span className="font-label text-[9px] tracking-[1.5px] text-section-label">
                CONCENTRATION
              </span>
              {c.concentrationSpell ? (
                <>
                  <span className="mt-1 text-center text-[14px] text-gold">
                    {c.concentrationSpell}
                  </span>
                  <button
                    type="button"
                    onClick={() => characterActions.setConcentration(null)}
                    className="mt-1.5 min-h-9 rounded-chip border border-border px-3 text-[12px] text-text-secondary"
                  >
                    結束專注
                  </button>
                </>
              ) : (
                <span className="mt-2 text-[13px] text-text-secondary">
                  未專注
                </span>
              )}
            </div>
          </div>

          <div className="my-2 h-px bg-border/40" />

          <div className="flex flex-wrap gap-1.5">
            {CONDITIONS.map((name) => {
              const on = c.conditions.includes(name);
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => characterActions.toggleCondition(name)}
                  aria-pressed={on}
                  className={`min-h-9 rounded-chip border px-2.5 text-[12px] ${
                    on
                      ? 'border-danger bg-danger/10 text-danger'
                      : 'border-border-2 text-text-secondary'
                  }`}
                >
                  {name}
                </button>
              );
            })}
          </div>
        </ParchmentCard>
      </CollapsibleSection>

      {(c.spellSlots.length > 0 || c.resources.length > 0) && (
        <CollapsibleSection en="RESOURCES" cn="資源">
          <ParchmentCard className="px-4 py-2">
            {c.spellSlots.map((s) => (
              <div key={`slot-${s.level}`} className="flex items-center gap-3 py-2">
                <span className="w-14 shrink-0 text-[12px] text-text-secondary">
                  {s.level} 環
                </span>
                <Pips
                  total={s.total}
                  used={s.used}
                  label={`${s.level} 環法術位`}
                  onChange={(d) => characterActions.adjustSpellSlot(s.level, d)}
                />
                <span className="ml-auto text-[13px] text-gold">
                  {s.total - s.used}/{s.total}
                </span>
              </div>
            ))}
            {c.resources.map((r) => (
              <div key={r.name} className="flex items-center gap-3 py-2">
                <span className="w-14 shrink-0 truncate text-[12px] text-text-secondary">
                  {r.name}
                </span>
                {r.display === 'number' ? (
                  <span className="flex items-center gap-2">
                    <StepBtn label={`${r.name} 減 5`} onClick={() => characterActions.adjustResource(r.name, -5)}>−5</StepBtn>
                    <span className="text-[13px] text-gold">
                      {r.current}/{r.max} {r.unit}
                    </span>
                    <StepBtn label={`${r.name} 加 5`} onClick={() => characterActions.adjustResource(r.name, 5)}>+5</StepBtn>
                  </span>
                ) : (
                  <>
                    <Pips
                      total={r.max}
                      used={r.max - r.current}
                      label={r.name}
                      onChange={(d) => characterActions.adjustResource(r.name, d)}
                    />
                    <span className="ml-auto text-[13px] text-gold">
                      {r.current}/{r.max}
                      {r.dieFaces > 0 && ` · d${r.dieFaces}`}
                    </span>
                  </>
                )}
              </div>
            ))}
          </ParchmentCard>
        </CollapsibleSection>
      )}

      <CollapsibleSection en="MOVEMENT" cn="移動">
        <ParchmentCard className="flex items-center justify-around px-4 py-3">
          {[
            { v: c.speed.replace(/[^0-9]/g, ''), s: '速度' },
            { v: `${Math.floor(Number(c.speed.replace(/[^0-9]/g, '') || 0) / 2)}`, s: '困難地形' },
            { v: sign(c.initiative), s: '先攻' },
          ].map((x) => (
            <span key={x.s} className="flex flex-col items-center">
              <span className="font-display text-[20px] font-bold text-gold">
                {x.v}
              </span>
              <span className="text-[10px] text-text-primary/55">{x.s}</span>
            </span>
          ))}
        </ParchmentCard>
      </CollapsibleSection>

      <CollapsibleSection en="ACTION" cn="動作">
        <ParchmentCard className="px-4">
          {attacks.map((a, i) => (
            <div
              key={`${a.name}-${i}`}
              className={`flex items-baseline justify-between gap-3 py-2 ${i > 0 ? 'border-t border-border/40' : ''}`}
            >
              <span className="text-[14px] text-text-primary">
                {a.name}
                {a.quantity > 1 && (
                  <span className="ml-1 text-[12px] text-text-secondary">
                    ×{a.quantity}
                  </span>
                )}
              </span>
              <span className="shrink-0 text-[13px]">
                <span className="text-gold">
                  {a.hitBonus === null ? '—' : sign(a.hitBonus)}
                </span>
                <span className="ml-2 text-text-light">{a.damage ?? '—'}</span>
                {a.damageType && (
                  <span className="ml-1 text-[11px] text-text-secondary">
                    {a.damageType}
                  </span>
                )}
              </span>
            </div>
          ))}
        </ParchmentCard>
      </CollapsibleSection>
    </div>
  );
}

function StepBtn({
  onClick,
  children,
  label,
}: {
  onClick: () => void;
  children: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="flex size-9 items-center justify-center rounded-full border border-border text-[16px] text-text-primary active:border-gold"
    >
      {children}
    </button>
  );
}

/** 點數格：點亮的＝可用，點它消耗；點暗的＝已消耗，點它回復。 */
function Pips({
  total,
  used,
  onChange,
  label,
}: {
  total: number;
  used: number;
  onChange: (delta: number) => void;
  label: string;
}) {
  return (
    <span className="flex flex-wrap gap-1">
      {Array.from({ length: total }, (_, i) => {
        const spent = i < used;
        return (
          <button
            key={i}
            type="button"
            onClick={() => onChange(spent ? 1 : -1)}
            aria-label={`${label} 第 ${i + 1} 格，${spent ? '已消耗，點擊回復' : '未消耗，點擊消耗'}`}
            className={`size-5 rounded-full border ${
              spent
                ? 'border-crystal-empty bg-crystal-empty'
                : 'border-gold bg-crystal-active'
            }`}
          />
        );
      })}
    </span>
  );
}

function SyncBadge({ dirty, error }: { dirty: boolean; error: string | null }) {
  const cls = 'rounded-chip border px-2 py-0.5 text-[10px]';
  if (error) return <span className={`${cls} border-danger text-danger`}>同步失敗</span>;
  if (dirty) return <span className={`${cls} border-border-2 text-text-secondary`}>未同步</span>;
  return <span className={`${cls} border-gold text-gold`}>已同步</span>;
}
