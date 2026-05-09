// migrations/20240032_drop_salary_columns_from_candidates.ts
import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('candidates', (t) => {
    t.dropColumn('salary_min');
    t.dropColumn('salary_max');
    t.dropColumn('salary_currency');
    t.dropColumn('salary_type');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('candidates', (t) => {
    t.decimal('salary_min', 12, 2).nullable();
    t.decimal('salary_max', 12, 2).nullable();
    t.string('salary_currency', 10).nullable();
    t.string('salary_type', 20).nullable();
  });
}
