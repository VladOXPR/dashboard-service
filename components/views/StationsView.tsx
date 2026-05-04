"use client";

import { useEffect, useState } from "react";
import {
  deleteStation,
  fetchAllStations,
  popAll,
  stationsFromApiJson,
  stationMissingAddressOrStripe,
  type StationRecord,
} from "@/lib/api";
import SkeletonTable from "@/components/skeletons/SkeletonTable";
import StationFormDrawer from "@/components/drawers/StationFormDrawer";
import ConfirmModal from "@/components/modals/ConfirmModal";

function normalizeWeekdayHours(row: StationRecord): StationRecord {
  if (!row || typeof row !== "object") return row;
  const out: StationRecord = { ...row };
  const wh = out.weekday_hours;
  if (wh == null || wh === "") {
    out.weekday_hours = null;
  } else if (typeof wh === "string") {
    try {
      out.weekday_hours = JSON.parse(wh);
    } catch {
      out.weekday_hours = null;
    }
  }
  return out;
}

function stationFieldValueForExport(v: unknown): string | number | boolean {
  if (v === null || v === undefined) return "";
  if (typeof v === "object") return JSON.stringify(v);
  if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") return v;
  return String(v);
}

function stationsRowsForXlsx(list: StationRecord[]): Record<string, string | number | boolean>[] {
  const rows = (list || []).map((row) => (row && typeof row === "object" ? normalizeWeekdayHours(row) : row));
  const keySet: Record<string, true> = {};
  rows.forEach((row) => {
    if (row && typeof row === "object") {
      Object.keys(row).forEach((k) => {
        keySet[k] = true;
      });
    }
  });
  const keys = Object.keys(keySet).sort();
  return rows.map((row) => {
    const o: Record<string, string | number | boolean> = {};
    keys.forEach((k) => {
      if (!row || typeof row !== "object") {
        o[k] = "";
        return;
      }
      o[k] = stationFieldValueForExport((row as Record<string, unknown>)[k]);
    });
    return o;
  });
}

