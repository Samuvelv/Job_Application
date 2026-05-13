import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const hasColumn = await knex.schema.hasColumn('candidates', 'registration_fee_status');
  if (!hasColumn) {
    await knex.schema.alterTable('candidates', (t) => {
      t.string('registration_fee_status', 20)
        .notNullable()
        .defaultTo('pending_payment');
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  const hasColumn = await knex.schema.hasColumn('candidates', 'registration_fee_status');
  if (hasColumn) {
    await knex.schema.alterTable('candidates', (t) => {
      t.dropColumn('registration_fee_status');
    });
  }
}
