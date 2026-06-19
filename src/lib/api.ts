import type {
  CustomerDetail,
  DuplicateCheckResult,
  CustomerListItem,
  CustomerNote,
  CustomerSubscription,
  ExpenseDetail,
  ExpenseListItem,
  GdprExport,
  InvoiceDetail,
  InvoiceListItem,
  NumberRange,
  PagedResult,
  ProjectBoardTask,
  ProjectDetail,
  ProjectListItem,
  QuoteDetail,
  QuoteLine,
  QuoteListItem,
  QuoteVersion,
  QuoteTemplate,
  ReminderSettings,
  ServiceCategory,
  TeamMember,
} from "@/types/api";
import {
  CUSTOMER_STATUS,
  EXPENSE_STATUS,
  INVOICE_STATUS,
  INVOICE_TYPE,
  NOTE_TYPE,
  PROJECT_STATUS,
  PROJECT_BOARD_TASK_STATUS,
  QUOTE_LINE_TYPE,
  QUOTE_STATUS,
  SIGNATURE_STATUS,
  SUBSCRIPTION_STATUS,
  TAX_MODE,
} from "@/types/enums";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export async function apiFetch<T>(path: string, opts?: RequestInit): Promise<T> {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const res = await fetch(`${API}/api${path}`, {
    ...opts,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...opts?.headers },
  });
  if (res.status === 401 && typeof window !== "undefined") { localStorage.removeItem("token"); window.location.href = "/login"; }
  if (!res.ok) {
    const raw = await res.text();
    let parsed: any = null;
    try {
      parsed = JSON.parse(raw);
    } catch {
      // keep raw fallback for non-JSON responses
    }
    const message = parsed?.error || parsed?.message || raw || `HTTP ${res.status}`;
    throw new Error(message);
  }
  if (res.status === 204) return {} as T;
  return res.json();
}

function enumValue<T extends readonly string[]>(value: any, map: T) {
  return typeof value === "number" ? (map[value] || String(value)) : value;
}

function normalizePaged<T>(data: PagedResult<any>, normalizeItem: (item: any) => T): PagedResult<T> {
  if (!data || !Array.isArray(data.items)) return data;
  return { ...data, items: data.items.map(normalizeItem) };
}

function normalizeCustomer(item: any) {
  if (!item) return item;
  return { ...item, status: enumValue(item.status, CUSTOMER_STATUS) };
}

function normalizeNote(item: any) {
  if (!item) return item;
  return { ...item, type: enumValue(item.type, NOTE_TYPE) };
}

function normalizeQuoteLine(line: any) {
  if (!line) return line;
  return { ...line, lineType: enumValue(line.lineType, QUOTE_LINE_TYPE), discountPercent: Number(line.discountPercent || 0) };
}

function normalizeQuote(item: any) {
  if (!item) return item;
  return {
    ...item,
    status: enumValue(item.status, QUOTE_STATUS),
    signatureStatus: enumValue(item.signatureStatus, SIGNATURE_STATUS),
    taxMode: enumValue(item.taxMode, TAX_MODE),
    lines: Array.isArray(item.lines) ? item.lines.map(normalizeQuoteLine) : item.lines,
  };
}

function normalizeQuoteVersion(item: any) {
  if (!item) return item;
  return {
    ...item,
    status: enumValue(item.status, QUOTE_STATUS),
  };
}

function normalizeQuoteTemplate(template: any) {
  if (!template) return template;
  return {
    ...template,
    lines: Array.isArray(template.lines)
      ? template.lines.map((l: any) => ({ ...l, lineType: enumValue(l.lineType, QUOTE_LINE_TYPE) }))
      : template.lines,
  };
}

function normalizeInvoice(item: any) {
  if (!item) return item;
  return {
    ...item,
    status: enumValue(item.status, INVOICE_STATUS),
    type: enumValue(item.type, INVOICE_TYPE),
    taxMode: enumValue(item.taxMode, TAX_MODE),
  };
}

function normalizeExpense(item: any) {
  if (!item) return item;
  return { ...item, status: enumValue(item.status, EXPENSE_STATUS) };
}

function normalizeProject(item: any) {
  if (!item) return item;
  return { ...item, status: enumValue(item.status, PROJECT_STATUS) };
}

function normalizeProjectBoardTask(item: any) {
  if (!item) return item;
  return { ...item, status: enumValue(item.status, PROJECT_BOARD_TASK_STATUS) };
}

function normalizeSubscription(item: any) {
  if (!item) return item;
  return { ...item, status: enumValue(item.status, SUBSCRIPTION_STATUS) };
}

function normalizeServiceCategory(cat: any) {
  if (!cat) return cat;
  return {
    ...cat,
    items: Array.isArray(cat.items)
      ? cat.items.map((i: any) => ({ ...i, defaultLineType: enumValue(i.defaultLineType, QUOTE_LINE_TYPE) }))
      : cat.items,
  };
}

