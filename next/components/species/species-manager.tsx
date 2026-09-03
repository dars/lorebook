'use client';

import { type ReactNode, useId, useState } from 'react';

import { ParchmentCard, SectionTitle } from '@/components/ui/decorations';
import { EditorSheet, FieldLabel } from '@/components/ui/editor-sheet';
import { SKILLS, type SpeciesAbility } from '@/lib/creation/data';
import { generateShareToken } from '@/lib/share/token';
import {
  deleteCustomSpecies,
  upsertCustomSpecies,
} from '@/lib/species/actions';
import {
  ABILITY_DESC_MAX,
  ABILITY_MAX,
  ABILITY_NAME_MAX,
  DARKVISION_CHOICES,
  DESC_MAX,
  HP_PER_LEVEL_CHOICES,
  NAME_EN_MAX,
  NAME_MAX,
  SIZE_MODES,
  SKILL_PICK_CHOICES,
  SPEED_CHOICES,
  TRAIT_DESC_MAX,
  TRAIT_MAX,
  TRAIT_NAME_MAX,
  USES_CHOICES,
  type CustomSpecies,
  isValid,
  validate,
} from '@/lib/species/types';

/**
 * 自訂種族管理。排列與元件沿用 `components/backgrounds/background-manager.tsx`。
 *
 * **每個機制欄位都是選單或勾選**，沒有任何自由填寫的數值（custom-species
 * D1）：開放輸入的瞬間，App 就得回答「速度 500 呎合不合法」這種問題。
 * 純文字的只有名稱、特性與敘述——那些不驅動任何推導。
 */
const EMPTY: CustomSpecies = {
  id: '',
  name: '',
  nameEn: '',
  speedFt: 30,
  sizeMode: 'medium',
  darkvisionFt: 0,
  hpPerLevel: 0,
  skillPickCount: 0,
  skillPickFrom: [],
  traits: [],
  abilities: [],
  description: '',
};

