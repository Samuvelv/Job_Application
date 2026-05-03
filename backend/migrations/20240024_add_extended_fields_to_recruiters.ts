// migrations/20240024_add_extended_fields_to_recruiters.ts
import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('recruiters', (t) => {
    t.string('phone', 50).nullable();
    t.string('company_website', 300).nullable();
    t.string('company_city', 100).nullable();
    t.string('sponsor_licence_number', 100).nullable();
    t.specificType('target_nationalities', 'text[]').nullable();
    t.string('hires_per_year', 50).nullable();
    t.text('admin_notes').nullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('recruiters', (t) => {
    t.dropColumn('admin_notes');
    t.dropColumn('hires_per_year');
    t.dropColumn('target_nationalities');
    t.dropColumn('sponsor_licence_number');
    t.dropColumn('company_city');
    t.dropColumn('company_website');
    t.dropColumn('phone');
  });
}
