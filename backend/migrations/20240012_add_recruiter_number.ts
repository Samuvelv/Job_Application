// migrations/20240012_add_recruiter_number.ts
import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Create a dedicated sequence for recruiter numbers
  await knex.raw(`CREATE SEQUENCE IF NOT EXISTS recruiters_seq START 1 INCREMENT 1`);

  await knex.schema.alterTable('recruiters', (t) => {
    t.string('recruiter_number', 20).nullable().unique();
  });

  // Backfill existing rows
  await knex.raw(`
    UPDATE recruiters
    SET recruiter_number = 'REC-' || LPAD(nextval('recruiters_seq')::text, 4, '0')
    WHERE recruiter_number IS NULL
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('recruiters', (t) => {
    t.dropColumn('recruiter_number');
  });
  await knex.raw(`DROP SEQUENCE IF EXISTS recruiters_seq`);
}
