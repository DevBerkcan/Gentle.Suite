"use client";
import { ShieldCheck } from "lucide-react";

export const FOCUS = "focus:outline-none focus-visible:ring-4 focus-visible:ring-secondary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background";
export const MICRO = "text-xs font-semibold uppercase tracking-[0.18em]";
export const BTN_PRIMARY = `inline-flex min-h-[56px] w-full items-center justify-center gap-3 rounded-full bg-navy px-8 py-4 text-lg font-semibold text-white transition-colors hover:bg-[#07143D] disabled:cursor-not-allowed disabled:opacity-60 ${FOCUS}`;
export const CARD = "rounded-3xl border border-border bg-surface shadow-[0_24px_70px_-36px_rgba(1,10,48,0.35)]";
export const INPUT = `w-full rounded-xl border border-border bg-background px-4 py-3 text-base text-text ${FOCUS}`;

/** Branded frame for the customer-facing legal pages (Urheberrechts-Freigabe, Abnahme). */
export function PublicLegalShell({ subtitle, children }: { subtitle: string; children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-background px-4 py-6 text-text sm:px-6 sm:py-10">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-2xl flex-col">
        <header className="mb-6 flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-navy" aria-hidden="true">
            <span className="brand-logo text-2xl text-accent">G</span>
          </div>
          <div>
            <p className="brand-logo text-xl text-navy dark:text-text">Gentle Group</p>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-muted"><ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />{subtitle}</p>
          </div>
        </header>
        <div className="flex-1">{children}</div>
        <footer className="mt-10 space-y-1 text-center text-sm leading-6 text-muted">
          <p>Gentle Group · Girardetstraße 17 · 42109 Wuppertal</p>
          <a href="https://www.gentlegroup.de/datenschutzerklaerung" className={`inline-block rounded text-navy underline underline-offset-4 dark:text-text ${FOCUS}`}>Datenschutz</a>
        </footer>
      </div>
    </main>
  );
}

export function Message({ tone, title, children }: { tone: "success" | "danger" | "neutral"; title: string; children?: React.ReactNode }) {
  const cls = { success: "bg-success/10 text-success", danger: "bg-danger/10 text-danger", neutral: "bg-secondary/15 text-navy dark:text-text" }[tone];
  return (
    <section className={`${CARD} px-6 py-10 text-center sm:px-10`} aria-live="polite">
      <div className={`mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full ${cls}`}><ShieldCheck className="h-8 w-8" aria-hidden="true" /></div>
      <h1 className="text-2xl leading-tight text-text sm:text-3xl">{title}</h1>
      {children && <div className="mx-auto mt-4 max-w-md space-y-3 text-base leading-relaxed text-text/80">{children}</div>}
    </section>
  );
}

export const fmtDate = (d?: string | null) => (d ? new Date(d).toLocaleDateString("de-DE", { timeZone: "Europe/Berlin" }) : "");
