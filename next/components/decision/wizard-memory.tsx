'use client';
import type {Character} from '@/lib/domain/character';
import {memorizeSpellUses} from '@/lib/rules/wizard';
import {CharacterFlowLink} from '@/components/progression/character-flow-link';
export function WizardMemory({c,persist}:{c:Character;persist:boolean}){
 if(c.classNameEn!=='Wizard'||c.level<5)return null;
 const uses=memorizeSpellUses(c);
 return <div className="border-t border-border py-2 text-small">
 <div className="flex min-h-11 items-center justify-between gap-2"><span className="text-text-primary">記憶法術</span><span aria-label="記憶法術剩餘次數" className="text-gold">{uses}/1 次</span></div>
 <p className="text-text-secondary">{uses?'本次短休可更換一個已備法術，保存替換後自動扣除。':c.progression?.rest==='short'?'本次已使用；下次短休後恢復。':c.progression?.rest==='long'?'長休後可自由調整準備清單；記憶法術在短休後啟用。':'完成短休後取得一次替換機會。'}</p>
 {persist&&uses>0&&<CharacterFlowLink href="/character-choices?mode=rest#choice-prepared" className="inline-flex min-h-11 items-center text-gold underline">使用記憶法術 · 更換已備法術</CharacterFlowLink>}
 </div>;
}
