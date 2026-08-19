/**
 * 點數格（法術位、職業資源）的排版與點擊語意，逐項對照 Flutter 端的
 * `lib/shared/presentation/widgets/gold_pips.dart`。
 *
 * 抽成純函式是因為**這段邏輯已經移植錯過兩次**：Flutter 以「剩餘量」排版
 * （亮的靠左、由右往左遞減），web 版兩處都改用「已消耗數」排，於是變成從
 * 左邊開始熄，與操作習慣相反。旁邊的 pips.test.ts 把方向釘住。
 */

/** 第 i 格是不是還亮著（可用）。亮的一律靠左。 */
export function pipFilled(index: number, total: number, used: number): boolean {
  return index < total - used;
}

/**
 * 點第 i 格之後，要對「剩餘量」套用的差額。
 *
 * 正＝回復、負＝消耗，與 store 的 `adjustSpellSlot` / `adjustResource` 同號。
 *
 * - 點亮的第 i 格 → 剩餘量降到 i（這格連同右邊一起熄）
 * - 點暗的第 i 格 → 剩餘量升到 i+1（這格連同左邊一起亮）
 *
 * 因此點最右邊那顆亮的正好是「消耗 1 格」，點最左邊那顆暗的正好是「回復 1 格」。
 */
export function pipDelta(index: number, total: number, used: number): number {
  const remaining = total - used;
  const desired = pipFilled(index, total, used) ? index : index + 1;
  return desired - remaining;
}
