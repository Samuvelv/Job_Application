import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // 1. Drop old FK if it exists
  await knex.raw(`
    ALTER TABLE shortlists
    DROP CONSTRAINT IF EXISTS shortlists_employee_id_foreign
  `);

  // 2. Rename column only if it exists
  const hasEmployeeId = await knex.schema.hasColumn('shortlists', 'employee_id');
  if (hasEmployeeId) {
    await knex.raw(`
      ALTER TABLE shortlists
      RENAME COLUMN employee_id TO candidate_id
    `);
  }

  // 3. Add new FK only if it doesn't already exist
  await knex.raw(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'shortlists_candidate_id_foreign'
      ) THEN
        ALTER TABLE shortlists
        ADD CONSTRAINT shortlists_candidate_id_foreign
        FOREIGN KEY (candidate_id)
        REFERENCES candidates(id)
        ON DELETE CASCADE;
      END IF;
    END$$;
  `);

  // 4. Rename NOT NULL constraint (safe)
  await knex.raw(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'shortlists_employee_id_not_null'
      ) THEN
        ALTER TABLE shortlists
        RENAME CONSTRAINT shortlists_employee_id_not_null
        TO shortlists_candidate_id_not_null;
      END IF;
    END$$;
  `);

  // 5. Rename unique index safely
  await knex.raw(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM pg_class
        WHERE relname = 'shortlists_recruiter_id_employee_id_unique'
      ) THEN
        ALTER INDEX shortlists_recruiter_id_employee_id_unique
        RENAME TO shortlists_recruiter_id_candidate_id_unique;
      END IF;
    END$$;
  `);
}

export async function down(knex: Knex): Promise<void> {
  // Reverse safely

  await knex.raw(`
    ALTER TABLE shortlists
    DROP CONSTRAINT IF EXISTS shortlists_candidate_id_foreign
  `);

  const hasCandidateId = await knex.schema.hasColumn('shortlists', 'candidate_id');
  if (hasCandidateId) {
    await knex.raw(`
      ALTER TABLE shortlists
      RENAME COLUMN candidate_id TO employee_id
    `);
  }

  await knex.raw(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'shortlists_employee_id_foreign'
      ) THEN
        ALTER TABLE shortlists
        ADD CONSTRAINT shortlists_employee_id_foreign
        FOREIGN KEY (employee_id)
        REFERENCES employees(id)
        ON DELETE CASCADE;
      END IF;
    END$$;
  `);

  await knex.raw(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'shortlists_candidate_id_not_null'
      ) THEN
        ALTER TABLE shortlists
        RENAME CONSTRAINT shortlists_candidate_id_not_null
        TO shortlists_employee_id_not_null;
      END IF;
    END$$;
  `);

  await knex.raw(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM pg_class
        WHERE relname = 'shortlists_recruiter_id_candidate_id_unique'
      ) THEN
        ALTER INDEX shortlists_recruiter_id_candidate_id_unique
        RENAME TO shortlists_recruiter_id_employee_id_unique;
      END IF;
    END$$;
  `);
}