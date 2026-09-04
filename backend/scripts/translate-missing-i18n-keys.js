// backend/scripts/translate-missing-i18n-keys.js
// One-off script: translates any en.json keys missing from the other 36
// frontend i18n locale files, using the same OpenAI setup as the app's
// runtime translation feature.
//
// Run with:  node scripts/translate-missing-i18n-keys.js            (all languages)
//            node scripts/translate-missing-i18n-keys.js sr bs      (only these)
//
// For languages written in a non-Latin script, override the model:
//   OPENAI_MODEL=gpt-4.1-mini node scripts/translate-missing-i18n-keys.js sr
// gpt-3.5-turbo (the app's runtime default) answers Serbian in Latin no matter
// how the prompt is worded, and Cyrillic costs it enough extra tokens that
// large chunks get truncated into unparseable JSON.
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const OpenAI = require('openai');
const LANG_NAMES = require('./lang-names');

const I18N_DIR = path.join(__dirname, '..', '..', 'frontend', 'src', 'assets', 'i18n');
const MODEL = process.env.OPENAI_MODEL || 'gpt-3.5-turbo';
const MAX_CHUNK_CHARS = 4000;
const CONCURRENCY = 4;

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

/** Script a language must be written in, parsed from names like "Serbian (Cyrillic script)". */
function requiredScript(langName) {
  const m = /\(([A-Za-z]+) script\)/.exec(langName);
  return m ? m[1] : null;
}

/** True when the chunk came back in the wrong alphabet (see the retry in translateChunk). */
function wrongScript(values, script) {
  if (script !== 'Cyrillic') return false;
  const withLetters = values.filter((v) => /\p{L}/u.test(v));
  if (withLetters.length === 0) return false;
  const cyrillic = withLetters.filter((v) => /[Ѐ-ӿ]/.test(v));
  // Some Latin values are legitimate (brand names, placeholders), so only a
  // chunk that is mostly Latin counts as drift.
  return cyrillic.length < withLetters.length / 2;
}

async function translateChunk(fields, langName, attempt = 1) {
  const script = requiredScript(langName);
  const scriptRule = script
    ? `\n- Write every translated value in the ${script} script. Output in any other alphabet is incorrect, even where the other alphabet is also used for this language.`
    : '';

  const systemPrompt = `You are a professional UI translation assistant for a recruitment platform called "NTL Career Nexus". Translate the English UI text values in the JSON input into ${langName}.

Rules:${scriptRule}
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

  // The model occasionally answers a whole chunk in the language's other
  // alphabet despite the instruction, which would mix scripts across the UI.
  // Retry those chunks rather than writing the mixture to the locale file.
  if (wrongScript(Object.values(result), script) && attempt < 3) {
    console.warn(`  [warn] reply was not in ${script} script, retrying (attempt ${attempt + 1})`);
    return translateChunk(fields, langName, attempt + 1);
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

  const requested = process.argv.slice(2);
  const codes = requested.length > 0 ? requested : Object.keys(LANG_NAMES);
  await runPool(codes, enFlat, CONCURRENCY);
  console.log('All languages processed.');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
