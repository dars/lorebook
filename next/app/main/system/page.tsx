
import { AppLink } from '@/components/ui/app-link';
import { ThemeSwitch } from '@/components/shell/theme-switch';
import { ParchmentCard } from '@/components/ui/decorations';
import { SignOutButton } from '@/components/shell/sign-out-button';
import { getCurrentCharacterId } from '@/lib/characters/current';
import { fetchMyCharacter } from '@/lib/characters/fetch';
import { getSessionUser } from '@/lib/supabase/server';
import { GuideLink } from '@/components/guide/guide-link';

export const dynamic = 'force-dynamic';

/**
 * 設定分頁，對照 Flutter 端的 `SystemPage`：
 * 角色（顯示當前、切換）／帳號（顯示 email、登出）／關於（版本與授權聲明）。
 */
/*
 * 這一頁的 `<AppLink>` 全部 `prefetch={false}`。
 *
 * Next 的 Link 預設會自動預取視窗內的目標，而這頁的四個連結一進畫面就全在
 * 視窗內——其中「法術目錄」與「裝備目錄」還會去查內容庫。實測是一進設定頁
 * 就在背景打四個 RSC 請求，每個都經過 middleware 的
 * `supabase.auth.getUser()`（一趟到 Supabase 的跨海往返），使用者要等的那份
 * 資料得跟它們搶線。同樣的理由見 `components/shell/nav.tsx` 檔頭。
 */

export default async function SystemPage() {
  // 兩者都已在 layout 取過，cache() 讓這裡直接命中同一份，不再多打一趟。
  const [user, id] = await Promise.all([
    getSessionUser(),
    getCurrentCharacterId(),
  ]);
  const { character } = id
    ? await fetchMyCharacter(id)
    : { character: null };

  return (
    <div className="mx-auto flex w-full max-w-[700px] flex-col gap-4 px-4 py-2">
      <GuideLink />
      <ParchmentCard className="p-4">
        <h2 className="text-body font-semibold text-text-primary">角色</h2>
        {character && (
          <p className="mt-3 text-small text-text-light">
            當前：{character.name}・{character.className} {character.level}
          </p>
        )}
        <AppLink
          href="/character-select"
         
          className="mt-4 flex min-h-11 items-center justify-center rounded-card border border-border text-small text-text-primary"
        >
          切換角色
        </AppLink>
      </ParchmentCard>

      {/* 自創與收藏的內容集中在一處，不在設定頁逐型別各列一條連結——
          型別會長（背景、子職、種族、法術…），設定頁不該變成清單。 */}
      <ParchmentCard className="p-4">
        <h2 className="text-body font-semibold text-text-primary">收藏紀錄</h2>
        <p className="mt-2 text-small leading-relaxed text-text-secondary">
          自己建立的與從他人分享收藏來的自創內容——背景、子職業。
        </p>
        <AppLink
          href="/library"
         
          className="mt-4 flex min-h-11 items-center justify-center rounded-card border border-gold text-small text-gold"
        >
          開啟收藏紀錄
        </AppLink>
      </ParchmentCard>

      <ParchmentCard className="p-4">
        <h2 className="text-body font-semibold text-text-primary">外觀主題</h2>
        <div className="mt-3">
          <ThemeSwitch />
        </div>
      </ParchmentCard>

      <ParchmentCard className="p-4">
        <h2 className="text-body font-semibold text-text-primary">帳號</h2>
        <p className="mt-3 text-small text-text-light">{user?.email}</p>
        <SignOutButton />
      </ParchmentCard>

      <ParchmentCard className="p-4">
        <h2 className="text-body font-semibold text-text-primary">關於</h2>
        <p className="mt-3 text-small text-text-light">Lorebook v0.1.0</p>
        <p className="mt-1 text-small text-text-secondary">
          D&amp;D 5.5e（2024）角色卡管理工具
        </p>

        <h2 className="mt-4 text-body font-semibold text-text-primary">
          授權聲明
        </h2>
        {/* CC-BY-4.0 的署名是法律要求，必須逐字呈現，不可摘要或改寫。 */}
        <p className="mt-3 whitespace-pre-line text-small leading-relaxed text-text-secondary">
          {`本作品收錄之遊戲規則內容取自 System Reference Document 5.2（"SRD 5.2"），著作權為 Wizards of the Coast LLC 所有，依 Creative Commons Attribution 4.0 International License（CC-BY-4.0）授權使用。

This work includes material from the System Reference Document 5.2 ("SRD 5.2") by Wizards of the Coast LLC, licensed under the Creative Commons Attribution 4.0 International License (https://creativecommons.org/licenses/by/4.0/legalcode).`}
        </p>
        <p className="mt-3 text-small leading-relaxed text-text-secondary">
          <AppLink href="/catalog/spells" className="text-gold underline">
            法術目錄
          </AppLink>
          {' · '}
          <AppLink href="/catalog/items" className="text-gold underline">
            裝備目錄
          </AppLink>
        </p>
      </ParchmentCard>
    </div>
  );
}
