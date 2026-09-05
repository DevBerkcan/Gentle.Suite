"use client";
import { useEffect, useState, Fragment } from "react";
import { api } from "@/lib/api";

const statusMap: Record<string, { label: string; cls: string }> = {
  Active: { label: "Aktiv", cls: "bg-green-50 text-success" },
  Paused: { label: "Pausiert", cls: "bg-yellow-50 text-warning" },
  Cancelled: { label: "Gekündigt", cls: "bg-gray-100 text-gray-700" },
  Expired: { label: "Abgelaufen", cls: "bg-gray-100 text-gray-500" },
  PendingConfirmation: { label: "Bestätigung ausstehend", cls: "bg-orange-50 text-orange-700" },
};

const invoiceStatusMap: Record<string, { label: string; cls: string }> = {
  Draft: { label: "Entwurf", cls: "bg-gray-100 text-gray-600" },
  Final: { label: "Final", cls: "bg-blue-50 text-blue-700" },
  Sent: { label: "Gesendet", cls: "bg-yellow-50 text-yellow-700" },
  Paid: { label: "Bezahlt", cls: "bg-green-50 text-green-700" },
  Overdue: { label: "Überfällig", cls: "bg-red-50 text-red-700" },
  Cancelled: { label: "Storniert", cls: "bg-gray-100 text-gray-500" },
};

const collectionStatusMap: Record<string, string> = {
  scheduled: "Einzug angekündigt",
  open: "Einzug offen",
  pending: "Einzug läuft",
  paid: "Über Mollie eingezogen",
  failed: "Einzug fehlgeschlagen",
  canceled: "Einzug abgebrochen",
  expired: "Einzug abgelaufen",
  error: "Mollie-Fehler",
};

const categoryMap: Record<string, string> = {
  Allgemein: "Allgemein",
  DomainHosting: "Domain-Hosting",
  Wartungsvertrag: "Wartungsvertrag",
  SLA: "SLA",
  Software: "Software",
  Support: "Support",
  Sonstiges: "Sonstiges",
};

const cycleMap: Record<string, string> = {
  Monthly: "Monatlich",
  Quarterly: "Quartalsmässig",
  Yearly: "Jährlich",
};

const CATEGORIES = ["Allgemein", "DomainHosting", "Wartungsvertrag", "SLA", "Software", "Support", "Sonstiges"];
const CYCLES = ["Monthly", "Quarterly", "Yearly"];
const DURATIONS = [
  { value: "", label: "Unbegrenzt" },
  { value: "12", label: "1 Jahr (12 Monate)" },
  { value: "24", label: "2 Jahre (24 Monate)" },
  { value: "36", label: "3 Jahre (36 Monate)" },
  { value: "48", label: "4 Jahre (48 Monate)" },
];

const STATUS_FILTERS = [
  { key: "Alle", label: "Alle" },
  { key: "Active", label: "Aktiv" },
  { key: "Paused", label: "Pausiert" },
  { key: "PendingConfirmation", label: "Ausstehend" },
  { key: "Expired", label: "Abgelaufen" },
  { key: "Cancelled", label: "Gekündigt" },
];

const emptyPlanForm = { name: "", description: "", monthlyPrice: "", billingCycle: "Monthly", category: "Allgemein", isActive: true };

