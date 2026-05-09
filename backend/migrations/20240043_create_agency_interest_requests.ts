import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('agency_interest_requests', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('recruiter_id').notNullable().references('id').inTable('recruiters').onDelete('CASCADE');
    t.uuid('candidate_id').notNullable().references('id').inTable('candidates').onDelete('CASCADE');
    t.string('sector', 150).notNullable();
    t.string('country', 100).notNullable();
    t.text('message').notNullable();
    t.string('status', 20).notNullable().defaultTo('pending'); // pending | approved | rejected
    t.text('admin_note').nullable();
    t.uuid('reviewed_by').nullable().references('id').inTable('users').onDelete('SET NULL');
    t.timestamp('reviewed_at').nullable();
    t.timestamps(true, true);
    t.unique(['recruiter_id', 'candidate_id']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('agency_interest_requests');
}
