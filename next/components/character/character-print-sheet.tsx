import { featureSubtitle } from '@/lib/ui/feature-groups';
import {cantripDamage} from '@/lib/rules/cantrip-damage';
import { movementFeet } from '@/lib/rules/barbarian';
import type { ReactNode } from 'react';

import { hitDiceRemaining, type Character, type Spell } from '@/lib/domain/character';
import { computeAc, featureArmorViolation } from '@/lib/rules/ac';
import { attackEntries } from '@/lib/rules/attacks';
import { proficientBonus } from '@/lib/rules/ability';
import { COIN_SPECS, CoinIcon } from './coins';
import { CharacterSessionTracker } from './character-session-tracker';
import { PrintMarks, WriteLine } from './print-fields';
import styles from './character-print.module.css';

const ABILITIES = [
  ['str', '力量', 'STR'], ['dex', '敏捷', 'DEX'], ['con', '體質', 'CON'],
  ['int_', '智力', 'INT'], ['wis', '感知', 'WIS'], ['cha', '魅力', 'CHA'],
] as const;
const sign = (n: number) => n >= 0 ? `+${n}` : `${n}`;

/** 列印用連續文件：不受目前分頁、收合狀態、螢幕主題或視窗寬度影響。 */
export function CharacterPrintSheet({ c }: { c: Character }) {
  const ac = computeAc(c);
  const spells = [...c.cantrips, ...c.spells].sort((a, b) => a.level - b.level);
  const caster = spells.length > 0 || c.spellSlots.length > 0 || !!c.spellcastingAbility;
  const stats: [string, ReactNode][] = [
    ['護甲等級 AC', <span key="ac">{ac.value} <WriteLine /></span>],
    [`目前 HP · 起始 ${c.currentHp}`, <span key="hp"><WriteLine /> / {c.maxHp}</span>],
    [`臨時 HP · 起始 ${c.tempHp}`, <WriteLine key="temp" />], ['先攻加值', sign(c.initiative)],
    ['速度', `${movementFeet(c)} 呎`], ['熟練加值', sign(c.proficiencyBonus)],
    ['被動察覺', `${c.passivePerception}`], ['生命骰剩餘', `${hitDiceRemaining(c)} / ${c.level}（d${c.hitDieFaces}）`],
  ];

  return (
    <article data-character-print="" className={styles.document} aria-label="角色卡列印版">
      <div className={styles.identity} data-has-portrait={!!c.portraitUrl || undefined}>
      <div>
      <header className={styles.header}>
        <div><p>LOREBOOK · 跑團角色卡</p><h1>{c.name}</h1>{c.nameEn && <p>{c.nameEn}</p>}</div>
        <strong>{c.className} · {c.level} 級{c.subclass && <small>{c.subclass}</small>}</strong>
      </header>
      <dl className={styles.facts}>
        {[
          ['物種', c.species], ['背景', c.background], ['陣營', c.alignment],
          ['生物類型', c.creatureType], ['體型', c.size], ['信仰', c.deity],
        ].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value || '—'}</dd></div>)}
      </dl>
      </div>
      {c.portraitUrl && <figure className={styles.portrait}>
        {/* 使用原圖與既有取景；列印時不加深色遮罩，保留紙上的細節。 */}
        {/* eslint-disable-next-line @next/next/no-img-element -- 使用者的外部角色圖 */}
        <img
          data-print-portrait=""
          src={c.portraitUrl}
          alt={`${c.name}的角色圖`}
          width={360}
          height={450}
          loading="eager"
          style={{ objectPosition: `${c.portraitCenterX * 100}% ${c.portraitCenterY * 100}%`, scale: c.portraitScale }}
        />
      </figure>}
      </div>

      <Section title="戰鬥數值">
        <dl className={styles.stats}>{stats.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
        <p className={styles.meta}>護甲：{ac.label} · HP 上限 {c.maxHp} · 空白欄可手寫更新，數值以匯出時為起始值。</p>
      </Section>

      <Section title="屬性與豁免">
        <table className={styles.abilities}>
          <thead><tr><th>屬性</th>{ABILITIES.map(([, cn, en]) => <th key={en}>{cn}<small>{en}</small></th>)}</tr></thead>
          <tbody>
            <tr><th>屬性值</th>{ABILITIES.map(([key]) => <td key={key}>{c.abilityScores[key].score}</td>)}</tr>
            <tr><th>調整值</th>{ABILITIES.map(([key]) => <td key={key}>{sign(c.abilityScores[key].modifier)}</td>)}</tr>
            <tr><th>豁免</th>{ABILITIES.map(([key]) => {
              const score = c.abilityScores[key];
              return <td key={key}>{score.proficientSave ? '● ' : ''}{sign(proficientBonus(score.modifier, score.proficientSave, c.proficiencyBonus))}</td>;
            })}</tr>
          </tbody>
        </table>
        <p className={styles.meta}>● 表示熟練</p>
      </Section>

      <div className={styles.columns}>
        <Section title="技能">
          <table><colgroup><col style={{ width: '40%' }} /><col style={{ width: '18%' }} /><col style={{ width: '18%' }} /><col style={{ width: '24%' }} /></colgroup><thead><tr><th>技能</th><th>屬性</th><th>加值</th><th className={styles.handwriteCell}>調整後</th></tr></thead><tbody>
            {c.skills.map((skill, i) => <tr key={i}><td>{skill.expertise ? '◆ ' : skill.proficient ? '● ' : ''}{skill.name}</td><td>{skill.abilityType}</td><td>{sign(skill.modifier)}</td><td className={styles.handwriteCell} /></tr>)}
            {c.skills.length === 0 && <tr><td colSpan={4}>尚無技能</td></tr>}
          </tbody></table>
        </Section>
        <div>
          <Section title="武器與攻擊">
            <table><colgroup><col style={{ width: '35%' }} /><col style={{ width: '15%' }} /><col style={{ width: '50%' }} /></colgroup><thead><tr><th>攻擊</th><th>命中</th><th>傷害</th></tr></thead><tbody>
              {attackEntries(c).map((attack, i) => <tr key={i}><td>{attack.name}</td><td>{attack.hitBonus === null ? '—' : sign(attack.hitBonus)}</td><td>{[attack.damage, attack.damageType].filter(Boolean).join(' ') || '—'}</td></tr>)}
            </tbody></table>
          </Section>
          {caster && <Section title="施法數值"><p>{c.spellcastingAbility || '—'} · 法術 DC {c.spellDc} · 命中 {sign(c.spellAttack)}</p></Section>}
          <Section title="戰鬥狀態" keepTogether>
            <div className={styles.quickRow}><span>先攻結果 <WriteLine /></span><span>英雄靈感 <PrintMarks count={1} label="英雄靈感" /></span></div>
            <p>死亡豁免</p>
            <div className={styles.quickRow}><span>成功 <PrintMarks count={3} label="死亡豁免成功" /></span><span>失敗 <PrintMarks count={3} label="死亡豁免失敗" /></span></div>
            <p className={styles.meta}>專注起始：{c.concentrationSpell || '無'} · 力竭起始：{c.exhaustionLevel}</p>
            <p>專注 <WriteLine wide />　力竭 <WriteLine /></p>
            <p className={styles.meta}>狀態起始：{c.conditions.join('、') || '無'}</p>
            <p>狀態／臨時效果 <WriteLine wide /></p>
          </Section>
        </div>
      </div>

      <CharacterSessionTracker c={c} />

      <div className={styles.referencePage}>
      <Section title="語言與工具熟練"><p>語言：{c.languages.join('、') || '—'}</p><p>工具：{c.toolProficiencies.join('、') || '—'}</p></Section>
      <Section title="財富與裝備">
        <p className={styles.meta}>金錢與數量為起始值；空欄供記錄目前餘額、數量或裝備狀態。</p>
        <div className={styles.coins}>{COIN_SPECS.map(({ code, label }) => <div key={code}><small>{label}</small><span><CoinIcon code={code} /> {c.currency[code]}</span><div><WriteLine /></div></div>)}</div>
        <table className={styles.inventory}><colgroup><col style={{ width: '25%' }} /><col style={{ width: '8%' }} /><col style={{ width: '12%' }} /><col style={{ width: '15%' }} /><col style={{ width: '40%' }} /></colgroup><thead><tr><th>物品</th><th>起始<small>數量</small></th><th className={styles.handwriteCell}>目前數量</th><th>裝備狀態</th><th>說明</th></tr></thead><tbody>
          {c.equipment.map((item, i) => <tr key={i}><td>{item.name}{item.nameEn && <small>{item.nameEn}</small>}</td><td>{item.quantity}</td><td className={styles.handwriteCell} /><td>{[item.equipped && '已裝備', item.quest && '任務'].filter(Boolean).join('、') || '—'}<div><WriteLine /></div></td><td>{[item.type, item.damage, item.damageType, ...item.properties, item.description].filter(Boolean).join(' · ') || '—'}</td></tr>)}
          {c.equipment.length === 0 && <tr><td colSpan={5}>沒有物品</td></tr>}
        </tbody></table>
      </Section>

      {c.features.length > 0 && <Section title="特性與專長" newPage>{c.features.map((feature, i) => <PrintEntry key={i} text={feature.description}>
        <h3>{feature.name}{feature.isCustom && '（自創）'}</h3>
        <p className={styles.meta}>{[featureSubtitle(feature), feature.source, featureArmorViolation(c, feature)].filter(Boolean).join(' · ')}</p>
        <p>{feature.description}</p>
      </PrintEntry>)}</Section>}

      {caster && <Section title="施法與法術">
        <p>施法屬性：{c.spellcastingAbility || '—'} · 法術豁免 DC：{c.spellDc} · 法術命中：{sign(c.spellAttack)}</p>
        {c.spellSlots.length > 0 && <p className={styles.slots}>法術位（剩餘／上限）：{c.spellSlots.map((s) => `${s.level} 環 ${Math.max(0, s.total - s.used)} / ${s.total}`).join('　')}</p>}
        {spells.map((spell, i) => <PrintSpell key={i} spell={{...spell,damage:cantripDamage(spell,c.level)}} />)}
      </Section>}

      {(c.backstory || c.personalityTags.length > 0 || Object.values(c.personality).some(Boolean)) && <Section title="背景故事與性格" newPage>
        {c.backstory && <PrintEntry text={c.backstory}><h3>背景故事</h3><p>{c.backstory}</p></PrintEntry>}
        {c.personalityTags.length > 0 && <p>性格標籤：{c.personalityTags.join('、')}</p>}
        {([['特質', c.personality.traits], ['理念', c.personality.ideals], ['羈絆', c.personality.bonds], ['缺陷', c.personality.flaws]] as const).filter(([, v]) => v).map(([label, value]) => <PrintEntry key={label} text={value}><h3>{label}</h3><p>{value}</p></PrintEntry>)}
      </Section>}
      </div>
    </article>
  );
}

