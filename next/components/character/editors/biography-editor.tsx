'use client';

import { useId, useState } from 'react';

import { EditorSheet, FieldLabel } from '@/components/ui/editor-sheet';
import type { Character } from '@/lib/domain/character';
import { characterActions, useCharacterStore } from '@/lib/state/character-store';

/**
 * 傳記編輯，對照 Flutter 端 `biography_tab.dart` 的**兩個**編輯 sheet：
 * `_AboutEditorSheet`（其人其事）與 `_PersonalityEditorSheet`（性格）。
 *
 * 曾經合成一個六欄的面板，但傳記頁的兩個區塊各有各的鉛筆——點「性格」卻跳出
 * 標題寫著「編輯其人其事」、還要先捲過背景故事那個大輸入框，點的東西與開的
 * 東西對不起來。拆回兩個。
 *
 * 性格四欄的提示語照搬規則書的問法（「性格上的顯著特點」而非「traits」）——
 * 這四欄是給沒讀過規則書的人填的，欄位名本身不解釋自己。
 */
const FIELDS = [
  { k: 'traits', label: '特質', hint: '性格上的顯著特點' },
  { k: 'ideals', label: '理念', hint: '信念與價值觀' },
  { k: 'bonds', label: '羈絆', hint: '在意的人事物' },
  { k: 'flaws', label: '缺陷', hint: '弱點或惡習' },
] as const;

/** 其人其事：背景故事 ＋ 性格標籤。 */
export function AboutEditor({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const c = useCharacterStore((s) => s.character);
  // 同一個編輯器可能同時存在於多處版型，id 必須是唯一的才不會綁錯欄位。
  const uid = useId();
  const [v, setV] = useState<{ backstory: string; tags: string } | null>(null);

  if (!c) return null;

  const cur = v ?? { backstory: c.backstory, tags: c.personalityTags.join('、') };
  const close = () => {
    setV(null);
    onClose();
  };

  return (
    <EditorSheet
      open={open}
      title="編輯其人其事"
      onClose={close}
      onSave={() => {
        characterActions.setAbout({
          backstory: cur.backstory.trim(),
          // 以頓號分隔，順手容忍逗號與空白——使用者不該為了分隔符再學一次規則。
          personalityTags: cur.tags
            .split(/[、,，\s]+/)
            .map((t) => t.trim())
            .filter(Boolean),
        });
        close();
      }}
    >
      <FieldLabel htmlFor={`${uid}-backstory`}>背景故事</FieldLabel>
      <textarea
        id={`${uid}-backstory`}
        name="backstory"
        value={cur.backstory}
        onChange={(e) => setV({ ...cur, backstory: e.target.value })}
        rows={6}
        placeholder="這個角色的過去與動機…"
        className="w-full resize-y rounded-card border border-border bg-surface-2 p-3 text-body leading-relaxed text-text-primary"
      />

      <div className="mt-4">
        <FieldLabel htmlFor={`${uid}-tags`}>性格標籤</FieldLabel>
        <input
          id={`${uid}-tags`}
          name="personalityTags"
          autoComplete="off"
          value={cur.tags}
          onChange={(e) => setV({ ...cur, tags: e.target.value })}
          placeholder="以頓號分隔，如：好奇、書蟲、理性"
          className="min-h-11 w-full rounded-chip border border-border bg-surface-2 px-3 text-body text-text-primary"
        />
      </div>
    </EditorSheet>
  );
}

/** 性格：特質／理念／羈絆／缺陷四欄。 */
export function PersonalityEditor({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const c = useCharacterStore((s) => s.character);
  const uid = useId();
  const [v, setV] = useState<Character['personality'] | null>(null);

  if (!c) return null;

  const cur = v ?? c.personality;
  const close = () => {
    setV(null);
    onClose();
  };

  return (
    <EditorSheet
      open={open}
      title="編輯性格"
      onClose={close}
      onSave={() => {
        characterActions.setPersonality(cur);
        close();
      }}
    >
      {FIELDS.map((f, i) => (
        <div key={f.k} className={i === 0 ? undefined : 'mt-4'}>
          <FieldLabel htmlFor={`${uid}-${f.k}`}>{f.label}</FieldLabel>
          <textarea
            id={`${uid}-${f.k}`}
            name={f.k}
            value={cur[f.k]}
            onChange={(e) => setV({ ...cur, [f.k]: e.target.value })}
            rows={2}
            placeholder={`${f.hint}…`}
            className="w-full resize-y rounded-card border border-border bg-surface-2 p-2 text-ui text-text-primary"
          />
        </div>
      ))}
    </EditorSheet>
  );
}
