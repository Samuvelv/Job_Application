// migrations/20240033_create_agency_referrals.ts
import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('candidate_agency_referrals', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('candidate_id').notNullable().references('id').inTable('candidates').onDelete('CASCADE');
    t.string('agency_name', 200).notNullable();
    t.string('employer_name', 200).notNullable();
    t.string('country', 100).notNullable();
    t.date('referral_date').notNullable();
    t.string('status', 30).notNullable().defaultTo('pending');
    t.text('notes').nullable();
    t.uuid('created_by_id').nullable().references('id').inTable('users').onDelete('SET NULL');
    t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });

  await knex.schema.alterTable('candidate_agency_referrals', (t) => {
    t.index('candidate_id');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('candidate_agency_referrals');
}
