// src/app/core/services/translation-api.service.ts

import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { firstValueFrom, timeout, retry } from 'rxjs';
import { ConfigService } from './config.service';

interface CacheEntry {
  translations: Record<string, any>;
  timestamp: number;
  ttl: number;
}

@Injectable({
  providedIn: 'root'
})
export class TranslationApiService {
  private translationCache: Map<string, CacheEntry> = new Map();
  private readonly systemPrompt = `You are a professional real-time translation engine.

Your only responsibility is to translate the provided JSON into the target language.

CRITICAL RULES:
1. Translate ONLY human-readable string values into {{TARGET_LANGUAGE}}
2. Return a VALID JSON object with the EXACT SAME structure
3. Keep ALL keys, property names, IDs, arrays, objects UNCHANGED
4. Preserve all formatting exactly:
   - URLs unchanged
   - Email addresses unchanged
   - Phone numbers unchanged
   - Placeholders ({{name}}, {0}, %s) unchanged
   - Markdown formatting unchanged
   - HTML tags unchanged
   - Emojis unchanged
5. Do NOT translate:
   - Code blocks or inline code
   - Property names or keys
   - Array/object structure
   - Data types
6. Keep proper nouns, brand names, company names unchanged unless they have official translations
7. Return ONLY the translated JSON with no commentary, explanations, or notes
8. Ensure the output is valid, parseable JSON

Target Language: {{TARGET_LANGUAGE}}

JSON to translate:
{{JSON_INPUT}}`;

  constructor(
    private http: HttpClient,
    private config: ConfigService
  ) {}

  /**
   * Get cached translation for a language
   */
  getCachedTranslation(language: string): Record<string, any> | null {
    const entry = this.translationCache.get(language);

    if (!entry) {
      return null;
    }

    // Check if cache expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.translationCache.delete(language);
      return null;
    }

    console.log(`✅ Cache HIT for ${language}`);
    return entry.translations;
  }

  /**
   * Set translation cache
   */
  setCachedTranslation(language: string, translations: Record<string, any>): void {
    this.translationCache.set(language, {
      translations,
      timestamp: Date.now(),
      ttl: environment.translation.cacheTtlMs,
    });

    console.log(`💾 Cached translation for ${language} (TTL: ${environment.translation.cacheTtlMs / 1000}s)`);
  }

  /**
   * Clear cache for specific language or all
   */
  clearCache(language?: string): void {
    if (language) {
      this.translationCache.delete(language);
      console.log(`🗑️ Cache cleared for ${language}`);
    } else {
      this.translationCache.clear();
      console.log(`🗑️ All cache cleared`);
    }
  }

  /**
   * Translate all i18n keys to target language
   */
  async translateAllKeys(
    enJson: Record<string, any>,
    targetLanguage: string
  ): Promise<Record<string, any>> {
    // Check cache first
    const cached = this.getCachedTranslation(targetLanguage);
    if (cached) {
      return cached;
    }

    console.log(`🌐 Translating to ${targetLanguage}...`);
    const startTime = Date.now();

    try {
      const translatedJson = await this.callOpenAIAPI(enJson, targetLanguage);

      // Validate JSON structure
      if (!translatedJson || typeof translatedJson !== 'object') {
        throw new Error('Invalid translation response - not an object');
      }

      // Cache the translation
      this.setCachedTranslation(targetLanguage, translatedJson);

      const duration = Date.now() - startTime;
      console.log(`✅ Translation complete for ${targetLanguage} in ${duration}ms`);

      return translatedJson;
    } catch (error) {
      console.error(`❌ Translation failed for ${targetLanguage}:`, error);
      throw error;
    }
  }

  /**
   * Call OpenAI API with retry logic
   */
  private async callOpenAIAPI(
    enJson: Record<string, any>,
    targetLanguage: string
  ): Promise<Record<string, any>> {
    const apiKey = this.config.getApiKey();

    if (!apiKey) {
      throw new Error('OpenAI API key not configured. Please set OPENAI_API_KEY.');
    }

    const prompt = this.systemPrompt
      .replace('{{TARGET_LANGUAGE}}', targetLanguage)
      .replace('{{JSON_INPUT}}', JSON.stringify(enJson, null, 2));

    const request = {
      model: environment.translation.model,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3, // Low temperature for consistency
      max_tokens: 16000,
    };

    try {
      const response = await firstValueFrom(
        this.http.post<any>(
          environment.translation.apiEndpoint,
          request,
          {
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
          }
        ).pipe(
          timeout(environment.translation.timeoutMs),
          retry({ count: 2, delay: 1000 })
        )
      );

      if (!response?.choices?.[0]?.message?.content) {
        throw new Error('Invalid API response format');
      }

      const content = response.choices[0].message.content.trim();

      // Extract JSON from response (in case there's surrounding text)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in API response');
      }

      const translatedJson = JSON.parse(jsonMatch[0]);
      return translatedJson;
    } catch (error) {
      if (error instanceof HttpErrorResponse) {
        console.error(`API Error ${error.status}:`, error.message);
        console.error(`Response:`, error.error);
        if (error.status === 401) {
          throw new Error('Invalid API key. Please check OPENAI_API_KEY configuration.');
        }
        if (error.status === 429) {
          throw new Error('Rate limit exceeded. Please try again later.');
        }
        if (error.status === 404) {
          throw new Error('API endpoint not found. Check TRANSLATION_API_ENDPOINT configuration.');
        }
      }
      console.error('Translation API Error:', error);
      throw error;
    }
  }

  /**
   * Translate a single key for dynamic content
   */
  async translateSingleKey(key: string, value: string, targetLanguage: string): Promise<string> {
    const tempJson = { [key]: value };

    try {
      const translated = await this.callOpenAIAPI(tempJson, targetLanguage);
      return translated[key] || value; // Fallback to original if translation fails
    } catch (error) {
      console.error(`Failed to translate key ${key}:`, error);
      return value; // Return original value on error
    }
  }
}
