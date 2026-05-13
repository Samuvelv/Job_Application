import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const hasColumn = await knex.schema.hasColumn('profile_edit_requests', 'old_values');
  if (!hasColumn) {
    await knex.schema.alterTable('profile_edit_requests', (t) => {
      t.jsonb('old_values').nullable().comment('Old values before the requested change');
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  const hasColumn = await knex.schema.hasColumn('profile_edit_requests', 'old_values');
  if (hasColumn) {
    await knex.schema.alterTable('profile_edit_requests', (t) => {
      t.dropColumn('old_values');
    });
  }
}
