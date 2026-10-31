'use client';
import {SorcererPowers} from './sorcerer-powers';
import { movementFeet } from '@/lib/rules/barbarian';
import {WizardMemory} from './wizard-memory';
import {WizardRest} from './wizard-rest';
import { displayedCharacter } from '@/lib/state/displayed-character';

import { useEffect, useId, useState } from 'react';

import { CharacterFlowLink } from '@/components/progression/character-flow-link';
import { ActionsSection } from '@/components/decision/actions-section';
import { ConditionsPanel } from '@/components/decision/conditions-panel';
import { HpUndoBar, useHpUndo } from '@/components/decision/hp-undo';
import { CharacterTabBar } from '@/components/character/tab-bar';
import { SwipeTabs } from '@/components/character/swipe-tabs';
import { EditorSheet, FieldLabel } from '@/components/ui/editor-sheet';
import { CollapsibleSection } from '@/components/ui/collapsible-section';
import { ParchmentCard } from '@/components/ui/decorations';
import type { Character } from '@/lib/domain/character';
import { computeAc, knowsMageArmor, wearingArmor } from '@/lib/rules/ac';
import { pipDelta, pipFilled, singlePipDelta } from '@/lib/rules/pips';
import {
  characterActions,
  useCharacterStore,
} from '@/lib/state/character-store';
import { useCharacterSync } from '@/lib/state/sync';

/**
 * 行動頁，對照 Flutter 端的 `DecisionPage`。
 *
 * 區段順序照搬：STATUS 狀態 → RESOURCES 資源 → MOVEMENT 移動 → ACTION 動作。
 * 這個順序不是隨意的——跑團輪到你時的思考順序就是「我現在怎麼樣 → 我還有什麼
 * → 我能走多遠 → 我要做什麼」。
 */

const sign = (n: number) => (n >= 0 ? `+${n}` : `${n}`);

