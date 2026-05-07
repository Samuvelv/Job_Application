// src/modules/volunteers/volunteers.service.ts
import { db } from '../../config/db';
import { AppError } from '../../middleware/errorHandler';
import type { CreateVolunteerDto, UpdateVolunteerDto } from './volunteers.dto';

export async function listVolunteers(filters: {
  search?: string;
  country_placed?: string;
  availability?: string;
  language?: string;
  sort?: string;
  page: number;
  limit: number;
}) {
  const { search, country_placed, availability, language, sort, page, limit } = filters;
  const offset = (page - 1) * limit;

  let query = db('volunteers').select('*');
  let countQuery = db('volunteers');

  function applyFilters(q: any) {
    if (search) {
      const term = `%${search}%`;
      q = q.where((b: any) =>
        b.whereILike('name', term).orWhereILike('role', term).orWhereILike('email', term),
      );
    }
    if (country_placed) q = q.whereILike('country_placed', `%${country_placed}%`);
    if (availability)   q = q.where('availability', availability);
    if (language)       q = q.whereRaw(`languages::jsonb @> ?::jsonb`, [JSON.stringify([language])]);
    return q;
  }

  query      = applyFilters(query);
  countQuery = applyFilters(countQuery);

  // Sort
  let orderCol = 'created_at';
  let orderDir: 'asc' | 'desc' = 'desc';
  if (sort === 'oldest')     { orderCol = 'created_at';      orderDir = 'asc'; }
  if (sort === 'name_asc')   { orderCol = 'name';            orderDir = 'asc'; }
  if (sort === 'most_helpful') { orderCol = 'candidates_helped'; orderDir = 'desc'; }

  const [{ count }] = await countQuery.count('id as count');
  const data        = await query.orderBy(orderCol, orderDir).limit(limit).offset(offset);
  const total       = Number(count);

  return { data, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
}

export async function exportVolunteers(filters: {
  search?: string;
  country_placed?: string;
  availability?: string;
  language?: string;
  sort?: string;
}) {
  const { search, country_placed, availability, language, sort } = filters;

  let q = db('volunteers').select('*');

  if (search) {
    const term = `%${search}%`;
    q = q.where((b: any) =>
      b.whereILike('name', term).orWhereILike('role', term).orWhereILike('email', term),
    );
  }
  if (country_placed) q = q.whereILike('country_placed', `%${country_placed}%`);
  if (availability)   q = q.where('availability', availability);
  if (language)       q = q.whereRaw(`languages::jsonb @> ?::jsonb`, [JSON.stringify([language])]);

  let orderCol = 'created_at';
  let orderDir: 'asc' | 'desc' = 'desc';
  if (sort === 'oldest')       { orderCol = 'created_at';      orderDir = 'asc'; }
  if (sort === 'name_asc')     { orderCol = 'name';            orderDir = 'asc'; }
  if (sort === 'most_helpful') { orderCol = 'candidates_helped'; orderDir = 'desc'; }

  const rows = await q.orderBy(orderCol, orderDir);

  const headers = ['Name', 'Email', 'Phone', 'Role', 'Nationality', 'Country Placed', 'Year Placed', 'Languages', 'Availability', 'Candidates Helped', 'Created At'];
  const escape = (v: unknown) => {
    const s = String(v ?? '').replace(/"/g, '""');
    return `"${s}"`;
  };
  const lines = [
    headers.map(escape).join(','),
    ...rows.map((r: any) => [
      r.name, r.email ?? '', r.phone ?? '', r.role ?? '',
      r.nationality ?? '', r.country_placed ?? '',
      r.year_placed ?? '',
      Array.isArray(r.languages) ? r.languages.join('; ') : (r.languages ? JSON.parse(r.languages).join('; ') : ''),
      r.availability ?? '', r.candidates_helped ?? 0,
      new Date(r.created_at).toISOString().split('T')[0],
    ].map(escape).join(',')),
  ];
  return lines.join('\n');
}

export async function createVolunteer(dto: CreateVolunteerDto, createdBy: string) {
  const [row] = await db('volunteers')
    .insert({
      name:               dto.name,
      email:              dto.email              ?? null,
      phone:              dto.phone              ?? null,
      role:               dto.role               ?? null,
      notes:              dto.notes              ?? null,
      photo_url:          dto.photo_url          ?? null,
      nationality:        dto.nationality        ?? null,
      country_placed:     dto.country_placed     ?? null,
      company_joined:     dto.company_joined     ?? null,
      year_placed:        dto.year_placed        ?? null,
      languages:          dto.languages          ? JSON.stringify(dto.languages) : null,
      success_story:      dto.success_story      ?? null,
      support_method:     dto.support_method     ?? null,
      contact_preference: dto.contact_preference ?? null,
      availability:       dto.availability       ?? 'Active',
      consent:            dto.consent            ?? false,
      candidates_helped:  dto.candidates_helped  ?? 0,
      created_by:         createdBy,
    })
    .returning('*');
  return row;
}

export async function updateVolunteer(id: string, dto: UpdateVolunteerDto) {
  const existing = await db('volunteers').where({ id }).first();
  if (!existing) throw new AppError(404, 'Volunteer not found');

  const patch: Record<string, unknown> = { updated_at: new Date() };
  if (dto.name               !== undefined) patch['name']               = dto.name;
  if (dto.email              !== undefined) patch['email']              = dto.email              ?? null;
  if (dto.phone              !== undefined) patch['phone']              = dto.phone              ?? null;
  if (dto.role               !== undefined) patch['role']               = dto.role               ?? null;
  if (dto.notes              !== undefined) patch['notes']              = dto.notes              ?? null;
  if (dto.photo_url          !== undefined) patch['photo_url']          = dto.photo_url          ?? null;
  if (dto.nationality        !== undefined) patch['nationality']        = dto.nationality        ?? null;
  if (dto.country_placed     !== undefined) patch['country_placed']     = dto.country_placed     ?? null;
  if (dto.company_joined     !== undefined) patch['company_joined']     = dto.company_joined     ?? null;
  if (dto.year_placed        !== undefined) patch['year_placed']        = dto.year_placed        ?? null;
  if (dto.languages          !== undefined) patch['languages']          = dto.languages ? JSON.stringify(dto.languages) : null;
  if (dto.success_story      !== undefined) patch['success_story']      = dto.success_story      ?? null;
  if (dto.support_method     !== undefined) patch['support_method']     = dto.support_method     ?? null;
  if (dto.contact_preference !== undefined) patch['contact_preference'] = dto.contact_preference ?? null;
  if (dto.availability       !== undefined) patch['availability']       = dto.availability       ?? null;
  if (dto.consent            !== undefined) patch['consent']            = dto.consent            ?? false;
  if (dto.candidates_helped  !== undefined) patch['candidates_helped']  = dto.candidates_helped;

  const [row] = await db('volunteers').where({ id }).update(patch).returning('*');
  return row;
}

export async function getVolunteerById(id: string) {
  const row = await db('volunteers').where({ id }).first();
  if (!row) throw new AppError(404, 'Volunteer not found');
  return row;
}

export async function updateVolunteerPhoto(id: string, photoUrl: string) {
  const existing = await db('volunteers').where({ id }).first();
  if (!existing) throw new AppError(404, 'Volunteer not found');
  const [row] = await db('volunteers')
    .where({ id })
    .update({ photo_url: photoUrl, updated_at: new Date() })
    .returning('*');
  return row;
}

export async function deleteVolunteer(id: string) {
  const existing = await db('volunteers').where({ id }).first();
  if (!existing) throw new AppError(404, 'Volunteer not found');
  await db('volunteers').where({ id }).delete();
}
