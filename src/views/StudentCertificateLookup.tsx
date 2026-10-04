import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  AlertCircle,
  ExternalLink,
  Lock,
  Sparkles,
  Loader2,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import Header from '../components/Header';
import Notification, { type NotificationState } from '../components/Notification';
import CertificatePreview from '../components/CertificatePreview';
import { downloadOrRegenerateCertificate } from '../utils/pdfGenerator';
import type { Certificate } from '../types/certificates';
import type { Edition } from '../types/database';
import './StudentCertificateLookup.css';

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

  // UI-only state for Credential Vault
  const [selectedCertId, setSelectedCertId] = useState<string | null>(null);
  const [unlockTriggerKey, setUnlockTriggerKey] = useState<number>(0);
  const [shakeKey, setShakeKey] = useState<number>(0);
  const [copiedCertId, setCopiedCertId] = useState<string | null>(null);

  // 3-step verification UI progression
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyStep, setVerifyStep] = useState(0);

  // 3D Tilt & Hologram sheen state
  const [tilt, setTilt] = useState<{ rx: number; ry: number; sheenX: number; sheenY: number; opacity: number }>({
    rx: 0,
    ry: 0,
    sheenX: 50,
    sheenY: 50,
    opacity: 0,
  });

  const [stageScale, setStageScale] = useState<number>(0.75);
  const stageContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // Load editions for the filter chips
  useEffect(() => {
    supabase
      .from('editions')
      .select('*')
      .order('year', { ascending: false })
      .then(({ data }) => {
        if (data) setEditions(data);
      });
  }, []);

  // Normalization helper for exact matching (case-insensitive, trimmed, single spaces)
  const normalize = (str: string) => str.toLowerCase().replace(/\s+/g, ' ').trim();

  // Filter existing search results for EXACT holder name match only
  const queryNorm = normalize(searchName);
  const exactMatches = useMemo(() => {
    if (!hasSearched || !queryNorm) return [];
    return results.filter((cert) => normalize(cert.recipient_name) === queryNorm);
  }, [results, hasSearched, queryNorm]);

  // Keep selectedCertId valid
  const activeCert: Certificate | null = useMemo(() => {
    if (exactMatches.length === 0) return null;
    return exactMatches.find((c) => c.id === selectedCertId) || exactMatches[0];
  }, [exactMatches, selectedCertId]);

  // Auto-fit stage certificate scale to container width
  useEffect(() => {
    const node = stageContainerRef.current;
    if (!node) return;

    const updateScale = () => {
      if (stageContainerRef.current) {
        const containerW = stageContainerRef.current.clientWidth;
        if (containerW > 0) {
          const targetScale = Math.min(containerW / 1000, 1);
          setStageScale(Number(targetScale.toFixed(4)));
        }
      }
    };

    updateScale();
    const rafId = requestAnimationFrame(updateScale);

    const ro = new ResizeObserver(() => {
      updateScale();
    });
    ro.observe(node);

    window.addEventListener('resize', updateScale);
    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
      window.removeEventListener('resize', updateScale);
    };
  }, [activeCert?.id]);

  const handleSearch = async (e?: React.FormEvent, overrideEditionId?: string) => {
    if (e) e.preventDefault();
    const query = searchName.trim();
    if (!query) {
      showToast('Please enter your full name to unlock', 'error');
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
    setIsVerifying(false);
    setVerifyStep(0);

    const editionFilter = overrideEditionId !== undefined ? overrideEditionId : selectedEditionId;

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

      if (editionFilter !== 'all') {
        req = req.eq('edition_id', editionFilter);
      }

      const { data, error } = await req;
      if (error) throw error;

      const loaded = (data as unknown as Certificate[]) || [];
      setResults(loaded);

      const targetNorm = normalize(query);
      const matches = loaded.filter((cert) => normalize(cert.recipient_name) === targetNorm);

      if (matches.length > 0) {
        setSelectedCertId(matches[0].id);
        setUnlockTriggerKey((k) => k + 1);
      } else {
        setShakeKey((k) => k + 1);
      }
    } catch (err: any) {
      showToast(err?.message || 'Search failed. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleEditionChipClick = (editionId: string) => {
    setSelectedEditionId(editionId);
    if (searchName.trim().length >= 2) {
      handleSearch(undefined, editionId);
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

  // 3-step verification UI progression ticking every 450ms
  const handleStartVerification = () => {
    setIsVerifying(true);
    setVerifyStep(1);

    setTimeout(() => {
      setVerifyStep(2);
    }, 450);

    setTimeout(() => {
      setVerifyStep(3);
    }, 900);

    setTimeout(() => {
      setVerifyStep(4);
    }, 1350);
  };

  // 3D Tilt calculation on pointer move
  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (typeof window !== 'undefined' && (
      window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
      window.matchMedia('(pointer: coarse)').matches
    )) return;
    if (e.pointerType === 'touch') return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;

    const rx = -y * 14;
    const ry = x * 14;

    const sheenX = ((e.clientX - rect.left) / rect.width) * 100;
    const sheenY = ((e.clientY - rect.top) / rect.height) * 100;

    setTilt({ rx, ry, sheenX, sheenY, opacity: 1 });
  };

  const handlePointerLeave = () => {
    setTilt({ rx: 0, ry: 0, sheenX: 50, sheenY: 50, opacity: 0 });
  };

  // Medal theme determination with exact colors
  const getMedalTheme = (type?: string) => {
    const t = (type || '').toLowerCase();
    if (t.includes('winner') || t.includes('champion') || t.includes('1st') || t === 'winner') {
      return {
        wrapperClass: 'vault-cert-gold',
        accentColor: '#f5b73b',
        label: 'Winner',
        tileBg: 'rgba(245, 183, 59, 0.12)',
        tileBorder: 'rgba(245, 183, 59, 0.4)',
        tileText: '#f5b73b',
      };
    }
    if (t.includes('runner') || t.includes('silver') || t.includes('2nd') || t === 'runner_up') {
      return {
        wrapperClass: 'vault-cert-silver',
        accentColor: '#c3c7d2',
        label: 'Runner-up',
        tileBg: 'rgba(195, 199, 210, 0.12)',
        tileBorder: 'rgba(195, 199, 210, 0.4)',
        tileText: '#c3c7d2',
      };
    }
    return {
      wrapperClass: 'vault-cert-red',
      accentColor: '#ff2a3d',
      label: 'Participant',
      tileBg: 'rgba(255, 42, 61, 0.12)',
      tileBorder: 'rgba(255, 42, 61, 0.4)',
      tileText: '#ff4d5a',
    };
  };

  const activeTheme = getMedalTheme(activeCert?.certificate_type);

  return (
    <div className="gcl-live-page min-h-screen text-[#f4f4f6] font-['Rajdhani',sans-serif] selection:bg-[#ff2a38] selection:text-white pb-20">
      <Header viewMode="live" onToggleView={() => {}} />
      <Notification notification={notification} />

      <main className="vault-page-container px-3 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10">
        <div className="vault-layout-grid">
          {/* ================================================================ */}
          {/* LEFT COLUMN: Search & Unlocked Certificates List                */}
          {/* ================================================================ */}
          <div className="flex flex-col gap-5 sm:gap-6 min-w-0">
            {/* Pill & Headline */}
            <div className="space-y-2 sm:space-y-3">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[rgba(232,33,46,0.12)] border border-[#ff4d5a]/40 text-[#ff4d5a] text-xs font-mono font-bold tracking-wider uppercase shadow-[0_0_12px_rgba(232,33,46,0.2)]">
                <Award size={15} /> CREDENTIAL VAULT
              </div>
              <h1
                className="text-[32px] sm:text-[44px] lg:text-[52px] font-black uppercase tracking-tight leading-none text-white"
                style={{ fontFamily: "'Rajdhani', sans-serif" }}
              >
                Your name.{' '}
                <span className="text-[#e8212e] drop-shadow-[0_0_16px_rgba(232,33,46,0.35)]">
                  Your proof.
                </span>
              </h1>
              <p className="text-xs sm:text-sm text-[#9a9aa3] font-medium font-sans leading-relaxed">
                Certificates stay sealed. Enter your exact full name and only yours unlocks. Nobody else's is ever shown.
              </p>
            </div>

            {/* Search Input Field with embedded Solid Red Unlock Button */}
            <form onSubmit={handleSearch} className="space-y-3">
              <div className="vault-search-box">
                <Search
                  size={18}
                  className="absolute left-3.5 text-[#9a9aa3] pointer-events-none"
                  aria-hidden="true"
                />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchName}
                  onChange={(e) => setSearchName(e.target.value)}
                  placeholder="Enter your full name to unlock"
                  className="vault-search-input"
                  aria-label="Enter your full name to unlock certificates"
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={loading || !searchName.trim()}
                  className="vault-unlock-btn"
                  aria-label="Unlock certificates for entered name"
                >
                  {loading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Checking...</span>
                    </>
                  ) : (
                    <>
                      <Lock size={15} />
                      <span>Unlock</span>
                    </>
                  )}
                </button>
              </div>

              {/* Rate limit warning */}
              {rateLimited && (
                <div
                  className="p-3 rounded-lg bg-red-950/40 border border-red-500/40 text-xs font-mono text-red-300 flex items-center gap-2"
                  role="alert"
                >
                  <AlertCircle size={15} className="shrink-0 text-red-400" />
                  <span>Search rate limit active. Please wait 30 seconds before searching again.</span>
                </div>
              )}
            </form>

            {/* Edition Chips */}
            <div className="space-y-2">
              <span className="text-[11px] font-mono uppercase tracking-wider text-[#7e7e8b] block font-semibold">
                Tournament Edition
              </span>
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap" role="radiogroup" aria-label="Edition filter">
                <button
                  type="button"
                  onClick={() => handleEditionChipClick('all')}
                  className={`px-3 py-1.5 min-h-[34px] rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                    selectedEditionId === 'all'
                      ? 'bg-[#e8212e] text-white border border-[#ff2a38] shadow-[0_0_12px_rgba(232,33,46,0.4)]'
                      : 'bg-[#18181c] text-[#9a9aa3] hover:text-white border border-[#2c2c33] hover:border-[#3e3e48]'
                  }`}
                  role="radio"
                  aria-checked={selectedEditionId === 'all'}
                >
                  All editions
                </button>
                {editions.map((ed) => {
                  const isSelected = selectedEditionId === ed.id;
                  return (
                    <button
                      key={ed.id}
                      type="button"
                      onClick={() => handleEditionChipClick(ed.id)}
                      className={`px-3 py-1.5 min-h-[34px] rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#e8212e] text-white border border-[#ff2a38] shadow-[0_0_12px_rgba(232,33,46,0.4)]'
                          : 'bg-[#18181c] text-[#9a9aa3] hover:text-white border border-[#2c2c33] hover:border-[#3e3e48]'
                      }`}
                      role="radio"
                      aria-checked={isSelected}
                    >
                      {ed.name} {ed.year ? `'${String(ed.year).slice(-2)}` : ''}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Left Column Status: Before Unlock vs Unlocked Certificates List */}
            {!hasSearched || exactMatches.length === 0 ? (
              <div className="vault-dashed-frame space-y-2.5">
                <Lock size={22} className="text-[#9a9aa3] opacity-60" aria-hidden="true" />
                <p className="text-xs font-sans text-[#8e8e9a] max-w-xs leading-relaxed">
                  Nothing is listed here. Certificates only appear after you enter your exact full name.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-mono uppercase tracking-wider text-[#9a9aa3] font-bold">
                    Unlocked · your certificates
                  </span>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-[#18181c] text-[#ff4d5a] border border-[#ff2a38]/40">
                    {exactMatches.length} {exactMatches.length === 1 ? 'CREDENTIAL' : 'CREDENTIALS'}
                  </span>
                </div>

                <div className="space-y-2" role="listbox" aria-label="Unlocked certificates list">
                  {exactMatches.map((cert) => {
                    const isSelected = activeCert?.id === cert.id;
                    const theme = getMedalTheme(cert.certificate_type);
                    return (
                      <div
                        key={cert.id}
                        role="option"
                        aria-selected={isSelected}
                        tabIndex={0}
                        onClick={() => {
                          setSelectedCertId(cert.id);
                          setIsVerifying(false);
                          setVerifyStep(0);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            setSelectedCertId(cert.id);
                            setIsVerifying(false);
                            setVerifyStep(0);
                          }
                        }}
                        className={`p-3.5 rounded-xl cursor-pointer transition-all flex items-center justify-between gap-3 ${
                          isSelected
                            ? 'bg-[#181015] border border-[#ff2a38] shadow-[0_0_16px_rgba(255,42,56,0.3)]'
                            : 'bg-[#121216] border border-[#26262e] hover:border-[#383844] hover:bg-[#18181f]'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                            style={{
                              background: theme.tileBg,
                              border: `1px solid ${theme.tileBorder}`,
                              color: theme.tileText,
                            }}
                          >
                            <Award size={18} />
                          </div>
                          <div className="min-w-0">
                            <h2 className="text-base font-bold text-white uppercase truncate leading-tight">
                              {cert.recipient_name}
                            </h2>
                            <p className="text-xs font-mono text-[#9a9aa3] truncate mt-0.5">
                              {cert.edition?.name || 'GCL'} · {cert.certificate_type.replace('_', ' ')}
                            </p>
                          </div>
                        </div>

                        {isSelected && (
                          <div className="w-2 h-2 rounded-full bg-[#ff2a38] shadow-[0_0_8px_#ff2a38] shrink-0" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* ================================================================ */}
          {/* RIGHT COLUMN: The Stage                                          */}
          {/* ================================================================ */}
          <div className="flex flex-col gap-4 sm:gap-5 min-w-0">
            {/* LOCKED STAGE: Initial State */}
            {!hasSearched && (
              <div className="panel gcl-card-crimson vault-stage-card flex items-center justify-center p-4 sm:p-10">
                <div className="vault-dashed-frame max-w-lg w-full h-full flex flex-col items-center justify-center gap-3 sm:gap-4">
                  <div className="vault-lock-pulsing">
                    <Lock size={48} className="text-[#e8212e] sm:w-16 sm:h-16" />
                  </div>
                  <div className="space-y-1 text-center">
                    <p className="text-base sm:text-xl font-black uppercase text-white tracking-wider">
                      Sealed vault. Enter your name to unlock.
                    </p>
                    <p className="text-xs text-[#8e8e9a] font-sans max-w-xs mx-auto">
                      Official credentials remain encrypted until authenticated by full name.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* FAILED STAGE: Name not found */}
            {hasSearched && exactMatches.length === 0 && (
              <div
                key={`failed-${shakeKey}`}
                className="panel red vault-stage-card flex items-center justify-center p-4 sm:p-10"
              >
                <div className="vault-dashed-frame max-w-lg w-full h-full flex flex-col items-center justify-center gap-3 sm:gap-4 vault-lock-shake">
                  <div className="p-3.5 sm:p-4 rounded-full bg-[#201014] border border-[#ff2a38]/40 shadow-[0_0_24px_rgba(255,42,56,0.35)]">
                    <Lock size={40} className="text-[#ff4d5a] sm:w-12 sm:h-12" />
                  </div>
                  <div className="space-y-1.5 text-center">
                    <h2 className="text-lg sm:text-2xl font-black uppercase text-white tracking-wide">
                      Still sealed. Name not found.
                    </h2>
                    <p className="text-xs text-[#9a9aa3] font-sans max-w-sm mx-auto leading-relaxed">
                      Check the spelling and enter your full name. No certificates match the exact input "{searchName}".
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* UNLOCKED STAGE: Certificate Artwork & Actions */}
            {hasSearched && exactMatches.length > 0 && activeCert && (
              <div className="vault-unlocked-stage min-w-0">
                {/* 3D Perspective Stage Container */}
                <div
                  ref={stageContainerRef}
                  key={`cert-stage-${unlockTriggerKey}-${activeCert.id}`}
                  className="vault-perspective-stage relative w-full"
                  onPointerMove={handlePointerMove}
                  onPointerLeave={handlePointerLeave}
                >
                  {/* Expanding Red Ring Burst Animation (fires on unlock) */}
                  <div className="vault-ring-burst-element" aria-hidden="true" />

                  {/* Stage Top Meta Bar: VALID pill, Certificate ID, Public Verify link */}
                  <div className="flex items-center justify-between gap-2 px-1 pb-3 sm:pb-4 flex-wrap sm:flex-nowrap">
                    <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                      {activeCert.status === 'valid' ? (
                        <span className="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md text-[10px] sm:text-[11px] font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/40 flex items-center gap-1 shrink-0">
                          <ShieldCheck size={13} /> VALID
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md text-[10px] sm:text-[11px] font-mono font-bold bg-red-500/15 text-red-400 border border-red-500/40 flex items-center gap-1 shrink-0">
                          <ShieldAlert size={13} /> REVOKED
                        </span>
                      )}
                      <span className="font-mono text-[#ffd700] font-bold text-xs sm:text-sm truncate">
                        {activeCert.certificate_id}
                      </span>
                    </div>

                    <Link
                      to={`/verify/${activeCert.certificate_id}`}
                      target="_blank"
                      className="gcl-btn-outline-red px-3.5 py-1 text-xs gap-1.5 font-bold uppercase tracking-wider shrink-0 transition-all ml-auto sm:ml-0"
                    >
                      Public Verify <ExternalLink size={12} />
                    </Link>
                  </div>

                  {/* Scaled Certificate Wrapper with 3D Tilt, Unlock Entrance & Medal Glowing Outline */}
                  <div
                    className={`vault-cert-wrapper ${activeTheme.wrapperClass} vault-cert-entering`}
                    style={{
                      width: '100%',
                      maxWidth: 1000,
                      height: Math.round(707 * stageScale),
                      position: 'relative',
                      overflow: 'hidden',
                      transform: `rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg)`,
                      transformStyle: 'preserve-3d',
                      transition: tilt.opacity === 0 ? 'transform 0.5s ease-out' : 'transform 0.08s ease-out',
                    }}
                  >
                    {/* Official Version 1 Certificate Layer (Isolated from normal flow) */}
                    <div
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: 1000,
                        height: 707,
                        transformOrigin: 'top left',
                        transform: `scale(${stageScale})`,
                        pointerEvents: 'none',
                      }}
                    >
                      <CertificatePreview
                        recipientName={activeCert.recipient_name}
                        certificateType={activeCert.certificate_type}
                        certificateId={activeCert.certificate_id}
                        editionId={activeCert.edition_id}
                        templateVersion={activeCert.template_version}
                        editionName={activeCert.edition?.name}
                        teamName={activeCert.team?.name}
                        achievement={activeCert.achievement}
                        customTitle={activeCert.custom_title}
                        customSubtitle={activeCert.custom_subtitle}
                        issuedAt={activeCert.issued_at}
                        status={activeCert.status}
                        scale={1}
                      />
                    </div>

                    {/* Cursor Sheen Overlay (Soft-light blend mode for white certificate) */}
                    <div
                      className="vault-hologram-sheen"
                      style={{
                        opacity: tilt.opacity,
                        background: `radial-gradient(circle at ${tilt.sheenX}% ${tilt.sheenY}%, rgba(255, 255, 255, 0.45) 0%, rgba(255, 42, 61, 0.18) 35%, transparent 65%)`,
                      }}
                      aria-hidden="true"
                    />
                  </div>
                </div>

                {/* STAGE ACTION BUTTONS (Optimized for both mobile and desktop) */}
                <div className="vault-stage-actions flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                  <div className="grid grid-cols-2 sm:flex sm:items-center gap-2">
                    <button
                      type="button"
                      onClick={handleStartVerification}
                      className="gcl-btn-outline-red h-11 px-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <ShieldCheck size={15} /> Verify
                    </button>

                    <button
                      type="button"
                      onClick={() => handleCopyVerifyUrl(activeCert.certificate_id)}
                      className="gcl-btn-outline-red h-11 px-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer"
                      title="Copy Verification Link"
                    >
                      {copiedId === activeCert.certificate_id ? (
                        <>
                          <Check size={15} className="text-emerald-400" /> Copied ✓
                        </>
                      ) : (
                        <>
                          <Copy size={15} /> Copy Link
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setPreviewCert(activeCert)}
                      className="col-span-2 sm:col-span-1 gcl-btn-outline-red h-11 px-3.5 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer"
                      title="View Full Certificate"
                    >
                      <Eye size={15} /> View Full
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDownload(activeCert)}
                    disabled={downloadingId === activeCert.certificate_id}
                    className="gcl-nav-btn-active h-11 px-6 text-sm font-bold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 w-full sm:w-auto sm:min-w-[160px]"
                  >
                    <Download size={16} />
                    {downloadingId === activeCert.certificate_id ? 'Downloading...' : 'Download PDF'}
                  </button>
                </div>

                {/* VERIFY PANEL (Animated 3-step checklist ticking every 450ms) */}
                {isVerifying && (
                  <div
                    className="panel p-4 sm:p-5 rounded-xl border border-[#2e2e38] bg-[#101015] space-y-3.5 transition-all"
                    role="region"
                    aria-live="polite"
                    aria-label="Certificate verification process"
                  >
                    <div className="flex items-center justify-between pb-2 border-b border-[#23232c]">
                      <span className="text-xs font-mono uppercase tracking-wider text-[#9a9aa3] font-bold flex items-center gap-1.5">
                        <Sparkles size={14} className="text-[#ff4d5a]" /> Cryptographic Verification
                      </span>
                      <span className="text-[11px] font-mono text-[#ffd700]">
                        {activeCert.certificate_id}
                      </span>
                    </div>

                    <div className="space-y-2 font-mono text-xs">
                      {/* Step 1 */}
                      <div className="flex items-center gap-2.5">
                        {verifyStep > 1 ? (
                          <Check size={15} className="text-emerald-400" />
                        ) : verifyStep === 1 ? (
                          <Loader2 size={15} className="animate-spin text-[#ff4d5a]" />
                        ) : (
                          <div className="w-3.5 h-3.5 rounded-full border border-white/20" />
                        )}
                        <span className={verifyStep >= 1 ? 'text-white font-semibold' : 'text-[#6e6e7c]'}>
                          Reading certificate ID
                        </span>
                      </div>

                      {/* Step 2 */}
                      <div className="flex items-center gap-2.5">
                        {verifyStep > 2 ? (
                          <Check size={15} className="text-emerald-400" />
                        ) : verifyStep === 2 ? (
                          <Loader2 size={15} className="animate-spin text-[#ff4d5a]" />
                        ) : (
                          <div className="w-3.5 h-3.5 rounded-full border border-white/20" />
                        )}
                        <span className={verifyStep >= 2 ? 'text-white font-semibold' : 'text-[#6e6e7c]'}>
                          Matching GCL registry
                        </span>
                      </div>

                      {/* Step 3 */}
                      <div className="flex items-center gap-2.5">
                        {verifyStep > 3 ? (
                          <Check size={15} className="text-emerald-400" />
                        ) : verifyStep === 3 ? (
                          <Loader2 size={15} className="animate-spin text-[#ff4d5a]" />
                        ) : (
                          <div className="w-3.5 h-3.5 rounded-full border border-white/20" />
                        )}
                        <span className={verifyStep >= 3 ? 'text-white font-semibold' : 'text-[#6e6e7c]'}>
                          Checking signature
                        </span>
                      </div>
                    </div>

                    {/* Step 4: Final verification result */}
                    {verifyStep >= 4 && (
                      <div className="pt-2">
                        {activeCert.status === 'valid' ? (
                          <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-500/40 text-emerald-400 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
                            <div className="flex items-center gap-2 text-xs font-mono font-bold">
                              <ShieldCheck size={16} className="text-emerald-400 shrink-0" />
                              <span>
                                Authentic · issued{' '}
                                {new Date(activeCert.issued_at).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                })}
                              </span>
                            </div>
                            <Link
                              to={`/verify/${activeCert.certificate_id}`}
                              target="_blank"
                              className="text-xs font-mono text-emerald-300 hover:text-white underline flex items-center gap-1"
                            >
                              Public Registry Record <ExternalLink size={12} />
                            </Link>
                          </div>
                        ) : (
                          <div className="p-3 rounded-lg bg-red-950/40 border border-red-500/40 text-red-400 flex items-center gap-2 text-xs font-mono font-bold">
                            <ShieldAlert size={16} className="text-red-400 shrink-0" />
                            <span>Could not verify · Revoked or signature mismatch</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Existing Modal Certificate Preview (Responsive Auto-Fit) */}
        {previewCert && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
            <div className="panel red p-3.5 sm:p-6 md:p-8 max-w-4xl w-full flex flex-col items-center space-y-4 my-2 sm:my-8 max-h-[96vh] overflow-y-auto">
              <div className="w-full flex items-center justify-between pb-3 border-b border-[#35353b]">
                <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                  <span className="font-mono text-[#ffd700] font-bold text-xs sm:text-sm truncate">
                    {previewCert.certificate_id}
                  </span>
                  <Link
                    to={`/verify/${previewCert.certificate_id}`}
                    target="_blank"
                    className="gcl-btn-outline-red px-3 py-1 text-xs gap-1.5 font-bold uppercase tracking-wider shrink-0 transition-all"
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

              <div className="w-full overflow-hidden flex justify-center py-2">
                <div
                  style={{
                    width: '100%',
                    maxWidth: 1000 * 0.8,
                    height: Math.round(707 * Math.min((typeof window !== 'undefined' ? (window.innerWidth - 48) : 800) / 1000, 0.8)),
                    position: 'relative',
                    overflow: 'hidden',
                    borderRadius: '8px',
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: 1000,
                      height: 707,
                      transformOrigin: 'top left',
                      transform: `scale(${Math.min((typeof window !== 'undefined' ? (window.innerWidth - 48) : 800) / 1000, 0.8)})`,
                      pointerEvents: 'none',
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
                      scale={1}
                    />
                  </div>
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
