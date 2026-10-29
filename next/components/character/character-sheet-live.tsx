'use client';
import { displayedCharacter } from '@/lib/state/displayed-character';
import { SpellPicker } from '@/components/spells/spell-picker';

import { useEffect, useState, type ReactNode } from 'react';

import { CharacterFlowLink as AppLink } from '@/components/progression/character-flow-link';
import type { CatalogItem } from '@/lib/catalog/types';
import type { Character } from '@/lib/domain/character';
import { needsSubclassPick } from '@/lib/rules/level-up';
import { characterActions, useCharacterStore } from '@/lib/state/character-store';
import { useCharacterSync } from '@/lib/state/sync';
import { CharacterSheet } from './character-sheet';
import { BasicInfoEditor } from './editors/basic-info-editor';
import { AboutEditor, PersonalityEditor } from './editors/biography-editor';
import { CurrencyCalculator } from './editors/currency-calculator';
import { ItemEditor } from './editors/item-editor';
import { InventoryEditor } from './editors/inventory-editor';
import { PortraitEditor } from './editors/portrait-editor';
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
  catalog = [],
  share,
  persist = true,
}: {
  initial: Character;
  tools: CatalogItem[];
  /** 完整物品目錄，供取得物品用；離線時為空陣列。 */
  catalog?: CatalogItem[];
  share?: ReactNode;
  persist?: boolean;
}) {
  const load = useCharacterStore((s) => s.load);
  const stored = useCharacterStore((s) => s.character);
  const [editor, setEditor] = useState<
    | 'basic'
    | 'prof'
    | 'items'
    | 'coin'
    | 'portrait'
    | 'custom-item'
    | 'about'
    | 'personality'
    | null
  >(null);
  // 編輯既有物品時帶索引；null＝新增。
  const [editingItem, setEditingItem] = useState<number | null>(null);

  useEffect(() => {
    load(initial);
  }, [initial, load]);
  useCharacterSync(persist);

  const c = displayedCharacter(initial, stored);

  return (
    <>
      {/* 補選子職的入口。掛在角色卡而不是升級對話框裡（Flutter 的位置）：
          20 級角色的 LEVEL 徽章不可點，藏在那裡等於還是進不去。
          試玩模式不顯示——訪客的角色寫不回雲端。 */}
      {persist && needsSubclassPick(c) && (
        <div className="mx-auto mt-3 w-full max-w-[700px] px-4">
          <div className="rounded-card border border-gold/55 bg-gold/10 px-4 py-3">
            <p className="text-ui text-text-primary">
              這個角色還沒有子職。
            </p>
            <p className="mt-1 text-small leading-relaxed text-text-secondary">
              升級當時內容庫離線，子職那一步被跳過了。補選後會一併補上到
              {c.level} 級為止的子職特性。
            </p>
            <AppLink
              href="/character-level-up?mode=subclass"
              className="mt-2 flex min-h-11 items-center justify-center rounded-chip border border-gold text-ui font-bold text-gold hover:bg-gold/10"
            >
              補選子職
            </AppLink>
          </div>
        </div>
      )}
      {persist && <div className="mx-auto flex w-full max-w-[700px] flex-wrap gap-x-4 px-4">
        <AppLink href="/character-choices" className="inline-flex min-h-11 items-center text-small text-gold">成長選擇／補選</AppLink>
        {c.progression?.rest && <AppLink href="/character-choices?mode=rest" className="inline-flex min-h-11 items-center text-small text-gold">休息後調整</AppLink>}
      </div>}
      <CharacterSheet
        spellTools={persist ? {
          book: c.classNameEn==='Wizard' ? <SpellPicker c={c} kind="spellbook"/> : undefined,
          cantrips: <SpellPicker c={c} kind="cantrips" />,
          spells: <SpellPicker c={c} kind="spells" />,
        } : undefined}
        c={c}
        share={share}
        onEditBasic={() => setEditor('basic')}
        onEditProficiency={() => setEditor('prof')}
        onEditAbout={() => setEditor('about')}
        onEditPersonality={() => setEditor('personality')}
        onEditPortrait={persist ? () => setEditor('portrait') : undefined}
        inventory={{
          c,
          onEditCurrency: () => setEditor('coin'),
          onAddItem: () => setEditor('items'),
          onToggleEquipped: characterActions.toggleEquipped,
          onUseConsumable: characterActions.useConsumable,
          onAddCustomItem: () => {
            setEditingItem(null);
            setEditor('custom-item');
          },
          onEditItem: (i: number) => {
            setEditingItem(i);
            setEditor('custom-item');
          },
        }}
      />
      <BasicInfoEditor open={editor === 'basic'} onClose={() => setEditor(null)} />
      <AboutEditor open={editor === 'about'} onClose={() => setEditor(null)} />
      <PersonalityEditor
        open={editor === 'personality'}
        onClose={() => setEditor(null)}
      />
      <ProficiencyEditor
        open={editor === 'prof'}
        onClose={() => setEditor(null)}
        tools={tools}
      />
      <InventoryEditor
        open={editor === 'items'}
        onClose={() => setEditor(null)}
        catalog={catalog}
      />
      <CurrencyCalculator open={editor === 'coin'} onClose={() => setEditor(null)} />
      <ItemEditor
        open={editor === 'custom-item'}
        initial={editingItem === null ? null : c.equipment[editingItem]}
        onClose={() => setEditor(null)}
        onSave={(item) => {
          if (editingItem === null) characterActions.addItem(item);
          else characterActions.updateItem(editingItem, item);
          setEditor(null);
        }}
        onDelete={
          editingItem === null
            ? undefined
            : () => {
                characterActions.removeItem(editingItem);
                setEditor(null);
              }
        }
      />
      {/* 試玩不提供立繪上傳：訪客沒有帳號，Storage 寫入會被擋。 */}
      {persist && (
        <PortraitEditor open={editor === 'portrait'} onClose={() => setEditor(null)} />
      )}
    </>
  );
}
