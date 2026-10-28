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
        {/*
         * 六面盾牌：地方夠寬才擠成一排，否則兩排各三面。
         *
         * 判斷依據是**這塊地方有多寬**，不是螢幕有多寬——這一排在 expanded
         * 版型裡放在右欄（螢幕的 3/5）。840px 的視窗用視窗斷點會判成「寬」，
         * 但右欄實際只有約 437，六面擠進去每面剩 66px；反過來 600–840 的單欄
         * 卻有 668，六面剛好。所以用 container query。
         *
         * 620 這個門檻＝六面各 95px ＋ 五道 8px 間距。95 是盾牌內容縮到還讀
         * 得出來的下限（見 AbilityShield 的 --u 換算：95px → 中文名 8.7px）。
         * 手機 390 寬時走三欄，每面 114px、中文名 10.4px，正常可讀。
         *
         * 三欄時另外限寬 470（＝三面各 151 ＋ 兩道間距）並置中：容器 610 卻還
         * 沒到換排門檻時，三欄會把盾牌撐到 198px，而字級有 125% 上限，撐出來
         * 的就是一面空盾牌。
         */}
        <div className="@container">
          <div className="mx-auto grid max-w-[470px] grid-cols-3 gap-2 @[620px]:max-w-none @[620px]:grid-cols-6">
            {ORDER.map(([key, cn, en]) => {
              const s = scoreOf(key);
              return (
                <AbilityShield
                  key={en}
                  nameCn={cn}
                  nameEn={en}
                  modifier={s.modifier}
                  score={s.score}
                  highlighted={en === c.spellcastingAbility}
                />
              );
            })}
          </div>
        </div>
      </CollapsibleSection>

      {/* 兩欄。標籤寫「力量豁免」而非「力量」——這一頁上方就有一整排「力量」
          （屬性），下方還有一排（技能分組），只寫屬性名三處長得一樣。
          熟練與否用**整格**表現：金色框線＋粗體＋金色數值，未熟練則是一般
          框線與 60% 的數值。 */}
      <CollapsibleSection en="SAVING THROWS" cn="豁免">
        <div className="grid grid-cols-2 gap-2">
          {ORDER.map(([key, cn, en]) => {
            const s = scoreOf(key);
            const prof = s.proficientSave;
            const total = s.modifier + (prof ? c.proficiencyBonus : 0);
            return (
              <div
                key={en}
                className={`flex items-center gap-2 rounded-md border bg-surface-1 px-3 py-2 ${
                  prof ? 'border-gold' : 'border-border'
                }`}
              >
                <ProfCheck on={prof} />
                <span
                  className={`min-w-0 flex-1 truncate text-ui text-text-primary ${
                    prof ? 'font-semibold' : ''
                  }`}
                >
                  {cn}豁免
                </span>
                <span
                  className={`font-display shrink-0 text-body font-bold ${
                    prof ? 'text-gold' : 'text-text-primary/60'
                  }`}
                >
                  {sign(total)}
                </span>
              </div>
            );
          })}
        </div>
      </CollapsibleSection>

      {/* 每組左側帶**屬性名與修正值**（力量 +1、智力 +3…）。技能加值都是
          「屬性修正 ＋ 熟練」推導出來的，把基底擺在旁邊，玩家一眼就知道
          這一組為什麼是這些數字。原本只有一行 10px 的小標，那個修正值沒了。 */}
      <CollapsibleSection en="SKILLS" cn="技能">
        {/* 組與組之間 20px。
            卡片用 items-stretch **撐到與左側標籤等高**：只有一項技能的組
            （力量）卡片比「力量 +1」那塊矮，用 items-start 的話多出來的
            高度會加在那一組的下緣，看起來就是「只有第一個間距比較大」。
            拉齊高度後，間距完全由這裡的 space-y 決定。 */}
        <div className="space-y-5 pt-2">
        {ORDER.map(([key, cn, en]) => {
          const skills = c.skills.filter((s) => s.abilityType === en);
          if (skills.length === 0) return null;
          const mod = c.abilityScores[key].modifier;
          return (
            <div key={en} className="flex items-stretch gap-3">
              <div className="w-14 shrink-0 pt-2 text-center">
                <div className="text-small text-text-primary/70">{cn}</div>
                <div className="font-display text-[18px] font-bold leading-tight text-text-primary">
                  {sign(mod)}
                </div>
              </div>
              <ParchmentCard className="min-w-0 flex-1 px-3">
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
                        className={`text-ui ${
                          s.proficient ? 'text-text-primary' : 'text-text-secondary'
                        }`}
                      >
                        {s.name}
                      </span>
                      <span className="font-label text-eyebrow text-text-primary/70">
                        {s.nameEn}
                      </span>
                    </span>
                    <span className="text-body font-semibold text-gold">
                      {sign(s.modifier)}
                    </span>
                  </div>
                ))}
              </ParchmentCard>
            </div>
          );
        })}
        </div>
      </CollapsibleSection>
    </div>
  );
}

/**
 * 豁免用的熟練標記：打勾圓圈＝熟練，空心圓＝未熟練（11px，對照 Flutter 的
 * `check_circle` / `circle_outlined`）。技能列項數多，仍用較小的 ProfDot。
 */
function ProfCheck({ on }: { on: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`size-[11px] shrink-0 ${on ? 'fill-gold' : 'fill-text-primary/30'}`}
      role="img"
      aria-label={on ? '已熟練' : '未熟練'}
    >
      {on ? (
        <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm-1.2 14.6L6.4 12.2l1.4-1.4 3 3 6.4-6.4 1.4 1.4z" />
      ) : (
        <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 2a8 8 0 1 1 0 16 8 8 0 0 1 0-16z" />
      )}
    </svg>
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
