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
  let adminUserId: string;

  const existingAdmin = await knex('users').where({ email: 'admin@talenthub.com' }).first();
  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash('Admin@1234', 12);
    adminUserId = uuidv4();
    await knex('users').insert({
      id: adminUserId,
      email: 'admin@talenthub.com',
      password_hash: passwordHash,
      role_id: adminRole.id,
      is_active: true,
    });
    console.log('[SEED] Admin user created → admin@talenthub.com / Admin@1234');
  } else {
    adminUserId = existingAdmin.id;
    console.log('[SEED] Admin user already exists, skipping.');
  }

  // ── Admin profile ──────────────────────────────────────────────────────────
  const existingProfile = await knex('admins').where({ user_id: adminUserId }).first();
  if (!existingProfile) {
    await knex('admins').insert({ user_id: adminUserId, first_name: 'Dinesh', last_name: null });
    console.log('[SEED] Admin profile created → first_name: Dinesh');
  } else {
    await knex('admins').where({ user_id: adminUserId }).update({ first_name: 'Dinesh' });
    console.log('[SEED] Admin profile already exists — first_name updated.');
  }
}
