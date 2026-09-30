"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Play } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const VIDEO_SRC = "/landing/assohub-video.mp4";
const VIDEO_POSTER = "/landing/assohub-video-poster.webp";

/**
 * Bouton secondaire du hero : ouvre la vidéo de présentation (90 s, muette)
 * dans une fenêtre modale.
 *
 * La balise `<video>` n'existe dans le DOM qu'une fois la fenêtre ouverte :
 * aucun octet de la vidéo n'est téléchargé avant le clic (connexions mobiles
 * lentes). Elle reste montée pendant l'animation de sortie pour éviter un
 * saut de mise en page, mais est mise en pause dès la demande de fermeture
 * (bouton, Échap, clic à l'extérieur). Base UI rend ensuite le focus au
 * bouton déclencheur.
 */
export function DemoVideoDialog({
  triggerLabel,
  title,
  videoLabel,
  ctaLabel,
}: {
  triggerLabel: string;
  title: string;
  videoLabel: string;
  ctaLabel: string;
}) {
  const [showVideo, setShowVideo] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  return (
    <Dialog
      onOpenChange={(open) => {
        if (open) setShowVideo(true);
        else videoRef.current?.pause();
      }}
      onOpenChangeComplete={(open) => {
        if (!open) setShowVideo(false);
      }}
    >
      <DialogTrigger
        render={<Button size="lg" variant="outline" className="w-full sm:w-auto" />}
      >
        <Play aria-hidden="true" />
        {triggerLabel}
      </DialogTrigger>

      {/*
        Largeur plafonnée aussi par la hauteur d'écran (vidéo 16:10 + ≈ 10rem
        de titre, marges et bouton) : sur un écran bas, le bouton d'inscription
        reste visible sans défiler dans la fenêtre. `brand-public` : la fenêtre
        est rendue dans un portail, hors du scope de la landing — sans lui, le
        bouton reprendrait les couleurs de l'application.
      */}
      <DialogContent className="brand-public w-[calc(100%-1rem)] max-w-[min(56rem,calc((90dvh-10rem)*1.6))] gap-4 p-4 sm:w-[calc(100%-2rem)] sm:gap-5 sm:p-6">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="overflow-hidden rounded-lg bg-muted ring-1 ring-foreground/10">
          {showVideo ? (
            <video
              ref={videoRef}
              src={VIDEO_SRC}
              poster={VIDEO_POSTER}
              aria-label={videoLabel}
              className="block aspect-[16/10] h-auto w-full"
              controls
              autoPlay
              muted
              playsInline
            />
          ) : (
            <div className="aspect-[16/10] w-full" />
          )}
        </div>

        <DialogFooter>
          <Button size="lg" className="w-full sm:w-auto" render={<Link href="/register" />}>
            {ctaLabel}
            <ArrowRight aria-hidden="true" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
