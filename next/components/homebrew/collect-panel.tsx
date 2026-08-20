'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';

import { collectHomebrew } from '@/lib/homebrew/collect-actions';
import { HOMEBREW_KIND, type HomebrewKind } from '@/lib/homebrew/types';

/**
 * 檢視頁的行動區：把這份內容收進自己的收藏紀錄。
 *
 * **「收進我的收藏紀錄」永遠可用**（只要求登入），不依賴任何角色狀態——
 * 規則過濾放在使用時，不放在收藏時（openspec homebrew-share D5）。一個
 * 法師子職躺在戰士玩家的收藏紀錄裡不是錯誤，升級時它就是不會出現。
 */
export function CollectPanel({
  token,
  kind,
  signedIn,
  alreadyCollected,
}: {
  token: string;
  kind: HomebrewKind;
  signedIn: boolean;
  /** 這個 token 已經收過幾份。0 以外都只是提示，不阻擋。 */
  alreadyCollected: number;
}) {
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  if (!signedIn) {
    return (
      <div className="rounded-card border border-border bg-surface-1 p-4 text-center">
        <p className="text-small text-text-light">
          收藏需要登入。登入後會回到這一頁，內容不會不見。
        </p>
        <Link
          href={`/login?next=${encodeURIComponent(`/h/${token}`)}`}
          className="mt-3 flex min-h-11 items-center justify-center rounded-card border border-gold bg-gold/10 text-[14px] font-bold text-gold"
        >
          登入後收藏
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="rounded-card border border-gold/60 bg-gold/5 p-4 text-center">
        <p className="text-small text-text-primary">
          已收進你的收藏紀錄。這是一份複製——作者之後怎麼改都不會影響它。
        </p>
        <Link
          href="/library"
          className="mt-3 flex min-h-11 items-center justify-center rounded-card border border-gold bg-gold/10 text-[14px] font-bold text-gold"
        >
          前往收藏紀錄
        </Link>
      </div>
    );
  }

  const submit = () =>
    startTransition(async () => {
      setError(null);
      const r = await collectHomebrew(token, note);
      if (r.error) setError(r.error);
      else setDone(true);
    });

  return (
    <div className="rounded-card border border-border bg-surface-1 p-4">
      {alreadyCollected > 0 && (
        // 不擋——DM 的用法是「核准時自己收一份」，作者改過再收一份，
        // 兩份並存正是他要的。
        <p className="mb-3 text-tiny leading-relaxed text-text-secondary">
          你已經收藏過這個連結
          {alreadyCollected > 1 ? `（${alreadyCollected} 份）` : ''}
          。再收一次會多一份互不影響的複製。
        </p>
      )}

      <label
        htmlFor="collect-note"
        className="font-label text-[10px] tracking-[1.5px] text-section-label"
      >
        NOTE · 備註（選填）
      </label>
      <input
        id="collect-note"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        maxLength={40}
        autoComplete="off"
        spellCheck={false}
        placeholder="例：阿凱的、DM 核准版"
        className="mt-1 h-11 w-full rounded-card border border-border bg-surface-2 px-3 text-small text-text-primary"
      />
      <p className="mt-1 text-tiny text-text-secondary">
        收藏後這行就是它的來源標記——之後在收藏紀錄裡靠它認出這份是誰的。
        隨時可以改。
      </p>

      {error && (
        <p role="alert" className="mt-3 text-[13px] text-danger">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={submit}
        disabled={pending}
        className="mt-4 flex min-h-12 w-full cursor-pointer items-center justify-center rounded-card border border-gold bg-gold/10 text-[14px] font-bold text-gold disabled:opacity-50"
      >
        {pending ? '收藏中…' : `收進我的收藏紀錄（${HOMEBREW_KIND[kind].label}）`}
      </button>
    </div>
  );
}
