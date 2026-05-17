import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('agency_interest_requests', (t) => {
    t.dropUnique(['recruiter_id', 'candidate_id']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('agency_interest_requests', (t) => {
    t.unique(['recruiter_id', 'candidate_id']);
  });
}
