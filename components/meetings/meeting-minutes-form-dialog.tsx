"use client";

import { useEffect, useMemo, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";

import { createMinutes, updateMinutes } from "@/lib/meetings/minutes-actions";
import { buildMinutesSchema, type MinutesFormValues } from "@/lib/meetings/minutes-schema";
import type { MinutesRow } from "@/lib/meetings/minutes-queries";
import { toast } from "@/components/ui/toaster";
import { Button } from "@/components/ui/button";
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

/**
 * Valeurs vierges (création, avec pré-remplissage de l'ordre du jour depuis
 * la description de la réunion — décision 6C) ou pré-remplies depuis un PV
 * existant (édition).
 */
function buildDefaults(
  minutes: MinutesRow | undefined,
  meetingDescription: string | null,
): MinutesFormValues {
  if (!minutes) {
    return {
      agenda: meetingDescription ?? "",
      decisionsSummary: "",
      actionsToFollow: "",
      bodyMarkdown: "",
    };
  }

  return {
    agenda: minutes.agenda ?? "",
    decisionsSummary: minutes.decisionsSummary ?? "",
    actionsToFollow: minutes.actionsToFollow ?? "",
    bodyMarkdown: minutes.bodyMarkdown,
  };
}

/**
 * Modale de création (`?newMinutes=true`) ou d'édition (`?editMinutes=true`)
 * du PV d'une réunion — même patron d'URL-driven dialog que
 * `MeetingFormDialog` (session 6A).
 */
export function MeetingMinutesFormDialog({
  orgSlug,
  meetingId,
  meetingDescription,
  minutes,
}: {
  orgSlug: string;
  meetingId: string;
  meetingDescription: string | null;
  minutes?: MinutesRow;
}) {
  const t = useTranslations("meetings.minutes");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const isEdit = Boolean(minutes);
  const param = isEdit ? "editMinutes" : "newMinutes";
  const open = searchParams.get(param) === "true";

  const schema = useMemo(
    () => buildMinutesSchema({ bodyMarkdownMin: t("form.errors.bodyMarkdownMin") }),
    [t],
  );

  const form = useForm<MinutesFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema as any),
    defaultValues: buildDefaults(minutes, meetingDescription),
  });

  useEffect(() => {
    if (open) form.reset(buildDefaults(minutes, meetingDescription));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function closeDialog() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete(param);
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, {
      scroll: false,
    });
  }

  function onSubmit(values: MinutesFormValues) {
    startTransition(async () => {
      const result =
        minutes !== undefined
          ? await updateMinutes(orgSlug, minutes.id, values)
          : await createMinutes(orgSlug, meetingId, values);

      if (result.ok) {
        toast.success(isEdit ? t("form.successEdit") : t("form.successCreate"));
        closeDialog();
        router.refresh();
        return;
      }

      toast.error(
        result.error === "conflict" ? t("form.errorConflict") : t("form.errorGeneric"),
      );
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) closeDialog();
      }}
    >
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? t("form.editTitle") : t("form.createTitle")}</DialogTitle>
          <DialogDescription>
            {isEdit ? t("form.editDescription") : t("form.createDescription")}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="agenda"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t("fields.agenda")}{" "}
                    <span className="text-muted-foreground">{t("optional")}</span>
                  </FormLabel>
                  <FormControl>
                    <Textarea rows={3} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="decisionsSummary"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t("fields.decisionsSummary")}{" "}
                    <span className="text-muted-foreground">{t("optional")}</span>
                  </FormLabel>
                  <FormControl>
                    <Textarea rows={3} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="actionsToFollow"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t("fields.actionsToFollow")}{" "}
                    <span className="text-muted-foreground">{t("optional")}</span>
                  </FormLabel>
                  <FormControl>
                    <Textarea rows={3} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="bodyMarkdown"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("fields.bodyMarkdown")}</FormLabel>
                  <FormControl>
                    <Textarea rows={8} {...field} />
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
                {isPending
                  ? isEdit
                    ? t("form.submittingEdit")
                    : t("form.submittingCreate")
                  : isEdit
                    ? t("form.submitEdit")
                    : t("form.submitCreate")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
