"use client";

import { Toast as ToastPrimitive } from "@base-ui/react/toast";
import { XIcon } from "lucide-react";

import { cn } from "@/lib/utils";

// Manager global : permet d'émettre des toasts depuis n'importe où (helper
// `toast.*`), pas seulement à l'intérieur d'un composant React.
export const toastManager = ToastPrimitive.createToastManager();

export const toast = {
  success: (message: string) =>
    toastManager.add({ title: message, type: "success" }),
  error: (message: string) =>
    toastManager.add({ title: message, type: "error" }),
};

function ToastList() {
  const { toasts } = ToastPrimitive.useToastManager();

  return toasts.map((item) => (
    <ToastPrimitive.Root
      key={item.id}
      toast={item}
      className={cn(
        "relative flex items-start gap-2 rounded-lg border bg-popover p-4 pr-9 text-sm shadow-dropdown ring-1 ring-foreground/10 transition-all data-starting-style:translate-y-2 data-starting-style:opacity-0 data-ending-style:opacity-0",
        "data-[type=success]:border-success/30 data-[type=error]:border-destructive/30",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "mt-1.5 size-2 shrink-0 rounded-full",
          item.type === "error" ? "bg-destructive" : "bg-success",
        )}
      />
      <div className="flex-1">
        <ToastPrimitive.Title className="font-medium text-foreground" />
        <ToastPrimitive.Description className="text-muted-foreground" />
      </div>
      <ToastPrimitive.Close
        aria-label="Fermer"
        className="absolute top-3 right-3 rounded-md p-0.5 text-muted-foreground opacity-70 transition-opacity outline-none hover:opacity-100 focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <XIcon className="size-4" />
      </ToastPrimitive.Close>
    </ToastPrimitive.Root>
  ));
}

/**
 * Point de montage des toasts. À placer une seule fois, haut dans l'arbre
 * (layout dashboard). Le viewport est ancré en bas à droite.
 */
export function Toaster() {
  return (
    <ToastPrimitive.Provider toastManager={toastManager}>
      <ToastPrimitive.Portal>
        <ToastPrimitive.Viewport className="fixed right-4 bottom-4 z-[100] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2 outline-none">
          <ToastList />
        </ToastPrimitive.Viewport>
      </ToastPrimitive.Portal>
    </ToastPrimitive.Provider>
  );
}
