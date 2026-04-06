// migrations/20240001_create_roles_users.ts
import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Enable uuid generation
  await knex.raw('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');

  // Roles lookup table
  await knex.schema.createTable('roles', (t) => {
    t.increments('id').primary();
    t.string('name', 50).unique().notNullable();
  });

  // Users table
  await knex.schema.createTable('users', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.string('email', 255).unique().notNullable();
    t.text('password_hash').notNullable();
    t.integer('role_id').notNullable().references('id').inTable('roles').onDelete('RESTRICT');
    t.boolean('is_active').defaultTo(true);
    t.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    t.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now());
  });

  // Refresh tokens for rotation
  await knex.schema.createTable('refresh_tokens', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.text('token_hash').unique().notNullable();
    t.timestamp('expires_at', { useTz: true }).notNullable();
    t.boolean('revoked').defaultTo(false);
    t.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('refresh_tokens');
  await knex.schema.dropTableIfExists('users');
  await knex.schema.dropTableIfExists('roles');
}
