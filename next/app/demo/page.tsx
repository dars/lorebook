import type { Metadata } from 'next';
import Link from 'next/link';

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
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-10">
      <h1 className="pt-5 font-display text-title text-gold">試玩</h1>
      <p className="mt-2 text-small leading-relaxed text-text-secondary">
        以下角色可直接操作——扣血、消耗法術位、切換狀態、展開特性說明。
        變更只存在這次瀏覽，離開就還原，不需要帳號。
      </p>

      <ul className="mt-4">
        {DEMO_CHARACTERS.map((c) => (
          <li key={c.id}>
            <Link
              href={`/demo/${c.id}`}
              className="flex items-baseline justify-between gap-3 border-b border-border-2 py-3 hover:text-gold"
            >
              <span>
                <span className="text-body text-text-primary">{c.name}</span>
                <span className="ml-2 text-small text-text-secondary">
                  {c.species} · {c.className}
                </span>
              </span>
              <span className="shrink-0 text-small text-gold">
                {c.spellSlots.length > 0 ? '施法者' : '戰鬥型'}
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <p className="mt-6 text-small text-text-secondary">
        想保存自己的角色？
        <Link href="/login" className="ml-1 text-gold underline">
          登入後建立
        </Link>
      </p>
    </main>
  );
}
