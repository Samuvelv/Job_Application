// migrations/20240054_add_whatsapp_number_to_volunteers.ts
import type { Knex } from 'knex';

// ─────────────────────────────────────────────────────────────────────────────
// Previously named 20240051_add_whatsapp_number_to_volunteers.ts, which
// clashed with the existing 20240051_add_revocation_fields_to_agency_interest_requests.ts.
//
// Knex resolves ties alphabetically, so the two 20240051_ files ran in an
// unpredictable order depending on filesystem sort. Renaming to 20240054_
// (first number after 20240053_create_admin_otps.ts) gives this migration a
// stable, unambiguous position at the end of the chain.
//
// hasColumn guards added to both up() and down() so the migration is fully
// idempotent and safe for partially-migrated or schema-drifted databases.
// ─────────────────────────────────────────────────────────────────────────────

export async function up(knex: Knex): Promise<void> {
  const hasColumn = await knex.schema.hasColumn('volunteers', 'whatsapp_number');
  if (!hasColumn) {
    await knex.schema.alterTable('volunteers', (table) => {
      table.string('whatsapp_number', 50).nullable();
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  const hasColumn = await knex.schema.hasColumn('volunteers', 'whatsapp_number');
  if (hasColumn) {
    await knex.schema.alterTable('volunteers', (table) => {
      table.dropColumn('whatsapp_number');
    });
  }
}
