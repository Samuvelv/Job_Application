// migrations/20240063_add_super_admin_role.ts
import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex('roles').insert({ name: 'super_admin' }).onConflict('name').ignore();
}

export async function down(knex: Knex): Promise<void> {
  const inUse = await knex('users')
    .join('roles', 'roles.id', 'users.role_id')
    .where('roles.name', 'super_admin')
    .first();
  if (inUse) throw new Error('Cannot drop super_admin role while users reference it.');

  await knex('roles').where({ name: 'super_admin' }).delete();
}
