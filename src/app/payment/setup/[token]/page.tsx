"use client";
import { Suspense, useCallback, useEffect, useId, useRef, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { AlertTriangle, ArrowRight, Building2, Check, CheckCircle2, CreditCard, Info, Landmark, Loader2, LockKeyhole, RefreshCw } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import type { MandateSetupInfo } from "@/types/api";

/* ───────────────────────── IBAN helpers ───────────────────────── */

// Länge je Land (SEPA-Raum); unbekannte Länder: 15–34 Stellen.
const IBAN_LENGTHS: Record<string, number> = {
  AD: 24, AT: 20, BE: 16, BG: 22, CH: 21, CY: 28, CZ: 24, DE: 22, DK: 18, EE: 20, ES: 24, FI: 18, FR: 27, GB: 22,
  GI: 23, GR: 27, HR: 21, HU: 28, IE: 22, IS: 26, IT: 27, LI: 21, LT: 20, LU: 20, LV: 21, MC: 27, MT: 31, NL: 18,
  NO: 15, PL: 28, PT: 25, RO: 24, SE: 24, SI: 19, SK: 24, SM: 27, VA: 22,
};

const cleanIban = (value: string) => value.replace(/[^0-9a-zA-Z]/g, "").toUpperCase();
const formatIban = (value: string) => cleanIban(value).slice(0, 34).replace(/(.{4})/g, "$1 ").trim();

function ibanChecksumOk(iban: string) {
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  let remainder = 0;
  for (const ch of rearranged) {
    const code = ch.charCodeAt(0);
    const digits = code >= 65 && code <= 90 ? String(code - 55) : ch;
    for (const d of digits) remainder = (remainder * 10 + Number(d)) % 97;
  }
  return remainder === 1;
}

type IbanCheck = { state: "empty" | "typing" | "invalid" | "valid"; hint: string };

function checkIban(raw: string): IbanCheck {
  const iban = cleanIban(raw);
  if (!iban) return { state: "empty", hint: "Ihre IBAN finden Sie auf Ihrer Bankkarte, im Online-Banking oder auf dem Kontoauszug." };
  if (!/^[A-Z]{2}/.test(iban)) return { state: "invalid", hint: "Eine IBAN beginnt mit zwei Buchstaben für das Land, in Deutschland mit „DE“." };
  if (!/^[A-Z]{2}[0-9]{2}[A-Z0-9]*$/.test(iban)) return { state: "invalid", hint: "Nach dem Ländercode folgen zwei Ziffern. Bitte prüfen Sie den Anfang der IBAN." };
  const expected = IBAN_LENGTHS[iban.slice(0, 2)];
  if (expected) {
    if (iban.length < expected) {
      const missing = expected - iban.length;
      return { state: "typing", hint: `Es fehlen noch ${missing} ${missing === 1 ? "Stelle" : "Stellen"} (insgesamt ${expected}).` };
    }
    if (iban.length > expected) return { state: "invalid", hint: `Diese IBAN ist zu lang. Eine IBAN aus diesem Land hat ${expected} Stellen.` };
  } else if (iban.length < 15) {
    return { state: "typing", hint: "Bitte geben Sie die vollständige IBAN ein." };
  }
  if (!ibanChecksumOk(iban)) return { state: "invalid", hint: "Diese IBAN stimmt leider nicht. Vielleicht sind zwei Ziffern vertauscht? Bitte vergleichen Sie sie noch einmal in Ruhe." };
  return { state: "valid", hint: "Die IBAN ist gültig." };
}

/* ───────────────────────── Layout ───────────────────────── */

const FOCUS = "focus:outline-none focus-visible:ring-4 focus-visible:ring-secondary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background";
const MICRO = "text-xs font-semibold uppercase tracking-[0.18em]";
const BTN_PRIMARY = `inline-flex min-h-[56px] w-full items-center justify-center gap-3 rounded-full bg-navy px-8 py-4 text-lg font-semibold text-white transition-colors hover:bg-[#07143D] disabled:cursor-not-allowed disabled:opacity-60 ${FOCUS}`;
const BTN_SECONDARY = `inline-flex min-h-[52px] w-full items-center justify-center gap-3 rounded-full border-2 border-navy bg-surface px-8 py-3.5 text-base font-semibold text-navy transition-colors hover:bg-navy hover:text-white disabled:cursor-not-allowed disabled:opacity-60 ${FOCUS}`;
const CARD = "rounded-3xl border border-border bg-surface shadow-[0_24px_70px_-36px_rgba(1,10,48,0.35)]";

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-background px-4 py-6 text-text sm:px-6 sm:py-10">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-xl flex-col">
        <header className="mb-6 flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-navy" aria-hidden="true">
            <span className="brand-logo text-2xl text-accent">G</span>
          </div>
          <div>
            <p className="brand-logo text-xl text-navy dark:text-text">Gentle Group</p>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-muted"><LockKeyhole className="h-3.5 w-3.5" aria-hidden="true" />Sichere Zahlungseinrichtung</p>
          </div>
        </header>
        <div className="flex-1">{children}</div>
        <footer className="mt-10 space-y-1 text-center text-sm leading-6 text-muted">
          <p>Gentle Group · Girardetstraße 17 · 42109 Wuppertal</p>
          <p>Zahlungsabwicklung über unseren Partner Mollie</p>
          <a href="https://www.gentlegroup.de/datenschutzerklaerung" className={`inline-block rounded text-navy underline underline-offset-4 dark:text-text ${FOCUS}`}>Datenschutz</a>
        </footer>
      </div>
    </main>
  );
}

