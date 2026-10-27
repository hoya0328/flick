// Shared, dependency-free extraction contract. Never contains user content.
export const EXTRACTOR_VERSION = 'taste-evidence-v1';
export const TASTE_IDS = ['scene','afterglow','music','interpretation','character','narrative','immersion','comfort','aftereffect','nostalgia','everyday','novelty'] as const;
export type TasteId = typeof TASTE_IDS[number];
export type Stance = 'positive'|'neutral'|'mixed'|'negative';
export type TasteSignal = {type:TasteId;strength:number;stance:Stance;evidence:string;questionKey:string};
export type TasteTurn = {key:string;question:string;answer:string};
export const STANCE:Record<Stance,number>={positive:1,neutral:.3,mixed:.45,negative:-.7};
export function freeTasteEnabled(settings:{verified?:string;until?:string;model?:string;hasKey:boolean},now=Date.now()){
  const until=Date.parse(settings.until??'');
  return settings.hasKey&&settings.verified==='true'&&settings.model==='gemini-3.5-flash-lite'&&until>now&&until<=now+8*86400000;
}
export const isTasteId=(v:unknown):v is TasteId=>typeof v==='string'&&(TASTE_IDS as readonly string[]).includes(v);
export function validateTasteSignals(value:unknown,turns:TasteTurn[]):TasteSignal[]{
  if(!Array.isArray(value)||value.length>36)throw new Error('invalid_signals');
  const found=new Map<string,TasteSignal>();
  for(const raw of value){
    if(!raw||typeof raw!=='object')continue;
    const s=raw as Record<string,unknown>;
    if(!isTasteId(s.type)||typeof s.strength!=='number'||!Number.isFinite(s.strength)||s.strength<=0||s.strength>1
      ||typeof s.stance!=='string'||!Object.hasOwn(STANCE,s.stance)||typeof s.evidence!=='string'
      ||s.evidence.trim().length<4||s.evidence.length>400||typeof s.questionKey!=='string')continue;
    const turn=turns.find(t=>t.key===s.questionKey);
    // An exact quote must be in the user's ANSWER, not the prompt, AI feedback or magazine.
    if(!turn?.answer.includes(s.evidence))continue;
    const signal={type:s.type,strength:s.strength,stance:s.stance as Stance,evidence:s.evidence,questionKey:s.questionKey};
    const key=`${signal.type}:${signal.stance}:${signal.evidence}`;
    if((found.get(key)?.strength??0)<signal.strength)found.set(key,signal);
  }
  return [...found.values()];
}
export function sensitiveTasteInput(turns:TasteTurn[]){
  const text=turns.map(t=>`${t.question}\n${t.answer}`).join('\n');
  return /[\w.+-]+@[\w.-]+\.[a-z]{2,}/i.test(text)||/(?:\+?82[- ]?)?0?1[016789][- ]?\d{3,4}[- ]?\d{4}/.test(text)||/\b\d{6}[- ]?[1-4]\d{6}\b/.test(text);
}