export function DecisionView({
  initial,
  persist = true,
}: {
  initial: Character;
  /** false＝試玩模式：狀態只留在本機，不顯示雲端同步狀態。 */
  persist?: boolean;
}) {
  const load = useCharacterStore((s) => s.load);
  const stored = useCharacterStore((s) => s.character);
  const dirty = useCharacterStore((s) => s.dirty);
  const syncError = useCharacterStore((s) => s.syncError);

  useEffect(() => {
    load(initial);
  }, [initial, load]);
  useCharacterSync(persist);

  const [pickConcentration, setPickConcentration] = useState(false);
  const [editTempHp, setEditTempHp] = useState(false);
  const hpUndo = useHpUndo();

  const c = displayedCharacter(initial, stored);
  // 快照在調整**之前**取，所以要用當下這一輪 render 的值。
  const adjustHp = (d: number) =>
    hpUndo.adjust(d, { currentHp: c.currentHp, tempHp: c.tempHp });
  // 需要專注的法術才是候選——列出全部只會讓玩家在一堆不相干的法術裡找。
  const concentrationCandidates = c.spells.filter((s) => s.concentration);
  const ac = computeAc(c);

  // 各區段先組成節點，再由兩套版型分別排列——內容是同一批，只是重新分配。
  const status = (
      <CollapsibleSection
        en="STATUS"
        cn="狀態"
        first
        trailing={persist ? <SyncBadge dirty={dirty} error={syncError} /> : undefined}
      >
        <ParchmentCard className="p-3">
          <div className="flex flex-wrap items-center">
            <HpColumn
              c={c}
              onAdjust={adjustHp}
              onEditTempHp={() => setEditTempHp(true)}
            />

            <span className="mx-2 h-[100px] w-px bg-border/40" />

            {/* AC 盾牌 ＋ 推導依據。少了依據，AC 只是一個無從檢查的數字——
                玩家最常問的正是「這 11 是怎麼來的」。 */}
            <div className="flex shrink-0 flex-col items-center">
            <div className="relative w-16 shrink-0">
              <svg viewBox="0 0 100 122" preserveAspectRatio="none" className="w-full" aria-hidden>
                <path
                  d="M50 0 L100 7.3 L100 67.1 Q100 100 50 122 Q0 100 0 67.1 L0 7.3 Z"
                  className="fill-surface-2 stroke-border"
                  strokeWidth={1.5}
                  vectorEffect="non-scaling-stroke"
                />
              </svg>
              <span className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-display text-[24px] font-bold leading-none text-gold">
                  {ac.value}
                </span>
                <span className="font-label text-eyebrow tracking-wider text-text-secondary">
                  AC
                </span>
              </span>
            </div>
              <span className="mt-1 max-w-[86px] truncate text-eyebrow text-text-secondary">
                {ac.label}
              </span>
            </div>

            <span className="mx-2 hidden h-[100px] w-px bg-border/40 medium:block" />

            {/* 專注 */}
            <div className="mt-3 flex w-full flex-col items-center border-t border-border/40 pt-3 medium:mt-0 medium:w-auto medium:flex-1 medium:border-t-0 medium:pt-0">
              <span className="font-label text-eyebrow tracking-[1.5px] text-section-label">
                CONCENTRATION
              </span>
              {c.concentrationSpell ? (
                <>
                  <span className="mt-1 text-center text-body text-gold">
                    {c.concentrationSpell}
                  </span>
                  <button
                    type="button"
                    onClick={() => characterActions.setConcentration(null)}
                    className="mt-1.5 min-h-9 rounded-chip border border-border px-3 text-small text-text-secondary"
                  >
                    結束專注
                  </button>
                </>
              ) : (
                <>
                  <span className="mt-1 text-ui text-text-secondary">未專注</span>
                  <button
                    type="button"
                    onClick={() => setPickConcentration(true)}
                    disabled={concentrationCandidates.length === 0}
                    className="mt-1.5 min-h-9 rounded-chip border border-border px-3 text-small text-text-primary disabled:opacity-40"
                  >
                    選擇專注法術
                  </button>
                </>
              )}
            </div>
          </div>

          {/* 法師護甲：AC 的輸入之一，且 2024 規則下著甲會自動結束
              （store 的 toggleEquipped 已處理）。盾牌走物品欄的裝備切換。

              **只有會這個法術的角色才看得到**。原本是無條件平舖，戰士也看得到
              一顆能把自己 AC 改成 13+敏捷的鈕。著甲時則保留但停用——直接藏起來
              會讓剛脫甲的人找不到它跑哪去了。 */}
          {knowsMageArmor(c) && (
            <>
              <div className="my-2 h-px bg-border/40" />
              <div className="flex items-center gap-2 py-1">
                <button
                  type="button"
                  onClick={() => characterActions.setMageArmor(!c.mageArmorActive)}
                  aria-pressed={c.mageArmorActive}
                  disabled={wearingArmor(c)}
                  className={`min-h-9 rounded-chip border px-2.5 text-small disabled:opacity-40 ${
                    c.mageArmorActive
                      ? 'border-gold bg-gold/10 text-gold'
                      : 'border-border-2 text-text-secondary'
                  }`}
                >
                  法師護甲 Mage Armor
                </button>
                <span className="text-small leading-tight text-text-secondary">
                  {wearingArmor(c) ? (
                    <>著甲中無法施放</>
                  ) : (
                    <>基礎 AC 13 + 敏捷（著甲時自動結束）</>
                  )}
                  <span className="block">盾牌請至角色頁物品欄切換裝備</span>
                </span>
              </div>
            </>
          )}

          <div className="my-2 h-px bg-border/40" />

          <ConditionsPanel c={c} />
        </ParchmentCard>
      </CollapsibleSection>
  );

  const resources = (c.spellSlots.length > 0 || c.resources.length > 0) && (
        <CollapsibleSection en="RESOURCES" cn="資源">
          <ParchmentCard className="px-4 py-2">
            {c.spellSlots.length > 0 && (
              <span className="mt-1 block text-small text-gold">
                法術位{' '}
                <span className="font-label text-eyebrow text-text-secondary">
                  Spell Slots
                </span>
              </span>
            )}
            {c.spellSlots.map((s) => (
              <div key={`slot-${s.level}`} className="flex items-center gap-3 py-2">
                <span className="w-14 shrink-0 text-small text-text-secondary">
                  {s.level} 環
                </span>
                <Pips
                  total={s.total}
                  used={s.used}
                  label={`${s.level} 環法術位`} singleStep
                  onChange={(d) => characterActions.adjustSpellSlot(s.level, d)}
                />
                <span className="ml-auto text-ui tabular-nums text-gold">
                  {s.total - s.used}/{s.total}
                </span>
              </div>
            ))}
            {c.resources.map((r) => (
              <div key={r.name} className="flex items-center gap-3 py-2">
                <span className="w-14 shrink-0 truncate text-small text-text-secondary">
                  {r.name}
                </span>
                {r.display === 'number' ? (
                  <span className="flex items-center gap-2">
                    <StepBtn label={`${r.name} 減 1`} onClick={() => characterActions.adjustResource(r.name, -1)}>−1</StepBtn>
                    <span className="text-ui tabular-nums text-gold">
                      {r.current}/{r.max} {r.unit}
                    </span>
                    <StepBtn label={`${r.name} 加 1`} onClick={() => characterActions.adjustResource(r.name, 1)}>+1</StepBtn>
                  </span>
                ) : (
                  <>
                    <Pips
                      total={r.max}
                      used={r.max - r.current}
                      label={r.name}
                      onChange={(d) => characterActions.adjustResource(r.name, d)}
                    />
                    <span className="ml-auto text-ui tabular-nums text-gold">
                      {r.current}/{r.max}
                      {r.dieFaces > 0 && ` · d${r.dieFaces}`}
                    </span>
                  </>
                )}
              </div>
            ))}
            <WizardMemory c={c} persist={persist}/>
          </ParchmentCard>
        </CollapsibleSection>
  );

  // 對照 Flutter 的 movement_section：**速度與衝刺**，各帶格數。
  // 先前移植成「速度／困難地形／先攻」三個裸數字——先攻屬於戰鬥先後、
  // 不是移動，而格數（跑團在方格圖上跑最常用的換算）整個掉了。
  const speedFt = movementFeet(c);
  const movement = (
      <CollapsibleSection en="MOVEMENT" cn="移動">
        <ParchmentCard className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-3">
          {c.dragonWingsActive&&<span className="text-small text-gold">龍翼 · 飛行60呎</span>}
          <MovementStat icon="walk" label="速度" feet={speedFt} />
          <MovementStat icon="dash" label="衝刺" feet={speedFt * 2} dim />
          {c.classNameEn==='Ranger'&&c.level>=6&&<span className="text-small text-gold">攀爬 {speedFt} 呎 · 游泳 {speedFt} 呎</span>}
        </ParchmentCard>
      </CollapsibleSection>
  );

  const checks = (
      <CollapsibleSection en="CHECKS" cn="檢定">
        <ChecksPanel c={c} />
      </CollapsibleSection>
  );

  // 動作經濟（動作／附贈／反應）。三欄排列時以旗標拆到不同欄。
  const actionFull = <ActionsSection c={c} />;
  const actionOnly = <ActionsSection c={c} showBonus={false} showReaction={false} />;
  const bonusReaction = <ActionsSection c={c} showAction={false} />;


  const rest = (
      <CollapsibleSection en="REST" cn="休息">
        <ParchmentCard className="px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <span className="text-ui text-text-secondary">
              生命骰 {c.level - c.hitDiceUsed}/{c.level}（d{c.hitDieFaces}）
            </span>
            <button
              type="button"
              onClick={() => characterActions.useHitDie()}
              disabled={c.level - c.hitDiceUsed <= 0}
              className="min-h-9 rounded-chip border border-border px-3 text-small text-text-primary disabled:opacity-40"
            >
              花用一顆
            </button>
          </div>
          {/* App 不替玩家擲骰——說明白，免得以為壞了。 */}
          <p className="mt-1 text-small text-text-secondary">
            花用後請自行擲 d{c.hitDieFaces}＋體質，再用上方 HP 加減調整。
          </p>

          <div className="mt-3 flex gap-2">
            <RestButton
              title="短休"
              subtitle="職業能力"
              onConfirm={() => characterActions.shortRest()}
              confirm={c.classNameEn==='Sorcerer'?'短休不自動恢復術法點。5級起可在休息區使用術法回復，每長休一次。':c.classNameEn==='Ranger'?'遊俠的宿敵、不知疲倦及自然面紗次數須長休恢復。10級起，短休降低1級力竭。':c.classNameEn==='Druid'?'短休恢復 1 次荒野變身；大地結社可在休息區另選自然復甦的法術位。':c.classNameEn==='Barbarian'?'短休恢復 1 次狂暴，並結束目前的狂暴。':c.classNameEn==='Cleric'?'短休恢復 1 次引導神力，以及其他短休資源。':'短休將回復標記為短休的職業資源。'}
              doneHint={c.classNameEn==='Sorcerer'?'短休完成；可於下方使用術法回復。':c.classNameEn==='Ranger'?(c.level>=10?'短休完成，力竭已減1級；遊俠能力次數須長休恢復。':'短休完成；宿敵次數須長休恢復。'):'短休資源已回復'}
            />
            <RestButton
              title="長休"
              subtitle="完全恢復"
              onConfirm={() => characterActions.longRest()}
              confirm={`長休將回滿 HP、法術位、一般職業資源，清除臨時 HP，降低 1 級力竭，並回復全部生命骰。${(c.divineInterventionRests??0)>0?`神聖介入等待減少 1 次長休，完成後剩餘 ${Math.max(0,(c.divineInterventionRests??0)-1)} 次。`:''}`}
              doneHint={(c.divineInterventionRests??0)>0?`長休完成；神聖介入還需 ${c.divineInterventionRests} 次長休。`:'HP、法術位與資源已回滿，專注已結束'}
            />
          </div>
          {c.classNameEn==='Ranger'&&<p className="py-2 text-small text-text-secondary">{c.level>=10?`不知疲倦：短休力竭減1級，目前${c.exhaustionLevel}級。`:''}宿敵、不知疲倦與自然面紗的使用次數在長休回滿，短休不恢復。</p>}
          <SorcererPowers c={c} kind="rest"/><WizardRest c={c}/>
          {persist && c.progression?.rest && <CharacterFlowLink href="/character-choices?mode=rest" className="mt-2 flex min-h-11 items-center justify-center text-small text-gold">調整休息後可替換的選項</CharacterFlowLink>}
        </ParchmentCard>
      </CollapsibleSection>
  );

  return (
    <>
      {/* compact（<600）單欄；medium（600–840）沿用單欄但置中限寬 600。 */}
      <div className="mx-auto w-full max-w-[600px] px-4 min-[840px]:hidden">
        {status}
        {resources}
        {movement}
        {actionFull}
        {checks}
        {rest}
      </div>

      {/* expanded（≥840）三欄，對照 Flutter 的 _ThreeColumnLayout：
          欄 1 狀態/資源/移動/休息、欄 2 動作、欄 3 檢定。各欄獨立捲動。
          動作經濟在單欄時三段連續，三欄時「動作」獨占欄 2、
          「附贈／反應」與檢定共用欄 3——與 Flutter 的旗標拆法相同。 */}
      <div className="hidden gap-4 px-4 min-[840px]:flex min-[840px]:items-start">
        <div className="min-w-0 flex-1">
          {status}
          {resources}
          {movement}
          {rest}
        </div>
        <div className="min-w-0 flex-1">{actionOnly}</div>
        <div className="min-w-0 flex-1">
          {bonusReaction}
          {checks}
        </div>
      </div>

      {hpUndo.pending && (
        <HpUndoBar delta={hpUndo.pending.delta} onUndo={hpUndo.undo} />
      )}

      <EditorSheet
        open={pickConcentration}
        title="選擇專注法術"
        onClose={() => setPickConcentration(false)}
        onSave={() => setPickConcentration(false)}
      >
        {concentrationCandidates.length === 0 ? (
          <p className="text-ui text-text-secondary">沒有需要專注的法術。</p>
        ) : (
          <div className="flex flex-col">
            {concentrationCandidates.map((s) => (
              <button
                key={s.name}
                type="button"
                onClick={() => {
                  characterActions.setConcentration(s.name);
                  setPickConcentration(false);
                }}
                className="flex items-baseline gap-2 border-b border-border/40 py-2.5 text-left"
              >
                <span className="text-body text-text-primary">{s.name}</span>
                <span className="font-label text-tiny text-text-primary/70">
                  {s.nameEn}
                </span>
                <span className="ml-auto text-small text-text-secondary">
                  {s.level === 0 ? '戲法' : `${s.level} 環`}
                </span>
              </button>
            ))}
          </div>
        )}
      </EditorSheet>

      <TempHpSheet
        open={editTempHp}
        current={c.tempHp}
        onClose={() => setEditTempHp(false)}
      />
    </>
  );
}

