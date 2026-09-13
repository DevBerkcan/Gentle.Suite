"use client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";

const CATEGORY_LABELS: Record<string, string> = {
  webseiten: "Webseiten",
  design: "Design",
  marketing: "Marketing",
  wartung: "Wartung & Pflege",
};
const KNOWN_CATEGORY_ORDER = ["webseiten", "design", "marketing", "wartung"];
const RESERVED_CATEGORIES = ["kern", "kreativ", "optionen"];

function ContractWizard() {
  const params = useSearchParams();
  const router = useRouter();
  const quoteId = params.get("quoteId") || undefined;
  const subscriptionId = params.get("subscriptionId") || undefined;

  const [preview, setPreview] = useState<any>(null);
  const [templates, setTemplates] = useState<any[]>([]);
  const [blocks, setBlocks] = useState<any[]>([]);
  const [step, setStep] = useState(1);
  const [error, setError] = useState("");
  const [loadError, setLoadError] = useState("");
  const [creating, setCreating] = useState(false);

  const [verguetungBetrag, setVerguetungBetrag] = useState(0);
  const [verguetungAnmerkung, setVerguetungAnmerkung] = useState("");
  const [zahlungsfristTage, setZahlungsfristTage] = useState(14);
  const [hatFesteLaufzeit, setHatFesteLaufzeit] = useState(false);
  const [laufzeitMonate, setLaufzeitMonate] = useState(12);
  const [kuendigungsfristMonate, setKuendigungsfristMonate] = useState(3);
  const [optionaleKlauselKeys, setOptionaleKlauselKeys] = useState<string[]>([]);

  const [schnellstartTemplateId, setSchnellstartTemplateId] = useState("");
  const [leistungsBlockKeys, setLeistungsBlockKeys] = useState<string[]>([]);

  useEffect(() => {
    if (!quoteId && !subscriptionId) { setLoadError("Kein Angebot oder Abonnement angegeben."); return; }
    Promise.all([
      api.contractPartyPreview({ quoteId, subscriptionId }),
      api.contractTemplates(),
      api.contractClauseBlocks(),
    ]).then(([p, tpl, bl]) => {
      setPreview(p);
      setVerguetungBetrag(p.suggestedBetrag);
      setTemplates((tpl || []).filter((t: any) => t.isActive));
      setBlocks((bl || []).filter((b: any) => b.isActive));
    }).catch(() => setLoadError("Daten konnten nicht geladen werden."));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggleOption(key: string) {
    setOptionaleKlauselKeys(cur => cur.includes(key) ? cur.filter(k => k !== key) : [...cur, key]);
  }
  function toggleLeistung(key: string) {
    setLeistungsBlockKeys(cur => cur.includes(key) ? cur.filter(k => k !== key) : [...cur, key]);
  }

  function applySchnellstart(templateId: string) {
    setSchnellstartTemplateId(templateId);
    const tpl = templates.find(t => t.id === templateId);
    if (tpl?.defaultBlockKeys?.length) setLeistungsBlockKeys(tpl.defaultBlockKeys);
  }

  async function submit() {
    setCreating(true);
    setError("");
    try {
      const contract = await api.generateAgencyContract({
        quoteId: quoteId || null,
        subscriptionId: subscriptionId || null,
        verguetungBetrag,
        verguetungAnmerkung: verguetungAnmerkung || null,
        zahlungsfristTage,
        hatFesteLaufzeit,
        laufzeitMonate: hatFesteLaufzeit ? laufzeitMonate : null,
        kuendigungsfristMonate: hatFesteLaufzeit ? kuendigungsfristMonate : null,
        optionaleKlauselKeys,
        leistungsBlockKeys,
        schnellstartTemplateId: schnellstartTemplateId || null,
      });
      router.push(`/contracts/${contract.id}`);
    } catch (e: any) {
      setError(e?.message || "Vertrag konnte nicht angelegt werden.");
      setCreating(false);
    }
  }

  if (loadError) return <div className="p-8 text-danger text-sm">{loadError}</div>;
  if (!preview) return <div className="p-8 text-muted text-sm">Lädt...</div>;

  const optionenBlocks = blocks.filter(b => b.category === "optionen");
  const leistungsCategories = Array.from(new Set(blocks.filter(b => !RESERVED_CATEGORIES.includes(b.category)).map(b => b.category)));
  const orderedCategories = [
    ...KNOWN_CATEGORY_ORDER.filter(c => leistungsCategories.includes(c)),
    ...leistungsCategories.filter(c => !KNOWN_CATEGORY_ORDER.includes(c)).sort(),
  ];
  const leistungsByCategory = orderedCategories.map(cat => ({
    cat,
    label: CATEGORY_LABELS[cat] || cat.charAt(0).toUpperCase() + cat.slice(1),
    items: blocks.filter(b => b.category === cat),
  }));

  return (
    <div className="p-8 max-w-3xl">
      <h1 className="text-2xl font-bold mb-1">Neuer Vertrag</h1>
      <p className="text-sm text-muted mb-6">Nur die Rahmenbedingungen und Leistungen ausfüllen — Kunden- und Firmendaten werden automatisch übernommen.</p>

      <div className="bg-surface border border-border rounded-xl p-4 mb-6 text-sm">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted uppercase tracking-wide mb-1">Auftragnehmer</p>
            <p className="font-medium">{preview.auftragnehmerName}</p>
            <p className="text-muted text-xs">{preview.auftragnehmerAdresse}</p>
          </div>
          <div>
            <p className="text-xs text-muted uppercase tracking-wide mb-1">Auftraggeber</p>
            <p className="font-medium">{preview.auftraggeberName}</p>
            <p className="text-muted text-xs">{preview.auftraggeberAdresse}</p>
            {preview.auftraggeberAnsprechpartner && <p className="text-muted text-xs">Ansprechpartner: {preview.auftraggeberAnsprechpartner}</p>}
          </div>
        </div>
      </div>

      {error && <div className="bg-red-50 text-danger px-4 py-2 rounded-lg mb-4 text-sm">{error}</div>}

      <div className="flex items-center gap-2 mb-6 text-xs">
        <span className={`px-2 py-1 rounded-full ${step === 1 ? "bg-primary text-white" : "bg-gray-100 text-muted"}`}>1. Rahmenbedingungen</span>
        <span className="text-muted">→</span>
        <span className={`px-2 py-1 rounded-full ${step === 2 ? "bg-primary text-white" : "bg-gray-100 text-muted"}`}>2. Leistungen</span>
      </div>

      {step === 1 && (
        <div className="bg-surface border border-border rounded-xl p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Vergütung ({preview.suggestedBetragLabel})</label>
              <input type="number" step="0.01" value={verguetungBetrag} onChange={e => setVerguetungBetrag(parseFloat(e.target.value) || 0)} className="w-full px-3 py-2 border border-border rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Zahlungsfrist (Tage)</label>
              <input type="number" value={zahlungsfristTage} onChange={e => setZahlungsfristTage(parseInt(e.target.value) || 14)} className="w-full px-3 py-2 border border-border rounded-lg" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Anmerkung zur Vergütung (optional)</label>
            <input value={verguetungAnmerkung} onChange={e => setVerguetungAnmerkung(e.target.value)} placeholder="z. B. Pauschal, zzgl. MwSt." className="w-full px-3 py-2 border border-border rounded-lg" />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Laufzeit</label>
            <div className="flex gap-1 bg-background border border-border rounded-lg p-1 mb-2">
              <button type="button" onClick={() => setHatFesteLaufzeit(false)} className={`flex-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${!hatFesteLaufzeit ? "bg-surface shadow-sm text-text" : "text-muted hover:text-text"}`}>Projektbezogen</button>
              <button type="button" onClick={() => setHatFesteLaufzeit(true)} className={`flex-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${hatFesteLaufzeit ? "bg-surface shadow-sm text-text" : "text-muted hover:text-text"}`}>Feste Laufzeit</button>
            </div>
            {hatFesteLaufzeit && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-muted mb-1">Laufzeit (Monate)</label>
                  <input type="number" value={laufzeitMonate} onChange={e => setLaufzeitMonate(parseInt(e.target.value) || 12)} className="w-full px-3 py-2 border border-border rounded-lg" />
                </div>
                <div>
                  <label className="block text-xs text-muted mb-1">Kündigungsfrist (Monate)</label>
                  <input type="number" value={kuendigungsfristMonate} onChange={e => setKuendigungsfristMonate(parseInt(e.target.value) || 3)} className="w-full px-3 py-2 border border-border rounded-lg" />
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Optionale Regelungen</label>
            <div className="grid grid-cols-2 gap-2">
              {optionenBlocks.map(b => (
                <label key={b.key} className="flex items-center gap-2 text-sm border border-border rounded-lg px-3 py-2 cursor-pointer hover:bg-background">
                  <input type="checkbox" checked={optionaleKlauselKeys.includes(b.key)} onChange={() => toggleOption(b.key)} />
                  {b.title}
                </label>
              ))}
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button onClick={() => setStep(2)} className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-hover">Weiter</button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="bg-surface border border-border rounded-xl p-6 space-y-5">
          {templates.length > 0 && (
            <div>
              <label className="block text-sm font-medium mb-1">Schnellstart (optional)</label>
              <select value={schnellstartTemplateId} onChange={e => applySchnellstart(e.target.value)} className="w-full px-3 py-2 border border-border rounded-lg">
                <option value="">Keine Vorauswahl</option>
                {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              <p className="text-xs text-muted mt-1">Wählt passende Leistungen unten automatisch vor — danach frei anpassbar.</p>
            </div>
          )}

          {leistungsByCategory.map(g => (
            <div key={g.cat}>
              <label className="block text-sm font-medium mb-2">{g.label}</label>
              <div className="grid grid-cols-2 gap-2">
                {g.items.map(b => (
                  <label key={b.key} className={`flex items-center gap-2 text-sm border rounded-lg px-3 py-2 cursor-pointer ${leistungsBlockKeys.includes(b.key) ? "border-primary bg-primary/5" : "border-border hover:bg-background"}`}>
                    <input type="checkbox" checked={leistungsBlockKeys.includes(b.key)} onChange={() => toggleLeistung(b.key)} />
                    {b.title.replace(/^Spezifizierte Leistungen: /, "")}
                  </label>
                ))}
              </div>
            </div>
          ))}

          <div className="flex justify-between pt-2">
            <button onClick={() => setStep(1)} className="px-4 py-2 border border-border rounded-lg text-sm font-medium hover:bg-background">Zurück</button>
            <button onClick={submit} disabled={creating || leistungsBlockKeys.length === 0} className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-hover disabled:opacity-50">
              {creating ? "Wird angelegt..." : "Vertrag erstellen"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ContractWizardPage() {
  return (
    <Suspense fallback={<div className="p-8 text-muted text-sm">Lädt...</div>}>
      <ContractWizard />
    </Suspense>
  );
}
