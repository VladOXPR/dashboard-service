"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toLocalYMD } from "@/lib/format";

export type DateRange = { start: Date; end: Date };

export type DateRangeValidation =
  | { ok: true; start: Date; end: Date }
  | { ok: false; message: string };

export function defaultRange(): DateRange {
  const end = new Date();
  const start = new Date(end.getFullYear(), end.getMonth(), 1);
  return { start, end };
}

export function validateRange(start: string, end: string): DateRangeValidation {
  const s = start && end ? new Date(start + "T12:00:00") : null;
  const e = start && end ? new Date(end + "T12:00:00") : null;
  if (!s || !e || isNaN(s.getTime()) || isNaN(e.getTime())) {
    return { ok: false, message: "Please select a valid start and end date." };
  }
  const sd = new Date(s.getFullYear(), s.getMonth(), s.getDate());
  const ed = new Date(e.getFullYear(), e.getMonth(), e.getDate());
  if (sd > ed) return { ok: false, message: "Start date must be before or equal to end date." };
  return { ok: true, start: s, end: e };
}

type Props = {
  start: string;
  end: string;
  onChange: (next: { start: string; end: string }) => void;
  onApply?: () => void;
  loading?: boolean;
};

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}
function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}
function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}
function startOfWeek(d: Date): Date {
  const r = startOfDay(d);
  return addDays(r, -r.getDay());
}
function endOfWeek(d: Date): Date {
  return addDays(startOfWeek(d), 6);
}
function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
function isBefore(a: Date, b: Date): boolean {
  return startOfDay(a).getTime() < startOfDay(b).getTime();
}
function isInRange(d: Date, s: Date, e: Date): boolean {
  const t = startOfDay(d).getTime();
  const lo = Math.min(startOfDay(s).getTime(), startOfDay(e).getTime());
  const hi = Math.max(startOfDay(s).getTime(), startOfDay(e).getTime());
  return t >= lo && t <= hi;
}

function parseYMD(s: string): Date | null {
  if (!s) return null;
  const d = new Date(s + "T12:00:00");
  if (isNaN(d.getTime())) return null;
  return startOfDay(d);
}

const monthYearFormatter = new Intl.DateTimeFormat(undefined, {
  month: "long",
  year: "numeric",
});
const triggerFormatter = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  year: "numeric",
});

function formatTriggerRange(start: string, end: string): string {
  const s = parseYMD(start);
  const e = parseYMD(end);
  if (!s || !e) return "Select date range";
  return `${triggerFormatter.format(s)} – ${triggerFormatter.format(e)}`;
}

type Preset = { id: string; label: string; range: () => { start: Date; end: Date } };

function buildPresets(today: Date): Preset[] {
  const t = startOfDay(today);
  const yesterday = addDays(t, -1);
  const lastWeekRef = addDays(t, -7);
  const lastMonthRef = addMonths(t, -1);
  const lastYearRef = new Date(t.getFullYear() - 1, 0, 1);
  return [
    { id: "today", label: "Today", range: () => ({ start: t, end: t }) },
    { id: "yesterday", label: "Yesterday", range: () => ({ start: yesterday, end: yesterday }) },
    {
      id: "this-week",
      label: "This week",
      range: () => ({ start: startOfWeek(t), end: endOfWeek(t) }),
    },
    {
      id: "last-week",
      label: "Last week",
      range: () => ({ start: startOfWeek(lastWeekRef), end: endOfWeek(lastWeekRef) }),
    },
    {
      id: "this-month",
      label: "This month",
      range: () => ({ start: startOfMonth(t), end: endOfMonth(t) }),
    },
    {
      id: "last-month",
      label: "Last month",
      range: () => ({
        start: startOfMonth(lastMonthRef),
        end: endOfMonth(lastMonthRef),
      }),
    },
    {
      id: "this-year",
      label: "This year",
      range: () => ({
        start: new Date(t.getFullYear(), 0, 1),
        end: new Date(t.getFullYear(), 11, 31),
      }),
    },
    {
      id: "last-year",
      label: "Last year",
      range: () => ({
        start: lastYearRef,
        end: new Date(lastYearRef.getFullYear(), 11, 31),
      }),
    },
    {
      id: "all-time",
      label: "All time",
      range: () => ({ start: new Date(2020, 0, 1), end: t }),
    },
  ];
}

type CalendarProps = {
  month: Date;
  selectedStart: Date | null;
  selectedEnd: Date | null;
  hoverDate: Date | null;
  isPickingEnd: boolean;
  onPickDate: (d: Date) => void;
  onHoverDate: (d: Date | null) => void;
  onPrev?: () => void;
  onNext?: () => void;
};

