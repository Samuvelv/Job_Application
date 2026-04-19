// src/modules/volunteers/volunteers.service.ts
import { db } from '../../config/db';
import { AppError } from '../../middleware/errorHandler';
import type { CreateVolunteerDto, UpdateVolunteerDto } from './volunteers.dto';

export async function listVolunteers(filters: {
  search?: string;
  page: number;
  limit: number;
}) {
  const { search, page, limit } = filters;
  const offset = (page - 1) * limit;

  let query = db('volunteers').select('*');
  let countQuery = db('volunteers');

  if (search) {
    const term = `%${search}%`;
    query      = query.where((b) =>
      b.whereILike('name', term).orWhereILike('role', term).orWhereILike('email', term),
    );
    countQuery = countQuery.where((b) =>
      b.whereILike('name', term).orWhereILike('role', term).orWhereILike('email', term),
    );
  }

  const [{ count }] = await countQuery.count('id as count');
  const data        = await query.orderBy('created_at', 'desc').limit(limit).offset(offset);
  const total       = Number(count);

  return { data, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
}

export async function createVolunteer(dto: CreateVolunteerDto, createdBy: string) {
  const [row] = await db('volunteers')
    .insert({
      name:       dto.name,
      email:      dto.email      ?? null,
      phone:      dto.phone      ?? null,
      role:       dto.role       ?? null,
      notes:      dto.notes      ?? null,
      created_by: createdBy,
    })
    .returning('*');
  return row;
}

export async function updateVolunteer(id: string, dto: UpdateVolunteerDto) {
  const existing = await db('volunteers').where({ id }).first();
  if (!existing) throw new AppError(404, 'Volunteer not found');

  const patch: Record<string, unknown> = { updated_at: new Date() };
  if (dto.name  !== undefined) patch['name']  = dto.name;
  if (dto.email !== undefined) patch['email'] = dto.email ?? null;
  if (dto.phone !== undefined) patch['phone'] = dto.phone ?? null;
  if (dto.role  !== undefined) patch['role']  = dto.role  ?? null;
  if (dto.notes !== undefined) patch['notes'] = dto.notes ?? null;

  const [row] = await db('volunteers').where({ id }).update(patch).returning('*');
  return row;
}

export async function deleteVolunteer(id: string) {
  const existing = await db('volunteers').where({ id }).first();
  if (!existing) throw new AppError(404, 'Volunteer not found');
  await db('volunteers').where({ id }).delete();
}
