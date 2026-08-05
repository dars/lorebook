'use client';

import { useState } from 'react';

import { ParchmentCard, SectionTitle } from '@/components/ui/decorations';
import { updateCharacter } from '@/lib/characters/actions';
import { SPECIES } from '@/lib/creation/data';
import type { Character } from '@/lib/domain/character';
import { applyLevelUp, planFor } from '@/lib/rules/level-up';

/**
 * 升級流程，對照 Flutter 端的 `CharacterLevelUpPage`。
 *
 * 一頁到底而非多步驟精靈：升級的選項少（HP、ASI、子職），拆成多步只是增加
 * 點擊。建角步驟多才需要分步。
 *
 * 預覽顯示的是 `applyLevelUp` 的實際輸出，與存下的完全相同。
 */
const ABILITY_LABEL: Record<string, string> = {
  STR: '力量', DEX: '敏捷', CON: '體質',
  INT: '智力', WIS: '感知', CHA: '魅力',
};
const CODES = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'];

export function LevelUpView({ initial }: { initial: Character }) {
  const speciesHpPerLevel =
    SPECIES.find((s) => s.cn === initial.species)?.hpPerLevel ?? 0;
  const plan = planFor(initial, speciesHpPerLevel);

  const [hpMode, setHpMode] = useState<'average' | 'roll'>('average');
  const [roll, setRoll] = useState<number | ''>('');
  const [asiMode, setAsiMode] = useState<'2' | '1+1'>('2');
  const [asiA, setAsiA] = useState<string | null>(null);
  const [asiB, setAsiB] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const asi: Record<string, number> = !plan.hasAsi
    ? {}
    : asiMode === '2'
      ? (asiA ? { [asiA]: 2 } : {})
      : asiA && asiB && asiA !== asiB
        ? { [asiA]: 1, [asiB]: 1 }
        : {};

  const asiReady =
    !plan.hasAsi ||
    (asiMode === '2' ? asiA !== null : asiA !== null && asiB !== null && asiA !== asiB);
  const hpReady =
    hpMode === 'average' || (typeof roll === 'number' && roll >= 1 && roll <= plan.hitDieFaces);

  const preview = applyLevelUp(initial, plan, {
    hpRoll: hpMode === 'roll' && typeof roll === 'number' ? roll : null,
    asi,
  });

  const submit = async () => {
    setBusy(true);
    const r = await updateCharacter(preview);
    if (r.error) {
      setError(r.error);
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto w-full max-w-[700px] flex-1 px-4 pb-32">
      <div className="pt-5">
        <div className="font-label text-[10px] tracking-[1.5px] text-section-label">
          LEVEL UP
        </div>
        <div className="mt-1 flex items-baseline gap-2">
          <span className="font-display text-[28px] font-bold text-text-secondary">
            {initial.level}
          </span>
          <span className="text-gold">→</span>
          <span className="font-display text-[36px] font-bold text-gold">
            {plan.targetLevel}
          </span>
          <span className="ml-2 text-[13px] text-text-light">
            {initial.name}・{initial.className}
          </span>
        </div>
      </div>

      <SectionTitle en="HIT POINTS" cn="生命值" />
      <ParchmentCard className="px-4 py-3">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setHpMode('average')}
            className={`min-h-11 flex-1 rounded-card border text-[13px] ${
              hpMode === 'average'
                ? 'border-gold bg-gold/10 text-gold'
                : 'border-border-2 text-text-secondary'
            }`}
          >
            取平均值（{plan.averageHp}）
          </button>
          <button
            type="button"
            onClick={() => setHpMode('roll')}
            className={`min-h-11 flex-1 rounded-card border text-[13px] ${
              hpMode === 'roll'
                ? 'border-gold bg-gold/10 text-gold'
                : 'border-border-2 text-text-secondary'
            }`}
          >
            自行擲骰
          </button>
        </div>
        {hpMode === 'roll' && (
          <div className="mt-3">
            {/* App 不代擲——與其他擲骰處一致。 */}
            <p className="mb-2 text-[12px] text-text-secondary">
              擲 d{plan.hitDieFaces} 後把結果填進來。
            </p>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={plan.hitDieFaces}
              value={roll}
              onChange={(e) =>
                setRoll(e.target.value === '' ? '' : Number(e.target.value))
              }
              className="min-h-11 w-24 rounded-chip border border-border bg-surface-2 px-3 text-center text-[14px] text-text-primary"
            />
          </div>
        )}
        <p className="mt-3 text-[12px] text-text-secondary">
          最大生命值 {initial.maxHp} → <span className="text-gold">{preview.maxHp}</span>
          {speciesHpPerLevel > 0 && `（含${initial.species}每級 +${speciesHpPerLevel}）`}
        </p>
      </ParchmentCard>

      {plan.hasAsi && (
        <>
          <SectionTitle en="ABILITY SCORE" cn="屬性值提升" />
          <ParchmentCard className="px-4 py-3">
            <div className="flex gap-2">
              {(['2', '1+1'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => {
                    setAsiMode(m);
                    setAsiB(null);
                  }}
                  className={`min-h-11 flex-1 rounded-card border text-[13px] ${
                    asiMode === m
                      ? 'border-gold bg-gold/10 text-gold'
                      : 'border-border-2 text-text-secondary'
                  }`}
                >
                  {m === '2' ? '一項 +2' : '兩項各 +1'}
                </button>
              ))}
            </div>
            <div className="mt-3 flex flex-col gap-2">
              <AbilityPicker
                label={asiMode === '2' ? '+2 給誰' : '第一項 +1'}
                value={asiA}
                exclude={asiMode === '1+1' ? asiB : null}
                scores={initial}
                onPick={setAsiA}
              />
              {asiMode === '1+1' && (
                <AbilityPicker
                  label="第二項 +1"
                  value={asiB}
                  exclude={asiA}
                  scores={initial}
                  onPick={setAsiB}
                />
              )}
            </div>
            <p className="mt-2 text-[11px] text-text-secondary">
              分數上限 20；已達上限的能力不會再提升。
            </p>
          </ParchmentCard>
        </>
      )}

      {plan.pickSubclass && (
        <>
          <SectionTitle en="SUBCLASS" cn="子職業" />
          <ParchmentCard className="px-4 py-3">
            <p className="text-[12px] leading-relaxed text-text-secondary">
              3 級選子職業。子職清單需要內容庫，目前尚未接入——升級後可於角色卡
              補選，數值不受影響。
            </p>
          </ParchmentCard>
        </>
      )}

      <SectionTitle en="PREVIEW" cn="升級後" />
      <div className="grid grid-cols-3 gap-2">
        {[
          ['生命值', `${preview.maxHp}`, `${initial.maxHp}`],
          ['熟練加值', `+${preview.proficiencyBonus}`, `+${initial.proficiencyBonus}`],
          ['被動察覺', `${preview.passivePerception}`, `${initial.passivePerception}`],
        ].map(([k, v, old]) => (
          <ParchmentCard key={k} className="py-3">
            <div className="flex flex-col items-center">
              <span className="font-display text-[22px] font-bold text-gold">{v}</span>
              <span className="text-[10px] text-text-secondary">
                {old !== v ? `原 ${old}` : '未變'}
              </span>
              <span className="mt-0.5 text-[10px] text-text-primary/55">{k}</span>
            </div>
          </ParchmentCard>
        ))}
      </div>

      {preview.spellSlots.length > 0 && (
        <ParchmentCard className="mt-2 px-4 py-3">
          <div className="text-[12px] text-text-secondary">法術位</div>
          <div className="mt-1 flex flex-wrap gap-2">
            {preview.spellSlots.map((s) => (
              <span key={s.level} className="text-[13px] text-gold">
                {s.level} 環 {s.total - s.used}/{s.total}
              </span>
            ))}
          </div>
          <p className="mt-1 text-[11px] text-text-secondary">
            已消耗的法術位不會因升級回復——升級不是休息。
          </p>
        </ParchmentCard>
      )}

      {error && <p className="mt-3 text-[13px] text-danger">{error}</p>}

      <div className="fixed inset-x-0 bottom-0 border-t border-border-2 bg-surface-0 p-4">
        <div className="mx-auto max-w-[700px]">
          <button
            type="button"
            onClick={submit}
            disabled={busy || !asiReady || !hpReady}
            className="min-h-12 w-full rounded-card border border-gold bg-gold/10 text-[14px] font-bold text-gold disabled:opacity-40"
          >
            {busy ? '套用中…' : `確定升到 ${plan.targetLevel} 級`}
          </button>
        </div>
      </div>
    </main>
  );
}

function AbilityPicker({
  label,
  value,
  exclude,
  scores,
  onPick,
}: {
  label: string;
  value: string | null;
  exclude: string | null;
  scores: Character;
  onPick: (v: string) => void;
}) {
  const scoreOf = (code: string) =>
    scores.abilityScores[
      (code === 'INT' ? 'int_' : code.toLowerCase()) as keyof Character['abilityScores']
    ].score;

  return (
    <div>
      <div className="mb-1 text-[12px] text-text-secondary">{label}</div>
      <div className="grid grid-cols-3 gap-1.5">
        {CODES.map((code) => {
          const maxed = scoreOf(code) >= 20;
          return (
            <button
              key={code}
              type="button"
              disabled={code === exclude || maxed}
              onClick={() => onPick(code)}
              className={`min-h-11 rounded-chip border text-[12px] disabled:opacity-30 ${
                value === code
                  ? 'border-gold bg-gold/10 text-gold'
                  : 'border-border-2 text-text-secondary'
              }`}
            >
              {ABILITY_LABEL[code]} {scoreOf(code)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
