import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('candidate_certificates', (t) => {
    t.date('expiry_date').nullable();
    t.boolean('no_expiry').notNullable().defaultTo(false);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('candidate_certificates', (t) => {
    t.dropColumn('expiry_date');
    t.dropColumn('no_expiry');
  });
}
