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

// ── Public helper ─────────────────────────────────────────────────────────────
/**
 * Send a chat completion request to OpenAI.
 *
 * @param systemPrompt  The system-role message (translation instructions).
 * @param userContent   The user-role message (JSON payload of fields to translate).
 * @returns             The raw text content of the assistant's reply.
 */
export async function chatComplete(
  systemPrompt: string,
  userContent: string,
): Promise<string> {
  const client = getClient();

  const response = await client.chat.completions.create({
    model:       env.OPENAI_MODEL,
    temperature: 0.2,   // Low temperature = more consistent, faithful translations
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user',   content: userContent  },
    ],
  });

  const content = response.choices[0]?.message?.content ?? '';
  return content.trim();
}
