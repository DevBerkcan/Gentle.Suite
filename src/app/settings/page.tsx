"use client";
import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";

export default function SettingsPage() {
  const [form, setForm] = useState<any>(null);
  const [numberYear, setNumberYear] = useState(new Date().getFullYear());
  const [numberRanges, setNumberRanges] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Integration state
  const [integration, setIntegration] = useState<any>(null);
  const [paypalForm, setPaypalForm] = useState({ clientId: "", clientSecret: "" });
  const [bankForm, setBankForm] = useState({ secretId: "", secretKey: "", iban: "" });
  const [bankAuthUrl, setBankAuthUrl] = useState<string | null>(null);
  const [bankReqId, setBankReqId] = useState<string | null>(null);
  const [integLoading, setIntegLoading] = useState(false);

  const loadIntegration = useCallback(() => {
    api.integrationSettings().then(setIntegration).catch(() => {});
  }, []);

  useEffect(() => {
    api.settings().then(setForm).catch(() => setError("Einstellungen konnten nicht geladen werden"));
    loadIntegration();
  }, [loadIntegration]);

  useEffect(() => {
    api.numberRanges(numberYear).then(setNumberRanges).catch(() => setError("Nummernkreise konnten nicht geladen werden"));
  }, [numberYear]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    try {
      const updated = await api.updateSettings(form);
      setForm(updated);
      setSuccess("Einstellungen gespeichert");
      setTimeout(() => setSuccess(""), 3000);
    } catch { setError("Fehler beim Speichern"); }
  }

  async function handlePayPalConnect() {
    if (!paypalForm.clientId || !paypalForm.clientSecret) { setError("Client ID und Secret sind erforderlich."); return; }
    setIntegLoading(true);
    try {
      await api.updatePayPal({ clientId: paypalForm.clientId, clientSecret: paypalForm.clientSecret });
      setSuccess("PayPal verbunden — erster Sync startet automatisch");
      setTimeout(() => setSuccess(""), 5000);
      setPaypalForm({ clientId: "", clientSecret: "" });
      loadIntegration();
    } catch (e: any) { setError(e?.message || "PayPal-Verbindung fehlgeschlagen"); }
    finally { setIntegLoading(false); }
  }

  async function handlePayPalDisconnect() {
    if (!confirm("PayPal-Verbindung wirklich trennen?")) return;
    await api.disconnectPayPal().catch(() => {});
    loadIntegration();
  }

  async function handleBankSetup() {
    if (!bankForm.secretId || !bankForm.secretKey || !bankForm.iban) { setError("Alle Felder sind erforderlich."); return; }
    setIntegLoading(true);
    try {
      const res = await api.setupBank({ goCardlessSecretId: bankForm.secretId, goCardlessSecretKey: bankForm.secretKey, iban: bankForm.iban });
      setBankAuthUrl(res.authUrl);
      setBankReqId(integration?.bankRequisitionId || "");
      setSuccess("Autorisierungs-Link erstellt — bitte öffnen und Fyrst autorisieren");
      setTimeout(() => setSuccess(""), 8000);
      loadIntegration();
    } catch (e: any) { setError(e?.message || "Bank-Setup fehlgeschlagen"); }
    finally { setIntegLoading(false); }
  }

  async function handleBankConfirm() {
    const reqId = bankReqId || integration?.bankRequisitionId;
    if (!reqId) { setError("Keine Requisition-ID gefunden. Bitte erneut verbinden."); return; }
    setIntegLoading(true);
    try {
      await api.confirmBank({ requisitionId: reqId });
      setBankAuthUrl(null);
      setSuccess("Geschäftskonto erfolgreich verbunden!");
      setTimeout(() => setSuccess(""), 5000);
      loadIntegration();
    } catch (e: any) { setError(e?.message || "Bestätigung fehlgeschlagen — bitte erst Fyrst autorisieren"); }
    finally { setIntegLoading(false); }
  }

  async function handleBankDisconnect() {
    if (!confirm("Geschäftskonto-Verbindung wirklich trennen?")) return;
    await api.disconnectBank().catch(() => {});
    setBankAuthUrl(null);
    loadIntegration();
  }

  async function handleManualSync() {
    try {
      await api.syncIntegrations();
      setSuccess("Synchronisation gestartet — Daten werden geladen");
      setTimeout(() => setSuccess(""), 5000);
      setTimeout(loadIntegration, 3000);
    } catch { setError("Sync fehlgeschlagen"); }
  }

  async function handleSaveNumberRange(range: any) {
    try {
      await api.updateNumberRange({ ...range, year: numberYear });
      const list = await api.numberRanges(numberYear);
      setNumberRanges(list);
      setSuccess(`Nummernkreis ${range.entityType} gespeichert`);
      setTimeout(() => setSuccess(""), 3000);
    } catch (e: any) {
      setError(e?.message || "Nummernkreis konnte nicht gespeichert werden");
    }
  }

  async function handleInitDefaultRanges() {
    const defaults = [
      { entityType: "Invoice", prefix: "RE", nextValue: 20, padding: 4 },
      { entityType: "Quote", prefix: "AN", nextValue: 1, padding: 4 },
      { entityType: "CancellationInvoice", prefix: "SR", nextValue: 1, padding: 4 },
    ];
    try {
      for (const d of defaults) {
        const exists = numberRanges.find((r: any) => r.entityType === d.entityType);
        if (!exists) await api.updateNumberRange({ ...d, year: numberYear });
      }
      const list = await api.numberRanges(numberYear);
      setNumberRanges(list);
      setSuccess("Standard-Nummernkreise für " + numberYear + " eingerichtet");
      setTimeout(() => setSuccess(""), 4000);
    } catch (e: any) { setError(e?.message || "Fehler"); }
  }

  if (!form) return <div className="p-8"><div className="text-muted">Laden...</div></div>;

  const f = (field: string, value: any) => setForm({ ...form, [field]: value });

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">Einstellungen</h1>

      {error && <div className="bg-red-50 text-danger px-4 py-2 rounded-lg mb-4 text-sm">{error}<button onClick={() => setError("")} className="ml-2 font-bold">x</button></div>}
      {success && <div className="bg-green-50 text-success px-4 py-2 rounded-lg mb-4 text-sm">{success}</div>}

      <form onSubmit={handleSave} className="space-y-8">
        {/* Firmendaten */}
        <section className="bg-surface rounded-xl border border-border p-6">
          <h2 className="font-semibold mb-4">Firmendaten</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Firmenname *</label>
              <input required value={form.companyName || ""} onChange={e => f("companyName", e.target.value)} className="w-full px-3 py-2 border border-border rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Rechtsform / Vollstaendiger Name</label>
              <input value={form.legalName || ""} onChange={e => f("legalName", e.target.value)} className="w-full px-3 py-2 border border-border rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Geschaeftsfuehrer</label>
              <input value={form.managingDirector || ""} onChange={e => f("managingDirector", e.target.value)} className="w-full px-3 py-2 border border-border rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Website</label>
              <input value={form.website || ""} onChange={e => f("website", e.target.value)} className="w-full px-3 py-2 border border-border rounded-lg" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1">Strasse *</label>
              <input required value={form.street || ""} onChange={e => f("street", e.target.value)} className="w-full px-3 py-2 border border-border rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">PLZ *</label>
              <input required value={form.zipCode || ""} onChange={e => f("zipCode", e.target.value)} className="w-full px-3 py-2 border border-border rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Stadt *</label>
              <input required value={form.city || ""} onChange={e => f("city", e.target.value)} className="w-full px-3 py-2 border border-border rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Telefon</label>
              <input value={form.phone || ""} onChange={e => f("phone", e.target.value)} className="w-full px-3 py-2 border border-border rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">E-Mail</label>
              <input type="email" value={form.email || ""} onChange={e => f("email", e.target.value)} className="w-full px-3 py-2 border border-border rounded-lg" />
            </div>
          </div>
        </section>

        {/* Steuern & Recht */}
        <section className="bg-surface rounded-xl border border-border p-6">
          <h2 className="font-semibold mb-4">Steuern & Recht</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Steuernummer</label>
              <input value={form.taxId || ""} onChange={e => f("taxId", e.target.value)} className="w-full px-3 py-2 border border-border rounded-lg" placeholder="123/456/78901" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">USt-IdNr.</label>
              <input value={form.vatId || ""} onChange={e => f("vatId", e.target.value)} className="w-full px-3 py-2 border border-border rounded-lg" placeholder="DE123456789" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Amtsgericht</label>
              <input value={form.registerCourt || ""} onChange={e => f("registerCourt", e.target.value)} className="w-full px-3 py-2 border border-border rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Registernummer (HRB)</label>
              <input value={form.registerNumber || ""} onChange={e => f("registerNumber", e.target.value)} className="w-full px-3 py-2 border border-border rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Steuermodus</label>
              <select value={form.defaultTaxMode || "Standard"} onChange={e => f("defaultTaxMode", e.target.value)} className="w-full px-3 py-2 border border-border rounded-lg">
                <option value="Standard">Regelbesteuerung (19%)</option>
                <option value="SmallBusiness">Kleinunternehmer (§19 UStG)</option>
                <option value="ReverseCharge">Reverse Charge</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Buchfuehrung</label>
              <select value={form.accountingMode || "EUR"} onChange={e => f("accountingMode", e.target.value)} className="w-full px-3 py-2 border border-border rounded-lg">
                <option value="EUR">Einnahmen-Ueberschuss-Rechnung (EUR)</option>
                <option value="Bilanz">Bilanzierung</option>
              </select>
            </div>
          </div>
        </section>

        {/* Bankverbindung */}
        <section className="bg-surface rounded-xl border border-border p-6">
          <h2 className="font-semibold mb-4">Bankverbindung</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1">Bank</label>
              <input value={form.bankName || ""} onChange={e => f("bankName", e.target.value)} className="w-full px-3 py-2 border border-border rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">IBAN</label>
              <input value={form.iban || ""} onChange={e => f("iban", e.target.value)} className="w-full px-3 py-2 border border-border rounded-lg" placeholder="DE89 3705 0198 ..." />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">BIC</label>
              <input value={form.bic || ""} onChange={e => f("bic", e.target.value)} className="w-full px-3 py-2 border border-border rounded-lg" />
            </div>
          </div>
        </section>

        {/* Vorlagen */}
        <section className="bg-surface rounded-xl border border-border p-6">
          <h2 className="font-semibold mb-4">Dokument-Vorlagen</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Zahlungsziel Rechnungen (Tage)</label>
              <input type="number" min="1" value={form.invoicePaymentTermDays || 14} onChange={e => f("invoicePaymentTermDays", Number(e.target.value))} className="w-full px-3 py-2 border border-border rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Gueltigkeit Angebote (Tage)</label>
              <input type="number" min="1" value={form.quoteValidityDays || 30} onChange={e => f("quoteValidityDays", Number(e.target.value))} className="w-full px-3 py-2 border border-border rounded-lg" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1">Rechnungs-Einleitung</label>
              <textarea rows={2} value={form.invoiceIntroTemplate || ""} onChange={e => f("invoiceIntroTemplate", e.target.value)} className="w-full px-3 py-2 border border-border rounded-lg text-sm" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1">Rechnungs-Schlusstext</label>
              <textarea rows={2} value={form.invoiceOutroTemplate || ""} onChange={e => f("invoiceOutroTemplate", e.target.value)} className="w-full px-3 py-2 border border-border rounded-lg text-sm" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1">Angebots-Einleitung</label>
              <textarea rows={2} value={form.quoteIntroTemplate || ""} onChange={e => f("quoteIntroTemplate", e.target.value)} className="w-full px-3 py-2 border border-border rounded-lg text-sm" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1">Angebots-Schlusstext</label>
              <textarea rows={2} value={form.quoteOutroTemplate || ""} onChange={e => f("quoteOutroTemplate", e.target.value)} className="w-full px-3 py-2 border border-border rounded-lg text-sm" />
            </div>
          </div>
        </section>

        <button type="submit" className="px-6 py-2.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-hover">Speichern</button>
      </form>

      {/* Logo Upload */}
      <section className="bg-surface rounded-xl border border-border p-6 mt-8">
        <h2 className="font-semibold mb-4">Firmenlogo</h2>
        <p className="text-sm text-muted mb-3">Das Logo wird auf Rechnungen und Angeboten angezeigt.</p>
        {form.logoPath && <div className="mb-3"><img src={`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:9000"}/${form.logoPath}`} alt="Logo" className="max-h-16 object-contain" /></div>}
        <input type="file" accept="image/*" onChange={async (e) => {
          const file = e.target.files?.[0]; if (!file) return;
          try { const res = await api.uploadLogo(file); setForm({ ...form, logoPath: res.path }); setSuccess("Logo hochgeladen"); setTimeout(() => setSuccess(""), 3000); } catch (err: any) { setError(err.message); }
        }} className="text-sm" />
      </section>

      <section className="bg-surface rounded-xl border border-border p-6 mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">Nummernkreise</h2>
          <div className="flex items-center gap-2">
            <label className="text-sm text-muted">Jahr</label>
            <input type="number" min="2000" max="2100" value={numberYear} onChange={e => setNumberYear(Number(e.target.value))} className="w-24 px-3 py-2 border border-border rounded-lg text-sm" />
            <button onClick={handleInitDefaultRanges} className="px-3 py-2 border border-border rounded-lg text-sm hover:bg-background">Standard einrichten</button>
          </div>
        </div>
        <div className="space-y-3">
          {numberRanges.map((range, idx) => (
            <div key={`${range.entityType}-${idx}`} className="grid grid-cols-12 gap-3 items-end border border-border rounded-lg p-3">
              <div className="col-span-3">
                <label className="block text-xs text-muted mb-1">Typ</label>
                <input value={range.entityType} readOnly className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm" />
              </div>
              <div className="col-span-3">
                <label className="block text-xs text-muted mb-1">Prefix</label>
                <input value={range.prefix} onChange={e => setNumberRanges(numberRanges.map((r, i) => i === idx ? { ...r, prefix: e.target.value } : r))} className="w-full px-3 py-2 border border-border rounded-lg text-sm" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs text-muted mb-1">Naechster Wert</label>
                <input type="number" min="1" value={range.nextValue} onChange={e => setNumberRanges(numberRanges.map((r, i) => i === idx ? { ...r, nextValue: Number(e.target.value) } : r))} className="w-full px-3 py-2 border border-border rounded-lg text-sm" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs text-muted mb-1">Padding</label>
                <input type="number" min="1" max="10" value={range.padding} onChange={e => setNumberRanges(numberRanges.map((r, i) => i === idx ? { ...r, padding: Number(e.target.value) } : r))} className="w-full px-3 py-2 border border-border rounded-lg text-sm" />
              </div>
              <div className="col-span-2">
                <button type="button" onClick={() => handleSaveNumberRange(range)} className="w-full px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-hover">Speichern</button>
              </div>
            </div>
          ))}
          {numberRanges.length === 0 && (
            <div className="text-sm text-muted p-4 border border-dashed border-border rounded-lg text-center">
              Keine Nummernkreise für {numberYear} gefunden.
              <button onClick={handleInitDefaultRanges} className="ml-2 text-primary font-medium hover:underline">
                Standard einrichten (RE0020, AN0001, SR0001)
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Integrationen */}
      <section className="bg-surface rounded-xl border border-border p-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="font-semibold">Integrationen</h2>
            <p className="text-xs text-muted mt-0.5">Konten verbinden — Sync alle 30 Minuten automatisch</p>
          </div>
          {(integration?.payPalEnabled || integration?.bankEnabled) && (
            <button onClick={handleManualSync} className="px-3 py-1.5 border border-border rounded-lg text-xs font-medium hover:bg-background transition-colors">
              Jetzt synchronisieren
            </button>
          )}
        </div>

        {/* PayPal */}
        <div className="border border-border rounded-xl p-5 mb-4">
          <div className="flex justify-between items-start mb-3">
            <div>
              <p className="font-medium text-sm">PayPal Business</p>
              <p className="text-xs text-muted">Transaktionen automatisch importieren via REST API</p>
            </div>
            {integration?.payPalEnabled
              ? <span className="text-xs px-2 py-1 bg-green-50 text-success rounded-full">● Verbunden</span>
              : <span className="text-xs px-2 py-1 bg-gray-100 text-muted rounded-full">○ Nicht verbunden</span>}
          </div>
          {integration?.payPalEnabled ? (
            <div className="flex items-center gap-4">
              <div className="text-xs text-muted">
                Client ID: <span className="font-mono">{integration.payPalClientId}</span>
                {integration.payPalLastSync && <span className="ml-3">Letzter Sync: {new Date(integration.payPalLastSync).toLocaleString("de")}</span>}
              </div>
              <button onClick={handlePayPalDisconnect} className="text-xs text-danger hover:underline ml-auto">Trennen</button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-muted mb-1">Client ID</label>
                <input value={paypalForm.clientId} onChange={e => setPaypalForm({ ...paypalForm, clientId: e.target.value })} placeholder="AaBbCc..." className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
              </div>
              <div>
                <label className="block text-xs text-muted mb-1">Client Secret</label>
                <input type="password" value={paypalForm.clientSecret} onChange={e => setPaypalForm({ ...paypalForm, clientSecret: e.target.value })} placeholder="••••••••••••" className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
              </div>
              <div className="col-span-2">
                <p className="text-xs text-muted mb-2">Keys unter <span className="font-mono">developer.paypal.com</span> → Apps &amp; Credentials → Live → App erstellen</p>
                <button onClick={handlePayPalConnect} disabled={integLoading} className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-hover transition-colors disabled:opacity-50">
                  {integLoading ? "Verbinden..." : "PayPal verbinden"}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Fyrst / GoCardless */}
        <div className="border border-border rounded-xl p-5">
          <div className="flex justify-between items-start mb-3">
            <div>
              <p className="font-medium text-sm">Fyrst Geschäftskonto</p>
              <p className="text-xs text-muted">Kontoauszüge via GoCardless / PSD2 Open Banking</p>
            </div>
            {integration?.bankEnabled
              ? <span className="text-xs px-2 py-1 bg-green-50 text-success rounded-full">● Verbunden</span>
              : <span className="text-xs px-2 py-1 bg-gray-100 text-muted rounded-full">○ Nicht verbunden</span>}
          </div>
          {integration?.bankEnabled ? (
            <div className="flex items-center gap-4">
              <div className="text-xs text-muted">
                Konto-ID: <span className="font-mono">{integration.bankAccountId?.slice(0, 8)}...</span>
                {integration.bankLastSync && <span className="ml-3">Letzter Sync: {new Date(integration.bankLastSync).toLocaleString("de")}</span>}
              </div>
              <button onClick={handleBankDisconnect} className="text-xs text-danger hover:underline ml-auto">Trennen</button>
            </div>
          ) : (
            <div className="space-y-3">
              {!bankAuthUrl ? (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-muted mb-1">GoCardless Secret ID</label>
                      <input value={bankForm.secretId} onChange={e => setBankForm({ ...bankForm, secretId: e.target.value })} placeholder="xxx-xxx-xxx" className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                    </div>
                    <div>
                      <label className="block text-xs text-muted mb-1">GoCardless Secret Key</label>
                      <input type="password" value={bankForm.secretKey} onChange={e => setBankForm({ ...bankForm, secretKey: e.target.value })} placeholder="••••••••" className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs text-muted mb-1">Deine Fyrst IBAN</label>
                      <input value={bankForm.iban} onChange={e => setBankForm({ ...bankForm, iban: e.target.value })} placeholder="DE89 3704 0044 0532 0130 00" className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                    </div>
                  </div>
                  <p className="text-xs text-muted">Keys unter <span className="font-mono">bankaccountdata.gocardless.com</span> → User Secrets (kostenlos)</p>
                  <button onClick={handleBankSetup} disabled={integLoading} className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-hover transition-colors disabled:opacity-50">
                    {integLoading ? "Wird eingerichtet..." : "Verbindung herstellen"}
                  </button>
                </>
              ) : (
                <div className="space-y-3">
                  <div className="bg-background border border-border rounded-lg p-4">
                    <p className="text-sm font-medium mb-1">Schritt 2: Fyrst autorisieren</p>
                    <p className="text-xs text-muted mb-3">Öffne den Link und melde dich in deinem Fyrst-Konto an, um GentleSuite den Zugang zu erlauben.</p>
                    <a href={bankAuthUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-hover transition-colors">
                      Fyrst-Autorisierung öffnen ↗
                    </a>
                  </div>
                  <div>
                    <p className="text-xs text-muted mb-2">Nach der Autorisierung im Browser: Klicke "Verbindung bestätigen"</p>
                    <button onClick={handleBankConfirm} disabled={integLoading} className="px-4 py-2 bg-success text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50">
                      {integLoading ? "Bestätigen..." : "✓ Verbindung bestätigen"}
                    </button>
                    <button onClick={() => setBankAuthUrl(null)} className="ml-3 px-4 py-2 border border-border rounded-lg text-sm font-medium hover:bg-background transition-colors">
                      Zurück
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
