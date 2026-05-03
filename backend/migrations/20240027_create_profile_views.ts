import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('profile_views', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('recruiter_id').notNullable().references('id').inTable('recruiters').onDelete('CASCADE');
    t.uuid('candidate_id').notNullable().references('id').inTable('candidates').onDelete('CASCADE');
    t.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    t.unique(['recruiter_id', 'candidate_id', 'created_at']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('profile_views');
}
