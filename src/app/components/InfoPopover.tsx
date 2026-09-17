"use client";
import { useEffect, useRef, useState } from "react";
import { Info, X } from "lucide-react";

export default function InfoPopover({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-label={title}
        className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-muted hover:text-primary hover:border-primary transition-colors"
      >
        <Info className="h-4 w-4" />
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-80 rounded-xl border border-border bg-surface shadow-lg z-50 p-4">
          <div className="flex items-start justify-between mb-2">
            <h3 className="text-sm font-semibold">{title}</h3>
            <button type="button" onClick={() => setOpen(false)} className="text-muted hover:text-text">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="text-xs text-muted leading-relaxed space-y-2">{children}</div>
        </div>
      )}
    </div>
  );
}
