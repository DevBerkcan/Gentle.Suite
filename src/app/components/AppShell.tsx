"use client";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Sidebar from "./Sidebar";
import TopHeader from "./TopHeader";
import { X } from "lucide-react";
import { workspaceForPath, type Workspace } from "./workspaces";

const PUBLIC_PATHS = ["/login", "/approval", "/payment", "/agency-contract"];
const NO_SIDEBAR_PATHS = ["/workspace"];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [hasToken, setHasToken] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [workspace, setWorkspace] = useState<Workspace>("crm");

  useEffect(() => {
    setMounted(true);
    setHasToken(!!localStorage.getItem("token"));
    const saved = localStorage.getItem("theme") as "light" | "dark" | null;
    if (saved) setTheme(saved);
    const current = workspaceForPath(pathname, localStorage.getItem("workspace") as Workspace | null);
    localStorage.setItem("workspace", current);
    setWorkspace(current);
  }, [pathname]);

  // Close sidebar on route change (mobile)
  useEffect(() => { setSidebarOpen(false); }, [pathname]);

  function toggleTheme() {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("theme", next);
  }

  const isPublic = PUBLIC_PATHS.some(p => pathname.startsWith(p)) || pathname === "/";
  const isNoSidebar = NO_SIDEBAR_PATHS.some(p => pathname.startsWith(p));
  const showSidebar = mounted && hasToken && !isPublic && !isNoSidebar;
  if (!mounted) return <>{children}</>;

  if (showSidebar) {
    return (
      <div className="flex flex-col min-h-screen">
        <TopHeader theme={theme} onToggleTheme={toggleTheme} onMenuToggle={() => setSidebarOpen(o => !o)} workspace={workspace} />
        <div className="flex flex-1 overflow-hidden">
          {/* Desktop sidebar */}
          <div className="hidden md:block shrink-0">
            <Sidebar workspace={workspace} />
          </div>
          {/* Mobile sidebar overlay */}
          {sidebarOpen && (
            <div className="fixed inset-0 z-40 md:hidden">
              <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
              <div className="absolute left-0 top-0 bottom-0 z-50 bg-navy shadow-xl">
                <button onClick={() => setSidebarOpen(false)} className="absolute top-3 right-3 p-1 rounded-full hover:bg-white/10 text-white/70">
                  <X className="w-5 h-5" />
                </button>
                <Sidebar workspace={workspace} mobile />
              </div>
            </div>
          )}
          <main className="flex-1 overflow-auto min-w-0">{children}</main>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
