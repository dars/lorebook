import type { Metadata } from 'next';

import { Chip, EmptyHint, Section } from '@/components/character/primitives';
import { fetchItems } from '@/lib/catalog/fetch';
import { ftFlattenEntries } from '@/lib/catalog/fivetools';
import { formatCp } from '@/lib/rules/currency';

/**
 * 裝備目錄瀏覽（SRD 5.2，約 210 條）。
 *
 * 依類別 → 子分類分組，與規格的「搜尋為主、分組瀏覽為輔」一致；搜尋交給
 * 瀏覽器原生的 ⌘F——全部條目都在同一份 HTML 裡，這比自製搜尋框更好用，
 * 也不需要任何 client JS。
 *
 * 價格以 cp 整數儲存，顯示時才換算幣別——App 端不解析幣別字串。
 */
export const metadata: Metadata = {
  title: '裝備目錄｜Lorebook',
  description: 'D&D 2024（SRD 5.2）裝備查詢：武器、護甲、工具與冒險裝備的價格、重量與規則文字。',
};

export const dynamic = 'force-dynamic';

const CATEGORY_LABEL: Record<string, string> = {
  weapon: '武器',
  armor: '護甲',
  gear: '冒險裝備',
  tool: '工具',
};

export default async function ItemCatalogPage() {
  const { rows, error } = await fetchItems();

  if (error) {
    return (
      <main className="mx-auto w-full max-w-3xl flex-1 px-lg py-2xl">
        <h1 className="font-display text-title text-gold">裝備目錄</h1>
        <EmptyHint text={`目前無法載入內容庫（${error}）。稍後重新整理再試。`} />
      </main>
    );
  }

  // category → subcategory → items
  const grouped = new Map<string, Map<string, typeof rows>>();
  for (const it of rows) {
    const subs = grouped.get(it.category) ?? new Map();
    const list = subs.get(it.subcategory) ?? [];
    list.push(it);
    subs.set(it.subcategory, list);
    grouped.set(it.category, subs);
  }
  const categories = [...grouped.keys()];

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-lg pb-4xl">
      <header className="pt-xl">
        <h1 className="font-display text-title text-gold">裝備目錄</h1>
        <p className="mt-sm text-small text-text-secondary">
          SRD 5.2（CC-BY-4.0）· 共 {rows.length} 條 · 用瀏覽器的尋找功能（⌘F）
          可直接搜尋全部內容
        </p>
      </header>

      <nav className="sticky top-0 z-10 -mx-lg mt-lg flex gap-lg overflow-x-auto border-b border-border-2 bg-surface-0/95 px-lg py-sm backdrop-blur">
        {categories.map((c) => (
          <a
            key={c}
            href={`#${c}`}
            className="whitespace-nowrap text-small text-text-secondary hover:text-gold"
          >
            {CATEGORY_LABEL[c] ?? c}
          </a>
        ))}
      </nav>

      {categories.map((cat) => (
        <Section key={cat} id={cat} title={CATEGORY_LABEL[cat] ?? cat}>
          {[...grouped.get(cat)!.entries()].map(([sub, items]) => (
            <div key={sub} className="mt-md">
              <h3 className="mb-sm text-small text-section-label">{sub}</h3>
              {items.map((it) => (
                <details key={it.id} className="border-b border-border-2 py-sm">
                  <summary className="flex cursor-pointer items-baseline justify-between gap-md text-body">
                    <span>
                      <span className="text-text-primary">{it.name}</span>
                      {it.eng_name && (
                        <span className="ml-sm text-small text-text-secondary">
                          {it.eng_name}
                        </span>
                      )}
                    </span>
                    <span className="shrink-0 text-small text-gold">
                      {it.price_cp === null ? '—' : formatCp(it.price_cp)}
                    </span>
                  </summary>

                  <div className="mt-sm flex flex-wrap gap-sm">
                    {it.weight !== null && <Chip>{it.weight} 磅</Chip>}
                    {it.damage_dice && (
                      <Chip tone="gold">
                        {it.damage_dice} {it.damage_type ?? ''}
                      </Chip>
                    )}
                    {it.ac_base !== null && <Chip tone="gold">AC {it.ac_base}</Chip>}
                    {it.mastery.map((m) => (
                      <Chip key={m}>精通：{m}</Chip>
                    ))}
                    {it.properties.map((p) => (
                      <Chip key={p}>{p}</Chip>
                    ))}
                  </div>

                  {it.entries.length > 0 && (
                    <p className="mt-sm whitespace-pre-wrap text-small leading-relaxed text-text-light">
                      {ftFlattenEntries(it.entries)}
                    </p>
                  )}
                </details>
              ))}
            </div>
          ))}
        </Section>
      ))}
    </main>
  );
}
