// migrations/20240011_add_candidate_number.ts
import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Create a dedicated sequence for candidate numbers
  await knex.raw(`CREATE SEQUENCE IF NOT EXISTS candidates_seq START 1 INCREMENT 1`);

  await knex.schema.alterTable('candidates', (t) => {
    t.string('candidate_number', 20).nullable().unique();
  });

  // Backfill existing rows
  await knex.raw(`
    UPDATE candidates
    SET candidate_number = 'CAND-' || LPAD(nextval('candidates_seq')::text, 4, '0')
    WHERE candidate_number IS NULL
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('candidates', (t) => {
    t.dropColumn('candidate_number');
  });
  await knex.raw(`DROP SEQUENCE IF EXISTS candidates_seq`);
}
