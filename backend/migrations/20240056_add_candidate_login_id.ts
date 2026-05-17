import type { Knex } from 'knex';

/**
 * Migration: Add numeric login_id to candidates
 *
 * - Creates PostgreSQL sequence  candidate_login_id_seq  starting at 10001
 * - Adds login_id INTEGER column (nullable first so the backfill can run)
 * - Backfills all existing candidates ordered by created_at ASC so the
 *   oldest candidate gets 10001, next gets 10002, etc.
 * - Advances the sequence to MAX(login_id)+1 so new inserts continue cleanly
 * - Alters the column to NOT NULL
 * - Adds a UNIQUE index for login-lookup performance
 */
export async function up(knex: Knex): Promise<void> {
  // 1. Create the sequence starting at 10001
  await knex.raw(`CREATE SEQUENCE IF NOT EXISTS candidate_login_id_seq START 10001 INCREMENT 1`);

  // 2. Add the column as nullable so we can backfill existing rows
  await knex.schema.alterTable('candidates', (table) => {
    table.integer('login_id').nullable().unique();
  });

  // 3. Backfill: assign sequential IDs to all existing candidates (oldest first)
  await knex.raw(`
    WITH ordered AS (
      SELECT id,
             (10001 + ROW_NUMBER() OVER (ORDER BY created_at ASC) - 1)::integer AS new_login_id
      FROM candidates
      WHERE login_id IS NULL
    )
    UPDATE candidates
    SET login_id = ordered.new_login_id
    FROM ordered
    WHERE candidates.id = ordered.id
  `);

  // 4. Advance the sequence so nextval() picks up after the highest backfilled value
  await knex.raw(`
    SELECT setval(
      'candidate_login_id_seq',
      COALESCE((SELECT MAX(login_id) FROM candidates), 10000) + 1,
      false
    )
  `);

  // 5. Now that every row has a value, enforce NOT NULL
  await knex.raw(`ALTER TABLE candidates ALTER COLUMN login_id SET NOT NULL`);

  // 6. Add a dedicated index for fast login lookups (unique constraint already
  //    creates an implicit index, but an explicit named one aids query planning)
  await knex.raw(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_candidates_login_id ON candidates (login_id)
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(`DROP INDEX IF EXISTS idx_candidates_login_id`);
  await knex.schema.alterTable('candidates', (table) => {
    table.dropColumn('login_id');
  });
  await knex.raw(`DROP SEQUENCE IF EXISTS candidate_login_id_seq`);
}
