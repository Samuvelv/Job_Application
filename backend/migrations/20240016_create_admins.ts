// migrations/20240016_create_admins.ts
// Creates the dedicated admins table linked to users via user_id FK.
// Note: previously misnamed 20240016_add_name_to_users.ts — this file does NOT
// alter the users table. It creates a separate admins profile table.
import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('admins', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('user_id').notNullable().unique().references('id').inTable('users').onDelete('CASCADE');
    t.string('first_name', 100).notNullable();
    t.string('last_name', 100).nullable();
    t.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    t.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now());
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('admins');
}
