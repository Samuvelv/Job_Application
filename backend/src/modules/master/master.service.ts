// src/modules/master/master.service.ts
// Generic CRUD service layer for all master data tables.
// One service drives all 10 tables — add new tables via ALLOWED_TABLES config.
import { db } from '../../config/db';
import { AppError } from '../../middleware/errorHandler';

// ── Allowed tables whitelist ──────────────────────────────────────────────────
// Prevents SQL injection via table-name path param.
export const ALLOWED_TABLES = [
  'master_countries',
  'master_cities',
  'master_occupations',
  'master_job_titles',
  'master_industries',
  'master_languages',
  'master_degrees',
  'master_fields_of_study',
  'master_notice_periods',
  'master_hobbies',
] as const;

export type MasterTable = typeof ALLOWED_TABLES[number];

// ── Per-table schema metadata ─────────────────────────────────────────────────
// uniqueField  : column used for duplicate checks (null = no duplicate check)
// labelField   : human-readable column for display (used in error messages)
// searchFields : columns to search against
// selectCols   : columns to SELECT on list/getOne

interface TableMeta {
  uniqueField:   string | null;
  labelField:    string;
  searchFields:  string[];
  selectCols:    string[];
  defaultOrder:  string;
}

const TABLE_META: Record<MasterTable, TableMeta> = {
  master_countries: {
    uniqueField:  'iso2',
    labelField:   'name',
    searchFields: ['name', 'iso2', 'dial_code'],
    selectCols:   ['id', 'name', 'iso2', 'dial_code', 'flag_emoji', 'created_at', 'updated_at', 'deleted_at'],
    defaultOrder: 'name',
  },
  master_cities: {
    uniqueField:  null,
    labelField:   'name',
    searchFields: ['name'],
    selectCols:   ['id', 'country_id', 'name', 'created_at', 'updated_at', 'deleted_at'],
    defaultOrder: 'name',
  },
  master_occupations: {
    uniqueField:  'name',
    labelField:   'name',
    searchFields: ['name'],
    selectCols:   ['id', 'name', 'created_at', 'updated_at', 'deleted_at'],
    defaultOrder: 'name',
  },
  master_job_titles: {
    uniqueField:  null,
    labelField:   'title',
    searchFields: ['title'],
    selectCols:   ['id', 'title', 'occupation_id', 'created_at', 'updated_at', 'deleted_at'],
    defaultOrder: 'title',
  },
  master_industries: {
    uniqueField:  'name',
    labelField:   'name',
    searchFields: ['name'],
    selectCols:   ['id', 'name', 'created_at', 'updated_at', 'deleted_at'],
    defaultOrder: 'name',
  },
  master_languages: {
    uniqueField:  'name',
    labelField:   'name',
    searchFields: ['name'],
    selectCols:   ['id', 'name', 'created_at', 'updated_at', 'deleted_at'],
    defaultOrder: 'name',
  },
  master_degrees: {
    uniqueField:  'name',
    labelField:   'name',
    searchFields: ['name'],
    selectCols:   ['id', 'name', 'created_at', 'updated_at', 'deleted_at'],
    defaultOrder: 'name',
  },
  master_fields_of_study: {
    uniqueField:  'name',
    labelField:   'name',
    searchFields: ['name'],
    selectCols:   ['id', 'name', 'created_at', 'updated_at', 'deleted_at'],
    defaultOrder: 'name',
  },
  master_notice_periods: {
    uniqueField:  'label',
    labelField:   'label',
    searchFields: ['label'],
    selectCols:   ['id', 'label', 'days', 'created_at', 'updated_at', 'deleted_at'],
    defaultOrder: 'days',
  },
  master_hobbies: {
    uniqueField:  'name',
    labelField:   'name',
    searchFields: ['name'],
    selectCols:   ['id', 'name', 'created_at', 'updated_at', 'deleted_at'],
    defaultOrder: 'name',
  },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

export function assertAllowedTable(table: string): MasterTable {
  if (!(ALLOWED_TABLES as readonly string[]).includes(table)) {
    throw new AppError(400, `Unknown master table: "${table}"`);
  }
  return table as MasterTable;
}

function getMeta(table: MasterTable): TableMeta {
  return TABLE_META[table];
}

// ── Pagination helper ─────────────────────────────────────────────────────────

export interface PaginationMeta {
  page:  number;
  limit: number;
  total: number;
  pages: number;
}

// ── list ──────────────────────────────────────────────────────────────────────

export interface ListOptions {
  page?:           number;
  limit?:          number;
  search?:         string;
  includeDeleted?: boolean;
  sortBy?:         string;
  sortDir?:        'asc' | 'desc';
}

export async function listMasterRecords(
  table: MasterTable,
  opts: ListOptions = {},
): Promise<{ data: any[]; pagination: PaginationMeta }> {
  const meta    = getMeta(table);
  const page    = Math.max(1, opts.page  ?? 1);
  const limit   = Math.min(200, Math.max(1, opts.limit ?? 25));
  const offset  = (page - 1) * limit;
  const sortBy  = opts.sortBy  ?? meta.defaultOrder;
  const sortDir = (opts.sortDir === 'desc' ? 'desc' : 'asc') as 'asc' | 'desc';

  // Build base query
  let query = db(table);

  // Soft-delete filter
  if (!opts.includeDeleted) {
    query = query.whereNull('deleted_at');
  }

  // Search
  if (opts.search?.trim()) {
    const term = `%${opts.search.trim().toLowerCase()}%`;
    query = query.where((qb) => {
      for (const col of meta.searchFields) {
        qb.orWhereRaw(`LOWER(${col}::text) LIKE ?`, [term]);
      }
    });
  }

  // Special: job titles — join occupation name
  if (table === 'master_job_titles') {
    const countQuery = query.clone().count({ total: '*' }).first();
    const [countRow, rows] = await Promise.all([
      countQuery,
      db('master_job_titles as jt')
        .leftJoin('master_occupations as o', 'o.id', 'jt.occupation_id')
        .modify((qb) => {
          if (!opts.includeDeleted) qb.whereNull('jt.deleted_at');
          if (opts.search?.trim()) {
            const term = `%${opts.search.trim().toLowerCase()}%`;
            qb.where((inner) => {
              inner
                .orWhereRaw(`LOWER(jt.title) LIKE ?`, [term])
                .orWhereRaw(`LOWER(o.name) LIKE ?`, [term]);
            });
          }
        })
        .select(
          'jt.id', 'jt.title', 'jt.occupation_id',
          'o.name as occupation_name',
          'jt.created_at', 'jt.updated_at', 'jt.deleted_at',
        )
        .orderBy(`jt.${sortBy === 'title' ? 'title' : sortBy}`, sortDir)
        .limit(limit)
        .offset(offset),
    ]);
    const total = Number((countRow as any)?.total ?? 0);
    return { data: rows, pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 } };
  }

  // Special: cities — join country name
  if (table === 'master_cities') {
    const countQuery = query.clone().count({ total: '*' }).first();
    const [countRow, rows] = await Promise.all([
      countQuery,
      db('master_cities as c')
        .leftJoin('master_countries as co', 'co.id', 'c.country_id')
        .modify((qb) => {
          if (!opts.includeDeleted) qb.whereNull('c.deleted_at');
          if (opts.search?.trim()) {
            const term = `%${opts.search.trim().toLowerCase()}%`;
            qb.where((inner) => {
              inner
                .orWhereRaw(`LOWER(c.name) LIKE ?`, [term])
                .orWhereRaw(`LOWER(co.name) LIKE ?`, [term]);
            });
          }
        })
        .select(
          'c.id', 'c.name', 'c.country_id',
          'co.name as country_name',
          'c.created_at', 'c.updated_at', 'c.deleted_at',
        )
        .orderBy(`c.${sortBy === 'name' ? 'name' : sortBy}`, sortDir)
        .limit(limit)
        .offset(offset),
    ]);
    const total = Number((countRow as any)?.total ?? 0);
    return { data: rows, pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 } };
  }

  // Generic path
  const [countRow, rows] = await Promise.all([
    query.clone().count({ total: '*' }).first(),
    query.clone()
      .select(meta.selectCols)
      .orderBy(sortBy, sortDir)
      .limit(limit)
      .offset(offset),
  ]);

  const total = Number((countRow as any)?.total ?? 0);
  return { data: rows, pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 } };
}

