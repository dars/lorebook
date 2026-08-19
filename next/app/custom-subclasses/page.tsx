import { redirect } from 'next/navigation';

/** 自創內容已集中到收藏紀錄；舊連結不失效。 */
export default function Page() {
  redirect('/library');
}
