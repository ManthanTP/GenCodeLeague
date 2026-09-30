import React, { useEffect, useState, useRef } from 'react';
import QRCode from 'qrcode';
import { AlertTriangle } from 'lucide-react';
import type { CertificateType, CertificateSettings } from '../types/certificates';
import {
  getCertificateTitle,
  getCertificateSubtitle,
  DEFAULT_CERTIFICATE_SETTINGS,
  fetchCertificateSettings,
} from '../utils/certificateUtils';

export interface CertificatePreviewProps {
  recipientName: string;
  certificateType: CertificateType;
  certificateId: string;
  editionId?: string;
  templateVersion?: number;
  editionName?: string;
  teamName?: string | null;
  achievement?: string | null;
  customTitle?: string | null;
  customSubtitle?: string | null;
  presentedToText?: string | null;
  issuedAt?: string;
  status?: 'valid' | 'revoked';
  scale?: number;
  className?: string;
  settings?: CertificateSettings | null;
}

/**
 * GCL Official Global Certificate Component.
 *
 * Renders on top of the clean 4K background (public/gcl-certificate-template.png)
 * with pixel-perfect vector styling:
 * - Top-left: GCL Branding or Admin-uploaded Custom Logo
 * - Top-right: Edition Season, Year & Version
 * - Center-top: Editable Center Emblem/Badge (Custom image or default GCL Gavel & Laurel Wreath vector)
 * - Main Heading: "CERTIFICATE" (in Orbitron 900 futuristic font)
 * - Title Suffix: "OF PARTICIPATION" / "OF ACHIEVEMENT" / custom editable title (Rajdhani 700 with red flourish)
 * - Presentation text: "THIS IS PROUDLY PRESENTED TO" (customizable)
 * - Recipient Name: Barlow Condensed 800 with first name(s) in dark black and last name in crimson red
 * - Subtitle & Team Name: Body text with team name highlighted in bold crimson red
 * - Center-bottom: Verification Card with QR Code, Record Badge, ID & Date (mathematically centered)
 * - Bottom-left: Faculty Coordinator (GenCode League) with Uploadable Signature
 * - Bottom-right: Convenor (Department of CSE) with Uploadable Signature
 */
