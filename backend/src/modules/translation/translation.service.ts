// src/modules/translation/translation.service.ts
import { chatComplete } from '../../services/openai.service';

// ── Prompt template ────────────────────────────────────────────────────────
function buildSystemPrompt(targetLangName: string): string {
  return `You are a professional translation assistant embedded in a recruitment platform. Your sole responsibility is to translate candidate profile text from English into ${targetLangName} for display to recruiters.

## Role
You translate candidate profile field values accurately and professionally. You do not edit, summarise, improve, or comment on the content — you only translate it.

## What to translate
Translate every value in the JSON input into natural, professional ${targetLangName}, including (but not limited to):
- Biographical summaries (bio)
- Job titles, occupations, and employment status
- Academic degree names and fields of study
- Work experience descriptions and reasons for leaving a role
- Employer/company names: translate ONLY if the value is a descriptive phrase rather than a proper brand name (e.g. "Self-Employed", "Family Business", "Freelance", "Government Sector" should be translated; a globally recognized brand/company name like "Google" or "Deutsche Bank" has no natural translation, so keep it as-is since translating it would be incorrect, not because it's an excluded category)
- Hobbies and personal interests
- Skill names and certification names, EXCEPT technology/tool/programming-language proper nouns that have no natural translation (e.g. "Python", "React", "AWS") — leave those as-is
- Gender, marital status, and visa/work-permit status values
- Any other short descriptive or categorical text value

## What NOT to translate or modify
Leave the following unchanged, exactly as they appear in the input:
- Proper nouns with no natural translation: person names, brand/product names, and globally recognized institution names (e.g. "MIT", "Google")
- Contact details: email addresses, phone numbers, URLs
- Identifiers: IDs, reference codes
- Dates, numbers, currencies
- City names, country names
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

  // GPT occasionally returns malformed/truncated JSON — usually non-deterministic
  // (a retry often succeeds) or caused by the output being cut off at the token
  // cap. Try up to 3 times, splitting the batch in half on each retry so a chunk
  // that's genuinely too large for the token budget converges instead of
  // repeatedly failing the same way.
  return attemptTranslate(fields, systemPrompt, targetLangName, 1);
}

async function attemptTranslate(
  fields: Record<string, string>,
  systemPrompt: string,
  targetLangName: string,
  attempt: number,
): Promise<Record<string, string>> {
  const userContent = JSON.stringify(fields, null, 0);
  const { content: rawReply, finishReason } = await chatComplete(systemPrompt, userContent);

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
  } catch (err) {
    console.warn(
      `[translation.service] GPT response was not valid JSON (attempt ${attempt}, finish_reason=${finishReason}): ${(err as Error).message}`,
    );

    if (attempt < 3) {
      const entries = Object.entries(fields);
      if (finishReason === 'length' && entries.length > 1) {
        // Truncated because the batch was too large for the token cap — split
        // in half and retry each half independently so it can still converge.
        const mid = Math.ceil(entries.length / 2);
        const [left, right] = await Promise.all([
          attemptTranslate(Object.fromEntries(entries.slice(0, mid)), systemPrompt, targetLangName, attempt + 1),
          attemptTranslate(Object.fromEntries(entries.slice(mid)), systemPrompt, targetLangName, attempt + 1),
        ]);
        return { ...left, ...right };
      }
      // Otherwise just retry the same batch — malformed (non-truncated) JSON
      // is usually a one-off sampling glitch.
      return attemptTranslate(fields, systemPrompt, targetLangName, attempt + 1);
    }

    console.warn('[translation.service] Giving up after 3 attempts — returning originals.');
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
