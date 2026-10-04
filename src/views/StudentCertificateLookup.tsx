import React, { useState, useEffect } from 'react';
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
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import Header from '../components/Header';
import Notification, { type NotificationState } from '../components/Notification';
import CertificatePreview from '../components/CertificatePreview';
import { downloadOrRegenerateCertificate } from '../utils/pdfGenerator';
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
      return false;
    }

    timestamps.push(now);
    sessionStorage.setItem('gcl_lookup_rate_limit', JSON.stringify(timestamps));
    return true;
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
          team:teams(id, name)
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
      showToast('Generating certificate PDF...', 'success');
      await downloadOrRegenerateCertificate(cert);
      showToast('Certificate downloaded successfully!', 'success');
    } catch (err: any) {
      showToast(err?.message || 'Download failed. Please try again.', 'error');
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="gcl-live-page min-h-screen text-[#f4f4f6] font-['Rajdhani',sans-serif] selection:bg-[#ff2a38] selection:text-white pb-20">
      <Header viewMode="live" onToggleView={() => {}} />
      <Notification notification={notification} />

      <main className="w-full max-w-[1720px] mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-8">
        {/* Cyber Hero Banner */}
        <div className="panel red relative overflow-hidden rounded-2xl p-6 sm:p-10 flex flex-col items-center text-center">
          <div className="relative z-10 max-w-2xl mx-auto space-y-3">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[rgba(232,33,46,0.15)] border border-[#ff4d5a]/40 text-[#ff4d5a] text-xs font-mono font-bold tracking-wider shadow-[0_0_12px_rgba(232,33,46,0.25)] uppercase">
              <Award size={15} /> PUBLIC CREDENTIAL PORTAL
            </div>
            <h1
              className="text-4xl sm:text-6xl font-black text-white tracking-wide uppercase"
              style={{ fontFamily: "'Rajdhani', sans-serif" }}
            >
              Find Your Certificate
            </h1>
            <div className="w-16 h-1 bg-[#e8212e] mx-auto rounded-full" />
            <p className="text-sm text-[#9a9aa3] font-medium font-sans max-w-xl mx-auto leading-relaxed">
              Search by your full name to view, verify, and download your official GenCode League certificates across all editions. No login required.
            </p>
          </div>
        </div>

        {/* Search Bar & Filter Form with Red Opposite Corner Glow (.panel.red) */}
        <form
          onSubmit={handleSearch}
          className="panel red p-6 sm:p-8 max-w-3xl mx-auto space-y-4"
        >
          <div className="flex flex-col sm:flex-row gap-3 items-stretch">
            <div className="relative flex-1">
              <Search
                size={18}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9a9aa3]"
              />
              <input
                type="text"
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                placeholder="Enter your name as registered (e.g. Alex Rivera)..."
                className="gcl-input w-full pl-10 py-3 text-sm font-semibold"
                style={{
                  borderRadius: '10px',
                  background: '#18181c',
                  border: '1px solid #3e3e48',
                }}
                autoFocus
              />
            </div>

            <div className="sm:w-52">
              <select
                value={selectedEditionId}
                onChange={(e) => setSelectedEditionId(e.target.value)}
                className="gcl-input w-full py-3 text-xs font-mono"
                style={{
                  borderRadius: '10px',
                  background: '#18181c',
                  border: '1px solid #3e3e48',
                }}
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
              className="gcl-nav-btn-active text-sm font-bold uppercase tracking-wider px-6 py-3 rounded-xl disabled:opacity-50 transition-all flex items-center justify-center gap-2 shrink-0 cursor-pointer"
            >
              <Search size={16} />
              {loading ? 'Searching...' : 'Search'}
            </button>
          </div>

          {rateLimited && (
            <p className="text-xs text-amber-400 font-mono flex items-center gap-1.5 justify-center">
              <AlertCircle size={14} /> Search rate limit active. Please wait 30 seconds before searching again.
            </p>
          )}
        </form>

        {/* Search Results */}
        {hasSearched && (
          <div className="space-y-4">
            <div className="flex items-center justify-between px-2">
              <h2
                className="text-xl font-black text-white uppercase tracking-wide flex items-center gap-2"
                style={{ fontFamily: "'Rajdhani', sans-serif" }}
              >
                <span>Search Results</span>
                <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-[#18181c] text-[#ff4d5a] border border-[#2c2c33]">
                  {results.length} found
                </span>
              </h2>
            </div>

            {results.length === 0 ? (
              <div className="text-center py-16 panel red p-8">
                <ShieldAlert size={44} className="text-[#52525b] mx-auto mb-3" />
                <h3 className="text-xl font-bold text-white">No Certificates Found</h3>
                <p className="text-xs text-[#9a9aa3] mt-1 max-w-md mx-auto">
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
                      className="panel red p-5 flex flex-col justify-between"
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="text-[10px] font-mono uppercase tracking-wider text-[#9a9aa3]">
                              {cert.edition?.name || 'GenCode League'}
                            </span>
                            <h3
                              className="text-2xl font-black text-white mt-0.5 uppercase"
                              style={{ fontFamily: "'Rajdhani', sans-serif" }}
                            >
                              {cert.recipient_name}
                            </h3>
                          </div>

                          {isValid ? (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/40 flex items-center gap-1 shrink-0">
                              <ShieldCheck size={12} /> VALID
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-red-500/15 text-red-400 border border-red-500/40 flex items-center gap-1 shrink-0">
                              <ShieldAlert size={12} /> REVOKED
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs pt-1 font-mono">
                          <div className="bg-[#18181c] p-2.5 rounded-lg border border-[#26262b]">
                            <span className="text-[10px] uppercase text-[#9a9aa3] block font-bold">
                              Type
                            </span>
                            <span className="font-bold text-[#ff4d5a] capitalize">
                              {cert.certificate_type.replace('_', ' ')}
                            </span>
                          </div>

                          <div className="bg-[#18181c] p-2.5 rounded-lg border border-[#26262b]">
                            <span className="text-[10px] uppercase text-[#9a9aa3] block font-bold">
                              Team
                            </span>
                            <span className="font-bold text-white truncate block">
                              {cert.team?.name || 'Individual'}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-[11px] font-mono text-[#9a9aa3] pt-1">
                          <span className="text-[#ffd700] font-bold">
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
                      <div className="flex items-center justify-between gap-2 pt-4 mt-4 border-t border-[#35353b]">
                        <button
                          type="button"
                          onClick={() => setPreviewCert(cert)}
                          className="px-3 py-1.5 rounded-lg bg-[#18181c] hover:bg-[#25252b] border border-[#3e3e48] text-xs font-bold text-white flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Eye size={13} /> View
                        </button>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleCopyVerifyUrl(cert.certificate_id)}
                            className="p-1.5 rounded-lg bg-[#18181c] hover:bg-[#25252b] border border-[#3e3e48] text-[#9a9aa3] hover:text-white transition-colors cursor-pointer"
                            title="Copy Public Verification Link"
                          >
                            {copiedId === cert.certificate_id ? (
                              <Check size={14} className="text-emerald-400" />
                            ) : (
                              <Copy size={14} />
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDownload(cert)}
                            disabled={downloadingId === cert.certificate_id}
                            className="gcl-nav-btn-active text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                          >
                            <Download size={13} />
                            {downloadingId === cert.certificate_id ? 'Downloading...' : 'Download PDF'}
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
            <div className="panel red p-4 sm:p-6 md:p-8 max-w-4xl w-full flex flex-col items-center space-y-4 my-4 sm:my-8 max-h-[92vh] overflow-y-auto">
              <div className="w-full flex items-center justify-between pb-3 border-b border-[#35353b]">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-mono text-[#ffd700] font-bold text-xs sm:text-sm truncate">
                    {previewCert.certificate_id}
                  </span>
                  <Link
                    to={`/verify/${previewCert.certificate_id}`}
                    target="_blank"
                    className="text-xs text-[#9a9aa3] hover:text-[#ff4d5a] flex items-center gap-1 font-mono shrink-0"
                  >
                    Public Verify <ExternalLink size={12} />
                  </Link>
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewCert(null)}
                  className="px-3 py-1.5 min-h-[36px] rounded bg-[#18181c] hover:bg-[#25252b] border border-[#3e3e48] text-xs font-semibold cursor-pointer shrink-0"
                >
                  Close ✕
                </button>
              </div>

              <div className="w-full overflow-x-auto flex justify-center py-2" style={{ WebkitOverflowScrolling: 'touch' }}>
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
                    editionId={previewCert.edition_id}
                    templateVersion={previewCert.template_version}
                    editionName={previewCert.edition?.name}
                    teamName={previewCert.team?.name}
                    achievement={previewCert.achievement}
                    customTitle={previewCert.custom_title}
                    customSubtitle={previewCert.custom_subtitle}
                    issuedAt={previewCert.issued_at}
                    status={previewCert.status}
                    scale={0.8}
                  />
                </div>
              </div>

              <div className="w-full flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-2.5 pt-2 border-t border-[#35353b]">
                <button
                  type="button"
                  onClick={() => handleCopyVerifyUrl(previewCert.certificate_id)}
                  className="px-3 py-2 min-h-[42px] rounded-lg bg-[#18181c] hover:bg-[#25252b] border border-[#3e3e48] text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Copy size={13} /> Copy Verification Link
                </button>
                <button
                  type="button"
                  onClick={() => handleDownload(previewCert)}
                  className="gcl-nav-btn-active text-xs font-bold px-4 py-2 min-h-[42px] rounded-lg flex items-center justify-center gap-1.5 cursor-pointer"
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
