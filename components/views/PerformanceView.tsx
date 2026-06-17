"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import {
  fetchAllStations,
  fetchRentsMtd,
  fetchRentsMtdAll,
  stationsFromApiJson,
  type RentMtdPayload,
  type StationRecord,
  type StationRevenueRow,
} from "@/lib/api";
import { toLocalYMD } from "@/lib/format";
import PerformanceDateRange, {
  defaultRange,
  validateRange,
} from "@/components/PerformanceDateRange";
import PerformanceSkeletons from "@/components/skeletons/PerformanceSkeletons";
import SkeletonTable from "@/components/skeletons/SkeletonTable";
import MtdChart from "@/components/charts/MtdChart";
import { Table, TableCard } from "@/components/application/table/table";
import { PaginationPageMinimalCenter } from "@/components/application/pagination/pagination";
import { Badge } from "@/components/base/badges/badges";
import { usePagedItems } from "@/lib/hooks/usePagedItems";

function isTestStationTitle(title: string | undefined): boolean {
  return String(title ?? "").trim().toLowerCase() === "test station";
}

async function computeAvgPerStation(allRes: { success?: boolean; data?: StationRevenueRow[] } | null) {
  try {
    const stationsJson = await fetchAllStations();
    const allStations = stationsFromApiJson(stationsJson);
    const networkStations = allStations.filter((s) => !isTestStationTitle(s.title));
    const n = networkStations.length;
    if (n === 0) return null;

    const moneyById: Record<string, number> = {};
    if (allRes && allRes.success && Array.isArray(allRes.data)) {
      for (const r of allRes.data) {
        const sid = r.station_id != null ? String(r.station_id) : "";
        if (!sid) continue;
        const m = r.money != null ? Number(r.money) : 0;
        if (!isNaN(m)) moneyById[sid] = m;
      }
    }

    let sum = 0;
    for (const s of networkStations) {
      const id = String(s.id ?? "");
      sum += moneyById[id] ?? 0;
    }
    return sum / n;
  } catch (err) {
    console.warn("Network avg per station failed", err);
    return null;
  }
}

type StationPerfRow = { id: string; title: string; money: number };

function buildStationPerfRows(
  allStations: StationRecord[],
  allRes: { success?: boolean; data?: StationRevenueRow[] } | null,
): StationPerfRow[] {
  const moneyById: Record<string, number> = {};
  if (allRes && allRes.success && Array.isArray(allRes.data)) {
    for (const r of allRes.data) {
      const sid = r.station_id != null ? String(r.station_id) : "";
      if (!sid) continue;
      const m = r.money != null ? Number(r.money) : 0;
      if (!Number.isNaN(m)) moneyById[sid] = m;
    }
  }

  if (allStations.length === 0) {
    if (allRes && allRes.success && Array.isArray(allRes.data) && allRes.data.length > 0) {
      const fallback = allRes.data
        .map<StationPerfRow>((r) => ({
          id: r.station_id != null ? String(r.station_id) : "",
          title: String(r.station_title ?? r.station_id ?? "—"),
          money: r.money != null ? Number(r.money) : 0,
        }))
        .sort((a, b) => {
          if (b.money !== a.money) return b.money - a.money;
          return a.title.localeCompare(b.title, undefined, { sensitivity: "base" });
        });
      return fallback;
    }
    return [];
  }

  const rows: StationPerfRow[] = [];
  for (const s of allStations) {
    const id = String(s.id ?? "");
    if (!id) continue;
    const t = s.title != null && String(s.title).trim() !== "" ? String(s.title) : id;
    const money = moneyById[id] != null ? moneyById[id] : 0;
    rows.push({ id, title: t, money });
  }
  rows.sort((a, b) => {
    if (b.money !== a.money) return b.money - a.money;
    return a.title.localeCompare(b.title, undefined, { sensitivity: "base" });
  });
  return rows;
}

