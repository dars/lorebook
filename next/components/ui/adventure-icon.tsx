/** 小型情境圖示：圓頭線條與少量雙色填色，裝飾不取代文字標籤。 */
export function AdventureIcon({ name, className = 'size-5 text-gold' }: {
  name: 'chest' | 'quill' | 'campfire'; className?: string;
}) {
  return <svg viewBox="0 0 32 32" aria-hidden="true" focusable="false" className={`shrink-0 ${className}`} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    {name === 'chest' ? <>
      <path d="M5 15V12a7 7 0 0 1 7-7h8a7 7 0 0 1 7 7v3Z" fill="currentColor" fillOpacity=".12" />
      <path d="M5 15h22v10a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2ZM10 6v9m12-9v9M10 18v6m12-6v6" />
      <rect x="13" y="13" width="6" height="7" rx="2" fill="var(--color-surface-1)" /><path d="M16 16v1M25 2v3m-1.5-1.5h3" />
    </> : name === 'quill' ? <>
      <path d="M8 22C7 12 16 4 28 4c0 12-8 20-17 18" fill="currentColor" fillOpacity=".12" />
      <path d="M5 28 23 10M12 21v-6m5 1h6M5 28h12" />
    </> : <>
      <path d="M17 3c2 7-5 8-3 13 2-1 3-3 3-5 7 5 8 10 4 13-3 3-10 2-12-2-3-6 0-10 3-13-1 4 1 5 2 5" fill="currentColor" fillOpacity=".16" />
      <path d="m7 26 18 4M7 30l18-4M6 8v2m19 3v2" />
    </>}
  </svg>;
}
