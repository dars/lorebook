import { z } from 'zod';

export const USES_CHOICES = [1, 2, 3, 'proficiency'] as const;

/** 種族與子職共用次數、回復時機，避免兩份設定逐漸分歧。 */
export const LimitedUse = z.object({
  uses: z.union(USES_CHOICES.map((uses) => z.literal(uses))),
  recovery: z.enum(['short', 'long']),
});

export type LimitedUse = z.infer<typeof LimitedUse>;

export const limitedUseLabel = (value: LimitedUse) =>
  `${value.uses === 'proficiency' ? '熟練加值' : value.uses} 次／${value.recovery === 'short' ? '短休' : '長休'}`;
