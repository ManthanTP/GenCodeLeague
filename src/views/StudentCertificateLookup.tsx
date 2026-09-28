import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  Award,
  Download,
  Eye,
  Copy,
  Check,
  ShieldCheck,
  ShieldAlert,
  ChevronLeft,
  Calendar,
  Users,
  Filter,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import Header from '../components/Header';
import Notification, { type NotificationState } from '../components/Notification';
import CertificatePreview from '../components/CertificatePreview';
import { downloadCertificatePdf } from '../utils/pdfGenerator';
import type { Certificate } from '../types/certificates';
import type { Edition } from '../types/database';

// Rate-limiting configuration: max 12 searches per minute
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const MAX_SEARCHES_PER_WINDOW = 12;

function checkSearchRateLimit(): boolean {
  try {
    const raw = sessionStorage.getItem('gcl_lookup_rate_limit');
    const now = Date.now();
    let timestamps: number[] = raw ? JSON.parse(raw) : [];
    timestamps = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);

    if (timestamps.length >= MAX_SEARCHES_PER_WINDOW) {
      return false; // rate limited
    }

    timestamps.push(now);
    sessionStorage.setItem('gcl_lookup_rate_limit', JSON.stringify(timestamps));
    return true; // allowed
  } catch {
    return true;
  }
}

