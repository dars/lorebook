/** 全站共用職業符號；搭配職業名稱使用，未知職業不冒充其他職業。 */
const emblems: Record<string, string> = {
  Barbarian: 'M12 4v17M5 5l7 2 7-2v7l-7-2-7 2Z',
  Bard: 'M14 4v12a3 3 0 1 1-3-3h3M14 4l6-1v5l-6 1',
  Cleric: 'M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM12 2v3m0 14v3M2 12h3m14 0h3M5 5l2 2m10 10 2 2M5 19l2-2M17 7l2-2',
  Druid: 'M5 19C1 8 12 3 20 4c0 9-4 16-15 15Zm0 0L16 8',
  Fighter: 'm6 18 12-14 2 1-1 4L8 20M4 14l7 6M4 21l3-4',
  Monk: 'M7 12V6a1.5 1.5 0 0 1 3 0v5-7a1.5 1.5 0 0 1 3 0v7-6a1.5 1.5 0 0 1 3 0v6-4a1.5 1.5 0 0 1 3 0v8c0 4-3 6-6 6-2 0-4-1-5-3l-4-5a1.5 1.5 0 0 1 2-2l3 3',
  Paladin: 'M12 3 4 6v6c0 4 4 7 8 9 4-2 8-5 8-9V6ZM12 7v10M8 11h8',
  Ranger: 'M7 3c13 3 13 15 0 18L7 3Zm0 9h14m-3-3 3 3-3 3',
  Rogue: 'm12 3 3 10-3 3-3-3ZM7 16h10M12 16v5',
  Sorcerer: 'M13 3c1 5-6 6-3 10 1-3 4-3 5-6 8 8 4 14-3 14-8 0-10-7-6-12 0 5 4 5 4 2',
  Warlock: 'M3 12c5-9 13-9 18 0-5 9-13 9-18 0ZM12 8v8',
  Wizard: 'm12 3-6 14h13ZM3 19c4 3 15 3 18 0M11 12h2m-1-1v2',
};

const aliases: Record<string, string> = {"野蠻人": "Barbarian", "吟遊詩人": "Bard", "牧師": "Cleric", "德魯伊": "Druid", "戰士": "Fighter", "武僧": "Monk", "聖騎士": "Paladin", "遊俠": "Ranger", "盜賊": "Rogue", "術士": "Sorcerer", "邪術師": "Warlock", "法師": "Wizard"};

export function ClassIcon({ name, className = 'size-4' }: { name: string; className?: string }) {
  const key = name.trim();
  const canonical = aliases[key] ?? Object.keys(emblems).find((value) => value.toLowerCase() === key.toLowerCase());
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" className={`inline-block shrink-0 align-middle ${className}`} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d={emblems[canonical ?? ''] ?? 'm12 3 8 9-8 9-8-9Z'} />
    </svg>
  );
}
