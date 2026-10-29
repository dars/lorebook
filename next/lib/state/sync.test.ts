import { beforeEach, expect, it, vi } from 'vitest';
import { Character } from '@/lib/domain/character';
import { useCharacterStore } from './character-store';
const mocks = vi.hoisted(() => ({ upsert: vi.fn(), getUser: vi.fn() }));
vi.mock('@/lib/supabase/client', () => ({ createClient: () => ({ auth: { getUser: mocks.getUser }, from: () => ({ upsert: mocks.upsert }) }) }));
import { flushCharacterChanges } from './sync';
const c = () => Character.parse({ id: 'sync-test', name: 'test', abilityScores: Object.fromEntries(['str', 'dex', 'con', 'int_', 'wis', 'cha'].map(k => [k, { score: 10, modifier: 0 }])) });
beforeEach(() => { mocks.upsert.mockReset(); mocks.getUser.mockResolvedValue({ data: { user: { id: 'owner' } } }); useCharacterStore.getState().clear(); useCharacterStore.getState().load(c()); });
it('離開成長入口前推送最後變更，慢回應不會誤標記較新編輯已保存', async () => {
    let finish!: (v: {
        error: null;
    }) => void;
    mocks.upsert.mockImplementationOnce(() => new Promise(r => { finish = r; })).mockResolvedValue({ error: null });
    useCharacterStore.getState().update(c => ({ ...c, name: 'first' }));
    const push = flushCharacterChanges();
    await vi.waitFor(() => expect(mocks.upsert).toHaveBeenCalledTimes(1));
    useCharacterStore.getState().update(c => ({ ...c, name: 'second' }));
    finish({ error: null });
    await push;
    expect(mocks.upsert).toHaveBeenCalledTimes(2);
    expect(mocks.upsert.mock.calls[1][0]).toMatchObject({ user_id: 'owner', name: 'second' });
    expect(useCharacterStore.getState().dirty).toBe(false);
});
it('同步失敗保留本機變更供重試', async () => {
    mocks.upsert.mockResolvedValue({ error: { message: 'offline' } });
    useCharacterStore.getState().update(c => ({ ...c, name: 'draft' }));
    expect(await flushCharacterChanges()).toBe('offline');
    expect(useCharacterStore.getState().dirty).toBe(true);
    mocks.upsert.mockResolvedValue({ error: null });
    expect(await flushCharacterChanges()).toBeNull();
    expect(useCharacterStore.getState().dirty).toBe(false);
});
