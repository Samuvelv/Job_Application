// backend/scripts/translate-master-data-i18n.js
// Companion to translate-missing-i18n-keys.js, for the master-data catalogs
// (countries, job titles, occupations, industries, spoken languages, degrees,
// fields of study, notice periods, hobbies) rather than the UI strings.
//
// Fills in any entry present in master-data-i18n/en.json but missing from the
// other locale files. MasterDataService falls back to live /translate calls for
// anything absent here, so a missing file costs an API round-trip per catalog
// on every language switch — that's what this script exists to avoid.
//
// Run with:  node scripts/translate-master-data-i18n.js            (all languages)
//            node scripts/translate-master-data-i18n.js sr bs      (only these)
//
// For languages written in a non-Latin script, override the model:
//   OPENAI_MODEL=gpt-4.1-mini node scripts/translate-master-data-i18n.js sr
// gpt-3.5-turbo (the app's runtime default) tends to answer in Latin for
// languages that use both alphabets, which the retry below only partly rescues.
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const OpenAI = require('openai');
const LANG_NAMES = require('./lang-names');

const I18N_DIR = path.join(__dirname, '..', '..', 'frontend', 'src', 'assets', 'master-data-i18n');
const MODEL = process.env.OPENAI_MODEL || 'gpt-3.5-turbo';
// Catalog entries are short labels, so a chunk holds many of them. Kept well
// below the UI script's 4000 because the reply repeats every key alongside its
// translation, roughly doubling the output token count.
const MAX_CHUNK_CHARS = 1500;
const CONCURRENCY = 4;

// Per-category guidance appended to the system prompt. Catalog labels carry no
// sentence context, so the model needs to be told what kind of term it's
// looking at — "Java" is a programming language in jobTitle but an island in
// country, and degree abbreviations must survive untranslated.
const CATEGORY_HINTS = {
  country:      'These are country names. Use the standard exonym in the target language.',
  jobTitle:     'These are job titles. Use the title as it appears in real job postings in the target language. Keep technology proper nouns (.NET, Java, SAP, React) unchanged. If a title is used untranslated in the local job market, keep the English.',
  occupation:   'These are broad occupational categories used as filter labels. Keep them short.',
  industry:     'These are industry sector names used as filter labels. Keep them short.',
  language:     'These are the names of spoken languages. Use the standard name in the target language.',
  degree:       'These are academic degree names. Translate the descriptive part but keep abbreviations and Latin/English degree titles in parentheses exactly as-is (e.g. "(B.A. / B.S.)", "(M.Tech)").',
  fieldOfStudy: 'These are academic fields of study.',
  noticePeriod: 'These are notice-period options. Keep the numerals exactly as they appear.',
  hobby:        'These are hobbies and personal interests.',
};

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function chunkEntries(entries) {
  const chunks = [];
  let cur = {};
  let size = 0;
  for (const [k, v] of entries) {
    if (size + v.length > MAX_CHUNK_CHARS && Object.keys(cur).length > 0) {
      chunks.push(cur);
      cur = {};
      size = 0;
    }
    cur[k] = v;
    size += v.length;
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
  // A few Latin values are legitimate (brand and technology names), so only a
  // chunk that is mostly Latin counts as drift.
  return cyrillic.length < withLetters.length / 2;
}

async function translateChunk(fields, langName, category, attempt = 1) {
  const script = requiredScript(langName);
  const scriptRule = script
    ? `\n- Write every translated value in the ${script} script. Output in any other alphabet is incorrect, even where the other alphabet is also used for this language.`
    : '';

  const systemPrompt = `You are a professional translation assistant for a recruitment platform called "NTL Career Nexus". Translate the English catalog labels in the JSON input into ${langName}.

Context: ${CATEGORY_HINTS[category] || 'These are short catalog labels shown in dropdowns and filters.'}

Rules:${scriptRule}
- Input: a JSON object where each key is the English label and each value is the same English label.
- Output: a JSON object with the IDENTICAL set of keys, where each value is that key translated into ${langName}.
- Keys must remain byte-for-byte identical to the input. Translate values only.
- Keep proper nouns, brand names, technology names, and abbreviations that have no natural translation unchanged.
- Preserve "&", "/", parentheses, and numerals exactly as they appear in the English label.
- These are dropdown labels: keep them concise, with no trailing punctuation or explanations.
- Return ONLY the raw JSON object — no markdown fences, no commentary.`;

  const resp = await client.chat.completions.create({
    model: MODEL,
    temperature: 0.2,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: JSON.stringify(fields) },
    ],
  });

  const raw = resp.choices[0]?.message?.content ?? '';
  const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    console.warn(`  [warn] ${category}: unparseable response, keeping originals for this chunk`);
    return fields;
  }

  const result = {};
  for (const key of Object.keys(fields)) {
    const val = parsed[key];
    result[key] = typeof val === 'string' && val.trim().length > 0 ? val : fields[key];
  }

  // The model occasionally answers a whole chunk in the language's other
  // alphabet despite the instruction, which would mix scripts inside one
  // dropdown. Retry those chunks rather than shipping the mixture.
  if (wrongScript(Object.values(result), script) && attempt < 3) {
    console.warn(`  [warn] ${category}: reply was not in ${script} script, retrying (attempt ${attempt + 1})`);
    return translateChunk(fields, langName, category, attempt + 1);
  }

  return result;
}

