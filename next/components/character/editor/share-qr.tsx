'use client';

import { useEffect, useState } from 'react';

/**
 * 分享連結的 QR。
 *
 * **本機繪製，不經任何第三方服務**——線上 QR 產生器等於把分享 token 送給對方
 * 的伺服器，而 token 就是這張角色卡的通行證（capability URL）。這條與 Flutter
 * 端用 qr_flutter 的理由相同。
 *
 * 以 dynamic import 載入：qrcode 約 50 KB，只有真的打開 QR 時才需要，
 * 不該進每個角色頁的首屏。
 *
 * 配色照搬 Flutter：羊皮紙底 #E8DFC9、模組 #1A1206。深色底的 QR 有些掃描器
 * 讀不到，淺底是刻意的。
 */
const LIGHT = '#E8DFC9';
const DARK = '#1A1206';

export function ShareQr({ link, size = 180 }: { link: string; size?: number }) {
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const QR = (await import('qrcode')).default;
        const s = await QR.toString(link, {
          type: 'svg',
          margin: 0,
          errorCorrectionLevel: 'M',
          color: { light: LIGHT, dark: DARK },
        });
        if (alive) setSvg(s);
      } catch {
        if (alive) setError(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, [link]);

  return (
    <div
      className="rounded-card border border-gold-dim p-3"
      style={{ background: LIGHT }}
    >
      {error ? (
        <p className="text-[12px]" style={{ color: DARK, width: size }}>
          QR 產生失敗，請改用連結。
        </p>
      ) : svg ? (
        <div
          style={{ width: size, height: size }}
          // qrcode 的輸出是自產的 SVG 字串，內容完全由本機產生，不含外部資料。
          dangerouslySetInnerHTML={{ __html: svg }}
          role="img"
          aria-label="分享連結的 QR code"
        />
      ) : (
        <div style={{ width: size, height: size }} aria-hidden />
      )}
    </div>
  );
}
