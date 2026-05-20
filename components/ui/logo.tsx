import { cn } from "@/lib/utils"

type LogoScheme = "light" | "dark"
type LogoVariant = "mark" | "full" | "icon"

type LogoProps = {
  variant?: LogoVariant
  scheme?: LogoScheme
  className?: string
}

const COLORS = {
  light: { hex: "#0F172A", network: "#10B981" },
  dark:  { hex: "#FFFFFF", network: "#10B981" },
}

type Colors = typeof COLORS.light

function HubMark({ c }: { c: Colors }) {
  return (
    <svg viewBox="0 0 100 100" fill="none" aria-hidden="true" className="h-full w-full">
      <polygon
        points="68,50 59,34.41 41,34.41 32,50 41,65.59 59,65.59"
        fill={c.hex}
      />
      <polygon
        points="86,50 68,18.82 32,18.82 14,50 32,81.18 68,81.18"
        stroke={c.network}
        strokeWidth="4"
        strokeLinejoin="round"
        fill="none"
      />
      <circle cx="86"   cy="50"    r="7.5" fill={c.network} />
      <circle cx="68"   cy="18.82" r="7.5" fill={c.network} />
      <circle cx="32"   cy="18.82" r="7.5" fill={c.network} />
      <circle cx="14"   cy="50"    r="7.5" fill={c.network} />
      <circle cx="32"   cy="81.18" r="7.5" fill={c.network} />
      <circle cx="68"   cy="81.18" r="7.5" fill={c.network} />
    </svg>
  )
}

export function Logo({ variant = "full", scheme = "light", className }: LogoProps) {
  const c = COLORS[scheme]
  const textColor = scheme === "dark" ? "text-white" : "text-[#0F172A]"

  if (variant === "mark") {
    return (
      <span role="img" aria-label="AssoHub" className={cn("inline-flex size-10", className)}>
        <HubMark c={c} />
      </span>
    )
  }

  if (variant === "icon") {
    return (
      <span role="img" aria-label="AssoHub" className={cn("inline-flex size-5", className)}>
        <HubMark c={c} />
      </span>
    )
  }

  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span aria-hidden="true" className="inline-flex size-9 shrink-0">
        <HubMark c={c} />
      </span>
      <span className={cn("text-[1.125rem] font-bold tracking-tight leading-none", textColor)}>
        AssoHub
      </span>
    </span>
  )
}
