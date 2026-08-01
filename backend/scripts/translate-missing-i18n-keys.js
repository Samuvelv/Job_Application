// backend/scripts/translate-missing-i18n-keys.js
// One-off script: translates any en.json keys missing from the other 34
// frontend i18n locale files, using the same OpenAI setup as the app's
// runtime translation feature. Run with: node scripts/translate-missing-i18n-keys.js
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const OpenAI = require('openai');

const I18N_DIR = path.join(__dirname, '..', '..', 'frontend', 'src', 'assets', 'i18n');
const MODEL = process.env.OPENAI_MODEL || 'gpt-3.5-turbo';
const MAX_CHUNK_CHARS = 4000;
const CONCURRENCY = 4;

const LANG_NAMES = {
  fr: 'French', de: 'German', es: 'Spanish', pt: 'Portuguese', it: 'Italian',
  nl: 'Dutch', ru: 'Russian', zh: 'Chinese (Simplified)', ja: 'Japanese', ko: 'Korean',
  ar: 'Arabic', hi: 'Hindi', tr: 'Turkish', pl: 'Polish', bg: 'Bulgarian',
  hr: 'Croatian', el: 'Greek', cs: 'Czech', da: 'Danish', et: 'Estonian',
  fi: 'Finnish', sv: 'Swedish', hu: 'Hungarian', ga: 'Irish', lv: 'Latvian',
  lt: 'Lithuanian', lb: 'Luxembourgish', mt: 'Maltese', ro: 'Romanian', sk: 'Slovak',
  sl: 'Slovenian', no: 'Norwegian', rm: 'Romansh', is: 'Icelandic',
};

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function flatten(obj, prefix, out) {
  for (const k of Object.keys(obj)) {
    const v = obj[k];
    const key = prefix ? `${prefix}.${k}` : k;
    if (typeof v === 'string') out[key] = v;
    else flatten(v, key, out);
  }
  return out;
}

function setDeep(obj, dottedKey, value) {
  const parts = dottedKey.split('.');
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const p = parts[i];
    if (typeof cur[p] !== 'object' || cur[p] === null) cur[p] = {};
    cur = cur[p];
  }
  cur[parts[parts.length - 1]] = value;
}

function chunkEntries(entries) {
  const chunks = [];
  let cur = {};
  let size = 0;
  for (const [k, v] of entries) {
    const len = v.length;
    if (size + len > MAX_CHUNK_CHARS && Object.keys(cur).length > 0) {
      chunks.push(cur);
      cur = {};
      size = 0;
    }
    cur[k] = v;
    size += len;
  }
  if (Object.keys(cur).length > 0) chunks.push(cur);
  return chunks;
}

async function translateChunk(fields, langName) {
  const systemPrompt = `You are a professional UI translation assistant for a recruitment platform called "NTL Career Nexus". Translate the English UI text values in the JSON input into ${langName}.

Rules:
- Input: a JSON object where each key is a UI string identifier and each value is the English text to translate.
- Output: a JSON object with the IDENTICAL set of keys, values translated into ${langName}.
- Preserve ICU/interpolation placeholders exactly as-is, e.g. {{name}}, {{count}}, {{email}} — do not translate or alter their contents, spacing, or braces.
- Do not translate the brand name "NTL Career Nexus".
- Keep translations concise and appropriate for buttons, labels, and short UI messages.
- Return ONLY the raw JSON object — no markdown fences, no commentary.`;

  const userContent = JSON.stringify(fields);
  const resp = await client.chat.completions.create({
    model: MODEL,
    temperature: 0.2,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent },
    ],
  });
  const raw = resp.choices[0]?.message?.content ?? '';
  const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch (e) {
    console.warn(`  [warn] Failed to parse response, keeping originals for this chunk`);
    return fields;
  }
  const result = {};
  for (const key of Object.keys(fields)) {
    const val = parsed[key];
    result[key] = typeof val === 'string' && val.trim().length > 0 ? val : fields[key];
  }
  return result;
}

async function processLanguage(code, enFlat) {
  const filePath = path.join(I18N_DIR, `${code}.json`);
  const existing = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const existingFlat = flatten(existing, '', {});
  const missingEntries = Object.entries(enFlat).filter(([k]) => !(k in existingFlat));

  if (missingEntries.length === 0) {
    console.log(`[${code}] up to date`);
    return;
  }

  const langName = LANG_NAMES[code];
  if (!langName) {
    console.warn(`[${code}] no language name mapping, skipping`);
    return;
  }

  const chunks = chunkEntries(missingEntries);
  console.log(`[${code}] translating ${missingEntries.length} keys in ${chunks.length} chunk(s)...`);

  for (let i = 0; i < chunks.length; i++) {
    const translated = await translateChunk(chunks[i], langName);
    for (const [k, v] of Object.entries(translated)) {
      setDeep(existing, k, v);
    }
    console.log(`[${code}] chunk ${i + 1}/${chunks.length} done`);
  }

  fs.writeFileSync(filePath, JSON.stringify(existing, null, 2) + '\n', 'utf8');
  console.log(`[${code}] saved`);
}

async function runPool(codes, enFlat, concurrency) {
  let idx = 0;
  async function worker() {
    while (idx < codes.length) {
      const code = codes[idx++];
      try {
        await processLanguage(code, enFlat);
      } catch (err) {
        console.error(`[${code}] ERROR:`, err.message);
      }
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker));
}

async function main() {
  const enPath = path.join(I18N_DIR, 'en.json');
  const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));
  const enFlat = flatten(en, '', {});
  console.log(`en.json has ${Object.keys(enFlat).length} keys total`);

  const codes = Object.keys(LANG_NAMES);
  await runPool(codes, enFlat, CONCURRENCY);
  console.log('All languages processed.');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
