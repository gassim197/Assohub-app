import {
  BadgeCheck,
  Building2,
  Calendar,
  CalendarCheck,
  CircleAlert,
  FileCheck,
  Funnel,
  Link,
  Send,
  TrendingUp,
  UserCheck,
  UserPlus,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import type { BubbleIcon, BubblePosition } from "./landing-content";

const ICONS: Record<BubbleIcon, LucideIcon> = {
  users: Users,
  calendarCheck: CalendarCheck,
  userPlus: UserPlus,
  wallet: Wallet,
  send: Send,
  badgeCheck: BadgeCheck,
  calendar: Calendar,
  fileCheck: FileCheck,
  userCheck: UserCheck,
  filter: Funnel,
  link: Link,
  trendingUp: TrendingUp,
  alertCircle: CircleAlert,
  building: Building2,
};

/**
 * Débordement sur un coin du visuel. Vertical partout ; horizontal seulement
 * à partir de `lg`, où la colonne a de la marge — sur mobile, déborder à
 * gauche ou à droite créerait un défilement horizontal de la page.
 */
const POSITION_CLASSES: Record<BubblePosition, string> = {
  "top-left": "-top-4 left-3 lg:-left-5",
  "top-right": "-top-4 right-3 lg:-right-5",
  "bottom-left": "-bottom-4 left-3 lg:-left-5",
  "bottom-right": "-bottom-4 right-3 lg:-right-5",
};

/**
 * Bulle de bénéfice flottante posée sur le visuel d'une sous-fonctionnalité
 * (à la manière de la bulle « All changes saved to Drive » de Google Drive).
 * Purement illustrative : le même texte est aussi dans le texte alternatif
 * et la description, d'où `aria-hidden`.
 */
export function FeatureBubble({
  text,
  icon,
  position,
  className,
}: {
  text: string;
  icon: BubbleIcon;
  position: BubblePosition;
  className?: string;
}) {
  const Icon = ICONS[icon];
  return (
    <div
      aria-hidden="true"
      className={cn(
        "absolute z-10 flex max-w-[85%] items-center gap-2 rounded-xl border border-foreground/5 bg-card px-3 py-2 text-sm font-medium text-card-foreground shadow-dropdown sm:px-4 sm:py-2.5",
        POSITION_CLASSES[position],
        className,
      )}
    >
      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-subtle text-primary">
        <Icon className="size-3.5" strokeWidth={2.25} />
      </span>
      {/* Jamais tronquée : sur un écran étroit, la bulle passe sur deux lignes. */}
      <span className="text-pretty">{text}</span>
    </div>
  );
}
