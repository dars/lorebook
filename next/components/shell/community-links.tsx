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
      <span>加入 Discord・回饋意見<span className="sr-only">（在新分頁開啟）</span></span>
      <span aria-hidden="true">↗</span>
    </a>
  );
}
