'use client';

import {MonkPowers} from './monk-powers';
import {monkPowers} from '@/lib/rules/monk';
import { useState } from 'react';
import { DruidPowers } from './druid-powers';
import { ClericPowers } from './cleric-powers';
import { clericPowers } from '@/lib/rules/cleric';
import { BardPowers } from './bard-powers';
import { bardPowers } from '@/lib/rules/bard';
import { RageControl } from './rage-control';
import { isBerserker } from '@/lib/rules/barbarian';
import { PaladinPowers } from './paladin-power';
import { paladinPowers } from '@/lib/rules/paladin';
import { fighterActions } from '@/lib/rules/fighter-features';

import { EntryCard, damageClass } from '@/components/character/entry-card';
import { SpellCard } from '@/components/character/spell-card';
import { CollapsibleSection } from '@/components/ui/collapsible-section';
import type { Character } from '@/lib/domain/character';
import { attackEntries, attacksPerAction, type AttackEntry } from '@/lib/rules/attacks';

/**
 * 行動頁的動作經濟區，對照 Flutter 端的 `ActionsSection`。
 *
 * 輸出**動作／附贈動作／反應三個頂層可收合區段**（與狀態、移動同階）。
 * 「動作」內再分 攻擊／施法／其他，施法內再分 戲法／各環。
 *
 * `showAction` / `showBonus` / `showReaction` 是給 expanded 三欄排列用的
 * 部分渲染旗標——同一批內容在三欄時要拆到不同欄，不是三份不同的東西。
 */
type OtherAction = { cn: string; en: string; effect: string; desc: string };

const OTHER_ACTIONS: OtherAction[] = [
  { cn: '疾走', en: 'Dash', effect: '移動加倍', desc: '本回合獲得等同於你速度的額外移動。' },
  { cn: '撤離', en: 'Disengage', effect: '不引發機會攻擊', desc: '本回合你的移動不會引發機會攻擊。' },
  { cn: '閃避', en: 'Dodge', effect: '攻擊你有劣勢', desc: '直到下回合開始，針對你的攻擊檢定具劣勢，且你的敏捷豁免具優勢。' },
  { cn: '協助', en: 'Help', effect: '給予優勢', desc: '協助盟友：其下一次相關檢定，或攻擊你協助對付的目標時具有優勢。' },
  { cn: '躲藏', en: 'Hide', effect: '取得隱蔽', desc: '進行敏捷（隱匿）檢定以隱藏行蹤。' },
  { cn: '預備', en: 'Ready', effect: '設定觸發', desc: '預備一個動作，於指定觸發條件出現時以反應執行。' },
  { cn: '搜索', en: 'Search', effect: '尋找線索', desc: '進行感知或調查檢定以察覺隱藏事物。' },
  { cn: '使用物品', en: 'Use Object', effect: '互動物件', desc: '與一件物品互動或使用其特殊功能。' },
];

function attackCard(a: AttackEntry, i: number) {
  return (
    <EntryCard
      key={`${a.name}-${i}`}
      badge="攻"
      title={a.quantity > 1 ? `${a.name} ×${a.quantity}` : a.name}
      subtitle={a.nameEn}
      meta={a.hitBonus === null ? null : `命中 ${a.hitBonus >= 0 ? '+' : ''}${a.hitBonus}`}
      value={a.damage}
      valueClass={a.damage ? damageClass(a.damageType) : 'text-gold-dim'}
      description={a.properties.length > 0 ? a.properties.join(' · ') : null}
      emphasizeBadge
    />
  );
}


/**
 * 類別（攻擊／施法／其他，可收合）。
 *
 * 宣告在 render 之外：定義在元件內部的話每次 render 都是新的元件型別，
 * 子樹會整個重掛，EntryCard 的展開狀態每次都被重置。
 */
function Category({
  label,
  count,
  open,
  onToggle,
  children,
}: {
  label: string;
  count: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="pl-3.5">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center py-1.5 text-left"
      >
        <span className="text-body leading-none text-gold-dim">{open ? '⌄' : '›'}</span>
        <span className="ml-1 text-small font-semibold text-gold-dim">{label}</span>
        <span className="font-label ml-1.5 truncate text-eyebrow text-text-secondary">
          · {count}
        </span>
      </button>
      {open && <div className="flex flex-col gap-1.5 pb-0.5 pl-2 pt-1.5">{children}</div>}
    </div>
  );
}

/** 施法子層（戲法／各環，可收合，預設收合）。 */
function RingGroup({
  label,
  count,
  open,
  onToggle,
  children,
}: {
  label: string;
  count: number;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center py-1 text-left"
      >
        <span className="text-body leading-none text-text-secondary">{open ? '⌄' : '›'}</span>
        <span className="font-label ml-1 text-eyebrow font-semibold tracking-wider text-text-secondary">
          {label}
        </span>
        <span className="font-label ml-1.5 text-eyebrow text-text-secondary">· {count}</span>
      </button>
      {open && <div className="flex flex-col gap-1.5 pl-1.5 pt-1">{children}</div>}
    </div>
  );
}

