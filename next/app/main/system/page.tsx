import Link from 'next/link';

import { ParchmentCard } from '@/components/ui/decorations';
import { signOut } from '@/lib/auth/actions';
import { getCurrentCharacterId } from '@/lib/characters/current';
import { fetchMyCharacter } from '@/lib/characters/fetch';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * 設定分頁，對照 Flutter 端的 `SystemPage`：
 * 角色（顯示當前、切換）／帳號（顯示 email、登出）／關於（版本與授權聲明）。
 *
 * 外觀主題那張卡暫不移植——目前只有深色主題，給一個只有一個選項的切換器
 * 是假的選擇。待淺色主題移植後再補。
 */
export default async function SystemPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const id = await getCurrentCharacterId();
  const { character } = id
    ? await fetchMyCharacter(id)
    : { character: null };

  return (
    <div className="mx-auto flex w-full max-w-[700px] flex-col gap-4 px-4 py-2">
      <ParchmentCard className="p-4">
        <h2 className="text-[14px] font-semibold text-text-primary">角色</h2>
        {character && (
          <p className="mt-3 text-[13px] text-text-light">
            當前：{character.name}・{character.className} {character.level}
          </p>
        )}
        <Link
          href="/character-select"
          className="mt-4 flex min-h-11 items-center justify-center rounded-card border border-border text-[13px] text-text-primary"
        >
          切換角色
        </Link>
        <Link
          href="/custom-backgrounds"
          className="mt-2 flex min-h-11 items-center justify-center rounded-card border border-border text-[13px] text-text-primary"
        >
          自訂背景
        </Link>
        <Link
          href="/custom-subclasses"
          className="mt-2 flex min-h-11 items-center justify-center rounded-card border border-border text-[13px] text-text-primary"
        >
          自訂子職業
        </Link>
      </ParchmentCard>

      <ParchmentCard className="p-4">
        <h2 className="text-[14px] font-semibold text-text-primary">帳號</h2>
        <p className="mt-3 text-[13px] text-text-light">{user?.email}</p>
        <form action={signOut}>
          <button
            type="submit"
            className="mt-4 flex min-h-11 w-full items-center justify-center rounded-card border border-danger text-[13px] text-danger"
          >
            登出
          </button>
        </form>
      </ParchmentCard>

      <ParchmentCard className="p-4">
        <h2 className="text-[14px] font-semibold text-text-primary">關於</h2>
        <p className="mt-3 text-[13px] text-text-light">Lorebook v0.1.0</p>
        <p className="mt-1 text-[12px] text-text-secondary">
          D&amp;D 5.5e（2024）角色卡管理工具
        </p>

        <h2 className="mt-4 text-[14px] font-semibold text-text-primary">
          授權聲明
        </h2>
        {/* CC-BY-4.0 的署名是法律要求，必須逐字呈現，不可摘要或改寫。 */}
        <p className="mt-3 whitespace-pre-line text-[12px] leading-relaxed text-text-secondary">
          {`本作品收錄之遊戲規則內容取自 System Reference Document 5.2（"SRD 5.2"），著作權為 Wizards of the Coast LLC 所有，依 Creative Commons Attribution 4.0 International License（CC-BY-4.0）授權使用。

This work includes material from the System Reference Document 5.2 ("SRD 5.2") by Wizards of the Coast LLC, licensed under the Creative Commons Attribution 4.0 International License (https://creativecommons.org/licenses/by/4.0/legalcode).`}
        </p>
        <p className="mt-3 text-[12px] leading-relaxed text-text-secondary">
          <Link href="/catalog/spells" className="text-gold underline">
            法術目錄
          </Link>
          {' · '}
          <Link href="/catalog/items" className="text-gold underline">
            裝備目錄
          </Link>
        </p>
      </ParchmentCard>
    </div>
  );
}