export default function StudentCertificateLookup() {
  const [searchName, setSearchName] = useState('');
  const [selectedEditionId, setSelectedEditionId] = useState<string>('all');
  const [editions, setEditions] = useState<Edition[]>([]);
  const [results, setResults] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [rateLimited, setRateLimited] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [previewCert, setPreviewCert] = useState<Certificate | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [notification, setNotification] = useState<NotificationState | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // Load editions for the optional dropdown filter
  useEffect(() => {
    supabase
      .from('editions')
      .select('*')
      .order('year', { ascending: false })
      .then(({ data }) => {
        if (data) setEditions(data);
      });
  }, []);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = searchName.trim();
    if (!query) {
      showToast('Please enter your name to search', 'error');
      return;
    }
    if (query.length < 2) {
      showToast('Name query must be at least 2 characters', 'error');
      return;
    }

    if (!checkSearchRateLimit()) {
      setRateLimited(true);
      showToast('Search rate limit reached. Please wait a moment.', 'error');
      return;
    }

    setRateLimited(false);
    setLoading(true);
    setHasSearched(true);

    try {
      let req = supabase
        .from('certificates')
        .select(`
          *,
          edition:editions(id, name, year),
          team:teams(id, name),
          template:certificate_templates(id, certificate_type, version, design_config)
        `)
        .ilike('recipient_name', `%${query}%`)
        .order('issued_at', { ascending: false });

      if (selectedEditionId !== 'all') {
        req = req.eq('edition_id', selectedEditionId);
      }

      const { data, error } = await req;
      if (error) throw error;

      setResults((data as unknown as Certificate[]) || []);
    } catch (err: any) {
      showToast(err?.message || 'Search failed. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyVerifyUrl = (certId: string) => {
    const url = `${window.location.origin}/verify/${certId}`;
    navigator.clipboard.writeText(url);
    setCopiedId(certId);
    showToast('Verification URL copied to clipboard!', 'success');
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleDownload = async (cert: Certificate) => {
    setDownloadingId(cert.certificate_id);
    try {
      if (cert.pdf_url) {
        window.open(cert.pdf_url, '_blank');
        showToast('Opening official certificate PDF...', 'success');
      } else {
        const element = document.getElementById(`offscreen-${cert.certificate_id}`);
        if (element) {
          await downloadCertificatePdf(element, cert.certificate_id);
          showToast('Certificate downloaded successfully!', 'success');
        } else {
          showToast('Preparing download...', 'success');
          setPreviewCert(cert);
          setTimeout(async () => {
            const el = document.getElementById(`certificate-${cert.certificate_id}`);
            if (el) {
              await downloadCertificatePdf(el, cert.certificate_id);
              showToast('Certificate downloaded!', 'success');
            }
          }, 400);
        }
      }
    } catch (err) {
      showToast('Download failed. Please try again.', 'error');
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans selection:bg-cyan-500 selection:text-black pb-16">
      <Header viewMode="live" onToggleView={() => {}} />
      <Notification notification={notification} />

      <main className="max-w-5xl mx-auto px-4 py-10">
        {/* Navigation Breadcrumb */}
        <div className="mb-6 flex items-center justify-between">
          <Link
            to="/"
            className="flex items-center gap-2 text-sm text-slate-400 hover:text-cyan-400 transition-colors"
          >
            <ChevronLeft size={16} /> Back to Live Event
          </Link>
        </div>

        {/* Hero Section */}
        <div className="text-center max-w-2xl mx-auto mb-10 space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-mono font-bold tracking-wider">
            <Award size={14} /> PUBLIC CREDENTIAL PORTAL
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Find Your Certificate
          </h1>
          <p className="text-sm text-slate-400">
            Search by your full name to view, verify, and download your official GenCode League certificates across all editions. No login required.
          </p>
        </div>

        {/* Search Bar & Filter Form */}
        <form
          onSubmit={handleSearch}
          className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 sm:p-6 backdrop-blur-md shadow-2xl mb-10 max-w-3xl mx-auto"
        >
          <div className="flex flex-col sm:flex-row gap-3 items-stretch">
            <div className="relative flex-1">
              <Search
                size={18}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                placeholder="Enter your name as registered (e.g. Alex Rivera)..."
                className="gcl-input w-full pl-10 py-3 text-sm font-medium"
                autoFocus
              />
            </div>

            <div className="sm:w-52">
              <select
                value={selectedEditionId}
                onChange={(e) => setSelectedEditionId(e.target.value)}
                className="gcl-input w-full py-3 text-xs font-mono"
              >
                <option value="all">All Editions</option>
                {editions.map((ed) => (
                  <option key={ed.id} value={ed.id}>
                    {ed.name} ({ed.year})
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={loading || !searchName.trim()}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-extrabold text-sm shadow-glow-cyan disabled:opacity-50 transition-all flex items-center justify-center gap-2 shrink-0"
            >
              <Search size={16} />
              {loading ? 'Searching...' : 'Search'}
            </button>
          </div>

          {rateLimited && (
            <p className="text-xs text-amber-400 font-mono mt-3 flex items-center gap-1.5 justify-center">
              <AlertCircle size={14} /> Search rate limit active. Please wait 30 seconds before searching again.
            </p>
          )}
        </form>

        {/* Search Results */}
        {hasSearched && (
          <div className="space-y-4">
            <div className="flex items-center justify-between px-2">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span>Search Results</span>
                <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-slate-800 text-cyan-400 border border-slate-700">
                  {results.length} found
                </span>
              </h2>
            </div>

            {results.length === 0 ? (
              <div className="text-center py-16 bg-slate-900/40 rounded-2xl border border-slate-800/80 p-8 backdrop-blur-md">
                <ShieldAlert size={44} className="text-slate-500 mx-auto mb-3" />
                <h3 className="text-lg font-bold text-white">No Certificates Found</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                  We could not find any certificates issued under "{searchName}". Please check for spelling differences or try selecting "All Editions".
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {results.map((cert) => {
                  const isValid = cert.status === 'valid';
                  return (
                    <div
                      key={cert.id}
                      className="bg-slate-900/60 border border-slate-800 hover:border-cyan-500/40 rounded-2xl p-5 backdrop-blur-md shadow-xl transition-all flex flex-col justify-between"
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                              {cert.edition?.name || 'GenCode League'}
                            </span>
                            <h3 className="text-xl font-extrabold text-white mt-0.5">
                              {cert.recipient_name}
                            </h3>
                          </div>

                          {isValid ? (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center gap-1 shrink-0">
                              <ShieldCheck size={12} /> VALID
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-red-500/20 text-red-400 border border-red-500/40 flex items-center gap-1 shrink-0">
                              <ShieldAlert size={12} /> REVOKED
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                          <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800/80">
                            <span className="text-[10px] uppercase font-mono text-slate-500 block">
                              Type
                            </span>
                            <span className="font-semibold text-cyan-400 capitalize">
                              {cert.certificate_type.replace('_', ' ')}
                            </span>
                          </div>

                          <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800/80">
                            <span className="text-[10px] uppercase font-mono text-slate-500 block">
                              Team
                            </span>
                            <span className="font-semibold text-slate-300 truncate block">
                              {cert.team?.name || 'Individual'}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 pt-1">
                          <span className="text-amber-400 font-bold">
                            {cert.certificate_id}
                          </span>
                          <span>
                            {new Date(cert.issued_at).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </span>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center justify-between gap-2 pt-4 mt-4 border-t border-slate-800/80">
                        <button
                          onClick={() => setPreviewCert(cert)}
                          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white flex items-center gap-1.5 transition-colors"
                        >
                          <Eye size={13} /> View
                        </button>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleCopyVerifyUrl(cert.certificate_id)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                            title="Copy Public Verification Link"
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
                            className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-bold text-xs flex items-center gap-1.5 transition-all shadow-glow-cyan"
                          >
                            <Download size={13} />
                            {downloadingId === cert.certificate_id ? 'Downloading...' : 'Download'}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Modal Certificate Preview */}
        {previewCert && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl max-w-4xl w-full flex flex-col items-center space-y-4 my-8">
              <div className="w-full flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-cyan-400 font-bold">
                    {previewCert.certificate_id}
                  </span>
                  <Link
                    to={`/verify/${previewCert.certificate_id}`}
                    target="_blank"
                    className="text-xs text-slate-400 hover:text-cyan-300 flex items-center gap-1 font-mono"
                  >
                    Public Verify <ExternalLink size={12} />
                  </Link>
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
      </main>
    </div>
  );
}