export default function StationsView() {
  const [stations, setStations] = useState<StationRecord[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerInitial, setDrawerInitial] = useState<StationRecord | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<StationRecord | null>(null);
  const [dispenseTarget, setDispenseTarget] = useState<StationRecord | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const json = await fetchAllStations();
      setStations(stationsFromApiJson(json));
    } catch (e) {
      console.error(e);
      setError("Failed to load stations. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function openAdd() {
    setDrawerInitial(null);
    setDrawerOpen(true);
  }

  function openEdit(s: StationRecord) {
    setDrawerInitial(s);
    setDrawerOpen(true);
  }

  async function handleDispense() {
    if (!dispenseTarget?.id) return;
    try {
      await popAll(String(dispenseTarget.id));
      setDispenseTarget(null);
      await load();
    } catch (err) {
      console.error(err);
      setError(
        (err as Error).message
          ? (err as Error).message
          : "Failed to dispense powerbanks. Please try again.",
      );
      setDispenseTarget(null);
    }
  }

  async function handleDelete() {
    if (!deleteTarget?.id) return;
    try {
      await deleteStation(String(deleteTarget.id));
      setDeleteTarget(null);
      await load();
    } catch (err) {
      alert((err as Error).message || "Delete failed.");
    }
  }

  async function handleExport() {
    setError(null);
    setExporting(true);
    try {
      const xlsx = await import("xlsx");
      const json = await fetchAllStations();
      const list = stationsFromApiJson(json);
      const rows = stationsRowsForXlsx(list);
      const wb = xlsx.utils.book_new();
      const ws = xlsx.utils.json_to_sheet(rows.length ? rows : [{}]);
      xlsx.utils.book_append_sheet(wb, ws, "Stations");
      const now = new Date();
      const y = now.getFullYear();
      const mo = String(now.getMonth() + 1).padStart(2, "0");
      const da = String(now.getDate()).padStart(2, "0");
      xlsx.writeFile(wb, `cuub-stations-${y}-${mo}-${da}.xlsx`);
    } catch (e) {
      console.error(e);
      setError(
        (e as Error)?.message
          ? (e as Error).message
          : "Export failed. Please try again.",
      );
    } finally {
      setExporting(false);
    }
  }

  const stationCount = stations ? stations.length : 0;

  return (
    <main className="view-station-mgmt">
      <div className="stations-menubar">
        <button
          type="button"
          className="stations-menubar-item"
          onClick={handleExport}
          disabled={exporting}
          aria-busy={exporting || undefined}
        >
          {exporting ? "Exporting…" : "Export"}
        </button>
        <button type="button" className="stations-menubar-item" onClick={openAdd}>
          Add station
        </button>
        <a
          href="https://map.cuub.tech"
          className="stations-menubar-item a-link"
          target="_blank"
          rel="noopener noreferrer"
        >
          Map
        </a>
      </div>
      {warning ? (
        <div
          className="error"
          id="mgmtError"
          style={{ background: "rgba(239,68,68,0.15)", color: "#fca5a5" }}
        >
          {warning}
        </div>
      ) : null}
      {loading ? <SkeletonTable rows={5} /> : null}
      {error ? <div className="error">{error}</div> : null}
      {!loading && stations ? (
        <div id="stationMgmtList">
          {stations.length === 0 ? (
            <p style={{ color: "#a3a3a3" }}>No stations found.</p>
          ) : (
            <table className="station-mgmt-table">
              <thead>
                <tr>
                  <th
                    className="station-mgmt-total-header"
                    title={`Total stations: ${stationCount}`}
                  >
                    {stationCount}
                  </th>
                  <th>Title</th>
                  <th />
                  <th>ID</th>
                  <th>Filled</th>
                  <th>Open</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {stations.map((s) => {
                  const isOnline = s.online === true;
                  const missing = stationMissingAddressOrStripe(s);
                  return (
                    <tr key={String(s.id)}>
                      <td className="station-status-cell">
                        <span
                          className={
                            "station-status-dot " + (isOnline ? "online" : "offline")
                          }
                          aria-label={isOnline ? "Online" : "Offline"}
                        />
                      </td>
                      <td>
                        {missing ? (
                          <span
                            className="station-mgmt-missing-mark"
                            aria-label="Missing address or Stripe ID"
                            title="Missing address or Stripe ID"
                          >
                            !
                          </span>
                        ) : null}
                        {s.title ?? ""}
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn-dispense-all"
                          aria-label="Dispense all powerbanks for station"
                          onClick={() => setDispenseTarget(s)}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src="/assets/dispense-all.png" alt="" />
                        </button>
                      </td>
                      <td>{String(s.id ?? "")}</td>
                      <td>{s.filled_slots != null ? s.filled_slots : "—"}</td>
                      <td>{s.open_slots != null ? s.open_slots : "—"}</td>
                      <td>
                        <div className="table-actions">
                          <button
                            type="button"
                            className="btn-edit"
                            onClick={() => openEdit(s)}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="btn-delete"
                            onClick={() => setDeleteTarget(s)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      ) : null}

      <StationFormDrawer
        open={drawerOpen}
        initial={drawerInitial}
        onClose={() => setDrawerOpen(false)}
        onSaved={() => load()}
        onWarning={(msg) => setWarning(msg)}
      />

      <ConfirmModal
        open={Boolean(deleteTarget)}
        title="Delete station"
        message={
          deleteTarget
            ? `Are you sure you want to delete "${deleteTarget.title || deleteTarget.id}"?`
            : ""
        }
        confirmLabel="Delete"
        destructive
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />

      <ConfirmModal
        open={Boolean(dispenseTarget)}
        title="Dispense Powerbanks"
        message={
          dispenseTarget
            ? `Are you sure you want to dispense all batteries at "${
                dispenseTarget.title || dispenseTarget.id
              }"?`
            : ""
        }
        confirmLabel="Dispense"
        onCancel={() => setDispenseTarget(null)}
        onConfirm={handleDispense}
      />
    </main>
  );
}
