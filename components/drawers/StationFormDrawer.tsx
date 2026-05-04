"use client";

import { useEffect, useState } from "react";
import { createStation, updateStation, type StationRecord } from "@/lib/api";

type Props = {
  open: boolean;
  initial: StationRecord | null;
  onClose: () => void;
  onSaved: () => void;
};

export default function StationFormDrawer({ open, initial, onClose, onSaved }: Props) {
  const isEdit = Boolean(initial?.id);
  const [id, setId] = useState("");
  const [title, setTitle] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setId(initial?.id ?? "");
      setTitle(initial?.title ?? "");
      setLatitude(initial?.latitude != null ? String(initial.latitude) : "");
      setLongitude(initial?.longitude != null ? String(initial.longitude) : "");
    }
  }, [open, initial]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const lat = parseFloat(latitude);
      const lng = parseFloat(longitude);
      if (isEdit && initial?.id) {
        await updateStation(String(initial.id), { title, latitude: lat, longitude: lng });
      } else {
        await createStation({ id, title, latitude: lat, longitude: lng });
      }
      onSaved();
      onClose();
    } catch (err) {
      alert((err as Error).message || "Request failed.");
    } finally {
      setSubmitting(false);
    }
  }

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
          <div className="drawer-title">{isEdit ? "Edit station" : "Add station"}</div>
          <div className="drawer-description">
            {isEdit ? "Update station information" : "Create a new station"}
          </div>
        </div>
        <div className="drawer-body">
          <form id="stationForm" className="drawer-form" onSubmit={onSubmit}>
            <div className="field-group">
              <div className="field">
                <label className="field-label">ID</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. CUBT062510000003"
                  value={id}
                  disabled={isEdit}
                  onChange={(e) => setId(e.target.value)}
                />
                <span className="field-description">Unique station identifier</span>
              </div>
              <div className="field">
                <label className="field-label">Title</label>
                <input
                  type="text"
                  required
                  placeholder="Station name"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              <div className="field">
                <label className="field-label">Latitude</label>
                <input
                  type="number"
                  step="any"
                  required
                  placeholder="41.94960"
                  value={latitude}
                  onChange={(e) => setLatitude(e.target.value)}
                />
              </div>
              <div className="field">
                <label className="field-label">Longitude</label>
                <input
                  type="number"
                  step="any"
                  required
                  placeholder="-87.65861"
                  value={longitude}
                  onChange={(e) => setLongitude(e.target.value)}
                />
              </div>
            </div>
          </form>
        </div>
        <div className="drawer-footer">
          <button type="button" className="btn-cancel" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn-submit" form="stationForm" disabled={submitting}>
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
