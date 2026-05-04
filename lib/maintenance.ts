import type { StationRecord, TicketRecord } from "./api";

export const TASK_TYPES = [
  "High Batteries",
  "Low Batteries",
  "No Batteries",
  "Add Stack",
  "Broken Battery",
  "High Failure Rates",
  "Hardware Malfunction",
  "Unusually Offline",
  "Other",
] as const;

export type TaskType = (typeof TASK_TYPES)[number] | string;

const RED_TASKS = new Set<string>([
  "Low Batteries",
  "No Batteries",
  "Broken Battery",
  "Unusually Offline",
]);

export type TicketColor = "red" | "yellow" | "green";
export type HealthLevel = "red" | "yellow" | "green";

export type Ticket = {
  id: string;
  dbId?: number;
  stationId: string;
  stationName: string;
  latitude: number;
  longitude: number;
  tasks?: string[];
  description?: string;
  serviceType: string;
  color: "red" | "yellow";
  source: "database" | "station-status";
  sortOrder: number;
  filledSlots?: number | null;
  totalSlots?: number | null;
};

export function isTestStationTitle(title: unknown): boolean {
  return String(title || "").trim().toLowerCase() === "test station";
}

export function filterStations(stations: StationRecord[] | null | undefined): StationRecord[] {
  return (stations || []).filter((s) => !isTestStationTitle(s && s.title));
}

export function parseFilledSlotsStrict(filled: unknown): number | null {
  if (filled == null || filled === "N/A") return null;
  const s = String(filled).trim();
  if (!/^-?\d+$/.test(s)) return null;
  return parseInt(s, 10);
}

export function parseOpenSlotsNum(open: unknown): number | null {
  if (open == null) return null;
  const s = String(open).trim();
  if (!/^-?\d+$/.test(s)) return null;
  return parseInt(s, 10);
}

export function computeTotalSlots(station: StationRecord): number {
  const f = parseFilledSlotsStrict(station.filled_slots);
  const o = parseOpenSlotsNum(station.open_slots);
  if (f == null || o == null) return 6;
  return f + o;
}

export function computeHealthLevel(station: StationRecord): HealthLevel | null {
  const filledSlotsNum = parseFilledSlotsStrict(station.filled_slots);
  if (filledSlotsNum == null) return null;
  const totalSlots = computeTotalSlots(station);
  if (totalSlots <= 0) return null;
  if (filledSlotsNum <= 0) return "red";
  if (filledSlotsNum >= totalSlots) return "red";
  if (filledSlotsNum / totalSlots <= 1 / 3) return "yellow";
  return "green";
}

export function healthSortPriority(level: HealthLevel | null): number {
  if (level === "red") return 1;
  if (level === "yellow") return 2;
  if (level === "green") return 3;
  return 4;
}

function parsePostgresArrayText(inner: string): string[] {
  const s = String(inner).trim();
  if (!s.length) return [];
  const out: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inQ) {
      if (c === "\\" && i + 1 < s.length) {
        cur += s[++i];
        continue;
      }
      if (c === '"') {
        inQ = false;
        continue;
      }
      cur += c;
    } else {
      if (c === '"') {
        inQ = true;
        continue;
      }
      if (c === ",") {
        if (cur.trim()) out.push(cur.trim());
        cur = "";
        continue;
      }
      cur += c;
    }
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

