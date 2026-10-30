"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { BTN_PRIMARY, CARD, INPUT, MICRO, Message, PublicLegalShell, fmtDate } from "../../PublicLegalShell";

export default function RightsReleasePage() {
  const { token } = useParams() as { token: string };
  const [info, setInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [invalid, setInvalid] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [reference, setReference] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    api.publicRightsRelease(token)
      .then(d => { setInfo(d); setName(d.contactName || ""); setEmail(d.contactEmail || ""); })
      .catch(() => setInvalid(true))
      .finally(() => setLoading(false));
  }, [token]);

  async function submit() {
    setError("");
    if (!name.trim() || !email.trim()) { setError("Bitte geben Sie Ihren Namen und Ihre E-Mail-Adresse an."); return; }
    if (!confirm) { setError("Bitte bestätigen Sie die Erklärung."); return; }
    setSubmitting(true);
    try {
      await api.confirmPublicRightsRelease(token, { name, email, confirm, referenceConsent: reference });
      setDone(true);
    } catch (e: any) {
      setError(e?.message || "Die Freigabe konnte nicht gespeichert werden.");
    } finally { setSubmitting(false); }
  }

  return (
    <PublicLegalShell subtitle="Freigabe der Nutzungsrechte">
      {loading ? (
        <div className="flex justify-center py-20 text-muted"><Loader2 className="h-8 w-8 animate-spin" aria-label="Lädt" /></div>
      ) : invalid ? (
        <Message tone="danger" title="Link nicht gültig"><p>Dieser Link ist ungültig oder abgelaufen. Bitte melden Sie sich kurz bei uns, dann senden wir Ihnen einen neuen.</p></Message>
      ) : done || info.alreadyConfirmed ? (
        <Message tone="success" title="Vielen Dank – die Freigabe liegt uns vor">
          <p>{info.alreadyConfirmed ? <>Bestätigt am {fmtDate(info.confirmedAt)} von {info.confirmedByName}.</> : <>Ihre Bestätigung wurde gespeichert. Sie müssen nichts weiter tun.</>}</p>
        </Message>
      ) : (
        <div className="space-y-6">
          <section className={`${CARD} px-6 py-8 sm:px-10`}>
            <p className={`${MICRO} text-muted`}>{info.customerName} · {info.quoteNumber}</p>
            <h1 className="mt-2 text-2xl leading-tight text-text sm:text-3xl">Rechte an Ihren Inhalten für „{info.projectTitle}“</h1>
            <p className="mt-3 text-base leading-relaxed text-text/80">Damit wir Ihre Texte, Bilder und Logos rechtssicher verwenden dürfen, bestätigen Sie bitte die folgende Erklärung.</p>
            <div className="mt-6 whitespace-pre-wrap rounded-2xl bg-background p-5 text-[15px] leading-relaxed text-text">{info.text}</div>
          </section>

          <section className={`${CARD} space-y-4 px-6 py-8 sm:px-10`}>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-medium">Vor- und Nachname<input value={name} onChange={e => setName(e.target.value)} className={`${INPUT} mt-1`} autoComplete="name" /></label>
              <label className="block text-sm font-medium">E-Mail-Adresse<input type="email" value={email} onChange={e => setEmail(e.target.value)} className={`${INPUT} mt-1`} autoComplete="email" /></label>
            </div>
            <label className="flex items-start gap-3 text-base leading-relaxed">
              <input type="checkbox" checked={confirm} onChange={e => setConfirm(e.target.checked)} className="mt-1 h-5 w-5 shrink-0 accent-navy" />
              <span>Ich bestätige die obige Erklärung und bin berechtigt, sie für {info.customerName} abzugeben.</span>
            </label>
            <label className="flex items-start gap-3 text-base leading-relaxed text-text/80">
              <input type="checkbox" checked={reference} onChange={e => setReference(e.target.checked)} className="mt-1 h-5 w-5 shrink-0 accent-navy" />
              <span>{info.providerName} darf das fertige Projekt als Referenz (z. B. im Portfolio) zeigen. <span className="text-muted">(freiwillig)</span></span>
            </label>
            {error && <p role="alert" className="rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">{error}</p>}
            <button onClick={submit} disabled={submitting} className={BTN_PRIMARY}>
              {submitting ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : null}Freigabe bestätigen
            </button>
          </section>
        </div>
      )}
    </PublicLegalShell>
  );
}
