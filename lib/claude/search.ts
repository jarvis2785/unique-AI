import { callClaudeJSON } from './client';
import { SEARCH_NORMALIZATION_PROMPT, buildSearchNormalizationUserPrompt } from './prompts';

export interface NormalizedSearchQuery {
  brand: string | null;
  model: string | null;
  category: string | null;
  variant: string | null;
  search_terms: string;
}

const NORMALIZATION_TIMEOUT_MS = 3000;

export async function normalizeSearchQuery(rawQuery: string): Promise<NormalizedSearchQuery> {
  return callClaudeJSON<NormalizedSearchQuery>({
    system: SEARCH_NORMALIZATION_PROMPT,
    prompt: buildSearchNormalizationUserPrompt(rawQuery),
    timeoutMs: NORMALIZATION_TIMEOUT_MS,
    maxTokens: 300,
  });
}
