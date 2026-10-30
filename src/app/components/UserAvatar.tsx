"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

// avatarUrl enthält ?v=<datei-id>, ändert sich also bei jedem Upload → als Cache-Key geeignet.
const cache = new Map<string, Promise<string | null>>();

function loadAvatar(avatarUrl: string): Promise<string | null> {
  let p = cache.get(avatarUrl);
  if (!p) {
    p = api
      .avatarBlob(avatarUrl)
      .then((b) => URL.createObjectURL(b))
      .catch(() => {
        cache.delete(avatarUrl); // später erneut versuchen
        return null;
      });
    cache.set(avatarUrl, p);
  }
  return p;
}

export function initialsOf(name?: string | null) {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  return parts.map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

interface Props {
  avatarUrl?: string | null;
  name?: string | null;
  /** Tailwind-Größe inkl. Schriftgröße, z. B. "w-7 h-7 text-xs". */
  sizeClass?: string;
  className?: string;
}

/** Runder Avatar: Profilbild falls vorhanden, sonst Initialen (bg-secondary text-navy). */
export default function UserAvatar({ avatarUrl, name, sizeClass = "w-8 h-8 text-xs", className = "" }: Props) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setSrc(null);
    if (avatarUrl) loadAvatar(avatarUrl).then((u) => { if (alive) setSrc(u); });
    return () => { alive = false; };
  }, [avatarUrl]);

  return (
    <span className={`${sizeClass} rounded-full bg-secondary text-navy font-bold flex items-center justify-center shrink-0 overflow-hidden ${className}`}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={name ? `Profilbild ${name}` : "Profilbild"} className="w-full h-full object-cover" />
      ) : (
        initialsOf(name)
      )}
    </span>
  );
}