/**
 * 設定臨時 HP。
 *
 * 2024 規則：臨時 HP **不疊加**，新的一份要嘛取代舊的、要嘛不取——所以這裡
 * 是「填入一個值」而不是「加減」。輸入 0 即清空。
 */
function TempHpSheet({
  open,
  current,
  onClose,
}: {
  open: boolean;
  current: number;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState('');
  const uid = useId();

  // open 為 false 時 EditorSheet 整個卸載，草稿隨之重置；這裡只在開啟的那
  // 一瞬間把現值帶進來當預設。
  const value = Math.max(0, Number.parseInt(draft, 10) || 0);

  return (
    <EditorSheet
      open={open}
      title="設定臨時 HP"
      onClose={onClose}
      onSave={() => {
        characterActions.setTempHp(value);
        onClose();
      }}
    >
      <FieldLabel htmlFor={`${uid}-temp`}>臨時 HP</FieldLabel>
      <input
        id={`${uid}-temp`}
        inputMode="numeric"
        autoComplete="off"
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder={`${current}`}
        className="min-h-11 w-full rounded-chip border border-border bg-surface-0 px-3 text-body text-text-primary"
      />
      <p className="mt-2 text-small leading-relaxed text-text-secondary">
        臨時 HP 不疊加：填入的值會<b className="text-text-light">取代</b>現有的{' '}
        {current} 點（填 0 清空）。扣血時先扣臨時 HP。
      </p>
    </EditorSheet>
  );
}

/**
 * 檢定：能力／豁免／技能三個切換，列出各項的加值。
 *
 * 純查閱用——App 不擲骰（與 Flutter 一致），玩家看加值後自己擲實體骰。
 */
function ChecksPanel({ c }: { c: Character }) {
  const [tab, setTab] = useState(0);
  // 選取以「分頁＋名稱」為鍵：三個分頁都有「力量」，只用名稱會跨頁選到。
  const [selected, setSelected] = useState<{
    key: string;
    cn: string;
    en: string;
    value: number;
  } | null>(null);
  const tabs = ['能力', '豁免', '技能'];

  // 切頁時清掉選取。以 `分頁:名稱` 當鍵已避免跨頁誤選，但選取結果顯示在分頁
  // **上方**、不隨分頁切換——切過去之後畫面會是「豁免分頁 ＋ 力量檢定結果」，
  // 讀起來像「力量豁免」。三個分頁都有同名項目，這種誤讀不會被察覺。
  const changeTab = (i: number) => {
    setTab(i);
    setSelected(null);
  };

  // 英文用全名而非 STR/DEX 縮寫：這一列是**雙標**（中文大、英文小），
  // 與區段標題「CHECKS 檢定」是同一套語彙，縮寫在那個位置讀起來像代碼。
  const abilities: [keyof Character['abilityScores'], string, string][] = [
    ['str', '力量', 'Strength'],
    ['dex', '敏捷', 'Dexterity'],
    ['con', '體質', 'Constitution'],
    ['int_', '智力', 'Intelligence'],
    ['wis', '感知', 'Wisdom'],
    ['cha', '魅力', 'Charisma'],
  ];

  type Row = { name: string; nameEn: string; value: number; prof?: boolean };
  const byTab: Row[][] = [
    abilities.map(([k, cn, en]) => ({
      name: cn,
      nameEn: en,
      value: c.abilityScores[k].modifier,
    })),
    abilities.map(([k, cn, en]) => ({
      name: cn,
      nameEn: en,
      value:
        c.abilityScores[k].modifier +
        (c.abilityScores[k].proficientSave ? c.proficiencyBonus : 0),
      prof: c.abilityScores[k].proficientSave,
    })),
    c.skills.map((s) => ({
      name: s.name,
      nameEn: s.nameEn,
      value: s.modifier,
      prof: s.proficient,
    })),
  ];

  return (
    <>
      {/* 提示條。App **不擲骰**（與 Flutter 一致，玩家擲實體骰），點一項只是
          把「要加多少」放大講清楚——跑團當下最常發生的就是「等等我這個是加
          幾」。所以這裡沒有骰子動畫，只有一個大大的加值。 */}
      <div
        aria-live="polite"
        className={`mb-2 flex min-h-[52px] items-center gap-2.5 rounded-card border px-3 py-2 ${
          selected ? 'border-gold bg-gold/[0.06]' : 'border-border-2'
        }`}
      >
        {selected ? (
          <>
            <span className="min-w-0 flex-1">
              <span className="block text-tiny text-text-secondary">
                骰 1d20 然後加上
              </span>
              <span className="font-label mt-0.5 block truncate text-eyebrow text-section-label">
                {selected.cn}
                {selected.en && `・${selected.en}`}
              </span>
            </span>
            <span className="font-display shrink-0 text-[32px] font-bold leading-none text-gold">
              {sign(selected.value)}
            </span>
          </>
        ) : (
          <span className="text-ui text-text-secondary">
            點選下方項目，計算 1d20 加值
          </span>
        )}
      </div>

      <CharacterTabBar
        tabs={tabs}
        current={tab}
        onChange={changeTab}
        variant="segment"
      />
      {/* autoHeight：三頁高度差很多（技能 18 列、能力 6 列）。固定高度會在
          頁面中間變成一個小捲動框，取最高頁則讓能力頁下面空掉一大截。 */}
      <SwipeTabs current={tab} onSettle={changeTab} autoHeight>
        {byTab.map((rows, i) => (
          // 每一項自己一張卡（而非一張大卡切細線）：跑團時是「找某一項」
          // 而不是「讀完整份」，各自成塊才掃得快。
          <div key={i} className="grid grid-cols-2 gap-2 pt-2">
            {rows.map((r) => {
              const key = `${i}:${r.name}`;
              const on = selected?.key === key;
              return (
              <button
                key={r.name}
                type="button"
                aria-pressed={on}
                onClick={() =>
                  setSelected(
                    on ? null : { key, cn: r.name, en: r.nameEn, value: r.value },
                  )
                }
                className={`flex min-h-11 items-center justify-between gap-2 rounded-card border px-3 py-2 text-left ${
                  on ? 'border-gold bg-gold/10' : 'border-border-2 bg-surface-1'
                }`}
              >
                <span className="flex min-w-0 items-center gap-1.5">
                  {r.prof !== undefined && (
                    <span
                      className={`size-1.5 shrink-0 rounded-full ${r.prof ? 'bg-gold' : 'border border-border'}`}
                    />
                  )}
                  <span className="min-w-0">
                    <span className="block truncate text-ui text-text-primary">
                      {r.name}
                    </span>
                    {r.nameEn && (
                      <span className="font-label block truncate text-eyebrow text-text-secondary">
                        {r.nameEn}
                      </span>
                    )}
                  </span>
                </span>
                <span className="shrink-0 text-body font-semibold tabular-nums text-gold">
                  {sign(r.value)}
                </span>
              </button>
              );
            })}
          </div>
        ))}
      </SwipeTabs>
    </>
  );
}

/** 休息按鈕：破壞性且不可復原，一律先確認。 */
function RestButton({
  title,
  subtitle,
  confirm,
  doneHint,
  onConfirm,
}: {
  title: string;
  subtitle: string;
  confirm: string;
  /** 完成後的一行摘要——說明「實際發生了什麼」，不只是「成功了」。 */
  doneHint: string;
  onConfirm: () => void;
}) {
  const [asking, setAsking] = useState(false);
  // 休息完成後的回饋。長休的效果散在畫面各處（HP 條、法術位、資源、生命骰），
  // 沒有回饋時畫面只是靜靜地變了，使用者無從確定「剛才那下有沒有生效」——
  // 尤其資源本來就滿的時候，畫面根本沒有任何變化。
  // 用就地訊息而非全域 toast：與上面的就地確認同一個位置，視線不必移動。
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!done) return;
    const t = setTimeout(() => setDone(false), 3000);
    return () => clearTimeout(t);
  }, [done]);

  if (done) {
    return (
      <output
        // aria-live：這則訊息是操作結果，螢幕閱讀器要念出來。
        aria-live="polite"
        className="flex min-h-14 flex-1 flex-col items-center justify-center rounded-card border border-gold bg-gold/[0.06] px-2 text-center"
      >
        <span className="text-ui text-gold">已完成{title}</span>
        <span className="text-tiny text-text-secondary">{doneHint}</span>
      </output>
    );
  }

  if (asking) {
    return (
      <div className="flex-1 rounded-card border border-gold p-2">
        <p className="text-small leading-relaxed text-text-light">{confirm}</p>
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            onClick={() => setAsking(false)}
            className="min-h-9 flex-1 rounded-chip border border-border text-small text-text-secondary"
          >
            取消
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              setAsking(false);
              setDone(true);
            }}
            className="min-h-9 flex-1 rounded-chip border border-gold bg-gold/10 text-small text-gold"
          >
            確定
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setAsking(true)}
      className="flex min-h-14 flex-1 flex-col items-center justify-center rounded-card border border-border"
    >
      <span className="text-body text-text-primary">{title}</span>
      <span className="text-small text-text-secondary">{subtitle}</span>
    </button>
  );
}

