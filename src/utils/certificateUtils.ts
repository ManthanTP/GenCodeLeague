import { supabase } from '../lib/supabase';
import type { CertificateType } from '../types/certificates';

const TYPE_CODES: Record<CertificateType, string> = {
  participation: 'PART',
  winner: 'WIN',
  runner_up: 'RUN',
  best_team: 'TEAM',
  judge: 'JDG',
  volunteer: 'VOL',
  organizer: 'ORG',
  mentor: 'MNT',
};

/**
 * Extracts a concise edition code (e.g., "GCL26" from year 2026 or "GCL 2026").
 */
export function getEditionCode(year?: number | null, name?: string | null): string {
  if (year && year > 2000) {
    return `GCL${String(year).slice(-2)}`;
  }
  if (name) {
    const match = name.match(/20(\d{2})/);
    if (match) return `GCL${match[1]}`;
    const cleaned = name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    return cleaned.slice(0, 6) || 'GCLXX';
  }
  return 'GCL26';
}

/**
 * Generates an uppercase 6-character alphanumeric string without ambiguous characters.
 */
function generateRandomAlphaNum(length = 6): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Generates a human-readable, unique certificate ID:
 * Format: "{EditionCode}-{TypeCode}-{RandomAlphaNum}"
 * Example: "GCL26-PART-8F4K29"
 */
export function generateCertificateId(
  editionCode: string,
  certificateType: CertificateType
): string {
  const typeCode = TYPE_CODES[certificateType] || 'CERT';
  const randomPart = generateRandomAlphaNum(6);
  return `${editionCode.toUpperCase()}-${typeCode}-${randomPart}`;
}

/**
 * Logs an administrative event into the audit_log table.
 */
export async function logAdminAction(
  action: string,
  details: Record<string, any> = {}
): Promise<void> {
  try {
    const { data: authData } = await supabase.auth.getUser();
    const adminId = authData?.user?.email || authData?.user?.id || 'admin';

    await supabase.from('audit_log').insert({
      admin_id: adminId,
      action,
      details,
    });
  } catch (err) {
    console.error('Failed to log admin action to audit_log:', err);
  }
}
