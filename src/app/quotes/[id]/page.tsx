"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";

const statusMap: Record<string, { label: string; cls: string }> = {
  Draft: { label: "Entwurf", cls: "bg-gray-100 text-muted" },
  Sent: { label: "Gesendet", cls: "bg-blue-50 text-blue-700" },
  Viewed: { label: "Angesehen", cls: "bg-blue-50 text-blue-700" },
  Accepted: { label: "Angenommen", cls: "bg-green-50 text-success" },
  Ordered: { label: "Auftrag", cls: "bg-purple-50 text-purple-700" },
  Rejected: { label: "Abgelehnt", cls: "bg-red-50 text-danger" },
  Expired: { label: "Abgelaufen", cls: "bg-yellow-50 text-warning" },
};

const sigMap: Record<string, { label: string; cls: string }> = {
  Pending: { label: "Ausstehend", cls: "bg-gray-100 text-muted" },
  Signed: { label: "Unterschrieben", cls: "bg-green-50 text-success" },
  Declined: { label: "Abgelehnt", cls: "bg-red-50 text-danger" },
};

function asQuoteStatus(value: any) {
  if (typeof value === "number") {
    return ["Draft", "Sent", "Viewed", "Accepted", "Rejected", "Expired", "Ordered"][value] || String(value);
  }
  return value || "";
}

function asSignatureStatus(value: any) {
  if (typeof value === "number") {
    return ["Pending", "Signed", "Declined"][value] || String(value);
  }
  return value || "";
}

function asLineType(value: any) {
  if (typeof value === "number") {
    return ["OneTime", "RecurringMonthly"][value] || String(value);
  }
  return value || "";
}

function toTaxModeNumber(value: any) {
  if (typeof value === "number") return value;
  if (value === "SmallBusiness") return 1;
  if (value === "ReverseCharge") return 2;
  return 0;
}

function formatDeAmount(v: number) {
  return (Number.isFinite(v) ? v : 0).toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function parseDeAmount(s: string): number {
  const cleaned = s.trim().replace(/\./g, "").replace(",", ".").replace(/[^\d.-]/g, "");
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
}

function PriceInput({ value, onChange, className }: { value: number; onChange: (v: number) => void; className?: string }) {
  const [text, setText] = useState(() => formatDeAmount(value));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setText(formatDeAmount(value));
  }, [value, focused]);

  return (
    <input
      type="text"
      inputMode="decimal"
      value={text}
      onFocus={() => { setFocused(true); setText(value ? String(value).replace(".", ",") : ""); }}
      onChange={e => setText(e.target.value)}
      onBlur={() => { const n = parseDeAmount(text); setFocused(false); setText(formatDeAmount(n)); onChange(n); }}
      className={className}
    />
  );
}

