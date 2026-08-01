// src/services/openai.service.ts
// Singleton OpenAI client — used exclusively by the translation module.
// Follows the same module-level export pattern as email.service.ts.

import OpenAI from 'openai';
import { env } from '../config/env';

// ── Lazy singleton ────────────────────────────────────────────────────────────
let _client: OpenAI | null = null;

function getClient(): OpenAI {
  if (_client) return _client;

  if (!env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not configured. Set it in your .env file to enable translation.');
  }

  _client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  return _client;
}

export interface ChatCompleteResult {
  content: string;
  /** 'stop' = completed normally; 'length' = cut off by the token cap (likely truncated/invalid JSON). */
  finishReason: string | null;
}

// ── Public helper ─────────────────────────────────────────────────────────────
/**
 * Send a chat completion request to OpenAI.
 *
 * @param systemPrompt  The system-role message (translation instructions).
 * @param userContent   The user-role message (JSON payload of fields to translate).
 * @param maxTokens     Output token cap. Explicitly set (rather than left to the
 *                      API default) so large batches can't silently get cut off
 *                      mid-JSON, which produces the "not valid JSON" fallback.
 * @returns             The raw text content of the assistant's reply, plus why it stopped.
 */
export async function chatComplete(
  systemPrompt: string,
  userContent: string,
  maxTokens = 4096,
): Promise<ChatCompleteResult> {
  const client = getClient();

  const response = await client.chat.completions.create({
    model:       env.OPENAI_MODEL,
    temperature: 0.2,   // Low temperature = more consistent, faithful translations
    max_tokens:  maxTokens,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user',   content: userContent  },
    ],
  });

  const content = response.choices[0]?.message?.content ?? '';
  return { content: content.trim(), finishReason: response.choices[0]?.finish_reason ?? null };
}
