import React, { useEffect, useState, useRef } from 'react';
import QRCode from 'qrcode';
import { AlertTriangle } from 'lucide-react';
import type { CertificateType } from '../types/certificates';
import { getCertificateTitle, getCertificateSubtitle } from '../utils/certificateUtils';

export interface CertificatePreviewProps {
  recipientName: string;
  certificateType: CertificateType;
  certificateId: string;
  templateVersion?: number;
  editionName?: string;
  teamName?: string | null;
  achievement?: string | null;
  issuedAt?: string;
  status?: 'valid' | 'revoked';
  scale?: number;
  className?: string;
}

/**
 * GCL Global Certificate Preview Component.
 *
 * Renders the official fixed certificate template (background image)
 * with dynamic text overlaid at precise positions.
 *
 * The background design, borders, graphics, branding, and layout
 * are ALL fixed via the global template image. Only the following
 * are dynamically injected:
 * - Participant name
 * - Team name
 * - Certificate type title (PARTICIPATION / ACHIEVEMENT)
 * - Subtitle / achievement text
 * - Edition season & version
 * - QR code
 * - Certificate ID
 * - Issue date
 * - Verify URL
 */
export default function CertificatePreview({
  recipientName,
  certificateType,
  certificateId,
  templateVersion = 1,
  editionName = 'GenCode League 2026',
  teamName,
  achievement,
  issuedAt,
  status = 'valid',
  scale = 1,
  className = '',
}: CertificatePreviewProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const certRef = useRef<HTMLDivElement>(null);

  // Derive verification URL
  const verifyUrl = `${typeof window !== 'undefined' ? window.location.origin : 'https://gcl20.vercel.app'}/verify/${certificateId}`;

  // Extract short verify domain for display
  const verifyDomain = typeof window !== 'undefined'
    ? `${window.location.host}/verify/`
    : 'gcl20.vercel.app/verify/';

  // Generate QR code
  useEffect(() => {
    let isMounted = true;
    if (certificateId) {
      QRCode.toDataURL(
        verifyUrl,
        {
          width: 256,
          margin: 1,
          color: {
            dark: '#000000',
            light: '#ffffff',
          },
          errorCorrectionLevel: 'M',
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

  // Format issued date
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

  // Extract edition season text from name (e.g. "Genesis Season" from "GCL 2024")
  const editionYear = editionName?.match(/\d{4}/)?.[0] || '2026';
  const seasonName = editionName?.replace(/GCL\s*\d{4}/i, '').trim() || 'Genesis Season';

  // Certificate title: PARTICIPATION or ACHIEVEMENT
  const certTitle = getCertificateTitle(certificateType);

  // Subtitle / body text
  const subtitleText = getCertificateSubtitle(certificateType, achievement);

  // Whether this type shows a team affiliation line
  const showTeamLine = certificateType === 'participation' || certificateType === 'best_team';

  // Compute dynamic font size for recipient name to prevent overflow
  const getNameFontSize = (name: string): number => {
    const len = name.length;
    if (len <= 14) return 42;
    if (len <= 20) return 36;
    if (len <= 28) return 30;
    if (len <= 36) return 26;
    return 22;
  };

  const nameFontSize = getNameFontSize(recipientName || 'Recipient Name');

  return (
    <div
      ref={certRef}
      id={`certificate-${certificateId}`}
      className={`relative select-none overflow-hidden ${className}`}
      style={{
        width: 1000,
        height: 707,
        transform: scale !== 1 ? `scale(${scale})` : undefined,
        transformOrigin: 'top left',
        fontFamily: "'Inter', 'Segoe UI', -apple-system, sans-serif",
        backgroundColor: '#ffffff',
      }}
    >
      {/* ═══════════════════════════════════════════════════════
          FIXED GLOBAL TEMPLATE BACKGROUND IMAGE
          This is the official GCL certificate design.
          It includes all borders, graphics, gavel icon, GCL logo,
          corner accents, signature areas, and decorative elements.
          ═══════════════════════════════════════════════════════ */}
      <img
        src="/gcl-certificate-template.jpg"
        alt="GCL Certificate Template"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          pointerEvents: 'none',
          zIndex: 0,
        }}
        crossOrigin="anonymous"
      />

      {/* ═══════════════════════════════════════════════════════
          DYNAMIC TEXT OVERLAYS
          Only these elements change per certificate.
          Positions are calibrated to match the fixed template.
          ═══════════════════════════════════════════════════════ */}

      {/* Revoked Watermark Overlay */}
      {status === 'revoked' && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 50,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(2px)',
          }}
        >
          <div
            style={{
              border: '4px solid rgba(239,68,68,0.8)',
              padding: '24px 48px',
              borderRadius: '16px',
              transform: 'rotate(-12deg)',
              backgroundColor: 'rgba(127,29,29,0.9)',
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
            }}
          >
            <AlertTriangle size={56} color="#f87171" />
            <div>
              <div
                style={{
                  fontSize: '48px',
                  fontWeight: 900,
                  color: '#f87171',
                  letterSpacing: '0.15em',
                  fontFamily: 'monospace',
                }}
              >
                REVOKED
              </div>
              <div style={{ fontSize: '12px', color: '#fca5a5', marginTop: '4px', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.08em' }}>
                This certificate has been officially invalidated
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Edition Season & Year (Top Right Area) ── */}
      <div
        style={{
          position: 'absolute',
          top: '36px',
          right: '120px',
          textAlign: 'center',
          zIndex: 10,
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            fontSize: '10px',
            fontWeight: 700,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: '#1a1a1a',
            fontFamily: "'Inter', sans-serif",
          }}
        >
          {seasonName || 'Genesis Season'}
        </div>
        <div
          style={{
            fontSize: '14px',
            fontWeight: 900,
            letterSpacing: '0.08em',
            color: '#1a1a1a',
            marginTop: '2px',
            fontFamily: "'Inter', sans-serif",
          }}
        >
          GCL {editionYear}
        </div>
      </div>

      {/* ── Template Version Badge (Top Right Corner) ── */}
      <div
        style={{
          position: 'absolute',
          top: '36px',
          right: '32px',
          fontSize: '11px',
          fontWeight: 700,
          letterSpacing: '0.06em',
          color: '#555555',
          fontFamily: "'Inter', sans-serif",
          zIndex: 10,
          pointerEvents: 'none',
        }}
      >
        VER. {templateVersion}
      </div>

      {/* ── Certificate Title: "CERTIFICATE OF PARTICIPATION" ── */}
      {/* The word "CERTIFICATE" is part of the background template image.
          We only overlay "OF PARTICIPATION" / "OF ACHIEVEMENT" dynamically. */}
      <div
        style={{
          position: 'absolute',
          top: '225px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 10,
          pointerEvents: 'none',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            fontSize: '18px',
            fontWeight: 600,
            letterSpacing: '0.38em',
            textTransform: 'uppercase',
            color: '#333333',
            fontFamily: "'Inter', sans-serif",
          }}
        >
          OF {certTitle}
        </div>
      </div>

      {/* ── Presented To Line ── */}
      <div
        style={{
          position: 'absolute',
          top: '278px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 10,
          pointerEvents: 'none',
          textAlign: 'center',
          fontSize: '11px',
          fontWeight: 400,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: '#777777',
          fontFamily: "'Inter', sans-serif",
        }}
      >
        THIS IS PROUDLY PRESENTED TO
      </div>

      {/* ── Recipient Name (DYNAMIC — large bold) ── */}
      <div
        style={{
          position: 'absolute',
          top: '310px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 10,
          pointerEvents: 'none',
          textAlign: 'center',
          maxWidth: '80%',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        <span
          style={{
            fontSize: `${nameFontSize}px`,
            fontWeight: 900,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            color: '#111111',
            fontFamily: "'Inter', sans-serif",
          }}
        >
          {recipientName || 'Recipient Name'}
        </span>
      </div>

      {/* ── Subtitle / Achievement Body Text ── */}
      <div
        style={{
          position: 'absolute',
          top: '380px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 10,
          pointerEvents: 'none',
          textAlign: 'center',
          maxWidth: '70%',
          lineHeight: 1.6,
        }}
      >
        <span
          style={{
            fontSize: '13px',
            fontWeight: 400,
            color: '#444444',
            fontFamily: "'Inter', sans-serif",
          }}
        >
          {subtitleText}
        </span>
      </div>

      {/* ── Team Name (DYNAMIC — only for participation/best_team) ── */}
      {showTeamLine && teamName && (
        <div
          style={{
            position: 'absolute',
            top: '420px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 10,
            pointerEvents: 'none',
            textAlign: 'center',
          }}
        >
          <span
            style={{
              fontSize: '17px',
              fontWeight: 700,
              fontStyle: 'italic',
              color: '#111111',
              fontFamily: "'Inter', sans-serif",
            }}
          >
            {teamName}.
          </span>
        </div>
      )}

      {/* ── QR Code (Bottom Center-Left Area) ── */}
      <div
        style={{
          position: 'absolute',
          bottom: '75px',
          left: '280px',
          width: '80px',
          height: '80px',
          zIndex: 20,
          pointerEvents: 'none',
        }}
      >
        {qrDataUrl && (
          <img
            src={qrDataUrl}
            alt="Verification QR Code"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
            }}
          />
        )}
      </div>

      {/* ── Official GCL Record Info Block (Next to QR Code) ── */}
      <div
        style={{
          position: 'absolute',
          bottom: '73px',
          left: '372px',
          zIndex: 10,
          pointerEvents: 'none',
        }}
      >
        {/* Official GCL Record badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            marginBottom: '6px',
          }}
        >
          <div
            style={{
              width: '14px',
              height: '14px',
              borderRadius: '50%',
              backgroundColor: '#dc2626',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span style={{ color: '#ffffff', fontSize: '9px', fontWeight: 900 }}>✓</span>
          </div>
          <span
            style={{
              fontSize: '9px',
              fontWeight: 800,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: '#dc2626',
              fontFamily: "'Inter', sans-serif",
            }}
          >
            OFFICIAL GCL RECORD
          </span>
        </div>

        {/* Certificate ID */}
        <div
          style={{
            fontSize: '14px',
            fontWeight: 900,
            color: '#111111',
            fontFamily: "'Inter', sans-serif",
            letterSpacing: '0.02em',
          }}
        >
          {certificateId || 'GCL26-PART-XXXXXX'}
        </div>

        {/* Verify URL */}
        <div
          style={{
            fontSize: '9px',
            fontWeight: 500,
            color: '#666666',
            marginTop: '3px',
            fontFamily: "'Inter', sans-serif",
          }}
        >
          verify at: {verifyDomain}
        </div>

        {/* Issue Date */}
        <div
          style={{
            fontSize: '9px',
            fontWeight: 500,
            color: '#666666',
            marginTop: '1px',
            fontFamily: "'Inter', sans-serif",
          }}
        >
          Issued: {formattedDate}
        </div>
      </div>
    </div>
  );
}
