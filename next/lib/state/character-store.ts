'use client';

import { create } from 'zustand';

import type { Character } from '@/lib/domain/character';

/**
 * 編輯中的角色狀態。
 *
 * 對應 Flutter 端的 `CurrentCharacterNotifier`（Riverpod）。移植時刻意保持
 * 同構——那份實作已經被實際使用驗證過，照著改寫比重新設計安全。
 *
 * **為什麼是 client store 而不是 Server Action**（design D12）：跑團當下扣
 * HP、消法術位是連續操作，每次往返伺服器要 0.3–1.5 秒才看到數字變化，戰鬥中
 * 不能接受。本機先改、debounce 推回，才是這類編輯的正確形狀。
 *
 * **為什麼不用 TanStack Query**：角色資料是單一文件、由使用者獨佔編輯，是
 * 「本機擁有的狀態」而非「伺服器快取」。用快取語意表達所有權語意，兩邊都彆扭。
 */

type State = {
  character: Character | null;
  /** 有未推送的變更。推送成功後清除。 */
  dirty: boolean;
  /** 最近一次推送失敗的訊息；null = 正常。 */
  syncError: string | null;
};

type Actions = {
  /** 自伺服器載入（覆蓋本機狀態）。 */
  load: (c: Character) => void;
  /** 就地修改並標記為待推送。 */
  update: (fn: (c: Character) => Character) => void;
  markSynced: () => void;
  setSyncError: (message: string | null) => void;
  clear: () => void;
};

export const useCharacterStore = create<State & Actions>((set) => ({
  character: null,
  dirty: false,
  syncError: null,

  load: (c) => set({ character: c, dirty: false, syncError: null }),

  update: (fn) =>
    set((s) => (s.character ? { character: fn(s.character), dirty: true } : s)),

  markSynced: () => set({ dirty: false, syncError: null }),
  setSyncError: (message) => set({ syncError: message }),
  clear: () => set({ character: null, dirty: false, syncError: null }),
}));

// ── 常用編輯動作 ────────────────────────────
//
// 包成具名函式而非讓元件各自寫 update(...)：規則（HP 上下限、臨時 HP 的
// 扣血順序）只該有一個地方定義。散在元件裡遲早會出現兩種算法。

const clamp = (v: number, lo: number, hi: number) =>
  Math.min(Math.max(v, lo), hi);

export const characterActions = {
  /**
   * 調整當前 HP。
   *
   * 受傷時**先扣臨時 HP**（2024 規則），扣完才進本體；治療不補臨時 HP。
   * 當前 HP 夾在 0 與最大值之間。
   */
  adjustHp(delta: number) {
    useCharacterStore.getState().update((c) => {
      if (delta >= 0) {
        return { ...c, currentHp: clamp(c.currentHp + delta, 0, c.maxHp) };
      }
      const damage = -delta;
      const absorbed = Math.min(c.tempHp, damage);
      return {
        ...c,
        tempHp: c.tempHp - absorbed,
        currentHp: clamp(c.currentHp - (damage - absorbed), 0, c.maxHp),
      };
    });
  },

  /** 設定臨時 HP。2024 規則：不疊加，取較高者由呼叫端決定後傳入。 */
  setTempHp(value: number) {
    useCharacterStore
      .getState()
      .update((c) => ({ ...c, tempHp: Math.max(0, value) }));
  },

  /**
   * 短休：只回復標記為短休的職業資源。
   *
   * 不回 HP——2024 規則的短休回 HP 要花生命骰，那是玩家的選擇而非自動發生。
   */
  shortRest() {
    useCharacterStore.getState().update((c) => ({
      ...c,
      resources: c.resources.map((r) =>
        r.recovery === 'short' ? { ...r, current: r.max } : r,
      ),
    }));
  },

  /**
   * 長休：HP 全滿、法術位全滿、職業資源全滿、臨時 HP 清空、力竭 −1、
   * 回復一半生命骰（最少 1）。
   */
  longRest() {
    useCharacterStore.getState().update((c) => {
      const regain = Math.max(1, Math.floor(c.level / 2));
      return {
        ...c,
        currentHp: c.maxHp,
        tempHp: 0,
        spellSlots: c.spellSlots.map((s) => ({ ...s, used: 0 })),
        resources: c.resources.map((r) => ({ ...r, current: r.max })),
        exhaustionLevel: clamp(c.exhaustionLevel - 1, 0, 6),
        hitDiceUsed: clamp(c.hitDiceUsed - regain, 0, c.level),
      };
    });
  },

  /**
   * 花用一顆生命骰。
   *
   * **不擲骰、不自動改 HP**——App 不替玩家擲骰（與 Flutter 一致）；玩家自行擲
   * d{面數}+體質後用 HP 加減調整。這裡只記錄「用掉了一顆」。
   */
  useHitDie() {
    useCharacterStore.getState().update((c) =>
      c.level - c.hitDiceUsed <= 0
        ? c
        : { ...c, hitDiceUsed: c.hitDiceUsed + 1 },
    );
  },

  setExhaustion(level: number) {
    useCharacterStore
      .getState()
      .update((c) => ({ ...c, exhaustionLevel: clamp(level, 0, 6) }));
  },

  /** 僅扮演資訊；規則資料（物種／體型／背景）不在此處，見編輯器說明。 */
  setBasicInfo(v: {
    name: string;
    alignment: string;
    alignmentEn: string;
    deity: string;
  }) {
    useCharacterStore.getState().update((c) => ({ ...c, ...v }));
  },

  addLanguage(name: string) {
    const v = name.trim();
    if (!v) return;
    useCharacterStore.getState().update((c) =>
      c.languages.some((l) => l.trim() === v)
        ? c
        : { ...c, languages: [...c.languages, v] },
    );
  },

  removeLanguage(name: string) {
    useCharacterStore.getState().update((c) => ({
      ...c,
      languages: c.languages.filter((l) => l !== name),
    }));
  },

  addToolProficiency(name: string) {
    const v = name.trim();
    if (!v) return;
    useCharacterStore.getState().update((c) =>
      c.toolProficiencies.some((t) => t.trim() === v)
        ? c
        : { ...c, toolProficiencies: [...c.toolProficiencies, v] },
    );
  },

  removeToolProficiency(name: string) {
    useCharacterStore.getState().update((c) => ({
      ...c,
      toolProficiencies: c.toolProficiencies.filter((t) => t !== name),
    }));
  },

  toggleCondition(name: string) {
    useCharacterStore.getState().update((c) => ({
      ...c,
      conditions: c.conditions.includes(name)
        ? c.conditions.filter((x) => x !== name)
        : [...c.conditions, name],
    }));
  },

  setConcentration(spell: string | null) {
    useCharacterStore
      .getState()
      .update((c) => ({ ...c, concentrationSpell: spell }));
  },

  /** 消耗或回復法術位。delta 為負代表消耗。 */
  adjustSpellSlot(level: number, delta: number) {
    useCharacterStore.getState().update((c) => ({
      ...c,
      spellSlots: c.spellSlots.map((s) =>
        s.level === level
          ? { ...s, used: clamp(s.used - delta, 0, s.total) }
          : s,
      ),
    }));
  },

  /** 消耗或回復職業資源。delta 為負代表消耗。 */
  adjustResource(name: string, delta: number) {
    useCharacterStore.getState().update((c) => ({
      ...c,
      resources: c.resources.map((r) =>
        r.name === name
          ? { ...r, current: clamp(r.current + delta, 0, r.max) }
          : r,
      ),
    }));
  },
};
