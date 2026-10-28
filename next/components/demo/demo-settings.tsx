
import { AppLink } from '@/components/ui/app-link';
import { ThemeSwitch } from '@/components/shell/theme-switch';
import { ParchmentCard, SectionTitle } from '@/components/ui/decorations';
import type { Character } from '@/lib/domain/character';
import { GuideLink } from '@/components/guide/guide-link';

/** 試玩專用設定：保留正式版有意義的角色切換與主題，不出現帳號專屬功能。 */
/*
 * 這個元件的 `<AppLink>` 全部 `prefetch={false}`。
 *
 * Next 的 Link 預設會自動預取視窗內的目標，而這頁的連結一進畫面就全在
 * 視窗內——其中「法術目錄」與「裝備目錄」還會去查內容庫。實測是一進設定頁
 * 就在背景打四個 RSC 請求，每個都經過 middleware 的
 * `supabase.auth.getUser()`（一趟到 Supabase 的跨海往返），使用者要等的那份
 * 資料得跟它們搶線。同樣的理由見 `components/shell/nav.tsx` 檔頭。
 */

export function DemoSettings({ character }: { character: Character }) {
  return (
    <div className="mx-auto flex w-full max-w-[700px] flex-col gap-4 px-4 py-2">
      <SectionTitle en="SETTINGS" cn="設定" first />
      <GuideLink />

      <ParchmentCard className="p-4">
        <h2 className="text-body font-semibold text-text-primary">試玩角色</h2>
        <p className="mt-3 text-small text-text-light">
          當前：{character.name}・{character.className} {character.level}
        </p>
        <p className="mt-1 text-small leading-relaxed text-text-secondary">
          切換角色會離開目前試玩，這次調整的 HP、法術位與筆記將會還原。
        </p>
        <AppLink
          href="/demo"
         
          className="mt-4 flex min-h-11 items-center justify-center rounded-card border border-gold text-small font-semibold text-gold"
        >
          切換試玩角色
        </AppLink>
      </ParchmentCard>

      <ParchmentCard className="p-4">
        <h2 className="text-body font-semibold text-text-primary">外觀主題</h2>
        <div className="mt-3">
          <ThemeSwitch />
        </div>
      </ParchmentCard>

      <ParchmentCard className="p-4">
        <h2 className="text-body font-semibold text-text-primary">保存自己的冒險</h2>
        <p className="mt-2 text-small leading-relaxed text-text-secondary">
          登入後可以建立角色，並保存角色狀態、裝備與旅程筆記。
        </p>
        <AppLink
          href="/login"
         
          className="mt-4 flex min-h-11 items-center justify-center rounded-card border border-border text-small text-text-primary"
        >
          登入 Lorebook
        </AppLink>
      </ParchmentCard>
    </div>
  );
}
