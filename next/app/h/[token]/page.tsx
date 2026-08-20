import type { Metadata } from 'next';

import { HomebrewView } from '@/components/homebrew/homebrew-view';
import { fetchSharedHomebrew } from '@/lib/homebrew/fetch';
import { HOMEBREW_KIND } from '@/lib/homebrew/types';

/**
 * 自創內容的分享檢視。
 *
 * **即時活資料，不得靜態化**——作者依 DM 要求改完數值，同一個連結（與已經
 * 貼在 Discord 的 QR code）就該反映新版本，這正是分享做成「窗」而非快照的
 * 全部理由（openspec homebrew-share D1）。
 *
 * 未登入可讀：拿到連結的人不一定有帳號，逼他先註冊才能看等於讓連結失效。
 */
export const dynamic = 'force-dynamic';

type Props = PageProps<'/h/[token]'>;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  const r = await fetchSharedHomebrew(token);

  const title =
    r.status === 'ok'
      ? `${r.content.data.name}｜Lorebook`
      : '這份分享無法檢視｜Lorebook';
  const description =
    r.status === 'ok'
      ? `${HOMEBREW_KIND[r.content.kind].label}・玩家自創內容`
      : '連結可能已被撤銷或不存在。';

  return {
    title,
    description,
    // 分享連結是 capability URL：任何持有者皆可檢視，因此**絕不可被索引**，
    // 否則等同公開，也違反「無公開列舉介面」這條規格約束（D12）。
    robots: { index: false, follow: false, nocache: true },
    openGraph: { title, description },
    twitter: { card: 'summary', title, description },
  };
}

export default async function SharedHomebrewPage({ params }: Props) {
  const { token } = await params;
  const result = await fetchSharedHomebrew(token);

  if (result.status !== 'ok') return <Unavailable status={result.status} />;

  return (
    <HomebrewView
      content={result.content}
      sourceUpdatedAt={result.sourceUpdatedAt}
    />
  );
}

const MESSAGES: Record<string, { title: string; body: string }> = {
  revoked: {
    title: '這份分享已被撤銷',
    body: '作者停用了這個連結。若仍需要這份內容，請向對方索取新的連結。',
  },
  deleted: {
    title: '這份內容已被刪除',
    body: '連結本身有效，但它指向的內容已經不存在了。已經收藏過的人不受影響——收藏是複製，與來源無關。',
  },
  not_found: {
    title: '找不到這份分享',
    body: '連結可能不完整或有誤。請確認網址是否完整複製。',
  },
  error: {
    title: '目前無法載入',
    body: '可能是網路問題或伺服器暫時無法回應。稍後重新整理再試一次。',
  },
};

/**
 * 失效與故障的呈現，措辭與 `/v/[token]` 對稱。
 *
 * 「已撤銷／已刪除／找不到」是明確答案，檢視者知道不必再試；「無法載入」
 * 是暫時狀況，重試有意義。兩者混為一談會讓人對著一個永遠不會好的頁面重整。
 */
function Unavailable({ status }: { status: string }) {
  const m = MESSAGES[status] ?? MESSAGES.error;
  return (
    <main
      id="main-content"
      className="flex flex-1 items-center justify-center p-4"
    >
      <div className="w-full max-w-sm rounded-card border border-border bg-surface-1 p-6 text-center">
        <h1 className="font-display text-heading text-gold">{m.title}</h1>
        <p className="mt-3 text-small leading-relaxed text-text-light">
          {m.body}
        </p>
      </div>
    </main>
  );
}
