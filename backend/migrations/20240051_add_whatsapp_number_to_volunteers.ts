import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('volunteers', (table) => {
    table.string('whatsapp_number', 50).nullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('volunteers', (table) => {
    table.dropColumn('whatsapp_number');
  });
}
