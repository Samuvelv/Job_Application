import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('volunteers', (t) => {
    t.string('sector', 200).nullable().defaultTo(null);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('volunteers', (t) => {
    t.dropColumn('sector');
  });
}
