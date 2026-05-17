// src/modules/master/master-admin.controller.ts
// Admin-only CRUD controller — drives all master tables via a single generic handler.
import { Request, Response, NextFunction } from 'express';
import { z, ZodObject, ZodSchema, ZodRawShape } from 'zod';
import {
  assertAllowedTable,
  ALLOWED_TABLES,
  listMasterRecords,
  getMasterRecord,
  createMasterRecord,
  updateMasterRecord,
  softDeleteMasterRecord,
  restoreMasterRecord,
} from './master.service';
import { logAudit } from '../../services/audit.service';
import { db }       from '../../config/db';

// ── Per-table Zod schemas ─────────────────────────────────────────────────────

const nameSchema    = z.string().min(1).max(150).trim();
const optStrSchema  = z.string().max(50).trim().optional();

const TABLE_SCHEMAS: Record<string, ZodObject<ZodRawShape>> = {
  master_countries: z.object({
    name:       nameSchema,
    iso2:       z.string().min(2).max(2).trim().toUpperCase(),
    dial_code:  z.string().min(1).max(10).trim(),
    flag_emoji: optStrSchema,
  }),
  master_cities: z.object({
    name:       nameSchema,
    country_id: z.coerce.number().int().positive(),
  }),
  master_occupations:    z.object({ name: nameSchema }),
  master_job_titles:     z.object({
    title:        nameSchema,
    occupation_id: z.coerce.number().int().positive(),
  }),
  master_industries:     z.object({ name: nameSchema }),
  master_languages:      z.object({ name: nameSchema }),
  master_degrees:        z.object({ name: nameSchema }),
  master_fields_of_study: z.object({ name: nameSchema }),
  master_notice_periods: z.object({
    label: nameSchema,
    days:  z.coerce.number().int().min(0),
  }),
  master_hobbies: z.object({ name: nameSchema }),
};

function getSchema(table: string): ZodObject<ZodRawShape> {
  const s = TABLE_SCHEMAS[table];
  if (!s) throw new Error(`No schema for table: ${table}`);
  return s;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function p(v: string | string[]): string {
  return Array.isArray(v) ? v[0] : v;
}

// ── list ──────────────────────────────────────────────────────────────────────

export async function listRecords(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const table          = assertAllowedTable(p(req.params['table']));
    const page           = Number(req.query['page'])  || 1;
    const limit          = Number(req.query['limit']) || 25;
    const search         = (req.query['search']  as string) || '';
    const sortBy         = (req.query['sortBy']  as string) || '';
    const sortDir        = (req.query['sortDir'] as string) === 'desc' ? 'desc' : 'asc';
    const includeDeleted = req.query['includeDeleted'] === 'true';

    const result = await listMasterRecords(table, {
      page, limit, search, sortBy: sortBy || undefined, sortDir, includeDeleted,
    });
    res.json(result);
  } catch (err) { next(err); }
}

// ── getOne ────────────────────────────────────────────────────────────────────

export async function getRecord(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const table = assertAllowedTable(p(req.params['table']));
    const id    = Number(p(req.params['id']));
    if (!id) { res.status(400).json({ message: 'Invalid id' }); return; }
    const row = await getMasterRecord(table, id);
    res.json(row);
  } catch (err) { next(err); }
}

// ── create ────────────────────────────────────────────────────────────────────

export async function createRecord(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const table  = assertAllowedTable(p(req.params['table']));
    const schema = getSchema(table);
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(422).json({ message: 'Validation failed', errors: parsed.error.flatten().fieldErrors });
      return;
    }
    const record = await createMasterRecord(table, parsed.data as Record<string, any>);
    await logAudit({
      userId:     req.user?.sub,
      action:     'MASTER_CREATE',
      resource:   table,
      resourceId: String(record.id),
      metadata:   { table, payload: parsed.data },
      ipAddress:  req.ip,
    });
    res.status(201).json({ message: 'Record created', data: record });
  } catch (err) { next(err); }
}

// ── update ────────────────────────────────────────────────────────────────────

export async function updateRecord(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const table  = assertAllowedTable(p(req.params['table']));
    const id     = Number(p(req.params['id']));
    if (!id) { res.status(400).json({ message: 'Invalid id' }); return; }
    const schema = getSchema(table);
    const parsed = schema.partial().safeParse(req.body);
    if (!parsed.success) {
      res.status(422).json({ message: 'Validation failed', errors: parsed.error.flatten().fieldErrors });
      return;
    }
    const record = await updateMasterRecord(table, id, parsed.data as Record<string, any>);
    await logAudit({
      userId:     req.user?.sub,
      action:     'MASTER_UPDATE',
      resource:   table,
      resourceId: String(id),
      metadata:   { table, payload: parsed.data },
      ipAddress:  req.ip,
    });
    res.json({ message: 'Record updated', data: record });
  } catch (err) { next(err); }
}

// ── softDelete ────────────────────────────────────────────────────────────────

export async function deleteRecord(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const table = assertAllowedTable(p(req.params['table']));
    const id    = Number(p(req.params['id']));
    if (!id) { res.status(400).json({ message: 'Invalid id' }); return; }
    await softDeleteMasterRecord(table, id);
    await logAudit({
      userId:     req.user?.sub,
      action:     'MASTER_DELETE',
      resource:   table,
      resourceId: String(id),
      metadata:   { table },
      ipAddress:  req.ip,
    });
    res.json({ message: 'Record deleted (soft)' });
  } catch (err) { next(err); }
}

// ── restore ───────────────────────────────────────────────────────────────────

export async function restoreRecord(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const table  = assertAllowedTable(p(req.params['table']));
    const id     = Number(p(req.params['id']));
    if (!id) { res.status(400).json({ message: 'Invalid id' }); return; }
    const record = await restoreMasterRecord(table, id);
    await logAudit({
      userId:     req.user?.sub,
      action:     'MASTER_RESTORE',
      resource:   table,
      resourceId: String(id),
      metadata:   { table },
      ipAddress:  req.ip,
    });
    res.json({ message: 'Record restored', data: record });
  } catch (err) { next(err); }
}

// ── counts ────────────────────────────────────────────────────────────────────

export async function getCounts(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const results = await Promise.all(
      ALLOWED_TABLES.map((table) =>
        db(table).whereNull('deleted_at').count<{ count: string }>('id as count').first()
          .then((row) => ({ table, count: Number(row?.count ?? 0) })),
      ),
    );
    const counts: Record<string, number> = {};
    for (const { table, count } of results) counts[table] = count;
    res.json(counts);
  } catch (err) { next(err); }
}
