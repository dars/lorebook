import Image from 'next/image';

import { AppLink } from '@/components/ui/app-link';
import { signIn } from '@/lib/auth/actions';

function AdventuringParty() {
  return (
    <div className="login-party" role="img" aria-label="抱著盾牌的聖騎士、翻閱魔法書的法師與彈琴的詩人，一起準備出發冒險">
      <div className="login-party-arch" aria-hidden="true" />
      {['wizard', 'bard', 'paladin'].map((name) => (
        <Image key={name} src={`/images/guide/${name}-expressive-v1.webp`}
          width={768} height={768} alt="" unoptimized preload
          className={`login-companion login-companion-${name}`} />
      ))}
      <span className="login-party-caption" aria-hidden="true">小小的英雄，大大的冒險。</span>
    </div>
  );
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5 shrink-0">
      <path fill="currentColor" d="M21.35 12.18c0-.71-.06-1.4-.18-2.06H12v3.9h5.24a4.48 4.48 0 0 1-1.94 2.94v2.53h3.15c1.84-1.7 2.9-4.2 2.9-7.31Z" />
      <path fill="currentColor" opacity=".78" d="M12 21.7c2.63 0 4.83-.87 6.45-2.21l-3.15-2.53c-.87.58-1.99.93-3.3.93-2.54 0-4.69-1.72-5.46-4.02H3.28v2.61A9.74 9.74 0 0 0 12 21.7Z" />
      <path fill="currentColor" opacity=".58" d="M6.54 13.87a5.86 5.86 0 0 1 0-3.74V7.52H3.28a9.75 9.75 0 0 0 0 8.96l3.26-2.61Z" />
      <path fill="currentColor" opacity=".9" d="M12 6.11c1.43 0 2.71.49 3.72 1.45l2.8-2.79A9.37 9.37 0 0 0 3.28 7.52l3.26 2.61C7.31 7.83 9.46 6.11 12 6.11Z" />
    </svg>
  );
}

export default async function LoginPage({
  searchParams,
}: PageProps<'/login'>) {
  const { error, next } = await searchParams;

  // 登入後要回哪裡。只接受站內相對路徑——`//evil.example` 在瀏覽器眼中是
  // 協定相對的絕對網址，放行就是一個 open redirect。
  const back =
    typeof next === 'string' && next.startsWith('/') && !next.startsWith('//')
      ? next
      : '/';

  return (
    <main id="main-content" className="login-stage flex min-h-full flex-1">
      <section className="login-hero" aria-labelledby="login-title">
        <div className="login-hero-copy">
          <p className="login-kicker">Dungeons &amp; Dragons · 2024</p>
          <h1 id="login-title" className="login-wordmark font-display">Lorebook</h1>
          <p className="login-motto">帶上角色，出發寫你的傳奇。</p>
        </div>
        <AdventuringParty />
        <div className="login-features" aria-label="Lorebook 功能">
          <p>角色卡 · 法術與裝備 · 冒險筆記</p><AppLink href="/guide/classes">探索 12 種職業 <span aria-hidden="true">↗</span></AppLink>
        </div>
      </section>

      <section className="login-entry" aria-label="登入 Lorebook">
        <div className="login-panel">

          <p className="login-panel-eyebrow">準備好出發了嗎？</p>
          <h2 className="text-heading text-text-primary">你的冒險，從這裡開始。</h2>
          <p className="mt-3 text-body leading-6 text-text-secondary">把角色、法術與旅途中的故事，收進你的冒險者典籍。</p>
          {error && <p role="alert" className="mt-5 rounded-chip border border-danger px-3 py-2 text-small text-danger">{error}</p>}
          <form className="mt-7" action={signIn.bind(null, back)}>
            <button type="submit" className="login-primary-button">
              <GoogleMark />使用 Google 登入<span aria-hidden="true" className="ml-auto">→</span>
            </button>
          </form>
          <div className="login-divider"><span>或</span></div>
          <AppLink href="/demo" className="login-demo-link">
            <span><strong>先以訪客身分試玩</strong><small>不用註冊，直接查看範例角色</small></span>
            <span aria-hidden="true">↗</span>
          </AppLink>
          <p className="mt-7 text-center text-small leading-6 text-text-secondary">繼續使用前，請閱讀隱私權政策與使用條款。</p>
          <nav aria-label="政策與條款" className="flex flex-wrap justify-center gap-x-5 text-small text-section-label">
            <AppLink href="/privacy" className="inline-flex min-h-11 items-center underline">隱私權政策</AppLink>
            <AppLink href="/terms" className="inline-flex min-h-11 items-center underline">使用條款</AppLink>
          </nav>
        </div>
      </section>
      <p className="login-edition font-label" aria-hidden="true">EST. 2024 · TAIWAN</p>
    </main>
  );
}
