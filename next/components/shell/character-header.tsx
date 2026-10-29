'use client';

import { ClassIcon } from '@/components/ui/class-icon';
import { usePathname } from 'next/navigation';

import { AppLink } from '@/components/ui/app-link';
import { CharacterAvatar } from '@/components/character/character-avatar';
import type { Character } from '@/lib/domain/character';

/**
 * 情境式頁首，對照 Flutter 端的 `CharacterHeader`。
 *
 * 頂部一條金色漸層細線（兩端透明、中間 50%）＋ 頭像 36px 金框 ＋ 名稱
 * （Cinzel 16px w700）與「種族 · 職業 等級」（11px textSecondary）＋
 * 右側 LEVEL 徽章（標籤 Inter 9px 字距 1、數字 Cinzel 28px w700）。
 *
 * 徽章可點擊與否用外觀區分：角色頁可升級時加金框膠囊，其餘頁面純顯示。
 */
export function CharacterHeader({ c }: { c: Character }) {
  // LEVEL 徽章僅在角色頁可點擊觸發升級；其他分頁純顯示，避免跑團中誤觸。
  // 20 級為上限，沒得升時也不該是可點的。
  const pathname = usePathname();
  const levelUpEnabled = pathname.startsWith('/main/character') && c.level < 20;
  return (
    <header className="bg-surface-0">
      <div className="h-px bg-linear-to-r from-transparent via-gold/50 to-transparent" />
      <div className="flex items-center gap-2.5 px-5 py-2">
        <Avatar c={c} />
        <div className="min-w-0 flex-1">
          <div className="font-display truncate text-body font-bold text-text-primary">
            {c.name}
          </div>
          <div className="truncate text-small text-text-secondary">
            <ClassIcon name={c.classNameEn || c.className} className="mr-1 size-4" />
            {[c.species, c.className].filter(Boolean).join(' · ')} {c.level}
          </div>
        </div>
        <LevelBadge level={c.level} interactive={levelUpEnabled} />
      </div>
    </header>
  );
}

function Avatar({ c }: { c: Character }) {
  return <CharacterAvatar c={c} size={36} />;
}

function LevelBadge({
  level,
  interactive,
}: {
  level: number;
  interactive: boolean;
}) {
  if (!interactive) {
    return (
      <span className="flex flex-col items-center">
        <span className="font-label text-eyebrow font-semibold tracking-[1px] text-text-secondary">
          LEVEL
        </span>
        <span className="font-display text-[28px] font-bold leading-none text-text-primary">
          {level}
        </span>
      </span>
    );
  }

  // 可升級：金框膠囊 ＋ **向上箭頭圖示**標示可互動。少了那個圖示，框線本身
  // 不足以說明「這裡按了會發生什麼」——原版是靠它把「可升級」講出來的。
  // 框線用 55% 透明度（同 Flutter），全不透明會比角色名還搶眼。
  return (
    <AppLink
      href="/character-level-up"
      aria-label="升級"
      className="flex min-h-12 flex-col items-center justify-center rounded-[10px] border border-gold/55 px-3 py-0.5 hover:border-gold hover:bg-gold/10"
    >
      <span className="flex items-center gap-1">
        <span className="font-label text-eyebrow font-semibold tracking-[1px] text-text-secondary">
          LEVEL
        </span>
        <svg viewBox="0 0 24 24" className="size-3 fill-gold" aria-hidden>
          <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20m1 15h-2v-6H7.5L12 6.5 16.5 11H13z" />
        </svg>
      </span>
      <span className="font-display text-[26px] font-bold leading-none text-text-primary">
        {level}
      </span>
    </AppLink>
  );
}
