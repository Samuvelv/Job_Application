import type { Knex } from 'knex';

// migrations/20240016b_import_production_data.ts
// PLACEHOLDER — intentional no-op to preserve migration history.
//
// Runs immediately after 20240016_create_admins.ts (Knex sorts alphabetically,
// so "20240016_" < "20240016b_"). Do NOT add logic to this file — create a new
// migration with prefix 20240057_ or higher for any new work.
export async function up(_knex: Knex): Promise<void> {
  // No-op — placeholder only
}

export async function down(_knex: Knex): Promise<void> {
  // No-op — placeholder only
}
