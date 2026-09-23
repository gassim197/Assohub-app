"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { renameDocument } from "@/lib/documents/actions";
import { renameDocumentServerSchema } from "@/lib/documents/schema";
import { toast } from "@/components/ui/toaster";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

interface RenameFormValues {
  displayName: string;
}

/** Renommage d'un document (admin/owner uniquement, re-vérifié côté serveur). */
export function RenameDocumentDialog({
  orgSlug,
  document,
  open,
  onOpenChange,
}: {
  orgSlug: string;
  document: { id: string; displayName: string };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("documents.renameDialog");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const form = useForm<RenameFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(renameDocumentServerSchema as any),
    values: { displayName: document.displayName },
  });

  function onSubmit(values: RenameFormValues) {
    startTransition(async () => {
      const result = await renameDocument(orgSlug, document.id, values);

      if (result.ok) {
        toast.success(t("success"));
        onOpenChange(false);
        router.refresh();
        return;
      }

      toast.error(t("error"));
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="displayName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("fieldLabel")}</FormLabel>
                  <FormControl>
                    <Input autoFocus {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isPending}
              >
                {t("cancel")}
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? t("submitting") : t("submit")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
