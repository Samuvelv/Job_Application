// migrations/20240028_add_reviewed_by_to_requests.ts
import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('profile_edit_requests', (t) => {
    t.uuid('reviewed_by_id').nullable().references('id').inTable('users').onDelete('SET NULL');
  });

  await knex.schema.alterTable('contact_unlock_requests', (t) => {
    t.uuid('reviewed_by_id').nullable().references('id').inTable('users').onDelete('SET NULL');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('profile_edit_requests', (t) => {
    t.dropColumn('reviewed_by_id');
  });

  await knex.schema.alterTable('contact_unlock_requests', (t) => {
    t.dropColumn('reviewed_by_id');
  });
}
