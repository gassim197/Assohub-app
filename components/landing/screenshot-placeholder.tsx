import { FolderOpen } from "lucide-react";

import { ScreenshotFrame } from "./screenshot-frame";

/**
 * Emplacement neutre d'une capture pas encore disponible : même cadre et
 * même format 16:10 qu'une capture, pour la remplacer plus tard par un
 * `Screenshot` sans rien décaler. Purement décoratif.
 */
export function ScreenshotPlaceholder() {
  return (
    <ScreenshotFrame>
      <div
        aria-hidden="true"
        className="flex aspect-[16/10] w-full items-center justify-center bg-gradient-to-br from-muted/60 to-brand-subtle/60"
      >
        <FolderOpen className="size-10 text-foreground/15 sm:size-12" strokeWidth={1.5} />
      </div>
    </ScreenshotFrame>
  );
}
