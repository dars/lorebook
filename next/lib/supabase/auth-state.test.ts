import {
  AuthApiError,
  AuthRetryableFetchError,
  AuthSessionMissingError,
} from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';

import { classifyAuth } from './auth-state';

describe('認證狀態判定', () => {
  it('有使用者就是已登入', () => {
    expect(classifyAuth({ hasUser: true, error: null })).toBe('authenticated');
  });

  it('沒有使用者也沒有錯誤＝確定未登入', () => {
    expect(classifyAuth({ hasUser: false, error: null })).toBe('unauthenticated');
  });

  it('伺服器有回應的錯誤＝確定未登入', () => {
    // 這些都代表 Supabase 收到了請求並給了答案，答案是「你沒登入」。
    expect(
      classifyAuth({ hasUser: false, error: new AuthApiError('bad jwt', 401, 'bad_jwt') }),
    ).toBe('unauthenticated');
    expect(
      classifyAuth({ hasUser: false, error: new AuthSessionMissingError() }),
    ).toBe('unauthenticated');
  });

  it('請求根本沒送達＝無法確認，不是未登入', () => {
    // 這是整個變更的核心：離線時走到這裡，若判成 unauthenticated
    // 就會被導向登入頁，而離線時登入頁是死路。
    expect(
      classifyAuth({
        hasUser: false,
        error: new AuthRetryableFetchError('Failed to fetch', 0),
      }),
    ).toBe('unknown');
  });
});