function CenteredMessage({ tone, icon, eyebrow, title, children }: { tone: "success" | "warning" | "danger" | "neutral"; icon: React.ReactNode; eyebrow?: string; title: string; children?: React.ReactNode }) {
  const toneCls = {
    success: "bg-success/10 text-success",
    warning: "bg-warning/10 text-warning",
    danger: "bg-danger/10 text-danger",
    neutral: "bg-secondary/15 text-navy dark:text-text",
  }[tone];
  return (
    <section className={`${CARD} px-6 py-10 text-center sm:px-10 sm:py-12`} aria-live="polite">
      <div className={`mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full ${toneCls}`}>{icon}</div>
      {eyebrow && <p className={`${MICRO} mb-3 ${{ success: "text-success", warning: "text-warning", danger: "text-danger", neutral: "text-muted" }[tone]}`}>{eyebrow}</p>}
      <h1 className="text-[1.75rem] leading-tight text-text sm:text-4xl">{title}</h1>
      {children && <div className="mx-auto mt-5 max-w-md space-y-4 text-lg leading-relaxed text-text/80">{children}</div>}
    </section>
  );
}

function methodLabel(method?: string | null, last4?: string | null) {
  const tail = last4 ? ` ••${last4}` : "";
  if (method === "creditcard") return `Kreditkarte${tail}`;
  if (method === "paypal") return "PayPal";
  return `Bankkonto${tail}`;
}

