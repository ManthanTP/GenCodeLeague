import React from 'react';
import { motion, useReducedMotion } from 'motion/react';

interface ShimmerTextProps {
  children: React.ReactNode;
  className?: string;
  duration?: number;
  delay?: number;
  style?: React.CSSProperties;
}

export function ShimmerText({
  children,
  className = '',
  duration = 1.5,
  delay = 0.5,
  style = {},
}: ShimmerTextProps) {
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) {
    return (
      <div className="group overflow-hidden">
        <div>
          <div className={className} style={{ color: '#ef4444', ...style }}>
            <span>{children}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="group overflow-hidden">
      <div>
        <motion.div
          className={`inline-block ${className}`}
          style={
            {
              WebkitTextFillColor: 'transparent',
              background:
                'currentColor linear-gradient(to right, currentColor 0%, var(--shimmer-contrast, rgba(255,255,255,0.85)) 40%, var(--shimmer-contrast, rgba(255,255,255,0.85)) 60%, currentColor 100%)',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              backgroundRepeat: 'no-repeat',
              backgroundSize: '50% 200%',
              ...style,
            } as React.CSSProperties
          }
          initial={{ backgroundPositionX: '250%' }}
          animate={{ backgroundPositionX: ['-100%', '250%'] }}
          transition={{ duration, delay, repeat: Infinity, repeatDelay: 1.5, ease: 'linear' }}
        >
          <span>{children}</span>
        </motion.div>
      </div>
    </div>
  );
}

export default ShimmerText;
