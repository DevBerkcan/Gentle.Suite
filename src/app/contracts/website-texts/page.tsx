"use client";
import { Suspense, useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Copy, Download, Save } from "lucide-react";
import { api } from "@/lib/api";
import {
  LEGAL_FORMS, STATES, barrierefreiheit, datenschutz, emptyConfig, impressum, openPlaceholders, toHtml, toText, withDefaults,
  type LegalDoc, type WebsiteLegalConfig,
} from "./websiteTexts";

const input = "w-full px-3 py-2 border border-border rounded-lg text-sm bg-surface";
type Tab = "impressum" | "datenschutz" | "barrierefreiheit";

function F({ label, children, wide = false }: { label: string; children: ReactNode; wide?: boolean }) {
  return <label className={`block ${wide ? "md:col-span-2" : ""}`}><span className="block text-xs font-medium text-muted mb-1">{label}</span>{children}</label>;
}
function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />{label}</label>;
}
function Card({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="bg-surface border border-border rounded-xl p-5 mb-4">
      <h2 className="font-semibold">{title}</h2>
      {hint && <p className="text-xs text-muted mt-0.5 mb-3">{hint}</p>}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">{children}</div>
    </section>
  );
}

function Preview({ doc }: { doc: LegalDoc }) {
  return (
    <article className="text-sm leading-relaxed space-y-2">
      <h1 className="text-xl font-bold">{doc.title}</h1>
      {doc.blocks.map((b, i) => (
        <div key={i}>
          {b.h && <h2 className="font-semibold text-base mt-4">{b.h}</h2>}
          {b.h3 && <h3 className="font-semibold mt-2">{b.h3}</h3>}
          {b.p && <p className="whitespace-pre-line">{b.p}</p>}
          {b.list && <ul className="list-disc pl-5">{b.list.map((l, j) => <li key={j}>{l}</li>)}</ul>}
        </div>
      ))}
    </article>
  );
}