// ── getOne ────────────────────────────────────────────────────────────────────

export async function getMasterRecord(table: MasterTable, id: number): Promise<any> {
  const meta = getMeta(table);
  let row: any;

  if (table === 'master_job_titles') {
    row = await db('master_job_titles as jt')
      .leftJoin('master_occupations as o', 'o.id', 'jt.occupation_id')
      .select('jt.*', 'o.name as occupation_name')
      .where('jt.id', id)
      .first();
  } else if (table === 'master_cities') {
    row = await db('master_cities as c')
      .leftJoin('master_countries as co', 'co.id', 'c.country_id')
      .select('c.*', 'co.name as country_name')
      .where('c.id', id)
      .first();
  } else {
    row = await db(table).select(meta.selectCols).where({ id }).first();
  }

  if (!row) throw new AppError(404, `Record not found in ${table} (id=${id})`);
  return row;
}

// ── create ────────────────────────────────────────────────────────────────────

export async function createMasterRecord(table: MasterTable, payload: Record<string, any>): Promise<any> {
  const meta = getMeta(table);

  // Duplicate check on unique field
  if (meta.uniqueField && payload[meta.uniqueField] != null) {
    const existing = await db(table)
      .whereRaw(`LOWER(${meta.uniqueField}::text) = LOWER(?)`, [String(payload[meta.uniqueField])])
      .whereNull('deleted_at')
      .first();
    if (existing) {
      throw new AppError(409, `A record with this ${meta.uniqueField} already exists.`);
    }
  }

  const now = new Date();
  const insertPayload = { ...payload, created_at: now, updated_at: now };

  const [inserted] = await db(table).insert(insertPayload).returning('id');
  const newId = typeof inserted === 'object' ? inserted.id : inserted;
  return getMasterRecord(table, newId);
}

