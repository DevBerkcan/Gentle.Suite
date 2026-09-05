"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Sun, Moon, Plus, Receipt, FileText, Wallet, FolderKanban, ChevronDown, Settings, LogOut, Search, X, Menu } from "lucide-react";
import { api } from "@/lib/api";

const quickActions = [
  { label: "Rechnung erstellen", href: "/invoices", icon: Receipt },
  { label: "Angebot erstellen", href: "/quotes", icon: FileText },
  { label: "Ausgabe buchen", href: "/expenses", icon: Wallet },
  { label: "Projekt anlegen", href: "/projects", icon: FolderKanban },
];

interface Props {
  theme: "light" | "dark";
  onToggleTheme: () => void;
  onMenuToggle?: () => void;
}

export default function TopHeader({ theme, onToggleTheme, onMenuToggle }: Props) {
  const router = useRouter();
  const [user, setUser] = useState<{ fullName?: string; email?: string } | null>(null);
  const [quickOpen, setQuickOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const quickRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const u = localStorage.getItem("user");
    if (u) setUser(JSON.parse(u));
  }, []);

  // Cmd+K / Ctrl+K shortcut
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
        setTimeout(() => searchInputRef.current?.focus(), 50);
      }
      if (e.key === "Escape") { setSearchOpen(false); setSearchQuery(""); setSearchResults(null); }
    }
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const doSearch = useCallback(async (q: string) => {
    if (q.length < 2) { setSearchResults(null); return; }
    setSearchLoading(true);
    try { setSearchResults(await api.globalSearch(q)); } catch { setSearchResults(null); }
    finally { setSearchLoading(false); }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => doSearch(searchQuery), 300);
    return () => clearTimeout(t);
  }, [searchQuery, doSearch]);

  function navigateTo(route: string) {
    setSearchOpen(false); setSearchQuery(""); setSearchResults(null);
    router.push(route);
  }

  // Close dropdowns on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (quickRef.current && !quickRef.current.contains(e.target as Node)) setQuickOpen(false);
      if (userRef.current && !userRef.current.contains(e.target as Node)) setUserOpen(false);
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) { setSearchOpen(false); setSearchQuery(""); setSearchResults(null); }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const initials = user?.fullName
    ? user.fullName.split(" ").map(p => p[0]).slice(0, 2).join("").toUpperCase()
    : "?";

  function handleLogout() {
    localStorage.clear();
    window.location.href = "/login";
  }

  return (
    <header className="h-14 bg-surface border-b border-border flex items-center justify-between px-6 shrink-0 z-40">
      {/* Left — hamburger on mobile, brand wordmark on desktop */}
      <button onClick={onMenuToggle} className="md:hidden w-9 h-9 flex items-center justify-center rounded-lg hover:bg-background transition-colors text-muted hover:text-text">
        <Menu className="w-5 h-5" />
      </button>
      <Link href="/dashboard" className="hidden md:block brand-logo text-lg text-primary">
        Gentle Suite<sup>®</sup>
      </Link>

      {/* Right actions */}
      <div className="flex items-center gap-2">

        {/* Suche */}
        <div className="relative" ref={searchRef}>
          <button
            onClick={() => { setSearchOpen(true); setTimeout(() => searchInputRef.current?.focus(), 50); }}
            title="Suche (⌘K)"
            className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-background transition-colors text-muted hover:text-text"
          >
            <Search className="w-4 h-4" />
          </button>
          {searchOpen && (
            <div className="absolute right-0 top-full mt-2 w-96 bg-surface border border-border rounded-xl shadow-xl z-50">
              <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
                <Search className="w-4 h-4 text-muted shrink-0" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Suchen... (Esc zum Schließen)"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted"
                />
                {searchQuery && <button onClick={() => { setSearchQuery(""); setSearchResults(null); }}><X className="w-3.5 h-3.5 text-muted" /></button>}
              </div>
              {searchLoading && <div className="px-4 py-3 text-sm text-muted">Suche läuft...</div>}
              {searchResults && !searchLoading && (
                <div className="py-1 max-h-80 overflow-y-auto">
                  {[
                    { key: "customers", label: "Kunden" },
                    { key: "invoices", label: "Rechnungen" },
                    { key: "quotes", label: "Angebote" },
                    { key: "projects", label: "Projekte" },
                  ].map(({ key, label }) => {
                    const items = searchResults[key] ?? [];
                    if (!items.length) return null;
                    return (
                      <div key={key}>
                        <p className="px-4 py-1 text-xs text-muted font-medium uppercase tracking-wide">{label}</p>
                        {items.map((item: any) => (
                          <button
                            key={item.id}
                            onClick={() => navigateTo(item.route)}
                            className="w-full flex flex-col items-start px-4 py-2 hover:bg-background text-left transition-colors"
                          >
                            <span className="text-sm font-medium">{item.title}</span>
                            {item.subtitle && <span className="text-xs text-muted">{item.subtitle}</span>}
                          </button>
                        ))}
                      </div>
                    );
                  })}
                  {!searchResults.customers?.length && !searchResults.invoices?.length && !searchResults.quotes?.length && !searchResults.projects?.length && (
                    <div className="px-4 py-3 text-sm text-muted">Keine Ergebnisse für „{searchQuery}"</div>
                  )}
                </div>
              )}
              {!searchResults && !searchLoading && searchQuery.length < 2 && (
                <div className="px-4 py-3 text-xs text-muted">Mindestens 2 Zeichen eingeben</div>
              )}
            </div>
          )}
        </div>

        {/* Schnellzugriff */}
        <div className="relative" ref={quickRef}>
          <button
            onClick={() => setQuickOpen(o => !o)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-hover transition-colors"
          >
            <Plus className="w-4 h-4" />
            Neu
            <ChevronDown className="w-3 h-3 opacity-70" />
          </button>
          {quickOpen && (
            <div className="absolute right-0 top-full mt-1 w-52 bg-surface border border-border rounded-xl shadow-lg py-1 z-50">
              {quickActions.map(a => (
                <Link
                  key={a.href}
                  href={a.href}
                  onClick={() => setQuickOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-background transition-colors"
                >
                  <a.icon className="w-4 h-4 text-muted" />
                  {a.label}
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Dark Mode Toggle */}
        <button
          onClick={onToggleTheme}
          title={theme === "dark" ? "Light Mode" : "Dark Mode"}
          className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-background transition-colors text-muted hover:text-text"
        >
          {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* User Dropdown */}
        <div className="relative" ref={userRef}>
          <button
            onClick={() => setUserOpen(o => !o)}
            className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-background transition-colors"
          >
            <span className="w-7 h-7 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center shrink-0">
              {initials}
            </span>
            <span className="text-sm font-medium max-w-32 truncate hidden sm:block">{user?.fullName ?? "—"}</span>
            <ChevronDown className="w-3 h-3 text-muted hidden sm:block" />
          </button>
          {userOpen && (
            <div className="absolute right-0 top-full mt-1 w-56 bg-surface border border-border rounded-xl shadow-lg py-1 z-50">
              <div className="px-4 py-2.5 border-b border-border">
                <p className="text-sm font-medium">{user?.fullName}</p>
                <p className="text-xs text-muted">{user?.email}</p>
              </div>
              <Link
                href="/settings"
                onClick={() => setUserOpen(false)}
                className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-background transition-colors"
              >
                <Settings className="w-4 h-4 text-muted" />
                Einstellungen
              </Link>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-danger hover:bg-background transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Abmelden
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
