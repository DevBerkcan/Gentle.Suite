import type {
  CustomerStatus,
  ExpenseStatus,
  InvoiceStatus,
  InvoiceType,
  NoteType,
  ProjectBoardTaskStatus,
  ProjectStatus,
  QuoteLineType,
  QuoteStatus,
  SignatureStatus,
  SubscriptionStatus,
  TaxMode,
} from "./enums";

export type Id = string;

export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface CustomerListItem {
  id: Id;
  companyName: string;
  customerNumber?: string | null;
  industry?: string | null;
  status: CustomerStatus;
  primaryContactName?: string | null;
  primaryContactEmail?: string | null;
  projectCount: number;
  createdAt: string;
}

export interface Contact {
  id: Id;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  position?: string | null;
  isPrimary: boolean;
}

export interface Location {
  id: Id;
  label: string;
  street: string;
  city: string;
  zipCode: string;
  country: string;
  isPrimary: boolean;
}

export interface CustomerDetail {
  id: Id;
  companyName: string;
  customerNumber?: string | null;
  industry?: string | null;
  website?: string | null;
  taxId?: string | null;
  vatId?: string | null;
  status: CustomerStatus;
  reminderStop?: boolean;
  createdAt: string;
  contacts?: Contact[];
  locations?: Location[];
  desiredServiceIds?: Id[];
  dataSource?: string | null;
  dataSourceNote?: string | null;
  privacyNoticeSentAt?: string | null;
  privacyNoticeVersion?: string | null;
}

export interface DuplicateHit {
  customerId: Id;
  companyName: string;
  contactName?: string | null;
  email?: string | null;
  phone?: string | null;
  matchType: string;
}

export interface DuplicateCheckResult {
  hasDuplicate: boolean;
  matches: DuplicateHit[];
}

export interface GdprExport {
  customerId: Id;
  companyName: string;
  customerNumber?: string | null;
  industry?: string | null;
  website?: string | null;
  taxId?: string | null;
  vatId?: string | null;
  contacts: Contact[];
  locations: Location[];
  notes: CustomerNote[];
  exportedAt: string;
}

export interface CustomerNote {
  id: Id;
  title: string;
  content: string;
  type: NoteType;
  isPinned: boolean;
  createdAt: string;
  createdBy?: string | null;
}

export interface QuoteLine {
  id?: Id;
  serviceCatalogItemId?: Id | null;
  title: string;
  description?: string | null;
  quantity: number;
  unitPrice: number;
  discountPercent?: number;
  lineType: QuoteLineType;
  vatPercent: number;
  sortOrder: number;
  total?: number;
}

export interface QuoteListItem {
  id: Id;
  quoteNumber: string;
  customerName: string;
  status: QuoteStatus;
  signatureStatus: SignatureStatus;
  grandTotal: number;
  version: number;
  createdAt: string;
  expiresAt?: string | null;
}

export interface QuoteDetail {
  id: Id;
  quoteNumber: string;
  quoteGroupId?: Id;
  isCurrentVersion?: boolean;
  customerId: Id;
  customerName: string;
  contactId?: Id | null;
  version: number;
  status: QuoteStatus;
  subject?: string | null;
  introText?: string | null;
  outroText?: string | null;
  notes?: string | null;
  internalNotes?: string | null;
  customerComment?: string | null;
  taxRate: number;
  taxMode: TaxMode;
  subtotalOneTime: number;
  subtotalMonthly: number;
  subtotal: number;
  taxAmount: number;
  grandTotal: number;
  sentAt?: string | null;
  expiresAt?: string | null;
  signatureStatus: SignatureStatus;
  signatureData?: string | null;
  signedByName?: string | null;
  signedByEmail?: string | null;
  signedAt?: string | null;
  b2bAuthorityConfirmed?: boolean;
  primaryContactEmail?: string | null;
  lines: QuoteLine[];
  legalTextBlockKeys?: string[] | null;
  legalTextBlockOptions?: { id: Id; key: string; title: string; content: string; sortOrder: number; type: string; autoAttachToQuotes: boolean; attachmentFileName?: string | null }[] | null;
  paymentTermKeys?: string[] | null;
  paymentTermOptions?: { id: Id; key: string; title: string; content: string; sortOrder: number }[] | null;
  chosenPaymentTermKey?: string | null;
  installmentPeriodOptionsMonths?: number[] | null;
  chosenInstallmentMonths?: number | null;
  paymentPlanConfig?: {
    hybrid: { downPaymentPercent: number; totalAmount: number; durationMonths: number };
    monthly12: { totalAmount: number };
    monthly24: { totalAmount: number };
  } | null;
  paymentPlanOptions?: { key: string; title: string; subtitle: string; downPayment?: number | null; monthlyAmount?: number | null; totalAmount: number; months?: number | null }[] | null;
  chosenPaymentPlanOptionKey?: string | null;
  paymentPlanTransferredAt?: string | null;
}


