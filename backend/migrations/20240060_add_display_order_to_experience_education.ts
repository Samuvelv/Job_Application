import type { Knex } from 'knex';

/**
 * Adds display_order to candidate_experience and candidate_education.
 *
 * Existing rows receive DEFAULT 0 so they remain valid until the admin
 * re-saves the candidate (at which point the frontend sends sequential
 * display_order values based on the current UI order).
 *
 * The fetch queries use "ORDER BY display_order ASC, <date_col> DESC"
 * so existing zero-order records fall back to date-based ordering until
 * explicitly reordered and saved.
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('candidate_experience', (table) => {
    table.integer('display_order').notNullable().defaultTo(0);
  });

  await knex.schema.alterTable('candidate_education', (table) => {
    table.integer('display_order').notNullable().defaultTo(0);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('candidate_experience', (table) => {
    table.dropColumn('display_order');
  });

  await knex.schema.alterTable('candidate_education', (table) => {
    table.dropColumn('display_order');
  });
}
