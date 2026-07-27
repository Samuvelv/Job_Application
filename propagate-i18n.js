#!/usr/bin/env node

/**
 * i18n Translation Propagation Script
 * Translates new English keys to all 34 supported languages
 * Uses the backend translation API
 */

const fs = require('fs');
const path = require('path');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const i18nDir = path.join(__dirname, '../frontend/src/assets/i18n');
const supportedLanguages = [
  'en', 'ar', 'bn', 'de', 'el', 'es', 'fa', 'fi', 'fr', 'gu', 'hi', 'hu',
  'it', 'ja', 'kn', 'ko', 'ml', 'mr', 'nl', 'pa', 'pl', 'pt', 'ro', 'ru',
  'sv', 'ta', 'te', 'th', 'tr', 'uk', 'ur', 'vi', 'zh', 'zu'
];

// New English keys to translate
const newKeysToTranslate = {
  'CANDIDATE_FORM.section_personal': 'Personal Information',
  'CANDIDATE_FORM.section_professional': 'Professional Details',
  'CANDIDATE_FORM.section_education': 'Education & Certification',
  'CANDIDATE_FORM.section_location': 'Location Details',
  'CANDIDATE_FORM.section_compliance': 'Compliance & Confirmations',
  'CANDIDATE_FORM.bio': 'Bio / Self Introduction',
  'CANDIDATE_FORM.bio_required': 'Bio is required.',
  'CANDIDATE_FORM.hobbies': 'Hobbies & Interests',
  'CANDIDATE_FORM.profile_status': 'Profile Status',
  'CANDIDATE_FORM.registration_fee_status': 'Registration Fee Status',
  'CANDIDATE_FORM.source': 'Source / How They Found Us',
  'CANDIDATE_FORM.marital_status': 'Marital Status',
  'CANDIDATE_FORM.current_country_helper': 'Where the candidate is currently living',
  'CANDIDATE_FORM.select_country_first': 'Select a country first to load cities',
  'CANDIDATE_FORM.postal_code': 'Postal Code',
  'CANDIDATE_FORM.postal_code_invalid': 'Invalid format',
  'CANDIDATE_FORM.postal_code_too_long': 'Postal code is too long.',
  'CANDIDATE_FORM.passport': 'Passport',
  'CANDIDATE_FORM.passport_nationality': 'Passport Nationality',
  'CANDIDATE_FORM.passport_nationality_required': 'Passport nationality is required.',
  'CANDIDATE_FORM.target_locations': 'Target Locations for Work',
  'CANDIDATE_FORM.target_locations_helper': 'Select multiple countries you are open to work in',
  'CANDIDATE_FORM.language': 'Language',
  'CANDIDATE_FORM.proficiency_beginner': 'Beginner',
  'CANDIDATE_FORM.proficiency_intermediate': 'Intermediate',
  'CANDIDATE_FORM.proficiency_advanced': 'Advanced',
  'CANDIDATE_FORM.proficiency_expert': 'Expert',
  'CANDIDATE_FORM.no_resume': 'No CV / Resume',
  'CANDIDATE_FORM.no_video': 'No video',
  'CANDIDATE_FORM.no_certificates': 'No certificates',
  'CANDIDATE_FORM.new_certificate': 'New Certificate'
};

async function translateText(text, targetLangCode, targetLangName) {
  try {
    const response = await fetch('http://localhost:3000/api/v1/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fields: { text },
        targetLang: targetLangCode,
        targetLangName: targetLangName
      })
    });

    if (!response.ok) {
      console.error(`Translation error for ${targetLangCode}:`, response.statusText);
      return text; // Fallback to original
    }

    const data = await response.json();
    return data.translated?.text || text;
  } catch (error) {
    console.error(`Translation failed for ${targetLangCode}:`, error.message);
    return text;
  }
}

async function updateLanguageFile(langCode, langName) {
  const filePath = path.join(i18nDir, `${langCode}.json`);

  if (!fs.existsSync(filePath)) {
    console.log(`❌ File not found: ${langCode}.json`);
    return;
  }

  const content = fs.readFileSync(filePath, 'utf8');
  let translations = JSON.parse(content);

  // Ensure CANDIDATE_FORM section exists
  if (!translations.ADMIN) translations.ADMIN = {};
  if (!translations.ADMIN.CANDIDATE_FORM) translations.ADMIN.CANDIDATE_FORM = {};

  console.log(`📝 Updating ${langCode}.json...`);

  // For each new key, translate it
  for (const [key, englishText] of Object.entries(newKeysToTranslate)) {
    const parts = key.split('.');
    if (parts[0] === 'CANDIDATE_FORM') {
      const fieldKey = parts[1];

      // Skip if already exists (don't overwrite)
      if (translations.ADMIN.CANDIDATE_FORM[fieldKey]) {
        console.log(`  ✓ ${fieldKey} (already exists)`);
        continue;
      }

      // Translate the text
      if (langCode !== 'en') {
        const translated = await translateText(englishText, langCode, langName);
        translations.ADMIN.CANDIDATE_FORM[fieldKey] = translated;
        console.log(`  ✓ ${fieldKey} → ${translated.substring(0, 40)}...`);
        
        // Rate limit: wait 100ms between translations
        await new Promise(resolve => setTimeout(resolve, 100));
      } else {
        translations.ADMIN.CANDIDATE_FORM[fieldKey] = englishText;
        console.log(`  ✓ ${fieldKey}`);
      }
    }
  }

  // Write back to file
  fs.writeFileSync(filePath, JSON.stringify(translations, null, 2) + '\n', 'utf8');
  console.log(`✅ ${langCode}.json updated\n`);
}

async function main() {
  console.log('🌍 i18n Translation Propagation Script');
  console.log(`📁 Directory: ${i18nDir}`);
  console.log(`🔢 Total languages: ${supportedLanguages.length}\n`);

  // Language name mapping for OpenAI
  const languageNames = {
    'ar': 'Arabic',
    'bn': 'Bengali',
    'de': 'German',
    'el': 'Greek',
    'es': 'Spanish',
    'fa': 'Persian',
    'fi': 'Finnish',
    'fr': 'French',
    'gu': 'Gujarati',
    'hi': 'Hindi',
    'hu': 'Hungarian',
    'it': 'Italian',
    'ja': 'Japanese',
    'kn': 'Kannada',
    'ko': 'Korean',
    'ml': 'Malayalam',
    'mr': 'Marathi',
    'nl': 'Dutch',
    'pa': 'Punjabi',
    'pl': 'Polish',
    'pt': 'Portuguese',
    'ro': 'Romanian',
    'ru': 'Russian',
    'sv': 'Swedish',
    'ta': 'Tamil',
    'te': 'Telugu',
    'th': 'Thai',
    'tr': 'Turkish',
    'uk': 'Ukrainian',
    'ur': 'Urdu',
    'vi': 'Vietnamese',
    'zh': 'Chinese',
    'zu': 'Zulu'
  };

  // Start with English, then do others
  const orderedLangs = ['en', ...supportedLanguages.filter(l => l !== 'en')];

  for (const langCode of orderedLangs) {
    const langName = languageNames[langCode] || langCode;
    await updateLanguageFile(langCode, langName);
  }

  console.log('✨ Translation propagation complete!');
}

main().catch(console.error);
