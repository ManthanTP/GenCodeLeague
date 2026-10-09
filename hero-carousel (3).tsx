"use client"

// GCL gallery hero: a full-bleed editorial filmstrip.
//
// Every card shares one top edge. The focused card unfurls to full height while
// its neighbours stay clipped to half. Changing the focus crossfades the whole
// backdrop to that photo, in its natural colours.
//
// Photo handling:
//  - Every photo shows a loading shimmer until it has loaded, then fades in.
//  - The backdrop only switches once the next photo is loaded AND decoded. The
//    previous photo stays fully opaque underneath while the new one fades in on
//    top, so there is never a black dip or a hard pop between photos.
//  - A missing or broken photo falls back to an inline placeholder.
//
// Text per photo: `title` (headline), `credit` (byline) and `meta` (description
// facts, right aligned). Anything left empty is simply not shown.
//
// The backdrop uses NO mix-blend-mode and NO colour tint, so it renders the same
// on every GPU, browser zoom level and compositor.
import * as React from "react"
import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
} from "framer-motion"

import { cn } from "@/lib/utils"
import { Shimmer } from "@/components/ui/smooth-image"

export interface HeroCarouselItem {
  /** Stable key; falls back to the index. */
  id?: string | number
  /** Photo headline, e.g. "Podium Reveal". Newlines become separate lines. Empty or a file name = no headline. */
  title?: string
  /** Image URL, used both in the card and as the backdrop. */
  image: string
  /** Byline, already formatted, e.g. "BY GCL MEDIA TEAM." Empty = not shown. */
  credit?: string
  /** Description facts, right aligned, e.g. ["GCL 2025", "FINAL", "PODIUM"]. Empty = not shown. */
  meta?: string[]
  /** Only used for the placeholder shown when a photo is missing or broken. @default "#e8743b" */
  accent?: string
}

export interface HeroCarouselProps {
  items: HeroCarouselItem[]
  /** Focused slide when controlled. */
  index?: number
  /** Focused slide on mount when uncontrolled. @default 0 */
  defaultIndex?: number
  /** Fires on every focus change, from any input. */
  onIndexChange?: (index: number) => void
  brand?: React.ReactNode
  onBack?: () => void
  onMenu?: () => void
  /** Advance on a timer. Pauses on hover, drag and focus. @default false */
  autoplay?: boolean
  /** Milliseconds between autoplay steps. @default 4500 */
  autoplayDelay?: number
  className?: string
}

/* Ratios relative to the stage box. */
const CARD_H = 0.34 // active card height / stage height
const CARD_MIN = 150
const CARD_MAX = 480
const CARD_AR = 0.75 // active card is 3:4
const GAP = 0.038 // gap / card width
const STRIP_TOP = 0.5 // strip's shared top edge, down the stage
const PAD = 0.017 // page gutter / stage width
const LABEL = 12 // mono label size in px

const WHEEL_THRESHOLD = 60
const WHEEL_COOLDOWN = 420
const FADE_MS = 700

const DEFAULT_ACCENT = "#e8743b"
const HEAD_FONT = 'var(--font-hd, "Barlow Semi Condensed"), system-ui, sans-serif'
const MONO_FONT = "ui-monospace, SFMono-Regular, Menlo, monospace"

/* Subtle film grain as a tiny tiled SVG. Plain alpha, no blend mode. */
const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.82' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.9 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")"

const clamp = (n: number, min: number, max: number) =>
  Math.min(max, Math.max(min, n))

