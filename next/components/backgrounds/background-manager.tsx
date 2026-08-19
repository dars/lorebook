'use client';

import { useId, useState } from 'react';

import { ParchmentCard, SectionTitle } from '@/components/ui/decorations';
import { EditorSheet, FieldLabel } from '@/components/ui/editor-sheet';
import {
  deleteCustomBackground,
  upsertCustomBackground,
} from '@/lib/backgrounds/actions';
import {
  ABILITY_LABELS,
  type CustomBackground,
  NAME_MAX,
  ORIGIN_FEAT_CHOICES,
  ORIGIN_FEAT_DESC_MAX,
  ORIGIN_FEAT_NAME_MAX,
  isValid,
} from '@/lib/backgrounds/types';
import { SKILLS } from '@/lib/creation/data';
import { newCharacterId } from '@/lib/creation/id';

/**
 * 自訂背景管理，對照 Flutter 端的 `CustomBackgroundEditPage`。
 *
 * 2024 的背景建構規則（恰 3 個能力候選、恰 2 個技能、1 個起源專長）明白寫在
 * 畫面上——那是規則書的限制，不是這個 App 自訂的，使用者該知道差別。
 *
 * 起源專長可選 SRD 清單或自行填寫。**模式由旗標決定而非名稱**：使用者自訂一個
 * 也叫「警覺」的專長時，那就是他的專長，不該被當成 SRD 的那個。
 */
const EMPTY: CustomBackground = {
  id: '',
  name: '',
  abilities: [],
  skills: [],
  originFeat: ORIGIN_FEAT_CHOICES[0],
  toolProficiency: '',
  originFeatCustom: false,
  originFeatDescription: '',
  description: '',
};

