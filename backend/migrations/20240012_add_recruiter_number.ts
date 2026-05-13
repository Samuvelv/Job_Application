// migrations/20240012_add_recruiter_number.ts
import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // CREATE SEQUENCE IF NOT EXISTS is already idempotent
  await knex.raw(`CREATE SEQUENCE IF NOT EXISTS recruiters_seq START 1 INCREMENT 1`);

  const hasColumn = await knex.schema.hasColumn('recruiters', 'recruiter_number');
  if (!hasColumn) {
    await knex.schema.alterTable('recruiters', (t) => {
      t.string('recruiter_number', 20).nullable().unique();
    });
  }

  // Backfill existing rows that have no number yet
  await knex.raw(`
    UPDATE recruiters
    SET recruiter_number = 'REC-' || LPAD(nextval('recruiters_seq')::text, 4, '0')
    WHERE recruiter_number IS NULL
  `);
}

export async function down(knex: Knex): Promise<void> {
  const hasColumn = await knex.schema.hasColumn('recruiters', 'recruiter_number');
  if (hasColumn) {
    await knex.schema.alterTable('recruiters', (t) => {
      t.dropColumn('recruiter_number');
    });
  }
  await knex.raw(`DROP SEQUENCE IF EXISTS recruiters_seq`);
}
