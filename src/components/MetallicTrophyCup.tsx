import React from 'react';

interface MetallicTrophyCupProps {
  type: 'gold' | 'silver' | 'bronze';
  size?: number;
}

export default function MetallicTrophyCup({ type, size }: MetallicTrophyCupProps) {
  if (type === 'gold') {
    const s = size || 86;
    return (
      <div className="relative flex items-center justify-center mb-1">
        {/* Golden Radial Aura */}
        <div
          style={{
            position: 'absolute',
            width: `${s * 1.3}px`,
            height: `${s * 1.3}px`,
            borderRadius: '50%',
            background:
              'radial-gradient(circle, rgba(245, 158, 11, 0.48) 0%, rgba(245, 158, 11, 0.16) 50%, transparent 75%)',
            filter: 'blur(12px)',
            pointerEvents: 'none',
          }}
        />
        <svg width={s} height={s} viewBox="0 0 64 64" fill="none" style={{ position: 'relative', zIndex: 1 }}>
          <defs>
            <linearGradient id="gold-cup-body" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fffbeb" />
              <stop offset="25%" stopColor="#fbbf24" />
              <stop offset="65%" stopColor="#d97706" />
              <stop offset="100%" stopColor="#92400e" />
            </linearGradient>
            <linearGradient id="gold-rim-highlight" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="50%" stopColor="#fef08a" />
              <stop offset="100%" stopColor="#d97706" />
            </linearGradient>
            <linearGradient id="gold-handle-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="100%" stopColor="#b45309" />
            </linearGradient>
          </defs>
          {/* Left Handle */}
          <path
            d="M19 19C12 19 8 23 8 29C8 36.5 14 40.5 20.5 41.5"
            stroke="url(#gold-handle-grad)"
            strokeWidth="3.6"
            strokeLinecap="round"
          />
          {/* Right Handle */}
          <path
            d="M45 19C52 19 56 23 56 29C56 36.5 50 40.5 43.5 41.5"
            stroke="url(#gold-handle-grad)"
            strokeWidth="3.6"
            strokeLinecap="round"
          />
          {/* Chalice / Cup Body */}
          <path
            d="M18 14H46V31C46 39 39.5 44.5 32 44.5C24.5 44.5 18 39 18 31V14Z"
            fill="url(#gold-cup-body)"
          />
          {/* Top Rim Highlight */}
          <rect x="16" y="11.5" width="32" height="4" rx="2" fill="url(#gold-rim-highlight)" />
          {/* Stem */}
          <path d="M29.5 44.5H34.5V53H29.5V44.5Z" fill="url(#gold-cup-body)" />
          {/* Base */}
          <rect x="22" y="53" width="20" height="5.5" rx="2.2" fill="url(#gold-cup-body)" />
        </svg>
      </div>
    );
  }

  if (type === 'silver') {
    const s = size || 76;
    return (
      <div className="relative flex items-center justify-center mb-1">
        {/* Silver Radial Aura */}
        <div
          style={{
            position: 'absolute',
            width: `${s * 1.3}px`,
            height: `${s * 1.3}px`,
            borderRadius: '50%',
            background:
              'radial-gradient(circle, rgba(226, 232, 240, 0.42) 0%, rgba(203, 213, 225, 0.12) 50%, transparent 75%)',
            filter: 'blur(12px)',
            pointerEvents: 'none',
          }}
        />
        <svg width={s} height={s} viewBox="0 0 64 64" fill="none" style={{ position: 'relative', zIndex: 1 }}>
          <defs>
            <linearGradient id="silver-cup-body" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="30%" stopColor="#e2e8f0" />
              <stop offset="70%" stopColor="#94a3b8" />
              <stop offset="100%" stopColor="#475569" />
            </linearGradient>
            <linearGradient id="silver-rim-highlight" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="50%" stopColor="#f8fafc" />
              <stop offset="100%" stopColor="#94a3b8" />
            </linearGradient>
            <linearGradient id="silver-handle-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="100%" stopColor="#64748b" />
            </linearGradient>
          </defs>
          {/* Left Handle */}
          <path
            d="M19 19C12 19 8 23 8 29C8 36.5 14 40.5 20.5 41.5"
            stroke="url(#silver-handle-grad)"
            strokeWidth="3.6"
            strokeLinecap="round"
          />
          {/* Right Handle */}
          <path
            d="M45 19C52 19 56 23 56 29C56 36.5 50 40.5 43.5 41.5"
            stroke="url(#silver-handle-grad)"
            strokeWidth="3.6"
            strokeLinecap="round"
          />
          {/* Chalice / Cup Body */}
          <path
            d="M18 14H46V31C46 39 39.5 44.5 32 44.5C24.5 44.5 18 39 18 31V14Z"
            fill="url(#silver-cup-body)"
          />
          {/* Top Rim Highlight */}
          <rect x="16" y="11.5" width="32" height="4" rx="2" fill="url(#silver-rim-highlight)" />
          {/* Stem */}
          <path d="M29.5 44.5H34.5V53H29.5V44.5Z" fill="url(#silver-cup-body)" />
          {/* Base */}
          <rect x="22" y="53" width="20" height="5.5" rx="2.2" fill="url(#silver-cup-body)" />
        </svg>
      </div>
    );
  }

  // Bronze
  const s = size || 76;
  return (
    <div className="relative flex items-center justify-center mb-1">
      {/* Bronze Radial Aura */}
      <div
        style={{
          position: 'absolute',
          width: `${s * 1.3}px`,
          height: `${s * 1.3}px`,
          borderRadius: '50%',
          background:
            'radial-gradient(circle, rgba(234, 88, 12, 0.48) 0%, rgba(234, 88, 12, 0.14) 50%, transparent 75%)',
          filter: 'blur(12px)',
          pointerEvents: 'none',
        }}
      />
      <svg width={s} height={s} viewBox="0 0 64 64" fill="none" style={{ position: 'relative', zIndex: 1 }}>
        <defs>
          <linearGradient id="bronze-cup-body" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffedd5" />
            <stop offset="30%" stopColor="#fb923c" />
            <stop offset="70%" stopColor="#c2410c" />
            <stop offset="100%" stopColor="#7c2d12" />
          </linearGradient>
          <linearGradient id="bronze-rim-highlight" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="50%" stopColor="#fed7aa" />
            <stop offset="100%" stopColor="#c2410c" />
          </linearGradient>
          <linearGradient id="bronze-handle-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fed7aa" />
            <stop offset="100%" stopColor="#9a3412" />
          </linearGradient>
        </defs>
        {/* Left Handle */}
        <path
          d="M19 19C12 19 8 23 8 29C8 36.5 14 40.5 20.5 41.5"
          stroke="url(#bronze-handle-grad)"
          strokeWidth="3.6"
          strokeLinecap="round"
        />
        {/* Right Handle */}
        <path
          d="M45 19C52 19 56 23 56 29C56 36.5 50 40.5 43.5 41.5"
          stroke="url(#bronze-handle-grad)"
          strokeWidth="3.6"
          strokeLinecap="round"
        />
        {/* Chalice / Cup Body */}
        <path
          d="M18 14H46V31C46 39 39.5 44.5 32 44.5C24.5 44.5 18 39 18 31V14Z"
          fill="url(#bronze-cup-body)"
        />
        {/* Top Rim Highlight */}
        <rect x="16" y="11.5" width="32" height="4" rx="2" fill="url(#bronze-rim-highlight)" />
        {/* Stem */}
        <path d="M29.5 44.5H34.5V53H29.5V44.5Z" fill="url(#bronze-cup-body)" />
        {/* Base */}
        <rect x="22" y="53" width="20" height="5.5" rx="2.2" fill="url(#bronze-cup-body)" />
      </svg>
    </div>
  );
}
