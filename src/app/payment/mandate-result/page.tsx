"use client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Check, CreditCard, LockKeyhole, Loader2, AlertTriangle } from "lucide-react";
import { api } from "@/lib/api";

type ResultState = "loading" | "valid" | "pending" | "failed";

const POLL_DELAYS_MS = [2000, 4000, 6000];

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative isolate min-h-screen overflow-hidden bg-background px-4 py-8 sm:px-6 sm:py-12">
      <div
        aria-hidden="true"
        className="absolute left-1/2 top-0 -z-10 h-72 w-[42rem] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="absolute -bottom-24 -right-24 -z-10 h-72 w-72 rounded-full bg-emerald-400/10 blur-3xl"
      />

      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-2xl flex-col sm:min-h-[calc(100vh-6rem)]">
        <header className="flex items-center justify-center gap-3 py-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-[#010a30] shadow-sm">
            <span className="brand-logo text-xl text-accent">G</span>
          </div>
          <div>
            <p className="brand-logo text-lg text-text">Gentle Suite<sup>®</sup></p>
            <p className="text-xs text-muted">Sichere Zahlungseinrichtung</p>
          </div>
        </header>

        {children}

        <footer className="py-5 text-center text-xs leading-5 text-muted">
          <p>GentleSuite · Zahlungsabwicklung über Mollie</p>
          <a href="https://www.gentlegroup.de/datenschutzerklaerung" className="mt-2 inline-block text-primary hover:underline">Datenschutz</a>
          <p>Girardetstraße 17 · 42109 Wuppertal</p>
        </footer>
      </div>
    </main>
  );
}

function ValidResult() {
  return (
    <section className="my-auto overflow-hidden rounded-2xl border border-border bg-surface shadow-[0_24px_70px_-32px_rgba(16,24,40,0.35)]">
      <div className="h-1.5 bg-gradient-to-r from-primary via-emerald-500 to-emerald-300" />
      <div className="px-6 py-9 text-center sm:px-12 sm:py-12">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-success ring-8 ring-emerald-50/60">
          <Check className="h-8 w-8" strokeWidth={2.5} aria-hidden="true" />
        </div>

        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-success">
          Übermittlung erfolgreich
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-text sm:text-3xl">
          Vielen Dank für Ihre Zustimmung
        </h1>
        <p className="mx-auto mt-4 max-w-lg text-sm leading-6 text-muted sm:text-base">
          Ihre Zahlungseinrichtung wurde erfolgreich bei Mollie bestätigt. Die
          vereinbarten monatlichen Beträge werden automatisch eingezogen.
        </p>

        <div className="mt-8 grid gap-3 text-left sm:grid-cols-2">
          <div className="flex gap-3 rounded-xl border border-border bg-background/70 p-4">
            <CreditCard className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
            <div>
              <p className="text-sm font-semibold text-text">Automatischer Einzug</p>
              <p className="mt-1 text-xs leading-5 text-muted">
                Die Abbuchung erfolgt zu den vereinbarten Terminen.
              </p>
            </div>
          </div>
          <div className="flex gap-3 rounded-xl border border-border bg-background/70 p-4">
            <LockKeyhole className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
            <div>
              <p className="text-sm font-semibold text-text">Sicher über Mollie</p>
              <p className="mt-1 text-xs leading-5 text-muted">
                Ihre Zahlungsdaten werden nicht in GentleSuite gespeichert.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8 rounded-xl border border-border bg-background px-4 py-3 text-sm text-muted">
          Sie können dieses Fenster jetzt schließen. Ihre Rechnung erhalten Sie wie
          vereinbart vor dem jeweiligen Einzug.
        </div>
      </div>
    </section>
  );
}

