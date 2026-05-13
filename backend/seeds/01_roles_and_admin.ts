// seeds/01_roles_and_admin.ts
import { Knex } from 'knex';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

// ─────────────────────────────────────────────────────────────────────────────
// ROOT CAUSE OF PREVIOUS FK ERROR:
//   The original seed called `knex('roles').del()` as its first statement.
//   Because `users.role_id` has ON DELETE RESTRICT, PostgreSQL refuses to
//   delete any role that is still referenced by a user row — even the admin
//   user created by this very seed on a previous run.
//
// FIX — non-destructive upsert strategy:
//   • Roles   → INSERT ... ON CONFLICT (name) DO NOTHING
//               Roles that already exist are left untouched; new ones are added.
//   • Users   → existence check + INSERT only if absent (unchanged behaviour,
//               but now the role lookup is done against the live DB rather than
//               a just-deleted-and-re-inserted set).
//   • Admins  → existence check + INSERT / UPDATE (unchanged behaviour).
//
// This seed is now fully re-runnable on a live database without wiping any data.
// ─────────────────────────────────────────────────────────────────────────────

export async function seed(knex: Knex): Promise<void> {
  // ── Roles — safe upsert, never deletes ────────────────────────────────────
  // ON CONFLICT DO NOTHING: if the role already exists the row is skipped;
  // if it is new it is inserted. No existing FK references are disturbed.
  await knex('roles')
    .insert([{ name: 'admin' }, { name: 'candidate' }, { name: 'recruiter' }])
    .onConflict('name')
    .ignore();

  // Fetch the admin role id from the live table (works whether just inserted or
  // already present from a previous run).
  const adminRole = await knex('roles').where({ name: 'admin' }).first();
  if (!adminRole) throw new Error('[SEED] Admin role not found — roles table may be empty or migration has not run.');

  // ── Default admin user ─────────────────────────────────────────────────────
  let adminUserId: string;

  const existingAdmin = await knex('users').where({ email: 'admin@ntlcareernexus.com' }).first();
  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash('Admin@1234', 12);
    adminUserId = uuidv4();
    await knex('users').insert({
      id: adminUserId,
      email: 'admin@ntlcareernexus.com',
      password_hash: passwordHash,
      role_id: adminRole.id,
      is_active: true,
    });
    console.log('[SEED] Admin user created → admin@ntlcareernexus.com / Admin@1234');
  } else {
    adminUserId = existingAdmin.id;
    console.log('[SEED] Admin user already exists, skipping insert.');
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
