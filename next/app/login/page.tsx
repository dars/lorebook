import Link from 'next/link';

import { signIn } from '@/lib/auth/actions';

// 最小可用的登入頁：讓 OAuth 流程可端到端驗證，並確認設計 token 生效。
// 正式版面待 tasks 5.1 的版型框架完成後再做。

export default async function LoginPage({
  searchParams,
}: PageProps<'/login'>) {
  const { error } = await searchParams;

  return (
    <main className="flex min-h-full flex-1 items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-card border border-border bg-surface-1 p-6">
        <h1 className="font-display text-title text-gold">Lorebook</h1>
        <p className="mt-2 text-small text-text-secondary">
          D&amp;D 2024 跑團角色卡
        </p>

        {error && (
          <p className="mt-4 rounded-chip border border-danger px-3 py-2 text-small text-danger">
            {error}
          </p>
        )}

        <form className="mt-6" action={signIn.bind(null, '/')}>
          <button
            type="submit"
            className="w-full cursor-pointer rounded-chip border border-border bg-surface-2 px-4 py-3 text-body text-text-primary hover:border-gold"
          >
            以 Google 帳號登入
          </button>
        </form>

        <p className="mt-4 text-center text-small text-text-secondary">
          還不想註冊？
          <Link href="/demo" className="ml-1 text-gold underline">
            先試玩看看
          </Link>
        </p>
      </div>
    </main>
  );
}
