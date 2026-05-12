// migrations/20240048_create_candidate_activity.ts
import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('candidate_activity', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('candidate_id').notNullable()
      .references('id').inTable('candidates').onDelete('CASCADE');
    t.string('type', 50).notNullable();       // e.g. 'agency_interest_approved'
    t.text('description').notNullable();       // human-readable label
    t.jsonb('metadata').nullable();            // flexible extra data
    t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());

    t.index('candidate_id');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('candidate_activity');
}
