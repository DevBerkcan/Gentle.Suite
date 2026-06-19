"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Trash2 } from "lucide-react";

type Tab = "overview" | "contacts" | "notes" | "onboarding" | "activity" | "pricelists" | "opportunities" | "tickets" | "crmactivities" | "documents";

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [customer, setCustomer] = useState<any>(null);
  const [notes, setNotes] = useState<any[]>([]);
  const [activities, setActivities] = useState<any>(null);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [tab, setTab] = useState<Tab>("overview");
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  const [noteForm, setNoteForm] = useState({ title: "", content: "", type: "General" });
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [contactForm, setContactForm] = useState({ firstName: "", lastName: "", email: "", phone: "", position: "", isPrimary: false });
  const [editNoteId, setEditNoteId] = useState<string | null>(null);
  const [editNoteForm, setEditNoteForm] = useState({ title: "", content: "", type: "General", isPinned: false });
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [onbTemplates, setOnbTemplates] = useState<any[]>([]);
  const [selectedOnbTemplate, setSelectedOnbTemplate] = useState("");
  const [showContactForm, setShowContactForm] = useState(false);
  const [editContactId, setEditContactId] = useState<string | null>(null);
  const [locationForm, setLocationForm] = useState({ label: "", street: "", city: "", zipCode: "", country: "Deutschland", isPrimary: false });
  const [showLocationForm, setShowLocationForm] = useState(false);
  const [editLocationId, setEditLocationId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [reminderStop, setReminderStop] = useState(false);
  const [priceLists, setPriceLists] = useState<any[]>([]);
  const [plTemplates, setPlTemplates] = useState<any[]>([]);
  const [selectedPriceList, setSelectedPriceList] = useState<any | null>(null);
  const [plForm, setPlForm] = useState({ name: "", description: "" });
  const [showPlForm, setShowPlForm] = useState(false);
  const [showTemplateDropdown, setShowTemplateDropdown] = useState(false);
  const [plItemForm, setPlItemForm] = useState({ title: "", description: "", unit: "pauschal", unitPrice: "", sortOrder: 0 });
  const [showPlItemForm, setShowPlItemForm] = useState(false);
  const [expandedWorkflow, setExpandedWorkflow] = useState<string | null>(null);
  const [intakeResending, setIntakeResending] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailForm, setEmailForm] = useState({ to: "", subject: "", body: "" });
  const [emailSending, setEmailSending] = useState(false);
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [crmActivities, setCrmActivities] = useState<any[]>([]);
  const [showNewOpportunity, setShowNewOpportunity] = useState(false);
  const [showNewTicket, setShowNewTicket] = useState(false);
  const [showNewActivity, setShowNewActivity] = useState(false);
  const [oppForm, setOppForm] = useState({ title: "", stage: "Qualification", probability: 10, expectedRevenue: 0, closeDate: "" });
  const [ticketForm, setTicketForm] = useState({ title: "", description: "", priority: "Medium", category: "General" });
  const [actForm, setActForm] = useState({ type: "Call", subject: "", description: "", dueDate: "" });
  const [documents, setDocuments] = useState<any[]>([]);
  const [docUploading, setDocUploading] = useState(false);

  useEffect(() => {
    if (!id) return;
    loadCustomer();
    loadNotes();
    loadActivity();
    loadSubscriptions();
    loadWorkflows();
    loadPriceLists();
    loadOpportunities();
    loadTickets();
    loadCrmActivities();
    loadDocuments();
    api.priceListTemplates().then(setPlTemplates).catch(() => {});
    api.onboardingTemplates().then((list: any[]) => {
      setOnbTemplates(list || []);
      const def = (list || []).find((t: any) => t.isDefault);
      if (def?.id) setSelectedOnbTemplate(def.id);
    }).catch(() => {});
  }, [id]);

  const loadCustomer = () => api.customer(id).then((c) => { setCustomer(c); setReminderStop(!!c.reminderStop); }).catch(() => setError("Kunde nicht gefunden"));
  const loadNotes = () => api.notes(id).then(setNotes).catch(() => {});
  const loadActivity = () => api.activity(id).then(setActivities).catch(() => {});
  const loadSubscriptions = () => api.customerSubs(id).then(setSubscriptions).catch(() => {});
  const loadWorkflows = () => api.onboarding(id).then(setWorkflows).catch(() => {});
  const loadPriceLists = () => api.priceLists(id).then(setPriceLists).catch(() => {});
  const loadOpportunities = () => api.opportunities(`customerId=${id}`).then(setOpportunities).catch(() => {});
  const loadTickets = () => api.tickets(`customerId=${id}`).then(setTickets).catch(() => {});
  const loadCrmActivities = () => api.crmActivities(`customerId=${id}`).then(setCrmActivities).catch(() => {});
  const loadDocuments = () => api.customerDocuments(id).then(setDocuments).catch(() => {});

  async function handleSave() {
    try {
      await api.updateCustomer(id, editForm);
      setEditing(false);
      loadCustomer();
    } catch { setError("Fehler beim Speichern"); }
  }

  async function handleAddNote(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api.createNote(id, noteForm);
      setNoteForm({ title: "", content: "", type: "General" });
      setShowNoteForm(false);
      loadNotes();
    } catch { setError("Fehler beim Erstellen der Notiz"); }
  }

  function startEditNote(n: any) {
    setEditNoteId(n.id);
    setEditNoteForm({ title: n.title, content: n.content, type: n.type, isPinned: n.isPinned });
  }

  async function handleUpdateNote() {
    if (!editNoteId) return;
    try {
      await api.updateNote(id, editNoteId, editNoteForm);
      setEditNoteId(null);
      loadNotes();
    } catch { setError("Fehler beim Aktualisieren der Notiz"); }
  }

  async function handleDeleteNote(noteId: string) {
    if (!confirm("Notiz wirklich loeschen?")) return;
    try {
      await api.deleteNote(id, noteId);
      loadNotes();
    } catch { setError("Fehler beim Loeschen"); }
  }

  function openEmailModal() {
    const primaryEmail = customer?.contacts?.find((c: any) => c.isPrimary)?.email || customer?.contacts?.[0]?.email || "";
    setEmailForm({ to: primaryEmail, subject: "", body: "" });
    setShowEmailModal(true);
  }

  async function handleSendEmail(e: React.FormEvent) {
    e.preventDefault();
    setEmailSending(true);
    try {
      await api.sendCustomerEmail(id, emailForm);
      setShowEmailModal(false);
      setSuccess("E-Mail wurde gesendet.");
      setTimeout(() => setSuccess(""), 4000);
    } catch { setError("E-Mail konnte nicht gesendet werden."); }
    finally { setEmailSending(false); }
  }

  async function handleResendIntake() {
    setIntakeResending(true);
    try {
      await api.resendIntake(id);
      setSuccess("Intake-E-Mail wurde erneut gesendet.");
    } catch { setError("E-Mail konnte nicht gesendet werden."); }
    finally { setIntakeResending(false); }
  }

  async function handleStartOnboarding() {
    if (!selectedOnbTemplate) { setError("Bitte ein Onboarding-Template auswaehlen."); return; }
    try {
      await api.startCustomerOnboarding(id, selectedOnbTemplate);
      loadWorkflows();
    } catch { setError("Onboarding konnte nicht gestartet werden"); }
  }

  async function handleAddContact(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (editContactId) { await api.updateContact(id, editContactId, contactForm); setEditContactId(null); }
      else await api.addContact(id, contactForm);
      setShowContactForm(false);
      setContactForm({ firstName: "", lastName: "", email: "", phone: "", position: "", isPrimary: false });
      loadCustomer();
    } catch { setError("Fehler beim Speichern"); }
  }

  function startEditContact(c: any) {
    setEditContactId(c.id);
    setContactForm({ firstName: c.firstName, lastName: c.lastName, email: c.email, phone: c.phone || "", position: c.position || "", isPrimary: c.isPrimary });
    setShowContactForm(true);
  }

  async function handleDeleteContact(contactId: string) {
    if (!confirm("Kontakt wirklich loeschen?")) return;
    try { await api.deleteContact(id, contactId); loadCustomer(); } catch { setError("Fehler beim Loeschen"); }
  }

  async function handleAddLocation(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (editLocationId) { await api.updateLocation(id, editLocationId, locationForm); setEditLocationId(null); }
      else await api.addLocation(id, locationForm);
      setShowLocationForm(false);
      setLocationForm({ label: "", street: "", city: "", zipCode: "", country: "Deutschland", isPrimary: false });
      loadCustomer();
    } catch { setError("Fehler beim Speichern"); }
  }

  function startEditLocation(l: any) {
    setEditLocationId(l.id);
    setLocationForm({ label: l.label || "", street: l.street, city: l.city, zipCode: l.zipCode, country: l.country || "Deutschland", isPrimary: l.isPrimary });
    setShowLocationForm(true);
  }

  async function handleDeleteLocation(locId: string) {
    if (!confirm("Standort wirklich loeschen?")) return;
    try { await api.deleteLocation(id, locId); loadCustomer(); } catch { setError("Fehler beim Loeschen"); }
  }

  async function handleDeleteCustomer() {
    if (!confirm("Moechten Sie diesen Kunden wirklich loeschen? Diese Aktion kann nicht rueckgaengig gemacht werden.")) return;
    try {
      await api.deleteCustomer(id);
      router.push("/customers");
    } catch {
      setError("Fehler beim Loeschen des Kunden");
    }
  }

  async function handleToggleReminderStop() {
    const next = !reminderStop;
    try {
      await api.setCustomerReminderStop(id, next);
      setReminderStop(next);
      setSuccess(next ? "Mahnstopp fuer Kunden aktiviert" : "Mahnstopp fuer Kunden deaktiviert");
      setTimeout(() => setSuccess(""), 3000);
    } catch (e: any) {
      setError(e?.message || "Mahnstopp konnte nicht aktualisiert werden");
    }
  }

  async function handleGdprExport() {
    try {
      const payload = await api.gdprExportCustomer(id);
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `gdpr-export-${customer.customerNumber || customer.id}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setSuccess("GDPR-Export erstellt");
      setTimeout(() => setSuccess(""), 3000);
    } catch (e: any) {
      setError(e?.message || "GDPR-Export fehlgeschlagen");
    }
  }

  async function handleGdprErase() {
    if (!confirm("Personenbezogene Daten dieses Kunden DSGVO-konform anonymisieren?")) return;
    const reason = prompt("Optionaler Grund fuer den Eintrag ins Audit-Log:", "DSGVO-Loeschanfrage") || undefined;
    try {
      await api.gdprEraseCustomer(id, reason);
      setSuccess("Kundendaten wurden anonymisiert");
      setTimeout(() => setSuccess(""), 3000);
      loadCustomer();
    } catch (e: any) {
      setError(e?.message || "GDPR-Loeschung fehlgeschlagen");
    }
  }

  function startEditing() {
    setEditForm({
      companyName: customer.companyName,
      industry: customer.industry || "",
      website: customer.website || "",
      taxId: customer.taxId || "",
      vatId: customer.vatId || "",
      status: customer.status || "Active",
    });
    setEditing(true);
  }

  if (error && !customer) return (
    <div className="p-8">
      <div className="bg-red-50 text-danger p-4 rounded-xl">{error}</div>
      <button onClick={() => router.push("/customers")} className="mt-4 text-sm text-primary hover:underline">Zurueck zur Liste</button>
    </div>
  );

  if (!customer) return <div className="p-8"><div className="text-muted">Laden...</div></div>;

  const primaryContact = customer.contacts?.find((c: any) => c.isPrimary);
  const primaryLocation = customer.locations?.find((l: any) => l.isPrimary);
  const onboardingChecks = [
    { key: "company", label: "Firmenname", done: !!customer.companyName },
    { key: "industry", label: "Branche", done: !!customer.industry },
    { key: "website", label: "Website", done: !!customer.website },
    { key: "tax", label: "Steuernummer", done: !!customer.taxId },
    { key: "vat", label: "USt-ID", done: !!customer.vatId },
    { key: "contact_name", label: "Hauptansprechpartner", done: !!(primaryContact?.firstName && primaryContact?.lastName) },
    { key: "contact_email", label: "Kontakt-E-Mail", done: !!primaryContact?.email },
    { key: "location_street", label: "Adresse", done: !!primaryLocation?.street },
    { key: "location_city", label: "PLZ / Ort", done: !!(primaryLocation?.zipCode && primaryLocation?.city) },
  ];
  const completedOnboardingChecks = onboardingChecks.filter(x => x.done).length;

  const tabs: { key: Tab; label: string }[] = [
    { key: "overview", label: "Uebersicht" },
    { key: "contacts", label: `Kontakte (${customer.contacts?.length || 0})` },
    { key: "notes", label: `Notizen (${notes.length})` },
    { key: "onboarding", label: "Onboarding" },
    { key: "opportunities", label: `Deals (${opportunities.length})` },
    { key: "tickets", label: `Tickets (${tickets.filter((t: any) => !["Resolved","Closed"].includes(t.status)).length})` },
    { key: "crmactivities", label: `Aktivitäten (${crmActivities.length})` },
    { key: "pricelists", label: `Preislisten (${priceLists.length})` },
    { key: "activity", label: "Aktivitaet" },
    { key: "documents", label: `Dokumente (${documents.length})` },
  ];

  return (
    <>
    <div className="p-8">
      {error && <div className="bg-red-50 text-danger px-4 py-2 rounded-lg mb-4 text-sm">{error}<button onClick={() => setError("")} className="ml-2 font-bold">x</button></div>}
      {success && <div className="bg-green-50 text-success px-4 py-2 rounded-lg mb-4 text-sm">{success}</div>}

      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => router.push("/customers")} className="text-muted hover:text-text text-sm">&larr; Kunden</button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{customer.companyName}</h1>
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${customer.status === "Active" ? "bg-green-50 text-success" : customer.status === "Lead" ? "bg-blue-50 text-blue-700" : customer.status === "Churned" ? "bg-red-50 text-danger" : "bg-yellow-50 text-warning"}`}>{customer.status}</span>
          </div>
          <p className="text-sm text-muted">{customer.customerNumber}{customer.industry ? ` · ${customer.industry}` : ""}</p>
        </div>
        <button onClick={startEditing} className="px-4 py-2 border border-border rounded-lg text-sm font-medium hover:bg-background">Bearbeiten</button>
        <button onClick={handleToggleReminderStop} className={`px-4 py-2 border rounded-lg text-sm font-medium ${reminderStop ? "border-warning text-warning hover:bg-yellow-50" : "border-border hover:bg-background"}`}>{reminderStop ? "Mahnstopp aktiv" : "Mahnstopp"}</button>
        <button onClick={handleGdprExport} className="px-4 py-2 border border-border rounded-lg text-sm font-medium hover:bg-background">GDPR Export</button>
        <button onClick={handleGdprErase} className="px-4 py-2 border border-red-200 text-danger rounded-lg text-sm font-medium hover:bg-red-50">GDPR Loeschung</button>
        <button onClick={handleDeleteCustomer} className="px-4 py-2 border border-red-200 text-danger rounded-lg text-sm font-medium hover:bg-red-50 transition-colors flex items-center gap-1.5"><Trash2 className="w-4 h-4" />Loeschen</button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-border">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === t.key ? "border-primary text-primary" : "border-transparent text-muted hover:text-text"}`}>{t.label}</button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Company Info */}
          <div className="bg-surface rounded-xl border border-border p-5">
            <h2 className="font-semibold mb-4">Firmendaten</h2>
            {editing ? (
              <div className="space-y-3">
                <div><label className="block text-sm text-muted mb-1">Firma</label><input value={editForm.companyName} onChange={e => setEditForm({ ...editForm, companyName: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg" /></div>
                <div><label className="block text-sm text-muted mb-1">Branche</label><input value={editForm.industry} onChange={e => setEditForm({ ...editForm, industry: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg" /></div>
                <div><label className="block text-sm text-muted mb-1">Website</label><input value={editForm.website} onChange={e => setEditForm({ ...editForm, website: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-sm text-muted mb-1">Steuer-Nr.</label><input value={editForm.taxId} onChange={e => setEditForm({ ...editForm, taxId: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg" /></div>
                  <div><label className="block text-sm text-muted mb-1">USt-ID</label><input value={editForm.vatId} onChange={e => setEditForm({ ...editForm, vatId: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg" /></div>
                </div>
                <div>
                  <label className="block text-sm text-muted mb-1">Status</label>
                  <select value={editForm.status} onChange={e => setEditForm({ ...editForm, status: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg">
                    <option value="Lead">Lead</option>
                    <option value="Active">Aktiv</option>
                    <option value="Inactive">Inaktiv</option>
                    <option value="Churned">Churned</option>
                  </select>
                </div>
                <div className="flex gap-2 pt-2">
                  <button onClick={handleSave} className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium">Speichern</button>
                  <button onClick={() => setEditing(false)} className="px-4 py-2 border border-border rounded-lg text-sm">Abbrechen</button>
                </div>
              </div>
            ) : (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted">Firma</span><span className="font-medium">{customer.companyName}</span></div>
                <div className="flex justify-between"><span className="text-muted">Branche</span><span>{customer.industry || "—"}</span></div>
                <div className="flex justify-between"><span className="text-muted">Website</span><span>{customer.website ? <a href={customer.website} target="_blank" className="text-primary hover:underline">{customer.website}</a> : "—"}</span></div>
                <div className="flex justify-between"><span className="text-muted">Steuer-Nr.</span><span>{customer.taxId || "—"}</span></div>
                <div className="flex justify-between"><span className="text-muted">USt-ID</span><span>{customer.vatId || "—"}</span></div>
                <div className="flex justify-between"><span className="text-muted">Mahnwesen</span><span>{reminderStop ? "Gestoppt" : "Aktiv"}</span></div>
                <div className="flex justify-between"><span className="text-muted">Erstellt</span><span>{new Date(customer.createdAt).toLocaleDateString("de")}</span></div>
              </div>
            )}
          </div>

          {/* Primary Contact */}
          <div className="bg-surface rounded-xl border border-border p-5">
            <h2 className="font-semibold mb-4">Hauptansprechpartner</h2>
            {customer.contacts?.filter((c: any) => c.isPrimary).map((c: any) => (
              <div key={c.id} className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted">Name</span><span className="font-medium">{c.firstName} {c.lastName}</span></div>
                <div className="flex justify-between"><span className="text-muted">E-Mail</span><span><a href={`mailto:${c.email}`} className="text-primary hover:underline">{c.email}</a></span></div>
                <div className="flex justify-between"><span className="text-muted">Telefon</span><span>{c.phone || "—"}</span></div>
                <div className="flex justify-between"><span className="text-muted">Position</span><span>{c.position || "—"}</span></div>
              </div>
            ))}
          </div>

          {/* Primary Location */}
          <div className="bg-surface rounded-xl border border-border p-5">
            <h2 className="font-semibold mb-4">Hauptstandort</h2>
            {customer.locations?.filter((l: any) => l.isPrimary).map((l: any) => (
              <div key={l.id} className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted">Adresse</span><span>{l.street}</span></div>
                <div className="flex justify-between"><span className="text-muted">PLZ / Ort</span><span>{l.zipCode} {l.city}</span></div>
                <div className="flex justify-between"><span className="text-muted">Land</span><span>{l.country}</span></div>
              </div>
            ))}
          </div>

          {/* Subscriptions */}
          <div className="bg-surface rounded-xl border border-border p-5">
            <h2 className="font-semibold mb-4">Abonnements</h2>
            {subscriptions.length === 0 ? (
              <p className="text-sm text-muted">Keine Abonnements</p>
            ) : (
              <div className="space-y-3">
                {subscriptions.map((s: any) => (
                  <div key={s.id} className="flex justify-between items-center text-sm">
                    <div>
                      <span className="font-medium">{s.planName}</span>
                      <span className="text-muted ml-2">{s.monthlyPrice?.toFixed(2)} EUR/Monat</span>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${s.status === "Active" ? "bg-green-50 text-success" : s.status === "Paused" ? "bg-yellow-50 text-warning" : "bg-red-50 text-danger"}`}>{s.status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "contacts" && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-semibold">Kontakte</h2>
            <div className="flex gap-2">
              <button onClick={openEmailModal} className="px-3 py-1.5 border border-border rounded-lg text-sm font-medium">E-Mail senden</button>
              <button onClick={() => setShowContactForm(true)} className="px-3 py-1.5 bg-primary text-white rounded-lg text-sm font-medium">+ Kontakt</button>
            </div>
          </div>
          <div className="bg-surface rounded-xl border border-border overflow-hidden">
            <table className="w-full">
              <thead><tr className="border-b border-border bg-background"><th className="px-4 py-3 text-left text-xs text-muted">Name</th><th className="px-4 py-3 text-left text-xs text-muted">E-Mail</th><th className="px-4 py-3 text-left text-xs text-muted">Telefon</th><th className="px-4 py-3 text-left text-xs text-muted">Position</th><th className="px-4 py-3 text-left text-xs text-muted">Typ</th><th className="px-4 py-3 text-right text-xs text-muted">Aktionen</th></tr></thead>
              <tbody>
                {customer.contacts?.map((c: any) => (
                  <tr key={c.id} className="border-b border-border">
                    <td className="px-4 py-3 font-medium">{c.firstName} {c.lastName}</td>
                    <td className="px-4 py-3 text-sm"><a href={`mailto:${c.email}`} className="text-primary hover:underline">{c.email}</a></td>
                    <td className="px-4 py-3 text-sm">{c.phone || "—"}</td>
                    <td className="px-4 py-3 text-sm">{c.position || "—"}</td>
                    <td className="px-4 py-3">{c.isPrimary && <span className="text-xs px-2 py-1 rounded-full bg-blue-50 text-blue-700">Haupt</span>}</td>
                    <td className="px-4 py-3 text-right"><button onClick={() => startEditContact(c)} className="text-xs text-primary hover:underline mr-2">Bearbeiten</button><button onClick={() => handleDeleteContact(c.id)} className="text-xs text-danger hover:underline">Loeschen</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Locations */}
          <div className="flex justify-between items-center mb-4 mt-8">
            <h2 className="font-semibold">Standorte</h2>
            <button onClick={() => { setEditLocationId(null); setLocationForm({ label: "", street: "", city: "", zipCode: "", country: "Deutschland", isPrimary: false }); setShowLocationForm(true); }} className="px-3 py-1.5 bg-primary text-white rounded-lg text-sm font-medium">+ Standort</button>
          </div>
          <div className="bg-surface rounded-xl border border-border overflow-hidden mb-4">
            <table className="w-full">
              <thead><tr className="border-b border-border bg-background"><th className="px-4 py-3 text-left text-xs text-muted">Bezeichnung</th><th className="px-4 py-3 text-left text-xs text-muted">Adresse</th><th className="px-4 py-3 text-left text-xs text-muted">PLZ / Ort</th><th className="px-4 py-3 text-left text-xs text-muted">Land</th><th className="px-4 py-3 text-left text-xs text-muted">Typ</th><th className="px-4 py-3 text-right text-xs text-muted">Aktionen</th></tr></thead>
              <tbody>
                {customer.locations?.map((l: any) => (
                  <tr key={l.id} className="border-b border-border">
                    <td className="px-4 py-3 font-medium">{l.label || "–"}</td>
                    <td className="px-4 py-3 text-sm">{l.street}</td>
                    <td className="px-4 py-3 text-sm">{l.zipCode} {l.city}</td>
                    <td className="px-4 py-3 text-sm">{l.country}</td>
                    <td className="px-4 py-3">{l.isPrimary && <span className="text-xs px-2 py-1 rounded-full bg-blue-50 text-blue-700">Haupt</span>}</td>
                    <td className="px-4 py-3 text-right"><button onClick={() => startEditLocation(l)} className="text-xs text-primary hover:underline mr-2">Bearbeiten</button><button onClick={() => handleDeleteLocation(l.id)} className="text-xs text-danger hover:underline">Loeschen</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {(!customer.locations || customer.locations.length === 0) && <div className="p-4 text-center text-muted text-sm">Keine Standorte vorhanden</div>}
          </div>

          {showLocationForm && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowLocationForm(false)}>
              <div className="bg-surface rounded-xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
                <h2 className="text-xl font-bold mb-4">{editLocationId ? "Standort bearbeiten" : "Standort hinzufuegen"}</h2>
                <form onSubmit={handleAddLocation} className="space-y-3">
                  <input placeholder="Bezeichnung" value={locationForm.label} onChange={e => setLocationForm({ ...locationForm, label: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg" />
                  <input required placeholder="Strasse *" value={locationForm.street} onChange={e => setLocationForm({ ...locationForm, street: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg" />
                  <div className="grid grid-cols-2 gap-3">
                    <input required placeholder="PLZ *" value={locationForm.zipCode} onChange={e => setLocationForm({ ...locationForm, zipCode: e.target.value })} className="px-3 py-2 border border-border rounded-lg" />
                    <input required placeholder="Ort *" value={locationForm.city} onChange={e => setLocationForm({ ...locationForm, city: e.target.value })} className="px-3 py-2 border border-border rounded-lg" />
                  </div>
                  <input placeholder="Land" value={locationForm.country} onChange={e => setLocationForm({ ...locationForm, country: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg" />
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={locationForm.isPrimary} onChange={e => setLocationForm({ ...locationForm, isPrimary: e.target.checked })} className="accent-primary" />Hauptstandort</label>
                  <div className="flex gap-2"><button type="submit" className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium">Speichern</button><button type="button" onClick={() => setShowLocationForm(false)} className="px-4 py-2 border border-border rounded-lg text-sm">Abbrechen</button></div>
                </form>
              </div>
            </div>
          )}

          {showContactForm && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowContactForm(false)}>
              <div className="bg-surface rounded-xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
                <h2 className="text-xl font-bold mb-4">{editContactId ? "Kontakt bearbeiten" : "Kontakt hinzufuegen"}</h2>
                <form onSubmit={handleAddContact} className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <input required placeholder="Vorname *" value={contactForm.firstName} onChange={e => setContactForm({ ...contactForm, firstName: e.target.value })} className="px-3 py-2 border border-border rounded-lg" />
                    <input required placeholder="Nachname *" value={contactForm.lastName} onChange={e => setContactForm({ ...contactForm, lastName: e.target.value })} className="px-3 py-2 border border-border rounded-lg" />
                  </div>
                  <input required type="email" placeholder="E-Mail *" value={contactForm.email} onChange={e => setContactForm({ ...contactForm, email: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg" />
                  <input placeholder="Telefon" value={contactForm.phone} onChange={e => setContactForm({ ...contactForm, phone: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg" />
                  <input placeholder="Position" value={contactForm.position} onChange={e => setContactForm({ ...contactForm, position: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg" />
                  <div className="flex gap-2"><button type="submit" className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium">Hinzufuegen</button><button type="button" onClick={() => setShowContactForm(false)} className="px-4 py-2 border border-border rounded-lg text-sm">Abbrechen</button></div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === "notes" && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-semibold">Notizen</h2>
            <button onClick={() => setShowNoteForm(true)} className="px-3 py-1.5 bg-primary text-white rounded-lg text-sm font-medium">+ Notiz</button>
          </div>
          {notes.length === 0 ? (
            <div className="bg-surface rounded-xl border border-border p-8 text-center text-muted text-sm">Keine Notizen vorhanden</div>
          ) : (
            <div className="space-y-3">
              {notes.map((n: any) => (
                <div key={n.id} className={`bg-surface rounded-xl border p-4 ${n.isPinned ? "border-primary" : "border-border"}`}>
                  {editNoteId === n.id ? (
                    <div className="space-y-3">
                      <input value={editNoteForm.title} onChange={e => setEditNoteForm({ ...editNoteForm, title: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg text-sm" />
                      <textarea rows={3} value={editNoteForm.content} onChange={e => setEditNoteForm({ ...editNoteForm, content: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg text-sm" />
                      <div className="flex gap-3 items-center">
                        <select value={editNoteForm.type} onChange={e => setEditNoteForm({ ...editNoteForm, type: e.target.value })} className="px-3 py-2 border border-border rounded-lg text-sm">
                          <option value="General">Allgemein</option><option value="Credential">Zugangsdaten</option><option value="Technical">Technisch</option><option value="Financial">Finanziell</option><option value="Internal">Intern</option>
                        </select>
                        <label className="flex items-center gap-1 text-sm"><input type="checkbox" checked={editNoteForm.isPinned} onChange={e => setEditNoteForm({ ...editNoteForm, isPinned: e.target.checked })} className="accent-primary" />Angepinnt</label>
                        <button onClick={handleUpdateNote} className="px-3 py-1.5 bg-primary text-white rounded-lg text-xs">Speichern</button>
                        <button onClick={() => setEditNoteId(null)} className="px-3 py-1.5 border border-border rounded-lg text-xs">Abbrechen</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          {n.isPinned && <span className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary font-medium">Angepinnt</span>}
                          <span className={`text-xs px-2 py-0.5 rounded ${n.type === "Credential" ? "bg-red-50 text-danger" : n.type === "Technical" ? "bg-blue-50 text-blue-700" : n.type === "Financial" ? "bg-yellow-50 text-warning" : "bg-gray-100 text-muted"}`}>{n.type}</span>
                          <h3 className="font-medium">{n.title}</h3>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => startEditNote(n)} className="text-xs text-primary hover:underline">Bearbeiten</button>
                          <button onClick={() => handleDeleteNote(n.id)} className="text-xs text-danger hover:underline">Loeschen</button>
                        </div>
                      </div>
                      <p className="text-sm text-muted whitespace-pre-wrap">{n.content}</p>
                      <p className="text-xs text-muted mt-2">{new Date(n.createdAt).toLocaleDateString("de")} · {n.createdBy}</p>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}

          {showNoteForm && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowNoteForm(false)}>
              <div className="bg-surface rounded-xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
                <h2 className="text-xl font-bold mb-4">Neue Notiz</h2>
                <form onSubmit={handleAddNote} className="space-y-3">
                  <input required placeholder="Titel *" value={noteForm.title} onChange={e => setNoteForm({ ...noteForm, title: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg" />
                  <textarea required placeholder="Inhalt *" rows={4} value={noteForm.content} onChange={e => setNoteForm({ ...noteForm, content: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg" />
                  <select value={noteForm.type} onChange={e => setNoteForm({ ...noteForm, type: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg">
                    <option value="General">Allgemein</option>
                    <option value="Credential">Zugangsdaten</option>
                    <option value="Technical">Technisch</option>
                    <option value="Financial">Finanziell</option>
                    <option value="Internal">Intern</option>
                  </select>
                  <div className="flex gap-2"><button type="submit" className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium">Erstellen</button><button type="button" onClick={() => setShowNoteForm(false)} className="px-4 py-2 border border-border rounded-lg text-sm">Abbrechen</button></div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === "onboarding" && (
        <div>
          {/* Intake-Status-Box */}
          <div className="bg-surface rounded-xl border border-border p-5 mb-4">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="font-semibold mb-1">Daten-Intake</h2>
                <p className="text-sm text-muted">E-Mail wurde bei Anlage automatisch verschickt.</p>
              </div>
              <div className="flex items-center gap-3">
                {customer?.onboardingIntakeDone ? (
                  <span className="text-xs px-3 py-1 rounded-full bg-green-50 text-success font-medium">✓ Abgeschlossen</span>
                ) : customer?.intakePending ? (
                  <>
                    <span className="text-xs px-3 py-1 rounded-full bg-yellow-50 text-warning font-medium">● Ausstehend</span>
                    <button onClick={handleResendIntake} disabled={intakeResending} className="px-3 py-1.5 bg-primary text-white rounded-lg text-sm font-medium disabled:opacity-50">
                      {intakeResending ? "Sendet..." : "E-Mail erneut senden"}
                    </button>
                  </>
                ) : (
                  <span className="text-xs px-3 py-1 rounded-full bg-gray-100 text-muted font-medium">Kein Intake</span>
                )}
              </div>
            </div>
          </div>
          <div className="bg-surface rounded-xl border border-border p-5 mb-4">
            <div className="flex justify-between items-center mb-2">
              <h2 className="font-semibold">Stammdaten-Onboarding</h2>
              <span className="text-sm text-muted">{completedOnboardingChecks}/{onboardingChecks.length} vollständig</span>
            </div>
            <div className="w-full h-2 bg-background rounded-full overflow-hidden mb-4">
              <div className="h-full bg-primary" style={{ width: `${(completedOnboardingChecks / onboardingChecks.length) * 100}%` }} />
            </div>
            <p className="text-sm text-muted">Hier siehst du, welche Kundendaten für saubere Stammdaten noch fehlen.</p>
          </div>
          <div className="bg-surface rounded-xl border border-border overflow-hidden">
            {onboardingChecks.map((check) => (
              <div key={check.key} className="px-4 py-3 border-b border-border last:border-b-0 flex items-center justify-between text-sm">
                <span>{check.label}</span>
                <span className={`text-xs px-2 py-1 rounded-full ${check.done ? "bg-green-50 text-success" : "bg-yellow-50 text-warning"}`}>
                  {check.done ? "Vollständig" : "Fehlt"}
                </span>
              </div>
            ))}
          </div>

          {/* Workflow Onboarding */}
          <div className="bg-surface rounded-xl border border-border p-5 mt-6">
            <div className="flex justify-between items-center mb-3">
              <h2 className="font-semibold">Onboarding-Workflows</h2>
              <div className="flex items-center gap-2">
                <select value={selectedOnbTemplate} onChange={e => setSelectedOnbTemplate(e.target.value)} className="px-3 py-2 border border-border rounded-lg text-sm">
                  <option value="" disabled>Template wählen...</option>
                  {onbTemplates.map((t: any) => <option key={t.id} value={t.id}>{t.name}{t.isDefault ? " (Standard)" : ""}</option>)}
                </select>
                <button onClick={handleStartOnboarding} className="px-3 py-2 bg-primary text-white rounded-lg text-sm font-medium">+ Starten</button>
              </div>
            </div>
            {workflows.length === 0 ? (
              <p className="text-sm text-muted">Kein Onboarding-Workflow gestartet.</p>
            ) : (
              <div className="space-y-3">
                {workflows.map((wf: any) => {
                  const steps = wf.steps || [];
                  const total = steps.length;
                  const done = steps.filter((s: any) => s.status === "Completed").length;
                  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
                  const isExpanded = expandedWorkflow === wf.id;
                  return (
                    <div key={wf.id} className="border border-border rounded-lg overflow-hidden">
                      {/* Header */}
                      <div className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-background" onClick={() => setExpandedWorkflow(isExpanded ? null : wf.id)}>
                        <div className="flex items-center gap-3 flex-1">
                          <span className="font-medium text-sm">{wf.templateName || "Workflow"}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${wf.status === "Completed" ? "bg-green-50 text-success" : "bg-blue-50 text-blue-700"}`}>{wf.status === "Completed" ? "Abgeschlossen" : "In Arbeit"}</span>
                          <div className="flex items-center gap-2 flex-1">
                            <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden max-w-[120px]">
                              <div className="h-full bg-success rounded-full transition-all" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-xs text-muted">{done}/{total}</span>
                          </div>
                        </div>
                        <span className="text-muted text-sm ml-2">{isExpanded ? "▲" : "▼"}</span>
                      </div>

                      {/* Steps */}
                      {isExpanded && (
                        <div className="border-t border-border divide-y divide-border">
                          {steps.sort((a: any, b: any) => a.sortOrder - b.sortOrder).map((step: any) => {
                            const stepDone = step.status === "Completed";
                            const tasks = step.tasks || [];
                            return (
                              <div key={step.id} className={`px-4 py-3 ${stepDone ? "bg-green-50/30" : ""}`}>
                                <div className="flex items-center gap-3">
                                  <button
                                    onClick={async () => {
                                      try {
                                        await api.updateStepStatus(step.id, { status: stepDone ? "InProgress" : "Completed" });
                                        loadWorkflows();
                                      } catch (ex: any) { setError(ex.message); }
                                    }}
                                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${stepDone ? "bg-success border-success text-white" : "border-gray-300 hover:border-primary"}`}
                                  >
                                    {stepDone && <span className="text-xs">✓</span>}
                                  </button>
                                  <span className={`text-sm font-medium ${stepDone ? "line-through text-muted" : ""}`}>{step.title}</span>
                                  {step.dueDate && <span className="text-xs text-muted ml-auto">{new Date(step.dueDate).toLocaleDateString("de")}</span>}
                                </div>
                                {tasks.length > 0 && (
                                  <div className="ml-8 mt-2 space-y-1.5">
                                    {tasks.sort((a: any, b: any) => a.sortOrder - b.sortOrder).map((task: any) => {
                                      const taskDone = task.status === "Done";
                                      return (
                                        <div key={task.id} className="flex items-center gap-2">
                                          <button
                                            onClick={async () => {
                                              try {
                                                await api.updateTask(task.id, { status: taskDone ? "Pending" : "Done" });
                                                loadWorkflows();
                                              } catch (ex: any) { setError(ex.message); }
                                            }}
                                            className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${taskDone ? "bg-success border-success text-white" : "border-gray-300 hover:border-primary"}`}
                                          >
                                            {taskDone && <span className="text-[10px]">✓</span>}
                                          </button>
                                          <span className={`text-xs ${taskDone ? "line-through text-muted" : "text-text"}`}>{task.title}</span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "opportunities" && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-semibold">Deals / Opportunities</h2>
            <button onClick={() => setShowNewOpportunity(true)} className="px-3 py-1.5 bg-primary text-white rounded-lg text-sm">+ Neuer Deal</button>
          </div>
          {showNewOpportunity && (
            <div className="bg-surface border border-border rounded-xl p-4 mb-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2"><label className="block text-xs text-muted mb-1">Titel *</label><input required value={oppForm.title} onChange={e => setOppForm(f => ({ ...f, title: e.target.value }))} className="w-full px-3 py-2 border border-border rounded-lg text-sm" /></div>
                <div><label className="block text-xs text-muted mb-1">Phase</label><select value={oppForm.stage} onChange={e => setOppForm(f => ({ ...f, stage: e.target.value }))} className="w-full px-3 py-2 border border-border rounded-lg text-sm"><option value="Qualification">Qualifizierung</option><option value="Proposal">Angebot</option><option value="Negotiation">Verhandlung</option><option value="ClosedWon">Gewonnen</option><option value="ClosedLost">Verloren</option></select></div>
                <div><label className="block text-xs text-muted mb-1">Wert (€)</label><input type="number" step="0.01" value={oppForm.expectedRevenue} onChange={e => setOppForm(f => ({ ...f, expectedRevenue: Number(e.target.value) }))} className="w-full px-3 py-2 border border-border rounded-lg text-sm" /></div>
              </div>
              <div className="flex justify-end gap-2 mt-3">
                <button onClick={() => setShowNewOpportunity(false)} className="px-3 py-1.5 border border-border rounded text-xs">Abbrechen</button>
                <button onClick={async () => { if (!oppForm.title) return; try { await api.createOpportunity({ customerId: id, ...oppForm, closeDate: oppForm.closeDate || null }); setShowNewOpportunity(false); setOppForm({ title: "", stage: "Qualification", probability: 10, expectedRevenue: 0, closeDate: "" }); loadOpportunities(); } catch { setError("Fehler beim Anlegen"); } }} className="px-3 py-1.5 bg-primary text-white rounded text-xs">Anlegen</button>
              </div>
            </div>
          )}
          <div className="space-y-2">
            {opportunities.map((o: any) => (
              <div key={o.id} className="bg-surface border border-border rounded-xl p-4 flex justify-between items-center">
                <div>
                  <p className="font-medium text-sm">{o.title}</p>
                  <p className="text-xs text-muted mt-0.5">{({ Qualification: "Qualifizierung", Proposal: "Angebot", Negotiation: "Verhandlung", ClosedWon: "Gewonnen", ClosedLost: "Verloren" } as any)[o.stage]}</p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium text-primary">{Number(o.expectedRevenue).toLocaleString("de-DE", { minimumFractionDigits: 2 })} €</span>
                  <span className="text-xs text-muted">{o.probability}%</span>
                  <select value={o.stage} onChange={async e => { try { await api.updateOpportunityStage(o.id, { stage: e.target.value }); loadOpportunities(); } catch { setError("Fehler"); } }} className="text-xs border border-border rounded px-2 py-1">
                    <option value="Qualification">Qualifizierung</option><option value="Proposal">Angebot</option><option value="Negotiation">Verhandlung</option><option value="ClosedWon">Gewonnen</option><option value="ClosedLost">Verloren</option>
                  </select>
                  <button onClick={async () => { if (!confirm("Löschen?")) return; try { await api.deleteOpportunity(o.id); loadOpportunities(); } catch { setError("Fehler"); } }} className="text-xs text-danger hover:underline">Löschen</button>
                </div>
              </div>
            ))}
            {opportunities.length === 0 && <div className="text-center py-8 text-muted text-sm">Noch keine Opportunities vorhanden.</div>}
          </div>
        </div>
      )}

      {tab === "tickets" && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-semibold">Support Tickets</h2>
            <button onClick={() => setShowNewTicket(true)} className="px-3 py-1.5 bg-primary text-white rounded-lg text-sm">+ Neues Ticket</button>
          </div>
          {showNewTicket && (
            <div className="bg-surface border border-border rounded-xl p-4 mb-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2"><label className="block text-xs text-muted mb-1">Titel *</label><input required value={ticketForm.title} onChange={e => setTicketForm(f => ({ ...f, title: e.target.value }))} className="w-full px-3 py-2 border border-border rounded-lg text-sm" /></div>
                <div><label className="block text-xs text-muted mb-1">Priorität</label><select value={ticketForm.priority} onChange={e => setTicketForm(f => ({ ...f, priority: e.target.value }))} className="w-full px-3 py-2 border border-border rounded-lg text-sm"><option value="Low">Niedrig</option><option value="Medium">Mittel</option><option value="High">Hoch</option><option value="Critical">Kritisch</option></select></div>
                <div><label className="block text-xs text-muted mb-1">Kategorie</label><select value={ticketForm.category} onChange={e => setTicketForm(f => ({ ...f, category: e.target.value }))} className="w-full px-3 py-2 border border-border rounded-lg text-sm"><option value="General">Allgemein</option><option value="Bug">Bug</option><option value="Request">Anfrage</option><option value="Complaint">Beschwerde</option></select></div>
              </div>
              <div className="flex justify-end gap-2 mt-3">
                <button onClick={() => setShowNewTicket(false)} className="px-3 py-1.5 border border-border rounded text-xs">Abbrechen</button>
                <button onClick={async () => { if (!ticketForm.title) return; try { await api.createTicket({ customerId: id, ...ticketForm }); setShowNewTicket(false); setTicketForm({ title: "", description: "", priority: "Medium", category: "General" }); loadTickets(); } catch { setError("Fehler beim Anlegen"); } }} className="px-3 py-1.5 bg-primary text-white rounded text-xs">Anlegen</button>
              </div>
            </div>
          )}
          <div className="space-y-2">
            {tickets.map((t: any) => {
              const statusColor: Record<string, string> = { Open: "bg-blue-50 text-blue-700", InProgress: "bg-yellow-50 text-yellow-700", Resolved: "bg-green-50 text-success", Closed: "bg-gray-100 text-muted" };
              const priorityColor: Record<string, string> = { Low: "bg-gray-100 text-muted", Medium: "bg-blue-50 text-blue-700", High: "bg-orange-50 text-orange-700", Critical: "bg-red-50 text-danger" };
              return (
                <div key={t.id} className="bg-surface border border-border rounded-xl p-4 flex justify-between items-center">
                  <div>
                    <p className="font-medium text-sm">{t.title}</p>
                    <div className="flex gap-2 mt-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${priorityColor[t.priority]}`}>{{ Low: "Niedrig", Medium: "Mittel", High: "Hoch", Critical: "Kritisch" }[t.priority as string]}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor[t.status]}`}>{{ Open: "Offen", InProgress: "In Bearbeitung", Resolved: "Gelöst", Closed: "Geschlossen" }[t.status as string]}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {t.slaDueDate && <span className="text-xs text-muted">SLA: {new Date(t.slaDueDate).toLocaleDateString("de-DE")}</span>}
                    <button onClick={async () => { if (!confirm("Löschen?")) return; try { await api.deleteTicket(t.id); loadTickets(); } catch { setError("Fehler"); } }} className="text-xs text-danger hover:underline">Löschen</button>
                  </div>
                </div>
              );
            })}
            {tickets.length === 0 && <div className="text-center py-8 text-muted text-sm">Noch keine Tickets vorhanden.</div>}
          </div>
        </div>
      )}

      {tab === "crmactivities" && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-semibold">CRM-Aktivitäten</h2>
            <button onClick={() => setShowNewActivity(true)} className="px-3 py-1.5 bg-primary text-white rounded-lg text-sm">+ Neue Aktivität</button>
          </div>
          {showNewActivity && (
            <div className="bg-surface border border-border rounded-xl p-4 mb-4">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs text-muted mb-1">Typ</label><select value={actForm.type} onChange={e => setActForm(f => ({ ...f, type: e.target.value }))} className="w-full px-3 py-2 border border-border rounded-lg text-sm"><option value="Call">Anruf</option><option value="Meeting">Termin</option><option value="Task">Aufgabe</option><option value="Email">E-Mail</option></select></div>
                <div><label className="block text-xs text-muted mb-1">Betreff *</label><input required value={actForm.subject} onChange={e => setActForm(f => ({ ...f, subject: e.target.value }))} className="w-full px-3 py-2 border border-border rounded-lg text-sm" /></div>
                <div className="col-span-2"><label className="block text-xs text-muted mb-1">Fällig am</label><input type="date" value={actForm.dueDate} onChange={e => setActForm(f => ({ ...f, dueDate: e.target.value }))} className="w-full px-3 py-2 border border-border rounded-lg text-sm" /></div>
              </div>
              <div className="flex justify-end gap-2 mt-3">
                <button onClick={() => setShowNewActivity(false)} className="px-3 py-1.5 border border-border rounded text-xs">Abbrechen</button>
                <button onClick={async () => { if (!actForm.subject) return; try { await api.createCrmActivity({ customerId: id, ...actForm, dueDate: actForm.dueDate || null }); setShowNewActivity(false); setActForm({ type: "Call", subject: "", description: "", dueDate: "" }); loadCrmActivities(); } catch { setError("Fehler beim Anlegen"); } }} className="px-3 py-1.5 bg-primary text-white rounded text-xs">Anlegen</button>
              </div>
            </div>
          )}
          <div className="space-y-2">
            {crmActivities.map((a: any) => {
              const typeIcon: Record<string, string> = { Call: "📞", Meeting: "📅", Task: "✅", Email: "✉️" };
              const typeLabel: Record<string, string> = { Call: "Anruf", Meeting: "Termin", Task: "Aufgabe", Email: "E-Mail" };
              return (
                <div key={a.id} className="bg-surface border border-border rounded-xl p-4 flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{typeIcon[a.type] || "📌"}</span>
                    <div>
                      <p className="font-medium text-sm">{a.subject}</p>
                      <p className="text-xs text-muted">{typeLabel[a.type]}{a.dueDate ? ` · ${new Date(a.dueDate).toLocaleDateString("de-DE")}` : ""}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${a.status === "Completed" ? "bg-green-50 text-success" : a.status === "Cancelled" ? "bg-gray-100 text-muted" : "bg-blue-50 text-blue-700"}`}>{a.status === "Completed" ? "Erledigt" : a.status === "Cancelled" ? "Abgebrochen" : "Offen"}</span>
                    {a.status === "Open" && <button onClick={async () => { try { await api.completeCrmActivity(a.id); loadCrmActivities(); } catch { setError("Fehler"); } }} className="text-xs text-success hover:underline">Erledigen</button>}
                    <button onClick={async () => { if (!confirm("Löschen?")) return; try { await api.deleteCrmActivity(a.id); loadCrmActivities(); } catch { setError("Fehler"); } }} className="text-xs text-danger hover:underline">Löschen</button>
                  </div>
                </div>
              );
            })}
            {crmActivities.length === 0 && <div className="text-center py-8 text-muted text-sm">Noch keine Aktivitäten vorhanden.</div>}
          </div>
        </div>
      )}

      {tab === "activity" && (
        <div>
          <h2 className="font-semibold mb-4">Aktivitaet</h2>
          {!activities?.items?.length ? (
            <div className="bg-surface rounded-xl border border-border p-8 text-center text-muted text-sm">Keine Aktivitaeten</div>
          ) : (
            <div className="space-y-2">
              {activities.items.map((a: any) => (
                <div key={a.id} className="bg-surface rounded-xl border border-border p-4 flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium">{a.action}</p>
                    <p className="text-sm text-muted">{a.description}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted">{new Date(a.createdAt).toLocaleDateString("de")}</p>
                    <p className="text-xs text-muted">{a.userName}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "pricelists" && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-semibold">Preislisten</h2>
            <div className="flex gap-2 relative">
              <div className="relative">
                <button onClick={() => setShowTemplateDropdown(v => !v)} className="px-3 py-1.5 border border-border rounded-lg text-sm hover:bg-background">Aus Vorlage erstellen ▾</button>
                {showTemplateDropdown && (
                  <div className="absolute right-0 top-full mt-1 bg-surface border border-border rounded-lg shadow-lg z-10 min-w-[200px]">
                    {plTemplates.length === 0 && <div className="px-4 py-3 text-sm text-muted">Keine Vorlagen vorhanden</div>}
                    {plTemplates.map((tpl: any) => (
                      <button key={tpl.id} onClick={async () => { try { await api.clonePriceList({ templateId: tpl.id, customerId: id }); setShowTemplateDropdown(false); loadPriceLists(); } catch (ex: any) { setError(ex.message); } }} className="w-full text-left px-4 py-2.5 text-sm hover:bg-background border-b border-border last:border-0">
                        <div className="font-medium">{tpl.name}</div>
                        {tpl.description && <div className="text-xs text-muted">{tpl.description}</div>}
                        <div className="text-xs text-muted">{(tpl.items || []).length} Positionen</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button onClick={() => { setPlForm({ name: "", description: "" }); setShowPlForm(true); }} className="px-3 py-1.5 bg-primary text-white rounded-lg text-sm">+ Neue Preisliste</button>
            </div>
          </div>

          {showPlForm && (
            <div className="bg-surface border border-border rounded-xl p-4 mb-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs text-muted mb-1">Name *</label>
                  <input value={plForm.name} onChange={e => setPlForm(f => ({ ...f, name: e.target.value }))} className="w-full px-3 py-2 border border-border rounded-lg text-sm" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs text-muted mb-1">Beschreibung</label>
                  <input value={plForm.description} onChange={e => setPlForm(f => ({ ...f, description: e.target.value }))} className="w-full px-3 py-2 border border-border rounded-lg text-sm" />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-3">
                <button onClick={() => setShowPlForm(false)} className="px-3 py-1.5 border border-border rounded-lg text-sm">Abbrechen</button>
                <button onClick={async () => { try { const pl = await api.createPriceList({ customerId: id, name: plForm.name, description: plForm.description || null }); setShowPlForm(false); loadPriceLists(); setSelectedPriceList(pl); } catch (e: any) { setError(e.message); } }} disabled={!plForm.name} className="px-3 py-1.5 bg-primary text-white rounded-lg text-sm disabled:opacity-50">Erstellen</button>
              </div>
            </div>
          )}

          <div className="space-y-4">
            {priceLists.map((pl: any) => (
              <div key={pl.id} className="bg-surface border border-border rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-background" onClick={() => setSelectedPriceList(selectedPriceList?.id === pl.id ? null : pl)}>
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-sm">{pl.name}</span>
                    {pl.description && <span className="text-xs text-muted">{pl.description}</span>}
                    <span className={`text-xs px-2 py-0.5 rounded-full ${pl.isActive ? "bg-green-50 text-success" : "bg-gray-100 text-muted"}`}>{pl.isActive ? "Aktiv" : "Inaktiv"}</span>
                    <span className="text-xs text-muted">{(pl.items || []).length} Positionen</span>
                    {pl.items && pl.items.length > 0 && (
                      <span className="text-xs font-medium text-muted">
                        {pl.items.reduce((sum: number, i: any) => sum + Number(i.unitPrice), 0).toLocaleString("de-DE", { style: "currency", currency: "EUR" })} gesamt
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <button onClick={e => { e.stopPropagation(); if (confirm("Preisliste löschen?")) api.deletePriceList(pl.id).then(loadPriceLists).catch((ex: any) => setError(ex.message)); }} className="text-xs text-danger hover:underline">Löschen</button>
                    <span className="text-muted text-sm">{selectedPriceList?.id === pl.id ? "▲" : "▼"}</span>
                  </div>
                </div>

                {selectedPriceList?.id === pl.id && (
                  <div className="border-t border-border p-4">
                    <table className="w-full text-sm mb-4">
                      <thead>
                        <tr className="text-xs text-muted border-b border-border">
                          <th className="pb-2 text-left w-6">#</th>
                          <th className="pb-2 text-left">Bezeichnung</th>
                          <th className="pb-2 text-left">Beschreibung</th>
                          <th className="pb-2 text-left">Einheit</th>
                          <th className="pb-2 text-right">Preis</th>
                          <th className="pb-2"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {(pl.items || []).sort((a: any, b: any) => a.sortOrder - b.sortOrder).map((item: any, idx: number) => (
                          <tr key={item.id} className="border-b border-border">
                            <td className="py-2 text-muted">{idx + 1}</td>
                            <td className="py-2 font-medium">{item.title}</td>
                            <td className="py-2 text-muted text-xs">{item.description || "–"}</td>
                            <td className="py-2 text-muted">{item.unit}</td>
                            <td className="py-2 text-right font-medium">{Number(item.unitPrice).toLocaleString("de-DE", { style: "currency", currency: "EUR" })}</td>
                            <td className="py-2 text-right">
                              <button onClick={() => api.deletePriceListItem(pl.id, item.id).then(() => { loadPriceLists(); setSelectedPriceList((prev: any) => ({ ...prev, items: prev.items.filter((x: any) => x.id !== item.id) })); }).catch((ex: any) => setError(ex.message))} className="text-xs text-danger hover:underline">×</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {showPlItemForm ? (
                      <div className="bg-background rounded-lg p-3 border border-border">
                        <div className="grid grid-cols-2 gap-2 mb-2">
                          <div className="col-span-2">
                            <label className="block text-xs text-muted mb-1">Bezeichnung *</label>
                            <input value={plItemForm.title} onChange={e => setPlItemForm(f => ({ ...f, title: e.target.value }))} placeholder="z.B. Webseite Landingpage" className="w-full px-2 py-1.5 border border-border rounded text-sm" />
                          </div>
                          <div className="col-span-2">
                            <label className="block text-xs text-muted mb-1">Beschreibung</label>
                            <input value={plItemForm.description} onChange={e => setPlItemForm(f => ({ ...f, description: e.target.value }))} placeholder="z.B. Responsive, CMS" className="w-full px-2 py-1.5 border border-border rounded text-sm" />
                          </div>
                          <div>
                            <label className="block text-xs text-muted mb-1">Einheit</label>
                            <select value={plItemForm.unit} onChange={e => setPlItemForm(f => ({ ...f, unit: e.target.value }))} className="w-full px-2 py-1.5 border border-border rounded text-sm">
                              <option value="pauschal">pauschal</option>
                              <option value="h">h (Stunde)</option>
                              <option value="Stk">Stk (Stück)</option>
                              <option value="Monat">Monat</option>
                              <option value="jährlich">jährlich</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs text-muted mb-1">Preis (€)</label>
                            <input type="number" step="0.01" min="0" value={plItemForm.unitPrice} onChange={e => setPlItemForm(f => ({ ...f, unitPrice: e.target.value }))} className="w-full px-2 py-1.5 border border-border rounded text-sm" />
                          </div>
                        </div>
                        <div className="flex justify-end gap-2">
                          <button onClick={() => { setShowPlItemForm(false); setPlItemForm({ title: "", description: "", unit: "pauschal", unitPrice: "", sortOrder: 0 }); }} className="px-3 py-1.5 border border-border rounded text-xs">Abbrechen</button>
                          <button onClick={async () => { try { await api.addPriceListItem(pl.id, { title: plItemForm.title, description: plItemForm.description || null, unit: plItemForm.unit, unitPrice: parseFloat(plItemForm.unitPrice) || 0, sortOrder: (pl.items || []).length }); setShowPlItemForm(false); setPlItemForm({ title: "", description: "", unit: "pauschal", unitPrice: "", sortOrder: 0 }); loadPriceLists(); setSelectedPriceList(await api.priceList(pl.id)); } catch (ex: any) { setError(ex.message); } }} disabled={!plItemForm.title} className="px-3 py-1.5 bg-primary text-white rounded text-xs disabled:opacity-50">Hinzufügen</button>
                        </div>
                      </div>
                    ) : (
                      <button onClick={() => { setPlItemForm({ title: "", description: "", unit: "pauschal", unitPrice: "", sortOrder: 0 }); setShowPlItemForm(true); }} className="text-sm text-primary hover:underline">+ Position hinzufügen</button>
                    )}
                  </div>
                )}
              </div>
            ))}
            {priceLists.length === 0 && <div className="text-center py-8 text-muted text-sm">Noch keine Preislisten vorhanden. Erstellen Sie eine neue oder wählen Sie eine Vorlage.</div>}
          </div>
        </div>
      )}

      {/* === Dokumente Tab === */}
      {tab === "documents" && (
        <div className="bg-surface border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Kundendokumente</h2>
            <label className={`px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium cursor-pointer hover:bg-primary-hover transition-colors ${docUploading ? "opacity-50 pointer-events-none" : ""}`}>
              {docUploading ? "Hochladen..." : "+ Dokument hochladen"}
              <input
                type="file"
                className="hidden"
                disabled={docUploading}
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setDocUploading(true);
                  try {
                    await api.uploadCustomerDocument(id, file);
                    loadDocuments();
                  } catch { setError("Hochladen fehlgeschlagen"); }
                  finally { setDocUploading(false); e.target.value = ""; }
                }}
              />
            </label>
          </div>
          {documents.length === 0 ? (
            <div className="text-center py-10 text-muted text-sm">Noch keine Dokumente hochgeladen.</div>
          ) : (
            <div className="space-y-2">
              {documents.map((doc: any) => (
                <div key={doc.id} className="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-background transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 bg-primary/10 text-primary rounded-lg flex items-center justify-center text-xs font-bold shrink-0">
                      {doc.fileName.split(".").pop()?.toUpperCase().slice(0, 4) ?? "DOC"}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{doc.fileName}</p>
                      <p className="text-xs text-muted">{(doc.fileSizeBytes / 1024).toFixed(1)} KB · {new Date(doc.createdAt).toLocaleDateString("de-DE")}{doc.notes ? ` · ${doc.notes}` : ""}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-4">
                    <a
                      href={`${api.customerDocumentDownloadUrl(id, doc.id)}?token=${typeof window !== "undefined" ? localStorage.getItem("token") : ""}`}
                      download={doc.fileName}
                      className="px-3 py-1.5 border border-border rounded text-xs hover:bg-background transition-colors"
                      onClick={async (e) => {
                        e.preventDefault();
                        const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
                        const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:9000";
                        const res = await fetch(`${API}/api/customers/${id}/documents/${doc.id}/download`, {
                          headers: token ? { Authorization: `Bearer ${token}` } : {}
                        });
                        const blob = await res.blob();
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a"); a.href = url; a.download = doc.fileName; a.click(); URL.revokeObjectURL(url);
                      }}
                    >↓ Download</a>
                    <button
                      onClick={async () => { if (!confirm("Dokument löschen?")) return; await api.deleteCustomerDocument(id, doc.id); loadDocuments(); }}
                      className="px-3 py-1.5 border border-border rounded text-xs text-danger hover:bg-red-50 transition-colors"
                    >Löschen</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>

      {showEmailModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-surface rounded-xl border border-border p-6 w-full max-w-lg shadow-xl">
            <h2 className="text-lg font-bold mb-4">E-Mail senden</h2>
            <form onSubmit={handleSendEmail} className="space-y-3">
              <div>
                <label className="text-xs text-muted block mb-1">An *</label>
                <input type="email" required value={emailForm.to} onChange={e => setEmailForm({...emailForm, to: e.target.value})} className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background" />
              </div>
              <div>
                <label className="text-xs text-muted block mb-1">Betreff *</label>
                <input required value={emailForm.subject} onChange={e => setEmailForm({...emailForm, subject: e.target.value})} className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background" />
              </div>
              <div>
                <label className="text-xs text-muted block mb-1">Nachricht</label>
                <textarea rows={6} value={emailForm.body} onChange={e => setEmailForm({...emailForm, body: e.target.value})} className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background" />
              </div>
              <div className="flex gap-2 pt-1">
                <button type="submit" disabled={emailSending} className="flex-1 py-2 bg-primary text-white rounded-lg text-sm font-medium disabled:opacity-50">{emailSending ? "Sendet..." : "Senden"}</button>
                <button type="button" onClick={() => setShowEmailModal(false)} className="px-4 py-2 border border-border rounded-lg text-sm">Abbrechen</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
