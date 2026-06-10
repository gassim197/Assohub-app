"use client";

import { useEffect, useMemo, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";

import { createMember } from "@/lib/members/actions";
import { buildCreateMemberSchema } from "@/lib/members/schema";
import {
  DEFAULT_MEMBER_ROLE,
  DEFAULT_MEMBER_STATUS,
  MEMBER_ROLES,
  MEMBER_STATUSES,
  STATUS_I18N_KEY,
  type MemberRole,
  type MemberStatus,
} from "@/lib/members/constants";
import { toast } from "@/components/ui/toaster";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface MemberFormValues {
  fullName: string;
  phoneNumber: string;
  email: string;
  joinedAt: string;
  dateOfBirth: string;
  profession: string;
  notes: string;
  role: MemberRole;
  customRole: string;
  status: MemberStatus;
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function buildDefaults(): MemberFormValues {
  return {
    fullName: "",
    phoneNumber: "",
    email: "",
    joinedAt: todayISO(),
    dateOfBirth: "",
    profession: "",
    notes: "",
    role: DEFAULT_MEMBER_ROLE,
    customRole: "",
    status: DEFAULT_MEMBER_STATUS,
  };
}

/**
 * Modal de création manuelle d'un membre (BLOC 2).
 *
 * Pilotée par l'URL (`?new=true`) : le bouton « Nouveau membre » de la liste
 * pousse ce paramètre, la fermeture le retire. À la création réussie, on retire
 * `?new`, on rafraîchit la liste et on affiche un toast de succès.
 */
export function MemberFormDialog({ orgSlug }: { orgSlug: string }) {
  const t = useTranslations("members");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const open = searchParams.get("new") === "true";

  // Le schéma client porte les messages traduits affichés sous les champs.
  const schema = useMemo(
    () =>
      buildCreateMemberSchema({
        nameMin: t("form.errors.nameMin"),
        phoneInvalid: t("form.errors.phoneInvalid"),
        emailInvalid: t("form.errors.emailInvalid"),
        customRoleRequired: t("form.errors.customRoleRequired"),
        dateInvalid: t("form.errors.dateInvalid"),
      }),
    [t],
  );

  const form = useForm<MemberFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema as any),
    defaultValues: buildDefaults(),
  });

  const role = useWatch({ control: form.control, name: "role" });

  // Repartir d'un formulaire vierge à chaque ouverture.
  useEffect(() => {
    if (open) form.reset(buildDefaults());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function closeDialog() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("new");
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, {
      scroll: false,
    });
  }

  function onSubmit(values: MemberFormValues) {
    startTransition(async () => {
      const result = await createMember(orgSlug, values);

      if (result.ok) {
        toast.success(t("form.success"));
        closeDialog();
        router.refresh();
        return;
      }

      if (result.error === "emailTaken") {
        form.setError("email", { message: t("form.errors.emailTaken") });
      } else if (result.error === "phoneInvalid") {
        form.setError("phoneNumber", {
          message: t("form.errors.phoneInvalid"),
        });
      } else {
        toast.error(t("form.errors.generic"));
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) closeDialog();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("form.title")}</DialogTitle>
          <DialogDescription>{t("form.description")}</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Nom complet — obligatoire */}
            <FormField
              control={form.control}
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("form.fullName")}</FormLabel>
                  <FormControl>
                    <Input autoFocus {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Téléphone — obligatoire, E.164 strict */}
            <FormField
              control={form.control}
              name="phoneNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("form.phone")}</FormLabel>
                  <FormControl>
                    <Input
                      type="tel"
                      placeholder="+224 6 11 55 15 20"
                      {...field}
                    />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">
                    {t("form.phoneHint")}
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Rôle + Statut */}
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("form.role")}</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {MEMBER_ROLES.map((r) => (
                          <SelectItem key={r} value={r}>
                            {t(`roles.${r}`)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("form.status")}</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {MEMBER_STATUSES.map((s) => (
                          <SelectItem key={s} value={s}>
                            {t(`status.${STATUS_I18N_KEY[s]}`)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Rôle personnalisé — révélé seulement si role = 'autre' */}
            {role === "autre" ? (
              <FormField
                control={form.control}
                name="customRole"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("form.customRole")}</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : null}

            {/* Email — optionnel */}
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t("form.email")}{" "}
                    <span className="text-muted-foreground">
                      {t("form.optional")}
                    </span>
                  </FormLabel>
                  <FormControl>
                    <Input type="email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Date d'adhésion + Date de naissance */}
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="joinedAt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("form.joinedAt")}</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="dateOfBirth"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t("form.dateOfBirth")}{" "}
                      <span className="text-muted-foreground">
                        {t("form.optional")}
                      </span>
                    </FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Profession — optionnel */}
            <FormField
              control={form.control}
              name="profession"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t("form.profession")}{" "}
                    <span className="text-muted-foreground">
                      {t("form.optional")}
                    </span>
                  </FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Notes — optionnel */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t("form.notes")}{" "}
                    <span className="text-muted-foreground">
                      {t("form.optional")}
                    </span>
                  </FormLabel>
                  <FormControl>
                    <Textarea rows={3} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={closeDialog}
                disabled={isPending}
              >
                {t("form.cancel")}
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? t("form.submitting") : t("form.submit")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
