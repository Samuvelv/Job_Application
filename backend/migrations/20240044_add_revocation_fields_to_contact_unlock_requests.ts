import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('contact_unlock_requests', (t) => {
    t.timestamp('revoked_at', { useTz: true }).nullable();
    t.uuid('revoked_by_id').nullable().references('id').inTable('users').onDelete('SET NULL');
    t.text('revocation_reason').nullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('contact_unlock_requests', (t) => {
    t.dropColumn('revoked_at');
    t.dropColumn('revoked_by_id');
    t.dropColumn('revocation_reason');
  });
}