export default function QuoteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [quote, setQuote] = useState<any>(null);
  const [lines, setLines] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [versions, setVersions] = useState<any[]>([]);
  const [paymentTermCatalog, setPaymentTermCatalog] = useState<any[]>([]);
  const [editing, setEditing] = useState(false);
  const [editingHeader, setEditingHeader] = useState(false);
  const [headerForm, setHeaderForm] = useState({ subject: "", introText: "", outroText: "", notes: "", taxMode: "Standard", taxRate: 19, paymentTermKeys: [] as string[] });
  const [showSend, setShowSend] = useState(false);
  const [sendForm, setSendForm] = useState({ recipientEmail: "", message: "", requireSignature: true, expirationDays: 30 });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (!id) return;
    loadQuote();
    api.services().then(setCategories).catch(() => {});
    api.plans().then(setPlans).catch(() => {});
    api.paymentTerms().then(setPaymentTermCatalog).catch(() => {});
  }, [id]);

  function loadQuote() {
    api.quote(id).then(q => {
      setQuote(q);
      setLines((q.lines || []).map((l: any) => ({ ...l, lineType: asLineType(l.lineType) })));
      if (asQuoteStatus(q.status) === "Draft" && (!q.lines || q.lines.length === 0)) setEditing(true);
    }).catch(() => setError("Angebot nicht gefunden"));
    api.quoteVersions(id).then(setVersions).catch(() => {});
  }

  function addLine() {
    setLines([...lines, { title: "", description: "", quantity: 1, unitPrice: 0, discountPercent: 0, vatPercent: 19, lineType: "OneTime", sortOrder: lines.length }]);
  }

  function removeLine(idx: number) {
    setLines(lines.filter((_, i) => i !== idx));
  }

  function updateLine(idx: number, field: string, value: any) {
    const updated = [...lines];
    updated[idx] = { ...updated[idx], [field]: value };
    setLines(updated);
  }

  function addLineFromService(svc: any) {
    setLines([...lines, {
      serviceCatalogItemId: svc.id,
      subscriptionPlanId: null,
      title: svc.name,
      description: svc.description || "",
      quantity: 1,
      unitPrice: svc.defaultPrice || 0,
      discountPercent: 0,
      vatPercent: 19,
      lineType: svc.defaultLineType || "OneTime",
      sortOrder: lines.length,
    }]);
  }

  function addLineFromPlan(plan: any) {
    setLines([...lines, {
      serviceCatalogItemId: null,
      subscriptionPlanId: plan.id,
      title: plan.name,
      description: plan.description || "",
      quantity: 1,
      unitPrice: plan.monthlyPrice || 0,
      discountPercent: 0,
      vatPercent: 19,
      lineType: "RecurringMonthly",
      sortOrder: lines.length,
    }]);
  }

  function addItemFromValue(value: string) {
    if (!value) return;
    if (value.startsWith("plan:")) {
      const plan = plans.find((p: any) => p.id === value.slice(5));
      if (plan) addLineFromPlan(plan);
      return;
    }
    const svc = categories.flatMap((c: any) => c.items || []).find((i: any) => i.id === value);
    if (svc) addLineFromService(svc);
  }

  function selectItemForLine(idx: number, value: string) {
    const updated = [...lines];
    if (!value) { updated[idx] = { ...updated[idx], serviceCatalogItemId: null, subscriptionPlanId: null }; setLines(updated); return; }
    if (value.startsWith("plan:")) {
      const plan = plans.find((p: any) => p.id === value.slice(5));
      if (!plan) return;
      updated[idx] = { ...updated[idx], subscriptionPlanId: plan.id, serviceCatalogItemId: null, title: plan.name, description: plan.description || "", unitPrice: plan.monthlyPrice || 0, lineType: "RecurringMonthly" };
      setLines(updated);
      return;
    }
    const svc = categories.flatMap((c: any) => c.items || []).find((i: any) => i.id === value);
    if (!svc) return;
    updated[idx] = { ...updated[idx], serviceCatalogItemId: svc.id, subscriptionPlanId: null, title: svc.name, description: svc.description || "", unitPrice: svc.defaultPrice || 0, lineType: svc.defaultLineType || "OneTime" };
    setLines(updated);
  }

  async function handleSaveLines() {
    try {
      await api.updateQuoteLines(id, lines.map((l, i) => ({ ...l, sortOrder: i })));
      setEditing(false);
      setSuccess("Positionen gespeichert");
      loadQuote();
      setTimeout(() => setSuccess(""), 3000);
    } catch (e: any) { setError(e?.message || "Fehler beim Speichern"); }
  }

  function startEditHeader() {
    setHeaderForm({
      subject: quote.subject || "",
      introText: quote.introText || "",
      outroText: quote.outroText || "",
      notes: quote.notes || "",
      taxMode: quote.taxMode || "Standard",
      taxRate: quote.taxRate ?? 19,
      paymentTermKeys: quote.paymentTermKeys || [],
    });
    setEditingHeader(true);
  }

  function togglePaymentTermKey(key: string) {
    setHeaderForm(f => ({
      ...f,
      paymentTermKeys: f.paymentTermKeys.includes(key) ? f.paymentTermKeys.filter(k => k !== key) : [...f.paymentTermKeys, key],
    }));
  }

  async function saveHeader() {
    try {
      await api.updateQuote(id, { ...headerForm, taxMode: toTaxModeNumber(headerForm.taxMode) });
      setEditingHeader(false);
      setSuccess("Details gespeichert");
      loadQuote();
      setTimeout(() => setSuccess(""), 3000);
    } catch { setError("Fehler beim Speichern"); }
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api.sendQuote(id, sendForm);
      setShowSend(false);
      setSuccess("Angebot versendet");
      loadQuote();
      setTimeout(() => setSuccess(""), 3000);
    } catch { setError("Fehler beim Versenden"); }
  }

  async function handlePdfDownload() {
    try {
      const blob = await api.quotePdfBlob(id);
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
    } catch { setError("PDF konnte nicht geladen werden"); }
  }

  async function handleMarkAsOrdered() {
    try {
      const updated = await api.markQuoteAsOrdered(id);
      setQuote(updated);
    } catch (e: any) { setError(e?.message || "Fehler beim Bestätigen als Auftrag"); }
  }

  async function handleConvert() {
    try {
      if (quoteStatus === "Accepted") {
        const updated = await api.markQuoteAsOrdered(id);
        setQuote(updated);
      }
      const invoice = await api.convertQuoteToInvoice(id);
      router.push(`/invoices/${invoice.id}`);
    } catch (e: any) { setError(e?.message || "Fehler bei der Konvertierung"); }
  }

  async function handleDuplicate() {
    try {
      const dup = await api.duplicateQuote(id);
      router.push(`/quotes/${dup.id}`);
    } catch { setError("Fehler beim Duplizieren"); }
  }

  async function handleCreateNewVersion() {
    try {
      const next = await api.createQuoteVersion(id);
      router.push(`/quotes/${next.id}`);
    } catch (e: any) {
      setError(e?.message || "Neue Version konnte nicht erstellt werden");
    }
  }

  async function handleDelete() {
    if (!confirm("Angebot wirklich loeschen?")) return;
    try {
      await api.deleteQuote(id);
      router.push("/quotes");
    } catch (e: any) { setError(e.message); }
  }

  const st = (status: string) => statusMap[status] || { label: status, cls: "bg-gray-100 text-muted" };
  const sg = (status: string) => sigMap[status] || { label: status, cls: "bg-gray-100 text-muted" };

  if (error && !quote) return (
    <div className="p-8">
      <div className="bg-red-50 text-danger p-4 rounded-xl">{error}</div>
      <button onClick={() => router.push("/quotes")} className="mt-4 text-sm text-primary hover:underline">Zurueck zur Liste</button>
    </div>
  );

  if (!quote) return <div className="p-8"><div className="text-muted">Laden...</div></div>;

  const quoteStatus = asQuoteStatus(quote.status);
  const signatureStatus = asSignatureStatus(quote.signatureStatus);
  const isCurrentVersion = quote.isCurrentVersion !== false;
  return (
    <div className="p-8">
      {error && <div className="bg-red-50 text-danger px-4 py-2 rounded-lg mb-4 text-sm">{error}<button onClick={() => setError("")} className="ml-2 font-bold">x</button></div>}
      {success && <div className="bg-green-50 text-success px-4 py-2 rounded-lg mb-4 text-sm">{success}</div>}

      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => router.push("/quotes")} className="text-muted hover:text-text text-sm">&larr; Angebote</button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{quote.quoteNumber}</h1>
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${st(quoteStatus).cls}`}>{st(quoteStatus).label}</span>
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${sg(signatureStatus).cls}`}>{sg(signatureStatus).label}</span>
          </div>
          <p className="text-sm text-muted">{quote.customerName} · Version {quote.version}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handlePdfDownload} className="px-4 py-2 border border-border rounded-lg text-sm font-medium hover:bg-background">PDF</button>
          <button onClick={handleDuplicate} className="px-4 py-2 border border-border rounded-lg text-sm font-medium hover:bg-background">Duplizieren</button>
          {isCurrentVersion && !editing && <button onClick={handleCreateNewVersion} className="px-4 py-2 border border-border rounded-lg text-sm font-medium hover:bg-background">Neue Version</button>}
          {(quoteStatus === "Draft" || quoteStatus === "Sent") && <button onClick={() => { setSendForm({ ...sendForm, recipientEmail: quote.primaryContactEmail || "" }); setShowSend(true); }} className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium">Versenden</button>}
          {quoteStatus === "Accepted" && <button onClick={handleMarkAsOrdered} className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium">Auftrag bestätigen</button>}
          {["Accepted", "Ordered"].includes(quoteStatus) && <button onClick={handleConvert} className="px-4 py-2 bg-success text-white rounded-lg text-sm font-medium">→ Zur Rechnung</button>}
          {isCurrentVersion && ["Accepted", "Ordered"].includes(quoteStatus) && signatureStatus === "Signed" && quote.b2bAuthorityConfirmed && Number(quote.subtotalMonthly || 0) > 0 && (
            <button onClick={() => router.push(`/subscriptions?quoteId=${quote.id}`)} className="px-4 py-2 bg-emerald-700 text-white rounded-lg text-sm font-medium hover:bg-emerald-800">→ Zur Serienrechnung</button>
          )}
          {quoteStatus === "Draft" && <button onClick={handleDelete} className="px-4 py-2 text-danger border border-danger/30 rounded-lg text-sm font-medium hover:bg-red-50">Loeschen</button>}
        </div>
      </div>

      {/* Quote Info */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="bg-surface rounded-xl border border-border p-5">
          <div className="flex justify-between items-center mb-3">
            <h2 className="font-semibold">Details</h2>
            {quoteStatus === "Draft" && !editingHeader && <button onClick={startEditHeader} className="text-xs text-primary hover:underline">Bearbeiten</button>}
          </div>
          {editingHeader ? (
            <div className="space-y-3">
              <div><label className="text-xs text-muted block mb-1">Betreff</label><input value={headerForm.subject} onChange={e => setHeaderForm({ ...headerForm, subject: e.target.value })} className="w-full px-2 py-1.5 border border-border rounded text-sm" /></div>
              <div><label className="text-xs text-muted block mb-1">Steuersatz %</label><input type="number" value={headerForm.taxRate} onChange={e => setHeaderForm({ ...headerForm, taxRate: +e.target.value })} className="w-full px-2 py-1.5 border border-border rounded text-sm" /></div>
              <div><label className="text-xs text-muted block mb-1">Steuermodus</label>
                <select value={headerForm.taxMode} onChange={e => setHeaderForm({ ...headerForm, taxMode: e.target.value })} className="w-full px-2 py-1.5 border border-border rounded text-sm">
                  <option value="Standard">Regulaer (MwSt.)</option>
                  <option value="SmallBusiness">Kleinunternehmer</option>
                  <option value="ReverseCharge">Reverse Charge</option>
                </select>
              </div>
              <div><label className="text-xs text-muted block mb-1">Einleitungstext</label><textarea rows={2} value={headerForm.introText} onChange={e => setHeaderForm({ ...headerForm, introText: e.target.value })} className="w-full px-2 py-1.5 border border-border rounded text-sm" /></div>
              <div><label className="text-xs text-muted block mb-1">Schlusstext</label><textarea rows={2} value={headerForm.outroText} onChange={e => setHeaderForm({ ...headerForm, outroText: e.target.value })} className="w-full px-2 py-1.5 border border-border rounded text-sm" /></div>
              <div><label className="text-xs text-muted block mb-1">Notizen</label><textarea rows={2} value={headerForm.notes} onChange={e => setHeaderForm({ ...headerForm, notes: e.target.value })} className="w-full px-2 py-1.5 border border-border rounded text-sm" /></div>
              <div>
                <label className="text-xs text-muted block mb-1">Zahlungsbedingungen (Mehrfachauswahl f\u00fcr den Kunden)</label>
                <div className="space-y-1.5 border border-border rounded p-2 max-h-40 overflow-auto">
                  {paymentTermCatalog.map((pt: any) => (
                    <label key={pt.key} className="flex items-start gap-2 text-sm">
                      <input type="checkbox" className="mt-0.5" checked={headerForm.paymentTermKeys.includes(pt.key)} onChange={() => togglePaymentTermKey(pt.key)} />
                      <span>{pt.title}</span>
                    </label>
                  ))}
                  {paymentTermCatalog.length === 0 && <p className="text-xs text-muted">Keine Zahlungsbedingungen im Katalog hinterlegt. Unter "Verwaltung \u2192 Zahlungsbedingungen" anlegen.</p>}
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={saveHeader} className="px-3 py-1.5 bg-primary text-white rounded-lg text-sm">Speichern</button>
                <button onClick={() => setEditingHeader(false)} className="px-3 py-1.5 border border-border rounded-lg text-sm">Abbrechen</button>
              </div>
            </div>
          ) : (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted">Betreff</span><span>{quote.subject || "\u2014"}</span></div>
              <div className="flex justify-between"><span className="text-muted">Erstellt</span><span>{new Date(quote.createdAt).toLocaleDateString("de")}</span></div>
              <div className="flex justify-between"><span className="text-muted">Steuersatz</span><span>{quote.taxRate}%</span></div>
              <div className="flex justify-between"><span className="text-muted">Steuermodus</span><span>{quote.taxMode}</span></div>
              {quote.paymentTermOptions?.length > 0 && (
                <div>
                  <span className="text-muted block mb-1">Zahlungsbedingungen</span>
                  <div className="flex flex-wrap gap-1.5">
                    {quote.paymentTermOptions.map((pt: any) => (
                      <span key={pt.key} className={`text-xs px-2 py-0.5 rounded-full ${pt.key === quote.chosenPaymentTermKey ? "bg-green-50 text-success font-medium" : "bg-gray-100 text-muted"}`}>
                        {pt.title}{pt.key === quote.chosenPaymentTermKey ? " \u2713" : ""}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        <div className="bg-surface rounded-xl border border-border p-5">
          <h2 className="font-semibold mb-3">Betraege</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted">Netto (einmalig)</span><span>{quote.subtotalOneTime?.toFixed(2)} EUR</span></div>
            <div className="flex justify-between"><span className="text-muted">Netto (monatlich)</span><span>{quote.subtotalMonthly?.toFixed(2)} EUR</span></div>
            <div className="flex justify-between"><span className="text-muted">MwSt</span><span>{quote.taxAmount?.toFixed(2)} EUR</span></div>
            <div className="flex justify-between font-semibold"><span>Gesamt</span><span>{quote.grandTotal?.toFixed(2)} EUR</span></div>
          </div>
        </div>
        <div className="bg-surface rounded-xl border border-border p-5">
          <h2 className="font-semibold mb-3">Versionen</h2>
          <div className="space-y-2 text-sm max-h-44 overflow-auto">
            {(versions || []).map((v: any) => (
              <button key={v.id} onClick={() => router.push(`/quotes/${v.id}`)} className={`w-full text-left p-2 rounded border ${v.id === quote.id ? "border-primary bg-primary/5" : "border-border hover:bg-background"}`}>
                <div className="flex items-center justify-between">
                  <span className="font-medium">v{v.version} · {v.quoteNumber}</span>
                  {v.isCurrentVersion && <span className="text-xs px-2 py-0.5 rounded-full bg-green-50 text-success">Aktuell</span>}
                </div>
                <div className="text-xs text-muted mt-0.5">{asQuoteStatus(v.status)} · {new Date(v.createdAt).toLocaleDateString("de")}</div>
              </button>
            ))}
            {(versions || []).length === 0 && <div className="text-muted">Keine Historie</div>}
          </div>
        </div>
      {signatureStatus === "Signed" && (
          <div className="bg-surface rounded-xl border border-border p-5">
            <h2 className="font-semibold mb-3">Signatur</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted">Unterzeichnet von</span><span>{quote.signedByName}</span></div>
              <div className="flex justify-between"><span className="text-muted">E-Mail</span><span>{quote.signedByEmail}</span></div>
              <div className="flex justify-between"><span className="text-muted">Datum</span><span>{quote.signedAt ? new Date(quote.signedAt).toLocaleDateString("de") : "\u2014"}</span></div>
              <div className="flex justify-between"><span className="text-muted">B2B &amp; Vertretungsberechtigung</span><span className={quote.b2bAuthorityConfirmed ? "text-success" : "text-danger"}>{quote.b2bAuthorityConfirmed ? "Bestätigt" : "Nicht bestätigt"}</span></div>
            </div>
            {quote.signatureData && <img src={quote.signatureData} alt="Signatur" className="mt-3 border border-border rounded-lg max-h-20" />}
          </div>
        )}
      </div>

      {/* Lines */}
      <div className="bg-surface rounded-xl border border-border p-5">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-semibold">Positionen</h2>
          {quoteStatus === "Draft" && (
            editing ? (
              <div className="flex gap-2">
                <button onClick={handleSaveLines} className="px-3 py-1.5 bg-primary text-white rounded-lg text-sm font-medium">Speichern</button>
                <button onClick={() => { setLines(quote.lines || []); setEditing(false); }} className="px-3 py-1.5 border border-border rounded-lg text-sm">Abbrechen</button>
              </div>
            ) : (
              <button onClick={() => setEditing(true)} className="px-3 py-1.5 border border-border rounded-lg text-sm font-medium hover:bg-background">Bearbeiten</button>
            )
          )}
        </div>

        {editing ? (
          <div className="space-y-3">
            {lines.map((line, idx) => (
              <div key={idx} className="border border-border rounded-lg p-3">
                <div className="mb-2">
                  <label className="block text-xs text-muted mb-1">Leistung</label>
                  <select value={line.subscriptionPlanId ? `plan:${line.subscriptionPlanId}` : (line.serviceCatalogItemId || "")} onChange={e => selectItemForLine(idx, e.target.value)} className="w-full px-2 py-1.5 border border-border rounded text-sm bg-white">
                    <option value="">Manuell</option>
                    {categories.map((cat: any) => (
                      <optgroup key={cat.id} label={cat.name}>
                        {(cat.items || []).map((svc: any) => (
                          <option key={svc.id} value={svc.id}>{svc.name}{svc.defaultPrice ? ` (${svc.defaultPrice.toFixed(2)} EUR)` : ""}</option>
                        ))}
                      </optgroup>
                    ))}
                    {plans.filter((p: any) => p.isActive !== false).length > 0 && (
                      <optgroup label="Serienrechnungs-Pläne">
                        {plans.filter((p: any) => p.isActive !== false).map((plan: any) => (
                          <option key={plan.id} value={`plan:${plan.id}`}>{plan.name}{plan.monthlyPrice ? ` (${plan.monthlyPrice.toFixed(2)} EUR/Monat)` : ""}</option>
                        ))}
                      </optgroup>
                    )}
                  </select>
                </div>
                <div className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-3">
                    <label className="block text-xs text-muted mb-1">Titel</label>
                    <input value={line.title} onChange={e => updateLine(idx, "title", e.target.value)} className="w-full px-2 py-1.5 border border-border rounded text-sm" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs text-muted mb-1">Menge</label>
                    <input type="number" min="1" value={line.quantity} onChange={e => updateLine(idx, "quantity", Number(e.target.value))} className="w-full px-2 py-1.5 border border-border rounded text-sm" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs text-muted mb-1">Preis (EUR)</label>
                    <PriceInput value={line.unitPrice} onChange={v => updateLine(idx, "unitPrice", v)} className="w-full px-2 py-1.5 border border-border rounded text-sm text-right" />
                  </div>
                  <div className="col-span-1">
                    <label className="block text-xs text-muted mb-1">Rabatt%</label>
                    <input type="number" min="0" max="100" step="0.01" value={line.discountPercent || 0} onChange={e => updateLine(idx, "discountPercent", Number(e.target.value))} className="w-full px-1 py-1.5 border border-border rounded text-sm" />
                  </div>
                  <div className="col-span-1">
                    <label className="block text-xs text-muted mb-1">MwSt%</label>
                    <select value={line.vatPercent} onChange={e => updateLine(idx, "vatPercent", Number(e.target.value))} className="w-full px-1 py-1.5 border border-border rounded text-sm">
                      <option value={19}>19%</option>
                      <option value={7}>7%</option>
                      <option value={0}>0%</option>
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs text-muted mb-1">Typ</label>
                    <select value={line.lineType} disabled={!!line.subscriptionPlanId} onChange={e => updateLine(idx, "lineType", e.target.value)} className="w-full px-1 py-1.5 border border-border rounded text-sm disabled:bg-gray-50 disabled:text-muted">
                      <option value="OneTime">Einmalig</option>
                      <option value="RecurringMonthly">Monatlich</option>
                    </select>
                  </div>
                  <div className="col-span-1">
                    <button onClick={() => removeLine(idx)} className="px-2 py-1.5 text-danger text-sm hover:bg-red-50 rounded">x</button>
                  </div>
                </div>
                <div className="mt-2">
                  <textarea value={line.description || ""} onChange={e => updateLine(idx, "description", e.target.value)} placeholder="Beschreibung (optional)" rows={2} className="w-full px-2 py-1.5 border border-border rounded text-sm resize-y min-h-[38px]" />
                </div>
              </div>
            ))}
            <div className="flex gap-2">
              <button onClick={addLine} className="flex-1 px-3 py-1.5 border border-dashed border-border rounded-lg text-sm text-muted hover:text-text hover:border-primary">+ Leere Position</button>
              <div className="relative flex-1">
                <select onChange={e => { addItemFromValue(e.target.value); e.target.value = ""; }} className="w-full px-3 py-1.5 border border-dashed border-primary rounded-lg text-sm text-primary bg-white cursor-pointer appearance-none text-center" defaultValue="">
                  <option value="" disabled>+ Leistung hinzufuegen</option>
                  {categories.map((cat: any) => (
                    <optgroup key={cat.id} label={cat.name}>
                      {(cat.items || []).map((svc: any) => (
                        <option key={svc.id} value={svc.id}>{svc.name}{svc.defaultPrice ? ` (${svc.defaultPrice.toFixed(2)} EUR)` : ""}</option>
                      ))}
                    </optgroup>
                  ))}
                  {plans.filter((p: any) => p.isActive !== false).length > 0 && (
                    <optgroup label="Serienrechnungs-Pläne">
                      {plans.filter((p: any) => p.isActive !== false).map((plan: any) => (
                        <option key={plan.id} value={`plan:${plan.id}`}>{plan.name}{plan.monthlyPrice ? ` (${plan.monthlyPrice.toFixed(2)} EUR/Monat)` : ""}</option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </div>
            </div>
          </div>
        ) : (
          <div className="overflow-hidden">
            <table className="w-full">
              <thead><tr className="border-b border-border"><th className="px-4 py-2 text-left text-xs text-muted">Pos.</th><th className="px-4 py-2 text-left text-xs text-muted">Leistung</th><th className="px-4 py-2 text-left text-xs text-muted">Typ</th><th className="px-4 py-2 text-right text-xs text-muted">Menge</th><th className="px-4 py-2 text-right text-xs text-muted">Preis</th><th className="px-4 py-2 text-right text-xs text-muted">Rabatt</th><th className="px-4 py-2 text-right text-xs text-muted">MwSt</th><th className="px-4 py-2 text-right text-xs text-muted">Gesamt</th></tr></thead>
              <tbody>
                {(quote.lines || []).map((l: any, i: number) => (
                  <tr key={i} className="border-b border-border">
                    <td className="px-4 py-3 text-sm text-muted">{i + 1}</td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-medium">{l.title}</span>
                      {l.description && <p className="text-xs text-muted">{l.description}</p>}
                      {l.subscriptionPlanId && (
                        <p className="text-xs text-primary mt-0.5">Serienrechnung: {plans.find((p: any) => p.id === l.subscriptionPlanId)?.name || "Plan"}</p>
                      )}
                    </td>
                    <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded ${asLineType(l.lineType) === "RecurringMonthly" ? "bg-blue-50 text-blue-700" : "bg-gray-100 text-muted"}`}>{asLineType(l.lineType) === "RecurringMonthly" ? "Monatlich" : "Einmalig"}</span></td>
                    <td className="px-4 py-3 text-sm text-right">{l.quantity}</td>
                    <td className="px-4 py-3 text-sm text-right">{l.unitPrice?.toFixed(2)} EUR</td>
                    <td className="px-4 py-3 text-sm text-right">{(l.discountPercent || 0).toFixed(2)}%</td>
                    <td className="px-4 py-3 text-sm text-right">{l.vatPercent}%</td>
                    <td className="px-4 py-3 text-sm text-right font-medium">{((l.total ?? (l.quantity * l.unitPrice * (1 - ((l.discountPercent || 0) / 100))))).toFixed(2)} EUR</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {(quote.lines || []).length === 0 && <div className="p-6 text-center text-muted text-sm">Keine Positionen vorhanden.</div>}
            {quoteStatus === "Draft" && (
              <div className="flex gap-2 mt-4 px-4 pb-2">
                <button onClick={() => { setEditing(true); addLine(); }} className="flex-1 px-3 py-2 border border-dashed border-border rounded-lg text-sm text-muted hover:text-text hover:border-primary">+ Leere Position</button>
                <div className="relative flex-1">
                  <select onChange={e => { if (e.target.value) { setEditing(true); addItemFromValue(e.target.value); } e.target.value = ""; }} className="w-full px-3 py-2 border border-dashed border-primary rounded-lg text-sm text-primary bg-white cursor-pointer appearance-none text-center" defaultValue="">
                    <option value="" disabled>+ Leistung hinzufuegen</option>
                    {categories.map((cat: any) => (
                      <optgroup key={cat.id} label={cat.name}>
                        {(cat.items || []).map((svc: any) => (
                          <option key={svc.id} value={svc.id}>{svc.name}{svc.defaultPrice ? ` (${svc.defaultPrice.toFixed(2)} EUR)` : ""}</option>
                        ))}
                      </optgroup>
                    ))}
                    {plans.filter((p: any) => p.isActive !== false).length > 0 && (
                      <optgroup label="Serienrechnungs-Pläne">
                        {plans.filter((p: any) => p.isActive !== false).map((plan: any) => (
                          <option key={plan.id} value={`plan:${plan.id}`}>{plan.name}{plan.monthlyPrice ? ` (${plan.monthlyPrice.toFixed(2)} EUR/Monat)` : ""}</option>
                        ))}
                      </optgroup>
                    )}
                  </select>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Intro/Outro Text */}
      {!editingHeader && (quote.introText || quote.outroText || quote.notes) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          {quote.introText && (
            <div className="bg-surface rounded-xl border border-border p-5">
              <h2 className="font-semibold mb-2">Einleitungstext</h2>
              <p className="text-sm text-muted whitespace-pre-wrap">{quote.introText}</p>
            </div>
          )}
          {quote.outroText && (
            <div className="bg-surface rounded-xl border border-border p-5">
              <h2 className="font-semibold mb-2">Schlusstext</h2>
              <p className="text-sm text-muted whitespace-pre-wrap">{quote.outroText}</p>
            </div>
          )}
        </div>
      )}

      {/* Send Modal */}
      {showSend && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowSend(false)}>
          <div className="bg-surface rounded-xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-4">Angebot versenden</h2>
            <form onSubmit={handleSend} className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Empfaenger E-Mail *</label>
                <input required type="email" value={sendForm.recipientEmail} onChange={e => setSendForm({ ...sendForm, recipientEmail: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Nachricht</label>
                <textarea rows={3} value={sendForm.message} onChange={e => setSendForm({ ...sendForm, message: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Gueltigkeitsdauer (Tage)</label>
                <input type="number" min="1" value={sendForm.expirationDays} onChange={e => setSendForm({ ...sendForm, expirationDays: Number(e.target.value) })} className="w-full px-3 py-2 border border-border rounded-lg" />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={sendForm.requireSignature} onChange={e => setSendForm({ ...sendForm, requireSignature: e.target.checked })} className="rounded border-border" />
                Digitale Unterschrift erforderlich
              </label>
              <div className="flex gap-2">
                <button type="submit" className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium">Versenden</button>
                <button type="button" onClick={() => setShowSend(false)} className="px-4 py-2 border border-border rounded-lg text-sm">Abbrechen</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