function DoneScreen({ info, method, last4 }: { info: MandateSetupInfo | null; method?: string | null; last4?: string | null }) {
  return (
    <section className={`${CARD} overflow-hidden`} aria-live="polite">
      <div className="bg-success px-6 py-10 text-center text-white sm:px-10">
        <div className="mx-auto mb-5 flex h-24 w-24 items-center justify-center rounded-full bg-white/20 ring-8 ring-white/10">
          <Check className="h-14 w-14" strokeWidth={3} aria-hidden="true" />
        </div>
        <h1 className="text-[2rem] leading-tight sm:text-4xl">Fertig – Sie müssen nichts weiter tun</h1>
        <p className="mt-3 text-lg text-white/90">Vielen Dank! Ihre Zahlung ist eingerichtet.</p>
      </div>
      <div className="space-y-5 px-5 py-8 sm:px-10">
        <div className="rounded-2xl bg-background p-5">
          <p className={`${MICRO} text-muted`}>Eingerichtet mit</p>
          <p className="mt-2 flex items-center gap-3 text-xl font-semibold text-text">
            {method === "creditcard" ? <CreditCard className="h-6 w-6 text-secondary" aria-hidden="true" /> : <Landmark className="h-6 w-6 text-secondary" aria-hidden="true" />}
            {methodLabel(method, last4)}
          </p>
        </div>
        <div>
          <p className={`${MICRO} mb-3 text-muted`}>So geht es weiter</p>
          <ol className="space-y-4 text-lg leading-relaxed text-text">
            <li className="flex gap-4">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-base font-bold text-navy" aria-hidden="true">1</span>
              <span>Vor jeder Abbuchung erhalten Sie von uns eine Rechnung per E-Mail.</span>
            </li>
            <li className="flex gap-4">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-base font-bold text-navy" aria-hidden="true">2</span>
              <span>
                {info?.nextCollectionDate
                  ? <>Die erste Abbuchung{info.nextCollectionAmount != null ? <> über <strong className="font-semibold">{info.nextCollectionAmount.toLocaleString("de-DE", { style: "currency", currency: "EUR" })}</strong></> : null} erfolgt voraussichtlich am <strong className="font-semibold">{new Date(info.nextCollectionDate).toLocaleDateString("de-DE")}</strong>.</>
                  : <>Der Betrag{info?.amountText ? <> (<strong className="font-semibold">{info.amountText}</strong>)</> : null} wird dann automatisch zum vereinbarten Termin abgebucht.</>}
              </span>
            </li>
            <li className="flex gap-4">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-base font-bold text-navy" aria-hidden="true">3</span>
              <span>Sie müssen sich um nichts kümmern. Sie können dieses Fenster jetzt schließen.</span>
            </li>
          </ol>
        </div>
        <p className="rounded-2xl border border-border px-5 py-4 text-base leading-relaxed text-muted">
          Fragen? Melden Sie sich gern jederzeit bei uns – wir helfen Ihnen weiter.
        </p>
      </div>
    </section>
  );
}

/* ───────────────────────── Form ───────────────────────── */

