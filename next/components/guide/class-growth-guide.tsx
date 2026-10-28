'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { AppLink } from '@/components/ui/app-link';
import { ThemeSwitch } from '@/components/shell/theme-switch';
import { GUIDE_CLASSES } from '@/lib/guide/classes';
import { COVERAGE, COVERAGE_CHECKED_ON, COVERAGE_LABELS, type CoverageKey } from '@/lib/guide/coverage';
import { filterGuideLevels, getGuideClass, guideLevels, SRD_URL } from '@/lib/guide/progression';

const focus = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold';

function CoverageNote({ coverageKey }: { coverageKey: CoverageKey }) {
  const item = COVERAGE[coverageKey];
  return (
    <div className="mt-2 border-l-2 border-border pl-3 text-small text-text-light">
      <p>{item.note}</p>
      <details className="mt-1">
        <summary className={`flex min-h-11 cursor-pointer items-center text-text-secondary ${focus}`}>查看核對依據</summary>
        <ul className="list-disc space-y-1 pl-4 font-mono text-tiny">
          {item.evidence.map((path) => <li key={path} className="break-all">{path}</li>)}
        </ul>
      </details>
    </div>
  );
}

export function ClassGrowthGuide() {
  const params = useSearchParams();
  const cls = getGuideClass(params.get('class'));
  const checking = params.get('view') === 'check';
  const choicesOnly = params.get('choices') === '1';
  const withSubclass = params.get('subclass') === 'srd';
  const [query, setQuery] = useState('');
  const rows = filterGuideLevels(guideLevels(cls, withSubclass), query, choicesOnly);

  function changeParam(name: string, value: string | null) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(name, value);
    else next.delete(name);
    window.history.pushState(null, '', `/guide/classes${next.size ? `?${next.toString()}` : ''}`);
  }

  return (
    <main id="main-content" className="mx-auto w-full max-w-[1160px] flex-1 px-4 pb-12 font-reading medium:px-6 expanded:px-10">
      <header className="border-b border-border pb-4 pt-3">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
          <AppLink href="/" className={`inline-flex min-h-11 items-center font-display text-heading text-gold ${focus}`}>Lorebook</AppLink>
          <div className="flex flex-wrap items-center gap-3">
            <AppLink href="/demo" className={`inline-flex min-h-11 items-center px-1 text-small text-text-light hover:text-gold ${focus}`}>試玩角色</AppLink>
            <ThemeSwitch compact />
          </div>
        </div>
        <p className="mt-2 font-label text-small tracking-[.18em] text-gold">CLASS PROGRESSION</p>
        <h1 className="mt-1 font-cjk text-title font-bold text-text-primary">職業成長指南</h1>
        <p className="mt-1 text-body text-text-light">查閱各級能力、選擇條件與替換時機。</p>
        <p className="mt-2 text-small text-text-secondary">D&amp;D 2024 · SRD 5.2.1 · 單一職業 1–20 級 · 閱讀不會更動角色</p>
      </header>

      <div className="mt-4 expanded:grid expanded:grid-cols-[160px_minmax(0,1fr)] expanded:gap-8">
        <nav aria-label="選擇職業" className="hidden expanded:block">
          <div className="sticky top-4">
            <p className="mb-2 font-label text-small tracking-widest text-text-secondary">職業索引</p>
            {GUIDE_CLASSES.map((item) => (
              <button key={item.en} type="button" aria-pressed={cls.en === item.en} onClick={() => changeParam('class', item.en.toLowerCase())} className={`flex min-h-11 w-full flex-wrap items-center gap-x-2 border-l-2 px-3 py-2 text-left ${focus} ${cls.en === item.en ? 'border-gold bg-gold/10 text-gold' : 'border-transparent text-text-light hover:bg-surface-1'}`}>
                <span className="text-body">{item.cn}</span><span className="text-small text-text-secondary">{item.en}</span>
              </button>
            ))}
          </div>
        </nav>

        <div className="min-w-0">
          <label className="mb-3 block text-small text-text-light expanded:hidden">
            選擇職業
            <select value={cls.en} onChange={(event) => changeParam('class', event.target.value.toLowerCase())} className={`mt-1 min-h-11 w-full rounded-card border border-border bg-surface-1 px-3 text-body text-text-primary ${focus}`}>
              {GUIDE_CLASSES.map((item) => <option key={item.en} value={item.en}>{item.cn} · {item.en}</option>)}
            </select>
          </label>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-cjk text-title font-bold text-text-primary">{cls.cn} <span className="font-display text-heading font-normal text-gold">{cls.en}</span></h2>
            <button type="button" aria-pressed={checking} onClick={() => changeParam('view', checking ? null : 'check')} className={`min-h-11 rounded-card border px-3 text-small ${focus} ${checking ? 'border-gold text-gold' : 'border-border text-text-light'}`}>
              {checking ? '✓ 功能核對模式' : '開啟功能核對'}
            </button>
          </div>
          <p className="mt-1 text-small text-text-secondary">各級展開「選擇」可看數量、限制與替代方案。</p>

          <div className="mt-3 border-y border-border py-2">
            <label className="block">
              <span className="sr-only">搜尋目前職業的能力或選擇</span>
              <input type="search" name="guide-search" autoComplete="off" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜尋能力、選擇或等級（如 2）…" className={`min-h-11 w-full rounded-card border border-border bg-surface-1 px-3 text-body text-text-primary placeholder:text-text-secondary ${focus}`} />
            </label>
            <div className="mt-1 flex flex-wrap gap-x-5">
              <label className="flex min-h-11 cursor-pointer items-center gap-2 text-small text-text-light">
                <input type="checkbox" checked={choicesOnly} onChange={(event) => changeParam('choices', event.target.checked ? '1' : null)} className={`size-4 accent-gold ${focus}`} />只看需要選擇的等級
              </label>
              <label className="flex min-h-11 cursor-pointer items-center gap-2 py-2 text-small text-text-light">
                <input type="checkbox" checked={withSubclass} onChange={(event) => changeParam('subclass', event.target.checked ? 'srd' : null)} className={`size-4 shrink-0 accent-gold ${focus}`} /><span>加入 SRD 子職：{cls.subclass.name}</span>
              </label>
            </div>
          </div>

          {checking && (
            <aside className="mt-3 border-l-2 border-gold pl-3 text-small text-text-light">
              <p className="font-semibold text-gold">只核對「能否選擇及保存」，不代表所有效果已自動計算。</p>
              <p className="mt-1">已支援選擇：有對應流程；部分支援：能手動記錄或仍缺限制；尚未支援：沒有專屬選擇。核對日期：{COVERAGE_CHECKED_ON}。</p>
            </aside>
          )}

          <details className="mt-2 border-b border-border pb-1">
            <summary className={`min-h-11 cursor-pointer py-3 text-body font-semibold text-text-primary ${focus}`}>升級與休息時，可替換哪些選項？</summary>
            <ul className="list-disc space-y-2 pb-3 pl-5 text-small leading-relaxed text-text-light">
              {cls.reminders.map((note) => <li key={note}>{note}</li>)}
              <li>每次升級另增加生命值；本頁著重職業選擇，能力值、背景與種族的建角選擇另計。</li>
            </ul>
          </details>

          <p aria-live="polite" className="py-3 text-small text-text-secondary">{rows.length} 個等級{withSubclass ? ` · 含${cls.subclass.name}` : ' · 基本職業（子職選擇依各自內容）'}</p>
          <div key={`${cls.en}-${withSubclass}-${checking}`}>
            {rows.map((row) => (
              <section key={row.level} aria-labelledby={`level-${row.level}`} className="grid grid-cols-[38px_minmax(0,1fr)] gap-3 border-t border-border py-3 medium:grid-cols-[52px_minmax(0,1fr)] medium:gap-4">
                <h3 id={`level-${row.level}`} className="pt-2 text-center font-display text-[25px] leading-none text-gold"><span className="mb-1 block font-label text-[10px] tracking-widest">LEVEL</span>{String(row.level).padStart(2, '0')}</h3>
                <div className="min-w-0">
                  {row.choices.map((choice) => (
                    <details key={choice.id} className="group">
                      <summary className={`flex min-h-11 cursor-pointer list-none flex-wrap items-center gap-x-2 gap-y-1 py-2 text-body font-semibold leading-snug text-text-primary [&::-webkit-details-marker]:hidden ${focus}`}>
                        <span className="min-w-0 flex-1">{choice.title}{choice.conditional && <span className="ml-2 text-small font-normal text-text-secondary">子職</span>}</span>
                        {checking && <span className={`text-small font-normal ${COVERAGE[choice.coverage].status === 'supported' ? 'text-success' : 'text-gold'}`}>{COVERAGE_LABELS[COVERAGE[choice.coverage].status]}</span>}
                      </summary>
                      <div className="pb-3 pl-4 text-body leading-relaxed text-text-light">
                        {choice.conditional && <p className="mb-1 text-small text-gold">僅限{choice.conditional}</p>}
                        <p>{choice.detail}</p>
                        <a href={`${SRD_URL}#page=${choice.page}`} target="_blank" rel="noreferrer" className={`inline-flex min-h-11 items-center text-small text-gold underline ${focus}`}>規則來源 · SRD 第 {choice.page} 頁 ↗</a>
                        {checking && <CoverageNote coverageKey={choice.coverage} />}
                      </div>
                    </details>
                  ))}
                  {row.features.length > 0 && <p className="py-1 text-small leading-relaxed text-text-light"><span className="mr-2 text-text-secondary">獲得能力</span>{row.features.join('；')}</p>}
                  {row.growth.length > 0 && <p className="py-0.5 text-small text-text-secondary">{row.growth.join(' · ')}</p>}
                  {!row.choices.length && <p className="py-1 text-small text-text-secondary">本級無新增選擇</p>}
                </div>
              </section>
            ))}
          </div>
          {!rows.length && (
            <div className="border-y border-border py-8 text-center">
              <p className="text-body text-text-light">這個職業沒有符合目前條件的項目。</p>
              <button type="button" onClick={() => { setQuery(''); changeParam('choices', null); }} className={`mt-2 min-h-11 px-4 text-body text-gold underline ${focus}`}>清除篩選</button>
            </div>
          )}

          <aside className="mt-5 border-t border-border pt-4 text-small leading-relaxed text-text-light">
            <h2 className="text-body font-semibold text-text-primary">別忘了種族與背景的選擇</h2>
            <p className="mt-2">人類在建角時，除了背景給予的起源專長，還能再選 1 個起源專長（Versatile）。這是種族能力，與哪個職業、是否升到 2 級無關。若選法術新手等專長，還須完成它帶來的法術與施法屬性選擇。</p>
            <a href={`${SRD_URL}#page=86`} target="_blank" rel="noreferrer" className={`inline-flex min-h-11 items-center text-gold underline ${focus}`}>人類規則 · SRD 第 86 頁 ↗</a>
            {checking && <><p className="text-gold">{COVERAGE_LABELS[COVERAGE.origin.status]}：人類額外起源專長</p><CoverageNote coverageKey="origin" /></>}
          </aside>

          <footer className="mt-5 border-t border-border pt-4 text-small leading-relaxed text-text-secondary">
            <p>本頁為規則摘要與中文摘譯；子職選項僅涵蓋 SRD 收錄內容。自創子職、複合職業與其他來源須另行確認。基本法術數量不含職責、專長、子職等額外名額。</p>
            <a href={`${SRD_URL}#page=${cls.page}`} target="_blank" rel="noreferrer" className={`inline-flex min-h-11 items-center text-gold underline ${focus}`}>閱讀{cls.cn}原文 · 第 {cls.page}–{cls.endPage} 頁 ↗</a>
            <p className="mt-2">This work includes material from the System Reference Document 5.2.1 (“SRD 5.2.1”) by Wizards of the Coast LLC, available at <a href="https://www.dndbeyond.com/srd" className="text-gold underline">https://www.dndbeyond.com/srd</a>. The SRD 5.2.1 is licensed under the Creative Commons Attribution 4.0 International License, available at <a href="https://creativecommons.org/licenses/by/4.0/legalcode" className="break-all text-gold underline">https://creativecommons.org/licenses/by/4.0/legalcode</a>.</p>
          </footer>
        </div>
      </div>
    </main>
  );
}