function Calendar({
  month,
  selectedStart,
  selectedEnd,
  hoverDate,
  isPickingEnd,
  onPickDate,
  onHoverDate,
  onPrev,
  onNext,
}: CalendarProps) {
  const monthStart = startOfMonth(month);
  const gridStart = startOfWeek(monthStart);
  const today = useMemo(() => startOfDay(new Date()), []);

  const days: { date: Date; inMonth: boolean }[] = [];
  for (let i = 0; i < 42; i++) {
    const d = addDays(gridStart, i);
    days.push({ date: d, inMonth: d.getMonth() === monthStart.getMonth() });
  }
  while (days.length > 35 && days.slice(-7).every((x) => !x.inMonth)) {
    days.length -= 7;
  }

  // Effective range for highlighting (uses hover preview when picking end)
  let effStart: Date | null = selectedStart;
  let effEnd: Date | null = selectedEnd;
  if (isPickingEnd && selectedStart && !selectedEnd && hoverDate) {
    effStart = isBefore(hoverDate, selectedStart) ? hoverDate : selectedStart;
    effEnd = isBefore(hoverDate, selectedStart) ? selectedStart : hoverDate;
  }

  return (
    <div className="cal-month">
      <div className="cal-header">
        <button
          type="button"
          className="cal-nav"
          aria-label="Previous month"
          onClick={onPrev}
          style={{ visibility: onPrev ? "visible" : "hidden" }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <div className="cal-title">{monthYearFormatter.format(month)}</div>
        <button
          type="button"
          className="cal-nav"
          aria-label="Next month"
          onClick={onNext}
          style={{ visibility: onNext ? "visible" : "hidden" }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
      <div className="cal-weekdays">
        {WEEKDAYS.map((w) => (
          <div key={w} className="cal-weekday">
            {w}
          </div>
        ))}
      </div>
      <div className="cal-grid">
        {days.map(({ date, inMonth }, i) => {
          const isStart = effStart != null && isSameDay(date, effStart);
          const isEnd = effEnd != null && isSameDay(date, effEnd);
          const inRange =
            effStart != null && effEnd != null && isInRange(date, effStart, effEnd);
          const isTodayCell = isSameDay(date, today);

          const cls = ["cal-cell"];
          if (!inMonth) cls.push("cal-cell-out");
          if (inRange) cls.push("cal-cell-in-range");
          if (isStart) cls.push("cal-cell-start");
          if (isEnd) cls.push("cal-cell-end");
          if (isStart && isEnd) cls.push("cal-cell-single");

          return (
            <button
              key={i}
              type="button"
              className={cls.join(" ")}
              onClick={() => onPickDate(date)}
              onMouseEnter={() => onHoverDate(date)}
              onMouseLeave={() => onHoverDate(null)}
              tabIndex={inMonth ? 0 : -1}
            >
              <span className="cal-cell-num">{date.getDate()}</span>
              {isTodayCell && !isStart && !isEnd ? <span className="cal-cell-today-dot" /> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function PerformanceDateRange({ start, end, onChange, onApply, loading = false }: Props) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Draft state inside the popover; only committed on Apply
  const [draftStart, setDraftStart] = useState<string>(start);
  const [draftEnd, setDraftEnd] = useState<string>(end);
  const [hoverDate, setHoverDate] = useState<Date | null>(null);
  const [isPickingEnd, setIsPickingEnd] = useState(false);

  // The left calendar's reference month
  const [viewMonth, setViewMonth] = useState<Date>(() => {
    const s = parseYMD(start) ?? new Date();
    return addMonths(s, 0);
  });

  useEffect(() => {
    if (!start || !end) {
      const r = defaultRange();
      onChange({ start: toLocalYMD(r.start), end: toLocalYMD(r.end) });
    }
  }, [start, end, onChange]);

  // Sync drafts whenever popover opens, or props change while closed
  useEffect(() => {
    if (open) return;
    setDraftStart(start);
    setDraftEnd(end);
  }, [start, end, open]);

  useEffect(() => {
    if (!open) return;
    function onDocMouseDown(e: MouseEvent) {
      if (!containerRef.current) return;
      if (containerRef.current.contains(e.target as Node)) return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocMouseDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocMouseDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const today = useMemo(() => startOfDay(new Date()), []);
  const presets = useMemo(() => buildPresets(today), [today]);

  const draftStartDate = parseYMD(draftStart);
  const draftEndDate = parseYMD(draftEnd);

  const openPopover = useCallback(() => {
    setDraftStart(start);
    setDraftEnd(end);
    setIsPickingEnd(false);
    setHoverDate(null);
    const s = parseYMD(start) ?? today;
    setViewMonth(startOfMonth(s));
    setOpen(true);
  }, [start, end, today]);

  function pickDate(d: Date) {
    /*
     * Two phases:
     *   - Not picking end (a previous range is shown, or nothing is): the
     *     click starts a new range. Clear draftEnd and flip into picking-end.
     *   - Picking end (start was just chosen and draftEnd is empty): the
     *     click closes the range. Swap if the user clicked before the start.
     *
     * The previous implementation also bailed when draftEndDate was null,
     * which is always true mid-selection (we just cleared draftEnd), so the
     * second click kept restarting the range instead of closing it.
     */
    if (!isPickingEnd || !draftStartDate) {
      setDraftStart(toLocalYMD(d));
      setDraftEnd("");
      setIsPickingEnd(true);
      return;
    }

    if (isBefore(d, draftStartDate)) {
      setDraftEnd(toLocalYMD(draftStartDate));
      setDraftStart(toLocalYMD(d));
    } else {
      setDraftEnd(toLocalYMD(d));
    }
    setIsPickingEnd(false);
  }

  function applyPreset(p: Preset) {
    const r = p.range();
    setDraftStart(toLocalYMD(r.start));
    setDraftEnd(toLocalYMD(r.end));
    setIsPickingEnd(false);
    setViewMonth(startOfMonth(r.start));
  }

  function applyAndClose() {
    if (loading) return;
    const validation = validateRange(draftStart, draftEnd);
    if (!validation.ok) return;
    onChange({ start: draftStart, end: draftEnd });
    setOpen(false);
    // The parent reloads via its own effect on start/end change.
    // onApply is a no-args notification only; do not pass state through it.
    onApply?.();
  }

  function cancelAndClose() {
    setOpen(false);
  }

  const triggerLabel = formatTriggerRange(start, end);
  const rightMonth = addMonths(viewMonth, 1);

  // Highlight matching preset
  const activePresetId = useMemo(() => {
    if (!draftStartDate || !draftEndDate) return null;
    for (const p of presets) {
      const r = p.range();
      if (isSameDay(r.start, draftStartDate) && isSameDay(r.end, draftEndDate)) return p.id;
    }
    return null;
  }, [draftStartDate, draftEndDate, presets]);

  return (
    <section className="performance-date-range-module" aria-label="Date range for performance">
      <div className="date-range-picker" ref={containerRef}>
        <button
          type="button"
          className="date-range-trigger"
          aria-haspopup="dialog"
          aria-expanded={open}
          onClick={() => (open ? setOpen(false) : openPopover())}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <rect x="3.5" y="5" width="17" height="15" rx="2" stroke="currentColor" strokeWidth="1.5" />
            <path d="M3.5 9.5h17M8 3v4M16 3v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <span>{triggerLabel}</span>
        </button>
        {open ? (
          <div className="date-range-popover" role="dialog" aria-label="Select date range">
            <div className="date-range-presets">
              {presets.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className={
                    "date-range-preset" + (activePresetId === p.id ? " active" : "")
                  }
                  onClick={() => applyPreset(p)}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <div className="date-range-cal-wrap">
              <div className="date-range-cal-grid">
                <Calendar
                  month={viewMonth}
                  selectedStart={draftStartDate}
                  selectedEnd={draftEndDate}
                  hoverDate={hoverDate}
                  isPickingEnd={isPickingEnd}
                  onPickDate={pickDate}
                  onHoverDate={setHoverDate}
                  onPrev={() => setViewMonth(addMonths(viewMonth, -1))}
                />
                <Calendar
                  month={rightMonth}
                  selectedStart={draftStartDate}
                  selectedEnd={draftEndDate}
                  hoverDate={hoverDate}
                  isPickingEnd={isPickingEnd}
                  onPickDate={pickDate}
                  onHoverDate={setHoverDate}
                  onNext={() => setViewMonth(addMonths(viewMonth, 1))}
                />
              </div>
              <div className="date-range-footer">
                <div className="date-range-inputs">
                  <input
                    type="date"
                    value={draftStart}
                    onChange={(e) => {
                      setDraftStart(e.target.value);
                      const d = parseYMD(e.target.value);
                      if (d) setViewMonth(startOfMonth(d));
                    }}
                    aria-label="Start date"
                  />
                  <span className="date-range-dash" aria-hidden="true">
                    –
                  </span>
                  <input
                    type="date"
                    value={draftEnd}
                    onChange={(e) => setDraftEnd(e.target.value)}
                    aria-label="End date"
                  />
                </div>
                <div className="date-range-actions">
                  <button type="button" className="date-range-cancel" onClick={cancelAndClose}>
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="date-range-apply"
                    onClick={applyAndClose}
                    disabled={loading || !validateRange(draftStart, draftEnd).ok}
                    aria-busy={loading || undefined}
                  >
                    {loading ? "Loading…" : "Apply"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
