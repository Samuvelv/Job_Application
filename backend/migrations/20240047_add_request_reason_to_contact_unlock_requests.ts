// migrations/20240047_add_request_reason_to_contact_unlock_requests.ts
import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('contact_unlock_requests', (table) => {
    table.text('request_reason').nullable().defaultTo(null);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('contact_unlock_requests', (table) => {
    table.dropColumn('request_reason');
  });
}
