"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchScans, type ScanRecord } from "@/lib/api";
import { formatDurationAfterRent } from "@/lib/format";
import SkeletonTable from "@/components/skeletons/SkeletonTable";
import ScansSummaryChart, {
  getScansTypeColor,
  type ScansTypeCount,
} from "@/components/charts/ScansSummaryChart";

export default function ScansView() {
  const [scans, setScans] = useState<ScanRecord[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const json = await fetchScans();
        const raw = (
          Array.isArray(json)
            ? (json as unknown as ScanRecord[])
            : Array.isArray(json.data)
            ? (json.data as ScanRecord[])
            : []
        ).filter((s) => s.order_id != null && s.order_id !== "");
        if (!cancelled) setScans(raw);
      } catch (e) {
        console.error(e);
        if (!cancelled) setError("Failed to load scans. Please try again.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const summary = useMemo<{ typeCounts: ScansTypeCount[]; total: number } | null>(() => {
    if (!scans || scans.length === 0) return null;
    const byType: Record<string, number> = {};
    for (const s of scans) {
      const t = s.sticker_type || "Unknown";
      byType[t] = (byType[t] || 0) + 1;
    }
    const counts: ScansTypeCount[] = Object.keys(byType).map((t) => ({
      type: t,
      count: byType[t],
    }));
    counts.sort((a, b) => b.count - a.count);
    return { typeCounts: counts, total: scans.length };
  }, [scans]);

  return (
    <main className="view-scans">
      {loading ? (
        <>
          <div className="scans-summary-skeleton">
            <div className="skeleton-total-wrap">
              <div className="skeleton skeleton-total-label" aria-hidden="true" />
              <div className="skeleton skeleton-total-value" aria-hidden="true" />
            </div>
            <div className="skeleton skeleton-chart-wrap" aria-hidden="true" />
          </div>
          <SkeletonTable rows={5} />
        </>
      ) : null}

      {error ? <div className="error">{error}</div> : null}

      {!loading && !error && summary ? (
        <ScansSummaryChart typeCounts={summary.typeCounts} total={summary.total} />
      ) : null}

      {!loading && !error ? (
        <div id="scansList">
          {scans && scans.length > 0 ? (
            <table className="scans-table">
              <thead>
                <tr>
                  <th>Scan ID</th>
                  <th>Sticker ID</th>
                  <th>Order ID</th>
                  <th>Scan time</th>
                  <th>Sticker type</th>
                  <th>Duration after rent</th>
                  <th>SIZL</th>
                </tr>
              </thead>
              <tbody>
                {scans.map((s, i) => {
                  const typeColor = getScansTypeColor(s.sticker_type);
                  return (
                    <tr key={i}>
                      <td>{String(s.scan_id ?? "")}</td>
                      <td>{String(s.sticker_id ?? "")}</td>
                      <td>{String(s.order_id ?? "")}</td>
                      <td>{String(s.scan_time ?? "")}</td>
                      <td>
                        <span className="scans-table-type">
                          <span
                            className="scans-table-type-dot"
                            style={{ background: typeColor }}
                          />
                          {String(s.sticker_type ?? "")}
                        </span>
                      </td>
                      <td>{formatDurationAfterRent(s.duration_after_rent)}</td>
                      <td>{s.sizl === true ? "Yes" : "No"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <p style={{ color: "#a3a3a3" }}>No scans found.</p>
          )}
        </div>
      ) : null}
    </main>
  );
}