/**
 * HP 欄，逐項對照 Flutter 端 `status_section.dart` 的 `_HpColumn`。
 *
 * 三處在移植時走鐘、這裡改回來：
 *
 * 1. **血條依剩餘比例變色**——滿血是綠的。原本固定用 `hp-full`（紅），
 *    滿血時看起來像隨時要死。
 * 2. **血條總長是「最大值＋臨時」**，臨時 HP 是**額外延伸的藍色段**而非覆蓋。
 *    這讓「傷害先吃臨時」直接看得見：藍段先縮，紅段不動。
 * 3. **±鈕在血條下方獨立一排**，不是夾在數字兩側把數字擠小。
 *
 * 數字用 textPrimary 而非金色——金色在這裡是給 AC 與資源用的，
 * HP 是白的才與原版一致。
 */
function HpColumn({
  c,
  onAdjust,
  onEditTempHp,
}: {
  c: Character;
  onAdjust: (delta: number) => void;
  onEditTempHp: () => void;
}) {
  const ratio = c.maxHp === 0 ? 0 : Math.min(1, Math.max(0, c.currentHp / c.maxHp));
  const barColor =
    ratio <= 0.25 ? 'bg-danger' : ratio <= 0.5 ? 'bg-gold-dim' : 'bg-success';
  const dying = c.currentHp === 0;

  return (
    <div className="flex flex-1 flex-col items-center">
      <span className="flex items-center gap-1">
        <svg viewBox="0 0 24 24" className="size-3 fill-danger" aria-hidden>
          <path d="M12 21c-.3 0-.6-.1-.8-.3C6.2 16.3 3 13.4 3 9.5 3 6.4 5.4 4 8.5 4c1.7 0 3.2.8 4.1 2 .9-1.2 2.4-2 4.1-2C19.6 4 22 6.4 22 9.5c0 3.9-3.2 6.8-8.2 11.2-.2.2-.5.3-.8.3z" />
        </svg>
        <span className="font-label text-tiny font-bold text-gold">HP</span>
      </span>

      <span className="mt-0.5 flex items-baseline gap-1">
        <span
          className={`font-display text-[30px] font-bold leading-none ${
            dying ? 'text-danger' : 'text-text-primary'
          }`}
        >
          {c.currentHp}
        </span>
        <span className="font-display text-body tabular-nums text-text-secondary">
          /{c.maxHp}
        </span>
        {/* 臨時 HP。**0 的時候也要在**——先前只在 >0 時顯示一枚 chip，等於
            這個 App 根本沒有設定臨時 HP 的入口（吟遊詩人的激勵、藥水、
            法術都會給）。點擊區以偽元素撐到 44px，不動排版。 */}
        <button
          type="button"
          onClick={onEditTempHp}
          aria-label={
            c.tempHp > 0 ? `臨時 HP ${c.tempHp}，點擊修改` : '設定臨時 HP'
          }
          className={`relative ml-1 rounded-[10px] border px-2 py-0.5 before:absolute before:-inset-2.5 before:content-[''] ${
            c.tempHp > 0
              ? 'border-temp-hp bg-temp-hp/15'
              : 'border-dashed border-border text-text-secondary'
          }`}
        >
          {c.tempHp > 0 ? (
            <>
              <span className="font-display text-ui font-bold text-temp-hp">
                +{c.tempHp}
              </span>
              <span className="ml-0.5 text-eyebrow text-temp-hp">臨時</span>
            </>
          ) : (
            <span className="text-tiny">＋臨時</span>
          )}
        </button>
      </span>

      {/* 三段式：已有 HP ／ 臨時 HP ／ 已失去。用 flex 權重表示長度比例，
          與 Flutter 的 Expanded(flex:) 同構。 */}
      <span className="mt-1 flex h-[5px] w-full overflow-hidden rounded-[3px] bg-hp-bar-bg">
        {c.currentHp > 0 && (
          <span className={barColor} style={{ flexGrow: c.currentHp }} />
        )}
        {c.tempHp > 0 && (
          <span className="bg-temp-hp" style={{ flexGrow: c.tempHp }} />
        )}
        {c.maxHp - c.currentHp > 0 && (
          <span style={{ flexGrow: c.maxHp - c.currentHp }} />
        )}
      </span>

      <span className="mt-2 flex gap-2.5">
        <HpButton label="扣 1 點生命值" onClick={() => onAdjust(-1)}>
          −
        </HpButton>
        <HpButton label="回復 1 點生命值" onClick={() => onAdjust(1)}>
          ＋
        </HpButton>
      </span>
    </div>
  );
}

