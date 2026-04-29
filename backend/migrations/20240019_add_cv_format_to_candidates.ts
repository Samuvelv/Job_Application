import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('candidates', (t) => {
    t.string('cv_format', 50).notNullable().defaultTo('not_yet_created');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('candidates', (t) => {
    t.dropColumn('cv_format');
  });
}
