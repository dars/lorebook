'use client';

import { useState, useTransition } from 'react';

import { createShare, revokeShare, type ShareRow } from '@/lib/share/actions';
import { shareLinkFor } from '@/lib/share/token';
import { EditorSheet } from '@/components/ui/editor-sheet';
import { Chip, EmptyHint } from '../primitives';
import { ShareQr } from './share-qr';
import { StepperButton } from './controls';

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

      <div className="mt-3">
        <StepperButton label="建立分享連結" onClick={onCreate}>
          {pending ? '處理中…' : '建立分享連結'}
        </StepperButton>
      </div>

      {error && (
        <p className="mt-2 text-small text-danger">無法完成（{error}）</p>
      )}

      {shares.length === 0 ? (
        <EmptyHint text="目前沒有有效的分享連結。" />
      ) : (
        <ul className="mt-3">
          {shares.map((s) => (
            <li
              key={s.token}
              className="flex flex-wrap items-center gap-2 border-b border-border-2 py-2"
            >
              <code className="grow break-all text-small text-text-light">
                {shareLinkFor(origin, s.token).replace(/^https?:\/\//, '')}
              </code>
              {copied === s.token && <Chip tone="gold">已複製</Chip>}
              <StepperButton
                label="複製連結"
                onClick={() => void onCopy(s.token)}
              >
                複製
              </StepperButton>
              <StepperButton
                label="顯示連結與 QR"
                onClick={() => setQrToken(s.token)}
              >
                QR
              </StepperButton>
              <StepperButton
                label="撤銷這個分享連結"
                onClick={() => onRevoke(s.token)}
              >
                撤銷
              </StepperButton>
            </li>
          ))}
        </ul>
      )}
      <EditorSheet
        open={qrToken !== null}
        title="分享連結"
        onClose={() => setQrToken(null)}
      >
        <p className="text-[12px] text-text-secondary">
          讓對方掃描，或把連結傳給他。
        </p>
        {qrToken && (
          <div className="mt-4 flex flex-col items-center">
            <ShareQr link={shareLinkFor(origin, qrToken)} />
            <code className="mt-4 w-full break-all rounded-card border border-border px-3 py-2 text-center text-[12px] text-text-light">
              {shareLinkFor(origin, qrToken)}
            </code>
            <button
              type="button"
              onClick={() => void onCopy(qrToken)}
              className="mt-2 min-h-11 w-full rounded-card border border-border text-[13px] text-text-secondary"
            >
              {copied === qrToken ? '已複製' : '複製連結'}
            </button>
          </div>
        )}
      </EditorSheet>
    </div>
  );
}
