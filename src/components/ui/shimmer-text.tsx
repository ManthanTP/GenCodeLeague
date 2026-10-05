"use client";

import React from "react";
import { motion } from "motion/react";

interface ShimmerTextProps {
  children: React.ReactNode;
  className?: string;
  duration?: number;
  delay?: number;
  style?: React.CSSProperties;
}

export function ShimmerText({
  children,
  className,
  duration = 2,
  delay = 0.5,
  style,
}: ShimmerTextProps) {
  const shimmerContrast = "rgba(255,255,255,0.65)";

  return (
    <div style={{ overflow: "hidden" }}>
      <motion.div
        className={className}
        style={{
          display: "inline-block",
          color: "#e8e8e8",
          WebkitTextFillColor: "transparent",
          background: `linear-gradient(to right, #e8e8e8 0%, ${shimmerContrast} 40%, ${shimmerContrast} 60%, #e8e8e8 100%)`,
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          backgroundRepeat: "no-repeat",
          backgroundSize: "50% 100%",
          ...style,
        } as React.CSSProperties}
        initial={{
          backgroundPositionX: "250%",
        }}
        animate={{
          backgroundPositionX: ["-100%", "250%"],
        }}
        transition={{
          duration: duration,
          delay: delay,
          repeat: Infinity,
          repeatDelay: 1.5,
          ease: "linear",
        }}
      >
        <span>{children}</span>
      </motion.div>
    </div>
  );
}

export default ShimmerText;
