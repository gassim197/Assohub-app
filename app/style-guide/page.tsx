import { Logo } from "@/components/ui/logo"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { PasswordInput } from "@/components/ui/password-input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export const metadata = { title: "Design System — AssoHub" }

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-5">
      <h2 className="border-b border-border pb-2 text-lg font-semibold tracking-tight">
        {title}
      </h2>
      {children}
    </section>
  )
}

function Swatch({
  label,
  cssVar,
  hex,
  textOnSwatch = "text-white",
}: {
  label: string
  cssVar: string
  hex: string
  textOnSwatch?: string
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div
        className={`flex h-14 w-32 items-end rounded-lg p-2 ${textOnSwatch}`}
        style={{ background: `var(${cssVar})` }}
      >
        <span className="text-[10px] font-mono leading-none opacity-80">{hex}</span>
      </div>
      <div className="text-xs font-medium">{label}</div>
      <div className="font-mono text-[10px] text-muted-foreground">{cssVar}</div>
    </div>
  )
}

function RadiusSwatch({ label, className }: { label: string; className: string }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className={`size-12 border-2 border-primary bg-brand-subtle ${className}`} />
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  )
}

export default function StyleGuidePage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card px-8 py-6">
        <div className="flex items-center justify-between">
          <Logo variant="full" />
          <span className="rounded-full bg-brand-subtle px-3 py-1 text-xs font-medium text-brand">
            Design System — Session 2.5
          </span>
        </div>
      </div>

      <div className="mx-auto max-w-5xl space-y-14 px-8 py-12">
        {/* ── LOGO ──────────────────────────────────────────────── */}
        <Section title="Logo">
          <div className="space-y-8">
            {/* Mark sizes */}
            <div>
              <p className="mb-4 text-sm text-muted-foreground">
                Mark — fond clair (16 → 96 px)
              </p>
              <div className="flex flex-wrap items-end gap-8">
                {(
                  [
                    { px: 16, cls: "size-4" },
                    { px: 24, cls: "size-6" },
                    { px: 32, cls: "size-8" },
                    { px: 48, cls: "size-12" },
                    { px: 64, cls: "size-16" },
                    { px: 96, cls: "size-24" },
                  ] as const
                ).map(({ px, cls }) => (
                  <div key={px} className="flex flex-col items-center gap-2">
                    <Logo variant="mark" className={cls} />
                    <span className="font-mono text-[10px] text-muted-foreground">{px}px</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Mark dark */}
            <div>
              <p className="mb-4 text-sm text-muted-foreground">
                Mark — fond sombre (16 → 96 px)
              </p>
              <div className="flex flex-wrap items-end gap-8 rounded-xl bg-sidebar p-6">
                {(
                  [
                    { px: 16, cls: "size-4" },
                    { px: 24, cls: "size-6" },
                    { px: 32, cls: "size-8" },
                    { px: 48, cls: "size-12" },
                    { px: 64, cls: "size-16" },
                    { px: 96, cls: "size-24" },
                  ] as const
                ).map(({ px, cls }) => (
                  <div key={px} className="flex flex-col items-center gap-2">
                    <Logo variant="mark" scheme="dark" className={cls} />
                    <span className="font-mono text-[10px] text-sidebar-foreground/60">{px}px</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Full lockup */}
            <div>
              <p className="mb-4 text-sm text-muted-foreground">Lockup complet</p>
              <div className="flex flex-wrap items-center gap-8">
                <Logo variant="full" className="text-base" />
                <div className="flex items-center gap-2 rounded-xl bg-sidebar px-5 py-3">
                  <Logo variant="full" scheme="dark" />
                </div>
              </div>
            </div>
          </div>
        </Section>

        {/* ── BRAND COLORS ──────────────────────────────────────── */}
        <Section title="Brand Colors">
          <div className="flex flex-wrap gap-6">
            <Swatch label="Navy" cssVar="--sidebar" hex="#0F172A" />
            <Swatch label="Emerald" cssVar="--brand" hex="#10B981" />
            <Swatch
              label="Emerald Subtle"
              cssVar="--brand-subtle"
              hex="emerald-50"
              textOnSwatch="text-brand"
            />
          </div>
        </Section>

        {/* ── COLOR SYSTEM ──────────────────────────────────────── */}
        <Section title="Color System">
          <div className="space-y-6">
            <div>
              <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Semantic
              </p>
              <div className="flex flex-wrap gap-4">
                <Swatch label="Background" cssVar="--background" hex="oklch 1 0 0" textOnSwatch="text-foreground" />
                <Swatch label="Foreground" cssVar="--foreground" hex="oklch .145" />
                <Swatch label="Primary" cssVar="--primary" hex="#10B981" />
                <Swatch label="Secondary" cssVar="--secondary" hex="slate-100" textOnSwatch="text-foreground" />
                <Swatch label="Muted" cssVar="--muted" hex="slate-100" textOnSwatch="text-muted-foreground" />
                <Swatch label="Border" cssVar="--border" hex="slate-200" textOnSwatch="text-foreground" />
                <Swatch label="Ring" cssVar="--ring" hex="#10B981" />
              </div>
            </div>
            <div>
              <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                States
              </p>
              <div className="flex flex-wrap gap-4">
                <Swatch label="Destructive" cssVar="--destructive" hex="red-600" />
                <Swatch label="Success" cssVar="--success" hex="green-600" />
                <Swatch label="Warning" cssVar="--warning" hex="amber-500" textOnSwatch="text-foreground" />
                <Swatch label="Info" cssVar="--info" hex="blue-500" />
              </div>
            </div>
            <div>
              <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Sidebar (navy)
              </p>
              <div className="flex flex-wrap gap-4">
                <Swatch label="Sidebar" cssVar="--sidebar" hex="#0F172A" />
                <Swatch label="Sidebar Accent" cssVar="--sidebar-accent" hex="navy +1" />
                <Swatch label="Sidebar Primary" cssVar="--sidebar-primary" hex="#10B981" />
              </div>
            </div>
            <div>
              <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Chart
              </p>
              <div className="flex flex-wrap gap-4">
                {[1, 2, 3, 4, 5].map((n) => (
                  <Swatch key={n} label={`Chart ${n}`} cssVar={`--chart-${n}`} hex="" />
                ))}
              </div>
            </div>
          </div>
        </Section>

        {/* ── TYPOGRAPHY ────────────────────────────────────────── */}
        <Section title="Typography — Geist Sans">
          <div className="space-y-3">
            {(
              [
                { cls: "text-5xl font-bold", label: "5xl / 700", text: "AssoHub" },
                { cls: "text-4xl font-bold", label: "4xl / 700", text: "Tableau de bord" },
                { cls: "text-3xl font-semibold", label: "3xl / 600", text: "Gestion des membres" },
                { cls: "text-2xl font-semibold", label: "2xl / 600", text: "Bienvenue dans AssoHub" },
                { cls: "text-xl font-medium", label: "xl / 500", text: "Créez votre organisation" },
                { cls: "text-lg font-medium", label: "lg / 500", text: "Inviter un nouveau membre" },
                { cls: "text-base", label: "base / 400", text: "La plateforme de gestion pour les associations africaines." },
                { cls: "text-sm", label: "sm / 400", text: "Gérez vos membres, cotisations et réunions depuis un seul endroit." },
                { cls: "text-xs text-muted-foreground", label: "xs / 400 muted", text: "Dernière connexion il y a 2 heures • Paris, France" },
              ] as const
            ).map(({ cls, label, text }) => (
              <div key={label} className="flex items-baseline gap-4">
                <span className="w-32 shrink-0 font-mono text-[10px] text-muted-foreground">
                  {label}
                </span>
                <span className={cls}>{text}</span>
              </div>
            ))}
          </div>
          <div className="mt-6 rounded-lg bg-muted p-4">
            <p className="mb-2 font-mono text-xs text-muted-foreground">Mono — Geist Mono</p>
            <code className="font-mono text-sm">
              const org = await db.query.organizations.findFirst(&#123; where: eq(slug, &quot;assohub&quot;) &#125;)
            </code>
          </div>
        </Section>

        {/* ── RADIUS ────────────────────────────────────────────── */}
        <Section title="Radius & Shadows">
          <div className="flex flex-wrap items-end gap-8">
            <RadiusSwatch label="radius-sm" className="rounded-sm" />
            <RadiusSwatch label="radius-md" className="rounded-md" />
            <RadiusSwatch label="radius-lg" className="rounded-lg" />
            <RadiusSwatch label="radius-xl" className="rounded-xl" />
            <RadiusSwatch label="radius-2xl" className="rounded-2xl" />
            <RadiusSwatch label="radius-3xl" className="rounded-3xl" />
            <RadiusSwatch label="radius-full" className="rounded-full" />
          </div>
          <div className="mt-6 flex flex-wrap gap-6">
            {(
              [
                { label: "--shadow-sm", style: "var(--shadow-sm)" },
                { label: "--shadow-card", style: "var(--shadow-card)" },
                { label: "--shadow-dropdown", style: "var(--shadow-dropdown)" },
                { label: "--shadow-lg", style: "var(--shadow-lg)" },
              ] as const
            ).map(({ label, style }) => (
              <div key={label} className="flex flex-col gap-2">
                <div
                  className="flex h-16 w-32 items-center justify-center rounded-lg bg-card text-xs text-muted-foreground"
                  style={{ boxShadow: style }}
                >
                  {label.replace("--", "")}
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* ── BUTTONS ───────────────────────────────────────────── */}
        <Section title="Buttons">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <Button>Default (Emerald)</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="destructive">Destructive</Button>
              <Button variant="link">Link</Button>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button size="sm">Small</Button>
              <Button size="default">Default</Button>
              <Button size="lg">Large</Button>
              <Button size="icon" aria-label="Icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 5v14M5 12h14" strokeLinecap="round" />
                </svg>
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button disabled>Disabled</Button>
              <Button variant="outline" disabled>Outline disabled</Button>
            </div>
          </div>
        </Section>

        {/* ── BADGES ────────────────────────────────────────────── */}
        <Section title="Badges">
          <div className="flex flex-wrap items-center gap-3">
            <Badge>Default</Badge>
            <Badge variant="secondary">Secondary</Badge>
            <Badge variant="outline">Outline</Badge>
            <Badge variant="destructive">Destructive</Badge>
            <Badge variant="success">Success</Badge>
            <Badge variant="warning">Warning</Badge>
            <Badge variant="info">Info</Badge>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <span>Exemples métier :</span>
            <Badge variant="success">Cotisation payée</Badge>
            <Badge variant="warning">En attente</Badge>
            <Badge variant="destructive">En retard</Badge>
            <Badge variant="info">Brouillon</Badge>
            <Badge variant="secondary">Démissionné</Badge>
          </div>
        </Section>

        {/* ── FORM CONTROLS ─────────────────────────────────────── */}
        <Section title="Form Controls">
          <div className="grid max-w-xl gap-4">
            <div className="grid gap-1.5">
              <Label>Email</Label>
              <Input type="email" placeholder="contact@assohub.org" />
            </div>
            <div className="grid gap-1.5">
              <Label>Mot de passe</Label>
              <PasswordInput placeholder="••••••••" />
            </div>
            <div className="grid gap-1.5">
              <Label>État : désactivé</Label>
              <Input placeholder="Champ désactivé" disabled />
            </div>
            <div className="grid gap-1.5">
              <Label>État : erreur</Label>
              <Input placeholder="Email invalide" aria-invalid="true" />
              <p className="text-xs text-destructive">Adresse email invalide.</p>
            </div>
          </div>
        </Section>

        {/* ── CARDS ─────────────────────────────────────────────── */}
        <Section title="Cards">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Membres actifs</CardTitle>
                <CardDescription>Organisation Assohub Demo</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">48</div>
                <p className="mt-1 text-sm text-muted-foreground">
                  +3 ce mois-ci
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Cotisations reçues</CardTitle>
                <CardDescription>Période courante</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-primary">240 000 F</div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Sur 300 000 F attendus
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Prochaine réunion</CardTitle>
                <CardDescription>Bureau exécutif</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-base font-semibold">15 juin 2026</div>
                <div className="mt-1 flex items-center gap-2">
                  <Badge variant="info">Planifiée</Badge>
                  <span className="text-sm text-muted-foreground">14h00 — Siège</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </Section>
      </div>
    </div>
  )
}
