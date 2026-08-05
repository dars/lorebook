import type { Metadata } from 'next';

import { ReadOnlySheet } from '@/components/character/read-only-sheet';
import { fetchSharedCharacter } from '@/lib/share/fetch';

/**
 * 角色卡分享檢視。
 *
 * **即時活資料，不得靜態化**——擁有者改動後檢視者重新載入就該看到新內容
 * （character-share 規格）。這也是不啟用 ISR／R2 快取的原因。
 *
 * 路徑維持 `/v/:token` 不變，既有已發出的分享連結持續有效。
 */
export const dynamic = 'force-dynamic';

type Props = PageProps<'/v/[token]'>;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  const r = await fetchSharedCharacter(token);

  // 預覽卡片的內容不得超出「持有連結者已可檢視」的範圍——他本來就看得到
  // 整張卡，所以角色名與職業可入卡片；但仍不可被索引。
  const title =
    r.status === 'ok'
      ? `${r.character.name}｜Lorebook`
      : '這份分享無法檢視｜Lorebook';
  const description =
    r.status === 'ok'
      ? [r.character.species, r.character.className, `${r.character.level} 級`]
          .filter(Boolean)
          .join(' · ')
      : '連結可能已被撤銷或不存在。';

  return {
    title,
    description,
    // 分享連結是 capability URL：任何持有者皆可檢視，因此**絕不可被索引**，
    // 否則等同公開。這條優先於任何 SEO 考量。
    robots: { index: false, follow: false, nocache: true },
    openGraph: { title, description, type: 'profile' },
    twitter: { card: 'summary', title, description },
  };
}

export default async function SharedCharacterPage({ params }: Props) {
  const { token } = await params;
  const result = await fetchSharedCharacter(token);

  if (result.status !== 'ok') {
    return <Unavailable status={result.status} />;
  }

  return (
    <main className="flex-1">
      <ReadOnlySheet c={result.character} />
      <FetchedAt at={result.fetchedAt} />
    </main>
  );
}

const MESSAGES: Record<string, { title: string; body: string }> = {
  revoked: {
    title: '這份分享已被撤銷',
    body: '角色的擁有者停用了這個連結。若仍需查看，請向對方索取新的連結。',
  },
  deleted: {
    title: '這個角色已被刪除',
    body: '連結本身有效，但它指向的角色已經不存在了。',
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
 * 失效與故障的呈現。
 *
 * 刻意區分「已撤銷／已刪除／找不到」與「載入失敗」：前三者是明確的答案，
 * 檢視者知道不必再試；後者是暫時狀況，重試有意義。規格要求無法載入時
 * **不得呈現部分或過期內容而不加標示**——此處完全不顯示角色資料。
 */
function Unavailable({ status }: { status: string }) {
  const m = MESSAGES[status] ?? MESSAGES.error;
  return (
    <main className="flex flex-1 items-center justify-center p-lg">
      <div className="w-full max-w-sm rounded-card border border-border bg-surface-1 p-2xl text-center">
        <h1 className="font-display text-heading text-gold">{m.title}</h1>
        <p className="mt-md text-small leading-relaxed text-text-light">
          {m.body}
        </p>
      </div>
    </main>
  );
}

/**
 * 資料時點。規格要求顯示抓取時間——檢視者才知道自己看到的是何時的狀態。
 *
 * 重新整理用原生連結而非按鈕：分享頁是純唯讀且不含 client JS，一個 <a>
 * 就足夠，不必為此引入互動元件。
 */
function FetchedAt({ at }: { at: number }) {
  return (
    <footer className="mx-auto max-w-3xl px-lg pb-2xl text-center text-tiny text-text-secondary">
      資料取得於 {new Date(at).toLocaleString('zh-TW', { hour12: false })}
      {' · '}
      <a href="" className="underline hover:text-gold">
        重新整理
      </a>
    </footer>
  );
}
