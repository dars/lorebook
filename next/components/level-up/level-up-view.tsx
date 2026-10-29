'use client';

import { levelUpFeatIssue } from '@/lib/rules/level-up';
import { ChoiceEditor } from '@/components/progression/choice-editor';
import { applyChoices, validateChoices } from '@/lib/rules/progression/engine';
import type { ChoiceCatalog, Selections } from '@/lib/rules/progression/groups';
import { ClassIcon } from '@/components/ui/class-icon';
import { useState, type ComponentProps } from 'react';

import { ParchmentCard, SectionTitle } from '@/components/ui/decorations';
import { AppLink } from '@/components/ui/app-link';
import { updateCharacter } from '@/lib/characters/actions';
import { useFormDraft } from '@/lib/hooks/use-form-draft';
import type { Character } from '@/lib/domain/character';
import type { CatalogClassFeature, CatalogFeat, CatalogSubclass } from '@/lib/catalog/types';
import type { CustomSubclass } from '@/lib/subclasses/types';
import { ftFlattenEntries } from '@/lib/catalog/fivetools';
import { FEAT_DESC_MAX, FEAT_NAME_MAX } from '@/lib/domain/character';
import {
  EPIC_BOON_LEVEL,
  catalogFeatFeature,
  customFeatFeature,
  featAbilityOptions,
  featCandidates,
  featPrereqUnmet,
  isEpicBoon,
  isFeatSlotFeature,
} from '@/lib/rules/feats';
import {
  applyLevelUp,
  applySubclassPick,
  findSrdSubclass,
  planFor,
} from '@/lib/rules/level-up';

/**
 * 升級流程，對照 Flutter 端的 `CharacterLevelUpPage`。
 *
 * 一頁到底而非多步驟精靈：升級的選項少（HP、ASI／專長、子職），拆成多步只是增加
 * 點擊。建角步驟多才需要分步。
 *
 * 預覽顯示的是 `applyLevelUp` 的實際輸出，與存下的完全相同。
 */
const ABILITY_LABEL: Record<string, string> = {
  STR: '力量', DEX: '敏捷', CON: '體質',
  INT: '智力', WIS: '感知', CHA: '魅力',
};
const CODES = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'];

type FeatMode = 'asi' | 'catalog' | 'custom';
const FEAT_MODES: [FeatMode, string][] = [
  ['asi', '屬性值提升'],
  ['catalog', '內容庫專長'],
  ['custom', '自訂專長'],
];

export function LevelUpView(props: ComponentProps<typeof LevelUpForm>) {
  // App Router 保留元件時，下一級必須取得全新的本級選擇；草稿本身仍依等級保存。
  return <LevelUpForm key={`${props.initial.id}:${props.initial.level}:${props.mode ?? 'level-up'}`} {...props} />;
}

