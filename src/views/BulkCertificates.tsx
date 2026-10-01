import React, { useState, useEffect, useMemo } from 'react';
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
  ShieldCheck,
  Check,
  Award,
  Users,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import Header from '../components/Header';
import Notification, { type NotificationState } from '../components/Notification';
import {
  generateCertificateId,
  getEditionCode,
  logAdminAction,
  ALL_CERTIFICATE_TYPES,
} from '../utils/certificateUtils';
import {
  renderCertificatePdfBlob,
} from '../utils/pdfGenerator';
import type { CertificateType } from '../types/certificates';
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

export default function BulkCertificates() {
  const navigate = useNavigate();
  const { profile, loading: authLoading } = useAuth();

  // Pure Supabase Admin Authentication check
  const isAdmin = profile?.role === 'admin';

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      navigate('/123456789/GCL-0321/admin/login');
    }
  }, [authLoading, isAdmin, navigate]);

  const [notification, setNotification] = useState<NotificationState | null>(null);
  const [editions, setEditions] = useState<Edition[]>([]);
  const [selectedEditionId, setSelectedEditionId] = useState<string>('');
  const [teams, setTeams] = useState<Team[]>([]);

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

  const activeEdition = useMemo(() => {
    return editions.find((e) => e.id === selectedEditionId) || null;
  }, [editions, selectedEditionId]);

  // Parse and validate CSV rows
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
      const parts = line.split(',').map((p) => p.trim().replace(/^["']|["']$/g, ''));
      const name = parts[0] || '';
      const teamName = parts[1] || '';
      const rawType = (parts[2] || '').toLowerCase().replace(/[\s-]/g, '_');

      const errors: string[] = [];

      if (!name) {
        errors.push('Recipient name is empty');
      }

      let matchedType: CertificateType | undefined;
      if (!rawType) {
        errors.push('Certificate type is missing');
      } else if (!ALL_CERTIFICATE_TYPES.includes(rawType as CertificateType)) {
        errors.push(
          `Invalid type "${rawType}". Allowed: ${ALL_CERTIFICATE_TYPES.join(', ')}`
        );
      } else {
        matchedType = rawType as CertificateType;
      }

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

  const handleImportRegisteredTeamMembers = async () => {
    if (!selectedEditionId || teams.length === 0) {
      showToast('No teams found in this edition', 'error');
      return;
    }
    const teamIds = teams.map((t) => t.id);
    const { data: members, error } = await supabase
      .from('team_members')
      .select('*')
      .in('team_id', teamIds)
      .order('full_name', { ascending: true });

    if (error || !members || members.length === 0) {
      showToast('No registered members found for teams in this edition. Add members in Event Configuration.', 'error');
      return;
    }

    const teamMap = new Map(teams.map((t) => [t.id, t.name]));
    const lines = ['name,team,certificate_type'];
    for (const m of members) {
      const name = (m.full_name || m.name || '').trim();
      const teamName = teamMap.get(m.team_id) || '';
      if (name) {
        lines.push(`${name},${teamName},participation`);
      }
    }

    setRawCsv(lines.join('\n'));
    setResults(null);
    setCsvFileName('Registered_Team_Members.csv');
    showToast(`Loaded ${lines.length - 1} registered team members into CSV!`, 'success');
  };

  // ─── Generate All ───
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
        const certId = generateCertificateId(edCode, certType);

        // Render PDF blob in browser (no Supabase upload)
        let pdfBlob: Blob | undefined;
        try {
          pdfBlob = await renderCertificatePdfBlob({
            recipient_name: row.name,
            certificate_type: certType,
            certificate_id: certId,
            edition_id: selectedEditionId,
            template_version: 1,
            edition_name: activeEdition?.name || 'GenCode League',
            team_name: row.matchedTeam?.name || row.team || null,
          });
        } catch (renderErr) {
          console.warn(`PDF render failed for ${certId}:`, renderErr);
        }

        // Insert database record (metadata only — no pdf_url)
        const { error: dbError } = await supabase.from('certificates').insert({
          certificate_id: certId,
          edition_id: selectedEditionId,
          team_id: row.matchedTeam?.id || null,
          recipient_name: row.name,
          certificate_type: certType,
          template_version: 1,
          status: 'valid',
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

  // ─── Download All as ZIP ───
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
      const url = window.URL.createObjectURL(zipBlob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `GCL_Certificates_Bulk_${activeEdition?.year || ''}.zip`;
      document.body.appendChild(anchor);
      anchor.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(anchor);

      showToast(`ZIP archive downloaded with ${addedCount} PDFs!`, 'success');
    } catch (err: any) {
      showToast(err?.message || 'ZIP creation failed', 'error');
    } finally {
      setIsZipping(false);
    }
  };

  if (authLoading || !isAdmin) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans selection:bg-cyan-500 selection:text-black">
      <Header viewMode="live" onToggleView={() => {}} />
      <Notification notification={notification} />

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            to="/123456789/GCL-0321/admin"
            className="flex items-center gap-2 text-sm text-slate-400 hover:text-cyan-400 transition-colors"
          >
            <ChevronLeft size={16} /> Back to Admin Panel
          </Link>
        </div>

        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
              <Layers size={22} className="text-cyan-400" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white">Bulk Certificate Generator</h1>
              <p className="text-xs text-slate-400 font-mono">
                Upload CSV → Validate → Issue all at once
              </p>
            </div>
          </div>

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
        </div>

        {/* CSV Input Section */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 backdrop-blur-md shadow-xl">
          <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-4">
            <UploadCloud size={16} className="text-cyan-400" />
            Upload or Paste CSV Data
          </h3>

          <p className="text-xs text-slate-400 mb-3">
            CSV format: <code className="text-cyan-400 bg-slate-950 px-1.5 py-0.5 rounded text-[10px]">name,team,certificate_type</code>. 
            Valid types: {ALL_CERTIFICATE_TYPES.join(', ')}.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <label className="flex-1 cursor-pointer">
              <div className="px-4 py-8 rounded-xl border-2 border-dashed border-slate-700 hover:border-cyan-500/50 bg-slate-950/40 text-center transition-colors">
                <UploadCloud size={28} className="mx-auto mb-2 text-slate-500" />
                <p className="text-xs font-semibold text-slate-400">
                  {csvFileName || 'Drop CSV file or click to upload'}
                </p>
              </div>
              <input
                type="file"
                accept=".csv,.txt"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>

            <div className="flex flex-col gap-2 self-end">
              <button
                type="button"
                onClick={handleImportRegisteredTeamMembers}
                className="px-4 py-2 rounded-lg bg-cyan-950 hover:bg-cyan-900 border border-cyan-800 text-xs font-bold text-cyan-300 flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Populate CSV rows directly from teams and members registered in Event Configuration"
              >
                <Users size={14} className="text-cyan-400" /> Import Registered Team Members
              </button>
              <button
                type="button"
                onClick={handleLoadSampleCsv}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <FileText size={14} /> Load Sample CSV
              </button>
            </div>
          </div>

          <textarea
            value={rawCsv}
            onChange={(e) => {
              setRawCsv(e.target.value);
              setResults(null);
            }}
            placeholder={`name,team,certificate_type\nJohn Doe,Team Alpha,participation\nJane Smith,Team Beta,winner`}
            rows={8}
            className="gcl-input w-full font-mono text-xs resize-y"
          />
        </div>

        {/* Validation Preview */}
        {parsedRows.length > 0 && (
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 backdrop-blur-md shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <CheckCircle2 size={16} className={totalErrors > 0 ? 'text-amber-400' : 'text-emerald-400'} />
                Validation Preview
                <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-slate-800 text-cyan-400 border border-slate-700">
                  {parsedRows.length} rows
                </span>
                {totalErrors > 0 && (
                  <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-red-950 text-red-400 border border-red-900/50">
                    {totalErrors} errors
                  </span>
                )}
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-left">
                    <th className="pb-2 px-2 text-slate-400 font-mono">#</th>
                    <th className="pb-2 px-2 text-slate-400 font-mono">Name</th>
                    <th className="pb-2 px-2 text-slate-400 font-mono">Team</th>
                    <th className="pb-2 px-2 text-slate-400 font-mono">Type</th>
                    <th className="pb-2 px-2 text-slate-400 font-mono">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedRows.map((row) => (
                    <tr
                      key={row.index}
                      className={`border-b border-slate-900 ${row.errors.length > 0 ? 'bg-red-950/10' : ''}`}
                    >
                      <td className="py-2 px-2 text-slate-500 font-mono">{row.index}</td>
                      <td className="py-2 px-2 font-semibold text-white">{row.name || '—'}</td>
                      <td className="py-2 px-2 text-slate-300">{row.team || '—'}</td>
                      <td className="py-2 px-2 capitalize text-cyan-400">
                        {row.certificate_type || '—'}
                      </td>
                      <td className="py-2 px-2">
                        {row.errors.length === 0 ? (
                          <span className="text-emerald-400 flex items-center gap-1">
                            <Check size={12} /> Valid
                          </span>
                        ) : (
                          <div className="text-red-400">
                            {row.errors.map((err, idx) => (
                              <div key={idx} className="flex items-start gap-1">
                                <AlertTriangle size={11} className="mt-0.5 shrink-0" />
                                <span>{err}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Generate Button */}
            <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-slate-800">
              <button
                onClick={handleGenerateAll}
                disabled={isGenerating || totalErrors > 0 || parsedRows.length === 0}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-extrabold text-sm shadow-glow-cyan disabled:opacity-50 transition-all flex items-center gap-2"
              >
                <Award size={18} />
                {isGenerating
                  ? `Generating ${progressIndex}/${totalToGenerate}...`
                  : `Issue All ${parsedRows.length} Certificates`}
              </button>
            </div>
          </div>
        )}

        {/* Generation Progress */}
        {isGenerating && (
          <div className="bg-slate-900/60 border border-cyan-500/30 rounded-2xl p-6 backdrop-blur-md">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-6 h-6 border-3 border-cyan-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm font-bold text-white">
                Generating certificate {progressIndex} of {totalToGenerate}...
              </span>
            </div>
            <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full transition-all"
                style={{ width: `${(progressIndex / totalToGenerate) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Results Section */}
        {results && !isGenerating && (
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 backdrop-blur-md shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <ShieldCheck size={16} className="text-emerald-400" />
                Generation Results
                <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-900/50">
                  {results.filter((r) => r.status === 'success').length} ✓
                </span>
                {results.some((r) => r.status === 'failed') && (
                  <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-red-950 text-red-400 border border-red-900/50">
                    {results.filter((r) => r.status === 'failed').length} ✗
                  </span>
                )}
              </h3>

              <button
                onClick={handleDownloadZip}
                disabled={isZipping || !results.some((r) => r.status === 'success' && r.pdfBlob)}
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-bold text-xs flex items-center gap-2 disabled:opacity-50"
              >
                <Download size={14} />
                {isZipping ? 'Zipping...' : 'Download All as ZIP'}
              </button>
            </div>

            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {results.map((item, idx) => (
                <div
                  key={idx}
                  className={`flex items-center justify-between gap-3 p-3 rounded-xl border ${
                    item.status === 'success'
                      ? 'bg-slate-950/60 border-slate-800/80'
                      : 'bg-red-950/20 border-red-900/40'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {item.status === 'success' ? (
                        <Check size={14} className="text-emerald-400 shrink-0" />
                      ) : (
                        <AlertTriangle size={14} className="text-red-400 shrink-0" />
                      )}
                      <span className="text-sm font-bold text-white truncate">
                        {item.recipient_name}
                      </span>
                    </div>
                    <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                      {item.status === 'success' ? (
                        <span className="text-amber-400 font-bold">{item.certificate_id}</span>
                      ) : (
                        <span className="text-red-400">{item.error}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
