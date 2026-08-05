'use client';

import { useState } from 'react';

import { ParchmentCard, SectionTitle } from '@/components/ui/decorations';
import { EditorSheet, FieldLabel } from '@/components/ui/editor-sheet';
import { CLASSES } from '@/lib/creation/data';
import { newCharacterId } from '@/lib/creation/id';
import {
  deleteCustomSubclass,
  upsertCustomSubclass,
} from '@/lib/subclasses/actions';
import {
  FEATURE_DESC_MAX,
  FEATURE_NAME_MAX,
  NAME_MAX,
  type CustomSubclass,
  type SubclassFeature,
  cleanFeatures,
  featureLevelsFor,
  validate,
} from '@/lib/subclasses/types';

/**
 * 自訂子職管理。
 *
 * 等級欄位由所選母職業生成——切換職業會重新生成，因為各職業的子職特性等級
 * 不同（戰士 3/7/10/15/18、牧師 3/6/17）。使用者不必知道那張表。
 */
const EMPTY = (): CustomSubclass => ({
  id: '',
  name: '',
  nameEn: '',
  classEn: '',
  levels: [],
  features: [],
});

export function SubclassManager({ initial }: { initial: CustomSubclass[] }) {
  const [list, setList] = useState(initial);
  const [editing, setEditing] = useState<CustomSubclass | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<CustomSubclass | null>(null);
  const [error, setError] = useState<string | null>(null);

  const problem = editing ? validate(editing) : null;

  const save = async () => {
    if (!editing || problem) return;
    const s: CustomSubclass = {
      ...editing,
      id: editing.id || newCharacterId(),
      name: editing.name.trim(),
      features: cleanFeatures(editing.features),
    };
    const r = await upsertCustomSubclass(s);
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

  const remove = async (s: CustomSubclass) => {
    const r = await deleteCustomSubclass(s.id);
    if (r.error) return setError(r.error);
    setList((prev) => prev.filter((x) => x.id !== s.id));
    setConfirmDelete(null);
  };

  const setField = <K extends keyof CustomSubclass>(
    k: K,
    v: CustomSubclass[K],
  ) => setEditing((e) => (e ? { ...e, [k]: v } : e));

  const pickClass = (classEn: string) => {
    const levels = featureLevelsFor(classEn);
    setEditing((e) =>
      e
        ? {
            ...e,
            classEn,
            levels,
            // 換職業時保留仍在新等級表內的特性，其餘捨棄——
            // 戰士的 7 級特性搬到牧師身上沒有意義。
            features: e.features.filter((f) => levels.includes(f.level)),
          }
        : e,
    );
  };

  const addFeature = (level: number) =>
    setEditing((e) =>
      e
        ? { ...e, features: [...e.features, { level, name: '', description: '' }] }
        : e,
    );

  const setFeature = (index: number, patch: Partial<SubclassFeature>) =>
    setEditing((e) =>
      e
        ? {
            ...e,
            features: e.features.map((f, i) => (i === index ? { ...f, ...patch } : f)),
          }
        : e,
    );

  const removeFeature = (index: number) =>
    setEditing((e) =>
      e ? { ...e, features: e.features.filter((_, i) => i !== index) } : e,
    );

  const classCn = (en: string) => CLASSES.find((c) => c.en === en)?.cn ?? en;

  return (
    <main className="mx-auto w-full max-w-[700px] flex-1 px-4 pb-10">
      <SectionTitle en="CUSTOM SUBCLASSES" cn="自訂子職業" first />

      <ParchmentCard className="mb-4 px-4 py-3">
        <div className="text-[13px] font-semibold text-text-primary">
          2024 版的子職業結構
        </div>
        <ul className="mt-2 flex flex-col gap-1 text-[12px] leading-relaxed text-text-secondary">
          <li>· 3 級取得子職，之後在特定等級再獲得特性</li>
          <li>
            · 特性的等級<strong className="text-text-light">依職業而異</strong>，
            選定母職業後會自動列出
          </li>
          <li>· 同一等級可以有多個特性</li>
        </ul>
        <p className="mt-2 text-[11px] text-text-secondary">
          這是規則書的結構，不是這個 App 自訂的。
        </p>
      </ParchmentCard>

      {error && <p className="mb-3 text-[13px] text-danger">{error}</p>}

      <div className="flex flex-col gap-2">
        {list.map((s) => (
          <ParchmentCard key={s.id} className="px-4 py-3">
            <div className="flex items-baseline gap-2">
              <span className="flex-1 text-[15px] font-semibold text-text-primary">
                {s.name}
              </span>
              <button
                type="button"
                onClick={() => setEditing(s)}
                className="min-h-9 text-[12px] text-gold"
              >
                編輯
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(s)}
                className="min-h-9 text-[12px] text-text-secondary"
              >
                刪除
              </button>
            </div>
            <p className="mt-1 text-[12px] text-text-secondary">
              {classCn(s.classEn)}・{s.features.length} 個特性（
              {[...new Set(s.features.map((f) => f.level))].sort((a, b) => a - b).join('/')} 級）
            </p>
          </ParchmentCard>
        ))}
      </div>

      <button
        type="button"
        onClick={() => setEditing(EMPTY())}
        className="mt-4 flex min-h-12 w-full items-center justify-center rounded-card border border-gold bg-gold/10 text-[14px] font-bold text-gold"
      >
        ＋ 新增自訂子職
      </button>

      <EditorSheet
        open={editing !== null}
        title={editing?.id ? '編輯自訂子職' : '新增自訂子職'}
        onClose={() => setEditing(null)}
        onSave={save}
        saveEnabled={problem === null}
      >
        {editing && (
          <>
            <FieldLabel>名稱</FieldLabel>
            <input
              value={editing.name}
              onChange={(e) => setField('name', e.target.value)}
              maxLength={NAME_MAX}
              placeholder="例：烈焰學派"
              className="min-h-11 w-full rounded-chip border border-border bg-surface-2 px-3 text-[14px] text-text-primary"
            />

            <div className="mt-4">
              <FieldLabel>母職業</FieldLabel>
              <div className="grid grid-cols-3 gap-1.5">
                {CLASSES.map((c) => (
                  <button
                    key={c.en}
                    type="button"
                    onClick={() => pickClass(c.en)}
                    className={`min-h-11 rounded-chip border text-[12px] ${
                      editing.classEn === c.en
                        ? 'border-gold bg-gold/10 text-gold'
                        : 'border-border-2 text-text-secondary'
                    }`}
                  >
                    {c.cn}
                  </button>
                ))}
              </div>
            </div>

            {editing.levels.length > 0 && (
              <div className="mt-4">
                <FieldLabel>特性</FieldLabel>
                <p className="mb-2 text-[11px] text-text-secondary">
                  {classCn(editing.classEn)}的子職在 {editing.levels.join('、')} 級
                  獲得特性。3 級必填，其餘可留空。
                </p>

                {editing.levels.map((level) => {
                  const items = editing.features
                    .map((f, i) => ({ f, i }))
                    .filter(({ f }) => f.level === level);
                  return (
                    <div key={level} className="mb-3">
                      <div className="mb-1 flex items-baseline gap-2">
                        <span className="text-[12px] text-gold">{level} 級</span>
                        {level === 3 && (
                          <span className="text-[11px] text-text-secondary">必填</span>
                        )}
                        <button
                          type="button"
                          onClick={() => addFeature(level)}
                          className="ml-auto min-h-9 text-[11px] text-gold"
                        >
                          ＋ 新增特性
                        </button>
                      </div>

                      {items.length === 0 ? (
                        <p className="text-[11px] text-text-secondary">尚未新增。</p>
                      ) : (
                        items.map(({ f, i }) => (
                          <div
                            key={i}
                            className="mb-2 rounded-card border border-border-2 p-2"
                          >
                            <div className="flex gap-2">
                              <input
                                value={f.name}
                                onChange={(e) => setFeature(i, { name: e.target.value })}
                                maxLength={FEATURE_NAME_MAX}
                                placeholder="特性名稱"
                                className="min-h-11 flex-1 rounded-chip border border-border bg-surface-2 px-3 text-[13px] text-text-primary"
                              />
                              <button
                                type="button"
                                onClick={() => removeFeature(i)}
                                aria-label="移除這個特性"
                                className="min-h-11 min-w-11 text-text-secondary"
                              >
                                ×
                              </button>
                            </div>
                            <textarea
                              value={f.description}
                              onChange={(e) =>
                                setFeature(i, { description: e.target.value })
                              }
                              maxLength={FEATURE_DESC_MAX}
                              rows={3}
                              placeholder="說明（選填）"
                              className="mt-2 w-full rounded-card border border-border bg-surface-2 p-2 text-[13px] text-text-primary"
                            />
                          </div>
                        ))
                      )}
                    </div>
                  );
                })}

                <p className="text-[11px] leading-relaxed text-text-secondary">
                  特性僅為顯示文字，不會產生規則效果——寫「+2 AC」不會反映在角色卡的
                  護甲等級上，數值請自行與 DM 確認。
                </p>
              </div>
            )}

            {problem && <p className="mt-3 text-[12px] text-danger">{problem}</p>}
          </>
        )}
      </EditorSheet>

      <EditorSheet
        open={confirmDelete !== null}
        title="刪除自訂子職？"
        onClose={() => setConfirmDelete(null)}
        onSave={() => confirmDelete && remove(confirmDelete)}
      >
        <p className="text-[13px] leading-relaxed text-text-light">
          「{confirmDelete?.name}」將被刪除。
          <br />
          <span className="text-text-secondary">
            已選用此子職的角色不受影響——子職在選用時已整份快照進角色卡，
            之後升級也是自快照取用。
          </span>
        </p>
      </EditorSheet>
    </main>
  );
}
