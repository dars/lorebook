import type { Metadata } from 'next';

import { CatalogFilter } from '@/components/catalog/catalog-filter';
import { Chip, EmptyHint, Section } from '@/components/character/primitives';
import { fetchItems } from '@/lib/catalog/fetch';
import { ftFlattenEntries } from '@/lib/catalog/fivetools';
import { formatCp } from '@/lib/rules/currency';

/**
 * 裝備目錄瀏覽（SRD 5.2，約 210 條）。
 *
 * 依類別 → 子分類分組，與規格的「搜尋為主、分組瀏覽為輔」一致。
 *
 * **全部條目都在同一份 HTML 裡**，因此 ⌘F 搜得到規則內文，沒有 JS 也能瀏覽。
 * 上方的名稱過濾是**漸進增強**：它只在既有 DOM 上切換 `hidden`，不重新產生
 * 清單——一旦改成由 JS 產生，上面那兩件事會同時失效。
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
      <main id="main-content" className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">
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
    <main id="main-content" className="mx-auto w-full max-w-3xl flex-1 px-4 pb-10">
      <header className="pt-5">
        <h1 className="font-display text-title text-gold">裝備目錄</h1>
        <p className="mt-2 text-small text-text-secondary">
          SRD 5.2（CC-BY-4.0）· 下方搜尋只比對名稱；要搜規則內文請用瀏覽器的
          尋找功能（⌘F），整份內容都在這一頁上
        </p>
      </header>

      <nav className="sticky top-0 z-10 -mx-4 mt-4 flex gap-4 overflow-x-auto border-b border-border-2 bg-surface-0/95 px-4 py-2 backdrop-blur">
        {categories.map((c) => (
          <a
            key={c}
            href={`#${c}`}
            data-section-link={c}
            className="whitespace-nowrap text-small text-text-secondary hover:text-gold"
          >
            {CATEGORY_LABEL[c] ?? c}
          </a>
        ))}
      </nav>

      <CatalogFilter placeholder="搜尋裝備名稱（中／英文）…" total={rows.length} unit="項">
      {categories.map((cat) => (
        <Section key={cat} id={cat} title={CATEGORY_LABEL[cat] ?? cat}>
          {[...grouped.get(cat)!.entries()].map(([sub, items]) => (
            // 子分類也標成區段：整組被濾掉時連 h3 一起收起來，
            // 否則會留下一排沒有內容的小標題。
            <div key={sub} data-section={sub} className="mt-3">
              <h3 className="mb-2 text-small text-section-label">{sub}</h3>
              {items.map((it) => (
                <details
                  key={it.id}
                  data-search={`${it.name} ${it.eng_name ?? ''}`.toLowerCase()}
                  className="catalog-entry border-b border-border-2 py-2"
                >
                  {/* 展開三角形是 summary 的 ::before（見 globals.css），
                      在 flex 版面裡會變成第一個 flex item——用 justify-between
                      的話它會跟名稱、價格三等分，名稱就被推到中間去了。
                      改由名稱 flex-1 把價格頂到右邊。 */}
                  <summary className="flex cursor-pointer items-baseline gap-3 text-body">
                    <span className="flex-1">
                      <span className="text-text-primary">{it.name}</span>
                      {it.eng_name && (
                        <span className="ml-2 text-small text-text-secondary">
                          {it.eng_name}
                        </span>
                      )}
                    </span>
                    <span className="shrink-0 text-small text-gold">
                      {it.price_cp === null ? '—' : formatCp(it.price_cp)}
                    </span>
                  </summary>

                  <div className="mt-2 flex flex-wrap gap-2">
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
                    <p className="mt-2 whitespace-pre-wrap text-small leading-relaxed text-text-light">
                      {ftFlattenEntries(it.entries)}
                    </p>
                  )}
                </details>
              ))}
            </div>
          ))}
        </Section>
      ))}
      </CatalogFilter>
    </main>
  );
}