function SetupForm({ token, info, notice }: { token: string; info: MandateSetupInfo; notice?: string | null }) {
  const [holder, setHolder] = useState(info.contactName || "");
  const [iban, setIban] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [touched, setTouched] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState<"iban" | "card" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ibanRefused, setIbanRefused] = useState(false);
  const [done, setDone] = useState<{ last4: string; info: MandateSetupInfo } | null>(null);
  const ids = { holder: useId(), iban: useId(), ibanHint: useId(), agree: useId(), mandate: useId() };
  const errorRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const check = checkIban(iban);
  const showIbanHint = touched || submitted || check.state === "valid" || cleanIban(iban).length >= 4;
  const holderMissing = submitted && holder.trim().length < 2;
  const agreeMissing = submitted && !agreed;
  const ibanWrong = check.state === "invalid" || (submitted && check.state !== "valid");
  const hasIban = info.methods.iban;
  const hasCard = info.methods.card;

  useEffect(() => { if (error) errorRef.current?.focus(); }, [error]);

  async function submitIban(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    setError(null);
    const firstInvalid = holder.trim().length < 2 ? ids.holder : check.state !== "valid" ? ids.iban : !agreed ? ids.agree : null;
    if (firstInvalid) { document.getElementById(firstInvalid)?.focus(); return; }
    setBusy("iban");
    try {
      await api.mandateSetupIban(token, { accountHolder: holder.trim(), iban: formatIban(iban), confirm: true });
      // The first debit date only exists once the mandate is valid, so reload it for the confirmation screen.
      const fresh = await api.mandateSetup(token).catch(() => info);
      setDone({ last4: cleanIban(iban).slice(-4), info: fresh });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      const message = err instanceof Error && err.message ? err.message : "";
      setError(message || "Das hat leider nicht geklappt. Bitte versuchen Sie es in einem Moment noch einmal.");
      setIbanRefused(true);
    } finally {
      setBusy(null);
    }
  }

  async function startCard() {
    setError(null);
    setBusy("card");
    try {
      const { checkoutUrl } = await api.mandateSetupCheckout(token);
      window.location.href = checkoutUrl;
    } catch (err) {
      setError((err instanceof Error && err.message) || "Die Kartenzahlung konnte gerade nicht gestartet werden. Bitte versuchen Sie es noch einmal.");
      setBusy(null);
    }
  }

  if (done) return <DoneScreen info={done.info} method="directdebit" last4={done.last4} />;

  const inputCls = (bad: boolean) =>
    `block w-full min-h-[56px] rounded-2xl border-2 bg-surface px-5 py-3 text-xl text-text placeholder:text-muted/70 transition-colors focus:outline-none focus:ring-4 focus:ring-secondary/30 ${bad ? "border-danger focus:border-danger" : "border-border focus:border-navy"}`;

  return (
    <div className="space-y-6">
      {notice && (
        <div role="status" className="flex gap-3 rounded-2xl border border-warning/30 bg-warning/10 px-5 py-4 text-lg leading-relaxed text-text">
          <Info className="mt-1 h-6 w-6 shrink-0 text-warning" aria-hidden="true" />
          <p>{notice}</p>
        </div>
      )}

      {/* Begrüßung */}
      <section className={`${CARD} px-5 py-8 sm:px-10 sm:py-10`}>
        <p className={`${MICRO} mb-3 text-secondary`}>Zahlung einrichten</p>
        <h1 className="text-[2rem] leading-tight text-text sm:text-[2.6rem]">
          {info.contactName ? <>Guten Tag, {info.contactName}!</> : <>Guten Tag!</>}
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-text/80">
          <strong className="font-semibold text-text">{info.creditorName}</strong> bittet Sie, einmalig festzulegen, wie die vereinbarten Beträge bezahlt werden. Das dauert nur zwei Minuten.
        </p>
        {(info.description || info.amountText) && (
          <dl className="mt-6 space-y-4 rounded-2xl bg-background p-5">
            {info.description && (
              <div>
                <dt className={`${MICRO} text-muted`}>Wofür</dt>
                <dd className="mt-1 text-lg font-medium text-text">{info.description}</dd>
              </div>
            )}
            {info.amountText && (
              <div>
                <dt className={`${MICRO} text-muted`}>Betrag</dt>
                <dd className="mt-1 text-2xl font-semibold text-text">{info.amountText}</dd>
              </div>
            )}
            <div>
              <dt className={`${MICRO} text-muted`}>Kunde</dt>
              <dd className="mt-1 text-lg text-text">{info.customerName}</dd>
            </div>
          </dl>
        )}
      </section>

      {error && (
        <div ref={errorRef} tabIndex={-1} role="alert" className="rounded-2xl border-2 border-danger/30 bg-danger/5 px-5 py-4 text-lg leading-relaxed text-text focus:outline-none">
          <p className="flex gap-3"><AlertTriangle className="mt-1 h-6 w-6 shrink-0 text-danger" aria-hidden="true" /><span>{error}</span></p>
          {ibanRefused && hasCard && (
            <div className="mt-4 border-t border-danger/20 pt-4">
              <p className="text-base text-text/80">Kein Problem – Sie können stattdessen ganz einfach mit Ihrer Kreditkarte bezahlen.</p>
              <button type="button" onClick={() => cardRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })} className={`mt-3 inline-flex min-h-[48px] items-center gap-2 rounded-full bg-secondary/15 px-5 text-base font-semibold text-navy hover:bg-secondary/25 dark:text-text ${FOCUS}`}>
                <CreditCard className="h-5 w-5" aria-hidden="true" />Zur Kreditkarte
              </button>
            </div>
          )}
        </div>
      )}

      {/* Empfohlen: SEPA */}
      {hasIban && (
        <section className={`${CARD} relative overflow-hidden`} aria-labelledby="sepa-heading">
          <div className="flex items-center gap-3 border-b border-border bg-accent/30 px-5 py-3 sm:px-10">
            <span className={`${MICRO} rounded-full bg-navy px-3 py-1 text-[11px] text-accent`}>Empfohlen</span>
            <span className="text-base text-text">Am einfachsten</span>
          </div>
          <form onSubmit={submitIban} noValidate className="space-y-7 px-5 py-8 sm:px-10">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-navy text-accent" aria-hidden="true"><Building2 className="h-6 w-6" /></div>
              <div>
                <h2 id="sepa-heading" className="text-2xl leading-tight text-text sm:text-[1.75rem]">Mit Bankkonto (SEPA-Lastschrift)</h2>
                <p className="mt-1 text-base leading-relaxed text-muted">Der Betrag wird automatisch von Ihrem Konto abgebucht.</p>
              </div>
            </div>

            <div>
              <label htmlFor={ids.holder} className="block text-lg font-semibold text-text">Name des Kontoinhabers</label>
              <p className="mb-2 text-base text-muted">So wie er bei Ihrer Bank steht.</p>
              <input
                id={ids.holder}
                value={holder}
                onChange={e => setHolder(e.target.value)}
                autoComplete="name"
                placeholder="z. B. Maria Muster"
                aria-invalid={holderMissing || undefined}
                className={inputCls(holderMissing)}
              />
              {holderMissing && <p className="mt-2 text-base text-danger">Bitte tragen Sie den Namen des Kontoinhabers ein.</p>}
            </div>

            <div>
              <label htmlFor={ids.iban} className="block text-lg font-semibold text-text">IBAN</label>
              <p className="mb-2 text-base text-muted">Die Leerzeichen setzen wir automatisch.</p>
              <div className="relative">
                <input
                  id={ids.iban}
                  value={iban}
                  onChange={e => setIban(formatIban(e.target.value))}
                  onBlur={() => setTouched(true)}
                  inputMode="text"
                  autoCapitalize="characters"
                  autoCorrect="off"
                  spellCheck={false}
                  autoComplete="off"
                  placeholder="DE00 0000 0000 0000 0000 00"
                  aria-invalid={ibanWrong || undefined}
                  aria-describedby={ids.ibanHint}
                  className={`${inputCls(ibanWrong)} !px-4 font-mono !text-base tracking-normal sm:!pl-5 sm:!pr-14 sm:!text-xl sm:tracking-wider ${check.state === "valid" ? "border-success focus:border-success" : ""}`}
                />
                {check.state === "valid" && <CheckCircle2 className="pointer-events-none absolute right-4 top-1/2 hidden h-7 w-7 -translate-y-1/2 text-success sm:block" aria-hidden="true" />}
              </div>
              <p id={ids.ibanHint} aria-live="polite" className={`mt-2 flex gap-2 text-base leading-relaxed ${check.state === "valid" ? "font-medium text-success" : ibanWrong ? "text-danger" : "text-muted"}`}>
                {check.state === "valid" ? <Check className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" /> : ibanWrong ? <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" /> : null}
                <span>{showIbanHint || check.state === "empty" ? check.hint : ""}</span>
              </p>
            </div>

            <div>
              <p className="text-lg font-semibold text-text" id={ids.mandate}>SEPA-Lastschriftmandat</p>
              <div className="mt-2 max-h-64 overflow-y-auto rounded-2xl border border-border bg-background px-5 py-4 text-base leading-relaxed text-text/90" tabIndex={0} aria-labelledby={ids.mandate}>
                <p className="whitespace-pre-line">{info.mandateText || `Ich ermächtige ${info.creditorName}, Zahlungen von meinem Konto mittels Lastschrift einzuziehen. Zugleich weise ich mein Kreditinstitut an, die von ${info.creditorName} auf mein Konto gezogenen Lastschriften einzulösen.`}</p>
                {info.creditorId && <p className="mt-3 text-sm text-muted">Gläubiger-Identifikationsnummer: {info.creditorId}</p>}
              </div>
              <label htmlFor={ids.agree} className={`mt-4 flex min-h-[64px] cursor-pointer items-center gap-4 rounded-2xl border-2 px-5 py-4 transition-colors ${agreed ? "border-navy bg-accent/25" : agreeMissing ? "border-danger bg-danger/5" : "border-border bg-surface hover:border-navy/50"} focus-within:ring-4 focus-within:ring-secondary/30`}>
                <input
                  id={ids.agree}
                  type="checkbox"
                  checked={agreed}
                  onChange={e => setAgreed(e.target.checked)}
                  aria-invalid={agreeMissing || undefined}
                  className="h-7 w-7 shrink-0 cursor-pointer accent-navy"
                />
                <span className="text-xl font-semibold text-text">Ich stimme zu</span>
              </label>
              {agreeMissing && <p className="mt-2 text-base text-danger">Bitte setzen Sie das Häkchen bei „Ich stimme zu“.</p>}
            </div>

            <button type="submit" disabled={busy !== null} className={BTN_PRIMARY}>
              {busy === "iban" ? <><Loader2 className="h-6 w-6 animate-spin" aria-hidden="true" />Wird eingerichtet …</> : <>Lastschrift einrichten<ArrowRight className="h-6 w-6" aria-hidden="true" /></>}
            </button>
            <p className="text-center text-base leading-relaxed text-muted"><LockKeyhole className="mr-1.5 inline h-4 w-4 align-[-2px]" aria-hidden="true" />Ihre Bankdaten werden verschlüsselt übertragen.</p>
          </form>
        </section>
      )}

      {/* Alternative: Karte */}
      {hasCard && (
        <section ref={cardRef} className={`${CARD} px-5 py-8 sm:px-10`} aria-labelledby="card-heading">
          {hasIban && <p className={`${MICRO} mb-4 text-muted`}>Oder</p>}
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-secondary/15 text-secondary" aria-hidden="true"><CreditCard className="h-6 w-6" /></div>
            <div>
              <h2 id="card-heading" className="text-2xl leading-tight text-text">Mit Kreditkarte</h2>
              <p className="mt-1 text-base leading-relaxed text-muted">Sie werden zur sicheren Bezahlseite unseres Partners Mollie weitergeleitet und kommen danach automatisch hierher zurück.</p>
            </div>
          </div>
          <button type="button" onClick={startCard} disabled={busy !== null} className={`${hasIban ? BTN_SECONDARY : BTN_PRIMARY} mt-6`}>
            {busy === "card" ? <><Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />Einen Moment …</> : <><CreditCard className="h-5 w-5" aria-hidden="true" />Mit Kreditkarte fortfahren</>}
          </button>
        </section>
      )}

      {!hasIban && !hasCard && (
        <CenteredMessage tone="warning" icon={<Info className="h-10 w-10" aria-hidden="true" />} title="Gerade nicht möglich">
          <p>Die Zahlungseinrichtung ist im Moment nicht verfügbar. Bitte melden Sie sich bei uns – wir helfen Ihnen gern.</p>
        </CenteredMessage>
      )}
    </div>
  );
}

