export interface BillingOverview {
  total: number;
  active: number;
  monthlyNet: number;
  settled: number;
  contractNet: number;
  paidNet: number;
  remainingNet: number;
  stages: { key: string; label: string; count: number }[];
}

export interface DashboardOverview {
  generatedAt: string;
  activeCustomers: number;
  openQuotes: number;
  openOnboardings: number;
  overdueTasks: number;
  receivedThisMonth: number;
  openInvoiceAmount: number;
  overdueInvoiceAmount: number;
  overdueInvoiceCount: number;
  recurring: BillingOverview;
  installments: BillingOverview;
  scheduledCollections: number;
  processingCollections: number;
  failedCollections: number;
  scheduledAmount: number;
  attentionCount: number;
  attention: { id: string; customerName: string; title: string; detail: string; href: string; severity: string; amount: number | null }[];
  upcomingCount: number;
  upcoming: { invoiceId: string; invoiceNumber: string; customerName: string; isInstallmentPlan: boolean; dueDate: string; amount: number; status: string; attempts: number }[];
  installmentTrackingCount: number;
  installmentTracking: { id: string; customerName: string; title: string; stage: string; issued: number; totalInstallments: number | null; contractNet: number; paidNet: number; remainingNet: number }[];
  paymentChart: { year: number; month: number; revenue: number; expenses: number }[];
  recentActivity: { id: string; entityType: string; entityId: string; action: string; description: string | null; createdAt: string }[];
}