export default function SubscriptionsPage() {
  const [plans, setPlans] = useState<any[]>([]);
  const [subs, setSubs] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ customerId: "", planId: "", contractQuoteId: "", contractDurationMonths: "", businessCustomerConfirmed: false });
  const [eligibleQuotes, setEligibleQuotes] = useState<any[]>([]);
  const [eligibleQuotesLoading, setEligibleQuotesLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [statusFilter, setStatusFilter] = useState("Alle");
  const [triggerLoading, setTriggerLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [sendingMandateId, setSendingMandateId] = useState<string | null>(null);

  // Plan CRUD state
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<any>(null);
  const [planForm, setPlanForm] = useState({ ...emptyPlanForm });
  const [planLoading, setPlanLoading] = useState(false);

  // Invoice history state
  const [expandedSubId, setExpandedSubId] = useState<string | null>(null);
  const [subInvoices, setSubInvoices] = useState<Record<string, any[]>>({});

  // User role (for trigger button)
  const [isAdmin, setIsAdmin] = useState(false);

  function loadPlans() {
    api.plans().then(setPlans).catch(() => {});
  }

  function loadSubs() {
    api.allSubs().then(setSubs).catch(() => setError("Abonnements konnten nicht geladen werden"));
  }

  useEffect(() => {
    async function initialize() {
      try {
        const [loadedPlans, loadedSubs, customerResult] = await Promise.all([
          api.plans(),
          api.allSubs(),
          api.customers(),
        ]);
        setPlans(loadedPlans);
        setSubs(loadedSubs);
        setCustomers((customerResult as any).items || []);

        const quoteId = new URLSearchParams(window.location.search).get("quoteId");
        if (!quoteId) return;

        const quote = await api.quote(quoteId);
        const quoteStatus = typeof quote.status === "number" ? ["Draft", "Sent", "Viewed", "Accepted", "Rejected", "Expired", "Ordered"][quote.status] : quote.status;
        const signatureStatus = typeof quote.signatureStatus === "number" ? ["Pending", "Signed", "Declined"][quote.signatureStatus] : quote.signatureStatus;
        if (!["Accepted", "Ordered"].includes(String(quoteStatus)) || signatureStatus !== "Signed" || !quote.b2bAuthorityConfirmed || Number(quote.subtotalMonthly || 0) <= 0) {
          setError("Das Angebot kann nicht als Serienrechnung verwendet werden. Erforderlich sind eine monatliche Position, Unterschrift und B2B-Bestätigung.");
          return;
        }

        const quotes = await api.eligibleSubscriptionQuotes(quote.customerId);
        if (!quotes.some(q => q.id === quoteId)) {
          setError("Für dieses Angebot wurde bereits eine Serienrechnung angelegt oder es ist nicht mehr verfügbar.");
          return;
        }

        const monthlyPlans = loadedPlans.filter((plan: any) => plan.isActive !== false && plan.billingCycle === "Monthly");
        const normalizedLineTitles = (quote.lines || []).filter((line: any) => line.lineType === "RecurringMonthly").map((line: any) => line.title.trim().toLocaleLowerCase("de-DE"));
        const namedMatches = monthlyPlans.filter((plan: any) => normalizedLineTitles.includes(String(plan.name || "").trim().toLocaleLowerCase("de-DE")));
        const priceMatches = monthlyPlans.filter((plan: any) => Math.abs(Number(plan.monthlyPrice) - Number(quote.subtotalMonthly)) < 0.005);
        const matchingPlan = namedMatches.length === 1 ? namedMatches[0] : priceMatches.length === 1 ? priceMatches[0] : monthlyPlans.length === 1 ? monthlyPlans[0] : null;

        setEligibleQuotes(quotes);
        setForm({
          customerId: quote.customerId,
          planId: matchingPlan?.id || "",
          contractQuoteId: quoteId,
          contractDurationMonths: "",
          businessCustomerConfirmed: true,
        });
        setShowNew(true);
      } catch (e: any) {
        setError(e?.message || "Serienrechnung konnte nicht aus dem Angebot vorbereitet werden");
      }
    }

    initialize();
    try {
      const u = JSON.parse(localStorage.getItem("user") || "{}");
      setIsAdmin(u.role === "Admin" || u.roles?.includes("Admin"));
    } catch {}
  }, []);

  // KPI computations
  const activeSubs = subs.filter(s => s.status === "Active");
  const mrrTotal = activeSubs.reduce((sum, s) => sum + (s.monthlyPrice || 0), 0);
  const nextBillingSub = activeSubs
    .filter(s => s.nextBillingDate)
    .sort((a, b) => new Date(a.nextBillingDate).getTime() - new Date(b.nextBillingDate).getTime())[0];

  const filteredSubs = statusFilter === "Alle" ? subs : subs.filter(s => s.status === statusFilter);

  async function handleCustomerChange(customerId: string) {
    setForm(current => ({ ...current, customerId, contractQuoteId: "", businessCustomerConfirmed: false }));
    setEligibleQuotes([]);
    if (!customerId) return;
    setEligibleQuotesLoading(true);
    try {
      setEligibleQuotes(await api.eligibleSubscriptionQuotes(customerId));
    } catch (e: any) {
      setError(e?.message || "Vertragsangebote konnten nicht geladen werden");
    } finally {
      setEligibleQuotesLoading(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      const created = await api.createSub({
        customerId: form.customerId,
        planId: form.planId,
        contractQuoteId: form.contractQuoteId,
        businessCustomerConfirmed: form.businessCustomerConfirmed,
        contractDurationMonths: form.contractDurationMonths ? parseInt(form.contractDurationMonths) : null,
      });
      setShowNew(false);
      setForm({ customerId: "", planId: "", contractQuoteId: "", contractDurationMonths: "", businessCustomerConfirmed: false });
      setEligibleQuotes([]);
      setError("");
      if (created.mandateEmailStatus === "Sent") {
        setSuccess(`Serienrechnung angelegt — Einrichtungs-E-Mail wurde an ${created.mandateEmailRecipient} gesendet.`);
      } else {
        setError(`Serienrechnung wurde angelegt, aber die Einrichtungs-E-Mail konnte nicht gesendet werden${created.mandateEmailLastError ? `: ${created.mandateEmailLastError}` : "."}`);
      }
      setTimeout(() => setSuccess(""), 6000);
      loadSubs();
    } catch (e: any) {
      setError(e?.message || "Fehler beim Anlegen des Abonnements");
    } finally {
      setCreating(false);
    }
  }

  async function handleStatus(id: string, status: string) {
    try {
      await api.updateSubStatus(id, { status });
      setSuccess(`Status geändert`);
      setTimeout(() => setSuccess(""), 4000);
      loadSubs();
    } catch {
      setError("Fehler beim Ändern des Status");
    }
  }

  async function handleMandateEmail(id: string) {
    setSendingMandateId(id);
    try {
      const result = await api.sendMollieMandateEmail(id);
      setError("");
      setSuccess(`Einrichtungs-E-Mail wurde an ${result.recipient} gesendet.`);
      setTimeout(() => setSuccess(""), 6000);
      loadSubs();
    } catch (e: any) {
      setError(e?.message || "Einrichtungs-E-Mail konnte nicht gesendet werden");
      loadSubs();
    } finally {
      setSendingMandateId(null);
    }
  }

  async function handleExpandSub(id: string) {
    if (expandedSubId === id) { setExpandedSubId(null); return; }
    setExpandedSubId(id);
    if (!subInvoices[id]) {
      try {
        const invoices = await api.subscriptionInvoices(id);
        setSubInvoices(prev => ({ ...prev, [id]: Array.isArray(invoices) ? invoices : [] }));
      } catch {
        setSubInvoices(prev => ({ ...prev, [id]: [] }));
      }
    }
  }

  async function handleTrigger() {
    if (!confirm("Serienrechnungs-Job jetzt manuell auslösen? Alle fälligen Abonnements werden sofort abgerechnet und Rechnungen versendet.")) return;
    setTriggerLoading(true);
    try {
      await api.triggerSubscriptionInvoices();
      setSuccess("Job ausgelöst — Rechnungen werden erstellt, zum Versenden geh zu Rechnungen");
      setTimeout(() => setSuccess(""), 6000);
    } catch {
      setError("Fehler beim Auslösen des Jobs");
    } finally {
      setTriggerLoading(false);
    }
  }

  function openNewPlan() {
    setEditingPlan(null);
    setPlanForm({ ...emptyPlanForm });
    setShowPlanModal(true);
  }

  function openEditPlan(plan: any) {
    setEditingPlan(plan);
    setPlanForm({
      name: plan.name || "",
      description: plan.description || "",
      monthlyPrice: plan.monthlyPrice?.toString() || "",
      billingCycle: plan.billingCycle || "Monthly",
      category: plan.category || "Allgemein",
      isActive: plan.isActive !== false,
    });
    setShowPlanModal(true);
  }

  async function handlePlanSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPlanLoading(true);
    try {
      const payload = {
        name: planForm.name,
        description: planForm.description || null,
        monthlyPrice: parseFloat(planForm.monthlyPrice),
        billingCycle: planForm.billingCycle,
        category: planForm.category,
        isActive: planForm.isActive,
      };
      if (editingPlan) {
        await api.updatePlan(editingPlan.id, payload);
        setSuccess("Plan erfolgreich aktualisiert");
      } else {
        await api.createPlan(payload);
        setSuccess("Plan erfolgreich angelegt");
      }
      setTimeout(() => setSuccess(""), 4000);
      setShowPlanModal(false);
      loadPlans();
    } catch {
      setError("Fehler beim Speichern des Plans");
    } finally {
      setPlanLoading(false);
    }
  }

  async function handleDeletePlan(plan: any) {
    if (!confirm(`Plan "${plan.name}" wirklich löschen?`)) return;
    try {
      await api.deletePlan(plan.id);
      setSuccess("Plan gelöscht");
      setTimeout(() => setSuccess(""), 4000);
      loadPlans();
    } catch {
      setError("Fehler beim Löschen des Plans");
    }
  }

  const s = (status: string) => statusMap[status] || { label: status, cls: "bg-gray-100 text-gray-700" };
  const inv = (status: string) => invoiceStatusMap[status] || { label: status, cls: "bg-gray-100 text-gray-600" };
  const durationLabel = (months: number | null) => months ? `${months} Mon.` : "Unbegrenzt";

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Serienrechnungen</h1>
          <p className="text-sm text-muted mt-0.5">Auto-Abrechnung täglich 6:00 Uhr UTC · E-Mail-Versand automatisch</p>
        </div>
        <div className="flex gap-2">
          {isAdmin && (
            <button
              onClick={handleTrigger}
              disabled={triggerLoading}
              className="px-4 py-2 border border-border rounded-lg text-sm font-medium hover:bg-background transition-colors disabled:opacity-50"
            >
              {triggerLoading ? "Läuft..." : "Jetzt abrechnen"}
            </button>
          )}
          <button onClick={() => setShowNew(true)} className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-hover transition-colors">+ Neues Abonnement</button>
        </div>
      </div>

      {error && <div className="bg-red-50 text-danger px-4 py-2 rounded-lg mb-4 text-sm">{error}<button onClick={() => setError("")} className="ml-2 font-bold">×</button></div>}
      {success && <div className="bg-green-50 text-success px-4 py-2 rounded-lg mb-4 text-sm">{success}</div>}

      {/* KPI Bar */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-surface border border-border rounded-xl p-4">
          <p className="text-xs text-muted mb-1">Aktive Abonnements</p>
          <p className="text-2xl font-bold">{activeSubs.length}</p>
          <p className="text-xs text-muted mt-0.5">{subs.length} gesamt</p>
        </div>
        <div className="bg-surface border border-border rounded-xl p-4">
          <p className="text-xs text-muted mb-1">MRR (aktiv)</p>
          <p className="text-2xl font-bold">{mrrTotal.toFixed(2)} €</p>
          <p className="text-xs text-muted mt-0.5">monatlich wiederkehrend</p>
        </div>
        <div className="bg-surface border border-border rounded-xl p-4">
          <p className="text-xs text-muted mb-1">Nächste Abrechnung</p>
          <p className="text-2xl font-bold">
            {nextBillingSub ? new Date(nextBillingSub.nextBillingDate).toLocaleDateString("de") : "–"}
          </p>
          <p className="text-xs text-muted mt-0.5">{nextBillingSub?.customerName ?? ""}</p>
        </div>
      </div>

      {/* Plans Management */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-3">
          <h2 className="font-semibold">Pläne verwalten</h2>
          <button onClick={openNewPlan} className="px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-medium hover:bg-primary-hover transition-colors">+ Neuer Plan</button>
        </div>
        <div className="bg-surface rounded-xl border border-border overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-background">
                <th className="px-4 py-3 text-left text-xs text-muted">Name</th>
                <th className="px-4 py-3 text-left text-xs text-muted">Kategorie</th>
                <th className="px-4 py-3 text-left text-xs text-muted">Preis / Monat</th>
                <th className="px-4 py-3 text-left text-xs text-muted">Zyklus</th>
                <th className="px-4 py-3 text-left text-xs text-muted">Status</th>
                <th className="px-4 py-3 text-right text-xs text-muted">Aktionen</th>
              </tr>
            </thead>
            <tbody>
              {plans.map((p: any) => (
                <tr key={p.id} className="border-b border-border hover:bg-background">
                  <td className="px-4 py-3 font-medium">
                    {p.name}
                    {p.description && <div className="text-xs text-muted">{p.description}</div>}
                  </td>
                  <td className="px-4 py-3 text-sm">{categoryMap[p.category] || p.category || "Allgemein"}</td>
                  <td className="px-4 py-3 font-semibold text-primary">{p.monthlyPrice?.toFixed(2)} EUR</td>
                  <td className="px-4 py-3 text-sm">{cycleMap[p.billingCycle] || p.billingCycle}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full ${p.isActive !== false ? "bg-green-50 text-success" : "bg-gray-100 text-gray-500"}`}>
                      {p.isActive !== false ? "Aktiv" : "Inaktiv"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex gap-3 justify-end">
                      <button onClick={() => openEditPlan(p)} className="text-xs text-primary hover:underline">Bearbeiten</button>
                      <button onClick={() => handleDeletePlan(p)} className="text-xs text-danger hover:underline">Löschen</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {plans.length === 0 && <div className="p-8 text-center text-muted text-sm">Keine Pläne vorhanden. Legen Sie einen neuen Plan an.</div>}
        </div>
      </div>

      {/* Subscriptions with filter tabs */}
      <div className="flex justify-between items-center mb-3">
        <h2 className="font-semibold">Abonnements</h2>
        <div className="flex gap-1 bg-background border border-border rounded-lg p-1">
          {STATUS_FILTERS.map(f => {
            const count = f.key === "Alle" ? subs.length : subs.filter(s => s.status === f.key).length;
            return (
              <button
                key={f.key}
                onClick={() => setStatusFilter(f.key)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${statusFilter === f.key ? "bg-surface shadow-sm text-text" : "text-muted hover:text-text"}`}
              >
                {f.label} {count > 0 && <span className="ml-0.5 text-muted">({count})</span>}
              </button>
            );
          })}
        </div>
      </div>

      <div className="bg-surface rounded-xl border border-border overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-background">
              <th className="px-4 py-3 text-left text-xs text-muted">Kunde</th>
              <th className="px-4 py-3 text-left text-xs text-muted">Plan</th>
              <th className="px-4 py-3 text-left text-xs text-muted">Status</th>
              <th className="px-4 py-3 text-left text-xs text-muted">Rechnungsstellung</th>
              <th className="px-4 py-3 text-left text-xs text-muted">Mandats-E-Mail</th>
              <th className="px-4 py-3 text-left text-xs text-muted">Start</th>
              <th className="px-4 py-3 text-left text-xs text-muted">Nächste Abrechnung</th>
              <th className="px-4 py-3 text-left text-xs text-muted">Laufzeit</th>
              <th className="px-4 py-3 text-right text-xs text-muted">Preis/Monat</th>
              <th className="px-4 py-3 text-left text-xs text-muted">Aktionen</th>
            </tr>
          </thead>
          <tbody>
            {filteredSubs.map((sub: any) => (
              <Fragment key={sub.id}>
                <tr className="border-b border-border hover:bg-background">
                  <td className="px-4 py-3 font-medium">{sub.customerName || "–"}</td>
                  <td className="px-4 py-3">
                    <div>{sub.planName}</div>
                    <div className="mt-1 text-xs text-muted">{sub.contractReference ? `${sub.contractReference} · V${sub.contractVersion}` : "Legacy: kein Vertragsnachweis"}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full ${s(sub.status).cls}`}>{s(sub.status).label}</span>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {sub.billingAuthorizedAt ? (
                      <div><span className="font-medium text-success">Autorisiert</span><div className="mt-1 text-muted">seit {new Date(sub.billingAuthorizedAt).toLocaleDateString("de")}</div></div>
                    ) : (
                      <span className="text-xs px-2 py-1 rounded-full bg-orange-50 text-orange-700">Wartet auf Rechnungsstellung</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {sub.mandateEmailStatus === "Sent" ? (
                      <div><span className="font-medium text-success">Gesendet</span><div className="mt-1 text-muted">{sub.mandateEmailRecipient}<br />{sub.mandateEmailSentAt ? new Date(sub.mandateEmailSentAt).toLocaleString("de-DE") : ""}</div></div>
                    ) : sub.mandateEmailStatus === "Failed" ? (
                      <div><span className="font-medium text-danger">Fehlgeschlagen</span><div className="mt-1 max-w-48 text-muted" title={sub.mandateEmailLastError || ""}>{sub.mandateEmailLastError || "Erneut senden"}</div></div>
                    ) : (
                      <span className="text-muted">Noch nicht versendet</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted">{new Date(sub.startDate).toLocaleDateString("de")}</td>
                  <td className="px-4 py-3 text-sm text-muted">
                    {sub.status === "PendingConfirmation" ? "–" : new Date(sub.nextBillingDate).toLocaleDateString("de")}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted">{durationLabel(sub.contractDurationMonths)}</td>
                  <td className="px-4 py-3 text-right font-medium">{sub.monthlyPrice?.toFixed(2)} EUR</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2 flex-wrap">
                      {sub.status === "PendingConfirmation" && (
                        <button disabled={sendingMandateId === sub.id} onClick={() => handleMandateEmail(sub.id)} className="text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700 disabled:opacity-50">
                          {sendingMandateId === sub.id ? "Wird gesendet..." : sub.mandateEmailStatus === "Sent" ? "E-Mail erneut senden" : "Einrichtungs-E-Mail senden"}
                        </button>
                      )}
                      {sub.status === "Active" && (
                        <button onClick={() => handleStatus(sub.id, "Paused")} className="text-xs text-warning hover:underline">Pausieren</button>
                      )}
                      {sub.status === "Paused" && (
                        <button onClick={() => handleStatus(sub.id, "Active")} className="text-xs text-success hover:underline">Aktivieren</button>
                      )}
                      {(sub.status === "Active" || sub.status === "Paused" || sub.status === "PendingConfirmation") && (
                        <button onClick={() => handleStatus(sub.id, "Cancelled")} className="text-xs text-danger hover:underline">Kündigen</button>
                      )}
                      <button onClick={() => handleExpandSub(sub.id)} className="text-xs text-gray-400 hover:text-gray-700 border border-gray-200 px-1.5 py-0.5 rounded">
                        {expandedSubId === sub.id ? "▲" : "▼ Rechnungen"}
                      </button>
                    </div>
                  </td>
                </tr>
                {expandedSubId === sub.id && (
                  <tr>
                    <td colSpan={10} className="bg-gray-50 px-6 py-4">
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Serienrechnungen</p>
                      {subInvoices[sub.id] === undefined ? (
                        <p className="text-xs text-gray-400">Laden...</p>
                      ) : subInvoices[sub.id].length === 0 ? (
                        <p className="text-xs text-gray-400">Noch keine Rechnungen vorhanden</p>
                      ) : (
                        <table className="w-full text-sm bg-white rounded-lg border border-gray-200 overflow-hidden">
                          <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                              <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">Rechnungs-Nr.</th>
                              <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">Datum</th>
                              <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">Abrechnungszeitraum</th>
                              <th className="text-right px-3 py-2 text-xs font-medium text-gray-500">Betrag (Brutto)</th>
                              <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {subInvoices[sub.id].map((i: any) => (
                              <tr key={i.id} className="border-t border-gray-100">
                                <td className="px-3 py-2 font-medium text-gray-800">{i.invoiceNumber}</td>
                                <td className="px-3 py-2 text-gray-500">{new Date(i.invoiceDate).toLocaleDateString("de")}</td>
                                <td className="px-3 py-2 text-gray-500">
                                  {i.billingPeriodStart && i.billingPeriodEnd
                                    ? `${new Date(i.billingPeriodStart).toLocaleDateString("de")} – ${new Date(i.billingPeriodEnd).toLocaleDateString("de")}`
                                    : "–"}
                                </td>
                                <td className="px-3 py-2 text-right font-medium text-gray-800">{Number(i.grossTotal).toFixed(2)} €</td>
                                <td className="px-3 py-2">
                                  <span className={`text-xs px-2 py-0.5 rounded-full ${inv(i.status).cls}`}>{collectionStatusMap[i.paymentCollectionStatus] || inv(i.status).label}</span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
        {filteredSubs.length === 0 && (
          <div className="p-8 text-center text-muted text-sm">
            {statusFilter === "Alle" ? "Keine Abonnements vorhanden." : `Keine Abonnements mit Status „${STATUS_FILTERS.find(f => f.key === statusFilter)?.label}".`}
          </div>
        )}
      </div>

      {/* New Subscription Modal */}
      {showNew && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <form onSubmit={handleCreate} className="bg-surface rounded-xl border border-border p-6 w-full max-w-lg shadow-lg">
            <h2 className="text-lg font-semibold mb-4">Neues Abonnement</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text mb-1">Kunde *</label>
                <select required value={form.customerId} onChange={e => handleCustomerChange(e.target.value)} className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary">
                  <option value="">Bitte wählen...</option>
                  {customers.map((c: any) => <option key={c.id} value={c.id}>{c.companyName}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-text mb-1">Angenommenes Vertragsangebot *</label>
                <select required disabled={!form.customerId || eligibleQuotesLoading} value={form.contractQuoteId} onChange={e => setForm({ ...form, contractQuoteId: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:opacity-60">
                  <option value="">{eligibleQuotesLoading ? "Wird geladen..." : "Bitte wählen..."}</option>
                  {eligibleQuotes.map((q: any) => <option key={q.id} value={q.id}>{q.quoteNumber} · Version {q.version} · {Number(q.monthlyPrice).toFixed(2)} EUR/Monat</option>)}
                </select>
                {form.customerId && !eligibleQuotesLoading && eligibleQuotes.length === 0 && (
                  <p className="mt-1 text-xs text-danger">Kein unterschriebenes Angebot mit monatlicher Position verfügbar. Bitte zuerst ein Angebot online unterschreiben lassen.</p>
                )}
                {form.contractQuoteId && eligibleQuotes.some(q => q.id === form.contractQuoteId) && (
                  <p className="mt-1 text-xs text-success">Vertragsgrundlage übernommen: {eligibleQuotes.find(q => q.id === form.contractQuoteId)?.quoteNumber}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-text mb-1">Plan *</label>
                <select required value={form.planId} onChange={e => setForm({ ...form, planId: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary">
                  <option value="">Bitte wählen...</option>
                  {plans.filter((p: any) => p.isActive !== false && p.billingCycle === "Monthly").map((p: any) => <option key={p.id} value={p.id}>{p.name} — {categoryMap[p.category] || p.category} ({p.monthlyPrice?.toFixed(2)} EUR/Monat)</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-text mb-1">Vertragslaufzeit</label>
                <select value={form.contractDurationMonths} onChange={e => setForm({ ...form, contractDurationMonths: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary">
                  {DURATIONS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                </select>
              </div>
              <label className="flex items-start gap-3 rounded-lg border border-border bg-background p-3 text-sm">
                <input required type="checkbox" checked={form.businessCustomerConfirmed} onChange={e => setForm({ ...form, businessCustomerConfirmed: e.target.checked })} className="mt-1" />
                <span>Ich bestätige, dass der Kunde als Unternehmer handelt (B2B) und das ausgewählte Angebot die Vertragsgrundlage für diese Serienrechnung ist.</span>
              </label>
              <p className="text-xs text-muted">Der im unterschriebenen Angebot vereinbarte Monatsbetrag wird unveränderlich gespeichert. Erst danach versendet GentleSuite die einmalige Mollie-Zahlungseinrichtung; die Abrechnung startet ausschließlich nach einem gültigen Mandat.</p>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button type="button" onClick={() => setShowNew(false)} className="px-4 py-2 border border-border rounded-lg text-sm font-medium hover:bg-background transition-colors">Abbrechen</button>
              <button type="submit" disabled={creating} className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-hover transition-colors disabled:opacity-50">{creating ? "Wird angelegt und gesendet..." : "Anlegen & E-Mail senden"}</button>
            </div>
          </form>
        </div>
      )}

      {/* Plan Create/Edit Modal */}
      {showPlanModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <form onSubmit={handlePlanSubmit} className="bg-surface rounded-xl border border-border p-6 w-full max-w-lg shadow-lg">
            <h2 className="text-lg font-semibold mb-4">{editingPlan ? "Plan bearbeiten" : "Neuer Plan"}</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text mb-1">Name *</label>
                <input required value={planForm.name} onChange={e => setPlanForm({ ...planForm, name: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" placeholder="z.B. Domain-Hosting Basic" />
              </div>
              <div>
                <label className="block text-sm font-medium text-text mb-1">Beschreibung</label>
                <textarea value={planForm.description} onChange={e => setPlanForm({ ...planForm, description: e.target.value })} rows={2} className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none" placeholder="Optionale Beschreibung..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text mb-1">Preis (EUR/Monat) *</label>
                  <input required type="number" step="0.01" min="0" value={planForm.monthlyPrice} onChange={e => setPlanForm({ ...planForm, monthlyPrice: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" placeholder="9.99" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text mb-1">Abrechnungszyklus</label>
                  <select value={planForm.billingCycle} onChange={e => setPlanForm({ ...planForm, billingCycle: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary">
                    {CYCLES.map(c => <option key={c} value={c}>{cycleMap[c]}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-text mb-1">Kategorie</label>
                <select value={planForm.category} onChange={e => setPlanForm({ ...planForm, category: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary">
                  {CATEGORIES.map(c => <option key={c} value={c}>{categoryMap[c]}</option>)}
                </select>
              </div>
              {editingPlan && (
                <div className="flex items-center gap-3">
                  <input type="checkbox" id="planActive" checked={planForm.isActive} onChange={e => setPlanForm({ ...planForm, isActive: e.target.checked })} className="w-4 h-4 accent-primary" />
                  <label htmlFor="planActive" className="text-sm font-medium text-text">Plan aktiv (erscheint in Auswahl)</label>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button type="button" onClick={() => setShowPlanModal(false)} className="px-4 py-2 border border-border rounded-lg text-sm font-medium hover:bg-background transition-colors">Abbrechen</button>
              <button type="submit" disabled={planLoading} className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-hover transition-colors disabled:opacity-50">
                {planLoading ? "Speichern..." : editingPlan ? "Aktualisieren" : "Anlegen"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