/** Inline placeholder so a missing or broken photo never leaves an empty frame. */
const placeholder = (accent: string) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 300 400'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='${accent}'/><stop offset='1' stop-color='#110b0d'/></linearGradient></defs><rect width='300' height='400' fill='url(#g)'/></svg>`
  )}`

/** True for empty titles and raw file names such as "IMG 20251127 164448681". */
const looksLikeFileName = (t: string) => {
  const s = t.trim()
  return (
    !s ||
    /\.(jpe?g|png|webp|avif|gif|heic)$/i.test(s) ||
    /^(IMG|DSC|PXL|DCIM|WA|SCREENSHOT)[\s_-]?\d/i.test(s) ||
    /\d{8,}/.test(s)
  )
}

export function HeroCarousel({
  items,
  index: controlled,
  defaultIndex = 0,
  onIndexChange,
  brand,
  onBack,
  onMenu,
  autoplay = false,
  autoplayDelay = 4500,
  className,
}: HeroCarouselProps) {
  const stageRef = React.useRef<HTMLDivElement>(null)
  const [box, setBox] = React.useState({ w: 0, h: 0 })
  const [uncontrolled, setUncontrolled] = React.useState(defaultIndex)
  const [dragging, setDragging] = React.useState(false)
  const [paused, setPaused] = React.useState(false)
  const [failed, setFailed] = React.useState<Record<number, true>>({})
  const [loaded, setLoaded] = React.useState<Record<string, true>>({})
  const reduced = useReducedMotion()

  const last = items.length - 1
  const index = clamp(controlled ?? uncontrolled, 0, Math.max(0, last))

  // Backdrop layers: [shown] or [shown, incoming]. The incoming layer stays at
  // opacity 0 until ITS OWN <img> has loaded and decoded, then fades in on top
  // while the shown layer stays fully opaque beneath it. That is what prevents
  // the black flash. When the fade is done the old layer is dropped.
  type Layer = { k: number; i: number; ready: boolean }
  const [layers, setLayers] = React.useState<Layer[]>([{ k: 0, i: index, ready: true }])
  const layerKey = React.useRef(1)
  const top = layers[layers.length - 1]!
  // The photo the text and autoplay follow: the incoming one once it is ready.
  const shown = clamp(top.ready ? top.i : layers[0]!.i, 0, Math.max(0, last))

  const go = React.useCallback(
    (next: number) => {
      const clamped = clamp(next, 0, Math.max(0, last))
      if (controlled === undefined) setUncontrolled(clamped)
      if (clamped !== index) onIndexChange?.(clamped)
    },
    [controlled, index, last, onIndexChange]
  )

  const srcFor = React.useCallback(
    (i: number) => {
      const it = items[i]
      if (!it) return ""
      return failed[i] || !it.image ? placeholder(it.accent ?? DEFAULT_ACCENT) : it.image
    },
    [items, failed]
  )
  const markFailed = React.useCallback(
    (i: number) => setFailed((f) => (f[i] ? f : { ...f, [i]: true })),
    []
  )
  const markLoaded = React.useCallback(
    (src: string) => setLoaded((l) => (l[src] ? l : { ...l, [src]: true })),
    []
  )

  // A new focus adds an incoming layer (hidden until its photo is ready).
  React.useEffect(() => {
    setLayers((prev) => {
      const newest = prev[prev.length - 1]!
      if (newest.i === index) return prev
      // Back to the photo already shown: cancel the pending one.
      if (prev.length === 2 && prev[0]!.i === index) return [prev[0]!]
      // If the pending layer was already fading in, let it become the base.
      const base = prev.length === 2 && prev[1]!.ready ? prev[1]! : prev[0]!
      return [base, { k: layerKey.current++, i: index, ready: false }]
    })
  }, [index])

  const layerReady = React.useCallback(
    (k: number) =>
      setLayers((prev) =>
        prev.some((l) => l.k === k && !l.ready)
          ? prev.map((l) => (l.k === k ? { ...l, ready: true } : l))
          : prev
      ),
    []
  )

  // Once the incoming layer has finished fading in, drop the layer beneath it.
  React.useEffect(() => {
    if (layers.length < 2 || !layers[layers.length - 1]!.ready) return
    const t = window.setTimeout(
      () => setLayers((prev) => (prev.length > 1 && prev[prev.length - 1]!.ready ? prev.slice(-1) : prev)),
      reduced ? 0 : FADE_MS + 150
    )
    return () => window.clearTimeout(t)
  }, [layers, reduced])

  // Warm the cache for the neighbours so most switches are instant.
  React.useEffect(() => {
    for (const j of [index - 1, index + 1]) {
      const it = items[j]
      if (it?.image) {
        const img = new Image()
        img.src = it.image
      }
    }
  }, [index, items])

  // One observer feeds every measurement below.
  React.useEffect(() => {
    const stage = stageRef.current
    if (!stage) return
    const read = () => setBox({ w: stage.clientWidth, h: stage.clientHeight })
    read()
    const ro = new ResizeObserver(read)
    ro.observe(stage)
    return () => ro.disconnect()
  }, [])

  const fullH = clamp(box.h * CARD_H, CARD_MIN, CARD_MAX)
  const halfH = fullH / 2
  const cardW = fullH * CARD_AR
  const gap = Math.max(4, Math.round(cardW * GAP))
  const step = cardW + gap
  const pad = Math.max(16, Math.round(box.w * PAD))

  // Centre the focused card: the track slides, the card never moves itself.
  const xFor = React.useCallback(
    (i: number) => box.w / 2 - (i * step + cardW / 2),
    [box.w, step, cardW]
  )
  const x = useMotionValue(0)
  const target = xFor(index)

  const swing = reduced
    ? { duration: 0 }
    : { duration: FADE_MS / 1000, ease: "easeOut" as const }
  const spring = reduced
    ? { duration: 0 }
    : { type: "spring" as const, stiffness: 260, damping: 34, mass: 0.9 }

  // Driven by a motion value so a drag that starts mid-spring reads the real
  // position, not where the spring was headed.
  React.useEffect(() => {
    if (dragging) return
    const run = animate(x, target, spring)
    return () => run.stop()
  }, [target, dragging, reduced, x]) // eslint-disable-line react-hooks/exhaustive-deps

  // Wheel and trackpad. Both axes step the strip.
  React.useEffect(() => {
    const stage = stageRef.current
    if (!stage) return
    let acc = 0
    let until = 0

    const onWheel = (e: WheelEvent) => {
      const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY
      // Once the strip is against an end, hand the gesture back to the page.
      const stuck = (delta > 0 && index === last) || (delta < 0 && index === 0)
      if (stuck) {
        acc = 0
        return
      }
      e.preventDefault()
      const now = e.timeStamp
      if (now < until) return
      acc += delta
      if (Math.abs(acc) < WHEEL_THRESHOLD) return
      go(index + Math.sign(acc))
      acc = 0
      until = now + WHEEL_COOLDOWN
    }

    stage.addEventListener("wheel", onWheel, { passive: false })
    return () => stage.removeEventListener("wheel", onWheel)
  }, [go, index, last])

  // Autoplay waits for the current photo to be on screen before it counts down.
  React.useEffect(() => {
    if (!autoplay || reduced || paused || dragging || items.length < 2) return
    if (shown !== index) return
    const id = window.setTimeout(
      () => go(index === last ? 0 : index + 1),
      autoplayDelay
    )
    return () => window.clearTimeout(id)
  }, [autoplay, autoplayDelay, dragging, go, index, items.length, last, paused, reduced, shown])

  const active = items[shown]
  if (!active) return null

  const title = looksLikeFileName(active.title ?? "") ? "" : (active.title ?? "")
  const lines = title ? title.split("\n") : []
  const facts = (active.meta ?? []).filter(Boolean)
  const activeSrc = srcFor(shown)
  const stageLoading = !loaded[activeSrc]
  const labelStyle: React.CSSProperties = {
    fontFamily: MONO_FONT,
    fontSize: LABEL,
    letterSpacing: ".14em",
    textTransform: "uppercase",
  }

  return (
    <div
      ref={stageRef}
      tabIndex={0}
      role="group"
      aria-roledescription="carousel"
      aria-label="Gallery carousel"
      onKeyDown={(e) => {
        const keys: Record<string, number> = {
          ArrowLeft: index - 1,
          ArrowRight: index + 1,
          Home: 0,
          End: last,
        }
        if (!(e.key in keys)) return
        e.preventDefault()
        go(keys[e.key]!)
      }}
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className={cn(
        "relative h-full min-h-[24rem] w-full overflow-hidden bg-black text-white select-none",
        "outline-none focus-visible:ring-1 focus-visible:ring-white/40 focus-visible:ring-inset",
        className
      )}
      style={{ touchAction: "pan-y" }}
    >
      {/* Backdrop: the focused photo in its natural colours, darkened for legibility. */}
      {layers.map((layer) => {
        const src = srcFor(layer.i)
        // Mark the layer ready once its own <img> is loaded and decoded.
        const settle = (el: HTMLImageElement) => {
          markLoaded(src)
          if (typeof el.decode === "function") el.decode().then(() => layerReady(layer.k), () => layerReady(layer.k))
          else layerReady(layer.k)
        }
        return (
          <motion.div
            key={layer.k}
            className="absolute inset-0"
            initial={layer.k === 0 ? false : { opacity: 0 }}
            animate={{ opacity: layer.ready ? 1 : 0 }}
            transition={swing}
          >
            <motion.img
              ref={(el: HTMLImageElement | null) => {
                if (el && el.complete && el.naturalWidth > 0 && (!layer.ready || !loaded[src])) settle(el)
              }}
              src={src}
              alt=""
              aria-hidden
              draggable={false}
              onLoad={(e) => settle(e.currentTarget)}
              onError={() => markFailed(layer.i)}
              className="absolute inset-0 h-full w-full object-cover transition-opacity duration-500"
              style={{
                filter: "brightness(0.58) saturate(1.05)",
                opacity: loaded[src] ? 1 : 0,
              }}
              initial={{ scale: reduced ? 1.2 : 1.32 }}
              animate={{ scale: 1.2 }}
              transition={reduced ? { duration: 0 } : { duration: 6, ease: "linear" }}
            />
          </motion.div>
        )
      })}

      {/* Loading shimmer over the backdrop until the active photo is in. */}
      {stageLoading ? <Shimmer /> : null}

      {/* Legibility wash and a light grain, above the swap so they never flicker. */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/40 via-black/10 to-black/55" />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ backgroundImage: GRAIN, backgroundSize: "180px 180px", opacity: 0.07 }}
      />

      {/* Optional top bar */}
      {onBack || brand || onMenu ? (
        <div
          className="absolute inset-x-0 flex items-center justify-center"
          style={{ top: Math.max(16, box.h * 0.029), gap: `${Math.max(20, box.w * 0.06)}px` }}
        >
          {onBack ? (
            <button type="button" onClick={onBack} className="opacity-90 hover:opacity-100" style={{ ...labelStyle, fontSize: 14 }}>
              <span aria-hidden>↖</span> Back
            </button>
          ) : null}
          {brand ? <div className="font-semibold tracking-[0.06em]">{brand}</div> : null}
          {onMenu ? (
            <button type="button" onClick={onMenu} className="opacity-90 hover:opacity-100" style={{ ...labelStyle, fontSize: 14 }}>
              Menu <span aria-hidden>☰</span>
            </button>
          ) : null}
        </div>
      ) : null}

      {/* Headline block (title, byline, description), above the strip's top edge */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 flex flex-col justify-end"
        style={{
          height: `${STRIP_TOP * 100}%`,
          paddingLeft: pad,
          paddingRight: pad,
          paddingBottom: 28,
        }}
      >
        <div className="flex w-full flex-wrap items-end gap-x-[5vw] gap-y-2">
          {lines.length ? (
            <motion.h2
              key={shown}
              style={{
                fontFamily: HEAD_FONT,
                fontWeight: 700,
                textTransform: "uppercase",
                lineHeight: 0.88,
                letterSpacing: "-0.02em",
                fontSize: "clamp(40px, 7.2vw, 118px)",
              }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2 }}
            >
              {lines.map((line, i) => (
                <span key={i} className="block overflow-hidden">
                  <motion.span
                    className="block"
                    initial={{ y: "110%" }}
                    animate={{ y: 0 }}
                    transition={
                      reduced
                        ? { duration: 0 }
                        : { duration: 0.62, delay: i * 0.07, ease: [0.22, 1, 0.36, 1] }
                    }
                  >
                    {line}
                  </motion.span>
                </span>
              ))}
            </motion.h2>
          ) : null}

          {active.credit ? (
            <motion.p
              key={`credit-${shown}`}
              style={labelStyle}
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.85 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              {active.credit}
            </motion.p>
          ) : null}

          {facts.length ? (
            <div className="ml-auto flex items-end" style={{ gap: "clamp(16px, 3vw, 48px)" }}>
              {facts.map((fact, i) => (
                <motion.span
                  key={`${shown}-${fact}`}
                  className="whitespace-nowrap"
                  style={labelStyle}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 0.85, y: 0 }}
                  transition={
                    reduced ? { duration: 0 } : { duration: 0.45, delay: 0.12 + i * 0.06 }
                  }
                >
                  {fact}
                </motion.span>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      {/* The strip: one shared top edge, the focused card twice as tall */}
      <div className="absolute inset-x-0" style={{ top: `${STRIP_TOP * 100}%`, height: fullH }}>
        <motion.div
          className="flex items-start"
          style={{ gap, x, cursor: dragging ? "grabbing" : "grab" }}
          drag="x"
          dragMomentum={false}
          dragElastic={0.08}
          dragConstraints={{ left: xFor(last), right: xFor(0) }}
          onDragStart={() => setDragging(true)}
          onDragEnd={(_, info) => {
            setDragging(false)
            const thrown = x.get() + info.velocity.x * 0.12
            go(Math.round((box.w / 2 - thrown - cardW / 2) / step))
          }}
        >
          {items.map((item, i) => {
            const src = srcFor(i)
            const label = item.title && !looksLikeFileName(item.title) ? item.title : `Photo ${i + 1}`
            return (
              <motion.button
                key={item.id ?? i}
                type="button"
                aria-label={label.replace(/\n/g, " ")}
                aria-current={i === index}
                onClick={() => go(i)}
                className="relative shrink-0 overflow-hidden rounded-none bg-white/5 outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-inset"
                style={{ width: cardW }}
                animate={{ height: i === index ? fullH : halfH }}
                transition={spring}
              >
                {!loaded[src] ? <Shimmer /> : null}
                <img
                  ref={(el) => {
                    if (el && el.complete && el.naturalWidth > 0) markLoaded(src)
                  }}
                  src={src}
                  alt=""
                  draggable={false}
                  onLoad={() => markLoaded(src)}
                  onError={() => markFailed(i)}
                  className="h-full w-full object-cover transition-opacity duration-500"
                  style={{ objectPosition: "50% 26%", opacity: loaded[src] ? 1 : 0 }}
                />
                <motion.span
                  aria-hidden
                  className="absolute inset-0 bg-black"
                  animate={{ opacity: i === index ? 0 : 0.14 }}
                  transition={spring}
                />
              </motion.button>
            )
          })}
        </motion.div>
      </div>

      {/* Position rail */}
      <div
        className="pointer-events-none absolute"
        style={{ left: pad, bottom: 22, width: Math.min(box.w * 0.22, 260) }}
      >
        <div className="flex justify-between tabular-nums opacity-85" style={labelStyle}>
          <span>{String(index + 1).padStart(2, "0")}</span>
          <span>{String(items.length).padStart(2, "0")}</span>
        </div>
        <div className="relative mt-2 h-px w-full bg-white/25">
          <motion.div
            className="absolute inset-y-0 bg-white"
            style={{ width: `${100 / items.length}%` }}
            animate={{ left: `${(index / items.length) * 100}%` }}
            transition={spring}
          />
        </div>
      </div>

      {/* Hint */}
      <div
        aria-hidden
        className="pointer-events-none absolute hidden opacity-70 min-[960px]:block"
        style={{ ...labelStyle, right: pad, bottom: 22 }}
      >
        Drag · scroll · arrow keys
      </div>
    </div>
  )
}