/* ───────────────────────── Page ───────────────────────── */

const POLL_DELAYS_MS = [1500, 2500, 3500, 5000, 7000];

type View =
  | { kind: "loading" }
  | { kind: "notFound" }
  | { kind: "error"; message: string; retry: boolean }
  | { kind: "checking" }
  | { kind: "ready"; info: MandateSetupInfo; notice?: string | null };

function MandateSetup() {
  const { token } = useParams<{ token: string }>();
  const params = useSearchParams();
  const returning = params.get("return") === "1";
  const [view, setView] = useState<View>({ kind: returning ? "checking" : "loading" });

  const load = useCallback(async (afterCheckout: boolean) => {
    setView({ kind: afterCheckout ? "checking" : "loading" });
    for (let attempt = 0; ; attempt++) {
      let info: MandateSetupInfo;
      try {
        info = await api.mandateSetup(token);
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) { setView({ kind: "notFound" }); return; }
        const apiText = err instanceof ApiError && err.status === 400 && err.message ? err.message : null;
        setView({ kind: "error", message: apiText || "Die Seite konnte gerade nicht geladen werden. Bitte prüfen Sie Ihre Internetverbindung und versuchen Sie es noch einmal.", retry: !apiText });
        return;
      }
      const settled = info.status === "valid" || info.status === "invalid" || !afterCheckout;
      if (settled || attempt >= POLL_DELAYS_MS.length) {
        let notice: string | null = null;
        if (info.status === "invalid") notice = "Die bisher hinterlegte Zahlungsart ist nicht mehr gültig. Bitte richten Sie die Zahlung einfach noch einmal ein.";
        else if (afterCheckout && info.status !== "valid") notice = "Die Kartenzahlung wurde noch nicht bestätigt. Falls Sie den Vorgang abgebrochen haben, versuchen Sie es einfach noch einmal – oder nutzen Sie Ihr Bankkonto.";
        setView({ kind: "ready", info, notice });
        return;
      }
      await new Promise(resolve => setTimeout(resolve, POLL_DELAYS_MS[attempt]));
    }
  }, [token]);

  useEffect(() => { void load(returning); }, [load, returning]);

  useEffect(() => {
    if (view.kind === "ready" && view.info.status === "valid") document.title = "Zahlung eingerichtet · Gentle Group";
    else document.title = "Zahlung einrichten · Gentle Group";
  }, [view]);

  if (view.kind === "loading") {
    return (
      <div className={`${CARD} flex flex-col items-center px-6 py-16 text-center`} role="status">
        <Loader2 className="h-10 w-10 animate-spin text-secondary" aria-hidden="true" />
        <p className="mt-4 text-lg text-muted">Einen Moment bitte …</p>
      </div>
    );
  }
  if (view.kind === "checking") {
    return (
      <CenteredMessage tone="neutral" icon={<Loader2 className="h-10 w-10 animate-spin" aria-hidden="true" />} eyebrow="Wird geprüft" title="Einen Moment bitte">
        <p>Wir prüfen gerade, ob Ihre Kartenzahlung angekommen ist. Bitte schließen Sie dieses Fenster noch nicht.</p>
      </CenteredMessage>
    );
  }
  if (view.kind === "notFound") {
    return (
      <CenteredMessage tone="neutral" icon={<Info className="h-10 w-10" aria-hidden="true" />} title="Link nicht gefunden">
        <p>Diesen Link kennen wir leider nicht. Bitte melden Sie sich bei uns – wir schicken Ihnen gern einen passenden Link.</p>
        <p className="text-base text-muted">Tipp: Öffnen Sie den Link am besten direkt aus unserer E-Mail.</p>
      </CenteredMessage>
    );
  }
  if (view.kind === "error") {
    return (
      <CenteredMessage tone="warning" icon={<AlertTriangle className="h-10 w-10" aria-hidden="true" />} title="Das hat gerade nicht geklappt">
        <p>{view.message}</p>
        {view.retry && <button type="button" onClick={() => void load(returning)} className={`${BTN_PRIMARY} mt-2`}>
          <RefreshCw className="h-5 w-5" aria-hidden="true" />Noch einmal versuchen
        </button>}
      </CenteredMessage>
    );
  }

  const { info } = view;
  if (info.status === "valid") {
    return <DoneScreen info={info} method={info.existingMandate?.method} last4={info.existingMandate?.accountLast4} />;
  }
  if (info.status === "processing" && !view.notice) {
    return (
      <CenteredMessage tone="neutral" icon={<Loader2 className="h-10 w-10 animate-spin" aria-hidden="true" />} eyebrow="In Bearbeitung" title="Ihre Angaben werden geprüft">
        <p>Ihre Zahlungseinrichtung ist bei uns angekommen und wird gerade von der Bank bestätigt. Sie müssen nichts weiter tun.</p>
        <button type="button" onClick={() => void load(false)} className={`${BTN_SECONDARY} mt-2`}>
          <RefreshCw className="h-5 w-5" aria-hidden="true" />Status neu laden
        </button>
      </CenteredMessage>
    );
  }
  return <SetupForm token={token} info={info} notice={view.notice} />;
}

export default function MandateSetupPage() {
  return (
    <Shell>
      <Suspense fallback={<div className={`${CARD} flex justify-center px-6 py-16`}><Loader2 className="h-10 w-10 animate-spin text-secondary" aria-hidden="true" /></div>}>
        <MandateSetup />
      </Suspense>
    </Shell>
  );
}
