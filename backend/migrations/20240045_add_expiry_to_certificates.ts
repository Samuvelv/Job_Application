import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const [hasExpiry, hasNoExpiry] = await Promise.all([
    knex.schema.hasColumn('candidate_certificates', 'expiry_date'),
    knex.schema.hasColumn('candidate_certificates', 'no_expiry'),
  ]);

  await knex.schema.alterTable('candidate_certificates', (t) => {
    if (!hasExpiry)   t.date('expiry_date').nullable();
    if (!hasNoExpiry) t.boolean('no_expiry').notNullable().defaultTo(false);
  });
}

export async function down(knex: Knex): Promise<void> {
  const [hasExpiry, hasNoExpiry] = await Promise.all([
    knex.schema.hasColumn('candidate_certificates', 'expiry_date'),
    knex.schema.hasColumn('candidate_certificates', 'no_expiry'),
  ]);

  await knex.schema.alterTable('candidate_certificates', (t) => {
    if (hasExpiry)   t.dropColumn('expiry_date');
    if (hasNoExpiry) t.dropColumn('no_expiry');
  });
}
