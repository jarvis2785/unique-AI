import Anthropic from '@anthropic-ai/sdk';

const MODEL = 'claude-sonnet-4-6';

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!client) {
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return client;
}

/**
 * Calls Claude expecting a single JSON object back, with a hard timeout.
 * Throws on timeout, API error, or unparsable output — callers must have a
 * non-Claude fallback (see /api/search's trigram path).
 */
export async function callClaudeJSON<T>(params: {
  system: string;
  prompt: string;
  timeoutMs: number;
  maxTokens?: number;
}): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), params.timeoutMs);

  try {
    const response = await getClient().messages.create(
      {
        model: MODEL,
        max_tokens: params.maxTokens ?? 1024,
        system: params.system,
        messages: [{ role: 'user', content: params.prompt }],
      },
      { signal: controller.signal }
    );

    const block = response.content[0];
    if (!block || block.type !== 'text') {
      throw new Error('Claude returned no text content');
    }

    const jsonText = extractJson(block.text);
    return JSON.parse(jsonText) as T;
  } finally {
    clearTimeout(timeout);
  }
}

function extractJson(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced && fenced[1]) return fenced[1].trim();

  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start === -1 || end === -1 || end < start) return trimmed;
  return trimmed.slice(start, end + 1);
}
