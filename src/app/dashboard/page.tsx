"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import Link from "next/link";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

const MONTHS = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];

export default function DashboardPage() {
  const [kpis, setKpis] = useState<any>(null);
  const [finance, setFinance] = useState<any>(null);
  const [pendingSubCount, setPendingSubCount] = useState(0);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [overdueInvoices, setOverdueInvoices] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  const loadData = () => {
    api.kpis().then(d => { setKpis(d); setLastRefresh(new Date()); }).catch(() => {});
    api.finance().then(setFinance).catch(() => {});
    api.allSubs().then((list: any[]) => {
      setPendingSubCount((list || []).filter((s: any) => s.status === "PendingConfirmation").length);
    }).catch(() => {});
    api.invoices("status=Overdue&pageSize=5").then((d: any) => setOverdueInvoices(d?.items || [])).catch(() => {});
    api.recentActivity(8).then(setRecentActivity).catch(() => {});
  };

  useEffect(() => {
    const u = localStorage.getItem("user");
    if (!u) { window.location.href = "/login"; return; }
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  const chartData = finance?.revenueChart?.map((m: any) => ({
    name: `${MONTHS[m.month - 1]} ${m.year}`,
    Umsatz: m.revenue,
    Ausgaben: m.expenses,
  }));

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <div className="flex items-center gap-3">
          {lastRefresh && <span className="text-xs text-muted">Aktualisiert: {lastRefresh.toLocaleTimeString("de")}</span>}
          <button onClick={loadData} className="text-xs px-3 py-1.5 border border-border rounded-lg hover:bg-background">Aktualisieren</button>
        </div>
      </div>

      <div className="space-y-2 mb-6">
        {pendingSubCount > 0 && (
          <Link href="/subscriptions" className="flex items-center justify-between bg-orange-50 border border-orange-200 text-orange-700 px-4 py-3 rounded-xl text-sm hover:bg-orange-100 transition-colors">
            <span className="font-semibold">⚠ {pendingSubCount} Abonnement{pendingSubCount > 1 ? "s warten" : " wartet"} auf Bestätigung</span>
            <span className="text-orange-500">→ Jetzt bestätigen</span>
          </Link>
        )}
        {kpis?.overdueInvoices > 0 && (
          <Link href="/invoices?status=Overdue" className="flex items-center justify-between bg-red-50 border border-red-200 text-danger px-4 py-3 rounded-xl text-sm hover:bg-red-100 transition-colors">
            <span className="font-semibold">🔴 {kpis.overdueInvoices} überfällige Rechnung{kpis.overdueInvoices > 1 ? "en" : ""}</span>
            <span>→ Mahnungen senden</span>
          </Link>
        )}
        {kpis?.openQuotes > 0 && (
          <Link href="/quotes" className="flex items-center justify-between bg-yellow-50 border border-yellow-200 text-warning px-4 py-3 rounded-xl text-sm hover:bg-yellow-100 transition-colors">
            <span className="font-semibold">⚡ {kpis.openQuotes} offene{kpis.openQuotes > 1 ? " Angebote" : "s Angebot"} warten auf Antwort</span>
            <span>→ Angebote prüfen</span>
          </Link>
        )}
      </div>

      {kpis && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Aktive Kunden", value: kpis.activeCustomers, color: "text-primary" },
            { label: "Offene Angebote", value: kpis.openQuotes, color: "text-warning" },
            { label: "Ueberfaellige Rechnungen", value: kpis.overdueInvoices, color: "text-danger" },
            { label: "Monatl. Umsatz (MRR)", value: `${kpis.monthlyRecurringRevenue?.toFixed(0)} EUR`, color: "text-success" },
            { label: "Aktive Abonnements", value: kpis.activeSubscriptions, color: "text-primary" },
            { label: "Offene Onboardings", value: kpis.openOnboardings, color: "text-blue-700" },
            { label: "Ueberfaellige Aufgaben", value: kpis.overdueTasks, color: "text-danger" },
          ].map((kpi, i) => (
            <div key={i} className="bg-surface rounded-xl border border-border p-5">
              <p className="text-sm text-muted mb-1">{kpi.label}</p>
              <p className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</p>
            </div>
          ))}
        </div>
      )}

      {finance && (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          <div className="bg-surface rounded-xl border border-border p-5">
            <p className="text-sm text-muted mb-1">Umsatz diesen Monat</p>
            <p className="text-xl font-bold text-success">{finance.revenueThisMonth?.toFixed(2)} EUR</p>
          </div>
          <div className="bg-surface rounded-xl border border-border p-5">
            <p className="text-sm text-muted mb-1">Offene Forderungen</p>
            <p className="text-xl font-bold text-warning">{finance.openReceivables?.toFixed(2)} EUR</p>
          </div>
          <div className="bg-surface rounded-xl border border-border p-5">
            <p className="text-sm text-muted mb-1">Steuer-Ruecklage Empfehlung</p>
            <p className="text-xl font-bold">{finance.taxReserveRecommendation?.toFixed(2)} EUR</p>
          </div>
        </div>
      )}

      {overdueInvoices.length > 0 && (
        <div className="bg-surface rounded-xl border border-red-200 p-5 mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-danger">Überfällige Rechnungen ({overdueInvoices.length})</h2>
            <Link href="/invoices?status=Overdue" className="text-xs text-primary hover:underline">Alle anzeigen →</Link>
          </div>
          <div className="space-y-2">
            {overdueInvoices.map((inv: any) => (
              <Link key={inv.id} href={`/invoices/${inv.id}`} className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-background transition-colors">
                <div>
                  <span className="text-sm font-medium">{inv.invoiceNumber}</span>
                  <span className="text-sm text-muted ml-2">{inv.customerName}</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-medium text-danger">{inv.grossTotal?.toFixed(2)} EUR</span>
                  <span className="text-xs text-muted ml-3">fällig {new Date(inv.dueDate).toLocaleDateString("de")}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {chartData?.length > 0 && (
        <div className="bg-surface rounded-xl border border-border p-6 mb-8">
          <h2 className="font-semibold mb-4">Umsatz & Ausgaben (6 Monate)</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#EAECF0" />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#667085" }} />
              <YAxis tick={{ fontSize: 12, fill: "#667085" }} tickFormatter={(v: number) => `${v.toLocaleString("de-DE")} EUR`} />
              <Tooltip formatter={(value: number) => [`${value.toFixed(2)} EUR`]} contentStyle={{ borderRadius: "8px", border: "1px solid #EAECF0" }} />
              <Legend />
              <Bar dataKey="Umsatz" fill="#027A48" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Ausgaben" fill="#B42318" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <h2 className="font-semibold mb-3">Schnellzugriff</h2>
          <div className="grid grid-cols-2 gap-3">
            <Link href="/customers" className="bg-surface rounded-xl border border-border p-4 hover:border-primary transition-colors"><h3 className="font-semibold mb-1 text-sm">Neuer Kunde</h3><p className="text-xs text-muted">Kunden anlegen</p></Link>
            <Link href="/quotes" className="bg-surface rounded-xl border border-border p-4 hover:border-primary transition-colors"><h3 className="font-semibold mb-1 text-sm">Neues Angebot</h3><p className="text-xs text-muted">Angebot erstellen</p></Link>
            <Link href="/invoices" className="bg-surface rounded-xl border border-border p-4 hover:border-primary transition-colors"><h3 className="font-semibold mb-1 text-sm">Neue Rechnung</h3><p className="text-xs text-muted">Rechnung erstellen</p></Link>
            <Link href="/projects" className="bg-surface rounded-xl border border-border p-4 hover:border-primary transition-colors"><h3 className="font-semibold mb-1 text-sm">Neues Projekt</h3><p className="text-xs text-muted">Projekt anlegen</p></Link>
            <Link href="/expenses" className="bg-surface rounded-xl border border-border p-4 hover:border-primary transition-colors"><h3 className="font-semibold mb-1 text-sm">Neue Ausgabe</h3><p className="text-xs text-muted">Ausgabe erfassen</p></Link>
            <Link href="/time" className="bg-surface rounded-xl border border-border p-4 hover:border-primary transition-colors"><h3 className="font-semibold mb-1 text-sm">Zeiteintrag</h3><p className="text-xs text-muted">Zeit erfassen</p></Link>
            <Link href="/accounting" className="bg-surface rounded-xl border border-border p-4 hover:border-primary transition-colors"><h3 className="font-semibold mb-1 text-sm">Buchhaltung</h3><p className="text-xs text-muted">Journal & Konten</p></Link>
            <Link href="/vat" className="bg-surface rounded-xl border border-border p-4 hover:border-primary transition-colors"><h3 className="font-semibold mb-1 text-sm">USt-Voranmeldung</h3><p className="text-xs text-muted">Steuer & DATEV</p></Link>
          </div>
        </div>
        <div>
          <h2 className="font-semibold mb-3">Letzte Aktivitäten</h2>
          <div className="bg-surface rounded-xl border border-border divide-y divide-border">
            {recentActivity.length === 0 && <div className="px-4 py-6 text-center text-sm text-muted">Noch keine Aktivitäten</div>}
            {recentActivity.map((a: any) => (
              <div key={a.id} className="px-4 py-3 flex items-start gap-3">
                <span className="w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">{a.entityType?.[0] ?? "?"}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm"><span className="font-medium">{a.action}</span>{a.description ? <span className="text-muted"> — {a.description}</span> : null}</p>
                  <p className="text-xs text-muted">{a.entityType} · {new Date(a.createdAt).toLocaleString("de", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