export function ActionsSection({
  c,
  showAction = true,
  showBonus = true,
  showReaction = true,
}: {
  c: Character;
  showAction?: boolean;
  showBonus?: boolean;
  showReaction?: boolean;
}) {
  // 預設「其他」收合；施法子層（戲法／各環）預設全收合。
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set(['cat.other']));
  const [expandedRings, setExpandedRings] = useState<Set<string>>(new Set());

  const toggle = (k: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (!next.delete(k)) next.add(k);
      return next;
    });
  const toggleRing = (k: string) =>
    setExpandedRings((prev) => {
      const next = new Set(prev);
      if (!next.delete(k)) next.add(k);
      return next;
    });

  const paladin = paladinPowers(c);
  const bard = bardPowers(c);
  const cleric = clericPowers(c);
  const monk=monkPowers(c);
  const classActions = fighterActions(c);
  const bonusFeatures = classActions.filter(a => a.kind === 'bonus');
  const freeFeatures = classActions.filter(a => a.kind === 'free');
  const featureCard = (a: (typeof classActions)[number]) => <EntryCard key={a.nameEn} badge={a.kind === 'bonus' ? '贈' : '職'} title={a.name} subtitle={a.nameEn} meta={a.meta} value={a.value} description={a.description} />;
  const attacks = attackEntries(c);
  const cantrips = c.cantrips;
  const actionSpells = c.spells.filter(
    (s) => s.level > 0 && s.prepared && s.castKind === 'action',
  );
  const isCaster = cantrips.length > 0 || actionSpells.length > 0;
  const rings = [...new Set(actionSpells.map((s) => s.level))].sort((a, b) => a - b);

  const bonusSpells = c.spells.filter((s) => s.castKind === 'bonus');
  const reactionSpells = c.spells.filter((s) => s.castKind === 'reaction');

  const castCount = [
    ...(cantrips.length > 0 ? [`戲法 ${cantrips.length}`] : []),
    ...rings.map((r) => `${r}環 ${actionSpells.filter((s) => s.level === r).length}`),
  ].join('・');

  return (
    <>
      {showAction && (
        <CollapsibleSection
          en="ACTION"
          cn="動作"
          summary={['攻擊', ...(isCaster ? ['施法'] : []), '其他'].join('・')}
        >
          <Category
            label="攻擊"
            count={`每次攻擊動作 ${attacksPerAction(c)} 次 · ${attacks.length} 種攻擊`}
            open={!collapsed.has('cat.attack')}
            onToggle={() => toggle('cat.attack')}
          >
            {attacks.map(attackCard)}
          </Category>

          {isCaster && (
            <Category
              label="施法"
              count={castCount}
              open={!collapsed.has('cat.cast')}
              onToggle={() => toggle('cat.cast')}
            >
              {cantrips.length > 0 && (
                <RingGroup
                  label="戲法"
                  count={cantrips.length}
                  open={expandedRings.has('ring.cantrip')}
                  onToggle={() => toggleRing('ring.cantrip')}
                >
                  {cantrips.map((s) => (
                    <SpellCard character={c} characterLevel={c.level} key={`${s.name}-${s.level}`} spell={s} badge="戲" />
                  ))}
                </RingGroup>
              )}
              {rings.map((ring) => (
                <RingGroup
                  key={ring}
                  label={`${ring}環`}
                  count={actionSpells.filter((s) => s.level === ring).length}
                  open={expandedRings.has(`ring.${ring}`)}
                  onToggle={() => toggleRing(`ring.${ring}`)}
                >
                  {actionSpells
                    .filter((s) => s.level === ring)
                    .map((s) => (
                      <SpellCard character={c} characterLevel={c.level}
                        key={`${s.name}-${s.level}`}
                        spell={s}
                        badge={`${ring}`}
                        emphasize
                      />
                    ))}
                </RingGroup>
              ))}
            </Category>
          )}

          {paladin.some(p=>p.kind==='action'||p.kind==='free'||p.kind==='passive') && <Category label="職業能力" count={`${paladin.filter(p=>p.kind!=='bonus').length} 項`} open={!collapsed.has('cat.paladin')} onToggle={()=>toggle('cat.paladin')}><PaladinPowers c={c} kind="action"/><PaladinPowers c={c} kind="free"/><PaladinPowers c={c} kind="passive"/></Category>}
          {c.classNameEn==='Monk'&&<Category label="武僧能力" count="專注與效果" open={!collapsed.has('cat.monk')} onToggle={()=>toggle('cat.monk')}><MonkPowers c={c} kind="other"/></Category>}
          {c.classNameEn==='Druid'&&c.level>=2&&<Category label="德魯伊能力" count="動作與資源" open={!collapsed.has('cat.druid')} onToggle={()=>toggle('cat.druid')}><DruidPowers c={c}/></Category>}
          {cleric.length>0&&<Category label="牧師能力" count={`${cleric.length} 項魔法動作`} open={!collapsed.has('cat.cleric')} onToggle={()=>toggle('cat.cleric')}><ClericPowers c={c}/></Category>}
          {bard.some(p=>p.kind==='free'||p.kind==='passive')&&<Category label="能力 · 不耗動作／被動" count={`${bard.filter(p=>p.kind==='free'||p.kind==='passive').length} 項`} open={!collapsed.has('cat.bard')} onToggle={()=>toggle('cat.bard')}><BardPowers c={c} kind="free"/><BardPowers c={c} kind="passive"/></Category>}
          {freeFeatures.length > 0 && <Category label="職業能力 · 不耗動作" count={`${freeFeatures.length} 項`} open={!collapsed.has('cat.class')} onToggle={() => toggle('cat.class')}>{freeFeatures.map(featureCard)}</Category>}
          <Category
            label="其他"
            count={`${OTHER_ACTIONS.length} 項`}
            open={!collapsed.has('cat.other')}
            onToggle={() => toggle('cat.other')}
          >
            {OTHER_ACTIONS.map((o) => (
              <EntryCard
                key={o.en}
                badge="動"
                title={o.cn}
                subtitle={o.en}
                value={o.effect}
                valueClass="text-text-light text-ui"
                description={o.desc}
              />
            ))}
          </Category>
        </CollapsibleSection>
      )}

      {showBonus && (
        <CollapsibleSection
          en="BONUS ACTION"
          cn="附贈動作"
          summary={
            bonusSpells.length + bonusFeatures.length + paladin.filter(p=>p.kind==='bonus').length + bard.filter(p=>p.kind==='bonus').length === 0 && c.classNameEn !== 'Barbarian' && c.classNameEn !== 'Monk' && !(c.classNameEn==='Druid'&&c.level>=2)
              ? '無可用'
              : [...monk.filter(p=>p.kind==='bonus'), ...(c.classNameEn==='Druid'&&c.level>=2?[{name:'荒野變身'}]:[]), ...(c.classNameEn==='Barbarian'?[{name:'狂暴'}]:[]), ...bonusFeatures, ...bonusSpells, ...paladin.filter(p=>p.kind==='bonus'), ...bard.filter(p=>p.kind==='bonus')].map((s) => s.name).join('・')
          }
        >
          <div className="flex flex-col gap-2">
            <MonkPowers c={c} kind="bonus"/>
            <RageControl c={c}/>
            <DruidPowers c={c} bonusOnly/>
            <BardPowers c={c} kind="bonus"/>
            {bonusFeatures.map(featureCard)}
            <PaladinPowers c={c} kind="bonus"/>
            {bonusSpells.length + bonusFeatures.length + paladin.filter(p=>p.kind==='bonus').length + bard.filter(p=>p.kind==='bonus').length === 0 && c.classNameEn !== 'Barbarian' && c.classNameEn !== 'Monk' && !(c.classNameEn==='Druid'&&c.level>=2) ? (
              <EntryCard badge="贈" title="無附贈動作" subtitle="No Bonus Actions" />
            ) : (
              bonusSpells.map((s) => (
                <SpellCard character={c} characterLevel={c.level} key={`${s.name}-${s.level}`} spell={s} badge="贈" emphasize />
              ))
            )}
          </div>
        </CollapsibleSection>
      )}

      {showReaction && (
        <CollapsibleSection
          en="REACTION"
          cn="反應"
          summary={[...reactionSpells.map((s) => s.name), ...bard.filter(p=>p.kind==='reaction').map(p=>p.name), '機會攻擊'].join('・')}
        >
          <div className="flex flex-col gap-2">
            <MonkPowers c={c} kind="reaction"/>
            <BardPowers c={c} kind="reaction"/>
            {isBerserker(c)&&c.classNameEn==='Barbarian'&&c.level>=10&&<EntryCard badge="反" title="報復" subtitle="Retaliation" value="1 次近戰攻擊" description="受到 5 呎內生物的傷害時，可用反應以武器或徒手對其進行一次近戰攻擊。"/>}
            {reactionSpells.map((s) => (
              <SpellCard character={c} characterLevel={c.level} key={`${s.name}-${s.level}`} spell={s} badge="盾" emphasize />
            ))}
            <EntryCard
              badge="攻"
              title="機會攻擊"
              subtitle="Opportunity Attack"
              value="1 次攻擊"
              valueClass="text-text-light text-ui"
              description="當敵人離開你的觸及範圍時，你可用反應對其進行一次近戰攻擊。"
            />
          </div>
        </CollapsibleSection>
      )}
    </>
  );
}