function splitCommaLabels(s: string): string[] {
  return String(s)
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

function normalizeLabelList(rawList: unknown[]): string[] {
  const flat: string[] = [];
  (rawList || []).forEach((item) => {
    if (item == null) return;
    const str = String(item).trim();
    if (!str) return;
    splitCommaLabels(str).forEach((p) => {
      if (p) flat.push(p);
    });
  });
  const seen: Record<string, boolean> = {};
  const out: string[] = [];
  flat.forEach((lab) => {
    if (!seen[lab]) {
      seen[lab] = true;
      out.push(lab);
    }
  });
  return out;
}

function stripTaskDisplayNoise(s: unknown): string {
  if (s == null) return "";
  return String(s)
    .replace(/[{}"]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeTaskField(task: unknown): string[] {
  let result: string[];
  if (Array.isArray(task)) {
    result = normalizeLabelList(task);
  } else if (task == null) {
    result = [];
  } else {
    const t = String(task).trim();
    if (!t) {
      result = [];
    } else if (t.charAt(0) === "[") {
      try {
        const parsed = JSON.parse(t);
        if (Array.isArray(parsed)) {
          result = normalizeLabelList(parsed);
        } else {
          result = normalizeLabelList([t]);
        }
      } catch {
        result = normalizeLabelList([t]);
      }
    } else if (t.charAt(0) === "{" && t.charAt(t.length - 1) === "}") {
      result = normalizeLabelList(parsePostgresArrayText(t.slice(1, -1)));
    } else {
      result = normalizeLabelList([t]);
    }
  }
  const seen: Record<string, boolean> = {};
  const out: string[] = [];
  (result || []).forEach((lab) => {
    const x = stripTaskDisplayNoise(lab);
    if (!x) return;
    if (seen[x]) return;
    seen[x] = true;
    out.push(x);
  });
  return out;
}

function dbTicketColor(tasks: string[]): "red" | "yellow" {
  if (!tasks || !tasks.length) return "yellow";
  for (let i = 0; i < tasks.length; i++) {
    if (RED_TASKS.has(tasks[i])) return "red";
  }
  return "yellow";
}

export function buildDbTicket(row: TicketRecord, i: number): Ticket {
  const tasks = normalizeTaskField(row.task);
  const color = dbTicketColor(tasks);
  return {
    id: "ticket-db-" + row.id,
    dbId: Number(row.id),
    stationId: String(row.station_id != null ? row.station_id : ""),
    stationName: row.location_name || "Unknown",
    latitude: parseFloat(String(row.latitude)),
    longitude: parseFloat(String(row.longitude)),
    tasks,
    description: row.description != null ? String(row.description) : "",
    serviceType: tasks.join(" · ") || "Other",
    color,
    source: "database",
    sortOrder: i,
  };
}

export function buildAutoTickets(stations: StationRecord[]): Ticket[] {
  const candidates = stations
    .map((station) => {
      const level = computeHealthLevel(station);
      if (level !== "red" && level !== "yellow") return null;
      const filledSlotsNum = parseFilledSlotsStrict(station.filled_slots);
      const totalSlots = computeTotalSlots(station);
      return {
        station,
        level,
        filledSlotsNum,
        totalSlots,
        priority: healthSortPriority(level),
      };
    })
    .filter((c): c is NonNullable<typeof c> => c != null);

  candidates.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    const ta = String((a.station && a.station.title) || a.station.id || "");
    const tb = String((b.station && b.station.title) || b.station.id || "");
    return ta.localeCompare(tb, undefined, { sensitivity: "base" });
  });

  return candidates.map((c, i) => {
    const station = c.station;
    const lat = parseFloat(String(station.latitude));
    const lon = parseFloat(String(station.longitude));
    return {
      id: "ticket-" + station.id,
      stationId: String(station.id),
      stationName: station.title || "Unknown",
      latitude: lat,
      longitude: lon,
      serviceType: "Battery Redistribution",
      color: c.level as "red" | "yellow",
      source: "station-status",
      sortOrder: i,
      filledSlots: c.filledSlotsNum,
      totalSlots: c.totalSlots,
    };
  });
}

export function mergeTickets(
  dbTicketObjs: Ticket[],
  autoTicketObjs: Ticket[],
  stationMap: Map<string, StationRecord>,
): Ticket[] {
  const dbStationIds = new Set<string>();
  dbTicketObjs.forEach((t) => {
    if (t.stationId) dbStationIds.add(t.stationId);
  });
  const merged: Ticket[] = dbTicketObjs.slice();
  autoTicketObjs.forEach((a) => {
    if (!dbStationIds.has(a.stationId)) merged.push(a);
  });
  merged.forEach((t) => {
    if (t.filledSlots != null && t.totalSlots != null) return;
    const st = stationMap.get(t.stationId);
    if (!st) return;
    const f = parseFilledSlotsStrict(st.filled_slots);
    const tot = computeTotalSlots(st);
    if (f != null) t.filledSlots = f;
    if (tot != null) t.totalSlots = tot;
  });
  merged.forEach((t, idx) => {
    t.sortOrder = idx;
  });
  return merged;
}

export function buildStationsMap(stations: StationRecord[]): Map<string, StationRecord> {
  const map = new Map<string, StationRecord>();
  stations.forEach((s) => {
    const id = String(s.id != null ? s.id : "");
    if (id) map.set(id, s);
  });
  return map;
}
