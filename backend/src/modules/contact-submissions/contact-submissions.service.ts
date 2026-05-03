import { db } from '../../config/db';
import { sendAdminContactRequestNotification } from '../../services/email.service';

export interface CreateSubmissionDto {
  name:     string;
  email:    string;
  phone?:   string | null;
  subject?: string | null;
  message:  string;
}

export async function createSubmission(data: CreateSubmissionDto) {
  const [row] = await db('contact_submissions')
    .insert({
      name:    data.name.trim(),
      email:   data.email.trim().toLowerCase(),
      phone:   data.phone?.trim() || null,
      subject: data.subject?.trim() || null,
      message: data.message.trim(),
    })
    .returning('*');

  // Send admin notification (non-fatal)
  sendAdminContactRequestNotification(
    data.name.trim(),
    data.email.trim().toLowerCase(),
  ).catch(() => { /* non-fatal */ });

  return row;
}

export async function listSubmissions(page = 1, limit = 10) {
  const offset = (page - 1) * limit;
  const [rows, countRow] = await Promise.all([
    db('contact_submissions')
      .orderBy('submitted_at', 'desc')
      .limit(limit)
      .offset(offset),
    db('contact_submissions').count('id as total').first(),
  ]);
  const total = Number((countRow as any)?.total ?? 0);
  return { data: rows, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
}

export async function markRead(id: string) {
  await db('contact_submissions').where({ id }).update({ is_read: true });
}

export async function unreadCount(): Promise<number> {
  const row = await db('contact_submissions').where({ is_read: false }).count('id as count').first();
  return Number((row as any)?.count ?? 0);
}
