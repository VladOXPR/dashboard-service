"use client";

import { useEffect, useState } from "react";
import {
  deleteStation,
  fetchAllStations,
  popAll,
  type StationRecord,
} from "@/lib/api";
import SkeletonTable from "@/components/skeletons/SkeletonTable";
import StationFormDrawer from "@/components/drawers/StationFormDrawer";
import ConfirmModal from "@/components/modals/ConfirmModal";

export default function StationsView() {
  const [stations, setStations] = useState<StationRecord[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerInitial, setDrawerInitial] = useState<StationRecord | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<StationRecord | null>(null);
  const [dispenseTarget, setDispenseTarget] = useState<StationRecord | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const json = await fetchAllStations();
      const data = json.data;
      const list: StationRecord[] = Array.isArray(data)
        ? (data as StationRecord[])
        : Array.isArray((json as unknown as { Data?: StationRecord[] }).Data)
        ? ((json as unknown as { Data?: StationRecord[] }).Data as StationRecord[])
        : [];
      setStations(list);
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

  return (
    <main className="view-station-mgmt">
      <div className="stations-menubar">
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
                  <th />
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
                      <td>{s.title ?? ""}</td>
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
