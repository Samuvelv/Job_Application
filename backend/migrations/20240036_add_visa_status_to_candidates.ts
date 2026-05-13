import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const hasColumn = await knex.schema.hasColumn('candidates', 'visa_status');
  if (!hasColumn) {
    await knex.schema.alterTable('candidates', (t) => {
      t.string('visa_status', 100).nullable();
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  const hasColumn = await knex.schema.hasColumn('candidates', 'visa_status');
  if (hasColumn) {
    await knex.schema.alterTable('candidates', (t) => {
      t.dropColumn('visa_status');
    });
  }
}
