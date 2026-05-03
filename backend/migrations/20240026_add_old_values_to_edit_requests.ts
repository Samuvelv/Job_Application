import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // We'll alter the profile_edit_requests table to store both old and new values
  await knex.schema.alterTable('profile_edit_requests', (t) => {
    t.jsonb('old_values').nullable().comment('Old values before the requested change');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('profile_edit_requests', (t) => {
    t.dropColumn('old_values');
  });
}
