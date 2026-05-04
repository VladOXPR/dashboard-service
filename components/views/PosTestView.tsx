"use client";

import { useEffect, useState } from "react";
import { fetchPosRents, type PosRent } from "@/lib/api";
import { formatPosTimestamp } from "@/lib/format";
import SkeletonTable from "@/components/skeletons/SkeletonTable";

export default function PosTestView() {
  const [rents, setRents] = useState<PosRent[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const json = await fetchPosRents();
        const raw: PosRent[] = Array.isArray(json)
          ? (json as unknown as PosRent[])
          : Array.isArray(json.data)
          ? (json.data as PosRent[])
          : [];
        if (!cancelled) setRents(raw);
      } catch (e) {
        console.error(e);
        if (!cancelled) setError("Failed to load POS rents. Please try again.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function muted() {
    return <span className="pos-test-cell-muted">—</span>;
  }
  function mono(value: string | number) {
    return <span className="pos-test-cell-mono">{String(value)}</span>;
  }

  return (
    <main className="view-pos-test">
      {loading ? <SkeletonTable rows={5} /> : null}
      {error ? <div className="error">{error}</div> : null}
      {!loading && !error ? (
        <div id="posTestList">
          {rents && rents.length > 0 ? (
            <div className="pos-test-table-wrap">
              <table className="scans-table">
                <thead>
                  <tr>
                    <th>Rent ID</th>
                    <th>Status</th>
                    <th>Battery ID</th>
                    <th>Stripe PI</th>
                    <th>Start time</th>
                    <th>Station start</th>
                    <th>End time</th>
                    <th>Station end</th>
                  </tr>
                </thead>
                <tbody>
                  {rents.map((r, i) => {
                    const isActive = !r.end_time;
                    return (
                      <tr key={String(r.rent_id ?? i)}>
                        <td>{String(r.rent_id ?? "")}</td>
                        <td>
                          <span className="pos-test-status">
                            <span
                              className={
                                "pos-test-status-dot " + (isActive ? "active" : "ended")
                              }
                            />
                            {isActive ? "Active" : "Ended"}
                          </span>
                        </td>
                        <td>
                          {r.battery_id == null || r.battery_id === ""
                            ? muted()
                            : mono(r.battery_id)}
                        </td>
                        <td>{r.stripe_pi ? mono(r.stripe_pi) : muted()}</td>
                        <td>{r.start_time ? formatPosTimestamp(r.start_time) : muted()}</td>
                        <td>{r.station_start ? String(r.station_start) : muted()}</td>
                        <td>{r.end_time ? formatPosTimestamp(r.end_time) : muted()}</td>
                        <td>{r.station_end ? String(r.station_end) : muted()}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="pos-test-empty">No POS rents found.</p>
          )}
        </div>
      ) : null}
    </main>
  );
}
