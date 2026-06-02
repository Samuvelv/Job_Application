import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('recruiters', (table) => {
    table.boolean('enable_translation').notNullable().defaultTo(false);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('recruiters', (table) => {
    table.dropColumn('enable_translation');
  });
}
