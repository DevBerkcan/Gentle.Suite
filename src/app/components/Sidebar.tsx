"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { LayoutDashboard, Users, UsersRound, FileText, Receipt, Wallet, Calculator, RefreshCw, Settings, PackageOpen, Mail, BookOpen, Scale, ClipboardCheck, Contact, Package, KeyRound, TrendingUp, LifeBuoy, Tag, Archive, CalendarClock, FileSignature, FileStack, Ruler, ChevronsLeft, ChevronsRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { workspaces, type Workspace } from "./workspaces";

type NavItem = { href: string; label: string; icon: LucideIcon };
type NavGroup = { title?: string; items: NavItem[] };

const navByWorkspace: Record<Workspace, { home: string; groups: NavGroup[] }> = {
  crm: {
    home: "/dashboard",
    groups: [
      { items: [
        { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
        { href: "/customers", label: "Kunden", icon: Users },
        { href: "/contacts", label: "Kontakte", icon: Contact },
        { href: "/opportunities", label: "Opportunities", icon: TrendingUp },
        { href: "/tickets", label: "Support", icon: LifeBuoy },
      ] },
      { title: "Verkauf", items: [
        { href: "/quotes", label: "Angebote", icon: FileText },
        { href: "/invoices", label: "Rechnungen", icon: Receipt },
        { href: "/subscriptions", label: "Serienrechnungen", icon: RefreshCw },
        { href: "/installments", label: "Ratenzahlungen", icon: CalendarClock },
      ] },
    ],
  },
  organisation: {
    home: "/expenses",
    groups: [
      { items: [
        { href: "/expenses", label: "Ausgaben", icon: Wallet },
      ] },
      { title: "Buchhaltung", items: [
        { href: "/accounting", label: "Buchungen", icon: BookOpen },
        { href: "/vat", label: "USt-Voranmeldung", icon: Calculator },
        { href: "/steuer", label: "Steuerbereich", icon: Archive },
      ] },
      { title: "Verwaltung", items: [
        { href: "/team", label: "Mitarbeiter", icon: UsersRound },
        { href: "/products", label: "Produkte", icon: Package },
        { href: "/pricelists", label: "Preislisten", icon: Tag },
        { href: "/services", label: "Leistungen", icon: PackageOpen },
        { href: "/onboarding", label: "Onboarding", icon: ClipboardCheck },
        { href: "/legal-texts", label: "Rechtliches", icon: Scale },
        { href: "/email-templates", label: "E-Mail-Vorlagen", icon: Mail },
        { href: "/emails", label: "E-Mail-Protokoll", icon: Mail },
        { href: "/users", label: "Zugänge", icon: KeyRound },
        { href: "/settings", label: "Einstellungen", icon: Settings },
      ] },
    ],
  },
  contracts: {
    home: "/contracts",
    groups: [
      { items: [
        { href: "/contracts", label: "Dashboard", icon: LayoutDashboard },
        { href: "/contracts/list", label: "Verträge", icon: FileSignature },
        { href: "/contracts/estimates", label: "Schätzungen", icon: Ruler },
        { href: "/contracts/templates", label: "Vertragsvorlagen", icon: FileStack },
        { href: "/customers", label: "Kunden", icon: Users },
        { href: "/contacts", label: "Kontakte", icon: Contact },
      ] },
    ],
  },
};

export default function Sidebar({ workspace, mobile = false }: { workspace: Workspace; mobile?: boolean }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { home, groups } = navByWorkspace[workspace];

  useEffect(() => {
    setMounted(true);
    if (!mobile && localStorage.getItem("sidebarCollapsed") === "1") setCollapsed(true);
  }, [mobile]);

  const effectiveCollapsed = !mobile && mounted && collapsed;

  function toggleCollapsed() {
    setCollapsed(c => {
      const next = !c;
      localStorage.setItem("sidebarCollapsed", next ? "1" : "0");
      return next;
    });
  }

  const isActive = (href: string) => pathname === href || (href !== home && pathname.startsWith(href + "/"));

  const linkCls = (href: string) =>
    `flex items-center gap-3 rounded-full text-sm font-medium transition-colors ${
      effectiveCollapsed ? "justify-center px-2 py-2.5" : "px-4 py-2"
    } ${
      isActive(href) ? "bg-accent text-navy" : "text-white/70 hover:bg-white/10 hover:text-white"
    }`;

  return (
    <aside className={`bg-navy h-full pt-8 pb-4 flex flex-col shrink-0 transition-[width] duration-200 ${
      effectiveCollapsed ? "w-16 px-2" : "w-64 px-4"
    }`}>
      {/* The header's workspace switcher is hidden on phones, so the drawer carries it */}
      {mobile && (
        <div className="flex flex-col gap-1 mb-6 pr-8">
          {workspaces.map(w => (
            <button
              key={w.key}
              onClick={() => { localStorage.setItem("workspace", w.key); window.location.href = w.home; }}
              className={`px-4 py-2 rounded-full text-left text-[11px] uppercase tracking-[0.15em] transition-colors ${workspace === w.key ? "bg-white/10 text-white font-semibold" : "text-white/60 hover:text-white"}`}
            >
              {w.label}
            </button>
          ))}
        </div>
      )}
      <nav className="space-y-1 flex-1 overflow-y-auto">
        {groups.map((g, gi) => (
          <div key={gi} className={gi > 0 ? "pt-4 mt-4 border-t border-white/10 space-y-1" : "space-y-1"}>
            {g.title && !effectiveCollapsed && <p className="text-[10px] text-white/40 font-medium uppercase tracking-[0.25em] mb-2 px-4">{g.title}</p>}
            {g.items.map(n => (
              <Link key={n.href} href={n.href} className={linkCls(n.href)} title={effectiveCollapsed ? n.label : undefined}>
                <n.icon className="w-4 h-4 shrink-0" />
                {!effectiveCollapsed && n.label}
              </Link>
            ))}
          </div>
        ))}
      </nav>

      {!mobile && (
        <div className="pt-4 border-t border-white/10">
          <button
            onClick={toggleCollapsed}
            title={effectiveCollapsed ? "Sidebar ausklappen" : "Sidebar einklappen"}
            className={`flex items-center gap-3 rounded-full text-sm font-medium transition-colors text-white/50 hover:bg-white/10 hover:text-white w-full ${
              effectiveCollapsed ? "justify-center px-2 py-2.5" : "px-4 py-2"
            }`}
          >
            {effectiveCollapsed ? <ChevronsRight className="w-4 h-4 shrink-0" /> : <ChevronsLeft className="w-4 h-4 shrink-0" />}
            {!effectiveCollapsed && "Einklappen"}
          </button>
        </div>
      )}
    </aside>
  );
}
