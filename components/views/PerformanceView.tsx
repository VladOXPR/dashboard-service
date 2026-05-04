"use client";

import { useCallback, useEffect, useState } from "react";
import { isAdmin, useAuth } from "@/lib/auth";
import {
  fetchAllStations,
  fetchRentsMtd,
  fetchRentsMtdAll,
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

function isTestStationTitle(title: string | undefined): boolean {
  return String(title ?? "").trim().toLowerCase() === "test station";
}

async function computeAvgPerStation(allRes: { success?: boolean; data?: StationRevenueRow[] } | null) {
  try {
    const stationsJson = await fetchAllStations();
    const allStations = Array.isArray(stationsJson.data)
      ? (stationsJson.data as StationRecord[])
      : [];
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
  const [stationListLoading, setStationListLoading] = useState<boolean>(false);
  const [chartRange, setChartRange] = useState<{ start: Date; end: Date }>(initial);

  const load = useCallback(async () => {
    if (!user || !user.id) return;
    setLoading(true);
    setError(null);
    setMtd(null);
    setAllRes(null);
    setAvgPerStation(null);

    const validation = validateRange(start, end);
    if (!validation.ok) {
      setLoading(false);
      setError(validation.message);
      return;
    }
    setChartRange({ start: validation.start, end: validation.end });

    let scoped: string | string[] | null = null;
    if (!isAdmin(user)) {
      const stations = Array.isArray(user.stations) ? (user.stations as string[]) : [];
      if (stations.length > 0) scoped = stations;
    }

    let allFetch: { success?: boolean; data?: StationRevenueRow[] } | null = null;
    try {
      const mtdPayload = (await fetchRentsMtd(scoped, validation.start, validation.end)) as RentMtdPayload;
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
    } finally {
      setLoading(false);
    }

    if (isAdmin(user) && !allFetch) {
      setStationListLoading(true);
      try {
        const all = (await fetchRentsMtdAll(validation.start, validation.end)) as {
          success?: boolean;
          data?: StationRevenueRow[];
        };
        setAllRes(all);
      } catch (e) {
        console.warn("Station performance (mtd/all) failed to load", e);
      } finally {
        setStationListLoading(false);
      }
    }
  }, [user, start, end]);

  useEffect(() => {
    if (!ready) return;
    load();
  }, [ready, load]);

  const showStationList = isAdmin(user);
  const stations =
    allRes && allRes.success && Array.isArray(allRes.data) ? (allRes.data as StationRevenueRow[]) : [];

  return (
    <main className="view-performance">
      <PerformanceDateRange
        start={start}
        end={end}
        onChange={({ start: s, end: e }) => {
          setStart(s);
          setEnd(e);
        }}
        onApply={() => {
          load();
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

      {showStationList ? (
        <section className="station-performance-section">
          <div className="station-performance-card">
            {stationListLoading ? (
              <SkeletonTable rows={5} withSecondary={false} />
            ) : stations.length > 0 ? (
              <table
                className="station-performance-table"
                aria-label="Station revenue for selected range"
              >
                <thead>
                  <tr>
                    <th>Station</th>
                    <th>Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {stations.map((row, i) => {
                    const title = String(row.station_title ?? row.station_id ?? "—");
                    const money = row.money != null ? Number(row.money) : 0;
                    return (
                      <tr key={i}>
                        <td>{title}</td>
                        <td className="station-performance-money">${money}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : null}
          </div>
        </section>
      ) : null}
    </main>
  );
}
