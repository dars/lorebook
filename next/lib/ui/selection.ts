/** 只合併本次草稿差異，避免覆蓋其他地方的同步更新。 */
export function applyStringSelection(current: string[], initial: string[], draft: string[]) {
  return [...new Set([
    ...current.filter(s => !initial.includes(s) || draft.includes(s)),
    ...draft.filter(s => !initial.includes(s)),
  ])];
}
