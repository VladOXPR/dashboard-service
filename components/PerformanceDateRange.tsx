"use client";

import { useEffect, useRef } from "react";
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
  onApply: () => void;
};

export default function PerformanceDateRange({ start, end, onChange, onApply }: Props) {
  const startRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!start || !end) {
      const r = defaultRange();
      onChange({ start: toLocalYMD(r.start), end: toLocalYMD(r.end) });
    }
  }, [start, end, onChange]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      onApply();
    }
  }

  return (
    <section className="performance-date-range-module" aria-label="Date range for performance">
      <h3 className="performance-module-heading">Date range</h3>
      <div className="date-range" role="group" aria-label="Performance date range">
        <span className="summary-label">From</span>
        <input
          ref={startRef}
          type="date"
          value={start}
          onChange={(e) => onChange({ start: e.target.value, end })}
          onKeyDown={handleKeyDown}
          aria-label="Start date"
        />
        <span className="date-range-arrow" aria-hidden="true">
          →
        </span>
        <span className="summary-label">To</span>
        <input
          ref={endRef}
          type="date"
          value={end}
          onChange={(e) => onChange({ start, end: e.target.value })}
          onKeyDown={handleKeyDown}
          aria-label="End date"
        />
        <button type="button" onClick={onApply}>
          Apply
        </button>
      </div>
    </section>
  );
}
