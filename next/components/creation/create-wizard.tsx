'use client';

import { useState } from 'react';

import { ParchmentCard, SectionTitle } from '@/components/ui/decorations';
import type { CatalogSpell } from '@/lib/catalog/types';
import { createCharacter } from '@/lib/creation/actions';
import {
  bonusMap,
  buildCharacter,
  pointsSpent,
  POINT_BUY_BUDGET,
  skillTakenBy,
  type BonusMode,
} from '@/lib/creation/build';
import {
  ABILITY_ORDER,
  BACKGROUNDS,
  type BackgroundOption,
  CLASSES,
  SKILLS,
  SPECIES,
  isCaster,
} from '@/lib/creation/data';
import { newCharacterId } from '@/lib/creation/id';
import type { Spell } from '@/lib/domain/character';
import { AbilityStep, type Method } from './ability-step';

/**
 * 建角精靈，對照 Flutter 端的 `CharacterCreatePage`。
 *
 * 步驟依職業動態決定：施法職業多一步「法術」（7 步），非施法維持 6 步。
 * 每一步都有明確的通過條件，未達成時「下一步」不可按——而非讓使用者按下去
 * 才被擋，那只會讓人不知道少了什麼。
 */

const ABILITY_LABEL: Record<string, string> = {
  STR: '力量', DEX: '敏捷', CON: '體質',
  INT: '智力', WIS: '感知', CHA: '魅力',
};

