// src/modules/admin-management/admin-management.service.ts
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../../config/db';
import { AppError } from '../../middleware/errorHandler';
import { sendAdminCredentials, sendAdminPasswordReset } from '../../services/email.service';
import type { CreateAdminDto, AdminFilterDto } from './admin-management.dto';

async function getRoleId(roleName: string): Promise<number> {
  const role = await db('roles').where({ name: roleName }).first();
  if (!role) throw new AppError(500, `Role "${roleName}" not found. Run seeds first.`);
  return role.id;
}

/** Generates a random, URL-safe temporary password (never persisted in plaintext). */
function generateTempPassword(): string {
  return crypto.randomBytes(12).toString('base64url');
}

/** Throws if the target user is not an "admin" role — used to keep super_admin accounts untouchable here. */
async function assertIsManagedAdmin(userId: string): Promise<void> {
  const row = await db('users as u')
    .join('roles as r', 'r.id', 'u.role_id')
    .where('u.id', userId)
    .select('r.name')
    .first();
  if (!row || row.name !== 'admin') {
    throw new AppError(404, 'Admin not found');
  }
}

// ── Create admin ───────────────────────────────────────────────────────────────

export async function createAdmin(dto: CreateAdminDto) {
  const existing = await db('users').where({ email: dto.email.toLowerCase() }).first();
  if (existing) throw new AppError(409, 'Email is already registered');

  const adminRoleId = await getRoleId('admin');
  const passwordHash = await bcrypt.hash(dto.password, 12);
  const userId = uuidv4();

  await db.transaction(async (trx) => {
    await trx('users').insert({
      id:            userId,
      email:         dto.email.toLowerCase(),
      password_hash: passwordHash,
      role_id:       adminRoleId,
      is_active:     true,
    });

    await trx('admins').insert({
      user_id:    userId,
      first_name: dto.first_name,
      last_name:  dto.last_name ?? null,
    });
  });

  sendAdminCredentials(dto.email.toLowerCase(), dto.first_name, dto.password)
    .catch((err) => console.error('[EMAIL] Failed to send admin credentials:', err));

  return getAdminById(userId);
}

// ── List admins (admin role only — excludes super_admin) ──────────────────────

export async function listAdmins(filters: AdminFilterDto) {
  const { page, limit, search, status } = filters;
  const offset = (page - 1) * limit;

  const applyFilters = (b: any) => {
    b.where('r.name', 'admin');
    if (search) {
      b.where((inner: any) =>
        inner.whereILike('a.first_name', `%${search}%`)
             .orWhereILike('a.last_name', `%${search}%`)
             .orWhereILike('u.email', `%${search}%`),
      );
    }
    if (status) b.where('u.is_active', status === 'active');
  };

  let query = db('admins as a')
    .join('users as u', 'u.id', 'a.user_id')
    .join('roles as r', 'r.id', 'u.role_id')
    .select(
      'u.id',
      'u.email',
      'a.first_name',
      'a.last_name',
      'u.is_active',
      'u.created_at',
    )
    .modify(applyFilters);

  const [{ count }] = await db('admins as a')
    .join('users as u', 'u.id', 'a.user_id')
    .join('roles as r', 'r.id', 'u.role_id')
    .modify(applyFilters)
    .count('u.id as count');

  const data = await query.orderBy('u.created_at', 'desc').limit(limit).offset(offset);

  return {
    data,
    pagination: {
      page,
      limit,
      total: Number(count),
      pages: Math.ceil(Number(count) / limit),
    },
  };
}

export async function getAdminById(userId: string) {
  const admin = await db('admins as a')
    .join('users as u', 'u.id', 'a.user_id')
    .join('roles as r', 'r.id', 'u.role_id')
    .where('u.id', userId)
    .where('r.name', 'admin')
    .select('u.id', 'u.email', 'a.first_name', 'a.last_name', 'u.is_active', 'u.created_at')
    .first();

  if (!admin) throw new AppError(404, 'Admin not found');
  return admin;
}

// ── Activate / deactivate ───────────────────────────────────────────────────────

export async function setAdminActive(userId: string, isActive: boolean) {
  await assertIsManagedAdmin(userId);
  await db('users').where({ id: userId }).update({ is_active: isActive });
  return getAdminById(userId);
}

// ── Reset password ──────────────────────────────────────────────────────────────

export async function resetAdminPassword(userId: string) {
  await assertIsManagedAdmin(userId);

  const admin = await getAdminById(userId);
  const tempPassword = generateTempPassword();
  const passwordHash = await bcrypt.hash(tempPassword, 12);

  await db('users').where({ id: userId }).update({ password_hash: passwordHash });

  sendAdminPasswordReset(admin.email, admin.first_name, tempPassword)
    .catch((err) => console.error('[EMAIL] Failed to send admin password reset:', err));

  return admin;
}