export interface QuoteVersion {
  id: Id;
  quoteGroupId: Id;
  quoteNumber: string;
  version: number;
  isCurrentVersion: boolean;
  status: QuoteStatus;
  createdAt: string;
  sentAt?: string | null;
}

export interface QuoteTemplateLine {
  id?: Id;
  title: string;
  description?: string | null;
  quantity: number;
  unitPrice: number;
  lineType: QuoteLineType;
  sortOrder: number;
}

export interface QuoteTemplate {
  id: Id;
  name: string;
  description?: string | null;
  lines: QuoteTemplateLine[];
}

export interface InvoiceLine {
  id?: Id;
  title: string;
  description?: string | null;
  discountPercent?: number;
  lineType: number;
  unit?: string | null;
  quantity: number;
  unitPrice: number;
  vatPercent: number;
  sortOrder: number;
  netTotal?: number;
  vatAmount?: number;
  grossTotal?: number;
}

export interface InvoiceListItem {
  id: Id;
  invoiceNumber: string;
  type: InvoiceType;
  customerName: string;
  status: InvoiceStatus;
  grossTotal: number;
  invoiceDate: string;
  dueDate: string;
  paidAt?: string | null;
  /** Abgeleitete Rechnungsart (Server), siehe InvoiceKind. */
  kind?: InvoiceKind;
}

export type InvoiceKind = "standard" | "installment" | "downpayment" | "recurring" | "cancellation" | "creditnote";

/** Login-Benutzer (Users-Liste, eigenes Profil). avatarUrl ist relativ zu /api und nur mit Token abrufbar. */
export interface UserAccount {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName?: string;
  isActive: boolean;
  roles: string[];
  avatarUrl?: string | null;
}

export interface InvoiceDetail {
  id: Id;
  invoiceNumber: string;
  type: InvoiceType;
  customerId: Id;
  customerName: string;
  status: InvoiceStatus;
  taxMode: TaxMode;
  invoiceDate: string;
  dueDate: string;
  netTotal: number;
  vatAmount: number;
  grossTotal: number;
  subject?: string | null;
  introText?: string | null;
  outroText?: string | null;
  notes?: string | null;
  isFinalized: boolean;
  reminderStop?: boolean;
  lines: InvoiceLine[];
  vatSummary?: Array<{ vatPercent: number; netAmount: number; vatAmount: number; grossAmount: number }>;
  payments?: Array<{ id: Id; amount: number; paymentDate: string; paymentMethod?: string | null; reference?: string | null }>;
  paidAmount?: number;
  openAmount?: number;
}

export interface ReminderSettings {
  level1Days: number;
  level2Days: number;
  level3Days: number;
  level1Fee: number;
  level2Fee: number;
  level3Fee: number;
  annualInterestPercent: number;
}

export interface NumberRange {
  entityType: string;
  year: number;
  prefix: string;
  nextValue: number;
  padding: number;
}

export interface ExpenseListItem {
  id: Id;
  expenseNumber?: string | null;
  supplier?: string | null;
  categoryName?: string | null;
  grossAmount: number;
  vatPercent: number;
  expenseDate: string;
  status: ExpenseStatus;
}

export interface ExpenseDetail extends ExpenseListItem {
  supplierTaxId?: string | null;
  expenseCategoryId?: Id | null;
  description?: string | null;
  netAmount: number;
  vatAmount: number;
  receiptPath?: string | null;
}

export interface ProjectListItem {
  id: Id;
  name: string;
  status: ProjectStatus;
  customerName: string;
  startDate?: string | null;
  dueDate?: string | null;
}

export interface ProjectDetail {
  id: Id;
  customerId: Id;
  name: string;
  description?: string | null;
  status: ProjectStatus;
  startDate?: string | null;
  dueDate?: string | null;
  milestones?: Array<{ id: Id; title: string; sortOrder: number; dueDate?: string | null; isCompleted: boolean }>;
  comments?: Array<{ id: Id; content: string; authorName?: string | null; createdAt: string }>;
}

