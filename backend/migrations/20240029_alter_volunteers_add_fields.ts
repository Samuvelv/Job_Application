import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const columns = [
    'photo_url', 'nationality', 'country_placed', 'company_joined',
    'year_placed', 'languages', 'success_story', 'support_method',
    'contact_preference', 'availability', 'consent',
  ] as const;

  const exists = await Promise.all(
    columns.map((col) => knex.schema.hasColumn('volunteers', col))
  );

  await knex.schema.alterTable('volunteers', (t) => {
    if (!exists[0])  t.string('photo_url', 500).nullable();
    if (!exists[1])  t.string('nationality', 200).nullable();
    if (!exists[2])  t.string('country_placed', 200).nullable();
    if (!exists[3])  t.string('company_joined', 200).nullable();
    if (!exists[4])  t.integer('year_placed').nullable();
    if (!exists[5])  t.jsonb('languages').nullable();
    if (!exists[6])  t.text('success_story').nullable();
    if (!exists[7])  t.string('support_method', 100).nullable();
    if (!exists[8])  t.string('contact_preference', 100).nullable();
    if (!exists[9])  t.string('availability', 50).nullable().defaultTo('Active');
    if (!exists[10]) t.boolean('consent').nullable().defaultTo(false);
  });
}

export async function down(knex: Knex): Promise<void> {
  const columns = [
    'photo_url', 'nationality', 'country_placed', 'company_joined',
    'year_placed', 'languages', 'success_story', 'support_method',
    'contact_preference', 'availability', 'consent',
  ] as const;

  const exists = await Promise.all(
    columns.map((col) => knex.schema.hasColumn('volunteers', col))
  );

  await knex.schema.alterTable('volunteers', (t) => {
    if (exists[0])  t.dropColumn('photo_url');
    if (exists[1])  t.dropColumn('nationality');
    if (exists[2])  t.dropColumn('country_placed');
    if (exists[3])  t.dropColumn('company_joined');
    if (exists[4])  t.dropColumn('year_placed');
    if (exists[5])  t.dropColumn('languages');
    if (exists[6])  t.dropColumn('success_story');
    if (exists[7])  t.dropColumn('support_method');
    if (exists[8])  t.dropColumn('contact_preference');
    if (exists[9])  t.dropColumn('availability');
    if (exists[10]) t.dropColumn('consent');
  });
}
