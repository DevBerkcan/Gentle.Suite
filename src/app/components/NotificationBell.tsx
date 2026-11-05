"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { HubConnectionBuilder, HubConnectionState, LogLevel } from "@microsoft/signalr";
import { api } from "@/lib/api";

type Notification = { id: string; kind: string; title: string; body?: string; href?: string; createdAt: string; read: boolean };
const DOT: Record<string, string> = { "quote-accepted": "bg-success", "payment-received": "bg-success", chargeback: "bg-danger", "ticket-created": "bg-warning" };
const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

function ago(iso: string) {
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1) return "gerade eben";
  if (min < 60) return `vor ${min} Min.`;
  const h = Math.round(min / 60);
  if (h < 24) return `vor ${h} Std.`;
  return new Date(iso).toLocaleDateString("de-DE", { timeZone: "Europe/Berlin" });
}

/** Glocke im Header: lädt die letzten Benachrichtigungen, empfängt neue live per SignalR und zeigt sie kurz als Toast. */
export default function NotificationBell() {
  const [items, setItems] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState<Notification | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const load = () => api.notifications().then(r => { setItems(r.items); setUnread(r.unread); }).catch(() => {});
    load();
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (!token) return;
    const conn = new HubConnectionBuilder()
      .withUrl(`${API}/hubs/notifications`, { accessTokenFactory: () => localStorage.getItem("token") || "", withCredentials: false }) // Token statt Cookies → CORS ohne AllowCredentials
      .withAutomaticReconnect()
      .configureLogging(LogLevel.None)
      .build();
    let toastTimer: ReturnType<typeof setTimeout> | undefined;
    conn.on("notification", (n: Notification) => {
      setItems(prev => [n, ...prev.filter(p => p.id !== n.id)].slice(0, 30));
      setUnread(u => u + 1);
      setToast(n);
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => setToast(null), 6000);
    });
    conn.onreconnected(() => load()); // verpasste Meldungen nachladen
    conn.start().catch(() => {}); // ohne Live-Verbindung bleibt die Glocke trotzdem nutzbar
    // Fallback, falls WebSockets blockiert sind: alle 2 Minuten aktualisieren
    const poll = setInterval(() => { if (conn.state !== HubConnectionState.Connected) load(); }, 120000);
    return () => { clearInterval(poll); clearTimeout(toastTimer); conn.stop().catch(() => {}); };
  }, []);

  useEffect(() => {
    const close = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  function markRead(n: Notification) {
    if (n.read) return;
    setItems(prev => prev.map(p => p.id === n.id ? { ...p, read: true } : p));
    setUnread(u => Math.max(0, u - 1));
    api.markNotificationRead(n.id).catch(() => {});
  }
  function markAll() {
    setItems(prev => prev.map(p => ({ ...p, read: true })));
    setUnread(0);
    api.markAllNotificationsRead().catch(() => {});
  }

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(o => !o)} aria-label={unread ? `${unread} ungelesene Benachrichtigungen` : "Benachrichtigungen"} title="Benachrichtigungen"
        className="relative w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors text-white/70 hover:text-white">
        <Bell className="w-4 h-4" />
        {unread > 0 && <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-danger text-white text-[10px] font-bold flex items-center justify-center">{unread > 99 ? "99+" : unread}</span>}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-[min(360px,calc(100vw-32px))] rounded-xl border border-border bg-surface text-text shadow-xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <p className="text-sm font-semibold">Benachrichtigungen</p>
            {unread > 0 && <button onClick={markAll} className="text-xs text-primary hover:underline">Alle gelesen</button>}
          </div>
          {items.length === 0 ? <p className="px-4 py-8 text-center text-sm text-muted">Noch keine Benachrichtigungen.</p> : (
            <ul className="max-h-[420px] overflow-y-auto divide-y divide-border">
              {items.map(n => (
                <li key={n.id}>
                  <Link href={n.href || "#"} onClick={() => { markRead(n); setOpen(false); }} className={`flex gap-3 px-4 py-3 hover:bg-background ${n.read ? "opacity-70" : ""}`}>
                    <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.read ? "bg-border" : DOT[n.kind] || "bg-primary"}`} aria-hidden="true" />
                    <span className="min-w-0">
                      <span className={`block text-sm ${n.read ? "" : "font-semibold"}`}>{n.title}</span>
                      {n.body && <span className="block text-xs text-muted mt-0.5 truncate">{n.body}</span>}
                      <span className="block text-[11px] text-muted mt-1">{ago(n.createdAt)}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      {toast && !open && (
        <Link href={toast.href || "#"} onClick={() => { markRead(toast); setToast(null); }} role="status"
          className="fixed bottom-4 right-4 z-[60] w-[min(360px,calc(100vw-32px))] rounded-xl border border-border bg-surface text-text shadow-xl p-4 flex gap-3">
          <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${DOT[toast.kind] || "bg-primary"}`} aria-hidden="true" />
          <span className="min-w-0"><span className="block text-sm font-semibold">{toast.title}</span>{toast.body && <span className="block text-xs text-muted mt-0.5">{toast.body}</span>}</span>
        </Link>
      )}
    </div>
  );
}
