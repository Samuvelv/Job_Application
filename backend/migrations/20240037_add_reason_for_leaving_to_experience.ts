// migrations/20240037_add_reason_for_leaving_to_experience.ts
import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const hasColumn = await knex.schema.hasColumn('candidate_experience', 'reason_for_leaving');
  if (!hasColumn) {
    await knex.schema.alterTable('candidate_experience', (t) => {
      t.string('reason_for_leaving', 200).nullable();
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  const hasColumn = await knex.schema.hasColumn('candidate_experience', 'reason_for_leaving');
  if (hasColumn) {
    await knex.schema.alterTable('candidate_experience', (t) => {
      t.dropColumn('reason_for_leaving');
    });
  }
}
