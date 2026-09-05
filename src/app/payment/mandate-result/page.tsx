import type { Metadata } from "next";
import { Check, CreditCard, LockKeyhole } from "lucide-react";

export const metadata: Metadata = {
  title: "Zahlungseinrichtung | GentleSuite",
  description: "Bestätigung der sicheren Zahlungseinrichtung über Mollie.",
};

export default function MandateResultPage() {
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
              Ihre Zahlungseinrichtung wurde sicher an Mollie übermittelt. Sobald die
              Bestätigung verarbeitet ist, werden die vereinbarten monatlichen Beträge
              automatisch eingezogen.
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

        <footer className="py-5 text-center text-xs leading-5 text-muted">
          <p>GentleSuite · Zahlungsabwicklung über Mollie</p>
          <a href="https://www.gentlegroup.de/datenschutzerklaerung" className="mt-2 inline-block text-primary hover:underline">Datenschutz</a>
          <p>Girardetstraße 17 · 42109 Wuppertal</p>
        </footer>
      </div>
    </main>
  );
}
