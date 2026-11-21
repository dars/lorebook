'use client';

import { Choices } from '@/components/ui/choice-chips';
import { USES_CHOICES, type LimitedUse } from '@/lib/homebrew/limited-use';

export function LimitedUseFields({ value, onChange }: {
  value: LimitedUse;
  onChange: (next: LimitedUse) => void;
}) {
  return (
    <div className="mt-2 flex flex-wrap gap-3">
      <div>
        <span className="text-small text-text-secondary">次數</span>
        <div className="mt-1">
          <Choices
            ariaLabel="次數"
            options={USES_CHOICES.map((uses) => ({
              key: uses,
              label: uses === 'proficiency' ? '熟練加值' : `${uses} 次`,
            }))}
            selected={value.uses}
            onSelect={(uses) => onChange({ ...value, uses })}
          />
        </div>
      </div>
      <div>
        <span className="text-small text-text-secondary">回復時機</span>
        <div className="mt-1">
          <Choices
            ariaLabel="回復時機"
            options={[
              { key: 'short' as const, label: '短休' },
              { key: 'long' as const, label: '長休' },
            ]}
            selected={value.recovery}
            onSelect={(recovery) => onChange({ ...value, recovery })}
          />
        </div>
      </div>
    </div>
  );
}
