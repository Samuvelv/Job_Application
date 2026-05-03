import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('profile_edit_requests', (t) => {
    t.text('reason').nullable().comment('Reason for the requested change');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('profile_edit_requests', (t) => {
    t.dropColumn('reason');
  });
}
