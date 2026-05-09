// src/services/whatsapp.service.ts
import { env } from '../config/env';

// Twilio client is loaded lazily so missing credentials don't crash startup
let _client: import('twilio').Twilio | null = null;

function getClient(): import('twilio').Twilio | null {
  if (_client) return _client;

  if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN) {
    return null;
  }

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const twilio = require('twilio');
  _client = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN) as import('twilio').Twilio;
  return _client;
}

/**
 * Send a WhatsApp message via Twilio.
 * @param to   Recipient phone number in E.164 format (e.g. "+447911123456")
 * @param body Message text
 */
export async function sendWhatsAppMessage(to: string, body: string): Promise<void> {
  const client = getClient();

  if (!client) {
    console.warn('⚠️  Twilio credentials not configured — skipping WhatsApp message');
    return;
  }

  if (!env.TWILIO_WHATSAPP_FROM) {
    console.warn('⚠️  TWILIO_WHATSAPP_FROM not configured — skipping WhatsApp message');
    return;
  }

  const from = env.TWILIO_WHATSAPP_FROM.startsWith('whatsapp:')
    ? env.TWILIO_WHATSAPP_FROM
    : `whatsapp:${env.TWILIO_WHATSAPP_FROM}`;

  const toFormatted = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;

  const message = await client.messages.create({ from, to: toFormatted, body });
  console.log(`📲  WhatsApp sent → SID: ${message.sid} | To: ${to}`);
}
