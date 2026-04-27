import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('contact_submissions', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.string('name', 150).notNullable();
    t.string('email', 255).notNullable();
    t.string('phone', 50).nullable();
    t.string('subject', 255).nullable();
    t.text('message').notNullable();
    t.boolean('is_read').defaultTo(false);
    t.timestamp('submitted_at', { useTz: true }).defaultTo(knex.fn.now());
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('contact_submissions');
}
