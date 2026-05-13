// migrations/20240039_add_extended_recruiter_fields.ts
import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const columns = [
    'whatsapp_number', 'company_size', 'licence_rating', 'licence_verified',
    'job_types', 'access_start_date', 'account_status', 'free_account',
  ] as const;

  const exists = await Promise.all(
    columns.map((col) => knex.schema.hasColumn('recruiters', col))
  );

  await knex.schema.alterTable('recruiters', (t) => {
    if (!exists[0]) t.string('whatsapp_number', 30).nullable();
    if (!exists[1]) t.string('company_size', 20).nullable();
    if (!exists[2]) t.string('licence_rating', 20).nullable();
    if (!exists[3]) t.boolean('licence_verified').notNullable().defaultTo(false);
    if (!exists[4]) t.specificType('job_types', 'text[]').nullable();
    if (!exists[5]) t.timestamp('access_start_date').nullable();
    if (!exists[6]) t.string('account_status', 20).notNullable().defaultTo('active');
    if (!exists[7]) t.boolean('free_account').notNullable().defaultTo(false);
  });
}

export async function down(knex: Knex): Promise<void> {
  const columns = [
    'whatsapp_number', 'company_size', 'licence_rating', 'licence_verified',
    'job_types', 'access_start_date', 'account_status', 'free_account',
  ] as const;

  const exists = await Promise.all(
    columns.map((col) => knex.schema.hasColumn('recruiters', col))
  );

  await knex.schema.alterTable('recruiters', (t) => {
    if (exists[0]) t.dropColumn('whatsapp_number');
    if (exists[1]) t.dropColumn('company_size');
    if (exists[2]) t.dropColumn('licence_rating');
    if (exists[3]) t.dropColumn('licence_verified');
    if (exists[4]) t.dropColumn('job_types');
    if (exists[5]) t.dropColumn('access_start_date');
    if (exists[6]) t.dropColumn('account_status');
    if (exists[7]) t.dropColumn('free_account');
  });
}
