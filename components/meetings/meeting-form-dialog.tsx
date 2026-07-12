"use client";

import { useEffect, useMemo, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";

import { createMeeting, updateMeeting } from "@/lib/meetings/actions";
import { buildMeetingSchema } from "@/lib/meetings/schema";
import {
  DEFAULT_MEETING_STATUS,
  DEFAULT_MEETING_TYPE,
  MEETING_STATUSES,
  MEETING_TYPES,
  isMeetingStatus,
  isMeetingType,
  type MeetingStatus,
  type MeetingType,
} from "@/lib/meetings/constants";
import { formatDatetimeLocalFromUtc } from "@/lib/meetings/date";
import type { MeetingRow } from "@/lib/meetings/queries";
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

interface MeetingFormValues {
  title: string;
  type: MeetingType;
  description: string;
  scheduledAt: string;
  durationMinutes: number | "";
  location: string;
  videoLink: string;
  status: MeetingStatus;
}

/** Valeurs vierges (création) ou pré-remplies depuis une réunion (édition). */
function buildDefaults(meeting?: MeetingRow): MeetingFormValues {
  if (!meeting) {
    return {
      title: "",
      type: DEFAULT_MEETING_TYPE,
      description: "",
      scheduledAt: "",
      durationMinutes: "",
      location: "",
      videoLink: "",
      status: DEFAULT_MEETING_STATUS,
    };
  }

  return {
    title: meeting.title,
    type: isMeetingType(meeting.type) ? meeting.type : DEFAULT_MEETING_TYPE,
    description: meeting.description ?? "",
    scheduledAt: formatDatetimeLocalFromUtc(meeting.scheduledAt),
    durationMinutes: meeting.durationMinutes ?? "",
    location: meeting.location ?? "",
    videoLink: meeting.videoLink ?? "",
    status: isMeetingStatus(meeting.status) ? meeting.status : DEFAULT_MEETING_STATUS,
  };
}

/**
 * Modale de création (checkpoint 1) ou d'édition d'une réunion — même patron
 * que `MemberFormDialog`/`CotisationTypeFormDialog` (décision 6A : modale
 * plutôt que page dédiée, cohérence avec le reste de l'app).
 *
 * Pilotée par l'URL : `?newMeeting=true` en création, `?editMeeting=true&meetingId=X`
 * en édition.
 */
export function MeetingFormDialog({
  orgSlug,
  meeting,
}: {
  orgSlug: string;
  meeting?: MeetingRow;
}) {
  const t = useTranslations("meetings");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const isEdit = Boolean(meeting);
  const param = isEdit ? "editMeeting" : "newMeeting";
  const open = searchParams.get(param) === "true";

  const schema = useMemo(
    () =>
      buildMeetingSchema({
        titleMin: t("form.errors.titleMin"),
        scheduledAtInvalid: t("form.errors.scheduledAtInvalid"),
        durationPositive: t("form.errors.durationPositive"),
        videoLinkInvalid: t("form.errors.videoLinkInvalid"),
      }),
    [t],
  );

  const form = useForm<MeetingFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema as any),
    defaultValues: buildDefaults(meeting),
  });

  useEffect(() => {
    if (open) form.reset(buildDefaults(meeting));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function closeDialog() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete(param);
    if (isEdit) params.delete("meetingId");
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, {
      scroll: false,
    });
  }

  function onSubmit(values: MeetingFormValues) {
    startTransition(async () => {
      const result =
        meeting !== undefined
          ? await updateMeeting(orgSlug, meeting.id, values)
          : await createMeeting(orgSlug, values);

      if (result.ok) {
        toast.success(isEdit ? t("editForm.success") : t("form.success"));
        closeDialog();
        router.refresh();
        return;
      }

      toast.error(t("form.errors.generic"));
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
          <DialogTitle>
            {isEdit ? t("editForm.title") : t("form.title")}
          </DialogTitle>
          <DialogDescription>
            {isEdit ? t("editForm.description") : t("form.description")}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("form.fieldTitle")}</FormLabel>
                  <FormControl>
                    <Input autoFocus {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("form.type")}</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {MEETING_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>
                            {t(`types.${type}`)}
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
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {MEETING_STATUSES.map((status) => (
                          <SelectItem key={status} value={status}>
                            {t(`status.${status}`)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t("form.fieldDescription")}{" "}
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

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="scheduledAt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("form.scheduledAt")}</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="durationMinutes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t("form.durationMinutes")}{" "}
                      <span className="text-muted-foreground">
                        {t("form.optional")}
                      </span>
                    </FormLabel>
                    <FormControl>
                      <Input type="number" min={1} step="1" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t("form.location")}{" "}
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

            <FormField
              control={form.control}
              name="videoLink"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t("form.videoLink")}{" "}
                    <span className="text-muted-foreground">
                      {t("form.optional")}
                    </span>
                  </FormLabel>
                  <FormControl>
                    <Input type="url" placeholder="https://meet.google.com/..." {...field} />
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
                    ? t("editForm.submitting")
                    : t("form.submitting")
                  : isEdit
                    ? t("editForm.submit")
                    : t("form.submit")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
