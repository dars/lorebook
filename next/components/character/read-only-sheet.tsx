import type { Character } from '@/lib/domain/character';
import { computeAc } from '@/lib/rules/ac';
import { attackEntries } from '@/lib/rules/attacks';
import { Chip, EmptyHint, Row, Section, StatBox } from './primitives';

/**
 * 唯讀角色卡。
 *
 * **一次渲染全部內容，不用分頁切換。** Flutter 版用 tab 是因為原生 App 的
 * 螢幕小且切換成本低；在 web 上，把全部內容放進同一份 HTML 才能讓 SSR 的
 * 好處成立——檢視者不執行 JS 就看得到全部、Ctrl+F 搜得到、分享預覽抓得到。
 * 導覽改以頁內錨點提供（character-share 規格要求的是「可見」，不是「分頁」）。
 *
 * 全域唯讀：本元件樹不含任何 button、input 或可點擊的消耗操作。規格要求
 * 寫入入口**不予渲染**而非渲染後停用。
 */

const ABILITY_LABELS: [keyof Character['abilityScores'], string, string][] = [
  ['str', '力量', 'STR'],
  ['dex', '敏捷', 'DEX'],
  ['con', '體質', 'CON'],
  ['int_', '智力', 'INT'],
  ['wis', '感知', 'WIS'],
  ['cha', '魅力', 'CHA'],
];

const sign = (n: number) => (n >= 0 ? `+${n}` : `${n}`);

