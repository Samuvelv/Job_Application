// src/app/features/admin/master/master-table.config.ts
// Config-driven definitions for all 10 master data tables.
// To add a new master table: add one entry to MASTER_TABLE_CONFIGS.

export type FieldType = 'text' | 'number' | 'select';

export interface MasterFieldDef {
  key:           string;      // DB column / payload key
  label:         string;      // Display label in form + table
  type:          FieldType;
  required?:     boolean;
  unique?:       boolean;     // triggers duplicate warning on blur
  maxLength?:    number;
  min?:          number;      // for number fields
  placeholder?:  string;
  // For select fields — points to a signal key on MasterDataService
  selectSource?: MasterSelectSource;
  // Whether to show in the list table (default true)
  showInList?:   boolean;
}

export type MasterSelectSource =
  | 'countries'
  | 'occupations';

export interface MasterTableConfig {
  key:           string;        // URL segment e.g. 'countries'  → /admin/master/countries
  table:         string;        // DB table e.g. 'master_countries'
  label:         string;        // Sidebar + page heading e.g. 'Countries'
  labelPlural:   string;        // e.g. 'Countries'
  icon:          string;        // Bootstrap icon class
  fields:        MasterFieldDef[];
  defaultSort:   string;        // default column to sort by
  // Primary display field (shown in toast/confirm messages)
  displayField:  string;
}

// ─────────────────────────────────────────────────────────────────────────────
// TABLE CONFIGURATIONS
// ─────────────────────────────────────────────────────────────────────────────

export const MASTER_TABLE_CONFIGS: MasterTableConfig[] = [
  // ── Countries ──────────────────────────────────────────────────────────────
  {
    key:          'countries',
    table:        'master_countries',
    label:        'Countries',
    labelPlural:  'Countries',
    icon:         'bi-globe2',
    displayField: 'name',
    defaultSort:  'name',
    fields: [
      { key: 'name',       label: 'Country Name', type: 'text',   required: true,  maxLength: 100, unique: false },
      { key: 'iso2',       label: 'ISO2 Code',    type: 'text',   required: true,  maxLength: 2,   unique: true, placeholder: 'e.g. AE' },
      { key: 'dial_code',  label: 'Dial Code',    type: 'text',   required: true,  maxLength: 10,  placeholder: 'e.g. +971' },
      { key: 'flag_emoji', label: 'Flag Emoji',   type: 'text',   required: false, maxLength: 10,  placeholder: 'e.g. 🇦🇪' },
    ],
  },

  // ── Cities ─────────────────────────────────────────────────────────────────
  {
    key:          'cities',
    table:        'master_cities',
    label:        'Cities',
    labelPlural:  'Cities',
    icon:         'bi-buildings',
    displayField: 'name',
    defaultSort:  'name',
    fields: [
      { key: 'name',       label: 'City Name', type: 'text',   required: true,  maxLength: 150 },
      { key: 'country_id', label: 'Country',   type: 'select', required: true,  selectSource: 'countries' },
    ],
  },

  // ── Occupations ────────────────────────────────────────────────────────────
  {
    key:          'occupations',
    table:        'master_occupations',
    label:        'Occupations',
    labelPlural:  'Occupations',
    icon:         'bi-briefcase',
    displayField: 'name',
    defaultSort:  'name',
    fields: [
      { key: 'name', label: 'Occupation Name', type: 'text', required: true, maxLength: 100, unique: true },
    ],
  },

  // ── Job Titles ─────────────────────────────────────────────────────────────
  {
    key:          'job-titles',
    table:        'master_job_titles',
    label:        'Job Titles',
    labelPlural:  'Job Titles',
    icon:         'bi-person-badge',
    displayField: 'title',
    defaultSort:  'title',
    fields: [
      { key: 'title',         label: 'Job Title',  type: 'text',   required: true,  maxLength: 150 },
      { key: 'occupation_id', label: 'Occupation', type: 'select', required: true,  selectSource: 'occupations' },
    ],
  },

  // ── Industries ─────────────────────────────────────────────────────────────
  {
    key:          'industries',
    table:        'master_industries',
    label:        'Industries',
    labelPlural:  'Industries',
    icon:         'bi-building',
    displayField: 'name',
    defaultSort:  'name',
    fields: [
      { key: 'name', label: 'Industry Name', type: 'text', required: true, maxLength: 100, unique: true },
    ],
  },

  // ── Languages ──────────────────────────────────────────────────────────────
  {
    key:          'languages',
    table:        'master_languages',
    label:        'Languages',
    labelPlural:  'Languages',
    icon:         'bi-translate',
    displayField: 'name',
    defaultSort:  'name',
    fields: [
      { key: 'name', label: 'Language Name', type: 'text', required: true, maxLength: 100, unique: true },
    ],
  },

  // ── Degrees ────────────────────────────────────────────────────────────────
  {
    key:          'degrees',
    table:        'master_degrees',
    label:        'Degrees',
    labelPlural:  'Degrees',
    icon:         'bi-mortarboard',
    displayField: 'name',
    defaultSort:  'name',
    fields: [
      { key: 'name', label: 'Degree Name', type: 'text', required: true, maxLength: 150, unique: true },
    ],
  },

  // ── Fields of Study ────────────────────────────────────────────────────────
  {
    key:          'fields-of-study',
    table:        'master_fields_of_study',
    label:        'Fields of Study',
    labelPlural:  'Fields of Study',
    icon:         'bi-book',
    displayField: 'name',
    defaultSort:  'name',
    fields: [
      { key: 'name', label: 'Field of Study', type: 'text', required: true, maxLength: 150, unique: true },
    ],
  },

  // ── Notice Periods ─────────────────────────────────────────────────────────
  {
    key:          'notice-periods',
    table:        'master_notice_periods',
    label:        'Notice Periods',
    labelPlural:  'Notice Periods',
    icon:         'bi-clock-history',
    displayField: 'label',
    defaultSort:  'days',
    fields: [
      { key: 'label', label: 'Label',     type: 'text',   required: true,  maxLength: 100, unique: true, placeholder: 'e.g. 1 Month' },
      { key: 'days',  label: 'Days',      type: 'number', required: true,  min: 0, placeholder: 'e.g. 30' },
    ],
  },

  // ── Hobbies ────────────────────────────────────────────────────────────────
  {
    key:          'hobbies',
    table:        'master_hobbies',
    label:        'Hobbies',
    labelPlural:  'Hobbies',
    icon:         'bi-controller',
    displayField: 'name',
    defaultSort:  'name',
    fields: [
      { key: 'name', label: 'Hobby Name', type: 'text', required: true, maxLength: 100, unique: true },
    ],
  },
];

// Lookup helpers
export const MASTER_CONFIG_BY_KEY = Object.fromEntries(
  MASTER_TABLE_CONFIGS.map((c) => [c.key, c]),
) as Record<string, MasterTableConfig>;

export const MASTER_CONFIG_BY_TABLE = Object.fromEntries(
  MASTER_TABLE_CONFIGS.map((c) => [c.table, c]),
) as Record<string, MasterTableConfig>;
