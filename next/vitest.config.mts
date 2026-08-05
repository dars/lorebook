import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(__dirname) },
  },
  test: {
    // golden 對照檔在 repo 根目錄的 golden/，不在 next/ 內——它是 Flutter 端
    // 產生的、兩邊共用的驗收基準。
    include: ['lib/**/*.test.ts'],
  },
});