/** 44×32 實心圓角矩形，對照 Flutter 的 `_HpButton`（不是圓形小鈕）。 */
function HpButton({
  onClick,
  children,
  label,
}: {
  onClick: () => void;
  children: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="flex h-8 w-11 items-center justify-center rounded-md bg-border text-body text-text-primary hover:brightness-125"
    >
      {children}
    </button>
  );
}

/** 單列 inline 移動數值：圖示＋中文＋數值 FT＋「N 格」。 */
function MovementStat({
  icon,
  label,
  feet,
  dim = false,
}: {
  icon: 'walk' | 'dash';
  label: string;
  feet: number;
  /** 衝刺是推導值，壓低一階避免與速度爭焦點。 */
  dim?: boolean;
}) {
  const d =
    icon === 'walk'
      ? 'M13.5 5.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4M9.8 8.9 7 23h2.1l1.8-8 2.1 2v6h2v-7.5l-2.1-2 .6-3A7 7 0 0 0 19 13v-2c-1.8 0-3.3-1-4.1-2.4l-1-1.6c-.4-.6-1-1-1.7-1-.3 0-.5 0-.8.2L6 7.7V12h2V9.1z'
      : 'M7 2v11h3v9l7-12h-4l4-8z';
  return (
    <span className="flex items-center gap-1.5">
      <svg
        viewBox="0 0 24 24"
        className={`size-4 ${dim ? 'fill-text-secondary' : 'fill-gold'}`}
        aria-hidden
      >
        <path d={d} />
      </svg>
      <span className="text-tiny text-text-light">{label}</span>
      <span
        className={`font-display text-[18px] font-bold tabular-nums ${
          dim ? 'text-text-secondary' : 'text-text-primary'
        }`}
      >
        {feet}
      </span>
      <span className="font-label text-eyebrow font-semibold text-text-secondary">FT</span>
      <span className="text-tiny text-section-label">
        · {Math.floor(feet / 5)} 格
      </span>
    </span>
  );
}