function LevelUpForm({
  initial,
  mode = 'level-up',
  subclasses,
  customSubclasses,
  classFeatures,
  catalogOffline,
  feats = [],
  featsOffline = false,
  choiceCatalog,
}: {
  initial: Character;
  choiceCatalog: ChoiceCatalog;
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
  /** 內容庫的通用專長與史詩恩賜；只在 ASI 等級有值。 */
  feats?: CatalogFeat[];
  /** 專長取不到：ASI 與自訂專長照常，只有內容庫專長不能選。 */
  featsOffline?: boolean;
}) {
  const subclassOnly = mode === 'subclass';
  // 種族的每級額外 HP 讀角色卡上的快照，不以種族名反查 SPECIES——自訂種族
  // 查不到會回 0，每級 +1 HP 就這樣靜默消失（custom-species D3）。舊角色的
  // 這個欄位由 lib/characters/backfill.ts 於讀入時補齊。
  const plan = planFor(initial, initial.speciesHpPerLevel);

  const [choiceSelections, setChoiceSelections] = useState<Selections>(initial.progression?.selections ?? {});
  const [deferChoices, setDeferChoices] = useState(false);
  const [hpMode, setHpMode] = useState<'average' | 'roll'>('average');
  const [roll, setRoll] = useState<number | ''>('');
  const [asiMode, setAsiMode] = useState<'2' | '1+1'>('2');
  const [asiA, setAsiA] = useState<string | null>(null);
  const [asiB, setAsiB] = useState<string | null>(null);
  // 2024 的 ASI 等級給的是「一個通用專長」，屬性值提升只是其中之一。
  // 各模式的輸入分開存：切模式只決定送出哪一份，切回來不必重填。
  const [featMode, setFeatMode] = useState<FeatMode>(plan.targetLevel === 19 ? 'catalog' : 'asi');
  const [catalogFeatId, setCatalogFeatId] = useState<string | null>(null);
  const [catalogAbility, setCatalogAbility] = useState<string | null>(null);
  const [customName, setCustomName] = useState('');
  const [customDesc, setCustomDesc] = useState('');
  const [customBoost, setCustomBoost] = useState(true);
  const [customAbility, setCustomAbility] = useState<string | null>(null);
  const [customEpic, setCustomEpic] = useState(false);
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
    asiMode === '2' ? asiA !== null : asiA !== null && asiB !== null && asiA !== asiB;

  const candidates = plan.hasAsi ? featCandidates(feats, plan.targetLevel) : [];
  const catalogFeat = candidates.find((f) => f.id === catalogFeatId) ?? null;
  const catalogOpts = catalogFeat ? featAbilityOptions(catalogFeat) : null;
  const catalogCap = catalogOpts?.cap ?? 20;
  // 史詩恩賜只在 19 級可取得；其他等級開放這個勾選等於讓 4 級就能推過 20。
  const epicAvailable = plan.targetLevel >= EPIC_BOON_LEVEL;
  const customCap = epicAvailable && customEpic ? 30 : 20;
  // 所選能力已達上限時，+1 會被夾掉而毫無作用——取消史詩恩賜勾選就會發生。
  const boostable = (code: string | null, cap: number) =>
    code !== null && scoreOf(initial, code) < cap;

  const featChoice: {
    asi: Record<string, number>;
    abilityCap?: number;
    feat?: ReturnType<typeof customFeatFeature>;
    ready: boolean;
  } = !plan.hasAsi
    ? { asi: {}, ready: true }
    : featMode === 'asi'
      ? { asi, ready: asiReady }
      : featMode === 'catalog'
        ? {
            asi: catalogOpts && catalogAbility ? { [catalogAbility]: 1 } : {},
            abilityCap: catalogCap,
            feat: catalogFeat ? catalogFeatFeature(catalogFeat, plan.targetLevel) : undefined,
            ready:
              catalogFeat !== null &&
              featPrereqUnmet(catalogFeat, initial, plan.targetLevel) === null &&
              (!catalogOpts ||
                (catalogOpts.from.includes(catalogAbility ?? '') &&
                  boostable(catalogAbility, catalogCap))),
          }
        : {
            asi: customBoost && customAbility ? { [customAbility]: 1 } : {},
            abilityCap: customCap,
            feat:
              customName.trim() === ''
                ? undefined
                : customFeatFeature(
                    {
                      name: customName,
                      description: customDesc,
                      epic: epicAvailable && customEpic,
                    },
                    plan.targetLevel,
                  ),
            ready:
              customName.trim() !== '' &&
              (!customBoost || boostable(customAbility, customCap)),
          };
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
  // 3 級以後的升級：已有的 SRD 子職要對回內容庫，才拿得到本級的子職特性。
  // 只看「本次選的」會讓 6／10／14 級的子職特性安靜地漏掉。
  const existingSrdSubclass =
    showSubclass || activeCustom ? null : findSrdSubclass(subclasses, initial);

  const newFeatures = [
    ...(!subclassOnly && plan.hasAsi && featMode === 'asi' && !classFeatures.some(f=>!f.is_subclass&&f.level===plan.targetLevel&&f.eng_name==='Ability Score Improvement') ? [{name:'能力值提升',nameEn:'Ability Score Improvement',source:`職業：${initial.className} Lv${plan.targetLevel}`,description:'本級已套用能力值提升。',isCustom:false}] : []),
    // 補選不是升級：這一趟不該拿到任何職業特性，只補子職那一份。
    ...(subclassOnly
      ? []
      : classFeatures
          .filter((f) => !f.is_subclass && f.level === plan.targetLevel)
          .filter((f) => featMode === 'asi' || !isFeatSlotFeature(f.eng_name))
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
    ...(existingSrdSubclass
      ? classFeatures
          .filter(
            (f) =>
              f.is_subclass &&
              f.subclass_short_name === existingSrdSubclass.short_name &&
              f.level === plan.targetLevel,
          )
          .map((f) => toFeature(f, `子職：${initial.subclass}`))
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

  const rawPreview = subclassOnly
    ? applySubclassPick(initial, {
        subclass: subclass?.name ?? customSubclass?.name ?? '',
        subclassEn: subclass?.eng_name ?? customSubclass?.nameEn ?? undefined,
        features: newFeatures,
      })
    : applyLevelUp(initial, plan, {
        hpRoll: hpMode === 'roll' && typeof roll === 'number' ? roll : null,
        asi: featChoice.asi,
        abilityCap: featChoice.abilityCap,
        feat: featChoice.feat,
        subclass: subclass?.name ?? customSubclass?.name,
        subclassEn: subclass?.eng_name ?? customSubclass?.nameEn ?? undefined,
        features: newFeatures,
      });

  const flowCatalog = { ...choiceCatalog, handledFeatLevel: plan.hasAsi && !subclassOnly ? plan.targetLevel : undefined };
  const choiceCharacter = customSubclass ? {...rawPreview, customSubclass} : rawPreview;
  const choiceIssues = validateChoices(choiceCharacter, choiceSelections, flowCatalog, 'level', !deferChoices);
  const choiceReady = subclassOnly || choiceIssues.length === 0;
  const preview = !subclassOnly && choiceReady ? applyChoices(choiceCharacter, choiceSelections, flowCatalog, 'level', !deferChoices) : rawPreview;

  /**
   * 草稿的鍵帶角色 id 與目標等級：切到別的角色、或這一級已經升完，
   * 都不該把上一輪的選擇帶過來。
   */
  const started =
    JSON.stringify(choiceSelections) !== JSON.stringify(initial.progression?.selections ?? {}) ||
    hpMode !== 'average' ||
    roll !== '' ||
    asiA !== null ||
    featMode !== 'asi' ||
    subclass !== null ||
    customSubclass !== null;
  const { pending, accept, discard, clear } = useFormDraft({
    key: `lorebook-draft-levelup-${initial.id}-${plan.targetLevel}`,
    value: {
      choiceSelections, deferChoices, hpMode, roll, asiMode, asiA, asiB, subclass, customSubclass,
      featMode, catalogFeatId, catalogAbility,
      customName, customDesc, customBoost, customAbility, customEpic,
    },
    // 補選只有一個選擇，存草稿沒有意義；而且它與升級共用鍵會互相污染。
    active: started && !busy && !subclassOnly,
  });

  const resume = (d: NonNullable<typeof pending>) => {
    setChoiceSelections(d.choiceSelections ?? initial.progression?.selections ?? {});
    setDeferChoices(d.deferChoices ?? false);
    setHpMode(d.hpMode);
    setRoll(d.roll);
    setAsiMode(d.asiMode);
    setAsiA(d.asiA);
    setAsiB(d.asiB);
    setSubclass(d.subclass);
    setCustomSubclass(d.customSubclass);
    // 本變更之前存下的草稿沒有這些鍵。
    setFeatMode(d.featMode ?? 'asi');
    setCatalogFeatId(d.catalogFeatId ?? null);
    setCatalogAbility(d.catalogAbility ?? null);
    setCustomName(d.customName ?? '');
    setCustomDesc(d.customDesc ?? '');
    setCustomBoost(d.customBoost ?? true);
    setCustomAbility(d.customAbility ?? null);
    setCustomEpic(d.customEpic ?? false);
    accept();
  };

  const featIssue = subclassOnly ? null : levelUpFeatIssue(initial, featChoice);
  const canSubmit = subclassReady && choiceReady && (subclassOnly || (featChoice.ready && hpReady && !featIssue));
  const submit = async () => {
    if (busy || !canSubmit) { setError(featIssue ?? '請完成本級必選項目。'); return; }
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
          <p className="text-ui text-text-primary">
            有一份未完成的升級選擇（升到 {plan.targetLevel} 級）。
          </p>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => resume(pending)}
              className="min-h-11 flex-1 rounded-chip border border-gold text-ui font-bold text-gold"
            >
              繼續
            </button>
            <button
              type="button"
              onClick={discard}
              className="min-h-11 flex-1 rounded-chip border border-border text-ui text-text-secondary"
            >
              重新開始
            </button>
          </div>
        </div>
      )}

      <div className="pt-5">
        <div className="font-label text-eyebrow tracking-[1.5px] text-section-label">
          {subclassOnly ? 'PICK SUBCLASS' : 'LEVEL UP'}
        </div>
        {subclassOnly ? (
          <>
            <div className="mt-1 font-display text-[28px] font-bold text-gold">
              補選子職
            </div>
            <p className="mt-1 text-ui text-text-light">
              <ClassIcon name={initial.classNameEn || initial.className} className="mr-1 size-4" />{initial.name}・{initial.className} {initial.level}
            </p>
            <p className="mt-1 text-small leading-relaxed text-text-secondary">
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
            <span className="ml-2 text-ui text-text-light">
              <ClassIcon name={initial.classNameEn || initial.className} className="mr-1 size-4" />{initial.name}・{initial.className}
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
            className={`min-h-11 flex-1 rounded-card border text-ui ${
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
            className={`min-h-11 flex-1 rounded-card border text-ui ${
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
            <p className="mb-2 text-small text-text-secondary">
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
              className="min-h-11 w-24 rounded-chip border border-border bg-surface-2 px-3 text-center text-body text-text-primary"
            />
          </div>
        )}
        <p className="mt-3 text-small text-text-secondary">
          最大生命值 {initial.maxHp} → <span className="text-gold">{preview.maxHp}</span>
          {plan.speciesHpPerLevel > 0 &&
            `（含${initial.species}每級 +${plan.speciesHpPerLevel}）`}
        </p>
      </ParchmentCard>

      {plan.hasAsi && (
        <>
          <SectionTitle en="ABILITY SCORE / FEAT" cn={plan.targetLevel === 19 ? '史詩恩賜或其他專長' : '屬性值提升或專長'} />
          <div className="mb-2 flex gap-2">
            {FEAT_MODES.map(([m, label]) => (
              <button
                key={m}
                type="button"
                aria-pressed={featMode === m}
                onClick={() => setFeatMode(m)}
                className={`min-h-11 flex-1 rounded-card border text-ui ${
                  featMode === m
                    ? 'border-gold bg-gold/10 text-gold'
                    : 'border-border-2 text-text-secondary'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {featMode === 'asi' && (
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
                    className={`min-h-11 flex-1 rounded-card border text-ui ${
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
              <p className="mt-2 text-small text-text-secondary">
                分數上限 20；已達上限的能力不會再提升。
              </p>
            </ParchmentCard>
          )}

          {featMode === 'catalog' && (
            <ParchmentCard className="px-4 py-3">
              {featsOffline ? (
                <p className="text-small leading-relaxed text-text-secondary">
                  專長清單目前無法取得（內容庫離線）。可改用「自訂專長」記下專長名稱與效果。
                </p>
              ) : (
                <>
                  <div className="flex flex-col gap-2">
                    {candidates.map((f) => {
                      const unmet = featPrereqUnmet(f, initial, plan.targetLevel);
                      const selected = catalogFeatId === f.id;
                      return (
                        <button
                          key={f.id}
                          type="button"
                          disabled={unmet !== null}
                          aria-pressed={selected}
                          onClick={() => {
                            setCatalogFeatId(f.id);
                            // 各專長可加的能力不同，換專長就重選。
                            setCatalogAbility(null);
                          }}
                          className={`min-h-11 rounded-card border px-3 py-2 text-left disabled:cursor-not-allowed ${
                            selected ? 'border-gold bg-gold/10' : 'border-border-2'
                          }`}
                        >
                          <div className="flex items-baseline gap-2">
                            <span
                              className={`text-body font-semibold ${
                                unmet ? 'text-text-secondary' : 'text-text-primary'
                              }`}
                            >
                              {f.name}
                            </span>
                            <span className="font-label text-tiny text-text-primary/70">
                              {f.eng_name}
                            </span>
                            {isEpicBoon(f) && (
                              <span className="ml-auto text-small text-section-label">
                                史詩恩賜
                              </span>
                            )}
                          </div>
                          {/* 只變灰不說明，新手不知道為什麼不能選。 */}
                          {unmet && (
                            <p className="mt-0.5 text-small text-text-secondary">{unmet}</p>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {catalogFeat && (
                    <>
                      <p className="mt-3 whitespace-pre-wrap text-ui leading-relaxed text-text-light">
                        {catalogFeatFeature(catalogFeat, plan.targetLevel).description}
                      </p>
                      {catalogOpts && (
                        <div className="mt-3">
                          <AbilityPicker
                            label="+1 給誰"
                            value={catalogAbility}
                            exclude={null}
                            scores={initial}
                            onPick={setCatalogAbility}
                            allowed={catalogOpts.from}
                            cap={catalogCap}
                          />
                          <p className="mt-2 text-small text-text-secondary">
                            分數上限 {catalogCap}。
                          </p>
                        </div>
                      )}
                    </>
                  )}

                  <p className="mt-3 text-small leading-relaxed text-text-secondary">
                    SRD 收錄的通用專長很少。其他來源的專長請用「自訂專長」記下。
                  </p>
                </>
              )}
            </ParchmentCard>
          )}

          {featMode === 'custom' && (
            <ParchmentCard className="px-4 py-3">
              <label className="block">
                <span className="mb-1 flex text-small text-text-secondary">
                  專長名稱
                  <span className="ml-auto">
                    {customName.length}／{FEAT_NAME_MAX}
                  </span>
                </span>
                <input
                  autoComplete="off"
                  spellCheck={false}
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  maxLength={FEAT_NAME_MAX}
                  placeholder="例：鐵壁"
                  className="min-h-11 w-full rounded-chip border border-border bg-surface-2 px-3 text-body text-text-primary"
                />
              </label>
              <label className="mt-3 block">
                <span className="mb-1 flex text-small text-text-secondary">
                  說明（選填）
                  <span className="ml-auto">
                    {customDesc.length}／{FEAT_DESC_MAX}
                  </span>
                </span>
                <textarea
                  value={customDesc}
                  onChange={(e) => setCustomDesc(e.target.value)}
                  maxLength={FEAT_DESC_MAX}
                  rows={3}
                  placeholder="這個專長做什麼…"
                  className="w-full rounded-card border border-border bg-surface-2 p-3 text-ui text-text-primary"
                />
              </label>

              <label className="mt-2 flex min-h-11 cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={customBoost}
                  onChange={(e) => setCustomBoost(e.target.checked)}
                  className="size-4 accent-gold"
                />
                <span className="text-ui text-text-light">
                  附帶 +1 能力值（多數通用專長都有）
                </span>
              </label>

              {epicAvailable && (
                <label className="flex min-h-11 cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={customEpic}
                    onChange={(e) => setCustomEpic(e.target.checked)}
                    className="size-4 accent-gold"
                  />
                  <span className="text-ui text-text-light">
                    這是史詩恩賜（能力值上限 30）
                  </span>
                </label>
              )}

              {customBoost && (
                <div className="mt-2">
                  <AbilityPicker
                    label="+1 給誰"
                    value={customAbility}
                    exclude={null}
                    scores={initial}
                    onPick={setCustomAbility}
                    cap={customCap}
                  />
                </div>
              )}

              <p className="mt-3 text-small leading-relaxed text-text-secondary">
                專長的效果不會自動計算，除了上面的 +1 能力值。使用前請與 DM 確認。
              </p>
            </ParchmentCard>
          )}
        </>
      )}
        </>
      )}

      {showSubclass && (
        <>
          <SectionTitle en="SUBCLASS" cn="子職業" />
          {subclasses.length === 0 && customSubclasses.length === 0 && (
            <ParchmentCard className="mb-2 px-4 py-3">
              <p className="text-small leading-relaxed text-text-secondary">
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
                      <span className="text-body font-semibold text-text-primary">
                        {s.name}
                      </span>
                      <span className="font-label text-tiny text-text-primary/70">
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
                      <span className="text-body font-semibold text-text-primary">
                        {s.name}
                      </span>
                      {s.nameEn && (
                        <span className="font-label text-tiny text-text-primary/70">
                          {s.nameEn}
                        </span>
                      )}
                      <span className="ml-auto text-small text-section-label">
                        自訂
                      </span>
                    </div>
                    <p className="mt-1 text-small text-text-secondary">
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
          <p className="mt-2 text-small leading-relaxed text-text-secondary">
            SRD 每個職業只收錄一個子職。想用自創或他人分享的子職，先到
            <AppLink href="/library" className="mx-1 text-gold underline">
              收藏紀錄
            </AppLink>
            建立或收藏，再回來這裡選用——這一頁的選擇會留著。自己設計的子職請與
            DM 確認後使用。
          </p>
        </>
      )}

      {!subclassOnly && <>
        <ChoiceEditor character={choiceCharacter} catalog={flowCatalog} value={choiceSelections} onChange={setChoiceSelections} context="level" />
        <label className="flex min-h-11 items-center gap-2 text-small text-text-secondary"><input type="checkbox" checked={deferChoices} onChange={e=>setDeferChoices(e.target.checked)} className="accent-gold"/>尚未開始的舊選項稍後到「成長選擇」補齊</label>
        {!choiceReady && <ul role="alert" className="list-disc space-y-1 pl-5 text-small text-danger">{[...new Set(choiceIssues.map(i => i.message))].map(message => <li key={message}>{message}</li>)}</ul>}
      </>}
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
                  <span className="text-body text-text-primary">{f.name}</span>
                  <span className="ml-1.5 text-small text-section-label">
                    {f.source}
                  </span>
                </summary>
                {f.description && (
                  <p className="mt-2 whitespace-pre-wrap text-ui leading-relaxed text-text-light">
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
              <span className="text-small text-text-secondary">
                {old !== v ? `原 ${old}` : '未變'}
              </span>
              <span className="mt-0.5 text-small text-text-primary/70">{k}</span>
            </div>
          </ParchmentCard>
        ))}
      </div>

      {preview.spellSlots.length > 0 && (
        <ParchmentCard className="mt-2 px-4 py-3">
          <div className="text-small text-text-secondary">法術位</div>
          <div className="mt-1 flex flex-wrap gap-2">
            {preview.spellSlots.map((s) => (
              <span key={s.level} className="text-ui text-gold">
                {s.level} 環 {s.total - s.used}/{s.total}
              </span>
            ))}
          </div>
          <p className="mt-1 text-small text-text-secondary">
            已消耗的法術位不會因升級回復——升級不是休息。
          </p>
        </ParchmentCard>
      )}
        </>
      )}

      {error && (
        <p role="alert" className="mt-3 text-ui text-danger">
          {error}
        </p>
      )}

      <div className="fixed inset-x-0 bottom-0 border-t border-border-2 bg-surface-0 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto max-w-[700px]">
          {featIssue && <p role="status" className="mb-2 text-small text-text-secondary">{featIssue}</p>}
          <button
            type="button"
            onClick={submit}
            disabled={
              busy || !canSubmit
            }
            className="min-h-12 w-full rounded-card border border-gold bg-gold/10 text-body font-bold text-gold disabled:opacity-40"
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

const scoreOf = (c: Character, code: string) =>
  c.abilityScores[
    (code === 'INT' ? 'int_' : code.toLowerCase()) as keyof Character['abilityScores']
  ].score;

function AbilityPicker({
  label,
  value,
  exclude,
  scores,
  onPick,
  allowed = CODES,
  cap = 20,
}: {
  label: string;
  value: string | null;
  exclude: string | null;
  scores: Character;
  onPick: (v: string) => void;
  /** 專長只能加特定能力（擒抱大師：力量／敏捷）。 */
  allowed?: string[];
  /** 史詩恩賜可到 30。 */
  cap?: number;
}) {

  return (
    <div>
      <div className="mb-1 text-small text-text-secondary">{label}</div>
      <div className="grid grid-cols-3 gap-1.5">
        {allowed.map((code) => {
          const maxed = scoreOf(scores, code) >= cap;
          return (
            <button
              key={code}
              type="button"
              aria-pressed={value === code}
              disabled={code === exclude || maxed}
              onClick={() => onPick(code)}
              className={`min-h-11 rounded-chip border text-small disabled:opacity-30 ${
                value === code
                  ? 'border-gold bg-gold/10 text-gold'
                  : 'border-border-2 text-text-secondary'
              }`}
            >
              {ABILITY_LABEL[code]} {scoreOf(scores, code)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
