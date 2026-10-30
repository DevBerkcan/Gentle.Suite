export type Workspace = "crm" | "organisation" | "contracts";

export const workspaces: { key: Workspace; label: string; home: string }[] = [
  { key: "crm", label: "CRM", home: "/dashboard" },
  { key: "organisation", label: "Organisation", home: "/expenses" },
  { key: "contracts", label: "Verträge", home: "/contracts" },
];

// Pages that only exist in one workspace; anything else (Kunden, Kontakte …) keeps the last chosen workspace.
const organisationPaths = ["/expenses", "/accounting", "/vat", "/steuer", "/team", "/products", "/pricelists", "/services", "/onboarding", "/legal-texts", "/email-templates", "/emails", "/users", "/settings"];
const crmPaths = ["/dashboard", "/opportunities", "/tickets", "/quotes", "/invoices", "/subscriptions", "/installments", "/monitoring"];

const matches = (pathname: string, paths: string[]) => paths.some(p => pathname === p || pathname.startsWith(p + "/"));

export function workspaceForPath(pathname: string, saved: Workspace | null): Workspace {
  if (matches(pathname, ["/contracts"])) return "contracts";
  if (matches(pathname, organisationPaths)) return "organisation";
  if (matches(pathname, crmPaths)) return "crm";
  return saved && workspaces.some(w => w.key === saved) ? saved : "crm";
}
