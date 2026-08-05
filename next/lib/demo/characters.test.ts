import { describe, expect, it } from 'vitest';

import { computeAc } from '@/lib/rules/ac';
import { DEMO_CHARACTERS, findDemoCharacter } from './characters';

describe('試玩角色', () => {
  it('三張都能解析，且涵蓋施法與非施法', () => {
    expect(DEMO_CHARACTERS).toHaveLength(3);
    expect(DEMO_CHARACTERS.some((c) => c.spellSlots.length > 0)).toBe(true);
    expect(DEMO_CHARACTERS.some((c) => c.spellSlots.length === 0)).toBe(true);
  });

  it('推導值算得出來（型別與規則層對得上）', () => {
    for (const c of DEMO_CHARACTERS) {
      expect(computeAc(c).value).toBeGreaterThan(0);
      expect(c.skills.length).toBeGreaterThan(0);
    }
  });

  it('可依 id 取得', () => {
    expect(findDemoCharacter('demo-rogue-001')?.className).toBe('盜賊');
    expect(findDemoCharacter('不存在')).toBeUndefined();
  });
});
