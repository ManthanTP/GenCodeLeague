import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Award,
  Plus,
  Search,
  Filter,
  Eye,
  Download,
  Copy,
  Check,
  ShieldCheck,
  AlertTriangle,
  FileText,
  RefreshCw,
  ExternalLink,
  ShieldAlert,
  ChevronRight,
  Layers,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import CertificatePreview from './CertificatePreview';
import {
  generateCertificateId,
  getEditionCode,
  logAdminAction,
} from '../utils/certificateUtils';
import {
  generateCertificatePdfBlob,
  uploadCertificatePdf,
  downloadCertificatePdf,
} from '../utils/pdfGenerator';
import type {
  Certificate,
  CertificateTemplate,
  CertificateType,
} from '../types/certificates';
import type { Edition, Team } from '../types/database';

interface AdminCertificateManagerProps {
  currentEdition?: Edition | null;
  teams: Team[];
  onShowToast: (msg: string, type?: 'success' | 'error') => void;
  onNavigateBulk?: () => void;
}

const CERTIFICATE_TYPES: { type: CertificateType; label: string }[] = [
  { type: 'participation', label: 'Participation' },
  { type: 'winner', label: 'Winner (Champion)' },
  { type: 'runner_up', label: 'Runner Up (2nd Place)' },
  { type: 'best_team', label: 'Best Team Dynamics' },
  { type: 'judge', label: 'Honorary Judge' },
  { type: 'volunteer', label: 'Volunteer' },
  { type: 'organizer', label: 'Core Organizer' },
  { type: 'mentor', label: 'Technical Mentor' },
];

