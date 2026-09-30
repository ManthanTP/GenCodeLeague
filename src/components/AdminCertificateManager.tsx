import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Award,
  Plus,
  Search,
  Eye,
  Download,
  Copy,
  Check,
  ShieldCheck,
  AlertTriangle,
  Upload,
  Image as ImageIcon,
  RotateCcw,
  Save,
  PenTool,
  ExternalLink,
  ShieldAlert,
  Sliders,
  Edit3,
} from 'lucide-react';

import { supabase } from '../lib/supabase';
import CertificatePreview from './CertificatePreview';
import {
  generateCertificateId,
  getEditionCode,
  logAdminAction,
  getCertificateTitle,
  getCertificateSubtitle,
  CERTIFICATE_TYPE_LABELS,
  ALL_CERTIFICATE_TYPES,
  DEFAULT_CERTIFICATE_SETTINGS,
  fetchCertificateSettings,
  saveCertificateSettings,
} from '../utils/certificateUtils';

import { downloadOrRegenerateCertificate } from '../utils/pdfGenerator';
import type {
  Certificate,
  CertificateType,
  CertificateSettings,
} from '../types/certificates';
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
  // Navigation tab
  const [activeTab, setActiveTab] = useState<'issue' | 'branding' | 'list'>('issue');

  // Editions
  const [editions, setEditions] = useState<Edition[]>([]);
  const [selectedEditionId, setSelectedEditionId] = useState<string>(
    currentEdition?.id || ''
  );

  // Single Issue Form states
  const [recipientName, setRecipientName] = useState('');
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [certificateType, setCertificateType] =
    useState<CertificateType>('participation');
  const [achievement, setAchievement] = useState('');
  const [customTitle, setCustomTitle] = useState('OF PARTICIPATION');
  const [presentedToText, setPresentedToText] = useState('THIS IS PROUDLY PRESENTED TO');
  const [customSubtitle, setCustomSubtitle] = useState(
    'has actively participated in GenCode League as a proud member of'
  );
  const [generating, setGenerating] = useState(false);

  // Certificate Settings (Signatures & Branding)
  const [settings, setSettings] = useState<CertificateSettings>(
    DEFAULT_CERTIFICATE_SETTINGS
  );
  const [savingSettings, setSavingSettings] = useState(false);

  // File input refs for uploads
  const logoInputRef = useRef<HTMLInputElement>(null);
  const emblemInputRef = useRef<HTMLInputElement>(null);
  const leftSignInputRef = useRef<HTMLInputElement>(null);
  const rightSignInputRef = useRef<HTMLInputElement>(null);

  // Pre-fill editable title and subtitle when certificate type or achievement changes
  useEffect(() => {
    let title = 'OF PARTICIPATION';
    if (['winner', 'runner_up', 'best_team'].includes(certificateType)) {
      title = 'OF ACHIEVEMENT';
    } else if (['organizer', 'volunteer'].includes(certificateType)) {
      title = 'OF APPRECIATION';
    } else if (['judge', 'mentor'].includes(certificateType)) {
      title = 'OF RECOGNITION';
    }
    setCustomTitle(title);

    let sub = 'has actively participated in GenCode League as a proud member of';
    if (certificateType === 'winner') {
      sub = achievement || 'has been awarded Champion of GenCode League';
    } else if (certificateType === 'runner_up') {
      sub = achievement || 'has been awarded Runner Up of GenCode League';
    } else if (certificateType === 'best_team') {
      sub = achievement || 'has been awarded Best Team Dynamics in GenCode League';
    } else if (certificateType === 'judge') {
      sub = 'has served as Honorary Judge for GenCode League';
    } else if (certificateType === 'volunteer') {
      sub = 'has served as Volunteer for GenCode League';
    } else if (certificateType === 'organizer') {
      sub = 'has served as Core Organizer for GenCode League';
    } else if (certificateType === 'mentor') {
      sub = 'has served as Technical Mentor for GenCode League';
    }
    setCustomSubtitle(sub);
  }, [certificateType, achievement]);


  // Records List states
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

  // Edit Certificate Modal State
  const [editingCert, setEditingCert] = useState<Certificate | null>(null);
  const [editRecipientName, setEditRecipientName] = useState('');
  const [editCertificateType, setEditCertificateType] =
    useState<CertificateType>('participation');
  const [editCustomTitle, setEditCustomTitle] = useState('');
  const [editAchievement, setEditAchievement] = useState('');
  const [editCustomSubtitle, setEditCustomSubtitle] = useState('');
  const [editTeamId, setEditTeamId] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);


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
  }, [currentEdition?.id, selectedEditionId]);

  // Load certificate settings when edition changes
  useEffect(() => {
    if (selectedEditionId) {
      fetchCertificateSettings(selectedEditionId).then((loaded) => {
        if (loaded) setSettings(loaded);
      });
    }
  }, [selectedEditionId]);

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
  const showAchievementField = ['winner', 'runner_up', 'best_team'].includes(
    certificateType
  );

  // Selected team object for preview
  const selectedTeam = useMemo(() => {
    return teams.find((t) => t.id === selectedTeamId) || null;
  }, [teams, selectedTeamId]);

  // Helper for image file reading
  const handleImageFile = (
    file: File,
    onSuccess: (dataUrl: string) => void
  ) => {
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      onShowToast('File size must be under 3MB', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (result) onSuccess(result);
    };
    reader.readAsDataURL(file);
  };

  // ─── Save Settings ───
  const handleSaveSettings = async () => {
    if (!selectedEditionId) {
      onShowToast('Select an edition first', 'error');
      return;
    }
    setSavingSettings(true);
    try {
      await saveCertificateSettings(selectedEditionId, settings);
      await logAdminAction('CERTIFICATE_SETTINGS_UPDATED', {
        edition_id: selectedEditionId,
      });
      onShowToast('Signatures & branding updated successfully!', 'success');
    } catch (err: any) {
      onShowToast(err?.message || 'Failed to save settings.', 'error');
    } finally {
      setSavingSettings(false);
    }
  };

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
      const editionCode = getEditionCode(
        activeEdition?.year,
        activeEdition?.name
      );
      const certId = generateCertificateId(editionCode, certificateType);

      const teamId = selectedTeamId || null;

      const record = {
        certificate_id: certId,
        edition_id: selectedEditionId,
        team_id: teamId,
        recipient_name: recipientName.trim(),
        certificate_type: certificateType,
        achievement: showAchievementField ? achievement.trim() || null : null,
        custom_title: customTitle.trim() || null,
        custom_subtitle: customSubtitle.trim() || null,
        template_version: 1,
        status: 'valid',
        verify_view_count: 0,
      };


      const { error } = await supabase.from('certificates').insert(record);

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

  // ─── Edit Certificate Handlers ───
  const handleStartEdit = (cert: Certificate) => {
    setEditingCert(cert);
    setEditRecipientName(cert.recipient_name || '');
    setEditCertificateType(cert.certificate_type || 'participation');
    setEditCustomTitle(
      cert.custom_title || `OF ${getCertificateTitle(cert.certificate_type)}`
    );
    setEditAchievement(cert.achievement || '');
    setEditCustomSubtitle(
      cert.custom_subtitle ||
        getCertificateSubtitle(cert.certificate_type, cert.achievement)
    );
    setEditTeamId(cert.team_id || '');
  };

  const handleSaveEdit = async () => {
    if (!editingCert) return;
    if (!editRecipientName.trim()) {
      onShowToast('Recipient name cannot be empty', 'error');
      return;
    }
    setSavingEdit(true);
    try {
      const showAch = ['winner', 'runner_up', 'best_team'].includes(
        editCertificateType
      );
      const updates = {
        recipient_name: editRecipientName.trim(),
        certificate_type: editCertificateType,
        team_id: editTeamId || null,
        achievement: showAch ? editAchievement.trim() || null : null,
        custom_title: editCustomTitle.trim() || null,
        custom_subtitle: editCustomSubtitle.trim() || null,
      };

      const { error } = await supabase
        .from('certificates')
        .update(updates)
        .eq('id', editingCert.id);

      if (error) throw error;

      await logAdminAction('CERTIFICATE_UPDATED', {
        certificate_id: editingCert.certificate_id,
        updates,
      });

      onShowToast(
        `Certificate ${editingCert.certificate_id} updated successfully!`,
        'success'
      );

      // Update certificates in state
      setCertificatesList((prev) =>
        prev.map((c) =>
          c.id === editingCert.id
            ? {
                ...c,
                ...updates,
                team: teams.find((t) => t.id === editTeamId) || null,
              }
            : c
        )
      );

      // If previewing this certificate, update preview too
      if (previewCert && previewCert.id === editingCert.id) {
        setPreviewCert((prev) =>
          prev
            ? {
                ...prev,
                ...updates,
                team: teams.find((t) => t.id === editTeamId) || null,
              }
            : null
        );
      }

      setEditingCert(null);
    } catch (err: any) {
      onShowToast(err?.message || 'Failed to update certificate.', 'error');
    } finally {
      setSavingEdit(false);
    }
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
      {/* ═══ Top Header Bar ═══ */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
            <Award size={22} className="text-cyan-400" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white">Certificate Studio</h2>
            <p className="text-xs text-slate-400 font-mono">
              Customize branding, upload signatures & issue certificates
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
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-cyan-400 flex items-center gap-1.5 transition-colors"
            >
              <Plus size={14} /> Bulk CSV Issue
            </button>
          )}
        </div>
      </div>

      {/* ═══ Mode Tabs ═══ */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
        <button
          onClick={() => setActiveTab('issue')}
          className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all ${
            activeTab === 'issue'
              ? 'bg-cyan-500 text-black shadow-glow-cyan'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <Award size={15} /> Issue Certificate
        </button>

        <button
          onClick={() => setActiveTab('branding')}
          className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all ${
            activeTab === 'branding'
              ? 'bg-red-500 text-white shadow-glow-red'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <PenTool size={15} /> Signatures & Branding
        </button>

        <button
          onClick={() => setActiveTab('list')}
          className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all ${
            activeTab === 'list'
              ? 'bg-cyan-500 text-black shadow-glow-cyan'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <Eye size={15} /> Issued Records ({certificatesList.length})
        </button>
      </div>

      {/* ═══════════════════════════════════════════════════════
          TAB 1: ISSUE CERTIFICATE (FORM + LIVE PREVIEW)
          ═══════════════════════════════════════════════════════ */}
      {activeTab === 'issue' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Input Form */}
            <div className="lg:col-span-5 bg-slate-900/60 border border-slate-800 rounded-2xl p-6 backdrop-blur-md shadow-xl space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Plus size={16} className="text-cyan-400" />
                Issue New Certificate
              </h3>

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
                  Team (Optional)
                </label>
                <select
                  value={selectedTeamId}
                  onChange={(e) => setSelectedTeamId(e.target.value)}
                  className="gcl-input w-full py-2.5 text-sm"
                >
                  <option value="">No Team Affiliation</option>
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
                  onChange={(e) =>
                    setCertificateType(e.target.value as CertificateType)
                  }
                  className="gcl-input w-full py-2.5 text-sm"
                >
                  {ALL_CERTIFICATE_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {CERTIFICATE_TYPE_LABELS[type]}
                    </option>
                  ))}
                </select>
              </div>

              {/* Certificate Title Line (Editable) */}
              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1.5 flex items-center justify-between">
                  <span>Certificate Title Line (Editable)</span>
                  <span className="text-[10px] text-cyan-400 font-sans">Live Preview Sync</span>
                </label>
                <input
                  type="text"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  placeholder="e.g. OF PARTICIPATION or OF ACHIEVEMENT"
                  className="gcl-input w-full py-2.5 text-sm font-bold text-white tracking-wider"
                />
              </div>

              {/* Presentation Text (Editable) */}
              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1.5">
                  Presentation Text (Editable)
                </label>
                <input
                  type="text"
                  value={presentedToText}
                  onChange={(e) => setPresentedToText(e.target.value)}
                  placeholder="THIS IS PROUDLY PRESENTED TO"
                  className="gcl-input w-full py-2 text-xs"
                />
              </div>

              {/* Achievement / Position */}
              {showAchievementField && (
                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1.5">
                    Achievement / Custom Honor
                  </label>
                  <input
                    type="text"
                    value={achievement}
                    onChange={(e) => setAchievement(e.target.value)}
                    placeholder="e.g. Champion of GenCode League"
                    className="gcl-input w-full py-2.5 text-sm"
                  />
                </div>
              )}

              {/* Certificate Body / Reason Description (Editable) */}
              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1.5">
                  Certificate Reason / Description (Editable)
                </label>
                <textarea
                  value={customSubtitle}
                  onChange={(e) => setCustomSubtitle(e.target.value)}
                  rows={2}
                  placeholder="e.g. has actively participated in GenCode League as a proud member of"
                  className="gcl-input w-full py-2 px-3 text-xs leading-relaxed resize-none"
                />
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  onClick={handleIssueCertificate}
                  disabled={generating || !recipientName.trim()}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-red-600 via-red-500 to-amber-500 hover:from-red-500 hover:to-amber-400 text-white font-black text-sm tracking-wide shadow-glow-red disabled:opacity-50 flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Award size={18} />
                  {generating ? 'Issuing Certificate...' : 'Issue Certificate'}
                </button>
              </div>
            </div>

            {/* Right: Real-time Live Certificate Preview */}
            <div className="lg:col-span-7 bg-slate-900/60 border border-slate-800 rounded-2xl p-6 backdrop-blur-md shadow-xl flex flex-col items-center">
              <div className="w-full flex items-center justify-between mb-3">
                <span className="text-xs font-mono text-slate-400 flex items-center gap-1.5">
                  <Eye size={14} className="text-cyan-400" /> Live Certificate Preview
                </span>
                <span className="text-[10px] font-mono text-slate-500">
                  A4 Landscape (4K Print Ready)
                </span>
              </div>

              <div className="w-full overflow-hidden flex items-center justify-center p-2 rounded-xl bg-black/40 border border-slate-800">
                <div
                  style={{
                    width: 1000 * 0.58,
                    height: 707 * 0.58,
                    overflow: 'hidden',
                  }}
                >
                  <CertificatePreview
                    recipientName={recipientName || 'Recipient Name'}
                    certificateType={certificateType}
                    certificateId="GCL26-SAMPLE-XXXXXX"
                    editionId={selectedEditionId}
                    editionName={activeEdition?.name || 'GenCode League 2026'}
                    teamName={selectedTeam?.name || 'Cyber Knights'}
                    achievement={achievement || null}
                    customTitle={customTitle}
                    customSubtitle={customSubtitle}
                    presentedToText={presentedToText}
                    scale={0.58}
                    settings={settings}
                  />
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
          TAB 2: SIGNATURES & BRANDING CUSTOMIZER
          ═══════════════════════════════════════════════════════ */}
      {activeTab === 'branding' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Controls Column */}
          <div className="lg:col-span-6 space-y-6">
            {/* Section 1: Event / College Logo */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 backdrop-blur-md shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <ImageIcon size={16} className="text-cyan-400" />
                  Top-Left Event / Institution Logo
                </h3>
                {settings.logo_url && (
                  <button
                    onClick={() =>
                      setSettings((prev) => ({ ...prev, logo_url: null }))
                    }
                    className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1"
                  >
                    <RotateCcw size={12} /> Reset to GCL Logo
                  </button>
                )}
              </div>

              <p className="text-xs text-slate-400">
                Upload your college, department, or custom event logo to replace the
                default GCL logo on all certificates.
              </p>

              <div className="flex items-center gap-4">
                <div className="w-32 h-16 rounded-xl bg-black/50 border border-slate-800 flex items-center justify-center p-2 overflow-hidden">
                  {settings.logo_url ? (
                    <img
                      src={settings.logo_url}
                      alt="Current Logo"
                      className="max-h-full max-w-full object-contain"
                    />
                  ) : (
                    <span className="text-xs font-black text-slate-400">
                      GCL Official
                    </span>
                  )}
                </div>

                <div className="flex-1">
                  <input
                    type="file"
                    ref={logoInputRef}
                    accept="image/png,image/jpeg,image/svg+xml"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        handleImageFile(file, (dataUrl) => {
                          setSettings((prev) => ({ ...prev, logo_url: dataUrl }));
                          onShowToast('Custom logo loaded!', 'success');
                        });
                      }
                    }}
                  />
                  <button
                    onClick={() => logoInputRef.current?.click()}
                    className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-white flex items-center gap-2"
                  >
                    <Upload size={14} /> Upload Custom Logo
                  </button>
                  <p className="text-[10px] text-slate-500 mt-1.5">
                    Recommended: Transparent PNG or SVG (max height 60px)
                  </p>
                </div>
              </div>
            </div>

            {/* Section 2: Center Emblem / Logo (Above CERTIFICATE Heading) */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 backdrop-blur-md shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Award size={16} className="text-amber-400" />
                  Center Emblem / Crest (Above "CERTIFICATE" Heading)
                </h3>
                {settings.emblem_url && (
                  <button
                    onClick={() =>
                      setSettings((prev) => ({ ...prev, emblem_url: null }))
                    }
                    className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw size={12} /> Reset to Default GCL Emblem
                  </button>
                )}
              </div>

              <p className="text-xs text-slate-400">
                Upload your custom crest, college emblem, or event badge to appear above the CERTIFICATE title with generous vertical spacing.
              </p>

              <div className="flex items-center gap-4">
                <div className="w-32 h-16 rounded-xl bg-black/50 border border-slate-800 flex items-center justify-center p-2 overflow-hidden">
                  {settings.emblem_url ? (
                    <img
                      src={settings.emblem_url}
                      alt="Current Center Emblem"
                      className="max-h-full max-w-full object-contain"
                    />
                  ) : (
                    <span className="text-[11px] font-mono text-slate-400 text-center leading-tight">
                      Official GCL Gavel & Laurel
                    </span>
                  )}
                </div>

                <div className="flex-1">
                  <input
                    type="file"
                    ref={emblemInputRef}
                    accept="image/png,image/jpeg,image/svg+xml"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        handleImageFile(file, (dataUrl) => {
                          setSettings((prev) => ({ ...prev, emblem_url: dataUrl }));
                          onShowToast('Custom center emblem loaded!', 'success');
                        });
                      }
                    }}
                  />
                  <button
                    onClick={() => emblemInputRef.current?.click()}
                    className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-white flex items-center gap-2 cursor-pointer"
                  >
                    <Upload size={14} /> Upload Custom Emblem
                  </button>
                  <p className="text-[10px] text-slate-500 mt-1.5">
                    Recommended: Transparent PNG or SVG (max height 70px)
                  </p>
                </div>
              </div>
            </div>

            {/* Section 3: Global Certificate Text & Event Badges */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 backdrop-blur-md shadow-xl space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Sliders size={16} className="text-cyan-400" />
                Global Certificate Text & Event Badges
              </h3>
              <p className="text-xs text-slate-400">
                Configure global defaults. Any certificate that doesn't have custom overrides will automatically use these settings across all public verifications and downloads.
              </p>

              <div className="space-y-3">
                {/* Top Right Season / Header text */}
                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">
                    Top-Right Header / Season Badge (Replaces "GENESIS SEASON")
                  </label>
                  <input
                    type="text"
                    value={settings.season_name || ''}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        season_name: e.target.value,
                      }))
                    }
                    placeholder="e.g. NATIONAL CODING LEAGUE or TECH ODYSSEY"
                    className="gcl-input w-full py-2 text-xs font-semibold"
                  />
                  <span className="text-[10px] text-slate-500">
                    Appears in the upper-right corner above GCL year and version.
                  </span>
                </div>

                {/* Global Presentation Text */}
                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">
                    Global Presentation Text
                  </label>
                  <input
                    type="text"
                    value={settings.presented_to_text || ''}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        presented_to_text: e.target.value,
                      }))
                    }
                    placeholder="THIS IS PROUDLY PRESENTED TO"
                    className="gcl-input w-full py-2 text-xs"
                  />
                </div>

                {/* Global Reason / Default Description */}
                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">
                    Global Certificate Reason / Default Description
                  </label>
                  <textarea
                    value={settings.default_description || ''}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        default_description: e.target.value,
                      }))
                    }
                    rows={2}
                    placeholder="has actively participated in GenCode League as a proud member of"
                    className="gcl-input w-full py-2 px-3 text-xs resize-none"
                  />
                  <span className="text-[10px] text-amber-400/90 font-mono">
                    ✦ Applied automatically to all certificates & verification pages unless individually customized.
                  </span>
                </div>
              </div>
            </div>

            {/* Section 4: Left Signatory (Faculty Coordinator) */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 backdrop-blur-md shadow-xl space-y-4">


              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <PenTool size={16} className="text-red-400" />
                  Signatory 1 (Faculty Coordinator / Left)
                </h3>
                {settings.signatory_left.signature_url && (
                  <button
                    onClick={() =>
                      setSettings((prev) => ({
                        ...prev,
                        signatory_left: {
                          ...prev.signatory_left,
                          signature_url: null,
                        },
                      }))
                    }
                    className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1"
                  >
                    <RotateCcw size={12} /> Reset Signature
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-mono text-slate-400 mb-1">
                    Organization / Entity
                  </label>
                  <input
                    type="text"
                    value={settings.signatory_left.org}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        signatory_left: {
                          ...prev.signatory_left,
                          org: e.target.value,
                        },
                      }))
                    }
                    placeholder="e.g. GenCode League"
                    className="gcl-input w-full py-2 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-slate-400 mb-1">
                    Role Title
                  </label>
                  <input
                    type="text"
                    value={settings.signatory_left.role}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        signatory_left: {
                          ...prev.signatory_left,
                          role: e.target.value,
                        },
                      }))
                    }
                    placeholder="e.g. FACULTY COORDINATOR"
                    className="gcl-input w-full py-2 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-mono text-slate-400 mb-1">
                  Signatory Name (Optional)
                </label>
                <input
                  type="text"
                  value={settings.signatory_left.name || ''}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      signatory_left: {
                        ...prev.signatory_left,
                        name: e.target.value,
                      },
                    }))
                  }
                  placeholder="e.g. Dr. A. Sharma"
                  className="gcl-input w-full py-2 text-xs"
                />
              </div>

              {/* Upload Signature Image */}
              <div className="pt-2 border-t border-slate-800/80 flex items-center gap-4">
                <div className="w-32 h-14 rounded-xl bg-white flex items-center justify-center p-2 border border-slate-700 overflow-hidden">
                  {settings.signatory_left.signature_url ? (
                    <img
                      src={settings.signatory_left.signature_url}
                      alt="Left Signature"
                      className="max-h-full max-w-full object-contain"
                    />
                  ) : (
                    <span className="text-[10px] text-slate-400 italic">
                      Default Vector Sign
                    </span>
                  )}
                </div>

                <div className="flex-1">
                  <input
                    type="file"
                    ref={leftSignInputRef}
                    accept="image/png,image/jpeg"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        handleImageFile(file, (dataUrl) => {
                          setSettings((prev) => ({
                            ...prev,
                            signatory_left: {
                              ...prev.signatory_left,
                              signature_url: dataUrl,
                            },
                          }));
                          onShowToast('Left signature uploaded!', 'success');
                        });
                      }
                    }}
                  />
                  <button
                    onClick={() => leftSignInputRef.current?.click()}
                    className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-white flex items-center gap-1.5"
                  >
                    <Upload size={13} /> Upload Signature
                  </button>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Upload transparent PNG of official signature
                  </p>
                </div>
              </div>
            </div>

            {/* Section 3: Right Signatory (Convenor / CSE Dept) */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 backdrop-blur-md shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <PenTool size={16} className="text-red-400" />
                  Signatory 2 (Convenor / Department of CSE)
                </h3>
                {settings.signatory_right.signature_url && (
                  <button
                    onClick={() =>
                      setSettings((prev) => ({
                        ...prev,
                        signatory_right: {
                          ...prev.signatory_right,
                          signature_url: null,
                        },
                      }))
                    }
                    className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1"
                  >
                    <RotateCcw size={12} /> Reset Signature
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-mono text-slate-400 mb-1">
                    Organization / Entity
                  </label>
                  <input
                    type="text"
                    value={settings.signatory_right.org}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        signatory_right: {
                          ...prev.signatory_right,
                          org: e.target.value,
                        },
                      }))
                    }
                    placeholder="e.g. Department of CSE"
                    className="gcl-input w-full py-2 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-slate-400 mb-1">
                    Role Title
                  </label>
                  <input
                    type="text"
                    value={settings.signatory_right.role}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        signatory_right: {
                          ...prev.signatory_right,
                          role: e.target.value,
                        },
                      }))
                    }
                    placeholder="e.g. CONVENOR"
                    className="gcl-input w-full py-2 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-mono text-slate-400 mb-1">
                  Signatory Name (Optional)
                </label>
                <input
                  type="text"
                  value={settings.signatory_right.name || ''}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      signatory_right: {
                        ...prev.signatory_right,
                        name: e.target.value,
                      },
                    }))
                  }
                  placeholder="e.g. Prof. R. Verma"
                  className="gcl-input w-full py-2 text-xs"
                />
              </div>

              {/* Upload Signature Image */}
              <div className="pt-2 border-t border-slate-800/80 flex items-center gap-4">
                <div className="w-32 h-14 rounded-xl bg-white flex items-center justify-center p-2 border border-slate-700 overflow-hidden">
                  {settings.signatory_right.signature_url ? (
                    <img
                      src={settings.signatory_right.signature_url}
                      alt="Right Signature"
                      className="max-h-full max-w-full object-contain"
                    />
                  ) : (
                    <span className="text-[10px] text-slate-400 italic">
                      Default Vector Sign
                    </span>
                  )}
                </div>

                <div className="flex-1">
                  <input
                    type="file"
                    ref={rightSignInputRef}
                    accept="image/png,image/jpeg"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        handleImageFile(file, (dataUrl) => {
                          setSettings((prev) => ({
                            ...prev,
                            signatory_right: {
                              ...prev.signatory_right,
                              signature_url: dataUrl,
                            },
                          }));
                          onShowToast('Right signature uploaded!', 'success');
                        });
                      }
                    }}
                  />
                  <button
                    onClick={() => rightSignInputRef.current?.click()}
                    className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-white flex items-center gap-1.5"
                  >
                    <Upload size={13} /> Upload Signature
                  </button>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Upload transparent PNG of official signature
                  </p>
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="sticky bottom-4 z-20">
              <button
                onClick={handleSaveSettings}
                disabled={savingSettings}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-red-600 via-red-500 to-amber-500 hover:from-red-500 hover:to-amber-400 text-white font-black text-sm tracking-wide shadow-glow-red flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
              >
                <Save size={18} />
                {savingSettings
                  ? 'Saving Settings...'
                  : 'Save Branding & Signatures'}
              </button>
            </div>
          </div>

          {/* Live Preview Column */}
          <div className="lg:col-span-6 bg-slate-900/60 border border-slate-800 rounded-2xl p-6 backdrop-blur-md shadow-xl flex flex-col items-center">
            <div className="w-full flex items-center justify-between mb-3">
              <span className="text-xs font-mono text-slate-400 flex items-center gap-1.5">
                <Sliders size={14} className="text-cyan-400" /> Interactive Preview
              </span>
              <span className="text-[10px] font-mono text-slate-500">
                Updates in real-time
              </span>
            </div>

            <div className="w-full overflow-hidden flex items-center justify-center p-2 rounded-xl bg-black/40 border border-slate-800">
              <div
                style={{
                  width: 1000 * 0.58,
                  height: 707 * 0.58,
                  overflow: 'hidden',
                }}
              >
                <CertificatePreview
                  recipientName="Marcus Vance"
                  certificateType="participation"
                  certificateId="GCL26-PART-DEMO01"
                  editionId={selectedEditionId}
                  editionName={activeEdition?.name || 'GenCode League 2026'}
                  teamName="Cyber Knights"
                  scale={0.58}
                  settings={settings}
                />
              </div>
            </div>

            <div className="mt-4 p-3 rounded-lg bg-slate-800/60 border border-slate-700/60 text-xs text-slate-300 w-full">
              💡 <strong>Instant Sync:</strong> All single certificates, bulk
              certificates, and public verification links will immediately use these
              updated logos and signatures.
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
          TAB 3: ISSUED RECORDS TABLE
          ═══════════════════════════════════════════════════════ */}
      {activeTab === 'list' && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 backdrop-blur-md shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <ShieldCheck size={16} className="text-emerald-400" />
                Issued Certificates Directory
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                {filteredCerts.length} certificates found
              </p>
            </div>

            {/* Search & Filter */}
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-56">
                <Search
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search name, ID, team..."
                  className="gcl-input w-full pl-8 py-1.5 text-xs font-mono"
                />
              </div>

              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="gcl-input text-xs font-mono py-1.5"
              >
                <option value="all">All Types</option>
                {ALL_CERTIFICATE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {CERTIFICATE_TYPE_LABELS[t]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-800/60 text-slate-300 font-mono uppercase text-[11px] border-b border-slate-800">
                  <th className="py-3 px-4">Certificate ID</th>
                  <th className="py-3 px-4">Recipient</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Team</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Views</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {loadingList ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-slate-400">
                      Loading certificates...
                    </td>
                  </tr>
                ) : filteredCerts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-slate-500">
                      No certificates match your query.
                    </td>
                  </tr>
                ) : (
                  filteredCerts.map((cert) => (
                    <tr
                      key={cert.id}
                      className="hover:bg-slate-800/30 transition-colors"
                    >
                      {/* ID */}
                      <td className="py-3 px-4 font-mono font-bold text-white flex items-center gap-1.5">
                        <span>{cert.certificate_id}</span>
                        <button
                          onClick={() => handleCopyVerifyUrl(cert.certificate_id)}
                          className="text-slate-400 hover:text-cyan-400 p-0.5"
                          title="Copy verification link"
                        >
                          {copiedId === cert.certificate_id ? (
                            <Check size={12} className="text-emerald-400" />
                          ) : (
                            <Copy size={12} />
                          )}
                        </button>
                      </td>

                      {/* Recipient */}
                      <td className="py-3 px-4 font-semibold text-white">
                        {cert.recipient_name}
                      </td>

                      {/* Type */}
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-cyan-300 border border-slate-700">
                          {CERTIFICATE_TYPE_LABELS[cert.certificate_type] ||
                            cert.certificate_type}
                        </span>
                      </td>

                      {/* Team */}
                      <td className="py-3 px-4 text-slate-300">
                        {cert.team?.name || '—'}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        {cert.status === 'valid' ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                            Valid
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/10 text-red-400 border border-red-500/30">
                            Revoked
                          </span>
                        )}
                      </td>

                      {/* View count */}
                      <td className="py-3 px-4 font-mono text-slate-400">
                        {cert.verify_view_count}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                        {/* Preview */}
                        <button
                          onClick={() => setPreviewCert(cert)}
                          className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white"
                          title="Preview Certificate"
                        >
                          <Eye size={14} />
                        </button>

                        {/* Edit Certificate */}
                        <button
                          onClick={() => handleStartEdit(cert)}
                          className="p-1.5 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 cursor-pointer"
                          title="Edit Certificate Details"
                        >
                          <Edit3 size={14} />
                        </button>

                        {/* Download PDF */}
                        <button
                          onClick={() => handleDownload(cert)}
                          disabled={downloadingId === cert.certificate_id}
                          className="p-1.5 rounded bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 disabled:opacity-50"
                          title="Download PDF"
                        >
                          <Download size={14} />
                        </button>


                        {/* Open Verification page */}
                        <a
                          href={`/verify/${cert.certificate_id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-block p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white"
                          title="Open Verification Link"
                        >
                          <ExternalLink size={14} />
                        </a>

                        {/* Revoke */}
                        {cert.status === 'valid' && (
                          <button
                            onClick={() => setCertToRevoke(cert)}
                            className="p-1.5 rounded bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30"
                            title="Revoke Certificate"
                          >
                            <AlertTriangle size={14} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ═══ Certificate Preview Modal ═══ */}
      {previewCert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl max-w-4xl w-full space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Eye size={18} className="text-cyan-400" />
                  Certificate Preview
                </h3>
                <p className="text-xs text-slate-400 font-mono">
                  {previewCert.certificate_id} • {previewCert.recipient_name}
                </p>
              </div>
              <button
                onClick={() => setPreviewCert(null)}
                className="text-slate-400 hover:text-white font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <div className="w-full flex items-center justify-center overflow-hidden rounded-xl border border-slate-800 bg-white p-2">
              <div
                style={{
                  width: 1000 * 0.75,
                  height: 707 * 0.75,
                  overflow: 'hidden',
                }}
              >
                <CertificatePreview
                  recipientName={previewCert.recipient_name}
                  certificateType={previewCert.certificate_type}
                  certificateId={previewCert.certificate_id}
                  editionId={previewCert.edition_id}
                  templateVersion={previewCert.template_version}
                  editionName={previewCert.edition?.name}
                  teamName={previewCert.team?.name}
                  achievement={previewCert.achievement}
                  customTitle={previewCert.custom_title}
                  customSubtitle={previewCert.custom_subtitle}
                  issuedAt={previewCert.issued_at}
                  status={previewCert.status}
                  scale={0.75}
                  settings={settings}
                />

              </div>
            </div>

            <div className="w-full flex justify-between items-center pt-2 border-t border-slate-800">
              <button
                onClick={() => handleCopyVerifyUrl(previewCert.certificate_id)}
                className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <Copy size={13} /> Copy Verification Link
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const toEdit = previewCert;
                    setPreviewCert(null);
                    handleStartEdit(toEdit);
                  }}
                  className="px-3 py-2 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 border border-amber-500/30 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Edit3 size={13} /> Edit Certificate
                </button>
                <button
                  onClick={() => handleDownload(previewCert)}
                  className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold text-xs flex items-center gap-1.5 shadow-glow-cyan cursor-pointer"
                >
                  <Download size={14} /> Download PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Edit Issued Certificate Modal ═══ */}
      {editingCert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl max-w-5xl w-full my-8 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Edit3 size={18} className="text-amber-400" />
                  Edit Issued Certificate
                </h3>
                <p className="text-xs text-slate-400 font-mono">
                  {editingCert.certificate_id} • Changes update live and apply immediately to public verification and PDF downloads
                </p>
              </div>
              <button
                onClick={() => setEditingCert(null)}
                className="text-slate-400 hover:text-white font-bold text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2">
              {/* Form Controls */}
              <div className="lg:col-span-5 space-y-3.5">
                {/* Participant Name */}
                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">
                    Participant Name *
                  </label>
                  <input
                    type="text"
                    value={editRecipientName}
                    onChange={(e) => setEditRecipientName(e.target.value)}
                    placeholder="e.g. Marcus Vance"
                    className="gcl-input w-full py-2 text-sm font-semibold"
                  />
                </div>

                {/* Team */}
                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">
                    Team Affiliation
                  </label>
                  <select
                    value={editTeamId}
                    onChange={(e) => setEditTeamId(e.target.value)}
                    className="gcl-input w-full py-2 text-xs"
                  >
                    <option value="">No Team Affiliation</option>
                    {teams.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Certificate Type */}
                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">
                    Certificate Type
                  </label>
                  <select
                    value={editCertificateType}
                    onChange={(e) =>
                      setEditCertificateType(e.target.value as CertificateType)
                    }
                    className="gcl-input w-full py-2 text-xs"
                  >
                    {ALL_CERTIFICATE_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {CERTIFICATE_TYPE_LABELS[type]}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Custom Title Line */}
                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1 flex items-center justify-between">
                    <span>Title Line (e.g. OF PARTICIPATION)</span>
                  </label>
                  <input
                    type="text"
                    value={editCustomTitle}
                    onChange={(e) => setEditCustomTitle(e.target.value)}
                    placeholder="e.g. OF PARTICIPATION"
                    className="gcl-input w-full py-2 text-xs font-bold text-white tracking-wider"
                  />
                </div>

                {/* Achievement */}
                {['winner', 'runner_up', 'best_team'].includes(editCertificateType) && (
                  <div>
                    <label className="block text-xs font-mono text-slate-400 mb-1">
                      Achievement / Honor
                    </label>
                    <input
                      type="text"
                      value={editAchievement}
                      onChange={(e) => setEditAchievement(e.target.value)}
                      placeholder="e.g. Champion of GenCode League"
                      className="gcl-input w-full py-2 text-xs"
                    />
                  </div>
                )}

                {/* Custom Reason / Subtitle Description */}
                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">
                    Certificate Body / Description
                  </label>
                  <textarea
                    value={editCustomSubtitle}
                    onChange={(e) => setEditCustomSubtitle(e.target.value)}
                    rows={3}
                    placeholder="e.g. has actively participated in GenCode League as a proud member of"
                    className="gcl-input w-full py-2 px-3 text-xs leading-relaxed resize-none"
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-3">
                  <button
                    onClick={() => setEditingCert(null)}
                    className="flex-1 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveEdit}
                    disabled={savingEdit || !editRecipientName.trim()}
                    className="flex-1 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-glow-amber cursor-pointer disabled:opacity-50"
                  >
                    <Save size={14} />
                    {savingEdit ? 'Saving Changes...' : 'Save Changes'}
                  </button>
                </div>
              </div>

              {/* Real-time Live Preview */}
              <div className="lg:col-span-7 bg-slate-950/60 border border-slate-800 rounded-xl p-4 flex flex-col items-center justify-center">
                <div className="text-[11px] font-mono text-slate-400 mb-2 flex items-center gap-1.5 self-start">
                  <Eye size={13} className="text-cyan-400" /> Live Update Preview
                </div>
                <div
                  style={{
                    width: 1000 * 0.52,
                    height: 707 * 0.52,
                    overflow: 'hidden',
                    borderRadius: '8px',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
                  }}
                >
                  <CertificatePreview
                    recipientName={editRecipientName || 'Recipient Name'}
                    certificateType={editCertificateType}
                    certificateId={editingCert.certificate_id}
                    editionId={editingCert.edition_id}
                    templateVersion={editingCert.template_version}
                    editionName={editingCert.edition?.name}
                    teamName={
                      teams.find((t) => t.id === editTeamId)?.name || null
                    }
                    achievement={editAchievement || null}
                    customTitle={editCustomTitle}
                    customSubtitle={editCustomSubtitle}
                    issuedAt={editingCert.issued_at}
                    scale={0.52}
                    settings={settings}
                  />
                </div>
              </div>
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
              <strong className="text-white">
                {certToRevoke.recipient_name}
              </strong>
              . This action is recorded in the audit log.
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
