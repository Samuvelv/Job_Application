// src/modules/master/master.controller.ts
import { Request, Response, NextFunction } from 'express';
import { db } from '../../config/db';

// ── Countries ─────────────────────────────────────────────────────────────────
export async function getCountries(_req: Request, res: Response, next: NextFunction) {
  try {
    const rows = await db('master_countries').select('id', 'name', 'iso2', 'dial_code', 'flag_emoji').orderBy('name');
    res.json(rows);
  } catch (err) { next(err); }
}

// ── Cities (filtered by country_id) ──────────────────────────────────────────
export async function getCities(req: Request, res: Response, next: NextFunction) {
  try {
    const countryId = req.query['country_id'];
    if (!countryId) { res.json([]); return; }
    const rows = await db('master_cities')
      .where({ country_id: Number(countryId) })
      .select('id', 'name')
      .orderBy('name');
    res.json(rows);
  } catch (err) { next(err); }
}

// ── Job Titles (with occupation_id + occupation name) ─────────────────────────
export async function getJobTitles(_req: Request, res: Response, next: NextFunction) {
  try {
    const rows = await db('master_job_titles as jt')
      .join('master_occupations as o', 'o.id', 'jt.occupation_id')
      .select('jt.id', 'jt.title', 'jt.occupation_id', 'o.name as occupation_name')
      .orderBy('jt.title');
    res.json(rows);
  } catch (err) { next(err); }
}

// ── Occupations ────────────────────────────────────────────────────────────────
export async function getOccupations(_req: Request, res: Response, next: NextFunction) {
  try {
    const rows = await db('master_occupations').select('id', 'name').orderBy('name');
    res.json(rows);
  } catch (err) { next(err); }
}

// ── Industries ────────────────────────────────────────────────────────────────
export async function getIndustries(_req: Request, res: Response, next: NextFunction) {
  try {
    const rows = await db('master_industries').select('id', 'name').orderBy('name');
    res.json(rows);
  } catch (err) { next(err); }
}

// ── Languages ─────────────────────────────────────────────────────────────────
export async function getLanguages(_req: Request, res: Response, next: NextFunction) {
  try {
    const rows = await db('master_languages').select('id', 'name').orderBy('name');
    res.json(rows);
  } catch (err) { next(err); }
}

// ── Degrees ───────────────────────────────────────────────────────────────────
export async function getDegrees(_req: Request, res: Response, next: NextFunction) {
  try {
    const rows = await db('master_degrees').select('id', 'name').orderBy('id');
    res.json(rows);
  } catch (err) { next(err); }
}

// ── Fields of Study ───────────────────────────────────────────────────────────
export async function getFieldsOfStudy(_req: Request, res: Response, next: NextFunction) {
  try {
    const rows = await db('master_fields_of_study').select('id', 'name').orderBy('name');
    res.json(rows);
  } catch (err) { next(err); }
}

// ── Currencies ────────────────────────────────────────────────────────────────
export async function getCurrencies(_req: Request, res: Response, next: NextFunction) {
  try {
    const rows = await db('master_currencies').select('id', 'code', 'name', 'symbol').orderBy('code');
    res.json(rows);
  } catch (err) { next(err); }
}

// ── Notice Periods ────────────────────────────────────────────────────────────
export async function getNoticePeriods(_req: Request, res: Response, next: NextFunction) {
  try {
    const rows = await db('master_notice_periods').select('id', 'label', 'days').orderBy('days');
    res.json(rows);
  } catch (err) { next(err); }
}
