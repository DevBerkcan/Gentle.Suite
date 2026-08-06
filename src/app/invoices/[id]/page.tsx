"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";

function asInvoiceStatus(value: any) {
  if (typeof value === "number") {
    return ["Draft", "Final", "Sent", "Open", "Paid", "Overdue", "Cancelled"][value] || String(value);
  }
  return value || "";
}

function asInvoiceType(value: any) {
  if (typeof value === "number") {
    return ["Standard", "Recurring", "CreditNote", "Cancellation"][value] || String(value);
  }
  return value || "";
}

function asTaxMode(value: any) {
  if (typeof value === "number") {
    return ["Standard", "SmallBusiness", "ReverseCharge"][value] || String(value);
  }
  return value || "";
}

function toTaxModeNumber(value: any) {
  if (typeof value === "number") return value;
  if (value === "SmallBusiness") return 1;
  if (value === "ReverseCharge") return 2;
  return 0;
}

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [invoice, setInvoice] = useState<any>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<any>({});
  const [formLines, setFormLines] = useState<any[]>([]);
  const [showPayment, setShowPayment] = useState(false);
  const [paymentForm, setPaymentForm] = useState({ amount: 0, paymentDate: new Date().toISOString().split("T")[0], paymentMethod: "BankTransfer", reference: "", note: "" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [initialSnapshot, setInitialSnapshot] = useState("");
  const [xmlDownloading, setXmlDownloading] = useState(false);

async function handlePdfDownload() {
  try {
    const blob = await api.invoicePdfBlob(id);
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  } catch { setError("PDF konnte nicht geladen werden"); }
}


  useEffect(() => {
    if (!id) return;
    loadInvoice();
  }, [id]);

  async function loadInvoice() {
    try {
      const inv = await api.invoice(id);
      setInvoice(inv);
      const nextForm = {
        subject: inv.subject || "",
        introText: inv.introText || "",
        outroText: inv.outroText || "",
        notes: inv.notes || "",
        taxMode: asTaxMode(inv.taxMode) || "Standard",
        invoiceDate: inv.invoiceDate?.split("T")[0] || "",
        dueDate: inv.dueDate?.split("T")[0] || ""
      };
      const nextLines = (inv.lines || []).map((l: any, i: number) => ({
        title: l.title || "",
        description: l.description || "",
        unit: l.unit || "Stk.",
        quantity: l.quantity ?? 1,
        unitPrice: l.unitPrice ?? 0,
        vatPercent: l.vatPercent ?? 19,
        sortOrder: i
      }));
      setForm(nextForm);
      setFormLines(nextLines);
      setInitialSnapshot(createSnapshot(nextForm, nextLines));
    } catch {
      setError("Rechnung nicht gefunden");
    }
  }

  function createSnapshot(currentForm: any, currentLines: any[]) {
    return JSON.stringify({
      form: {
        subject: currentForm.subject || "",
        introText: currentForm.introText || "",
        outroText: currentForm.outroText || "",
        notes: currentForm.notes || "",
        taxMode: currentForm.taxMode || "Standard",
        invoiceDate: currentForm.invoiceDate || "",
        dueDate: currentForm.dueDate || "",
      },
      lines: currentLines.map((l: any, i: number) => ({
        title: l.title || "",
        description: l.description || "",
        unit: l.unit || "",
        quantity: Number(l.quantity || 0),
        unitPrice: Number(l.unitPrice || 0),
        vatPercent: Number(l.vatPercent || 0),
        sortOrder: i
      }))
    });
  }

  const hasUnsavedChanges = editing && initialSnapshot !== "" && createSnapshot(form, formLines) !== initialSnapshot;

  useEffect(() => {
    if (!hasUnsavedChanges) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [hasUnsavedChanges]);

  function confirmDiscardChanges() {
    if (!hasUnsavedChanges) return true;
    return window.confirm("Es gibt ungespeicherte Aenderungen. Wirklich verwerfen?");
  }

  function addLine() {
    setFormLines([...formLines, { title: "", description: "", unit: "Stk.", quantity: 1, unitPrice: 0, vatPercent: 19, sortOrder: formLines.length }]);
  }

  function removeLine(idx: number) {
    setFormLines(formLines.filter((_, i) => i !== idx));
  }

  function updateLine(idx: number, field: string, value: any) {
    const next = [...formLines];
    next[idx] = { ...next[idx], [field]: value };
    setFormLines(next);
  }

  async function handleSaveDraft() {
    try {
      await api.updateInvoice(id, {
        ...form,
        taxMode: toTaxModeNumber(form.taxMode),
        lines: formLines.map((l, i) => ({ ...l, sortOrder: i }))
      });
      setEditing(false);
      setSuccess("Rechnung aktualisiert");
      await loadInvoice();
      setTimeout(() => setSuccess(""), 3000);
    } catch (e: any) {
      setError(e?.message || "Fehler beim Speichern der Rechnung");
    }
  }

  async function handleFinalize() {
    if (editing && hasUnsavedChanges) {
      setError("Bitte zuerst speichern oder Aenderungen verwerfen.");
      return;
    }
    try {
      await api.finalizeInvoice(id, { sendEmail: true });
      setSuccess("Rechnung finalisiert und versendet");
      loadInvoice();
      setTimeout(() => setSuccess(""), 3000);
    } catch (e: any) { setError(e?.message || "Fehler beim Finalisieren"); }
  }

  async function handleSend() {
    try {
      await api.sendInvoice(id);
      setSuccess("Rechnung versendet");
      loadInvoice();
      setTimeout(() => setSuccess(""), 3000);
    } catch (e: any) { setError(e?.message || "Fehler beim Versenden"); }
  }

  async function handlePayment(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api.recordPayment(id, paymentForm);
      setShowPayment(false);
      setPaymentForm({ amount: 0, paymentDate: new Date().toISOString().split("T")[0], paymentMethod: "BankTransfer", reference: "", note: "" });
      setSuccess("Zahlung erfasst");
      loadInvoice();
      setTimeout(() => setSuccess(""), 3000);
    } catch (e: any) { setError(e?.message || "Fehler beim Erfassen der Zahlung"); }
  }

  async function handleCancel() {
    if (!confirm("Storno-Rechnung erstellen?")) return;
    try {
      await api.cancelInvoice(id, { reason: "Stornierung" });
      setSuccess("Storno-Rechnung erstellt");
      loadInvoice();
      setTimeout(() => setSuccess(""), 3000);
    } catch (e: any) { setError(e?.message || "Fehler beim Stornieren"); }
  }

  async function handleXmlDownload() {
    setXmlDownloading(true);
    try {
      const blob = await api.invoiceXml(id);
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `XRechnung_${invoice?.invoiceNumber ?? id}.xml`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch { setError("XRechnung-Export fehlgeschlagen."); }
    finally { setXmlDownloading(false); }
  }

  if (error && !invoice) return (
    <div className="p-8">
      <div className="bg-red-50 text-danger p-4 rounded-xl">{error}</div>
      <button onClick={() => router.push("/invoices")} className="mt-4 text-sm text-primary hover:underline">Zurueck zur Liste</button>
    </div>
  );

  if (!invoice) return <div className="p-8"><div className="text-muted">Laden...</div></div>;

  const statusColor = (s: string) => s === "Paid" ? "bg-green-50 text-success" : s === "Overdue" ? "bg-red-50 text-danger" : s === "Cancelled" ? "bg-gray-200 text-muted" : s === "Final" || s === "Sent" ? "bg-blue-50 text-blue-700" : "bg-yellow-50 text-warning";
  const invoiceStatus = asInvoiceStatus(invoice.status);
  const invoiceType = asInvoiceType(invoice.type);
  const invoiceTaxMode = asTaxMode(invoice.taxMode);
  const openAmount = (invoice.grossTotal || 0) - (invoice.paidAmount || 0);

  return (
    <div className="p-8">
      {error && <div className="bg-red-50 text-danger px-4 py-2 rounded-lg mb-4 text-sm">{error}<button onClick={() => setError("")} className="ml-2 font-bold">x</button></div>}
      {success && <div className="bg-green-50 text-success px-4 py-2 rounded-lg mb-4 text-sm">{success}</div>}

      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => { if (confirmDiscardChanges()) router.push("/invoices"); }} className="text-muted hover:text-text text-sm">&larr; Rechnungen</button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{invoice.invoiceNumber}</h1>
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColor(invoiceStatus)}`}>{invoiceStatus}</span>
            {invoiceType !== "Standard" && <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-muted">{invoiceType}</span>}
          </div>
          <p className="text-sm text-muted">{invoice.customerName}</p>
        </div>
        <div className="flex gap-2">
<button onClick={handlePdfDownload} className="px-4 py-2 border border-border rounded-lg text-sm font-medium hover:bg-background">
  {invoiceStatus === "Draft" ? "Vorschau PDF" : "PDF"}
</button>
          {invoiceStatus === "Draft" && (
            <>
              {editing ? (
                <>
                  <button onClick={handleSaveDraft} className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium">Speichern</button>
                  <button onClick={() => { if (!confirmDiscardChanges()) return; setEditing(false); loadInvoice(); }} className="px-4 py-2 border border-border rounded-lg text-sm font-medium">Abbrechen</button>
                </>
              ) : (
                <button onClick={() => setEditing(true)} className="px-4 py-2 border border-border rounded-lg text-sm font-medium hover:bg-background">Bearbeiten</button>
              )}
              <button onClick={handleFinalize} className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium" disabled={editing && hasUnsavedChanges}>Senden</button>
            </>
          )}
          {(invoiceStatus === "Final" || invoiceStatus === "Sent" || invoiceStatus === "Open" || invoiceStatus === "Overdue") && (
            <button onClick={handleSend} className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium">Versenden</button>
          )}
          {invoiceStatus !== "Cancelled" && invoiceType !== "Cancellation" && (
            <button onClick={() => { setPaymentForm({ ...paymentForm, amount: openAmount }); setShowPayment(true); }} className="px-4 py-2 bg-success text-white rounded-lg text-sm font-medium">Zahlung erfassen</button>
          )}
          {invoiceStatus !== "Cancelled" && invoiceType !== "Cancellation" && (
            <button onClick={handleCancel} className="px-4 py-2 border border-danger text-danger rounded-lg text-sm font-medium hover:bg-red-50">Storno</button>
          )}
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="bg-surface rounded-xl border border-border p-5">
          <h2 className="font-semibold mb-3">Details</h2>
          {editing && invoiceStatus === "Draft" ? (
            <div className="space-y-3 text-sm">
              <div><label className="block text-xs text-muted mb-1">Betreff</label><input value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg" /></div>
              <div><label className="block text-xs text-muted mb-1">Steuermodus</label><select value={form.taxMode} onChange={e => setForm({ ...form, taxMode: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg"><option value="Standard">Standard</option><option value="SmallBusiness">Kleinunternehmer</option><option value="ReverseCharge">Reverse Charge</option></select></div>
              <div className="grid grid-cols-2 gap-2">
                <div><label className="block text-xs text-muted mb-1">Rechnungsdatum</label><input type="date" value={form.invoiceDate} onChange={e => setForm({ ...form, invoiceDate: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg" /></div>
                <div><label className="block text-xs text-muted mb-1">Faellig</label><input type="date" value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg" /></div>
              </div>
            </div>
          ) : (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted">Betreff</span><span>{invoice.subject || "—"}</span></div>
              <div className="flex justify-between"><span className="text-muted">Rechnungsdatum</span><span>{new Date(invoice.invoiceDate).toLocaleDateString("de")}</span></div>
              <div className="flex justify-between"><span className="text-muted">Faellig</span><span>{new Date(invoice.dueDate).toLocaleDateString("de")}</span></div>
              <div className="flex justify-between"><span className="text-muted">Steuermodus</span><span>{invoiceTaxMode}</span></div>
              {invoice.isFinalized && <div className="flex justify-between"><span className="text-muted">Finalisiert</span><span>{new Date(invoice.finalizedAt).toLocaleDateString("de")}</span></div>}
            </div>
          )}
        </div>

        <div className="bg-surface rounded-xl border border-border p-5">
          <h2 className="font-semibold mb-3">Betraege</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted">Netto</span><span>{invoice.netTotal?.toFixed(2)} EUR</span></div>
            {invoice.vatSummary?.map((v: any, i: number) => (
              <div key={i} className="flex justify-between"><span className="text-muted">MwSt {v.vatPercent}%</span><span>{v.vatAmount?.toFixed(2)} EUR</span></div>
            ))}
            <div className="flex justify-between font-semibold border-t border-border pt-2"><span>Brutto</span><span>{invoice.grossTotal?.toFixed(2)} EUR</span></div>
            <div className="flex justify-between"><span className="text-muted">Bezahlt</span><span className="text-success">{invoice.paidAmount?.toFixed(2)} EUR</span></div>
            <div className="flex justify-between font-semibold"><span>Offen</span><span className={openAmount > 0 ? "text-danger" : "text-success"}>{openAmount.toFixed(2)} EUR</span></div>
          </div>
        </div>

        {invoice.payments?.length > 0 && (
          <div className="bg-surface rounded-xl border border-border p-5">
            <h2 className="font-semibold mb-3">Zahlungen</h2>
            <div className="space-y-3">
              {invoice.payments.map((p: any, i: number) => (
                <div key={i} className="flex justify-between items-start text-sm border-b border-border pb-2 last:border-0">
                  <div>
                    <p className="font-medium">{p.amount?.toFixed(2)} EUR</p>
                    <p className="text-xs text-muted">{p.paymentMethod}{p.reference ? ` · ${p.reference}` : ""}</p>
                    {p.note && <p className="text-xs text-muted">{p.note}</p>}
                  </div>
                  <span className="text-xs text-muted">{new Date(p.paymentDate).toLocaleDateString("de")}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Line Items */}
      <div className="bg-surface rounded-xl border border-border p-5">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-semibold">Positionen</h2>
          {editing && invoiceStatus === "Draft" && <button onClick={addLine} className="px-3 py-1.5 border border-border rounded-lg text-sm font-medium hover:bg-background">+ Position</button>}
        </div>
        {editing && invoiceStatus === "Draft" ? (
          <div className="space-y-3">
            {formLines.map((l: any, i: number) => (
              <div key={i} className="border border-border rounded-lg p-3">
                <div className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-4"><label className="block text-xs text-muted mb-1">Titel</label><input value={l.title} onChange={e => updateLine(i, "title", e.target.value)} className="w-full px-2 py-1.5 border border-border rounded text-sm" /></div>
                  <div className="col-span-2"><label className="block text-xs text-muted mb-1">Menge</label><input type="number" min="1" value={l.quantity} onChange={e => updateLine(i, "quantity", Number(e.target.value))} className="w-full px-2 py-1.5 border border-border rounded text-sm" /></div>
                  <div className="col-span-2"><label className="block text-xs text-muted mb-1">Einheit</label><input value={l.unit} onChange={e => updateLine(i, "unit", e.target.value)} className="w-full px-2 py-1.5 border border-border rounded text-sm" /></div>
                  <div className="col-span-2"><label className="block text-xs text-muted mb-1">Preis</label><input type="number" step="0.01" value={l.unitPrice} onChange={e => updateLine(i, "unitPrice", Number(e.target.value))} className="w-full px-2 py-1.5 border border-border rounded text-sm" /></div>
                  <div className="col-span-1"><label className="block text-xs text-muted mb-1">MwSt%</label><select value={l.vatPercent} onChange={e => updateLine(i, "vatPercent", Number(e.target.value))} className="w-full px-1 py-1.5 border border-border rounded text-sm"><option value={19}>19</option><option value={7}>7</option><option value={0}>0</option></select></div>
                  <div className="col-span-1"><button onClick={() => removeLine(i)} className="px-2 py-1.5 text-danger text-sm hover:bg-red-50 rounded">x</button></div>
                </div>
                <div className="mt-2"><input value={l.description || ""} onChange={e => updateLine(i, "description", e.target.value)} placeholder="Beschreibung (optional)" className="w-full px-2 py-1.5 border border-border rounded text-sm" /></div>
              </div>
            ))}
          </div>
        ) : (
          <table className="w-full">
            <thead><tr className="border-b border-border"><th className="px-4 py-2 text-left text-xs text-muted">Pos.</th><th className="px-4 py-2 text-left text-xs text-muted">Leistung</th><th className="px-4 py-2 text-right text-xs text-muted">Menge</th><th className="px-4 py-2 text-left text-xs text-muted">Einheit</th><th className="px-4 py-2 text-right text-xs text-muted">Preis</th><th className="px-4 py-2 text-right text-xs text-muted">MwSt</th><th className="px-4 py-2 text-right text-xs text-muted">Netto</th></tr></thead>
            <tbody>
              {invoice.lines?.map((l: any, i: number) => (
                <tr key={i} className="border-b border-border">
                  <td className="px-4 py-3 text-sm text-muted">{i + 1}</td>
                  <td className="px-4 py-3"><span className="text-sm font-medium">{l.title}</span>{l.description && <p className="text-xs text-muted">{l.description}</p>}</td>
                  <td className="px-4 py-3 text-sm text-right">{l.quantity}</td>
                  <td className="px-4 py-3 text-sm">{l.unit || "Stk"}</td>
                  <td className="px-4 py-3 text-sm text-right">{l.unitPrice?.toFixed(2)} EUR</td>
                  <td className="px-4 py-3 text-sm text-right">{l.vatPercent}%</td>
                  <td className="px-4 py-3 text-sm text-right font-medium">{l.netTotal?.toFixed(2)} EUR</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* GoBD Info */}
      {invoice.isFinalized && (
        <div className="mt-6 bg-surface rounded-xl border border-border p-5">
          <h2 className="font-semibold mb-3">GoBD-Informationen</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted">Dokumenten-Hash</span><span className="font-mono text-xs">{invoice.documentHash?.substring(0, 24)}...</span></div>
            <div className="flex justify-between"><span className="text-muted">Aufbewahrungsfrist bis</span><span>{invoice.retentionUntil ? new Date(invoice.retentionUntil).toLocaleDateString("de") : "—"}</span></div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPayment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowPayment(false)}>
          <div className="bg-surface rounded-xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-4">Zahlung erfassen</h2>
            <form onSubmit={handlePayment} className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Betrag (EUR) *</label>
                <input required type="number" step="0.01" value={paymentForm.amount} onChange={e => setPaymentForm({ ...paymentForm, amount: Number(e.target.value) })} className="w-full px-3 py-2 border border-border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Datum *</label>
                <input required type="date" value={paymentForm.paymentDate} onChange={e => setPaymentForm({ ...paymentForm, paymentDate: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Zahlungsart</label>
                <select value={paymentForm.paymentMethod} onChange={e => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg">
                  <option value="BankTransfer">Ueberweisung</option>
                  <option value="Cash">Bar</option>
                  <option value="CreditCard">Kreditkarte</option>
                  <option value="PayPal">PayPal</option>
                  <option value="Other">Sonstige</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Referenz</label>
                <input value={paymentForm.reference} onChange={e => setPaymentForm({ ...paymentForm, reference: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Notiz</label>
                <input value={paymentForm.note} onChange={e => setPaymentForm({ ...paymentForm, note: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg" />
              </div>
              <div className="flex gap-2">
                <button type="submit" className="px-4 py-2 bg-success text-white rounded-lg text-sm font-medium">Zahlung erfassen</button>
                <button type="button" onClick={() => setShowPayment(false)} className="px-4 py-2 border border-border rounded-lg text-sm">Abbrechen</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
