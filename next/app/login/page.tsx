import { signIn } from '@/lib/auth/actions';

// 最小可用的登入頁：讓 OAuth 流程可端到端驗證，並確認設計 token 生效。
// 正式版面待 tasks 5.1 的版型框架完成後再做。

export default async function LoginPage({
  searchParams,
}: PageProps<'/login'>) {
  const { error } = await searchParams;

  return (
    <main className="flex min-h-full flex-1 items-center justify-center p-lg">
      <div className="w-full max-w-sm rounded-card border border-border bg-surface-1 p-2xl">
        <h1 className="font-display text-title text-gold">Lorebook</h1>
        <p className="mt-sm text-small text-text-secondary">
          D&amp;D 2024 跑團角色卡
        </p>

        {error && (
          <p className="mt-lg rounded-chip border border-danger px-md py-sm text-small text-danger">
            {error}
          </p>
        )}

        <div className="mt-2xl flex flex-col gap-md">
          <form action={signIn.bind(null, 'google', '/')}>
            <button
              type="submit"
              className="w-full cursor-pointer rounded-chip border border-border bg-surface-2 px-lg py-md text-body text-text-primary hover:border-gold"
            >
              以 Google 帳號登入
            </button>
          </form>
          <form action={signIn.bind(null, 'apple', '/')}>
            <button
              type="submit"
              className="w-full cursor-pointer rounded-chip border border-border bg-surface-2 px-lg py-md text-body text-text-primary hover:border-gold"
            >
              以 Apple 帳號登入
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
