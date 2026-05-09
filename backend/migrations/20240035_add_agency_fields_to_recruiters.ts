// migrations/20240035_add_agency_fields_to_recruiters.ts
import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('recruiters', (t) => {
    t.specificType('sectors_recruit_for', 'text[]').nullable();
    t.specificType('countries_place_in',  'text[]').nullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('recruiters', (t) => {
    t.dropColumn('sectors_recruit_for');
    t.dropColumn('countries_place_in');
  });
}
