"use client";

import { useEffect, useState } from "react";
import {
  createStation,
  fetchStation,
  stationFromApiJson,
  updateStation,
  type StationRecord,
} from "@/lib/api";

type Props = {
  open: boolean;
  initial: StationRecord | null;
  onClose: () => void;
  onSaved: () => void;
  onWarning?: (msg: string) => void;
};

export default function StationFormDrawer({ open, initial, onClose, onSaved, onWarning }: Props) {
  const isEdit = Boolean(initial?.id);
  const [id, setId] = useState("");
  const [title, setTitle] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [address, setAddress] = useState("");
  const [stripeId, setStripeId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setId(initial?.id ?? "");
    setTitle(initial?.title ?? "");
    setLatitude(initial?.latitude != null ? String(initial.latitude) : "");
    setLongitude(initial?.longitude != null ? String(initial.longitude) : "");
    setAddress("");
    setStripeId("");
    setDetailError(null);

    if (isEdit && initial?.id) {
      let cancelled = false;
      (async () => {
        setLoadingDetails(true);
        try {
          const json = await fetchStation(String(initial.id));
          const s = stationFromApiJson(json);
          if (cancelled) return;
          if (s) {
            const addrVal =
              s.address != null ? String(s.address) : s.location != null ? String(s.location) : "";
            setAddress(addrVal);
            setStripeId(s.stripe_id != null ? String(s.stripe_id) : "");
          }
        } catch (err) {
          console.error(err);
          if (!cancelled) {
            setDetailError(
              "Could not load address and Stripe ID from the server. You can enter or correct them and save.",
            );
          }
        } finally {
          if (!cancelled) setLoadingDetails(false);
        }
      })();
      return () => {
        cancelled = true;
      };
    }
  }, [open, initial, isEdit]);

  function warnIfNotPersisted(station: StationRecord | null, expectedAddress: string, expectedStripe: string) {
    if (!station || !onWarning) return;
    const gotAddr = station.address != null ? String(station.address).trim() : "";
    const gotStripe = station.stripe_id != null ? String(station.stripe_id).trim() : "";
    if (gotAddr === expectedAddress && gotStripe === expectedStripe) return;
    onWarning(
      "The map API (api.cuub.tech) did not save the address and/or Stripe ID. The dashboard sent the correct data. " +
        "The backend must read address and stripe_id from the request and write them to the database in POST and PATCH. " +
        "If this persists, your title and coordinates may still be updating; contact whoever maintains the map / stations API.",
    );
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const addr = address.trim();
    const stripe = stripeId.trim();
    if (!addr || !stripe) {
      alert("Address and Stripe ID are required.");
      return;
    }
    setSubmitting(true);
    try {
      const lat = parseFloat(latitude);
      const lng = parseFloat(longitude);
      if (isEdit && initial?.id) {
        await updateStation(String(initial.id), {
          id: String(initial.id),
          title,
          latitude: lat,
          longitude: lng,
          address: addr,
          stripe_id: stripe,
        });
        onSaved();
        onClose();
        try {
          const got = stationFromApiJson(await fetchStation(String(initial.id)));
          warnIfNotPersisted(got, addr, stripe);
        } catch {
          // ignore
        }
      } else {
        await createStation({
          id,
          title,
          latitude: lat,
          longitude: lng,
          address: addr,
          stripe_id: stripe,
        });
        onSaved();
        onClose();
        try {
          const got = stationFromApiJson(await fetchStation(id));
          warnIfNotPersisted(got, addr, stripe);
        } catch {
          // ignore
        }
      }
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
                <label className="field-label">Address</label>
                <input
                  type="text"
                  required
                  autoComplete="street-address"
                  placeholder={loadingDetails ? "Loading…" : "Street address"}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
                <span className="field-description">Required</span>
              </div>
              <div className="field">
                <label className="field-label">Stripe ID</label>
                <input
                  type="text"
                  required
                  autoComplete="off"
                  placeholder={loadingDetails ? "Loading…" : "e.g. acct_… or price_…"}
                  value={stripeId}
                  onChange={(e) => setStripeId(e.target.value)}
                />
                <span className="field-description">Required</span>
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
              {detailError ? (
                <div className="field-description" style={{ color: "#fca5a5" }}>
                  {detailError}
                </div>
              ) : null}
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
