// migrations/20240021_add_profile_fields_to_recruiters.ts
import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('recruiters', (t) => {
    t.string('company_country', 100).nullable();
    t.string('industry', 150).nullable();
    t.string('has_sponsor_licence', 10).nullable(); // 'yes' | 'no' | 'unknown'
    t.specificType('sponsor_licence_countries', 'text[]').nullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('recruiters', (t) => {
    t.dropColumn('sponsor_licence_countries');
    t.dropColumn('has_sponsor_licence');
    t.dropColumn('industry');
    t.dropColumn('company_country');
  });
}
