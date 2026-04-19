// migrations/20240013_add_plain_password.ts
import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('candidates', (t) => {
    t.string('plain_password', 255).nullable();
  });
  await knex.schema.alterTable('recruiters', (t) => {
    t.string('plain_password', 255).nullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('candidates', (t) => {
    t.dropColumn('plain_password');
  });
  await knex.schema.alterTable('recruiters', (t) => {
    t.dropColumn('plain_password');
  });
}
