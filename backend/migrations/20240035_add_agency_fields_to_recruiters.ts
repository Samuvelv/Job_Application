// migrations/20240035_add_agency_fields_to_recruiters.ts
import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const [hasSectors, hasCountries] = await Promise.all([
    knex.schema.hasColumn('recruiters', 'sectors_recruit_for'),
    knex.schema.hasColumn('recruiters', 'countries_place_in'),
  ]);

  await knex.schema.alterTable('recruiters', (t) => {
    if (!hasSectors)   t.specificType('sectors_recruit_for', 'text[]').nullable();
    if (!hasCountries) t.specificType('countries_place_in',  'text[]').nullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  const [hasSectors, hasCountries] = await Promise.all([
    knex.schema.hasColumn('recruiters', 'sectors_recruit_for'),
    knex.schema.hasColumn('recruiters', 'countries_place_in'),
  ]);

  await knex.schema.alterTable('recruiters', (t) => {
    if (hasSectors)   t.dropColumn('sectors_recruit_for');
    if (hasCountries) t.dropColumn('countries_place_in');
  });
}