export function CreateWizard({
  spells,
  customBackgrounds = [],
}: {
  spells: CatalogSpell[];
  /** 自訂背景，與內建並列供選擇。 */
  customBackgrounds?: BackgroundOption[];
}) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
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

  const species = SPECIES.find((s) => s.cn === speciesCn) ?? null;
  const cls = CLASSES.find((c) => c.cn === classCn) ?? null;
  const allBackgrounds = [...BACKGROUNDS, ...customBackgrounds];
  const bg = allBackgrounds.find((b) => b.cn === bgCn) ?? null;
  const caster = cls ? isCaster(cls) : false;

  const steps = [
    '基本', '職業', '背景', '能力值', '技能',
    ...(caster ? ['法術'] : []),
    '確認',
  ];
  const current = steps[Math.min(step, steps.length - 1)];

  // 不 memo：只是六個鍵的物件，每次算的成本遠低於維護相依清單的風險。
  const bonus = bg
    ? bonusMap(bg, bonusMode, plus2 ?? undefined, plus1 ?? undefined)
    : Object.fromEntries(ABILITY_ORDER.map((a) => [a, 0]));

  const filled = ABILITY_ORDER.every((a) => base[a] !== null);
  const canNext = (() => {
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
    return {
      name,
      nameEn: s?.eng_name ?? '',
      level,
      description: '',
      upgrade: '',
      damage: '',
      damageType: '',
      range: '',
      castingTime: '1 action',
      castKind: 'action',
      prepared: true,
      concentration: s?.concentration ?? false,
    };
  };

  const preview = () =>
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
          },
          newCharacterId(),
        )
      : null;

  const submit = async () => {
    const c = preview();
    if (!c) return;
    setBusy(true);
    const r = await createCharacter(c);
    if (r.error) {
      setError(r.error);
      setBusy(false);
    }
    // 成功時 Server Action 會 redirect，不需要在此處理。
  };

  return (
    <main className="mx-auto w-full max-w-[700px] flex-1 px-4 pb-32">
      <div className="pt-5">
        <div className="font-label text-[10px] tracking-[1.5px] text-section-label">
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
          <>
            <SectionTitle en="NAME" cn="名稱" first />
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={30}
              placeholder="你的角色叫什麼？"
              className="min-h-11 w-full rounded-chip border border-border bg-surface-2 px-3 text-[14px] text-text-primary"
            />
            <SectionTitle en="SPECIES" cn="物種" />
            <OptionList
              options={SPECIES.map((s) => ({
                key: s.cn,
                title: s.cn,
                sub: s.en,
                desc: s.traits.map((t) => t.name).join('、'),
              }))}
              selected={speciesCn}
              onSelect={(k) => {
                setSpeciesCn(k);
                setSizeChoice(null);
                setSpeciesSkills([]);
              }}
            />
            {species && species.sizeChoices.length > 1 && (
              <>
                <SectionTitle en="SIZE" cn="體型" />
                <div className="flex gap-2">
                  {species.sizeChoices.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSizeChoice(s)}
                      className={`min-h-11 flex-1 rounded-card border text-[13px] ${
                        (sizeChoice ?? species.size) === s
                          ? 'border-gold bg-gold/10 text-gold'
                          : 'border-border-2 text-text-secondary'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </>
            )}
          </>
        )}

        {current === '職業' && (
          <OptionList
            options={CLASSES.map((c) => ({
              key: c.cn,
              title: c.cn,
              sub: c.en,
              desc: `生命骰 d${c.hitDie}・${isCaster(c) ? `施法（${ABILITY_LABEL[c.spellAbility]}）` : '非施法'}・選 ${c.skillCount} 技能`,
            }))}
            selected={classCn}
            onSelect={(k) => {
              setClassCn(k);
              setClassSkills([]);
              setSelCantrips([]);
              setSelSpells([]);
            }}
          />
        )}

        {current === '背景' && (
          <>
            <OptionList
              options={allBackgrounds.map((b) => ({
                key: b.cn,
                title: b.cn + (b.originFeatCustom || !b.en ? '（自訂）' : ''),
                sub: b.en,
                desc: `${b.skills.join('、')}・${b.originFeat}${b.toolProficiency ? `・${b.toolProficiency}` : ''}`,
              }))}
              selected={bgCn}
              onSelect={(k) => {
                setBgCn(k);
                setPlus2(null);
                setPlus1(null);
                setClassSkills([]);
              }}
            />
            {bg && (
              <>
                <SectionTitle en="ABILITY BONUS" cn="能力加值" />
                <p className="mb-2 text-[12px] text-text-secondary">
                  背景給 {bg.abilities.map((a) => ABILITY_LABEL[a]).join('、')}{' '}
                  三項中的加值，二選一種分配方式。
                </p>
                <div className="flex gap-2">
                  {(['2/1', '1/1/1'] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setBonusMode(m)}
                      className={`min-h-11 flex-1 rounded-card border text-[13px] ${
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
                        <div className="mb-1 text-[12px] text-text-secondary">
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
                                className={`min-h-11 flex-1 rounded-chip border text-[13px] disabled:opacity-30 ${
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

        {current === '能力值' && (
          <AbilityStep
            method={method}
            onMethod={(m) => {
              setMethod(m);
              setBase(Object.fromEntries(ABILITY_ORDER.map((a) => [a, m === 'buy' ? 8 : null])));
            }}
            base={base}
            onBase={setBase}
            bonus={bonus}
          />
        )}

        {current === '技能' && cls && bg && species && (
          <>
            <SectionTitle en="CLASS" cn={`職業（選 ${cls.skillCount}）`} first />
            <SkillPicker
              names={cls.skillChoices}
              selected={classSkills}
              max={cls.skillCount}
              taken={(n) => skillTakenBy(n, bg, classSkills, speciesSkills, 'class')}
              onToggle={setClassSkills}
            />
            {species.skillPickCount > 0 && (
              <>
                <SectionTitle
                  en="SPECIES"
                  cn={`${species.cn}（選 ${species.skillPickCount}）`}
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
          </>
        )}

        {current === '法術' && cls && (
          <>
            {spells.length === 0 ? (
              <p className="text-[13px] text-text-secondary">
                內容庫目前無法取得，法術可於建立後再補。
              </p>
            ) : (
              <>
                <SectionTitle en="CANTRIPS" cn={`戲法（選 ${cls.cantripsKnown}）`} first />
                <SpellPicker
                  options={spells.filter(
                    (s) => s.level === 0 && s.classes.includes(cls.en),
                  )}
                  selected={selCantrips}
                  max={cls.cantripsKnown}
                  onToggle={setSelCantrips}
                />
                <SectionTitle en="SPELLS" cn={`一環法術（選 ${cls.preparedSpells}）`} />
                <SpellPicker
                  options={spells.filter(
                    (s) => s.level === 1 && s.classes.includes(cls.en),
                  )}
                  selected={selSpells}
                  max={cls.preparedSpells}
                  onToggle={setSelSpells}
                />
              </>
            )}
          </>
        )}

        {current === '確認' && <Confirm c={preview()} />}
      </div>

      {error && <p className="mt-3 text-[13px] text-danger">{error}</p>}

      <div className="fixed inset-x-0 bottom-0 border-t border-border-2 bg-surface-0 p-4">
        <div className="mx-auto flex max-w-[700px] gap-2">
          {step > 0 && (
            <button
              type="button"
              onClick={() => setStep((s) => s - 1)}
              className="min-h-12 flex-1 rounded-card border border-border text-[14px] text-text-secondary"
            >
              上一步
            </button>
          )}
          {current === '確認' ? (
            <button
              type="button"
              onClick={submit}
              disabled={busy || !preview()}
              className="min-h-12 flex-2 rounded-card border border-gold bg-gold/10 text-[14px] font-bold text-gold disabled:opacity-40"
            >
              {busy ? '建立中…' : '建立角色'}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setStep((s) => s + 1)}
              disabled={!canNext}
              className="min-h-12 flex-2 rounded-card border border-gold bg-gold/10 text-[14px] font-bold text-gold disabled:opacity-40"
            >
              下一步
            </button>
          )}
        </div>
      </div>
    </main>
  );
}

function OptionList({
  options,
  selected,
  onSelect,
}: {
  options: { key: string; title: string; sub: string; desc: string }[];
  selected: string | null;
  onSelect: (k: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      {options.map((o) => (
        <button key={o.key} type="button" onClick={() => onSelect(o.key)} className="text-left">
          <ParchmentCard
            className={`px-4 py-3 ${selected === o.key ? 'border-gold' : ''}`}
          >
            <div className="flex items-baseline gap-2">
              <span className="text-[15px] font-semibold text-text-primary">
                {o.title}
              </span>
              <span className="font-label text-[11px] text-text-primary/45">
                {o.sub}
              </span>
            </div>
            {o.desc && (
              <p className="mt-1 text-[12px] leading-relaxed text-text-secondary">
                {o.desc}
              </p>
            )}
          </ParchmentCard>
        </button>
      ))}
    </div>
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
            <span className={`text-[13px] ${on ? 'text-gold' : 'text-text-primary'}`}>
              {n}
            </span>
            <span className="font-label text-[11px] text-text-primary/40">{en}</span>
            {by && (
              <span className="ml-auto text-[11px] text-text-secondary">（{by}）</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function SpellPicker({
  options,
  selected,
  max,
  onToggle,
}: {
  options: CatalogSpell[];
  selected: string[];
  max: number;
  onToggle: (v: string[]) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((s) => {
        const on = selected.includes(s.name);
        const disabled = !on && selected.length >= max;
        return (
          <button
            key={s.id}
            type="button"
            disabled={disabled}
            onClick={() =>
              onToggle(on ? selected.filter((x) => x !== s.name) : [...selected, s.name])
            }
            className={`min-h-11 rounded-chip border px-3 text-[12px] disabled:opacity-30 ${
              on ? 'border-gold bg-gold/10 text-gold' : 'border-border-2 text-text-secondary'
            }`}
          >
            {s.name}
          </button>
        );
      })}
    </div>
  );
}

/** 確認頁顯示的是**實際會存下的角色**，不是另外算一次的預覽。 */
function Confirm({ c }: { c: ReturnType<typeof buildCharacter> | null }) {
  if (!c) return <p className="text-[13px] text-danger">資料不完整，請回前面的步驟檢查。</p>;
  return (
    <div className="flex flex-col gap-2">
      <ParchmentCard className="px-4 py-3">
        <div className="text-[18px] font-bold text-gold">{c.name}</div>
        <div className="mt-1 text-[13px] text-text-light">
          {c.species} · {c.className} {c.level} 級 · {c.background}
        </div>
      </ParchmentCard>
      <div className="grid grid-cols-3 gap-2">
        {[
          ['生命值', `${c.maxHp}`],
          ['護甲等級', `${c.ac}`],
          ['被動察覺', `${c.passivePerception}`],
        ].map(([k, v]) => (
          <ParchmentCard key={k} className="py-3">
            <div className="flex flex-col items-center">
              <span className="font-display text-[22px] font-bold text-gold">{v}</span>
              <span className="mt-0.5 text-[10px] text-text-primary/55">{k}</span>
            </div>
          </ParchmentCard>
        ))}
      </div>
      <ParchmentCard className="px-4 py-3">
        <div className="grid grid-cols-3 gap-2">
          {ABILITY_ORDER.map((a) => {
            const s = c.abilityScores[
              (a === 'INT' ? 'int_' : a.toLowerCase()) as keyof typeof c.abilityScores
            ];
            return (
              <span key={a} className="flex items-baseline justify-between">
                <span className="text-[12px] text-text-secondary">{ABILITY_LABEL[a]}</span>
                <span className="text-[15px] font-bold text-gold">
                  {s.score}
                  <span className="ml-1 text-[11px] text-text-secondary">
                    ({s.modifier >= 0 ? '+' : ''}{s.modifier})
                  </span>
                </span>
              </span>
            );
          })}
        </div>
      </ParchmentCard>
      <ParchmentCard className="px-4 py-3">
        <div className="text-[12px] text-text-secondary">熟練技能</div>
        <div className="mt-1 text-[13px] text-text-light">
          {c.skills.filter((s) => s.proficient).map((s) => s.name).join('、') || '無'}
        </div>
      </ParchmentCard>
    </div>
  );
}
