"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, UsersRound, FileText, Receipt, Wallet, Calculator, FolderKanban, RefreshCw, Clock, Settings, PackageOpen, Mail, FileStack, BookOpen, Scale, ClipboardCheck, Contact, Package, KeyRound, TrendingUp, LifeBuoy, Tag, Archive, BarChart2, CalendarDays, Search, CreditCard } from "lucide-react";
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
  { href: "/time", label: "Zeiterfassung", icon: Clock },
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
  { href: "/legal-texts", label: "Rechtstexte", icon: Scale },
  { href: "/payment-terms", label: "Zahlungsbedingungen", icon: CreditCard },
  { href: "/email-templates", label: "E-Mail-Vorlagen", icon: Mail },
  { href: "/emails", label: "E-Mail-Protokoll", icon: Mail },
  { href: "/users", label: "Zugänge", icon: KeyRound },
];

export default function Sidebar() {
  const pathname = usePathname();

  const isActive = (href: string) => pathname === href || (href !== "/dashboard" && pathname.startsWith(href + "/"));

  const linkCls = (href: string) =>
    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
      isActive(href) ? "bg-white/10 text-accent" : "text-white/70 hover:bg-white/5 hover:text-white"
    }`;

  return (
    <aside className="w-64 bg-[#010a30] p-6 pt-8 flex flex-col shrink-0">
      <nav className="space-y-1 flex-1">
        {mainNav.map(n => (
          <Link key={n.href} href={n.href} className={linkCls(n.href)}>
            <n.icon className="w-4 h-4" />{n.label}
          </Link>
        ))}

        <div className="pt-4 mt-4 border-t border-white/10">
          <p className="text-xs text-white/40 font-medium uppercase tracking-wide mb-2 px-3">Buchhaltung</p>
          {accountingNav.map(n => (
            <Link key={n.href} href={n.href} className={linkCls(n.href)}>
              <n.icon className="w-4 h-4" />{n.label}
            </Link>
          ))}
        </div>

        <div className="pt-4 mt-4 border-t border-white/10">
          <p className="text-xs text-white/40 font-medium uppercase tracking-wide mb-2 px-3">Verwaltung</p>
          {adminNav.map(n => (
            <Link key={n.href} href={n.href} className={linkCls(n.href)}>
              <n.icon className="w-4 h-4" />{n.label}
            </Link>
          ))}
        </div>
      </nav>

      <div className="pt-4 border-t border-white/10">
        <Link href="/settings" className={linkCls("/settings")}>
          <Settings className="w-4 h-4" />Einstellungen
        </Link>
      </div>
    </aside>
  );
}
