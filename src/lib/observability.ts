import AsyncStorage from '@react-native-async-storage/async-storage';

const CLIENT_ISSUES_KEY = 'flick.stage4.client-issues';
const MAX_ISSUES = 20;

export type ClientIssue = { area: string; code: string; occurredAt: string };

export async function recordClientIssue(area: string, error: unknown): Promise<void> {
  try {
    const current = await readClientIssues();
    const code = error instanceof Error ? error.name || 'Error' : 'unknown';
    await AsyncStorage.setItem(CLIENT_ISSUES_KEY, JSON.stringify([{ area: area.slice(0, 60), code: code.slice(0, 60), occurredAt: new Date().toISOString() }, ...current].slice(0, MAX_ISSUES)));
  } catch { /* Diagnostics must never interrupt the product flow. */ }
}

export async function readClientIssues(): Promise<ClientIssue[]> {
  try {
    const stored = await AsyncStorage.getItem(CLIENT_ISSUES_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored) as unknown;
    return Array.isArray(parsed) ? parsed.flatMap((item) => {
      if (!item || typeof item !== 'object') return [];
      const issue = item as Partial<ClientIssue>;
      return typeof issue.area === 'string' && typeof issue.code === 'string' && typeof issue.occurredAt === 'string' ? [{ area: issue.area, code: issue.code, occurredAt: issue.occurredAt }] : [];
    }).slice(0, MAX_ISSUES) : [];
  } catch { return []; }
}
