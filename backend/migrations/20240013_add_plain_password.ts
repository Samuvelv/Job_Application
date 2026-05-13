// migrations/20240013_add_plain_password.ts
// NOTE: Storing plain-text passwords is a security anti-pattern.
// This column is retained for legacy admin-display purposes only.
// It is scheduled for removal in migration 20240054_drop_plain_password.ts.
import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const [hasCandidateCol, hasRecruiterCol] = await Promise.all([
    knex.schema.hasColumn('candidates', 'plain_password'),
    knex.schema.hasColumn('recruiters', 'plain_password'),
  ]);

  if (!hasCandidateCol) {
    await knex.schema.alterTable('candidates', (t) => {
      t.string('plain_password', 255).nullable();
    });
  }
  if (!hasRecruiterCol) {
    await knex.schema.alterTable('recruiters', (t) => {
      t.string('plain_password', 255).nullable();
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  const [hasCandidateCol, hasRecruiterCol] = await Promise.all([
    knex.schema.hasColumn('candidates', 'plain_password'),
    knex.schema.hasColumn('recruiters', 'plain_password'),
  ]);

  if (hasCandidateCol) {
    await knex.schema.alterTable('candidates', (t) => {
      t.dropColumn('plain_password');
    });
  }
  if (hasRecruiterCol) {
    await knex.schema.alterTable('recruiters', (t) => {
      t.dropColumn('plain_password');
    });
  }
}
