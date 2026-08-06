export const ONBOARDING_MIN_KEYWORDS = 3;
export const ONBOARDING_MAX_KEYWORDS = 5;

export type TasteKeyword = {
  id: string;
  label: string;
  category: 'mood' | 'tone' | 'experience';
};

export const tasteKeywords: TasteKeyword[] = [
  { id: 'immersive', label: '몰입감 있는', category: 'experience' },
  { id: 'romantic', label: '낭만적인', category: 'mood' },
  { id: 'warm', label: '따뜻한', category: 'mood' },
  { id: 'moving', label: '뭉클한', category: 'mood' },
  { id: 'witty', label: '재치 있는', category: 'tone' },
  { id: 'tense', label: '긴장감 있는', category: 'experience' },
  { id: 'mysterious', label: '미장센이 좋은', category: 'experience' },
  { id: 'comforting', label: '위로가 되는', category: 'mood' },
  { id: 'thoughtful', label: '생각이 깊어지는', category: 'experience' },
  { id: 'refreshing', label: '산뜻한', category: 'tone' },
  { id: 'unusual', label: '독특한', category: 'tone' },
  { id: 'nostalgic', label: '여운이 긴', category: 'experience' },
];

export function toggleKeyword(selection: string[], keywordId: string): string[] {
  if (selection.includes(keywordId)) {
    return selection.filter((id) => id !== keywordId);
  }

  if (selection.length >= ONBOARDING_MAX_KEYWORDS) {
    return selection;
  }

  return [...selection, keywordId];
}

export function canCompleteOnboarding(selection: string[]): boolean {
  return selection.length >= ONBOARDING_MIN_KEYWORDS && selection.length <= ONBOARDING_MAX_KEYWORDS;
}

export function getKeywordLabels(ids: string[]): string[] {
  const labelsById = new Map(tasteKeywords.map((keyword) => [keyword.id, keyword.label]));
  return ids.flatMap((id) => {
    const label = labelsById.get(id);
    return label ? [label] : [];
  });
}
