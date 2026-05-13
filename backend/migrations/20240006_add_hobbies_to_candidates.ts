import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const hasColumn = await knex.schema.hasColumn('candidates', 'hobbies');
  if (!hasColumn) {
    await knex.schema.alterTable('candidates', (table) => {
      table.specificType('hobbies', 'text[]').notNullable().defaultTo('{}');
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  const hasColumn = await knex.schema.hasColumn('candidates', 'hobbies');
  if (hasColumn) {
    await knex.schema.alterTable('candidates', (table) => {
      table.dropColumn('hobbies');
    });
  }
}