export interface ProjectBoardTask {
  id: Id;
  projectId: Id;
  title: string;
  description?: string | null;
  status: ProjectBoardTaskStatus;
  sortOrder: number;
  assigneeName?: string | null;
  dueDate?: string | null;
  createdAt: string;
  createdBy?: string | null;
}

export interface TeamMember {
  id: Id;
  firstName: string;
  lastName: string;
  fullName: string;
  email?: string | null;
  phone?: string | null;
  jobTitle?: string | null;
  isActive: boolean;
  appUserId?: string | null;
}

export interface CustomerSubscription {
  id: Id;
  planId: Id;
  planName: string;
  customerId: Id;
  customerName?: string | null;
  status: SubscriptionStatus;
  startDate: string;
  nextBillingDate: string;
  monthlyPrice: number;
  contractBillingCycle?: string | number;
  contractDurationMonths?: number | null;
  contractQuoteId?: Id | null;
  contractReference?: string | null;
  contractVersion?: number | null;
  contractAcceptedAt?: string | null;
  contractAcceptedByName?: string | null;
  contractAcceptedByEmail?: string | null;
  businessCustomerConfirmed: boolean;
  businessCustomerConfirmedAt?: string | null;
  confirmedAt?: string | null;
  mollieMandateStatus?: string | null;
  mandateEmailSentAt?: string | null;
  mandateEmailRecipient?: string | null;
  mandateEmailStatus?: string | null;
  mandateEmailLastError?: string | null;
  mandateEmailAttemptCount: number;
  billingAuthorizedAt?: string | null;
  isInstallmentPlan: boolean;
  totalInstallmentAmount?: number | null;
  installmentsCompleted: number;
  installmentSourceTitle?: string | null;
  paidAmount: number;
  installmentSurchargePercent?: number | null;
  downPaymentPercent?: number | null;
  downPaymentInvoiceId?: Id | null;
  paymentPlanOptionKey?: string | null;
  billingStage?: string;
  // Mollie-Überarbeitung (docs/mollie-api-contract.md §2)
  /** Tag des nächsten Einzugs; null = unbestimmt. */
  nextCollectionDate?: string | null;
  /** Bruttobetrag des nächsten Einzugs. */
  nextCollectionAmount?: number | null;
  /** null, solange die Rechnung noch nicht erstellt ist (Prognose). */
  nextCollectionInvoiceNumber?: string | null;
  nextCollectionIsForecast?: boolean;
  /** z. B. "Mandat fehlt", "Freigabe fehlt", "Abo pausiert". */
  nextCollectionBlockedReason?: string | null;
  mandateMethod?: MandateMethod | null;
  mandateAccountLast4?: string | null;
  mandateSetupUrl?: string | null;
  invoicesPaid?: number;
  invoicesTotal?: number;
  outstandingAmount?: number;
}

export type MandateMethod = "directdebit" | "creditcard" | "paypal";

/** Einzugsstatus einer Abo-Rechnung (Mollie). */
export type PaymentCollectionStatus = "scheduled" | "open" | "pending" | "authorized" | "paid" | "failed" | "canceled" | "expired" | "error" | string;

/** GET /api/subscriptions/{id}/invoices */
export interface SubscriptionInvoice {
  id: Id;
  invoiceNumber: string;
  invoiceDate: string;
  status: string;
  grossTotal: number;
  billingPeriodStart?: string | null;
  billingPeriodEnd?: string | null;
  paymentCollectionDueDate?: string | null;
  paymentCollectionStatus?: PaymentCollectionStatus | null;
  collectionAttemptCount: number;
  paidAt?: string | null;
  chargedBack: boolean;
  lastFailureReason?: string | null;
}

/** GET /api/public/mandate-setup/{token} (öffentlich) */
export interface MandateSetupInfo {
  status: "pending" | "valid" | "processing" | "invalid";
  customerName: string;
  contactName?: string | null;
  creditorName: string;
  creditorId?: string | null;
  description?: string | null;
  amountText?: string | null;
  nextCollectionDate?: string | null;
  nextCollectionAmount?: number | null;
  methods: { iban: boolean; card: boolean };
  mandateText?: string | null;
  existingMandate?: { method: MandateMethod | string; accountLast4?: string | null } | null;
}

export interface MandateSetupIbanRequest {
  accountHolder: string;
  iban: string;
  confirm: boolean;
}

export interface PaymentJobRun {
  startedAt: string;
  finishedAt?: string | null;
  succeeded: boolean;
  error?: string | null;
}

export interface BillingRunSummary extends PaymentJobRun {
  invoicesCreated: number;
  collectionsStarted: number;
  failures: number;
}

