'use client';

import { useState } from 'react';

import { ParchmentCard, SectionTitle } from '@/components/ui/decorations';
import { updateCharacter } from '@/lib/characters/actions';
import { SPECIES } from '@/lib/creation/data';
import type { Character } from '@/lib/domain/character';
import type { CatalogClassFeature, CatalogSubclass } from '@/lib/catalog/types';
import type { CustomSubclass } from '@/lib/subclasses/types';
import { ftFlattenEntries } from '@/lib/catalog/fivetools';
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

export function LevelUpView({
  initial,
  subclasses,
  customSubclasses,
  classFeatures,
  catalogOffline,
}: {
  initial: Character;
  subclasses: CatalogSubclass[];
  /** 母職業相符的自訂子職，與 SRD 並列。 */
  customSubclasses: CustomSubclass[];
  classFeatures: CatalogClassFeature[];
  /** 內容庫取不到：子職與特性可跳過，數值仍照常升級。 */
  catalogOffline: boolean;
}) {
  const speciesHpPerLevel =
    SPECIES.find((s) => s.cn === initial.species)?.hpPerLevel ?? 0;
  const plan = planFor(initial, speciesHpPerLevel);

  const [hpMode, setHpMode] = useState<'average' | 'roll'>('average');
  const [roll, setRoll] = useState<number | ''>('');
  const [asiMode, setAsiMode] = useState<'2' | '1+1'>('2');
  const [asiA, setAsiA] = useState<string | null>(null);
  const [asiB, setAsiB] = useState<string | null>(null);
  // 兩種來源分開存：以旗標而非名稱區分，使用者自訂一個與 SRD 同名的子職時，
  // 那是他的子職（與自訂起源專長同一原則）。
  const [subclass, setSubclass] = useState<CatalogSubclass | null>(null);
  const [customSubclass, setCustomSubclass] = useState<CustomSubclass | null>(null);
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
  // 子職：內容庫離線時可跳過——擋在這裡等於內容庫一有問題就不能升級，
  // 而數值部分完全不依賴它。之後可於角色卡補選。
  const subclassReady =
    !plan.pickSubclass ||
    subclass !== null ||
    customSubclass !== null ||
    (catalogOffline && customSubclasses.length === 0);

  // 本級的職業特性 ＋ 所選子職累積到本級的特性。
  // 子職特性取「≤ 目標等級」而非「＝目標等級」：3 級才選子職，但子職的
  // 1–3 級特性都該一次補上。
  const toFeature = (f: CatalogClassFeature, source: string) => ({
    name: f.name,
    nameEn: f.eng_name ?? '',
    source,
    description: ftFlattenEntries((f.data.entries as unknown[]) ?? []),
  });

  // 3 級選用的自訂子職（本次），或角色卡上既有的快照（後續等級）。
  const activeCustom = customSubclass ?? initial.customSubclass;

  const newFeatures = [
    ...classFeatures
      .filter((f) => !f.is_subclass && f.level === plan.targetLevel)
      .map((f) => toFeature(f, `職業：${initial.className} Lv${plan.targetLevel}`)),
    ...(subclass
      ? classFeatures
          .filter(
            (f) =>
              f.is_subclass &&
              f.subclass_short_name === subclass.short_name &&
              f.level <= plan.targetLevel,
          )
          .map((f) => toFeature(f, `子職：${subclass.name}`))
      : []),
    // 自訂子職的特性自快照取用，不回查來源表——來源可能已被刪除。
    // 3 級時取 ≤ 目標等級（一次補齊 1–3 級），之後只取該級。
    ...(activeCustom
      ? activeCustom.features
          .filter((f) =>
            plan.pickSubclass
              ? f.level <= plan.targetLevel
              : f.level === plan.targetLevel,
          )
          .map((f) => ({
            name: f.name,
            nameEn: '',
            source: `子職：${activeCustom.name}・自訂`,
            description: f.description,
          }))
      : []),
  ];

  const preview = applyLevelUp(initial, plan, {
    hpRoll: hpMode === 'roll' && typeof roll === 'number' ? roll : null,
    asi,
    subclass: subclass?.name ?? customSubclass?.name,
    subclassEn: subclass?.eng_name ?? customSubclass?.nameEn ?? undefined,
    features: newFeatures,
  });

  const submit = async () => {
    setBusy(true);
    // 選用自訂子職時把整份定義快照進角色卡；SRD 子職維持 null。
    const r = await updateCharacter(
      customSubclass ? { ...preview, customSubclass } : preview,
    );
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
          {subclasses.length === 0 && customSubclasses.length === 0 ? (
            <ParchmentCard className="px-4 py-3">
              <p className="text-[12px] leading-relaxed text-text-secondary">
                子職清單目前無法取得（內容庫離線）。可先完成升級，之後再補選——
                數值不受影響。
              </p>
            </ParchmentCard>
          ) : (
            <div className="flex flex-col gap-2">
              {subclasses.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    setSubclass(s);
                    setCustomSubclass(null);
                  }}
                  className="text-left"
                >
                  <ParchmentCard
                    className={`px-4 py-3 ${subclass?.id === s.id ? 'border-gold' : ''}`}
                  >
                    <div className="flex items-baseline gap-2">
                      <span className="text-[15px] font-semibold text-text-primary">
                        {s.name}
                      </span>
                      <span className="font-label text-[11px] text-text-primary/45">
                        {s.eng_name}
                      </span>
                    </div>
                  </ParchmentCard>
                </button>
              ))}

              {customSubclasses.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    setCustomSubclass(s);
                    setSubclass(null);
                  }}
                  className="text-left"
                >
                  <ParchmentCard
                    className={`px-4 py-3 ${customSubclass?.id === s.id ? 'border-gold' : ''}`}
                  >
                    <div className="flex items-baseline gap-2">
                      <span className="text-[15px] font-semibold text-text-primary">
                        {s.name}
                      </span>
                      {s.nameEn && (
                        <span className="font-label text-[11px] text-text-primary/45">
                          {s.nameEn}
                        </span>
                      )}
                      <span className="ml-auto text-[11px] text-section-label">
                        自訂
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-text-secondary">
                      {[...new Set(s.features.map((f) => f.level))]
                        .sort((a, b) => a - b)
                        .join('/')}{' '}
                      級共 {s.features.length} 個特性
                    </p>
                  </ParchmentCard>
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {newFeatures.length > 0 && (
        <>
          <SectionTitle en="NEW FEATURES" cn="本級獲得" />
          <ParchmentCard className="px-4">
            {newFeatures.map((f, i) => (
              <details
                key={`${f.name}-${i}`}
                className={`py-2 ${i > 0 ? 'border-t border-border/40' : ''}`}
              >
                <summary className="cursor-pointer">
                  <span className="text-[14px] text-text-primary">{f.name}</span>
                  <span className="ml-1.5 text-[10px] text-section-label">
                    {f.source}
                  </span>
                </summary>
                {f.description && (
                  <p className="mt-2 whitespace-pre-wrap text-[13px] leading-relaxed text-text-light">
                    {f.description}
                  </p>
                )}
              </details>
            ))}
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
            disabled={busy || !asiReady || !hpReady || !subclassReady}
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
