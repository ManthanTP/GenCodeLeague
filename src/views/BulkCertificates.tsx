import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import JSZip from 'jszip';
import {
  UploadCloud,
  Layers,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Download,
  ChevronLeft,
  RefreshCw,
  Eye,
  ShieldCheck,
  Check,
  Award,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import Header from '../components/Header';
import Notification, { type NotificationState } from '../components/Notification';
import CertificatePreview from '../components/CertificatePreview';
import {
  generateCertificateId,
  getEditionCode,
  logAdminAction,
} from '../utils/certificateUtils';
import {
  generateCertificatePdfBlob,
  uploadCertificatePdf,
} from '../utils/pdfGenerator';
import type {
  CertificateTemplate,
  CertificateType,
} from '../types/certificates';
import type { Edition, Team } from '../types/database';

interface CsvRow {
  index: number;
  name: string;
  team: string;
  certificate_type: string;
  matchedTeam?: Team | null;
  validType?: CertificateType;
  errors: string[];
}

interface GeneratedItem {
  certificate_id: string;
  recipient_name: string;
  team_name?: string;
  certificate_type: CertificateType;
  status: 'success' | 'failed';
  error?: string;
  pdfBlob?: Blob;
}

const VALID_TYPES: CertificateType[] = [
  'participation',
  'winner',
  'runner_up',
  'best_team',
  'judge',
  'volunteer',
  'organizer',
  'mentor',
];

export default function BulkCertificates() {
  const navigate = useNavigate();
  const { profile, loading: authLoading } = useAuth();

  // Authentication check: matches AdminPanel
  const isMasterAuthed =
    sessionStorage.getItem('gcl_admin_authenticated') === 'true';
  const isAdmin = isMasterAuthed || profile?.role === 'admin';

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      navigate('/123456789/GCL-0321/admin/login');
    }
  }, [authLoading, isAdmin, navigate]);

  const [notification, setNotification] = useState<NotificationState | null>(null);
  const [editions, setEditions] = useState<Edition[]>([]);
  const [selectedEditionId, setSelectedEditionId] = useState<string>('');
  const [teams, setTeams] = useState<Team[]>([]);
  const [templates, setTemplates] = useState<CertificateTemplate[]>([]);

  // CSV States
  const [rawCsv, setRawCsv] = useState<string>('');
  const [parsedRows, setParsedRows] = useState<CsvRow[]>([]);
  const [csvFileName, setCsvFileName] = useState<string>('');

  // Generation progress & results
  const [isGenerating, setIsGenerating] = useState(false);
  const [progressIndex, setProgressIndex] = useState(0);
  const [totalToGenerate, setTotalToGenerate] = useState(0);
  const [results, setResults] = useState<GeneratedItem[] | null>(null);
  const [isZipping, setIsZipping] = useState(false);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3500);
  };

  // Load Editions
  useEffect(() => {
    supabase
      .from('editions')
      .select('*')
      .order('year', { ascending: false })
      .then(({ data }) => {
        if (data && data.length > 0) {
          setEditions(data);
          const current = data.find((e) => e.is_current) || data[0];
          setSelectedEditionId(current.id);
        }
      });
  }, []);

  // Load Teams for selected edition
  useEffect(() => {
    if (!selectedEditionId) return;
    supabase
      .from('teams')
      .select('*')
      .eq('edition_id', selectedEditionId)
      .then(({ data }) => {
        if (data) setTeams(data);
      });
  }, [selectedEditionId]);

  // Load Active Templates
  useEffect(() => {
    supabase
      .from('certificate_templates')
      .select('*')
      .eq('is_active', true)
      .then(({ data }) => {
        if (data) setTemplates(data as CertificateTemplate[]);
      });
  }, []);

  const activeEdition = useMemo(() => {
    return editions.find((e) => e.id === selectedEditionId) || null;
  }, [editions, selectedEditionId]);

  // Template map for quick lookup by type
  const templateMap = useMemo(() => {
    const map = new Map<CertificateType, CertificateTemplate>();
    templates.forEach((t) => {
      map.set(t.certificate_type, t);
    });
    return map;
  }, [templates]);

  // Parse and validate CSV rows whenever rawCsv, teams, or selectedEditionId change
  useEffect(() => {
    if (!rawCsv.trim()) {
      setParsedRows([]);
      return;
    }

    const lines = rawCsv
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    if (lines.length === 0) {
      setParsedRows([]);
      return;
    }

    // Check if line 0 is a header
    let startIndex = 0;
    const firstLineLower = lines[0].toLowerCase();
    if (
      firstLineLower.includes('name') ||
      firstLineLower.includes('team') ||
      firstLineLower.includes('type')
    ) {
      startIndex = 1;
    }

    const validated: CsvRow[] = [];

    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i];
      // Basic CSV column split handling quotes
      const parts = line.split(',').map((p) => p.trim().replace(/^["']|["']$/g, ''));
      const name = parts[0] || '';
      const teamName = parts[1] || '';
      const rawType = (parts[2] || '').toLowerCase().replace(/[\s-]/g, '_');

      const errors: string[] = [];

      // Validate Name
      if (!name) {
        errors.push('Recipient name is empty');
      }

      // Validate Certificate Type
      let matchedType: CertificateType | undefined;
      if (!rawType) {
        errors.push('Certificate type is missing');
      } else if (!VALID_TYPES.includes(rawType as CertificateType)) {
        errors.push(
          `Invalid type "${rawType}". Allowed: ${VALID_TYPES.join(', ')}`
        );
      } else {
        matchedType = rawType as CertificateType;
      }

      // Validate Team (Optional, but if specified, must exist in selected edition)
      let matchedTeam: Team | null = null;
      if (teamName) {
        const found = teams.find(
          (t) => t.name.toLowerCase() === teamName.toLowerCase()
        );
        if (!found) {
          errors.push(
            `Team "${teamName}" does not exist in ${activeEdition?.name || 'this edition'}`
          );
        } else {
          matchedTeam = found;
        }
      }

      validated.push({
        index: i,
        name,
        team: teamName,
        certificate_type: rawType,
        matchedTeam,
        validType: matchedType,
        errors,
      });
    }

    setParsedRows(validated);
  }, [rawCsv, teams, activeEdition]);

  // Overall error count
  const totalErrors = useMemo(() => {
    return parsedRows.reduce((acc, row) => acc + row.errors.length, 0);
  }, [parsedRows]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCsvFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setRawCsv(text || '');
      setResults(null);
    };
    reader.readAsText(file);
  };

  const handleLoadSampleCsv = () => {
    const sampleTeam = teams[0]?.name || 'Team Alpha';
    const sample = `name,team,certificate_type
John Doe,${sampleTeam},participation
Jane Smith,${sampleTeam},winner
Carlos Ray,${sampleTeam},runner_up
Priya Sharma,,volunteer`;
    setRawCsv(sample);
    setCsvFileName('sample_gcl_bulk.csv');
    setResults(null);
  };

  // Generate All Handler
  const handleGenerateAll = async () => {
    if (parsedRows.length === 0 || totalErrors > 0) return;
    if (!selectedEditionId) {
      showToast('Please select a valid edition', 'error');
      return;
    }

    setIsGenerating(true);
    setProgressIndex(0);
    setTotalToGenerate(parsedRows.length);

    const generatedResults: GeneratedItem[] = [];
    const edCode = getEditionCode(activeEdition?.year, activeEdition?.name);

    for (let i = 0; i < parsedRows.length; i++) {
      const row = parsedRows[i];
      setProgressIndex(i + 1);

      try {
        const certType = row.validType || 'participation';
        const template = templateMap.get(certType) || templates[0];

        if (!template) {
          throw new Error(`No active template found for ${certType}`);
        }

        const certId = generateCertificateId(edCode, certType);

        // Generate PDF from dedicated DOM element
        const el = document.getElementById(`bulk-preview-item-${row.index}`);
        let pdfBlob: Blob | undefined;
        let pdfUrl: string | null = null;

        if (el) {
          const { blob } = await generateCertificatePdfBlob(el, certId);
          pdfBlob = blob;
          pdfUrl = await uploadCertificatePdf(certId, blob);
        }

        // Insert individual database record
        const { error: dbError } = await supabase.from('certificates').insert({
          certificate_id: certId,
          edition_id: selectedEditionId,
          team_id: row.matchedTeam?.id || null,
          recipient_name: row.name,
          certificate_type: certType,
          template_id: template.id,
          template_version: template.version,
          status: 'valid',
          pdf_url: pdfUrl,
          verify_view_count: 0,
        });

        if (dbError) throw dbError;

        generatedResults.push({
          certificate_id: certId,
          recipient_name: row.name,
          team_name: row.team,
          certificate_type: certType,
          status: 'success',
          pdfBlob,
        });
      } catch (err: any) {
        generatedResults.push({
          certificate_id: 'FAILED',
          recipient_name: row.name,
          team_name: row.team,
          certificate_type: row.validType || 'participation',
          status: 'failed',
          error: err?.message || 'Generation failed',
        });
      }
    }

    // Log the bulk generation in audit_log
    const successfulCount = generatedResults.filter(
      (r) => r.status === 'success'
    ).length;

    await logAdminAction('BULK_CERTIFICATES_GENERATED', {
      edition_id: selectedEditionId,
      total_rows: parsedRows.length,
      successful_count: successfulCount,
    });

    setResults(generatedResults);
    setIsGenerating(false);
    showToast(
      `Bulk Generation Complete: ${successfulCount} of ${parsedRows.length} certificates issued!`,
      'success'
    );
  };

  // Download All as ZIP Handler
  const handleDownloadZip = async () => {
    if (!results || results.length === 0) return;

    setIsZipping(true);
    showToast('Bundling individual PDFs into ZIP archive...', 'success');

    try {
      const zip = new JSZip();
      let addedCount = 0;

      for (const item of results) {
        if (item.status === 'success' && item.pdfBlob) {
          zip.file(`${item.certificate_id}.pdf`, item.pdfBlob);
          addedCount++;
        }
      }

      if (addedCount === 0) {
        showToast('No PDF binaries available to bundle into ZIP', 'error');
        setIsZipping(false);
        return;
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const downloadUrl = URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `${activeEdition?.name || 'GCL'}_Certificates_Bulk.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(downloadUrl);

      showToast(`ZIP archive with ${addedCount} certificates downloaded!`, 'success');
    } catch (err) {
      showToast('Failed to create ZIP bundle.', 'error');
    } finally {
      setIsZipping(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans selection:bg-cyan-500 selection:text-black pb-20">
      <Header
        viewMode="admin"
        onToggleView={() => navigate('/')}
        isAdminAuthenticated={true}
        onLogout={() => {
          sessionStorage.removeItem('gcl_admin_authenticated');
          navigate('/123456789/GCL-0321/admin/login');
        }}
      />
      <Notification notification={notification} />

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            to="/123456789/GCL-0321/admin"
            className="flex items-center gap-2 text-sm text-slate-400 hover:text-cyan-400 transition-colors"
          >
            <ChevronLeft size={16} /> Back to Admin Console
          </Link>

          <span className="text-xs font-mono text-cyan-400">
            PROTECTED BULK PIPELINE
          </span>
        </div>

        {/* Header Banner */}
        <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-cyan-500/30 backdrop-blur-md shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-400/40 flex items-center justify-center text-cyan-400 shadow-glow-cyan">
              <Layers size={26} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white flex items-center gap-2">
                Bulk Certificate Generation Engine
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Upload CSV, inspect live rendered preview cards, validate every student row, and generate independent certificates.
              </p>
            </div>
          </div>
        </div>

        {/* Result Screen (If Generation Finished) */}
        {results && (
          <div className="bg-slate-900/80 border border-emerald-500/50 rounded-2xl p-6 sm:p-8 backdrop-blur-md shadow-2xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center text-emerald-400">
                  <CheckCircle2 size={28} />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-white">
                    {results.filter((r) => r.status === 'success').length} Certificates Generated
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Every certificate is saved as an individual verifiable record and uploaded to storage.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleDownloadZip}
                  disabled={isZipping}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black font-extrabold text-sm shadow-glow-emerald flex items-center gap-2 transition-all disabled:opacity-50"
                >
                  <Download size={18} />
                  {isZipping ? 'Bundling ZIP...' : 'Download All as ZIP'}
                </button>

                <button
                  onClick={() => {
                    setResults(null);
                    setRawCsv('');
                    setParsedRows([]);
                  }}
                  className="px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-sm transition-colors"
                >
                  New Batch
                </button>
              </div>
            </div>

            {/* Success / Failure Ledger Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-mono uppercase">
                    <th className="py-2.5 px-3">#</th>
                    <th className="py-2.5 px-3">Certificate ID</th>
                    <th className="py-2.5 px-3">Recipient Name</th>
                    <th className="py-2.5 px-3">Team</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3 text-right">Verify Link</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-sans">
                  {results.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/30">
                      <td className="py-2.5 px-3 font-mono text-slate-500">
                        {idx + 1}
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-cyan-400">
                        {item.certificate_id}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-white">
                        {item.recipient_name}
                      </td>
                      <td className="py-2.5 px-3 text-slate-400">
                        {item.team_name || '—'}
                      </td>
                      <td className="py-2.5 px-3 capitalize text-slate-300">
                        {item.certificate_type.replace('_', ' ')}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {item.status === 'success' ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                            SUCCESS
                          </span>
                        ) : (
                          <span
                            className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-red-500/20 text-red-400 border border-red-500/40"
                            title={item.error}
                          >
                            FAILED
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        {item.status === 'success' && (
                          <a
                            href={`/verify/${item.certificate_id}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-cyan-400 hover:underline font-mono"
                          >
                            /verify/{item.certificate_id}
                          </a>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Input Configuration & Upload Form */}
        {!results && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-4 bg-slate-900/70 border border-slate-800 rounded-2xl p-6 backdrop-blur-md shadow-xl space-y-6">
              <h2 className="text-lg font-bold text-white flex items-center gap-2 pb-3 border-b border-slate-800">
                <UploadCloud size={20} className="text-cyan-400" />
                1. Select Edition & CSV
              </h2>

              {/* Edition Selector */}
              <div>
                <label className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-1.5 block">
                  Target Event Edition *
                </label>
                <select
                  value={selectedEditionId}
                  onChange={(e) => setSelectedEditionId(e.target.value)}
                  className="gcl-input w-full"
                  disabled={isGenerating}
                >
                  {editions.map((ed) => (
                    <option key={ed.id} value={ed.id}>
                      {ed.name} ({ed.year}) {ed.is_current ? '— [CURRENT]' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* File Upload Zone */}
              <div>
                <label className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-1.5 block">
                  CSV File (`name,team,certificate_type`)
                </label>
                <label className="border-2 border-dashed border-slate-700 hover:border-cyan-500 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer bg-slate-950/50 transition-colors">
                  <UploadCloud size={32} className="text-cyan-400 mb-2" />
                  <span className="text-xs font-semibold text-slate-300">
                    {csvFileName ? csvFileName : 'Click to select CSV file'}
                  </span>
                  <span className="text-[10px] text-slate-500 mt-1">
                    Format: name,team,certificate_type
                  </span>
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    onChange={handleFileUpload}
                    className="hidden"
                    disabled={isGenerating}
                  />
                </label>
              </div>

              {/* Direct Paste CSV Fallback */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs text-slate-400 uppercase font-bold tracking-wider">
                    Or Paste CSV Data
                  </label>
                  <button
                    type="button"
                    onClick={handleLoadSampleCsv}
                    className="text-[11px] text-cyan-400 hover:underline font-mono"
                  >
                    Load Sample
                  </button>
                </div>
                <textarea
                  value={rawCsv}
                  onChange={(e) => {
                    setRawCsv(e.target.value);
                    setResults(null);
                  }}
                  placeholder="name,team,certificate_type&#10;John Doe,Team Alpha,participation&#10;Jane Smith,Team Beta,winner"
                  rows={6}
                  className="gcl-input w-full font-mono text-xs resize-none"
                  disabled={isGenerating}
                />
              </div>

              {/* Status Summary & Generate Action */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Total Rows Detected:</span>
                  <span className="font-mono font-bold text-white">
                    {parsedRows.length}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Validation Errors:</span>
                  <span
                    className={`font-mono font-bold ${
                      totalErrors > 0 ? 'text-red-400' : 'text-emerald-400'
                    }`}
                  >
                    {totalErrors}
                  </span>
                </div>

                {isGenerating && (
                  <div className="space-y-1.5 pt-2 border-t border-slate-800">
                    <div className="flex justify-between text-[11px] font-mono text-slate-400">
                      <span>Generating:</span>
                      <span className="text-cyan-400">
                        {progressIndex} / {totalToGenerate}
                      </span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-cyan-500 h-full transition-all duration-200"
                        style={{
                          width: `${(progressIndex / (totalToGenerate || 1)) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleGenerateAll}
                  disabled={
                    isGenerating ||
                    parsedRows.length === 0 ||
                    totalErrors > 0
                  }
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-extrabold text-sm shadow-glow-cyan disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 mt-2"
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw size={18} className="animate-spin" />
                      Issuing {progressIndex} of {totalToGenerate}...
                    </>
                  ) : (
                    <>
                      <Award size={18} />
                      Generate All ({parsedRows.length} Certificates)
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Right: Mandatory Live Preview Grid & Validation List */}
            <div className="lg:col-span-8 bg-slate-900/70 border border-slate-800 rounded-2xl p-6 backdrop-blur-md shadow-xl space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Eye size={20} className="text-cyan-400" />
                  <h2 className="text-lg font-bold text-white">
                    2. Mandatory Preview & Row Validation
                  </h2>
                </div>
                <span className="text-xs font-mono text-slate-400">
                  {parsedRows.length} item(s) in batch
                </span>
              </div>

              {parsedRows.length === 0 ? (
                <div className="py-20 text-center text-slate-500 italic space-y-2">
                  <FileText size={40} className="mx-auto text-slate-600 opacity-60" />
                  <p>Upload a CSV file or paste data above to inspect live previews.</p>
                </div>
              ) : (
                <div className="space-y-6 max-h-[750px] overflow-y-auto pr-2">
                  {parsedRows.map((row) => {
                    const certType = row.validType || 'participation';
                    const template = templateMap.get(certType) || templates[0];
                    const hasError = row.errors.length > 0;
                    const sampleId = `${getEditionCode(activeEdition?.year, activeEdition?.name)}-${certType.slice(0, 4).toUpperCase()}-PREVIEW`;

                    return (
                      <div
                        key={row.index}
                        className={`p-4 rounded-xl border transition-all ${
                          hasError
                            ? 'bg-red-950/20 border-red-500/50'
                            : 'bg-slate-950/60 border-slate-800'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-800/80">
                          <div className="flex items-center gap-3">
                            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                              #{row.index}
                            </span>
                            <span className="font-bold text-white text-base">
                              {row.name || 'Unnamed Recipient'}
                            </span>
                            <span className="text-xs text-slate-400">
                              • Team: {row.team || 'None (Individual)'}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono capitalize px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                              {certType.replace('_', ' ')}
                            </span>
                            {hasError ? (
                              <span className="text-xs font-mono font-bold text-red-400 flex items-center gap-1 bg-red-950/60 px-2 py-0.5 rounded border border-red-500/40">
                                <AlertTriangle size={12} /> INVALID
                              </span>
                            ) : (
                              <span className="text-xs font-mono font-bold text-emerald-400 flex items-center gap-1 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/40">
                                <Check size={12} /> READY
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Inline Errors if any */}
                        {hasError && (
                          <div className="mb-4 p-3 rounded-lg bg-red-950/40 border border-red-500/40 space-y-1">
                            {row.errors.map((err, errIdx) => (
                              <div
                                key={errIdx}
                                className="text-xs text-red-300 flex items-center gap-2 font-mono"
                              >
                                <AlertTriangle size={14} className="text-red-400 shrink-0" />
                                <span>{err}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Live Scaled Preview of the certificate */}
                        <div className="overflow-x-auto flex justify-center py-2 bg-black/40 rounded-lg border border-slate-800/50">
                          <div
                            id={`bulk-preview-item-${row.index}`}
                            style={{
                              width: 1000 * 0.45,
                              height: 707 * 0.45,
                              position: 'relative',
                            }}
                          >
                            <CertificatePreview
                              recipientName={row.name || 'Sample Name'}
                              certificateType={certType}
                              certificateId={sampleId}
                              designConfig={
                                template?.design_config || {
                                  title: 'Certificate of ' + certType,
                                  primary_color: '#00f0ff',
                                  secondary_color: '#7000ff',
                                }
                              }
                              templateVersion={template?.version || 1}
                              editionName={activeEdition?.name || 'GenCode League'}
                              teamName={row.matchedTeam?.name || row.team}
                              scale={0.45}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
