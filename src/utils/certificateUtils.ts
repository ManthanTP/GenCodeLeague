import { supabase } from '../lib/supabase';
import type { CertificateType, CertificateSettings } from '../types/certificates';

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
 * Human-readable certificate type labels.
 */
export const CERTIFICATE_TYPE_LABELS: Record<CertificateType, string> = {
  participation: 'Participation',
  winner: 'Winner (Champion)',
  runner_up: 'Runner Up (2nd Place)',
  best_team: 'Best Team Dynamics',
  judge: 'Honorary Judge',
  volunteer: 'Volunteer',
  organizer: 'Core Organizer',
  mentor: 'Technical Mentor',
};

/**
 * All valid certificate types.
 */
export const ALL_CERTIFICATE_TYPES: CertificateType[] = [
  'participation',
  'winner',
  'runner_up',
  'best_team',
  'judge',
  'volunteer',
  'organizer',
  'mentor',
];

/**
 * Maps a certificate type to its display title on the certificate.
 */
export function getCertificateTitle(type: CertificateType): string {
  switch (type) {
    case 'winner':
      return 'ACHIEVEMENT';
    case 'runner_up':
      return 'ACHIEVEMENT';
    case 'best_team':
      return 'ACHIEVEMENT';
    default:
      return 'PARTICIPATION';
  }
}

/**
 * Gets the subtitle text for the certificate body.
 */
export function getCertificateSubtitle(
  type: CertificateType,
  achievement?: string | null
): string {
  switch (type) {
    case 'winner':
      return achievement || 'has been awarded Champion of GenCode League';
    case 'runner_up':
      return achievement || 'has been awarded Runner Up of GenCode League';
    case 'best_team':
      return achievement || 'has been awarded Best Team Dynamics in GenCode League';
    case 'judge':
      return 'has served as Honorary Judge for GenCode League';
    case 'volunteer':
      return 'has served as Volunteer for GenCode League';
    case 'organizer':
      return 'has served as Core Organizer for GenCode League';
    case 'mentor':
      return 'has served as Technical Mentor for GenCode League';
    default:
      return 'has actively participated in GenCode League as a proud member of';
  }
}

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

/**
 * Official default certificate settings.
 * Pre-populated with Faculty Coordinator and Convenor details.
 */
export const DEFAULT_CERTIFICATE_SETTINGS: CertificateSettings = {
  logo_url: null,
  emblem_url: null,
  season_name: 'NATIONAL CODING LEAGUE',
  presented_to_text: 'THIS IS PROUDLY PRESENTED TO',
  default_description: 'has actively participated in GenCode League as a proud member of',
  signatory_left: {
    name: '',
    role: 'FACULTY COORDINATOR',
    org: 'GenCode League',
    signature_url: null,
  },
  signatory_right: {
    name: '',
    role: 'CONVENOR',
    org: 'Department of CSE',
    signature_url: null,
  },
};


const SETTINGS_STORAGE_KEY = 'gcl_certificate_settings_';

/**
 * Fetches certificate settings for an edition, with localStorage cache fallback.
 */
export async function fetchCertificateSettings(
  editionId?: string
): Promise<CertificateSettings> {
  const cacheKey = `${SETTINGS_STORAGE_KEY}${editionId || 'default'}`;

  // 1. Try reading from memory/localStorage first for instant preview
  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed?.signatory_left && parsed?.signatory_right) {
        return { ...DEFAULT_CERTIFICATE_SETTINGS, ...parsed };
      }
    }
  } catch {
    // Ignore cache error
  }

  // 2. Fetch from database if editionId is provided
  if (editionId) {
    try {
      const { data, error } = await supabase
        .from('editions')
        .select('certificate_settings')
        .eq('id', editionId)
        .maybeSingle();

      if (!error && data?.certificate_settings) {
        const remoteSettings = data.certificate_settings as CertificateSettings;
        const merged: CertificateSettings = {
          ...DEFAULT_CERTIFICATE_SETTINGS,
          ...remoteSettings,
          signatory_left: {
            ...DEFAULT_CERTIFICATE_SETTINGS.signatory_left,
            ...(remoteSettings.signatory_left || {}),
          },
          signatory_right: {
            ...DEFAULT_CERTIFICATE_SETTINGS.signatory_right,
            ...(remoteSettings.signatory_right || {}),
          },
        };

        try {
          localStorage.setItem(cacheKey, JSON.stringify(merged));
        } catch {
          // Ignore storage error
        }

        return merged;
      }
    } catch (err) {
      console.warn('Failed to fetch certificate settings from database:', err);
    }
  }

  return DEFAULT_CERTIFICATE_SETTINGS;
}

/**
 * Saves certificate settings to the database and local cache.
 */
export async function saveCertificateSettings(
  editionId: string,
  settings: CertificateSettings
): Promise<void> {
  const cacheKey = `${SETTINGS_STORAGE_KEY}${editionId}`;

  // Update localStorage immediately
  try {
    localStorage.setItem(cacheKey, JSON.stringify(settings));
  } catch {
    // Ignore storage error
  }

  // Persist to Supabase editions table
  const { error } = await supabase
    .from('editions')
    .update({ certificate_settings: settings })
    .eq('id', editionId);

  if (error) {
    throw error;
  }
}
