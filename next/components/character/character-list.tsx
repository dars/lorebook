'use client';

import { useState } from 'react';

import { AppLink } from '@/components/ui/app-link';
import { CharacterAvatar } from '@/components/character/character-avatar';
import { ParchmentCard } from '@/components/ui/decorations';
import { EditorSheet } from '@/components/ui/editor-sheet';
import { deleteCharacter } from '@/lib/characters/actions';
import { selectCharacter } from '@/lib/characters/current';
import type { Character } from '@/lib/domain/character';

/**
 * 選角清單，對照 Flutter 端的 `character_select_page`。
 *
 * 刪除在 Flutter 是長按觸發——web 沒有長按的通用手勢，改為卡片右側的刪除鈕。
 * 行為相同：二次確認、雲端軟刪除成功才自清單移除。
 */
export function CharacterList({
  initial,
  mode = 'owned',
}: {
  initial: Character[];
  mode?: 'owned' | 'demo';
}) {
  const [list, setList] = useState(initial);
  const [confirming, setConfirming] = useState<Character | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const remove = async (c: Character) => {
    setBusy(true);
    const r = await deleteCharacter(c.id);
    setBusy(false);
    if (r.error) {
      setError('刪除失敗，請稍後再試');
      return;
    }
    setList((prev) => prev.filter((x) => x.id !== c.id));
    setConfirming(null);
    setError(null);
  };

  if (list.length === 0) {
    return (
      <p className="py-3 text-[13px] leading-relaxed text-text-secondary">
        還沒有角色。用下方的「＋ 建立新角色」建立第一個冒險者，開始你的旅程。
      </p>
    );
  }

  return (
    <>
      <p className="pb-2 text-[12px] text-text-secondary">
        {mode === 'demo' ? '選一位冒險者開始試玩' : '點選進入角色卡'}
      </p>
      {error && (
        <p role="alert" className="pb-2 text-[13px] text-danger">
          {error}
        </p>
      )}

      <div className="flex flex-col gap-2">
        {list.map((c) => (
          <ParchmentCard
            key={c.id}
            className="flex items-center gap-3 px-4 py-3 hover:border-gold/60"
          >
            {mode === 'demo' ? (
              <AppLink
                href={`/demo/${c.id}`}
                className="flex min-h-12 min-w-0 flex-1 items-center gap-3 text-left"
              >
                <CharacterAvatar c={c} size={48} />
                <span className="min-w-0 flex-1">
                  <span className="font-display block truncate text-[16px] font-bold text-text-primary">
                    {c.name}
                  </span>
                  <span className="block truncate text-[12px] text-text-secondary">
                    {[c.species, c.className, c.subclass].filter(Boolean).join(' · ')}
                  </span>
                </span>
                <span className="flex shrink-0 flex-col items-center">
                  <span className="font-label text-[10px] font-semibold tracking-[1px] text-text-secondary">
                    LEVEL
                  </span>
                  <span className="font-display text-[24px] font-bold leading-none text-text-primary">
                    {c.level}
                  </span>
                </span>
                <span className="min-h-11 shrink-0 content-center px-2 text-[12px] text-gold">
                  試玩&nbsp;→
                </span>
              </AppLink>
            ) : (
              <>
                <form action={selectCharacter.bind(null, c.id)} className="min-w-0 flex-1">
                  <button type="submit" className="flex w-full items-center gap-3 text-left">
                    <CharacterAvatar c={c} size={48} />
                    <span className="min-w-0 flex-1">
                      <span className="font-display block truncate text-[16px] font-bold text-text-primary">
                        {c.name}
                      </span>
                      <span className="block truncate text-[12px] text-text-secondary">
                        {[c.species, c.className, c.subclass].filter(Boolean).join(' · ')}
                      </span>
                    </span>
                    <span className="flex shrink-0 flex-col items-center">
                      <span className="font-label text-[10px] font-semibold tracking-[1px] text-text-secondary">
                        LEVEL
                      </span>
                      <span className="font-display text-[24px] font-bold leading-none text-text-primary">
                        {c.level}
                      </span>
                    </span>
                  </button>
                </form>
                <button
                  type="button"
                  onClick={() => setConfirming(c)}
                  aria-label={`刪除 ${c.name}`}
                  className="min-h-11 shrink-0 px-2 text-[12px] text-text-secondary hover:text-danger"
                >
                  刪除
                </button>
              </>
            )}
          </ParchmentCard>
        ))}
      </div>

      <EditorSheet
        open={confirming !== null}
        title="刪除角色？"
        saveLabel="刪除"
        saveTone="danger"
        onClose={() => setConfirming(null)}
        onSave={() => confirming && !busy && remove(confirming)}
      >
        <p className="text-[13px] leading-relaxed text-text-light">
          將刪除「{confirming?.name}」。
          <span className="block text-danger">此操作無法復原。</span>
        </p>
      </EditorSheet>
    </>
  );
}
