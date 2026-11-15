import Image from 'next/image';

/** 已有插畫只在空白狀態出現，避免增加正常列表的高度。 */
export function AdventureEmpty({ title, description }: { title: string; description: string }) {
  return <div className="flex items-center justify-center gap-3 rounded-card bg-surface-1/50 px-3 py-4">
    <Image src="/images/guide/wizard-expressive-v1.webp" alt="" width={96} height={96} unoptimized className="size-24 shrink-0 object-contain" />
    <div className="max-w-xs"><p className="text-body font-semibold text-text-primary">{title}</p><p className="mt-1 text-ui leading-6 text-text-secondary">{description}</p></div>
  </div>;
}
