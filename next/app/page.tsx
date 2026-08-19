import { redirect } from 'next/navigation';

import { getAuthState } from '@/lib/supabase/server';

// 依賴 session，不得靜態預渲染——建置時既沒有 cookie 也沒有環境變數。
export const dynamic = 'force-dynamic';

/**
 * 首頁：依登入狀態分流。
 *
 * 正式的角色清單與 App 外殼待後續任務；此處先確保未登入者落到登入頁，
 * 而不是停在 create-next-app 的樣板上。
 */
export default async function Home() {
  const auth = await getAuthState();

  // 只有確定未登入才去登入頁。無法確認（離線）時一律往主畫面送——
  // 那裡的 layout 會呈現離線畫面，而登入頁在離線時是死路。
  if (auth.status === 'unauthenticated') redirect('/login');

  // 登入後直接進角色清單——首頁沒有其他內容時，多一次點擊只是阻礙。
  redirect('/main/character');
}
