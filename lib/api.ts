export type ApiEnvelope<T = unknown> = {
  success?: boolean;
  data?: T;
  error?: string;
  message?: string;
  [key: string]: unknown;
};

export async function api<T = unknown>(path: string, init?: RequestInit): Promise<ApiEnvelope<T>> {
  const res = await fetch(path, init);
  let json: ApiEnvelope<T> = {};
  try {
    json = (await res.json()) as ApiEnvelope<T>;
  } catch {
    json = {};
  }
  if (!res.ok) {
    throw new Error(json.error || json.message || "Request failed");
  }
  return json;
}

export type StationRecord = {
  id?: string;
  title?: string;
  latitude?: number | string;
  longitude?: number | string;
  filled_slots?: number | string;
  open_slots?: number | string;
  online?: boolean;
  address?: string | null;
  location?: string | null;
  stripe_id?: string | null;
  weekday_hours?: unknown;
};

export type UserRecord = {
  id?: string | number;
  username?: string;
  type?: string;
  stations?: string[];
  created_at?: string;
  updated_at?: string;
};

export type ScanRecord = {
  scan_id?: string | number;
  sticker_id?: string;
  order_id?: string;
  scan_time?: string;
  sticker_type?: string;
  duration_after_rent?: { hours?: number; minutes?: number; seconds?: number };
  sizl?: boolean;
};

export type RentMtdRow = {
  date?: string;
  money?: string | number;
  pmoney?: string | number;
};

export type RentMtdPayload = {
  success?: boolean;
  data?: RentMtdRow[];
  range?: string;
  mtd?: string;
  ppositive?: number | string;
  pnegative?: number | string;
};

export type StationRevenueRow = {
  station_id?: string;
  station_title?: string;
  money?: number | string;
};

export type PosRent = {
  rent_id?: string;
  battery_id?: string | number | null;
  stripe_pi?: string | null;
  start_time?: string | null;
  station_start?: string | null;
  end_time?: string | null;
  station_end?: string | null;
};

export type TicketRecord = {
  id?: string | number;
  station_id?: string | number;
  location_name?: string;
  latitude?: number | string;
  longitude?: number | string;
  task?: string | string[] | null;
  description?: string | null;
};

export function fetchAllStations() {
  return api<StationRecord[]>("/api/stations");
}
export function fetchStation(id: string) {
  return api<StationRecord>(`/api/stations/${encodeURIComponent(id)}`);
}

export function stationsFromApiJson(json: unknown): StationRecord[] {
  if (!json || typeof json !== "object") return [];
  const obj = json as { data?: unknown; Data?: unknown };
  if (Array.isArray(obj.data)) return obj.data as StationRecord[];
  if (Array.isArray(obj.Data)) return obj.Data as StationRecord[];
  return [];
}

export function stationFromApiJson(json: unknown): StationRecord | null {
  if (!json || typeof json !== "object") return null;
  const obj = json as { data?: unknown; Data?: unknown };
  const d = obj.data ?? obj.Data;
  if (d && typeof d === "object" && !Array.isArray(d)) return d as StationRecord;
  return null;
}

export function stationHasAddress(s: StationRecord | null | undefined): boolean {
  if (!s || typeof s !== "object") return false;
  const addr = s.address != null ? String(s.address).trim() : "";
  if (addr) return true;
  const loc = s.location != null ? String(s.location).trim() : "";
  return Boolean(loc);
}

export function stationHasStripeId(s: StationRecord | null | undefined): boolean {
  if (!s || typeof s !== "object") return false;
  return s.stripe_id != null && String(s.stripe_id).trim() !== "";
}

export function stationMissingAddressOrStripe(s: StationRecord | null | undefined): boolean {
  return !stationHasAddress(s) || !stationHasStripeId(s);
}
export function fetchAllUsers() {
  return api<UserRecord[]>("/api/users");
}
export function fetchScans() {
  return api<ScanRecord[]>("/api/scans");
}
export function fetchPosRents() {
  return api<PosRent[]>("/api/pos/rents");
}

export function formatDateRange(start: Date, end: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  const s = `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`;
  const e = `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}`;
  return `${s}_${e}`;
}

export function fetchRentsMtd(stationIdOrIds: string | string[] | null, start: Date, end: Date) {
  const range = formatDateRange(start, end);
  const basePath = `/api/rents/${range}`;
  if (stationIdOrIds == null) return api<RentMtdPayload["data"]>(basePath);
  let segment: string;
  if (Array.isArray(stationIdOrIds)) {
    if (stationIdOrIds.length === 0) return api<RentMtdPayload["data"]>(basePath);
    segment = stationIdOrIds.map(encodeURIComponent).join(".");
  } else {
    segment = encodeURIComponent(stationIdOrIds);
  }
  return api<RentMtdPayload["data"]>(`/api/rents/${segment}/${range}`);
}

export function fetchRentsMtdAll(start: Date, end: Date) {
  const range = formatDateRange(start, end);
  return api<StationRevenueRow[]>(`/api/rents/${range}/all`);
}

export async function createUser(payload: Record<string, unknown>) {
  return api("/api/users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function updateUser(id: string, payload: Record<string, unknown>) {
  return api(`/api/users/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function deleteUser(id: string) {
  return api(`/api/users/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export async function createStation(payload: Record<string, unknown>) {
  return api("/api/stations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function updateStation(id: string, payload: Record<string, unknown>) {
  return api(`/api/stations/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function deleteStation(id: string) {
  return api(`/api/stations/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export async function popAll(stationId: string) {
  return api(`/api/pop/${encodeURIComponent(stationId)}/all`, { method: "POST" });
}

export async function fetchTickets(): Promise<TicketRecord[]> {
  const res = await fetch("/api/tickets");
  if (res.status === 404) return [];
  let data: ApiEnvelope<TicketRecord[]> = {};
  try {
    data = (await res.json()) as ApiEnvelope<TicketRecord[]>;
  } catch {
    data = {};
  }
  if (!res.ok) {
    throw new Error(data.error || data.message || "Failed to load tickets");
  }
  if (!data || data.success !== true || !Array.isArray(data.data)) {
    return [];
  }
  return data.data;
}

export async function createTicket(payload: Record<string, unknown>) {
  return api("/api/tickets", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function updateTicket(id: number, payload: Record<string, unknown>) {
  return api(`/api/tickets/${encodeURIComponent(String(id))}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function deleteTicket(id: number) {
  return api(`/api/tickets/${encodeURIComponent(String(id))}`, { method: "DELETE" });
}
