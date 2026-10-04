import React, { useEffect, useState, useRef } from 'react';
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
  Lock,
  CheckCircle2,
  XCircle,
  FileText,
  AlertCircle,
} from 'lucide-react';

import { supabase } from '../lib/supabase';
import Header from '../components/Header';
import Notification, { type NotificationState } from '../components/Notification';
import CertificatePreview from '../components/CertificatePreview';
import { downloadOrRegenerateCertificate } from '../utils/pdfGenerator';
import type { Certificate } from '../types/certificates';
import './VerifyCertificate.css';

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
  const [copiedId, setCopiedId] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [notification, setNotification] = useState<NotificationState | null>(null);
  const [autoScale, setAutoScale] = useState<number>(0.75);
  const previewContainerRef = useRef<HTMLDivElement>(null);

  // 3D Tilt calculation on pointer move
  const [tilt, setTilt] = useState<{ rx: number; ry: number; sheenX: number; sheenY: number; opacity: number }>({
    rx: 0,
    ry: 0,
    sheenX: 50,
    sheenY: 50,
    opacity: 0,
  });

  // Auto-fit preview scale to container width
  useEffect(() => {
    if (!showPreview || !previewContainerRef.current) return;
    const updateScale = () => {
      if (previewContainerRef.current) {
        const containerW = previewContainerRef.current.clientWidth;
        const targetScale = Math.min(Math.max((containerW - 32) / 1000, 0.32), 1);
        setAutoScale(Number(targetScale.toFixed(2)));
      }
    };
    updateScale();
    const ro = new ResizeObserver(updateScale);
    ro.observe(previewContainerRef.current);
    window.addEventListener('resize', updateScale);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', updateScale);
    };
  }, [showPreview, cert?.id]);

  const activeScale = autoScale;

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
    setTimeout(() => setCopied(false), 1500);
  };

  const handleCopyIdOnly = () => {
    if (!cert?.certificate_id) return;
    navigator.clipboard.writeText(cert.certificate_id);
    setCopiedId(true);
    showToast(`Certificate ID copied: ${cert.certificate_id}`, 'success');
    setTimeout(() => setCopiedId(false), 1500);
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

  // 3D Tilt handler (disabled on touch devices or reduced motion)
  const canTilt =
    typeof window !== 'undefined' &&
    !window.matchMedia('(pointer: coarse)').matches &&
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!canTilt) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;

    const rx = -y * 8;
    const ry = x * 8;

    const sheenX = ((e.clientX - rect.left) / rect.width) * 100;
    const sheenY = ((e.clientY - rect.top) / rect.height) * 100;

    setTilt({ rx, ry, sheenX, sheenY, opacity: 1 });
  };

  const handlePointerLeave = () => {
    setTilt({ rx: 0, ry: 0, sheenX: 50, sheenY: 50, opacity: 0 });
  };

  // Medal theme determination
  const getMedalTheme = (type?: string) => {
    const t = (type || '').toLowerCase();
    if (t.includes('winner') || t.includes('champion') || t.includes('1st') || t === 'winner') {
      return {
        name: 'Winner',
        accentColor: '#f5b73b',
        borderClass: 'verify-border-gold',
        badgeBg: 'rgba(245, 183, 59, 0.12)',
        badgeBorder: 'rgba(245, 183, 59, 0.45)',
        badgeText: '#f5b73b',
      };
    }
    if (t.includes('runner') || t.includes('silver') || t.includes('2nd') || t === 'runner_up') {
      return {
        name: 'Runner-up',
        accentColor: '#c3c7d2',
        borderClass: 'verify-border-silver',
        badgeBg: 'rgba(195, 199, 210, 0.12)',
        badgeBorder: 'rgba(195, 199, 210, 0.45)',
        badgeText: '#c3c7d2',
      };
    }
    return {
      name: 'Participant',
      accentColor: '#ff2a3d',
      borderClass: 'verify-border-red',
      badgeBg: 'rgba(255, 42, 61, 0.12)',
      badgeBorder: 'rgba(255, 42, 61, 0.45)',
      badgeText: '#ff4d5a',
    };
  };

  const activeTheme = getMedalTheme(cert?.certificate_type);

  const formattedDate = cert?.issued_at
    ? new Date(cert.issued_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : '';

  return (
    <div className="gcl-live-page min-h-screen text-[#f4f4f6] font-['Rajdhani',sans-serif] selection:bg-[#ff2a38] selection:text-white pb-20">
      <Header viewMode="live" onToggleView={() => {}} />
      <Notification notification={notification} />

      <main className="verify-container px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        {/* A. TOP BAR */}
        <div className="flex items-center justify-between gap-4 py-1">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-medium text-[#9a9aa3] hover:text-white hover:bg-[#18181c] border border-transparent hover:border-[#2e2e38] transition-all"
          >
            <ChevronLeft size={15} /> Back to Live Event
          </Link>

          <Link
            to="/my-certificates"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-semibold text-[#9a9aa3] hover:text-[#ff4d5a] hover:bg-[rgba(232,33,46,0.1)] border border-transparent hover:border-[#ff2a38]/30 transition-all"
          >
            <Search size={14} /> Search by Name
          </Link>
        </div>

        {/* 5. LOADING SKELETON STATE */}
        {loading && (
          <div className="space-y-6">
            {/* Hero skeleton */}
            <div className="panel p-6 sm:p-8 rounded-2xl verify-skeleton h-44 w-full" />
            {/* 2-column skeleton */}
            <div className="verify-body-grid">
              <div className="space-y-6">
                <div className="panel p-6 rounded-2xl verify-skeleton h-80 w-full" />
                <div className="panel p-6 rounded-2xl verify-skeleton h-56 w-full" />
              </div>
              <div className="panel p-6 rounded-2xl verify-skeleton h-[520px] w-full" />
            </div>
          </div>
        )}

        {/* RATE LIMITED STATE */}
        {!loading && rateLimited && (
          <div className="panel red p-8 rounded-2xl text-center space-y-4 max-w-2xl mx-auto my-12">
            <div className="w-16 h-16 rounded-full bg-amber-500/15 border border-amber-500/40 flex items-center justify-center mx-auto text-amber-400">
              <ShieldAlert size={36} />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black uppercase text-amber-300">
              Rate Limit Exceeded
            </h1>
            <p className="text-sm text-[#9a9aa3] font-sans max-w-md mx-auto">
              Too many verification requests from this session. Please wait 60 seconds before checking another certificate ID.
            </p>
          </div>
        )}

        {/* 4. NOT FOUND / INVALID IDENTIFIER STATE */}
        {!loading && !rateLimited && notFound && (
          <div className="space-y-6">
            {/* Red Verdict Hero */}
            <div className="panel red verify-hero-card border-1.5 border-[#ff2a3d]">
              <div className="verify-hero-left">
                {/* Red Cross Ring */}
                <div className="verify-hero-badge-wrap">
                  <svg className="verify-hero-ring" width="96" height="96" viewBox="0 0 96 96">
                    <circle cx="48" cy="48" r="42" fill="none" stroke="rgba(239, 68, 68, 0.15)" strokeWidth="4" />
                    <circle
                      className="verify-ring-draw-red"
                      cx="48"
                      cy="48"
                      r="42"
                      fill="none"
                      stroke="#ef4444"
                      strokeWidth="4"
                      strokeLinecap="round"
                    />
                    <path
                      className="verify-cross-draw"
                      d="M 33 33 L 63 63 M 63 33 L 33 63"
                      fill="none"
                      stroke="#ef4444"
                      strokeWidth="4.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>

                <div className="verify-hero-text">
                  <span className="verify-hero-status-tag" style={{ color: '#f87171' }}>
                    STATUS: RECORD NOT FOUND
                  </span>
                  <h1 className="verify-hero-title is-invalid">
                    Not verified
                  </h1>
                  <p className="verify-hero-desc is-invalid">
                    No matching credential exists in the official Gencode League registry.
                  </p>
                </div>
              </div>
            </div>

            {/* Centered Notice Card with Lock Icon */}
            <div className="panel red p-8 rounded-2xl text-center space-y-4 max-w-lg mx-auto">
              <div className="w-16 h-16 rounded-full bg-red-950/60 border border-red-500/40 flex items-center justify-center mx-auto text-red-400">
                <Lock size={32} />
              </div>
              <h2 className="text-2xl font-black uppercase text-white">
                We could not verify this credential
              </h2>
              <p className="text-xs sm:text-sm text-[#9a9aa3] font-sans leading-relaxed">
                Identifier <span className="font-mono text-[#ffd700] font-bold bg-[#18181c] px-2 py-0.5 rounded border border-[#3e3e48]">{certificateId}</span> could not be validated against official records. Please verify the link or QR code.
              </p>
              <div className="pt-2 flex justify-center">
                <Link
                  to="/my-certificates"
                  className="gcl-btn-outline-red h-11 px-5 text-xs font-bold uppercase tracking-wider flex items-center gap-2"
                >
                  <Search size={15} /> Search by Name
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* VERIFIED CREDENTIAL REPORT */}
        {!loading && !rateLimited && cert && (
          <div className="space-y-6">
            {/* B. VERDICT HERO CARD */}
            <div
              className={`panel verify-hero-card ${
                cert.status === 'valid' ? activeTheme.borderClass : 'verify-border-red'
              }`}
            >
              {/* Left: Animated Ring & Verdict */}
              <div className="verify-hero-left">
                <div className="verify-hero-badge-wrap">
                  {cert.status === 'valid' ? (
                    <svg className="verify-hero-ring" width="96" height="96" viewBox="0 0 96 96">
                      <circle cx="48" cy="48" r="42" fill="none" stroke="rgba(16, 185, 129, 0.15)" strokeWidth="4" />
                      <circle
                        className="verify-ring-draw"
                        cx="48"
                        cy="48"
                        r="42"
                        fill="none"
                        stroke="#10b981"
                        strokeWidth="4"
                        strokeLinecap="round"
                      />
                      <path
                        className="verify-check-draw"
                        d="M 28 48 L 42 62 L 68 34"
                        fill="none"
                        stroke="#10b981"
                        strokeWidth="4.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  ) : (
                    <svg className="verify-hero-ring" width="96" height="96" viewBox="0 0 96 96">
                      <circle cx="48" cy="48" r="42" fill="none" stroke="rgba(239, 68, 68, 0.15)" strokeWidth="4" />
                      <circle
                        className="verify-ring-draw-red"
                        cx="48"
                        cy="48"
                        r="42"
                        fill="none"
                        stroke="#ef4444"
                        strokeWidth="4"
                        strokeLinecap="round"
                      />
                      <path
                        className="verify-cross-draw"
                        d="M 33 33 L 63 63 M 63 33 L 33 63"
                        fill="none"
                        stroke="#ef4444"
                        strokeWidth="4.5"
                        strokeLinecap="round"
                      />
                    </svg>
                  )}
                </div>

                <div className="verify-hero-text" aria-live="polite">
                  <span className="verify-hero-status-tag">
                    STATUS
                  </span>
                  {cert.status === 'valid' ? (
                    <>
                      <h1 className="verify-hero-title is-valid">
                        Verified · Authentic
                      </h1>
                      <p className="verify-hero-desc">
                        This certificate was issued by Gencode League and matches our official record.
                      </p>
                    </>
                  ) : (
                    <>
                      <h1 className="verify-hero-title is-invalid">
                        Not verified
                      </h1>
                      <p className="verify-hero-desc is-invalid">
                        This certificate was officially revoked by event organizers and is no longer recognized as valid.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* Right: Chips & Action Buttons */}
              <div className="verify-hero-right">
                <div className="verify-hero-chips">
                  <span className="verify-hero-chip">
                    Views {cert.verify_view_count + 1}
                  </span>
                  <span className="verify-hero-chip">
                    Issued {formattedDate}
                  </span>
                </div>

                <div className="verify-hero-actions">
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="verify-hero-btn verify-hero-btn-copy"
                    aria-label="Copy verification link"
                  >
                    {copied ? <Check size={15} className="text-emerald-400" /> : <Copy size={15} />}
                    {copied ? 'Copied ✓' : 'Copy link'}
                  </button>

                  <button
                    type="button"
                    onClick={handleDownload}
                    disabled={downloading}
                    className="gcl-nav-btn-active verify-hero-btn verify-hero-btn-download"
                  >
                    <Download size={15} />
                    {downloading ? 'Downloading...' : 'Download PDF'}
                  </button>
                </div>
              </div>
            </div>

            {/* C. TWO-COLUMN BODY */}
            <div className="verify-body-grid">
              {/* ============================================================ */}
              {/* LEFT COLUMN: Details & Verification Checks                    */}
              {/* ============================================================ */}
              <div className="flex flex-col gap-6 min-w-0">
                {/* 1. Credential Details Card */}
                <div className="panel p-5 sm:p-6 rounded-2xl border border-[#26262f] bg-[#121217] space-y-5">
                  {/* Recipient Headline Tile */}
                  <div className="flex items-center gap-4 pb-4 border-b border-[#23232c]">
                    <div
                      className="w-[52px] h-[52px] rounded-xl flex items-center justify-center shrink-0"
                      style={{
                        background: activeTheme.badgeBg,
                        border: `1.5px solid ${activeTheme.badgeBorder}`,
                        color: activeTheme.badgeText,
                        boxShadow: `0 0 16px ${activeTheme.badgeBg}`,
                      }}
                    >
                      <Award size={26} />
                    </div>
                    <div className="min-w-0">
                      <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#71717a] font-bold block">
                        RECIPIENT
                      </span>
                      <h2
                        className="text-2xl sm:text-[30px] font-black uppercase text-white truncate leading-tight mt-0.5"
                        style={{ fontFamily: "'Rajdhani', sans-serif" }}
                      >
                        {cert.recipient_name}
                      </h2>
                    </div>
                  </div>

                  {/* 2x2 Grid of Detail Tiles */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Certificate Type */}
                    <div className="p-3.5 rounded-xl bg-[#16161c] border border-[#26262e] space-y-1">
                      <span className="text-[10.5px] font-mono uppercase tracking-wider text-[#7e7e8b] font-bold block">
                        Certificate Type
                      </span>
                      <p className="text-sm font-bold text-white uppercase truncate flex items-center gap-1.5">
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: activeTheme.accentColor }}
                        />
                        {cert.certificate_type.replace('_', ' ')}
                      </p>
                    </div>

                    {/* Event / Edition */}
                    <div className="p-3.5 rounded-xl bg-[#16161c] border border-[#26262e] space-y-1">
                      <span className="text-[10.5px] font-mono uppercase tracking-wider text-[#7e7e8b] font-bold block">
                        Event / Edition
                      </span>
                      <p className="text-sm font-bold text-white truncate">
                        {cert.edition?.name || 'GenCode League 2026'}
                      </p>
                    </div>

                    {/* Team Affiliation */}
                    <div className="p-3.5 rounded-xl bg-[#16161c] border border-[#26262e] space-y-1">
                      <span className="text-[10.5px] font-mono uppercase tracking-wider text-[#7e7e8b] font-bold block">
                        Team Affiliation
                      </span>
                      <p className="text-sm font-bold text-slate-200 truncate flex items-center gap-1.5">
                        <Users size={14} className="text-[#8e8e9a] shrink-0" />
                        {cert.team?.name || 'Individual Competitor'}
                      </p>
                    </div>

                    {/* Issued Date */}
                    <div className="p-3.5 rounded-xl bg-[#16161c] border border-[#26262e] space-y-1">
                      <span className="text-[10.5px] font-mono uppercase tracking-wider text-[#7e7e8b] font-bold block">
                        Issued Date
                      </span>
                      <p className="text-sm font-mono font-semibold text-slate-200 truncate flex items-center gap-1.5">
                        <Calendar size={14} className="text-[#8e8e9a] shrink-0" />
                        {formattedDate}
                      </p>
                    </div>

                    {/* Optional Achievement Tile */}
                    {cert.achievement && (
                      <div className="col-span-1 sm:col-span-2 p-3.5 rounded-xl bg-[#16161c] border border-[#26262e] space-y-1">
                        <span className="text-[10.5px] font-mono uppercase tracking-wider text-[#7e7e8b] font-bold block">
                          Achievement / Honor
                        </span>
                        <p className="text-sm font-bold text-[#ffd700] truncate">
                          {cert.achievement}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Full-width Permanent Identifier Tile with Copy Button */}
                  <div className="p-3.5 rounded-xl bg-[#16161c] border border-[#26262e] flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <span className="text-[10.5px] font-mono uppercase tracking-wider text-[#7e7e8b] font-bold block">
                        Permanent Identifier
                      </span>
                      <p className="text-base sm:text-lg font-mono font-black text-[#ffd700] tracking-wider truncate mt-0.5">
                        {cert.certificate_id}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleCopyIdOnly}
                      className="px-3 py-1.5 rounded-lg bg-[#202028] hover:bg-[#2c2c36] border border-[#3e3e48] text-xs font-mono font-bold text-white flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer"
                      aria-label="Copy permanent identifier"
                    >
                      {copiedId ? (
                        <>
                          <Check size={13} className="text-emerald-400" /> Copied ✓
                        </>
                      ) : (
                        <>
                          <Copy size={13} /> Copy
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* 2. Verification Checks Card */}
                <div className="panel p-5 sm:p-6 rounded-2xl border border-[#26262f] bg-[#121217] space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-[#23232c]">
                    <span className="text-xs font-mono uppercase tracking-wider text-[#9a9aa3] font-bold">
                      VERIFICATION CHECKS
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/40">
                      {cert.status === 'valid' ? '4 OF 4 CHECKS PASSED' : '3 OF 4 CHECKS PASSED'}
                    </span>
                  </div>

                  <div className="space-y-3 font-mono text-xs">
                    {/* Check 1: Registry Record */}
                    <div className="verify-check-row flex items-center justify-between gap-3 p-2.5 rounded-lg bg-[#16161c]/80 border border-[#23232c]">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                        <span className="text-slate-200 truncate">Record found in GCL registry</span>
                      </div>
                      <span className="text-[11px] text-emerald-400 font-bold shrink-0">PASS</span>
                    </div>

                    {/* Check 2: Credential Status */}
                    <div className="verify-check-row flex items-center justify-between gap-3 p-2.5 rounded-lg bg-[#16161c]/80 border border-[#23232c]">
                      <div className="flex items-center gap-2.5 min-w-0">
                        {cert.status === 'valid' ? (
                          <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                        ) : (
                          <XCircle size={16} className="text-red-400 shrink-0" />
                        )}
                        <span className="text-slate-200 truncate">
                          Credential status:{' '}
                          <span className={cert.status === 'valid' ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>
                            {cert.status === 'valid' ? 'Valid' : 'Revoked'}
                          </span>
                        </span>
                      </div>
                      <span className={`text-[11px] font-bold shrink-0 ${cert.status === 'valid' ? 'text-emerald-400' : 'text-red-400'}`}>
                        {cert.status === 'valid' ? 'PASS' : 'FAIL'}
                      </span>
                    </div>

                    {/* Check 3: Issued Date */}
                    <div className="verify-check-row flex items-center justify-between gap-3 p-2.5 rounded-lg bg-[#16161c]/80 border border-[#23232c]">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                        <span className="text-slate-200 truncate">Issued {formattedDate}</span>
                      </div>
                      <span className="text-[11px] text-emerald-400 font-bold shrink-0">PASS</span>
                    </div>

                    {/* Check 4: Template Version */}
                    <div className="verify-check-row flex items-center justify-between gap-3 p-2.5 rounded-lg bg-[#16161c]/80 border border-[#23232c]">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                        <span className="text-slate-200 truncate">Template version v{cert.template_version}</span>
                      </div>
                      <span className="text-[11px] text-emerald-400 font-bold shrink-0">PASS</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* ============================================================ */}
              {/* RIGHT COLUMN: Certificate Preview                             */}
              {/* ============================================================ */}
              <div className="panel p-5 sm:p-6 rounded-2xl border border-[#26262f] bg-[#121217] space-y-4 min-w-0">
                {/* Header Row: Title & Hide/Show Preview Control */}
                <div className="flex items-center justify-between gap-3 pb-3 border-b border-[#23232c]">
                  <span className="text-xs font-mono uppercase tracking-wider text-[#9a9aa3] font-bold flex items-center gap-2">
                    <FileText size={15} className="text-[#ff4d5a]" /> Certificate preview
                  </span>

                  {/* Hide / Show Preview button */}
                  <button
                    type="button"
                    onClick={() => setShowPreview(!showPreview)}
                    className="px-3 py-1.5 rounded-lg bg-[#18181c] hover:bg-[#25252b] border border-[#3e3e48] text-xs font-mono font-bold text-white flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Eye size={13} />
                    {showPreview ? 'Hide preview' : 'Show preview'}
                  </button>
                </div>

                {/* Dark Stage containing the Certificate */}
                {showPreview ? (
                  <div
                    ref={previewContainerRef}
                    className="verify-certificate-stage"
                    onPointerMove={handlePointerMove}
                    onPointerLeave={handlePointerLeave}
                  >
                    <div
                      className={`verify-cert-wrapper ${activeTheme.borderClass}`}
                      style={{
                        width: Math.round(1000 * activeScale),
                        height: Math.round(707 * activeScale),
                        transform: canTilt ? `rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg)` : undefined,
                        transformStyle: 'preserve-3d',
                        transition: tilt.opacity === 0 ? 'transform 0.4s ease-out' : 'transform 0.08s ease-out',
                      }}
                    >
                      {/* Version 1 Certificate Layer */}
                      <div
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: 1000,
                          height: 707,
                          transformOrigin: 'top left',
                          transform: `scale(${activeScale})`,
                          pointerEvents: 'none',
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
                          scale={1}
                        />
                      </div>

                      {/* Cursor Sheen Overlay (Soft-light blend mode for white certificate) */}
                      {canTilt && (
                        <div
                          className="verify-hologram-sheen"
                          style={{
                            opacity: tilt.opacity,
                            background: `radial-gradient(circle at ${tilt.sheenX}% ${tilt.sheenY}%, rgba(255, 255, 255, 0.45) 0%, rgba(255, 42, 61, 0.18) 35%, transparent 65%)`,
                          }}
                          aria-hidden="true"
                        />
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="p-8 rounded-xl bg-[#141418] border border-[#23232c] text-center space-y-2">
                    <p className="text-xs text-[#8e8e9a] font-mono">
                      Certificate preview is currently hidden.
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowPreview(true)}
                      className="px-3.5 py-1.5 rounded-lg bg-[#18181c] hover:bg-[#25252b] border border-[#3e3e48] text-xs font-mono font-bold text-white inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Eye size={13} /> Click to View Certificate
                    </button>
                  </div>
                )}

                {/* Under the Stage: Template version */}
                <div className="flex items-center justify-between pt-1 text-xs text-[#71717a] font-mono">
                  <span>Template version: v{cert.template_version}</span>
                  <span>GCL Credential Registry</span>
                </div>
              </div>
            </div>

            {/* D. FOOTER NOTE */}
            <p className="text-center text-xs font-mono text-[#71717a] pt-4">
              Anyone with this link can verify this certificate.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