export default function AdminCertificateManager({
  currentEdition,
  teams,
  onShowToast,
  onNavigateBulk,
}: AdminCertificateManagerProps) {
  // Form states
  const [editions, setEditions] = useState<Edition[]>([]);
  const [selectedEditionId, setSelectedEditionId] = useState<string>(
    currentEdition?.id || ''
  );
  const [recipientName, setRecipientName] = useState('');
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [certificateType, setCertificateType] =
    useState<CertificateType>('participation');
  const [templates, setTemplates] = useState<CertificateTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');

  // UI / Action states
  const [generating, setGenerating] = useState(false);
  const [generatedCert, setGeneratedCert] = useState<Certificate | null>(null);
  const [certificatesList, setCertificatesList] = useState<Certificate[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Revoke Modal State
  const [certToRevoke, setCertToRevoke] = useState<Certificate | null>(null);
  const [revokedReason, setRevokedReason] = useState('');
  const [revoking, setRevoking] = useState(false);

  // Detail / Preview Modal
  const [previewCert, setPreviewCert] = useState<Certificate | null>(null);

  // Hidden preview ref for offscreen PDF generation
  const offscreenCertRef = useRef<HTMLDivElement>(null);

  // Load all editions for dropdown
  useEffect(() => {
    supabase
      .from('editions')
      .select('*')
      .order('year', { ascending: false })
      .then(({ data }) => {
        if (data) {
          setEditions(data);
          if (!selectedEditionId && data.length > 0) {
            setSelectedEditionId(data[0].id);
          }
        }
      });
  }, []);

  // Update selectedEditionId if currentEdition becomes available
  useEffect(() => {
    if (currentEdition?.id && !selectedEditionId) {
      setSelectedEditionId(currentEdition.id);
    }
  }, [currentEdition?.id]);

  // Load templates
  const loadTemplates = async () => {
    const { data } = await supabase
      .from('certificate_templates')
      .select('*')
      .order('version', { ascending: false });

    if (data) {
      setTemplates(data as CertificateTemplate[]);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  // Available templates for selected certificate_type
  const availableTemplates = useMemo(() => {
    return templates.filter((t) => t.certificate_type === certificateType);
  }, [templates, certificateType]);

  // Default to active template whenever type or available templates change
  useEffect(() => {
    const activeTemplate =
      availableTemplates.find((t) => t.is_active) || availableTemplates[0];
    if (activeTemplate) {
      setSelectedTemplateId(activeTemplate.id);
    } else {
      setSelectedTemplateId('');
    }
  }, [availableTemplates]);

  // Selected template object
  const activeTemplate = useMemo(() => {
    return (
      templates.find((t) => t.id === selectedTemplateId) ||
      availableTemplates[0] ||
      null
    );
  }, [templates, selectedTemplateId, availableTemplates]);

  // Load issued certificates list
  const loadCertificates = async () => {
    setLoadingList(true);
    try {
      let query = supabase
        .from('certificates')
        .select(`
          *,
          edition:editions(id, name, year),
          team:teams(id, name),
          template:certificate_templates(id, certificate_type, version, design_config)
        `)
        .order('issued_at', { ascending: false });

      if (selectedEditionId) {
        query = query.eq('edition_id', selectedEditionId);
      }

      const { data, error } = await query;
      if (!error && data) {
        setCertificatesList(data as unknown as Certificate[]);
      }
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    loadCertificates();
  }, [selectedEditionId]);

  // Selected edition object
  const activeEdition = useMemo(() => {
    return (
      editions.find((e) => e.id === selectedEditionId) ||
      currentEdition ||
      null
    );
  }, [editions, selectedEditionId, currentEdition]);

  // Preview Certificate ID
  const previewCertId = useMemo(() => {
    const edCode = getEditionCode(activeEdition?.year, activeEdition?.name);
    return `${edCode}-${certificateType.toUpperCase().slice(0, 4)}-SAMPLE`;
  }, [activeEdition, certificateType]);

  // Selected team object
  const activeTeam = useMemo(() => {
    return teams.find((t) => t.id === selectedTeamId) || null;
  }, [teams, selectedTeamId]);

  // Handle Single Certificate Generation
  const handleGenerateCertificate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipientName.trim()) {
      onShowToast('Please enter the recipient name', 'error');
      return;
    }
    if (!selectedEditionId) {
      onShowToast('Please select an event edition', 'error');
      return;
    }
    if (!activeTemplate) {
      onShowToast('No active template found for this certificate type', 'error');
      return;
    }

    setGenerating(true);

    try {
      const edCode = getEditionCode(activeEdition?.year, activeEdition?.name);
      const newCertId = generateCertificateId(edCode, certificateType);

      // Render offscreen PDF
      const offscreenElement = document.getElementById('offscreen-render-cert');
      let pdfUrl: string | null = null;

      if (offscreenElement) {
        const { blob } = await generateCertificatePdfBlob(
          offscreenElement,
          newCertId
        );
        pdfUrl = await uploadCertificatePdf(newCertId, blob);
      }

      // Insert certificate record into database
      const { data: insertedCert, error: insertError } = await supabase
        .from('certificates')
        .insert({
          certificate_id: newCertId,
          edition_id: selectedEditionId,
          team_id: selectedTeamId || null,
          recipient_name: recipientName.trim(),
          certificate_type: certificateType,
          template_id: activeTemplate.id,
          template_version: activeTemplate.version,
          status: 'valid',
          pdf_url: pdfUrl,
          verify_view_count: 0,
        })
        .select(`
          *,
          edition:editions(id, name, year),
          team:teams(id, name),
          template:certificate_templates(id, certificate_type, version, design_config)
        `)
        .single();

      if (insertError) {
        throw insertError;
      }

      // Log into audit_log
      await logAdminAction('SINGLE_CERTIFICATE_GENERATED', {
        certificate_id: newCertId,
        recipient_name: recipientName.trim(),
        certificate_type: certificateType,
        edition_id: selectedEditionId,
        team_id: selectedTeamId || null,
        template_version: activeTemplate.version,
      });

      onShowToast(`Certificate ${newCertId} generated successfully!`, 'success');
      setGeneratedCert(insertedCert as unknown as Certificate);
      setRecipientName('');
      loadCertificates();
    } catch (err: any) {
      onShowToast(err?.message || 'Failed to generate certificate', 'error');
    } finally {
      setGenerating(false);
    }
  };

  // Revoke Handler
  const handleConfirmRevoke = async () => {
    if (!certToRevoke) return;
    if (!revokedReason.trim()) {
      onShowToast('Revocation reason is strictly required.', 'error');
      return;
    }

    setRevoking(true);
    try {
      const { error } = await supabase
        .from('certificates')
        .update({
          status: 'revoked',
          revoked_reason: revokedReason.trim(),
        })
        .eq('id', certToRevoke.id);

      if (error) throw error;

      await logAdminAction('CERTIFICATE_REVOKED', {
        certificate_id: certToRevoke.certificate_id,
        recipient_name: certToRevoke.recipient_name,
        revoked_reason: revokedReason.trim(),
      });

      onShowToast(
        `Certificate ${certToRevoke.certificate_id} has been revoked.`,
        'success'
      );
      setCertToRevoke(null);
      setRevokedReason('');
      loadCertificates();
    } catch (err: any) {
      onShowToast(err?.message || 'Failed to revoke certificate', 'error');
    } finally {
      setRevoking(false);
    }
  };

  const handleCopyVerifyUrl = (certId: string) => {
    const url = `${window.location.origin}/verify/${certId}`;
    navigator.clipboard.writeText(url);
    setCopiedId(certId);
    onShowToast('Verification link copied to clipboard!', 'success');
    setTimeout(() => setCopiedId(null), 2500);
  };

  // Filtered certificates list
  const filteredCertificates = useMemo(() => {
    return certificatesList.filter((c) => {
      const matchesSearch =
        c.recipient_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.certificate_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.team?.name &&
          c.team.name.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesType =
        typeFilter === 'all' || c.certificate_type === typeFilter;

      return matchesSearch && matchesType;
    });
  }, [certificatesList, searchQuery, typeFilter]);

  return (
    <div className="space-y-8">
      {/* Top Banner & Fast Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-cyan-500/30 backdrop-blur-md shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-400/40 flex items-center justify-center text-cyan-400 shadow-[0_0_20px_rgba(0,240,255,0.2)]">
            <Award size={26} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white flex items-center gap-2">
              Certificate Command Center
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                LAYER A
              </span>
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Generate, preview, issue, and audit cryptographically verifiable certificates.
            </p>
          </div>
        </div>

        {onNavigateBulk && (
          <button
            onClick={onNavigateBulk}
            className="px-5 py-2.5 rounded-xl bg-indigo-600/80 hover:bg-indigo-500 text-white font-bold text-sm border border-indigo-400/30 flex items-center gap-2 shadow-[0_0_20px_rgba(99,102,241,0.3)] transition-all shrink-0"
          >
            <Layers size={18} /> Bulk Generation (CSV) →
          </button>
        )}
      </div>

      {/* Main Single Certificate Generation Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        {/* Left Form: Form Inputs */}
        <div className="xl:col-span-5 bg-slate-900/70 border border-slate-800 rounded-2xl p-6 backdrop-blur-md shadow-xl">
          <div className="flex items-center gap-2 mb-6 pb-4 border-b border-slate-800 text-cyan-400 font-bold text-lg">
            <Plus size={20} />
            <span>Issue Single Certificate</span>
          </div>

          <form onSubmit={handleGenerateCertificate} className="space-y-4">
            {/* Edition Selection */}
            <div>
              <label className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-1.5 block">
                Target Edition
              </label>
              <select
                value={selectedEditionId}
                onChange={(e) => setSelectedEditionId(e.target.value)}
                className="gcl-input w-full"
                required
              >
                {editions.map((ed) => (
                  <option key={ed.id} value={ed.id}>
                    {ed.name} ({ed.year}) {ed.is_current ? '— [CURRENT]' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Recipient Full Name */}
            <div>
              <label className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-1.5 block">
                Recipient Full Name *
              </label>
              <input
                type="text"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                placeholder="e.g. Alex Rivera"
                className="gcl-input w-full font-medium"
                required
              />
            </div>

            {/* Team Affiliation (Optional) */}
            <div>
              <label className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-1.5 block">
                Team Affiliation (Optional)
              </label>
              <select
                value={selectedTeamId}
                onChange={(e) => setSelectedTeamId(e.target.value)}
                className="gcl-input w-full"
              >
                <option value="">None / Individual Participant</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Certificate Type */}
            <div>
              <label className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-1.5 block">
                Certificate Type
              </label>
              <select
                value={certificateType}
                onChange={(e) =>
                  setCertificateType(e.target.value as CertificateType)
                }
                className="gcl-input w-full capitalize"
              >
                {CERTIFICATE_TYPES.map((ct) => (
                  <option key={ct.type} value={ct.type}>
                    {ct.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Template Version Selection */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs text-slate-400 uppercase font-bold tracking-wider">
                  Design Template
                </label>
                {activeTemplate?.is_active && (
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-500/40 px-2 py-0.5 rounded">
                    Active / Published
                  </span>
                )}
              </div>
              <select
                value={selectedTemplateId}
                onChange={(e) => setSelectedTemplateId(e.target.value)}
                className="gcl-input w-full font-mono text-xs"
              >
                {availableTemplates.map((t) => (
                  <option key={t.id} value={t.id}>
                    v{t.version} — {t.design_config.title || t.certificate_type}{' '}
                    {t.is_active ? '(Active)' : '(Archived Version)'}
                  </option>
                ))}
              </select>
            </div>

            {/* Generation Submit Button */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={generating || !recipientName.trim()}
                className="btn-login-submit w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-extrabold shadow-[0_0_25px_rgba(0,240,255,0.4)] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {generating ? (
                  <>
                    <RefreshCw size={18} className="animate-spin" />
                    Generating Cryptographic PDF...
                  </>
                ) : (
                  <>
                    <Award size={18} />
                    Issue & Sign Certificate
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Success banner if certificate was just generated */}
          {generatedCert && (
            <div className="mt-6 p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/40 shadow-lg space-y-3">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                <ShieldCheck size={18} />
                <span>Certificate Successfully Issued!</span>
              </div>
              <div className="font-mono text-xs text-white bg-slate-950 p-2 rounded border border-slate-800 break-all">
                ID: {generatedCert.certificate_id}
              </div>
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={() => handleCopyVerifyUrl(generatedCert.certificate_id)}
                  className="px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-xs font-semibold flex items-center gap-1.5 border border-slate-700"
                >
                  <Copy size={13} /> Copy Link
                </button>
                <a
                  href={`/verify/${generatedCert.certificate_id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 rounded bg-cyan-600/30 hover:bg-cyan-600/50 text-cyan-300 text-xs font-semibold flex items-center gap-1.5 border border-cyan-500/40"
                >
                  <ExternalLink size={13} /> Public Verify
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Right Form: Live Interactive Preview */}
        <div className="xl:col-span-7 bg-slate-900/70 border border-slate-800 rounded-2xl p-6 backdrop-blur-md shadow-xl flex flex-col items-center">
          <div className="w-full flex items-center justify-between mb-4 pb-4 border-b border-slate-800">
            <div className="flex items-center gap-2 text-white font-bold text-sm">
              <Eye size={18} className="text-cyan-400" />
              <span>Real-Time Certificate Render</span>
            </div>
            <span className="text-xs text-slate-400 font-mono">
              Live Preview (Landscape A4)
            </span>
          </div>

          {/* Scaled Preview Wrapper */}
          <div className="w-full overflow-hidden flex justify-center py-2">
            <div
              style={{
                width: 1000 * 0.58,
                height: 707 * 0.58,
                position: 'relative',
              }}
            >
              <CertificatePreview
                recipientName={recipientName || 'Sample Recipient'}
                certificateType={certificateType}
                certificateId={previewCertId}
                designConfig={
                  activeTemplate?.design_config || {
                    title: 'Certificate of Participation',
                    primary_color: '#00f0ff',
                    secondary_color: '#7000ff',
                  }
                }
                templateVersion={activeTemplate?.version || 1}
                editionName={activeEdition?.name || 'GenCode League 2026'}
                teamName={activeTeam?.name}
                scale={0.58}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Hidden Offscreen DOM element for rendering high-DPI canvas when generating single certificate */}
      <div
        id="offscreen-render-cert"
        style={{
          position: 'fixed',
          left: '-9999px',
          top: '-9999px',
          pointerEvents: 'none',
        }}
      >
        <CertificatePreview
          recipientName={recipientName || 'Sample Recipient'}
          certificateType={certificateType}
          certificateId={previewCertId}
          designConfig={
            activeTemplate?.design_config || {
              title: 'Certificate of Participation',
              primary_color: '#00f0ff',
              secondary_color: '#7000ff',
            }
          }
          templateVersion={activeTemplate?.version || 1}
          editionName={activeEdition?.name || 'GenCode League 2026'}
          teamName={activeTeam?.name}
          scale={1}
        />
      </div>

      {/* Issued Certificates Ledger / Table */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 backdrop-blur-md shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
              <FileText size={20} className="text-cyan-400" />
              Issued Certificates Registry
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {filteredCertificates.length} certificate record(s) found
            </p>
          </div>

          {/* Search & Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search name or ID..."
                className="gcl-input pl-8 py-1.5 text-xs w-48 font-mono"
              />
            </div>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="gcl-input py-1.5 text-xs font-mono"
            >
              <option value="all">All Types</option>
              {CERTIFICATE_TYPES.map((ct) => (
                <option key={ct.type} value={ct.type}>
                  {ct.label}
                </option>
              ))}
            </select>

            <button
              onClick={loadCertificates}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              title="Refresh Registry"
            >
              <RefreshCw size={16} className={loadingList ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Registry Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-mono uppercase tracking-wider">
                <th className="py-3 px-3">Certificate ID</th>
                <th className="py-3 px-3">Recipient</th>
                <th className="py-3 px-3">Type</th>
                <th className="py-3 px-3">Team</th>
                <th className="py-3 px-3 text-center">Ver.</th>
                <th className="py-3 px-3 text-center">Views</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {filteredCertificates.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500 italic">
                    {loadingList
                      ? 'Loading certificates...'
                      : 'No certificates issued yet for this selection.'}
                  </td>
                </tr>
              ) : (
                filteredCertificates.map((cert) => {
                  const isValid = cert.status === 'valid';
                  return (
                    <tr key={cert.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-3 font-mono font-bold text-cyan-400">
                        {cert.certificate_id}
                      </td>
                      <td className="py-3 px-3 font-semibold text-white">
                        {cert.recipient_name}
                      </td>
                      <td className="py-3 px-3 capitalize text-slate-300">
                        {cert.certificate_type.replace('_', ' ')}
                      </td>
                      <td className="py-3 px-3 text-slate-400">
                        {cert.team?.name || '—'}
                      </td>
                      <td className="py-3 px-3 text-center font-mono text-slate-400">
                        v{cert.template_version}
                      </td>
                      <td className="py-3 px-3 text-center font-mono text-slate-300">
                        {cert.verify_view_count}
                      </td>
                      <td className="py-3 px-3 text-center">
                        {isValid ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                            VALID
                          </span>
                        ) : (
                          <span
                            className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-red-500/20 text-red-400 border border-red-500/40 cursor-help"
                            title={`Revoked: ${cert.revoked_reason || 'No reason provided'}`}
                          >
                            REVOKED
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setPreviewCert(cert)}
                            className="p-1.5 rounded hover:bg-slate-700 text-slate-300 transition-colors"
                            title="Preview Certificate"
                          >
                            <Eye size={15} />
                          </button>

                          <button
                            onClick={() => handleCopyVerifyUrl(cert.certificate_id)}
                            className="p-1.5 rounded hover:bg-slate-700 text-slate-300 transition-colors"
                            title="Copy Public Verification Link"
                          >
                            {copiedId === cert.certificate_id ? (
                              <Check size={15} className="text-emerald-400" />
                            ) : (
                              <Copy size={15} />
                            )}
                          </button>

                          {cert.pdf_url && (
                            <a
                              href={cert.pdf_url}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 rounded hover:bg-slate-700 text-cyan-400 transition-colors"
                              title="Download PDF"
                            >
                              <Download size={15} />
                            </a>
                          )}

                          {isValid && (
                            <button
                              onClick={() => {
                                setCertToRevoke(cert);
                                setRevokedReason('');
                              }}
                              className="p-1.5 rounded hover:bg-red-950/60 text-red-400 transition-colors"
                              title="Revoke Certificate"
                            >
                              <ShieldAlert size={15} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Revocation Confirmation Modal */}
      {certToRevoke && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-red-500/50 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-red-400">
              <ShieldAlert size={28} />
              <h3 className="text-xl font-bold text-white">Revoke Certificate</h3>
            </div>

            <p className="text-xs text-slate-300">
              You are invalidating certificate{' '}
              <span className="font-mono text-cyan-400 font-bold">
                {certToRevoke.certificate_id}
              </span>{' '}
              issued to{' '}
              <strong className="text-white">{certToRevoke.recipient_name}</strong>.
              This action is permanent and logged in the audit ledger.
            </p>

            <div>
              <label className="text-xs text-slate-400 uppercase font-bold block mb-1">
                Reason for Revocation * (Strictly Required)
              </label>
              <textarea
                value={revokedReason}
                onChange={(e) => setRevokedReason(e.target.value)}
                placeholder="e.g. Typo in recipient name, incorrect team affiliation, disqualified..."
                className="gcl-input w-full h-24 text-xs resize-none"
                required
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setCertToRevoke(null)}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-sm font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRevoke}
                disabled={revoking || !revokedReason.trim()}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold text-sm disabled:opacity-50 transition-colors flex items-center gap-2"
              >
                {revoking ? 'Revoking...' : 'Confirm Revocation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Preview of Selected Certificate */}
      {previewCert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl max-w-4xl w-full flex flex-col items-center space-y-4 my-8">
            <div className="w-full flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="font-mono text-cyan-400 font-bold">
                  {previewCert.certificate_id}
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  (Template v{previewCert.template_version})
                </span>
              </div>
              <button
                onClick={() => setPreviewCert(null)}
                className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs font-semibold"
              >
                Close ✕
              </button>
            </div>

            <div className="w-full overflow-x-auto flex justify-center py-2">
              <div
                style={{
                  width: 1000 * 0.8,
                  height: 707 * 0.8,
                  position: 'relative',
                }}
              >
                <CertificatePreview
                  recipientName={previewCert.recipient_name}
                  certificateType={previewCert.certificate_type}
                  certificateId={previewCert.certificate_id}
                  designConfig={
                    previewCert.template?.design_config || {
                      title: 'Certificate of ' + previewCert.certificate_type,
                      primary_color: '#00f0ff',
                      secondary_color: '#7000ff',
                    }
                  }
                  templateVersion={previewCert.template_version}
                  editionName={previewCert.edition?.name}
                  teamName={previewCert.team?.name}
                  issuedAt={previewCert.issued_at}
                  status={previewCert.status}
                  scale={0.8}
                />
              </div>
            </div>

            <div className="w-full flex justify-between items-center pt-2 border-t border-slate-800">
              <div className="text-xs text-slate-400 font-mono">
                Issued:{' '}
                {new Date(previewCert.issued_at).toLocaleDateString('en-US')}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleCopyVerifyUrl(previewCert.certificate_id)}
                  className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-xs font-semibold flex items-center gap-1.5"
                >
                  <Copy size={13} /> Copy Link
                </button>
                {previewCert.pdf_url && (
                  <a
                    href={previewCert.pdf_url}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 text-black font-bold text-xs flex items-center gap-1.5"
                  >
                    <Download size={13} /> Download PDF
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
