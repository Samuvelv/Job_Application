// migrations/20240057_add_audit_fields_to_master_tables.ts
// Adds created_at, updated_at, deleted_at (soft-delete) to all master tables.
import { Knex } from 'knex';

const SIMPLE_TABLES = [
  'master_countries',
  'master_cities',
  'master_occupations',
  'master_job_titles',
  'master_industries',
  'master_languages',
  'master_degrees',
  'master_fields_of_study',
  'master_notice_periods',
  'master_hobbies',
];

export async function up(knex: Knex): Promise<void> {
  for (const table of SIMPLE_TABLES) {
    await knex.schema.alterTable(table, (t) => {
      t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      t.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
      t.timestamp('deleted_at').nullable().defaultTo(null);
    });
    // Index on deleted_at so the WHERE deleted_at IS NULL filter is fast
    await knex.raw(`CREATE INDEX IF NOT EXISTS idx_${table}_deleted_at ON ${table}(deleted_at)`);
  }
}

export async function down(knex: Knex): Promise<void> {
  for (const table of SIMPLE_TABLES) {
    await knex.schema.alterTable(table, (t) => {
      t.dropColumn('deleted_at');
      t.dropColumn('updated_at');
      t.dropColumn('created_at');
    });
  }
}
