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
import '../admin.css';

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

        // Check if certificate already exists in selectedEditionId for this recipient
        const { data: existingCerts } = await supabase
          .from('certificates')
          .select('*')
          .eq('edition_id', selectedEditionId)
          .ilike('recipient_name', row.name.trim());

        let finalCertId = certId;
        if (existingCerts && existingCerts.length > 0) {
          const existing = existingCerts[0];
          finalCertId = existing.certificate_id;
          const { error: updateErr } = await supabase
            .from('certificates')
            .update({
              team_id: row.matchedTeam?.id || null,
              certificate_type: certType,
              status: 'valid',
              issued_at: new Date().toISOString(),
            })
            .eq('id', existing.id);

          if (updateErr) throw updateErr;
        } else {
          // Insert database record (metadata only — no pdf_url)
          const { error: dbError } = await supabase.from('certificates').insert({
            certificate_id: certId,
            edition_id: selectedEditionId,
            team_id: row.matchedTeam?.id || null,
            recipient_name: row.name.trim(),
            certificate_type: certType,
            template_version: 1,
            status: 'valid',
            verify_view_count: 0,
          });

          if (dbError) throw dbError;
        }

        generatedResults.push({
          certificate_id: finalCertId,
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
      <div className="admin-shell min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-[#ff2a3d] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="admin-shell">
      <Header viewMode="admin" onToggleView={() => {}} />
      <Notification notification={notification} />

      <main className="admin-content-wrap space-y-6">
        {/* Breadcrumb & Navigation */}
        <div className="flex items-center justify-between">
          <Link
            to="/123456789/GCL-0321/admin?tab=certificates"
            className="flex items-center gap-2 text-xs text-[#8e8e9a] hover:text-[#ff4d5a] transition-colors font-mono uppercase tracking-wider font-bold"
          >
            <ChevronLeft size={16} /> Back to Certificate Hub
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-[#8e8e9a] uppercase font-bold">Target Edition:</span>
            <select
              value={selectedEditionId}
              onChange={(e) => setSelectedEditionId(e.target.value)}
              className="gcl-input text-xs font-mono py-1 px-3 w-auto"
            >
              {editions.map((ed) => (
                <option key={ed.id} value={ed.id}>
                  {ed.name} ({ed.year})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Hero Card */}
        <div className="admin-hero-card">
          <div className="admin-hero-pill">
            <span className="admin-hero-dot" />
            <span>ACCREDITATION GATEWAY</span>
          </div>
          <h1 className="admin-hero-title">Bulk Certificate Generator</h1>
          <p className="admin-hero-desc">
            Upload CSV data or import registered team rosters, validate credential schemas, and issue cryptographically verifiable certificates in one automated batch.
          </p>
        </div>

        {/* CSV Input Section */}
        <div className="admin-card space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-[#24242c]">
            <h3 className="admin-card-title mb-0">
              <UploadCloud size={20} className="text-[#ff4d5a]" />
              Upload or Paste Participant CSV
            </h3>
            <span className="text-xs font-mono text-[#8e8e9a]">
              Required columns: <code className="text-[#ff9da6] bg-[#0a0a0c] px-2 py-0.5 rounded border border-[#24242c]">name,team,certificate_type</code>
            </span>
          </div>

          <p className="text-xs text-[#8e8e9a]">
            Accepted certificate types: <span className="font-mono text-[#e8e8ed]">{ALL_CERTIFICATE_TYPES.join(', ')}</span>.
          </p>

          <div className="flex flex-col sm:flex-row gap-3">
            <label className="flex-1 cursor-pointer">
              <div className="px-4 py-8 rounded-xl border-2 border-dashed border-[#282834] hover:border-[#ff2a3d]/60 bg-[#0a0a0c] text-center transition-all">
                <UploadCloud size={30} className="mx-auto mb-2 text-[#8e8e9a]" />
                <p className="text-xs font-bold text-[#e8e8ed]">
                  {csvFileName || 'Drop CSV file or click to browse'}
                </p>
                <p className="text-[10px] text-[#8e8e9a] font-mono mt-1">.csv or .txt file</p>
              </div>
              <input
                type="file"
                accept=".csv,.txt"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>

            <div className="flex flex-col gap-2.5 self-center sm:self-end">
              <button
                type="button"
                onClick={handleImportRegisteredTeamMembers}
                className="admin-btn-secondary"
                title="Populate CSV rows directly from teams and members registered in Event Configuration"
              >
                <Users size={15} /> Import Registered Roster
              </button>
              <button
                type="button"
                onClick={handleLoadSampleCsv}
                className="admin-btn-neutral"
              >
                <FileText size={15} /> Load Sample Template
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs text-[#8e8e9a] font-mono uppercase font-bold block mb-1">
              CSV Content Editor
            </label>
            <textarea
              value={rawCsv}
              onChange={(e) => {
                setRawCsv(e.target.value);
                setResults(null);
              }}
              placeholder={`name,team,certificate_type\nAryan Sharma,Team Alpha,winner\nJane Smith,Team Beta,participation`}
              rows={8}
              className="gcl-input w-full font-mono text-xs resize-y"
            />
          </div>
        </div>

        {/* Validation Preview */}
        {parsedRows.length > 0 && (
          <div className="admin-card space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#24242c] flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={20} className={totalErrors > 0 ? 'text-[#f59e0b]' : 'text-[#2fd16f]'} />
                <h3 className="admin-card-title mb-0">Validation Preview</h3>
                <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-[#14141a] text-[#e8e8ed] border border-[#24242c]">
                  {parsedRows.length} rows
                </span>
                {totalErrors > 0 && (
                  <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-red-950/80 text-[#ff4d5a] border border-red-800/60 font-bold">
                    {totalErrors} errors
                  </span>
                )}
              </div>
            </div>

            <div className="admin-table-container max-h-[360px] overflow-y-auto">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th className="w-12 text-center">#</th>
                    <th>Recipient Name</th>
                    <th>Team</th>
                    <th>Certificate Type</th>
                    <th>Validation Status</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedRows.map((row) => (
                    <tr
                      key={row.index}
                      className={row.errors.length > 0 ? 'bg-red-950/20' : ''}
                    >
                      <td className="text-center font-mono text-[#8e8e9a]">{row.index}</td>
                      <td className="font-bold text-white">{row.name || '—'}</td>
                      <td className="text-[#8e8e9a]">{row.team || '—'}</td>
                      <td className="capitalize font-mono text-[#ff9da6]">
                        {row.certificate_type || '—'}
                      </td>
                      <td>
                        {row.errors.length === 0 ? (
                          <span className="text-[#2fd16f] font-mono text-xs flex items-center gap-1 font-bold">
                            <Check size={14} /> Ready
                          </span>
                        ) : (
                          <div className="text-[#ff4d5a] text-xs">
                            {row.errors.map((err, idx) => (
                              <div key={idx} className="flex items-start gap-1">
                                <AlertTriangle size={12} className="mt-0.5 shrink-0" />
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

            {/* Generate Action Button */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#24242c]">
              <button
                onClick={handleGenerateAll}
                disabled={isGenerating || totalErrors > 0 || parsedRows.length === 0}
                className="admin-btn-primary admin-btn-large"
              >
                <Award size={18} />
                {isGenerating
                  ? `Issuing ${progressIndex} / ${totalToGenerate}...`
                  : `Issue All ${parsedRows.length} Certificates`}
              </button>
            </div>
          </div>
        )}

        {/* Generation Progress */}
        {isGenerating && (
          <div className="admin-card space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 border-2 border-[#ff2a3d] border-t-transparent rounded-full animate-spin" />
              <span className="text-sm font-bold text-white font-mono">
                Issuing certificate {progressIndex} of {totalToGenerate}...
              </span>
            </div>
            <div className="w-full h-2.5 bg-[#14141a] rounded-full overflow-hidden border border-[#24242c]">
              <div
                className="h-full bg-gradient-to-r from-[#ff3b4d] to-[#c4101f] rounded-full transition-all"
                style={{ width: `${(progressIndex / totalToGenerate) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Results Section */}
        {results && !isGenerating && (
          <div className="admin-card space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#24242c] flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <ShieldCheck size={20} className="text-[#2fd16f]" />
                <h3 className="admin-card-title mb-0">Generation Results</h3>
                <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-[#14141a] text-[#2fd16f] border border-[#2fd16f]/40 font-bold">
                  {results.filter((r) => r.status === 'success').length} Issued
                </span>
                {results.some((r) => r.status === 'failed') && (
                  <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-red-950 text-[#ff4d5a] border border-red-800 font-bold">
                    {results.filter((r) => r.status === 'failed').length} Failed
                  </span>
                )}
              </div>

              <button
                onClick={handleDownloadZip}
                disabled={isZipping || !results.some((r) => r.status === 'success' && r.pdfBlob)}
                className="admin-btn-primary"
              >
                <Download size={15} />
                {isZipping ? 'Bundling ZIP...' : 'Download All as ZIP'}
              </button>
            </div>

            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {results.map((item, idx) => (
                <div
                  key={idx}
                  className={`flex items-center justify-between gap-3 p-3.5 rounded-xl border ${
                    item.status === 'success'
                      ? 'bg-[#14141a] border-[#24242c]'
                      : 'bg-red-950/20 border-red-900/50'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {item.status === 'success' ? (
                        <Check size={16} className="text-[#2fd16f] shrink-0" />
                      ) : (
                        <AlertTriangle size={16} className="text-[#ff4d5a] shrink-0" />
                      )}
                      <span className="text-sm font-bold text-white truncate">
                        {item.recipient_name}
                      </span>
                      {item.team_name && (
                        <span className="text-xs text-[#8e8e9a]">({item.team_name})</span>
                      )}
                    </div>
                    <div className="text-[11px] font-mono mt-0.5">
                      {item.status === 'success' ? (
                        <span className="text-[#f5b73b] font-bold">{item.certificate_id}</span>
                      ) : (
                        <span className="text-[#ff4d5a]">{item.error}</span>
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
