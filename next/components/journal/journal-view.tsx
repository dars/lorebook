'use client';

import { useEffect, useState } from 'react';

import { ParchmentCard, SectionTitle } from '@/components/ui/decorations';
import { EditorSheet } from '@/components/ui/editor-sheet';
import type { Character } from '@/lib/domain/character';
import { fmtJournalRelativeDate } from '@/lib/journal/format';
import { joinJournalText, splitJournalText } from '@/lib/journal/split';
import {
  characterActions,
  useCharacterStore,
} from '@/lib/state/character-store';
import { useCharacterSync } from '@/lib/state/sync';

/** 旅程分頁，對照 Flutter 端的 `JournalPage` ＋ `showJournalEditor`。 */
export function JournalView({ initial }: { initial: Character }) {
  const load = useCharacterStore((s) => s.load);
  const stored = useCharacterStore((s) => s.character);
  const [editing, setEditing] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  useEffect(() => {
    load(initial);
  }, [initial, load]);
  useCharacterSync();

  const c = stored ?? initial;
  const entries = [...c.journalEntries].sort(
    (a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt),
  );

  const open = (id: string) => {
    const e = id === 'new' ? null : entries.find((x) => x.id === id);
    setText(e ? joinJournalText(e.title, e.body) : '');
    setEditing(id);
  };

  const save = () => {
    const parts = splitJournalText(text);
    if (parts) {
      if (editing === 'new') {
        characterActions.addJournalEntry(parts.title, parts.body);
      } else if (editing) {
        characterActions.updateJournalEntry(editing, parts.title, parts.body);
      }
    }
    setEditing(null);
  };

  return (
    <div className="mx-auto w-full max-w-[700px] px-4">
      <SectionTitle en="JOURNAL" cn="旅程筆記" first />

      {entries.length === 0 ? (
        <p className="py-6 text-center text-[13px] text-text-secondary">
          尚未建立任何日誌。用下方的按鈕開始記錄。
        </p>
      ) : (
        <div className="flex flex-col gap-3">
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
                className="mt-2 min-h-9 text-[11px] text-text-secondary"
              >
                刪除
              </button>
            </ParchmentCard>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={() => open('new')}
        className="mt-4 flex min-h-12 w-full items-center justify-center rounded-card border border-gold bg-gold/10 text-[14px] font-bold text-gold"
      >
        ＋ 新增日誌
      </button>

      <EditorSheet
        open={editing !== null}
        title={editing === 'new' ? '新增日誌' : '編輯日誌'}
        onClose={() => setEditing(null)}
        onSave={save}
      >
        {/* 單一文字區、第一行為標題：使用者不必先想標題再想內容。 */}
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={12}
          placeholder="第一行為標題，接著輸入內容…"
          className="w-full resize-y rounded-card border border-border bg-surface-2 p-3 text-[14px] leading-relaxed text-text-primary"
        />
      </EditorSheet>

      {/* 刪除不可復原，一律先確認並顯示標題——避免刪錯篇。 */}
      <EditorSheet
        open={confirmDelete !== null}
        title="刪除日誌？"
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
    </div>
  );
}