function WebsiteTextsPage() {
  const params = useSearchParams();
  const router = useRouter();
  const customerId = (params.get("customerId") || "").toLowerCase();
  const [customers, setCustomers] = useState<any[]>([]);
  const [cfg, setCfg] = useState<WebsiteLegalConfig>(emptyConfig());
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [tab, setTab] = useState<Tab>("impressum");
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  useEffect(() => { api.customers("pageSize=500").then((r: any) => setCustomers(r.items)).catch(() => {}); }, []);

  useEffect(() => {
    if (!customerId) return;
    setError(""); setMsg("");
    api.websiteLegal(customerId).then((r: any) => {
      if (r.config) { setCfg(withDefaults(r.config)); setSavedAt(r.updatedAt); }
      else {
        // First time for this customer: prefill from the CRM record.
        const c = emptyConfig(), p = r.prefill;
        c.provider = { ...c.provider, name: p.companyName ?? "", street: p.street ?? "", zip: p.zipCode ?? "", city: p.city ?? "", country: p.country || "Deutschland",
          representative: p.contactName ?? "", email: p.email ?? "", phone: p.phone ?? "", website: p.website ?? "", vatId: p.vatId ?? "" };
        c.a11y = { ...c.a11y, contactEmail: p.email ?? "" };
        setCfg(c); setSavedAt(null);
      }
      setDirty(false);
    }).catch((e) => setError(e?.message || "Konnte nicht geladen werden"));
  }, [customerId]);

  const docs = useMemo(() => ({ impressum: impressum(cfg), datenschutz: datenschutz(cfg), barrierefreiheit: barrierefreiheit(cfg) }), [cfg]);
  const doc = docs[tab];
  const open = openPlaceholders(doc);

  const setP = (patch: Partial<WebsiteLegalConfig["provider"]>) => { setCfg({ ...cfg, provider: { ...cfg.provider, ...patch } }); setDirty(true); };
  const setD = (patch: Partial<WebsiteLegalConfig["privacy"]>) => { setCfg({ ...cfg, privacy: { ...cfg.privacy, ...patch } }); setDirty(true); };
  const setA = (patch: Partial<WebsiteLegalConfig["a11y"]>) => { setCfg({ ...cfg, a11y: { ...cfg.a11y, ...patch } }); setDirty(true); };
  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(""), 3000); };

  async function save() {
    try { const r: any = await api.saveWebsiteLegal(customerId, cfg); setSavedAt(r.updatedAt); setDirty(false); flash("Gespeichert"); }
    catch (e: any) { setError(e?.message || "Speichern fehlgeschlagen"); }
  }
  async function copy(kind: "html" | "text") {
    await navigator.clipboard.writeText(kind === "html" ? toHtml(doc) : toText(doc));
    flash(kind === "html" ? "HTML kopiert" : "Text kopiert");
  }
  function download() {
    const html = `<!doctype html>\n<html lang="de"><head><meta charset="utf-8"><title>${doc.title}</title></head><body>\n${toHtml(doc)}\n</body></html>\n`;
    const url = URL.createObjectURL(new Blob([html], { type: "text/html" }));
    const a = document.createElement("a");
    a.href = url; a.download = `${doc.title.replace(/\W+/g, "-").toLowerCase()}-${(cfg.provider.name || "kunde").replace(/\W+/g, "-").toLowerCase()}.html`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }

  const p = cfg.provider, d = cfg.privacy, a = cfg.a11y;

  return (
    <div className="p-8 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Website-Rechtstexte</h1>
        <p className="text-sm text-muted mt-0.5">Impressum, Datenschutzerklärung und Barrierefreiheitserklärung für die Website eines Kunden. Generator-Texte auf Basis der Kundenangaben – laut Vertrag prüft der Kunde sie vor Veröffentlichung.</p>
      </div>

      <div className="flex flex-wrap items-end gap-3 mb-4">
        <F label="Kunde">
          <select value={customerId} onChange={(e) => { if (dirty && !confirm("Ungespeicherte Änderungen verwerfen?")) return; router.replace(`/contracts/website-texts?customerId=${e.target.value}`); }} className={`${input} min-w-72`}>
            <option value="">— Kunde wählen —</option>
            {customers.map((c) => <option key={c.id} value={c.id}>{c.companyName}</option>)}
          </select>
        </F>
        {customerId && <button onClick={save} disabled={!dirty} className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium disabled:opacity-50"><Save size={14} /> Speichern</button>}
        {customerId && <span className="text-xs text-muted pb-2">{dirty ? "ungespeicherte Änderungen" : savedAt ? `gespeichert am ${new Date(savedAt).toLocaleDateString("de-DE")}` : "noch nicht gespeichert – aus Kundendaten vorbefüllt"}</span>}
        {msg && <span className="text-xs text-success pb-2">{msg}</span>}
      </div>
      {error && <div className="bg-red-50 text-danger px-4 py-2 rounded-lg mb-4 text-sm">{error}</div>}

      {!customerId ? <p className="text-sm text-muted">Bitte einen Kunden wählen.</p> : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
          <div>
            <Card title="Anbieter (Impressum)" hint="Pflichtangaben nach § 5 DDG. Leere optionale Felder erscheinen nicht im Text.">
              <F label="Firma / Name *"><input value={p.name} onChange={(e) => setP({ name: e.target.value })} className={input} /></F>
              <F label="Rechtsform"><select value={p.legalForm} onChange={(e) => setP({ legalForm: e.target.value as any })} className={input}>{LEGAL_FORMS.map((f) => <option key={f}>{f}</option>)}</select></F>
              <F label="Inhaber / vertreten durch *"><input value={p.representative} onChange={(e) => setP({ representative: e.target.value })} className={input} /></F>
              <F label="Straße *"><input value={p.street} onChange={(e) => setP({ street: e.target.value })} className={input} /></F>
              <F label="PLZ *"><input value={p.zip} onChange={(e) => setP({ zip: e.target.value })} className={input} /></F>
              <F label="Ort *"><input value={p.city} onChange={(e) => setP({ city: e.target.value })} className={input} /></F>
              <F label="Telefon"><input value={p.phone} onChange={(e) => setP({ phone: e.target.value })} className={input} /></F>
              <F label="E-Mail *"><input value={p.email} onChange={(e) => setP({ email: e.target.value })} className={input} /></F>
              <F label="USt-IdNr."><input value={p.vatId} onChange={(e) => setP({ vatId: e.target.value })} className={input} /></F>
              <F label="Wirtschafts-IdNr."><input value={p.wirtschaftsId} onChange={(e) => setP({ wirtschaftsId: e.target.value })} className={input} /></F>
              <F label="Registergericht"><input value={p.registerCourt} onChange={(e) => setP({ registerCourt: e.target.value })} placeholder="z. B. Amtsgericht Düsseldorf" className={input} /></F>
              <F label="Registernummer"><input value={p.registerNumber} onChange={(e) => setP({ registerNumber: e.target.value })} placeholder="z. B. HRB 12345" className={input} /></F>
              <F label="Aufsichtsbehörde (bei erlaubnispflichtiger Tätigkeit)" wide><input value={p.supervisoryAuthority} onChange={(e) => setP({ supervisoryAuthority: e.target.value })} className={input} /></F>
              <F label="Berufsbezeichnung (reglementierte Berufe)"><input value={p.professionTitle} onChange={(e) => setP({ professionTitle: e.target.value })} className={input} /></F>
              <F label="Kammer"><input value={p.chamber} onChange={(e) => setP({ chamber: e.target.value })} className={input} /></F>
              <F label="Berufsrechtliche Regelungen" wide><input value={p.professionRules} onChange={(e) => setP({ professionRules: e.target.value })} className={input} /></F>
              <F label="Berufshaftpflichtversicherung (Versicherer, Geltungsraum)" wide><input value={p.liabilityInsurance} onChange={(e) => setP({ liabilityInsurance: e.target.value })} className={input} /></F>
              <F label="Verantwortlich nach § 18 Abs. 2 MStV (bei Blog/News)" wide><input value={p.contentResponsible} onChange={(e) => setP({ contentResponsible: e.target.value })} placeholder="Name, Anschrift" className={input} /></F>
            </Card>

            <Card title="Datenschutz" hint="Nur ankreuzen, was auf der Website tatsächlich eingesetzt wird.">
              <F label="Bundesland (Aufsichtsbehörde)"><select value={d.state} onChange={(e) => setD({ state: e.target.value })} className={input}>{Object.keys(STATES).map((k) => <option key={k} value={k}>{k} – {STATES[k]}</option>)}</select></F>
              <F label="Datenschutzbeauftragter (falls benannt)"><input value={d.dpo} onChange={(e) => setD({ dpo: e.target.value })} className={input} /></F>
              <F label="Hosting-Anbieter *"><input value={d.hostingName} onChange={(e) => setD({ hostingName: e.target.value })} placeholder="z. B. IONOS SE" className={input} /></F>
              <F label="Anschrift des Hosters"><input value={d.hostingAddress} onChange={(e) => setD({ hostingAddress: e.target.value })} className={input} /></F>
              <Check label="Hoster überträgt Daten außerhalb der EU (z. B. Vercel)" checked={d.hostingOutsideEu} onChange={(v) => setD({ hostingOutsideEu: v })} />
              <Check label="Kontaktformular" checked={d.contactForm} onChange={(v) => setD({ contactForm: v })} />
              <Check label="Kontakt per E-Mail/Telefon" checked={d.emailPhone} onChange={(v) => setD({ emailPhone: v })} />
              <Check label="Schriften lokal eingebunden" checked={d.localFonts} onChange={(v) => setD({ localFonts: v })} />
              <Check label="Google Analytics 4" checked={d.ga4} onChange={(v) => setD({ ga4: v })} />
              <Check label="Matomo" checked={d.matomo} onChange={(v) => setD({ matomo: v })} />
              <Check label="Microsoft Clarity" checked={d.clarity} onChange={(v) => setD({ clarity: v })} />
              <Check label="Google Maps" checked={d.maps} onChange={(v) => setD({ maps: v })} />
              <Check label="YouTube-Videos" checked={d.youtube} onChange={(v) => setD({ youtube: v })} />
              <Check label="Links zu Social Media" checked={d.socialLinks} onChange={(v) => setD({ socialLinks: v })} />
              <Check label="Bewerbungen" checked={d.applications} onChange={(v) => setD({ applications: v })} />
              <F label="Cookie-Consent-Tool"><input value={d.consentTool} onChange={(e) => setD({ consentTool: e.target.value })} placeholder="z. B. Cookiebot, Borlabs" className={input} /></F>
              <F label="Newsletter-Anbieter"><input value={d.newsletterProvider} onChange={(e) => setD({ newsletterProvider: e.target.value })} placeholder="z. B. Brevo" className={input} /></F>
              <F label="Terminbuchung"><input value={d.bookingProvider} onChange={(e) => setD({ bookingProvider: e.target.value })} placeholder="z. B. Calendly" className={input} /></F>
              <F label="Zahlungsanbieter"><input value={d.paymentProviders} onChange={(e) => setD({ paymentProviders: e.target.value })} placeholder="z. B. PayPal, Stripe" className={input} /></F>
              <F label="Weitere Verarbeitungen (freier Text)" wide><textarea value={d.extra} onChange={(e) => setD({ extra: e.target.value })} rows={2} className={input} /></F>
            </Card>

            <Card title="Barrierefreiheit (BFSG)" hint="Pflicht für Dienstleistungen im elektronischen Geschäftsverkehr mit Verbrauchern. Ausgenommen sind Kleinstunternehmen (unter 10 Beschäftigte und max. 2 Mio. € Umsatz oder Bilanzsumme).">
              <F label="Dienstleistung" wide><input value={a.service} onChange={(e) => setA({ service: e.target.value })} placeholder="z. B. den Online-Shop unter www.beispiel.de" className={input} /></F>
              <F label="Stand"><select value={a.status} onChange={(e) => setA({ status: e.target.value as any })} className={input}><option value="full">Vollständig barrierefrei</option><option value="partial">Teilweise barrierefrei</option></select></F>
              <F label="Datum der Erklärung"><input type="date" value={a.date} onChange={(e) => setA({ date: e.target.value })} className={input} /></F>
              <F label="Umgesetzte Maßnahmen" wide><textarea value={a.measures} onChange={(e) => setA({ measures: e.target.value })} rows={2} placeholder="z. B. Tastaturbedienung, Alternativtexte, ausreichende Kontraste" className={input} /></F>
              {a.status === "partial" && <F label="Bekannte Einschränkungen" wide><textarea value={a.limitations} onChange={(e) => setA({ limitations: e.target.value })} rows={2} className={input} /></F>}
              <F label="Feedback-E-Mail"><input value={a.contactEmail} onChange={(e) => setA({ contactEmail: e.target.value })} className={input} /></F>
              <F label="Feedback-Telefon"><input value={a.contactPhone} onChange={(e) => setA({ contactPhone: e.target.value })} className={input} /></F>
            </Card>
          </div>

          <div className="xl:sticky xl:top-4">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              {([["impressum", "Impressum"], ["datenschutz", "Datenschutz"], ["barrierefreiheit", "Barrierefreiheit"]] as [Tab, string][]).map(([k, l]) => (
                <button key={k} onClick={() => setTab(k)} className={`px-3 py-1.5 rounded-lg text-sm ${tab === k ? "bg-primary text-white" : "border border-border"}`}>{l}</button>
              ))}
              <span className="flex-1" />
              <button onClick={() => copy("html")} className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-border rounded-lg text-sm"><Copy size={14} /> HTML</button>
              <button onClick={() => copy("text")} className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-border rounded-lg text-sm"><Copy size={14} /> Text</button>
              <button onClick={download} className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-border rounded-lg text-sm"><Download size={14} /> .html</button>
            </div>
            {open.length > 0 && <div className="mb-3 rounded-lg bg-orange-50 px-3 py-2 text-sm text-orange-700">Noch offen: {Array.from(new Set(open)).join(", ")}</div>}
            <div className="bg-surface border border-border rounded-xl p-6 max-h-[80vh] overflow-auto"><Preview doc={doc} /></div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Page() {
  return <Suspense fallback={<div className="p-8 text-muted">Lädt...</div>}><WebsiteTextsPage /></Suspense>;
}
