import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const hasColumn = await knex.schema.hasColumn('candidate_skills', 'description');
  if (!hasColumn) {
    await knex.schema.alterTable('candidate_skills', (t) => {
      t.text('description').nullable();
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  const hasColumn = await knex.schema.hasColumn('candidate_skills', 'description');
  if (hasColumn) {
    await knex.schema.alterTable('candidate_skills', (t) => {
      t.dropColumn('description');
    });
  }
}
