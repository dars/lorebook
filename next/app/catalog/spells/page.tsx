import type { Metadata } from 'next';

import { ftFlattenEntries, ftFormatCastingTime, ftFormatRange } from '@/lib/catalog/fivetools';
import { fetchSpells } from '@/lib/catalog/fetch';
import { Chip, EmptyHint, Section } from '@/components/character/primitives';

/**
 * 法術目錄瀏覽（SRD 5.2，339 條）。
 *
 * **全部條目一次渲染，不分頁。** 339 條在 SSR 下的 HTML 約數百 KB，一次送
 * 完換到的是「Ctrl+F 搜得到全部」與「不需 JS 即可瀏覽」——對一份查詢用的
 * 參考資料，那比分頁重要得多。分頁反而讓「這個效果在哪個法術」變難查。
 *
 * 這與分享頁不同：內容庫是公開的 SRD 內容，可被索引也應該被索引。
 */
export const metadata: Metadata = {
  title: '法術目錄｜Lorebook',
  description: 'D&D 2024（SRD 5.2）法術查詢：環數、學派、施法時間、射程與完整規則文字。',
};

/*
 * 動態渲染。內容庫極少變動、理論上很適合靜態化，但 ISR 需要 R2 增量快取，
 * 而那是刻意未啟用的（design D10：分享頁必須即時，加了只多一個會壞的地方）。
 *
 * 現階段每次請求都查一次 Supabase。若成為瓶頸，正解是在邊緣加 Cache-Control
 * 而非開 ISR——內容庫是公開資料，邊緣快取沒有外洩風險。
 */
export const dynamic = 'force-dynamic';

const LEVEL_LABEL = (n: number) => (n === 0 ? '戲法' : `${n} 環`);

export default async function SpellCatalogPage() {
  const { rows, error } = await fetchSpells();

  if (error) {
    return (
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">
        <h1 className="font-display text-title text-gold">法術目錄</h1>
        <EmptyHint text={`目前無法載入內容庫（${error}）。稍後重新整理再試。`} />
      </main>
    );
  }

  const byLevel = new Map<number, typeof rows>();
  for (const s of rows) {
    const list = byLevel.get(s.level) ?? [];
    list.push(s);
    byLevel.set(s.level, list);
  }
  const levels = [...byLevel.keys()].sort((a, b) => a - b);

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-10">
      <header className="pt-5">
        <h1 className="font-display text-title text-gold">法術目錄</h1>
        <p className="mt-2 text-small text-text-secondary">
          SRD 5.2（CC-BY-4.0）· 共 {rows.length} 條 · 用瀏覽器的尋找功能（⌘F）
          可直接搜尋全部內容
        </p>
      </header>

      <nav className="sticky top-0 z-10 -mx-4 mt-4 flex gap-3 overflow-x-auto border-b border-border-2 bg-surface-0/95 px-4 py-2 backdrop-blur">
        {levels.map((lv) => (
          <a
            key={lv}
            href={`#lv${lv}`}
            className="whitespace-nowrap text-small text-text-secondary hover:text-gold"
          >
            {LEVEL_LABEL(lv)}
          </a>
        ))}
      </nav>

      {levels.map((lv) => (
        <Section key={lv} id={`lv${lv}`} title={LEVEL_LABEL(lv)}>
          {byLevel.get(lv)!.map((s) => (
            <details key={s.id} className="border-b border-border-2 py-2">
              <summary className="cursor-pointer text-body">
                <span className="text-text-primary">{s.name}</span>
                {s.eng_name && (
                  <span className="ml-2 text-small text-text-secondary">
                    {s.eng_name}
                  </span>
                )}
                {s.school_name && (
                  <span className="ml-2 text-tiny text-section-label">
                    {s.school_name}
                  </span>
                )}
                {s.concentration && (
                  <span className="ml-2 text-tiny text-gold">專注</span>
                )}
                {s.ritual && <span className="ml-2 text-tiny text-gold">儀式</span>}
              </summary>

              <div className="mt-2 flex flex-wrap gap-2">
                <Chip>施法 {ftFormatCastingTime(s.casting_time) || '—'}</Chip>
                <Chip>射程 {ftFormatRange(s.range) || '—'}</Chip>
                <Chip>
                  成分 {[s.comp_v && 'V', s.comp_s && 'S', s.comp_m && 'M'].filter(Boolean).join('/') || '—'}
                </Chip>
                {s.classes.length > 0 && <Chip>{s.classes.join('、')}</Chip>}
              </div>

              <p className="mt-2 whitespace-pre-wrap text-small leading-relaxed text-text-light">
                {ftFlattenEntries(s.entries)}
              </p>
            </details>
          ))}
        </Section>
      ))}
    </main>
  );
}
