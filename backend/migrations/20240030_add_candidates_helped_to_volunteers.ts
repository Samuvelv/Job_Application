import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('volunteers', (t) => {
    t.integer('candidates_helped').notNullable().defaultTo(0);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('volunteers', (t) => {
    t.dropColumn('candidates_helped');
  });
}