export function ReadOnlySheet({ c }: { c: Character }) {
  const ac = computeAc(c);
  const attacks = attackEntries(c);
  const caster = c.spellSlots.length > 0 || c.cantrips.length > 0;

  return (
    <article className="mx-auto w-full max-w-3xl px-lg pb-4xl">
      <Header c={c} />
      <Nav caster={caster} />

      {/* ── 行動情境：跑團當下最需要的即時數值 ── */}
      <Section id="action" title="當下狀態" titleEn="IN PLAY">
        <div className="grid grid-cols-2 gap-sm medium:grid-cols-4">
          <StatBox label="生命值" value={`${c.currentHp}/${c.maxHp}`} />
          <StatBox label="護甲等級" value={ac.value} sub={ac.label} />
          <StatBox label="被動察覺" value={c.passivePerception} />
          <StatBox label="速度" value={c.speed} />
        </div>

        <div className="mt-md flex flex-wrap gap-sm">
          {c.tempHp > 0 && <Chip tone="temp">臨時 {c.tempHp}</Chip>}
          {c.concentrationSpell && (
            <Chip tone="gold">專注：{c.concentrationSpell}</Chip>
          )}
          {c.exhaustionLevel > 0 && (
            <Chip tone="danger">力竭 {c.exhaustionLevel}</Chip>
          )}
          {c.conditions.map((x) => (
            <Chip key={x} tone="danger">
              {x}
            </Chip>
          ))}
        </div>

        {c.resources.length > 0 && (
          <div className="mt-lg">
            <h3 className="mb-sm text-small text-text-secondary">職業資源</h3>
            <div className="flex flex-wrap gap-sm">
              {c.resources.map((r) => (
                <Chip key={r.name} tone="gold">
                  {r.name} {r.current}/{r.max}
                  {r.dieFaces > 0 && ` · d${r.dieFaces}`}
                  {r.unit && ` ${r.unit}`}
                </Chip>
              ))}
            </div>
          </div>
        )}

        {c.spellSlots.length > 0 && (
          <div className="mt-lg">
            <h3 className="mb-sm text-small text-text-secondary">法術位</h3>
            <div className="flex flex-wrap gap-sm">
              {c.spellSlots.map((s) => (
                <Chip key={s.level} tone="gold">
                  {s.level} 環 {s.total - s.used}/{s.total}
                </Chip>
              ))}
            </div>
          </div>
        )}

        <div className="mt-lg">
          <h3 className="mb-sm text-small text-text-secondary">攻擊</h3>
          <table className="w-full text-body">
            <thead>
              <tr className="text-left text-tiny text-text-secondary">
                <th className="py-xs font-normal">名稱</th>
                <th className="py-xs font-normal">命中</th>
                <th className="py-xs font-normal">傷害</th>
              </tr>
            </thead>
            <tbody>
              {attacks.map((a, i) => (
                <tr key={`${a.name}-${i}`} className="border-t border-border-2">
                  <td className="py-sm">
                    {a.name}
                    {a.quantity > 1 && (
                      <span className="text-text-secondary"> ×{a.quantity}</span>
                    )}
                  </td>
                  <td className="py-sm text-gold">
                    {a.hitBonus === null ? '—' : sign(a.hitBonus)}
                  </td>
                  <td className="py-sm">
                    {a.damage ?? '—'}
                    {a.damageType && (
                      <span className="text-tiny text-text-secondary">
                        {' '}
                        {a.damageType}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {/* ── 角色情境 ── */}
      <Section id="abilities" title="屬性與技能" titleEn="ABILITIES">
        <div className="grid grid-cols-3 gap-sm medium:grid-cols-6">
          {ABILITY_LABELS.map(([key, label, en]) => {
            const a = c.abilityScores[key];
            return (
              <div
                key={en}
                className="rounded-card border border-border-2 bg-surface-1 py-sm text-center"
              >
                <div className="text-tiny text-text-secondary">{label}</div>
                <div className="font-display text-title leading-tight text-gold">
                  {sign(a.modifier)}
                </div>
                <div className="text-tiny text-text-secondary">
                  {a.score}
                  {a.proficientSave && ' ·豁免'}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-lg grid gap-x-lg medium:grid-cols-2">
          {c.skills.map((s) => (
            <div
              key={s.name}
              className="flex justify-between border-b border-border-2 py-xs text-body"
            >
              <span className={s.proficient ? 'text-text-primary' : 'text-text-secondary'}>
                {s.proficient && <span className="text-gold">● </span>}
                {s.name}
              </span>
              <span className="text-gold">{sign(s.modifier)}</span>
            </div>
          ))}
        </div>
      </Section>

      {caster && (
        <Section id="spells" title="法術" titleEn="SPELLS">
          <div className="mb-md flex flex-wrap gap-sm">
            <Chip tone="gold">法術 DC {c.spellDc}</Chip>
            <Chip tone="gold">法術命中 {sign(c.spellAttack)}</Chip>
            {c.spellcastingAbility && (
              <Chip>施法屬性 {c.spellcastingAbility}</Chip>
            )}
          </div>
          <SpellList title="戲法" spells={c.cantrips} />
          <SpellList title="法術" spells={c.spells} />
        </Section>
      )}

      <Section id="items" title="物品與財富" titleEn="INVENTORY">
        <div className="mb-md flex flex-wrap gap-sm">
          {(['pp', 'gp', 'ep', 'sp', 'cp'] as const)
            .filter((k) => c.currency[k] > 0)
            .map((k) => (
              <Chip key={k} tone="gold">
                {c.currency[k]} {k}
              </Chip>
            ))}
        </div>
        {c.equipment.length === 0 ? (
          <EmptyHint text="沒有物品。" />
        ) : (
          <ul>
            {c.equipment.map((e, i) => (
              <li
                key={`${e.name}-${i}`}
                className="flex justify-between border-b border-border-2 py-sm text-body"
              >
                <span>
                  {e.equipped && <span className="text-gold">▸ </span>}
                  {e.name}
                  {e.quantity > 1 && (
                    <span className="text-text-secondary"> ×{e.quantity}</span>
                  )}
                  {e.description && (
                    <span className="block text-small text-text-secondary">
                      {e.description}
                    </span>
                  )}
                </span>
                {e.quest && <Chip>任務</Chip>}
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section id="bio" title="傳記" titleEn="BIOGRAPHY">
        <Row label="種族" value={c.species} />
        <Row label="背景" value={c.background} />
        <Row label="陣營" value={c.alignment} />
        <Row label="信仰" value={c.deity} />
        <Row label="體型" value={c.size} />
        <Row label="語言" value={c.languages.join('、')} />
        <Row label="工具熟練" value={c.toolProficiencies.join('、')} />

        {c.backstory && (
          <p className="mt-md whitespace-pre-wrap text-body text-text-light">
            {c.backstory}
          </p>
        )}
        {c.personalityTags.length > 0 && (
          <div className="mt-md flex flex-wrap gap-sm">
            {c.personalityTags.map((t) => (
              <Chip key={t}>{t}</Chip>
            ))}
          </div>
        )}

        <div className="mt-lg">
          <Row label="特質" value={c.personality.traits} />
          <Row label="理念" value={c.personality.ideals} />
          <Row label="羈絆" value={c.personality.bonds} />
          <Row label="缺陷" value={c.personality.flaws} />
        </div>

        {c.features.length > 0 && (
          <div className="mt-lg">
            <h3 className="mb-sm text-small text-text-secondary">特長與特性</h3>
            {c.features.map((f, i) => (
              <details
                key={`${f.name}-${i}`}
                className="border-b border-border-2 py-sm"
              >
                <summary className="cursor-pointer text-body text-text-primary">
                  {f.name}
                  {f.nameEn && (
                    <span className="text-small text-text-secondary">
                      {' '}
                      {f.nameEn}
                    </span>
                  )}
                  {f.source && (
                    <span className="ml-sm text-tiny text-section-label">
                      {f.source}
                    </span>
                  )}
                </summary>
                {f.description ? (
                  <p className="mt-sm whitespace-pre-wrap text-small text-text-light">
                    {f.description}
                  </p>
                ) : (
                  <p className="mt-sm text-small text-text-secondary">
                    這項特性沒有說明文字。
                  </p>
                )}
              </details>
            ))}
          </div>
        )}
      </Section>
    </article>
  );
}

function Header({ c }: { c: Character }) {
  return (
    <header className="pt-xl">
      <h1 className="font-display text-title text-gold">{c.name}</h1>
      {c.nameEn && (
        <p className="font-display text-small tracking-widest text-section-label">
          {c.nameEn}
        </p>
      )}
      <p className="mt-sm text-body text-text-light">
        {[c.species, c.className, c.subclass].filter(Boolean).join(' · ')}
        {` · ${c.level} 級`}
      </p>
    </header>
  );
}

/**
 * 頁內錨點導覽。用原生錨點而非 JS 分頁——內容全在同一份 HTML 裡，
 * 不執行 JS 也能瀏覽全部，這正是 SSR 的價值所在。
 */
function Nav({ caster }: { caster: boolean }) {
  const items = [
    ['action', '當下狀態'],
    ['abilities', '屬性'],
    ...(caster ? [['spells', '法術']] : []),
    ['items', '物品'],
    ['bio', '傳記'],
  ] as const;
  return (
    <nav className="sticky top-0 z-10 -mx-lg mt-lg flex gap-lg overflow-x-auto border-b border-border-2 bg-surface-0/95 px-lg py-sm backdrop-blur">
      {items.map(([id, label]) => (
        <a
          key={id}
          href={`#${id}`}
          className="whitespace-nowrap text-small text-text-secondary hover:text-gold"
        >
          {label}
        </a>
      ))}
    </nav>
  );
}

function SpellList({
  title,
  spells,
}: {
  title: string;
  spells: Character['spells'];
}) {
  if (spells.length === 0) return null;
  return (
    <div className="mt-md">
      <h3 className="mb-sm text-small text-text-secondary">{title}</h3>
      {spells.map((s, i) => (
        <details key={`${s.name}-${i}`} className="border-b border-border-2 py-sm">
          <summary className="cursor-pointer text-body">
            <span className="text-text-primary">{s.name}</span>
            <span className="ml-sm text-tiny text-section-label">
              {s.level === 0 ? '戲法' : `${s.level} 環`}
            </span>
            {s.concentration && (
              <span className="ml-sm text-tiny text-gold">專注</span>
            )}
            {s.damage && (
              <span className="ml-sm text-small text-text-secondary">
                {s.damage} {s.damageType}
              </span>
            )}
          </summary>
          {s.description && (
            <p className="mt-sm whitespace-pre-wrap text-small text-text-light">
              {s.description}
            </p>
          )}
          {s.upgrade && (
            <p className="mt-sm whitespace-pre-wrap text-small text-text-secondary">
              {s.upgrade}
            </p>
          )}
        </details>
      ))}
    </div>
  );
}
