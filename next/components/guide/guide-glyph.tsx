/** 圓角、小比例的冒險徽記；只補充文字，不承擔互動或資訊。 */
const emblems: Record<string, string> = {
  Barbarian: 'M12 4v17M5 5l7 2 7-2v7l-7-2-7 2Z',
  Bard: 'M14 4v12a3 3 0 1 1-3-3h3M14 4l6-1v5l-6 1',
  Cleric: 'M12 3v18M5 9h14M9 3h6M9 21h6',
  Druid: 'M5 19C1 8 12 3 20 4c0 9-4 16-15 15Zm0 0L16 8',
  Fighter: 'm6 18 12-14 2 1-1 4L8 20M4 14l7 6M4 21l3-4',
  Monk: 'M4 16c4 0 6 2 8 5 2-3 4-5 8-5-1-5-4-8-8-12-4 4-7 7-8 12ZM12 4v17',
  Paladin: 'M12 3 4 6v6c0 4 4 7 8 9 4-2 8-5 8-9V6ZM12 7v10M8 11h8',
  Ranger: 'M7 3c13 3 13 15 0 18L7 3Zm0 9h14m-3-3 3 3-3 3',
  Rogue: 'm12 3 3 10-3 3-3-3ZM7 16h10M12 16v5',
  Sorcerer: 'M13 3c1 5-6 6-3 10 1-3 4-3 5-6 8 8 4 14-3 14-8 0-10-7-6-12 0 5 4 5 4 2',
  Warlock: 'M3 12c5-9 13-9 18 0-5 9-13 9-18 0ZM12 8v8',
  Wizard: 'm12 3-6 14h13ZM3 19c4 3 15 3 18 0M11 12h2m-1-1v2',
};

export function GuideGlyph({ kind, className = 'size-5' }: { kind: string; className?: string }) {
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" className={`shrink-0 ${className}`} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      {kind === 'dice' ? <path d="m12 2 9 5v10l-9 5-9-5V7Zm0 0L7 15h10Zm-9 5 4 8-4 2m18-10-4 8 4 2M7 15l5 7 5-7" /> : kind === 'spark' ? <path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5ZM20 3v3m-1.5-1.5h3" /> : <path d={emblems[kind] ?? emblems.Wizard} />}
    </svg>
  );
}