export interface MandateReconcileSummary extends PaymentJobRun {
  updated: number;
}

export type MonitoringSeverity = "critical" | "warning" | "info";

export type MonitoringIssueKind =
  | "billing-job-stale" | "billing-job-failed" | "collection-overdue" | "collection-stuck" | "collection-failed"
  | "chargeback" | "mandate-missing" | "mandate-email-failed" | "authorization-missing" | "webhook-errors";

export interface MonitoringIssue {
  severity: MonitoringSeverity;
  kind: MonitoringIssueKind | string;
  title: string;
  detail?: string | null;
  customerName?: string | null;
  subscriptionId?: Id | null;
  invoiceId?: Id | null;
  since?: string | null;
}

/** GET /api/monitoring/payments */
export interface PaymentMonitoring {
  lastBillingRun?: BillingRunSummary | null;
  lastMandateReconcile?: MandateReconcileSummary | null;
  issues: MonitoringIssue[];
  counts: { critical: number; warning: number; info: number };
}

export interface BillingCalendarOccurrence {
  subscriptionId: Id;
  customerName: string;
  title: string;
  isInstallmentPlan: boolean;
  date: string;
  amount: number;
  isLastInstallment: boolean;
}

export interface BillingCalendar {
  occurrences: BillingCalendarOccurrence[];
  totalNext30Days: number;
  totalNext90Days: number;
}

export interface EligibleSubscriptionQuote {
  id: Id;
  quoteNumber: string;
  version: number;
  subject?: string | null;
  monthlyPrice: number;
  acceptedAt: string;
  signedByName?: string | null;
  signedByEmail?: string | null;
}

export interface ServiceCatalogItem {
  id: Id;
  categoryId: Id;
  name: string;
  description?: string | null;
  shortCode?: string | null;
  defaultPrice?: number | null;
  defaultLineType: QuoteLineType;
  sortOrder: number;
}

export interface ServiceCategory {
  id: Id;
  name: string;
  description?: string | null;
  sortOrder: number;
  items: ServiceCatalogItem[];
}

// === Schätzungen (Aufwandsschätzungen) ===
export type EstimateStatus = "Draft" | "Sent" | "Accepted" | "Rejected";
export type EstimateClassification = "intern" | "vertraulich" | "öffentlich";

export interface EstimateItem {
  label?: string | null;
  text: string;
}

export interface EstimateModule {
  title: string;
  description?: string | null;
  priceFrom?: number | null;
  priceTo?: number | null;
}

export interface EstimateTimelineRow {
  phase: string;
  period?: string | null;
  result?: string | null;
}

export interface EstimateContent {
  basis: EstimateItem[];
  decisions: EstimateItem[];
  architecture: EstimateItem[];
  implementation: EstimateItem[];
  pilot: EstimateItem[];
  modules: EstimateModule[];
  extensions: EstimateModule[];
  assumptions: EstimateItem[];
  exclusions: EstimateItem[];
  risks: EstimateItem[];
  openQuestions: EstimateItem[];
  timeline: EstimateTimelineRow[];
  nextSteps: EstimateItem[];
}

export interface EstimateListItem {
  id: Id;
  estimateNumber: string;
  title: string;
  customerId?: Id | null;
  customerName?: string | null;
  version: string;
  fixedPrice?: number | null;
  modulesFrom: number;
  modulesTo: number;
  status: EstimateStatus;
  date: string;
  createdAt: string;
}

/** Create/update payload (full replace). */
export interface SaveEstimateRequest {
  customerId?: Id | null;
  customerDisplayName?: string | null;
  title: string;
  subtitle?: string | null;
  version?: string | null;
  date?: string | null;
  preparedBy?: string | null;
  approvedBy?: string | null;
  responsible?: string | null;
  classification?: string | null;
  status?: EstimateStatus | null;
  fixedPrice?: number | null;
  fixedPriceLabel?: string | null;
  situationText?: string | null;
  proposalText?: string | null;
  costNote?: string | null;
  operationText?: string | null;
  timelineNote?: string | null;
  content: EstimateContent;
}

export interface EstimateDetail extends SaveEstimateRequest {
  id: Id;
  estimateNumber: string;
  customerName?: string | null;
  version: string;
  date: string;
  classification: string;
  status: EstimateStatus;
  modulesFrom: number;
  modulesTo: number;
  extensionsFrom: number;
  extensionsTo: number;
  createdAt: string;
  updatedAt?: string | null;
}