export const api = {
  login: (data: any) => apiFetch<any>("/auth/login", { method: "POST", body: JSON.stringify(data) }),
  // Dashboard
  kpis: () => apiFetch<any>("/dashboard/kpis"),
  finance: () => apiFetch<any>("/dashboard/finance"),
  // Customers
  customers: (params = "") => apiFetch<PagedResult<CustomerListItem>>(`/customers?${params}`).then((d) => normalizePaged(d, normalizeCustomer)),
  customer: (id: string) => apiFetch<CustomerDetail>(`/customers/${id}`).then(normalizeCustomer),
  createCustomer: (data: any) => apiFetch<CustomerDetail>("/customers", { method: "POST", body: JSON.stringify(data) }).then(normalizeCustomer),
  updateCustomer: (id: string, data: any) => apiFetch<CustomerDetail>(`/customers/${id}`, { method: "PUT", body: JSON.stringify(data) }).then(normalizeCustomer),
  checkCustomerDuplicate: (data: any) => apiFetch<DuplicateCheckResult>("/customers/check-duplicate", { method: "POST", body: JSON.stringify(data) }),
  deleteCustomer: (id: string) => apiFetch<any>(`/customers/${id}`, { method: "DELETE" }),
  setCustomerReminderStop: (id: string, reminderStop: boolean) => apiFetch<any>(`/customers/${id}/reminder-stop`, { method: "PUT", body: JSON.stringify({ reminderStop }) }),
  gdprExportCustomer: (id: string) => apiFetch<GdprExport>(`/customers/${id}/gdpr-export`, { method: "POST" }),
  gdprEraseCustomer: (id: string, reason?: string) => apiFetch<any>(`/customers/${id}/gdpr-erase`, { method: "POST", body: JSON.stringify({ reason: reason || null }) }),
  addContact: (id: string, data: any) => apiFetch<any>(`/customers/${id}/contacts`, { method: "POST", body: JSON.stringify(data) }),
  updateContact: (id: string, contactId: string, data: any) => apiFetch<any>(`/customers/${id}/contacts/${contactId}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteContact: (id: string, contactId: string) => apiFetch<any>(`/customers/${id}/contacts/${contactId}`, { method: "DELETE" }),
  addLocation: (id: string, data: any) => apiFetch<any>(`/customers/${id}/locations`, { method: "POST", body: JSON.stringify(data) }),
  updateLocation: (id: string, locId: string, data: any) => apiFetch<any>(`/customers/${id}/locations/${locId}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteLocation: (id: string, locId: string) => apiFetch<any>(`/customers/${id}/locations/${locId}`, { method: "DELETE" }),
  // Notes
  notes: (cid: string) => apiFetch<CustomerNote[]>(`/customers/${cid}/notes`).then((list) => Array.isArray(list) ? list.map(normalizeNote) : list),
  createNote: (cid: string, data: any) => apiFetch<CustomerNote>(`/customers/${cid}/notes`, { method: "POST", body: JSON.stringify(data) }).then(normalizeNote),
  updateNote: (cid: string, nid: string, data: any) => apiFetch<CustomerNote>(`/customers/${cid}/notes/${nid}`, { method: "PUT", body: JSON.stringify(data) }).then(normalizeNote),
  deleteNote: (cid: string, nid: string) => apiFetch<any>(`/customers/${cid}/notes/${nid}`, { method: "DELETE" }),
  // Onboarding
  onboarding: (cid: string) => apiFetch<any>(`/onboarding/customer/${cid}`),
  startCustomerOnboarding: (cid: string, templateId?: string) => apiFetch<any>(`/onboarding/start/${cid}${templateId ? `?templateId=${templateId}` : ""}`, { method: "POST" }),
  onboardingByProject: (projectId: string) => apiFetch<any>(`/onboarding/project/${projectId}`),
  startProjectOnboarding: (projectId: string, templateId: string) =>
    apiFetch<any>(`/onboarding/start/project/${projectId}?templateId=${templateId}`, { method: "POST" }),
  onboardingTemplates: () => apiFetch<any>("/onboarding/templates"),
  onboardingTemplate: (id: string) => apiFetch<any>(`/onboarding/templates/${id}`),
  createOnboardingTemplate: (data: any) => apiFetch<any>("/onboarding/templates", { method: "POST", body: JSON.stringify(data) }),
  updateOnboardingTemplate: (id: string, data: any) => apiFetch<any>(`/onboarding/templates/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteOnboardingTemplate: (id: string) => apiFetch<any>(`/onboarding/templates/${id}`, { method: "DELETE" }),
  updateTask: (tid: string, data: any) => apiFetch<any>(`/onboarding/tasks/${tid}/status`, { method: "PUT", body: JSON.stringify(data) }),
  updateStepStatus: (stepId: string, data: any) => apiFetch<any>(`/onboarding/steps/${stepId}/status`, { method: "PUT", body: JSON.stringify(data) }),
  // Quotes
  quotes: (params = "") => apiFetch<PagedResult<QuoteListItem>>(`/quotes?${params}`).then((d) => normalizePaged(d, normalizeQuote)),
  quote: (id: string) => apiFetch<QuoteDetail>(`/quotes/${id}`).then(normalizeQuote),
  createQuote: (data: any) => apiFetch<QuoteDetail>("/quotes", { method: "POST", body: JSON.stringify(data) }).then(normalizeQuote),
  updateQuoteLines: (id: string, data: any) => apiFetch<QuoteDetail>(`/quotes/${id}/lines`, { method: "PUT", body: JSON.stringify(data) }).then(normalizeQuote),
  sendQuote: (id: string, data: any) => apiFetch<any>(`/quotes/${id}/send`, { method: "POST", body: JSON.stringify(data) }),
  markQuoteAsOrdered: (id: string) => apiFetch<QuoteDetail>(`/quotes/${id}/order`, { method: "POST" }).then(normalizeQuote),
  convertQuoteToInvoice: (id: string) => apiFetch<InvoiceDetail>(`/quotes/${id}/convert-to-invoice`, { method: "POST" }).then(normalizeInvoice),
  updateQuote: (id: string, data: any) => apiFetch<QuoteDetail>(`/quotes/${id}`, { method: "PUT", body: JSON.stringify(data) }).then(normalizeQuote),
  deleteQuote: (id: string) => apiFetch<any>(`/quotes/${id}`, { method: "DELETE" }),
  duplicateQuote: (id: string) => apiFetch<QuoteDetail>(`/quotes/${id}/duplicate`, { method: "POST" }).then(normalizeQuote),
  createQuoteVersion: (id: string) => apiFetch<QuoteDetail>(`/quotes/${id}/new-version`, { method: "POST" }).then(normalizeQuote),
  quoteVersions: (id: string) => apiFetch<QuoteVersion[]>(`/quotes/${id}/versions`).then((list) => Array.isArray(list) ? list.map(normalizeQuoteVersion) : list),
  quoteTemplates: () => apiFetch<QuoteTemplate[]>("/quotes/templates").then((list) => Array.isArray(list) ? list.map(normalizeQuoteTemplate) : list),
  createQuoteTemplate: (data: any) => apiFetch<QuoteTemplate>("/quotes/templates", { method: "POST", body: JSON.stringify(data) }).then(normalizeQuoteTemplate),
  updateQuoteTemplate: (id: string, data: any) => apiFetch<QuoteTemplate>(`/quotes/templates/${id}`, { method: "PUT", body: JSON.stringify(data) }).then(normalizeQuoteTemplate),
  deleteQuoteTemplate: (id: string) => apiFetch<any>(`/quotes/templates/${id}`, { method: "DELETE" }),
  quotePdf: (id: string) => `${API}/api/quotes/${id}/pdf`,
  quotePdfBlob: async (id: string) => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    const res = await fetch(`${API}/api/quotes/${id}/pdf`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    if (!res.ok) throw new Error(await res.text());
    return res.blob();
  },
  invoicePdfBlob: async (id: string) => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    const res = await fetch(`${API}/api/invoices/${id}/pdf`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    if (!res.ok) throw new Error(await res.text());
    return res.blob();
  },
  // Approval (public)
  approval: (token: string) => apiFetch<QuoteDetail>(`/approval/${token}`).then(normalizeQuote),
  processApproval: (token: string, data: any) => apiFetch<any>(`/approval/${token}`, { method: "POST", body: JSON.stringify(data) }),
  approvalPdfBlob: async (token: string) => {
  const res = await fetch(`${API}/api/approval/${token}/pdf`);
  if (!res.ok) throw new Error(await res.text());
  return res.blob();
  },
  // Invoices
  invoices: (params = "") => apiFetch<PagedResult<InvoiceListItem>>(`/invoices?${params}`).then((d) => normalizePaged(d, normalizeInvoice)),
  invoice: (id: string) => apiFetch<InvoiceDetail>(`/invoices/${id}`).then(normalizeInvoice),
  createInvoice: (data: any) => apiFetch<InvoiceDetail>("/invoices", { method: "POST", body: JSON.stringify(data) }).then(normalizeInvoice),
  updateInvoice: (id: string, data: any) => apiFetch<InvoiceDetail>(`/invoices/${id}`, { method: "PUT", body: JSON.stringify(data) }).then(normalizeInvoice),
  finalizeInvoice: (id: string, data: any) => apiFetch<InvoiceDetail>(`/invoices/${id}/finalize`, { method: "POST", body: JSON.stringify(data) }).then(normalizeInvoice),
  recordPayment: (id: string, data: any) => apiFetch<InvoiceDetail>(`/invoices/${id}/payment`, { method: "POST", body: JSON.stringify(data) }).then(normalizeInvoice),
  cancelInvoice: (id: string, data: any) => apiFetch<InvoiceDetail>(`/invoices/${id}/cancel`, { method: "POST", body: JSON.stringify(data) }).then(normalizeInvoice),
  setInvoiceReminderStop: (id: string, reminderStop: boolean) => apiFetch<any>(`/invoices/${id}/reminder-stop`, { method: "PUT", body: JSON.stringify({ reminderStop }) }),
  sendInvoice: (id: string) => apiFetch<any>(`/invoices/${id}/send`, { method: "POST" }),
  invoicePdf: (id: string) => `${API}/api/invoices/${id}/pdf`,
  invoiceXml: async (id: string) => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    const res = await fetch(`${API}/api/invoices/${id}/xrechnung`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    if (!res.ok) throw new Error(await res.text());
    return res.blob();
  },
  // Expenses
  expenses: (params = "") => apiFetch<PagedResult<ExpenseListItem>>(`/expenses?${params}`).then((d) => normalizePaged(d, normalizeExpense)),
  expense: (id: string) => apiFetch<ExpenseDetail>(`/expenses/${id}`).then(normalizeExpense),
createExpense: (data: any) => {
  const payload = {
    ...data,
    expenseCategoryId: data.expenseCategoryId || null,
    recurringNextDate: data.recurringNextDate || null,
    recurringInterval: data.isRecurring ? data.recurringInterval : null,
  };
  return apiFetch<any>("/expenses", { method: "POST", body: JSON.stringify(payload) });
},

updateExpense: (id: string, data: any) => {
  const payload = {
    ...data,
    expenseCategoryId: data.expenseCategoryId || null,
    recurringNextDate: data.recurringNextDate || null,
    recurringInterval: data.isRecurring ? data.recurringInterval : null,
  };
  return apiFetch<any>(`/expenses/${id}`, { method: "PUT", body: JSON.stringify(payload) });
},
  deleteExpense: (id: string) => apiFetch<any>(`/expenses/${id}`, { method: "DELETE" }),
  bookExpense: (id: string) => apiFetch<any>(`/expenses/${id}/book`, { method: "POST" }),
  expenseCategories: () => apiFetch<any>("/expenses/categories"),
  createExpenseCategory: (data: any) => apiFetch<any>("/expenses/categories", { method: "POST", body: JSON.stringify(data) }),
  updateExpenseCategory: (id: string, data: any) => apiFetch<any>(`/expenses/categories/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteExpenseCategory: (id: string) => apiFetch<any>(`/expenses/categories/${id}`, { method: "DELETE" }),
  uploadReceipt: async (id: string, file: File) => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    const fd = new FormData(); fd.append("file", file);
    const res = await fetch(`${API}/api/expenses/${id}/receipt`, { method: "POST", headers: token ? { Authorization: `Bearer ${token}` } : {}, body: fd });
    if (!res.ok) throw new Error(await res.text());
  },
  receiptUrl: (id: string) => `${API}/api/expenses/${id}/receipt`,
  downloadReceipt: async (id: string): Promise<Blob> => {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const res = await fetch(`${API}/api/expenses/${id}/receipt`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error(await res.text());
  return res.blob();
},

  // Subscriptions
  plans: () => apiFetch<any>("/subscriptions/plans"),
  customerSubs: (cid: string) => apiFetch<CustomerSubscription[]>(`/subscriptions/customer/${cid}`).then((list) => Array.isArray(list) ? list.map(normalizeSubscription) : list),
  createSub: (data: any) => apiFetch<CustomerSubscription>("/subscriptions", { method: "POST", body: JSON.stringify(data) }).then(normalizeSubscription),
  // Services
  services: () => apiFetch<ServiceCategory[]>("/servicecatalog").then((list) => Array.isArray(list) ? list.map(normalizeServiceCategory) : list),
  deleteServiceCategory: (id: string) => apiFetch<any>(`/servicecatalog/categories/${id}`, { method: "DELETE" }),
createServiceCategory: (data: any) =>
  apiFetch<any>("/servicecatalog/categories", {
    method: "POST",
    body: JSON.stringify({
      name: data.name,
      description: data.description ?? null,
      sortOrder: data.sortOrder ?? 0,
    }),
  }).then(normalizeServiceCategory),

updateServiceCategory: (id: string, data: any) =>
  apiFetch<any>(`/servicecatalog/categories/${id}`, {
    method: "PUT",
    body: JSON.stringify({
      name: data.name,
      description: data.description ?? null,
      sortOrder: data.sortOrder ?? 0,
    }),
  }).then(normalizeServiceCategory),

createServiceItem: (data: any) =>
  apiFetch<any>("/servicecatalog/items", {
    method: "POST",
    body: JSON.stringify({
      categoryId: data.categoryId,
      name: data.name,
      description: data.description ?? null,
      shortCode: data.shortCode ?? null,
      defaultPrice: data.defaultPrice ?? null,
      defaultLineType:
        typeof data.defaultLineType === "string"
          ? QUOTE_LINE_TYPE.indexOf(data.defaultLineType)
          : data.defaultLineType ?? 0,
      sortOrder: data.sortOrder ?? 0,
    }),
  }),

updateServiceItem: (id: string, data: any) =>
  apiFetch<any>(`/servicecatalog/items/${id}`, {
    method: "PUT",
    body: JSON.stringify({
      name: data.name,
      description: data.description ?? null,
      shortCode: data.shortCode ?? null,
      defaultPrice: data.defaultPrice ?? null,
      defaultLineType:
        typeof data.defaultLineType === "string"
          ? QUOTE_LINE_TYPE.indexOf(data.defaultLineType)
          : data.defaultLineType ?? 0,
      sortOrder: data.sortOrder ?? 0,
    }),
  }),


deleteServiceItem: (id: string) =>
  apiFetch<any>(`/servicecatalog/items/${id}`, { method: "DELETE" }),
  // Activity
  activity: (cid: string) => apiFetch<any>(`/activity/customer/${cid}`),
  // Settings
  settings: () => apiFetch<any>("/settings"),
  updateSettings: (data: any) => apiFetch<any>("/settings", { method: "PUT", body: JSON.stringify(data) }),
  reminderSettings: () => apiFetch<ReminderSettings>("/settings/reminders"),
  updateReminderSettings: (data: ReminderSettings) => apiFetch<ReminderSettings>("/settings/reminders", { method: "PUT", body: JSON.stringify(data) }),
  numberRanges: (year?: number) => apiFetch<NumberRange[]>(`/settings/number-ranges${year ? `?year=${year}` : ""}`),
  updateNumberRange: (data: NumberRange) => apiFetch<NumberRange>("/settings/number-ranges", { method: "PUT", body: JSON.stringify(data) }),
  importCustomersCsv: async (file: File) => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    const fd = new FormData(); fd.append("file", file);
    const res = await fetch(`${API}/api/customers/import-csv`, { method: "POST", headers: token ? { Authorization: `Bearer ${token}` } : {}, body: fd });
    if (!res.ok) throw new Error(await res.text()); return res.json();
  },
  uploadLogo: async (file: File) => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    const fd = new FormData(); fd.append("file", file);
    const res = await fetch(`${API}/api/settings/logo`, { method: "POST", headers: token ? { Authorization: `Bearer ${token}` } : {}, body: fd });
    if (!res.ok) throw new Error(await res.text()); return res.json();
  },
  // Projects
  projects: (params = "") => apiFetch<PagedResult<ProjectListItem>>(`/projects?${params}`).then((d) => normalizePaged(d, normalizeProject)),
  project: (id: string) => apiFetch<ProjectDetail>(`/projects/${id}`).then(normalizeProject),
  createProject: (data: any) => apiFetch<ProjectDetail>("/projects", { method: "POST", body: JSON.stringify(data) }).then(normalizeProject),
  updateProject: (id: string, data: any) => apiFetch<ProjectDetail>(`/projects/${id}`, { method: "PUT", body: JSON.stringify(data) }).then(normalizeProject),
  deleteProject: (id: string) => apiFetch<any>(`/projects/${id}`, { method: "DELETE" }),
  addMilestone: (id: string, data: any) => apiFetch<any>(`/projects/${id}/milestones`, { method: "POST", body: JSON.stringify(data) }),
  updateMilestone: (id: string, data: any) => apiFetch<any>(`/projects/milestones/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteMilestone: (id: string) => apiFetch<any>(`/projects/milestones/${id}`, { method: "DELETE" }),
  addComment: (id: string, data: any) => apiFetch<any>(`/projects/${id}/comments`, { method: "POST", body: JSON.stringify(data) }),
  boardTasks: (id: string) => apiFetch<ProjectBoardTask[]>(`/projects/${id}/board/tasks`).then((list) => Array.isArray(list) ? list.map(normalizeProjectBoardTask) : list),
  createBoardTask: (id: string, data: any) => apiFetch<ProjectBoardTask>(`/projects/${id}/board/tasks`, { method: "POST", body: JSON.stringify(data) }).then(normalizeProjectBoardTask),
  updateBoardTask: (id: string, taskId: string, data: any) => apiFetch<ProjectBoardTask>(`/projects/${id}/board/tasks/${taskId}`, { method: "PUT", body: JSON.stringify(data) }).then(normalizeProjectBoardTask),
  moveBoardTask: (id: string, taskId: string, data: any) => apiFetch<ProjectBoardTask>(`/projects/${id}/board/tasks/${taskId}/move`, { method: "PUT", body: JSON.stringify(data) }).then(normalizeProjectBoardTask),
  deleteBoardTask: (id: string, taskId: string) => apiFetch<any>(`/projects/${id}/board/tasks/${taskId}`, { method: "DELETE" }),
  projectMembers: (id: string) => apiFetch<TeamMember[]>(`/projects/${id}/members`),
  addProjectMember: (id: string, teamMemberId: string) => apiFetch<any>(`/projects/${id}/members/${teamMemberId}`, { method: "POST" }),
  removeProjectMember: (id: string, teamMemberId: string) => apiFetch<any>(`/projects/${id}/members/${teamMemberId}`, { method: "DELETE" }),
  // Subscriptions (all)
  allSubs: () => apiFetch<CustomerSubscription[]>("/subscriptions").then((list) => Array.isArray(list) ? list.map(normalizeSubscription) : list),
  updateSubStatus: (id: string, data: any) => apiFetch<any>(`/subscriptions/${id}/status`, { method: "PUT", body: JSON.stringify(data) }),
  confirmSub: (id: string) => apiFetch<any>(`/subscriptions/${id}/confirm`, { method: "POST" }),
  subscriptionInvoices: (id: string) => apiFetch<any>(`/subscriptions/${id}/invoices`),
  createPlan: (data: any) => apiFetch<any>("/subscriptions/plans", { method: "POST", body: JSON.stringify(data) }),
  updatePlan: (id: string, data: any) => apiFetch<any>(`/subscriptions/plans/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deletePlan: (id: string) => apiFetch<any>(`/subscriptions/plans/${id}`, { method: "DELETE" }),
  triggerSubscriptionInvoices: () => apiFetch<void>("/system/trigger-subscription-invoices", { method: "POST" }),
  triggerBankSync: () => apiFetch<void>("/system/trigger-bank-sync", { method: "POST" }),
  // Integrations (PayPal + GoCardless / Fyrst)
  integrationSettings: () => apiFetch<any>("/integrations"),
  updatePayPal: (data: any) => apiFetch<void>("/integrations/paypal", { method: "PUT", body: JSON.stringify(data) }),
  disconnectPayPal: () => apiFetch<void>("/integrations/paypal", { method: "DELETE" }),
  setupBank: (data: any) => apiFetch<any>("/integrations/bank/setup", { method: "POST", body: JSON.stringify(data) }),
  confirmBank: (data: any) => apiFetch<void>("/integrations/bank/confirm", { method: "POST", body: JSON.stringify(data) }),
  disconnectBank: () => apiFetch<void>("/integrations/bank", { method: "DELETE" }),
  syncIntegrations: () => apiFetch<void>("/integrations/sync", { method: "POST" }),
  createCustomerQuick: (data: { email: string; companyName?: string }) => apiFetch<any>("/customers/quick", { method: "POST", body: JSON.stringify(data) }),
  getIntake: (token: string) => fetch(`${API}/api/intake/${token}`).then(r => r.ok ? r.json() : Promise.reject()),
  submitIntake: (token: string, data: any) => fetch(`${API}/api/intake/${token}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }),
  resendIntake: (id: string) => apiFetch<void>(`/customers/${id}/resend-intake`, { method: "POST" }),
  sendCustomerEmail: (id: string, data: any) => apiFetch<void>(`/customers/${id}/send-email`, { method: "POST", body: JSON.stringify(data) }),
  // Time Tracking
  timeEntries: (params = "") => apiFetch<any>(`/timetracking?${params}`),
  createTimeEntry: (data: any) => apiFetch<any>("/timetracking", { method: "POST", body: JSON.stringify(data) }),
  updateTimeEntry: (id: string, data: any) => apiFetch<any>(`/timetracking/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteTimeEntry: (id: string) => apiFetch<any>(`/timetracking/${id}`, { method: "DELETE" }),
  timeSummary: (from: string, to: string, projectId?: string) => apiFetch<any>(`/timetracking/summary?from=${from}&to=${to}${projectId ? `&projectId=${projectId}` : ""}`),
  createInvoiceFromTimeEntries: (data: any) => apiFetch<any>("/invoices/from-time-entries", { method: "POST", body: JSON.stringify(data) }),
  sendInvoiceReminder: (id: string) => apiFetch<void>(`/invoices/${id}/send-reminder`, { method: "POST" }),
  recentActivity: (limit = 10) => apiFetch<any[]>(`/activity/recent?limit=${limit}`),
  exportInvoicesCsv: (status?: string) => `${API}/api/invoices/export.csv${status ? `?status=${status}` : ""}`,
  exportCustomersCsv: (status?: string) => `${API}/api/customers/export.csv${status ? `?status=${status}` : ""}`,
  bulkFinalizeInvoices: (ids: string[]) => Promise.all(ids.map(id => apiFetch<any>(`/invoices/${id}/finalize`, { method: "POST", body: JSON.stringify({ sendEmail: false }) }))),
  bulkSendInvoices: (ids: string[]) => Promise.all(ids.map(id => apiFetch<any>(`/invoices/${id}/send`, { method: "POST" }))),
  forgotPassword: (email: string) => fetch(`${API}/api/auth/forgot-password`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) }),
  resetPassword: (data: any) => fetch(`${API}/api/auth/reset-password`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }),
  // VAT / DATEV
  vatReport: (year: number, month: number) => apiFetch<any>(`/vat/report?year=${year}&month=${month}`),
  vatSubmit: (year: number, month: number) => apiFetch<any>(`/vat/submit?year=${year}&month=${month}`, { method: "POST" }),
  vatDatevUrl: (year: number, month: number) => `${API}/api/vat/datev?year=${year}&month=${month}`,
  vatElsterXml: async (year: number, month: number) => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    const res = await fetch(`${API}/api/vat/elster-xml?year=${year}&month=${month}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    if (!res.ok) throw new Error(await res.text());
    return res.blob();
  },
  // Export / Steuerbereich
  exportYearStats: (year: number) => apiFetch<any>(`/export/year/stats?year=${year}`),
  exportYearZip: async (year: number, invoices: boolean, expenses: boolean) => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    const res = await fetch(`${API}/api/export/year?year=${year}&includeInvoices=${invoices}&includeExpenses=${expenses}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
    if (!res.ok) throw new Error(await res.text());
    return res.blob();
  },
  // Users
  users: () => apiFetch<any>("/users"),
  createUser: (data: any) => apiFetch<any>("/users", { method: "POST", body: JSON.stringify(data) }),
  updateUser: (id: string, data: any) => apiFetch<any>(`/users/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteUser: (id: string) => apiFetch<any>(`/users/${id}`, { method: "DELETE" }),
  resetUserPassword: (id: string, data: any) => apiFetch<any>(`/users/${id}/reset-password`, { method: "POST", body: JSON.stringify(data) }),
  // Email Log
  emailLogs: (params = "") => apiFetch<any>(`/emails?${params}`),
  // Legal Texts
  legalTexts: () => apiFetch<any>("/legaltexts"),
  createLegalText: (data: any) => apiFetch<any>("/legaltexts", { method: "POST", body: JSON.stringify(data) }),
  updateLegalText: (id: string, data: any) => apiFetch<any>(`/legaltexts/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteLegalText: (id: string) => apiFetch<any>(`/legaltexts/${id}`, { method: "DELETE" }),
  // Journal
  journalEntries: (params = "") => apiFetch<any>(`/journal?${params}`),
  createJournalEntry: (data: any) => apiFetch<any>("/journal", { method: "POST", body: JSON.stringify(data) }),
  postJournalEntry: (id: string) => apiFetch<any>(`/journal/${id}/post`, { method: "POST" }),
  // Chart of Accounts
  chartOfAccounts: () => apiFetch<any>("/accounts"),
  // Bank Transactions
  bankTransactions: (params = "") => apiFetch<any>(`/banktransactions?${params}`),
  matchBankTransaction: (id: string, data: any) => apiFetch<any>(`/banktransactions/${id}/match`, { method: "POST", body: JSON.stringify(data) }),
  // Email Templates
  emailTemplates: () => apiFetch<any>("/email-templates"),
  createEmailTemplate: (data: any) => apiFetch<any>("/email-templates", { method: "POST", body: JSON.stringify(data) }),
  updateEmailTemplate: (id: string, data: any) => apiFetch<any>(`/email-templates/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteEmailTemplate: (id: string) => apiFetch<any>(`/email-templates/${id}`, { method: "DELETE" }),
  // Contacts (all)
  allContacts: (params = "") => apiFetch<any>(`/contacts?${params}`),
  // Team Members
  teamMembers: () => apiFetch<any>("/teammembers"),
  teamMember: (id: string) => apiFetch<any>(`/teammembers/${id}`),
  createTeamMember: (data: any) => apiFetch<any>("/teammembers", { method: "POST", body: JSON.stringify(data) }),
  updateTeamMember: (id: string, data: any) => apiFetch<any>(`/teammembers/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteTeamMember: (id: string) => apiFetch<any>(`/teammembers/${id}`, { method: "DELETE" }),
  // Products
  products: () => apiFetch<any>("/products"),
  productById: (id: string) => apiFetch<any>(`/products/${id}`),
  createProduct: (data: any) => apiFetch<any>("/products", { method: "POST", body: JSON.stringify(data) }),
  updateProduct: (id: string, data: any) => apiFetch<any>(`/products/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteProduct: (id: string) => apiFetch<any>(`/products/${id}`, { method: "DELETE" }),
  addProductMember: (productId: string, teamMemberId: string) => apiFetch<any>(`/products/${productId}/members/${teamMemberId}`, { method: "POST" }),
  removeProductMember: (productId: string, teamMemberId: string) => apiFetch<any>(`/products/${productId}/members/${teamMemberId}`, { method: "DELETE" }),
  // Price Lists
  priceLists: (customerId: string) => apiFetch<any>(`/pricelists?customerId=${customerId}`),
  priceListTemplates: () => apiFetch<any>("/pricelists/templates"),
  priceList: (id: string) => apiFetch<any>(`/pricelists/${id}`),
  createPriceList: (data: any) => apiFetch<any>("/pricelists", { method: "POST", body: JSON.stringify(data) }),
  clonePriceList: (data: any) => apiFetch<any>("/pricelists/clone", { method: "POST", body: JSON.stringify(data) }),
  updatePriceList: (id: string, data: any) => apiFetch<any>(`/pricelists/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deletePriceList: (id: string) => apiFetch<any>(`/pricelists/${id}`, { method: "DELETE" }),
  addPriceListItem: (id: string, data: any) => apiFetch<any>(`/pricelists/${id}/items`, { method: "POST", body: JSON.stringify(data) }),
  updatePriceListItem: (id: string, itemId: string, data: any) => apiFetch<any>(`/pricelists/${id}/items/${itemId}`, { method: "PUT", body: JSON.stringify(data) }),
  deletePriceListItem: (id: string, itemId: string) => apiFetch<any>(`/pricelists/${id}/items/${itemId}`, { method: "DELETE" }),
  // Opportunities
  opportunities: (params?: string) => apiFetch<any>(`/opportunities${params ? "?" + params : ""}`),
  opportunityById: (id: string) => apiFetch<any>(`/opportunities/${id}`),
  createOpportunity: (data: any) => apiFetch<any>("/opportunities", { method: "POST", body: JSON.stringify(data) }),
  updateOpportunity: (id: string, data: any) => apiFetch<any>(`/opportunities/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  updateOpportunityStage: (id: string, data: any) => apiFetch<any>(`/opportunities/${id}/stage`, { method: "PUT", body: JSON.stringify(data) }),
  deleteOpportunity: (id: string) => apiFetch<any>(`/opportunities/${id}`, { method: "DELETE" }),
  // Support Tickets
  tickets: (params?: string) => apiFetch<any>(`/tickets${params ? "?" + params : ""}`),
  ticketById: (id: string) => apiFetch<any>(`/tickets/${id}`),
  createTicket: (data: any) => apiFetch<any>("/tickets", { method: "POST", body: JSON.stringify(data) }),
  updateTicket: (id: string, data: any) => apiFetch<any>(`/tickets/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  updateTicketStatus: (id: string, data: any) => apiFetch<any>(`/tickets/${id}/status`, { method: "PUT", body: JSON.stringify(data) }),
  addTicketComment: (id: string, data: any) => apiFetch<any>(`/tickets/${id}/comments`, { method: "POST", body: JSON.stringify(data) }),
  deleteTicket: (id: string) => apiFetch<any>(`/tickets/${id}`, { method: "DELETE" }),
  // CRM Activities
  crmActivities: (params?: string) => apiFetch<any>(`/crmactivities${params ? "?" + params : ""}`),
  crmActivityById: (id: string) => apiFetch<any>(`/crmactivities/${id}`),
  createCrmActivity: (data: any) => apiFetch<any>("/crmactivities", { method: "POST", body: JSON.stringify(data) }),
  updateCrmActivity: (id: string, data: any) => apiFetch<any>(`/crmactivities/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  completeCrmActivity: (id: string, data?: any) => apiFetch<any>(`/crmactivities/${id}/complete`, { method: "PUT", body: JSON.stringify(data ?? {}) }),
  deleteCrmActivity: (id: string) => apiFetch<any>(`/crmactivities/${id}`, { method: "DELETE" }),
  // Berichte
  reportRevenueByCustomer: (year?: number) => apiFetch<any>(`/reports/revenue-by-customer${year ? `?year=${year}` : ""}`),
  reportExpenseByCategory: (year?: number, month?: number) => apiFetch<any>(`/reports/expense-by-category?${year ? `year=${year}` : ""}${month ? `&month=${month}` : ""}`),
  reportMonthlyFinance: (year?: number) => apiFetch<any>(`/reports/monthly-finance${year ? `?year=${year}` : ""}`),
  // Globale Suche
  globalSearch: (q: string) => apiFetch<any>(`/search?q=${encodeURIComponent(q)}&limit=5`),
  // Kalender
  calendarEvents: (from?: string, to?: string) => apiFetch<any>(`/calendar${from ? `?from=${from}&to=${to}` : ""}`),
  // Kundendokumente
  customerDocuments: (customerId: string) => apiFetch<any>(`/customers/${customerId}/documents`),
  deleteCustomerDocument: (customerId: string, docId: string) => apiFetch<void>(`/customers/${customerId}/documents/${docId}`, { method: "DELETE" }),
  customerDocumentDownloadUrl: (customerId: string, docId: string) => `${typeof window !== "undefined" ? (process.env.NEXT_PUBLIC_API_URL || "http://localhost:9000") : ""}/api/customers/${customerId}/documents/${docId}/download`,
  uploadCustomerDocument: async (customerId: string, file: File, notes?: string) => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:9000";
    const fd = new FormData();
    fd.append("file", file);
    if (notes) fd.append("notes", notes);
    const res = await fetch(`${API}/api/customers/${customerId}/documents`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: fd,
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
};
