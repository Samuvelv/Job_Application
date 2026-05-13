// migrations/20240032_drop_salary_columns_from_candidates.ts
import { Knex } from 'knex';

// ─────────────────────────────────────────────────────────────────────────────
// ROOT CAUSE OF PREVIOUS MIGRATION ERROR:
//   The original version of this file called t.dropColumn() unconditionally.
//   If the salary columns had already been removed from the DB (manually or by
//   a partial earlier run), PostgreSQL threw:
//     "column "salary_min" of relation "candidates" does not exist"
//   and the entire migration batch was aborted.
//
// FIX — hasColumn guards on every dropColumn and addColumn call:
//   up()   — checks each column exists before dropping it → safe no-op if already gone.
//   down() — checks each column is absent before adding it → safe no-op if already present.
//
// On a FRESH database these columns were never created by any prior migration in
// this chain, so all four hasColumn checks return false and the entire up() is a
// no-op. The migration is recorded in knex_migrations and the chain continues.
//
// On an EXISTING database that still has the salary columns, they are dropped
// cleanly. If they were already dropped (schema drift / manual removal), the
// guards prevent the "column does not exist" error.
// ─────────────────────────────────────────────────────────────────────────────

export async function up(knex: Knex): Promise<void> {
  const [hasSalaryMin, hasSalaryMax, hasSalaryCurrency, hasSalaryType] =
    await Promise.all([
      knex.schema.hasColumn('candidates', 'salary_min'),
      knex.schema.hasColumn('candidates', 'salary_max'),
      knex.schema.hasColumn('candidates', 'salary_currency'),
      knex.schema.hasColumn('candidates', 'salary_type'),
    ]);

  // Only enter alterTable if at least one column still exists — avoids a
  // no-op ALTER TABLE statement being sent to PostgreSQL.
  if (hasSalaryMin || hasSalaryMax || hasSalaryCurrency || hasSalaryType) {
    await knex.schema.alterTable('candidates', (t) => {
      if (hasSalaryMin)      t.dropColumn('salary_min');
      if (hasSalaryMax)      t.dropColumn('salary_max');
      if (hasSalaryCurrency) t.dropColumn('salary_currency');
      if (hasSalaryType)     t.dropColumn('salary_type');
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  // Re-create the columns as nullable so rollback is safe even on a schema
  // that already has them (e.g. partial rollback on an existing DB).
  // NOTE: original data is permanently lost when up() runs — down() restores
  // the column structure only, not the data.
  const [hasSalaryMin, hasSalaryMax, hasSalaryCurrency, hasSalaryType] =
    await Promise.all([
      knex.schema.hasColumn('candidates', 'salary_min'),
      knex.schema.hasColumn('candidates', 'salary_max'),
      knex.schema.hasColumn('candidates', 'salary_currency'),
      knex.schema.hasColumn('candidates', 'salary_type'),
    ]);

  if (!hasSalaryMin || !hasSalaryMax || !hasSalaryCurrency || !hasSalaryType) {
    await knex.schema.alterTable('candidates', (t) => {
      if (!hasSalaryMin)      t.decimal('salary_min', 12, 2).nullable();
      if (!hasSalaryMax)      t.decimal('salary_max', 12, 2).nullable();
      if (!hasSalaryCurrency) t.string('salary_currency', 10).nullable();
      if (!hasSalaryType)     t.string('salary_type', 20).nullable();
    });
  }
}
