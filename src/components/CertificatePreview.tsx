import React, { useEffect, useState, useRef } from 'react';
import QRCode from 'qrcode';
import { ShieldCheck, Award, AlertTriangle } from 'lucide-react';
import type { CertificateDesignConfig, CertificateType } from '../types/certificates';

interface CertificatePreviewProps {
  recipientName: string;
  certificateType: CertificateType;
  certificateId: string;
  designConfig: CertificateDesignConfig;
  templateVersion?: number;
  editionName?: string;
  teamName?: string | null;
  issuedAt?: string;
  status?: 'valid' | 'revoked';
  scale?: number; // Scaling factor for preview sizing
  onCanvasReady?: (canvasElement: HTMLElement) => void;
  className?: string;
}

export default function CertificatePreview({
  recipientName,
  certificateType,
  certificateId,
  designConfig,
  templateVersion = 1,
  editionName = 'GenCode League 2026',
  teamName,
  issuedAt,
  status = 'valid',
  scale = 1,
  className = '',
}: CertificatePreviewProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const certRef = useRef<HTMLDivElement>(null);

  // Verification URL
  const verifyUrl = `${window.location.origin}/verify/${certificateId}`;

  useEffect(() => {
    let isMounted = true;
    if (certificateId) {
      QRCode.toDataURL(
        verifyUrl,
        {
          width: 256,
          margin: 1,
          color: {
            dark: '#ffffff',
            light: '#090d16',
          },
        },
        (err, url) => {
          if (!err && url && isMounted) {
            setQrDataUrl(url);
          }
        }
      );
    }
    return () => {
      isMounted = false;
    };
  }, [certificateId, verifyUrl]);

  const formattedDate = issuedAt
    ? new Date(issuedAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

  const primaryColor = designConfig.primary_color || '#00f0ff';
  const secondaryColor = designConfig.secondary_color || '#7000ff';
  const title = designConfig.title || 'Certificate of Participation';
  const subtitle =
    designConfig.subtitle || 'has actively participated in GenCode League';
  const badge = designConfig.accent_badge || certificateType.toUpperCase();
  const sigTitle1 = designConfig.signature_title_1 || 'Faculty Coordinator';
  const sigName1 = designConfig.signature_name_1 || 'GenCode League';
  const sigTitle2 = designConfig.signature_title_2 || 'Convenor';
  const sigName2 = designConfig.signature_name_2 || 'Department of CSE';

  return (
    <div
      ref={certRef}
      id={`certificate-${certificateId}`}
      className={`relative select-none text-white overflow-hidden ${className}`}
      style={{
        width: 1000,
        height: 707, // Standard 1.414 aspect ratio (A4 landscape)
        transform: scale !== 1 ? `scale(${scale})` : undefined,
        transformOrigin: 'top left',
        background: 'linear-gradient(135deg, #050811 0%, #0a1128 50%, #060913 100%)',
        boxShadow: `0 0 40px rgba(0, 240, 255, 0.15), inset 0 0 60px rgba(0, 0, 0, 0.8)`,
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      {/* Decorative Cyber Border Lines */}
      <div
        className="absolute inset-4 pointer-events-none rounded-lg"
        style={{
          border: `2px solid ${primaryColor}40`,
          boxShadow: `inset 0 0 20px ${secondaryColor}20`,
        }}
      />
      <div
        className="absolute inset-6 pointer-events-none rounded"
        style={{
          border: `1px dashed ${primaryColor}30`,
        }}
      />

      {/* Futuristic Corner Tech Accents */}
      <div
        className="absolute top-4 left-4 w-8 h-8 pointer-events-none"
        style={{
          borderTop: `4px solid ${primaryColor}`,
          borderLeft: `4px solid ${primaryColor}`,
        }}
      />
      <div
        className="absolute top-4 right-4 w-8 h-8 pointer-events-none"
        style={{
          borderTop: `4px solid ${primaryColor}`,
          borderRight: `4px solid ${primaryColor}`,
        }}
      />
      <div
        className="absolute bottom-4 left-4 w-8 h-8 pointer-events-none"
        style={{
          borderBottom: `4px solid ${primaryColor}`,
          borderLeft: `4px solid ${primaryColor}`,
        }}
      />
      <div
        className="absolute bottom-4 right-4 w-8 h-8 pointer-events-none"
        style={{
          borderBottom: `4px solid ${primaryColor}`,
          borderRight: `4px solid ${primaryColor}`,
        }}
      />

      {/* Watermark/Revoked overlay if revoked */}
      {status === 'revoked' && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs">
          <div className="border-4 border-red-500/80 px-12 py-6 rounded-xl rotate-[-12deg] bg-red-950/80 shadow-2xl flex items-center gap-4">
            <AlertTriangle size={56} className="text-red-400" />
            <div>
              <div className="text-5xl font-black text-red-400 tracking-widest font-mono">
                REVOKED
              </div>
              <div className="text-sm text-red-200 mt-1 uppercase font-bold tracking-wider">
                This certificate has been officially invalidated
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Certificate Content Container */}
      <div className="relative z-10 h-full flex flex-col justify-between p-12 text-center">
        {/* Header Section */}
        <div>
          <div className="flex items-center justify-between px-4 mb-2">
            <div className="flex items-center gap-2">
              <Award size={28} style={{ color: primaryColor }} />
              <span className="font-mono text-sm tracking-widest text-slate-400 uppercase">
                {editionName}
              </span>
            </div>

            <div
              className="px-4 py-1 rounded-full text-xs font-mono font-bold tracking-widest uppercase border"
              style={{
                color: primaryColor,
                borderColor: `${primaryColor}60`,
                backgroundColor: `${primaryColor}15`,
                boxShadow: `0 0 15px ${primaryColor}30`,
              }}
            >
              {badge}
            </div>

            <div className="font-mono text-xs text-slate-500 tracking-wider">
              VER. {templateVersion}
            </div>
          </div>

          <h2
            className="text-3xl font-black uppercase tracking-wider mt-3"
            style={{
              background: `linear-gradient(90deg, #ffffff 0%, ${primaryColor} 100%)`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              letterSpacing: '0.05em',
            }}
          >
            {title}
          </h2>
          <div
            className="w-32 h-1 mx-auto mt-2 rounded-full"
            style={{
              background: `linear-gradient(90deg, transparent, ${primaryColor}, transparent)`,
            }}
          />
        </div>

        {/* Recipient Body Section */}
        <div className="my-auto py-2">
          <p className="text-xs uppercase tracking-widest text-slate-400 font-mono mb-2">
            This is proudly presented to
          </p>

          <h1
            className="text-4xl font-extrabold tracking-wide uppercase my-3"
            style={{
              color: '#ffffff',
              textShadow: `0 0 25px ${primaryColor}80, 0 0 50px ${secondaryColor}50`,
            }}
          >
            {recipientName || 'Recipient Name'}
          </h1>

          <p className="text-base text-slate-300 max-w-2xl mx-auto font-light leading-relaxed">
            {subtitle}
            {teamName ? (
              <span className="font-semibold text-white">
                {' '}
                as a proud member of{' '}
                <span style={{ color: primaryColor }}>{teamName}</span>
              </span>
            ) : null}
            .
          </p>
        </div>

        {/* Footer Section: Signatures & Verification Block */}
        <div className="border-t border-slate-800/80 pt-6 px-4">
          <div className="flex items-end justify-between">
            {/* Signature 1 */}
            <div className="text-left w-52">
              <div className="h-10 flex items-end">
                <span className="font-serif italic text-lg text-slate-300 opacity-90">
                  {sigName1}
                </span>
              </div>
              <div className="h-0.5 w-full bg-slate-700 mt-1 mb-1" />
              <div className="text-xs font-bold text-slate-200">{sigName1}</div>
              <div className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">
                {sigTitle1}
              </div>
            </div>

            {/* Center Verification + QR Block */}
            <div className="flex items-center gap-4 px-4 py-2 rounded-lg bg-slate-900/60 border border-slate-800">
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt="Verification QR"
                  className="w-16 h-16 rounded border border-slate-700 bg-slate-950 p-1"
                />
              ) : (
                <div className="w-16 h-16 rounded border border-slate-800 bg-slate-950 flex items-center justify-center">
                  <ShieldCheck size={24} className="text-slate-600 animate-pulse" />
                </div>
              )}

              <div className="text-left font-mono">
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                  <ShieldCheck size={14} />
                  <span>OFFICIAL GCL RECORD</span>
                </div>
                <div className="text-[13px] font-bold text-white tracking-widest mt-0.5">
                  {certificateId || 'GCL26-CERT-XXXXXX'}
                </div>
                <div className="text-[10px] text-slate-400 truncate max-w-[210px] mt-0.5">
                  verify at: {verifyUrl.replace(/^https?:\/\//, '')}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  Issued: {formattedDate}
                </div>
              </div>
            </div>

            {/* Signature 2 */}
            <div className="text-right w-52">
              <div className="h-10 flex items-end justify-end">
                <span className="font-serif italic text-lg text-slate-300 opacity-90">
                  {sigName2}
                </span>
              </div>
              <div className="h-0.5 w-full bg-slate-700 mt-1 mb-1" />
              <div className="text-xs font-bold text-slate-200">{sigName2}</div>
              <div className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">
                {sigTitle2}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
