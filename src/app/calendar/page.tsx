"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { api } from "@/lib/api";

const WEEKDAYS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
const MONTHS_DE = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];

const TYPE_LABELS: Record<string, string> = {
  invoice: "Rechnung fällig",
  milestone: "Meilenstein",
  activity: "Aktivität",
  subscription: "Serienrechnung",
  installment: "Ratenzahlung",
  "quote-expiring": "Angebot läuft ab",
};
const TYPE_COLORS: Record<string, string> = {
  invoice: "bg-red-500",
  milestone: "bg-blue-500",
  activity: "bg-green-500",
  subscription: "bg-purple-500",
  installment: "bg-pink-500",
  "quote-expiring": "bg-amber-500",
};

export default function CalendarPage() {
  const router = useRouter();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth()); // 0-indexed
  const [events, setEvents] = useState<any[]>([]);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  useEffect(() => {
    const from = new Date(year, month, 1).toISOString();
    const to = new Date(year, month + 1, 0, 23, 59, 59).toISOString();
    api.calendarEvents(from, to).then(setEvents).catch(() => setEvents([]));
  }, [year, month]);

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
    setSelectedDay(null);
  }
  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
    setSelectedDay(null);
  }

  // Build calendar grid
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startOffset = (firstDay.getDay() + 6) % 7; // Mon=0
  const totalDays = lastDay.getDate();
  const cells: (number | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: totalDays }, (_, i) => i + 1),
  ];
  // Pad to full weeks
  while (cells.length % 7 !== 0) cells.push(null);

  function eventsForDay(day: number) {
    return events.filter(e => {
      const d = new Date(e.date);
      return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day;
    });
  }

  const selectedEvents = selectedDay ? eventsForDay(selectedDay) : [];

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Kalender</h1>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 text-xs text-muted">
            {Object.entries(TYPE_COLORS).map(([type, color]) => (
              <span key={type} className="flex items-center gap-1 mr-3">
                <span className={`w-2 h-2 rounded-full ${color}`} />
                {TYPE_LABELS[type]}
              </span>
            ))}
          </div>
          <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-background"><ChevronLeft className="w-4 h-4" /></button>
          <span className="font-semibold min-w-40 text-center">{MONTHS_DE[month]} {year}</span>
          <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-background"><ChevronRight className="w-4 h-4" /></button>
        </div>
      </div>

      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-7 border-b border-border">
          {WEEKDAYS.map(d => (
            <div key={d} className="py-3 text-center text-xs font-semibold text-muted uppercase tracking-wide">{d}</div>
          ))}
        </div>

        {/* Days */}
        <div className="grid grid-cols-7">
          {cells.map((day, idx) => {
            const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
            const dayEvents = day ? eventsForDay(day) : [];
            const isSelected = day === selectedDay;
            return (
              <div
                key={idx}
                onClick={() => day && setSelectedDay(day === selectedDay ? null : day)}
                className={`min-h-20 p-2 border-b border-r border-border last:border-r-0 transition-colors ${day ? "cursor-pointer hover:bg-background" : "bg-background/30"} ${isSelected ? "bg-primary/5" : ""}`}
              >
                {day && (
                  <>
                    <span className={`inline-flex w-6 h-6 items-center justify-center rounded-full text-sm font-medium mb-1 ${isToday ? "bg-primary text-white" : "text-text"}`}>
                      {day}
                    </span>
                    <div className="space-y-0.5">
                      {dayEvents.slice(0, 3).map((e: any) => (
                        <div
                          key={e.id}
                          className={`${TYPE_COLORS[e.type] ?? "bg-gray-400"} text-white text-xs rounded px-1 py-0.5 truncate cursor-pointer`}
                          onClick={(ev) => { ev.stopPropagation(); router.push(e.route); }}
                          title={e.title}
                        >
                          {e.title}
                        </div>
                      ))}
                      {dayEvents.length > 3 && (
                        <div className="text-xs text-muted px-1">+{dayEvents.length - 3} weitere</div>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Day Detail Panel */}
      {selectedDay && (
        <div className="mt-4 bg-surface border border-border rounded-xl p-5">
          <h2 className="font-semibold mb-3">{selectedDay}. {MONTHS_DE[month]} {year}</h2>
          {selectedEvents.length === 0 ? (
            <p className="text-muted text-sm">Keine Ereignisse an diesem Tag</p>
          ) : (
            <div className="space-y-2">
              {selectedEvents.map((e: any) => (
                <div
                  key={e.id}
                  onClick={() => router.push(e.route)}
                  className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-background cursor-pointer transition-colors"
                >
                  <span className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${TYPE_COLORS[e.type] ?? "bg-gray-400"}`} />
                  <div>
                    <p className="font-medium text-sm">{e.title}</p>
                    {e.subtitle && <p className="text-xs text-muted mt-0.5">{e.subtitle}</p>}
                    <p className="text-xs text-muted mt-0.5">{TYPE_LABELS[e.type] ?? e.type}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
