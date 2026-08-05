import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { SubclassManager } from '@/components/subclasses/subclass-manager';
import { createClient } from '@/lib/supabase/server';
import { fetchCustomSubclasses } from '@/lib/subclasses/actions';

export const metadata: Metadata = { title: '自訂子職業｜Lorebook' };
export const dynamic = 'force-dynamic';

export default async function CustomSubclassesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { subclasses } = await fetchCustomSubclasses();
  return <SubclassManager initial={subclasses} />;
}
