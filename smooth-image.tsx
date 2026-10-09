"use client"

// Photo with a loading shimmer and a fade-in. Use it for every photo on the
// landing and gallery pages (hero photo, champions, people, gallery tiles) so a
// slow photo never shows an empty box or a hard pop-in.
//
//  - while loading: a dark skeleton with a slow light sweep
//  - when loaded: the photo fades in over 500ms
//  - no src, or the photo fails: `fallback` is shown (or the skeleton stays calm)
import * as React from "react"
import { motion, useReducedMotion } from "framer-motion"

import { cn } from "@/lib/utils"

/** The loading skeleton. Fills its nearest positioned parent. */
export function Shimmer({ className }: { className?: string }) {
  const reduced = useReducedMotion()
  return (
    <span
      aria-hidden
      className={cn("pointer-events-none absolute inset-0 overflow-hidden bg-white/[0.06]", className)}
    >
      {reduced ? null : (
        <motion.span
          className="absolute inset-y-0 left-0 w-1/3"
          style={{
            background:
              "linear-gradient(100deg, transparent, rgba(255,255,255,0.13), transparent)",
          }}
          initial={{ x: "-100%" }}
          animate={{ x: "300%" }}
          transition={{ duration: 1.5, ease: "easeInOut", repeat: Infinity }}
        />
      )}
    </span>
  )
}

export interface SmoothImageProps
  extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, "src" | "onLoad" | "onError"> {
  src?: string | null
  /** Shown when there is no src or the photo fails to load. */
  fallback?: React.ReactNode
  /** Classes for the wrapper (size, radius). The wrapper clips and positions. */
  wrapperClassName?: string
}

export function SmoothImage({
  src,
  alt = "",
  className,
  wrapperClassName,
  fallback,
  ...rest
}: SmoothImageProps) {
  const [state, setState] = React.useState<"loading" | "loaded" | "error">(
    src ? "loading" : "error"
  )
  const imgRef = React.useRef<HTMLImageElement>(null)

  // A new src (for example after the admin replaces the photo) starts loading again.
  React.useEffect(() => {
    setState(src ? "loading" : "error")
    const el = imgRef.current
    if (src && el && el.complete && el.naturalWidth > 0) setState("loaded")
  }, [src])

  return (
    <div className={cn("relative h-full w-full overflow-hidden", wrapperClassName)}>
      {state === "loading" ? <Shimmer /> : null}
      {src && state !== "error" ? (
        <img
          ref={imgRef}
          src={src}
          alt={alt}
          onLoad={() => setState("loaded")}
          onError={() => setState("error")}
          className={cn(
            "h-full w-full object-cover transition-opacity duration-500",
            state === "loaded" ? "opacity-100" : "opacity-0",
            className
          )}
          {...rest}
        />
      ) : null}
      {state === "error" ? fallback : null}
    </div>
  )
}
