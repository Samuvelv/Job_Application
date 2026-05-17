import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('recruiter_access_requests', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.string('email').notNullable();
    t.text('message').nullable();
    t.enu('status', ['pending', 'approved', 'rejected']).notNullable().defaultTo('pending');
    t.text('admin_note').nullable();
    t.uuid('reviewed_by').nullable().references('id').inTable('users').onDelete('SET NULL');
    t.timestamp('reviewed_at').nullable();
    t.timestamps(true, true);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('recruiter_access_requests');
}
