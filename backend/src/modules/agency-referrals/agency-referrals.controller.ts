// src/modules/agency-referrals/agency-referrals.controller.ts
import { Request, Response, NextFunction } from 'express';
import * as svc from './agency-referrals.service';
import { CreateAgencyReferralSchema, UpdateAgencyReferralSchema } from './agency-referrals.dto';
import { logAudit } from '../../services/audit.service';

const p = (v: string | string[]): string => (Array.isArray(v) ? v[0] : v);

export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const candidateId = p(req.params['candidateId']);
    const referrals = await svc.listReferrals(candidateId);
    res.json({ referrals });
  } catch (err) { next(err); }
}

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const candidateId = p(req.params['candidateId']);
    const dto = CreateAgencyReferralSchema.parse(req.body);
    const referral = await svc.createReferral(candidateId, dto, req.user!.sub);
    await logAudit({
      userId: req.user!.sub,
      action: 'CREATE_AGENCY_REFERRAL',
      resource: 'agency_referral',
      resourceId: referral.id,
      ipAddress: req.ip,
      metadata: { agency_name: referral.agency_name, candidate_id: candidateId },
    });
    res.status(201).json({ referral });
  } catch (err) { next(err); }
}

export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = p(req.params['referralId']);
    const dto = UpdateAgencyReferralSchema.parse(req.body);
    const before = await svc.getReferralById(id);
    const referral = await svc.updateReferral(id, dto);
    await logAudit({
      userId: req.user!.sub,
      action: 'UPDATE_AGENCY_REFERRAL',
      resource: 'agency_referral',
      resourceId: id,
      ipAddress: req.ip,
      metadata: {
        agency_name:    before.agency_name,
        candidate_id:   before.candidate_id,
        updated_fields: Object.keys(dto),
      },
    });
    res.json({ referral });
  } catch (err) { next(err); }
}

export async function remove(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = p(req.params['referralId']);
    const before = await svc.getReferralById(id);
    await svc.deleteReferral(id);
    await logAudit({
      userId: req.user!.sub,
      action: 'DELETE_AGENCY_REFERRAL',
      resource: 'agency_referral',
      resourceId: id,
      ipAddress: req.ip,
      metadata: {
        agency_name:  before.agency_name,
        candidate_id: before.candidate_id,
      },
    });
    res.json({ message: 'Referral deleted' });
  } catch (err) { next(err); }
}
