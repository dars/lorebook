'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

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
          <div className="font-display truncate text-[16px] font-bold text-text-primary">
            {c.name}
          </div>
          <div className="truncate text-[11px] text-text-secondary">
            {[c.species, c.className].filter(Boolean).join(' · ')} {c.level}
          </div>
        </div>
        <LevelBadge level={c.level} interactive={levelUpEnabled} />
      </div>
    </header>
  );
}

function Avatar({ c }: { c: Character }) {
  if (c.portraitUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- 外部 Storage URL
      <img
        src={c.portraitUrl}
        alt=""
        className="size-9 shrink-0 rounded-full border-[1.5px] border-gold object-cover"
        style={{
          objectPosition: `${c.portraitCenterX * 100}% ${c.portraitCenterY * 100}%`,
        }}
      />
    );
  }
  return (
    <span className="font-display flex size-9 shrink-0 items-center justify-center rounded-full border-[1.5px] border-gold text-[16px] font-bold text-text-primary">
      {c.name.slice(0, 1)}
    </span>
  );
}

function LevelBadge({
  level,
  interactive,
}: {
  level: number;
  interactive: boolean;
}) {
  const inner = (
    <>
      <span className="font-label text-[9px] font-semibold tracking-[1px] text-text-secondary">
        LEVEL
      </span>
      <span
        className={`font-display font-bold leading-none text-text-primary ${
          interactive ? 'text-[26px]' : 'text-[28px]'
        }`}
      >
        {level}
      </span>
    </>
  );

  if (!interactive) {
    return <span className="flex flex-col items-center">{inner}</span>;
  }
  // 可升級：金框膠囊標示可互動，與純顯示自然區分；觸控目標 ≥48px。
  return (
    <Link
      href="/character-level-up"
      aria-label="升級"
      className="flex min-h-12 flex-col items-center justify-center rounded-[10px] border border-gold px-3 py-0.5"
    >
      {inner}
    </Link>
  );
}
