// migrations/20240005_add_notice_period_to_employees.ts
import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('employees', (t) => {
    t.integer('notice_period_id')
      .nullable()
      .references('id')
      .inTable('master_notice_periods')
      .onDelete('SET NULL');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('employees', (t) => {
    t.dropColumn('notice_period_id');
  });
}
