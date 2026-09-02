'use client';

import { useEffect, useState } from 'react';

import { ParchmentCard, SectionTitle } from '@/components/ui/decorations';
import { EditorSheet } from '@/components/ui/editor-sheet';
import type { Character } from '@/lib/domain/character';
import { JournalEditor } from '@/components/journal/journal-editor';
import { fmtJournalRelativeDate } from '@/lib/journal/format';
import { joinJournalText, splitJournalText } from '@/lib/journal/split';
import {
  characterActions,
  useCharacterStore,
} from '@/lib/state/character-store';
import { useCharacterSync } from '@/lib/state/sync';

/** 旅程分頁，對照 Flutter 端的 `JournalPage` ＋ `showJournalEditor`。 */
export function JournalView({
  initial,
  persist = true,
}: {
  initial: Character;
  /** false＝試玩模式：不推雲端，並在頁首說明變更不會保存。 */
  persist?: boolean;
}) {
  const load = useCharacterStore((s) => s.load);
  const stored = useCharacterStore((s) => s.character);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState({ title: '', body: '' });
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  // 關閉時若有未儲存的變更先攔一下——編輯器是全螢幕的 sheet，誤觸關閉會整篇消失。
  const [original, setOriginal] = useState('');
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  useEffect(() => {
    load(initial);
  }, [initial, load]);
  useCharacterSync(persist);

  const c = stored ?? initial;
  const entries = [...c.journalEntries].sort(
    (a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt),
  );

  const open = (id: string) => {
    const e = id === 'new' ? null : entries.find((x) => x.id === id);
    setDraft({ title: e?.title ?? '', body: e?.body ?? '' });
    // 比對用的快照仍是合併後的字串——只是拿來判斷有沒有改過。
    setOriginal(e ? joinJournalText(e.title, e.body) : '');
    setEditing(id);
  };

  const save = () => {
    // 仍走 splitJournalText：它負責「全空不建立」與「有內文但沒標題給
    // 未命名」這兩條規則，那些不該在編輯器裡重寫一遍。
    const parts = splitJournalText(joinJournalText(draft.title, draft.body));
    if (parts) {
      if (editing === 'new') {
        characterActions.addJournalEntry(parts.title, parts.body);
      } else if (editing) {
        characterActions.updateJournalEntry(editing, parts.title, parts.body);
      }
    }
    setEditing(null);
  };

  const requestClose = () => {
    const now = joinJournalText(draft.title, draft.body);
    if (now.trim() !== original.trim()) setConfirmDiscard(true);
    else setEditing(null);
  };

  return (
    // 桌機吃得下兩欄——日誌卡是短摘要，單欄限寬 700 會在寬螢幕上留下大片空白。
    <div
      className={`mx-auto w-full px-4 ${
        entries.length <= 1 ? 'max-w-[700px]' : 'max-w-[1100px]'
      }`}
    >
      <SectionTitle en="JOURNAL" cn="旅程筆記" first />

      {/* 試玩模式才提醒。HP 與裝備同樣只活在這次瀏覽，但那些是隨手可重做的
          數值；日誌是使用者**寫出來的東西**，弄丟一段字的代價完全不同。 */}
      {!persist && (
        <p className="mb-3 rounded-card border border-border-2 bg-surface-1 px-3 py-2 text-[12px] leading-relaxed text-text-secondary">
          試玩模式：寫的內容只存在這次瀏覽，重新整理就會消失。
        </p>
      )}

      {entries.length === 0 ? (
        <p className="py-6 text-center text-[13px] text-text-secondary">
          尚未建立任何日誌。<br />點下方的「＋」開始記錄你的冒險。
        </p>
      ) : (
        <div
          className={`grid gap-3 ${entries.length > 1 ? 'expanded:grid-cols-2' : ''}`}
        >
          {entries.map((e) => (
            <ParchmentCard key={e.id} className="p-4">
              <button
                type="button"
                onClick={() => open(e.id)}
                className="w-full text-left"
              >
                <span className="flex items-baseline gap-2">
                  <span className="min-w-0 flex-1 truncate text-[14px] font-semibold text-text-primary">
                    {e.title}
                  </span>
                  <span className="font-label shrink-0 text-[11px] text-text-secondary">
                    {fmtJournalRelativeDate(new Date(e.updatedAt))}
                  </span>
                </span>
                {e.body && (
                  <span className="mt-1 line-clamp-2 block text-[13px] leading-relaxed text-text-secondary">
                    {e.body}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(e.id)}
                className="mt-2 min-h-11 text-[12px] text-text-secondary"
              >
                刪除
              </button>
            </ParchmentCard>
          ))}
        </div>
      )}

      {/* 浮動新增鈕（對照 Flutter 的 FAB）：日誌可能很長，整條按鈕擺在清單
          末端等於捲到底才按得到。浮動的永遠在手邊。
          底部留白要同時讓開書籤列與 home indicator。 */}
      <button
        type="button"
        onClick={() => open('new')}
        aria-label="新增日誌"
        className="fixed bottom-[calc(6.5rem+env(safe-area-inset-bottom))] right-[max(1rem,env(safe-area-inset-right))] z-30 flex size-14 items-center justify-center rounded-2xl bg-gold-solid shadow-[0_4px_16px_rgba(0,0,0,0.5)] hover:brightness-110 medium:bottom-[calc(1.5rem+env(safe-area-inset-bottom))]"
      >
        <svg viewBox="0 0 24 24" className="size-6 fill-[#1A1206]" aria-hidden>
          <path d="M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6z" />
        </svg>
      </button>

      <EditorSheet
        open={editing !== null}
        title={editing === 'new' ? '新增日誌' : '編輯日誌'}
        onClose={requestClose}
        onSave={save}
      >
        <JournalEditor
          title={draft.title}
          body={draft.body}
          onChange={setDraft}
        />
      </EditorSheet>

      {/* 刪除不可復原，一律先確認並顯示標題——避免刪錯篇。 */}
      <EditorSheet
        open={confirmDelete !== null}
        title="刪除日誌？"
        saveLabel="刪除"
        saveTone="danger"
        onClose={() => setConfirmDelete(null)}
        onSave={() => {
          if (confirmDelete) characterActions.removeJournalEntry(confirmDelete);
          setConfirmDelete(null);
        }}
      >
        <p className="text-[13px] leading-relaxed text-text-light">
          「{entries.find((e) => e.id === confirmDelete)?.title}」將被刪除，無法復原。
        </p>
      </EditorSheet>

      <EditorSheet
        open={confirmDiscard}
        title="尚未儲存"
        saveLabel="捨棄變更"
        saveTone="danger"
        onClose={() => setConfirmDiscard(false)}
        onSave={() => {
          setConfirmDiscard(false);
          setEditing(null);
        }}
      >
        <p className="text-[13px] leading-relaxed text-text-light">
          編輯的內容尚未儲存，捨棄後無法復原。
          <span className="block text-text-secondary">
            按「取消」回去繼續編輯。
          </span>
        </p>
      </EditorSheet>
    </div>
  );
}
