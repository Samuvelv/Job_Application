import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const [hasRevokedAt, hasRevokedBy, hasReason] = await Promise.all([
    knex.schema.hasColumn('agency_interest_requests', 'revoked_at'),
    knex.schema.hasColumn('agency_interest_requests', 'revoked_by_id'),
    knex.schema.hasColumn('agency_interest_requests', 'revocation_reason'),
  ]);

  await knex.schema.alterTable('agency_interest_requests', (t) => {
    if (!hasRevokedAt) t.timestamp('revoked_at', { useTz: true }).nullable();
    if (!hasRevokedBy) t.uuid('revoked_by_id').nullable().references('id').inTable('users').onDelete('SET NULL');
    if (!hasReason)    t.text('revocation_reason').nullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  const [hasRevokedAt, hasRevokedBy, hasReason] = await Promise.all([
    knex.schema.hasColumn('agency_interest_requests', 'revoked_at'),
    knex.schema.hasColumn('agency_interest_requests', 'revoked_by_id'),
    knex.schema.hasColumn('agency_interest_requests', 'revocation_reason'),
  ]);

  await knex.schema.alterTable('agency_interest_requests', (t) => {
    if (hasReason)    t.dropColumn('revocation_reason');
    if (hasRevokedBy) t.dropColumn('revoked_by_id');
    if (hasRevokedAt) t.dropColumn('revoked_at');
  });
}
