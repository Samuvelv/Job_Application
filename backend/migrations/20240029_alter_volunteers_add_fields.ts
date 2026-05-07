import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('volunteers', (t) => {
    t.string('photo_url', 500).nullable();
    t.string('nationality', 200).nullable();
    t.string('country_placed', 200).nullable();
    t.string('company_joined', 200).nullable();
    t.integer('year_placed').nullable();
    t.jsonb('languages').nullable();          // string[]
    t.text('success_story').nullable();
    t.string('support_method', 100).nullable();
    t.string('contact_preference', 100).nullable();
    t.string('availability', 50).nullable().defaultTo('Active');
    t.boolean('consent').nullable().defaultTo(false);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('volunteers', (t) => {
    t.dropColumn('photo_url');
    t.dropColumn('nationality');
    t.dropColumn('country_placed');
    t.dropColumn('company_joined');
    t.dropColumn('year_placed');
    t.dropColumn('languages');
    t.dropColumn('success_story');
    t.dropColumn('support_method');
    t.dropColumn('contact_preference');
    t.dropColumn('availability');
    t.dropColumn('consent');
  });
}
