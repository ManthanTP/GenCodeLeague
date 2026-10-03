import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ShieldCheck,
  ShieldAlert,
  Search,
  Copy,
  Check,
  Download,
  Eye,
  Calendar,
  Award,
  Users,
  ChevronLeft,
  ZoomIn,
  ZoomOut,
  RotateCcw,
} from 'lucide-react';

import { supabase } from '../lib/supabase';
import Header from '../components/Header';
import Notification, { type NotificationState } from '../components/Notification';
import CertificatePreview from '../components/CertificatePreview';
import { downloadOrRegenerateCertificate } from '../utils/pdfGenerator';
import type { Certificate } from '../types/certificates';

// Simple client-side rate limiting tracker (max 15 lookups per minute)
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 15;

function isRateLimited(): boolean {
  try {
    const raw = sessionStorage.getItem('gcl_verify_rate_limit');
    const now = Date.now();
    let timestamps: number[] = raw ? JSON.parse(raw) : [];
    timestamps = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);

    if (timestamps.length >= MAX_REQUESTS_PER_WINDOW) {
      return true;
    }

    timestamps.push(now);
    sessionStorage.setItem('gcl_verify_rate_limit', JSON.stringify(timestamps));
    return false;
  } catch {
    return false;
  }
}

export default function VerifyCertificate() {
  const { certificateId } = useParams<{ certificateId: string }>();
  const [cert, setCert] = useState<Certificate | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [rateLimited, setRateLimited] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [notification, setNotification] = useState<NotificationState | null>(null);
  const [autoScale, setAutoScale] = useState<number>(0.75);
  const [userZoom, setUserZoom] = useState<number | null>(null);
  const previewContainerRef = React.useRef<HTMLDivElement>(null);

  // Auto-fit preview scale to container width
  useEffect(() => {
    if (!showPreview || !previewContainerRef.current) return;
    const updateScale = () => {
      if (previewContainerRef.current) {
        const containerW = previewContainerRef.current.clientWidth;
        const targetScale = Math.min(Math.max((containerW - 32) / 1000, 0.35), 0.85);
        setAutoScale(Number(targetScale.toFixed(2)));
      }
    };
    updateScale();
    const handleResize = () => updateScale();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [showPreview]);

  const activeScale = userZoom !== null ? userZoom : autoScale;

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3000);
  };

  useEffect(() => {
    let isCancelled = false;

    async function fetchAndVerify() {
      if (!certificateId) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      if (isRateLimited()) {
        setRateLimited(true);
        setLoading(false);
        return;
      }

      setLoading(true);
      setNotFound(false);

      try {
        const { data, error } = await supabase
          .from('certificates')
          .select(`
            *,
            edition:editions(id, name, year),
            team:teams(id, name)
          `)
          .eq('certificate_id', certificateId.trim().toUpperCase())
          .maybeSingle();

        if (error || !data) {
          if (!isCancelled) {
            setNotFound(true);
            setLoading(false);
          }
          return;
        }

        if (!isCancelled) {
          setCert(data as unknown as Certificate);
          setLoading(false);
        }

        // Increment view count
        supabase.rpc('increment_certificate_view_count', {
          target_certificate_id: certificateId.trim().toUpperCase(),
        }).then();
      } catch {
        if (!isCancelled) {
          setNotFound(true);
          setLoading(false);
        }
      }
    }

    fetchAndVerify();

    return () => {
      isCancelled = true;
    };
  }, [certificateId]);

  const handleCopyLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    setCopied(true);
    showToast('Verification URL copied to clipboard!', 'success');
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownload = async () => {
    if (!cert) return;
    setDownloading(true);

    try {
      showToast('Generating certificate PDF...', 'success');
      await downloadOrRegenerateCertificate(cert);
      showToast('Certificate downloaded successfully!', 'success');
    } catch (err: any) {
      showToast(err?.message || 'Download failed. Please try again.', 'error');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="gcl-live-page min-h-screen text-[#f4f4f6] font-['Rajdhani',sans-serif] selection:bg-[#ff2a38] selection:text-white pb-20">
      <Header viewMode="live" onToggleView={() => {}} />
      <Notification notification={notification} />

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            to="/"
            className="flex items-center gap-2 text-xs font-mono text-[#9a9aa3] hover:text-[#ff4d5a] transition-colors"
          >
            <ChevronLeft size={16} /> Back to Live Event
          </Link>

          <Link
            to="/my-certificates"
            className="text-xs font-mono text-[#ff4d5a] hover:underline flex items-center gap-1 font-bold"
          >
            Search by Name →
          </Link>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-20 panel red p-8">
            <div className="w-12 h-12 border-4 border-[#e8212e] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <h2 className="text-xl font-bold tracking-wide uppercase">Validating Certificate Record...</h2>
            <p className="text-xs text-[#9a9aa3] font-mono mt-1">
              Querying official records for #{certificateId}
            </p>
          </div>
        )}

        {/* Rate Limited State */}
        {!loading && rateLimited && (
          <div className="text-center py-16 panel red p-8">
            <ShieldAlert size={56} className="text-amber-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-amber-300 uppercase">Rate Limit Exceeded</h2>
            <p className="text-sm text-[#9a9aa3] mt-2 max-w-md mx-auto font-sans">
              Too many verification requests from this session. Please wait 60 seconds before checking another certificate ID.
            </p>
          </div>
        )}

        {/* Not Found State */}
        {!loading && !rateLimited && notFound && (
          <div className="text-center py-16 panel red p-8 shadow-2xl space-y-4">
            <div className="w-16 h-16 rounded-full bg-red-950/60 border border-red-800/60 flex items-center justify-center mx-auto mb-2">
              <ShieldAlert size={36} className="text-red-400" />
            </div>
            <h1 className="text-3xl font-black text-white uppercase tracking-wider">
              Certificate Not Found
            </h1>
            <p className="text-sm text-[#9a9aa3] max-w-md mx-auto font-sans">
              No matching certificate was found for identifier{' '}
              <span className="font-mono text-[#ffd700] font-bold bg-[#18181c] px-2 py-0.5 rounded border border-[#3e3e48]">
                {certificateId}
              </span>
              . Please verify the ID or check your QR code.
            </p>

            <div className="pt-4 flex justify-center">
              <Link
                to="/my-certificates"
                className="gcl-nav-btn-active text-xs font-bold px-5 py-2.5 rounded-xl uppercase tracking-wider flex items-center gap-2"
              >
                <Search size={16} /> Search Certificates by Name
              </Link>
            </div>
          </div>
        )}

        {/* Found Certificate */}
        {!loading && !rateLimited && cert && (
          <div className="space-y-6">
            {/* Status Banner with Opposite Corner Glow */}
            {cert.status === 'valid' ? (
              <div className="panel gold p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4 text-center sm:text-left">
                  <div className="w-14 h-14 rounded-full bg-[#ffd700]/20 border-2 border-[#ffd700] flex items-center justify-center shrink-0 shadow-[0_0_16px_rgba(255,215,0,0.5)]">
                    <ShieldCheck size={32} className="text-[#ffd700]" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 justify-center sm:justify-start">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-[#ffd700]/20 text-[#ffd700] border border-[#ffd700]/40">
                        STATUS: VALID CREDENTIAL
                      </span>
                      <span className="text-xs text-[#9a9aa3] font-mono">
                        Views: {cert.verify_view_count + 1}
                      </span>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-black text-white mt-1 uppercase">
                      Official Verified Record
                    </h1>
                  </div>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-[#18181c] hover:bg-[#25252b] border border-[#3e3e48] text-xs font-bold text-white flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    {copied ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
                    {copied ? 'Copied Link' : 'Copy Link'}
                  </button>

                  <button
                    type="button"
                    onClick={handleDownload}
                    disabled={downloading}
                    className="gcl-nav-btn-active text-xs font-bold px-5 py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Download size={16} />
                    {downloading ? 'Downloading...' : 'Download PDF'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="panel red p-6 sm:p-8 flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-red-500/20 border-2 border-red-500 flex items-center justify-center shrink-0">
                  <ShieldAlert size={32} className="text-red-400" />
                </div>
                <div>
                  <div className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-red-500/30 text-red-300 border border-red-500/50 inline-block mb-1">
                    STATUS: REVOKED
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-black text-red-200 uppercase">
                    Certificate Invalidation Notice
                  </h1>
                  <p className="text-xs text-red-300/80 mt-1 font-sans">
                    This certificate was officially revoked by event organizers and is no longer recognized as valid.
                  </p>
                </div>
              </div>
            )}

            {/* Certificate Details Card with Red Opposite Corner Glow (.panel.red) */}
            <div className="panel red p-6 sm:p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6 border-b border-[#35353b]">
                <div>
                  <div className="text-xs uppercase font-mono tracking-wider text-[#9a9aa3] font-bold">
                    Recipient Name
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-white mt-1 uppercase">
                    {cert.recipient_name}
                  </div>
                </div>

                <div>
                  <div className="text-xs uppercase font-mono tracking-wider text-[#9a9aa3] font-bold">
                    Certificate Type
                  </div>
                  <div className="text-xl font-black text-[#ff4d5a] capitalize mt-1 flex items-center gap-2">
                    <Award size={22} />
                    {cert.certificate_type.replace('_', ' ')}
                  </div>
                </div>

                <div>
                  <div className="text-xs uppercase font-mono tracking-wider text-[#9a9aa3] font-bold">
                    Event / Edition
                  </div>
                  <div className="text-lg font-bold text-white mt-1">
                    {cert.edition?.name || 'GenCode League'}
                  </div>
                </div>

                <div>
                  <div className="text-xs uppercase font-mono tracking-wider text-[#9a9aa3] font-bold">
                    Team Affiliation
                  </div>
                  <div className="text-lg font-bold text-slate-200 mt-1 flex items-center gap-2">
                    <Users size={18} className="text-[#9a9aa3]" />
                    {cert.team?.name || 'Individual / Non-affiliated'}
                  </div>
                </div>

                {cert.achievement && (
                  <div>
                    <div className="text-xs uppercase font-mono tracking-wider text-[#9a9aa3] font-bold">
                      Achievement / Honor
                    </div>
                    <div className="text-lg font-bold text-[#ffd700] mt-1">
                      {cert.achievement}
                    </div>
                  </div>
                )}

                <div>
                  <div className="text-xs uppercase font-mono tracking-wider text-[#9a9aa3] font-bold">
                    Issued Date
                  </div>
                  <div className="text-base font-mono text-slate-300 mt-1 flex items-center gap-2">
                    <Calendar size={16} className="text-[#9a9aa3]" />
                    {new Date(cert.issued_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </div>
                </div>

                <div>
                  <div className="text-xs uppercase font-mono tracking-wider text-[#9a9aa3] font-bold">
                    Permanent Identifier
                  </div>
                  <div className="text-lg font-mono font-black text-[#ffd700] mt-1">
                    {cert.certificate_id}
                  </div>
                </div>
              </div>

              {/* Action Bar */}
              <div className="pt-2 flex flex-wrap items-center justify-between gap-4">
                <button
                  type="button"
                  onClick={() => setShowPreview(!showPreview)}
                  className="px-4 py-2.5 rounded-xl bg-[#18181c] hover:bg-[#25252b] border border-[#3e3e48] text-xs font-bold text-white flex items-center gap-2 transition-colors cursor-pointer uppercase tracking-wider"
                >
                  <Eye size={16} />
                  {showPreview ? 'Hide Certificate Preview' : 'View Full Certificate'}
                </button>

                {showPreview && (
                  <div className="flex items-center gap-2 bg-[#18181c] px-3 py-1.5 rounded-xl border border-[#3e3e48]">
                    <button
                      type="button"
                      onClick={() =>
                        setUserZoom((prev) =>
                          Math.max(Number(((prev ?? autoScale) - 0.1).toFixed(2)), 0.3)
                        )
                      }
                      className="p-1 rounded hover:bg-[#25252b] text-[#9a9aa3] hover:text-white transition-colors cursor-pointer"
                      title="Zoom Out"
                    >
                      <ZoomOut size={14} />
                    </button>
                    <span className="text-xs font-mono font-bold text-[#ffd700] min-w-[42px] text-center">
                      {Math.round(activeScale * 100)}%
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setUserZoom((prev) =>
                          Math.min(Number(((prev ?? autoScale) + 0.1).toFixed(2)), 1.2)
                        )
                      }
                      className="p-1 rounded hover:bg-[#25252b] text-[#9a9aa3] hover:text-white transition-colors cursor-pointer"
                      title="Zoom In"
                    >
                      <ZoomIn size={14} />
                    </button>
                    {userZoom !== null && (
                      <button
                        type="button"
                        onClick={() => setUserZoom(null)}
                        className="ml-1 px-2 py-0.5 rounded bg-[#25252b] hover:bg-[#303038] text-[11px] font-mono text-slate-200 flex items-center gap-1 cursor-pointer"
                        title="Fit to Window"
                      >
                        <RotateCcw size={11} /> Fit
                      </button>
                    )}
                  </div>
                )}

                <div className="text-xs text-[#9a9aa3] font-mono">
                  Template Version: v{cert.template_version}
                </div>
              </div>

              {/* Rendered Preview Section (Responsive & Auto-fit) */}
              {showPreview && (
                <div
                  ref={previewContainerRef}
                  className="mt-6 pt-6 border-t border-[#35353b] w-full flex flex-col items-center"
                >
                  <div
                    style={{
                      width: 1000 * activeScale,
                      height: 707 * activeScale,
                      overflow: 'hidden',
                      borderRadius: '12px',
                      boxShadow: '0 12px 36px rgba(0,0,0,0.6)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      transition: 'width 0.15s ease, height 0.15s ease',
                      backgroundColor: '#ffffff',
                    }}
                  >
                    <CertificatePreview
                      recipientName={cert.recipient_name}
                      certificateType={cert.certificate_type}
                      certificateId={cert.certificate_id}
                      editionId={cert.edition_id}
                      templateVersion={cert.template_version}
                      editionName={cert.edition?.name}
                      teamName={cert.team?.name}
                      achievement={cert.achievement}
                      customTitle={cert.custom_title}
                      customSubtitle={cert.custom_subtitle}
                      issuedAt={cert.issued_at}
                      status={cert.status}
                      scale={activeScale}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
