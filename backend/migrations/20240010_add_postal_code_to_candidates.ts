// migrations/20240010_add_postal_code_to_candidates.ts
import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const hasColumn = await knex.schema.hasColumn('candidates', 'postal_code');
  if (!hasColumn) {
    await knex.schema.alterTable('candidates', (t) => {
      t.string('postal_code', 20).nullable();
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  const hasColumn = await knex.schema.hasColumn('candidates', 'postal_code');
  if (hasColumn) {
    await knex.schema.alterTable('candidates', (t) => {
      t.dropColumn('postal_code');
    });
  }
}
