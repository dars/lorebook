
import { AppLink } from '@/components/ui/app-link';
import { signIn } from '@/lib/auth/actions';

function LorebookSigil() {
  return (
    <div className="lorebook-sigil" aria-hidden="true">
      <svg viewBox="0 0 220 220" fill="none">
        <path d="M110 12a98 98 0 0 1 95 73M208 105a98 98 0 0 1-47 84M143 202a98 98 0 0 1-88-18M39 170A98 98 0 0 1 18 78M30 57a98 98 0 0 1 58-42" className="sigil-orbit" />
        <circle cx="110" cy="110" r="84" className="sigil-orbit sigil-orbit-inner" />

        <path d="m110 28 72 43-16 90-56 31-56-31-16-90 72-43Z" className="sigil-die" />
        <path d="m110 28-37 62 37-12 37 12-37-62Z" className="sigil-facet sigil-facet-glow" />
        <path d="m38 71 35 19-19 71 56-83-72-7ZM182 71l-35 19 19 71-56-83 72-7Z" className="sigil-facet" />
        <path d="m54 161 56-20 56 20-56 31-56-31Z" className="sigil-facet sigil-facet-glow" />
        <path d="M110 28 38 71l35 19-19 71 56 31 56-31-19-71 35-19-72-43Zm0 50L73 90l37 51 37-51-37-12Zm0 63-56 20m56-20 56 20" className="sigil-lines" />

        <circle cx="110" cy="111" r="21" className="sigil-core-ring" />
        <path d="M110 91c3 8 12 11 12 21 0 7-5 13-12 16-7-3-12-9-12-16 0-8 7-12 9-18 3 5 3 10 3 14 4-4 4-10 0-17Z" className="sigil-core" />
        <path d="m110 101 5 11-5 9-5-9 5-11Z" className="sigil-core-cut" />
        <text x="110" y="176" textAnchor="middle" className="sigil-number">XX</text>

        <path d="M110 8v9M110 203v9M8 110h9M203 110h9M40 40l7 7M173 173l7 7M180 40l-7 7M47 173l-7 7" className="sigil-runes" />
        <circle cx="110" cy="12" r="2" className="sigil-node" /><circle cx="208" cy="105" r="2" className="sigil-node" /><circle cx="39" cy="170" r="2" className="sigil-node" />
      </svg>
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
          <p className="login-motto">每一位英雄，都值得一本自己的傳奇。</p>
        </div>
        <LorebookSigil />
        <div className="login-features" aria-label="Lorebook 功能">
          <p><span>01</span>角色卡</p><p><span>02</span>冒險筆記</p><p><span>03</span>法術與裝備</p>
        </div>
      </section>

      <section className="login-entry" aria-label="登入 Lorebook">
        <div className="login-panel">
          <div className="login-panel-corners" aria-hidden="true" />
          <p className="login-panel-eyebrow">OPEN YOUR CHRONICLE</p>
          <h2 className="font-display text-heading text-text-primary">翻開你的冒險者典籍</h2>
          <p className="mt-3 text-body leading-6 text-text-secondary">登入以繼續管理角色、裝備與旅途中寫下的每一頁紀錄。</p>
          {error && <p role="alert" className="mt-5 rounded-chip border border-danger px-3 py-2 text-small text-danger">{error}</p>}
          <form className="mt-7" action={signIn.bind(null, back)}>
            <button type="submit" className="login-primary-button">
              <GoogleMark />使用 Google 帳號繼續<span aria-hidden="true" className="ml-auto">→</span>
            </button>
          </form>
          <div className="login-divider"><span>或</span></div>
          <AppLink href="/demo" className="login-demo-link">
            <span><strong>先以訪客身分試玩</strong><small>不用註冊，直接查看範例角色</small></span>
            <span aria-hidden="true">↗</span>
          </AppLink>
          <p className="mt-7 text-center text-tiny leading-5 text-text-secondary">登入即表示你同意讓 Lorebook 儲存你的角色資料。</p>
        </div>
      </section>
      <p className="login-edition font-label" aria-hidden="true">EST. 2024 · TAIWAN</p>
    </main>
  );
}
