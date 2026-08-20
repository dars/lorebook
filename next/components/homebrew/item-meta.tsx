'use client';

import { useState, useTransition } from 'react';

import { ShareQr } from '@/components/character/editor/share-qr';
import {
  createHomebrewShare,
  revokeHomebrewShare,
} from '@/lib/homebrew/share-actions';
import { refreshCopy, updateSourceNote } from '@/lib/homebrew/library-actions';
import { type HomebrewKind, homebrewLinkFor } from '@/lib/homebrew/types';

/**
 * 收藏紀錄裡每一項的附加列：來源標記、跟上來源、分享出去。
 *
 * 自建的與收藏來的**混在同一個區塊**（design D9），差別只由這一列表達——
 * 收藏來的有備註行，自建的沒有。不另外做「來自分享」徽章：那會變成同一件事
 * 說兩次，而備註本身資訊量更大（D7）。
 */
export function HomebrewItemMeta({
  kind,
  id,
  sourceToken,
  sourceNote,
  edited,
  outdated,
  shareToken,
}: {
  kind: HomebrewKind;
  id: string;
  /** null＝自建。 */
  sourceToken: string | null;
  sourceNote: string | null;
  /** 我改過這份副本——更新前要先警告。 */
  edited: boolean;
  /** 來源已經比我這份新。 */
  outdated: boolean;
  /** 目前有效的分享 token，null＝還沒分享。 */
  shareToken: string | null;
}) {
  return (
    <div className="mt-2 border-t border-border/60 pt-2">
      {sourceToken && (
        <NoteRow kind={kind} id={id} note={sourceNote} />
      )}
      {outdated && <RefreshRow kind={kind} id={id} edited={edited} />}
      <ShareRow kind={kind} id={id} shareToken={shareToken} />
    </div>
  );
}

/** 備註行。留空時以灰字提示它是收藏來的，點一下就能寫。 */
function NoteRow({
  kind,
  id,
  note,
}: {
  kind: HomebrewKind;
  id: string;
  note: string | null;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(note ?? '');
  const [pending, startTransition] = useTransition();

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="flex min-h-9 w-full items-center text-left text-[12px]"
      >
        <span className={note ? 'text-text-light' : 'text-text-secondary'}>
          {note || '來自分享'}
        </span>
        <span className="ml-2 text-gold">編輯備註</span>
      </button>
    );
  }

  const save = () =>
    startTransition(async () => {
      await updateSourceNote(kind, id, value);
      setEditing(false);
    });

  return (
    <div className="flex items-center gap-2 py-1">
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        maxLength={40}
        autoComplete="off"
        spellCheck={false}
        aria-label="來源備註"
        placeholder="例：阿凱的、DM 核准版"
        className="h-9 flex-1 rounded-card border border-border bg-surface-2 px-2 text-[12px] text-text-primary"
      />
      <button
        type="button"
        onClick={save}
        disabled={pending}
        className="min-h-9 text-[12px] text-gold disabled:opacity-50"
      >
        {pending ? '儲存中' : '儲存'}
      </button>
    </div>
  );
}

/**
 * 「來源已更新」與更新副本。
 *
 * 更新＝刪除後重收，因此本地改過的內容會整個不見。改過就先問一次——這是
 * 唯一會讓使用者失去自己輸入的地方（tasks 7.5）。
 */
function RefreshRow({
  kind,
  id,
  edited,
}: {
  kind: HomebrewKind;
  id: string;
  edited: boolean;
}) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const run = () =>
    startTransition(async () => {
      const r = await refreshCopy(kind, id);
      if (r.error) setError(r.error);
      setConfirming(false);
    });

  return (
    <div className="py-1">
      <p className="text-[12px] text-gold">來源已更新</p>
      {confirming ? (
        <div className="mt-1">
          <p className="text-[12px] leading-relaxed text-text-light">
            更新會換成來源當下的版本，你在這一份上改過的內容會消失。備註會留著。
          </p>
          <div className="mt-1 flex gap-3">
            <button
              type="button"
              onClick={run}
              disabled={pending}
              className="min-h-9 text-[12px] text-danger disabled:opacity-50"
            >
              {pending ? '更新中…' : '仍要更新'}
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="min-h-9 text-[12px] text-text-secondary"
            >
              取消
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => (edited ? setConfirming(true) : run())}
          disabled={pending}
          className="min-h-9 text-[12px] text-gold disabled:opacity-50"
        >
          {pending ? '更新中…' : '更新副本'}
        </button>
      )}
      {error && (
        <p role="alert" className="text-[12px] text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

/** 分享入口：產生連結、複製、QR、撤銷。 */
function ShareRow({
  kind,
  id,
  shareToken,
}: {
  kind: HomebrewKind;
  id: string;
  shareToken: string | null;
}) {
  const [token, setToken] = useState(shareToken);
  const [showQr, setShowQr] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // origin 於 client 取得——本機開發、預覽與正式站不必各自設定。
  const origin = typeof window === 'undefined' ? '' : window.location.origin;
  const link = token ? homebrewLinkFor(origin, token) : '';

  const create = () =>
    startTransition(async () => {
      setError(null);
      const r = await createHomebrewShare(kind, id);
      if (r.error) setError(r.error);
      else setToken(r.token);
    });

  const revoke = () =>
    startTransition(async () => {
      if (!token) return;
      const r = await revokeHomebrewShare(token);
      if (r.error) setError(r.error);
      else {
        setToken(null);
        setShowQr(false);
      }
    });

  const copy = async () => {
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (!token) {
    return (
      <div className="py-1">
        <button
          type="button"
          onClick={create}
          disabled={pending}
          className="min-h-9 text-[12px] text-gold disabled:opacity-50"
        >
          {pending ? '產生中…' : '分享這一份'}
        </button>
        {error && (
          <p role="alert" className="text-[12px] text-danger">
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="py-1">
      <p className="break-all text-[12px] text-text-light">
        {link.replace(/^https?:\/\//, '')}
      </p>
      <p className="mt-0.5 text-tiny leading-relaxed text-text-secondary">
        連結看的是你當下的內容——之後改了數值，同一個連結就是新版本。
      </p>
      <div className="mt-1 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={copy}
          className="min-h-9 text-[12px] text-gold"
        >
          {copied ? '已複製' : '複製連結'}
        </button>
        <button
          type="button"
          onClick={() => setShowQr((v) => !v)}
          className="min-h-9 text-[12px] text-gold"
        >
          {showQr ? '收起 QR' : '顯示 QR'}
        </button>
        <button
          type="button"
          onClick={revoke}
          disabled={pending}
          className="min-h-9 text-[12px] text-text-secondary disabled:opacity-50"
        >
          {pending ? '撤銷中…' : '撤銷分享'}
        </button>
      </div>
      {showQr && (
        <div className="mt-2 flex justify-center">
          <ShareQr link={link} size={150} />
        </div>
      )}
      {error && (
        <p role="alert" className="text-[12px] text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
