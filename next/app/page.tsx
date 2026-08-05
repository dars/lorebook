import { redirect } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';

// 依賴 session，不得靜態預渲染——建置時既沒有 cookie 也沒有環境變數。
export const dynamic = 'force-dynamic';

/**
 * 首頁：依登入狀態分流。
 *
 * 正式的角色清單與 App 外殼待後續任務；此處先確保未登入者落到登入頁，
 * 而不是停在 create-next-app 的樣板上。
 */
export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-lg py-2xl">
      <h1 className="font-display text-title text-gold">Lorebook</h1>
      <p className="mt-md text-body text-text-light">
        已登入為 {user.email}。角色清單尚未移植。
      </p>
    </main>
  );
}