// ── update ────────────────────────────────────────────────────────────────────

export async function updateMasterRecord(
  table: MasterTable,
  id: number,
  payload: Record<string, any>,
): Promise<any> {
  const meta = getMeta(table);

  // Ensure record exists and is not deleted
  const existing = await db(table).where({ id }).first();
  if (!existing) throw new AppError(404, `Record not found in ${table} (id=${id})`);
  if (existing.deleted_at) throw new AppError(400, 'Cannot update a deleted record. Restore it first.');

  // Duplicate check: ensure unique field value is not taken by another row
  if (meta.uniqueField && payload[meta.uniqueField] != null) {
    const dupe = await db(table)
      .whereRaw(`LOWER(${meta.uniqueField}::text) = LOWER(?)`, [String(payload[meta.uniqueField])])
      .whereNull('deleted_at')
      .whereNot({ id })
      .first();
    if (dupe) {
      throw new AppError(409, `Another record with this ${meta.uniqueField} already exists.`);
    }
  }

  await db(table)
    .where({ id })
    .update({ ...payload, updated_at: new Date() });

  return getMasterRecord(table, id);
}

// ── softDelete ────────────────────────────────────────────────────────────────

export async function softDeleteMasterRecord(table: MasterTable, id: number): Promise<void> {
  const existing = await db(table).where({ id }).first();
  if (!existing) throw new AppError(404, `Record not found in ${table} (id=${id})`);
  if (existing.deleted_at) throw new AppError(400, 'Record is already deleted.');

  await db(table).where({ id }).update({ deleted_at: new Date(), updated_at: new Date() });
}

// ── restore ───────────────────────────────────────────────────────────────────

export async function restoreMasterRecord(table: MasterTable, id: number): Promise<any> {
  const existing = await db(table).where({ id }).first();
  if (!existing) throw new AppError(404, `Record not found in ${table} (id=${id})`);
  if (!existing.deleted_at) throw new AppError(400, 'Record is not deleted.');

  await db(table).where({ id }).update({ deleted_at: null, updated_at: new Date() });
  return getMasterRecord(table, id);
}
