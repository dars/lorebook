import { expect, it } from 'vitest';
import { applyStringSelection } from './selection';
it('熟練儲存合併增刪並保留其他更新', () => {
  expect(applyStringSelection(['通用語', '精靈語'], ['通用語'], ['矮人語'])).toEqual(['精靈語', '矮人語']);
});
it('重複加入不重複，未變動的草稿不還原其他地方的移除', () => {
  expect(applyStringSelection(['矮人語'], ['通用語'], ['通用語', '矮人語'])).toEqual(['矮人語']);
});
