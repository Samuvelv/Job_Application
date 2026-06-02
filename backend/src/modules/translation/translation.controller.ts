// src/modules/translation/translation.controller.ts
import { Request, Response, NextFunction } from 'express';
import { TranslateSchema } from './translation.dto';
import { translateFields } from './translation.service';
import { env } from '../../config/env';

/**
 * POST /api/v1/translate
 *
 * Accepts a set of candidate text fields and a target language,
 * returns the same fields with values translated by OpenAI GPT.
 *
 * Access: authenticated recruiters only (enforced in translation.router.ts).
 */
export async function translate(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    // Guard: translation is disabled if no API key is configured
    if (!env.OPENAI_API_KEY) {
      res.status(503).json({
        message: 'Translation service is not configured. Please set OPENAI_API_KEY in the server environment.',
      });
      return;
    }

    // Validate request body
    const dto = TranslateSchema.parse(req.body);

    // Translate
    const translated = await translateFields(dto.fields, dto.targetLangName);

    res.json({ translated });

  } catch (err) {
    next(err);
  }
}
