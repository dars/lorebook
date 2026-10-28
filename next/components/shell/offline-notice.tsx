import { AppLink } from '@/components/ui/app-link';

/**
 * 「無法確認登入狀態」時的畫面。
 *
 * 這個狀態幾乎只會在離線時出現。**刻意不導向登入頁**——那會讓使用者以為
 * 自己被登出、資料不見了，而離線時登入頁同樣登不進去，是一條死路。
 *
 * 也刻意不長得像「還沒有角色」的空狀態：那個畫面會請人去建立新角色，
 * 在資料只是暫時取不到的時候，那是最糟的建議。
 */
export function OfflineNotice({
  action,
}: {
  /** 這一頁在恢復連線後該回到哪裡；省略則只提供重試。 */
  action?: { href: string; label: string };
}) {
  return (
    <main
      id="main-content"
      className="mx-auto flex w-full max-w-[520px] flex-1 flex-col justify-center px-4 py-10"
    >
      <div className="rounded-card border border-border bg-surface-1 p-5">
        <h1 className="font-display text-[20px] font-bold text-gold">目前連不上</h1>
        <p className="mt-2 text-ui leading-relaxed text-text-light">
          無法確認你的登入狀態，通常是網路不通。
          <span className="mt-1 block text-text-secondary">
            你<strong className="text-text-light">沒有</strong>
            被登出——恢復連線後重新整理就會回到原本的地方。
          </span>
        </p>

        <div className="mt-4 flex flex-col gap-2">
          {action && (
            <AppLink
              href={action.href}
              className="flex min-h-11 items-center justify-center rounded-card border border-gold bg-gold/10 text-ui font-bold text-gold"
            >
              {action.label}
            </AppLink>
          )}
          <AppLink
            href="/demo"
            className="flex min-h-11 items-center justify-center rounded-card border border-border text-ui text-text-secondary"
          >
            先看看試玩角色
          </AppLink>
        </div>
      </div>
    </main>
  );
}
