import type { Knex } from 'knex';

// PLACEHOLDER — migration 20240009 was deleted from source control.
//
// If this filename appears in the knex_migrations table on an existing database,
// that means it was once applied. The schema changes it made are unknown but
// were superseded by subsequent migrations (007 through 010 cover the same
// candidates/master_hobbies area).
//
// On a FRESH database this migration has never run and this no-op is safe.
// On an EXISTING database that already has this row in knex_migrations, Knex
// will skip it automatically because the name is already recorded.
//
// Do NOT add logic here. Create a new migration with prefix 20240054_ or higher.
export async function up(_knex: Knex): Promise<void> {
  // No-op placeholder
}

export async function down(_knex: Knex): Promise<void> {
  // No-op placeholder
}