async function processLanguage(code, en) {
  const langName = LANG_NAMES[code];
  if (!langName) {
    console.warn(`[${code}] no language name mapping, skipping`);
    return;
  }

  const filePath = path.join(I18N_DIR, `${code}.json`);
  const existing = fs.existsSync(filePath)
    ? JSON.parse(fs.readFileSync(filePath, 'utf8'))
    : {};

  let totalMissing = 0;
  for (const category of Object.keys(en)) {
    if (!existing[category]) existing[category] = {};
    const missing = Object.keys(en[category]).filter((label) => !existing[category][label]);
    if (missing.length === 0) continue;
    totalMissing += missing.length;

    // Values in en.json are identical to their keys; send the key as the text
    // to translate so the model always sees the canonical English label.
    const chunks = chunkEntries(missing.map((label) => [label, label]));
    console.log(`[${code}] ${category}: ${missing.length} label(s) in ${chunks.length} chunk(s)`);

    for (let i = 0; i < chunks.length; i++) {
      const translated = await translateChunk(chunks[i], langName, category);
      Object.assign(existing[category], translated);
    }
  }

  if (totalMissing === 0) {
    console.log(`[${code}] up to date`);
    return;
  }

  // Rewrite in en.json's category and label order so diffs between locale files
  // stay comparable line-for-line.
  const ordered = {};
  for (const category of Object.keys(en)) {
    ordered[category] = {};
    for (const label of Object.keys(en[category])) {
      ordered[category][label] = existing[category][label] ?? label;
    }
  }

  fs.writeFileSync(filePath, JSON.stringify(ordered, null, 2) + '\n', 'utf8');
  console.log(`[${code}] saved (${totalMissing} label(s) translated)`);
}

async function runPool(codes, en, concurrency) {
  let idx = 0;
  async function worker() {
    while (idx < codes.length) {
      const code = codes[idx++];
      try {
        await processLanguage(code, en);
      } catch (err) {
        console.error(`[${code}] ERROR:`, err.message);
      }
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker));
}

async function main() {
  const en = JSON.parse(fs.readFileSync(path.join(I18N_DIR, 'en.json'), 'utf8'));
  const totalLabels = Object.values(en).reduce((n, cat) => n + Object.keys(cat).length, 0);
  console.log(`en.json has ${totalLabels} labels across ${Object.keys(en).length} categories`);

  const requested = process.argv.slice(2);
  const codes = requested.length > 0 ? requested : Object.keys(LANG_NAMES);
  await runPool(codes, en, CONCURRENCY);
  console.log('All languages processed.');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
