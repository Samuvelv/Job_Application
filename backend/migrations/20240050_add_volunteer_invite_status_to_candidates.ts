import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const hasColumn = await knex.schema.hasColumn('candidates', 'volunteer_invite_status');
  if (!hasColumn) {
    await knex.schema.alterTable('candidates', (table) => {
      // null = not invited, 'invited' = invite email sent, 'converted' = volunteer record created
      table.string('volunteer_invite_status', 30).nullable().defaultTo(null);
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  const hasColumn = await knex.schema.hasColumn('candidates', 'volunteer_invite_status');
  if (hasColumn) {
    await knex.schema.alterTable('candidates', (table) => {
      table.dropColumn('volunteer_invite_status');
    });
  }
}
