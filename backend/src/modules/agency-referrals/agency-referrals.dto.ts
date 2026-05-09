// src/modules/agency-referrals/agency-referrals.dto.ts
import { z } from 'zod';

export const ReferralStatusEnum = z.enum(['pending', 'progressing', 'placed', 'not_suitable']);
export type ReferralStatus = z.infer<typeof ReferralStatusEnum>;

export const CreateAgencyReferralSchema = z.object({
  agency_name:   z.string().min(1).max(200),
  employer_name: z.string().min(1).max(200),
  country:       z.string().min(1).max(100),
  referral_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD'),
  status:        ReferralStatusEnum.default('pending'),
  notes:         z.string().max(5000).optional().nullable(),
});

export const UpdateAgencyReferralSchema = CreateAgencyReferralSchema.partial();

export type CreateAgencyReferralDto = z.infer<typeof CreateAgencyReferralSchema>;
export type UpdateAgencyReferralDto = z.infer<typeof UpdateAgencyReferralSchema>;
