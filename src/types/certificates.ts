export type CertificateType =
  | 'participation'
  | 'winner'
  | 'runner_up'
  | 'best_team'
  | 'judge'
  | 'volunteer'
  | 'organizer'
  | 'mentor';

/**
 * Simplified certificate record — stores ONLY metadata.
 * No PDF URL, no design_config. The PDF is generated on-demand
 * in the browser using the single global certificate template image.
 */
export interface Certificate {
  id: string;
  certificate_id: string;
  edition_id: string;
  team_id: string | null;
  recipient_name: string;
  certificate_type: CertificateType;
  achievement: string | null;
  custom_title?: string | null;
  custom_subtitle?: string | null;
  template_version: number;
  issued_at: string;
  status: 'valid' | 'revoked';
  revoked_reason?: string | null;
  verify_view_count: number;
  edition?: {
    id: string;
    name: string;
    year: number;
  };
  team?: {
    id: string;
    name: string;
  } | null;
}

export interface AuditLogEntry {
  id: string;
  admin_id: string;
  action: string;
  details: Record<string, any>;
  created_at: string;
}

export interface CertificateSignatory {
  name?: string;
  role: string;
  org: string;
  signature_url?: string | null;
}

export interface CertificateSettings {
  logo_url?: string | null;
  emblem_url?: string | null;
  season_name?: string;
  presented_to_text?: string;
  default_description?: string;
  signatory_left: CertificateSignatory;
  signatory_right: CertificateSignatory;
}


