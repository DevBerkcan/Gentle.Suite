"use client";
import { useRef, useState } from "react";
import type { UserAccount } from "@/types/api";
import UserAvatar from "./UserAvatar";

const MAX_BYTES = 2 * 1024 * 1024;
const ACCEPT = ["image/jpeg", "image/png", "image/webp"];

interface Props {
  name?: string | null;
  avatarUrl?: string | null;
  onUpload: (file: File) => Promise<UserAccount>;
  onRemove: () => Promise<UserAccount>;
  /** Wird mit dem aktualisierten Benutzer aufgerufen (neue avatarUrl). */
  onChanged: (u: UserAccount) => void;
  sizeClass?: string;
}

/** Profilbild hochladen / ändern / entfernen (JPG, PNG, WebP, max. 2 MB). */
export default function AvatarEditor({ name, avatarUrl, onUpload, onRemove, onChanged, sizeClass = "w-16 h-16 text-lg" }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleFile(file?: File | null) {
    if (!file) return;
    setError("");
    if (!ACCEPT.includes(file.type)) { setError("Nur JPG, PNG oder WebP erlaubt."); return; }
    if (file.size > MAX_BYTES) { setError("Das Bild darf maximal 2 MB groß sein."); return; }
    setBusy(true);
    try { onChanged(await onUpload(file)); }
    catch (e: any) { setError(e?.message || "Upload fehlgeschlagen."); }
    finally { setBusy(false); if (inputRef.current) inputRef.current.value = ""; }
  }

  async function handleRemove() {
    if (!confirm("Profilbild entfernen?")) return;
    setError("");
    setBusy(true);
    try { onChanged(await onRemove()); }
    catch (e: any) { setError(e?.message || "Entfernen fehlgeschlagen."); }
    finally { setBusy(false); }
  }

  return (
    <div className="flex items-center gap-4">
      <UserAvatar avatarUrl={avatarUrl} name={name} sizeClass={sizeClass} />
      <div className="space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
            className="px-4 py-1.5 rounded-full bg-navy text-white text-xs font-semibold hover:opacity-90 disabled:opacity-50"
          >
            {busy ? "Bitte warten…" : avatarUrl ? "Bild ändern" : "Bild hochladen"}
          </button>
          {avatarUrl && (
            <button
              type="button"
              disabled={busy}
              onClick={handleRemove}
              className="px-4 py-1.5 rounded-full border border-border text-xs hover:bg-background disabled:opacity-50"
            >
              Entfernen
            </button>
          )}
        </div>
        <p className="text-xs text-muted">JPG, PNG oder WebP, max. 2 MB.</p>
        {error && <p className="text-xs text-danger">{error}</p>}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT.join(",")}
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
    </div>
  );
}
