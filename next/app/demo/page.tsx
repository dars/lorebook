import type { Metadata } from 'next';
import Link from 'next/link';

import { CharacterList } from '@/components/character/character-list';
import { SectionTitle } from '@/components/ui/decorations';
import { DEMO_CHARACTERS } from '@/lib/demo/characters';

export const metadata: Metadata = {
  title: '試玩｜Lorebook',
  description: '不需註冊，直接試用 D&D 2024 角色卡：扣血、消法術位、看特性說明。',
};

/**
 * 試玩入口。
 *
 * 靜態資料、不需登入也不連資料庫——若還要打 Supabase 就等於沒有真正脫離登入。
 * 這頁可被索引：它是產品的公開門面，與分享頁（capability URL，必須 noindex）
 * 性質相反。
 */
export default function DemoPage() {
  return (
    <main id="main-content" className="mx-auto w-full max-w-[700px] flex-1 px-4 pb-10">
      <h1 className="pt-6 font-display text-[28px] font-bold text-gold">Lorebook</h1>
      <SectionTitle en="CHARACTERS" cn="選擇角色" />

      <p className="pb-4 text-small leading-relaxed text-text-secondary">
        以下角色可直接操作——扣血、消耗法術位、切換狀態、展開特性說明。
        變更只存在這次瀏覽，離開就還原，不需要帳號。
      </p>

      <CharacterList initial={DEMO_CHARACTERS} mode="demo" />

      <Link
        href="/login"
        className="mt-4 flex min-h-12 items-center justify-center rounded-card border border-gold bg-gold/10 text-[14px] font-bold text-gold"
      >
        登入並建立自己的角色
      </Link>
    </main>
  );
}
