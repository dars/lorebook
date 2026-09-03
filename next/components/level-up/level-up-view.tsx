'use client';

import { useState } from 'react';

import { ParchmentCard, SectionTitle } from '@/components/ui/decorations';
import { AppLink } from '@/components/ui/app-link';
import { updateCharacter } from '@/lib/characters/actions';
import { useFormDraft } from '@/lib/hooks/use-form-draft';
import type { Character } from '@/lib/domain/character';
import type { CatalogClassFeature, CatalogSubclass } from '@/lib/catalog/types';
import type { CustomSubclass } from '@/lib/subclasses/types';
import { ftFlattenEntries } from '@/lib/catalog/fivetools';
import { applyLevelUp, applySubclassPick, planFor } from '@/lib/rules/level-up';

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
  mode = 'level-up',
  subclasses,
  customSubclasses,
  classFeatures,
  catalogOffline,
}: {
  initial: Character;
  /**
   * `subclass`＝補選子職：升級當時內容庫離線而跳過的角色回來補。
   * 只選子職，等級與所有數值都不動，而且**不可跳過**——會走到這裡就是為了
   * 補上它。
   */
  mode?: 'level-up' | 'subclass';
  subclasses: CatalogSubclass[];
  /** 母職業相符的自訂子職，與 SRD 並列。 */
  customSubclasses: CustomSubclass[];
  classFeatures: CatalogClassFeature[];
  /** 內容庫取不到：子職與特性可跳過，數值仍照常升級。 */
  catalogOffline: boolean;
}) {
  const subclassOnly = mode === 'subclass';
  // 種族的每級額外 HP 讀角色卡上的快照，不以種族名反查 SPECIES——自訂種族
  // 查不到會回 0，每級 +1 HP 就這樣靜默消失（custom-species D3）。舊角色的
  // 這個欄位由 lib/characters/backfill.ts 於讀入時補齊。
  const plan = planFor(initial, initial.speciesHpPerLevel);

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
  const picked = subclass !== null || customSubclass !== null;
  const subclassReady = subclassOnly
    ? // 補選模式不可跳過：整個流程就只有這一件事。
      picked
    : !plan.pickSubclass ||
      picked ||
      (catalogOffline && customSubclasses.length === 0);
  // 子職特性的累積上限：升級時取目標等級，補選時取角色**現有**等級——
  // 5 級才回來補的人，1–5 級的子職特性要一次補齊。
  const subclassThrough = subclassOnly ? initial.level : plan.targetLevel;
  const showSubclass = subclassOnly || plan.pickSubclass;

  // 本級的職業特性 ＋ 所選子職累積到本級的特性。
  // 子職特性取「≤ 目標等級」而非「＝目標等級」：3 級才選子職，但子職的
  // 1–3 級特性都該一次補上。
  const toFeature = (f: CatalogClassFeature, source: string) => ({
    name: f.name,
    nameEn: f.eng_name ?? '',
    source,
    description: ftFlattenEntries((f.data.entries as unknown[]) ?? []),
    // 內容庫來源，必然不是自創。
    isCustom: false,
  });

  // 3 級選用的自訂子職（本次），或角色卡上既有的快照（後續等級）。
  const activeCustom = customSubclass ?? initial.customSubclass;

  const newFeatures = [
    // 補選不是升級：這一趟不該拿到任何職業特性，只補子職那一份。
    ...(subclassOnly
      ? []
      : classFeatures
          .filter((f) => !f.is_subclass && f.level === plan.targetLevel)
          .map((f) =>
            toFeature(f, `職業：${initial.className} Lv${plan.targetLevel}`),
          )),
    ...(subclass
      ? classFeatures
          .filter(
            (f) =>
              f.is_subclass &&
              f.subclass_short_name === subclass.short_name &&
              f.level <= subclassThrough,
          )
          .map((f) => toFeature(f, `子職：${subclass.name}`))
      : []),
    // 自訂子職的特性自快照取用，不回查來源表——來源可能已被刪除。
    // 選子職的那一級取 ≤ 上限（一次補齊），之後只取該級。
    ...(activeCustom
      ? activeCustom.features
          .filter((f) =>
            showSubclass
              ? f.level <= subclassThrough
              : f.level === plan.targetLevel,
          )
          .map((f) => ({
            name: f.name,
            nameEn: '',
            source: `子職：${activeCustom.name}`,
            description: f.description,
            isCustom: true,
          }))
      : []),
  ];

  const preview = subclassOnly
    ? applySubclassPick(initial, {
        subclass: subclass?.name ?? customSubclass?.name ?? '',
        subclassEn: subclass?.eng_name ?? customSubclass?.nameEn ?? undefined,
        features: newFeatures,
      })
    : applyLevelUp(initial, plan, {
        hpRoll: hpMode === 'roll' && typeof roll === 'number' ? roll : null,
        asi,
        subclass: subclass?.name ?? customSubclass?.name,
        subclassEn: subclass?.eng_name ?? customSubclass?.nameEn ?? undefined,
        features: newFeatures,
      });

  /**
   * 草稿的鍵帶角色 id 與目標等級：切到別的角色、或這一級已經升完，
   * 都不該把上一輪的選擇帶過來。
   */
  const started =
    hpMode !== 'average' ||
    roll !== '' ||
    asiA !== null ||
    subclass !== null ||
    customSubclass !== null;
  const { pending, accept, discard, clear } = useFormDraft({
    key: `lorebook-draft-levelup-${initial.id}-${plan.targetLevel}`,
    value: { hpMode, roll, asiMode, asiA, asiB, subclass, customSubclass },
    // 補選只有一個選擇，存草稿沒有意義；而且它與升級共用鍵會互相污染。
    active: started && !busy && !subclassOnly,
  });

  const resume = (d: NonNullable<typeof pending>) => {
    setHpMode(d.hpMode);
    setRoll(d.roll);
    setAsiMode(d.asiMode);
    setAsiA(d.asiA);
    setAsiB(d.asiB);
    setSubclass(d.subclass);
    setCustomSubclass(d.customSubclass);
    accept();
  };

  const submit = async () => {
    setBusy(true);
    // 選用自訂子職時把整份定義快照進角色卡；SRD 子職維持 null。
    const r = await updateCharacter(
      customSubclass ? { ...preview, customSubclass } : preview,
    );
    if (r.error) {
      setError(r.error);
      setBusy(false);
      return;
    }
    clear();
  };

  return (
    <main id="main-content" className="mx-auto w-full max-w-[700px] flex-1 px-4 pb-32">
      {pending && (
        <div className="mt-4 rounded-card border border-gold bg-gold/10 px-3 py-2.5">
          <p className="text-[13px] text-text-primary">
            有一份未完成的升級選擇（升到 {plan.targetLevel} 級）。
          </p>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => resume(pending)}
              className="min-h-11 flex-1 rounded-chip border border-gold text-[13px] font-bold text-gold"
            >
              繼續
            </button>
            <button
              type="button"
              onClick={discard}
              className="min-h-11 flex-1 rounded-chip border border-border text-[13px] text-text-secondary"
            >
              重新開始
            </button>
          </div>
        </div>
      )}

      <div className="pt-5">
        <div className="font-label text-[10px] tracking-[1.5px] text-section-label">
          {subclassOnly ? 'PICK SUBCLASS' : 'LEVEL UP'}
        </div>
        {subclassOnly ? (
          <>
            <div className="mt-1 font-display text-[28px] font-bold text-gold">
              補選子職
            </div>
            <p className="mt-1 text-[13px] text-text-light">
              {initial.name}・{initial.className} {initial.level}
            </p>
            <p className="mt-1 text-[12px] leading-relaxed text-text-secondary">
              升級當時內容庫離線，這個角色的子職被跳過了。選定後會一併補上
              到 {initial.level} 級為止的子職特性；等級與其他數值不會變動。
            </p>
          </>
        ) : (
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
        )}
      </div>

      {!subclassOnly && (
        <>
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
              aria-label={`d${plan.hitDieFaces} 擲骰結果`}
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
          {plan.speciesHpPerLevel > 0 &&
            `（含${initial.species}每級 +${plan.speciesHpPerLevel}）`}
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
            <p className="mt-2 text-[12px] text-text-secondary">
              分數上限 20；已達上限的能力不會再提升。
            </p>
          </ParchmentCard>
        </>
      )}
        </>
      )}

      {showSubclass && (
        <>
          <SectionTitle en="SUBCLASS" cn="子職業" />
          {subclasses.length === 0 && customSubclasses.length === 0 && (
            <ParchmentCard className="mb-2 px-4 py-3">
              <p className="text-[12px] leading-relaxed text-text-secondary">
                {subclassOnly
                  ? '子職清單目前無法取得（內容庫離線）。連線後再回來補選。'
                  : '子職清單目前無法取得（內容庫離線）。可先完成升級，之後再自角色頁補選——數值不受影響。'}
              </p>
            </ParchmentCard>
          )}
          {(subclasses.length > 0 || customSubclasses.length > 0) && (
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
                      <span className="font-label text-[11px] text-text-primary/70">
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
                        <span className="font-label text-[11px] text-text-primary/70">
                          {s.nameEn}
                        </span>
                      )}
                      <span className="ml-auto text-[12px] text-section-label">
                        自訂
                      </span>
                    </div>
                    <p className="mt-1 text-[12px] text-text-secondary">
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

          {/* 自創內容的編輯一律在收藏紀錄，升級流程不長出編輯器（見
              docs/flutter-parity.md 的〈設計決定〉）。這裡只指路——不指路的話，
              沒有子職可選的人會以為這個 App 不支援自創。
              升級的選擇由 use-form-draft 的草稿保全接住，離開再回來不會白填。 */}
          <p className="mt-2 text-[12px] leading-relaxed text-text-secondary">
            SRD 每個職業只收錄一個子職。想用自創或他人分享的子職，先到
            <AppLink href="/library" className="mx-1 text-gold underline">
              收藏紀錄
            </AppLink>
            建立或收藏，再回來這裡選用——這一頁的選擇會留著。自己設計的子職請與
            DM 確認後使用。
          </p>
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
                  <span className="ml-1.5 text-[12px] text-section-label">
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

      {/* 補選不動任何數值，「升級後」這一段在那個模式下沒有東西可比。 */}
      {!subclassOnly && (
        <>
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
              <span className="text-[12px] text-text-secondary">
                {old !== v ? `原 ${old}` : '未變'}
              </span>
              <span className="mt-0.5 text-[12px] text-text-primary/70">{k}</span>
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
          <p className="mt-1 text-[12px] text-text-secondary">
            已消耗的法術位不會因升級回復——升級不是休息。
          </p>
        </ParchmentCard>
      )}
        </>
      )}

      {error && (
        <p role="alert" className="mt-3 text-[13px] text-danger">
          {error}
        </p>
      )}

      <div className="fixed inset-x-0 bottom-0 border-t border-border-2 bg-surface-0 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto max-w-[700px]">
          <button
            type="button"
            onClick={submit}
            disabled={
              busy ||
              !subclassReady ||
              (!subclassOnly && (!asiReady || !hpReady))
            }
            className="min-h-12 w-full rounded-card border border-gold bg-gold/10 text-[14px] font-bold text-gold disabled:opacity-40"
          >
            {busy
              ? '套用中…'
              : subclassOnly
                ? '完成補選'
                : `確定升到 ${plan.targetLevel} 級`}
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
