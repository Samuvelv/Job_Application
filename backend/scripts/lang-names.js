// backend/scripts/lang-names.js
// English names of every non-English UI language, keyed by the same ISO code
// used for frontend/src/assets/i18n/<code>.json, the SUPPORTED_LANG_CODES enum
// in src/modules/translation/translation.dto.ts, and SUPPORTED_LANGUAGES in
// frontend/src/app/core/services/language.service.ts. Shared by the i18n and
// master-data translation scripts so a new language is only listed once here.
//
// The name is fed straight into the GPT system prompt, so languages written in
// more than one script name the script explicitly — without it the model mixes
// Cyrillic and Latin output across chunks of the same language.
module.exports = {
  fr: 'French', de: 'German', es: 'Spanish', pt: 'Portuguese', it: 'Italian',
  nl: 'Dutch', ru: 'Russian', zh: 'Chinese (Simplified)', ja: 'Japanese', ko: 'Korean',
  ar: 'Arabic', hi: 'Hindi', tr: 'Turkish', pl: 'Polish', bg: 'Bulgarian',
  hr: 'Croatian', el: 'Greek', cs: 'Czech', da: 'Danish', et: 'Estonian',
  fi: 'Finnish', sv: 'Swedish', hu: 'Hungarian', ga: 'Irish', lv: 'Latvian',
  lt: 'Lithuanian', lb: 'Luxembourgish', mt: 'Maltese', ro: 'Romanian', sk: 'Slovak',
  sl: 'Slovenian', no: 'Norwegian', rm: 'Romansh', is: 'Icelandic',
  sr: 'Serbian (Cyrillic script)', bs: 'Bosnian (Latin script)',
};
