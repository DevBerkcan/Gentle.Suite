"use client";
import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import SignaturePad, { SignaturePadHandle } from "@/app/components/SignaturePad";
import { BTN_PRIMARY, CARD, FOCUS, INPUT, MICRO, Message, PublicLegalShell, fmtDate } from "../../PublicLegalShell";

type Choice = "accepted" | "accepted-with-reservations" | "declined";

const CHOICES: { value: Choice; title: string; text: string }[] = [
  { value: "accepted", title: "Abnehmen", text: "Die Leistungen sind vertragsgemäß erbracht." },
  { value: "accepted-with-reservations", title: "Abnehmen mit Vorbehalt", text: "Im Wesentlichen in Ordnung, kleinere Punkte sollen noch behoben werden." },
  { value: "declined", title: "Abnahme verweigern", text: "Es gibt wesentliche Mängel. Bitte nennen Sie diese unten." },
];

const RESULT_LABEL: Record<string, string> = {
  accepted: "Die Leistungen wurden abgenommen.",
  "accepted-with-reservations": "Die Leistungen wurden mit Vorbehalten abgenommen.",
  declined: "Die Abnahme wurde verweigert. Wir melden uns zu den genannten Mängeln.",
};

export default function AcceptancePage() {
  const { token } = useParams() as { token: string };
  const [info, setInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [invalid, setInvalid] = useState(false);
  const [choice, setChoice] = useState<Choice>("accepted");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [remarks, setRemarks] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [doneResult, setDoneResult] = useState<string | null>(null);
  const padRef = useRef<SignaturePadHandle>(null);

  useEffect(() => {
    api.publicAcceptance(token)
      .then(d => { setInfo(d); setName(d.contactName || ""); setEmail(d.contactEmail || ""); })
      .catch(() => setInvalid(true))
      .finally(() => setLoading(false));
  }, [token]);

  async function submit() {
    setError("");
    if (!name.trim() || !email.trim()) { setError("Bitte geben Sie Ihren Namen und Ihre E-Mail-Adresse an."); return; }
    if (choice !== "accepted" && !remarks.trim()) { setError(choice === "declined" ? "Bitte nennen Sie die wesentlichen Mängel." : "Bitte beschreiben Sie Ihre Vorbehalte."); return; }
    const signatureData = choice === "declined" ? null : padRef.current?.getDataUrl();
    if (choice !== "declined" && !signatureData) { setError("Bitte unterschreiben Sie im Feld."); return; }
    setSubmitting(true);
    try {
      await api.processPublicAcceptance(token, { result: choice, name, email, remarks: remarks || null, signatureData });
      setDoneResult(choice);
    } catch (e: any) {
      setError(e?.message || "Ihre Rückmeldung konnte nicht gespeichert werden.");
    } finally { setSubmitting(false); }
  }

  const result = doneResult ?? info?.result;

  return (
    <PublicLegalShell subtitle="Abnahmeprotokoll">
      {loading ? (
        <div className="flex justify-center py-20 text-muted"><Loader2 className="h-8 w-8 animate-spin" aria-label="Lädt" /></div>
      ) : invalid ? (
        <Message tone="danger" title="Link nicht gültig"><p>Dieser Link ist ungültig oder abgelaufen. Bitte melden Sie sich kurz bei uns.</p></Message>
      ) : result ? (
        <Message tone={result === "declined" ? "neutral" : "success"} title="Vielen Dank für Ihre Rückmeldung">
          <p>{RESULT_LABEL[result]}</p>
          {info?.respondedAt && !doneResult && <p className="text-sm text-muted">Erklärt am {fmtDate(info.respondedAt)} von {info.byName}.</p>}
        </Message>
      ) : (
        <div className="space-y-6">
          <section className={`${CARD} px-6 py-8 sm:px-10`}>
            <p className={`${MICRO} text-muted`}>{info.customerName} · {info.quoteNumber}</p>
            <h1 className="mt-2 text-2xl leading-tight text-text sm:text-3xl">Abnahme „{info.projectTitle}“</h1>
            <dl className="mt-5 grid gap-3 rounded-2xl bg-background p-5 text-[15px] sm:grid-cols-[auto_1fr] sm:gap-x-6">
              <dt className="text-muted">Umfang</dt><dd className="font-medium">{info.scope}</dd>
              <dt className="text-muted">Frist</dt><dd className="font-medium">bis {fmtDate(info.deadline)}</dd>
            </dl>
            <div className="mt-5 whitespace-pre-wrap text-[15px] leading-relaxed text-text/90">{info.text}</div>
          </section>

          <section className={`${CARD} space-y-5 px-6 py-8 sm:px-10`}>
            <fieldset className="space-y-3">
              <legend className="mb-2 text-base font-semibold">Ihre Erklärung</legend>
              {CHOICES.map(c => (
                <label key={c.value} className={`flex cursor-pointer items-start gap-3 rounded-2xl border-2 px-4 py-3 ${choice === c.value ? "border-navy bg-navy/5" : "border-border"} ${FOCUS}`}>
                  <input type="radio" name="choice" value={c.value} checked={choice === c.value} onChange={() => setChoice(c.value)} className="mt-1 h-5 w-5 shrink-0 accent-navy" />
                  <span><span className="block font-semibold">{c.title}</span><span className="text-sm text-muted">{c.text}</span></span>
                </label>
              ))}
            </fieldset>
            {choice !== "accepted" && (
              <label className="block text-sm font-medium">{choice === "declined" ? "Wesentliche Mängel" : "Vorbehalte / offene Punkte"}
                <textarea value={remarks} onChange={e => setRemarks(e.target.value)} rows={4} className={`${INPUT} mt-1`} />
              </label>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-medium">Vor- und Nachname<input value={name} onChange={e => setName(e.target.value)} className={`${INPUT} mt-1`} autoComplete="name" /></label>
              <label className="block text-sm font-medium">E-Mail-Adresse<input type="email" value={email} onChange={e => setEmail(e.target.value)} className={`${INPUT} mt-1`} autoComplete="email" /></label>
            </div>
            {choice !== "declined" && (
              <div><p className="mb-1 text-sm font-medium">Unterschrift</p><SignaturePad ref={padRef} /></div>
            )}
            {error && <p role="alert" className="rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">{error}</p>}
            <button onClick={submit} disabled={submitting} className={BTN_PRIMARY}>
              {submitting ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : null}
              {choice === "declined" ? "Abnahme verweigern" : "Abnahme verbindlich erklären"}
            </button>
          </section>
        </div>
      )}
    </PublicLegalShell>
  );
}
