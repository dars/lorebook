import styles from './character-print.module.css';

export function WriteLine({ wide = false }: { wide?: boolean }) {
  return <span className={`${styles.writeLine} ${wide ? styles.wideLine : ''}`} aria-label="手寫欄位" />;
}

/** 一律印空格：印死的消耗記號無法在休息回復時用橡皮擦清除。 */
export function PrintMarks({ count, label }: { count: number; label: string }) {
  if (count < 1 || count > 20) return <span>剩餘 <WriteLine /></span>;
  return <span className={styles.marks} role="img" aria-label={`${label}，${count} 個空白勾記格`}>
    {Array.from({ length: count }, (_, i) => <span key={i} className={styles.mark} aria-hidden="true" />)}
  </span>;
}

export function WritingLines({ count = 2 }: { count?: number }) {
  return <div className={styles.writingLines} aria-label="手寫筆記區">{Array.from({ length: count }, (_, i) => <div key={i} />)}</div>;
}