export default function CertificatePreview({
  recipientName,
  certificateType,
  certificateId,
  editionId,
  templateVersion = 1,
  editionName = 'GenCode League 2026',
  teamName,
  achievement,
  customTitle,
  customSubtitle,
  presentedToText: propPresentedTo,
  issuedAt,
  status = 'valid',
  scale = 1,
  className = '',
  settings: propSettings,
}: CertificatePreviewProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [activeSettings, setActiveSettings] = useState<CertificateSettings>(
    propSettings || DEFAULT_CERTIFICATE_SETTINGS
  );
  const certRef = useRef<HTMLDivElement>(null);

  // Sync settings when props change or load for edition
  useEffect(() => {
    if (propSettings) {
      setActiveSettings(propSettings);
    } else {
      fetchCertificateSettings(editionId).then((loaded) => {
        if (loaded) setActiveSettings(loaded);
      });
    }
  }, [propSettings, editionId]);

  // Derive verification URL
  const verifyUrl = `${
    typeof window !== 'undefined' ? window.location.origin : 'https://gcl20.vercel.app'
  }/verify/${certificateId}`;

  // Extract short verify domain for display
  const verifyDomain =
    typeof window !== 'undefined'
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

  // Extract edition season and year
  const editionYear = editionName?.match(/\d{4}/)?.[0] || '2026';
  const seasonName =
    activeSettings.season_name ||
    editionName?.replace(/GCL\s*\d{4}/i, '').trim() ||
    'Genesis Season';

  // Title: Custom or derived from certificate type
  const rawTitle = customTitle?.trim() || `OF ${getCertificateTitle(certificateType)}`;
  const displayTitle = rawTitle.startsWith('OF ') ? rawTitle : `OF ${rawTitle}`;

  // Subtitle / body text
  const displaySubtitle =
    customSubtitle?.trim() || getCertificateSubtitle(certificateType, achievement);

  // Presentation text
  const presentationLine =
    propPresentedTo?.trim() ||
    activeSettings.presented_to_text ||
    'THIS IS PROUDLY PRESENTED TO';

  // Whether this type shows a team affiliation line
  const showTeamLine =
    certificateType === 'participation' || certificateType === 'best_team';

  // Recipient name splitting: First name(s) in black, last name in red
  const formatRecipientName = (fullName: string) => {
    const trimmed = (fullName || 'Recipient Name').trim();
    const parts = trimmed.split(/\s+/);
    if (parts.length <= 1) {
      return { firstNames: '', lastName: trimmed };
    }
    const lastName = parts[parts.length - 1];
    const firstNames = parts.slice(0, -1).join(' ');
    return { firstNames, lastName };
  };

  const { firstNames, lastName } = formatRecipientName(recipientName);

  // Dynamic font size for recipient name to prevent overflow
  const getNameFontSize = (name: string): number => {
    const len = name.length;
    if (len <= 14) return 48;
    if (len <= 20) return 42;
    if (len <= 28) return 36;
    if (len <= 36) return 30;
    return 24;
  };

  const nameFontSize = getNameFontSize(recipientName || 'Recipient Name');

  const signatoryLeft =
    activeSettings.signatory_left || DEFAULT_CERTIFICATE_SETTINGS.signatory_left;
  const signatoryRight =
    activeSettings.signatory_right || DEFAULT_CERTIFICATE_SETTINGS.signatory_right;

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
          CLEAN 4K TEMPLATE BACKGROUND IMAGE
          ═══════════════════════════════════════════════════════ */}
      <img
        src="/gcl-certificate-template.png"
        alt="GCL Certificate Template"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          objectFit: 'fill',
          pointerEvents: 'none',
          zIndex: 0,
        }}
        crossOrigin="anonymous"
      />

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
              <div
                style={{
                  fontSize: '12px',
                  color: '#fca5a5',
                  marginTop: '4px',
                  textTransform: 'uppercase',
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                }}
              >
                This certificate has been officially invalidated
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 1. Top Left: Logo / Branding (Custom or Official GCL Vector) ── */}
      <div
        style={{
          position: 'absolute',
          top: '36px',
          left: '46px',
          zIndex: 10,
          pointerEvents: 'none',
        }}
      >
        {activeSettings.logo_url ? (
          <img
            src={activeSettings.logo_url}
            alt="Event Logo"
            style={{
              maxHeight: '44px',
              maxWidth: '220px',
              objectFit: 'contain',
            }}
          />
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline' }}>
              <span
                style={{
                  fontSize: '28px',
                  fontWeight: 900,
                  color: '#111111',
                  letterSpacing: '-0.02em',
                  fontFamily: "'Inter', sans-serif",
                }}
              >
                GC
              </span>
              <span
                style={{
                  fontSize: '28px',
                  fontWeight: 900,
                  color: '#dc2626',
                  letterSpacing: '-0.02em',
                  fontFamily: "'Inter', sans-serif",
                }}
              >
                L
              </span>
            </div>
            <div
              style={{
                width: '1.5px',
                height: '28px',
                backgroundColor: '#9ca3af',
              }}
            />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div
                style={{
                  fontSize: '13px',
                  fontWeight: 900,
                  letterSpacing: '0.04em',
                  fontFamily: "'Inter', sans-serif",
                  lineHeight: 1.2,
                }}
              >
                <span style={{ color: '#111111' }}>GENCODE </span>
                <span style={{ color: '#dc2626' }}>LEAGUE</span>
              </div>
              <div
                style={{
                  fontSize: '8px',
                  fontWeight: 700,
                  letterSpacing: '0.18em',
                  color: '#6b7280',
                  textTransform: 'uppercase',
                  fontFamily: "'Inter', sans-serif",
                  marginTop: '1px',
                }}
              >
                TECHNICAL AUCTION EVENT
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── 2. Top Right: Edition Season, Year & Version ── */}
      <div
        style={{
          position: 'absolute',
          top: '36px',
          right: '46px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          zIndex: 10,
          pointerEvents: 'none',
        }}
      >
        <div style={{ textAlign: 'right' }}>
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
            {seasonName}
          </div>
          <div
            style={{
              fontSize: '14px',
              fontWeight: 900,
              letterSpacing: '0.08em',
              color: '#1a1a1a',
              marginTop: '1px',
              fontFamily: "'Inter', sans-serif",
            }}
          >
            GCL {editionYear}
          </div>
        </div>
        <div
          style={{
            width: '1px',
            height: '24px',
            backgroundColor: '#9ca3af',
          }}
        />
        <div style={{ position: 'relative' }}>
          <div
            style={{
              fontSize: '11px',
              fontWeight: 800,
              letterSpacing: '0.06em',
              color: '#374151',
              fontFamily: "'Inter', sans-serif",
            }}
          >
            VER. {templateVersion}
          </div>
          <div
            style={{
              position: 'absolute',
              bottom: '-3px',
              left: 0,
              width: '100%',
              height: '2px',
              backgroundColor: '#dc2626',
            }}
          />
        </div>
      </div>

      {/* ── 3. Center-Top: Editable Center Emblem/Logo (With proper gap to CERTIFICATE) ── */}
      <div
        style={{
          position: 'absolute',
          top: '98px',
          left: 0,
          width: '100%',
          height: '64px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 10,
          pointerEvents: 'none',
        }}
      >
        {activeSettings.emblem_url ? (
          <img
            src={activeSettings.emblem_url}
            alt="Certificate Emblem"
            style={{
              maxHeight: '62px',
              maxWidth: '220px',
              objectFit: 'contain',
            }}
          />
        ) : (
          <svg
            width="180"
            height="64"
            viewBox="0 0 180 64"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Left Accent Line */}
            <line x1="0" y1="36" x2="48" y2="36" stroke="#d1d5db" strokeWidth="1" />
            {/* Right Accent Line */}
            <line x1="132" y1="36" x2="180" y2="36" stroke="#d1d5db" strokeWidth="1" />

            {/* Left Laurel Branch */}
            <path
              d="M 68 54 C 58 46 54 34 56 22 C 58 14 62 8 68 2"
              stroke="#dc2626"
              strokeWidth="2"
              strokeLinecap="round"
              fill="none"
            />
            <path d="M 66 10 C 60 8 57 12 59 16 C 61 20 66 18 66 10 Z" fill="#dc2626" />
            <path d="M 63 20 C 56 19 53 24 56 28 C 59 32 63 29 63 20 Z" fill="#dc2626" />
            <path d="M 62 32 C 55 32 53 38 57 41 C 61 44 64 40 62 32 Z" fill="#dc2626" />
            <path d="M 65 44 C 59 46 58 52 63 54 C 67 56 69 50 65 44 Z" fill="#dc2626" />

            {/* Right Laurel Branch */}
            <path
              d="M 112 54 C 122 46 126 34 124 22 C 122 14 118 8 112 2"
              stroke="#dc2626"
              strokeWidth="2"
              strokeLinecap="round"
              fill="none"
            />
            <path d="M 114 10 C 120 8 123 12 121 16 C 119 20 114 18 114 10 Z" fill="#dc2626" />
            <path d="M 117 20 C 124 19 127 24 124 28 C 121 32 117 29 117 20 Z" fill="#dc2626" />
            <path d="M 118 32 C 125 32 127 38 123 41 C 119 44 116 40 118 32 Z" fill="#dc2626" />
            <path d="M 115 44 C 121 46 122 52 117 54 C 113 56 111 50 115 44 Z" fill="#dc2626" />

            {/* Sounding Block Pedestal */}
            <polygon
              points="76,54 104,54 109,60 71,60"
              fill="#1f2937"
              stroke="#374151"
              strokeWidth="1"
            />
            <rect x="73" y="58" width="34" height="3" fill="#111827" />

            {/* 3D Gavel at Angle */}
            <g transform="translate(90, 34) rotate(-35)">
              {/* Handle */}
              <rect
                x="-3"
                y="2"
                width="6"
                height="36"
                rx="2"
                fill="url(#gavelWood)"
                stroke="#111"
                strokeWidth="0.8"
              />
              {/* Head */}
              <rect
                x="-18"
                y="-9"
                width="36"
                height="15"
                rx="3"
                fill="url(#gavelHead)"
                stroke="#111"
                strokeWidth="1"
              />
              {/* Red Accent Rings */}
              <rect x="-14" y="-9" width="3" height="15" fill="#dc2626" />
              <rect x="11" y="-9" width="3" height="15" fill="#dc2626" />
            </g>

            <defs>
              <linearGradient id="gavelWood" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#451a03" />
                <stop offset="50%" stopColor="#78350f" />
                <stop offset="100%" stopColor="#291102" />
              </linearGradient>
              <linearGradient id="gavelHead" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f9fafb" />
                <stop offset="35%" stopColor="#e5e7eb" />
                <stop offset="70%" stopColor="#4b5563" />
                <stop offset="100%" stopColor="#111827" />
              </linearGradient>
            </defs>
          </svg>
        )}
      </div>

      {/* ── 4. Main Title: CERTIFICATE (Orbitron font, spaced below emblem with clean gap) ── */}
      <div
        style={{
          position: 'absolute',
          top: '190px',
          left: 0,
          width: '100%',
          textAlign: 'center',
          zIndex: 10,
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            fontSize: '44px',
            fontWeight: 900,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: '#111111',
            fontFamily: "'Orbitron', 'Space Grotesk', sans-serif",
            lineHeight: 1,
          }}
        >
          CERTIFICATE
        </div>
      </div>

      {/* ── 5. Title Suffix: OF PARTICIPATION / OF ACHIEVEMENT (Rajdhani font + flourish) ── */}
      <div
        style={{
          position: 'absolute',
          top: '246px',
          left: 0,
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          zIndex: 10,
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            fontSize: '15px',
            fontWeight: 700,
            letterSpacing: '0.42em',
            textTransform: 'uppercase',
            color: '#1f2937',
            fontFamily: "'Rajdhani', 'Montserrat', 'Inter', sans-serif",
          }}
        >
          {displayTitle}
        </div>
        {/* Sleek red horizontal flourish */}
        <div
          style={{
            marginTop: '8px',
            width: '140px',
            height: '2px',
            background:
              'linear-gradient(90deg, transparent 0%, #dc2626 50%, transparent 100%)',
          }}
        />
      </div>

      {/* ── 6. Presentation Line ── */}
      <div
        style={{
          position: 'absolute',
          top: '294px',
          left: 0,
          width: '100%',
          textAlign: 'center',
          zIndex: 10,
          pointerEvents: 'none',
          fontSize: '10.5px',
          fontWeight: 600,
          letterSpacing: '0.22em',
          textTransform: 'uppercase',
          color: '#6b7280',
          fontFamily: "'Inter', sans-serif",
        }}
      >
        {presentationLine}
      </div>

      {/* ── 7. Recipient Name: Barlow Condensed 800 with 4-Stop Red Gradient Last Name (SVG Rendered) ── */}
      <div
        style={{
          position: 'absolute',
          top: '318px',
          left: 0,
          width: '100%',
          textAlign: 'center',
          zIndex: 10,
          pointerEvents: 'none',
        }}
      >
        <svg
          width="1000"
          height={nameFontSize * 1.35}
          viewBox={`0 0 1000 ${nameFontSize * 1.35}`}
          style={{
            overflow: 'visible',
            display: 'block',
            margin: '0 auto',
          }}
        >
          <defs>
            <linearGradient
              id={`nameGrad-${certificateId || 'preview'}`}
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              {/* Vibrant ruby-red at top */}
              <stop offset="0%" stopColor="#ff2830" />
              {/* Rich crimson-red upper mid */}
              <stop offset="28%" stopColor="#dc161f" />
              {/* Deep wine-red lower mid */}
              <stop offset="68%" stopColor="#820409" />
              {/* Near-black dark maroon at base */}
              <stop offset="100%" stopColor="#300002" />
            </linearGradient>
          </defs>
          <text
            x="500"
            y={nameFontSize * 0.95}
            textAnchor="middle"
            fontFamily="'Barlow Condensed', 'Bebas Neue', 'Oswald', sans-serif"
            fontWeight="800"
            letterSpacing="0.04em"
            fontSize={`${nameFontSize}px`}
            style={{ textTransform: 'uppercase' }}
          >
            {firstNames && (
              <tspan fill="#111111">
                {firstNames}{' '}
              </tspan>
            )}
            <tspan fill={`url(#nameGrad-${certificateId || 'preview'})`}>
              {lastName}
            </tspan>
          </text>
        </svg>
      </div>


      {/* ── 8. Subtitle / Achievement Body Text (Centered mathematically, no negative transforms) ── */}
      <div
        style={{
          position: 'absolute',
          top: '394px',
          left: '120px',
          width: '760px',
          textAlign: 'center',
          zIndex: 10,
          pointerEvents: 'none',
          lineHeight: 1.5,
        }}
      >
        <span
          style={{
            fontSize: '13.5px',
            fontWeight: 400,
            color: '#374151',
            fontFamily: "'Inter', sans-serif",
          }}
        >
          {displaySubtitle}
        </span>
      </div>

      {/* ── 9. Team Name (DYNAMIC — highlighted in bold crimson red like the sample) ── */}
      {showTeamLine && teamName && (
        <div
          style={{
            position: 'absolute',
            top: '422px',
            left: 0,
            width: '100%',
            textAlign: 'center',
            zIndex: 10,
            pointerEvents: 'none',
          }}
        >
          <span
            style={{
              fontSize: '16.5px',
              fontWeight: 800,
              color: '#dc2626',
              fontFamily: "'Inter', sans-serif",
            }}
          >
            {teamName.endsWith('.') ? teamName : `${teamName}.`}
          </span>
        </div>
      )}

      {/* ── 10. Verification Card (Mathematically centered at left: 325px, width: 350px) ── */}
      <div
        style={{
          position: 'absolute',
          top: '484px',
          left: '325px',
          width: '350px',
          height: '98px',
          borderRadius: '12px',
          border: '1.5px solid #d1d5db',
          backgroundColor: '#ffffff',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
          display: 'flex',
          alignItems: 'center',
          padding: '10px 14px',
          gap: '14px',
          zIndex: 20,
          pointerEvents: 'none',
          boxSizing: 'border-box',
        }}
      >
        {/* QR Code */}
        <div
          style={{
            width: '78px',
            height: '78px',
            flexShrink: 0,
            borderRadius: '6px',
            overflow: 'hidden',
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

        {/* Record Details */}
        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          {/* Badge */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              marginBottom: '4px',
            }}
          >
            <div
              style={{
                width: '13px',
                height: '13px',
                borderRadius: '50%',
                backgroundColor: '#dc2626',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <span
                style={{
                  color: '#ffffff',
                  fontSize: '9px',
                  fontWeight: 900,
                  lineHeight: 1,
                }}
              >
                ✓
              </span>
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
              fontSize: '14.5px',
              fontWeight: 900,
              color: '#111111',
              fontFamily: "'Inter', sans-serif",
              letterSpacing: '0.03em',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {certificateId || 'GCL26-PART-XXXXXX'}
          </div>

          {/* Verify URL */}
          <div
            style={{
              fontSize: '9.5px',
              fontWeight: 500,
              color: '#4b5563',
              marginTop: '2px',
              fontFamily: "'Inter', sans-serif",
            }}
          >
            verify at: {verifyDomain}
          </div>

          {/* Issue Date */}
          <div
            style={{
              fontSize: '9.5px',
              fontWeight: 500,
              color: '#4b5563',
              marginTop: '1px',
              fontFamily: "'Inter', sans-serif",
            }}
          >
            Issued: {formattedDate}
          </div>
        </div>
      </div>

      {/* ── 11. Bottom-Left Signatory: Faculty Coordinator (GenCode League) ── */}
      <div
        style={{
          position: 'absolute',
          bottom: '48px',
          left: '68px',
          width: '180px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          zIndex: 10,
          pointerEvents: 'none',
        }}
      >
        {/* Signature graphic (Custom or Default SVG) */}
        <div
          style={{
            height: '44px',
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {signatoryLeft.signature_url ? (
            <img
              src={signatoryLeft.signature_url}
              alt="Faculty Signature"
              style={{
                height: '42px',
                maxWidth: '160px',
                objectFit: 'contain',
              }}
            />
          ) : (
            <svg width="150" height="42" viewBox="0 0 150 42" fill="none">
              <path
                d="M12 28 C18 10 32 4 40 18 C46 29 36 34 26 26 C16 18 30 12 50 14 C70 16 85 24 95 18 C105 12 115 8 135 14"
                stroke="#111111"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
              <path
                d="M42 16 L65 32"
                stroke="#111111"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          )}
        </div>

        {/* Signature Line */}
        <div
          style={{
            width: '100%',
            height: '1.5px',
            backgroundColor: '#111111',
            margin: '4px 0 6px 0',
          }}
        />

        {/* Optional Person Name */}
        {signatoryLeft.name && (
          <div
            style={{
              fontSize: '11px',
              fontWeight: 600,
              color: '#111111',
              fontFamily: "'Inter', sans-serif",
            }}
          >
            {signatoryLeft.name}
          </div>
        )}

        {/* Organization */}
        <div
          style={{
            fontSize: '13px',
            fontWeight: 700,
            color: '#111111',
            fontFamily: "'Inter', sans-serif",
            lineHeight: 1.2,
          }}
        >
          {signatoryLeft.org || 'GenCode League'}
        </div>

        {/* Role */}
        <div
          style={{
            fontSize: '9.5px',
            fontWeight: 600,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: '#6b7280',
            fontFamily: "'Inter', sans-serif",
            marginTop: '2px',
          }}
        >
          {signatoryLeft.role || 'FACULTY COORDINATOR'}
        </div>
      </div>

      {/* ── 12. Bottom-Right Signatory: Convenor (Department of CSE) ── */}
      <div
        style={{
          position: 'absolute',
          bottom: '48px',
          right: '68px',
          width: '180px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          zIndex: 10,
          pointerEvents: 'none',
        }}
      >
        {/* Signature graphic (Custom or Default SVG) */}
        <div
          style={{
            height: '44px',
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {signatoryRight.signature_url ? (
            <img
              src={signatoryRight.signature_url}
              alt="Convenor Signature"
              style={{
                height: '42px',
                maxWidth: '160px',
                objectFit: 'contain',
              }}
            />
          ) : (
            <svg width="150" height="42" viewBox="0 0 150 42" fill="none">
              <path
                d="M15 30 C25 8 42 6 48 20 C54 32 38 34 28 24 C22 18 36 12 60 16 C84 20 100 12 120 16 C128 18 136 24 142 20"
                stroke="#111111"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
              <path
                d="M46 18 C58 26 72 30 84 28"
                stroke="#111111"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          )}
        </div>

        {/* Signature Line */}
        <div
          style={{
            width: '100%',
            height: '1.5px',
            backgroundColor: '#111111',
            margin: '4px 0 6px 0',
          }}
        />

        {/* Optional Person Name */}
        {signatoryRight.name && (
          <div
            style={{
              fontSize: '11px',
              fontWeight: 600,
              color: '#111111',
              fontFamily: "'Inter', sans-serif",
            }}
          >
            {signatoryRight.name}
          </div>
        )}

        {/* Organization */}
        <div
          style={{
            fontSize: '13px',
            fontWeight: 700,
            color: '#111111',
            fontFamily: "'Inter', sans-serif",
            lineHeight: 1.2,
          }}
        >
          {signatoryRight.org || 'Department of CSE'}
        </div>

        {/* Role */}
        <div
          style={{
            fontSize: '9.5px',
            fontWeight: 600,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: '#6b7280',
            fontFamily: "'Inter', sans-serif",
            marginTop: '2px',
          }}
        >
          {signatoryRight.role || 'CONVENOR'}
        </div>
      </div>
    </div>
  );
}
