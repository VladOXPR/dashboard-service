"use client";

import { useEffect, useState } from "react";
import { createUser, fetchAllStations, updateUser, type StationRecord, type UserRecord } from "@/lib/api";

type Props = {
  open: boolean;
  initial: UserRecord | null;
  onClose: () => void;
  onSaved: () => void;
};

export default function UserFormDrawer({ open, initial, onClose, onSaved }: Props) {
  const isEdit = Boolean(initial?.id);
  const [username, setUsername] = useState("");
  const [type, setType] = useState("HOST");
  const [stationId, setStationId] = useState("");
  const [stationIds, setStationIds] = useState<string[]>([]);
  const [allStations, setAllStations] = useState<StationRecord[]>([]);
  const [addSelectValue, setAddSelectValue] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setUsername(initial?.username ?? "");
      setType(initial?.type ?? "HOST");
      setStationId("");
      setStationIds(Array.isArray(initial?.stations) ? [...(initial!.stations as string[])] : []);
      setAddSelectValue("");
      if (isEdit) {
        (async () => {
          try {
            const json = await fetchAllStations();
            const list = Array.isArray(json.data) ? (json.data as StationRecord[]) : [];
            setAllStations(list);
          } catch {
            setAllStations([]);
          }
        })();
      }
    }
  }, [open, initial, isEdit]);

  function removeStation(sid: string) {
    setStationIds((prev) => prev.filter((id) => id !== sid));
  }

  function addStation() {
    if (addSelectValue && !stationIds.includes(addSelectValue)) {
      setStationIds((prev) => [...prev, addSelectValue]);
      setAddSelectValue("");
    }
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const trimmed = username.trim();
      if (isEdit && initial?.id) {
        await updateUser(String(initial.id), { username: trimmed, type, station_ids: stationIds });
      } else {
        await createUser({ username: trimmed, type, station_id: stationId.trim() });
      }
      onSaved();
      onClose();
    } catch (err) {
      alert((err as Error).message || "Request failed.");
    } finally {
      setSubmitting(false);
    }
  }

  const availableStations = allStations.filter(
    (s) => s.id && !stationIds.includes(String(s.id)),
  );

  return (
    <div
      className={"drawer-overlay" + (open ? " active" : "")}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="drawer-content">
        <button type="button" className="drawer-close" aria-label="Close" onClick={onClose} />
        <div className="drawer-header">
          <div className="drawer-title">{isEdit ? "Edit user" : "Add user"}</div>
          <div className="drawer-description">
            {isEdit ? "Update user information" : "Create a new user account"}
          </div>
        </div>
        <div className="drawer-body">
          <form id="userForm" className="drawer-form" onSubmit={onSubmit}>
            <div className="field-group">
              <div className="field">
                <label className="field-label">Username</label>
                <input
                  type="text"
                  required
                  placeholder="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
              {!isEdit ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  <div className="field">
                    <label className="field-label">Type</label>
                    <select value={type} onChange={(e) => setType(e.target.value)}>
                      <option value="HOST">HOST</option>
                      <option value="DISTRIBUTER">DISTRIBUTER</option>
                      <option value="ADMIN">ADMIN</option>
                    </select>
                  </div>
                  <div className="field">
                    <label className="field-label">Station ID</label>
                    <input
                      type="text"
                      placeholder="e.g. CUBT062510000029"
                      value={stationId}
                      onChange={(e) => setStationId(e.target.value)}
                    />
                    <span className="field-description">Optional for new users</span>
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  <div className="field">
                    <label className="field-label">Type</label>
                    <select value={type} onChange={(e) => setType(e.target.value)}>
                      <option value="HOST">HOST</option>
                      <option value="DISTRIBUTER">DISTRIBUTER</option>
                      <option value="DISTRIBUTOR">DISTRIBUTOR</option>
                      <option value="ADMIN">ADMIN</option>
                    </select>
                  </div>
                  <div className="field">
                    <label className="field-label">Station IDs</label>
                    <div className="station-ids-list">
                      {stationIds.map((sid) => (
                        <span key={sid} className="station-id-chip">
                          {sid}
                          <button
                            type="button"
                            className="btn-remove-chip"
                            aria-label="Remove"
                            onClick={() => removeStation(sid)}
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                    <div className="station-ids-add">
                      <select
                        value={addSelectValue}
                        onChange={(e) => setAddSelectValue(e.target.value)}
                      >
                        <option value="">— Add station —</option>
                        {availableStations.map((s) => (
                          <option key={String(s.id)} value={String(s.id)}>
                            {String(s.id)}
                            {s.title ? ` (${s.title})` : ""}
                          </option>
                        ))}
                      </select>
                      <button type="button" onClick={addStation}>
                        Add
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </form>
        </div>
        <div className="drawer-footer">
          <button type="button" className="btn-cancel" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn-submit" form="userForm" disabled={submitting}>
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
