// migrations/20240038_add_employment_status_to_candidates.ts
import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const hasColumn = await knex.schema.hasColumn('candidates', 'employment_status');
  if (!hasColumn) {
    await knex.schema.alterTable('candidates', (t) => {
      t.string('employment_status', 50).nullable();
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  const hasColumn = await knex.schema.hasColumn('candidates', 'employment_status');
  if (hasColumn) {
    await knex.schema.alterTable('candidates', (t) => {
      t.dropColumn('employment_status');
    });
  }
}
