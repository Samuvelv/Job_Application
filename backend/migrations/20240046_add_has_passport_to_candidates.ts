import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('candidates', (t) => {
    t.boolean('has_passport').nullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('candidates', (t) => {
    t.dropColumn('has_passport');
  });
}
