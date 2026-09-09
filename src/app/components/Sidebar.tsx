"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { LayoutDashboard, Users, UsersRound, FileText, Receipt, Wallet, Calculator, FolderKanban, RefreshCw, Clock, Settings, PackageOpen, Mail, FileStack, BookOpen, Scale, ClipboardCheck, Contact, Package, KeyRound, TrendingUp, LifeBuoy, Tag, Archive, BarChart2, CalendarDays, Search, CreditCard, CalendarClock, ChevronsLeft, ChevronsRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";

type NavItem = { href: string; label: string; icon: LucideIcon };

const mainNav: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/customers", label: "Kunden", icon: Users },
  { href: "/contacts", label: "Kontakte", icon: Contact },
  { href: "/opportunities", label: "Opportunities", icon: TrendingUp },
  { href: "/tickets", label: "Support", icon: LifeBuoy },
  { href: "/quotes", label: "Angebote", icon: FileText },
  { href: "/invoices", label: "Rechnungen", icon: Receipt },
  { href: "/expenses", label: "Ausgaben", icon: Wallet },
  { href: "/projects", label: "Projekte", icon: FolderKanban },
  { href: "/subscriptions", label: "Serienrechnungen", icon: RefreshCw },
  { href: "/installments", label: "Ratenzahlungen", icon: CalendarClock },
//  { href: "/time", label: "Zeiterfassung", icon: Clock },
  { href: "/calendar", label: "Kalender", icon: CalendarDays },
  { href: "/reports", label: "Berichte", icon: BarChart2 },
];

const accountingNav: NavItem[] = [
  { href: "/accounting", label: "Buchungen", icon: BookOpen },
  { href: "/vat", label: "USt-Voranmeldung", icon: Calculator },
  { href: "/steuer", label: "Steuerbereich", icon: Archive },
];

const adminNav: NavItem[] = [
  { href: "/team", label: "Mitarbeiter", icon: UsersRound },
  { href: "/products", label: "Produkte", icon: Package },
  { href: "/pricelists", label: "Preislisten", icon: Tag },
  { href: "/services", label: "Leistungen", icon: PackageOpen },
  { href: "/templates", label: "Vorlagen", icon: FileStack },
  { href: "/onboarding", label: "Onboarding", icon: ClipboardCheck },
  { href: "/legal-texts", label: "Rechtliches", icon: Scale },
  { href: "/payment-terms", label: "Zahlungsbedingungen", icon: CreditCard },
  { href: "/email-templates", label: "E-Mail-Vorlagen", icon: Mail },
  { href: "/emails", label: "E-Mail-Protokoll", icon: Mail },
  { href: "/users", label: "Zugänge", icon: KeyRound },
];

export default function Sidebar({ mobile = false }: { mobile?: boolean }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

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

  const isActive = (href: string) => pathname === href || (href !== "/dashboard" && pathname.startsWith(href + "/"));

  const linkCls = (href: string) =>
    `flex items-center gap-3 rounded-lg text-sm font-medium transition-colors ${
      effectiveCollapsed ? "justify-center px-2 py-2.5" : "px-3 py-2.5"
    } ${
      isActive(href) ? "bg-white/10 text-accent" : "text-white/70 hover:bg-white/5 hover:text-white"
    }`;

  const renderNav = (items: NavItem[]) =>
    items.map(n => (
      <Link key={n.href} href={n.href} className={linkCls(n.href)} title={effectiveCollapsed ? n.label : undefined}>
        <n.icon className="w-4 h-4 shrink-0" />
        {!effectiveCollapsed && n.label}
      </Link>
    ));

  return (
    <aside className={`bg-black/90 backdrop-blur-md pt-8 flex flex-col shrink-0 transition-[width] duration-200 ${
      effectiveCollapsed ? "w-16 px-2" : "w-64 px-6"
    }`}>
      <nav className="space-y-1 flex-1">
        {renderNav(mainNav)}

        <div className="pt-4 mt-4 border-t border-white/10">
          {!effectiveCollapsed && <p className="text-xs text-white/40 font-medium uppercase tracking-wide mb-2 px-3">Buchhaltung</p>}
          {renderNav(accountingNav)}
        </div>

        <div className="pt-4 mt-4 border-t border-white/10">
          {!effectiveCollapsed && <p className="text-xs text-white/40 font-medium uppercase tracking-wide mb-2 px-3">Verwaltung</p>}
          {renderNav(adminNav)}
        </div>
      </nav>

      <div className="pt-4 border-t border-white/10 space-y-1">
        <Link href="/settings" className={linkCls("/settings")} title={effectiveCollapsed ? "Einstellungen" : undefined}>
          <Settings className="w-4 h-4 shrink-0" />
          {!effectiveCollapsed && "Einstellungen"}
        </Link>
        {!mobile && (
          <button
            onClick={toggleCollapsed}
            title={effectiveCollapsed ? "Sidebar ausklappen" : "Sidebar einklappen"}
            className={`flex items-center gap-3 rounded-lg text-sm font-medium transition-colors text-white/50 hover:bg-white/5 hover:text-white w-full ${
              effectiveCollapsed ? "justify-center px-2 py-2.5" : "px-3 py-2.5"
            }`}
          >
            {effectiveCollapsed ? <ChevronsRight className="w-4 h-4 shrink-0" /> : <ChevronsLeft className="w-4 h-4 shrink-0" />}
            {!effectiveCollapsed && "Einklappen"}
          </button>
        )}
      </div>
    </aside>
  );
}
