import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('volunteer_support_requests', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('candidate_id').notNullable().references('id').inTable('candidates').onDelete('CASCADE');
    t.uuid('volunteer_id').notNullable().references('id').inTable('volunteers').onDelete('CASCADE');
    t.text('message').nullable();
    t.string('status', 20).notNullable().defaultTo('pending'); // pending | connected | closed
    t.text('admin_note').nullable();
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    t.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('volunteer_support_requests');
}
