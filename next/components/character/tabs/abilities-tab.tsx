import { CollapsibleSection } from '@/components/ui/collapsible-section';
import { ParchmentCard } from '@/components/ui/decorations';
import type { AbilityScore, Character } from '@/lib/domain/character';
import { AbilityShield } from '../ability-shield';

/**
 * 屬性分頁，對照 Flutter 端的 `AbilitiesTab`：
 * ABILITIES 屬性（六面盾牌一排）→ SAVING THROWS 豁免 → SKILLS 技能（依屬性分組）。
 */

const ORDER: [keyof Character['abilityScores'], string, string][] = [
  ['str', '力量', 'STR'],
  ['dex', '敏捷', 'DEX'],
  ['con', '體質', 'CON'],
  ['int_', '智力', 'INT'],
  ['wis', '感知', 'WIS'],
  ['cha', '魅力', 'CHA'],
];

const sign = (n: number) => (n >= 0 ? `+${n}` : `${n}`);

export function AbilitiesTab({ c }: { c: Character }) {
  const scoreOf = (k: keyof Character['abilityScores']): AbilityScore =>
    c.abilityScores[k];

  return (
    <div className="px-4 pb-10">
      <CollapsibleSection en="ABILITIES" cn="屬性" first>
        <div className="flex gap-2">
          {ORDER.map(([key, cn, en]) => {
            const s = scoreOf(key);
            return (
              <div key={en} className="flex-1">
                <AbilityShield
                  nameCn={cn}
                  nameEn={en}
                  modifier={s.modifier}
                  score={s.score}
                  highlighted={en === c.spellcastingAbility}
                />
              </div>
            );
          })}
        </div>
      </CollapsibleSection>

      <CollapsibleSection en="SAVING THROWS" cn="豁免">
        <div className="grid grid-cols-3 gap-2">
          {ORDER.map(([key, cn, en]) => {
            const s = scoreOf(key);
            const total = s.modifier + (s.proficientSave ? c.proficiencyBonus : 0);
            return (
              <ParchmentCard key={en} className="px-3 py-2">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <ProfDot on={s.proficientSave} />
                    <span className="text-[13px] text-text-primary">{cn}</span>
                  </span>
                  <span className="text-[16px] font-bold text-gold">
                    {sign(total)}
                  </span>
                </div>
              </ParchmentCard>
            );
          })}
        </div>
      </CollapsibleSection>

      <CollapsibleSection en="SKILLS" cn="技能">
        {ORDER.map(([, cn, en]) => {
          const skills = c.skills.filter((s) => s.abilityType === en);
          if (skills.length === 0) return null;
          return (
            <div key={en} className="mt-2">
              <div className="font-label mb-1 text-[9px] tracking-[1.5px] text-section-label">
                {en} · {cn}
              </div>
              <ParchmentCard className="px-3">
                {skills.map((s, i) => (
                  <div
                    key={s.name}
                    className={`flex items-center justify-between py-2 ${
                      i > 0 ? 'border-t border-border/40' : ''
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <ProfDot on={s.proficient} />
                      <span
                        className={`text-[13px] ${
                          s.proficient ? 'text-text-primary' : 'text-text-secondary'
                        }`}
                      >
                        {s.name}
                      </span>
                      <span className="font-label text-[10px] text-text-primary/40">
                        {s.nameEn}
                      </span>
                    </span>
                    <span className="text-[15px] font-semibold text-gold">
                      {sign(s.modifier)}
                    </span>
                  </div>
                ))}
              </ParchmentCard>
            </div>
          );
        })}
      </CollapsibleSection>
    </div>
  );
}

/** 熟練標記：實心金點＝熟練，空心＝未熟練。 */
function ProfDot({ on }: { on: boolean }) {
  return (
    <span
      aria-label={on ? '已熟練' : '未熟練'}
      className={`size-1.5 rounded-full ${on ? 'bg-gold' : 'border border-border'}`}
    />
  );
}