export function BackgroundManager({
  initial,
  embedded,
}: {
  initial: CustomBackground[];
  embedded?: boolean;
}) {
  const [list, setList] = useState(initial);
  const [editing, setEditing] = useState<CustomBackground | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<CustomBackground | null>(null);
  const [error, setError] = useState<string | null>(null);
  const uid = useId();

  const save = async () => {
    if (!editing || !isValid(editing)) return;
    const b = { ...editing, id: editing.id || newCharacterId() };
    const r = await upsertCustomBackground(b);
    if (r.error) return setError(r.error);
    setList((prev) => {
      const i = prev.findIndex((x) => x.id === b.id);
      if (i < 0) return [...prev, b];
      const next = [...prev];
      next[i] = b;
      return next;
    });
    setEditing(null);
    setError(null);
  };

  const remove = async (b: CustomBackground) => {
    const r = await deleteCustomBackground(b.id);
    if (r.error) return setError(r.error);
    setList((prev) => prev.filter((x) => x.id !== b.id));
    setConfirmDelete(null);
  };

  const set = <K extends keyof CustomBackground>(
    k: K,
    v: CustomBackground[K],
  ) => setEditing((e) => (e ? { ...e, [k]: v } : e));

  return (
    <Wrap embedded={embedded}>
      <SectionTitle en="CUSTOM BACKGROUNDS" cn="自訂背景" first={!embedded} />

      <ParchmentCard className="mb-4 px-4 py-3">
        <div className="text-[13px] font-semibold text-text-primary">
          2024 版的背景建構規則
        </div>
        <ul className="mt-2 flex flex-col gap-1 text-[12px] leading-relaxed text-text-secondary">
          <li>· 三個能力值加值候選（建角時分配 +2/+1 或三項各 +1）</li>
          <li>· 兩個固定技能熟練</li>
          <li>· 一個起源專長</li>
          <li>· 可選一項工具熟練</li>
        </ul>
        <p className="mt-2 text-[12px] text-text-secondary">
          這是規則書的限制，不是這個 App 自訂的。
        </p>
      </ParchmentCard>

      {error && (
        <p role="alert" className="mb-3 text-[13px] text-danger">
          {error}
        </p>
      )}

      <div className="flex flex-col gap-2">
        {list.map((b) => (
          <ParchmentCard key={b.id} className="px-4 py-3">
            <div className="flex items-baseline gap-2">
              <span className="flex-1 text-[15px] font-semibold text-text-primary">
                {b.name}
              </span>
              <button
                type="button"
                onClick={() => setEditing(b)}
                className="min-h-9 text-[12px] text-gold"
              >
                編輯
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(b)}
                className="min-h-9 text-[12px] text-text-secondary"
              >
                刪除
              </button>
            </div>
            <p className="mt-1 text-[12px] text-text-secondary">
              {b.abilities.map((a) => ABILITY_LABELS[a] ?? a).join('、')}・
              {b.skills.join('、')}・{b.originFeat}
              {b.originFeatCustom && '（自訂）'}
              {b.toolProficiency && `・${b.toolProficiency}`}
            </p>
          </ParchmentCard>
        ))}
      </div>

      <button
        type="button"
        onClick={() => setEditing({ ...EMPTY })}
        className="mt-4 flex min-h-12 w-full items-center justify-center rounded-card border border-gold bg-gold/10 text-[14px] font-bold text-gold"
      >
        ＋ 新增自訂背景
      </button>

      <EditorSheet
        open={editing !== null}
        title={editing?.id ? '編輯自訂背景' : '新增自訂背景'}
        onClose={() => setEditing(null)}
        onSave={save}
        saveEnabled={editing ? isValid(editing) : false}
      >
        {editing && (
          <>
            <FieldLabel htmlFor={`${uid}-name`}>名稱</FieldLabel>
            <input
              id={`${uid}-name`}
              name="backgroundName"
              autoComplete="off"
              spellCheck={false}
              value={editing.name}
              onChange={(e) => set('name', e.target.value)}
              maxLength={NAME_MAX}
              placeholder="例：荒野嚮導"
              className="min-h-11 w-full rounded-chip border border-border bg-surface-2 px-3 text-[14px] text-text-primary"
            />

            <div className="mt-4">
              <FieldLabel>能力值加值候選（選 3）</FieldLabel>
              <div className="grid grid-cols-3 gap-1.5">
                {Object.entries(ABILITY_LABELS).map(([code, label]) => {
                  const on = editing.abilities.includes(code);
                  const full = editing.abilities.length >= 3;
                  return (
                    <button
                      key={code}
                      type="button"
                      disabled={!on && full}
                      onClick={() =>
                        set(
                          'abilities',
                          on
                            ? editing.abilities.filter((a) => a !== code)
                            : [...editing.abilities, code],
                        )
                      }
                      className={`min-h-11 rounded-chip border text-[12px] disabled:opacity-30 ${
                        on ? 'border-gold bg-gold/10 text-gold' : 'border-border-2 text-text-secondary'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-4">
              <FieldLabel>技能熟練（選 2）</FieldLabel>
              <div className="grid grid-cols-3 gap-1.5">
                {SKILLS.map((s) => {
                  const on = editing.skills.includes(s.name);
                  const full = editing.skills.length >= 2;
                  return (
                    <button
                      key={s.name}
                      type="button"
                      disabled={!on && full}
                      onClick={() =>
                        set(
                          'skills',
                          on
                            ? editing.skills.filter((x) => x !== s.name)
                            : [...editing.skills, s.name],
                        )
                      }
                      className={`min-h-11 rounded-chip border text-[12px] disabled:opacity-30 ${
                        on ? 'border-gold bg-gold/10 text-gold' : 'border-border-2 text-text-secondary'
                      }`}
                    >
                      {s.name}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-4">
              <FieldLabel>起源專長</FieldLabel>
              <div className="mb-2 flex gap-2">
                {[false, true].map((custom) => (
                  <button
                    key={String(custom)}
                    type="button"
                    onClick={() => {
                      set('originFeatCustom', custom);
                      set('originFeat', custom ? '' : ORIGIN_FEAT_CHOICES[0]);
                      set('originFeatDescription', '');
                    }}
                    className={`min-h-11 flex-1 rounded-card border text-[13px] ${
                      editing.originFeatCustom === custom
                        ? 'border-gold bg-gold/10 text-gold'
                        : 'border-border-2 text-text-secondary'
                    }`}
                  >
                    {custom ? '自行填寫' : '自 SRD 選擇'}
                  </button>
                ))}
              </div>

              {editing.originFeatCustom ? (
                <>
                  <input
                    aria-label="自訂起源專長名稱"
                    autoComplete="off"
                    spellCheck={false}
                    value={editing.originFeat}
                    onChange={(e) => set('originFeat', e.target.value)}
                    maxLength={ORIGIN_FEAT_NAME_MAX}
                    placeholder="專長名稱，例：荒野嚮導"
                    className="min-h-11 w-full rounded-chip border border-border bg-surface-2 px-3 text-[14px] text-text-primary"
                  />
                  <textarea
                    aria-label="自訂起源專長說明"
                    value={editing.originFeatDescription}
                    onChange={(e) => set('originFeatDescription', e.target.value)}
                    maxLength={ORIGIN_FEAT_DESC_MAX}
                    rows={3}
                    placeholder="說明（選填）：這個專長做什麼…"
                    className="mt-2 w-full rounded-card border border-border bg-surface-2 p-3 text-[13px] text-text-primary"
                  />
                  <p className="mt-1 text-[12px] text-text-secondary">
                    自訂專長僅為顯示文字，不會產生規則效果——數值請自行與 DM 確認。
                  </p>
                </>
              ) : (
                <div className="grid grid-cols-2 gap-1.5">
                  {ORIGIN_FEAT_CHOICES.map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => set('originFeat', f)}
                      className={`min-h-11 rounded-chip border text-[12px] ${
                        editing.originFeat === f
                          ? 'border-gold bg-gold/10 text-gold'
                          : 'border-border-2 text-text-secondary'
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-4">
              <FieldLabel htmlFor={`${uid}-tool`}>工具熟練（選填）</FieldLabel>
              <input
                id={`${uid}-tool`}
                name="toolProficiency"
                autoComplete="off"
                spellCheck={false}
                value={editing.toolProficiency}
                onChange={(e) => set('toolProficiency', e.target.value)}
                maxLength={20}
                placeholder="例：盜賊工具"
                className="min-h-11 w-full rounded-chip border border-border bg-surface-2 px-3 text-[14px] text-text-primary"
              />
            </div>
          </>
        )}
      </EditorSheet>

      <EditorSheet
        open={confirmDelete !== null}
        title="刪除自訂背景？"
        saveLabel="刪除"
        saveTone="danger"
        onClose={() => setConfirmDelete(null)}
        onSave={() => confirmDelete && remove(confirmDelete)}
      >
        <p className="text-[13px] leading-relaxed text-text-light">
          「{confirmDelete?.name}」將被刪除。
          <br />
          <span className="text-text-secondary">
            已用此背景建立的角色不受影響——背景在建角時已快照進角色卡。
          </span>
        </p>
      </EditorSheet>
    </Wrap>
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
  if (embedded) return <>{children}</>;
  return (
    <main id="main-content" className="mx-auto w-full max-w-[700px] flex-1 px-4 pb-10">
      {children}
    </main>
  );
}
