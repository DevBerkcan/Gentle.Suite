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
  paymentTermKeys?: string[] | null;
  paymentTermOptions?: { id: Id; key: string; title: string; content: string; sortOrder: number }[] | null;
  chosenPaymentTermKey?: string | null;
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
