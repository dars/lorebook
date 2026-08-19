'use client';

import { signOut } from '@/lib/auth/actions';

/**
 * 登出鈕。
 *
 * 為什麼不是單純的 `<form action={signOut}>`：Server Action 在伺服器上跑，
 * 碰不到瀏覽器的 Cache Storage，而登出必須連帶清掉快取裡的角色頁——那些
 * 回應含個人資料，留在共用裝置上，下一個人登入就會在離線時看到前一個人的角色。
 *
 * 清除在送出前先做。**清不掉也照樣登出**：結束 session 是使用者按這顆鈕的
 * 本意，不能因為快取清理失敗就卡住。
 */
export function SignOutButton() {
  const clearThenSignOut = async () => {
    try {
      const reg = await navigator.serviceWorker?.getRegistration();
      reg?.active?.postMessage({ type: 'clear-private' });
    } catch {
      // 沒有 SW、或瀏覽器不支援——照常登出。
    }
    await signOut();
  };

  return (
    <form action={clearThenSignOut}>
      <button
        type="submit"
        className="mt-4 flex min-h-11 w-full items-center justify-center rounded-card border border-danger text-small text-danger"
      >
        登出
      </button>
    </form>
  );
}
