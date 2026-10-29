'use client';

import { ChoiceEditor } from '@/components/progression/choice-editor';
import { applyChoices, validateChoices } from '@/lib/rules/progression/engine';
import type { Selections } from '@/lib/rules/progression/groups';
import { ClassIcon } from '@/components/ui/class-icon';
import { useState } from 'react';

import { AppLink } from '@/components/ui/app-link';
import { ParchmentCard, SectionTitle } from '@/components/ui/decorations';
import type { CatalogSpell } from '@/lib/catalog/types';
import { createCharacter } from '@/lib/creation/actions';
import {
  autofillBonus,
  bonusMap,
  buildCharacter,
  pointsSpent,
  POINT_BUY_BUDGET,
  recommendArray,
  skillTakenBy,
  type BonusMode,
} from '@/lib/creation/build';
import {
  ABILITY_LABEL,
  ABILITY_ORDER,
  abilityLabels,
  BACKGROUNDS,
  type BackgroundOption,
  CLASSES,
  SKILLS,
  SPECIES,
  type SpeciesOption,
  isCaster,
  sizeCn,
} from '@/lib/creation/data';
import { ALIGNMENTS, alignmentEnFor } from '@/lib/creation/alignments';
import { AbilityHexChart } from '@/components/character/ability-hex-chart';
import { uploadPortrait } from '@/lib/characters/portrait';
import {
  DescCard,
  OptionChips,
  StatChip,
  TraitChip,
} from './option-picker';
import { PortraitPicker } from './portrait-picker';
import { useFormDraft } from '@/lib/hooks/use-form-draft';
import { newCharacterId } from '@/lib/creation/id';
import { spellFromCatalog } from '@/lib/creation/spell-from-catalog';
import type { Spell } from '@/lib/domain/character';
import { AbilityStep, type Method } from './ability-step';

/**
 * 建角精靈，對照 Flutter 端的 `CharacterCreatePage`。
 *
 * 步驟依職業動態決定：施法職業多一步「法術」（7 步），非施法維持 6 步。
 * 每一步都有明確的通過條件，未達成時「下一步」不可按——而非讓使用者按下去
 * 才被擋，那只會讓人不知道少了什麼。
 */

