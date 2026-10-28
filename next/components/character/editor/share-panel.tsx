'use client';

import { useState, useTransition } from 'react';

import { createShare, revokeShare, type ShareRow } from '@/lib/share/actions';
import { shareLinkFor } from '@/lib/share/token';
import { EditorSheet } from '@/components/ui/editor-sheet';
import { Chip, EmptyHint } from '../primitives';
import { ShareQr } from './share-qr';

/**
 * 分享管理。
 *
 * 只列出**有效**的分享——撤銷後就不該再出現在畫面上（character-share 規格）。
 * 清單上呈現的每一條都是有效的，因此不需要「有效／已撤銷」的狀態標示。
 */
export function SharePanel({
  characterId,
  initial,
}: {
  characterId: string;
  initial: ShareRow[];
}) {
  const [shares, setShares] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [qrToken, setQrToken] = useState<string | null>(null);
  // 撤銷不可逆且沒有 undo，而觸發它的是一顆 18px 的圖示鈕——一定要先問。
  const [confirmRevoke, setConfirmRevoke] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // origin 於 client 取得——本機開發、預覽與正式站不必各自設定。
  const origin = typeof window === 'undefined' ? '' : window.location.origin;

  const onCreate = () =>
    startTransition(async () => {
      const r = await createShare(characterId);
      if (r.error || !r.token) return setError(r.error ?? '建立失敗');
      setError(null);
      setShares((prev) => [
        {
          token: r.token!,
          characterId,
          label: null,
          createdAt: new Date().toISOString(),
        },
        ...prev,
      ]);
    });

  const onRevoke = (token: string) =>
    startTransition(async () => {
      const r = await revokeShare(token, characterId);
      if (r.error) return setError(r.error);
      setError(null);
      setShares((prev) => prev.filter((s) => s.token !== token));
    });

  const onCopy = async (token: string) => {
    await navigator.clipboard.writeText(shareLinkFor(origin, token));
    setCopied(token);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div>
      <p className="text-small leading-relaxed text-text-secondary">
        持有連結的人<strong className="text-text-light">不需登入</strong>
        就能看到這張角色卡的<strong className="text-text-light">當下</strong>
        內容，包含 HP 與剩餘資源。不想再讓對方看到時，撤銷連結即可。
      </p>

      {/* 整條實心金底 CTA，對照 Flutter。原本是一顆小的線框 StepperButton，
          份量跟旁邊的「複製／撤銷」一樣，看不出這是這個區塊的主要動作。 */}
      <button
        type="button"
        onClick={onCreate}
        disabled={pending}
        className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-chip bg-gold-solid text-body font-bold text-[#1A1206] disabled:opacity-60"
      >
        <svg viewBox="0 0 24 24" className="size-4 fill-current" aria-hidden>
          <path d="M18 16.1c-.8 0-1.5.3-2 .8l-7.1-4.2c.1-.2.1-.5.1-.7s0-.5-.1-.7L16 7.1c.5.5 1.2.8 2 .8a3 3 0 1 0-3-3c0 .3 0 .5.1.7L8 9.9c-.5-.5-1.2-.8-2-.8a3 3 0 1 0 0 6c.8 0 1.5-.3 2-.8l7.1 4.2c-.1.2-.1.4-.1.6a2.9 2.9 0 1 0 3-2.9" />
        </svg>
        {pending ? '處理中…' : '建立分享連結'}
      </button>

      {error && (
        <p className="mt-2 text-small text-danger">無法完成（{error}）</p>
      )}

      {shares.length === 0 ? (
        <EmptyHint text="還沒有分享連結——用上方的「建立分享連結」產生一個。" />
      ) : (
        <ul className="mt-3 flex flex-col gap-2">
          {shares.map((s) => (
            <li
              key={s.token}
              className="rounded-card border border-border-2 bg-surface-1 px-3 py-2"
            >
              <div className="flex items-center gap-2">
                {/* 備註是使用者自己寫的「分享給誰」。曾經這裡寫死「DM」，
                    每一條分享——給隊友的、給觀戰者的——都被標成 DM，
                    是顯示錯誤資訊而非缺功能。沒有備註就不顯示徽章。 */}
                {s.label && (
                  <span className="rounded-chip border border-gold/60 bg-gold/10 px-1.5 text-eyebrow font-semibold text-gold">
                    {s.label}
                  </span>
                )}
                {s.createdAt && (
                  <span className="font-label text-tiny tabular-nums text-text-secondary">
                    {fmtShareDate(s.createdAt)} 建立
                  </span>
                )}
                {copied === s.token && <Chip tone="gold">已複製</Chip>}
              </div>
              <div className="mt-1 flex items-center gap-2">
                <code className="min-w-0 grow truncate text-small text-text-light">
                  {shareLinkFor(origin, s.token).replace(/^https?:\/\//, '')}
                </code>
                {/* 圖示鈕而非三顆文字鈕：連結本身才是這一列的主體。 */}
                <IconAction label="複製連結" onClick={() => void onCopy(s.token)}>
                  <path d="M16 1H4a2 2 0 0 0-2 2v14h2V3h12zm3 4H8a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2m0 16H8V7h11z" />
                </IconAction>
                <IconAction label="顯示連結與 QR" onClick={() => setQrToken(s.token)}>
                  <path d="M3 3h8v8H3zm2 2v4h4V5zm-2 8h8v8H3zm2 2v4h4v-4zm8-12h8v8h-8zm2 2v4h4V5zm-2 8h2v2h-2zm4 0h2v2h-2zm2 2h2v2h-2zm-4 2h2v2h-2zm2 2h2v2h-2zm2 0h2v2h-2z" />
                </IconAction>
                <IconAction
                  label="撤銷這個分享連結"
                  danger
                  disabled={pending}
                  onClick={() => setConfirmRevoke(s.token)}
                >
                  <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20M4 12a8 8 0 0 1 12.9-6.3L5.7 16.9A8 8 0 0 1 4 12m8 8a8 8 0 0 1-4.9-1.7L18.3 7.1A8 8 0 0 1 12 20" />
                </IconAction>
              </div>
            </li>
          ))}
        </ul>
      )}
      <EditorSheet
        open={qrToken !== null}
        title="分享連結"
        onClose={() => setQrToken(null)}
      >
        <p className="text-small text-text-secondary">
          讓對方掃描，或把連結傳給他。
        </p>
        {qrToken && (
          <div className="mt-4 flex flex-col items-center">
            <ShareQr link={shareLinkFor(origin, qrToken)} />
            <code className="mt-4 w-full break-all rounded-card border border-border px-3 py-2 text-center text-small text-text-light">
              {shareLinkFor(origin, qrToken)}
            </code>
            <button
              type="button"
              onClick={() => void onCopy(qrToken)}
              className="mt-2 min-h-11 w-full rounded-card border border-border text-ui text-text-secondary"
            >
              {copied === qrToken ? '已複製' : '複製連結'}
            </button>
          </div>
        )}
      </EditorSheet>

      <EditorSheet
        open={confirmRevoke !== null}
        title="撤銷分享？"
        saveLabel="撤銷"
        saveTone="danger"
        onClose={() => setConfirmRevoke(null)}
        onSave={() => {
          if (confirmRevoke) onRevoke(confirmRevoke);
          setConfirmRevoke(null);
        }}
      >
        <p className="text-ui leading-relaxed text-text-light">
          這個連結會立即失效，對方會看到「這份分享已被撤銷」。
          <span className="block text-text-secondary">
            無法復原，但你可以再建立新的連結。其他分享不受影響。
          </span>
        </p>
      </EditorSheet>
    </div>
  );
}

/** 分享列的小圖示鈕。視覺 18px，可點區 44px。 */
function IconAction({
  label,
  onClick,
  danger = false,
  disabled = false,
  children,
}: {
  label: string;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="relative shrink-0 before:absolute before:-inset-3 before:content-[''] disabled:opacity-40"
    >
      <svg
        viewBox="0 0 24 24"
        className={`size-[18px] ${danger ? 'fill-text-secondary hover:fill-danger' : 'fill-text-secondary hover:fill-gold'}`}
        aria-hidden
      >
        {children}
      </svg>
    </button>
  );
}

/** 建立日期。用 Intl 而非硬寫格式——日期呈現要跟著使用者的地區走。 */
function fmtShareDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}