function Section({ title, children, newPage = false, keepTogether = false }: { title: string; children: ReactNode; newPage?: boolean; keepTogether?: boolean }) {
  return <section className={`${styles.section} ${newPage ? styles.sectionPage : ''} ${keepTogether ? styles.keepTogether : ''}`}><h2>{title}</h2>{children}</section>;
}

function PrintEntry({ text, children }: { text: string; children: ReactNode }) {
  // 短條目一起換頁；可能超過紙高的自由文字則提早允許續頁，避免整頁留白。
  const continuable = text.length > 500 || text.split('\n').length > 15;
  return <div className={styles.entry} data-continuable={continuable || undefined}>{children}</div>;
}

function PrintSpell({ spell }: { spell: Spell }) {
  return <PrintEntry text={[spell.description, spell.upgrade].join('\n')}>
    <h3>{spell.level === 0 ? '戲法' : `${spell.level} 環`} · {spell.name}{spell.level > 0 && !spell.prepared && '（未準備）'}</h3>
    {spell.level > 0 && <p className={styles.meta}>準備狀態 <PrintMarks count={1} label={`${spell.name}準備狀態`} />　起始：{spell.prepared ? '已準備' : '未準備'}</p>}
    <p className={styles.meta}>{[spell.nameEn, spell.castingTime, spell.range, spell.concentration && '專注', spell.damage, spell.damageType].filter(Boolean).join(' · ')}</p>
    {spell.description && <p>{spell.description}</p>}
    {spell.upgrade && <p>升環／升級：{spell.upgrade}</p>}
  </PrintEntry>;
}