export function CreateWizard({
  spells,
  items = [],
  customBackgrounds = [],
  customSpecies = [],
  customSpeciesOffline = false,
}: {
  items?: import('@/lib/catalog/types').CatalogItem[];
  spells: CatalogSpell[];
  /** 自訂背景，與內建並列供選擇。 */
  customBackgrounds?: BackgroundOption[];
  /** 自訂種族，與內建並列供選擇。已轉為 SpeciesOption——流程不區分來源。 */
  customSpecies?: SpeciesOption[];
  /** 自訂種族取不到（離線）。與「一個都還沒建」不同，提示也不同。 */
  customSpeciesOffline?: boolean;
}) {
  const [choices, setChoices] = useState<Selections>({});
  const [deferChoices, setDeferChoices] = useState(false);
  const [step, setStep] = useState(0);
  // 角色 id 一次產生後固定：角色圖要在建立前就以它為檔名上傳，每次 render
  // 重抽一個新的會讓圖與角色對不起來。
  const [characterId] = useState(newCharacterId);
  const [name, setName] = useState('');
  const [alignment, setAlignment] = useState('');
  // File 不進草稿——它序列化不進 localStorage，硬存只會得到一個空物件。
  const [portraitFile, setPortraitFile] = useState<File | null>(null);
  const [speciesCn, setSpeciesCn] = useState<string | null>(null);
  const [sizeChoice, setSizeChoice] = useState<string | null>(null);
  const [classCn, setClassCn] = useState<string | null>(null);
  const [bgCn, setBgCn] = useState<string | null>(null);
  const [bonusMode, setBonusMode] = useState<BonusMode>('2/1');
  const [plus2, setPlus2] = useState<string | null>(null);
  const [plus1, setPlus1] = useState<string | null>(null);
  const [method, setMethod] = useState<Method>('array');
  const [base, setBase] = useState<Record<string, number | null>>(
    Object.fromEntries(ABILITY_ORDER.map((a) => [a, null])),
  );
  const [classSkills, setClassSkills] = useState<string[]>([]);
  const [speciesSkills, setSpeciesSkills] = useState<string[]>([]);
  const [selCantrips, setSelCantrips] = useState<string[]>([]);
  const [selSpells, setSelSpells] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [portraitWarning, setPortraitWarning] = useState<string | null>(null);

  const allSpecies = [...SPECIES, ...customSpecies];
  const species = allSpecies.find((s) => s.cn === speciesCn) ?? null;
  const cls = CLASSES.find((c) => c.cn === classCn) ?? null;
  const allBackgrounds = [...BACKGROUNDS, ...customBackgrounds];
  const bg = allBackgrounds.find((b) => b.cn === bgCn) ?? null;

  const steps = [
    '基本', '職業', '背景', '能力值', '技能',
    '成長選擇',
    '確認',
  ];
  const current = steps[Math.min(step, steps.length - 1)];

  // 不 memo：只是六個鍵的物件，每次算的成本遠低於維護相依清單的風險。
  const bonus = bg
    ? bonusMap(bg, bonusMode, plus2 ?? undefined, plus1 ?? undefined)
    : Object.fromEntries(ABILITY_ORDER.map((a) => [a, 0]));

  const filled = ABILITY_ORDER.every((a) => base[a] !== null);
  const baseCanNext = (() => {
    switch (current) {
      case '基本':
        return name.trim().length > 0 && species !== null;
      case '職業':
        return cls !== null;
      case '背景':
        return (
          bg !== null &&
          (bonusMode === '1/1/1' || (plus2 !== null && plus1 !== null && plus2 !== plus1))
        );
      case '能力值':
        if (!filled) return false;
        if (method === 'buy') {
          return (
            POINT_BUY_BUDGET -
              pointsSpent(base as Record<string, number>) >=
            0
          );
        }
        if (method === 'roll') {
          return ABILITY_ORDER.every((a) => (base[a] ?? 0) >= 3 && (base[a] ?? 0) <= 18);
        }
        return true;
      case '技能':
        return (
          classSkills.length === (cls?.skillCount ?? 0) &&
          speciesSkills.length === (species?.skillPickCount ?? 0)
        );
      case '法術':
        // 內容庫離線時允許跳過——擋在這裡等於離線就不能建角。
        if (spells.length === 0) return true;
        return (
          selCantrips.length === (cls?.cantripsKnown ?? 0) &&
          selSpells.length === (cls?.preparedSpells ?? 0)
        );
      default:
        return true;
    }
  })();

  const toSpell = (name: string, level: number): Spell => {
    const s = spells.find((x) => x.name === name);
    // 查不到只會發生在清單與選取不同步時（正常路徑下選項就是從 spells 來的）。
    // 留個名字讓角色仍建得起來，但不要編造施法時間——寫死 action 會讓行動頁
    // 的附贈／反應分組全錯。
    if (!s) {
      return {
        name, nameEn: '', level,
        description: '', upgrade: '', damage: '', damageType: '', range: '',
        castingTime: '', castKind: 'other',
        prepared: true, concentration: false,
      };
    }
    return spellFromCatalog(s);
  };

  const basePreview = () =>
    species && cls && bg && filled
      ? buildCharacter(
          {
            name,
            species,
            cls,
            background: bg,
            base: base as Record<string, number>,
            bonusMode,
            plus2: plus2 ?? undefined,
            plus1: plus1 ?? undefined,
            sizeChoice: sizeChoice ?? undefined,
            classSkills,
            speciesSkills,
            cantrips: selCantrips.map((n) => toSpell(n, 0)),
            spells: selSpells.map((n) => toSpell(n, 1)),
            alignment,
            alignmentEn: alignmentEnFor(alignment),
          },
          characterId,
        )
      : null;

  const baseCharacter = basePreview();
  const choiceCatalog = {spells, items};
  const choicesReady = !!baseCharacter && validateChoices(baseCharacter, choices, choiceCatalog, 'creation', !deferChoices).length === 0;
  const preview = () => baseCharacter && choicesReady ? applyChoices(baseCharacter, choices, choiceCatalog, 'creation', !deferChoices) : baseCharacter;
  const canNext = baseCanNext && (!['成長選擇','確認'].includes(current) || choicesReady);

  /**
   * 草稿。**只存使用者的選擇**，不存 `steps` / `preview()` 這類推導值——
   * 那些會隨規則資料演進，存下來只會在資料更新後變成過期的快照。
   */
  const draft = {
    choices, deferChoices, step, name, alignment, speciesCn, sizeChoice, classCn, bgCn,
    bonusMode, plus2, plus1, method, base,
    classSkills, speciesSkills, selCantrips, selSpells,
  };
  // 還沒動任何東西就不必保存，也不該攔截離開。
  const started = name.trim().length > 0 || speciesCn !== null || step > 0;
  const { pending, accept, discard, clear } = useFormDraft({
    key: 'lorebook-draft-create',
    value: draft,
    active: started && !busy,
  });

  const resume = (d: typeof draft) => {
    setChoices(d.choices ?? {});
    setDeferChoices(d.deferChoices ?? false);
    setStep(d.step);
    setName(d.name);
    setAlignment(d.alignment ?? '');
    setSpeciesCn(d.speciesCn);
    setSizeChoice(d.sizeChoice);
    setClassCn(d.classCn);
    setBgCn(d.bgCn);
    setBonusMode(d.bonusMode);
    setPlus2(d.plus2);
    setPlus1(d.plus1);
    setMethod(d.method);
    setBase(d.base);
    setClassSkills(d.classSkills);
    setSpeciesSkills(d.speciesSkills);
    setSelCantrips(d.selCantrips);
    setSelSpells(d.selSpells);
    accept();
  };

  const submit = async () => {
    let c = preview();
    if (!c) return;
    setBusy(true);

    // 角色圖在這裡才上傳（同 Flutter）。**失敗不擋建角**——辛苦填完七步
    // 卻因為一張圖傳不上去而全部作廢是不合理的；改成建好之後再補。
    if (portraitFile) {
      try {
        c = { ...c, portraitUrl: await uploadPortrait(characterId, portraitFile) };
      } catch {
        setPortraitWarning('角色圖上傳失敗，角色仍會建立——可稍後於角色頁補傳。');
      }
    }

    const r = await createCharacter(c);
    if (r.error) {
      setError(r.error);
      setBusy(false);
      return;
    }
    // 成功時 Server Action 會 redirect，程式不會回到這裡；草稿在送出前就清掉，
    // 失敗的話上面已經 return，`active` 會隨 busy 復原而繼續保存。
    clear();
  };

  return (
    // 限寬 1000 而非 700：選項改成會換行的 chip 之後，寬螢幕一行放得下
    // 十幾個職業，硬壓成窄欄只是把它們擠成好幾列、又留下大片空白。
    // Flutter 端完全不限寬，那在 1440 上會把說明文字拉成超長的一行。
    <main id="main-content" className="mx-auto w-full max-w-[1000px] flex-1 px-4 pb-32">
      {pending && (
        <div className="mt-4 rounded-card border border-gold bg-gold/10 px-3 py-2.5">
          <p className="text-ui text-text-primary">
            有一份未完成的建角草稿
            {pending.name.trim() && `（${pending.name.trim()}）`}。
          </p>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => resume(pending)}
              className="min-h-11 flex-1 rounded-chip border border-gold text-ui font-bold text-gold"
            >
              繼續填寫
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
          步驟 {Math.min(step + 1, steps.length)} / {steps.length} · {current}
        </div>
        <div className="mt-2 flex gap-1">
          {steps.map((s, i) => (
            <span
              key={s}
              className={`h-1 flex-1 rounded-full ${i <= step ? 'bg-gold' : 'bg-border-2'}`}
            />
          ))}
        </div>
      </div>

      <div className="mt-5">
        {current === '基本' && (
          // 夠寬就把角色圖擺到左邊，與名稱／陣營／種族並排。單欄時圖是 4:5 的
          // 直式，會把下面的欄位整個推到摺線以下——第一步就要捲才看得到名稱。
          <div className="grid gap-x-6 gap-y-4 medium:grid-cols-[200px_minmax(0,1fr)] medium:items-start">
            <PortraitPicker file={portraitFile} onPick={setPortraitFile} />
            <div>
            <SectionTitle en="NAME" cn="名稱" first />
            <input
              aria-label="角色名稱"
              name="characterName"
              autoComplete="off"
              spellCheck={false}
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={30}
              placeholder="你的角色叫什麼？"
              className="min-h-11 w-full rounded-chip border border-border bg-surface-2 px-3 text-body text-text-primary"
            />
            <SectionTitle en="ALIGNMENT" cn="陣營" />
            <select
              aria-label="陣營"
              value={alignment}
              onChange={(e) => setAlignment(e.target.value)}
              className="min-h-11 w-full rounded-chip border border-border bg-surface-2 px-3 text-body text-text-primary medium:w-auto medium:min-w-60"
            >
              <option value="">未定</option>
              {ALIGNMENTS.map(([cn, en]) => (
                <option key={cn} value={cn}>
                  {cn}（{en}）
                </option>
              ))}
            </select>

            <SectionTitle en="SPECIES" cn="種族" />
            <SpeciesHint
              hasCustom={customSpecies.length > 0}
              offline={customSpeciesOffline}
            />
            <OptionChips
              ariaLabel="種族"
              options={allSpecies.map((s) => ({
                key: s.cn,
                label: s.cn + (s.isCustom ? '（自訂）' : ''),
              }))}
              selected={speciesCn}
              onSelect={(k) => {
                setSpeciesCn(k);
                setSizeChoice(null);
                setSpeciesSkills([]);
              }}
            />
            {species && (
              <DescCard
                title={species.cn + (species.isCustom ? '（自訂）' : '')}
                titleEn={species.en}
                description={species.description}
                chips={
                  <>
                    <StatChip label="速度" value={species.speed} />
                    <StatChip
                      label="體型"
                      value={sizeCn(species.size)}
                    />
                    {species.darkvisionFt > 0 && (
                      <StatChip label="黑暗視覺" value={`${species.darkvisionFt} 尺`} />
                    )}
                  </>
                }
                traits={[
                  // 有限次數能力也列進特性區——它們建角後會佔一格資源，
                  // 選之前就該看得到，而不是建完才發現多了兩格。
                  ...species.abilities.map((a) => (
                    <TraitChip
                      key={`ability-${a.name}`}
                      name={`${a.name}（${
                        a.uses === 'proficiency' ? '熟練加值' : a.uses
                      } 次／${a.recovery === 'short' ? '短休' : '長休'}）`}
                      nameEn=""
                      description={a.description}
                    />
                  )),
                  ...species.traits.map((t) => (
                    <TraitChip
                      key={t.name}
                      name={t.name}
                      nameEn={t.nameEn}
                      description={t.description}
                    />
                  )),
                ]}
              />
            )}
            {species && species.sizeChoices.length > 1 && (
              <>
                <SectionTitle en="SIZE" cn="體型" />
                <div className="flex flex-wrap gap-2">
                  {species.sizeChoices.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSizeChoice(s)}
                      className={`min-h-11 rounded-chip border px-5 text-body ${
                        (sizeChoice ?? species.size) === s
                          ? 'border-gold bg-gold/15 font-semibold text-gold'
                          : 'border-border-2 bg-surface-1 text-text-primary hover:border-gold/50'
                      }`}
                    >
                      {sizeCn(s)}
                    </button>
                  ))}
                </div>
              </>
            )}
            </div>
          </div>
        )}

        {current === '職業' && (
          <>
            <OptionChips
              ariaLabel="職業"
              options={CLASSES.map((c) => ({ key: c.cn, label: c.cn, icon: <ClassIcon name={c.en} /> }))}
              selected={classCn}
              onSelect={(k) => {
                setClassCn(k);
                setClassSkills([]);
                setSelCantrips([]);
                setSelSpells([]);
                // 換職業一併清空能力值：先照法師配好點再改成野蠻人，留著的
                // 數值是為上一個職業排的，而且不會有任何提示。
                setBase(Object.fromEntries(ABILITY_ORDER.map((a) => [a, null])));
              }}
            />
            {cls && (
              <DescCard
                title={cls.cn}
                titleEn={cls.en}
                description={cls.description}
                chips={
                  <>
                    <StatChip label="生命骰" value={`d${cls.hitDie}`} />
                    <StatChip label="主屬性" value={abilityLabels(cls.primaryAbilities)} />
                    <StatChip label="豁免" value={abilityLabels(cls.saves)} />
                    <StatChip label="技能" value={`選 ${cls.skillCount}`} />
                    <StatChip
                      label="施法"
                      value={
                        isCaster(cls) ? ABILITY_LABEL[cls.spellAbility] : '非施法職業'
                      }
                    />
                  </>
                }
              />
            )}
          </>
        )}

        {current === '背景' && (
          <>
            {/* 沒有任何自訂背景時給一行指路。自創內容的編輯一律在收藏紀錄
                （見 docs/flutter-parity.md 的〈設計決定〉），這裡不做就地新增；
                但不指路的話，使用者會以為這個 App 不支援自創。
                離開再回來由 use-form-draft 的草稿保全接住，不必另存。 */}
            {customBackgrounds.length === 0 && (
              <p className="mb-3 text-small leading-relaxed text-text-secondary">
                想用自創背景？先到
                <AppLink href="/library" className="mx-1 text-gold underline">
                  收藏紀錄
                </AppLink>
                建立，再回來這裡選用——這一步填到哪裡會留著。
              </p>
            )}
            <OptionChips
              ariaLabel="背景"
              options={allBackgrounds.map((b) => ({
                key: b.cn,
                label: b.cn + (b.isCustom ? '（自訂）' : ''),
              }))}
              selected={bgCn}
              onSelect={(k) => {
                setBgCn(k);
                setClassSkills([]);
                // 換背景也清種族技能：新背景的固定技能可能與已選的種族技能
                // 重疊，留著會白白浪費一個名額而且不會被擋。
                setSpeciesSkills([]);
                const nb = allBackgrounds.find((b) => b.cn === k);
                // 先幫他排好 +2／+1，排完仍可自己改。留三顆空按鈕在那裡，
                // 新手只能猜法師該把 +2 放哪。
                if (nb && cls) {
                  const a = autofillBonus(cls, nb);
                  setBonusMode(a.mode);
                  setPlus2(a.plus2);
                  setPlus1(a.plus1);
                } else {
                  setPlus2(null);
                  setPlus1(null);
                }
              }}
            />
            {bg && (
              <>
                <DescCard
                  title={bg.cn + (bg.isCustom ? '（自訂）' : '')}
                  titleEn={bg.en}
                  description={bg.description}
                  chips={
                    <>
                      <StatChip label="技能" value={bg.skills.join('、')} />
                      <StatChip label="起源專長" value={bg.originFeat} />
                      {bg.toolProficiency && (
                        <StatChip label="工具" value={bg.toolProficiency} />
                      )}
                      <StatChip
                        label="能力候選"
                        value={abilityLabels(bg.abilities)}
                      />
                    </>
                  }
                />
                <SectionTitle en="ABILITY BONUS" cn="能力加值" />
                <p className="mb-2 text-small text-text-secondary">
                  背景給 {bg.abilities.map((a) => ABILITY_LABEL[a]).join('、')}{' '}
                  三項中的加值，二選一種分配方式。
                  {cls && (
                    <span className="block text-text-primary/70">
                      已依 {cls.cn} 的主屬性排好，可自行更動。
                    </span>
                  )}
                </p>
                <div className="flex gap-2">
                  {(['2/1', '1/1/1'] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setBonusMode(m)}
                      className={`min-h-11 flex-1 rounded-card border text-ui ${
                        bonusMode === m
                          ? 'border-gold bg-gold/10 text-gold'
                          : 'border-border-2 text-text-secondary'
                      }`}
                    >
                      {m === '2/1' ? '一項 +2、一項 +1' : '三項各 +1'}
                    </button>
                  ))}
                </div>
                {bonusMode === '2/1' && (
                  <div className="mt-3 flex flex-col gap-2">
                    {(['+2', '+1'] as const).map((slot) => (
                      <div key={slot}>
                        <div className="mb-1 text-small text-text-secondary">
                          {slot} 給誰
                        </div>
                        <div className="flex gap-2">
                          {bg.abilities.map((a) => {
                            const sel = slot === '+2' ? plus2 === a : plus1 === a;
                            const takenByOther =
                              slot === '+2' ? plus1 === a : plus2 === a;
                            return (
                              <button
                                key={a}
                                type="button"
                                disabled={takenByOther}
                                onClick={() =>
                                  slot === '+2' ? setPlus2(a) : setPlus1(a)
                                }
                                className={`min-h-11 flex-1 rounded-chip border text-ui disabled:opacity-30 ${
                                  sel
                                    ? 'border-gold bg-gold/10 text-gold'
                                    : 'border-border-2 text-text-secondary'
                                }`}
                              >
                                {ABILITY_LABEL[a]}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        )}

        {current === '能力值' && cls && (
          <AbilityStep
            cls={cls}
            method={method}
            onMethod={(m) => {
              setMethod(m);
              // 切到標準陣列直接套用建議（同 Flutter）——面對六個空下拉是
              // 最容易在這一步卡住的地方。購點全 8 起跳，擲骰留空等使用者填。
              setBase(
                m === 'array'
                  ? recommendArray(cls)
                  : Object.fromEntries(
                      ABILITY_ORDER.map((a) => [a, m === 'buy' ? 8 : null]),
                    ),
              );
            }}
            base={base}
            onBase={setBase}
            bonus={bonus}
          />
        )}

        {current === '技能' && cls && bg && species && (
          // 三欄：職業／種族／自動取得。單欄時人類的 18 項種族技能會把這一步
          // 拉成三個畫面高，三欄之後各欄都短得多，也讓「還有哪些來源」一眼看完。
          <div className="grid gap-x-6 expanded:grid-cols-3">
            <div>
              <SectionTitle
                en="CLASS"
                cn={`職業（選 ${classSkills.length}/${cls.skillCount}）`}
                first
              />
              <SkillPicker
                names={cls.skillChoices}
                selected={classSkills}
                max={cls.skillCount}
                taken={(n) => skillTakenBy(n, bg, classSkills, speciesSkills, 'class')}
                onToggle={setClassSkills}
              />
            </div>
            <div>
              {species.skillPickCount > 0 && (
                <>
                  <SectionTitle
                    en="SPECIES"
                    cn={`${species.cn}（選 ${speciesSkills.length}/${species.skillPickCount}）`}
                    first
                  />
                  <SkillPicker
                    names={species.skillPickFrom}
                    selected={speciesSkills}
                    max={species.skillPickCount}
                    taken={(n) =>
                      skillTakenBy(n, bg, classSkills, speciesSkills, 'species')
                    }
                    onToggle={setSpeciesSkills}
                  />
                </>
              )}
            </div>
            {/* 自動取得的兩區。沒有它們，使用者會以為技能就只有上面選的那幾個，
                也從頭到尾不知道自己的豁免熟練是什麼。 */}
            <div>
              <SectionTitle en="FROM BACKGROUND" cn="背景已給" first />
              <div className="flex flex-wrap gap-1.5">
                {bg.skills.map((n) => (
                  <span
                    key={n}
                    className="rounded-chip border border-gold/40 bg-gold/10 px-3 py-1.5 text-ui text-gold"
                  >
                    {n}
                  </span>
                ))}
              </div>
              <p className="mt-1.5 text-small text-text-secondary">
                背景固定給這些，不佔上面的選取名額。
              </p>

              <SectionTitle en="SAVING THROWS" cn="豁免熟練" />
              <div className="flex flex-wrap gap-1.5">
                {cls.saves.map((a) => (
                  <span
                    key={a}
                    className="rounded-chip border border-gold/40 bg-gold/10 px-3 py-1.5 text-ui text-gold"
                  >
                    {ABILITY_LABEL[a] ?? a}
                  </span>
                ))}
              </div>
              <p className="mt-1.5 text-small text-text-secondary">
                由 {cls.cn} 固定給予。
              </p>
            </div>
          </div>
        )}

        {current === '成長選擇' && baseCharacter && <>
          <ChoiceEditor character={baseCharacter} catalog={choiceCatalog} value={choices} onChange={setChoices} context="creation"/>
          <label className="flex min-h-11 items-center gap-2 text-small text-text-secondary"><input type="checkbox" checked={deferChoices} onChange={e=>setDeferChoices(e.target.checked)} className="accent-gold"/>未開始的項目稍後補選（不會自動幫你選擇）</label>
        </>}

        {current === '確認' && <Confirm c={preview()} />}
      </div>

      {portraitWarning && (
        <p role="alert" className="mt-3 text-ui text-text-light">
          {portraitWarning}
        </p>
      )}

      {error && (
        <p role="alert" className="mt-3 text-ui text-danger">
          {error}
        </p>
      )}

      <div className="fixed inset-x-0 bottom-0 border-t border-border-2 bg-surface-0 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto flex max-w-[1000px] gap-2">
          {step > 0 && (
            <button
              type="button"
              onClick={() => setStep((s) => s - 1)}
              className="min-h-12 flex-1 rounded-card border border-border text-body text-text-secondary"
            >
              上一步
            </button>
          )}
          {current === '確認' ? (
            <button
              type="button"
              onClick={submit}
              disabled={busy || !preview()}
              className="min-h-12 flex-2 rounded-card border border-gold bg-gold/10 text-body font-bold text-gold disabled:opacity-40"
            >
              {busy ? '建立中…' : '建立角色'}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                // 首次進入「能力值」就先套好建議（同 Flutter 的 `_initAbilities`）。
                // 不這樣做的話，這一步的開場畫面是六個空下拉，而使用者這時
                // 還不知道自己的職業該把高點數放哪——這是整個流程最容易卡住的地方。
                // 只在「還沒動過」時套用，回上一步再回來不會蓋掉已改的值。
                const next = steps[step + 1];
                if (next === '能力值' && cls && ABILITY_ORDER.every((a) => base[a] === null)) {
                  setMethod('array');
                  setBase(recommendArray(cls));
                }
                setStep((s) => s + 1);
              }}
              disabled={!canNext}
              className="min-h-12 flex-2 rounded-card border border-gold bg-gold/10 text-body font-bold text-gold disabled:opacity-40"
            >
              下一步
            </button>
          )}
        </div>
      </div>
    </main>
  );
}

function SkillPicker({
  names,
  selected,
  max,
  taken,
  onToggle,
}: {
  names: string[];
  selected: string[];
  max: number;
  taken: (n: string) => string | null;
  onToggle: (v: string[]) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      {names.map((n) => {
        const by = taken(n);
        const on = selected.includes(n);
        const disabled = by !== null || (!on && selected.length >= max);
        const en = SKILLS.find((s) => s.name === n)?.nameEn ?? '';
        return (
          <button
            key={n}
            type="button"
            disabled={disabled}
            onClick={() =>
              onToggle(on ? selected.filter((x) => x !== n) : [...selected, n])
            }
            className={`flex min-h-11 items-center gap-2 rounded-card border px-3 text-left disabled:opacity-40 ${
              on ? 'border-gold bg-gold/10' : 'border-border-2'
            }`}
          >
            <span className={`size-2 rounded-full ${on ? 'bg-gold' : 'border border-border'}`} />
            <span className={`text-ui ${on ? 'text-gold' : 'text-text-primary'}`}>
              {n}
            </span>
            <span className="font-label text-tiny text-text-primary/70">{en}</span>
            {by && (
              <span className="ml-auto text-small text-text-secondary">（{by}）</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/**
 * 法術選取。**每一項都可以點開看內容**——在幾十個只有名字的 chip 裡挑，
 * 等於要使用者憑法術名猜效果。詳情走對話框而不是就地展開，避免清單在
 * 展開時整個跳動。
 */
/** 確認頁顯示的是**實際會存下的角色**，不是另外算一次的預覽。 */
/**
 * 種族步驟的一行提示。
 *
 * 沒有任何自訂種族時**要指路**——自創內容的編輯一律在收藏紀錄（見
 * docs/flutter-parity.md 的〈設計決定〉），不指路的話使用者會以為這個 App
 * 不支援自創。離開再回來由 use-form-draft 的草稿保全接住，不必另存。
 *
 * 離線是另一回事：那時「去建立」也做不到，說了只會讓人白跑一趟。
 */
function SpeciesHint({
  hasCustom,
  offline,
}: {
  hasCustom: boolean;
  offline: boolean;
}) {
  if (offline) {
    return (
      <p className="mb-3 text-small leading-relaxed text-text-secondary">
        自訂種族目前取不到（離線）——內建種族仍可照常建角。
      </p>
    );
  }
  if (hasCustom) return null;
  return (
    <p className="mb-3 text-small leading-relaxed text-text-secondary">
      想用自創種族？先到
      <AppLink href="/library" className="mx-1 text-gold underline">
        收藏紀錄
      </AppLink>
      建立，再回來這裡選用——這一步填到哪裡會留著。
    </p>
  );
}

function Confirm({ c }: { c: ReturnType<typeof buildCharacter> | null }) {
  if (!c) return <p className="text-ui text-danger">資料不完整，請回前面的步驟檢查。</p>;

  const score = (a: string) =>
    c.abilityScores[
      (a === 'INT' ? 'int_' : a.toLowerCase()) as keyof typeof c.abilityScores
    ];
  const caster = c.spellcastingAbility !== '';

  // 施法者在這裡看不到自己的法術 DC 與命中，就得建完再回頭查一次。
  const stats: [string, string][] = [
    ['生命值', `${c.maxHp}`],
    ['護甲等級', `${c.ac}`],
    ['先攻', fmtMod(c.initiative)],
    ['熟練加值', fmtMod(c.proficiencyBonus)],
    ['被動察覺', `${c.passivePerception}`],
    ...(caster
      ? ([
          ['法術 DC', `${c.spellDc}`],
          ['法術命中', fmtMod(c.spellAttack)],
        ] as [string, string][])
      : []),
  ];

  return (
    // 六角圖擺左邊，與步驟四一致——同一張圖在流程裡跳邊會讓人要重新找它。
    <div className="grid gap-3 expanded:grid-cols-[320px_minmax(0,1fr)]">
      {/* self-start：卡片預設會被 grid 拉到與右欄等高，圖下方留一大塊空白。 */}
      <ParchmentCard className="flex self-start justify-center px-4 py-3">
        <AbilityHexChart
          size={300}
          scores={Object.fromEntries(
            ABILITY_ORDER.map((a) => [a, score(a).score]),
          )}
        />
      </ParchmentCard>

      <div className="flex flex-col gap-3">
        <ParchmentCard className="px-4 py-3">
          <div className="font-display text-[20px] font-bold text-gold">{c.name}</div>
          <div className="mt-1 text-ui text-text-light">
            {[c.species, `${c.className} ${c.level}`, c.background, c.alignment]
              .filter(Boolean)
              .join(' · ')}
          </div>
        </ParchmentCard>

        <div className="grid grid-cols-3 gap-2 medium:grid-cols-4">
          {stats.map(([k, v]) => (
            <ParchmentCard key={k} className="py-3">
              <div className="flex flex-col items-center">
                <span className="font-display text-[22px] font-bold text-gold">{v}</span>
                <span className="mt-0.5 text-center text-small text-text-primary/70">
                  {k}
                </span>
              </div>
            </ParchmentCard>
          ))}
        </div>

        <ParchmentCard className="px-4 py-3">
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 medium:grid-cols-3">
            {ABILITY_ORDER.map((a) => {
              const s = score(a);
              return (
                <span key={a} className="flex items-baseline justify-between">
                  <span className="text-small text-text-secondary">
                    {ABILITY_LABEL[a]}
                  </span>
                  <span className="text-body font-bold text-gold">
                    {s.score}
                    <span className="ml-1 text-small text-text-secondary">
                      ({fmtMod(s.modifier)})
                    </span>
                  </span>
                </span>
              );
            })}
          </div>
        </ParchmentCard>

        <ParchmentCard className="px-4 py-3">
          <div className="font-label text-eyebrow tracking-[1.5px] text-section-label">
            熟練技能
          </div>
          <div className="mt-1 text-ui leading-relaxed text-text-light">
            {c.skills.filter((s) => s.proficient).map((s) => s.name).join('、') || '無'}
          </div>
          <div className="font-label mt-3 text-eyebrow tracking-[1.5px] text-section-label">
            豁免熟練
          </div>
          <div className="mt-1 text-ui text-text-light">
            {ABILITY_ORDER.filter((a) => score(a).proficientSave)
              .map((a) => ABILITY_LABEL[a])
              .join('、') || '無'}
          </div>
        </ParchmentCard>

        {/* 剛選完法術就看不到自己選了什麼，等於沒得核對。 */}
        {(c.cantrips.length > 0 || c.spells.length > 0) && (
          <ParchmentCard className="px-4 py-3">
            {c.cantrips.length > 0 && (
              <>
                <div className="font-label text-eyebrow tracking-[1.5px] text-section-label">
                  戲法
                </div>
                <div className="mt-1 text-ui text-text-light">
                  {c.cantrips.map((s) => s.name).join('、')}
                </div>
              </>
            )}
            {c.spells.length > 0 && (
              <>
                <div className="font-label mt-3 text-eyebrow tracking-[1.5px] text-section-label">
                  一環法術（已準備）
                </div>
                <div className="mt-1 text-ui text-text-light">
                  {c.spells.map((s) => s.name).join('、')}
                </div>
              </>
            )}
          </ParchmentCard>
        )}
      </div>
    </div>
  );
}

const fmtMod = (n: number) => `${n >= 0 ? '+' : ''}${n}`;
