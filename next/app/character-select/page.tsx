import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { ParchmentCard, SectionTitle } from '@/components/ui/decorations';
import { selectCharacter } from '@/lib/characters/current';
import { fetchMyCharacters } from '@/lib/characters/fetch';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: '選擇角色｜Lorebook' };
export const dynamic = 'force-dynamic';

/** 選角頁，對照 Flutter 端的 `/character-select`。選定後寫入 cookie 並進主畫面。 */
export default async function CharacterSelectPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { characters, error } = await fetchMyCharacters();

  return (
    <main className="mx-auto w-full max-w-[700px] flex-1 px-4 pb-10">
      <h1 className="font-display pt-6 text-[28px] font-bold text-gold">
        Lorebook
      </h1>
      <SectionTitle en="CHARACTERS" cn="選擇角色" />

      {error && (
        <p className="py-3 text-[13px] text-danger">無法載入角色（{error}）</p>
      )}
      {!error && characters.length === 0 && (
        <p className="py-3 text-[13px] text-text-secondary">
          還沒有角色。建角流程尚未移植。
        </p>
      )}

      <div className="flex flex-col gap-2">
        {characters.map((c) => (
          <form key={c.id} action={selectCharacter.bind(null, c.id)}>
            <button type="submit" className="w-full text-left">
              <ParchmentCard className="flex items-center gap-3 px-4 py-3">
                {c.portraitUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={c.portraitUrl}
                    alt=""
                    className="size-12 shrink-0 rounded-full border-[1.5px] border-gold object-cover"
                    style={{
                      objectPosition: `${c.portraitCenterX * 100}% ${c.portraitCenterY * 100}%`,
                    }}
                  />
                ) : (
                  <span className="font-display flex size-12 shrink-0 items-center justify-center rounded-full border-[1.5px] border-gold text-[18px] font-bold text-text-primary">
                    {c.name.slice(0, 1)}
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="font-display block truncate text-[16px] font-bold text-text-primary">
                    {c.name}
                  </span>
                  <span className="block truncate text-[12px] text-text-secondary">
                    {[c.species, c.className, c.subclass]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                </span>
                <span className="flex shrink-0 flex-col items-center">
                  <span className="font-label text-[9px] font-semibold tracking-[1px] text-text-secondary">
                    LEVEL
                  </span>
                  <span className="font-display text-[24px] font-bold leading-none text-text-primary">
                    {c.level}
                  </span>
                </span>
              </ParchmentCard>
            </button>
          </form>
        ))}
      </div>
    </main>
  );
}
