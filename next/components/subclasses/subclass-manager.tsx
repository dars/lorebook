'use client';

import { type ReactNode, useState } from 'react';

import { ParchmentCard, SectionTitle } from '@/components/ui/decorations';
import { EditorSheet } from '@/components/ui/editor-sheet';
import {
  SubclassEditor,
  classCn,
  emptySubclass,
} from '@/components/subclasses/subclass-editor';
import { newCharacterId } from '@/lib/creation/id';
import {
  deleteCustomSubclass,
  upsertCustomSubclass,
} from '@/lib/subclasses/actions';
import {
  type CustomSubclass,
  cleanFeatures,
  validate,
} from '@/lib/subclasses/types';

/**
 * 自訂子職管理。
 *
 * 表單本體在 `SubclassEditor`。
 */

export function SubclassManager({
  initial,
  embedded,
  extras,
}: {
  initial: CustomSubclass[];
  embedded?: boolean;
  /**
   * 每一項的附加列（來源備註、分享入口、更新提示），以 id 為鍵。
   *
   * 傳 ReactNode 而非 render function：這是 client 元件，而組裝那些附加列
   * 需要伺服器端才拿得到的來源與分享狀態——函式跨不過那條界線，元素可以。
   */
  extras?: Record<string, ReactNode>;
}) {
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

  return (
    <Wrap embedded={embedded}>
      <SectionTitle en="CUSTOM SUBCLASSES" cn="自訂子職業" first={!embedded} />

      {embedded ? (
        <details className="mb-4 rounded-card border border-border-2 bg-surface-1 px-4 py-2.5">
          <summary className="cursor-pointer py-1 text-[12px] text-text-secondary">
            查看 2024 子職業結構
          </summary>
          <SubclassRules />
        </details>
      ) : (
        <ParchmentCard className="mb-4 px-4 py-3">
          <div className="text-[13px] font-semibold text-text-primary">2024 版的子職業結構</div>
          <SubclassRules />
        </ParchmentCard>
      )}

      {error && (
        <p role="alert" className="mb-3 text-[13px] text-danger">
          {error}
        </p>
      )}

      {list.length === 0 && (
        <div className="mb-3 rounded-card border border-dashed border-border px-4 py-6 text-center">
          <p className="text-[13px] text-text-light">尚未收藏子職業</p>
          <p className="mt-1 text-[12px] text-text-secondary">建立一個子職業，記錄專屬的成長路線。</p>
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
              {classCn(s.classEn)}・{s.features.length} 個特性（
              {[...new Set(s.features.map((f) => f.level))].sort((a, b) => a - b).join('/')} 級）
            </p>
            {extras?.[s.id]}
          </ParchmentCard>
        ))}
      </div>

      <button
        type="button"
        onClick={() => setEditing(emptySubclass())}
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
            <SubclassEditor value={editing} onChange={setEditing} />
            {problem && <p className="mt-3 text-[12px] text-danger">{problem}</p>}
          </>
        )}
      </EditorSheet>

      <EditorSheet
        open={confirmDelete !== null}
        title="刪除自訂子職？"
        saveLabel="刪除"
        saveTone="danger"
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
  if (embedded) return <section className="min-w-0">{children}</section>;
  return (
    <main id="main-content" className="mx-auto w-full max-w-[700px] flex-1 px-4 pb-10">
      {children}
    </main>
  );
}

function SubclassRules() {
  return (
    <>
      <ul className="mt-2 flex flex-col gap-1 text-[12px] leading-relaxed text-text-secondary">
        <li>· 3 級取得子職，之後在特定等級再獲得特性</li>
        <li>
          · 特性的等級<strong className="text-text-light">依職業而異</strong>，選定母職業後會自動列出
        </li>
        <li>· 同一等級可以有多個特性</li>
      </ul>
      <p className="mt-2 text-[12px] text-text-secondary">這是規則書的結構，不是這個 App 自訂的。</p>
    </>
  );
}