function StepBtn({
  onClick,
  children,
  label,
}: {
  onClick: () => void;
  children: React.ReactNode;
  label: string;
}) {
  return (
    // 視覺仍是 36px 圓鈕，但以偽元素把可點區域補到 44px——跑團中 HP ±1 是
    // 全 App 最高頻的點擊，36px 在手機上會失手。-inset-1 恰好吃掉與相鄰
    // 數字之間的 gap-2，不與其他按鈕重疊。
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="relative flex size-9 items-center justify-center rounded-full border border-border text-body text-text-primary before:absolute before:-inset-1 before:content-[''] hover:border-gold hover:text-gold active:border-gold"
    >
      {children}
    </button>
  );
}

/**
 * 點數格，逐項對照 Flutter 端的 `GoldPips`：**亮的靠左、由右往左遞減**。
 *
 * 排版與點擊的算式在 `lib/rules/pips.ts`（有測試釘住方向）——這段已經移植
 * 錯過兩次，都是把「剩餘量」寫成「已消耗數」，結果從左邊開始熄。
 */
function Pips({
  total,
  used,
  onChange,
  label,
  singleStep=false,
}: {
  singleStep?:boolean;
  total: number;
  used: number;
  onChange: (delta: number) => void;
  label: string;
}) {
  return (
    <span className="flex flex-wrap gap-1.5">
      {Array.from({ length: total }, (_, i) => {
        const filled = pipFilled(i, total, used);
        const delta = singleStep ? singlePipDelta(i, total, used) : pipDelta(i, total, used);
        return (
          // 16px 的格子太小點不準，但橫向擴張會與相鄰格重疊、反而更容易點錯。
          // 因此只往上下延伸（那個方向沒有鄰居），左右僅補滿 gap 的一半消除死區。
          <button
            key={i}
            type="button"
            onClick={() => onChange(delta)}
            aria-label={
              singleStep?`${label} 第 ${i+1} 格；點擊${filled?'消耗':'回復'}1格`:filled
                ? `${label} 第 ${i + 1} 格，可用；點擊消耗至剩 ${i} 格`
                : `${label} 第 ${i + 1} 格，已消耗；點擊回復至剩 ${i + 1} 格`
            }
            className={`relative size-4 rounded-full border before:absolute before:-inset-y-3 before:-inset-x-0.5 before:content-[''] ${
              singleStep?`${label} 第 ${i+1} 格；點擊${filled?'消耗':'回復'}1格`:filled
                ? 'border-[#E0C56A] bg-gold hover:brightness-110'
                : 'border-border bg-surface-2 hover:border-gold/60'
            }`}
          />
        );
      })}
    </span>
  );
}

/**
 * 同步狀態會在背景自行變動，沒有使用者操作觸發——螢幕閱讀器要靠 aria-live
 * 才會播報。用 polite：同步狀態不該打斷正在讀的內容。
 */
function SyncBadge({ dirty, error }: { dirty: boolean; error: string | null }) {
  const cls = 'rounded-chip border px-2 py-0.5 text-small';
  const [tone, text] = error
    ? ['border-danger text-danger', '同步失敗']
    : dirty
      ? ['border-border-2 text-text-secondary', '未同步']
      : ['border-gold text-gold', '已同步'];
  return (
    <span role="status" aria-live="polite" className={`${cls} ${tone}`}>
      {text}
    </span>
  );
}
