import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('contact_unlock_requests', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('recruiter_id').notNullable().references('id').inTable('recruiters').onDelete('CASCADE');
    t.uuid('candidate_id').notNullable().references('id').inTable('candidates').onDelete('CASCADE');
    t.string('status', 20).notNullable().defaultTo('pending'); // pending | approved | rejected
    t.text('admin_note').nullable();
    t.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    t.timestamp('reviewed_at', { useTz: true }).nullable();
    t.unique(['recruiter_id', 'candidate_id']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('contact_unlock_requests');
}
