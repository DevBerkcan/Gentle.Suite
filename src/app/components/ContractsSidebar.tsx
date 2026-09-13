"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { LayoutDashboard, Users, Contact, FileSignature, FileStack, ChevronsLeft, ChevronsRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";

type NavItem = { href: string; label: string; icon: LucideIcon };

const mainNav: NavItem[] = [
  { href: "/contracts", label: "Dashboard", icon: LayoutDashboard },
  { href: "/contracts/list", label: "Verträge", icon: FileSignature },
  { href: "/contracts/templates", label: "Vertragsvorlagen", icon: FileStack },
  { href: "/customers", label: "Kunden", icon: Users },
  { href: "/contacts", label: "Kontakte", icon: Contact },
];

export default function ContractsSidebar({ mobile = false }: { mobile?: boolean }) {
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

  const isActive = (href: string) => pathname === href || (href !== "/contracts" && pathname.startsWith(href + "/"));

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
    <aside className={`bg-[#010a30] backdrop-blur-md pt-8 flex flex-col shrink-0 transition-[width] duration-200 ${
      effectiveCollapsed ? "w-16 px-2" : "w-64 px-6"
    }`}>
      <nav className="space-y-1 flex-1">
        {renderNav(mainNav)}
      </nav>

      <div className="pt-4 border-t border-white/10 space-y-1">
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
