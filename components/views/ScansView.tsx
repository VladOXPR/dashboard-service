"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchScans, type ScanRecord } from "@/lib/api";
import { formatDurationAfterRent } from "@/lib/format";
import { usePagedItems } from "@/lib/hooks/usePagedItems";
import SkeletonTable from "@/components/skeletons/SkeletonTable";
import ScansSummaryChart, {
  getScansTypeColor,
  type ScansTypeCount,
} from "@/components/charts/ScansSummaryChart";
import { Table, TableCard } from "@/components/application/table/table";
import { PaginationPageMinimalCenter } from "@/components/application/pagination/pagination";
import { Badge, BadgeWithDot } from "@/components/base/badges/badges";

type Row = ScanRecord & { rowKey: string };

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

  const rows: Row[] = (scans ?? []).map((s, i) => ({ ...s, rowKey: String(s.scan_id ?? `idx-${i}`) }));
  const { page, setPage, totalPages, pagedItems, totalItems } = usePagedItems(rows, 10);

  return (
    <main className="view-scans">
      {loading ? (
        <div className="scans-summary-skeleton">
          <div className="skeleton-total-wrap">
            <div className="skeleton skeleton-total-label" aria-hidden="true" />
            <div className="skeleton skeleton-total-value" aria-hidden="true" />
          </div>
          <div className="skeleton skeleton-chart-wrap" aria-hidden="true" />
        </div>
      ) : null}

      {error ? <div className="error">{error}</div> : null}

      {!loading && !error && summary ? (
        <ScansSummaryChart typeCounts={summary.typeCounts} total={summary.total} />
      ) : null}

      {!loading && !error ? (
        <TableCard.Root>
          <TableCard.Header
            title="Scans"
            badge={
              <Badge size="sm" color="brand" type="pill-color">
                {totalItems} {totalItems === 1 ? "scan" : "scans"}
              </Badge>
            }
          />

          {rows.length === 0 ? (
            <p className="px-4 py-6 text-sm text-text-tertiary md:px-6">No scans found.</p>
          ) : (
            <>
              <Table aria-label="Scans" selectionMode="multiple">
                <Table.Header>
                  <Table.Head id="scan_id" label="Scan ID" isRowHeader />
                  <Table.Head id="sticker_id" label="Sticker ID" />
                  <Table.Head id="order_id" label="Order ID" />
                  <Table.Head id="scan_time" label="Scan time" />
                  <Table.Head id="sticker_type" label="Sticker type" />
                  <Table.Head
                    id="duration"
                    label="Duration after rent"
                    tooltip="Time elapsed between rent start and the scan."
                  />
                  <Table.Head id="sizl" label="SIZL" tooltip="Whether this scan was a successful in-zone landing." />
                </Table.Header>

                <Table.Body items={pagedItems}>
                  {(item) => {
                    const typeColor = getScansTypeColor(item.sticker_type);
                    return (
                      <Table.Row id={item.rowKey}>
                        <Table.Cell className="font-mono text-text-tertiary">{String(item.scan_id ?? "")}</Table.Cell>
                        <Table.Cell className="font-mono text-text-tertiary">{String(item.sticker_id ?? "")}</Table.Cell>
                        <Table.Cell className="font-mono text-text-tertiary">{String(item.order_id ?? "")}</Table.Cell>
                        <Table.Cell className="text-text-tertiary">{String(item.scan_time ?? "")}</Table.Cell>
                        <Table.Cell>
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-bg-secondary px-2 py-0.5 text-xs ring-1 ring-inset ring-border-primary">
                            <span
                              className="h-1.5 w-1.5 rounded-sm"
                              style={{ background: typeColor }}
                              aria-hidden="true"
                            />
                            {String(item.sticker_type ?? "Unknown")}
                          </span>
                        </Table.Cell>
                        <Table.Cell className="text-text-tertiary">
                          {formatDurationAfterRent(item.duration_after_rent)}
                        </Table.Cell>
                        <Table.Cell>
                          <BadgeWithDot
                            size="sm"
                            type="pill-color"
                            color={item.sizl === true ? "success" : "gray"}
                          >
                            {item.sizl === true ? "Yes" : "No"}
                          </BadgeWithDot>
                        </Table.Cell>
                      </Table.Row>
                    );
                  }}
                </Table.Body>
              </Table>

              <PaginationPageMinimalCenter
                page={page}
                total={totalPages}
                onPageChange={setPage}
                className="px-4 py-3 md:px-6 md:pt-3 md:pb-4"
              />
            </>
          )}
        </TableCard.Root>
      ) : null}
    </main>
  );
}
