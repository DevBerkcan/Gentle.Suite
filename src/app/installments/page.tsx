"use client";
import { useEffect, useState, Fragment } from "react";
import { api } from "@/lib/api";
import SubscriptionPaymentHistory from "@/app/components/SubscriptionPaymentHistory";

const statusMap: Record<string, { label: string; cls: string }> = {
  Active: { label: "Aktiv", cls: "bg-green-50 text-success" },
  Paused: { label: "Pausiert", cls: "bg-yellow-50 text-warning" },
  Cancelled: { label: "Abgebrochen", cls: "bg-gray-100 text-gray-700" },
  PendingConfirmation: { label: "Bestätigung ausstehend", cls: "bg-orange-50 text-orange-700" },
  Completed: { label: "Abgeschlossen", cls: "bg-blue-50 text-blue-700" },
};

const STATUS_FILTERS = [
  { key: "Alle", label: "Alle" },
  { key: "PendingConfirmation", label: "Ausstehend" },
  { key: "Active", label: "Aktiv" },
  { key: "Completed", label: "Abgeschlossen" },
  { key: "Cancelled", label: "Abgebrochen" },
];

export default function InstallmentsPage() {
  const [subs, setSubs] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [statusFilter, setStatusFilter] = useState("Alle");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [sendingMandateId, setSendingMandateId] = useState<string | null>(null);
  const [authorizingId, setAuthorizingId] = useState<string | null>(null);

  function loadSubs() {
    api.allSubs().then(setSubs).catch(() => setError("Ratenzahlungen konnten nicht geladen werden"));
  }

  useEffect(() => { loadSubs(); }, []);

  const plans = subs.filter(s => s.isInstallmentPlan);
  const activePlans = plans.filter(s => s.status === "Active");
  const outstandingTotal = activePlans.reduce((sum, s) => {
    const total = Number(s.totalInstallmentAmount || 0);
    const paid = (s.installmentsCompleted || 0) * Number(s.monthlyPrice || 0);
    return sum + Math.max(0, total - paid);
  }, 0);
  const completedThisMonth = plans.filter(s => {
    if (s.status !== "Completed") return false;
    const now = new Date();
    const d = s.nextBillingDate ? new Date(s.nextBillingDate) : null;
    return d && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  const filteredPlans = statusFilter === "Alle" ? plans : plans.filter(s => s.status === statusFilter);

  async function handleStatus(id: string, status: string) {
    try {
      await api.updateSubStatus(id, { status });
      setSuccess("Status geändert");
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

  async function handleBillNow(id: string) {
    if (!confirm("Rechnung jetzt erstellen und versenden? Der Kunde erhält die Rechnung sofort per E-Mail. Der SEPA-Einzug erfolgt automatisch nach Ablauf der gesetzlichen Vorabinformationsfrist.")) return;
    setAuthorizingId(id);
    try {
      await api.billSubscriptionNow(id);
      setSuccess("Rechnung wurde erstellt und versendet — der SEPA-Einzug erfolgt nach Ablauf der Vorabinformationsfrist automatisch.");
      setTimeout(() => setSuccess(""), 6000);
      loadSubs();
    } catch (e: any) {
      setError(e?.message || "Fehler beim Erstellen der Rechnung");
    } finally {
      setAuthorizingId(null);
    }
  }

  function handleExpand(id: string) {
    setExpandedId(current => (current === id ? null : id));
  }

  const s = (status: string) => statusMap[status] || { label: status, cls: "bg-gray-100 text-gray-700" };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Ratenzahlungen</h1>
          <p className="text-sm text-muted mt-0.5">Kunden, die einen Gesamtbetrag in monatlichen Raten abbezahlen · eigene Rechnungsnummern-Serie „RA-“</p>
        </div>
      </div>

      {error && <div className="bg-red-50 text-danger px-4 py-2 rounded-lg mb-4 text-sm">{error}<button onClick={() => setError("")} className="ml-2 font-bold">×</button></div>}
      {success && <div className="bg-green-50 text-success px-4 py-2 rounded-lg mb-4 text-sm">{success}</div>}

      {/* KPI Bar */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-surface border border-border rounded-xl p-4">
          <p className="text-xs text-muted mb-1">Aktive Ratenzahlungen</p>
          <p className="text-2xl font-bold">{activePlans.length}</p>
          <p className="text-xs text-muted mt-0.5">{plans.length} gesamt</p>
        </div>
        <div className="bg-surface border border-border rounded-xl p-4">
          <p className="text-xs text-muted mb-1">Offener Restbetrag (aktiv)</p>
          <p className="text-2xl font-bold">{outstandingTotal.toFixed(2)} €</p>
          <p className="text-xs text-muted mt-0.5">noch ausstehend über alle aktiven Pläne</p>
        </div>
        <div className="bg-surface border border-border rounded-xl p-4">
          <p className="text-xs text-muted mb-1">Abgeschlossen diesen Monat</p>
          <p className="text-2xl font-bold">{completedThisMonth}</p>
          <p className="text-xs text-muted mt-0.5">vollständig abbezahlt</p>
        </div>
      </div>

      <div className="flex justify-between items-center mb-3">
        <h2 className="font-semibold">Ratenzahlungspläne</h2>
        <div className="flex gap-1 bg-background border border-border rounded-lg p-1">
          {STATUS_FILTERS.map(f => {
            const count = f.key === "Alle" ? plans.length : plans.filter(s => s.status === f.key).length;
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
              <th className="px-4 py-3 text-left text-xs text-muted">Produkt</th>
              <th className="px-4 py-3 text-left text-xs text-muted">Status</th>
              <th className="px-4 py-3 text-left text-xs text-muted">Rechnungsstellung</th>
              <th className="px-4 py-3 text-left text-xs text-muted">Mandats-E-Mail</th>
              <th className="px-4 py-3 text-left text-xs text-muted">Raten</th>
              <th className="px-4 py-3 text-left text-xs text-muted">Bezahlt</th>
              <th className="px-4 py-3 text-left text-xs text-muted">Nächste Abbuchung</th>
              <th className="px-4 py-3 text-right text-xs text-muted">Gesamtbetrag</th>
              <th className="px-4 py-3 text-left text-xs text-muted">Aktionen</th>
            </tr>
          </thead>
          <tbody>
            {filteredPlans.map((sub: any) => (
              <Fragment key={sub.id}>
                <tr className="border-b border-border hover:bg-background">
                  <td className="px-4 py-3 font-medium">{sub.customerName || "–"}</td>
                  <td className="px-4 py-3">
                    <div>{sub.installmentSourceTitle || sub.planName}</div>
                    <div className="mt-1 text-xs text-muted">{sub.contractReference ? `${sub.contractReference} · V${sub.contractVersion}` : "–"}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full ${s(sub.status).cls}`}>{s(sub.status).label}</span>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {sub.billingAuthorizedAt ? (
                      <div><span className="font-medium text-success">Rechnung gesendet</span><div className="mt-1 text-muted">seit {new Date(sub.billingAuthorizedAt).toLocaleDateString("de")}</div></div>
                    ) : sub.mollieMandateStatus === "valid" ? (
                      <button disabled={authorizingId === sub.id} onClick={() => handleBillNow(sub.id)} className="text-xs bg-primary text-white px-2 py-1 rounded hover:bg-primary-hover disabled:opacity-50">
                        {authorizingId === sub.id ? "Wird versendet..." : "Rechnung jetzt senden"}
                      </button>
                    ) : (
                      <span className="text-xs px-2 py-1 rounded-full bg-orange-50 text-orange-700">Wartet auf SEPA-Mandat</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {sub.mandateEmailStatus === "Sent" ? (
                      <div><span className="font-medium text-success">Gesendet</span><div className="mt-1 text-muted">{sub.mandateEmailRecipient}</div></div>
                    ) : sub.mandateEmailStatus === "Failed" ? (
                      <div><span className="font-medium text-danger">Fehlgeschlagen</span><div className="mt-1 max-w-48 text-muted" title={sub.mandateEmailLastError || ""}>{sub.mandateEmailLastError || "Erneut senden"}</div></div>
                    ) : (
                      <span className="text-muted">Noch nicht versendet</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span className="font-medium">{sub.installmentsCompleted || 0}</span>
                    <span className="text-muted"> von {sub.contractDurationMonths ?? "–"}</span>
                    <div className="text-xs text-muted mt-0.5">{sub.monthlyPrice?.toFixed(2)} € / Rate</div>
                  </td>
                  <td className="px-4 py-3 text-sm min-w-[120px]">
                    {(() => {
                      const total = Number(sub.totalInstallmentAmount || 0);
                      const paid = Number(sub.paidAmount || 0);
                      const pct = total > 0 ? Math.min(100, (paid / total) * 100) : 0;
                      return (
                        <>
                          <div className="h-1.5 rounded-full bg-gray-200 overflow-hidden">
                            <div className="h-full rounded-full bg-success" style={{ width: `${pct}%` }} />
                          </div>
                          <div className="mt-1 text-xs text-muted">{paid.toFixed(2)} € ({pct.toFixed(0)}%)</div>
                        </>
                      );
                    })()}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted">
                    {sub.status === "Active" ? new Date(sub.nextBillingDate).toLocaleDateString("de") : "–"}
                  </td>
                  <td className="px-4 py-3 text-right font-medium">{Number(sub.totalInstallmentAmount || 0).toFixed(2)} €</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2 flex-wrap">
                      {sub.status === "PendingConfirmation" && sub.mollieMandateStatus !== "valid" && (
                        <button disabled={sendingMandateId === sub.id} onClick={() => handleMandateEmail(sub.id)} className="text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700 disabled:opacity-50">
                          {sendingMandateId === sub.id ? "Wird gesendet..." : sub.mandateEmailStatus === "Sent" ? "E-Mail erneut senden" : "Einrichtungs-E-Mail senden"}
                        </button>
                      )}
                      {sub.status === "Active" && (
                        <button onClick={() => handleStatus(sub.id, "Paused")} className="text-xs text-warning hover:underline">Pausieren</button>
                      )}
                      {sub.status === "Paused" && (
                        <button onClick={() => handleStatus(sub.id, "Active")} className="text-xs text-success hover:underline">Fortsetzen</button>
                      )}
                      {(sub.status === "Active" || sub.status === "Paused" || sub.status === "PendingConfirmation") && (
                        <button onClick={() => handleStatus(sub.id, "Cancelled")} className="text-xs text-danger hover:underline">Abbrechen</button>
                      )}
                      <button onClick={() => handleExpand(sub.id)} className="text-xs text-gray-400 hover:text-gray-700 border border-gray-200 px-1.5 py-0.5 rounded">
                        {expandedId === sub.id ? "▲" : "▼ Details"}
                      </button>
                    </div>
                  </td>
                </tr>
                {expandedId === sub.id && (
                  <tr>
                    <td colSpan={10} className="bg-gray-50 px-6 py-4">
                      <SubscriptionPaymentHistory
                        subscriptionId={sub.id}
                        isInstallmentPlan
                        installmentsCompleted={sub.installmentsCompleted}
                        contractDurationMonths={sub.contractDurationMonths}
                        totalInstallmentAmount={sub.totalInstallmentAmount}
                        amountPerPeriod={sub.monthlyPrice || 0}
                        nextBillingDate={sub.nextBillingDate}
                        status={sub.status}
                        paidAmount={sub.paidAmount}
                      />
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
        {filteredPlans.length === 0 && (
          <div className="p-8 text-center text-muted text-sm">
            {statusFilter === "Alle"
              ? "Noch keine Ratenzahlungen vorhanden. Sie entstehen automatisch, sobald ein Kunde bei der Angebotsunterschrift eine Ratenzahlung wählt."
              : `Keine Ratenzahlungen mit Status „${STATUS_FILTERS.find(f => f.key === statusFilter)?.label}".`}
          </div>
        )}
      </div>
    </div>
  );
}
