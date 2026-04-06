// src/services/audit.service.ts
import { db } from '../config/db';
import { v4 as uuidv4 } from 'uuid';

interface AuditParams {
  userId?: string;
  action: string;
  resource?: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
}

export async function logAudit(params: AuditParams): Promise<void> {
  try {
    await db('audit_logs').insert({
      id: uuidv4(),
      user_id: params.userId ?? null,
      action: params.action,
      resource: params.resource ?? null,
      resource_id: params.resourceId ?? null,
      metadata: params.metadata ? JSON.stringify(params.metadata) : null,
      ip_address: params.ipAddress ?? null,
    });
  } catch (err) {
    // Audit log failure should never crash the app
    console.error('[AUDIT LOG ERROR]', err);
  }
}
