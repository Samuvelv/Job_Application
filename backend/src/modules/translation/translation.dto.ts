// src/modules/translation/translation.dto.ts
import { z } from 'zod';

/** ISO codes that match the 15 languages supported by the platform. */
const SUPPORTED_LANG_CODES = [
  'en', 'fr', 'de', 'es', 'pt', 'it',
  'nl', 'ru', 'zh', 'ja', 'ko', 'ar',
  'hi', 'tr', 'pl',
] as const;

export const TranslateSchema = z.object({
  /** Flat map of field-key → source text value.
   *  Keys are deterministic strings like "bio", "exp_0_description", "hobby_1".
   *  Total characters across all values must not exceed 5 000 to cap token costs. */
  fields: z
    .record(z.string(), z.string())
    .refine(
      (rec) => Object.values(rec).join('').length <= 5_000,
      { message: 'Total content exceeds the 5 000 character limit per request.' },
    )
    .refine(
      (rec) => Object.keys(rec).length > 0,
      { message: 'fields must contain at least one entry.' },
    ),

  /** ISO language code of the target language, e.g. "fr". */
  targetLang: z.enum(SUPPORTED_LANG_CODES),

  /** Human-readable name of the target language, e.g. "French".
   *  Used inside the GPT system prompt. */
  targetLangName: z.string().min(2).max(40),
});

export type TranslateDto = z.infer<typeof TranslateSchema>;
