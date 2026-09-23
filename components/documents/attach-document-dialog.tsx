"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UploadCloud } from "lucide-react";
import { useTranslations } from "next-intl";

import { linkDocumentToTarget, uploadDocument } from "@/lib/documents/actions";
import {
  ACCEPTED_FILE_EXTENSIONS,
  DEFAULT_DOCUMENT_CATEGORY,
  DOCUMENT_CATEGORIES,
  type DocumentCategory,
} from "@/lib/documents/constants";
import type { AttachedDocumentRow } from "@/lib/documents/queries";
import { toast } from "@/components/ui/toaster";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

function stripExtension(fileName: string): string {
  const lastDot = fileName.lastIndexOf(".");
  return lastDot > 0 ? fileName.slice(0, lastDot) : fileName;
}

export interface AttachTarget {
  paymentId?: string;
  meetingId?: string;
}

/**
 * Rattachement d'un document à un paiement (justificatif) ou une réunion (PV,
 * document lié) — deux modes : téléverser un nouveau fichier, ou choisir
 * parmi les documents généraux pas encore rattachés (`existingDocuments`,
 * chargée une fois par la page parente et partagée entre toutes les
 * instances de ce dialog, jamais recalculée par ligne).
 */
export function AttachDocumentDialog({
  orgSlug,
  target,
  existingDocuments,
  open,
  onOpenChange,
}: {
  orgSlug: string;
  target: AttachTarget;
  existingDocuments: AttachedDocumentRow[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("documents.attachDialog");
  const tCategories = useTranslations("documents.categories");
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();

  const [mode, setMode] = useState<"upload" | "existing">("upload");
  const [file, setFile] = useState<File | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [category, setCategory] = useState<DocumentCategory>(DEFAULT_DOCUMENT_CATEGORY);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedExistingId, setSelectedExistingId] = useState<string | undefined>(
    existingDocuments[0]?.id,
  );

  function resetAndClose() {
    setFile(null);
    setDisplayName("");
    setCategory(DEFAULT_DOCUMENT_CATEGORY);
    setMode("upload");
    onOpenChange(false);
  }

  function pickFile(nextFile: File) {
    setFile(nextFile);
    setDisplayName(stripExtension(nextFile.name));
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    const dropped = event.dataTransfer.files[0];
    if (dropped) pickFile(dropped);
  }

  function onSubmitUpload(event: React.FormEvent) {
    event.preventDefault();
    if (!file) {
      toast.error(t("errors.fileMissing"));
      return;
    }

    const formData = new FormData();
    formData.set("file", file);
    formData.set("category", category);
    formData.set("displayName", displayName);
    if (target.paymentId) formData.set("paymentId", target.paymentId);
    if (target.meetingId) formData.set("meetingId", target.meetingId);

    startTransition(async () => {
      const result = await uploadDocument(orgSlug, formData);
      if (result.ok) {
        toast.success(t("success"));
        resetAndClose();
        router.refresh();
        return;
      }
      toast.error(t(`errors.${result.error}`));
    });
  }

  function onSubmitExisting(event: React.FormEvent) {
    event.preventDefault();
    if (!selectedExistingId) return;

    startTransition(async () => {
      const result = await linkDocumentToTarget(orgSlug, selectedExistingId, target);
      if (result.ok) {
        toast.success(t("success"));
        resetAndClose();
        router.refresh();
        return;
      }
      toast.error(t(`errors.${result.error}`));
    });
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? onOpenChange(next) : resetAndClose())}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        {existingDocuments.length > 0 ? (
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant={mode === "upload" ? "default" : "outline"}
              onClick={() => setMode("upload")}
            >
              {t("modeUpload")}
            </Button>
            <Button
              type="button"
              size="sm"
              variant={mode === "existing" ? "default" : "outline"}
              onClick={() => setMode("existing")}
            >
              {t("modeExisting")}
            </Button>
          </div>
        ) : null}

        {mode === "upload" ? (
          <form onSubmit={onSubmitUpload} className="space-y-4">
            <div
              role="button"
              tabIndex={0}
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  fileInputRef.current?.click();
                }
              }}
              onDragOver={(event) => {
                event.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              className={cn(
                "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed px-4 py-8 text-center transition-colors",
                isDragging ? "border-primary bg-brand-subtle" : "border-border",
              )}
            >
              <UploadCloud className="size-6 text-muted-foreground" />
              {file ? (
                <p className="text-sm font-medium text-foreground">{file.name}</p>
              ) : (
                <>
                  <p className="text-sm text-foreground">{t("dropzoneLabel")}</p>
                  <p className="text-xs text-muted-foreground">{t("dropzoneHint")}</p>
                </>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED_FILE_EXTENSIONS.join(",")}
                className="hidden"
                onChange={(event) => {
                  const selected = event.target.files?.[0];
                  if (selected) pickFile(selected);
                }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="attach-category">{t("categoryLabel")}</Label>
              <Select
                value={category}
                onValueChange={(value) => setCategory(value as DocumentCategory)}
              >
                <SelectTrigger id="attach-category" className="w-full">
                  <SelectValue>{tCategories(category)}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {DOCUMENT_CATEGORIES.map((value) => (
                    <SelectItem key={value} value={value}>
                      {tCategories(value)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="attach-display-name">{t("displayNameLabel")}</Label>
              <Input
                id="attach-display-name"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={resetAndClose} disabled={isPending}>
                {t("cancel")}
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? t("submitting") : t("submit")}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <form onSubmit={onSubmitExisting} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="attach-existing">{t("existingLabel")}</Label>
              <Select
                value={selectedExistingId}
                onValueChange={(value) => setSelectedExistingId(value ?? undefined)}
              >
                <SelectTrigger id="attach-existing" className="w-full">
                  <SelectValue>{existingDocuments.find((doc) => doc.id === selectedExistingId)?.displayName}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {existingDocuments.map((doc) => (
                    <SelectItem key={doc.id} value={doc.id}>
                      {doc.displayName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={resetAndClose} disabled={isPending}>
                {t("cancel")}
              </Button>
              <Button type="submit" disabled={isPending || !selectedExistingId}>
                {isPending ? t("submitting") : t("submit")}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