function PendingResult() {
  return (
    <section className="my-auto overflow-hidden rounded-2xl border border-border bg-surface shadow-[0_24px_70px_-32px_rgba(16,24,40,0.35)]">
      <div className="h-1.5 bg-gradient-to-r from-primary via-amber-400 to-amber-300" />
      <div className="px-6 py-9 text-center sm:px-12 sm:py-12">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-amber-50 text-warning ring-8 ring-amber-50/60">
          <Loader2 className="h-8 w-8 animate-spin" strokeWidth={2.5} aria-hidden="true" />
        </div>

        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-warning">
          Wird noch verarbeitet
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-text sm:text-3xl">
          Einen Moment noch
        </h1>
        <p className="mx-auto mt-4 max-w-lg text-sm leading-6 text-muted sm:text-base">
          Mollie bzw. Ihre Bank verarbeitet die Zahlungseinrichtung noch. Das kann
          in seltenen Fällen einige Minuten dauern. Sie erhalten eine Bestätigung
          per E-Mail, sobald die Einrichtung abgeschlossen ist.
        </p>

        <div className="mt-8 rounded-xl border border-border bg-background px-4 py-3 text-sm text-muted">
          Falls sich hier länger nichts tut, prüfen Sie bitte, ob die Einrichtung
          bei Ihrer Bank noch eine weitere Bestätigung von Ihnen erwartet, oder
          fragen Sie bei uns nach.
        </div>
      </div>
    </section>
  );
}

function FailedResult({ failureMessage }: { failureMessage?: string | null }) {
  return (
    <section className="my-auto overflow-hidden rounded-2xl border border-border bg-surface shadow-[0_24px_70px_-32px_rgba(16,24,40,0.35)]">
      <div className="h-1.5 bg-gradient-to-r from-primary via-red-400 to-red-300" />
      <div className="px-6 py-9 text-center sm:px-12 sm:py-12">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-danger ring-8 ring-red-50/60">
          <AlertTriangle className="h-8 w-8" strokeWidth={2.5} aria-hidden="true" />
        </div>

        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-danger">
          Einrichtung fehlgeschlagen
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-text sm:text-3xl">
          Das hat leider nicht geklappt
        </h1>
        <p className="mx-auto mt-4 max-w-lg text-sm leading-6 text-muted sm:text-base">
          {failureMessage || "Die Zahlungseinrichtung konnte nicht abgeschlossen werden."}
        </p>

        <div className="mt-8 rounded-xl border border-border bg-background px-4 py-3 text-sm text-muted">
          Bitte wenden Sie sich an uns, damit wir Ihnen einen neuen Einrichtungslink
          zusenden — zum Beispiel mit einer anderen Karte oder Zahlungsart.
        </div>
      </div>
    </section>
  );
}

function LoadingResult() {
  return (
    <section className="my-auto overflow-hidden rounded-2xl border border-border bg-surface shadow-[0_24px_70px_-32px_rgba(16,24,40,0.35)]">
      <div className="h-1.5 bg-gradient-to-r from-primary via-emerald-500 to-emerald-300" />
      <div className="px-6 py-16 text-center sm:px-12">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted" aria-hidden="true" />
        <p className="mt-4 text-sm text-muted">Status wird geprüft...</p>
      </div>
    </section>
  );
}

function MandateResult() {
  const params = useSearchParams();
  const subscriptionId = params.get("sub");
  const [state, setState] = useState<ResultState>("loading");
  const [failureMessage, setFailureMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!subscriptionId) { setState("failed"); return; }
    let cancelled = false;

    async function poll(attempt: number) {
      try {
        const result = await api.mollieMandateStatus(subscriptionId!);
        if (cancelled) return;
        if (result.status === "valid") { setState("valid"); return; }
        if (result.status === "failed") { setState("failed"); setFailureMessage(result.failureMessage || null); return; }
        // still pending
        if (attempt < POLL_DELAYS_MS.length) {
          setState("pending");
          setTimeout(() => poll(attempt + 1), POLL_DELAYS_MS[attempt]);
        } else {
          setState("pending");
        }
      } catch {
        if (!cancelled) setState("failed");
      }
    }

    poll(0);
    return () => { cancelled = true; };
  }, [subscriptionId]);

  if (state === "loading") return <LoadingResult />;
  if (state === "valid") return <ValidResult />;
  if (state === "pending") return <PendingResult />;
  return <FailedResult failureMessage={failureMessage} />;
}

export default function MandateResultPage() {
  return (
    <Shell>
      <Suspense fallback={<LoadingResult />}>
        <MandateResult />
      </Suspense>
    </Shell>
  );
}
