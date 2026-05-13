// migrations/20240034_add_type_to_recruiters.ts
import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const hasColumn = await knex.schema.hasColumn('recruiters', 'type');
  if (!hasColumn) {
    await knex.schema.alterTable('recruiters', (t) => {
      t.string('type', 50).notNullable().defaultTo('direct_employer');
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  const hasColumn = await knex.schema.hasColumn('recruiters', 'type');
  if (hasColumn) {
    await knex.schema.alterTable('recruiters', (t) => {
      t.dropColumn('type');
    });
  }
}
