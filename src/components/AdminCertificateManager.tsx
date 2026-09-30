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
  RefreshCw,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import CertificatePreview from './CertificatePreview';
import {
  generateCertificateId,
  getEditionCode,
  logAdminAction,
  CERTIFICATE_TYPE_LABELS,
  ALL_CERTIFICATE_TYPES,
} from '../utils/certificateUtils';
import { downloadOrRegenerateCertificate } from '../utils/pdfGenerator';
import type { Certificate, CertificateType } from '../types/certificates';
import type { Edition, Team } from '../types/database';

interface AdminCertificateManagerProps {
  currentEdition?: Edition | null;
  teams: Team[];
  onShowToast: (msg: string, type?: 'success' | 'error') => void;
  onNavigateBulk?: () => void;
}

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
  const [achievement, setAchievement] = useState('');

  // UI / Action states
  const [generating, setGenerating] = useState(false);
  const [certificatesList, setCertificatesList] = useState<Certificate[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // Revoke Modal State
  const [certToRevoke, setCertToRevoke] = useState<Certificate | null>(null);
  const [revokedReason, setRevokedReason] = useState('');
  const [revoking, setRevoking] = useState(false);

  // Detail / Preview Modal
  const [previewCert, setPreviewCert] = useState<Certificate | null>(null);

  // Load editions
  useEffect(() => {
    supabase
      .from('editions')
      .select('*')
      .order('year', { ascending: false })
      .then(({ data }) => {
        if (data && data.length > 0) {
          setEditions(data);
          if (!selectedEditionId) {
            const initial =
              currentEdition?.id ||
              data.find((e: Edition) => e.is_current)?.id ||
              data[0].id;
            setSelectedEditionId(initial);
          }
        }
      });
  }, [currentEdition?.id]);

  // Selected edition object
  const activeEdition = useMemo(() => {
    return (
      editions.find((e) => e.id === selectedEditionId) ||
      currentEdition ||
      null
    );
  }, [editions, selectedEditionId, currentEdition]);

  // Load issued certificates
  const loadCertificates = async () => {
    setLoadingList(true);
    try {
      let query = supabase
        .from('certificates')
        .select(`
          *,
          edition:editions(id, name, year),
          team:teams(id, name)
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

  // Filter certificates by search and type
  const filteredCerts = useMemo(() => {
    let filtered = certificatesList;
    if (typeFilter !== 'all') {
      filtered = filtered.filter((c) => c.certificate_type === typeFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.recipient_name.toLowerCase().includes(q) ||
          c.certificate_id.toLowerCase().includes(q) ||
          (c.team?.name || '').toLowerCase().includes(q)
      );
    }
    return filtered;
  }, [certificatesList, typeFilter, searchQuery]);

  // Whether achievement field should show
  const showAchievementField = ['winner', 'runner_up', 'best_team'].includes(certificateType);

  // ─── Issue Certificate ───
  const handleIssueCertificate = async () => {
    if (!recipientName.trim()) {
      onShowToast('Enter participant name.', 'error');
      return;
    }
    if (!selectedEditionId) {
      onShowToast('Select an edition.', 'error');
      return;
    }

    setGenerating(true);

    try {
      const editionCode = getEditionCode(activeEdition?.year, activeEdition?.name);
      const certId = generateCertificateId(editionCode, certificateType);

      const teamId = selectedTeamId || null;

      const record = {
        certificate_id: certId,
        edition_id: selectedEditionId,
        team_id: teamId,
        recipient_name: recipientName.trim(),
        certificate_type: certificateType,
        achievement: showAchievementField ? achievement.trim() || null : null,
        template_version: 1,
        status: 'valid',
        verify_view_count: 0,
      };

      const { data, error } = await supabase
        .from('certificates')
        .insert(record)
        .select(`
          *,
          edition:editions(id, name, year),
          team:teams(id, name)
        `)
        .single();

      if (error) throw error;

      await logAdminAction('CERTIFICATE_ISSUED', {
        certificate_id: certId,
        recipient_name: recipientName.trim(),
        certificate_type: certificateType,
        edition_id: selectedEditionId,
      });

      onShowToast(`Certificate ${certId} issued successfully!`, 'success');

      // Reset form
      setRecipientName('');
      setSelectedTeamId('');
      setAchievement('');

      // Refresh list
      loadCertificates();
    } catch (err: any) {
      onShowToast(err?.message || 'Failed to issue certificate.', 'error');
    } finally {
      setGenerating(false);
    }
  };

  // ─── Copy Verification URL ───
  const handleCopyVerifyUrl = (certId: string) => {
    const url = `${window.location.origin}/verify/${certId}`;
    navigator.clipboard.writeText(url);
    setCopiedId(certId);
    onShowToast('Verification URL copied!', 'success');
    setTimeout(() => setCopiedId(null), 2500);
  };

  // ─── Download Certificate PDF ───
  const handleDownload = async (cert: Certificate) => {
    setDownloadingId(cert.certificate_id);
    try {
      onShowToast('Generating certificate PDF...', 'success');
      await downloadOrRegenerateCertificate(cert);
      onShowToast('Certificate downloaded successfully!', 'success');
    } catch (err: any) {
      onShowToast(err?.message || 'Download failed.', 'error');
    } finally {
      setDownloadingId(null);
    }
  };

  // ─── Revoke Certificate ───
  const handleRevoke = async () => {
    if (!certToRevoke || !revokedReason.trim()) {
      onShowToast('Provide a revocation reason.', 'error');
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
        reason: revokedReason.trim(),
      });

      onShowToast(
        `Certificate ${certToRevoke.certificate_id} revoked.`,
        'success'
      );

      setCertToRevoke(null);
      setRevokedReason('');
      loadCertificates();
    } catch (err: any) {
      onShowToast(err?.message || 'Revocation failed.', 'error');
    } finally {
      setRevoking(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ═══ Header ═══ */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
            <Award size={22} className="text-cyan-400" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white">Certificate Manager</h2>
            <p className="text-xs text-slate-400 font-mono">
              Issue, manage & download official GCL certificates
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Edition Selector */}
          <select
            value={selectedEditionId}
            onChange={(e) => setSelectedEditionId(e.target.value)}
            className="gcl-input text-xs font-mono py-2"
          >
            {editions.map((ed) => (
              <option key={ed.id} value={ed.id}>
                {ed.name} ({ed.year})
              </option>
            ))}
          </select>

          {onNavigateBulk && (
            <button
              onClick={onNavigateBulk}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-cyan-400 flex items-center gap-1.5"
            >
              <Plus size={14} /> Bulk Issue
            </button>
          )}
        </div>
      </div>

      {/* ═══ Issue New Certificate Form ═══ */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 backdrop-blur-md shadow-xl">
        <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-4">
          <Plus size={16} className="text-cyan-400" />
          Issue New Certificate
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Participant Name */}
          <div>
            <label className="block text-xs font-mono text-slate-400 mb-1.5">
              Participant Name *
            </label>
            <input
              type="text"
              value={recipientName}
              onChange={(e) => setRecipientName(e.target.value)}
              placeholder="e.g. Marcus Vance"
              className="gcl-input w-full py-2.5 text-sm"
            />
          </div>

          {/* Team */}
          <div>
            <label className="block text-xs font-mono text-slate-400 mb-1.5">
              Team
            </label>
            <select
              value={selectedTeamId}
              onChange={(e) => setSelectedTeamId(e.target.value)}
              className="gcl-input w-full py-2.5 text-sm"
            >
              <option value="">No Team / Individual</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          {/* Certificate Type */}
          <div>
            <label className="block text-xs font-mono text-slate-400 mb-1.5">
              Certificate Type *
            </label>
            <select
              value={certificateType}
              onChange={(e) => setCertificateType(e.target.value as CertificateType)}
              className="gcl-input w-full py-2.5 text-sm"
            >
              {ALL_CERTIFICATE_TYPES.map((type) => (
                <option key={type} value={type}>
                  {CERTIFICATE_TYPE_LABELS[type]}
                </option>
              ))}
            </select>
          </div>

          {/* Achievement / Position (conditional) */}
          {showAchievementField && (
            <div className="md:col-span-2">
              <label className="block text-xs font-mono text-slate-400 mb-1.5">
                Achievement / Position
              </label>
              <input
                type="text"
                value={achievement}
                onChange={(e) => setAchievement(e.target.value)}
                placeholder="e.g. Champion — 1st Place, Best Team Dynamics"
                className="gcl-input w-full py-2.5 text-sm"
              />
            </div>
          )}
        </div>

        <div className="flex items-center justify-between mt-5 pt-4 border-t border-slate-800">
          {/* Live Preview Thumbnail */}
          <div
            className="border border-slate-700 rounded-lg overflow-hidden bg-white"
            style={{ width: 280, height: 198 }}
          >
            <CertificatePreview
              recipientName={recipientName || 'Participant Name'}
              certificateType={certificateType}
              certificateId={
                getEditionCode(activeEdition?.year, activeEdition?.name) +
                '-XXXX-XXXXXX'
              }
              templateVersion={1}
              editionName={activeEdition?.name || 'GenCode League 2026'}
              teamName={
                selectedTeamId
                  ? teams.find((t) => t.id === selectedTeamId)?.name
                  : null
              }
              achievement={showAchievementField ? achievement : null}
              scale={0.28}
            />
          </div>

          <button
            onClick={handleIssueCertificate}
            disabled={generating || !recipientName.trim()}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-extrabold text-sm shadow-glow-cyan disabled:opacity-50 transition-all flex items-center gap-2"
          >
            <Award size={18} />
            {generating ? 'Issuing...' : 'Issue Certificate'}
          </button>
        </div>
      </div>

      {/* ═══ Certificates List ═══ */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 backdrop-blur-md shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <ShieldCheck size={16} className="text-emerald-400" />
            Issued Certificates
            <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-slate-800 text-cyan-400 border border-slate-700">
              {filteredCerts.length}
            </span>
          </h3>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-60">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, ID, or team..."
                className="gcl-input w-full pl-9 py-2 text-xs"
              />
            </div>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="gcl-input py-2 text-xs font-mono"
            >
              <option value="all">All Types</option>
              {ALL_CERTIFICATE_TYPES.map((type) => (
                <option key={type} value={type}>
                  {CERTIFICATE_TYPE_LABELS[type]}
                </option>
              ))}
            </select>

            <button
              onClick={loadCertificates}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
              title="Refresh"
            >
              <RefreshCw size={14} />
            </button>
          </div>
        </div>

        {loadingList ? (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-3 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs text-slate-400 font-mono">Loading certificates...</p>
          </div>
        ) : filteredCerts.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <Award size={40} className="mx-auto mb-3 opacity-40" />
            <p className="text-sm font-semibold">No certificates found</p>
            <p className="text-xs mt-1">
              {searchQuery ? 'Try a different search query.' : 'Issue your first certificate above.'}
            </p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {filteredCerts.map((cert) => {
              const isValid = cert.status === 'valid';
              return (
                <div
                  key={cert.id}
                  className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-cyan-500/30 transition-colors"
                >
                  {/* Certificate Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-bold text-white truncate">
                        {cert.recipient_name}
                      </span>
                      {isValid ? (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shrink-0">
                          VALID
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-red-500/20 text-red-400 border border-red-500/30 shrink-0">
                          REVOKED
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-mono text-slate-400">
                      <span className="text-amber-400 font-bold">
                        {cert.certificate_id}
                      </span>
                      <span className="capitalize">
                        {cert.certificate_type.replace('_', ' ')}
                      </span>
                      {cert.team?.name && (
                        <span>Team: {cert.team.name}</span>
                      )}
                      <span>
                        {new Date(cert.issued_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => setPreviewCert(cert)}
                      className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                      title="Preview"
                    >
                      <Eye size={14} />
                    </button>

                    <button
                      onClick={() => handleCopyVerifyUrl(cert.certificate_id)}
                      className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                      title="Copy Verification URL"
                    >
                      {copiedId === cert.certificate_id ? (
                        <Check size={14} className="text-emerald-400" />
                      ) : (
                        <Copy size={14} />
                      )}
                    </button>

                    <button
                      onClick={() => handleDownload(cert)}
                      disabled={downloadingId === cert.certificate_id}
                      className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-bold text-xs flex items-center gap-1.5 transition-all disabled:opacity-50"
                      title="Download PDF"
                    >
                      <Download size={13} />
                      {downloadingId === cert.certificate_id ? '...' : 'PDF'}
                    </button>

                    {isValid && (
                      <button
                        onClick={() => setCertToRevoke(cert)}
                        className="p-2 rounded-lg bg-red-950/40 hover:bg-red-950/70 text-red-400 border border-red-900/40 transition-colors"
                        title="Revoke"
                      >
                        <ShieldAlert size={14} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ═══ Preview Modal ═══ */}
      {previewCert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl max-w-4xl w-full flex flex-col items-center space-y-4 my-8">
            <div className="w-full flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <span className="font-mono text-cyan-400 font-bold text-sm">
                  {previewCert.certificate_id}
                </span>
                <a
                  href={`/verify/${previewCert.certificate_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-slate-400 hover:text-cyan-300 flex items-center gap-1 font-mono"
                >
                  Verify <ExternalLink size={12} />
                </a>
              </div>
              <button
                onClick={() => setPreviewCert(null)}
                className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs font-semibold"
              >
                Close ✕
              </button>
            </div>

            <div className="w-full overflow-x-auto flex justify-center py-2">
              <div style={{ width: 1000 * 0.75, height: 707 * 0.75 }}>
                <CertificatePreview
                  recipientName={previewCert.recipient_name}
                  certificateType={previewCert.certificate_type}
                  certificateId={previewCert.certificate_id}
                  templateVersion={previewCert.template_version}
                  editionName={previewCert.edition?.name}
                  teamName={previewCert.team?.name}
                  achievement={previewCert.achievement}
                  issuedAt={previewCert.issued_at}
                  status={previewCert.status}
                  scale={0.75}
                />
              </div>
            </div>

            <div className="w-full flex justify-between items-center pt-2 border-t border-slate-800">
              <button
                onClick={() => handleCopyVerifyUrl(previewCert.certificate_id)}
                className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-xs font-semibold flex items-center gap-1.5"
              >
                <Copy size={13} /> Copy Verification Link
              </button>
              <button
                onClick={() => handleDownload(previewCert)}
                className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold text-xs flex items-center gap-1.5 shadow-glow-cyan"
              >
                <Download size={14} /> Download PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Revoke Modal ═══ */}
      {certToRevoke && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-red-900/60 rounded-2xl p-6 shadow-2xl max-w-md w-full space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center">
                <AlertTriangle size={20} className="text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Revoke Certificate</h3>
                <p className="text-xs text-slate-400 font-mono">
                  {certToRevoke.certificate_id}
                </p>
              </div>
            </div>

            <p className="text-sm text-slate-300">
              You are about to revoke the certificate issued to{' '}
              <strong className="text-white">{certToRevoke.recipient_name}</strong>.
              This action is recorded in the audit log.
            </p>

            <div>
              <label className="block text-xs font-mono text-slate-400 mb-1.5">
                Revocation Reason *
              </label>
              <textarea
                value={revokedReason}
                onChange={(e) => setRevokedReason(e.target.value)}
                placeholder="Reason for revocation..."
                rows={3}
                className="gcl-input w-full py-2.5 text-sm resize-none"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => {
                  setCertToRevoke(null);
                  setRevokedReason('');
                }}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-sm font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleRevoke}
                disabled={revoking || !revokedReason.trim()}
                className="px-5 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold text-sm disabled:opacity-50 flex items-center gap-2"
              >
                <ShieldAlert size={16} />
                {revoking ? 'Revoking...' : 'Confirm Revoke'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
