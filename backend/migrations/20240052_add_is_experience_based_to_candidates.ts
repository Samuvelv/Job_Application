import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const hasColumn = await knex.schema.hasColumn('candidates', 'is_experience_based');
  if (!hasColumn) {
    await knex.schema.alterTable('candidates', (t) => {
      t.boolean('is_experience_based').notNullable().defaultTo(false);
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  const hasColumn = await knex.schema.hasColumn('candidates', 'is_experience_based');
  if (hasColumn) {
    await knex.schema.alterTable('candidates', (t) => {
      t.dropColumn('is_experience_based');
    });
  }
}
