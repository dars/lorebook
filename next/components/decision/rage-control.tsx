'use client';
import { useState } from 'react';
import type { Character } from '@/lib/domain/character';
import { rageActive, rageDamage, setRage } from '@/lib/rules/barbarian';
import { useCharacterStore } from '@/lib/state/character-store';
export function RageControl({c}:{c:Character}) {
 const [error,setError]=useState('');
 if(c.classNameEn!=='Barbarian')return null;
 const active=rageActive(c), remaining=c.resources.find(r=>r.nameEn==='Rage'||r.name==='狂暴')?.current??0;
 return <div className="rounded border border-border p-3">
  <div className="flex items-center justify-between gap-2"><strong className="text-body text-text-primary">狂暴 {active?'· 啟用中':''}</strong><span className="text-small text-gold">力量傷害 +{rageDamage(c)}</span></div>
  <p className="my-2 text-small text-text-secondary">附贈動作啟動，消耗 1 次。力量檢定／豁免優勢，抗鈍擊、穿刺、揮砍傷害；不能施法或專注。{c.level>=15?'持續 10 分鐘。':'每回合以攻擊、迫使敵人豁免或附贈動作延續，最長 10 分鐘。'}</p>
  <button type="button" className="min-h-11 rounded border border-border px-3 text-gold disabled:opacity-50" disabled={!active&&!remaining} onClick={()=>{try{useCharacterStore.getState().update(current=>current.id===c.id?setRage(current,!active):current);setError('');}catch(e){setError((e as Error).message);}}}>{active?'結束狂暴':`啟動狂暴 · 剩餘 ${remaining} 次`}</button>
  {active&&<p className="mt-2 text-small text-gold">力量武器與徒手的傷害已加上狂暴加值。</p>}
  {error&&<p role="alert" className="text-small text-danger">{error}</p>}
 </div>;
}
