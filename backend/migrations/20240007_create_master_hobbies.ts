import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('master_hobbies', (t) => {
    t.increments('id').primary();
    t.string('name', 100).notNullable().unique();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('master_hobbies');
}
