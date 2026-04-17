// seeds/01_roles_and_admin.ts
import { Knex } from 'knex';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

export async function seed(knex: Knex): Promise<void> {
  // ── Roles ──────────────────────────────────────────────────────────────────
  await knex('roles').del();
  const roles = await knex('roles')
    .insert([
      { name: 'admin' },
      { name: 'candidate' },
      { name: 'recruiter' },
    ])
    .returning('*');

  const adminRole = roles.find((r) => r.name === 'admin');
  if (!adminRole) throw new Error('Admin role not found after seed');

  // ── Default admin user ─────────────────────────────────────────────────────
  const existingAdmin = await knex('users').where({ email: 'admin@talenthub.com' }).first();
  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash('Admin@1234', 12);
    await knex('users').insert({
      id: uuidv4(),
      email: 'admin@talenthub.com',
      password_hash: passwordHash,
      role_id: adminRole.id,
      is_active: true,
    });
    console.log('[SEED] Admin user created → admin@talenthub.com / Admin@1234');
  } else {
    console.log('[SEED] Admin user already exists, skipping.');
  }
}