export function SpeciesManager({
  initial,
  embedded,
  extras,
}: {
  initial: CustomSpecies[];
  embedded?: boolean;
  /** 每一項的附加列（來源備註、分享入口、更新提示），以 id 為鍵。 */
  extras?: Record<string, ReactNode>;
}) {
  const [list, setList] = useState(initial);
  const [editing, setEditing] = useState<CustomSpecies | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<CustomSpecies | null>(null);
  const [error, setError] = useState<string | null>(null);
  const uid = useId();

  const save = async () => {
    if (!editing || !isValid(editing)) return;
    // 128-bit 隨機值。自訂背景當初用時間戳，那是可枚舉的；新型別沒有相容
    // 包袱，直接做對（custom-species D8）。
    const s = { ...editing, id: editing.id || generateShareToken() };
    const r = await upsertCustomSpecies(s);
    if (r.error) return setError(r.error);
    setList((prev) => {
      const i = prev.findIndex((x) => x.id === s.id);
      if (i < 0) return [...prev, s];
      const next = [...prev];
      next[i] = s;
      return next;
    });
    setEditing(null);
    setError(null);
  };

  const remove = async (s: CustomSpecies) => {
    const r = await deleteCustomSpecies(s.id);
    if (r.error) return setError(r.error);
    setList((prev) => prev.filter((x) => x.id !== s.id));
    setConfirmDelete(null);
  };

  const set = <K extends keyof CustomSpecies>(k: K, v: CustomSpecies[K]) =>
    setEditing((e) => (e ? { ...e, [k]: v } : e));

  const problem = editing ? validate(editing) : null;

  return (
    <Wrap embedded={embedded}>
      <SectionTitle en="CUSTOM SPECIES" cn="自訂種族" first={!embedded} />

      {embedded ? (
        <details className="mb-4 rounded-card border border-border-2 bg-surface-1 px-4 py-2.5">
          <summary className="cursor-pointer py-1 text-[12px] text-text-secondary">
            查看自訂種族的規則依據與界限
          </summary>
          <SpeciesRules />
        </details>
      ) : (
        <ParchmentCard className="mb-4 px-4 py-3">
          <div className="text-[13px] font-semibold text-text-primary">
            自訂種族的規則依據與界限
          </div>
          <SpeciesRules />
        </ParchmentCard>
      )}

      {error && (
        <p role="alert" className="mb-3 text-[13px] text-danger">
          {error}
        </p>
      )}

      {list.length === 0 && (
        <div className="mb-3 rounded-card border border-dashed border-border px-4 py-6 text-center">
          <p className="text-[13px] text-text-light">尚未收藏種族</p>
          <p className="mt-1 text-[12px] text-text-secondary">
            建立一個自訂種族，SRD 沒收錄的族群也能拿來建角。
          </p>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {list.map((s) => (
          <ParchmentCard key={s.id} className="px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="flex-1 text-[15px] font-semibold text-text-primary">
                {s.name}
              </span>
              <button
                type="button"
                onClick={() => setEditing(s)}
                className="min-h-11 rounded-chip border border-border-2 px-3 text-[12px] text-gold"
              >
                編輯
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(s)}
                className="min-h-11 rounded-chip px-2 text-[12px] text-text-secondary hover:text-danger"
              >
                刪除
              </button>
            </div>
            <p className="mt-1 text-[12px] text-text-secondary">
              {summary(s)}
            </p>
            {extras?.[s.id]}
          </ParchmentCard>
        ))}
      </div>

      <button
        type="button"
        onClick={() => setEditing({ ...EMPTY })}
        className="mt-4 flex min-h-12 w-full items-center justify-center rounded-card border border-gold bg-gold/10 text-[14px] font-bold text-gold"
      >
        ＋ 新增自訂種族
      </button>

      <EditorSheet
        open={editing !== null}
        title={editing?.id ? '編輯自訂種族' : '新增自訂種族'}
        onClose={() => setEditing(null)}
        onSave={save}
        saveEnabled={problem === null}
      >
        {editing && (
          <>
            <FieldLabel htmlFor={`${uid}-name`}>名稱</FieldLabel>
            <input
              id={`${uid}-name`}
              name="speciesName"
              autoComplete="off"
              spellCheck={false}
              value={editing.name}
              onChange={(e) => set('name', e.target.value)}
              maxLength={NAME_MAX}
              placeholder="例：石裔"
              className="min-h-11 w-full rounded-chip border border-border bg-surface-2 px-3 text-[14px] text-text-primary"
            />

            <div className="mt-4">
              <FieldLabel htmlFor={`${uid}-name-en`}>英文名（選填）</FieldLabel>
              <input
                id={`${uid}-name-en`}
                name="speciesNameEn"
                autoComplete="off"
                spellCheck={false}
                value={editing.nameEn}
                onChange={(e) => set('nameEn', e.target.value)}
                maxLength={NAME_EN_MAX}
                placeholder="例：Stoneborn"
                className="min-h-11 w-full rounded-chip border border-border bg-surface-2 px-3 text-[14px] text-text-primary"
              />
            </div>

            <div className="mt-4">
              <FieldLabel>速度</FieldLabel>
              <Choices
                ariaLabel="速度"
                options={SPEED_CHOICES.map((v) => ({
                  key: v,
                  label: `${v} 呎`,
                }))}
                selected={editing.speedFt}
                onSelect={(v) => set('speedFt', v)}
              />
            </div>

            <div className="mt-4">
              <FieldLabel>體型</FieldLabel>
              <Choices
                ariaLabel="體型"
                options={SIZE_MODES.map((m) => ({ key: m.key, label: m.label }))}
                selected={editing.sizeMode}
                onSelect={(v) => set('sizeMode', v)}
              />
            </div>

            <div className="mt-4">
              <FieldLabel>黑暗視覺</FieldLabel>
              <Choices
                ariaLabel="黑暗視覺"
                options={DARKVISION_CHOICES.map((v) => ({
                  key: v,
                  label: v === 0 ? '無' : `${v} 呎`,
                }))}
                selected={editing.darkvisionFt}
                onSelect={(v) => set('darkvisionFt', v)}
              />
              <p className="mt-1 text-[12px] text-text-secondary">
                選了距離就會自動出現對應的特性條目，不必自己再寫一條。
              </p>
            </div>

            <div className="mt-4">
              <FieldLabel>每級額外 HP</FieldLabel>
              <Choices
                ariaLabel="每級額外 HP"
                options={HP_PER_LEVEL_CHOICES.map((v) => ({
                  key: v,
                  label: v === 0 ? '無' : `+${v}`,
                }))}
                selected={editing.hpPerLevel}
                onSelect={(v) => set('hpPerLevel', v)}
              />
            </div>

            <div className="mt-4">
              <FieldLabel>種族技能可選數</FieldLabel>
              <Choices
                ariaLabel="種族技能可選數"
                options={SKILL_PICK_CHOICES.map((v) => ({
                  key: v,
                  label: v === 0 ? '無' : `選 ${v} 項`,
                }))}
                selected={editing.skillPickCount}
                onSelect={(v) => set('skillPickCount', v)}
              />
            </div>

            {editing.skillPickCount > 0 && (
              <div className="mt-4">
                <FieldLabel>可選技能來源</FieldLabel>
                <p className="mb-2 text-[12px] text-text-secondary">
                  建角時自這裡挑 {editing.skillPickCount} 項。至少需勾選{' '}
                  {editing.skillPickCount + 1} 項（目前{' '}
                  <span
                    className={
                      editing.skillPickFrom.length >= editing.skillPickCount + 1
                        ? 'text-gold'
                        : 'text-danger'
                    }
                  >
                    {editing.skillPickFrom.length}
                  </span>
                  ）——候選與可選數一樣多就不是選擇了。
                </p>
                <div className="grid grid-cols-3 gap-1.5">
                  {SKILLS.map((s) => {
                    const on = editing.skillPickFrom.includes(s.name);
                    return (
                      <button
                        key={s.name}
                        type="button"
                        onClick={() =>
                          set(
                            'skillPickFrom',
                            on
                              ? editing.skillPickFrom.filter((x) => x !== s.name)
                              : [...editing.skillPickFrom, s.name],
                          )
                        }
                        className={`min-h-11 rounded-chip border text-[12px] ${
                          on
                            ? 'border-gold bg-gold/10 text-gold'
                            : 'border-border-2 text-text-secondary'
                        }`}
                      >
                        {s.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <AbilitiesField
              value={editing.abilities}
              onChange={(v) => set('abilities', v)}
            />

            <TraitsField
              value={editing.traits}
              onChange={(v) => set('traits', v)}
            />

            <div className="mt-4">
              <FieldLabel htmlFor={`${uid}-desc`}>敘述（選填）</FieldLabel>
              <textarea
                id={`${uid}-desc`}
                value={editing.description}
                onChange={(e) => set('description', e.target.value)}
                maxLength={DESC_MAX}
                rows={3}
                placeholder="這個種族是什麼樣的人？"
                className="w-full rounded-card border border-border bg-surface-2 p-3 text-[13px] text-text-primary"
              />
            </div>

            <p className="mt-4 text-[12px] leading-relaxed text-text-secondary">
              修改與刪除<span className="text-text-primary">不影響</span>
              已用這個種族建立的角色——種族在建角時就已經快照進角色卡了。
            </p>

            {problem && (
              <p className="mt-2 text-[12px] text-danger">{problem}</p>
            )}
          </>
        )}
      </EditorSheet>

      <EditorSheet
        open={confirmDelete !== null}
        title="刪除自訂種族？"
        saveLabel="刪除"
        saveTone="danger"
        onClose={() => setConfirmDelete(null)}
        onSave={() => confirmDelete && remove(confirmDelete)}
      >
        <p className="text-[13px] leading-relaxed text-text-light">
          「{confirmDelete?.name}」將被刪除。
          <br />
          <span className="text-text-secondary">
            已用此種族建立的角色不受影響——種族在建角時已快照進角色卡。
          </span>
        </p>
      </EditorSheet>
    </Wrap>
  );
}

/** 清單上的一行摘要：先講會影響數值的那幾項。 */
function summary(s: CustomSpecies): string {
  const size =
    s.sizeMode === 'choice' ? '中型／小型' : s.sizeMode === 'small' ? '小型' : '中型';
  return [
    `${s.speedFt} 呎`,
    size,
    s.darkvisionFt > 0 ? `黑暗視覺 ${s.darkvisionFt}` : null,
    s.hpPerLevel > 0 ? `每級 +${s.hpPerLevel} HP` : null,
    s.skillPickCount > 0 ? `技能選 ${s.skillPickCount}` : null,
    s.abilities.length > 0 ? `${s.abilities.length} 項能力` : null,
    s.traits.length > 0 ? `${s.traits.length} 條特性` : null,
  ]
    .filter(Boolean)
    .join('・');
}

/** 單選的 chip 列。所有數值欄位都走這裡——沒有任何一格能自由輸入。 */
function Choices<T extends string | number>({
  ariaLabel,
  options,
  selected,
  onSelect,
}: {
  ariaLabel: string;
  options: { key: T; label: string }[];
  selected: T;
  onSelect: (key: T) => void;
}) {
  return (
    <div role="group" aria-label={ariaLabel} className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button
          key={String(o.key)}
          type="button"
          aria-pressed={selected === o.key}
          onClick={() => onSelect(o.key)}
          className={`min-h-11 rounded-chip border px-4 text-[13px] ${
            selected === o.key
              ? 'border-gold bg-gold/10 font-semibold text-gold'
              : 'border-border-2 text-text-secondary'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/**
 * 有限次數能力（D9）。
 *
 * 「熟練加值」是一個選項而不是數字：SRD 有 3 條特性是這個形狀，寫死數字會
 * 在玩家 5 級熟練加值變 3 時悄悄失準，而且沒有任何徵兆。
 */
function AbilitiesField({
  value,
  onChange,
}: {
  value: SpeciesAbility[];
  onChange: (next: SpeciesAbility[]) => void;
}) {
  const set = (i: number, patch: Partial<SpeciesAbility>) =>
    onChange(value.map((a, j) => (i === j ? { ...a, ...patch } : a)));

  return (
    <div className="mt-4">
      <div className="flex items-baseline gap-2">
        <FieldLabel>有限次數能力（選填）</FieldLabel>
        <button
          type="button"
          disabled={value.length >= ABILITY_MAX}
          onClick={() =>
            onChange([
              ...value,
              { name: '', uses: 1, recovery: 'long', description: '' },
            ])
          }
          className="ml-auto min-h-11 px-2 text-[12px] text-gold disabled:opacity-30"
        >
          ＋ 新增能力
        </button>
      </div>
      <p className="mb-2 text-[12px] leading-relaxed text-text-secondary">
        每則會在角色卡的資源區產生一格，依回復時機參與短休／長休。最多{' '}
        {ABILITY_MAX} 則。
      </p>

      {value.map((a, i) => (
        <div key={i} className="mb-2 rounded-card border border-border-2 p-2">
          <div className="flex gap-2">
            <input
              aria-label="能力名稱"
              autoComplete="off"
              spellCheck={false}
              value={a.name}
              onChange={(e) => set(i, { name: e.target.value })}
              maxLength={ABILITY_NAME_MAX}
              placeholder="例：石膚"
              className="min-h-11 flex-1 rounded-chip border border-border bg-surface-2 px-3 text-[13px] text-text-primary"
            />
            <button
              type="button"
              onClick={() => onChange(value.filter((_, j) => j !== i))}
              aria-label="移除這則能力"
              className="min-h-11 min-w-11 text-text-secondary"
            >
              ×
            </button>
          </div>

          <div className="mt-2 flex flex-wrap gap-3">
            <div>
              <span className="text-[12px] text-text-secondary">次數</span>
              <div className="mt-1">
                <Choices
                  ariaLabel="次數"
                  options={USES_CHOICES.map((u) => ({
                    key: u,
                    label: u === 'proficiency' ? '熟練加值' : `${u} 次`,
                  }))}
                  selected={a.uses}
                  onSelect={(u) => set(i, { uses: u })}
                />
              </div>
            </div>
            <div>
              <span className="text-[12px] text-text-secondary">回復時機</span>
              <div className="mt-1">
                <Choices
                  ariaLabel="回復時機"
                  options={[
                    { key: 'short' as const, label: '短休' },
                    { key: 'long' as const, label: '長休' },
                  ]}
                  selected={a.recovery}
                  onSelect={(r) => set(i, { recovery: r })}
                />
              </div>
            </div>
          </div>

          <textarea
            aria-label="能力說明"
            value={a.description}
            onChange={(e) => set(i, { description: e.target.value })}
            maxLength={ABILITY_DESC_MAX}
            rows={2}
            placeholder="說明（選填）"
            className="mt-2 w-full rounded-card border border-border bg-surface-2 p-2 text-[13px] text-text-primary"
          />
        </div>
      ))}
    </div>
  );
}

/** 特性：純文字條目，可增刪與調整順序（角色卡依這個順序呈現）。 */
function TraitsField({
  value,
  onChange,
}: {
  value: CustomSpecies['traits'];
  onChange: (next: CustomSpecies['traits']) => void;
}) {
  const set = (i: number, patch: Partial<CustomSpecies['traits'][number]>) =>
    onChange(value.map((t, j) => (i === j ? { ...t, ...patch } : t)));

  const move = (i: number, delta: number) => {
    const j = i + delta;
    if (j < 0 || j >= value.length) return;
    const next = [...value];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };

  return (
    <div className="mt-4">
      <div className="flex items-baseline gap-2">
        <FieldLabel>特性（選填）</FieldLabel>
        <button
          type="button"
          disabled={value.length >= TRAIT_MAX}
          onClick={() =>
            onChange([...value, { name: '', nameEn: '', description: '' }])
          }
          className="ml-auto min-h-11 px-2 text-[12px] text-gold disabled:opacity-30"
        >
          ＋ 新增特性
        </button>
      </div>
      <p className="mb-2 text-[12px] leading-relaxed text-text-secondary">
        僅為顯示文字，不會產生規則效果——寫「毒素抗性」不會讓角色卡真的有抗性。
        最多 {TRAIT_MAX} 條。
      </p>

      {value.map((t, i) => (
        <div key={i} className="mb-2 rounded-card border border-border-2 p-2">
          <div className="flex gap-2">
            <input
              aria-label="特性名稱"
              autoComplete="off"
              spellCheck={false}
              value={t.name}
              onChange={(e) => set(i, { name: e.target.value })}
              maxLength={TRAIT_NAME_MAX}
              placeholder="特性名稱"
              className="min-h-11 flex-1 rounded-chip border border-border bg-surface-2 px-3 text-[13px] text-text-primary"
            />
            <button
              type="button"
              onClick={() => move(i, -1)}
              disabled={i === 0}
              aria-label="上移這條特性"
              className="min-h-11 min-w-11 text-text-secondary disabled:opacity-30"
            >
              ↑
            </button>
            <button
              type="button"
              onClick={() => move(i, 1)}
              disabled={i === value.length - 1}
              aria-label="下移這條特性"
              className="min-h-11 min-w-11 text-text-secondary disabled:opacity-30"
            >
              ↓
            </button>
            <button
              type="button"
              onClick={() => onChange(value.filter((_, j) => j !== i))}
              aria-label="移除這條特性"
              className="min-h-11 min-w-11 text-text-secondary"
            >
              ×
            </button>
          </div>
          <textarea
            aria-label="特性說明"
            value={t.description}
            onChange={(e) => set(i, { description: e.target.value })}
            maxLength={TRAIT_DESC_MAX}
            rows={2}
            placeholder="說明（選填）"
            className="mt-2 w-full rounded-card border border-border bg-surface-2 p-2 text-[13px] text-text-primary"
          />
        </div>
      ))}
    </div>
  );
}

/** 獨立頁時自帶 <main> 與限寬；內嵌於收藏紀錄頁時只出內容。 */
function Wrap({
  embedded,
  children,
}: {
  embedded?: boolean;
  children: React.ReactNode;
}) {
  if (embedded) return <section className="min-w-0">{children}</section>;
  return (
    <main
      id="main-content"
      className="mx-auto w-full max-w-[700px] flex-1 px-4 pb-10"
    >
      {children}
    </main>
  );
}

/**
 * 規則依據與界限。
 *
 * 刻意分成兩段：**規則說的**與**這個 App 的取捨**。使用者該分得出「種族不給
 * 能力值加值」是 2024 規則，而「速度限 20–40 呎」是我們畫的線。
 */
function SpeciesRules() {
  return (
    <>
      <ul className="mt-2 flex flex-col gap-1 text-[12px] leading-relaxed text-text-secondary">
        <li>
          · 2024 版的種族
          <span className="text-text-primary">不給能力值加值</span>
          ——那來自背景，所以這裡沒有這一欄
        </li>
        <li>· 種族沒有官方的建構框架（背景有）。自訂種族屬社群 homebrew，使用前請與 DM 確認</li>
      </ul>
      <p className="mt-2 text-[12px] font-semibold text-text-primary">
        以下是這個 App 畫的線，不是規則書的限制：
      </p>
      <ul className="mt-1 flex flex-col gap-1 text-[12px] leading-relaxed text-text-secondary">
        <li>· 速度 20／25／30／35／40 呎（SRD 的實際取值是 25–35）</li>
        <li>· 黑暗視覺 無／60／120 呎</li>
        <li>· 每級額外 HP 0–2（SRD 只有矮人的 1）</li>
        <li>· 種族技能可選數 0–2，候選自 18 技能勾選</li>
        <li>· 特性為純文字，不產生機制效果；有限次數能力則會產生角色卡資源</li>
      </ul>
      <p className="mt-2 text-[12px] text-text-secondary">
        App 只檢查結構合法性，
        <span className="text-text-primary">不判斷強度</span>——平衡是 DM 的職權。
      </p>
    </>
  );
}
