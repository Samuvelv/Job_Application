// migrations/20240039_add_extended_recruiter_fields.ts
import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('recruiters', (t) => {
    t.string('whatsapp_number', 30).nullable();
    t.string('company_size', 20).nullable();
    t.string('licence_rating', 20).nullable();
    t.boolean('licence_verified').notNullable().defaultTo(false);
    t.specificType('job_types', 'text[]').nullable();
    t.timestamp('access_start_date').nullable();
    t.string('account_status', 20).notNullable().defaultTo('active');
    t.boolean('free_account').notNullable().defaultTo(false);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('recruiters', (t) => {
    t.dropColumn('whatsapp_number');
    t.dropColumn('company_size');
    t.dropColumn('licence_rating');
    t.dropColumn('licence_verified');
    t.dropColumn('job_types');
    t.dropColumn('access_start_date');
    t.dropColumn('account_status');
    t.dropColumn('free_account');
  });
}
