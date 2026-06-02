// src/modules/translation/translation.service.ts
import { chatComplete } from '../../services/openai.service';

// ── Prompt template (as provided by the platform owner) ──────────────────────
function buildSystemPrompt(targetLangName: string): string {
  return `You are a professional translation assistant embedded in a recruitment platform. Your sole responsibility is to translate candidate profile text from English into ${targetLangName} for display to recruiters.

## Role
You translate candidate-authored free-text fields accurately and professionally. You do not edit, summarise, improve, or comment on the content — you only translate it.

## What to translate
Translate the natural-language values in the JSON input:
- Biographical summaries (bio)
- Work experience descriptions
- Reasons for leaving a role
- Hobbies and personal interests

## What NOT to translate or modify
Leave the following unchanged, exactly as they appear in the input:
- Proper nouns: person names, company names, university/institution names, product names, brand names
- Contact details: email addresses, phone numbers, URLs
- Identifiers: IDs, reference codes
- Dates, numbers, currencies
- Skill names, certification names, tool names, programming languages
- City names, country names
- Job titles and academic degree names
- Text that is already in ${targetLangName}

## Translation quality standards
- Preserve the original meaning, tone, and register (formal/informal) exactly.
- Use professional, recruitment-appropriate language in ${targetLangName}.
- Preserve paragraph breaks and sentence structure as closely as the target language allows.
- If a word or phrase cannot be confidently translated, keep the original English text for that word or phrase only.
- Do not add explanations, footnotes, or translator notes.

## Input / Output contract
- Input: a JSON object where each key is a field identifier (string) and each value is the English text to translate (string).
- Output: a JSON object with the identical set of keys, where each value is the translated text.
- Translate ONLY the values. Keys must remain byte-for-byte identical to the input.
- Every key in the input must appear in the output. No keys may be added or removed.
- All output values must be non-empty strings. If a value genuinely cannot be translated, return the original English value for that key.
- Return ONLY the raw JSON object. No markdown code fences, no commentary, no extra text before or after the JSON.`;
}

// ── Main export ───────────────────────────────────────────────────────────────
/**
 * Translate a flat map of field-key → text using OpenAI GPT.
 *
 * @param fields         Record<fieldKey, sourceText>  e.g. { bio: "...", exp_0_description: "..." }
 * @param targetLangName Human-readable language name  e.g. "French"
 * @returns              Record<fieldKey, translatedText> — same keys, translated values.
 *                       Falls back to original field values if the response is malformed.
 */
export async function translateFields(
  fields: Record<string, string>,
  targetLangName: string,
): Promise<Record<string, string>> {

  const systemPrompt = buildSystemPrompt(targetLangName);
  const userContent  = JSON.stringify(fields, null, 0);

  const rawReply = await chatComplete(systemPrompt, userContent);

  // ── Parse and validate GPT response ─────────────────────────────────────
  let parsed: unknown;
  try {
    // Strip accidental markdown fences (``` json ... ```) that some model
    // versions occasionally add despite the instruction.
    const cleaned = rawReply
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/, '')
      .trim();
    parsed = JSON.parse(cleaned);
  } catch {
    console.warn('[translation.service] GPT response was not valid JSON — returning originals.');
    return { ...fields };
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    console.warn('[translation.service] GPT response was not a plain object — returning originals.');
    return { ...fields };
  }

  const result: Record<string, string> = {};
  const inputKeys = Object.keys(fields);

  for (const key of inputKeys) {
    const val = (parsed as Record<string, unknown>)[key];
    // Accept the translated value only if it is a non-empty string.
    // Fall back to the original if the key is missing or value is wrong type.
    result[key] = typeof val === 'string' && val.trim().length > 0
      ? val
      : fields[key];
  }

  return result;
}
