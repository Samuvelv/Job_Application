// migrations/20240023_add_source_to_candidates.ts
import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const hasColumn = await knex.schema.hasColumn('candidates', 'source');
  if (!hasColumn) {
    await knex.schema.alterTable('candidates', (t) => {
      t.string('source', 50).nullable();
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  const hasColumn = await knex.schema.hasColumn('candidates', 'source');
  if (hasColumn) {
    await knex.schema.alterTable('candidates', (t) => {
      t.dropColumn('source');
    });
  }
}
