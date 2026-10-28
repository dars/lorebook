import { hitDiceRemaining, type Character } from '@/lib/domain/character';
import { PrintMarks, WriteLine, WritingLines } from './print-fields';
import styles from './character-print.module.css';

export function CharacterSessionTracker({ c }: { c: Character }) {
  const tracks = [
    { name: `生命骰（d${c.hitDieFaces}）`, current: hitDiceRemaining(c), total: c.level, recovery: '休息' },
    ...c.resources.map((r) => ({
      name: `${r.name}${r.dieFaces > 0 ? `（d${r.dieFaces}）` : ''}${r.unit ? `（${r.unit}）` : ''}`,
      current: r.current, total: r.max,
      recovery: { short: '短休', long: '長休', none: '—' }[r.recovery],
    })),
    ...[...c.spellSlots].sort((a, b) => a.level - b.level).map((slot) => ({
      name: `${slot.level} 環法術位`, current: Math.max(0, slot.total - slot.used),
      total: slot.total, recovery: '依職業',
    })),
  ];
  const consumables = c.equipment.filter((item) => item.itemType === 'consumable');
  // 資源密集的角色減少預印空行，避免僅剩幾條筆記線卻另佔一整張紙。
  const noteLines = tracks.length + consumables.length > 7 ? 3 : 6;

  return <section className={styles.sessionPage} aria-label="跑團紀錄頁">
    <header className={styles.pageHeader}><h2>跑團紀錄</h2><span>{c.name} · {c.className} {c.level} 級</span></header>
    <div className={styles.sessionInfo}><span>日期 <WriteLine wide /></span><span>場次／冒險 <WriteLine wide /></span><span>玩家 <WriteLine /></span></div>

    <section className={styles.section}>
      <h3>HP 變動</h3>
      <p className={styles.meta}>起始 HP {c.currentHp}／{c.maxHp} · 臨時 HP {c.tempHp}；空欄可記錄傷害、治療與變動後的數值。</p>
      <table className={styles.ledger}><colgroup><col style={{ width: '40%' }} /><col style={{ width: '20%' }} /><col style={{ width: '20%' }} /><col style={{ width: '20%' }} /></colgroup>
        <thead><tr><th>來源／回合</th><th>傷害／治療</th><th>目前 HP</th><th>臨時 HP</th></tr></thead>
        <tbody>{Array.from({ length: 4 }, (_, i) => <tr key={i}><td /><td /><td /><td /></tr>)}</tbody>
      </table>
    </section>

    <section className={styles.section}>
      <h3>生命骰、資源與法術位</h3>
      <p className={styles.meta}>依起始值以鉛筆填滿「已用」格，消耗時再填格；回復後擦除。大額資源直接填剩餘數量。</p>
      <table className={styles.tracker}><colgroup><col style={{ width: '29%' }} /><col style={{ width: '15%' }} /><col style={{ width: '13%' }} /><col style={{ width: '43%' }} /></colgroup>
        <thead><tr><th>資源</th><th>起始剩餘<small>／上限</small></th><th>回復</th><th>已用勾記／剩餘數量</th></tr></thead>
        <tbody>{tracks.map((track, i) => <tr key={i} data-print-track={track.name}><td>{track.name}</td><td>{track.current} / {track.total}</td><td>{track.recovery}</td><td><PrintMarks count={track.total} label={`${track.name}已用`} /></td></tr>)}</tbody>
      </table>
    </section>

    {consumables.length > 0 && <section className={styles.section}>
      <h3>消耗品</h3>
      <table className={styles.ledger}><colgroup><col style={{ width: '40%' }} /><col style={{ width: '15%' }} /><col style={{ width: '20%' }} /><col style={{ width: '25%' }} /></colgroup>
        <thead><tr><th>名稱</th><th>起始數量</th><th>目前剩餘</th><th>消耗／補充紀錄</th></tr></thead>
        <tbody>{consumables.map((item, i) => <tr key={i}><td>{item.name}</td><td>{item.quantity}</td><td /><td /></tr>)}</tbody>
      </table>
    </section>}

    <section className={styles.section}>
      <h3>金錢／物品增減</h3>
      <table className={styles.ledger}><colgroup><col style={{ width: '40%' }} /><col style={{ width: '20%' }} /><col style={{ width: '40%' }} /></colgroup>
        <thead><tr><th>物品／幣別</th><th>增減數量</th><th>來源／用途</th></tr></thead>
        <tbody>{Array.from({ length: 3 }, (_, i) => <tr key={i}><td /><td /><td /></tr>)}</tbody>
      </table>
    </section>
    <section className={styles.section}><h3>場次筆記／待辦</h3><WritingLines count={noteLines} /></section>
  </section>;
}
