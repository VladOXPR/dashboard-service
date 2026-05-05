"use client";

import { useEffect, useState, type ReactNode } from "react";
import { fetchPosRents, type PosRent } from "@/lib/api";
import { formatPosTimestamp } from "@/lib/format";
import { usePagedItems } from "@/lib/hooks/usePagedItems";
import SkeletonTable from "@/components/skeletons/SkeletonTable";
import { Table, TableCard } from "@/components/application/table/table";
import { PaginationPageMinimalCenter } from "@/components/application/pagination/pagination";
import { Badge, BadgeWithDot } from "@/components/base/badges/badges";

type Row = PosRent & { rowKey: string };

function muted(): ReactNode {
  return <span className="text-text-quaternary">—</span>;
}
function mono(value: string | number): ReactNode {
  return <span className="font-mono text-xs text-text-secondary">{String(value)}</span>;
}

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

  const rows: Row[] = (rents ?? []).map((r, i) => ({ ...r, rowKey: String(r.rent_id ?? `idx-${i}`) }));
  const { page, setPage, totalPages, pagedItems, totalItems } = usePagedItems(rows, 10);

  return (
    <main className="view-pos-test">
      <TableCard.Root>
        <TableCard.Header
          title="POS rents"
          badge={
            <Badge size="sm" color="brand" type="pill-color">
              {totalItems} {totalItems === 1 ? "rent" : "rents"}
            </Badge>
          }
        />

        {loading ? (
          <div className="px-4 py-3 md:px-6 md:py-4">
            <SkeletonTable rows={5} />
          </div>
        ) : error ? (
          <div className="error" style={{ margin: "0.75rem" }}>{error}</div>
        ) : rows.length === 0 ? (
          <p className="px-4 py-6 text-sm text-text-tertiary md:px-6">No POS rents found.</p>
        ) : (
          <>
            <Table aria-label="POS rents" selectionMode="multiple">
              <Table.Header>
                <Table.Head id="rent_id" label="Rent ID" isRowHeader />
                <Table.Head id="status" label="Status" />
                <Table.Head id="battery_id" label="Battery ID" />
                <Table.Head id="stripe_pi" label="Stripe PI" tooltip="Stripe payment intent identifier for this rent." />
                <Table.Head id="start_time" label="Start time" />
                <Table.Head id="station_start" label="Station start" />
                <Table.Head id="end_time" label="End time" />
                <Table.Head id="station_end" label="Station end" />
              </Table.Header>

              <Table.Body items={pagedItems}>
                {(item) => {
                  const isActive = !item.end_time;
                  return (
                    <Table.Row id={item.rowKey}>
                      <Table.Cell className="font-mono text-xs text-text-tertiary">{String(item.rent_id ?? "")}</Table.Cell>
                      <Table.Cell>
                        <BadgeWithDot
                          size="sm"
                          type="pill-color"
                          color={isActive ? "success" : "gray"}
                        >
                          {isActive ? "Active" : "Ended"}
                        </BadgeWithDot>
                      </Table.Cell>
                      <Table.Cell>
                        {item.battery_id == null || item.battery_id === ""
                          ? muted()
                          : mono(item.battery_id)}
                      </Table.Cell>
                      <Table.Cell>{item.stripe_pi ? mono(item.stripe_pi) : muted()}</Table.Cell>
                      <Table.Cell className="text-text-tertiary">
                        {item.start_time ? formatPosTimestamp(item.start_time) : muted()}
                      </Table.Cell>
                      <Table.Cell>{item.station_start ? String(item.station_start) : muted()}</Table.Cell>
                      <Table.Cell className="text-text-tertiary">
                        {item.end_time ? formatPosTimestamp(item.end_time) : muted()}
                      </Table.Cell>
                      <Table.Cell>{item.station_end ? String(item.station_end) : muted()}</Table.Cell>
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
    </main>
  );
}
