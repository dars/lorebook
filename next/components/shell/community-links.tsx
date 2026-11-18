import { ParchmentCard } from '@/components/ui/decorations';

/** 登入與試玩設定共用同一個回饋入口。 */
export function CommunityLinks() {
  return (
    <ParchmentCard className="p-4">
      <h2 className="text-body font-semibold text-text-primary">意見回饋與社群</h2>
      <p className="mt-2 text-small leading-relaxed text-text-secondary">
        發現問題、想許願新功能，或分享你的冒險？歡迎加入 Discord，和我們聊聊。
      </p>
      <DiscordLink className="mt-4 flex min-h-11 items-center justify-between gap-3 rounded-card border border-gold px-4 py-2 text-small font-semibold text-gold hover:bg-gold/10" />
    </ParchmentCard>
  );
}

/** 首頁與設定共用邀請網址，避免更新時漏掉其中一處。 */
export function DiscordLink({ className }: { className?: string }) {
  return (
    <a href="https://discord.gg/UcqsjvRHc" target="_blank" rel="noopener noreferrer" className={className}>
      <span className="flex min-w-0 items-center gap-2">
        <svg viewBox="0 0 24 24" className="size-5 shrink-0 fill-current" aria-hidden="true" focusable="false">
          <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.211.375-.445.865-.609 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.618-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.675 4.37a.07.07 0 0 0-.032.027C.533 9.043-.32 13.575.099 18.05a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.042-.106 13.108 13.108 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.372-.291a.074.074 0 0 1 .078-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .079.009c.12.099.246.198.373.292a.077.077 0 0 1-.006.127c-.6.35-1.223.648-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.363 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.65a.061.061 0 0 0-.031-.03ZM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.418 2.157-2.418 1.21 0 2.176 1.095 2.157 2.418 0 1.334-.956 2.419-2.157 2.419Zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.418 2.157-2.418 1.21 0 2.176 1.095 2.157 2.418 0 1.334-.946 2.419-2.157 2.419Z" />
        </svg>
        <span>加入 Discord・回饋意見<span className="sr-only">（在新分頁開啟）</span></span>
      </span>
      <span aria-hidden="true">↗</span>
    </a>
  );
}
