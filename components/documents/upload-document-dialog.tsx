"use client";

import { useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { UploadCloud } from "lucide-react";
import { useTranslations } from "next-intl";

import { uploadDocument } from "@/lib/documents/actions";
import {
  ACCEPTED_FILE_EXTENSIONS,
  DEFAULT_DOCUMENT_CATEGORY,
  DOCUMENT_CATEGORIES,
  type DocumentCategory,
} from "@/lib/documents/constants";
import { toast } from "@/components/ui/toaster";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
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

/** Nom de fichier sans son extension, utilisé pour pré-remplir le nom d'affichage. */
function stripExtension(fileName: string): string {
  const lastDot = fileName.lastIndexOf(".");
  return lastDot > 0 ? fileName.slice(0, lastDot) : fileName;
}

/**
 * Modale d'ajout d'un document (admin/owner uniquement — le bouton qui
 * l'ouvre est déjà masqué aux autres, `uploadDocument` revérifie côté
 * serveur). Pilotée par `?upload=true`, même patron que les autres modales du
 * projet.
 *
 * Pas de progression octet par octet (l'upload passe par une Server Action,
 * pas par une requête `XMLHttpRequest` instrumentable) : la barre simule une
 * progression pendant l'envoi puis saute à 100 % au résultat, pour donner un
 * retour visuel pendant l'attente sans prétendre à une précision qu'on n'a
 * pas — cohérent avec le reste de l'app qui n'affiche jamais ce niveau de
 * détail sur ses Server Actions.
 */
export function UploadDocumentDialog({ orgSlug }: { orgSlug: string }) {
  const t = useTranslations("documents.upload");
  const tCategories = useTranslations("documents.categories");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();

  const [file, setFile] = useState<File | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [category, setCategory] = useState<DocumentCategory>(DEFAULT_DOCUMENT_CATEGORY);
  const [isDragging, setIsDragging] = useState(false);
  const [progress, setProgress] = useState(0);

  const open = searchParams.get("upload") === "true";

  function resetState() {
    setFile(null);
    setDisplayName("");
    setCategory(DEFAULT_DOCUMENT_CATEGORY);
    setProgress(0);
  }

  function closeDialog() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("upload");
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    resetState();
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

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!file) {
      toast.error(t("errors.fileMissing"));
      return;
    }

    const formData = new FormData();
    formData.set("file", file);
    formData.set("category", category);
    formData.set("displayName", displayName);

    const progressTimer = setInterval(() => {
      setProgress((current) => (current < 90 ? current + 10 : current));
    }, 150);

    startTransition(async () => {
      const result = await uploadDocument(orgSlug, formData);
      clearInterval(progressTimer);

      if (result.ok) {
        setProgress(100);
        toast.success(t("success"));
        closeDialog();
        router.refresh();
        return;
      }

      setProgress(0);
      toast.error(t(`errors.${result.error}`));
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
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
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
            <Label htmlFor="document-category">{t("categoryLabel")}</Label>
            <Select
              value={category}
              onValueChange={(value) => setCategory(value as DocumentCategory)}
            >
              <SelectTrigger id="document-category" className="w-full">
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
            <Label htmlFor="document-display-name">{t("displayNameLabel")}</Label>
            <Input
              id="document-display-name"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
            />
          </div>

          {isPending ? <Progress value={progress} /> : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={closeDialog}
              disabled={isPending}
            >
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? t("submitting") : t("submit")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
