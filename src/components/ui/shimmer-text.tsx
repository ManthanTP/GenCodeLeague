"use client";

import React from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

export type Variant =
  | "default"
  | "secondary"
  | "destructive"
  | "red"
  | "blue"
  | "green"
  | "yellow"
  | "purple"
  | "pink"
  | "orange"
  | "cyan"
  | "indigo"
  | "violet"
  | "rose"
  | "amber"
  | "lime"
  | "emerald"
  | "sky"
  | "slate"
  | "fuchsia";

export interface ShimmerTextProps {
  children: React.ReactNode;
  className?: string;
  variant?: Variant;
  duration?: number;
  delay?: number;
  spread?: number;
  style?: React.CSSProperties;
}

const variantGradients: Record<Variant, string> = {
  default: "linear-gradient(90deg, #9ca3af 0%, #d1d5db 25%, #ffffff 50%, #d1d5db 75%, #9ca3af 100%)",
  secondary: "linear-gradient(90deg, #64748b 0%, #94a3b8 25%, #f8fafc 50%, #94a3b8 75%, #64748b 100%)",
  destructive: "linear-gradient(90deg, #ef4444 0%, #f87171 25%, #ffffff 50%, #f87171 75%, #ef4444 100%)",
  red: "linear-gradient(90deg, #dc2626 0%, #f87171 25%, #ffffff 50%, #f87171 75%, #dc2626 100%)",
  blue: "linear-gradient(90deg, #2563eb 0%, #60a5fa 25%, #ffffff 50%, #60a5fa 75%, #2563eb 100%)",
  green: "linear-gradient(90deg, #16a34a 0%, #4ade80 25%, #ffffff 50%, #4ade80 75%, #16a34a 100%)",
  yellow: "linear-gradient(90deg, #ca8a04 0%, #facc15 25%, #ffffff 50%, #facc15 75%, #ca8a04 100%)",
  purple: "linear-gradient(90deg, #9333ea 0%, #c084fc 25%, #ffffff 50%, #c084fc 75%, #9333ea 100%)",
  pink: "linear-gradient(90deg, #db2777 0%, #f472b6 25%, #ffffff 50%, #f472b6 75%, #db2777 100%)",
  orange: "linear-gradient(90deg, #ea580c 0%, #fb923c 25%, #ffffff 50%, #fb923c 75%, #ea580c 100%)",
  cyan: "linear-gradient(90deg, #0891b2 0%, #22d3ee 25%, #ffffff 50%, #22d3ee 75%, #0891b2 100%)",
  indigo: "linear-gradient(90deg, #4f46e5 0%, #818cf8 25%, #ffffff 50%, #818cf8 75%, #4f46e5 100%)",
  violet: "linear-gradient(90deg, #7c3aed 0%, #a78bfa 25%, #ffffff 50%, #a78bfa 75%, #7c3aed 100%)",
  rose: "linear-gradient(90deg, #e11d48 0%, #fb7185 25%, #ffffff 50%, #fb7185 75%, #e11d48 100%)",
  amber: "linear-gradient(90deg, #d97706 0%, #fbbf24 25%, #ffffff 50%, #fbbf24 75%, #d97706 100%)",
  lime: "linear-gradient(90deg, #65a30d 0%, #a3e635 25%, #ffffff 50%, #a3e635 75%, #65a30d 100%)",
  emerald: "linear-gradient(90deg, #059669 0%, #34d399 25%, #ffffff 50%, #34d399 75%, #059669 100%)",
  sky: "linear-gradient(90deg, #0284c7 0%, #38bdf8 25%, #ffffff 50%, #38bdf8 75%, #0284c7 100%)",
  slate: "linear-gradient(90deg, #64748b 0%, #94a3b8 25%, #f8fafc 50%, #94a3b8 75%, #64748b 100%)",
  fuchsia: "linear-gradient(90deg, #c026d3 0%, #e879f9 25%, #ffffff 50%, #e879f9 75%, #c026d3 100%)",
};

export function ShimmerText({
  children,
  className,
  variant = "default",
  duration = 2.5,
  delay = 0,
  style,
}: ShimmerTextProps) {
  const gradient = variantGradients[variant] || variantGradients.default;

  return (
    <span
      className={cn("inline-flex items-center justify-center max-w-full", className)}
      style={{
        display: "inline-flex",
        position: "relative",
        verticalAlign: "middle",
        ...style,
      }}
    >
      <style>{`
        @keyframes gcl-shimmer-sweep {
          0% {
            background-position: 200% 0;
          }
          100% {
            background-position: -200% 0;
          }
        }
      `}</style>
      <motion.span
        style={{
          display: "inline-block",
          backgroundImage: gradient,
          backgroundSize: "250% 100%",
          backgroundRepeat: "repeat",
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          WebkitTextFillColor: "transparent",
          color: "transparent",
          animation: `gcl-shimmer-sweep ${duration}s linear infinite`,
          animationDelay: `${delay}s`,
        }}
        initial={{ backgroundPosition: "200% 0" }}
        animate={{ backgroundPosition: ["200% 0", "-200% 0"] }}
        transition={{
          duration,
          delay,
          repeat: Infinity,
          ease: "linear",
        }}
      >
        {children}
      </motion.span>
    </span>
  );
}

export default ShimmerText;
