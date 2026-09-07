export const CUSTOMER_STATUS = ["Lead", "Active", "Inactive", "Churned"] as const;
export type CustomerStatus = typeof CUSTOMER_STATUS[number];

export const NOTE_TYPE = ["General", "Credential", "Technical", "Financial", "Internal"] as const;
export type NoteType = typeof NOTE_TYPE[number];

export const QUOTE_STATUS = ["Draft", "Sent", "Viewed", "Accepted", "Rejected", "Expired", "Ordered", "Inactive"] as const;
export type QuoteStatus = typeof QUOTE_STATUS[number];

export const SIGNATURE_STATUS = ["Pending", "Signed", "Declined", "Expired"] as const;
export type SignatureStatus = typeof SIGNATURE_STATUS[number];

export const QUOTE_LINE_TYPE = ["OneTime", "RecurringMonthly"] as const;
export type QuoteLineType = typeof QUOTE_LINE_TYPE[number];

export const INVOICE_STATUS = ["Draft", "Final", "Sent", "Open", "Paid", "Overdue", "Cancelled"] as const;
export type InvoiceStatus = typeof INVOICE_STATUS[number];

export const INVOICE_TYPE = ["Standard", "Recurring", "CreditNote", "Cancellation"] as const;
export type InvoiceType = typeof INVOICE_TYPE[number];

export const TAX_MODE = ["Standard", "SmallBusiness", "ReverseCharge"] as const;
export type TaxMode = typeof TAX_MODE[number];

export const EXPENSE_STATUS = ["Draft", "Booked", "Archived"] as const;
export type ExpenseStatus = typeof EXPENSE_STATUS[number];

export const PROJECT_STATUS = ["Planning", "InProgress", "Review", "Completed", "OnHold", "Cancelled"] as const;
export type ProjectStatus = typeof PROJECT_STATUS[number];

export const PROJECT_BOARD_TASK_STATUS = ["Todo", "InProgress", "Done"] as const;
export type ProjectBoardTaskStatus = typeof PROJECT_BOARD_TASK_STATUS[number];

export const SUBSCRIPTION_STATUS = ["Active", "Paused", "Cancelled", "Expired", "PendingConfirmation", "Completed"] as const;
export type SubscriptionStatus = typeof SUBSCRIPTION_STATUS[number];
