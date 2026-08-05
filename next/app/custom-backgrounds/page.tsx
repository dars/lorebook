import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { BackgroundManager } from '@/components/backgrounds/background-manager';
import { fetchCustomBackgrounds } from '@/lib/backgrounds/actions';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: '自訂背景｜Lorebook' };
export const dynamic = 'force-dynamic';

export default async function CustomBackgroundsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { backgrounds } = await fetchCustomBackgrounds();
  return <BackgroundManager initial={backgrounds} />;
}
