import { cn } from "@/lib/utils"

type LogoScheme = "light" | "dark"
type LogoVariant = "mark" | "full" | "icon"

type LogoProps = {
  variant?: LogoVariant
  scheme?: LogoScheme
  className?: string
}

const COLORS = {
  light: { nodes: "#0F172A", lines: "#3B82F6", hub: "#3B82F6", hole: "#FFFFFF" },
  dark:  { nodes: "#FFFFFF", lines: "#60A5FA", hub: "#3B82F6", hole: "#0F172A" },
}

type Colors = typeof COLORS.light

function Mark({ c, className }: { c: Colors; className?: string }) {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden="true"
      className={cn("shrink-0", className)}
    >
      <line x1="32" y1="32" x2="32" y2="10" stroke={c.lines} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="32" y1="32" x2="51" y2="21" stroke={c.lines} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="32" y1="32" x2="51" y2="43" stroke={c.lines} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="32" y1="32" x2="32" y2="54" stroke={c.lines} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="32" y1="32" x2="13" y2="43" stroke={c.lines} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="32" y1="32" x2="13" y2="21" stroke={c.lines} strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="32" cy="10" r="4.5" fill={c.nodes} />
      <circle cx="51" cy="21" r="4.5" fill={c.nodes} />
      <circle cx="51" cy="43" r="4.5" fill={c.nodes} />
      <circle cx="32" cy="54" r="4.5" fill={c.nodes} />
      <circle cx="13" cy="43" r="4.5" fill={c.nodes} />
      <circle cx="13" cy="21" r="4.5" fill={c.nodes} />
      <circle cx="32" cy="32" r="9" fill={c.hub} />
      <circle cx="32" cy="32" r="4.5" fill={c.hole} />
    </svg>
  )
}

function Icon({ c, className }: { c: Colors; className?: string }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      className={cn("shrink-0", className)}
    >
      <line x1="16" y1="16" x2="16" y2="5"  stroke={c.lines} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="16" y1="16" x2="26" y2="22" stroke={c.lines} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="16" y1="16" x2="7"  y2="22" stroke={c.lines} strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="16" cy="5"  r="3" fill={c.nodes} />
      <circle cx="26" cy="22" r="3" fill={c.nodes} />
      <circle cx="7"  cy="22" r="3" fill={c.nodes} />
      <circle cx="16" cy="16" r="6" fill={c.hub} />
      <circle cx="16" cy="16" r="3" fill={c.hole} />
    </svg>
  )
}

export function Logo({ variant = "full", scheme = "light", className }: LogoProps) {
  const c = COLORS[scheme]
  const textColor = scheme === "dark" ? "text-white" : "text-[#0F172A]"

  if (variant === "mark") {
    return (
      <span role="img" aria-label="AssoHub" className={cn("inline-flex", className)}>
        <Mark c={c} />
      </span>
    )
  }

  if (variant === "icon") {
    return (
      <span role="img" aria-label="AssoHub" className={cn("inline-flex", className)}>
        <Icon c={c} />
      </span>
    )
  }

  return (
    <span role="img" aria-label="AssoHub" className={cn("inline-flex items-center gap-2.5", className)}>
      <Mark c={c} />
      <span aria-hidden="true" className={cn("text-[1.125rem] font-bold tracking-tight leading-none", textColor)}>
        AssoHub
      </span>
    </span>
  )
}
