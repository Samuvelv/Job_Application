import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const hasStart = await knex.schema.hasColumn('candidate_education', 'start_month');
  const hasEnd   = await knex.schema.hasColumn('candidate_education', 'end_month');

  await knex.schema.alterTable('candidate_education', (t) => {
    if (!hasStart) t.tinyint('start_month').nullable();
    if (!hasEnd)   t.tinyint('end_month').nullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  const hasStart = await knex.schema.hasColumn('candidate_education', 'start_month');
  const hasEnd   = await knex.schema.hasColumn('candidate_education', 'end_month');

  await knex.schema.alterTable('candidate_education', (t) => {
    if (hasStart) t.dropColumn('start_month');
    if (hasEnd)   t.dropColumn('end_month');
  });
}
