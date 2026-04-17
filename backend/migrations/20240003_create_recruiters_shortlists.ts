// migrations/20240003_create_recruiters_shortlists.ts
import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('recruiters', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('user_id').unique().notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.string('company_name', 200).nullable();
    t.string('contact_name', 200).nullable();
    t.uuid('created_by').nullable().references('id').inTable('users').onDelete('SET NULL');
    t.timestamp('access_expires_at', { useTz: true }).notNullable();
    t.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('recruiter_access_tokens', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('recruiter_id').notNullable().references('id').inTable('recruiters').onDelete('CASCADE');
    t.text('token_hash').unique().notNullable(); // SHA-256 of JWT jti
    t.timestamp('expires_at', { useTz: true }).notNullable();
    t.boolean('revoked').defaultTo(false);
    t.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('shortlists', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('recruiter_id').notNullable().references('id').inTable('recruiters').onDelete('CASCADE');
    t.uuid('candidate_id').notNullable().references('id').inTable('candidates').onDelete('CASCADE');
    t.text('notes').nullable();
    t.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    t.unique(['recruiter_id', 'candidate_id']);
  });

  await knex.schema.createTable('audit_logs', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('user_id').nullable().references('id').inTable('users').onDelete('SET NULL');
    t.string('action', 100).notNullable();
    t.string('resource', 100).nullable();
    t.uuid('resource_id').nullable();
    t.jsonb('metadata').nullable();
    t.specificType('ip_address', 'inet').nullable();
    t.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
  });

  await knex.raw('CREATE INDEX idx_shortlists_recruiter ON shortlists(recruiter_id)');
  await knex.raw('CREATE INDEX idx_audit_logs_user      ON audit_logs(user_id)');
  await knex.raw('CREATE INDEX idx_audit_logs_action    ON audit_logs(action)');
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('audit_logs');
  await knex.schema.dropTableIfExists('shortlists');
  await knex.schema.dropTableIfExists('recruiter_access_tokens');
  await knex.schema.dropTableIfExists('recruiters');
}