export default function PerformanceView() {
  const { user, ready } = useAuth();
  const initial = defaultRange();
  const [start, setStart] = useState<string>(toLocalYMD(initial.start));
  const [end, setEnd] = useState<string>(toLocalYMD(initial.end));
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [mtd, setMtd] = useState<RentMtdPayload | null>(null);
  const [avgPerStation, setAvgPerStation] = useState<number | null>(null);
  const [allRes, setAllRes] = useState<{ success?: boolean; data?: StationRevenueRow[] } | null>(
    null,
  );
  const [allStations, setAllStations] = useState<StationRecord[]>([]);
  const [stationListLoading, setStationListLoading] = useState<boolean>(false);
  const [chartRange, setChartRange] = useState<{ start: Date; end: Date }>(initial);

  const load = useCallback(async () => {
    if (!user || !user.id) return;
    setLoading(true);
    setError(null);
    setMtd(null);
    setAllRes(null);
    setAllStations([]);
    setAvgPerStation(null);

    const validation = validateRange(start, end);
    if (!validation.ok) {
      setLoading(false);
      setError(validation.message);
      return;
    }
    setChartRange({ start: validation.start, end: validation.end });

    let allFetch: { success?: boolean; data?: StationRevenueRow[] } | null = null;
    try {
      const mtdPayload = (await fetchRentsMtd(null, validation.start, validation.end)) as RentMtdPayload;
      try {
        const all = (await fetchRentsMtdAll(validation.start, validation.end)) as {
          success?: boolean;
          data?: StationRevenueRow[];
        };
        allFetch = all;
      } catch (e) {
        console.warn("Station totals (rents/.../all) failed to load", e);
      }
      const avg = await computeAvgPerStation(allFetch);
      setAvgPerStation(avg);
      setMtd(mtdPayload);
      setAllRes(allFetch);
    } catch (mtdErr) {
      console.warn("MTD rent data failed to load", mtdErr);
      setMtd(null);
      setError(
        mtdErr instanceof Error
          ? mtdErr.message
          : "Failed to load revenue data. Please try again.",
      );
    } finally {
      setLoading(false);
    }

    setStationListLoading(true);
    try {
      if (!allFetch) {
        const all = (await fetchRentsMtdAll(validation.start, validation.end)) as {
          success?: boolean;
          data?: StationRevenueRow[];
        };
        allFetch = all;
        setAllRes(all);
      }
    } catch (e) {
      console.warn("Station performance (mtd/all) failed to load", e);
    }
    try {
      const stationsJson = await fetchAllStations();
      setAllStations(stationsFromApiJson(stationsJson));
    } catch (e) {
      console.warn("Station list for performance table failed", e);
      setAllStations([]);
    } finally {
      setStationListLoading(false);
    }
  }, [user, start, end]);

  useEffect(() => {
    if (!ready) return;
    load();
  }, [ready, load]);

  const stationPerfRows: StationPerfRow[] = buildStationPerfRows(allStations, allRes);
  const { page, setPage, totalPages, pagedItems, totalItems } = usePagedItems(stationPerfRows, 10);

  return (
    <main className="view-performance">
      <PerformanceDateRange
        start={start}
        end={end}
        loading={loading || stationListLoading}
        onChange={({ start: s, end: e }) => {
          setStart(s);
          setEnd(e);
        }}
      />
      {loading ? <PerformanceSkeletons /> : null}
      {error ? <div className="error">{error}</div> : null}
      {!loading && !error ? (
        <MtdChart
          payload={mtd}
          rangeStart={chartRange.start}
          rangeEnd={chartRange.end}
          avgPerStation={avgPerStation}
        />
      ) : null}

      <section className="station-performance-section">
        <TableCard.Root>
          <TableCard.Header
            title="Stations"
            badge={
              <Badge size="sm" color="brand" type="pill-color">
                {totalItems} {totalItems === 1 ? "station" : "stations"}
              </Badge>
            }
          />
          {stationListLoading ? (
            <div className="px-4 py-3 md:px-6 md:py-4">
              <SkeletonTable rows={5} withSecondary={false} />
            </div>
          ) : stationPerfRows.length === 0 ? (
            <p className="px-4 py-6 text-sm text-text-tertiary md:px-6">No station revenue data for this range.</p>
          ) : (
            <>
              <Table aria-label="Station revenue for selected range">
                <Table.Header>
                  <Table.Head id="station" label="Station" isRowHeader className="w-full" />
                  <Table.Head id="revenue" label="Revenue" />
                </Table.Header>
                <Table.Body items={pagedItems}>
                  {(row) => (
                    <Table.Row id={row.id}>
                      <Table.Cell className="font-medium">{row.title}</Table.Cell>
                      <Table.Cell className="font-semibold text-text-primary tabular-nums">${row.money}</Table.Cell>
                    </Table.Row>
                  )}
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
      </section>
    </main>
  );
}
