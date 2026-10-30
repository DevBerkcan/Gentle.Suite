"use client";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { useLocalStorage } from "@/hooks/useLocalStorage";

const emptyLine = () => ({
  serviceCatalogItemId: null as string | null,
  title: "",
  description: "",
  unit: "",
  quantity: 1,
  unitPrice: 0,
  discountPercent: 0,
  vatPercent: 19,
  sortOrder: 0,
  lineType: "OneTime" as "OneTime" | "RecurringMonthly",
});

const statusMap: Record<string, string> = {
  Draft: "Entwurf",
  Sent: "Gesendet",
  Viewed: "Angesehen",
  Accepted: "Angenommen",
  Ordered: "Auftrag",
  Rejected: "Abgelehnt",
  Expired: "Abgelaufen",
};

// Rechnungsart (serverseitig abgeleitet, siehe InvoiceKinds im Backend)
const kindOptions: { value: string; label: string }[] = [
  { value: "", label: "Alle Arten" },
  { value: "standard", label: "Normal" },
  { value: "installment", label: "Ratenzahlung" },
  { value: "downpayment", label: "Anzahlung" },
  { value: "recurring", label: "Serienrechnung" },
  { value: "cancellation", label: "Storno" },
  { value: "creditnote", label: "Gutschrift" },
];
const kindLabel: Record<string, string> = Object.fromEntries(kindOptions.filter((k) => k.value).map((k) => [k.value, k.label]));
const kindBadgeClass: Record<string, string> = {
  standard: "bg-background text-muted border border-border",
  installment: "bg-secondary/15 text-secondary",
  downpayment: "bg-secondary/10 text-secondary border border-secondary/30",
  recurring: "bg-accent/40 text-navy",
  cancellation: "bg-red-50 text-danger",
  creditnote: "bg-blue-50 text-blue-700",
};
const statusValues = ["Draft", "Final", "Open", "Overdue", "Paid", "Cancelled"];

type InvoiceFilters = { status: string; kind: string; customerId: string };
const emptyFilters: InvoiceFilters = { status: "", kind: "", customerId: "" };

function filtersToQuery(f: InvoiceFilters) {
  const q = new URLSearchParams();
  if (f.status) q.set("status", f.status);
  if (f.kind) q.set("kind", f.kind);
  if (f.customerId) q.set("customerId", f.customerId);
  return q;
}

