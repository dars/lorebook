import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ClassGrowthGuide } from '@/components/guide/class-growth-guide';

export const metadata: Metadata = {
  title: '職業成長指南｜Lorebook',
  description: '預覽 D&D 2024 SRD 的 12 職業 1–20 級能力、升級選擇與 Lorebook 功能支援狀態。',
};

export default function ClassGuidePage() {
  return <Suspense fallback={<main id="main-content" className="p-6 text-text-primary">載入職業成長指南…</main>}><ClassGrowthGuide /></Suspense>;
}
