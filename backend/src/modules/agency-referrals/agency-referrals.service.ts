// src/modules/agency-referrals/agency-referrals.service.ts
import { v4 as uuidv4 } from 'uuid';
import { db } from '../../config/db';
import { AppError } from '../../middleware/errorHandler';
import type { CreateAgencyReferralDto, UpdateAgencyReferralDto } from './agency-referrals.dto';

export async function listReferrals(candidateId: string) {
  return db('candidate_agency_referrals')
    .where({ candidate_id: candidateId })
    .orderBy('referral_date', 'desc');
}

export async function getReferralById(id: string) {
  const row = await db('candidate_agency_referrals').where({ id }).first();
  if (!row) throw new AppError(404, 'Referral not found');
  return row;
}

export async function createReferral(
  candidateId: string,
  dto: CreateAgencyReferralDto,
  adminId: string,
) {
  const id = uuidv4();
  await db('candidate_agency_referrals').insert({
    id,
    candidate_id:  candidateId,
    agency_name:   dto.agency_name,
    employer_name: dto.employer_name,
    country:       dto.country,
    referral_date: dto.referral_date,
    status:        dto.status ?? 'pending',
    notes:         dto.notes ?? null,
    created_by_id: adminId,
  });
  return getReferralById(id);
}

export async function updateReferral(id: string, dto: UpdateAgencyReferralDto) {
  const existing = await db('candidate_agency_referrals').where({ id }).first();
  if (!existing) throw new AppError(404, 'Referral not found');
  await db('candidate_agency_referrals')
    .where({ id })
    .update({ ...dto, updated_at: new Date() });
  return getReferralById(id);
}

export async function deleteReferral(id: string) {
  const existing = await db('candidate_agency_referrals').where({ id }).first();
  if (!existing) throw new AppError(404, 'Referral not found');
  await db('candidate_agency_referrals').where({ id }).delete();
}
