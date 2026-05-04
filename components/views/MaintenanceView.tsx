"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  createTicket,
  deleteTicket,
  fetchAllStations,
  fetchTickets,
  updateTicket,
  type StationRecord,
} from "@/lib/api";
import {
  TASK_TYPES,
  buildAutoTickets,
  buildDbTicket,
  buildStationsMap,
  filterStations,
  mergeTickets,
  type Ticket,
} from "@/lib/maintenance";

type StationOption = { id: string; title: string };

type CreateForm = {
  stationId: string;
  selectedTasks: string[];
  description: string;
};

type EditForm = {
  dbId: number | null;
  locationName: string;
  selectedTasks: string[];
  description: string;
  latitude: string;
  longitude: string;
};

const EMPTY_CREATE_FORM: CreateForm = {
  stationId: "",
  selectedTasks: [],
  description: "",
};

const EMPTY_EDIT_FORM: EditForm = {
  dbId: null,
  locationName: "",
  selectedTasks: [],
  description: "",
  latitude: "",
  longitude: "",
};

export default function MaintenanceView() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [stations, setStations] = useState<StationRecord[]>([]);
  const [stationsMap, setStationsMap] = useState<Map<string, StationRecord>>(new Map());
  const [loading, setLoading] = useState(true);
  const [statusMsg, setStatusMsg] = useState<string>("");
  const [statusIsError, setStatusIsError] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateForm>(EMPTY_CREATE_FORM);
  const [createError, setCreateError] = useState<string>("");

  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<EditForm>(EMPTY_EDIT_FORM);
  const [editError, setEditError] = useState<string>("");
  const [extraEditTasks, setExtraEditTasks] = useState<string[]>([]);

  const cancelledRef = useRef(false);

  const setStatus = useCallback((msg: string, isError = false) => {
    setStatusMsg(msg || "");
    setStatusIsError(Boolean(isError));
  }, []);

  const refresh = useCallback(async () => {
    setStatus("");
    try {
      const stationsResp = await fetchAllStations();
      if (!stationsResp || stationsResp.success !== true || !Array.isArray(stationsResp.data)) {
        throw new Error(stationsResp?.error || "Failed to load stations");
      }
      const filtered = filterStations(stationsResp.data);
      const map = buildStationsMap(filtered);
      if (cancelledRef.current) return;
      setStations(filtered);
      setStationsMap(map);

      let dbRows = [] as Awaited<ReturnType<typeof fetchTickets>>;
      try {
        dbRows = await fetchTickets();
      } catch (e) {
        console.warn(e);
        dbRows = [];
      }
      const dbTickets = dbRows.map((row, i) => buildDbTicket(row, i));
      const autoTickets = buildAutoTickets(filtered);
      const merged = mergeTickets(dbTickets, autoTickets, map);
      if (cancelledRef.current) return;
      setTickets(merged);
    } catch (e) {
      console.error(e);
      const msg = e instanceof Error ? e.message : "Failed to load maintenance data.";
      if (!cancelledRef.current) setStatus(msg, true);
    }
  }, [setStatus]);

  useEffect(() => {
    cancelledRef.current = false;
    (async () => {
      setLoading(true);
      try {
        await refresh();
      } finally {
        if (!cancelledRef.current) setLoading(false);
      }
    })();
    return () => {
      cancelledRef.current = true;
    };
  }, [refresh]);

  const stationOptions = useMemo<StationOption[]>(() => {
    return stations
      .map((s) => ({ id: String(s.id ?? ""), title: s.title || String(s.id ?? "") }))
      .filter((o) => o.id);
  }, [stations]);

  function createStationHint(): string {
    if (!createForm.stationId) return "Select a station to create a ticket.";
    const st = stationsMap.get(createForm.stationId);
    const title = st && st.title ? st.title : createForm.stationId;
    return `Using station ID ${createForm.stationId} — ${title}`;
  }

  function openCreate() {
    setCreateForm(EMPTY_CREATE_FORM);
    setCreateError("");
    setCreateOpen(true);
  }
  function closeCreate() {
    setCreateOpen(false);
    setCreateError("");
  }

  async function submitCreate() {
    setCreateError("");
    const stationId = createForm.stationId.trim();
    const selectedTasks = createForm.selectedTasks.slice();
    const description = createForm.description.trim();
    const station = stationsMap.get(stationId);

    if (!stationId) {
      setCreateError("Select a station.");
      return;
    }
    if (!selectedTasks.length) {
      setCreateError("Select at least one task.");
      return;
    }
    for (const t of selectedTasks) {
      if ((TASK_TYPES as readonly string[]).indexOf(t) === -1) {
        setCreateError("Invalid task: " + t);
        return;
      }
    }
    if (!station) {
      setCreateError("Pick a station from the list (station ID must match the API).");
      return;
    }
    const lat = parseFloat(String(station.latitude));
    const lon = parseFloat(String(station.longitude));
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      setCreateError("Station coordinates are invalid.");
      return;
    }
    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      setCreateError("Station latitude or longitude is out of range.");
      return;
    }

    const body: Record<string, unknown> = {
      location_name: (station.title && String(station.title).trim()) || String(station.id),
      station_id: String(station.id).trim(),
      latitude: lat,
      longitude: lon,
      task: selectedTasks,
    };
    if (description) body.description = description;

    try {
      await createTicket(body);
    } catch (e) {
      const baseMsg = e instanceof Error ? e.message : "Create failed";
      const msg =
        baseMsg && /404/.test(baseMsg)
          ? baseMsg + " The tickets proxy route or upstream base URL may be misconfigured."
          : baseMsg;
      setCreateError(msg);
      return;
    }
    closeCreate();
    await refresh();
  }

  async function openEditFromTicket(t: Ticket) {
    if (t.source !== "database" || !Number.isFinite(t.dbId)) return;
    const tasks = t.tasks || [];
    const known = new Set<string>(TASK_TYPES);
    const extras = tasks.filter((tt) => !known.has(tt));
    setExtraEditTasks(extras);
    setEditForm({
      dbId: t.dbId ?? null,
      locationName: t.stationName || "",
      selectedTasks: tasks.slice(),
      description: t.description || "",
      latitude: Number.isFinite(t.latitude) ? String(t.latitude) : "",
      longitude: Number.isFinite(t.longitude) ? String(t.longitude) : "",
    });
    setEditError("");
    setEditOpen(true);
  }

  function closeEdit() {
    setEditOpen(false);
    setEditError("");
  }

  async function submitEdit() {
    setEditError("");
    const dbId = editForm.dbId;
    if (dbId == null || !Number.isFinite(dbId)) {
      setEditError("Invalid ticket.");
      return;
    }
    const locationName = editForm.locationName.trim();
    if (!locationName) {
      setEditError("Location name is required.");
      return;
    }
    const selectedTasks = editForm.selectedTasks.slice();
    if (!selectedTasks.length) {
      setEditError("Select at least one task.");
      return;
    }
    const description = editForm.description;
    const latStr = editForm.latitude.trim();
    const lonStr = editForm.longitude.trim();
    const body: Record<string, unknown> = {
      location_name: locationName,
      task: selectedTasks,
      description,
    };

    if (!latStr && !lonStr) {
      // omit coords
    } else if (latStr && lonStr) {
      const lat = parseFloat(latStr);
      const lon = parseFloat(lonStr);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
        setEditError("Latitude and longitude must be valid numbers.");
        return;
      }
      if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
        setEditError("Coordinates are out of range.");
        return;
      }
      body.latitude = lat;
      body.longitude = lon;
    } else {
      setEditError(
        "Enter both latitude and longitude, or clear both to keep existing coordinates.",
      );
      return;
    }

    try {
      await updateTicket(dbId, body);
    } catch (e) {
      const baseMsg = e instanceof Error ? e.message : "Update failed";
      const msg =
        baseMsg && /404/.test(baseMsg)
          ? baseMsg +
            " Restart the server proxy to pick up PATCH /api/tickets, or check CUUB_TICKETS_API_URL if applicable."
          : baseMsg;
      setEditError(msg);
      return;
    }
    closeEdit();
    await refresh();
  }

  async function markDone(t: Ticket) {
    if (t.source !== "database" || !Number.isFinite(t.dbId)) return;
    setStatus("");
    try {
      await deleteTicket(t.dbId as number);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Delete failed";
      setStatus(msg, true);
      return;
    }
    await refresh();
  }

  const editTaskOptions = useMemo<string[]>(() => {
    const merged: string[] = [...TASK_TYPES, ...extraEditTasks];
    const seen = new Set<string>();
    const out: string[] = [];
    merged.forEach((m) => {
      if (!seen.has(m)) {
        seen.add(m);
        out.push(m);
      }
    });
    return out;
  }, [extraEditTasks]);

  function handleMultiSelectChange(
    e: React.ChangeEvent<HTMLSelectElement>,
  ): string[] {
    return Array.from(e.target.selectedOptions).map((o) => o.value);
  }

  return (
    <main className="maintenance-main" id="maintenanceMain">
      <div className="stations-menubar" aria-label="Maintenance actions">
        <button
          type="button"
          className="stations-menubar-item"
          id="btn-create-ticket"
          onClick={openCreate}
        >
          Create Ticket
        </button>
        <a
          href="https://api.cuub.tech/token"
          className="stations-menubar-item a-link"
          id="btn-fetch-api"
          target="_blank"
          rel="noopener noreferrer"
        >
          Fetch API
        </a>
      </div>

      <div
        id="maintenance-status"
        className={(statusMsg ? "visible " : "") + (statusIsError ? "error" : "")}
        role="status"
        aria-live="polite"
      >
        {statusMsg}
      </div>

      {loading ? (
        <ul id="ticket-list">
          <li className="ticket-empty">Loading…</li>
        </ul>
      ) : (
        <ul id="ticket-list">
          {tickets.length === 0 ? (
            <li className="ticket-empty">No open tickets.</li>
          ) : (
            tickets.map((t) => {
              const batteryPart =
                t.filledSlots != null && t.totalSlots != null
                  ? `${t.filledSlots} / ${t.totalSlots}`
                  : "— / —";
              const taskText =
                t.source === "station-status"
                  ? "Battery Redistribution"
                  : t.tasks && t.tasks.length
                  ? t.tasks.join(" · ")
                  : t.serviceType || "Other";
              const isDb = t.source === "database" && Number.isFinite(t.dbId);
              return (
                <li key={t.id} className={"ticket-row ticket-color-" + t.color}>
                  <div className="ticket-stripe" aria-hidden="true" />
                  <div className="ticket-main">
                    <div className="ticket-text">
                      <div className="ticket-line1">{t.stationName}</div>
                      <div className="ticket-line2">
                        <span className="ticket-battery">{batteryPart}</span>
                        <span className="ticket-line2-sep" aria-hidden="true">
                          {" "}
                          ·{" "}
                        </span>
                        <span className="ticket-task">{taskText}</span>
                      </div>
                    </div>
                    {isDb ? (
                      <div className="ticket-actions">
                        <button
                          type="button"
                          className="btn-ticket-edit"
                          onClick={() => openEditFromTicket(t)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="btn-ticket-done"
                          onClick={() => markDone(t)}
                        >
                          Done
                        </button>
                      </div>
                    ) : null}
                  </div>
                </li>
              );
            })
          )}
        </ul>
      )}

      {createOpen ? (
        <div
          className="modal-overlay active"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeCreate();
          }}
        >
          <div className="modal-box" role="dialog" aria-labelledby="modal-create-title">
            <h3 id="modal-create-title">Create ticket</h3>
            <div className="field">
              <label htmlFor="create-station">Station</label>
              <select
                id="create-station"
                value={createForm.stationId}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, stationId: e.target.value }))
                }
              >
                <option value="">— Select station —</option>
                {stationOptions.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.title}
                  </option>
                ))}
              </select>
              <p id="create-station-id-hint" className="hint">
                {createStationHint()}
              </p>
            </div>
            <div className="field">
              <label htmlFor="create-task">Tasks (select one or more)</label>
              <select
                id="create-task"
                multiple
                value={createForm.selectedTasks}
                onChange={(e) =>
                  setCreateForm((f) => ({
                    ...f,
                    selectedTasks: handleMultiSelectChange(e),
                  }))
                }
              >
                {TASK_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="create-description">Description (optional)</label>
              <textarea
                id="create-description"
                rows={3}
                value={createForm.description}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, description: e.target.value }))
                }
              />
            </div>
            <div
              id="modal-create-error"
              className={"modal-error" + (createError ? " visible" : "")}
            >
              {createError}
            </div>
            <div className="modal-actions">
              <button
                type="button"
                className="btn-cancel"
                id="modal-create-cancel"
                onClick={closeCreate}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-submit"
                id="modal-create-submit"
                onClick={submitCreate}
              >
                Create
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {editOpen ? (
        <div
          className="modal-overlay active"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeEdit();
          }}
        >
          <div className="modal-box" role="dialog" aria-labelledby="modal-edit-title">
            <h3 id="modal-edit-title">Edit ticket</h3>
            <div className="field">
              <label htmlFor="edit-location-name">Location name</label>
              <input
                type="text"
                id="edit-location-name"
                autoComplete="off"
                value={editForm.locationName}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, locationName: e.target.value }))
                }
              />
            </div>
            <div className="field">
              <label htmlFor="edit-task">Tasks</label>
              <select
                id="edit-task"
                multiple
                value={editForm.selectedTasks}
                onChange={(e) =>
                  setEditForm((f) => ({
                    ...f,
                    selectedTasks: handleMultiSelectChange(e),
                  }))
                }
              >
                {editTaskOptions.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="edit-description">Description</label>
              <textarea
                id="edit-description"
                rows={3}
                value={editForm.description}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, description: e.target.value }))
                }
              />
            </div>
            <div className="field">
              <label htmlFor="edit-latitude">
                Latitude (optional — leave blank with longitude to keep existing)
              </label>
              <input
                type="text"
                id="edit-latitude"
                inputMode="decimal"
                autoComplete="off"
                value={editForm.latitude}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, latitude: e.target.value }))
                }
              />
            </div>
            <div className="field">
              <label htmlFor="edit-longitude">Longitude</label>
              <input
                type="text"
                id="edit-longitude"
                inputMode="decimal"
                autoComplete="off"
                value={editForm.longitude}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, longitude: e.target.value }))
                }
              />
            </div>
            <div
              id="modal-edit-error"
              className={"modal-error" + (editError ? " visible" : "")}
            >
              {editError}
            </div>
            <div className="modal-actions">
              <button
                type="button"
                className="btn-cancel"
                id="modal-edit-cancel"
                onClick={closeEdit}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-submit"
                id="modal-edit-submit"
                onClick={submitEdit}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
