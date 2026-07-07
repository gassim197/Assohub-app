"use client";

import { useMemo, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";

import { inviteMember } from "@/lib/invitations/actions";
import { buildInviteMemberSchema } from "@/lib/invitations/schema";
import { INVITATION_ROLES, type InvitationRole } from "@/lib/invitations/constants";
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

interface InviteMemberFormValues {
  email: string;
  fullName: string;
  phoneNumber: string;
  intendedRole: InvitationRole;
  personalMessage: string;
}

function buildDefaults(): InviteMemberFormValues {
  return {
    email: "",
    fullName: "",
    phoneNumber: "",
    intendedRole: "membre",
    personalMessage: "",
  };
}

/**
 * Modal d'invitation nominative (schema-design §4.4, volet 1 de la 4B).
 *
 * Pilotée par l'URL (`?invite=true`), même convention que `MemberFormDialog`
 * (`?new=true`) : pas de nouvelle page, la fermeture retire le paramètre.
 */
export function InviteMemberDialog({ orgSlug }: { orgSlug: string }) {
  const t = useTranslations("invitations");
  // Les libellés de rôle sont partagés avec le CRUD membres (namespace "members").
  const tRoles = useTranslations("members");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const open = searchParams.get("invite") === "true";

  const schema = useMemo(
    () =>
      buildInviteMemberSchema({
        nameMin: t("dialog.errors.nameMin"),
        emailInvalid: t("dialog.errors.emailInvalid"),
        phoneInvalid: t("dialog.errors.phoneInvalid"),
        messageMax: t("dialog.errors.messageMax"),
      }),
    [t],
  );

  const form = useForm<InviteMemberFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema as any),
    defaultValues: buildDefaults(),
  });

  function closeDialog() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("invite");
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, {
      scroll: false,
    });
  }

  function onSubmit(values: InviteMemberFormValues) {
    startTransition(async () => {
      const result = await inviteMember(orgSlug, values);

      if (result.ok) {
        toast.success(t("dialog.success"));
        form.reset(buildDefaults());
        closeDialog();
        router.refresh();
        return;
      }

      if (result.error === "alreadyMember") {
        form.setError("email", { message: t("dialog.errors.alreadyMember") });
      } else if (result.error === "invitationPending") {
        form.setError("email", {
          message: t("dialog.errors.invitationPending"),
        });
      } else if (result.error === "phoneInvalid") {
        form.setError("phoneNumber", {
          message: t("dialog.errors.phoneInvalid"),
        });
      } else {
        toast.error(t("dialog.errors.generic"));
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
          <DialogTitle>{t("dialog.title")}</DialogTitle>
          <DialogDescription>{t("dialog.description")}</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("dialog.email")}</FormLabel>
                  <FormControl>
                    <Input type="email" autoFocus {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("dialog.fullName")}</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phoneNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t("dialog.phone")}{" "}
                    <span className="text-muted-foreground">
                      {t("dialog.optional")}
                    </span>
                  </FormLabel>
                  <FormControl>
                    <Input type="tel" placeholder="+224 6 11 55 15 20" {...field} />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">
                    {t("dialog.phoneHint")}
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="intendedRole"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("dialog.role")}</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {INVITATION_ROLES.map((role) => (
                        <SelectItem key={role} value={role}>
                          {tRoles(`roles.${role}`)}
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
              name="personalMessage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t("dialog.personalMessage")}{" "}
                    <span className="text-muted-foreground">
                      {t("dialog.optional")}
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
                {t("dialog.cancel")}
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? t("dialog.submitting") : t("dialog.submit")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
