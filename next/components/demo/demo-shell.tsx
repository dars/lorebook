'use client';

import { useState } from 'react';

import { CharacterSheetLive } from '@/components/character/character-sheet-live';
import { DecisionView } from '@/components/decision/decision-view';
import { DemoSettings } from '@/components/demo/demo-settings';
import { JournalView } from '@/components/journal/journal-view';
import { CharacterHeader } from '@/components/shell/character-header';
import { OfflineBanner } from '@/components/shell/offline-banner';
import { BookmarkTabBar, NavRail, type NavItem } from '@/components/shell/nav';
import type { Character } from '@/lib/domain/character';

/**
 * 試玩的外殼——與登入後的主畫面同一組導覽（行動／角色／旅程），
 * 不是只給一張角色卡。
 *
 * 分頁由**本地狀態**切換而非路由：試玩的角色狀態只活在 client store 且不推
 * 雲端（persist=false），走路由會重新掛載並 `load(initial)`，把玩家剛扣的血
 * 還原。
 *
 * 設定頁只保留訪客有意義的角色切換、主題與登入入口；帳號、登出、收藏紀錄
 * 仍只出現在正式版。
 */
const DEMO_TABS: NavItem[] = [
  { path: 'decision', label: '行動', icon: 'wand' },
  { path: 'character', label: '角色', icon: 'person' },
  { path: 'journal', label: '旅程', icon: 'book' },
  { path: 'system', label: '設定', icon: 'gear' },
];

export function DemoShell({ character }: { character: Character }) {
  const [tab, setTab] = useState('character');

  return (
    <div className="flex min-h-full flex-1">
      <NavRail items={DEMO_TABS} active={tab} onSelect={setTab} />
      <div className="flex min-w-0 flex-1 flex-col">
        <CharacterHeader c={character} />
        <OfflineBanner />
        {/* 底部留白與 app/main/layout 相同：蓋過浮動書籤列，再讓開
            home indicator。 */}
        <main
          id="main-content"
          className="flex-1 pb-[calc(6rem+env(safe-area-inset-bottom))] medium:pb-[env(safe-area-inset-bottom)]"
        >
          {tab === 'decision' && (
            <DecisionView initial={character} persist={false} />
          )}
          {/* 試玩不提供分享：訪客的角色不存在雲端，連結無從指向。 */}
          {tab === 'character' && (
            <CharacterSheetLive initial={character} tools={[]} persist={false} />
          )}
          {tab === 'journal' && (
            <JournalView initial={character} persist={false} />
          )}
          {tab === 'system' && <DemoSettings character={character} />}
        </main>
      </div>
      <BookmarkTabBar items={DEMO_TABS} active={tab} onSelect={setTab} />
    </div>
  );
}
