export type CertificateType =
  | 'participation'
  | 'winner'
  | 'runner_up'
  | 'best_team'
  | 'judge'
  | 'volunteer'
  | 'organizer'
  | 'mentor';

export interface CertificateDesignConfig {
  title: string;
  subtitle?: string;
  primary_color: string;
  secondary_color: string;
  accent_badge?: string;
  background_style?: string;
  border_style?: string;
  signature_title_1?: string;
  signature_name_1?: string;
  signature_title_2?: string;
  signature_name_2?: string;
  custom_body_text?: string;
}

export interface CertificateTemplate {
  id: string;
  certificate_type: CertificateType;
  version: number;
  design_config: CertificateDesignConfig;
  created_at: string;
  is_active: boolean;
}

export interface Certificate {
  id: string;
  certificate_id: string;
  edition_id: string;
  team_id: string | null;
  recipient_name: string;
  certificate_type: CertificateType;
  template_id: string;
  template_version: number;
  issued_at: string;
  status: 'valid' | 'revoked';
  revoked_reason?: string | null;
  pdf_url?: string | null;
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
  template?: CertificateTemplate;
}

export interface AuditLogEntry {
  id: string;
  admin_id: string;
  action: string;
  details: Record<string, any>;
  created_at: string;
}
