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
        // Keep within 0.35 to 0.85 so it never looks excessively zoomed in or overflows
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
    <div className="min-h-screen bg-slate-950 text-white font-sans selection:bg-cyan-500 selection:text-black">
      <Header viewMode="live" onToggleView={() => {}} />
      <Notification notification={notification} />

      <main className="max-w-4xl mx-auto px-4 py-12">
        {/* Navigation Breadcrumb */}
        <div className="mb-6 flex items-center justify-between">
          <Link
            to="/"
            className="flex items-center gap-2 text-sm text-slate-400 hover:text-cyan-400 transition-colors"
          >
            <ChevronLeft size={16} /> Back to Live Event
          </Link>

          <Link
            to="/my-certificates"
            className="text-xs font-mono text-cyan-400 hover:underline flex items-center gap-1"
          >
            Search by Name →
          </Link>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-20 bg-slate-900/40 rounded-2xl border border-slate-800 backdrop-blur-md p-8">
            <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <h2 className="text-lg font-bold tracking-wide">Validating Certificate Record...</h2>
            <p className="text-xs text-slate-400 font-mono mt-1">
              Querying official records for #{certificateId}
            </p>
          </div>
        )}

        {/* Rate Limited State */}
        {!loading && rateLimited && (
          <div className="text-center py-16 bg-amber-950/20 rounded-2xl border border-amber-800/40 p-8 backdrop-blur-md">
            <ShieldAlert size={56} className="text-amber-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-amber-300">Rate Limit Exceeded</h2>
            <p className="text-sm text-slate-400 mt-2 max-w-md mx-auto">
              Too many verification requests from this session. Please wait 60 seconds before checking another certificate ID.
            </p>
          </div>
        )}

        {/* Not Found State */}
        {!loading && !rateLimited && notFound && (
          <div className="text-center py-16 bg-slate-900/60 rounded-2xl border border-red-900/40 p-8 shadow-2xl backdrop-blur-md">
            <div className="w-16 h-16 rounded-full bg-red-950/60 border border-red-800/60 flex items-center justify-center mx-auto mb-4">
              <ShieldAlert size={36} className="text-red-400" />
            </div>
            <h1 className="text-2xl font-black text-white uppercase tracking-wider">
              Certificate Not Found
            </h1>
            <p className="text-sm text-slate-400 mt-2 max-w-md mx-auto">
              No matching certificate was found for identifier{' '}
              <span className="font-mono text-cyan-400 font-bold bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                {certificateId}
              </span>
              . Please verify the ID or check your QR code.
            </p>

            <div className="mt-8 flex justify-center gap-4">
              <Link
                to="/my-certificates"
                className="px-5 py-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-black font-bold text-sm transition-colors flex items-center gap-2"
              >
                <Search size={16} /> Search Certificates by Name
              </Link>
            </div>
          </div>
        )}

        {/* Found Certificate */}
        {!loading && !rateLimited && cert && (
          <div className="space-y-6">
            {/* Status Banner */}
            {cert.status === 'valid' ? (
              <div className="p-6 rounded-2xl bg-emerald-950/30 border border-emerald-500/40 backdrop-blur-md shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4 text-center sm:text-left">
                  <div className="w-14 h-14 rounded-full bg-emerald-500/10 border-2 border-emerald-400 flex items-center justify-center shrink-0 shadow-glow-emerald">
                    <ShieldCheck size={32} className="text-emerald-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 justify-center sm:justify-start">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                        STATUS: VALID
                      </span>
                      <span className="text-xs text-slate-400 font-mono">
                        Views: {cert.verify_view_count + 1}
                      </span>
                    </div>
                    <h1 className="text-xl sm:text-2xl font-black text-white mt-1">
                      Official Verified Record
                    </h1>
                  </div>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <button
                    onClick={handleCopyLink}
                    className="flex-1 sm:flex-none px-4 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
                  >
                    {copied ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
                    {copied ? 'Copied Link' : 'Copy Link'}
                  </button>

                  <button
                    onClick={handleDownload}
                    disabled={downloading}
                    className="flex-1 sm:flex-none px-5 py-2.5 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-extrabold text-sm shadow-glow-cyan flex items-center justify-center gap-2 transition-all"
                  >
                    <Download size={16} />
                    {downloading ? 'Downloading...' : 'Download PDF'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-6 rounded-2xl bg-red-950/40 border border-red-500/60 backdrop-blur-md shadow-2xl flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-red-500/20 border-2 border-red-500 flex items-center justify-center shrink-0">
                  <ShieldAlert size={32} className="text-red-400" />
                </div>
                <div>
                  <div className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-red-500/30 text-red-300 border border-red-500/50 inline-block mb-1">
                    STATUS: REVOKED
                  </div>
                  <h1 className="text-2xl font-black text-red-200">
                    Certificate Invalidation Notice
                  </h1>
                  <p className="text-xs text-red-300/80 mt-1">
                    This certificate was officially revoked by event organizers and is no longer recognized as valid.
                  </p>
                </div>
              </div>
            )}

            {/* Certificate Details Card */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 sm:p-8 backdrop-blur-md shadow-xl">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6 border-b border-slate-800">
                <div>
                  <div className="text-xs uppercase font-mono tracking-wider text-slate-400">
                    Recipient Name
                  </div>
                  <div className="text-2xl font-extrabold text-white mt-1">
                    {cert.recipient_name}
                  </div>
                </div>

                <div>
                  <div className="text-xs uppercase font-mono tracking-wider text-slate-400">
                    Certificate Type
                  </div>
                  <div className="text-lg font-bold text-cyan-400 capitalize mt-1 flex items-center gap-2">
                    <Award size={20} />
                    {cert.certificate_type.replace('_', ' ')}
                  </div>
                </div>

                <div>
                  <div className="text-xs uppercase font-mono tracking-wider text-slate-400">
                    Event / Edition
                  </div>
                  <div className="text-base font-semibold text-slate-200 mt-1">
                    {cert.edition?.name || 'GenCode League'}
                  </div>
                </div>

                <div>
                  <div className="text-xs uppercase font-mono tracking-wider text-slate-400">
                    Team Affiliation
                  </div>
                  <div className="text-base font-semibold text-slate-200 mt-1 flex items-center gap-2">
                    <Users size={16} className="text-slate-400" />
                    {cert.team?.name || 'Individual / Non-affiliated'}
                  </div>
                </div>

                {cert.achievement && (
                  <div>
                    <div className="text-xs uppercase font-mono tracking-wider text-slate-400">
                      Achievement / Position
                    </div>
                    <div className="text-base font-semibold text-amber-400 mt-1">
                      {cert.achievement}
                    </div>
                  </div>
                )}

                <div>
                  <div className="text-xs uppercase font-mono tracking-wider text-slate-400">
                    Issued Date
                  </div>
                  <div className="text-sm font-mono text-slate-300 mt-1 flex items-center gap-2">
                    <Calendar size={16} className="text-slate-400" />
                    {new Date(cert.issued_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </div>
                </div>

                <div>
                  <div className="text-xs uppercase font-mono tracking-wider text-slate-400">
                    Permanent Identifier
                  </div>
                  <div className="text-base font-mono font-bold text-amber-400 mt-1">
                    {cert.certificate_id}
                  </div>
                </div>
              </div>

              {/* Action Bar */}
              <div className="pt-6 flex flex-wrap items-center justify-between gap-4">
                <button
                  onClick={() => setShowPreview(!showPreview)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-sm font-semibold flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <Eye size={16} />
                  {showPreview ? 'Hide Certificate Preview' : 'View Full Certificate'}
                </button>

                {showPreview && (
                  <div className="flex items-center gap-2 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700">
                    <button
                      onClick={() =>
                        setUserZoom((prev) =>
                          Math.max(Number(((prev ?? autoScale) - 0.1).toFixed(2)), 0.3)
                        )
                      }
                      className="p-1 rounded hover:bg-slate-700 text-slate-300 transition-colors"
                      title="Zoom Out"
                    >
                      <ZoomOut size={14} />
                    </button>
                    <span className="text-xs font-mono font-bold text-amber-400 min-w-[42px] text-center">
                      {Math.round(activeScale * 100)}%
                    </span>
                    <button
                      onClick={() =>
                        setUserZoom((prev) =>
                          Math.min(Number(((prev ?? autoScale) + 0.1).toFixed(2)), 1.2)
                        )
                      }
                      className="p-1 rounded hover:bg-slate-700 text-slate-300 transition-colors"
                      title="Zoom In"
                    >
                      <ZoomIn size={14} />
                    </button>
                    {userZoom !== null && (
                      <button
                        onClick={() => setUserZoom(null)}
                        className="ml-1 px-2 py-0.5 rounded bg-slate-700 hover:bg-slate-600 text-[11px] font-mono text-slate-200 flex items-center gap-1"
                        title="Fit to Window"
                      >
                        <RotateCcw size={11} /> Fit
                      </button>
                    )}
                  </div>
                )}

                <div className="text-xs text-slate-500 font-mono">
                  Template Version: v{cert.template_version}
                </div>
              </div>

              {/* Rendered Preview Section (Responsive & Auto-fit) */}
              {showPreview && (
                <div
                  ref={previewContainerRef}
                  className="mt-8 pt-8 border-t border-slate-800 w-full flex flex-col items-center"
                >
                  <div
                    style={{
                      width: 1000 * activeScale,
                      height: 707 * activeScale,
                      overflow: 'hidden',
                      borderRadius: '12px',
                      boxShadow: '0 12px 36px rgba(0,0,0,0.5)',
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