/** Durchsuchbare Kundenauswahl für den Filter (serverseitige Suche, max. 20 Treffer). */
function CustomerFilter({ value, label, onChange }: { value: string; label: string; onChange: (id: string, name: string) => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => {
      const params = new URLSearchParams({ pageSize: "20" });
      if (query.trim()) params.set("search", query.trim());
      setLoading(true);
      api.customers(params.toString())
        .then((r: any) => setResults(r?.items || []))
        .catch(() => setResults([]))
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(t);
  }, [query, open]);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <div className={`flex items-center gap-1 pl-3 pr-1 py-1 border rounded-full text-sm bg-surface ${value ? "border-navy" : "border-border"}`}>
        <input
          value={open ? query : value ? label : ""}
          onFocus={() => { setOpen(true); setQuery(""); }}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Kunde filtern…"
          className="bg-transparent outline-none w-44 placeholder:text-muted"
        />
        {value && (
          <button type="button" title="Kundenfilter entfernen" onClick={() => { onChange("", ""); setOpen(false); }} className="w-6 h-6 rounded-full text-muted hover:bg-background hover:text-text">
            ×
          </button>
        )}
      </div>
      {open && (
        <div className="absolute left-0 top-full mt-1 w-72 max-h-72 overflow-y-auto bg-surface border border-border rounded-xl shadow-lg py-1 z-40">
          {loading && <div className="px-4 py-2 text-sm text-muted">Suche läuft…</div>}
          {!loading && results.length === 0 && <div className="px-4 py-2 text-sm text-muted">Keine Kunden gefunden</div>}
          {!loading && results.map((c: any) => (
            <button
              key={c.id}
              type="button"
              onClick={() => { onChange(c.id, c.companyName); setOpen(false); }}
              className={`w-full text-left px-4 py-2 text-sm hover:bg-background ${c.id === value ? "font-semibold" : ""}`}
            >
              {c.companyName}
              {c.customerNumber && <span className="ml-2 text-xs text-muted">{c.customerNumber}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function InvoicesPage() {
  const emptyForm = {
    customerId: "",
    subject: "",
    paymentTermDays: 14,
    taxMode: "Standard",
    introText: "",
    outroText: "",
    notes: "",
  };

  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [show, setShow] = useState(false);
  const [modalTab, setModalTab] = useState<"quote" | "blank">("quote");
  const [customers, setCustomers] = useState<any[]>([]);
  const [quotes, setQuotes] = useState<any[]>([]);
  const [quotesLoading, setQuotesLoading] = useState(false);
  const [converting, setConverting] = useState<string | null>(null);
  const [form, setForm, clearForm] = useLocalStorage("draft:invoice-create", emptyForm);
  const [lines, setLines, clearLines] = useLocalStorage("draft:invoice-lines", [emptyLine()]);
  const [saving, setSaving] = useState(false);
  const [filters, setFilters] = useState<InvoiceFilters>(emptyFilters);
  const [customerFilterName, setCustomerFilterName] = useState("");
  const [xmlDownloading, setXmlDownloading] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [payingInvoice, setPayingInvoice] = useState<any | null>(null);
  const [listPaymentForm, setListPaymentForm] = useState({ amount: 0, paymentDate: new Date().toISOString().split("T")[0], paymentMethod: "BankTransfer", reference: "", note: "" });
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);

  const [serviceCategories, setServiceCategories] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [serviceSearch, setServiceSearch] = useState("");
  const [servicePickerOpen, setServicePickerOpen] = useState<number | null>(null);
  const servicePickerRef = useRef<HTMLDivElement>(null);
  const [pickerAnchor, setPickerAnchor] = useState<{ top: number; left: number } | null>(null);

  const load = (f: InvoiceFilters = filters, p = 1) => {
    const params = filtersToQuery(f);
    // Filter + Seite im URL halten, damit sie einen Reload überstehen.
    const urlQuery = new URLSearchParams(params);
    if (p > 1) urlQuery.set("page", String(p));
    const qs = urlQuery.toString();
    window.history.replaceState(window.history.state, "", `${window.location.pathname}${qs ? `?${qs}` : ""}`);

    params.set("page", String(p));
    params.set("pageSize", String(pageSize));
    api
      .invoices(params.toString())
      .then(setData)
      .catch(() => setError("Rechnungen konnten nicht geladen werden"));
  };

  const applyFilters = (f: InvoiceFilters) => {
    setFilters(f);
    setPage(1);
    setSelected(new Set());
    load(f, 1);
  };

  useEffect(() => {
    // Filter aus dem URL übernehmen (Reload / geteilter Link).
    const q = new URLSearchParams(window.location.search);
    const status = q.get("status") || "";
    const kind = q.get("kind") || "";
    const initial: InvoiceFilters = {
      status: statusValues.includes(status) ? status : "",
      kind: kindLabel[kind] ? kind : "",
      customerId: q.get("customerId") || "",
    };
    const p = Math.max(1, parseInt(q.get("page") || "1", 10) || 1);
    setFilters(initial);
    setPage(p);
    load(initial, p);
    if (initial.customerId) {
      api.customer(initial.customerId).then((c: any) => setCustomerFilterName(c?.companyName || "")).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (servicePickerRef.current && !servicePickerRef.current.contains(e.target as Node)) {
        setServicePickerOpen(null);
        setPickerAnchor(null);
        setServiceSearch("");
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleXmlDownload = async (id: string, invoiceNumber: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setXmlDownloading(id);
    try {
      const blob = await api.invoiceXml(id);
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `XRechnung_${invoiceNumber}.xml`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch {
      setError("XRechnung-Export fehlgeschlagen.");
    } finally {
      setXmlDownloading(null);
    }
  };

  const handlePdfDownload = async (invoiceId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const blob = await api.invoicePdfBlob(invoiceId);
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch {
      setError("PDF konnte nicht geladen werden");
    }
  };

  const openModal = async () => {
    setModalTab("quote");
    setShow(true);
    setQuotesLoading(true);
    setSelectedCustomer(null);
    try {
      const [c, q, settings, cats] = await Promise.all([
        api.customers("pageSize=200"),
        api.quotes("pageSize=200"),
        api.settings(),
        api.services(),
      ]);
      setCustomers(c.items || []);
      setQuotes(
        (q.items || []).filter(
          (qt: any) => !qt.hasInvoice && ["Accepted", "Ordered"].includes(qt.status)
        )
      );
      setServiceCategories(cats || []);
      setForm({
        ...emptyForm,
        paymentTermDays: settings?.invoicePaymentTermDays || 14,
        taxMode: settings?.defaultTaxMode || "Standard",
        introText: settings?.invoiceIntroTemplate || "",
        outroText: settings?.invoiceOutroTemplate || "",
      });
    } catch {}
    setQuotesLoading(false);
    setLines([emptyLine()]);
  };

  const handleCustomerChange = async (customerId: string) => {
    setForm((f: any) => ({ ...f, customerId }));
    if (!customerId) { setSelectedCustomer(null); return; }
    try {
      const detail = await api.customer(customerId);
      setSelectedCustomer(detail);
    } catch {
      setSelectedCustomer(null);
    }
  };

  const handleConvertQuote = async (quoteId: string) => {
    setConverting(quoteId);
    try {
      const selectedQuote = quotes.find((q: any) => q.id === quoteId);
      if (selectedQuote?.status === "Accepted") {
        await api.markQuoteAsOrdered(quoteId);
      }
      const inv = await api.convertQuoteToInvoice(quoteId);
      setShow(false);
      window.location.href = `/invoices/${inv.id}`;
    } catch (e: any) {
      setError(e.message || "Fehler beim Umwandeln.");
    } finally {
      setConverting(null);
    }
  };

  const updateLine = (idx: number, field: string, val: any) => {
    const l = [...lines];
    (l[idx] as any)[field] = val;
    setLines(l);
  };
  const removeLine = (idx: number) => setLines(lines.filter((_: any, i: number) => i !== idx));
  const addLine = () => setLines([...lines, emptyLine()]);

  const applyServiceToLine = (idx: number, item: any) => {
    const l = [...lines];
    l[idx] = {
      ...l[idx],
      serviceCatalogItemId: item.id,
      title: item.name,
      description: item.description || "",
      unitPrice: item.defaultPrice ?? 0,
      vatPercent: 19,
    };
    setLines(l);
    setServicePickerOpen(null);
    setServiceSearch("");
  };

  const filteredServices = (search: string) => {
    const q = search.toLowerCase();
    return serviceCategories
      .map((cat: any) => ({
        ...cat,
        items: (cat.items || []).filter(
          (i: any) => !q || i.name.toLowerCase().includes(q) || (i.description || "").toLowerCase().includes(q)
        ),
      }))
      .filter((cat: any) => cat.items.length > 0);
  };

  const netTotal = lines.reduce((s: number, l: any) => {
    const base = l.quantity * l.unitPrice;
    const disc = base * ((l.discountPercent || 0) / 100);
    return s + (base - disc);
  }, 0);

  const vatTotal = lines.reduce((s: number, l: any) => {
    const base = l.quantity * l.unitPrice;
    const disc = base * ((l.discountPercent || 0) / 100);
    const net = base - disc;
    return s + net * (l.vatPercent / 100);
  }, 0);

  const grossTotal = netTotal + vatTotal;

  const primaryLocation = selectedCustomer?.locations?.find((loc: any) => loc.isPrimary) ?? selectedCustomer?.locations?.[0];
  const primaryContact = selectedCustomer?.contacts?.find((c: any) => c.isPrimary) ?? selectedCustomer?.contacts?.[0];

const save = async () => {
  if (!form.customerId) { setError("Bitte einen Kunden auswählen."); return; }
  const validLines = lines.filter((l: any) => l.title.trim());
  if (!validLines.length) { setError("Mindestens eine Position mit Titel ist erforderlich."); return; }
  setSaving(true);
  setError("");
  try {
    const req = {
      customerId: form.customerId,
      subject: form.subject || undefined,
      paymentTermDays: form.paymentTermDays,
      taxMode: form.taxMode,
      introText: form.introText || undefined,
      outroText: form.outroText || undefined,
      notes: form.notes || undefined,
      lines: validLines.map((l: any, i: number) => ({
        serviceCatalogItemId: l.serviceCatalogItemId || undefined,
        title: l.title,
        description: l.description || '',
        unit: l.unit || undefined,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        vatPercent: l.vatPercent,
        discountPercent: l.discountPercent || undefined,
        sortOrder: i,
      })),
    };

    const inv = await api.createInvoice(req);

    const recurringLines = validLines.filter((l: any) => l.lineType === "RecurringMonthly");

    if (recurringLines.length > 0) {
      const monthlyPrice = recurringLines.reduce((s: number, l: any) => {
        const base = l.quantity * l.unitPrice;
        const disc = base * ((l.discountPercent || 0) / 100);
        return s + (base - disc);
      }, 0);

      const plan = await api.createPlan({
        name: recurringLines[0].title,
        description: recurringLines.map((l: any) => l.description || l.title).join("\n"),
        monthlyPrice,
        billingCycle: "Monthly",
        isActive: true,
      });

      await api.createSub({
        customerId: form.customerId,
        planId: plan.id,
        startDate: new Date().toISOString(),
        nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      });
    }

    clearForm();
    clearLines();
    setShow(false);
    window.location.href = `/invoices/${inv.id}`;
  } catch (e: any) {
    setError(e.message);
  } finally {
    setSaving(false);
  }
};


  const toggleSelect = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  const toggleAll = () => {
    const ids = data?.items?.map((i: any) => i.id) || [];
    setSelected((s) => (s.size === ids.length ? new Set() : new Set(ids)));
  };

  const handleBulkFinalize = async () => {
    if (!selected.size || !confirm(`${selected.size} Rechnungen finalisieren?`)) return;
    setBulkBusy(true);
    try {
      await api.bulkFinalizeInvoices(Array.from(selected));
      setSelected(new Set());
      setSuccess(`${selected.size} Rechnungen finalisiert.`);
      setTimeout(() => setSuccess(""), 4000);
      load(filters, page);
    } catch {
      setError("Fehler beim Finalisieren.");
    } finally {
      setBulkBusy(false);
    }
  };

  const handleBulkSend = async () => {
    if (!selected.size || !confirm(`${selected.size} Rechnungen per E-Mail senden?`)) return;
    setBulkBusy(true);
    try {
      await api.bulkSendInvoices(Array.from(selected));
      setSelected(new Set());
      setSuccess(`${selected.size} Rechnungen gesendet.`);
      setTimeout(() => setSuccess(""), 4000);
      load(filters, page);
    } catch {
      setError("Fehler beim Senden.");
    } finally {
      setBulkBusy(false);
    }
  };

  const handleCancelFromList = async (inv: any, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Storno für Rechnung ${inv.invoiceNumber} erstellen?`)) return;
    setCancellingId(inv.id);
    try {
      await api.cancelInvoice(inv.id, { reason: "Stornierung" });
      setSuccess("Storno-Rechnung erstellt.");
      setTimeout(() => setSuccess(""), 4000);
      load(filters, page);
    } catch {
      setError("Stornierung fehlgeschlagen.");
    } finally {
      setCancellingId(null);
    }
  };

  const handleListPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingInvoice) return;
    try {
      await api.recordPayment(payingInvoice.id, listPaymentForm);
      setPayingInvoice(null);
      setListPaymentForm({ amount: 0, paymentDate: new Date().toISOString().split("T")[0], paymentMethod: "BankTransfer", reference: "", note: "" });
      setSuccess("Zahlung erfasst.");
      setTimeout(() => setSuccess(""), 4000);
      load(filters, page);
    } catch {
      setError("Zahlung konnte nicht erfasst werden.");
    }
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold">Rechnungen</h1>
          <select
            value={filters.status}
            onChange={(e) => applyFilters({ ...filters, status: e.target.value })}
            className="px-3 py-1.5 border border-border rounded-lg text-sm"
          >
            <option value="">Alle Status</option>
            <option value="Draft">Entwurf</option>
            <option value="Final">Final</option>
            <option value="Open">Offen</option>
            <option value="Overdue">Ueberfaellig</option>
            <option value="Paid">Bezahlt</option>
            <option value="Cancelled">Storniert</option>
          </select>
          <CustomerFilter
            value={filters.customerId}
            label={customerFilterName}
            onChange={(id, name) => { setCustomerFilterName(name); applyFilters({ ...filters, customerId: id }); }}
          />
        </div>
        <div className="flex items-center gap-2">
          {selected.size > 0 && (
            <>
              <span className="text-sm text-muted">{selected.size} ausgewählt</span>
              <button
                onClick={handleBulkFinalize}
                disabled={bulkBusy}
                className="px-3 py-1.5 text-sm border border-border rounded-lg hover:bg-background disabled:opacity-50"
              >
                Finalisieren
              </button>
              <button
                onClick={handleBulkSend}
                disabled={bulkBusy}
                className="px-3 py-1.5 text-sm border border-border rounded-lg hover:bg-background disabled:opacity-50"
              >
                Senden
              </button>
            </>
          )}
          <a
            href={api.exportInvoicesCsv(filtersToQuery(filters).toString() || undefined)}
            className="px-3 py-1.5 text-sm border border-border rounded-lg hover:bg-background"
          >
            CSV Export
          </a>
          <button
            onClick={openModal}
            className="bg-primary text-white px-4 py-2 rounded-lg text-sm hover:opacity-90"
          >
            + Neue Rechnung
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-danger px-4 py-2 rounded-lg mb-4 text-sm">
          {error}
          <button onClick={() => setError("")} className="ml-2 font-bold">x</button>
        </div>
      )}
      {success && (
        <div className="bg-green-50 text-success px-4 py-2 rounded-lg mb-4 text-sm">{success}</div>
      )}

      {/* Rechnungsart-Filter */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {kindOptions.map((k) => (
          <button
            key={k.value || "all"}
            type="button"
            onClick={() => applyFilters({ ...filters, kind: k.value })}
            className={`px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${
              filters.kind === k.value
                ? "bg-navy text-accent"
                : "border border-border text-muted hover:text-text hover:bg-background"
            }`}
          >
            {k.label}
          </button>
        ))}
        {(filters.status || filters.kind || filters.customerId) && (
          <button
            type="button"
            onClick={() => { setCustomerFilterName(""); applyFilters(emptyFilters); }}
            className="ml-1 text-xs text-muted hover:text-text underline"
          >
            Filter zurücksetzen
          </button>
        )}
        {data && <span className="ml-auto text-xs text-muted">{data.totalCount} Rechnungen</span>}
      </div>

      <div className="bg-surface rounded-xl border border-border overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-background">
              <th className="px-4 py-3 w-8">
                <input
                  type="checkbox"
                  onChange={toggleAll}
                  checked={!!data?.items?.length && selected.size === data.items.length}
                  className="accent-primary"
                />
              </th>
              <th className="px-4 py-3 text-left text-xs text-muted">Nr.</th>
              <th className="px-4 py-3 text-left text-xs text-muted">Art</th>
              <th className="px-4 py-3 text-left text-xs text-muted">Kunde</th>
              <th className="px-4 py-3 text-left text-xs text-muted">Status</th>
              <th className="px-4 py-3 text-right text-xs text-muted">Brutto</th>
              <th className="px-4 py-3 text-left text-xs text-muted">Faellig</th>
              <th className="px-4 py-3 text-left text-xs text-muted">Aktionen</th>
            </tr>
          </thead>
          <tbody>
            {data?.items?.map((i: any) => (
              <tr
                key={i.id}
                className={`border-b border-border hover:bg-background cursor-pointer ${
                  selected.has(i.id) ? "bg-primary/5" : ""
                }`}
                onClick={() => (window.location.href = `/invoices/${i.id}`)}
              >
                <td
                  className="px-4 py-3 w-8"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleSelect(i.id);
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selected.has(i.id)}
                    onChange={() => {}}
                    className="accent-primary"
                  />
                </td>
                <td className="px-4 py-3 font-medium">{i.invoiceNumber}</td>
                <td className="px-4 py-3">
                  <span className={`text-[11px] px-2 py-0.5 rounded-full whitespace-nowrap ${kindBadgeClass[i.kind] ?? kindBadgeClass.standard}`}>
                    {kindLabel[i.kind] ?? "Normal"}
                  </span>
                </td>
                <td className="px-4 py-3">{i.customerName}</td>
                <td className="px-4 py-3">
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      i.status === "Paid"
                        ? "bg-green-50 text-success"
                        : i.status === "Overdue"
                        ? "bg-red-50 text-danger"
                        : "bg-yellow-50 text-warning"
                    }`}
                  >
                    {i.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-right font-medium">{i.grossTotal?.toFixed(2)} EUR</td>
                <td className="px-4 py-3 text-sm text-muted">
                  {new Date(i.dueDate).toLocaleDateString("de")}
                </td>
                <td className="px-4 py-3 flex items-center gap-2 flex-wrap">
                  <button
                    onClick={(e) => handlePdfDownload(i.id, e)}
                    className="text-primary text-sm hover:underline"
                  >
                    PDF
                  </button>
                  {i.status !== "Draft" && (
                    <button
                      onClick={(e) => handleXmlDownload(i.id, i.invoiceNumber, e)}
                      disabled={xmlDownloading === i.id}
                      className="text-sm text-muted hover:text-text disabled:opacity-50"
                    >
                      {xmlDownloading === i.id ? "…" : "XML"}
                    </button>
                  )}
                  {i.status !== "Cancelled" && i.type !== "Cancellation" && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setListPaymentForm({ amount: i.grossTotal ?? 0, paymentDate: new Date().toISOString().split("T")[0], paymentMethod: "BankTransfer", reference: "", note: "" }); setPayingInvoice(i); }}
                      className="text-xs px-2 py-1 bg-green-50 text-success rounded-full hover:bg-green-100"
                    >
                      Zahlung
                    </button>
                  )}
                  {i.status !== "Cancelled" && i.type !== "Cancellation" && (
                    <button
                      onClick={(e) => handleCancelFromList(i, e)}
                      disabled={cancellingId === i.id}
                      className="text-xs px-2 py-1 bg-red-50 text-danger rounded-full hover:bg-red-100 disabled:opacity-50"
                    >
                      {cancellingId === i.id ? "…" : "Storno"}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {data?.items?.length === 0 && (
          <div className="p-8 text-center text-muted text-sm">
            {filters.status || filters.kind || filters.customerId ? "Keine Rechnungen für die gewählten Filter." : "Keine Rechnungen vorhanden."}
          </div>
        )}
      </div>

      {data?.totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <span className="text-sm text-muted">{data.totalCount} Rechnungen gesamt</span>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => {
                const p = page - 1;
                setPage(p);
                load(filters, p);
              }}
              className="px-3 py-1.5 text-sm border border-border rounded-lg hover:bg-background disabled:opacity-40"
            >
              ← Zurück
            </button>
            <span className="text-sm text-muted">
              Seite {page} / {data.totalPages}
            </span>
            <button
              disabled={page >= data.totalPages}
              onClick={() => {
                const p = page + 1;
                setPage(p);
                load(filters, p);
              }}
              className="px-3 py-1.5 text-sm border border-border rounded-lg hover:bg-background disabled:opacity-40"
            >
              Weiter →
            </button>
          </div>
        </div>
      )}

      {payingInvoice && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setPayingInvoice(null)}>
          <div className="bg-surface rounded-xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-1">Zahlung erfassen</h2>
            <p className="text-sm text-muted mb-4">{payingInvoice.invoiceNumber} · {payingInvoice.customerName}</p>
            <form onSubmit={handleListPayment} className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Betrag (EUR) *</label>
                <input required type="number" step="0.01" value={listPaymentForm.amount} onChange={e => setListPaymentForm({ ...listPaymentForm, amount: Number(e.target.value) })} className="w-full px-3 py-2 border border-border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Datum *</label>
                <input required type="date" value={listPaymentForm.paymentDate} onChange={e => setListPaymentForm({ ...listPaymentForm, paymentDate: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Zahlungsart</label>
                <select value={listPaymentForm.paymentMethod} onChange={e => setListPaymentForm({ ...listPaymentForm, paymentMethod: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg">
                  <option value="BankTransfer">Ueberweisung</option>
                  <option value="Cash">Bar</option>
                  <option value="CreditCard">Kreditkarte</option>
                  <option value="PayPal">PayPal</option>
                  <option value="Other">Sonstige</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Referenz</label>
                <input value={listPaymentForm.reference} onChange={e => setListPaymentForm({ ...listPaymentForm, reference: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg" />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="submit" className="px-4 py-2 bg-success text-white rounded-lg text-sm font-medium">Zahlung erfassen</button>
                <button type="button" onClick={() => setPayingInvoice(null)} className="px-4 py-2 border border-border rounded-lg text-sm">Abbrechen</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {show && (
        <div className="fixed inset-0 bg-black/40 flex items-start justify-center pt-10 z-50 overflow-auto">
          <div className="bg-surface rounded-xl border border-border p-6 w-full max-w-4xl shadow-xl mb-10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Neue Rechnung erstellen</h2>
              <button onClick={() => setShow(false)} className="text-muted hover:text-text text-xl leading-none">
                ×
              </button>
            </div>

            <div className="flex gap-1 mb-5 bg-background rounded-lg p-1 border border-border">
              <button
                onClick={() => setModalTab("quote")}
                className={`flex-1 py-2 text-sm rounded-md font-medium transition-colors ${
                  modalTab === "quote" ? "bg-surface shadow-sm text-text" : "text-muted hover:text-text"
                }`}
              >
                Aus Angebot übernehmen
              </button>
              <button
                onClick={() => setModalTab("blank")}
                className={`flex-1 py-2 text-sm rounded-md font-medium transition-colors ${
                  modalTab === "blank" ? "bg-surface shadow-sm text-text" : "text-muted hover:text-text"
                }`}
              >
                Neue leere Rechnung
              </button>
            </div>

            {modalTab === "quote" && (
              <div>
                {quotesLoading ? (
                  <div className="py-10 text-center text-muted text-sm">Angebote werden geladen...</div>
                ) : quotes.length === 0 ? (
                  <div className="py-10 text-center text-muted text-sm">
                    <p className="font-medium mb-1">Keine offenen Angebote</p>
                    <p className="text-xs">
                      Alle Angebote wurden bereits in Rechnungen umgewandelt, oder es gibt noch keine Angebote.
                    </p>
                    <button
                      onClick={() => setModalTab("blank")}
                      className="mt-4 text-primary text-sm hover:underline"
                    >
                      → Leere Rechnung erstellen
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-xs text-muted mb-3">
                      {quotes.length} Angebot{quotes.length !== 1 ? "e" : ""} ohne Rechnung — Klicken um direkt zu
                      übernehmen
                    </p>
                    {quotes.map((q: any) => (
                      <div
                        key={q.id}
                        className="flex items-center justify-between px-4 py-3 rounded-lg border border-border hover:border-primary hover:bg-primary/5 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3">
                            <span className="font-medium text-sm">{q.quoteNumber}</span>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-background border border-border text-muted">
                              {statusMap[q.status] ?? q.status}
                            </span>
                          </div>
                          <div className="text-sm text-muted mt-0.5">
                            {q.customerName}
                            {q.subject ? <span className="ml-2">· {q.subject}</span> : null}
                          </div>
                        </div>
                        <div className="flex items-center gap-4 ml-4 shrink-0">
                          <span className="text-sm font-semibold">{q.grandTotal?.toFixed(2)} €</span>
                          <button
                            onClick={() => handleConvertQuote(q.id)}
                            disabled={converting === q.id}
                            className="px-3 py-1.5 text-sm bg-primary text-white rounded-lg hover:opacity-90 disabled:opacity-50 whitespace-nowrap"
                          >
                            {converting === q.id ? "…" : "→ Zu Rechnung"}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {modalTab === "blank" && (
              <>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="col-span-2">
                    <label className="text-xs text-muted block mb-1">Kunde *</label>
                    <select
                      value={form.customerId}
                      onChange={(e) => handleCustomerChange(e.target.value)}
                      className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background"
                    >
                      <option value="">Bitte waehlen...</option>
                      {customers.map((c: any) => (
                        <option key={c.id} value={c.id}>
                          {c.companyName}
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedCustomer && (
                    <div className="col-span-2 bg-background border border-border rounded-lg px-4 py-3 text-sm">
                      <div className="flex gap-8">
                        {primaryLocation && (
                          <div>
                            <p className="text-xs text-muted mb-1">Rechnungsadresse</p>
                            <p className="font-medium">{selectedCustomer.companyName}</p>
                            <p className="text-muted">{primaryLocation.street}</p>
                            <p className="text-muted">{primaryLocation.zipCode} {primaryLocation.city}</p>
                            <p className="text-muted">{primaryLocation.country}</p>
                          </div>
                        )}
                        {primaryContact && (
                          <div>
                            <p className="text-xs text-muted mb-1">Ansprechpartner</p>
                            <p className="font-medium">{primaryContact.firstName} {primaryContact.lastName}</p>
                            <p className="text-muted">{primaryContact.email}</p>
                            {primaryContact.phone && <p className="text-muted">{primaryContact.phone}</p>}
                          </div>
                        )}
                        {selectedCustomer.taxId && (
                          <div>
                            <p className="text-xs text-muted mb-1">Steuernummer</p>
                            <p className="font-medium">{selectedCustomer.taxId}</p>
                            {selectedCustomer.vatId && <p className="text-muted">USt-ID: {selectedCustomer.vatId}</p>}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="text-xs text-muted block mb-1">Betreff</label>
                    <input
                      value={form.subject}
                      onChange={(e) => setForm((f: any) => ({ ...f, subject: e.target.value }))}
                      className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background"
                      placeholder="z.B. Social Media Management März 2026"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted block mb-1">Zahlungsfrist (Tage)</label>
                    <input
                      type="number"
                      value={form.paymentTermDays}
                      onChange={(e) => setForm((f: any) => ({ ...f, paymentTermDays: +e.target.value }))}
                      className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs text-muted block mb-1">Steuerart</label>
                    <select
                      value={form.taxMode}
                      onChange={(e) => setForm((f: any) => ({ ...f, taxMode: e.target.value }))}
                      className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background"
                    >
                      <option value="Standard">Standard (19%)</option>
                      <option value="SmallBusiness">Kleinunternehmer</option>
                      <option value="ReverseCharge">Reverse Charge</option>
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs text-muted block mb-1">Einleitungstext</label>
                    <textarea
                      rows={2}
                      value={form.introText}
                      onChange={(e) => setForm((f: any) => ({ ...f, introText: e.target.value }))}
                      className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs text-muted block mb-1">Schlusstext</label>
                    <textarea
                      rows={2}
                      value={form.outroText}
                      onChange={(e) => setForm((f: any) => ({ ...f, outroText: e.target.value }))}
                      className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs text-muted block mb-1">Notizen (intern, erscheint nicht auf dem PDF)</label>
                    <textarea
                      rows={2}
                      value={form.notes}
                      onChange={(e) => setForm((f: any) => ({ ...f, notes: e.target.value }))}
                      className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between mb-2 mt-2">
                  <h3 className="font-semibold text-sm">Positionen</h3>
                </div>

                <div className="border border-border rounded-lg mb-3" style={{ overflowX: "visible", overflowY: "visible" }}>
                  <div className="grid grid-cols-13 gap-0 bg-background border-b border-border px-3 py-2 text-xs text-muted" style={{ gridTemplateColumns: "3fr 1fr 1fr 2fr 1fr 1fr 1fr 2fr 1fr" }}>
                    <div>Titel</div>
                    <div className="text-center">Leistung</div>
                    <div className="text-center">Typ</div>
                    <div className="text-center">Menge</div>
                    <div className="text-right">Preis (€)</div>
                    <div className="text-center">Rabatt%</div>
                    <div className="text-center">MwSt%</div>
                    <div className="text-right">Netto (€)</div>
                    <div></div>
                  </div>

                  {lines.map((l: any, idx: number) => (
                    <div key={idx} className="border-b border-border last:border-0">
                      <div
                        className="grid gap-0 px-3 py-2 items-center"
                        style={{ gridTemplateColumns: "3fr 1fr 1fr 2fr 1fr 1fr 2fr 1fr" }}
                      >
                        <div className="pr-2 relative">
                          <div className="flex gap-1">
                            <input
                              value={l.title}
                              onChange={(e) => updateLine(idx, "title", e.target.value)}
                              className="flex-1 border border-border rounded px-2 py-1.5 text-sm bg-background"
                              placeholder="Titel"
                            />
                            <button
                              type="button"
                              onClick={(e) => {
                                if (servicePickerOpen === idx) {
                                  setServicePickerOpen(null);
                                  setPickerAnchor(null);
                                } else {
                                  const btn = e.currentTarget as HTMLButtonElement;
                                  const rect = btn.getBoundingClientRect();
                                  setPickerAnchor({ top: rect.bottom + window.scrollY + 4, left: rect.left + window.scrollX });
                                  setServicePickerOpen(idx);
                                }
                                setServiceSearch("");
                              }}
                              className="px-2 py-1.5 text-xs border border-border rounded hover:bg-background text-muted hover:text-primary whitespace-nowrap"
                              title="Leistung aus Katalog wählen"
                            >
                              ⊕
                            </button>
                          </div>
                          {servicePickerOpen === idx && pickerAnchor && (
                            <div
                              ref={servicePickerRef}
                              className="fixed z-[9999] w-80 bg-surface border border-border rounded-lg shadow-xl max-h-64 overflow-y-auto"
                              style={{ top: pickerAnchor.top, left: pickerAnchor.left }}
                            >
                              <div className="p-2 border-b border-border">
                                <input
                                  autoFocus
                                  value={serviceSearch}
                                  onChange={(e) => setServiceSearch(e.target.value)}
                                  placeholder="Leistung suchen..."
                                  className="w-full border border-border rounded px-2 py-1.5 text-sm bg-background"
                                />
                              </div>
                              {filteredServices(serviceSearch).length === 0 ? (
                                <div className="p-3 text-sm text-muted text-center">Keine Leistungen gefunden</div>
                              ) : (
                                filteredServices(serviceSearch).map((cat: any) => (
                                  <div key={cat.id}>
                                    <div className="px-3 py-1.5 text-xs font-semibold text-muted bg-background border-b border-border">
                                      {cat.name}
                                    </div>
                                    {cat.items.map((item: any) => (
                                      <button
                                        key={item.id}
                                        type="button"
                                        onClick={() => applyServiceToLine(idx, item)}
                                        className="w-full text-left px-3 py-2 hover:bg-primary/5 text-sm border-b border-border last:border-0"
                                      >
                                        <div className="font-medium">{item.name}</div>
                                        {item.defaultPrice != null && (
                                          <div className="text-xs text-muted">{item.defaultPrice.toFixed(2)} €</div>
                                        )}
                                      </button>
                                    ))}
                                  </div>
                                ))
                              )}
                            </div>
                          )}
                        </div>

                        <div className="px-1">
                          <select
                            value={l.lineType}
                            onChange={(e) => updateLine(idx, "lineType", e.target.value)}
                            className="w-full border border-border rounded px-1 py-1.5 text-xs bg-background"
                            title="Positionstyp"
                          >
                            <option value="OneTime">Einmalig</option>
                            <option value="RecurringMonthly">Monatlich</option>
                          </select>
                        </div>

                        <div className="px-1">
                          <input
                            type="number"
                            step="0.01"
                            value={l.quantity}
                            onChange={(e) => updateLine(idx, "quantity", +e.target.value)}
                            className="w-full border border-border rounded px-2 py-1.5 text-sm bg-background text-center"
                          />
                        </div>
                        <div className="px-1">
                          <input
                            type="number"
                            step="0.01"
                            value={l.unitPrice}
                            onChange={(e) => updateLine(idx, "unitPrice", +e.target.value)}
                            className="w-full border border-border rounded px-2 py-1.5 text-sm bg-background text-right"
                          />
                        </div>
                        <div className="px-1">
                          <input
                            type="number"
                            step="1"
                            min="0"
                            max="100"
                            value={l.discountPercent}
                            onChange={(e) => updateLine(idx, "discountPercent", +e.target.value)}
                            className="w-full border border-border rounded px-2 py-1.5 text-sm bg-background text-center"
                          />
                        </div>
                        <div className="px-1">
                          <select
                            value={l.vatPercent}
                            onChange={(e) => updateLine(idx, "vatPercent", +e.target.value)}
                            className="w-full border border-border rounded px-1 py-1.5 text-sm bg-background"
                          >
                            <option value={0}>0%</option>
                            <option value={7}>7%</option>
                            <option value={19}>19%</option>
                          </select>
                        </div>
                        <div className="px-1 text-right text-sm font-medium">
                          {(() => {
                            const base = l.quantity * l.unitPrice;
                            const disc = base * ((l.discountPercent || 0) / 100);
                            return (base - disc).toFixed(2);
                          })()}
                        </div>
                        <div className="text-center">
                          <button
                            onClick={() => removeLine(idx)}
                            className="text-danger text-sm hover:opacity-70 px-1"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                      <div className="px-3 pb-2">
                        <textarea
                          value={l.description}
                          onChange={(e) => updateLine(idx, "description", e.target.value)}
                          placeholder="Beschreibung (optional)"
                          rows={3}
                          className="w-full border border-border rounded px-2 py-1.5 text-xs bg-background text-muted resize-y"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-3 mb-4">
                  <button onClick={addLine} className="text-primary text-sm hover:underline">
                    + Leere Position
                  </button>
                  <button
                    onClick={() => {
                      const newIdx = lines.length;
                      setLines((prev: any[]) => [...prev, emptyLine()]);
                      setTimeout(() => setServicePickerOpen(newIdx), 0);
                    }}
                    className="text-sm border border-border rounded-lg px-3 py-1 hover:bg-background text-muted hover:text-primary"
                  >
                    + Leistung hinzufügen
                  </button>
                </div>

                <div className="bg-background border border-border rounded-lg px-4 py-3 mb-4">
                  <div className="flex justify-end gap-8 text-sm">
                    <div className="text-muted">Netto: <span className="text-text font-medium">{netTotal.toFixed(2)} €</span></div>
                    <div className="text-muted">MwSt: <span className="text-text font-medium">{vatTotal.toFixed(2)} €</span></div>
                    <div className="text-muted font-semibold">Brutto: <span className="text-text text-base font-bold">{grossTotal.toFixed(2)} €</span></div>
                  </div>
                </div>

                {lines.some((l: any) => l.lineType === "RecurringMonthly") && (
                  <div className="bg-purple-50 border border-purple-200 rounded-lg px-4 py-2 mb-4 text-xs text-purple-700">
                    Monatliche Positionen erkannt — Abo-Plan & Serienrechnung werden automatisch angelegt.
                  </div>
                )}

                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setShow(false)}
                    className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-background"
                  >
                    Abbrechen
                  </button>
                  <button
                    onClick={save}
                    disabled={saving || !form.customerId}
                    className="bg-primary text-white px-5 py-2 rounded-lg text-sm hover:opacity-90 disabled:opacity-50"
                  >
                    {saving ? "Wird erstellt..." : "Rechnung erstellen →"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
