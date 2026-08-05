'use client';

import { useEffect, useState, type ReactNode } from 'react';

import type { CatalogItem } from '@/lib/catalog/types';
import type { Character } from '@/lib/domain/character';
import { useCharacterStore } from '@/lib/state/character-store';
import { useCharacterSync } from '@/lib/state/sync';
import { CharacterSheet } from './character-sheet';
import { BasicInfoEditor } from './editors/basic-info-editor';
import { ProficiencyEditor } from './editors/proficiency-editor';

/**
 * 可編輯的角色卡：把伺服器取得的角色灌進 store，並掛上編輯入口與同步。
 *
 * 唯讀檢視（分享頁、試玩）直接用 `CharacterSheet`，不經過這一層——寫入入口
 * 因此**不存在於元件樹**，而不是渲染後停用（character-share 規格）。
 *
 * @param persist false＝試玩：可操作但不推雲端（訪客沒有帳號，寫入也會被 RLS 擋）
 */
export function CharacterSheetLive({
  initial,
  tools,
  share,
  persist = true,
}: {
  initial: Character;
  tools: CatalogItem[];
  share?: ReactNode;
  persist?: boolean;
}) {
  const load = useCharacterStore((s) => s.load);
  const stored = useCharacterStore((s) => s.character);
  const [editor, setEditor] = useState<'basic' | 'prof' | null>(null);

  useEffect(() => {
    load(initial);
  }, [initial, load]);
  useCharacterSync(persist);

  const c = stored ?? initial;

  return (
    <>
      <CharacterSheet
        c={c}
        share={share}
        onEditBasic={() => setEditor('basic')}
        onEditProficiency={() => setEditor('prof')}
      />
      <BasicInfoEditor open={editor === 'basic'} onClose={() => setEditor(null)} />
      <ProficiencyEditor
        open={editor === 'prof'}
        onClose={() => setEditor(null)}
        tools={tools}
      />
    </>
  );
}
